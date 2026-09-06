import { z } from 'zod';
import { PythonSandbox } from '@/sandbox/python-runner';
import { createServiceClient } from '@/lib/supabase/server';
import type { ToolDefinition, ToolResult, ToolArtifact } from '@/types/tools';

// Helper to persist generated file buffer to Supabase Storage & files table
async function saveArtifactFile(
  userId: string,
  conversationId: string | undefined,
  filename: string,
  buffer: Buffer,
  mimeType: string,
  type: ToolArtifact['type']
): Promise<ToolArtifact> {
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${userId}/artifacts/${Date.now()}_${safeFilename}`;

  try {
    const supabase = await createServiceClient();
    
    // Upload buffer to Supabase storage bucket 'user-files'
    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Insert into files table
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        conversation_id: conversationId || null,
        filename,
        mime_type: mimeType,
        size_bytes: buffer.length,
        storage_path: storagePath,
        generated_by_tool: `generate_${type}`,
        artifact_metadata: { type, created_at: new Date().toISOString() },
      })
      .select('id')
      .single();
    if (dbError || !fileRecord) { await supabase.storage.from('user-files').remove([storagePath]); throw new Error(dbError?.message || 'Artifact metadata could not be saved.'); }

    return {
      id: fileRecord.id,
      filename,
      mimeType,
      sizeBytes: buffer.length,
      storagePath,
      downloadUrl: `/api/files/download?id=${encodeURIComponent(fileRecord.id)}`,
      type,
    };
  } catch (err: any) {
    console.error('Save artifact error:', err);
    throw err;
  }
}

// ============================================
// 1. EXCEL GENERATION TOOL
// ============================================
export const generateExcelTool: ToolDefinition = {
  name: 'generate_excel',
  description: 'Generate an Excel spreadsheet (.xlsx) using Python pandas and openpyxl. Ideal for financial models, data tables, budgets, reports, and calculations.',
  permission: 'safe',
  parameters: z.object({
    filename: z.string().describe('Filename ending in .xlsx, e.g. "budget_2025.xlsx"'),
    pythonCode: z.string().describe('Python code that builds the spreadsheet using pandas or openpyxl and saves it to the specified filename.'),
  }),
  execute: async ({ filename, pythonCode }, context): Promise<ToolResult> => {
    context.onEvent?.({
      type: 'tool_start',
      message: `Generating Excel spreadsheet: ${filename}`,
      toolName: 'generate_excel',
    });

    const targetFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

    // Ensure the code saves to targetFilename
    const wrappedCode = `
import os, sys
import pandas as pd
import openpyxl

${pythonCode}

# Verification
if not os.path.exists("${targetFilename}"):
    raise FileNotFoundError("Script did not create ${targetFilename}")
print(f"SUCCESS: Created ${targetFilename}, size: {os.path.getsize('${targetFilename}')} bytes")
`;

    const execResult = await PythonSandbox.execute({
      code: wrappedCode,
      language: 'python',
      outputFilesExpected: [targetFilename],
    });

    if (!execResult.success) {
      return {
        success: false,
        error: `Excel generation failed:\n${execResult.stderr || execResult.stdout}`,
      };
    }

    const generatedFile = execResult.generatedFiles.find(
      (f) => f.filename === targetFilename || f.filename.endsWith('.xlsx')
    );

    if (!generatedFile) {
      return {
        success: false,
        error: `Excel file ${targetFilename} was not found in sandbox output.`,
      };
    }

    const artifact = await saveArtifactFile(
      context.userId,
      context.conversationId,
      targetFilename,
      generatedFile.buffer,
      generatedFile.mimeType,
      'excel'
    );

    return {
      success: true,
      data: {
        filename: targetFilename,
        sizeBytes: generatedFile.sizeBytes,
      },
      artifacts: [artifact],
      summary: `Successfully generated Excel spreadsheet "${targetFilename}" (${(generatedFile.sizeBytes / 1024).toFixed(1)} KB).`,
    };
  },
};

// ============================================
// 2. WORD DOCUMENT GENERATION TOOL
// ============================================
export const generateWordTool: ToolDefinition = {
  name: 'generate_word',
  description: 'Generate a formatted Microsoft Word document (.docx) using python-docx. Ideal for letters, executive summaries, reports, proposals, and essays.',
  permission: 'safe',
  parameters: z.object({
    filename: z.string().describe('Filename ending in .docx, e.g. "executive_summary.docx"'),
    pythonCode: z.string().describe('Python code that uses docx.Document() to create the document and saves it to the filename.'),
  }),
  execute: async ({ filename, pythonCode }, context): Promise<ToolResult> => {
    context.onEvent?.({
      type: 'tool_start',
      message: `Generating Word document: ${filename}`,
      toolName: 'generate_word',
    });

    const targetFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;

    const wrappedCode = `
import os, sys
import docx
from docx.shared import Inches, Pt, RGBColor

${pythonCode}

if not os.path.exists("${targetFilename}"):
    raise FileNotFoundError("Script did not create ${targetFilename}")
print(f"SUCCESS: Created ${targetFilename}")
`;

    const execResult = await PythonSandbox.execute({
      code: wrappedCode,
      language: 'python',
      outputFilesExpected: [targetFilename],
    });

    if (!execResult.success) {
      return {
        success: false,
        error: `Word document generation failed:\n${execResult.stderr || execResult.stdout}`,
      };
    }

    const generatedFile = execResult.generatedFiles.find(
      (f) => f.filename === targetFilename || f.filename.endsWith('.docx')
    );

    if (!generatedFile) {
      return {
        success: false,
        error: `Word document ${targetFilename} was not found in sandbox output.`,
      };
    }

    const artifact = await saveArtifactFile(
      context.userId,
      context.conversationId,
      targetFilename,
      generatedFile.buffer,
      generatedFile.mimeType,
      'word'
    );

    return {
      success: true,
      data: { filename: targetFilename, sizeBytes: generatedFile.sizeBytes },
      artifacts: [artifact],
      summary: `Successfully generated Word document "${targetFilename}" (${(generatedFile.sizeBytes / 1024).toFixed(1)} KB).`,
    };
  },
};

// ============================================
// 3. PDF GENERATION TOOL
// ============================================
export const generatePdfTool: ToolDefinition = {
  name: 'generate_pdf',
  description: 'Generate a printable PDF document (.pdf) using Python reportlab. Ideal for invoices, formal certificates, whitepapers, and printable forms.',
  permission: 'safe',
  parameters: z.object({
    filename: z.string().describe('Filename ending in .pdf, e.g. "invoice_1001.pdf"'),
    pythonCode: z.string().describe('Python code using reportlab to build the PDF document and save it to the specified filename.'),
  }),
  execute: async ({ filename, pythonCode }, context): Promise<ToolResult> => {
    context.onEvent?.({
      type: 'tool_start',
      message: `Generating PDF document: ${filename}`,
      toolName: 'generate_pdf',
    });

    const targetFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

    const wrappedCode = `
import os, sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

${pythonCode}

if not os.path.exists("${targetFilename}"):
    raise FileNotFoundError("Script did not create ${targetFilename}")
print(f"SUCCESS: Created ${targetFilename}")
`;

    const execResult = await PythonSandbox.execute({
      code: wrappedCode,
      language: 'python',
      outputFilesExpected: [targetFilename],
    });

    if (!execResult.success) {
      return {
        success: false,
        error: `PDF generation failed:\n${execResult.stderr || execResult.stdout}`,
      };
    }

    const generatedFile = execResult.generatedFiles.find(
      (f) => f.filename === targetFilename || f.filename.endsWith('.pdf')
    );

    if (!generatedFile) {
      return {
        success: false,
        error: `PDF ${targetFilename} was not found in sandbox output.`,
      };
    }

    const artifact = await saveArtifactFile(
      context.userId,
      context.conversationId,
      targetFilename,
      generatedFile.buffer,
      generatedFile.mimeType,
      'pdf'
    );

    return {
      success: true,
      data: { filename: targetFilename, sizeBytes: generatedFile.sizeBytes },
      artifacts: [artifact],
      summary: `Successfully generated PDF document "${targetFilename}" (${(generatedFile.sizeBytes / 1024).toFixed(1)} KB).`,
    };
  },
};

// ============================================
// 4. POWERPOINT GENERATION TOOL
// ============================================
export const generatePowerPointTool: ToolDefinition = {
  name: 'generate_powerpoint',
  description: 'Generate a slide presentation (.pptx) using python-pptx. Ideal for pitch decks, project overviews, lecture slides, and presentations.',
  permission: 'safe',
  parameters: z.object({
    filename: z.string().describe('Filename ending in .pptx, e.g. "quarterly_review.pptx"'),
    pythonCode: z.string().describe('Python code using pptx.Presentation() to build slides and save to the filename.'),
  }),
  execute: async ({ filename, pythonCode }, context): Promise<ToolResult> => {
    context.onEvent?.({
      type: 'tool_start',
      message: `Generating presentation slides: ${filename}`,
      toolName: 'generate_powerpoint',
    });

    const targetFilename = filename.endsWith('.pptx') ? filename : `${filename}.pptx`;

    const wrappedCode = `
import os, sys
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

${pythonCode}

if not os.path.exists("${targetFilename}"):
    raise FileNotFoundError("Script did not create ${targetFilename}")
print(f"SUCCESS: Created ${targetFilename}")
`;

    const execResult = await PythonSandbox.execute({
      code: wrappedCode,
      language: 'python',
      outputFilesExpected: [targetFilename],
    });

    if (!execResult.success) {
      return {
        success: false,
        error: `PowerPoint generation failed:\n${execResult.stderr || execResult.stdout}`,
      };
    }

    const generatedFile = execResult.generatedFiles.find(
      (f) => f.filename === targetFilename || f.filename.endsWith('.pptx')
    );

    if (!generatedFile) {
      return {
        success: false,
        error: `PowerPoint presentation ${targetFilename} was not found in sandbox output.`,
      };
    }

    const artifact = await saveArtifactFile(
      context.userId,
      context.conversationId,
      targetFilename,
      generatedFile.buffer,
      generatedFile.mimeType,
      'powerpoint'
    );

    return {
      success: true,
      data: { filename: targetFilename, sizeBytes: generatedFile.sizeBytes },
      artifacts: [artifact],
      summary: `Successfully generated PowerPoint presentation "${targetFilename}" (${(generatedFile.sizeBytes / 1024).toFixed(1)} KB).`,
    };
  },
};

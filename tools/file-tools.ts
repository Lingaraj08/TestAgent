import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { DocumentParser } from '@/documents/parser';
import type { ToolDefinition, ToolResult } from '@/types/tools';

// ============================================
// 1. READ FILE TOOL
// ============================================
export const readFileTool: ToolDefinition = {
  name: 'read_file',
  description: 'Read and analyze the contents of an uploaded file by its filename or ID. Supports TXT, CSV, JSON, Markdown, PDF, DOCX, XLSX, and images.',
  permission: 'safe',
  parameters: z.object({
    fileIdentifier: z.string().describe('Filename or File UUID to read (e.g. "data.csv" or UUID)'),
  }),
  execute: async ({ fileIdentifier }, context): Promise<ToolResult> => {
    context.onEvent?.({
      type: 'tool_start',
      message: `Reading document: "${fileIdentifier}"`,
      toolName: 'read_file',
    });

    try {
      const supabase = await createServiceClient();

      // Find file record by ID or filename belonging to user
      let query = supabase.from('files').select('*').eq('user_id', context.userId);

      // Check if UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileIdentifier)) {
        query = query.eq('id', fileIdentifier);
      } else {
        query = query.ilike('filename', `%${fileIdentifier}%`);
      }

      const { data: fileRecords, error } = await query.limit(1);

      if (error || !fileRecords || fileRecords.length === 0) {
        return {
          success: false,
          error: `File "${fileIdentifier}" was not found in your workspace files.`,
        };
      }

      const file = fileRecords[0];

      // Download from storage
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('user-files')
        .download(file.storage_path);

      if (downloadError || !fileBlob) {
        return {
          success: false,
          error: `Could not retrieve file content from storage: ${downloadError?.message}`,
        };
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      const parsed = await DocumentParser.parse(file.filename, buffer, file.mime_type);

      return {
        success: true,
        data: {
          id: file.id,
          filename: file.filename,
          mimeType: file.mime_type,
          sizeBytes: file.size_bytes,
          parsed,
        },
        summary: `File: ${file.filename} (${file.mime_type}, ${(file.size_bytes / 1024).toFixed(1)} KB)\nSummary: ${parsed.summary || 'Parsed content extracted'}\n\nContent Preview:\n${parsed.text.slice(0, 4000)}${parsed.text.length > 4000 ? '\n...[truncated for context]' : ''}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to read file: ${err.message}`,
      };
    }
  },
};

// ============================================
// 2. CREATE FILE TOOL
// ============================================
export const createFileTool: ToolDefinition = {
  name: 'create_file',
  description: 'Create and save a new text or code file (e.g. .txt, .csv, .json, .py, .md) to workspace storage.',
  permission: 'safe',
  parameters: z.object({
    filename: z.string().describe('Name of the file to create, e.g. "report.md" or "output.json"'),
    content: z.string().describe('The complete text or code content to write to the file'),
    mimeType: z.string().optional().default('text/plain').describe('MIME type, e.g. "text/markdown"'),
  }),
  execute: async ({ filename, content, mimeType }, context): Promise<ToolResult> => {
    context.onEvent?.({
      type: 'tool_start',
      message: `Creating file: "${filename}"`,
      toolName: 'create_file',
    });

    try {
      const buffer = Buffer.from(content, 'utf8');
      const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${context.userId}/${Date.now()}_${safeFilename}`;

      const supabase = await createServiceClient();

      const { error: uploadError } = await supabase.storage.from('user-files').upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: context.userId,
          conversation_id: context.conversationId || null,
          filename,
          mime_type: mimeType,
          size_bytes: buffer.length,
          storage_path: storagePath,
          generated_by_tool: 'create_file',
        })
        .select('*')
        .single();
      if (dbError || !fileRecord) { await supabase.storage.from('user-files').remove([storagePath]); throw new Error(dbError?.message || 'Failed to create file record.'); }

      return {
        success: true,
        data: {
          id: fileRecord?.id || storagePath,
          filename,
          sizeBytes: buffer.length,
          storagePath,
        },
        summary: `Created file "${filename}" (${buffer.length} bytes) successfully.`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to create file: ${err.message}`,
      };
    }
  },
};

// ============================================
// 3. LIST FILES TOOL
// ============================================
export const listFilesTool: ToolDefinition = {
  name: 'list_files',
  description: 'List all files currently uploaded or created in the workspace.',
  permission: 'safe',
  parameters: z.object({
    limit: z.number().optional().default(20).describe('Max number of files to return'),
  }),
  execute: async ({ limit = 20 }, context): Promise<ToolResult> => {
    try {
      const supabase = await createServiceClient();
      const { data: files, error } = await supabase
        .from('files')
        .select('id, filename, mime_type, size_bytes, created_at, generated_by_tool')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      const fileList = (files || []).map(
        (f) => `• ${f.filename} (${(f.size_bytes / 1024).toFixed(1)} KB, ${f.mime_type}) [ID: ${f.id}]`
      );

      return {
        success: true,
        data: { files },
        summary: files?.length
          ? `Found ${files.length} file(s):\n${fileList.join('\n')}`
          : 'No files uploaded yet in this workspace.',
      };
    } catch (err: any) {
      return { success: false, error: `List files error: ${err.message}` };
    }
  },
};

// ============================================
// 4. FILE METADATA TOOL
// ============================================
export const fileMetadataTool: ToolDefinition = {
  name: 'file_metadata',
  description: 'Inspect detailed metadata, schema, and statistics of a workspace file.',
  permission: 'safe',
  parameters: z.object({
    fileIdentifier: z.string().describe('Filename or ID of the file'),
  }),
  execute: async ({ fileIdentifier }, context): Promise<ToolResult> => {
    return readFileTool.execute({ fileIdentifier }, context);
  },
};

// ============================================
// 5. DELETE FILE TOOL (DESTRUCTIVE - REQUIRES CONFIRMATION)
// ============================================
export const deleteFileTool: ToolDefinition = {
  name: 'delete_file',
  description: 'Delete a file from workspace storage. Requires explicit user confirmation.',
  permission: 'confirmation',
  parameters: z.object({
    fileIdentifier: z.string().describe('Filename or ID of the file to delete'),
  }),
  execute: async ({ fileIdentifier }, context): Promise<ToolResult> => {
    // If confirmation hook is provided, prompt user
    if (context.confirmAction) {
      const confirmed = await context.confirmAction({
        action: 'Delete File',
        description: `Are you sure you want to permanently delete "${fileIdentifier}"?`,
      });
      if (!confirmed) {
        return {
          success: false,
          error: `User rejected confirmation to delete file "${fileIdentifier}".`,
        };
      }
    }

    try {
      const supabase = await createServiceClient();

      let query = supabase.from('files').select('*').eq('user_id', context.userId);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileIdentifier)) {
        query = query.eq('id', fileIdentifier);
      } else {
        query = query.ilike('filename', `%${fileIdentifier}%`);
      }

      const { data: files } = await query.limit(1);
      if (!files || files.length === 0) {
        return { success: false, error: `File "${fileIdentifier}" not found.` };
      }

      const file = files[0];

      // Remove from storage
      const { error: storageError } = await supabase.storage.from('user-files').remove([file.storage_path]);
      if (storageError) throw new Error(`Storage deletion failed: ${storageError.message}`);

      // Remove from database
      const { error: dbError } = await supabase.from('files').delete().eq('id', file.id).eq('user_id', context.userId);
      if (dbError) throw new Error(`Database deletion failed: ${dbError.message}`);

      return {
        success: true,
        data: { id: file.id, filename: file.filename },
        summary: `Permanently deleted file "${file.filename}".`,
      };
    } catch (err: any) {
      return { success: false, error: `Delete failed: ${err.message}` };
    }
  },
};

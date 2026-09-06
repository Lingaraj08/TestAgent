import path from 'path';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export interface ParsedDocument {
  filename: string;
  mimeType: string;
  text: string;
  summary?: string;
  metadata: {
    sizeBytes: number;
    pageCount?: number;
    sheetNames?: string[];
    rowCount?: number;
    format: string;
    [key: string]: any;
  };
}

export class DocumentParser {
  /**
   * Parse a file buffer into structured text and metadata based on its file extension / mime type
   */
  static async parse(
    filename: string,
    buffer: Buffer,
    mimeType?: string
  ): Promise<ParsedDocument> {
    const ext = path.extname(filename).toLowerCase();
    const sizeBytes = buffer.length;

    switch (ext) {
      case '.txt':
      case '.md':
      case '.markdown': {
        const text = buffer.toString('utf8');
        return {
          filename,
          mimeType: mimeType || 'text/plain',
          text,
          metadata: {
            sizeBytes,
            format: ext.replace('.', '').toUpperCase(),
            lineCount: text.split('\n').length,
          },
        };
      }

      case '.csv': {
        const text = buffer.toString('utf8');
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        const headers = lines[0]?.split(',').map((h) => h.trim()) || [];
        return {
          filename,
          mimeType: mimeType || 'text/csv',
          text,
          summary: `CSV with ${lines.length - 1} rows and columns: ${headers.join(', ')}`,
          metadata: {
            sizeBytes,
            format: 'CSV',
            rowCount: Math.max(0, lines.length - 1),
            columns: headers,
          },
        };
      }

      case '.json': {
        const text = buffer.toString('utf8');
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        return {
          filename,
          mimeType: mimeType || 'application/json',
          text,
          summary: parsed ? `Valid JSON document (${Array.isArray(parsed) ? `${parsed.length} items` : 'Object'})` : 'Raw JSON',
          metadata: {
            sizeBytes,
            format: 'JSON',
            isObject: parsed !== null && typeof parsed === 'object',
          },
        };
      }

      case '.xlsx':
      case '.xls': {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        let combinedText = '';
        let totalRows = 0;

        for (const name of sheetNames) {
          const sheet = workbook.Sheets[name];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          combinedText += `--- Sheet: ${name} ---\n${csv}\n\n`;
          const rows = XLSX.utils.sheet_to_json(sheet);
          totalRows += rows.length;
        }

        return {
          filename,
          mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          text: combinedText.trim(),
          summary: `Excel workbook with ${sheetNames.length} sheet(s) (${sheetNames.join(', ')}), ~${totalRows} total rows`,
          metadata: {
            sizeBytes,
            format: 'EXCEL',
            sheetNames,
            rowCount: totalRows,
          },
        };
      }

      case '.docx': {
        try {
          const result = await mammoth.extractRawText({ buffer });
          return {
            filename,
            mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            text: result.value.trim(),
            metadata: {
              sizeBytes,
              format: 'DOCX',
              wordCount: result.value.split(/\s+/).filter(Boolean).length,
            },
          };
        } catch (docxErr: any) {
          return {
            filename,
            mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            text: `[DOCX extraction failed: ${docxErr.message}]`,
            metadata: { sizeBytes, format: 'DOCX', error: docxErr.message },
          };
        }
      }

      case '.pdf': {
        try {
          // Dynamic import of pdf-parse
          const pdfParseModule = await import('pdf-parse');
          const pdfParse = (pdfParseModule as any).default || pdfParseModule;
          const data = await pdfParse(buffer);
          return {
            filename,
            mimeType: mimeType || 'application/pdf',
            text: data.text.trim(),
            metadata: {
              sizeBytes,
              format: 'PDF',
              pageCount: data.numpages,
              info: data.info,
            },
          };
        } catch (pdfErr: any) {
          return {
            filename,
            mimeType: mimeType || 'application/pdf',
            text: `[PDF extraction note: ${pdfErr.message}]`,
            metadata: { sizeBytes, format: 'PDF', error: pdfErr.message },
          };
        }
      }

      case '.pptx': {
        return {
          filename,
          mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          text: `[PowerPoint Presentation: ${filename}, ${Math.round(sizeBytes / 1024)} KB]`,
          metadata: { sizeBytes, format: 'PPTX' },
        };
      }

      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.webp': {
        return {
          filename,
          mimeType: mimeType || `image/${ext.replace('.', '')}`,
          text: `[Image file: ${filename}, size ${Math.round(sizeBytes / 1024)} KB]`,
          metadata: { sizeBytes, format: 'IMAGE' },
        };
      }

      default: {
        // Fallback: try reading as utf-8 text
        try {
          const text = buffer.toString('utf8');
          return {
            filename,
            mimeType: mimeType || 'application/octet-stream',
            text,
            metadata: { sizeBytes, format: 'RAW' },
          };
        } catch {
          return {
            filename,
            mimeType: mimeType || 'application/octet-stream',
            text: `[Binary file: ${filename}, size ${sizeBytes} bytes]`,
            metadata: { sizeBytes, format: 'BINARY' },
          };
        }
      }
    }
  }
}

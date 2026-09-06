export interface CodeExecutionRequest {
  code: string;
  language: 'python' | 'javascript' | 'typescript';
  timeoutMs?: number;
  inputFiles?: { filename: string; content: string | Buffer }[];
  outputFilesExpected?: string[];
  args?: string[];
}

export interface GeneratedFile {
  filename: string;
  sizeBytes: number;
  buffer: Buffer;
  mimeType: string;
}

export interface CodeExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  error?: string;
  generatedFiles: GeneratedFile[];
}

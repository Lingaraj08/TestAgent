import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type { CodeExecutionRequest, CodeExecutionResult, GeneratedFile } from './types';

// Helper to determine mime type of generated file
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.pdf':
      return 'application/pdf';
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.csv':
      return 'text/csv';
    case '.json':
      return 'application/json';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

export class PythonSandbox {
  /**
   * Run Python code in an isolated subprocess with stripped environment variables,
   * dedicated temp folder, and execution timeout.
   */
  static async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const sandboxId = uuidv4();
    const sandboxDir = path.join(os.tmpdir(), `nexus-sandbox-${sandboxId}`);
    const scriptPath = path.join(sandboxDir, 'script.py');
    const timeoutMs = request.timeoutMs || 25000;
    const startTime = Date.now();

    try {
      // 1. Create clean temp sandbox directory
      await fs.mkdir(sandboxDir, { recursive: true });

      // 2. Write input files if provided
      if (request.inputFiles && request.inputFiles.length > 0) {
        for (const file of request.inputFiles) {
          const targetPath = path.join(sandboxDir, path.basename(file.filename));
          await fs.writeFile(targetPath, file.content);
        }
      }

      // 3. Write script.py
      await fs.writeFile(scriptPath, request.code, 'utf8');

      // 4. Record existing files before execution to detect newly created files
      const filesBefore = new Set(await fs.readdir(sandboxDir));

      // 5. Construct sanitized environment: NEVER leak production credentials
      const sanitizedEnv: NodeJS.ProcessEnv = {
        // Preserve only OS process-discovery variables; never inherit application configuration.
        PATH: process.env.PATH,
        NODE_ENV: 'production',
        SystemRoot: process.env.SystemRoot,
        WINDIR: process.env.WINDIR,
        PATHEXT: process.env.PATHEXT,
        TEMP: sandboxDir,
        TMP: sandboxDir,
        HOME: sandboxDir,
        USERPROFILE: sandboxDir,
        PYTHONIOENCODING: 'utf-8',
        PYTHONDONTWRITEBYTECODE: '1',
      };

      // 6. Spawn python process
      // On Windows, py.exe launcher directs to the active Python installation
      const pythonExe = process.platform === 'win32' ? 'py' : 'python3';

      const execPromise = new Promise<{
        exitCode: number;
        stdout: string;
        stderr: string;
      }>((resolve) => {
        let stdoutData = '';
        let stderrData = '';
        let processExited = false;

        const child = spawn(pythonExe, ['-X', 'utf8', scriptPath, ...(request.args || [])], {
          cwd: sandboxDir,
          env: sanitizedEnv,
          timeout: timeoutMs,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        child.stdout.on('data', (data) => {
          stdoutData += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderrData += data.toString();
        });

        const timer = setTimeout(() => {
          if (!processExited) {
            try {
              child.kill('SIGTERM');
              // Force kill after 1s if still running
              setTimeout(() => child.kill('SIGKILL'), 1000);
            } catch {
              // Ignore
            }
          }
        }, timeoutMs);

        child.on('error', (err) => {
          clearTimeout(timer);
          processExited = true;
          resolve({
            exitCode: 1,
            stdout: stdoutData,
            stderr: `${stderrData}\nProcess spawn error: ${err.message}`,
          });
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          processExited = true;
          resolve({
            exitCode: code ?? 0,
            stdout: stdoutData,
            stderr: stderrData,
          });
        });
      });

      const { exitCode, stdout, stderr } = await execPromise;
      const durationMs = Date.now() - startTime;

      // 7. Collect newly generated files
      const filesAfter = await fs.readdir(sandboxDir);
      const generatedFiles: GeneratedFile[] = [];

      for (const filename of filesAfter) {
        if (!filesBefore.has(filename) && filename !== 'script.py') {
          const filePath = path.join(sandboxDir, filename);
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            const buffer = await fs.readFile(filePath);
            generatedFiles.push({
              filename,
              sizeBytes: stat.size,
              buffer,
              mimeType: getMimeType(filename),
            });
          }
        }
      }

      return {
        success: exitCode === 0,
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs,
        generatedFiles,
      };
    } catch (err: any) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message || 'Execution error',
        durationMs: Date.now() - startTime,
        error: err.message,
        generatedFiles: [],
      };
    } finally {
      // 8. Always clean up temporary sandbox directory
      try {
        await fs.rm(sandboxDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup error in finally
      }
    }
  }
}

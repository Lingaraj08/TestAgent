import { z } from 'zod';
import { PythonSandbox } from '@/sandbox/python-runner';
import type { ToolDefinition, ToolResult } from '@/types/tools';

export const executeCodeTool: ToolDefinition = {
  name: 'execute_code',
  description: 'Execute Python code in an isolated, secure sandbox. Standard output, errors, and execution metrics are returned. Never pass production secrets to user code.',
  permission: 'safe',
  parameters: z.object({
    code: z.string().describe('The Python code to execute'),
    timeoutSeconds: z.number().optional().default(20).describe('Max execution time in seconds'),
  }),
  execute: async ({ code, timeoutSeconds = 20 }, context): Promise<ToolResult> => {
    if (code.length > 50_000) return { success: false, error: 'Code exceeds the 50 KB sandbox limit.' };
    if (/\b(socket|requests|urllib|http\.client|subprocess|os\.system|shutil\.rmtree)\b/.test(code)) {
      return { success: false, error: 'Network, process-control, and destructive filesystem modules are not allowed in the sandbox.' };
    }
    context.onEvent?.({
      type: 'tool_start',
      message: 'Running Python in isolated sandbox...',
      toolName: 'execute_code',
    });

    const result = await PythonSandbox.execute({
      code,
      language: 'python',
      timeoutMs: Math.min(Math.max(timeoutSeconds, 1), 25) * 1000,
    });

    if (!result.success) {
      return {
        success: false,
        data: {
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          durationMs: result.durationMs,
        },
        error: `Python execution failed with exit code ${result.exitCode}:\n${result.stderr || result.stdout}`,
        summary: `Execution error (${result.durationMs}ms):\n${result.stderr || result.stdout}`,
      };
    }

    const outputText = result.stdout || '(Executed with no standard output)';
    return {
      success: true,
      data: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: result.durationMs,
        generatedFileCount: result.generatedFiles.length,
      },
      summary: `Python executed successfully in ${result.durationMs}ms.\n\nOutput:\n${outputText}`,
    };
  },
};

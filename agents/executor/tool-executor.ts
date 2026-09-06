import { ToolRegistry } from '@/tools/registry';
import { createServiceClient } from '@/lib/supabase/server';
import type { ToolResult, ToolExecutionContext } from '@/types/tools';
import type { OperationalEvent } from '../types';
import { enforceRateLimit } from '@/lib/server/guard';

export interface ExecuteOptions {
  maxRetries?: number;
  onEvent?: (event: OperationalEvent) => void;
}

export class ToolExecutor {
  /**
   * Execute a tool with retry logic, error recovery, and persistence in tool_executions
   */
  static async executeWithRetry(
    toolName: string,
    input: any,
    context: ToolExecutionContext,
    options: ExecuteOptions = {}
  ): Promise<ToolResult> {
    const maxRetries = options.maxRetries ?? 2;
    try { enforceRateLimit(context.userId, `tool:${toolName}`, toolName === 'execute_code' ? 10 : 30, 60_000); } catch (error: any) { return { success: false, error: error.message }; }
    let attempt = 0;
    let lastError: string | undefined;
    let currentInput = { ...input };

    const startTime = Date.now();
    let executionRecordId: string | null = null;

    // 1. Record tool execution in database
    try {
      const supabase = await createServiceClient();
      const toolDef = ToolRegistry.get(toolName);

      const { data: record } = await supabase
        .from('tool_executions')
        .insert({
          user_id: context.userId,
          agent_run_id: context.agentRunId || null,
          conversation_id: context.conversationId || null,
          tool_name: toolName,
          status: 'running',
          permission_level: toolDef?.permission || 'safe',
          input_safe: typeof currentInput === 'object' ? currentInput : { raw: String(currentInput) },
        })
        .select('id')
        .single();

      if (record) executionRecordId = record.id;
    } catch (dbErr) {
      console.warn('Could not record tool execution in DB:', dbErr);
    }

    // 2. Retry loop
    while (attempt <= maxRetries) {
      attempt++;

      try {
        if (attempt > 1) {
          options.onEvent?.({
            id: `retry-${Date.now()}`,
            type: 'tool_retry',
            message: `Retrying tool "${toolName}" (attempt ${attempt}/${maxRetries + 1})...`,
            toolName,
            timestamp: new Date().toISOString(),
          });
        }

        const result = await ToolRegistry.execute(toolName, currentInput, context);

        if (result.success) {
          const durationMs = Date.now() - startTime;

          // Update tool execution in DB
          if (executionRecordId) {
            try {
              const supabase = await createServiceClient();
              await supabase
                .from('tool_executions')
                .update({
                  status: 'completed',
                  output_safe: result.data || { summary: result.summary },
                  duration_ms: durationMs,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', executionRecordId);
            } catch {
              // Ignore
            }
          }

          options.onEvent?.({
            id: `complete-${Date.now()}`,
            type: 'tool_complete',
            message: `Completed "${toolName}" successfully.`,
            toolName,
            timestamp: new Date().toISOString(),
            data: result.data,
          });

          return result;
        }

        // Tool returned success: false
        lastError = result.error || 'Unknown tool failure';

        // Error recovery heuristics: attempt input repairs
        if (attempt <= maxRetries) {
          currentInput = this.repairInput(toolName, currentInput, lastError);
        }
      } catch (err: any) {
        lastError = err.message || 'Tool execution threw error';
        if (attempt <= maxRetries) {
          currentInput = this.repairInput(toolName, currentInput, lastError!);
        }
      }
    }

    // 3. Mark failed in DB
    const durationMs = Date.now() - startTime;
    if (executionRecordId) {
      try {
        const supabase = await createServiceClient();
        await supabase
          .from('tool_executions')
          .update({
            status: 'failed',
            error: lastError,
            duration_ms: durationMs,
            completed_at: new Date().toISOString(),
          })
          .eq('id', executionRecordId);
      } catch {
        // Ignore
      }
    }

    options.onEvent?.({
      id: `err-${Date.now()}`,
      type: 'tool_error',
      message: `Tool "${toolName}" failed after ${attempt} attempt(s): ${lastError}`,
      toolName,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: `Tool "${toolName}" failed after ${attempt} attempt(s): ${lastError}`,
    };
  }

  /**
   * Attempt structured input repair based on common errors
   */
  private static repairInput(toolName: string, input: any, errorMsg: string): any {
    const repaired = { ...input };

    if (toolName === 'web_search') {
      // If query failed or returned empty, simplify keywords
      if (repaired.query && typeof repaired.query === 'string') {
        const words = repaired.query.split(' ');
        if (words.length > 4) {
          repaired.query = words.slice(0, 4).join(' ');
        }
      }
    } else if (toolName.startsWith('generate_')) {
      // If syntax error in generated Python code, sanitize quotes
      if (repaired.pythonCode && typeof repaired.pythonCode === 'string') {
        if (errorMsg.includes('SyntaxError') || errorMsg.includes('IndentationError')) {
          repaired.pythonCode = repaired.pythonCode.replace(/\t/g, '    ');
        }
      }
    }

    return repaired;
  }
}

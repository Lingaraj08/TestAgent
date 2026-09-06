import { describe, expect, it } from 'vitest';
import { executeCodeTool } from '@/tools/code-execution';
describe('code execution safety', () => {
  it('rejects network and process-control code before spawning Python', async () => {
    const result = await executeCodeTool.execute({ code: 'import socket\nsocket.socket()', timeoutSeconds: 1 }, { userId: 'test-user' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
  });
  it('caps requested sandbox timeouts', async () => {
    const result = await executeCodeTool.execute({ code: 'print("ok")', timeoutSeconds: 100 }, { userId: 'test-user' });
    expect(result.data?.durationMs ?? 0).toBeLessThan(30_000);
  });
});

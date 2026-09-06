import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '@/tools/registry';
import { z } from 'zod';
import type { ToolDefinition } from '@/types/tools';

describe('ToolRegistry', () => {
  it('initializes default core tools', () => {
    ToolRegistry.initDefaults();
    const tools = ToolRegistry.getAll();
    expect(tools.length).toBeGreaterThan(0);

    const names = tools.map((t) => t.name);
    expect(names).toContain('web_search');
    expect(names).toContain('read_file');
    expect(names).toContain('create_file');
    expect(names).toContain('execute_code');
    expect(names).toContain('generate_excel');
    expect(names).toContain('generate_word');
    expect(names).toContain('generate_pdf');
    expect(names).toContain('generate_powerpoint');
  });

  it('can register and retrieve a custom tool', () => {
    const customTool: ToolDefinition = {
      name: 'test_calculator',
      description: 'A test calculator tool',
      category: 'code',
      permission: 'safe',
      parameters: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }) => ({
        success: true,
        data: { sum: a + b },
        summary: `Sum is ${a + b}`,
      }),
    };

    ToolRegistry.register(customTool);
    const retrieved = ToolRegistry.get('test_calculator');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('test_calculator');
  });

  it('validates tool parameters with Zod schema', async () => {
    const context = { userId: 'user-123' };
    
    // Valid input
    const validResult = await ToolRegistry.execute(
      'test_calculator',
      { a: 10, b: 20 },
      context
    );
    expect(validResult.success).toBe(true);
    expect(validResult.data?.sum).toBe(30);

    // Invalid input (missing parameter b)
    const invalidResult = await ToolRegistry.execute(
      'test_calculator',
      { a: 10 },
      context
    );
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain('parameter validation error');
  });

  it('returns failure for unregistered tools', async () => {
    const context = { userId: 'user-123' };
    const result = await ToolRegistry.execute('non_existent_tool', {}, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not registered');
  });
});

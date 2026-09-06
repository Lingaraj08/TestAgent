import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAICompatibleAdapter } from '@/lib/providers/openai-compatible';

describe('OpenAICompatibleAdapter', () => {
  const config = {
    id: 'test-prov-1',
    name: 'OpenAI Test',
    type: 'openai-compatible' as const,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test-key',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should infer capabilities correctly for known model families', async () => {
    const adapter = new OpenAICompatibleAdapter(config);

    // Mock fetch for /models
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'o1-mini', name: 'o1-mini' },
          { id: 'gpt-3.5-turbo-instruct', name: 'Instruct Model' },
        ],
      }),
    } as any);

    const models = await adapter.listModels();

    expect(models).toHaveLength(3);

    const gpt4o = models.find((m) => m.providerModelId === 'gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o?.supportsVision).toBe(true);
    expect(gpt4o?.supportsTools).toBe(true);

    const o1Mini = models.find((m) => m.providerModelId === 'o1-mini');
    expect(o1Mini).toBeDefined();
    expect(o1Mini?.supportsReasoning).toBe(true);
  });

  it('should return connection test success when API responds with models', async () => {
    const adapter = new OpenAICompatibleAdapter(config);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'gpt-4o' }],
      }),
    } as any);

    const result = await adapter.testConnection();
    expect(result.success).toBe(true);
    expect(result.modelsFound).toBe(1);
    expect(result.message).toContain('Connected successfully');
  });

  it('should return helpful error message for 401 Unauthorized', async () => {
    const adapter = new OpenAICompatibleAdapter(config);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as any);

    const result = await adapter.testConnection();
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid API key');
  });

  it('should return helpful error message for 429 Rate Limit', async () => {
    const adapter = new OpenAICompatibleAdapter(config);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    } as any);

    const result = await adapter.testConnection();
    expect(result.success).toBe(false);
    expect(result.message).toContain('Rate limited');
  });
});

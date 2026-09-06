import { describe, it, expect, vi } from 'vitest';
import { ModelSelector } from '@/lib/models/selector';
import { ModelRegistry } from '@/lib/models/registry';

describe('ModelSelector', () => {
  it('should return helpful error message if no models are available', async () => {
    vi.spyOn(ModelRegistry, 'getUserModels').mockResolvedValue([]);

    const result = await ModelSelector.selectModel('user-1', { mode: 'auto' });

    expect(result.selectedModel).toBeNull();
    expect(result.error).toContain('No AI models available');
  });

  it('should prioritize flagship models in Auto mode', async () => {
    const mockModels: any[] = [
      { id: 'm-1', provider_model_id: 'llama-3-8b', display_name: 'Llama 3 8B', supports_tools: false, supports_vision: false },
      { id: 'm-2', provider_model_id: 'gpt-4o', display_name: 'GPT-4o', supports_tools: true, supports_vision: true },
      { id: 'm-3', provider_model_id: 'mistral-7b', display_name: 'Mistral 7B', supports_tools: false, supports_vision: false },
    ];

    vi.spyOn(ModelRegistry, 'getUserModels').mockResolvedValue(mockModels);

    const result = await ModelSelector.selectModel('user-1', { mode: 'auto' });

    expect(result.selectedModel).toBeDefined();
    expect(result.selectedModel?.provider_model_id).toBe('gpt-4o');
    expect(result.isAuto).toBe(true);
  });

  it('should allow manual model selection', async () => {
    const mockModels: any[] = [
      { id: 'm-1', provider_model_id: 'gpt-4o', display_name: 'GPT-4o' },
      { id: 'm-2', provider_model_id: 'claude-3-5-sonnet', display_name: 'Claude 3.5 Sonnet' },
    ];

    vi.spyOn(ModelRegistry, 'getUserModels').mockResolvedValue(mockModels);

    const result = await ModelSelector.selectModel('user-1', {
      mode: 'manual',
      modelId: 'm-2',
    });

    expect(result.selectedModel?.id).toBe('m-2');
    expect(result.isAuto).toBe(false);
  });
});

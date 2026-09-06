import { ModelRegistry, type ModelWithProvider } from './registry';

export interface SelectionResult {
  selectedModel: ModelWithProvider | null;
  error?: string;
  isAuto: boolean;
}

export class ModelSelector {
  /**
   * Select a model based on user preference (Auto or explicit model ID)
   */
  static async selectModel(
    userId: string,
    preference: { mode: 'auto' | 'manual'; modelId?: string | null }
  ): Promise<SelectionResult> {
    const models = await ModelRegistry.getUserModels(userId);

    if (!models || models.length === 0) {
      return {
        selectedModel: null,
        error: 'No AI models available. Please configure an AI provider in Settings -> Models first.',
        isAuto: preference.mode === 'auto',
      };
    }

    // Manual mode
    if (preference.mode === 'manual' && preference.modelId) {
      const found = models.find((m) => m.id === preference.modelId);
      if (found) {
        return {
          selectedModel: found,
          isAuto: false,
        };
      }
      // If manual model was not found (e.g. deleted), fall through to auto
    }

    // Auto mode: Deterministic strategy
    // Priority 1: Flagship high-capability models (gpt-4o, sonnet, etc.)
    // Priority 2: Vision + Tools support
    // Priority 3: First available model
    const priorityKeywords = ['4o', 'sonnet', 'opus', 'gpt-4', 'o1', 'o3', 'claude-3'];
    
    let autoModel = models.find((m) =>
      priorityKeywords.some((kw) => m.provider_model_id.toLowerCase().includes(kw))
    );

    if (!autoModel) {
      autoModel = models.find((m) => m.supports_tools && m.supports_vision);
    }

    if (!autoModel) {
      autoModel = models[0];
    }

    return {
      selectedModel: autoModel,
      isAuto: true,
    };
  }
}

import { ModelRegistry, type ModelWithProvider } from '@/lib/models/registry';

export interface RoutingCriteria {
  taskType?: 'chat' | 'agent' | 'search' | 'code' | 'document';
  requiresTools?: boolean;
  requiresVision?: boolean;
  requiresReasoning?: boolean;
  minContextWindow?: number;
  manualModelId?: string | null;
  mode?: 'auto' | 'manual';
}

export interface ModelRoutingResult {
  selectedModel: ModelWithProvider | null;
  score?: number;
  reason: string;
  isAuto: boolean;
}

export class ModelRouter {
  /**
   * Deterministically score and select the best model meeting all required capabilities.
   */
  static async route(
    userId: string,
    criteria: RoutingCriteria
  ): Promise<ModelRoutingResult> {
    const models = await ModelRegistry.getUserModels(userId);

    if (!models || models.length === 0) {
      return {
        selectedModel: null,
        reason: 'No AI models available. Please configure an AI provider in Settings -> Models.',
        isAuto: criteria.mode !== 'manual',
      };
    }

    // Manual mode takes precedence
    if (criteria.mode === 'manual' && criteria.manualModelId) {
      const found = models.find((m) => m.id === criteria.manualModelId);
      if (found) {
        return {
          selectedModel: found,
          reason: `Manually selected: ${found.display_name}`,
          isAuto: false,
        };
      }
    }

    // Filter models by hard constraints
    const eligible = models.filter((m) => {
      if (criteria.requiresTools && !m.supports_tools) return false;
      if (criteria.requiresVision && !m.supports_vision) return false;
      if (criteria.requiresReasoning && !m.supports_reasoning) return false;
      if (criteria.minContextWindow && (m.context_window || 0) < criteria.minContextWindow) {
        return false;
      }
      return true;
    });

    const candidates = eligible.length > 0 ? eligible : models;

    // Score candidates deterministically
    // Score factors: Flagship capability, Tool support, Reasoning, Context window
    let bestModel: ModelWithProvider | null = null;
    let bestScore = -1;

    for (const model of candidates) {
      let score = 0;
      const id = model.provider_model_id.toLowerCase();

      // Flagship model tiers
      if (id.includes('4o') || id.includes('claude-3-5-sonnet') || id.includes('sonnet')) {
        score += 50;
      } else if (id.includes('gpt-4') || id.includes('opus')) {
        score += 40;
      } else if (id.includes('o1') || id.includes('o3') || id.includes('o4')) {
        score += 45;
      } else if (id.includes('mini') || id.includes('haiku') || id.includes('flash')) {
        score += 25;
      } else {
        score += 10;
      }

      // Capability bonuses
      if (model.supports_tools) score += 20;
      if (model.supports_vision) score += 10;
      if (model.supports_reasoning) score += 10;
      if (model.supports_structured_output) score += 5;

      // Context window tier
      if ((model.context_window || 0) >= 128000) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    const selected = bestModel || candidates[0] || models[0];

    return {
      selectedModel: selected,
      score: bestScore,
      reason: eligible.length === 0 && (criteria.requiresTools || criteria.requiresVision)
        ? `Selected ${selected.display_name} (Warning: no model strictly matching all constraints found; using best available).`
        : `Automatically routed to ${selected.display_name} based on capability scoring.`,
      isAuto: true,
    };
  }
}

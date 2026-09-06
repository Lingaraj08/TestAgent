import type { ProviderAdapter } from './base';
import { OpenAICompatibleAdapter } from './openai-compatible';
import type { ProviderConfig } from '@/types/providers';

/**
 * Registry/Factory for creating provider adapters.
 * Enables adding other provider types (Anthropic, Google, etc.) in the future.
 */
export class ProviderRegistry {
  private static adapters: Map<string, ProviderAdapter> = new Map();

  static getAdapter(config: ProviderConfig): ProviderAdapter {
    switch (config.type) {
      case 'openai-compatible':
        return new OpenAICompatibleAdapter(config);
      default:
        // Default to OpenAI-compatible if custom or unknown
        return new OpenAICompatibleAdapter(config);
    }
  }
}

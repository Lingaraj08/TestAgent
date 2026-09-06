import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { ProviderAdapter } from './base';
import type { ConnectionTestResult, DiscoveredModel, ProviderConfig } from '@/types/providers';

// Known model capabilities for common models
const KNOWN_CAPABILITIES: Record<string, Partial<DiscoveredModel>> = {
  'gpt-4': { supportsVision: false, supportsTools: true, contextWindow: 8192 },
  'gpt-4-turbo': { supportsVision: true, supportsTools: true, contextWindow: 128000 },
  'gpt-4o': { supportsVision: true, supportsTools: true, supportsStructuredOutput: true, contextWindow: 128000 },
  'gpt-4o-mini': { supportsVision: true, supportsTools: true, supportsStructuredOutput: true, contextWindow: 128000 },
  'gpt-4.1': { supportsVision: true, supportsTools: true, supportsStructuredOutput: true, contextWindow: 1047576 },
  'gpt-4.1-mini': { supportsVision: true, supportsTools: true, supportsStructuredOutput: true, contextWindow: 1047576 },
  'gpt-4.1-nano': { supportsVision: true, supportsTools: true, supportsStructuredOutput: true, contextWindow: 1047576 },
  'o1': { supportsReasoning: true, supportsTools: true, contextWindow: 200000 },
  'o1-mini': { supportsReasoning: true, contextWindow: 128000 },
  'o1-pro': { supportsReasoning: true, supportsTools: true, contextWindow: 200000 },
  'o3': { supportsReasoning: true, supportsTools: true, contextWindow: 200000 },
  'o3-mini': { supportsReasoning: true, supportsTools: true, contextWindow: 200000 },
  'o4-mini': { supportsReasoning: true, supportsTools: true, supportsVision: true, contextWindow: 200000 },
  'claude-3-5-sonnet': { supportsVision: true, supportsTools: true, contextWindow: 200000 },
  'claude-3-5-haiku': { supportsVision: true, supportsTools: true, contextWindow: 200000 },
  'claude-sonnet-4': { supportsVision: true, supportsTools: true, contextWindow: 200000 },
  'claude-opus-4': { supportsVision: true, supportsTools: true, contextWindow: 200000 },
};

function inferCapabilities(modelId: string): Partial<DiscoveredModel> {
  // Check exact matches first
  if (KNOWN_CAPABILITIES[modelId]) {
    return KNOWN_CAPABILITIES[modelId];
  }

  // Check prefix matches
  for (const [key, caps] of Object.entries(KNOWN_CAPABILITIES)) {
    if (modelId.startsWith(key)) {
      return caps;
    }
  }

  // Infer from name patterns
  const id = modelId.toLowerCase();
  return {
    supportsVision: id.includes('vision') || id.includes('4o') || id.includes('4.1'),
    supportsTools: !id.includes('instruct') && !id.includes('davinci') && !id.includes('babbage'),
    supportsReasoning: id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4'),
    supportsStructuredOutput: id.includes('gpt-4o') || id.includes('4.1'),
    supportsImageGeneration: id.includes('dall-e') || id.includes('image'),
  };
}

export class OpenAICompatibleAdapter implements ProviderAdapter {
  private config: ProviderConfig;
  private openai: ReturnType<typeof createOpenAI>;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.openai = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  getConfig(): ProviderConfig {
    return this.config;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();

    try {
      const models = await this.listModels();
      const latencyMs = Date.now() - start;

      return {
        success: true,
        message: `Connected successfully. Found ${models.length} models.`,
        modelsFound: models.length,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Provide helpful error messages
      if (message.includes('401') || message.includes('Unauthorized')) {
        return {
          success: false,
          message: 'Invalid API key. Please check your credentials.',
          latencyMs,
        };
      }
      if (message.includes('403') || message.includes('Forbidden')) {
        return {
          success: false,
          message: 'Access denied. Your API key may not have sufficient permissions.',
          latencyMs,
        };
      }
      if (message.includes('404')) {
        return {
          success: false,
          message: 'API endpoint not found. Please check the base URL.',
          latencyMs,
        };
      }
      if (message.includes('429')) {
        return {
          success: false,
          message: 'Rate limited. Please try again later.',
          latencyMs,
        };
      }
      if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
        return {
          success: false,
          message: 'Could not connect to the API. Please check the URL.',
          latencyMs,
        };
      }
      if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        return {
          success: false,
          message: 'Connection timed out. The server may be unreachable.',
          latencyMs,
        };
      }

      return {
        success: false,
        message: `Connection failed: ${message}`,
        latencyMs,
      };
    }
  }

  async listModels(): Promise<DiscoveredModel[]> {
    // Fetch models from the OpenAI-compatible /models endpoint
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`API returned ${response.status}: ${text}`);
    }

    const data = await response.json();
    const models = data.data || data;

    if (!Array.isArray(models)) {
      throw new Error('Unexpected response format from models endpoint');
    }

    return models
      .filter((m: { id?: string }) => m.id)
      .map((m: { id: string; name?: string; context_length?: number; context_window?: number }) => {
        const capabilities = inferCapabilities(m.id);
        return {
          providerModelId: m.id,
          displayName: m.name || m.id,
          contextWindow: m.context_length || m.context_window || capabilities.contextWindow || null,
          supportsText: true,
          supportsVision: capabilities.supportsVision || false,
          supportsTools: capabilities.supportsTools || false,
          supportsReasoning: capabilities.supportsReasoning || false,
          supportsStructuredOutput: capabilities.supportsStructuredOutput || false,
          supportsImageGeneration: capabilities.supportsImageGeneration || false,
          pricingInput: null,
          pricingOutput: null,
        } satisfies DiscoveredModel;
      })
      .sort((a: DiscoveredModel, b: DiscoveredModel) => a.displayName.localeCompare(b.displayName));
  }

  createLanguageModel(modelId: string): LanguageModel {
    return this.openai(modelId);
  }
}

// Provider system type definitions

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'openai-compatible';
  baseUrl: string;
  apiKey: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  modelsFound?: number;
  latencyMs?: number;
}

export interface DiscoveredModel {
  providerModelId: string;
  displayName: string;
  contextWindow?: number | null;
  supportsText: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
  supportsStructuredOutput: boolean;
  supportsImageGeneration: boolean;
  pricingInput?: number | null;
  pricingOutput?: number | null;
}

export interface ModelSelection {
  mode: 'auto' | 'manual';
  modelId?: string;
}

export type ProviderType = 'openai-compatible';

export const PROVIDER_TYPES: { value: ProviderType; label: string; defaultBaseUrl: string }[] = [
  {
    value: 'openai-compatible',
    label: 'OpenAI Compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
];

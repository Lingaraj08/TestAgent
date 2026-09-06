import type { LanguageModel } from 'ai';
import type { ConnectionTestResult, DiscoveredModel, ProviderConfig } from '@/types/providers';

/**
 * Base interface for all provider adapters.
 * Each AI provider (OpenAI, Anthropic, etc.) implements this interface.
 */
export interface ProviderAdapter {
  /** Test the connection to the provider */
  testConnection(): Promise<ConnectionTestResult>;

  /** Discover available models from the provider */
  listModels(): Promise<DiscoveredModel[]>;

  /** Create a Vercel AI SDK language model instance */
  createLanguageModel(modelId: string): LanguageModel;

  /** Get the provider configuration */
  getConfig(): ProviderConfig;
}

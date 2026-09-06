# Provider & Model Discovery System

The provider system allows connecting any OpenAI-compatible API without modifying application source code.

## Provider Abstraction

All provider adapters adhere to the `ProviderAdapter` interface defined in `lib/providers/base.ts`:

```typescript
export interface ProviderAdapter {
  testConnection(): Promise<ConnectionTestResult>;
  listModels(): Promise<DiscoveredModel[]>;
  createLanguageModel(modelId: string): LanguageModelV1;
  getConfig(): ProviderConfig;
}
```

### Supported Provider Types

Currently, `openai-compatible` is the standard adapter (`lib/providers/openai-compatible.ts`). It supports:
- Standard OpenAI (`https://api.openai.com/v1`)
- OpenRouter (`https://openrouter.ai/api/v1`)
- Groq (`https://api.groq.com/openai/v1`)
- Together AI (`https://api.together.xyz/v1`)
- Mistral AI (`https://api.mistral.ai/v1`)
- Local Ollama (`http://localhost:11434/v1`)
- Any custom or self-hosted OpenAI-compliant gateway (vLLM, TGI, LiteLLM)

### Dynamic Model Discovery Lifecycle

1. User enters provider name, base URL, and API key in **Models -> Add Provider**.
2. Key is encrypted on the server (`lib/encryption.ts`) and stored in Supabase.
3. User triggers **Test Connection** (`POST /api/providers/[id]/test`):
   - Decrypts key in server environment.
   - Pings provider `/models` endpoint.
   - Normalizes model descriptors and infers capabilities (vision, reasoning, tools, context length).
   - Upserts discovered models to the `models` table.
   - Updates provider status to `connected` or `failed` with latency benchmark.
4. Models immediately appear in the UI Model Selector.

### Model Selection Strategies

- **Auto Mode (Default)**: Deterministically chooses the best available model (prioritizing flagship models with tool/vision support like GPT-4o, Claude 3.5 Sonnet, etc.).
- **Manual Mode**: Allows explicit selection of any specific discovered model.
- **Graceful Fallback**: If no providers or models are configured, clear setup instructions are displayed instead of crashing.

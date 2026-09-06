import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { ProviderRegistry } from '@/lib/providers/registry';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: providerId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Fetch provider record
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('*')
    .eq('id', providerId)
    .eq('user_id', user.id)
    .single();

  if (providerError || !provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  try {
    // 2. Decrypt API key
    const decryptedKey = decrypt(provider.api_key_encrypted);

    // 3. Instantiate adapter
    const adapter = ProviderRegistry.getAdapter({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.base_url,
      apiKey: decryptedKey,
    });

    // 4. Test connection
    const testResult = await adapter.testConnection();

    if (!testResult.success) {
      // Update status to failed
      await supabase
        .from('providers')
        .update({
          connection_status: 'failed',
          last_tested_at: new Date().toISOString(),
        })
        .eq('id', provider.id);

      return NextResponse.json({
        success: false,
        message: testResult.message,
        latencyMs: testResult.latencyMs,
      });
    }

    // 5. Discover models
    const discoveredModels = await adapter.listModels();

    // 6. Upsert models into database for this provider
    const now = new Date().toISOString();
    const modelRecords = discoveredModels.map((m) => ({
      provider_id: provider.id,
      user_id: user.id,
      provider_model_id: m.providerModelId,
      display_name: m.displayName,
      context_window: m.contextWindow || null,
      supports_text: m.supportsText,
      supports_vision: m.supportsVision,
      supports_tools: m.supportsTools,
      supports_reasoning: m.supportsReasoning,
      supports_structured_output: m.supportsStructuredOutput,
      supports_image_generation: m.supportsImageGeneration,
      pricing_input: m.pricingInput || null,
      pricing_output: m.pricingOutput || null,
      is_available: true,
      last_seen_at: now,
      updated_at: now,
    }));

    if (modelRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('models')
        .upsert(modelRecords, {
          onConflict: 'provider_id,provider_model_id',
        });

      if (upsertError) {
        console.error('Failed to upsert models:', upsertError);
      }
    }

    // 7. Update provider status to connected
    await supabase
      .from('providers')
      .update({
        connection_status: 'connected',
        last_tested_at: now,
      })
      .eq('id', provider.id);

    return NextResponse.json({
      success: true,
      message: testResult.message,
      modelsFound: discoveredModels.length,
      latencyMs: testResult.latencyMs,
      models: discoveredModels,
    });
  } catch (error: any) {
    console.error('Provider test error:', error);
    await supabase
      .from('providers')
      .update({
        connection_status: 'failed',
        last_tested_at: new Date().toISOString(),
      })
      .eq('id', provider.id);

    return NextResponse.json({
      success: false,
      message: error.message || 'Connection test failed',
    }, { status: 500 });
  }
}

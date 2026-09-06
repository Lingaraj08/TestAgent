import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { ProviderRegistry } from '@/lib/providers/registry';
import { ModelSelector } from '@/lib/models/selector';
import { streamText } from 'ai';
import { NextResponse, type NextRequest } from 'next/server';
import { enforceRateLimit, requireOwnedConversation, safeError as sanitizeError } from '@/lib/server/guard';
import { documentPolicyFor } from '@/lib/prompts/document-standards';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      conversationId: incomingConvId,
      messages: clientMessages,
      modelSelection = { mode: 'auto' },
    } = body;

    if (!clientMessages || !Array.isArray(clientMessages) || clientMessages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }
    if (clientMessages.length > 80 || clientMessages.some((m: any) => typeof m?.content !== 'string' || m.content.length > 20_000)) return NextResponse.json({ error: 'Conversation payload is too large.' }, { status: 413 });
    enforceRateLimit(user.id, 'chat', 40, 60_000);

    // 1. Resolve or create conversation
    let conversationId = incomingConvId;
    let isNewConversation = false;

    if (!conversationId) {
      // Auto-title from the first user message
      const firstUserMsg = clientMessages.find((m: any) => m.role === 'user')?.content || 'New Chat';
      const cleanTitle = firstUserMsg.slice(0, 40).trim() || 'New Chat';

      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: cleanTitle,
          is_auto_model: modelSelection.mode === 'auto',
          model_id: modelSelection.modelId || null,
        })
        .select('*')
        .single();

      if (convErr || !conv) {
        return NextResponse.json({ error: 'Failed to create conversation: ' + convErr?.message }, { status: 500 });
      }

      conversationId = conv.id;
      isNewConversation = true;
    }
    await requireOwnedConversation(user.id, conversationId);

    // 2. Resolve AI Model & Provider
    const selection = await ModelSelector.selectModel(user.id, {
      mode: modelSelection.mode || 'auto',
      modelId: modelSelection.modelId,
    });

    if (!selection.selectedModel) {
      return NextResponse.json(
        { error: selection.error || 'No AI model available. Please configure a provider in Settings.' },
        { status: 400 }
      );
    }

    const selectedModel = selection.selectedModel;

    // 3. Fetch provider credentials
    const { data: provider, error: providerErr } = await supabase
      .from('providers')
      .select('*')
      .eq('id', selectedModel.provider_id)
      .eq('user_id', user.id)
      .single();

    if (providerErr || !provider) {
      return NextResponse.json({ error: 'Associated provider not found or access denied.' }, { status: 404 });
    }

    if (!provider.is_enabled) {
      return NextResponse.json({ error: `Provider "${provider.name}" is disabled. Please enable it in Settings.` }, { status: 400 });
    }

    // Decrypt key
    let decryptedKey: string;
    try {
      decryptedKey = decrypt(provider.api_key_encrypted);
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt provider API key. Please reconfigure the provider.' }, { status: 500 });
    }

    // Create provider adapter
    const adapter = ProviderRegistry.getAdapter({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.base_url,
      apiKey: decryptedKey,
    });

    // 4. Save latest user message to DB
    const latestUserMsg = clientMessages[clientMessages.length - 1];
    if (latestUserMsg && latestUserMsg.role === 'user') {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: latestUserMsg.content,
        model_id: selectedModel.id,
        provider_id: provider.id,
      });
    }

    // Prepare message history for model
    const formattedMessages: any[] = clientMessages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));
    const documentPolicy = documentPolicyFor(latestUserMsg?.content || '');
    if (documentPolicy) {
      formattedMessages.unshift({ role: 'system', content: documentPolicy });
    }

    const startTime = Date.now();
    const languageModel = adapter.createLanguageModel(selectedModel.provider_model_id);

    // 5. Stream response with Vercel AI SDK
    const streamResult = streamText({
      model: languageModel,
      messages: formattedMessages,
      onFinish: async ({ text, usage }) => {
        const durationMs = Date.now() - startTime;
        try {
          // Persist assistant message in DB
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: 'assistant',
            content: text,
            model_id: selectedModel.id,
            provider_id: provider.id,
            tokens_input: usage?.inputTokens || null,
            tokens_output: usage?.outputTokens || null,
            duration_ms: durationMs,
          });

          // Record usage event
          await supabase.from('usage_events').insert({
            user_id: user.id,
            provider_id: provider.id,
            model_id: selectedModel.id,
            conversation_id: conversationId,
            event_type: 'chat',
            tokens_input: usage?.inputTokens || null,
            tokens_output: usage?.outputTokens || null,
          });

          // Touch conversation updated_at
          await supabase
            .from('conversations')
            .update({
              updated_at: new Date().toISOString(),
              model_id: selectedModel.id,
            })
            .eq('id', conversationId);
        } catch (dbErr) {
          console.error('Failed to save assistant message:', dbErr);
        }
      },
    });

    // AI SDK v7 exposes the text-stream response helper. The client accepts
    // both plain streamed text and legacy data-stream chunks.
    const response = streamResult.toTextStreamResponse({
      headers: {
        'x-conversation-id': conversationId,
        'x-is-new-conversation': isNewConversation ? 'true' : 'false',
        'x-selected-model-id': selectedModel.id,
        'x-selected-model-name': selectedModel.display_name,
        'x-is-auto': selection.isAuto ? 'true' : 'false',
      },
    });

    return response;
  } catch (error: any) {
    console.error('Chat API error:', error);
    const msg = error?.message || 'Chat generation failed';

    // Sanitize error messages so secrets / raw URLs are not leaked
    let safeError = 'An error occurred while generating the response.';
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      safeError = 'Provider rejected credentials (401 Unauthorized). Check your API key.';
    } else if (msg.includes('429')) {
      safeError = 'Provider rate limit reached (429). Please wait before trying again.';
    } else if (msg.includes('404')) {
      safeError = 'Selected model or endpoint not found on the provider (404).';
    } else if (msg.includes('timeout')) {
      safeError = 'Provider request timed out.';
    } else if (msg) {
      safeError = sanitizeError(error, 'Chat generation failed.');
    }

    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

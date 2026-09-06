import { createClient } from '@/lib/supabase/server';
import { AgentSupervisor } from '@/agents/supervisor/agent-supervisor';
import { NextResponse, type NextRequest } from 'next/server';
import { enforceRateLimit, requireOwnedConversation, safeError } from '@/lib/server/guard';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      prompt,
      conversationId: incomingConvId,
      attachments = [],
      mode = 'agent',
      modelId = null,
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'A prompt string is required.' }, { status: 400 });
    }
    if (prompt.length > 20_000 || !['agent', 'search', 'deep_research'].includes(mode)) return NextResponse.json({ error: 'Invalid agent request.' }, { status: 400 });
    enforceRateLimit(user.id, mode === 'deep_research' ? 'research' : 'agent', mode === 'deep_research' ? 8 : 20, 60_000);

    // Resolve or create conversation
    let conversationId = incomingConvId;
    await requireOwnedConversation(user.id, conversationId);
    if (!conversationId) {
      const cleanTitle = prompt.slice(0, 40).trim() || 'Agent Run';
      const { data: conv } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: cleanTitle,
          is_auto_model: !modelId,
          model_id: modelId || null,
        })
        .select('id')
        .single();

      if (conv) conversationId = conv.id;
    }

    // Save user message in messages table
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: prompt,
      });
    }

    // Setup ReadableStream for Server-Sent Events (SSE)
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (eventData: Record<string, any>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
        };

        // Notify client of conversation ID
        sendEvent({
          type: 'init',
          conversationId,
        });

        try {
          // Execute supervisor agent
          const result = await AgentSupervisor.run({
            userId: user.id,
            conversationId,
            prompt,
            attachments,
            mode,
            manualModelId: modelId,
            onEvent: (opEvent) => {
              sendEvent({
                type: 'operational_event',
                event: opEvent,
              });
            },
          });

          // Send any artifacts
          if (result.artifacts.length > 0) {
            for (const artifact of result.artifacts) {
              sendEvent({
                type: 'artifact',
                artifact,
              });
            }
          }

          // Send final synthesized answer
          sendEvent({
            type: 'final_answer',
            answer: result.finalAnswer,
          });

          // Save assistant message to Supabase
          if (conversationId) {
            await supabase.from('messages').insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: 'assistant',
              content: result.finalAnswer,
            });

            await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId);
          }

          sendEvent({ type: 'done' });
        } catch (runErr: any) {
          console.error('Agent run error:', runErr);
          sendEvent({
            type: 'error',
            message: runErr.message || 'Agent execution failed',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'x-conversation-id': conversationId || '',
      },
    });
  } catch (error: any) {
    console.error('API /api/agent/run error:', error);
    return NextResponse.json({ error: safeError(error, 'Agent request failed.') }, { status: 500 });
  }
}

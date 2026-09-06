import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

// GET /api/conversations - List conversations for user
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      models:model_id (
        id,
        display_name,
        provider_model_id
      )
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: conversations || [] });
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { title = 'New Chat', modelId = null, isAuto = true } = body;

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title,
        model_id: modelId,
        is_auto_model: isAuto,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

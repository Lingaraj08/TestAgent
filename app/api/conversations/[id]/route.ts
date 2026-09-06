import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

// GET /api/conversations/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(`
      *,
      models:model_id (
        id,
        display_name,
        provider_model_id
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

// PATCH /api/conversations/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title) updates.title = body.title.trim();
    if (body.model_id !== undefined) updates.model_id = body.model_id;
    if (body.is_auto_model !== undefined) updates.is_auto_model = body.is_auto_model;

    const { data: conversation, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/conversations/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

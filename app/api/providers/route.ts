import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';
import { NextResponse, type NextRequest } from 'next/server';

// GET /api/providers - List all providers for the user (without exposing keys)
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, name, type, base_url, is_enabled, last_tested_at, connection_status, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ providers });
}

// POST /api/providers - Create a new provider
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type = 'openai-compatible', baseUrl, apiKey } = body;

    if (!name || !baseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Name, Base URL, and API Key are required.' },
        { status: 400 }
      );
    }

    const encryptedKey = encrypt(apiKey.trim());

    const { data: provider, error } = await supabase
      .from('providers')
      .insert({
        user_id: user.id,
        name: name.trim(),
        type,
        base_url: baseUrl.trim(),
        api_key_encrypted: encryptedKey,
        connection_status: 'untested',
      })
      .select('id, name, type, base_url, is_enabled, connection_status, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ provider }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

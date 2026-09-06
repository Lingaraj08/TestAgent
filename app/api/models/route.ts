import { createClient } from '@/lib/supabase/server';
import { ModelRegistry } from '@/lib/models/registry';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const models = await ModelRegistry.getUserModels(user.id);
  return NextResponse.json({ models });
}

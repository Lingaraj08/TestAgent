import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('id');
  const storagePath = searchParams.get('path');

  if (!fileId && !storagePath) {
    return NextResponse.json({ error: 'Missing file identifier' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let fileQuery = supabase.from('files').select('filename, mime_type, storage_path').eq('user_id', user.id);
    fileQuery = fileId ? fileQuery.eq('id', fileId) : fileQuery.eq('storage_path', storagePath!);
    const { data: file } = await fileQuery.maybeSingle();
    if (!file) return NextResponse.json({ error: 'File not found or access denied.' }, { status: 404 });
    const serviceClient = await createServiceClient();
    const { data: fileBlob, error: downloadError } = await serviceClient.storage
      .from('user-files')
      .download(file.storage_path);

    if (downloadError || !fileBlob) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    const arrayBuffer = await fileBlob.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': file.mime_type || fileBlob.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.filename.replace(/[\r\n"]/g, '_')}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Download error' }, { status: 500 });
  }
}

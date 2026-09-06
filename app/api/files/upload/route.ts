import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { enforceRateLimit, requireOwnedConversation, safeError } from '@/lib/server/guard';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['text/plain','text/csv','application/json','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp']);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    enforceRateLimit(user.id, 'upload', 30, 60_000);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.name || file.size === 0 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Files must be between 1 byte and 20 MB.' }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported file type. Upload a text, CSV, JSON, PDF, Office document, or PNG/JPEG/WebP image.' }, { status: 415 });
    await requireOwnedConversation(user.id, conversationId);

    // Generate unique storage path: {userId}/{timestamp}_{filename}
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${Date.now()}_${safeFilename}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage bucket 'user-files'
    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Storage upload failed: ' + uploadError.message }, { status: 500 });
    }

    // Save metadata in files table
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        conversation_id: conversationId || null,
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        storage_path: storagePath,
      })
      .select('*')
      .single();

    if (dbError) {
      await supabase.storage.from('user-files').remove([storagePath]);
      console.error('File metadata DB error:', dbError);
      return NextResponse.json({ error: 'Failed to record file metadata: ' + dbError.message }, { status: 500 });
    }

    return NextResponse.json({ file: fileRecord }, { status: 201 });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: safeError(error, 'Upload failed.') }, { status: 500 });
  }
}

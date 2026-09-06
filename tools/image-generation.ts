import { z } from 'zod';
import type { ToolDefinition, ToolResult } from '@/types/tools';
import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { v4 as uuidv4 } from 'uuid';

async function imageRequest(input: { prompt: string; sourceFileId?: string; modelId?: string }, context: any): Promise<ToolResult> {
  try {
    const supabase = await createServiceClient();
    let modelQuery = supabase.from('models').select('*, providers!inner(*)').eq('user_id', context.userId).eq('is_available', true).eq('supports_image_generation', true);
    if (input.modelId) modelQuery = modelQuery.eq('id', input.modelId);
    const { data: models } = await modelQuery.limit(1);
    const model: any = models?.[0];
    if (!model) return { success: false, error: 'No image-capable provider is configured. Enable an image model, or use Auto mode with one available.' };
    const provider = Array.isArray(model.providers) ? model.providers[0] : model.providers;
    const base = String(provider.base_url).replace(/\/$/, '');
    const headers = { Authorization: `Bearer ${decrypt(provider.api_key_encrypted)}` };
    let response: Response;
    if (input.sourceFileId) {
      const { data: file } = await supabase.from('files').select('*').eq('id', input.sourceFileId).eq('user_id', context.userId).single();
      if (!file) return { success: false, error: 'The input image was not found for this user.' };
      const { data: blob } = await supabase.storage.from('user-files').download(file.storage_path);
      if (!blob) return { success: false, error: 'Could not retrieve the input image.' };
      const form = new FormData(); form.append('image', new File([blob], file.filename, { type: file.mime_type })); form.append('prompt', input.prompt); form.append('model', model.provider_model_id);
      response = await fetch(`${base}/images/edits`, { method: 'POST', headers, body: form });
    } else response = await fetch(`${base}/images/generations`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: model.provider_model_id, prompt: input.prompt, size: '1024x1024' }) });
    if (!response.ok) throw new Error(`Image provider returned HTTP ${response.status}`);
    const payload = await response.json(); const item = payload.data?.[0]; const bytes = item?.b64_json ? Buffer.from(item.b64_json, 'base64') : item?.url ? Buffer.from(await (await fetch(item.url)).arrayBuffer()) : null;
    if (!bytes) throw new Error('Image provider returned no image data.');
    const filename = `image-${uuidv4()}.png`; const storagePath = `${context.userId}/generated/${filename}`;
    const { error: uploadError } = await supabase.storage.from('user-files').upload(storagePath, bytes, { contentType: 'image/png' }); if (uploadError) throw uploadError;
    const { data: record, error } = await supabase.from('files').insert({ user_id: context.userId, conversation_id: context.conversationId || null, filename, mime_type: 'image/png', size_bytes: bytes.length, storage_path: storagePath, generated_by_tool: input.sourceFileId ? 'edit_image' : 'generate_image', artifact_metadata: { prompt: input.prompt, providerModel: model.provider_model_id } }).select('*').single(); if (error) throw error;
    return { success: true, data: record, artifacts: [{ id: record.id, filename, mimeType: 'image/png', sizeBytes: bytes.length, storagePath, type: 'image' }], summary: `${input.sourceFileId ? 'Edited' : 'Generated'} image saved to your private storage.` };
  } catch (error: any) { return { success: false, error: `Image request failed: ${error.message}` }; }
}
export const generateImageTool: ToolDefinition = { name: 'generate_image', description: 'Generate an image through any configured image-capable provider and save it as a private artifact.', permission: 'safe', parameters: z.object({ prompt: z.string().min(3), modelId: z.string().uuid().optional() }), execute: (input, context) => imageRequest(input, context) };
export const editImageTool: ToolDefinition = { name: 'edit_image', description: 'Edit an uploaded image through a configured image-capable provider and save it as a private artifact.', permission: 'safe', parameters: z.object({ prompt: z.string().min(3), sourceFileId: z.string().uuid(), modelId: z.string().uuid().optional() }), execute: (input, context) => imageRequest(input, context) };

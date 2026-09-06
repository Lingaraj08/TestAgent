import 'server-only';
import { createClient } from '@/lib/supabase/server';

type Limit = { count: number; resetAt: number };
const buckets = new Map<string, Limit>();

/** Lightweight abuse guard for a small deployment. Use Redis/Upstash when scaling across instances. */
export function enforceRateLimit(userId: string, scope: string, limit: number, windowMs: number) {
  const now = Date.now(); const key = `${userId}:${scope}`; const current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return; }
  if (current.count >= limit) { const seconds = Math.ceil((current.resetAt - now) / 1000); throw new Error(`Rate limit reached. Try again in ${seconds} seconds.`); }
  current.count += 1;
}

export async function requireOwnedConversation(userId: string, conversationId?: string | null) {
  if (!conversationId) return;
  const supabase = await createClient();
  const { data } = await supabase.from('conversations').select('id').eq('id', conversationId).eq('user_id', userId).maybeSingle();
  if (!data) throw new Error('Conversation not found or access denied.');
}

export function safeError(error: unknown, fallback = 'Request failed.') {
  const message = error instanceof Error ? error.message : fallback;
  return message.replace(/(sk-[\w-]+|Bearer\s+\S+|https?:\/\/[^\s]+@[^\s]+)/gi, '[redacted]').slice(0, 300);
}

import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';

export type MemoryType = 'fact' | 'preference' | 'conversation' | 'knowledge' | 'temporary';

const durableSignals = /\b(prefer|preference|always|never|remember|my name is|i am |i work|my role|timezone|language|allergic|default)\b/i;

export class MemoryService {
  static shouldStore(content: string, type: MemoryType) {
    return type === 'preference' || type === 'knowledge' || durableSignals.test(content);
  }

  static async store(userId: string, content: string, type: MemoryType, conversationId?: string, metadata: Record<string, unknown> = {}) {
    if (!this.shouldStore(content, type)) return null;
    const supabase = await createServiceClient();
    const { data, error } = await supabase.from('memories').insert({
      user_id: userId, content: content.trim(), memory_type: type,
      source_conversation_id: conversationId || null, metadata,
    }).select('*').single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async search(userId: string, query: string, limit = 6) {
    const supabase = await createServiceClient();
    const terms = query.trim().split(/\s+/).filter((term) => term.length > 2).slice(0, 8);
    let request = supabase.from('memories').select('*').eq('user_id', userId).eq('is_active', true).order('updated_at', { ascending: false }).limit(limit);
    if (terms.length) request = request.or(terms.map((term) => `content.ilike.%${term.replace(/[%_,()]/g, '')}%`).join(','));
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    return data || [];
  }

  static async list(userId: string) { return this.search(userId, '', 100); }
  static async update(userId: string, id: string, patch: { content?: string; is_active?: boolean }) {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.from('memories').update(patch).eq('id', id).eq('user_id', userId).select('*').single();
    if (error) throw new Error(error.message); return data;
  }
  static async forget(userId: string, id: string) {
    const supabase = await createServiceClient();
    const { error } = await supabase.from('memories').delete().eq('id', id).eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
}

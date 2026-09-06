import { createClient } from '@/lib/supabase/server';
import type { Model } from '@/types/database';

export interface ModelWithProvider extends Model {
  provider_name?: string;
}

export class ModelRegistry {
  /**
   * Fetch all available models for the current authenticated user
   */
  static async getUserModels(userId: string): Promise<ModelWithProvider[]> {
    const supabase = await createClient();
    
    const { data: models, error } = await supabase
      .from('models')
      .select(`
        *,
        providers:provider_id (
          name,
          is_enabled
        )
      `)
      .eq('user_id', userId)
      .eq('is_available', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching models:', error);
      return [];
    }

    // Filter out models whose provider is disabled
    return (models || [])
      .filter((m: any) => m.providers?.is_enabled !== false)
      .map((m: any) => ({
        ...m,
        provider_name: m.providers?.name || 'Unknown Provider',
      }));
  }

  /**
   * Get a specific model by ID for a user
   */
  static async getModelById(userId: string, modelId: string): Promise<ModelWithProvider | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('models')
      .select(`
        *,
        providers:provider_id (
          name,
          is_enabled,
          base_url,
          api_key_encrypted
        )
      `)
      .eq('id', modelId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      ...data,
      provider_name: data.providers?.name || 'Unknown Provider',
    };
  }
}

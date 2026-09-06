// Database type definitions matching Supabase schema

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  user_id: string;
  name: string;
  type: 'openai-compatible';
  base_url: string;
  api_key_encrypted: string;
  is_enabled: boolean;
  last_tested_at: string | null;
  connection_status: 'untested' | 'connected' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  provider_id: string;
  user_id: string;
  provider_model_id: string;
  display_name: string;
  context_window: number | null;
  supports_text: boolean;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_reasoning: boolean;
  supports_structured_output: boolean;
  supports_image_generation: boolean;
  pricing_input: number | null;
  pricing_output: number | null;
  is_available: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model_id: string | null;
  is_auto_model: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_id: string | null;
  provider_id: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  duration_ms: number | null;
  created_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  created_at: string;
}

export interface AgentRun {
  id: string;
  user_id: string;
  conversation_id: string | null;
  agent_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  memory_type: 'fact' | 'preference' | 'context';
  source_conversation_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTask {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cron_expression: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  status: 'active' | 'paused' | 'completed' | 'failed';
  task_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UsageEvent {
  id: string;
  user_id: string;
  provider_id: string | null;
  model_id: string | null;
  conversation_id: string | null;
  event_type: 'chat' | 'embedding' | 'image' | 'tool';
  tokens_input: number | null;
  tokens_output: number | null;
  cost_estimate: number | null;
  created_at: string;
}

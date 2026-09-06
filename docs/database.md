# Database Schema & Data Isolation

Nexus uses Supabase (PostgreSQL) with strict Row Level Security (RLS) policies on every table.

## Tables

### 1. `profiles`
- Primary Key: `id UUID REFERENCES auth.users(id)`
- Fields: `email`, `display_name`, `avatar_url`, `created_at`, `updated_at`
- Automatically provisioned upon user registration via `on_auth_user_created` trigger.

### 2. `providers`
- Primary Key: `id UUID DEFAULT gen_random_uuid()`
- Foreign Key: `user_id UUID REFERENCES auth.users(id)`
- Fields: `name`, `type`, `base_url`, `api_key_encrypted`, `is_enabled`, `last_tested_at`, `connection_status`
- Stores encrypted credentials; client requests never expose `api_key_encrypted`.

### 3. `models`
- Primary Key: `id UUID DEFAULT gen_random_uuid()`
- Foreign Keys: `provider_id UUID REFERENCES providers(id)`, `user_id UUID REFERENCES auth.users(id)`
- Unique Index: `(provider_id, provider_model_id)`
- Capability Fields: `supports_text`, `supports_vision`, `supports_tools`, `supports_reasoning`, `supports_structured_output`, `context_window`

### 4. `conversations`
- Primary Key: `id UUID DEFAULT gen_random_uuid()`
- Foreign Key: `user_id UUID REFERENCES auth.users(id)`
- Fields: `title`, `model_id`, `is_auto_model`, `created_at`, `updated_at`

### 5. `messages`
- Primary Key: `id UUID DEFAULT gen_random_uuid()`
- Foreign Keys: `conversation_id UUID REFERENCES conversations(id)`, `user_id UUID REFERENCES auth.users(id)`
- Fields: `role` ('user' | 'assistant' | 'system'), `content`, `model_id`, `provider_id`, `tokens_input`, `tokens_output`, `duration_ms`

### 6. `files`
- Primary Key: `id UUID DEFAULT gen_random_uuid()`
- Foreign Key: `user_id UUID REFERENCES auth.users(id)`
- Storage Path: `{user_id}/{timestamp}_{filename}` in `user-files` storage bucket.

### Future Tables Provisioned for Subsequent Phases
- `agent_runs` (Part 2+ agent execution logs)
- `memories` (Part 3+ long-term memory system)
- `scheduled_tasks` (Part 2+ automation tasks)
- `usage_events` (Token & cost analytics)

## Row Level Security (RLS)

All tables have RLS enabled with granular policies:
- `SELECT`: `USING (auth.uid() = user_id)`
- `INSERT`: `WITH CHECK (auth.uid() = user_id)`
- `UPDATE`: `USING (auth.uid() = user_id)`
- `DELETE`: `USING (auth.uid() = user_id)`

No user can view, edit, or delete another user's conversations or keys.

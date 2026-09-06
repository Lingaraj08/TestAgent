-- Nexus AI Workspace - PART 3: research, memory, approvals and automation
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE memories ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_memory_type_check;
ALTER TABLE memories ADD CONSTRAINT memories_memory_type_check CHECK (memory_type IN ('fact', 'preference', 'conversation', 'knowledge', 'temporary'));
CREATE INDEX IF NOT EXISTS idx_memories_active_user ON memories(user_id, is_active, updated_at DESC);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  tool_execution_id UUID REFERENCES tool_executions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_user_status ON approval_requests(user_id, status, created_at DESC);
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own approvals" ON approval_requests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS browser_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  url TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE browser_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own browser activity" ON browser_activity FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Nexus AI Workspace - Migration 002: Agent Tools & Executions
-- Run in your Supabase SQL Editor

-- ============================================
-- TOOL EXECUTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'waiting_approval', 'cancelled')),
  permission_level TEXT NOT NULL DEFAULT 'safe' CHECK (permission_level IN ('safe', 'confirmation', 'explicit_approval', 'critical_approval')),
  input_safe JSONB,
  output_safe JSONB,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_user_id ON tool_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_agent_run_id ON tool_executions(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_conversation_id ON tool_executions(conversation_id);

ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tool executions"
  ON tool_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tool executions"
  ON tool_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tool executions"
  ON tool_executions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tool executions"
  ON tool_executions FOR DELETE
  USING (auth.uid() = user_id);

-- Optional column for files table to link generating tool run
ALTER TABLE files ADD COLUMN IF NOT EXISTS generated_by_tool TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS artifact_metadata JSONB;

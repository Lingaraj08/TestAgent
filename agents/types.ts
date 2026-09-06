import type { ToolArtifact } from '@/types/tools';

export type AgentState =
  | 'queued'
  | 'planning'
  | 'running'
  | 'waiting_approval'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface OperationalEvent {
  id: string;
  type:
    | 'status'
    | 'planning'
    | 'tool_start'
    | 'tool_complete'
    | 'tool_error'
    | 'tool_retry'
    | 'waiting_approval'
    | 'verifying'
    | 'artifact_ready'
    | 'done'
    | 'error';
  message: string;
  toolName?: string;
  timestamp: string;
  data?: any;
}

export interface AgentStep {
  id: string;
  title: string;
  toolName?: string;
  input: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
}

export interface AgentPlan {
  goal: string;
  explanation: string;
  steps: AgentStep[];
}

export interface AgentRunResult {
  runId: string;
  state: AgentState;
  finalAnswer: string;
  events: OperationalEvent[];
  artifacts: ToolArtifact[];
  steps: AgentStep[];
  error?: string;
}

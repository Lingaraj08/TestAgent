import { z } from 'zod';

export type ToolPermissionLevel =
  | 'safe'                // Web search, read file, analyze file, create file, run sandbox code
  | 'confirmation'        // Delete file, modify persistent records
  | 'explicit_approval'   // External upload, form filling
  | 'critical_approval';  // Final external submission, financial

export interface ToolArtifact {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath?: string;
  /** Legacy extension label retained for older tool integrations. */
  fileType?: string;
  downloadUrl?: string;
  previewUrl?: string;
  type?: 'excel' | 'word' | 'pdf' | 'powerpoint' | 'image' | 'text' | 'file';
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  artifacts?: ToolArtifact[];
  summary?: string;
}

export interface ToolExecutionContext {
  userId: string;
  conversationId?: string;
  agentRunId?: string;
  onEvent?: (event: { type: string; message: string; toolName?: string; data?: any }) => void;
  confirmAction?: (details: { action: string; description: string }) => Promise<boolean>;
}

export interface ToolDefinition<TInput = any, _TOutput = any> {
  name: string;
  description: string;
  category?: 'search' | 'file' | 'code' | 'document' | 'browser' | 'image';
  permission: ToolPermissionLevel;
  parameters: z.ZodType<TInput>;
  execute: (input: TInput, context: ToolExecutionContext) => Promise<ToolResult>;
}

export interface ToolExecutionRecord {
  id: string;
  userId: string;
  agentRunId?: string;
  conversationId?: string;
  toolName: string;
  status: 'running' | 'completed' | 'failed' | 'waiting_approval' | 'cancelled';
  permissionLevel: ToolPermissionLevel;
  inputSafe?: Record<string, any>;
  outputSafe?: Record<string, any>;
  error?: string;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

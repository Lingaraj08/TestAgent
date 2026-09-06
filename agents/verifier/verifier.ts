import type { ToolResult } from '@/types/tools';

export interface VerificationResult {
  passed: boolean;
  message: string;
}

export class AgentVerifier {
  /**
   * Verify the results of a tool step or generated artifact
   */
  static verify(toolName: string, result: ToolResult): VerificationResult {
    if (!result.success) {
      return {
        passed: false,
        message: result.error || `Tool ${toolName} failed execution.`,
      };
    }

    // Document & artifact verification
    if (toolName.startsWith('generate_')) {
      if (!result.artifacts || result.artifacts.length === 0) {
        return {
          passed: false,
          message: 'Document generation succeeded but no download artifact was produced.',
        };
      }

      const artifact = result.artifacts[0];
      if (artifact.sizeBytes <= 0) {
        return {
          passed: false,
          message: `Generated file "${artifact.filename}" is empty (0 bytes).`,
        };
      }

      return {
        passed: true,
        message: `Validated artifact "${artifact.filename}" (${(artifact.sizeBytes / 1024).toFixed(1)} KB).`,
      };
    }

    // Web search verification
    if (toolName === 'web_search') {
      const results = result.data?.results;
      if (Array.isArray(results) && results.length > 0) {
        return {
          passed: true,
          message: `Retrieved ${results.length} valid citations from the web.`,
        };
      }
    }

    return {
      passed: true,
      message: `Verified output for "${toolName}".`,
    };
  }
}

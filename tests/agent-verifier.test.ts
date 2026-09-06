import { describe, it, expect } from 'vitest';
import { AgentVerifier } from '@/agents/verifier/verifier';
import type { ToolResult } from '@/types/tools';

describe('AgentVerifier', () => {
  it('fails verification if tool execution failed', () => {
    const failedResult: ToolResult = {
      success: false,
      error: 'Network timeout during search',
    };
    const verification = AgentVerifier.verify('web_search', failedResult);
    expect(verification.passed).toBe(false);
    expect(verification.message).toContain('Network timeout');
  });

  it('verifies document generation results with valid artifacts', () => {
    const docResult: ToolResult = {
      success: true,
      artifacts: [
        {
          id: 'art-1',
          filename: 'report.xlsx',
          fileType: 'xlsx',
          sizeBytes: 12450,
          downloadUrl: '/api/files/download?id=art-1',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    };
    const verification = AgentVerifier.verify('generate_excel', docResult);
    expect(verification.passed).toBe(true);
    expect(verification.message).toContain('report.xlsx');
  });

  it('fails document generation verification if no artifacts or 0-byte artifact', () => {
    const emptyResult: ToolResult = {
      success: true,
      artifacts: [],
    };
    const verificationNoArtifacts = AgentVerifier.verify('generate_pdf', emptyResult);
    expect(verificationNoArtifacts.passed).toBe(false);

    const zeroByteResult: ToolResult = {
      success: true,
      artifacts: [
        {
          id: 'art-2',
          filename: 'empty.pdf',
          fileType: 'pdf',
          sizeBytes: 0,
          downloadUrl: '/api/files/download?id=art-2',
          mimeType: 'application/pdf',
        },
      ],
    };
    const verificationZeroByte = AgentVerifier.verify('generate_pdf', zeroByteResult);
    expect(verificationZeroByte.passed).toBe(false);
    expect(verificationZeroByte.message).toContain('empty (0 bytes)');
  });

  it('verifies web search results with citations', () => {
    const searchResult: ToolResult = {
      success: true,
      data: {
        results: [
          { title: 'Article 1', url: 'https://example.com/1', snippet: 'Snippet 1' },
          { title: 'Article 2', url: 'https://example.com/2', snippet: 'Snippet 2' },
        ],
      },
    };
    const verification = AgentVerifier.verify('web_search', searchResult);
    expect(verification.passed).toBe(true);
    expect(verification.message).toContain('2 valid citations');
  });
});

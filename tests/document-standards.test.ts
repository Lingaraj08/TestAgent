import { describe, expect, it } from 'vitest';
import { documentPolicyFor, isDocumentRequest } from '@/lib/prompts/document-standards';

describe('document standards policy', () => {
  it('activates for Excel and Word requests only', () => {
    expect(isDocumentRequest('Create an Excel financial model')).toBe(true);
    expect(isDocumentRequest('Please prepare a DOCX report')).toBe(true);
    expect(isDocumentRequest('Explain recursion')).toBe(false);
  });

  it('requires formulas and real Word styles in relevant prompts', () => {
    const policy = documentPolicyFor('Create an xlsx and Word document');
    expect(policy).toContain('calculated values must be formulas');
    expect(policy).toContain('real Heading styles');
  });
});

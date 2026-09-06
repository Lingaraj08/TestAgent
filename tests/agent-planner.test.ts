import { describe, it, expect } from 'vitest';
import { AgentPlanner } from '@/agents/planner/planner';

describe('AgentPlanner', () => {
  it('creates an excel generation plan when prompt requests spreadsheet', () => {
    const plan = AgentPlanner.plan('Create an Excel spreadsheet for our Q3 financial report');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0].toolName).toBe('generate_excel');
    expect(plan.steps[0].input.filename).toContain('.xlsx');
  });

  it('creates a word document plan when prompt asks for a report doc', () => {
    const plan = AgentPlanner.plan('Create a word document summary for our board meeting');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0].toolName).toBe('generate_word');
  });

  it('creates a presentation plan when prompt asks for slides', () => {
    const plan = AgentPlanner.plan('Generate a presentation deck with 5 slides about AI agents');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0].toolName).toBe('generate_powerpoint');
  });

  it('creates a web search plan when mode is search or query asks for latest news', () => {
    const plan = AgentPlanner.plan('Search for the latest news in quantum computing', [], 'search');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0].toolName).toBe('web_search');
  });

  it('creates a python execution plan when prompt asks to calculate with python', () => {
    const plan = AgentPlanner.plan('Calculate with python the fibonacci sequence up to 50');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0].toolName).toBe('execute_code');
  });

  it('inspects attachments when files are attached', () => {
    const plan = AgentPlanner.plan(
      'Analyze this data and create an excel report',
      [{ filename: 'data.csv', id: 'file-123' }]
    );
    expect(plan.steps.length).toBe(2);
    expect(plan.steps[0].toolName).toBe('read_file');
    expect(plan.steps[1].toolName).toBe('generate_excel');
  });

  it('returns a direct conversational plan when no tool actions are needed', () => {
    const plan = AgentPlanner.plan('Hi, how are you today?');
    expect(plan.steps.length).toBe(0);
    expect(plan.explanation).toContain('Direct conversational response');
  });
});

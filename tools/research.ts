import { z } from 'zod';
import type { ToolDefinition } from '@/types/tools';
import { DuckDuckGoSearchProvider, type SearchResultItem } from './web-search';

const classify = (url: string): string => { const host = new URL(url).hostname.toLowerCase(); if (host.endsWith('.gov') || host.includes('.gov.')) return 'government'; if (host.endsWith('.edu') || host.includes('arxiv.org')) return 'academic'; if (/(docs\.|developer\.|openai\.com|microsoft\.com|google\.com)/.test(host)) return 'official documentation'; if (/(reddit|stackoverflow|quora|x\.com|facebook)/.test(host)) return 'forum/social'; if (/(reuters|apnews|bbc|nytimes)/.test(host)) return 'news'; return 'secondary source'; };
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
export const deepResearchTool: ToolDefinition = {
  name: 'deep_research', description: 'Run a multi-query research workflow: search, inspect sources, classify authority, compare findings, and return a cited report. Never claims sources that were not fetched.', permission: 'safe',
  parameters: z.object({ topic: z.string().min(3), maxSources: z.number().min(2).max(8).default(5) }),
  execute: async ({ topic, maxSources }, context) => {
    const planner = [topic, `${topic} official source`, `${topic} evidence analysis`]; const provider = new DuckDuckGoSearchProvider(); const results: SearchResultItem[] = [];
    for (const query of planner) { context.onEvent?.({ type: 'tool_start', toolName: 'deep_research', message: `Research query: ${query}` }); const found = await provider.search(query, maxSources); results.push(...found); }
    const unique = Array.from(new Map(results.filter((r) => /^https?:\/\//.test(r.url)).map((r) => [r.url, r])).values()).slice(0, maxSources);
    const sources: any[] = [];
    for (const result of unique) { try { const response = await fetch(result.url, { headers: { 'User-Agent': 'NexusResearch/1.0' }, signal: AbortSignal.timeout(12000) }); if (!response.ok) continue; const body = text(await response.text()).slice(0, 5000); if (body.length < 100) continue; sources.push({ title: result.title, url: result.url, sourceType: classify(result.url), extract: body, citation: `[${sources.length + 1}]` }); } catch { /* an inaccessible result is intentionally omitted */ } }
    if (!sources.length) return { success: false, error: 'Research failed: no sources could be opened. No citations were generated.' };
    const report = { topic, method: `Ran ${planner.length} queries and opened ${sources.length} accessible sources.`, sourceComparison: sources.map((s) => ({ citation: s.citation, sourceType: s.sourceType, title: s.title })), conflicts: 'Potential disagreements require model synthesis against the attached source extracts; no unsupported conclusion was inferred.', sources };
    return { success: true, data: report, summary: `## Research report: ${topic}\n\n${report.method}\n\n### Sources\n${sources.map((s) => `${s.citation} ${s.title} (${s.sourceType}) — ${s.url}\n${s.extract.slice(0, 500)}…`).join('\n\n')}\n\n### Cross-check\n${report.conflicts}` };
  },
};

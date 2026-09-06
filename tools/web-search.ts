import { z } from 'zod';
import type { ToolDefinition, ToolResult } from '@/types/tools';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchProvider {
  search(query: string, limit?: number): Promise<SearchResultItem[]>;
}

/**
 * DuckDuckGo public search provider (zero API key required)
 */
export class DuckDuckGoSearchProvider implements WebSearchProvider {
  async search(query: string, limit = 5): Promise<SearchResultItem[]> {
    try {
      // Use DuckDuckGo HTML or JSON endpoint
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_redirect=1&no_html=1`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'NexusAI/1.0' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const results: SearchResultItem[] = [];

      // 1. Abstract / Instant answer
      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL,
          snippet: data.AbstractText,
        });
      }

      // 2. Related topics
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= limit) break;
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 40),
              url: topic.FirstURL,
              snippet: topic.Text,
            });
          }
        }
      }

      return results.slice(0, limit);
    } catch (err: any) {
      console.warn('Web search request failed:', err.message);
      throw new Error(`Live search unavailable: ${err.message}`);
    }
  }
}

let activeSearchProvider: WebSearchProvider = new DuckDuckGoSearchProvider();

export function setSearchProvider(provider: WebSearchProvider) {
  activeSearchProvider = provider;
}

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the live web for current facts, news, documentation, technical solutions, and citations. Treats webpage content as untrusted input.',
  permission: 'safe',
  parameters: z.object({
    query: z.string().describe('The search query or keywords to look up'),
    limit: z.number().optional().default(5).describe('Maximum number of search results (1-10)'),
  }),
  execute: async ({ query, limit = 5 }, context): Promise<ToolResult> => {
    context.onEvent?.({
      type: 'tool_start',
      message: `Searching web for: "${query}"`,
      toolName: 'web_search',
    });

    try {
      const results = await activeSearchProvider.search(query, limit);

      const formattedResults = results
        .map(
          (r, i) =>
            `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
        )
        .join('\n\n');

      if (results.length === 0) return { success: false, error: `Search completed but returned no results for "${query}".` };
      return {
        success: true,
        data: {
          query,
          results,
        },
        summary: `Found ${results.length} search result(s) for "${query}".\n\n${formattedResults}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Web search failed: ${err.message}`,
      };
    }
  },
};

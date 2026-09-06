import { z } from 'zod';
import type { ToolDefinition, ToolResult, ToolExecutionContext } from '@/types/tools';
import { webSearchTool } from './web-search';
import {
  readFileTool,
  createFileTool,
  listFilesTool,
  fileMetadataTool,
  deleteFileTool,
} from './file-tools';
import { executeCodeTool } from './code-execution';
import {
  generateExcelTool,
  generateWordTool,
  generatePdfTool,
  generatePowerPointTool,
} from './document-generator';
import { browserInspectTool, browserFillTool } from './browser-discovery';
import { deepResearchTool } from './research';
import { generateImageTool, editImageTool } from './image-generation';

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  /** Register a tool */
  static register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /** Retrieve a tool by name */
  static get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** List all registered tools */
  static getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Format all tools into the format consumed by LLM tool calling (e.g. OpenAI / Vercel AI SDK)
   */
  static getToolsForAgent(): Record<string, { description: string; parameters: z.ZodType<any>; execute?: any }> {
    const formatted: Record<string, any> = {};
    for (const [name, tool] of this.tools.entries()) {
      formatted[name] = {
        description: tool.description,
        parameters: tool.parameters,
      };
    }
    return formatted;
  }

  /**
   * Execute a tool by name with input validation and execution context
   */
  static async execute(
    name: string,
    input: any,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" is not registered in the system.`,
      };
    }

    try {
      // Validate input against tool parameters schema
      const validatedInput = tool.parameters.parse(input);
      return await tool.execute(validatedInput, context);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return {
          success: false,
          error: `Tool "${name}" parameter validation error: ${err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
        };
      }
      return {
        success: false,
        error: `Tool "${name}" execution failed: ${err.message}`,
      };
    }
  }

  /** Initialize default core tools */
  static initDefaults(): void {
    if (this.tools.size > 0) return;

    // Web Search
    this.register(webSearchTool);
    this.register(deepResearchTool);
    this.register(browserInspectTool);
    this.register(browserFillTool);
    this.register(generateImageTool);
    this.register(editImageTool);

    // Files
    this.register(readFileTool);
    this.register(createFileTool);
    this.register(listFilesTool);
    this.register(fileMetadataTool);
    this.register(deleteFileTool);

    // Code
    this.register(executeCodeTool);

    // Document Generation
    this.register(generateExcelTool);
    this.register(generateWordTool);
    this.register(generatePdfTool);
    this.register(generatePowerPointTool);
  }
}

// Auto-initialize standard tools
ToolRegistry.initDefaults();

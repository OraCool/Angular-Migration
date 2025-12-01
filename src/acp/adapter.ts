/**
 * ACP Adapter with OpenAI Integration
 *
 * This adapter follows ACP (Agent Client Protocol) patterns while using OpenAI for LLM capabilities.
 * It provides tool invocation, streaming responses, and proper error handling.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { MIGRATION_TOOLS, type Tool, type ToolContext } from './tools.js';

export interface ACPAdapterConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export interface AgentResponse {
  success: boolean;
  content?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  reasoning?: string;
  error?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: any;
  success: boolean;
  error?: string;
}

/**
 * ACP Adapter using OpenAI with tool invocation
 */
export class ACPAdapter {
  private openai: OpenAI;
  private tools: Tool[];
  private model: string;
  private temperature: number;

  constructor(config: ACPAdapterConfig = {}) {
    this.openai = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
    this.tools = MIGRATION_TOOLS;
    this.model = config.model || 'gpt-4o';
    this.temperature = config.temperature !== undefined ? config.temperature : 0.2;
  }

  /**
   * Convert our tools to OpenAI function format
   */
  private getOpenAITools(): ChatCompletionTool[] {
    return this.tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Invoke agent with a prompt and optional tool context
   */
  async invoke(
    prompt: string,
    context: ToolContext,
    systemPrompt?: string
  ): Promise<AgentResponse> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt || this.getDefaultSystemPrompt(context),
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      process.stderr.write(`[ACP] Invoking agent with OpenAI model: ${this.model}\n`);
      process.stderr.write(`[ACP] Tools available: ${this.tools.map(t => t.name).join(', ')}\n`);

      // Call OpenAI with tools
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools: this.getOpenAITools(),
        tool_choice: 'auto',
        temperature: this.temperature,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      const message = choice.message;

      // Check if AI wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        process.stderr.write(`[ACP] AI requested ${message.tool_calls.length} tool calls\n`);

        const toolResults: ToolResult[] = [];

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          // Type guard: only process function tool calls
          if (toolCall.type !== 'function') continue;

          const result = await this.executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            context
          );

          toolResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            result: result.result,
            success: result.success,
            error: result.error,
          });

          process.stderr.write(`[ACP] Tool ${toolCall.function.name}: ${result.success ? 'SUCCESS' : 'FAILED'}\n`);
        }

        // Continue conversation with tool results
        const finalResponse = await this.continueWithToolResults(
          messages,
          message,
          toolResults
        );

        return {
          success: true,
          content: finalResponse.content,
          toolCalls: message.tool_calls
            .filter(tc => tc.type === 'function')
            .map(tc => ({
              id: tc.id,
              name: tc.function.name,
              arguments: JSON.parse(tc.function.arguments),
            })),
          toolResults,
          reasoning: finalResponse.reasoning,
        };
      }

      // No tool calls, just return the response
      return {
        success: true,
        content: message.content || '',
        reasoning: message.content || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[ACP] Error: ${errorMessage}\n`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute a single tool
   */
  private async executeTool(
    toolName: string,
    args: any,
    context: ToolContext
  ): Promise<{ success: boolean; result: any; error?: string }> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return {
        success: false,
        result: null,
        error: `Tool ${toolName} not found`,
      };
    }

    try {
      const result = await tool.handler(args, context);
      return {
        success: result.success !== false,
        result,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Continue conversation with tool results
   */
  private async continueWithToolResults(
    messages: ChatCompletionMessageParam[],
    assistantMessage: any,
    toolResults: ToolResult[]
  ): Promise<{ content: string; reasoning?: string }> {
    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: assistantMessage.content,
      tool_calls: assistantMessage.tool_calls,
    });

    // Add tool results
    for (const toolResult of toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: toolResult.toolCallId,
        content: JSON.stringify(toolResult.result),
      });
    }

    // Get final response
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      temperature: this.temperature,
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      reasoning: content,
    };
  }

  /**
   * Get default system prompt for Angular migration
   */
  private getDefaultSystemPrompt(context: ToolContext): string {
    return `You are an Angular migration expert assistant.

Current Context:
- Project: ${context.projectPath}
- Current Angular Version: ${context.currentVersion}
- Target Angular Version: ${context.targetVersion}

Your Role:
- Help fix Angular migration errors
- Use available tools to run commands, read/write files, and update packages
- Analyze build errors and provide solutions
- Apply breaking changes fixes automatically

Available Tools:
${this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Guidelines:
1. Always use run_migration_command with the correct Node version:
   - Angular 14-16: Node 18
   - Angular 17-18: Node 20
   - Angular 19-20: Node 22

2. For package updates, use update_packages tool instead of manual npm install

3. For known breaking changes (Material Chips, PerfectScrollbar), use fix_breaking_changes

4. Read files before modifying them to understand the context

5. Provide clear explanations of what you're doing

When you encounter an error:
1. Analyze the error message carefully
2. Check if it's a known breaking change (use fix_breaking_changes)
3. Read relevant files if needed (use read_file)
4. Apply the fix (use write_file or run_migration_command)
5. Explain what you did and why`;
  }
}

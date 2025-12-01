/**
 * LLM-based Fix Service with ACP Integration
 * Hybrid approach: Pattern-based fixes first, ACP+OpenAI fallback for unknown errors
 */

import { ACPAdapter } from '../acp/adapter.js';
import type { ToolContext } from '../acp/tools.js';
import { PATTERN_FIXES, type PatternFix } from './pattern-fixer.js';

export interface FixContext {
  error: string;
  errorType: string;
  filePath?: string;
  fileContent?: string;
  angularVersion?: string;
  workshopRoot: string;
  projectPath?: string;
  currentVersion?: string;
  targetVersion?: string;
}

export interface FixResult {
  success: boolean;
  solution?: string;
  fileChanges?: Array<{
    filePath: string;
    content: string;
  }>;
  commands?: string[];
  explanation?: string;
  usedLLM: boolean;
}

export interface ExecutorCallbacks {
  sendThought?: (message: string) => Promise<void>;
  sendMessage?: (message: string) => Promise<void>;
}

export class LLMFixerService {
  private acpAdapter?: ACPAdapter;
  private workshopRoot: string;
  private enableLLM: boolean;
  private callbacks?: ExecutorCallbacks;

  constructor(workshopRoot: string, enableLLM = true, callbacks?: ExecutorCallbacks) {
    this.workshopRoot = workshopRoot;
    this.enableLLM = enableLLM;
    this.callbacks = callbacks;

    // Initialize ACP Adapter if API key is available
    if (enableLLM && process.env.OPENAI_API_KEY) {
      try {
        this.acpAdapter = new ACPAdapter({
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4o',
          temperature: 0.2,
        });
        process.stderr.write('[LLM] ACP Adapter initialized with OpenAI\n');
      } catch (error) {
        console.warn('ACP Adapter initialization failed, using pattern-based fixes only:', error);
        this.enableLLM = false;
      }
    } else if (enableLLM) {
      console.warn('OPENAI_API_KEY not set, using pattern-based fixes only');
      this.enableLLM = false;
    }
  }

  /**
   * Try pattern-based fix first, fallback to ACP+LLM if needed
   */
  async fixError(context: FixContext): Promise<FixResult> {
    // 1. Try pattern-based fixes first (fast, $0 cost)
    for (const pattern of PATTERN_FIXES) {
      if (pattern.detect(context.error)) {
        process.stderr.write(`[LLM] Pattern match found: '${pattern.name}' - ${pattern.description} (no LLM needed, $0 cost)\n`);

        const projectRoot = context.projectPath || context.workshopRoot.replace('/workshop', '/current_app');
        const commands = await pattern.fix(projectRoot, context.error);

        return {
          success: true,
          commands,
          explanation: pattern.description,
          usedLLM: false,
        };
      }
    }

    // 2. Fallback to ACP+LLM if enabled (intelligent tool invocation)
    if (this.enableLLM && this.acpAdapter) {
      process.stderr.write(`[ACP] No pattern match found. Using ACP+OpenAI with tool invocation...\n`);
      return await this.acpFix(context);
    }

    // 3. No fix available
    process.stderr.write(`[LLM] No fix available (LLM disabled or not initialized)\n`);
    return {
      success: false,
      explanation: 'No automatic fix available. Manual intervention required.',
      usedLLM: false,
    };
  }
  
  /**
   * Use ACP Adapter with OpenAI for intelligent fixing
   */
  private async acpFix(context: FixContext): Promise<FixResult> {
    try {
      if (this.callbacks?.sendThought) {
        await this.callbacks.sendThought('🤖 Using ACP+OpenAI with tool invocation...');
      }

      const projectPath = context.projectPath || context.workshopRoot.replace('/workshop', '/current_app');

      // Build tool context
      const toolContext: ToolContext = {
        projectPath,
        workshopRoot: this.workshopRoot,
        currentVersion: context.currentVersion || context.angularVersion || '14',
        targetVersion: context.targetVersion || '20',
      };

      // Build fix prompt
      const prompt = this.buildACPPrompt(context);

      process.stderr.write(`[ACP] Invoking ACP agent...\n`);
      process.stderr.write(`[ACP] Error type: ${context.errorType}\n`);
      process.stderr.write(`[ACP] Error snippet: ${context.error.substring(0, 100)}...\n`);

      // Invoke ACP adapter
      const startTime = Date.now();
      const response = await this.acpAdapter!.invoke(prompt, toolContext);
      const duration = Date.now() - startTime;

      process.stderr.write(`[ACP] Response received in ${duration}ms\n`);

      if (!response.success) {
        process.stderr.write(`[ACP] Fix failed: ${response.error}\n`);
        return {
          success: false,
          explanation: `ACP fix failed: ${response.error}`,
          usedLLM: true,
        };
      }

      // Log tool invocations
      if (response.toolCalls && response.toolCalls.length > 0) {
        process.stderr.write(`[ACP] AI invoked ${response.toolCalls.length} tools:\n`);
        for (const toolCall of response.toolCalls) {
          process.stderr.write(`[ACP]   - ${toolCall.name}\n`);
        }
      }

      // Show reasoning
      if (this.callbacks?.sendThought && response.reasoning) {
        await this.callbacks.sendThought(`💡 ACP Analysis:\n${response.reasoning}`);
      }

      if (this.callbacks?.sendMessage) {
        const toolCount = response.toolCalls?.length || 0;
        await this.callbacks.sendMessage(`✅ ACP Fix Applied: ${toolCount} tools invoked`);
      }

      return {
        success: true,
        solution: response.content || 'Fix applied via ACP',
        explanation: response.reasoning || 'Fix applied successfully',
        usedLLM: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      process.stderr.write(`[ACP] ERROR: ACP fix failed\n`);
      process.stderr.write(`[ACP] Error message: ${errorMessage}\n`);
      if (errorStack) {
        process.stderr.write(`[ACP] Stack trace: ${errorStack.substring(0, 500)}...\n`);
      }

      console.error('ACP fix failed:', error);
      return {
        success: false,
        explanation: `ACP fix failed: ${errorMessage}`,
        usedLLM: true,
      };
    }
  }

  /**
   * Build ACP prompt with error context
   */
  private buildACPPrompt(context: FixContext): string {
    let prompt = `I need help fixing an Angular migration error.

**Error Type:** ${context.errorType}

**Error Message:**
\`\`\`
${context.error}
\`\`\`
`;

    if (context.filePath && context.fileContent) {
      prompt += `
**Affected File:** ${context.filePath}
\`\`\`typescript
${context.fileContent.substring(0, 1000)}${context.fileContent.length > 1000 ? '...' : ''}
\`\`\`
`;
    }

    prompt += `
**Current Angular Version:** ${context.angularVersion || context.currentVersion || 'Unknown'}

Please analyze this error and fix it using the available tools:
1. Use read_file to examine relevant files if needed
2. Use fix_breaking_changes if this is a known breaking change
3. Use update_packages if package versions need updating
4. Use write_file to apply code fixes
5. Use run_migration_command to run any necessary commands

Explain what you're doing and why.`;

    return prompt;
  }
}

/**
 * LLM-based Fix Service
 * Hybrid approach: Pattern-based fixes first, LLM fallback for unknown errors
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PATTERN_FIXES, type PatternFix } from './pattern-fixer.js';

export interface FixContext {
  error: string;
  errorType: string;
  filePath?: string;
  fileContent?: string;
  angularVersion?: string;
  workshopRoot: string;
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
  private openai?: OpenAI;
  private workshopRoot: string;
  private enableLLM: boolean;
  private callbacks?: ExecutorCallbacks;
  
  constructor(workshopRoot: string, enableLLM = true, callbacks?: ExecutorCallbacks) {
    this.workshopRoot = workshopRoot;
    this.enableLLM = enableLLM;
    this.callbacks = callbacks;
    
    // Initialize OpenAI if API key is available
    if (enableLLM && process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
      } catch (error) {
        console.warn('OpenAI initialization failed, using pattern-based fixes only:', error);
        this.enableLLM = false;
      }
    } else if (enableLLM) {
      console.warn('OPENAI_API_KEY not set, using pattern-based fixes only');
      this.enableLLM = false;
    }
  }
  
  /**
   * Try pattern-based fix first, fallback to LLM if needed
   */
  async fixError(context: FixContext): Promise<FixResult> {
    // 1. Try pattern-based fixes first
    for (const pattern of PATTERN_FIXES) {
      if (pattern.detect(context.error)) {
        process.stderr.write(`[LLM] Pattern match found: '${pattern.name}' - ${pattern.description} (no LLM needed, $0 cost)\n`);
        
        const projectRoot = context.workshopRoot.replace('/workshop', '/current_app');
        const commands = await pattern.fix(projectRoot, context.error);
        
        return {
          success: true,
          commands,
          explanation: pattern.description,
          usedLLM: false,
        };
      }
    }
    
    // 2. Fallback to LLM if enabled
    if (this.enableLLM && this.openai) {
      process.stderr.write(`[LLM] No pattern match found. Falling back to LLM for intelligent fix...\n`);
      return await this.llmFix(context);
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
   * Use OpenAI to generate fix
   */
  private async llmFix(context: FixContext): Promise<FixResult> {
    try {
      // Load BuildFixer prompt template
      const agentPrompt = await this.loadAgentPrompt(context.errorType);
      
      // Build prompt
      const prompt = this.buildFixPrompt(context, agentPrompt);
      
      if (this.callbacks?.sendThought) {
        await this.callbacks.sendThought('📝 Sending error context to LLM...');
      }
      
      // Log LLM request details
      const requestTime = new Date().toISOString();
      const systemTokens = agentPrompt.length / 4; // Rough estimate: 1 token ≈ 4 chars
      const userTokens = prompt.length / 4;
      const estimatedInputTokens = Math.ceil(systemTokens + userTokens);
      
      process.stderr.write(`[LLM] Request initiated at ${requestTime}\n`);
      process.stderr.write(`[LLM] Model: gpt-4o, Temperature: 0.2, Format: json_object\n`);
      process.stderr.write(`[LLM] Estimated input tokens: ~${estimatedInputTokens}\n`);
      process.stderr.write(`[LLM] Error type: ${context.errorType}\n`);
      process.stderr.write(`[LLM] Error snippet: ${context.error.substring(0, 100)}...\n`);
      
      // Call OpenAI
      const startTime = Date.now();
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o', // GPT-4o for better code fixes
        messages: [
          { role: 'system', content: agentPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2, // Low temperature for deterministic fixes
        response_format: { type: 'json_object' }, // Request JSON response
      });
      const duration = Date.now() - startTime;
      
      // Parse response
      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      
      // Log LLM response details
      const usage = response.usage;
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;
      const totalTokens = usage?.total_tokens || 0;
      
      // GPT-4o pricing (as of Nov 2024): $2.50/1M input, $10.00/1M output
      const inputCost = (inputTokens / 1000000) * 2.50;
      const outputCost = (outputTokens / 1000000) * 10.00;
      const totalCost = inputCost + outputCost;
      
      process.stderr.write(`[LLM] Response received in ${duration}ms\n`);
      process.stderr.write(`[LLM] Token usage: ${inputTokens} input + ${outputTokens} output = ${totalTokens} total\n`);
      process.stderr.write(`[LLM] Cost: $${totalCost.toFixed(4)} ($${inputCost.toFixed(4)} input + $${outputCost.toFixed(4)} output)\n`);
      process.stderr.write(`[LLM] Finish reason: ${response.choices[0]?.finish_reason || 'unknown'}\n`);
      process.stderr.write(`[LLM] Commands generated: ${parsed.commands?.length || 0}\n`);
      process.stderr.write(`[LLM] File changes: ${parsed.fileChanges?.length || 0}\n`);
      
      if (parsed.reasoning) {
        process.stderr.write(`[LLM] Reasoning: ${parsed.reasoning.substring(0, 200)}...\n`);
      }
      
      // Show LLM reasoning
      if (this.callbacks?.sendThought) {
        await this.callbacks.sendThought(`💡 LLM Analysis:\n${parsed.reasoning || parsed.explanation || 'Fix generated'}`);
      }
      
      if (this.callbacks?.sendMessage && parsed.commands) {
        await this.callbacks.sendMessage(`✅ LLM Fix Strategy: ${parsed.explanation}\nCommands: ${parsed.commands.length}\nCost: $${totalCost.toFixed(4)}`);
      }
      
      return {
        success: true,
        solution: parsed.explanation || 'LLM fix applied',
        commands: parsed.commands || [],
        fileChanges: parsed.fileChanges || [],
        explanation: parsed.explanation || 'Fix generated by LLM',
        usedLLM: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      
      process.stderr.write(`[LLM] ERROR: LLM fix failed\n`);
      process.stderr.write(`[LLM] Error message: ${errorMessage}\n`);
      if (errorStack) {
        process.stderr.write(`[LLM] Stack trace: ${errorStack.substring(0, 500)}...\n`);
      }
      
      console.error('LLM fix failed:', error);
      return {
        success: false,
        explanation: `LLM fix failed: ${errorMessage}`,
        usedLLM: true,
      };
    }
  }
  
  /**
   * Load agent prompt template from workshop
   */
  private async loadAgentPrompt(errorType: string): Promise<string> {
    const agentMap: Record<string, string> = {
      'Build Errors': 'build_fixer.md',
      'Material Issues': 'style_migrator.md',
      'Component Issues': 'code_modernizer.md',
      'HTTP/Services': 'logic_refactorer.md',
      'Dependencies': 'dependency_auditor.md',
    };
    
    const agentFile = agentMap[errorType] || 'build_fixer.md';
    const agentPath = path.join(this.workshopRoot, 'agents/roles', agentFile);
    
    try {
      const content = await fs.readFile(agentPath, 'utf-8');
      
      // Extract relevant sections
      const roleMatch = content.match(/## Role Description\n([\s\S]*?)(?=\n##)/);
      const responsibilitiesMatch = content.match(/## Responsibilities\n([\s\S]*?)(?=\n##)/);
      
      return `
# ${errorType} Agent

${roleMatch ? roleMatch[1] : ''}

${responsibilitiesMatch ? responsibilitiesMatch[1] : ''}

Your task is to provide a fix for the error below. Return only the fix commands or code changes needed.
      `.trim();
    } catch (error) {
      return `You are an Angular migration expert. Fix the error below.`;
    }
  }
  
  /**
   * Build fix prompt with context
   */
  private buildFixPrompt(context: FixContext, agentPrompt: string): string {
    let prompt = `
Angular Version: ${context.angularVersion || 'Unknown'}

Error:
\`\`\`
${context.error}
\`\`\`
`;
    
    if (context.filePath && context.fileContent) {
      prompt += `
File: ${context.filePath}
\`\`\`typescript
${context.fileContent}
\`\`\`
`;
    }
    
    prompt += `
Provide the fix as:
1. Commands to run (if any)
2. File changes (if any)
3. Brief explanation

Format your response as JSON:
\`\`\`json
{
  "commands": ["command1", "command2"],
  "fileChanges": [
    {"filePath": "path/to/file", "content": "new content"}
  ],
  "explanation": "Why this fix works"
}
\`\`\`
`;
    
    return prompt;
  }
  
  /**
   * Apply fix result to the project
   */
  async applyFix(result: FixResult, projectRoot: string): Promise<void> {
    if (!result.success) {
      throw new Error('Cannot apply unsuccessful fix');
    }
    
    // Apply file changes
    if (result.fileChanges) {
      for (const change of result.fileChanges) {
        const fullPath = path.join(projectRoot, change.filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, change.content, 'utf-8');
      }
    }
    
    // Commands will be executed by the workflow executor
  }
}

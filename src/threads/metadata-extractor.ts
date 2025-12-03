/**
 * Metadata Extractor - Auto-tagging and metadata enrichment
 * Extracts tags from workflow context, messages, and tool calls
 */

import type { ThreadMessage, ThreadToolCall } from './types.js';

/**
 * Extract tags from thread messages and tool calls
 */
export class MetadataExtractor {
  /**
   * Extract tags from a single message
   */
  static extractTagsFromMessage(message: ThreadMessage): string[] {
    const tags: Set<string> = new Set();

    // Extract from context
    if (message.context?.currentStep) {
      // Convert step IDs to tags (e.g., "upgrade-v15" → "step:upgrade-v15")
      tags.add(`step:${message.context.currentStep}`);
    }

    // Extract Angular version mentions from text content
    if (message.content.type === 'text') {
      const text = message.content.text;

      // Match Angular versions (v14, v15, Angular 14, etc.)
      const versionMatches = text.match(/(?:angular|ng)[-\s]?(?:v)?(\d+)/gi);
      if (versionMatches) {
        for (const match of versionMatches) {
          const version = match.match(/\d+/)?.[0];
          if (version) {
            tags.add(`angular-${version}`);
          }
        }
      }

      // Extract migration-related keywords
      const keywords = [
        'standalone',
        'modules',
        'signals',
        'rxjs',
        'typescript',
        'dependency-injection',
        'routing',
        'forms',
        'http',
        'testing',
      ];

      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword)) {
          tags.add(keyword);
        }
      }
    }

    return Array.from(tags);
  }

  /**
   * Extract tags from a tool call
   */
  static extractTagsFromToolCall(toolCall: ThreadToolCall): string[] {
    const tags: Set<string> = new Set();

    // Tag by tool kind
    tags.add(`tool:${toolCall.kind}`);

    // Tag by status
    if (toolCall.status === 'failed') {
      tags.add('has-errors');
    }

    // Extract from context
    if (toolCall.context?.currentStep) {
      tags.add(`step:${toolCall.context.currentStep}`);
    }

    // Extract from title
    const title = toolCall.title.toLowerCase();

    if (title.includes('migrate') || title.includes('migration')) {
      tags.add('migration');
    }

    if (title.includes('fix') || title.includes('repair')) {
      tags.add('auto-fixed');
    }

    if (title.includes('test')) {
      tags.add('testing');
    }

    if (title.includes('build')) {
      tags.add('building');
    }

    return Array.from(tags);
  }

  /**
   * Extract tags from multiple messages and tool calls
   */
  static extractAllTags(
    messages: ThreadMessage[],
    toolCalls: ThreadToolCall[]
  ): string[] {
    const allTags: Set<string> = new Set();

    // Extract from messages
    for (const message of messages) {
      const messageTags = this.extractTagsFromMessage(message);
      messageTags.forEach((tag) => allTags.add(tag));
    }

    // Extract from tool calls
    for (const toolCall of toolCalls) {
      const toolCallTags = this.extractTagsFromToolCall(toolCall);
      toolCallTags.forEach((tag) => allTags.add(tag));
    }

    return Array.from(allTags).sort();
  }

  /**
   * Deduplicate and normalize tags
   */
  static normalizeTags(tags: string[]): string[] {
    const normalized = new Set<string>();

    for (const tag of tags) {
      // Lowercase and trim
      const clean = tag.toLowerCase().trim();

      // Skip empty tags
      if (!clean) continue;

      // Replace spaces with hyphens
      const formatted = clean.replace(/\s+/g, '-');

      normalized.add(formatted);
    }

    return Array.from(normalized).sort();
  }

  /**
   * Generate a descriptive summary from messages
   */
  static generateSummary(messages: ThreadMessage[]): string | undefined {
    // Find the first user message with substantial content
    const firstUserMessage = messages.find(
      (m) => m.type === 'user' && m.content.type === 'text'
    );

    if (firstUserMessage && firstUserMessage.content.type === 'text') {
      const text = firstUserMessage.content.text;

      // Truncate to 200 characters
      if (text.length > 200) {
        return text.substring(0, 200) + '...';
      }

      return text;
    }

    return undefined;
  }

  /**
   * Determine migration type from early messages
   */
  static inferMigrationType(messages: ThreadMessage[]): string {
    const firstMessages = messages.slice(0, 5);
    const text = firstMessages
      .filter((m) => m.content.type === 'text')
      .map((m) => (m.content.type === 'text' ? m.content.text : ''))
      .join(' ')
      .toLowerCase();

    if (text.includes('step by step') || text.includes('step-by-step')) {
      return 'step-by-step';
    }

    if (text.includes('analyze') || text.includes('analysis')) {
      return 'analysis';
    }

    if (text.includes('migrate') || text.includes('migration')) {
      return 'full';
    }

    return 'guidance';
  }

  /**
   * Calculate session health score (0-100)
   */
  static calculateHealthScore(
    totalMessages: number,
    totalToolCalls: number,
    failedToolCalls: number,
    hasErrors: boolean
  ): number {
    let score = 100;

    // Penalize for errors
    if (hasErrors) {
      score -= 30;
    }

    // Penalize for failed tool calls
    if (totalToolCalls > 0) {
      const failureRate = failedToolCalls / totalToolCalls;
      score -= Math.floor(failureRate * 40);
    }

    // Bonus for active sessions (more messages)
    if (totalMessages > 10) {
      score += 10;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }
}

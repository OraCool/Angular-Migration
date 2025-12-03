/**
 * Thread API - High-level interface for thread operations
 * Provides search, listing, and management capabilities
 */

import { ThreadHistoryManager } from './thread-history-manager.js';
import type {
  ThreadMetadata,
  ThreadStatus,
  MigrationType,
} from './types.js';
import type { SessionId } from '../types/acp.js';

/**
 * Search criteria for finding threads
 */
export interface ThreadSearchCriteria {
  status?: ThreadStatus[];
  migrationType?: MigrationType[];
  tags?: string[];
  projectPath?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Session list item for UI display
 */
export interface SessionListItem {
  sessionId: SessionId;
  title: string; // Auto-generated from context
  description: string;
  startedAt: Date;
  lastActivityAt: Date;
  status: ThreadStatus;
  messageCount: number;
  toolCallCount: number;
  tags: string[];
}

/**
 * ThreadAPI - High-level operations for thread management
 */
export class ThreadAPI {
  constructor(private readonly threadHistory: ThreadHistoryManager) {}

  /**
   * List all sessions with metadata
   */
  async listSessions(
    criteria?: ThreadSearchCriteria
  ): Promise<SessionListItem[]> {
    try {
      // Get all sessions
      const allMetadata = await this.threadHistory.listAllSessions();

      // Convert to session list items with filters
      const sessions: SessionListItem[] = [];

      for (const metadata of allMetadata) {
        // Apply filters
        if (!this.matchesCriteria(metadata, criteria)) {
          continue;
        }

        // Generate display title and description
        const title = this.generateTitle(metadata);
        const description = this.generateDescription(metadata);

        sessions.push({
          sessionId: metadata.sessionId,
          title,
          description,
          startedAt: new Date(metadata.startedAt),
          lastActivityAt: new Date(metadata.lastActivityAt),
          status: metadata.status,
          messageCount: metadata.totalMessages,
          toolCallCount: metadata.totalToolCalls,
          tags: metadata.tags,
        });
      }

      // Apply offset and limit
      let filtered = sessions;
      if (criteria?.offset) {
        filtered = filtered.slice(criteria.offset);
      }
      if (criteria?.limit) {
        filtered = filtered.slice(0, criteria.limit);
      }

      return filtered;
    } catch (error) {
      process.stderr.write(`[ThreadAPI] ❌ Failed to list sessions: ${error}\n`);
      return [];
    }
  }

  /**
   * Search sessions by text query
   */
  async searchSessions(query: string): Promise<SessionListItem[]> {
    const allSessions = await this.listSessions();
    const lowerQuery = query.toLowerCase();

    return allSessions.filter(
      (session) =>
        session.title.toLowerCase().includes(lowerQuery) ||
        session.description.toLowerCase().includes(lowerQuery) ||
        session.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        session.sessionId.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    totalMessages: number;
    totalToolCalls: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  }> {
    const sessions = await this.listSessions();

    const stats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === 'active').length,
      completedSessions: sessions.filter((s) => s.status === 'completed')
        .length,
      failedSessions: sessions.filter((s) => s.status === 'failed').length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
      totalToolCalls: sessions.reduce((sum, s) => sum + s.toolCallCount, 0),
      oldestSession: sessions.length
        ? new Date(
            Math.min(...sessions.map((s) => s.startedAt.getTime()))
          )
        : null,
      newestSession: sessions.length
        ? new Date(
            Math.max(...sessions.map((s) => s.startedAt.getTime()))
          )
        : null,
    };

    return stats;
  }

  /**
   * Archive old inactive sessions
   */
  async archiveOldSessions(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const sessions = await this.listSessions({
      toDate: cutoffDate,
      status: ['completed', 'failed', 'abandoned'],
    });

    let archived = 0;
    for (const session of sessions) {
      try {
        // In a real implementation, you'd compress and move to archive
        // For now, we just mark them
        await this.threadHistory.updateMetadata(session.sessionId, {
          tags: [...session.tags, 'archived'],
        });
        archived++;
      } catch (error) {
        process.stderr.write(
          `[ThreadAPI] ⚠️ Failed to archive ${session.sessionId}: ${error}\n`
        );
      }
    }

    process.stderr.write(
      `[ThreadAPI] ✅ Archived ${archived} old sessions\n`
    );
    return archived;
  }

  /**
   * Delete abandoned sessions (no activity in X days)
   */
  async deleteAbandonedSessions(inactiveDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    const sessions = await this.listSessions();
    const abandoned = sessions.filter(
      (s) =>
        s.status === 'active' &&
        s.lastActivityAt < cutoffDate &&
        s.messageCount === 0
    );

    let deleted = 0;
    for (const session of abandoned) {
      try {
        await this.threadHistory.updateMetadata(session.sessionId, {
          status: 'abandoned',
        });
        deleted++;
      } catch (error) {
        process.stderr.write(
          `[ThreadAPI] ⚠️ Failed to mark abandoned ${session.sessionId}: ${error}\n`
        );
      }
    }

    process.stderr.write(
      `[ThreadAPI] ✅ Marked ${deleted} abandoned sessions\n`
    );
    return deleted;
  }

  /**
   * Generate human-readable title from metadata
   */
  private generateTitle(metadata: ThreadMetadata): string {
    const date = new Date(metadata.startedAt).toLocaleDateString();

    if (metadata.migrationType === 'step-by-step') {
      return `Migration: ${metadata.currentAngularVersion} → ${metadata.targetAngularVersion} (${date})`;
    }

    if (metadata.migrationType === 'analysis') {
      return `Analysis: ${metadata.projectPath.split('/').pop()} (${date})`;
    }

    if (metadata.migrationType === 'guidance') {
      return `Guidance Session (${date})`;
    }

    return `Angular Migration (${date})`;
  }

  /**
   * Generate description from metadata
   */
  private generateDescription(metadata: ThreadMetadata): string {
    const parts: string[] = [];

    if (metadata.totalMessages > 0) {
      parts.push(`${metadata.totalMessages} messages`);
    }

    if (metadata.totalToolCalls > 0) {
      parts.push(`${metadata.totalToolCalls} tool calls`);
    }

    if (metadata.status === 'completed' && metadata.successMetrics) {
      parts.push(
        `${metadata.successMetrics.stepsCompleted}/${metadata.successMetrics.totalSteps} steps completed`
      );
    }

    if (metadata.status === 'failed' && metadata.failureReason) {
      parts.push(`Failed: ${metadata.failureReason}`);
    }

    return parts.join(' • ') || 'No activity';
  }

  /**
   * Check if metadata matches search criteria
   */
  private matchesCriteria(
    metadata: ThreadMetadata,
    criteria?: ThreadSearchCriteria
  ): boolean {
    if (!criteria) return true;

    // Filter by status
    if (
      criteria.status &&
      criteria.status.length > 0 &&
      !criteria.status.includes(metadata.status)
    ) {
      return false;
    }

    // Filter by migration type
    if (
      criteria.migrationType &&
      criteria.migrationType.length > 0 &&
      !criteria.migrationType.includes(metadata.migrationType)
    ) {
      return false;
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      const hasMatchingTag = criteria.tags.some((tag) =>
        metadata.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Filter by project path
    if (
      criteria.projectPath &&
      !metadata.projectPath.includes(criteria.projectPath)
    ) {
      return false;
    }

    // Filter by date range
    const startedAt = new Date(metadata.startedAt);
    if (criteria.fromDate && startedAt < criteria.fromDate) {
      return false;
    }
    if (criteria.toDate && startedAt > criteria.toDate) {
      return false;
    }

    return true;
  }
}

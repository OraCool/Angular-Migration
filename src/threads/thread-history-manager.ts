/**
 * Thread History Manager
 * Handles thread persistence, message logging, and metadata management
 * Follows StateManager pattern with atomic writes
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { config } from '../config.js';
import type { SessionId } from '../types/acp.js';
import type {
  ThreadMetadata,
  ThreadMessage,
  ThreadToolCall,
  ThreadInitContext,
  LoadMessagesOptions,
  LoadToolCallsOptions,
  ThreadStatus,
} from './types.js';

/**
 * ThreadHistoryManager - Core persistence layer for thread history
 * Extends StateManager pattern with:
 * - Atomic metadata updates (temp + rename)
 * - JSONL append-only logs for messages and tool calls
 * - Thread lifecycle management
 */
export class ThreadHistoryManager {
  private readonly threadsDir: string;
  private readonly SCHEMA_VERSION = 1;
  private readonly MESSAGES_LOG = 'messages.jsonl';
  private readonly TOOLCALLS_LOG = 'toolcalls.jsonl';
  private readonly METADATA_FILE = 'metadata.json';

  constructor(threadsDir?: string) {
    // Use config default or allow override
    this.threadsDir = threadsDir || config.threadsDir;
  }

  // ===== Thread Lifecycle =====

  /**
   * Create a new thread with initial metadata
   */
  async createThread(context: ThreadInitContext): Promise<ThreadMetadata> {
    try {
      const threadDir = this.getThreadDir(context.sessionId);

      // Ensure thread directory exists
      await fs.mkdir(threadDir, { recursive: true });

      // Create initial metadata
      const metadata: ThreadMetadata = {
        version: this.SCHEMA_VERSION,
        sessionId: context.sessionId,
        agentId: context.agentId,
        agentVersion: context.agentVersion,

        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),

        migrationType: context.migrationType,
        projectPath: context.projectPath,
        currentAngularVersion: context.currentAngularVersion,
        targetAngularVersion: context.targetAngularVersion,

        totalMessages: 0,
        totalToolCalls: 0,

        status: 'active',
        tags: [],

        files: {
          messagesLog: this.MESSAGES_LOG,
          toolCallsLog: this.TOOLCALLS_LOG,
        },
      };

      // Save metadata
      await this.saveMetadata(context.sessionId, metadata);

      // Create empty log files
      await fs.writeFile(path.join(threadDir, this.MESSAGES_LOG), '', 'utf-8');
      await fs.writeFile(path.join(threadDir, this.TOOLCALLS_LOG), '', 'utf-8');

      process.stderr.write(
        `[ThreadHistory] ✅ Thread created: ${context.sessionId}\n`
      );

      return metadata;
    } catch (error) {
      process.stderr.write(
        `[ThreadHistory] ❌ Failed to create thread: ${error}\n`
      );
      throw new Error(`Failed to create thread: ${error}`);
    }
  }

  /**
   * Get thread metadata
   */
  async getMetadata(sessionId: SessionId): Promise<ThreadMetadata | null> {
    try {
      const metadataPath = this.getMetadataPath(sessionId);

      // Check if metadata exists
      try {
        await fs.access(metadataPath);
      } catch {
        return null; // Thread doesn't exist
      }

      // Read and parse metadata
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata: ThreadMetadata = JSON.parse(content);

      // Validate metadata
      this.validateMetadata(metadata);

      return metadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      process.stderr.write(
        `[ThreadHistory] ❌ Failed to load metadata: ${error}\n`
      );
      throw new Error(`Failed to load metadata: ${error}`);
    }
  }

  /**
   * Update thread metadata (atomic write)
   */
  async updateMetadata(
    sessionId: SessionId,
    updates: Partial<ThreadMetadata>
  ): Promise<void> {
    try {
      // Load current metadata
      const currentMetadata = await this.getMetadata(sessionId);
      if (!currentMetadata) {
        throw new Error(`Thread not found: ${sessionId}`);
      }

      // Merge updates
      const updatedMetadata: ThreadMetadata = {
        ...currentMetadata,
        ...updates,
        lastActivityAt: new Date().toISOString(),
      };

      // Save atomically
      await this.saveMetadata(sessionId, updatedMetadata);
    } catch (error) {
      process.stderr.write(
        `[ThreadHistory] ❌ Failed to update metadata: ${error}\n`
      );
      throw new Error(`Failed to update metadata: ${error}`);
    }
  }

  /**
   * Complete thread (mark as completed)
   */
  async completeThread(
    sessionId: SessionId,
    successMetrics?: ThreadMetadata['successMetrics']
  ): Promise<void> {
    await this.updateMetadata(sessionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      successMetrics,
    });
  }

  /**
   * Fail thread (mark as failed)
   */
  async failThread(sessionId: SessionId, reason: string): Promise<void> {
    await this.updateMetadata(sessionId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      failureReason: reason,
    });
  }

  /**
   * Check if thread exists
   */
  async hasThread(sessionId: SessionId): Promise<boolean> {
    try {
      const metadataPath = this.getMetadataPath(sessionId);
      await fs.access(metadataPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all thread sessions with metadata
   */
  async listAllSessions(): Promise<ThreadMetadata[]> {
    try {
      // Ensure threads directory exists
      await fs.mkdir(this.threadsDir, { recursive: true });

      // Read all session directories
      const entries = await fs.readdir(this.threadsDir, { withFileTypes: true });
      const sessions: ThreadMetadata[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const sessionId = entry.name;
          const metadata = await this.getMetadata(sessionId);
          if (metadata) {
            sessions.push(metadata);
          }
        }
      }

      // Sort by lastActivityAt (newest first)
      sessions.sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() -
          new Date(a.lastActivityAt).getTime()
      );

      return sessions;
    } catch (error) {
      process.stderr.write(
        `[ThreadHistory] ❌ Failed to list sessions: ${error}\n`
      );
      return [];
    }
  }

  // ===== Message Logging =====

  /**
   * Append message to thread (JSONL format)
   */
  async appendMessage(message: ThreadMessage): Promise<void> {
    try {
      const threadDir = this.getThreadDir(message.sessionId);
      const messagesPath = path.join(threadDir, this.MESSAGES_LOG);

      // Serialize message as JSON + newline
      const line = JSON.stringify(message) + '\n';

      // Append to log file (atomic operation)
      await fs.appendFile(messagesPath, line, 'utf-8');

      // Update metadata (increment message count)
      const metadata = await this.getMetadata(message.sessionId);
      if (metadata) {
        await this.updateMetadata(message.sessionId, {
          totalMessages: metadata.totalMessages + 1,
        });
      }

      process.stderr.write(
        `[ThreadHistory] 📝 Message logged: ${message.type} (${message.sessionId})\n`
      );
    } catch (error) {
      process.stderr.write(
        `[ThreadHistory] ❌ Failed to append message: ${error}\n`
      );
      // Don't throw - logging failure shouldn't break agent
    }
  }

  /**
   * Load messages from thread
   */
  async loadMessages(
    sessionId: SessionId,
    options?: LoadMessagesOptions
  ): Promise<ThreadMessage[]> {
    try {
      const threadDir = this.getThreadDir(sessionId);
      const messagesPath = path.join(threadDir, this.MESSAGES_LOG);

      // Read entire log file
      const content = await fs.readFile(messagesPath, 'utf-8');

      // Parse JSONL (one JSON object per line)
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      const messages: ThreadMessage[] = [];

      for (const line of lines) {
        try {
          const message = JSON.parse(line) as ThreadMessage;
          messages.push(message);
        } catch (parseError) {
          // Skip invalid lines with warning
          process.stderr.write(
            `[ThreadHistory] ⚠️ Skipping corrupted message line\n`
          );
        }
      }

      // Apply filters if provided
      return this.filterMessages(messages, options);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []; // Log file doesn't exist yet
      }
      process.stderr.write(
        `[ThreadHistory] ❌ Failed to load messages: ${error}\n`
      );
      throw new Error(`Failed to load messages: ${error}`);
    }
  }

  // ===== Tool Call Logging =====

  /**
   * Append tool call to thread (JSONL format)
   */
  async appendToolCall(toolCall: ThreadToolCall): Promise<void> {
    try {
      const threadDir = this.getThreadDir(toolCall.sessionId);
      const toolCallsPath = path.join(threadDir, this.TOOLCALLS_LOG);

      // Serialize tool call as JSON + newline
      const line = JSON.stringify(toolCall) + '\n';

      // Append to log file (atomic operation)
      await fs.appendFile(toolCallsPath, line, 'utf-8');

      // Update metadata (increment tool call count)
      const metadata = await this.getMetadata(toolCall.sessionId);
      if (metadata) {
        await this.updateMetadata(toolCall.sessionId, {
          totalToolCalls: metadata.totalToolCalls + 1,
        });
      }

      process.stderr.write(
        `[ThreadHistory] 🔧 Tool call logged: ${toolCall.title} (${toolCall.sessionId})\n`
      );
    } catch (error) {
      process.stderr.write(
        `[ThreadHistory] ❌ Failed to append tool call: ${error}\n`
      );
      // Don't throw - logging failure shouldn't break agent
    }
  }

  /**
   * Load tool calls from thread
   */
  async loadToolCalls(
    sessionId: SessionId,
    options?: LoadToolCallsOptions
  ): Promise<ThreadToolCall[]> {
    try {
      const threadDir = this.getThreadDir(sessionId);
      const toolCallsPath = path.join(threadDir, this.TOOLCALLS_LOG);

      // Read entire log file
      const content = await fs.readFile(toolCallsPath, 'utf-8');

      // Parse JSONL (one JSON object per line)
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      const toolCalls: ThreadToolCall[] = [];

      for (const line of lines) {
        try {
          const toolCall = JSON.parse(line) as ThreadToolCall;
          toolCalls.push(toolCall);
        } catch (parseError) {
          // Skip invalid lines with warning
          process.stderr.write(
            `[ThreadHistory] ⚠️ Skipping corrupted tool call line\n`
          );
        }
      }

      // Apply filters if provided
      return this.filterToolCalls(toolCalls, options);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []; // Log file doesn't exist yet
      }
      process.stderr.write(
        `[ThreadHistory] ❌ Failed to load tool calls: ${error}\n`
      );
      throw new Error(`Failed to load tool calls: ${error}`);
    }
  }

  // ===== Helper Methods =====

  /**
   * Save metadata with atomic write (temp + rename pattern)
   */
  private async saveMetadata(
    sessionId: SessionId,
    metadata: ThreadMetadata
  ): Promise<void> {
    const metadataPath = this.getMetadataPath(sessionId);
    const tempPath = `${metadataPath}.tmp`;

    // Write to temp file
    await fs.writeFile(tempPath, JSON.stringify(metadata, null, 2), 'utf-8');

    // Atomic rename
    await fs.rename(tempPath, metadataPath);
  }

  /**
   * Validate metadata structure
   */
  private validateMetadata(metadata: ThreadMetadata): void {
    // Validate schema version
    if (metadata.version !== this.SCHEMA_VERSION) {
      throw new Error(
        `Metadata schema version mismatch: expected ${this.SCHEMA_VERSION}, got ${metadata.version}`
      );
    }

    // Validate required fields
    if (!metadata.sessionId || typeof metadata.sessionId !== 'string') {
      throw new Error('Invalid metadata: missing or invalid sessionId');
    }

    if (!metadata.startedAt || typeof metadata.startedAt !== 'string') {
      throw new Error('Invalid metadata: missing or invalid startedAt');
    }

    // Validate timestamp is a valid ISO string
    const timestamp = new Date(metadata.startedAt);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid metadata: startedAt is not a valid date');
    }
  }

  /**
   * Filter messages based on options
   */
  private filterMessages(
    messages: ThreadMessage[],
    options?: LoadMessagesOptions
  ): ThreadMessage[] {
    let filtered = messages;

    // Filter by message type
    if (options?.messageTypes && options.messageTypes.length > 0) {
      filtered = filtered.filter(msg => options.messageTypes!.includes(msg.type));
    }

    // Filter by timestamp range
    if (options?.fromTimestamp) {
      const fromDate = new Date(options.fromTimestamp);
      filtered = filtered.filter(msg => new Date(msg.timestamp) >= fromDate);
    }

    if (options?.toTimestamp) {
      const toDate = new Date(options.toTimestamp);
      filtered = filtered.filter(msg => new Date(msg.timestamp) <= toDate);
    }

    // Apply offset and limit
    if (options?.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Filter tool calls based on options
   */
  private filterToolCalls(
    toolCalls: ThreadToolCall[],
    options?: LoadToolCallsOptions
  ): ThreadToolCall[] {
    let filtered = toolCalls;

    // Filter by status
    if (options?.status && options.status.length > 0) {
      filtered = filtered.filter(tc => options.status!.includes(tc.status));
    }

    // Filter by timestamp range
    if (options?.fromTimestamp) {
      const fromDate = new Date(options.fromTimestamp);
      filtered = filtered.filter(tc => new Date(tc.timestamp) >= fromDate);
    }

    if (options?.toTimestamp) {
      const toDate = new Date(options.toTimestamp);
      filtered = filtered.filter(tc => new Date(tc.timestamp) <= toDate);
    }

    // Apply offset and limit
    if (options?.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get thread directory path
   */
  private getThreadDir(sessionId: SessionId): string {
    return path.join(this.threadsDir, sessionId);
  }

  /**
   * Get metadata file path
   */
  private getMetadataPath(sessionId: SessionId): string {
    return path.join(this.getThreadDir(sessionId), this.METADATA_FILE);
  }
}

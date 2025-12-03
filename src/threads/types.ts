/**
 * Thread History Type Definitions
 * Schema version 1
 */

import type { SessionId, ContentBlock, ToolCallId, ToolKind, ToolCallStatus, ToolCallContent, ToolCallLocation } from '../types/acp.js';

// ===== Thread Metadata =====

/**
 * Thread status values
 */
export type ThreadStatus = 'active' | 'paused' | 'completed' | 'failed' | 'abandoned';

/**
 * Migration type classification
 */
export type MigrationType = 'step-by-step' | 'analysis' | 'guidance' | 'full';

/**
 * Thread metadata - stored as metadata.json in thread directory
 * Contains thread-level information and index to log files
 */
export interface ThreadMetadata {
  version: number;                      // Schema version (1)
  sessionId: SessionId;
  agentId: string;                      // UUID of agent instance
  agentVersion: string;                 // Agent version (e.g., "1.0.0")

  // Session info
  startedAt: string;                    // ISO timestamp
  lastActivityAt: string;               // ISO timestamp
  completedAt?: string;                 // ISO timestamp if session ended

  // Migration context
  migrationType: MigrationType;
  projectPath: string;
  currentAngularVersion?: string;
  targetAngularVersion?: string;

  // Progress tracking
  totalMessages: number;
  totalToolCalls: number;
  currentCheckpointIndex?: number;      // Link to latest checkpoint

  // Status tracking
  status: ThreadStatus;
  failureReason?: string;
  successMetrics?: {
    stepsCompleted: number;
    totalSteps: number;
    duration: number;                   // milliseconds
  };

  // Tagging & categorization
  tags: string[];                       // e.g., ['angular-15', 'standalone-migration', 'auto-fixed']
  customMetadata?: Record<string, unknown>;

  // File pointers
  files: {
    messagesLog: string;                // 'messages.jsonl'
    toolCallsLog: string;               // 'toolcalls.jsonl'
  };
}

// ===== Thread Message =====

/**
 * Message type classification
 */
export type MessageType = 'user' | 'agent_thought' | 'agent_message' | 'system';

/**
 * Thread message entry - stored as JSONL (one per line in messages.jsonl)
 */
export interface ThreadMessage {
  timestamp: string;                    // ISO timestamp
  type: MessageType;
  sessionId: SessionId;
  agentId: string;

  // Content (from ACP ContentBlock)
  content: ContentBlock;

  // Context at time of message
  context?: {
    currentStep?: string;               // Workflow step ID
    stepIndex?: number;
    totalSteps?: number;
    awaitingConfirmation?: boolean;
  };

  // For agent-to-agent messages
  sourceAgentId?: string;               // If forwarded from another agent
  targetAgentIds?: string[];            // If broadcast/multicast

  // Metadata
  metadata?: {
    tokenCount?: number;
    model?: string;                     // For LLM-generated messages
    duration?: number;                  // Generation time (ms)
  };
}

// ===== Thread Tool Call =====

/**
 * Tool call entry - stored as JSONL (one per line in toolcalls.jsonl)
 */
export interface ThreadToolCall {
  timestamp: string;                    // ISO timestamp
  sessionId: SessionId;
  agentId: string;

  // From ACP ToolCall
  toolCallId: ToolCallId;
  title: string;
  kind: ToolKind;
  status: ToolCallStatus;

  // Execution details
  rawInput?: Record<string, unknown>;
  rawOutput?: Record<string, unknown>;
  content: ToolCallContent[];
  locations: ToolCallLocation[];

  // Performance tracking
  startedAt: string;                    // ISO timestamp
  completedAt?: string;                 // ISO timestamp
  duration?: number;                    // milliseconds
  error?: string;

  // Context
  context?: {
    currentStep?: string;
    stepAction?: string;                // Specific action within step
  };
}

// ===== Thread Creation Options =====

/**
 * Options for creating a new thread
 */
export interface ThreadInitContext {
  sessionId: SessionId;
  agentId: string;
  agentVersion: string;
  projectPath: string;
  migrationType: MigrationType;
  currentAngularVersion?: string;
  targetAngularVersion?: string;
}

// ===== Thread Query Options =====

/**
 * Options for loading messages from thread
 */
export interface LoadMessagesOptions {
  limit?: number;
  offset?: number;
  fromTimestamp?: string;               // ISO timestamp
  toTimestamp?: string;                 // ISO timestamp
  messageTypes?: MessageType[];
}

/**
 * Options for loading tool calls from thread
 */
export interface LoadToolCallsOptions {
  limit?: number;
  offset?: number;
  fromTimestamp?: string;               // ISO timestamp
  toTimestamp?: string;                 // ISO timestamp
  status?: ToolCallStatus[];
}

/**
 * Streaming Utilities
 * Helpers for sending progress notifications during tool execution
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ProgressUpdate, ProgressCallback } from '../types.js';

/**
 * Create a progress callback that sends MCP notifications
 *
 * @param server - MCP server instance
 * @param toolName - Name of the tool being executed
 * @param requestId - Request ID for correlation
 * @returns Progress callback function
 */
export function createProgressCallback(
  server: Server,
  toolName: string,
  requestId?: string
): ProgressCallback {
  return (update: ProgressUpdate) => {
    // Add timestamp if not provided
    if (!update.timestamp) {
      update.timestamp = new Date().toISOString();
    }

    // Send notification to client
    // Note: MCP servers can send notifications to inform clients of events
    // The notification method and schema depend on the MCP SDK version
    try {
      // Log to stderr (visible in MCP client logs)
      console.error(
        `[${toolName}] ${update.type || 'info'}: ${update.message}` +
        (update.progress !== undefined ? ` (${update.progress}%)` : '')
      );

      // TODO: When MCP SDK supports custom notifications, send structured data
      // For now, we're using console.error which is captured by the MCP client
      // Future: server.sendNotification('tools/progress', { toolName, requestId, update });
    } catch (error) {
      // Don't fail the tool execution if notification fails
      console.error('[Streaming Error]', error);
    }
  };
}

/**
 * Create a no-op progress callback (for non-streaming operations)
 */
export function createNoOpProgressCallback(): ProgressCallback {
  return () => {
    // Do nothing
  };
}

/**
 * Create a buffering progress callback that collects updates
 *
 * @param buffer - Array to store progress updates
 * @param toolName - Name of the MCP tool generating updates
 * @returns Progress callback function
 */
export function createBufferingProgressCallback(
  buffer: ProgressUpdate[],
  toolName?: string
): ProgressCallback {
  return (update: ProgressUpdate) => {
    // Add timestamp if not provided
    if (!update.timestamp) {
      update.timestamp = new Date().toISOString();
    }

    // Add tool name if not provided
    if (!update.toolName && toolName) {
      update.toolName = toolName;
    }

    // Add to buffer
    buffer.push(update);

    // Also log to stderr for immediate visibility with tool name
    const toolPrefix = update.toolName ? `[${update.toolName}] ` : '';
    console.error(
      `${toolPrefix}[Progress] ${update.type || 'info'}: ${update.message}` +
      (update.progress !== undefined ? ` (${update.progress}%)` : '')
    );
  };
}

/**
 * Format progress update as a user-friendly message
 */
export function formatProgressUpdate(update: ProgressUpdate): string {
  const prefix = update.type ? `[${update.type.toUpperCase()}]` : '';
  const progress = update.progress !== undefined ? ` (${update.progress}%)` : '';
  const steps =
    update.completedSteps !== undefined && update.totalSteps !== undefined
      ? ` [${update.completedSteps}/${update.totalSteps}]`
      : '';

  return `${prefix} ${update.message}${progress}${steps}`.trim();
}

/**
 * Calculate progress percentage from steps
 */
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Create a progress update helper for a specific operation
 */
export function createProgressHelper(
  callback: ProgressCallback,
  totalSteps: number
) {
  let completedSteps = 0;

  return {
    /** Report info message */
    info: (message: string, metadata?: Record<string, unknown>) => {
      callback({
        message,
        type: 'info',
        completedSteps,
        totalSteps,
        progress: calculateProgress(completedSteps, totalSteps),
        metadata,
      });
    },

    /** Report success message */
    success: (message: string, metadata?: Record<string, unknown>) => {
      callback({
        message,
        type: 'success',
        completedSteps,
        totalSteps,
        progress: calculateProgress(completedSteps, totalSteps),
        metadata,
      });
    },

    /** Report warning message */
    warning: (message: string, metadata?: Record<string, unknown>) => {
      callback({
        message,
        type: 'warning',
        completedSteps,
        totalSteps,
        progress: calculateProgress(completedSteps, totalSteps),
        metadata,
      });
    },

    /** Report error message */
    error: (message: string, metadata?: Record<string, unknown>) => {
      callback({
        message,
        type: 'error',
        completedSteps,
        totalSteps,
        progress: calculateProgress(completedSteps, totalSteps),
        metadata,
      });
    },

    /** Report stage transition */
    stage: (message: string, metadata?: Record<string, unknown>) => {
      callback({
        message,
        type: 'stage',
        completedSteps,
        totalSteps,
        progress: calculateProgress(completedSteps, totalSteps),
        metadata,
      });
    },

    /** Report action execution */
    action: (message: string, metadata?: Record<string, unknown>) => {
      callback({
        message,
        type: 'action',
        completedSteps,
        totalSteps,
        progress: calculateProgress(completedSteps, totalSteps),
        metadata,
      });
    },

    /** Increment completed steps */
    incrementStep: () => {
      completedSteps++;
      callback({
        message: `Step ${completedSteps}/${totalSteps} completed`,
        type: 'info',
        completedSteps,
        totalSteps,
        progress: calculateProgress(completedSteps, totalSteps),
      });
    },

    /** Set completed steps explicitly */
    setCompletedSteps: (count: number) => {
      completedSteps = count;
    },

    /** Get current progress */
    getProgress: () => ({
      completedSteps,
      totalSteps,
      percentage: calculateProgress(completedSteps, totalSteps),
    }),
  };
}

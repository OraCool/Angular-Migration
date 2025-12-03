/**
 * Type definitions for MCP Server
 */

import type { WorkflowStep, WorkflowState } from '@angular-migration/workflow-engine';

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

/**
 * Workflow step info for MCP responses
 */
export interface StepInfo {
  id: string;
  index: number;
  title: string;
  description: string;
  version?: string;
  requiresConfirmation: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Session info for MCP responses
 */
export interface SessionInfo {
  id: string;
  projectPath: string;
  currentVersion: string;
  targetVersion: string;
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  hasCheckpoint: boolean;
  createdAt: string;
  lastActivityAt: string;
}

/**
 * Migration plan summary
 */
export interface MigrationPlan {
  totalSteps: number;
  estimatedDuration: string;
  steps: Array<{
    id: string;
    title: string;
    version?: string;
    description: string;
    requiresConfirmation: boolean;
  }>;
}

/**
 * Validation result
 */
export interface ValidationInfo {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

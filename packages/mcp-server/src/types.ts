/**
 * Type definitions for MCP Server
 */

import type { WorkflowStep, WorkflowState } from '@angular-migration/workflow-engine';

/**
 * Next step recommendation
 */
export interface NextStepRecommendation {
  action: string;
  description: string;
  reasoning: string;
  optional?: Array<{
    action: string;
    description: string;
  }>;
}

/**
 * Detailed error information
 */
export interface ErrorDetails {
  stage?: string;
  step?: string;
  action?: string;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
  duration?: number;
  timestamp?: string;
  required?: string;
  current?: string;
  [key: string]: unknown;
}

/**
 * Troubleshooting guidance
 */
export interface TroubleshootingInfo {
  likelyCause: string;
  suggestedFixes: string[];
  relatedDocs: string[];
  canRetry: boolean;
  canRollback: boolean;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;

  /** Next step recommendation (required for all tools) */
  nextStep?: NextStepRecommendation;

  /** Detailed error information */
  details?: ErrorDetails;

  /** Troubleshooting guidance */
  troubleshooting?: TroubleshootingInfo;
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

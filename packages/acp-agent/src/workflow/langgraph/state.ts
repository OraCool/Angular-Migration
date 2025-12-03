/**
 * LangGraph State Schema for Angular Migration Workflow
 *
 * Defines the state structure used throughout the migration graph.
 * This state is passed between nodes and updated as the workflow progresses.
 */

import { Annotation } from '@langchain/langgraph';
import type { SessionId } from '../../types/acp.js';

/**
 * Validation result for a single validation step
 */
export interface ValidationResult {
  success: boolean;
  output: string;
  error?: string;
  timestamp: Date;
}

/**
 * Current step execution data
 */
export interface StepExecutionData {
  stepId: string;
  stepIndex: number;
  retryCount: number;
  validationResults: ValidationResult[];
  lastError?: string;
  startTime: Date;
  autoFixAttempts?: number; // Number of auto-fix attempts for current validation
}

/**
 * Auto-fix result tracking
 */
export interface AutoFixResult {
  validationName: string;
  errorBefore: string;
  fixApplied: string;
  usedLLM: boolean;
  timestamp: Date;
  success: boolean;
  errorAfter?: string;
}

/**
 * User confirmation state
 */
export interface PendingConfirmation {
  stepId: string;
  message: string;
  timestamp: Date;
}

/**
 * Migration State Schema
 *
 * This is the central state object that flows through the LangGraph.
 * Each node can read from and write to this state.
 */
export const MigrationStateAnnotation = Annotation.Root({
  // Session and project context
  sessionId: Annotation<SessionId>(),
  projectPath: Annotation<string>(),
  currentVersion: Annotation<string>(),
  targetVersion: Annotation<string>(),

  // Workflow progress tracking
  currentStepIndex: Annotation<number>({
    reducer: (_, newValue) => newValue,
    default: () => 0,
  }),
  completedSteps: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  failedSteps: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Current step execution data
  currentStepData: Annotation<StepExecutionData | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),

  // User interaction state
  pendingConfirmation: Annotation<PendingConfirmation | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
  userResponse: Annotation<string | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),

  // Backup and rollback state
  backupPath: Annotation<string | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
  rollbackRequired: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),
  rollbackCompleted: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),

  // Configuration flags
  skipTests: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),
  skipLint: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),
  autoConfirm: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),

  // Workflow control
  shouldRetry: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),
  shouldRollback: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),
  isComplete: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),

  // Error tracking
  lastError: Annotation<string | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),

  // Auto-fix tracking
  shouldAutoFix: Annotation<boolean>({
    reducer: (_, newValue) => newValue,
    default: () => false,
  }),
  autoFixHistory: Annotation<AutoFixResult[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  currentAutoFixAttempt: Annotation<number>({
    reducer: (_, newValue) => newValue,
    default: () => 0,
  }),
  maxAutoFixAttempts: Annotation<number>({
    reducer: (_, newValue) => newValue,
    default: () => 3,
  }),
  lastValidationName: Annotation<string | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),

  // Execution metadata
  startedAt: Annotation<Date>({
    reducer: (_, newValue) => newValue,
    default: () => new Date(),
  }),
  lastCheckpointAt: Annotation<Date | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
});

/**
 * Type definition for the migration state
 */
export type MigrationState = typeof MigrationStateAnnotation.State;

/**
 * Helper functions for state manipulation
 */
export class StateHelpers {
  /**
   * Create initial state from workflow context
   */
  static createInitialState(context: {
    sessionId: SessionId;
    projectPath: string;
    currentVersion: string;
    targetVersion: string;
    skipTests?: boolean;
    skipLint?: boolean;
    autoConfirm?: boolean;
  }): Partial<MigrationState> {
    return {
      sessionId: context.sessionId,
      projectPath: context.projectPath,
      currentVersion: context.currentVersion,
      targetVersion: context.targetVersion,
      skipTests: context.skipTests ?? false,
      skipLint: context.skipLint ?? false,
      autoConfirm: context.autoConfirm ?? false,
      currentStepIndex: 0,
      completedSteps: [],
      failedSteps: [],
      currentStepData: null,
      pendingConfirmation: null,
      userResponse: null,
      backupPath: null,
      rollbackRequired: false,
      rollbackCompleted: false,
      shouldRetry: false,
      shouldRollback: false,
      isComplete: false,
      lastError: null,
      shouldAutoFix: false,
      autoFixHistory: [],
      currentAutoFixAttempt: 0,
      maxAutoFixAttempts: 3,
      lastValidationName: null,
      startedAt: new Date(),
      lastCheckpointAt: null,
    };
  }

  /**
   * Update state after step completion
   */
  static markStepCompleted(
    state: MigrationState,
    stepId: string
  ): Partial<MigrationState> {
    return {
      completedSteps: [stepId],
      currentStepIndex: state.currentStepIndex + 1,
      currentStepData: null,
      shouldRetry: false,
      shouldRollback: false,
      lastError: null,
    };
  }

  /**
   * Update state after step failure
   */
  static markStepFailed(
    state: MigrationState,
    stepId: string,
    error: string
  ): Partial<MigrationState> {
    return {
      failedSteps: [stepId],
      lastError: error,
      currentStepData: state.currentStepData
        ? {
            ...state.currentStepData,
            lastError: error,
          }
        : null,
    };
  }

  /**
   * Initialize step execution data
   */
  static initializeStepData(
    stepId: string,
    stepIndex: number
  ): Partial<MigrationState> {
    return {
      currentStepData: {
        stepId,
        stepIndex,
        retryCount: 0,
        validationResults: [],
        startTime: new Date(),
      },
    };
  }

  /**
   * Increment retry count
   */
  static incrementRetryCount(state: MigrationState): Partial<MigrationState> {
    if (!state.currentStepData) {
      return {};
    }

    return {
      currentStepData: {
        ...state.currentStepData,
        retryCount: state.currentStepData.retryCount + 1,
      },
    };
  }

  /**
   * Check if workflow is complete
   */
  static isWorkflowComplete(
    state: MigrationState,
    totalSteps: number
  ): boolean {
    return state.currentStepIndex >= totalSteps;
  }

  /**
   * Get progress information
   */
  static getProgress(
    state: MigrationState,
    totalSteps: number
  ): { current: number; total: number; percentage: number } {
    const current = state.completedSteps.length;
    const percentage = Math.round((current / totalSteps) * 100);
    return { current, total: totalSteps, percentage };
  }
}

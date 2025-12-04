/**
 * Shared types for workflow engine
 */

/**
 * Session identifier (can be any string)
 */
export type SessionId = string;

/**
 * Plan entry for workflow visualization
 */
export interface PlanEntry {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Migration plan
 */
export interface Plan {
  entries: PlanEntry[];
}

/**
 * Configuration for workflow engine
 */
export interface WorkflowEngineConfig {
  checkpointDir: string;
  projectPath?: string;
  skipTests?: boolean;
  skipLint?: boolean;
  autoConfirm?: boolean;
}

/**
 * Progress update notification
 */
export interface ProgressUpdate {
  /** Progress message */
  message: string;
  /** Current progress percentage (0-100) */
  progress?: number;
  /** Current step being executed */
  currentStep?: string;
  /** Total steps */
  totalSteps?: number;
  /** Steps completed */
  completedSteps?: number;
  /** Type of progress update */
  type?: 'info' | 'success' | 'warning' | 'error' | 'stage' | 'action';
  /** Timestamp */
  timestamp?: string;
  /** MCP tool name that generated this update */
  toolName?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Progress callback for streaming updates
 */
export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * Stage execution options
 * Options that can be passed when executing a migration stage
 */
export interface StageExecutionOptions {
  /** Skip validation checks (not recommended) */
  skipValidations?: boolean;
  /** Auto-confirm all prompts (dangerous) */
  autoConfirm?: boolean;
  /** Continue executing subsequent steps even if one fails */
  continueOnError?: boolean;
  /** Progress callback for streaming updates */
  progressCallback?: ProgressCallback;
  /** Additional stage-specific options */
  [key: string]: any;
}

/**
 * Stage execution result
 * Comprehensive result from executing a complete migration stage
 */
export interface StageExecutionResult {
  /** Whether the entire stage executed successfully */
  success: boolean;
  /** Stage identifier */
  stage: string;
  /** Whether the stage requires user confirmation to proceed */
  requiresConfirmation?: boolean;
  /** Confirmation message to display to user */
  confirmationMessage?: string;
  /** ID of the step that failed (if any) */
  failedStep?: string;
  /** Results from each step in the stage */
  results: StepExecutionResult[];
  /** Error message if stage execution failed */
  error?: string;
  /** Total duration of stage execution in milliseconds */
  duration?: number;
}

/**
 * Step execution result
 * Result from executing a single workflow step within a stage
 */
export interface StepExecutionResult {
  /** Step identifier */
  stepId: string;
  /** Whether the step executed successfully */
  success: boolean;
  /** Output from the step (stdout, logs, etc.) */
  output?: string;
  /** Error message if step failed */
  error?: string;
  /** Duration of step execution in milliseconds */
  duration: number;
  /** Timestamp when step started */
  timestamp?: string;
}

/**
 * Stage progress information
 * Tracks completion progress within a migration stage
 */
export interface StageProgress {
  /** Stage identifier */
  stageId: string;
  /** Number of steps completed in this stage */
  stepsCompleted: number;
  /** Total number of steps in this stage */
  stepsTotal: number;
  /** Completion percentage (0-100) */
  percentage: number;
  /** Current status of the stage */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

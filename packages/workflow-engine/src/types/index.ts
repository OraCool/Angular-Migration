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

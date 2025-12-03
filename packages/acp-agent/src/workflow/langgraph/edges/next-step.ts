/**
 * Next Step Edge Router
 *
 * Determines the next step in the workflow
 */

import type { MigrationState } from '../state.js';
import type { WorkflowStep } from '../../engine.js';

/**
 * Get the next node to execute
 */
export function getNextNode(
  state: MigrationState,
  workflow: WorkflowStep[]
): string {
  // If workflow is complete, go to end
  if (state.isComplete) {
    return 'complete';
  }

  const stepIndex = state.currentStepIndex;

  // Check if we've completed all steps
  if (stepIndex >= workflow.length) {
    return 'complete';
  }

  // If there's a pending confirmation, handle it
  if (state.pendingConfirmation && !state.userResponse) {
    return 'waitForConfirmation';
  }

  // If there's an error and we should retry
  if (state.shouldRetry) {
    return 'retry';
  }

  // If there's an error and we should rollback
  if (state.shouldRollback) {
    return 'rollback';
  }

  // If there's a failed step that hasn't been handled
  if (state.lastError && !state.shouldRetry && !state.shouldRollback) {
    return 'rollback';
  }

  // Normal flow: execute next step
  return 'executeStep';
}

/**
 * Route after step completion
 */
export function afterStepCompletion(
  state: MigrationState,
  workflow: WorkflowStep[]
): 'checkpoint' | 'nextStep' | 'complete' {
  const stepIndex = state.currentStepIndex;

  // Check if we've completed all steps
  if (stepIndex >= workflow.length) {
    return 'complete';
  }

  // Save checkpoint after each step
  return 'checkpoint';
}

/**
 * Route after checkpoint
 */
export function afterCheckpoint(
  state: MigrationState,
  workflow: WorkflowStep[]
): 'nextStep' | 'complete' {
  const stepIndex = state.currentStepIndex;

  // Check if we've completed all steps
  if (stepIndex >= workflow.length) {
    return 'complete';
  }

  return 'nextStep';
}

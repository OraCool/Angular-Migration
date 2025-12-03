/**
 * Retry Edge Router
 *
 * Determines whether to retry, rollback, or continue
 */

import type { MigrationState } from '../state.js';
import type { WorkflowStep } from '../../engine.js';

/**
 * Route based on retry decision
 */
export function shouldRetryStep(
  state: MigrationState,
  workflow: WorkflowStep[]
): 'retry' | 'rollback' | 'continue' {
  // If explicitly set to retry
  if (state.shouldRetry) {
    return 'retry';
  }

  // If explicitly set to rollback
  if (state.shouldRollback) {
    return 'rollback';
  }

  const stepIndex = state.currentStepIndex;

  // If no current step, continue
  if (stepIndex >= workflow.length) {
    return 'continue';
  }

  const step = workflow[stepIndex];
  const currentStepData = state.currentStepData;

  // If step has no retry config, rollback on failure
  if (!step.retry) {
    return state.lastError ? 'rollback' : 'continue';
  }

  // If no step data, rollback
  if (!currentStepData) {
    return state.lastError ? 'rollback' : 'continue';
  }

  // Check if we've exceeded max attempts
  if (currentStepData.retryCount >= step.retry.maxAttempts) {
    return 'rollback';
  }

  // Check if error is retryable
  const lastError = currentStepData.lastError || state.lastError;
  if (lastError && step.retry.retryableErrors) {
    const isRetryableError = step.retry.retryableErrors.some((pattern) =>
      pattern.test(lastError)
    );

    if (!isRetryableError) {
      return 'rollback';
    }
  }

  // If there's an error and retries are available, retry
  if (lastError) {
    return 'retry';
  }

  // No error, continue
  return 'continue';
}

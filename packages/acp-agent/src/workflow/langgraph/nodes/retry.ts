/**
 * Retry Node - Handle retry logic with exponential backoff
 *
 * This node:
 * - Implements exponential backoff delays
 * - Tracks retry attempts
 * - Determines if retry should continue
 */

import type { MigrationState } from '../state.js';
import type { WorkflowStep } from '../../engine.js';

/**
 * Handle retry logic for failed steps
 */
export async function retryNode(
  state: MigrationState,
  workflow: WorkflowStep[]
): Promise<Partial<MigrationState>> {
  const stepIndex = state.currentStepIndex;

  if (stepIndex >= workflow.length) {
    return {};
  }

  const step = workflow[stepIndex];
  const currentStepData = state.currentStepData;

  if (!currentStepData) {
    return {
      shouldRetry: false,
      shouldRollback: true,
      lastError: 'No step data available for retry',
    };
  }

  // Check if step has retry configuration
  if (!step.retry) {
    console.log('❌ No retry configuration for this step');
    return {
      shouldRetry: false,
      shouldRollback: true,
    };
  }

  // Check if we've exceeded max attempts
  const retryCount = currentStepData.retryCount + 1;
  if (retryCount >= step.retry.maxAttempts) {
    console.log(`❌ Max retry attempts reached (${step.retry.maxAttempts})`);
    return {
      shouldRetry: false,
      shouldRollback: true,
      failedSteps: [step.id],
    };
  }

  // Check if error is retryable
  const lastError = currentStepData.lastError || state.lastError;
  if (lastError && step.retry.retryableErrors) {
    const isRetryableError = step.retry.retryableErrors.some((pattern) =>
      pattern.test(lastError)
    );

    if (!isRetryableError) {
      console.log('❌ Error is not retryable');
      return {
        shouldRetry: false,
        shouldRollback: true,
        failedSteps: [step.id],
      };
    }
  }

  // Calculate backoff delay
  const delay = calculateBackoffDelay(retryCount, step.retry);

  console.log(
    `🔄 Retrying step in ${delay}ms (attempt ${retryCount + 1}/${step.retry.maxAttempts})`
  );

  // Wait for backoff delay
  await sleep(delay);

  // Increment retry count and allow retry
  return {
    currentStepData: {
      ...currentStepData,
      retryCount,
    },
    shouldRetry: true,
    shouldRollback: false,
  };
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
  attempt: number,
  retryConfig: NonNullable<WorkflowStep['retry']>
): number {
  const baseDelay = retryConfig.delayMs || 1000;
  const multiplier = retryConfig.backoffMultiplier || 2;
  const maxDelay = retryConfig.maxDelayMs || 30000;

  const delay = baseDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

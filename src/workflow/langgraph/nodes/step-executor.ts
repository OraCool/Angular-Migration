/**
 * Step Executor Node - Execute migration steps
 *
 * This node:
 * - Executes workflow step actions
 * - Runs validations
 * - Handles retry logic
 * - Updates step execution data
 */

import type { MigrationState, StepExecutionData } from '../state.js';
import { WorkflowExecutor } from '../../executor.js';
import { WorkflowEngine, type WorkflowStep, type WorkflowContext } from '../../engine.js';
import type { SessionId } from '../../../types/acp.js';

/**
 * Execute a single migration step
 */
export async function stepExecutorNode(
  state: MigrationState,
  workflow: WorkflowStep[]
): Promise<Partial<MigrationState>> {
  const stepIndex = state.currentStepIndex;

  // Check if we've completed all steps
  if (stepIndex >= workflow.length) {
    return {
      isComplete: true,
    };
  }

  const step = workflow[stepIndex];
  console.log(`\n⚙️  Executing step: ${step.title}`);

  // Initialize step execution data
  const stepData: StepExecutionData = {
    stepId: step.id,
    stepIndex,
    retryCount: state.currentStepData?.retryCount || 0,
    validationResults: [],
    startTime: new Date(),
  };

  // Create workflow context
  const context: WorkflowContext = {
    sessionId: state.sessionId as SessionId,
    projectPath: state.projectPath,
    currentVersion: state.currentVersion,
    targetVersion: state.targetVersion,
    skipTests: state.skipTests,
    skipLint: state.skipLint,
    autoConfirm: state.autoConfirm,
  };

  // Create a temporary engine instance for execution
  const engine = new WorkflowEngine(workflow, context);

  // Restore state to current position via skipToStep
  engine.skipToStep(stepIndex);

  const executor = new WorkflowExecutor(engine, context);

  try {
    // Execute all actions for this step
    for (const action of step.actions) {
      const result = step.retry
        ? await executor.executeActionWithRetry(action, step.id, step.retry)
        : await executor.executeAction(action);

      if (!result.success) {
        return {
          currentStepData: {
            ...stepData,
            lastError: result.error || 'Action failed',
          },
          lastError: result.error || 'Action failed',
          shouldRetry: isRetryable(step, stepData.retryCount),
        };
      }
    }

    // Execute all validations
    for (const validation of step.validations) {
      const result = step.retry
        ? await executor.executeValidationWithRetry(validation, step.id, step.retry)
        : await executor.executeValidation(validation);

      stepData.validationResults.push(result);

      if (!result.success) {
        // Check if auto-fix should be attempted
        const shouldAutoFix = validation.autoFixOnError === true;

        if (shouldAutoFix) {
          process.stderr.write(
            `[StepExecutor] Validation failed with autoFixOnError enabled: ${validation.name}\n`
          );
        }

        return {
          currentStepData: {
            ...stepData,
            lastError: result.error || 'Validation failed',
          },
          lastError: result.error || 'Validation failed',
          lastValidationName: validation.name,
          shouldAutoFix,
          shouldRetry: !shouldAutoFix && isRetryable(step, stepData.retryCount),
          currentAutoFixAttempt: shouldAutoFix ? 0 : state.currentAutoFixAttempt, // Reset attempt counter for new validation
        };
      }
    }

    console.log(`✅ Step completed: ${step.title}`);

    // Step completed successfully
    return {
      completedSteps: [step.id],
      currentStepIndex: stepIndex + 1,
      currentStepData: null,
      lastError: null,
      shouldRetry: false,
      shouldRollback: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      currentStepData: {
        ...stepData,
        lastError: errorMessage,
      },
      lastError: errorMessage,
      shouldRetry: isRetryable(step, stepData.retryCount),
    };
  }
}

/**
 * Determine if step should be retried
 */
function isRetryable(step: WorkflowStep, currentRetryCount: number): boolean {
  if (!step.retry) {
    return false;
  }

  return currentRetryCount < step.retry.maxAttempts;
}

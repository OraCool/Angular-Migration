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
import { WorkflowEngine, type WorkflowStep, type WorkflowContext, type WorkflowAction } from '../../engine.js';
import type { SessionId } from '../../../types/acp.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Get required Node version for a given Angular version
 */
function getRequiredNodeVersion(angularVersion: string): string {
  const version = parseInt(angularVersion, 10);

  // Map Angular versions to Node major versions
  if (version >= 19) return '22';
  if (version >= 17) return '20';
  if (version >= 16) return '18';
  if (version >= 14) return '18';

  return '18'; // Default to Node 18
}

/**
 * Wrap a command with the Node version management script
 * This ensures the command runs with the correct Node.js version
 */
function wrapCommandWithNodeVersion(
  command: string,
  requiredNodeVersion: string,
  projectPath: string
): string {
  // Use import.meta.url to get current file location (ES module)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Script is copied to dist/scripts during build
  const scriptPath = join(__dirname, '../../../scripts/run-migration-step.sh');

  // Replace relative script paths with absolute paths from agent directory
  // This handles commands like "bash ./scripts/update-all-packages.sh 15"
  const agentScriptsDir = join(__dirname, '../../../scripts');

  const processedCommand = command.replace(
    /bash\s+\.\/scripts\/([^\s]+)/g,
    (_match, scriptName) => `bash "${join(agentScriptsDir, scriptName)}"`
  );

  // Escape any single quotes in the command
  const escapedCommand = processedCommand.replace(/'/g, "'\\''");

  const finalWrapped = `bash "${scriptPath}" "${requiredNodeVersion}" "${projectPath}" '${escapedCommand}'`;

  return finalWrapped;
}

/**
 * Wrap an action's command with Node version management
 */
function wrapAction(action: WorkflowAction, step: WorkflowStep, projectPath: string, currentVersion: string): WorkflowAction {
  const wrappedAction = { ...action };

  if (action.command) {
    const requiredNodeVersion = step.version
      ? getRequiredNodeVersion(step.version)
      : getRequiredNodeVersion(currentVersion);

    wrappedAction.command = wrapCommandWithNodeVersion(
      action.command,
      requiredNodeVersion,
      projectPath
    );
  }

  return wrappedAction;
}

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
      // Wrap the action command with Node version management
      const wrappedAction = wrapAction(action, step, state.projectPath, state.currentVersion);

      const result = step.retry
        ? await executor.executeActionWithRetry(wrappedAction, step.id, step.retry)
        : await executor.executeAction(wrappedAction);

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
      // Wrap validation command with Node version management if it has a command
      const wrappedValidation = validation.command
        ? { ...validation, command: wrapCommandWithNodeVersion(validation.command, step.version ? getRequiredNodeVersion(step.version) : getRequiredNodeVersion(state.currentVersion), state.projectPath) }
        : validation;

      const result = step.retry
        ? await executor.executeValidationWithRetry(wrappedValidation, step.id, step.retry)
        : await executor.executeValidation(wrappedValidation);

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

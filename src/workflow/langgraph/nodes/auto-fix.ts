/**
 * Auto-Fix Node - Intelligent error fixing with pattern matching and LLM
 *
 * This node implements the auto-fix loop:
 * 1. Detect error type
 * 2. Try pattern-based fix first (fast, $0)
 * 3. Fallback to LLM fix (intelligent, OpenAI API)
 * 4. Apply fix commands
 * 5. Track fix history
 * 6. Signal to re-run validation
 */

import type { MigrationState, AutoFixResult } from '../state.js';
import type { WorkflowStep } from '../../engine.js';
import { LLMFixerService } from '../../../services/llm-fixer.js';
import { config } from '../../../config.js';
import { spawn } from 'child_process';

/**
 * Execute a command and return result
 */
async function executeCommand(
  command: string,
  cwd: string
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, [], {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: code !== 0 ? stderr : undefined,
      });
    });
  });
}

/**
 * Auto-fix node
 *
 * Attempts to automatically fix validation errors using:
 * 1. Pattern-based fixes (common known issues)
 * 2. LLM-based fixes (intelligent analysis)
 */
export async function autoFixNode(
  state: MigrationState,
  workflow: WorkflowStep[]
): Promise<Partial<MigrationState>> {
  const stepIndex = state.currentStepIndex;
  const step = workflow[stepIndex];

  if (!step) {
    return {
      shouldAutoFix: false,
      lastError: 'Cannot auto-fix: step not found',
    };
  }

  // Check if we've exceeded max auto-fix attempts
  if (state.currentAutoFixAttempt >= state.maxAutoFixAttempts) {
    process.stderr.write(
      `[AutoFix] Max auto-fix attempts (${state.maxAutoFixAttempts}) reached\n`
    );
    return {
      shouldAutoFix: false,
      shouldRollback: true,
      lastError: `Auto-fix failed after ${state.maxAutoFixAttempts} attempts`,
    };
  }

  // Get the validation that failed
  const lastValidation = state.lastValidationName;
  const lastError = state.lastError;

  if (!lastError) {
    process.stderr.write('[AutoFix] No error to fix\n');
    return {
      shouldAutoFix: false,
    };
  }

  process.stderr.write(`[AutoFix] Attempting fix for: ${lastValidation}\n`);
  process.stderr.write(`[AutoFix] Attempt ${state.currentAutoFixAttempt + 1}/${state.maxAutoFixAttempts}\n`);
  process.stderr.write(`[AutoFix] Error: ${lastError.substring(0, 200)}...\n`);

  // Initialize LLM fixer service
  const llmFixer = new LLMFixerService(config.workshopRoot, true);

  try {
    // Try to fix the error
    const fixResult = await llmFixer.fixError({
      error: lastError,
      errorType: lastValidation || 'Unknown',
      workshopRoot: config.workshopRoot,
      angularVersion: state.currentVersion,
    });

    if (!fixResult.success) {
      process.stderr.write(`[AutoFix] No fix available: ${fixResult.explanation}\n`);

      return {
        shouldAutoFix: false,
        shouldRollback: true,
        currentAutoFixAttempt: state.currentAutoFixAttempt + 1,
        lastError: `Auto-fix failed: ${fixResult.explanation}`,
      };
    }

    // Apply fix commands
    if (fixResult.commands && fixResult.commands.length > 0) {
      process.stderr.write(`[AutoFix] Applying ${fixResult.usedLLM ? 'LLM' : 'pattern-based'} fix...\n`);
      process.stderr.write(`[AutoFix] Fix: ${fixResult.explanation}\n`);

      let allCommandsSucceeded = true;
      let commandOutput = '';

      for (const cmd of fixResult.commands) {
        process.stderr.write(`[AutoFix] Running: ${cmd}\n`);

        const result = await executeCommand(cmd, state.projectPath);
        commandOutput += `${cmd}\n${result.output}\n`;

        if (!result.success) {
          process.stderr.write(`[AutoFix] Command failed: ${cmd}\n`);
          allCommandsSucceeded = false;
          break;
        }
      }

      // Record fix in history
      const autoFixHistoryEntry: AutoFixResult = {
        validationName: lastValidation || 'unknown',
        errorBefore: lastError,
        fixApplied: fixResult.explanation || 'Unknown fix',
        usedLLM: fixResult.usedLLM,
        timestamp: new Date(),
        success: allCommandsSucceeded,
      };

      if (allCommandsSucceeded) {
        process.stderr.write(`[AutoFix] ✅ Fix applied successfully\n`);

        // Signal to re-run validation by clearing error and setting shouldAutoFix to false
        // The edge function will route back to executeStep to retry the validation
        return {
          shouldAutoFix: false, // Fix applied, now re-run validation
          shouldRetry: true, // Trigger retry of the step
          currentAutoFixAttempt: state.currentAutoFixAttempt + 1,
          autoFixHistory: [autoFixHistoryEntry],
          lastError: null, // Clear error so validation can run again
        };
      } else {
        process.stderr.write(`[AutoFix] ❌ Fix commands failed\n`);

        return {
          shouldAutoFix: false,
          shouldRollback: true,
          currentAutoFixAttempt: state.currentAutoFixAttempt + 1,
          autoFixHistory: [{ ...autoFixHistoryEntry, success: false }],
          lastError: `Auto-fix commands failed: ${commandOutput}`,
        };
      }
    }

    // No commands to execute
    process.stderr.write('[AutoFix] Fix succeeded but no commands to execute\n');
    return {
      shouldAutoFix: false,
      shouldRetry: true,
      currentAutoFixAttempt: state.currentAutoFixAttempt + 1,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[AutoFix] Exception: ${errorMessage}\n`);

    return {
      shouldAutoFix: false,
      shouldRollback: true,
      currentAutoFixAttempt: state.currentAutoFixAttempt + 1,
      lastError: `Auto-fix error: ${errorMessage}`,
    };
  }
}

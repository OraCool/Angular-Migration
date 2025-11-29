/**
 * Auto-Fix Edge Function
 *
 * Determines whether to route to the auto-fix node after a validation failure.
 * This creates the intelligent fix-retry loop.
 */

import type { MigrationState } from '../state.js';
import type { WorkflowStep } from '../../engine.js';

/**
 * Should auto-fix edge decision
 *
 * After executeStep fails, this determines the next node:
 * - 'autoFix' if validation failed with autoFixOnError enabled
 * - 'retry' if should retry without auto-fix
 * - 'rollback' if should rollback
 * - 'checkpoint' if successful
 */
export function shouldAutoFixStep(
  state: MigrationState,
  workflow: WorkflowStep[]
): 'autoFix' | 'retry' | 'rollback' | 'checkpoint' {
  // If no error, proceed to checkpoint
  if (!state.lastError) {
    return 'checkpoint';
  }

  // If auto-fix should be attempted
  if (state.shouldAutoFix) {
    // Check if we haven't exceeded max attempts
    if (state.currentAutoFixAttempt < state.maxAutoFixAttempts) {
      return 'autoFix';
    }

    // Max auto-fix attempts reached, fall back to rollback
    process.stderr.write(
      `[Edge:AutoFix] Max auto-fix attempts reached, routing to rollback\n`
    );
    return 'rollback';
  }

  // Check for retry
  if (state.shouldRetry) {
    return 'retry';
  }

  // Check for rollback
  if (state.shouldRollback) {
    return 'rollback';
  }

  // No error and no special routing needed
  return 'checkpoint';
}

/**
 * After auto-fix node, determine next step
 *
 * Routes:
 * - 'executeStep' if fix was applied (retry validation)
 * - 'rollback' if fix failed
 */
export function afterAutoFix(state: MigrationState): 'executeStep' | 'rollback' {
  // If fix was applied and we should retry
  if (state.shouldRetry && !state.lastError) {
    process.stderr.write('[Edge:AfterAutoFix] Fix applied, retrying step\n');
    return 'executeStep';
  }

  // Fix failed or max attempts reached
  process.stderr.write('[Edge:AfterAutoFix] Fix failed, routing to rollback\n');
  return 'rollback';
}

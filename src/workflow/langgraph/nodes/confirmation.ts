/**
 * Confirmation Node - Handle user confirmations
 *
 * This node:
 * - Prompts user for step confirmation
 * - Waits for user response
 * - Routes based on confirmation
 */

import type { MigrationState, PendingConfirmation } from '../state.js';
import type { WorkflowStep } from '../../engine.js';

/**
 * Request confirmation from user before executing a step
 */
export async function confirmationNode(
  state: MigrationState,
  workflow: WorkflowStep[]
): Promise<Partial<MigrationState>> {
  // If auto-confirm is enabled, skip confirmation
  if (state.autoConfirm) {
    return {
      userResponse: 'yes',
      pendingConfirmation: null,
    };
  }

  const stepIndex = state.currentStepIndex;

  // Check if we've completed all steps
  if (stepIndex >= workflow.length) {
    return {};
  }

  const step = workflow[stepIndex];

  // Create pending confirmation
  const confirmation: PendingConfirmation = {
    stepId: step.id,
    message: `Ready to execute: ${step.title}${step.version ? ` (Angular v${step.version})` : ''}\n\nThis step will:\n${step.actions.map((a) => `  - ${a.description}`).join('\n')}\n\nProceed?`,
    timestamp: new Date(),
  };

  // Set pending confirmation state
  // Note: In actual implementation, this would trigger a message to the user
  // and wait for their response via the interrupt mechanism
  return {
    pendingConfirmation: confirmation,
    userResponse: null,
  };
}

/**
 * Process user response to confirmation
 */
export async function processConfirmationResponse(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  const response = state.userResponse?.toLowerCase().trim();

  // Clear confirmation state
  const update: Partial<MigrationState> = {
    pendingConfirmation: null,
  };

  // Check response
  if (response === 'yes' || response === 'y') {
    // User confirmed, proceed with step
    return update;
  }

  if (response === 'no' || response === 'n') {
    // User declined, skip this step
    const stepIndex = state.currentStepIndex;
    return {
      ...update,
      currentStepIndex: stepIndex + 1,
      lastError: 'Step skipped by user',
    };
  }

  if (response === 'abort' || response === 'cancel') {
    // User wants to abort migration
    return {
      ...update,
      isComplete: true,
      lastError: 'Migration aborted by user',
    };
  }

  // Invalid response, ask again
  return {
    pendingConfirmation: state.pendingConfirmation,
    userResponse: null,
    lastError: 'Invalid response. Please answer: yes/no/abort',
  };
}

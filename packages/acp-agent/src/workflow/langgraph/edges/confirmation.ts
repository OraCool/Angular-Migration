/**
 * Confirmation Edge Router
 *
 * Determines the next node based on confirmation state
 */

import type { MigrationState } from '../state.js';

/**
 * Route based on confirmation requirement
 */
export function needsConfirmation(state: MigrationState): 'confirm' | 'execute' {
  // If auto-confirm is enabled, skip confirmation
  if (state.autoConfirm) {
    return 'execute';
  }

  // If there's a pending confirmation, go to confirmation node
  if (state.pendingConfirmation) {
    return 'confirm';
  }

  // If user has already responded, proceed to execution
  if (state.userResponse) {
    return 'execute';
  }

  // Default: need confirmation
  return 'confirm';
}

/**
 * Route based on confirmation response
 */
export function confirmationResponse(
  state: MigrationState
): 'execute' | 'skip' | 'abort' {
  const response = state.userResponse?.toLowerCase().trim();

  if (response === 'yes' || response === 'y') {
    return 'execute';
  }

  if (response === 'no' || response === 'n') {
    return 'skip';
  }

  if (response === 'abort' || response === 'cancel') {
    return 'abort';
  }

  // Default: need confirmation again (invalid response)
  return 'execute';
}

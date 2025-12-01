/**
 * Checkpoint Node - Persist workflow state
 *
 * This node:
 * - Persists current state to disk
 * - Enables resume capability
 * - Updates checkpoint timestamp
 */

import type { MigrationState } from '../state.js';
import { StateManager } from '../../state-manager.js';
import type { SessionId } from '../../../types/acp.js';

/**
 * Save workflow checkpoint
 */
export async function checkpointNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log('💾 Saving checkpoint...');

  try {
    const stateManager = new StateManager(state.projectPath);

    // Convert state to checkpoint format
    // Note: We need to convert Map structures to serializable format
    const checkpointState = {
      currentStepIndex: state.currentStepIndex,
      currentActionIndex: 0, // Default to 0 for langgraph nodes
      completedSteps: state.completedSteps,
      completedActions: new Map(), // Empty for now, would be populated from tracking
      failedSteps: state.failedSteps,
      backupPath: state.backupPath || undefined,
      pendingConfirmation: state.pendingConfirmation || undefined,
      lastValidationResults: new Map(), // Empty for now, would be populated from currentStepData
      retryAttempts: new Map(), // Empty for now, would be populated from tracking
    };

    // Save checkpoint
    await stateManager.saveCheckpoint(
      state.sessionId as SessionId,
      checkpointState,
      {
        sessionId: state.sessionId as SessionId,
        projectPath: state.projectPath,
        currentVersion: state.currentVersion,
        targetVersion: state.targetVersion,
        skipTests: state.skipTests,
        skipLint: state.skipLint,
        autoConfirm: state.autoConfirm,
      }
    );

    console.log('✅ Checkpoint saved successfully');

    return {
      lastCheckpointAt: new Date(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to save checkpoint:', errorMessage);

    // Don't fail workflow on checkpoint errors, just log
    return {
      lastError: `Checkpoint save failed: ${errorMessage}`,
    };
  }
}

/**
 * Load workflow checkpoint for resume
 */
export async function loadCheckpointNode(
  projectPath: string,
  sessionId: SessionId
): Promise<Partial<MigrationState> | null> {
  console.log('📂 Loading checkpoint...');

  try {
    const stateManager = new StateManager(projectPath);
    const checkpoint = await stateManager.loadCheckpoint(sessionId);

    if (!checkpoint) {
      console.log('⚠️  No checkpoint found');
      return null;
    }

    console.log('✅ Checkpoint loaded successfully');

    // Convert checkpoint to state format
    return {
      sessionId,
      projectPath: checkpoint.context.projectPath,
      currentVersion: checkpoint.context.currentVersion,
      targetVersion: checkpoint.context.targetVersion,
      skipTests: checkpoint.context.skipTests,
      skipLint: checkpoint.context.skipLint,
      autoConfirm: checkpoint.context.autoConfirm,
      currentStepIndex: checkpoint.state.currentStepIndex,
      completedSteps: checkpoint.state.completedSteps,
      failedSteps: checkpoint.state.failedSteps,
      backupPath: checkpoint.state.backupPath || null,
      pendingConfirmation: checkpoint.state.pendingConfirmation
        ? {
            ...checkpoint.state.pendingConfirmation,
            timestamp: new Date(),
          }
        : null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to load checkpoint:', errorMessage);
    return null;
  }
}

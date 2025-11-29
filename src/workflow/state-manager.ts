/**
 * State Manager for Angular Migration Workflow
 * Handles checkpoint serialization, persistence, and recovery
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { config } from '../config.js';
import type {
  WorkflowState,
  WorkflowContext,
  ValidationResult,
} from './engine.js';
import type { SessionId } from '../types/acp.js';

/**
 * Checkpoint data structure for persistence
 * Version 1 schema
 */
export interface CheckpointData {
  version: number; // Schema version for future compatibility
  timestamp: string; // ISO string
  sessionId: SessionId;
  state: {
    currentStepIndex: number;
    completedSteps: string[];
    failedSteps: string[];
    backupPath?: string;
    pendingConfirmation?: {
      stepId: string;
      message: string;
    };
    // Map serialized as Record for JSON compatibility
    lastValidationResults: Record<
      string,
      {
        success: boolean;
        output: string;
        error?: string;
        timestamp: string; // Date serialized as ISO string
      }
    >;
  };
  context: {
    sessionId: SessionId;
    projectPath: string;
    currentVersion: string;
    targetVersion: string;
    skipTests?: boolean;
    skipLint?: boolean;
    autoConfirm?: boolean;
  };
}

/**
 * Checkpoint metadata for listing
 */
export interface CheckpointMetadata {
  sessionId: SessionId;
  timestamp: Date;
  currentStep: number;
  totalSteps: number;
  projectPath: string;
  angularVersion: string;
}

/**
 * State Manager - handles workflow state persistence and recovery
 */
export class StateManager {
  private readonly checkpointDir: string;
  private readonly SCHEMA_VERSION = 1;

  constructor(checkpointDir?: string) {
    // Use config default or allow override
    this.checkpointDir = checkpointDir || config.checkpointDir;
  }

  /**
   * Save checkpoint with atomic write (temp + rename to prevent corruption)
   */
  async saveCheckpoint(
    sessionId: SessionId,
    state: WorkflowState,
    context: WorkflowContext
  ): Promise<void> {
    try {
      // Ensure checkpoint directory exists
      await fs.mkdir(this.checkpointDir, { recursive: true });

      // Serialize Map to Record for JSON compatibility
      const serializedValidations: CheckpointData['state']['lastValidationResults'] = {};
      state.lastValidationResults.forEach((result, key) => {
        serializedValidations[key] = {
          success: result.success,
          output: result.output,
          error: result.error,
          timestamp: result.timestamp.toISOString(),
        };
      });

      // Build checkpoint data
      const checkpoint: CheckpointData = {
        version: this.SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
        sessionId,
        state: {
          currentStepIndex: state.currentStepIndex,
          completedSteps: [...state.completedSteps],
          failedSteps: [...state.failedSteps],
          backupPath: state.backupPath,
          pendingConfirmation: state.pendingConfirmation
            ? { ...state.pendingConfirmation }
            : undefined,
          lastValidationResults: serializedValidations,
        },
        context: {
          sessionId: context.sessionId,
          projectPath: context.projectPath,
          currentVersion: context.currentVersion,
          targetVersion: context.targetVersion,
          skipTests: context.skipTests,
          skipLint: context.skipLint,
          autoConfirm: context.autoConfirm,
        },
      };

      // Atomic write: write to temp file, then rename
      const finalPath = this.getCheckpointPath(sessionId);
      const tempPath = `${finalPath}.tmp`;

      await fs.writeFile(tempPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
      await fs.rename(tempPath, finalPath);

      process.stderr.write(
        `[StateManager] ✅ Checkpoint saved: ${sessionId} (step ${state.currentStepIndex})\n`
      );
    } catch (error) {
      process.stderr.write(
        `[StateManager] ❌ Failed to save checkpoint: ${error}\n`
      );
      throw new Error(`Failed to save checkpoint: ${error}`);
    }
  }

  /**
   * Load checkpoint from disk and deserialize
   */
  async loadCheckpoint(sessionId: SessionId): Promise<CheckpointData | null> {
    try {
      const checkpointPath = this.getCheckpointPath(sessionId);

      // Check if checkpoint exists
      try {
        await fs.access(checkpointPath);
      } catch {
        return null; // Checkpoint doesn't exist
      }

      // Read and parse checkpoint
      const content = await fs.readFile(checkpointPath, 'utf-8');
      const checkpoint: CheckpointData = JSON.parse(content);

      // Validate schema version
      if (checkpoint.version !== this.SCHEMA_VERSION) {
        process.stderr.write(
          `[StateManager] ⚠️ Checkpoint schema mismatch: expected v${this.SCHEMA_VERSION}, got v${checkpoint.version}\n`
        );
        // Could implement migration logic here in future
        throw new Error(
          `Checkpoint schema version mismatch: expected ${this.SCHEMA_VERSION}, got ${checkpoint.version}`
        );
      }

      process.stderr.write(
        `[StateManager] ✅ Checkpoint loaded: ${sessionId} (step ${checkpoint.state.currentStepIndex})\n`
      );

      return checkpoint;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      process.stderr.write(
        `[StateManager] ❌ Failed to load checkpoint: ${error}\n`
      );
      throw new Error(`Failed to load checkpoint: ${error}`);
    }
  }

  /**
   * List all available checkpoints
   */
  async listCheckpoints(): Promise<CheckpointMetadata[]> {
    try {
      // Ensure checkpoint directory exists
      await fs.mkdir(this.checkpointDir, { recursive: true });

      const files = await fs.readdir(this.checkpointDir);
      const checkpoints: CheckpointMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.json') && !file.endsWith('.tmp')) {
          try {
            const content = await fs.readFile(
              path.join(this.checkpointDir, file),
              'utf-8'
            );
            const checkpoint: CheckpointData = JSON.parse(content);

            checkpoints.push({
              sessionId: checkpoint.sessionId,
              timestamp: new Date(checkpoint.timestamp),
              currentStep: checkpoint.state.currentStepIndex,
              totalSteps: checkpoint.state.completedSteps.length,
              projectPath: checkpoint.context.projectPath,
              angularVersion: checkpoint.context.currentVersion,
            });
          } catch (error) {
            // Skip corrupted checkpoints
            process.stderr.write(
              `[StateManager] ⚠️ Skipping corrupted checkpoint: ${file}\n`
            );
          }
        }
      }

      // Sort by timestamp (newest first)
      checkpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return checkpoints;
    } catch (error) {
      process.stderr.write(
        `[StateManager] ❌ Failed to list checkpoints: ${error}\n`
      );
      return [];
    }
  }

  /**
   * Delete checkpoint file
   */
  async deleteCheckpoint(sessionId: SessionId): Promise<void> {
    try {
      const checkpointPath = this.getCheckpointPath(sessionId);
      await fs.unlink(checkpointPath);
      process.stderr.write(
        `[StateManager] ✅ Checkpoint deleted: ${sessionId}\n`
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - silent success
        return;
      }
      process.stderr.write(
        `[StateManager] ❌ Failed to delete checkpoint: ${error}\n`
      );
      throw new Error(`Failed to delete checkpoint: ${error}`);
    }
  }

  /**
   * Check if checkpoint exists for a session
   */
  async hasCheckpoint(sessionId: SessionId): Promise<boolean> {
    try {
      const checkpointPath = this.getCheckpointPath(sessionId);
      await fs.access(checkpointPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get full path to checkpoint file
   */
  private getCheckpointPath(sessionId: SessionId): string {
    return path.join(this.checkpointDir, `${sessionId}.json`);
  }

  /**
   * Deserialize checkpoint data back to WorkflowState
   * Helper method for WorkflowEngine to reconstruct state from checkpoint
   */
  static deserializeState(checkpointData: CheckpointData): {
    state: WorkflowState;
    context: WorkflowContext;
  } {
    // Reconstruct Map from Record
    const validationResults = new Map<string, ValidationResult>();
    Object.entries(checkpointData.state.lastValidationResults).forEach(
      ([key, val]) => {
        validationResults.set(key, {
          success: val.success,
          output: val.output,
          error: val.error,
          timestamp: new Date(val.timestamp),
        });
      }
    );

    const state: WorkflowState = {
      currentStepIndex: checkpointData.state.currentStepIndex,
      completedSteps: [...checkpointData.state.completedSteps],
      failedSteps: [...checkpointData.state.failedSteps],
      backupPath: checkpointData.state.backupPath,
      pendingConfirmation: checkpointData.state.pendingConfirmation,
      lastValidationResults: validationResults,
    };

    const context: WorkflowContext = {
      sessionId: checkpointData.context.sessionId,
      projectPath: checkpointData.context.projectPath,
      currentVersion: checkpointData.context.currentVersion,
      targetVersion: checkpointData.context.targetVersion,
      skipTests: checkpointData.context.skipTests,
      skipLint: checkpointData.context.skipLint,
      autoConfirm: checkpointData.context.autoConfirm,
    };

    return { state, context };
  }
}

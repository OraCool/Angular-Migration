/**
 * Rollback Node - Execute rollback actions
 *
 * This node:
 * - Executes rollback actions for failed steps
 * - Restores from backup if needed
 * - Cleans up failed state
 */

import type { MigrationState } from '../state.js';
import { WorkflowExecutor } from '../../executor.js';
import { WorkflowEngine, type WorkflowStep, type WorkflowContext } from '@angular-migration/workflow-engine';
import type { SessionId } from '../../../types/acp.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Execute rollback for a failed step
 */
export async function rollbackNode(
  state: MigrationState,
  workflow: WorkflowStep[]
): Promise<Partial<MigrationState>> {
  const stepIndex = state.currentStepIndex;

  if (stepIndex >= workflow.length) {
    return {};
  }

  const step = workflow[stepIndex];
  console.log(`\n🔙 Rolling back step: ${step.title}`);

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

  // Create a temporary engine instance for rollback execution
  const engine = new WorkflowEngine(workflow, context);

  // Restore state to current position via skipToStep
  engine.skipToStep(stepIndex);

  const executor = new WorkflowExecutor(engine, context);

  try {
    // Execute rollback actions if defined
    if (step.rollbackActions && step.rollbackActions.length > 0) {
      const result = await executor.executeRollback(step.id);

      if (!result.success) {
        console.error('❌ Rollback failed:', result.output);

        return {
          rollbackRequired: false,
          rollbackCompleted: false,
          lastError: `Rollback failed: ${result.output}`,
        };
      }

      console.log('✅ Rollback completed successfully');
    } else {
      console.log('⚠️  No rollback actions defined for this step');
    }

    // If backup exists and we need full restore
    if (state.backupPath && state.rollbackRequired) {
      console.log('📦 Restoring from backup...');

      const success = await restoreFromBackup(
        state.projectPath,
        state.backupPath
      );

      if (!success) {
        return {
          rollbackRequired: false,
          rollbackCompleted: false,
          lastError: 'Failed to restore from backup',
        };
      }

      console.log('✅ Restored from backup successfully');
    }

    // Mark step as failed and clear retry/rollback flags
    return {
      failedSteps: [step.id],
      rollbackRequired: false,
      rollbackCompleted: true,
      shouldRetry: false,
      shouldRollback: false,
      lastError: `Step failed and rolled back: ${step.title}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      rollbackRequired: false,
      rollbackCompleted: false,
      lastError: `Rollback error: ${errorMessage}`,
    };
  }
}

/**
 * Restore project from backup
 */
async function restoreFromBackup(
  projectPath: string,
  backupPath: string
): Promise<boolean> {
  try {
    // Validate backup exists
    if (!fs.existsSync(backupPath)) {
      console.error(`Backup not found: ${backupPath}`);
      return false;
    }

    // List of critical files/folders to restore
    const criticalPaths = [
      'package.json',
      'package-lock.json',
      'angular.json',
      'tsconfig.json',
      'src',
      'node_modules',
    ];

    for (const relativePath of criticalPaths) {
      const sourcePath = path.join(backupPath, relativePath);
      const targetPath = path.join(projectPath, relativePath);

      if (!fs.existsSync(sourcePath)) {
        continue;
      }

      // Remove existing file/folder
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }

      // Copy from backup
      if (fs.statSync(sourcePath).isDirectory()) {
        copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }

    return true;
  } catch (error) {
    console.error('Error restoring from backup:', error);
    return false;
  }
}

/**
 * Recursively copy directory
 */
function copyDirectory(source: string, target: string): void {
  fs.mkdirSync(target, { recursive: true });

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

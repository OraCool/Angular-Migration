#!/usr/bin/env node

/**
 * Integration test for State Persistence
 * Tests checkpoint save, load, resume functionality
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  StateManager,
  WorkflowEngine,
  type WorkflowContext,
  type WorkflowState,
} from '@angular-migration/workflow-engine';

// Test configuration
const TEST_CHECKPOINT_DIR = path.join(os.tmpdir(), 'angular-migration-test-checkpoints');
const TEST_SESSION_ID = 'test-session-' + Date.now();

async function cleanup() {
  try {
    await fs.rm(TEST_CHECKPOINT_DIR, { recursive: true, force: true });
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log('⚠️  Cleanup skipped (directory may not exist)');
  }
}

async function testCheckpointSaveLoad() {
  console.log('\n=== Test 1: Checkpoint Save & Load ===');

  const stateManager = new StateManager(TEST_CHECKPOINT_DIR);

  // Create test state
  const testContext: WorkflowContext = {
    sessionId: TEST_SESSION_ID,
    projectPath: '/test/project',
    currentVersion: '14',
    targetVersion: '20',
    skipTests: false,
    skipLint: false,
    autoConfirm: false,
  };

  const testState: WorkflowState = {
    currentStepIndex: 3,
    currentActionIndex: 0,
    completedActions: new Map(),
    completedSteps: ['backup', 'pre-check', 'update-deps'],
    failedSteps: [],
    backupPath: '/test/backup',
    lastValidationResults: new Map([
      ['build', {
        success: true,
        output: 'Build successful',
        timestamp: new Date(),
      }],
    ]),
    retryAttempts: new Map(),
  };

  // Save checkpoint
  console.log('📝 Saving checkpoint...');
  await stateManager.saveCheckpoint(TEST_SESSION_ID, testState, testContext);
  console.log('✅ Checkpoint saved');

  // Load checkpoint
  console.log('📖 Loading checkpoint...');
  const loaded = await stateManager.loadCheckpoint(TEST_SESSION_ID);

  if (!loaded) {
    throw new Error('Failed to load checkpoint');
  }

  // Verify data integrity
  console.log('🔍 Verifying checkpoint data...');

  if (loaded.sessionId !== TEST_SESSION_ID) {
    throw new Error(`Session ID mismatch: expected ${TEST_SESSION_ID}, got ${loaded.sessionId}`);
  }

  if (loaded.state.currentStepIndex !== 3) {
    throw new Error(`Step index mismatch: expected 3, got ${loaded.state.currentStepIndex}`);
  }

  if (loaded.state.completedSteps.length !== 3) {
    throw new Error(`Completed steps mismatch: expected 3, got ${loaded.state.completedSteps.length}`);
  }

  if (loaded.state.backupPath !== '/test/backup') {
    throw new Error(`Backup path mismatch: expected /test/backup, got ${loaded.state.backupPath}`);
  }

  if (loaded.context.currentVersion !== '14') {
    throw new Error(`Version mismatch: expected 14, got ${loaded.context.currentVersion}`);
  }

  console.log('✅ All data verified correctly');
  console.log('✅ Test 1 PASSED');
}

async function testCheckpointList() {
  console.log('\n=== Test 2: Checkpoint Listing ===');

  const stateManager = new StateManager(TEST_CHECKPOINT_DIR);

  // Create multiple checkpoints
  console.log('📝 Creating multiple checkpoints...');

  for (let i = 0; i < 3; i++) {
    const sessionId = `test-session-${i}`;
    const context: WorkflowContext = {
      sessionId,
      projectPath: `/test/project-${i}`,
      currentVersion: '14',
      targetVersion: '20',
    };

    const state: WorkflowState = {
      currentStepIndex: i,
      currentActionIndex: 0,
      completedActions: new Map(),
      completedSteps: [],
      failedSteps: [],
      lastValidationResults: new Map(),
      retryAttempts: new Map(),
    };

    await stateManager.saveCheckpoint(sessionId, state, context);
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log('✅ Created 3 checkpoints');

  // List checkpoints
  console.log('📋 Listing checkpoints...');
  const checkpoints = await stateManager.listCheckpoints();

  if (checkpoints.length < 3) {
    throw new Error(`Expected at least 3 checkpoints, got ${checkpoints.length}`);
  }

  console.log(`✅ Found ${checkpoints.length} checkpoints`);

  // Verify checkpoints are sorted by timestamp (newest first)
  for (let i = 0; i < checkpoints.length - 1; i++) {
    if (checkpoints[i].timestamp < checkpoints[i + 1].timestamp) {
      throw new Error('Checkpoints not sorted correctly (should be newest first)');
    }
  }

  console.log('✅ Checkpoints sorted correctly');
  console.log('✅ Test 2 PASSED');
}

async function testCheckpointDelete() {
  console.log('\n=== Test 3: Checkpoint Deletion ===');

  const stateManager = new StateManager(TEST_CHECKPOINT_DIR);
  const deleteSessionId = 'test-session-delete';

  // Create checkpoint
  console.log('📝 Creating checkpoint...');
  const context: WorkflowContext = {
    sessionId: deleteSessionId,
    projectPath: '/test/project',
    currentVersion: '14',
    targetVersion: '20',
  };

  const state: WorkflowState = {
    currentStepIndex: 0,
    currentActionIndex: 0,
    completedActions: new Map(),
    completedSteps: [],
    failedSteps: [],
    lastValidationResults: new Map(),
    retryAttempts: new Map(),
  };

  await stateManager.saveCheckpoint(deleteSessionId, state, context);
  console.log('✅ Checkpoint created');

  // Verify it exists
  const exists = await stateManager.hasCheckpoint(deleteSessionId);
  if (!exists) {
    throw new Error('Checkpoint not found after creation');
  }
  console.log('✅ Checkpoint exists');

  // Delete checkpoint
  console.log('🗑️  Deleting checkpoint...');
  await stateManager.deleteCheckpoint(deleteSessionId);
  console.log('✅ Checkpoint deleted');

  // Verify it's gone
  const stillExists = await stateManager.hasCheckpoint(deleteSessionId);
  if (stillExists) {
    throw new Error('Checkpoint still exists after deletion');
  }
  console.log('✅ Checkpoint confirmed deleted');
  console.log('✅ Test 3 PASSED');
}

async function testWorkflowEngineRestoration() {
  console.log('\n=== Test 4: WorkflowEngine Restoration ===');

  const stateManager = new StateManager(TEST_CHECKPOINT_DIR);
  const restorationSessionId = 'test-session-restoration';

  // Create checkpoint with complex state
  console.log('📝 Creating checkpoint with validation results...');
  const context: WorkflowContext = {
    sessionId: restorationSessionId,
    projectPath: '/test/project',
    currentVersion: '14',
    targetVersion: '20',
    skipTests: true,
  };

  const state: WorkflowState = {
    currentStepIndex: 5,
    currentActionIndex: 0,
    completedActions: new Map(),
    completedSteps: ['backup', 'pre-check', 'update-deps', 'update-angular', 'build'],
    failedSteps: ['lint'],
    backupPath: '/test/backup-123',
    lastValidationResults: new Map([
      ['build', {
        success: true,
        output: 'Build passed',
        timestamp: new Date('2025-01-01T10:00:00Z'),
      }],
      ['lint', {
        success: false,
        output: '',
        error: 'Lint failed with 3 errors',
        timestamp: new Date('2025-01-01T10:05:00Z'),
      }],
    ]),
    retryAttempts: new Map(),
  };

  await stateManager.saveCheckpoint(restorationSessionId, state, context);
  console.log('✅ Checkpoint saved');

  // Restore via WorkflowEngine.fromCheckpoint
  console.log('🔄 Restoring via WorkflowEngine.fromCheckpoint...');
  const restoredEngine = await WorkflowEngine.fromCheckpoint(restorationSessionId, stateManager);

  if (!restoredEngine) {
    throw new Error('Failed to restore engine from checkpoint');
  }

  console.log('✅ Engine restored');

  // Verify restored state
  console.log('🔍 Verifying restored state...');
  const restoredState = restoredEngine.getState();
  const restoredContext = restoredEngine.getContext();

  if (restoredState.currentStepIndex !== 5) {
    throw new Error(`Step index mismatch: expected 5, got ${restoredState.currentStepIndex}`);
  }

  if (restoredState.completedSteps.length !== 5) {
    throw new Error(`Completed steps mismatch: expected 5, got ${restoredState.completedSteps.length}`);
  }

  if (restoredState.failedSteps.length !== 1 || restoredState.failedSteps[0] !== 'lint') {
    throw new Error('Failed steps not restored correctly');
  }

  if (restoredState.backupPath !== '/test/backup-123') {
    throw new Error('Backup path not restored correctly');
  }

  if (restoredContext.skipTests !== true) {
    throw new Error('Context options not restored correctly');
  }

  // Verify validation results Map was reconstructed
  const buildResult = restoredState.lastValidationResults.get('build');
  const lintResult = restoredState.lastValidationResults.get('lint');

  if (!buildResult || buildResult.success !== true) {
    throw new Error('Build validation result not restored correctly');
  }

  if (!lintResult || lintResult.success !== false) {
    throw new Error('Lint validation result not restored correctly');
  }

  if (lintResult.error !== 'Lint failed with 3 errors') {
    throw new Error('Validation error message not restored correctly');
  }

  console.log('✅ All state verified correctly');
  console.log('✅ Validation results Map reconstructed correctly');
  console.log('✅ Test 4 PASSED');
}

async function testAtomicWrite() {
  console.log('\n=== Test 5: Atomic Write (Corruption Prevention) ===');

  const stateManager = new StateManager(TEST_CHECKPOINT_DIR);
  const atomicSessionId = 'test-session-atomic';

  console.log('📝 Testing atomic write mechanism...');

  const context: WorkflowContext = {
    sessionId: atomicSessionId,
    projectPath: '/test/project',
    currentVersion: '14',
    targetVersion: '20',
  };

  const state: WorkflowState = {
    currentStepIndex: 1,
    currentActionIndex: 0,
    completedActions: new Map(),
    completedSteps: ['test'],
    failedSteps: [],
    lastValidationResults: new Map(),
    retryAttempts: new Map(),
  };

  // Save checkpoint (should use temp file + rename)
  await stateManager.saveCheckpoint(atomicSessionId, state, context);

  // Verify no .tmp files left behind
  const checkpointPath = path.join(TEST_CHECKPOINT_DIR, `${atomicSessionId}.json`);
  const tempPath = `${checkpointPath}.tmp`;

  try {
    await fs.access(tempPath);
    throw new Error('Temporary file still exists after checkpoint save (atomic write failed)');
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  console.log('✅ No temporary files found');
  console.log('✅ Atomic write working correctly');
  console.log('✅ Test 5 PASSED');
}

async function main() {
  console.log('🧪 Starting State Persistence Integration Tests');
  console.log(`📁 Test checkpoint directory: ${TEST_CHECKPOINT_DIR}`);

  try {
    // Clean up before tests
    await cleanup();

    // Run all tests
    await testCheckpointSaveLoad();
    await testCheckpointList();
    await testCheckpointDelete();
    await testWorkflowEngineRestoration();
    await testAtomicWrite();

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(50));

    // Clean up after tests
    await cleanup();

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(50));
    console.error(error);

    // Clean up after failure
    await cleanup();

    process.exit(1);
  }
}

// Run tests
main();

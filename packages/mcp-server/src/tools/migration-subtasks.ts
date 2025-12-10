/**
 * Subtask-based Migration Tools
 *
 * Granular atomic operations for fine-grained control over Angular migrations.
 * Each subtask is a separate Task-based tool that executes one specific operation.
 *
 * Benefits:
 * - Timeout isolation (npm install is separate)
 * - Retry individual steps (retry just npm install)
 * - Better progress visibility (see which operation is running)
 * - Skip operations (skip build during iteration)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TaskStore, ToolTaskHandler } from '@modelcontextprotocol/sdk/experimental/tasks/interfaces.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SessionManager } from '../session/manager.js';
import { VERSION_UPGRADE_SUBTASKS, getSubtaskById } from '@angular-migration/workflow-engine';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Register all subtask-based migration tools
 * Creates 30 tools (6 versions × 5 subtasks each)
 */
export function registerMigrationSubtaskTools(
  server: McpServer,
  sessionManager: SessionManager
): void {
  console.error('[Migration Subtasks] Registering granular subtask tools');

  // Register all 30 subtasks (v15-v20, 5 subtasks each)
  let registeredCount = 0;
  for (const subtask of VERSION_UPGRADE_SUBTASKS) {
    registerSubtaskTool(server, sessionManager, subtask.id);
    registeredCount++;
  }

  console.error(`[Migration Subtasks] Registered ${registeredCount} subtask tools`);
}

/**
 * Register a single subtask as a task-based tool
 */
function registerSubtaskTool(
  server: McpServer,
  sessionManager: SessionManager,
  subtaskId: string
): void {
  const subtask = getSubtaskById(subtaskId);
  if (!subtask) {
    throw new Error(`Subtask not found: ${subtaskId}`);
  }

  // Input schema for subtask execution
  const inputSchemaShape = {
    sessionId: z.string().describe('Migration session ID'),
    autoConfirm: z.boolean().optional().describe('Auto-confirm prompts'),
    skipValidation: z.boolean().optional().describe('Skip validation after operation'),
  };

  // Task handler for this subtask
  const handler: ToolTaskHandler<typeof inputSchemaShape> = {
    // Create task - returns immediately
    createTask: async (args, extra) => {
      const { sessionId, autoConfirm, skipValidation } = args;

      console.error(`[${subtaskId}] Creating task for session: ${sessionId}`);

      // Validate session exists
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Create task with 2-hour TTL (some npm installs can be very long)
      const task = await extra.taskStore.createTask({
        ttl: 2 * 60 * 60 * 1000, // 2 hours
        pollInterval: 2000, // Poll every 2 seconds
        context: {
          sessionId,
          subtaskId,
          stageId: subtask.stageId,
        },
      });

      console.error(`[${subtaskId}] Task created: ${task.taskId}`);
      console.error(`[${subtaskId}] Starting background execution...`);

      // Start background execution (non-blocking)
      executeSubtaskInBackground(
        task.taskId,
        subtaskId,
        sessionId,
        {
          autoConfirm: autoConfirm ?? false,
          skipValidation: skipValidation ?? false,
        },
        sessionManager,
        extra.taskStore
      ).catch((error) => {
        console.error(`[${subtaskId}] Background execution failed:`, error);
      });

      // Return task immediately
      return { task };
    },

    // Get task status when polled
    getTask: async (args, extra) => {
      return await extra.taskStore.getTask(extra.taskId);
    },

    // Get final result
    getTaskResult: async (args, extra) => {
      return (await extra.taskStore.getTaskResult(extra.taskId)) as CallToolResult;
    },
  };

  // Register the tool
  server.experimental.tasks.registerToolTask(
    subtaskId,
    {
      title: subtask.name,
      description: `${subtask.description} (${subtask.estimatedDuration})${subtask.canTimeout ? ' ⚠️ Can timeout - isolated for retry' : ''}`,
      inputSchema: inputSchemaShape,
      execution: {
        taskSupport: 'required', // Force task mode
      },
    },
    handler
  );
}

/**
 * Background worker that executes a subtask asynchronously
 */
async function executeSubtaskInBackground(
  taskId: string,
  subtaskId: string,
  sessionId: string,
  options: { autoConfirm: boolean; skipValidation: boolean },
  sessionManager: SessionManager,
  taskStore: TaskStore
): Promise<void> {
  try {
    console.error(`[Task ${taskId}] Starting subtask: ${subtaskId}`);

    // Set status to working
    await taskStore.updateTaskStatus(taskId, 'working', `Executing ${subtaskId}`);

    // Get session
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const subtask = getSubtaskById(subtaskId);
    if (!subtask) {
      throw new Error(`Subtask not found: ${subtaskId}`);
    }

    // Extract version from subtask ID (e.g., 'migration_v15_update_packages' -> '15')
    const versionMatch = subtaskId.match(/migration_v(\d+)_/);
    const version = versionMatch ? versionMatch[1] : '';

    // Extract operation type from subtask ID
    const operationType = subtaskId.split('_').slice(-2).join('_'); // e.g., 'update_packages', 'install_dependencies'

    console.error(`[Task ${taskId}] Operation: ${operationType} for Angular v${version}`);

    // Execute the specific operation
    let result: any;
    const projectPath = session.projectPath;

    switch (operationType) {
      case 'update_packages':
        result = await executeUpdatePackages(taskId, projectPath, version, taskStore);
        break;

      case 'install_dependencies':
        result = await executeInstallDependencies(taskId, projectPath, version, taskStore);
        break;

      case 'run_migrations':
        result = await executeRunMigrations(taskId, projectPath, version, taskStore);
        break;

      case 'breaking_changes':
        result = await executeApplyBreakingChanges(taskId, projectPath, version, taskStore);
        break;

      case 'build_validate':
        if (!options.skipValidation) {
          result = await executeBuildValidate(taskId, projectPath, version, taskStore);
        } else {
          result = { message: 'Validation skipped by user', skipped: true };
        }
        break;

      case 'commit':
        result = await executeCommit(taskId, projectPath, version, taskStore);
        break;

      default:
        throw new Error(`Unknown operation type: ${operationType}`);
    }

    console.error(`[Task ${taskId}] Subtask completed successfully`);

    // Store result as completed
    await taskStore.storeTaskResult(taskId, 'completed', {
      content: [
        {
          type: 'text',
          text: `✅ Subtask ${subtaskId} completed successfully\n\nOperation: ${subtask.name}\nVersion: Angular ${version}\n\nResult:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    });
  } catch (error: any) {
    console.error(`[Task ${taskId}] Subtask failed:`, error);

    // Store result as failed
    await taskStore.storeTaskResult(taskId, 'failed', {
      content: [
        {
          type: 'text',
          text: `❌ Subtask ${subtaskId} failed\n\nError: ${error.message}\n\nStack:\n${error.stack || 'No stack trace'}`,
        },
      ],
      isError: true,
    });
  }
}

/**
 * Execute: Update package.json to target Angular version
 */
async function executeUpdatePackages(
  taskId: string,
  projectPath: string,
  version: string,
  taskStore: TaskStore
): Promise<any> {
  await taskStore.updateTaskStatus(taskId, 'working', `Updating package.json to Angular ${version}`);

  // Read current package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  const fs = await import('fs/promises');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

  console.error(`[Task ${taskId}] Current Angular version: ${packageJson.dependencies['@angular/core']}`);

  // Update Angular packages to target version
  const angularPackages = [
    '@angular/animations',
    '@angular/common',
    '@angular/compiler',
    '@angular/core',
    '@angular/forms',
    '@angular/platform-browser',
    '@angular/platform-browser-dynamic',
    '@angular/router',
  ];

  const targetVersion = `^${version}.0.0`;
  let updatedCount = 0;

  for (const pkg of angularPackages) {
    if (packageJson.dependencies?.[pkg]) {
      packageJson.dependencies[pkg] = targetVersion;
      updatedCount++;
    }
    if (packageJson.devDependencies?.[pkg]) {
      packageJson.devDependencies[pkg] = targetVersion;
      updatedCount++;
    }
  }

  // Write updated package.json
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.error(`[Task ${taskId}] Updated ${updatedCount} Angular packages to v${version}`);

  return {
    updatedPackages: updatedCount,
    targetVersion,
    message: `Updated ${updatedCount} packages to Angular ${version}`,
  };
}

/**
 * Execute: Run npm install (THE LONG OPERATION - 5-10 minutes)
 */
async function executeInstallDependencies(
  taskId: string,
  projectPath: string,
  version: string,
  taskStore: TaskStore
): Promise<any> {
  await taskStore.updateTaskStatus(taskId, 'working', `Installing Angular ${version} dependencies (5-10 minutes)`);

  console.error(`[Task ${taskId}] Running npm install in ${projectPath}`);
  console.error(`[Task ${taskId}] ⚠️  This can take 5-10 minutes...`);

  const startTime = Date.now();

  // Run npm install with increased timeout (15 minutes)
  const { stdout, stderr } = await execAsync('npm install', {
    cwd: projectPath,
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    timeout: 15 * 60 * 1000, // 15 minute timeout
  });

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.error(`[Task ${taskId}] npm install completed in ${duration}s`);

  return {
    duration: `${duration}s`,
    message: `Installed Angular ${version} dependencies in ${duration}s`,
    stdout: stdout.substring(0, 1000), // First 1000 chars
    stderr: stderr.substring(0, 1000),
  };
}

/**
 * Execute: Run Angular migrations
 */
async function executeRunMigrations(
  taskId: string,
  projectPath: string,
  version: string,
  taskStore: TaskStore
): Promise<any> {
  await taskStore.updateTaskStatus(taskId, 'working', `Running Angular ${version} migrations`);

  console.error(`[Task ${taskId}] Running Angular CLI migrations`);

  // Run ng update @angular/cli@{version} @angular/core@{version}
  const { stdout, stderr } = await execAsync(
    `npx @angular/cli@${version} update @angular/cli@${version} @angular/core@${version} --force --allow-dirty`,
    {
      cwd: projectPath,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 10 * 60 * 1000, // 10 minute timeout
    }
  );

  console.error(`[Task ${taskId}] Angular CLI migrations completed`);

  return {
    message: `Ran Angular ${version} migrations successfully`,
    stdout: stdout.substring(0, 1000),
    stderr: stderr.substring(0, 1000),
    nextStep: {
      tool: `migration_v${version}_apply_breaking_changes`,
      description: 'Apply automated breaking changes fixes',
      reason: 'Breaking changes fixes should be applied after migrations to update deprecated APIs',
    },
  };
}

/**
 * Execute: Apply breaking changes fixes
 */
async function executeApplyBreakingChanges(
  taskId: string,
  projectPath: string,
  version: string,
  taskStore: TaskStore
): Promise<any> {
  await taskStore.updateTaskStatus(taskId, 'working', `Applying Angular ${version} breaking changes fixes`);

  console.error(`[Task ${taskId}] Applying breaking changes fixes for v${version}`);

  try {
    // Import breaking changes fixer dynamically
    const { applyBreakingChangeFixes } = await import('@angular-migration/workflow-engine');

    const result = await applyBreakingChangeFixes(projectPath, version);

    const fixCount = result.changes.length;
    console.error(`[Task ${taskId}] Breaking changes fixes applied: ${fixCount} fixes`);

    return {
      message: `Applied ${fixCount} breaking changes fixes for Angular ${version}`,
      fixesApplied: fixCount,
      changes: result.changes,
      warnings: result.warnings,
      errors: result.errors,
      success: result.success,
    };
  } catch (error: any) {
    // Some versions may not have breaking changes fixes implemented
    console.error(`[Task ${taskId}] Breaking changes fixes failed: ${error.message}`);
    throw new Error(`Failed to apply breaking changes fixes: ${error.message}`);
  }
}

/**
 * Execute: Build and validate
 */
async function executeBuildValidate(
  taskId: string,
  projectPath: string,
  version: string,
  taskStore: TaskStore
): Promise<any> {
  await taskStore.updateTaskStatus(taskId, 'working', `Building and validating Angular ${version}`);

  console.error(`[Task ${taskId}] Running build`);

  // Run npm run build
  const { stdout, stderr } = await execAsync('npm run build', {
    cwd: projectPath,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 10 * 60 * 1000, // 10 minute timeout
  });

  console.error(`[Task ${taskId}] Build completed successfully`);

  return {
    message: `Built and validated Angular ${version} successfully`,
    stdout: stdout.substring(0, 1000),
    stderr: stderr.substring(0, 1000),
  };
}

/**
 * Execute: Git commit
 */
async function executeCommit(
  taskId: string,
  projectPath: string,
  version: string,
  taskStore: TaskStore
): Promise<any> {
  await taskStore.updateTaskStatus(taskId, 'working', `Committing Angular ${version} changes`);

  console.error(`[Task ${taskId}] Committing changes to git`);

  // Git add and commit
  await execAsync('git add .', { cwd: projectPath });
  const { stdout } = await execAsync(`git commit -m "chore: upgrade to Angular ${version}"`, {
    cwd: projectPath,
  });

  console.error(`[Task ${taskId}] Changes committed`);

  return {
    message: `Committed Angular ${version} upgrade`,
    commitMessage: `chore: upgrade to Angular ${version}`,
    stdout: stdout.trim(),
  };
}

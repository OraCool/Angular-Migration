/**
 * Task-based Migration Tools
 *
 * Long-running migration operations using MCP experimental Tasks API.
 * Tasks return immediately and allow clients to poll for status/results.
 *
 * Solves timeout issues for operations that take 5-10 minutes.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TaskStore, ToolTaskHandler } from '@modelcontextprotocol/sdk/experimental/tasks/interfaces.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SessionManager } from '../session/manager.js';
import type { StageExecutionOptions } from '@angular-migration/workflow-engine';

/**
 * Register all task-based migration stage tools
 */
export function registerMigrationTaskTools(
  server: McpServer,
  sessionManager: SessionManager
): void {
  console.error('[Migration Tasks] Registering task-based migration tools');

  // Pre-migration stage
  registerMigrationStageTask(
    server,
    sessionManager,
    'migration_stage_pre_migration',
    'Pre-Migration Stage (Task)',
    'Execute pre-migration stage: backup, validation, git commit (Steps 0-2). Returns immediately with task ID for polling.',
    'migration_stage_pre_migration'
  );

  // Angular 15 upgrade
  registerMigrationStageTask(
    server,
    sessionManager,
    'migration_stage_v15',
    'Angular 15 Upgrade (Task)',
    'Execute Angular 15 upgrade with package installation (5-10 minutes). Returns immediately with task ID for polling.',
    'migration_stage_v15'
  );

  // Angular 16 upgrade
  registerMigrationStageTask(
    server,
    sessionManager,
    'migration_stage_v16',
    'Angular 16 Upgrade (Task)',
    'Execute Angular 16 upgrade with package installation (5-10 minutes). Returns immediately with task ID for polling.',
    'migration_stage_v16'
  );

  // Angular 17 upgrade
  registerMigrationStageTask(
    server,
    sessionManager,
    'migration_stage_v17',
    'Angular 17 Upgrade (Task)',
    'Execute Angular 17 upgrade with control flow migration (5-10 minutes). Returns immediately with task ID for polling.',
    'migration_stage_v17'
  );

  // Angular 18 upgrade
  registerMigrationStageTask(
    server,
    sessionManager,
    'migration_stage_v18',
    'Angular 18 Upgrade (Task)',
    'Execute Angular 18 upgrade with package installation (5-10 minutes). Returns immediately with task ID for polling.',
    'migration_stage_v18'
  );

  // Angular 19 upgrade
  registerMigrationStageTask(
    server,
    sessionManager,
    'migration_stage_v19',
    'Angular 19 Upgrade (Task)',
    'Execute Angular 19 upgrade with package installation (5-10 minutes). Returns immediately with task ID for polling.',
    'migration_stage_v19'
  );

  // Angular 20 upgrade
  registerMigrationStageTask(
    server,
    sessionManager,
    'migration_stage_v20',
    'Angular 20 Upgrade (Task)',
    'Execute Angular 20 upgrade with package installation (5-10 minutes). Returns immediately with task ID for polling.',
    'migration_stage_v20'
  );

  // Post-migration
  registerMigrationStageTask(
    server,
    sessionManager,
    'migration_stage_post_migration',
    'Post-Migration Report (Task)',
    'Generate post-migration report. Returns immediately with task ID for polling.',
    'migration_stage_post_migration'
  );

  console.error('[Migration Tasks] Registered 8 task-based migration tools');
}

/**
 * Register a single migration stage as a task-based tool
 */
function registerMigrationStageTask(
  server: McpServer,
  sessionManager: SessionManager,
  toolName: string,
  title: string,
  description: string,
  stageId: string
): void {
  // Define input schema shape
  const inputSchemaShape = {
    sessionId: z.string().describe('Migration session ID'),
    skipValidations: z.boolean().optional().describe('Skip validation steps'),
    autoConfirm: z.boolean().optional().describe('Auto-confirm all prompts'),
    continueOnError: z.boolean().optional().describe('Continue even if steps fail'),
  };

  // Cast handler to correct type for proper type inference
  const handler: ToolTaskHandler<typeof inputSchemaShape> = {
      // ✅ createTask: Returns immediately with task ID
      createTask: async (args, extra) => {
        const { sessionId, skipValidations, autoConfirm, continueOnError } = args;

        console.error(`[${toolName}] Creating task for session: ${sessionId}`);

        // Validate session exists
        const session = sessionManager.getSession(sessionId);
        if (!session) {
          throw new Error(`Session not found: ${sessionId}`);
        }

        // Create task with 5-hour TTL
        const task = await extra.taskStore.createTask({
          ttl: 5 * 60 * 60 * 1000, // 5 hours
          pollInterval: 2000, // Client should poll every 2 seconds
          context: {
            sessionId,
            stageId,
            toolName,
          },
        });

        console.error(`[${toolName}] Task created: ${task.taskId}`);
        console.error(`[${toolName}] Starting background execution...`);

        // Start background execution (non-blocking)
        executeMigrationStageInBackground(
          task.taskId,
          stageId,
          sessionId,
          {
            skipValidations,
            autoConfirm,
            continueOnError,
          },
          sessionManager,
          extra.taskStore
        ).catch((error) => {
          console.error(`[${toolName}] Background execution failed:`, error);
        });

        // Return task immediately
        return { task };
      },

      // ✅ getTask: Return current status when polled
      getTask: async (args, extra) => {
        return await extra.taskStore.getTask(extra.taskId);
      },

      // ✅ getTaskResult: Return final result
      getTaskResult: async (args, extra) => {
        return (await extra.taskStore.getTaskResult(extra.taskId)) as CallToolResult;
      },
  };

  // Register the tool with the handler
  server.experimental.tasks.registerToolTask(
    toolName,
    {
      title,
      description,
      inputSchema: inputSchemaShape,
      execution: {
        taskSupport: 'required', // Force task mode for long-running operations
      },
    },
    handler
  );
}

/**
 * Background worker that executes migration stage asynchronously
 */
async function executeMigrationStageInBackground(
  taskId: string,
  stageId: string,
  sessionId: string,
  options: StageExecutionOptions,
  sessionManager: SessionManager,
  taskStore: TaskStore
): Promise<void> {
  try {
    console.error(`[Task ${taskId}] Starting stage: ${stageId}`);

    // Set status to working
    await taskStore.updateTaskStatus(taskId, 'working', `Executing ${stageId}`);

    // Get session
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Execute stage with progress callback
    const result = await session.engine.executeStage(stageId, {
      ...options,
      progressCallback: (update: any) => {
        // Log progress (doesn't block)
        const timestamp = new Date().toISOString();
        console.error(`[Task ${taskId}] [${timestamp}] ${update.type}: ${update.message}`);
      },
    });

    console.error(`[Task ${taskId}] Stage completed successfully`);

    // Store result as completed
    await taskStore.storeTaskResult(
      taskId,
      'completed',
      {
        content: [
          {
            type: 'text',
            text: `Stage ${stageId} completed successfully.\n\nResults:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      }
    );
  } catch (error: any) {
    console.error(`[Task ${taskId}] Stage failed:`, error);

    // Store result as failed
    await taskStore.storeTaskResult(
      taskId,
      'failed',
      {
        content: [
          {
            type: 'text',
            text: `Stage ${stageId} failed: ${error.message}\n\nStack:\n${error.stack || 'No stack trace'}`,
          },
        ],
        isError: true,
      }
    );
  }
}

/**
 * MCP Tools Registration
 * Registers migration workflow tools (transitioning to stage-based architecture)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SessionManager } from '../session/manager.js';
import { ToolResult, ProgressCallback, ProgressUpdate } from '../types.js';
import {
  createProgressCallback,
  createBufferingProgressCallback,
  createNoOpProgressCallback,
} from '../utils/streaming.js';

// Import tool handlers
import * as migrationStageTools from './migration-stages.js';
import * as stateTools from './state.js';
import * as validationTools from './validation.js';
import * as packageTools from './packages.js';
import * as backupRestoreTools from './backup-restore.js';
import * as sessionTools from './session.js';
import * as breakingChangesTools from './breaking-changes.js';

/**
 * All available MCP tools
 * Stage-based architecture:
 * - 8 core migration stage tools (pre-migration, v15-v20, post-migration)
 * - 1 optional feature migration tool (standalone)
 * - 4 stage management tools
 * - 4 session management tools (create, list, get, delete)
 * - 4 state management tools
 * - 3 validation tools
 * - 3 package management tools
 * - 2 backup/restore tools
 * - 2 breaking changes tools (fix, list available)
 * Total: 31 tools
 */
const TOOLS: Tool[] = [
  // ========================================
  // CORE MIGRATION STAGE TOOLS (8 task-based tools)
  // ========================================
  // NOTE: These tools are registered via registerMigrationTaskTools() using experimental Tasks API
  // They return immediately with task ID and allow polling for long-running operations (5-10 minutes)
  // Tool definitions are provided by McpServer.experimental.tasks.registerToolTask()
  // No definitions needed here - they're automatically added to the tool list

  // ========================================
  // STAGE MANAGEMENT TOOLS (4 tools)
  // ========================================
  {
    name: 'migration_stage_get_current',
    description: 'Get current stage information with progress and next step recommendation. If sessionId is not provided, uses the most recent active session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID (optional - uses most recent session if omitted)' },
      },
      required: [],
    },
  },
  {
    name: 'migration_stage_skip_to',
    description: 'Jump to a specific stage by ID (bypasses sequential order validation)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        stageId: { type: 'string', description: 'Target stage ID (e.g., "migration_stage_v17")' },
      },
      required: ['sessionId', 'stageId'],
    },
  },
  {
    name: 'migration_stage_get_all',
    description: 'List all migration stages with status and recommended next action',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID (optional, omit for stage definitions only)' },
      },
      required: [],
    },
  },
  {
    name: 'migration_stage_validate_node',
    description: 'Validate Node.js version compatibility (v22 required for Angular 20)',
    inputSchema: {
      type: 'object',
      properties: {
        requiredMajor: { type: 'number', description: 'Required Node.js major version (default: 22)' },
      },
      required: [],
    },
  },

  // ========================================
  // SESSION MANAGEMENT TOOLS (4 tools)
  // ========================================
  {
    name: 'session_create',
    description: 'Create a new migration session for an Angular project. Returns sessionId required by all migration stage tools.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Absolute path to Angular project root directory (must contain angular.json). Example: /Users/user1/dev/ai/migrations/project/current_app',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'session_list',
    description: 'List all active migration sessions with their current state and progress',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'session_get',
    description: 'Get detailed information about a specific migration session including current stage and progress. If sessionId is not provided, uses the most recent active session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID returned from session_create (optional - uses most recent session if omitted)',
        },
      },
      required: [],
    },
  },
  {
    name: 'session_delete',
    description: 'Delete a migration session and clean up its state',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID to delete',
        },
      },
      required: ['sessionId'],
    },
  },

  // ========================================
  // SUPPORTING TOOLS
  // ========================================

  // State Management (4 tools)
  {
    name: 'state_save_checkpoint',
    description: 'Save current workflow state as a checkpoint',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'state_load_checkpoint',
    description: 'Load workflow state from a checkpoint',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'state_delete_checkpoint',
    description: 'Delete a saved checkpoint',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'state_has_checkpoint',
    description: 'Check if a checkpoint exists for a session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },

  // Validation Tools (3 tools)
  {
    name: 'validate_project',
    description: 'Validate Angular project structure and configuration',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to Angular project',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'validate_node_version',
    description: 'Validate Node.js version compatibility for Angular version',
    inputSchema: {
      type: 'object',
      properties: {
        angularVersion: {
          type: 'string',
          description: 'Angular version to validate against',
        },
      },
      required: ['angularVersion'],
    },
  },
  {
    name: 'validate_dependencies',
    description: 'Validate package.json dependencies for compatibility',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to Angular project',
        },
        targetVersion: {
          type: 'string',
          description: 'Target Angular version',
        },
      },
      required: ['projectPath', 'targetVersion'],
    },
  },

  // Package Management (3 tools)
  {
    name: 'packages_get_compatibility',
    description: 'Get package compatibility matrix for Angular versions',
    inputSchema: {
      type: 'object',
      properties: {
        angularVersion: {
          type: 'string',
          description: 'Angular version (e.g., "20")',
        },
      },
      required: ['angularVersion'],
    },
  },
  {
    name: 'packages_check_updates',
    description: 'Check for available package updates',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to Angular project',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'packages_get_breaking_changes',
    description: 'Get breaking changes for package version upgrades based on package.json',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to Angular project',
        },
        fromVersion: {
          type: 'string',
          description: 'Current Angular version (e.g., "14")',
        },
        toVersion: {
          type: 'string',
          description: 'Target Angular version (e.g., "20")',
        },
      },
      required: ['projectPath', 'fromVersion', 'toVersion'],
    },
  },

  // Breaking Changes Tools (2 tools)
  {
    name: 'breaking_changes_fix',
    description: 'Apply automated fixes for Angular version-specific breaking changes. Runs shell scripts that fix common breaking changes for Angular 16, 17, 19, and 20.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Migration session ID (optional - uses most recent session if omitted)',
        },
        targetVersion: {
          type: 'string',
          description: 'Angular version to fix breaking changes for (e.g., "16", "17", "19", "20")',
        },
        dryRun: {
          type: 'boolean',
          description: 'If true, shows what would be fixed without making changes (default: false)',
        },
      },
      required: ['targetVersion'],
    },
  },
  {
    name: 'breaking_changes_list_available',
    description: 'List all available breaking changes fix scripts and which Angular versions they support',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // Backup and Restore (2 tools)
  {
    name: 'migration_backup',
    description: 'Create a backup of the Angular project (optional, can be done at any time)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        backupName: {
          type: 'string',
          description: 'Custom backup name (optional, auto-generated if not provided)',
        },
        skipNodeModules: {
          type: 'boolean',
          description: 'Skip backing up node_modules (default: true, recommended)',
        },
        skipGit: {
          type: 'boolean',
          description: 'Skip backing up .git directory (default: false, keeps version history)',
        },
        skipDist: {
          type: 'boolean',
          description: 'Skip backing up dist directory (default: true)',
        },
        skipCoverage: {
          type: 'boolean',
          description: 'Skip backing up coverage directory (default: true)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'migration_restore',
    description: 'Restore the Angular project from a backup',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        backupPath: {
          type: 'string',
          description: 'Absolute path to backup directory (use this OR backupName)',
        },
        backupName: {
          type: 'string',
          description: 'Backup name from .migration-backups (use this OR backupPath)',
        },
        force: {
          type: 'boolean',
          description: 'Force restore even if backup metadata is missing (default: false)',
        },
        createSafetyBackup: {
          type: 'boolean',
          description: 'Create safety backup of current state before restoring (default: true, recommended)',
        },
        preserveGit: {
          type: 'boolean',
          description: 'Preserve .git directory during restore (default: true)',
        },
        reinstallDependencies: {
          type: 'boolean',
          description: 'Reinstall node_modules after restore (default: true)',
        },
      },
      required: ['sessionId'],
    },
  },
];

/**
 * Register all tools with the MCP server
 *
 * This function:
 * 1. Registers each traditional tool with McpServer so they appear in tool list
 * 2. Sets up CallToolRequestSchema handler on underlying Server for routing
 * 3. McpServer automatically merges these with task-based tools (8 stage + 30 subtask)
 */
export function registerTools(mcpServer: McpServer, sessionManager: SessionManager): void {
  // Register each traditional tool with McpServer so they appear in the tool list
  // This ensures all 20 traditional tools + 38 task-based tools = 58 total tools visible to clients
  for (const tool of TOOLS) {
    mcpServer.tool(
      tool.name,
      tool.description || 'No description available',
      tool.inputSchema as any,
      async (args: any) => {
        // Create empty progress callback for traditional tools (they don't support streaming yet)
        const progressCallback: ProgressCallback = () => {};

        // Route to appropriate handler based on tool name
        let result: ToolResult;

        if (tool.name.startsWith('migration_stage_') || tool.name.startsWith('migration_feature_')) {
          result = await migrationStageTools.handleMigrationStageTool(tool.name, args, sessionManager, progressCallback);
        } else if (tool.name === 'migration_backup' || tool.name === 'migration_restore') {
          result = await backupRestoreTools.handleBackupRestoreTool(tool.name, args, sessionManager, progressCallback);
        } else if (tool.name.startsWith('breaking_changes_')) {
          result = await breakingChangesTools.handleBreakingChangesTool(tool.name, args, sessionManager, progressCallback);
        } else if (tool.name.startsWith('session_')) {
          result = await sessionTools.handleSessionTool(tool.name, args, sessionManager, progressCallback);
        } else if (tool.name.startsWith('state_')) {
          result = await stateTools.handleStateTool(tool.name, args, sessionManager, progressCallback);
        } else if (tool.name.startsWith('validate_')) {
          result = await validationTools.handleValidationTool(tool.name, args, sessionManager, progressCallback);
        } else if (tool.name.startsWith('packages_')) {
          result = await packageTools.handlePackageTool(tool.name, args, sessionManager, progressCallback);
        } else {
          throw new Error(`Unknown tool: ${tool.name}`);
        }

        // Return result as text (must use literal 'text' type for MCP)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );
  }

  // Also set up CallToolRequestSchema handler on underlying Server for backward compatibility
  // This handles any tools that might bypass McpServer's routing
  mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args, _meta } = request.params;
    const progressToken = _meta?.progressToken;

    // DEBUG: Log request details to diagnose streaming
    console.error(`\n${'='.repeat(80)}`);
    console.error(`[${new Date().toISOString()}] [MCP Tool Request] ${name}`);
    console.error(`  - Has _meta: ${_meta !== undefined}`);
    console.error(`  - Has progressToken: ${progressToken !== undefined}`);
    if (progressToken !== undefined) {
      console.error(`  - progressToken value: ${progressToken}`);
      console.error(`  - ✅ Streaming enabled (real-time MCP notifications)`);
    } else {
      console.error(`  - ⚠️  NO progressToken from client`);
      console.error(`  - Streaming will buffer only (no real-time notifications)`);
      console.error(`  - To enable: Client must send progressToken in _meta`);
    }
    console.error(`${'='.repeat(80)}\n`);

    try {
      // Create progress tracking for streaming updates
      const progressUpdates: ProgressUpdate[] = [];

      // Create progress callback that ALWAYS sends notifications (even without progressToken)
      const progressCallback: ProgressCallback = (update: ProgressUpdate) => {
        // Buffer the update for final result
        progressUpdates.push({
          ...update,
          timestamp: update.timestamp || new Date().toISOString(),
          toolName: update.toolName || name,
        });

        // ALWAYS send MCP progress notification (don't check for progressToken)
        // This provides real-time updates to the agent regardless of client support
        try {
          extra.sendNotification({
            method: 'notifications/progress',
            params: {
              progressToken: progressToken || 0, // Use 0 as fallback if no token provided
              progress: update.completedSteps || 0,
              total: update.totalSteps,
              message: update.message,
            },
          }).catch((err) => {
            // Silently ignore notification errors (expected if client doesn't support them)
          });
        } catch (err) {
          // Silently ignore - client may not support notifications
        }

        // ALWAYS log to stderr for immediate visibility (this always works)
        const toolPrefix = update.toolName || name;
        console.error(
          `[${toolPrefix}] [Progress] ${update.type || 'info'}: ${update.message}` +
          (update.progress !== undefined ? ` (${update.progress}%)` : '')
        );
      };

      let result: ToolResult;

      // Route to appropriate handler
      const toolArgs = args || {};

      if (name.startsWith('migration_stage_') || name.startsWith('migration_feature_')) {
        result = await migrationStageTools.handleMigrationStageTool(name, toolArgs, sessionManager, progressCallback);
      } else if (name === 'migration_backup' || name === 'migration_restore') {
        result = await backupRestoreTools.handleBackupRestoreTool(name, toolArgs, sessionManager, progressCallback);
      } else if (name.startsWith('session_')) {
        result = await sessionTools.handleSessionTool(name, toolArgs, sessionManager, progressCallback);
      } else if (name.startsWith('state_')) {
        result = await stateTools.handleStateTool(name, toolArgs, sessionManager, progressCallback);
      } else if (name.startsWith('validate_')) {
        result = await validationTools.handleValidationTool(name, toolArgs, sessionManager, progressCallback);
      } else if (name.startsWith('packages_')) {
        result = await packageTools.handlePackageTool(name, toolArgs, sessionManager, progressCallback);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      // Include progress updates in result if streaming was used
      const streamingResult = {
        ...result,
        streamed: progressUpdates.length > 0,
        progressUpdates: progressUpdates.length > 0 ? progressUpdates : undefined,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(streamingResult, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: errorMessage,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });
}

/**
 * MCP Tools Registration
 * Registers migration workflow tools (transitioning to stage-based architecture)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SessionManager } from '../session/manager.js';
import { ToolResult } from '../types.js';

// Import tool handlers
import * as migrationStageTools from './migration-stages.js';
import * as stateTools from './state.js';
import * as validationTools from './validation.js';
import * as packageTools from './packages.js';
import * as backupRestoreTools from './backup-restore.js';

/**
 * All available MCP tools
 * Stage-based architecture:
 * - 8 core migration stage tools (pre-migration, v15-v20, post-migration)
 * - 1 optional feature migration tool (standalone)
 * - 4 stage management tools
 * - 4 state management tools
 * - 3 validation tools
 * - 3 package management tools
 * - 2 backup/restore tools
 * Total: 25 tools
 */
const TOOLS: Tool[] = [
  // ========================================
  // CORE MIGRATION STAGE TOOLS (7 tools)
  // ========================================
  {
    name: 'migration_stage_pre_migration',
    description: 'Execute pre-migration stage: backup, validation, git commit (Steps 0-2)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        skipBackup: { type: 'boolean', description: 'Skip backup (not recommended)' },
        skipValidations: { type: 'boolean', description: 'Skip validations' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'migration_stage_v15',
    description: 'Execute Angular 15 upgrade: update to v15 (Steps 3-4, requires 1 confirmation). Standalone migration is now a separate optional tool.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        skipValidations: { type: 'boolean', description: 'Skip validations' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
        continueOnError: { type: 'boolean', description: 'Continue even if steps fail' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'migration_stage_v16',
    description: 'Execute Angular 16 upgrade: update to v16 with Signals support (Steps 7-8, requires 1 confirmation)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        skipValidations: { type: 'boolean', description: 'Skip validations' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
        continueOnError: { type: 'boolean', description: 'Continue even if steps fail' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'migration_stage_v17',
    description: 'Execute Angular 17 upgrade: update to v17 with built-in control flow migration (Steps 9-11, requires 1 confirmation)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        skipValidations: { type: 'boolean', description: 'Skip validations' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
        continueOnError: { type: 'boolean', description: 'Continue even if steps fail' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'migration_stage_v18',
    description: 'Execute Angular 18 upgrade: update to v18 (Steps 12-13, requires 1 confirmation)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        skipValidations: { type: 'boolean', description: 'Skip validations' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
        continueOnError: { type: 'boolean', description: 'Continue even if steps fail' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'migration_stage_v19',
    description: 'Execute Angular 19 upgrade: update to v19 (Steps 14-15, requires 1 confirmation)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        skipValidations: { type: 'boolean', description: 'Skip validations' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
        continueOnError: { type: 'boolean', description: 'Continue even if steps fail' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'migration_stage_v20',
    description: 'Execute Angular 20 upgrade: update to v20 (Steps 16-17, requires 1 confirmation)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        skipValidations: { type: 'boolean', description: 'Skip validations' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
        continueOnError: { type: 'boolean', description: 'Continue even if steps fail' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'migration_stage_post_migration',
    description: 'Execute post-migration stage: generate final migration report (Step 18)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
      },
      required: ['sessionId'],
    },
  },

  // ========================================
  // OPTIONAL FEATURE MIGRATION TOOL (1 tool)
  // ========================================
  {
    name: 'migration_feature_standalone',
    description: 'Execute optional standalone components migration: convert NgModule-based components to standalone (Steps 5-6, requires 1 confirmation). Can run anytime after v15+, recommended before v17.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        skipValidations: { type: 'boolean', description: 'Skip validations' },
        autoConfirm: { type: 'boolean', description: 'Auto-confirm prompts' },
        continueOnError: { type: 'boolean', description: 'Continue even if steps fail' },
      },
      required: ['sessionId'],
    },
  },

  // ========================================
  // STAGE MANAGEMENT TOOLS (4 tools)
  // ========================================
  {
    name: 'migration_stage_get_current',
    description: 'Get current stage information with progress and next step recommendation',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
      },
      required: ['sessionId'],
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
 */
export function registerTools(server: Server, sessionManager: SessionManager): void {
  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: ToolResult;

      // Route to appropriate handler
      const toolArgs = args || {};

      if (name.startsWith('migration_stage_') || name.startsWith('migration_feature_')) {
        result = await migrationStageTools.handleMigrationStageTool(name, toolArgs, sessionManager);
      } else if (name === 'migration_backup' || name === 'migration_restore') {
        result = await backupRestoreTools.handleBackupRestoreTool(name, toolArgs, sessionManager);
      } else if (name.startsWith('state_')) {
        result = await stateTools.handleStateTool(name, toolArgs, sessionManager);
      } else if (name.startsWith('validate_')) {
        result = await validationTools.handleValidationTool(name, toolArgs, sessionManager);
      } else if (name.startsWith('packages_')) {
        result = await packageTools.handlePackageTool(name, toolArgs, sessionManager);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
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

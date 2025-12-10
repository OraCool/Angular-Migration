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
import { ToolResult, ProgressCallback, ProgressUpdate, StandardToolResponse, StandardErrorResponse } from '../types.js';
import {
  createProgressCallback,
  createBufferingProgressCallback,
  createNoOpProgressCallback,
} from '../utils/streaming.js';

/**
 * Convert StandardToolResponse/StandardErrorResponse to legacy ToolResult format
 * This provides backward compatibility while supporting the new spec format
 */
function convertToLegacyFormat(response: StandardToolResponse | StandardErrorResponse): ToolResult {
  if (response.status === 'error') {
    const errorResponse = response as StandardErrorResponse;
    return {
      success: false,
      error: errorResponse.error.message,
      message: errorResponse.error.details,
      details: {
        code: errorResponse.error.code,
        details: errorResponse.error.details,
      },
      nextStep: {
        action: errorResponse.nextAction,
        description: errorResponse.nextAction,
        reasoning: errorResponse.instructionRef || '',
      },
    };
  }

  const successResponse = response as StandardToolResponse;
  return {
    success: successResponse.status === 'success',
    data: successResponse.data,
    message: successResponse.nextAction,
    nextStep: {
      action: successResponse.nextAction,
      description: successResponse.nextAction,
      reasoning: successResponse.instructionRef || '',
      optional: successResponse.userAction ? [
        {
          action: successResponse.userAction,
          description: 'User action required',
        },
      ] : undefined,
    },
  };
}

// Import tool handlers
import * as migrationStageTools from './migration-stages.js';
import * as stateTools from './state.js';
import * as validationTools from './validation.js';
import * as packageTools from './packages.js';
import * as backupRestoreTools from './backup-restore.js';
import * as sessionTools from './session.js';
import * as breakingChangesTools from './breaking-changes.js';
import * as analysisPlanningTools from './analysis-planning.js';
import * as breakingChangesDetectionTools from './breaking-changes-detection.js';

/**
 * Register all tools with the MCP server
 * Uses modern registerTool API with Zod schemas for proper parameter validation
 */
export function registerTools(mcpServer: McpServer, sessionManager: SessionManager): void {
  const progressCallback: ProgressCallback = () => {};

  // ========================================
  // SESSION MANAGEMENT TOOLS
  // ========================================
  
  mcpServer.registerTool(
    'session_create',
    {
      title: 'Create Migration Session',
      description: `Create a new migration session for an Angular project. Returns sessionId required by all migration stage tools.

⚠️  CRITICAL: This tool REQUIRES the projectPath parameter - it cannot work without it!

REQUIRED PARAMETER:
- projectPath: Absolute path to the Angular project directory (must contain angular.json)

EXTRACTION INSTRUCTIONS FOR AI:
The user will mention a path in their message. You MUST extract it and provide it as the projectPath parameter.

Common path patterns:
- "(folder <path>)" → extract: <path>
- "at <path>" → extract: <path>
- "in <path>" → extract: <path>
- Unix/macOS/Linux: "/Users/..." or "/home/..." → extract the full absolute path
- Windows: "C:\\..." or "C:/..." or "D:\\..." → extract the full absolute path

❌ WRONG - DO NOT DO THIS:
session_create({})

✅ CORRECT - ALWAYS PROVIDE projectPath:
session_create({ "projectPath": "/Users/john/myapp" })
session_create({ "projectPath": "C:/Users/jane/myapp" })
session_create({ "projectPath": "C:\\\\Users\\\\jane\\\\myapp" })`,
      inputSchema: {
        projectPath: z.string().describe('REQUIRED: Absolute path to Angular project root directory. Must contain angular.json file. Extract this from the user\'s message - look for patterns like "(folder /path)", "at /path", "in /path". Examples: /Users/user1/project (Unix/macOS/Linux) or C:\\Users\\user1\\project or C:/Users/user1/project (Windows)'),
      },
    },
    async ({ projectPath }) => {
      const result = await sessionTools.handleSessionTool('session_create', { projectPath }, sessionManager);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'session_list',
    {
      title: 'List Migration Sessions',
      description: 'List all active migration sessions with their current state and progress',
      inputSchema: {},
    },
    async () => {
      const result = await sessionTools.handleSessionTool('session_list', {}, sessionManager);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'session_get',
    {
      title: 'Get Session Details',
      description: 'Get detailed information about a specific migration session including current stage and progress. If sessionId is not provided, uses the most recent active session.',
      inputSchema: {
        sessionId: z.string().optional().describe('Session ID returned from session_create (optional - uses most recent session if omitted)'),
      },
    },
    async ({ sessionId }) => {
      const result = await sessionTools.handleSessionTool('session_get', { sessionId }, sessionManager);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'session_delete',
    {
      title: 'Delete Migration Session',
      description: 'Delete a migration session and clean up its state',
      inputSchema: {
        sessionId: z.string().describe('Session ID to delete'),
      },
    },
    async ({ sessionId }) => {
      const result = await sessionTools.handleSessionTool('session_delete', { sessionId }, sessionManager);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ========================================
  // STAGE MANAGEMENT TOOLS
  // ========================================

  mcpServer.registerTool(
    'migration_stage_get_current',
    {
      title: 'Get Current Migration Stage',
      description: 'Get current stage information with progress and next step recommendation. If sessionId is not provided, uses the most recent active session.',
      inputSchema: {
        sessionId: z.string().optional().describe('Session ID (optional - uses most recent session if omitted)'),
      },
    },
    async ({ sessionId }) => {
      const result = await migrationStageTools.handleMigrationStageTool('migration_stage_get_current', { sessionId }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'migration_stage_skip_to',
    {
      title: 'Skip to Migration Stage',
      description: 'Jump to a specific stage by ID (bypasses sequential order validation)',
      inputSchema: {
        sessionId: z.string().describe('Session ID'),
        stageId: z.string().describe('Target stage ID (e.g., "migration_stage_v17")'),
      },
    },
    async ({ sessionId, stageId }) => {
      const result = await migrationStageTools.handleMigrationStageTool('migration_stage_skip_to', { sessionId, stageId }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'migration_stage_get_all',
    {
      title: 'List All Migration Stages',
      description: 'List all migration stages with status and recommended next action',
      inputSchema: {
        sessionId: z.string().optional().describe('Session ID (optional, omit for stage definitions only)'),
      },
    },
    async ({ sessionId }) => {
      const result = await migrationStageTools.handleMigrationStageTool('migration_stage_get_all', { sessionId }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'migration_stage_validate_node',
    {
      title: 'Validate Node.js Version',
      description: 'Validate Node.js version compatibility (v22 required for Angular 20)',
      inputSchema: {
        requiredMajor: z.number().optional().describe('Required Node.js major version (default: 22)'),
      },
    },
    async ({ requiredMajor }) => {
      const result = await migrationStageTools.handleMigrationStageTool('migration_stage_validate_node', { requiredMajor }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ========================================
  // STATE MANAGEMENT TOOLS
  // ========================================

  mcpServer.registerTool(
    'state_save_checkpoint',
    {
      title: 'Save State Checkpoint',
      description: 'Save current workflow state as a checkpoint',
      inputSchema: {
        sessionId: z.string().describe('Session ID'),
      },
    },
    async ({ sessionId }) => {
      const result = await stateTools.handleStateTool('state_save_checkpoint', { sessionId }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'state_load_checkpoint',
    {
      title: 'Load State Checkpoint',
      description: 'Load workflow state from a checkpoint',
      inputSchema: {
        sessionId: z.string().describe('Session ID'),
      },
    },
    async ({ sessionId }) => {
      const result = await stateTools.handleStateTool('state_load_checkpoint', { sessionId }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'state_delete_checkpoint',
    {
      title: 'Delete State Checkpoint',
      description: 'Delete a saved checkpoint',
      inputSchema: {
        sessionId: z.string().describe('Session ID'),
      },
    },
    async ({ sessionId }) => {
      const result = await stateTools.handleStateTool('state_delete_checkpoint', { sessionId }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'state_has_checkpoint',
    {
      title: 'Check Checkpoint Exists',
      description: 'Check if a checkpoint exists for a session',
      inputSchema: {
        sessionId: z.string().describe('Session ID'),
      },
    },
    async ({ sessionId }) => {
      const result = await stateTools.handleStateTool('state_has_checkpoint', { sessionId }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ========================================
  // VALIDATION TOOLS
  // ========================================

  mcpServer.registerTool(
    'validate_project',
    {
      title: 'Validate Angular Project',
      description: 'Validate Angular project structure and configuration',
      inputSchema: {
        projectPath: z.string().describe('Path to Angular project'),
      },
    },
    async ({ projectPath }) => {
      const result = await validationTools.handleValidationTool('validate_project', { projectPath }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'validate_node_version',
    {
      title: 'Validate Node.js Version Compatibility',
      description: 'Validate Node.js version compatibility for Angular version',
      inputSchema: {
        angularVersion: z.string().describe('Angular version to validate against'),
      },
    },
    async ({ angularVersion }) => {
      const result = await validationTools.handleValidationTool('validate_node_version', { angularVersion }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'validate_dependencies',
    {
      title: 'Validate Dependencies',
      description: 'Validate package.json dependencies for compatibility',
      inputSchema: {
        projectPath: z.string().describe('Path to Angular project'),
        targetVersion: z.string().describe('Target Angular version'),
      },
    },
    async ({ projectPath, targetVersion }) => {
      const result = await validationTools.handleValidationTool('validate_dependencies', { projectPath, targetVersion }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'validate_material_mdc_readiness',
    {
      title: 'Validate Material MDC Migration Readiness',
      description: `Validate project readiness for Angular Material v15 MDC (Material Design Components) migration.

Performs comprehensive pre-flight checks for Material breaking changes:
- CRITICAL: Detects floatLabel="never" (blocks MDC migration)
- CRITICAL: Detects appearance="standard" (blocks MDC migration)
- WARNING: Detects mat-tab-nav-bar without [tabPanel] binding
- WARNING: Detects Material Slider usage (requires manual migration)
- INFO: Detects legacy Material CSS classes (mat-* → mat-mdc-*)

Returns detailed report with affected files, recommended actions, and next steps.

Use this BEFORE upgrading to Angular 15 to identify blocking issues.`,
      inputSchema: {
        projectPath: z.string().describe('Path to Angular project root directory'),
      },
    },
    async ({ projectPath }) => {
      const result = await validationTools.handleValidationTool('validate_material_mdc_readiness', { projectPath }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ========================================
  // PACKAGE MANAGEMENT TOOLS
  // ========================================

  mcpServer.registerTool(
    'packages_get_compatibility',
    {
      title: 'Get Package Compatibility Matrix',
      description: 'Get package compatibility matrix for Angular versions',
      inputSchema: {
        angularVersion: z.string().describe('Angular version (e.g., "20")'),
      },
    },
    async ({ angularVersion }) => {
      const result = await packageTools.handlePackageTool('packages_get_compatibility', { angularVersion }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'packages_check_updates',
    {
      title: 'Check Package Updates',
      description: 'Check for available package updates',
      inputSchema: {
        projectPath: z.string().describe('Path to Angular project'),
      },
    },
    async ({ projectPath }) => {
      const result = await packageTools.handlePackageTool('packages_check_updates', { projectPath }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'packages_get_breaking_changes',
    {
      title: 'Get Package Breaking Changes',
      description: 'Get breaking changes for package version upgrades based on package.json',
      inputSchema: {
        projectPath: z.string().describe('Path to Angular project'),
        fromVersion: z.string().describe('Current Angular version (e.g., "14")'),
        toVersion: z.string().describe('Target Angular version (e.g., "20")'),
      },
    },
    async ({ projectPath, fromVersion, toVersion }) => {
      const result = await packageTools.handlePackageTool('packages_get_breaking_changes', { projectPath, fromVersion, toVersion }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ========================================
  // BREAKING CHANGES TOOLS
  // ========================================

  mcpServer.registerTool(
    'breaking_changes_fix',
    {
      title: 'Fix Breaking Changes',
      description: 'Apply automated fixes for Angular version-specific breaking changes. Runs shell scripts that fix common breaking changes for Angular 16, 17, 19, and 20.',
      inputSchema: {
        sessionId: z.string().optional().describe('Migration session ID (optional - uses most recent session if omitted)'),
        targetVersion: z.string().describe('Angular version to fix breaking changes for (e.g., "16", "17", "19", "20")'),
        dryRun: z.boolean().optional().describe('If true, shows what would be fixed without making changes (default: false)'),
      },
    },
    async ({ sessionId, targetVersion, dryRun }) => {
      const result = await breakingChangesTools.handleBreakingChangesTool('breaking_changes_fix', { sessionId, targetVersion, dryRun }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'breaking_changes_list_available',
    {
      title: 'List Available Breaking Changes Fixes',
      description: 'List all available breaking changes fix scripts and which Angular versions they support',
      inputSchema: {},
    },
    async () => {
      const result = await breakingChangesTools.handleBreakingChangesTool('breaking_changes_list_available', {}, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ========================================
  // ANALYSIS & PLANNING TOOLS (New from spec)
  // ========================================

  mcpServer.registerTool(
    'analyze_project_version',
    {
      title: 'Analyze Project Version',
      description: 'Detect current Angular version and determine upgrade path',
      inputSchema: {
        projectPath: z.string().optional().describe('Path to Angular project (defaults to current directory)'),
      },
    },
    async ({ projectPath }) => {
      const result = await analysisPlanningTools.handleAnalysisPlanningTool('analyze_project_version', { projectPath }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'check_migration_prerequisites',
    {
      title: 'Check Migration Prerequisites',
      description: 'Validate project is ready for migration',
      inputSchema: {
        projectPath: z.string().optional().describe('Path to project (defaults to current directory)'),
        targetVersion: z.string().describe('Target Angular version (e.g., "20")'),
      },
    },
    async ({ projectPath, targetVersion }) => {
      const result = await analysisPlanningTools.handleAnalysisPlanningTool('check_migration_prerequisites', { projectPath, targetVersion }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'generate_migration_plan',
    {
      title: 'Generate Migration Plan',
      description: 'Create comprehensive step-by-step migration plan',
      inputSchema: {
        fromVersion: z.string().describe('Source Angular version (e.g., "15")'),
        toVersion: z.string().describe('Target Angular version (e.g., "20")'),
        includeOptional: z.boolean().optional().describe('Include optional migrations (default: false)'),
      },
    },
    async ({ fromVersion, toVersion, includeOptional }) => {
      const result = await analysisPlanningTools.handleAnalysisPlanningTool('generate_migration_plan', { fromVersion, toVersion, includeOptional }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ========================================
  // BREAKING CHANGES DETECTION TOOLS (New from spec)
  // ========================================

  mcpServer.registerTool(
    'detect_breaking_changes',
    {
      title: 'Detect Breaking Changes',
      description: 'Scan codebase for version-specific breaking changes using AST analysis',
      inputSchema: {
        fromVersion: z.string().describe('Source Angular version (e.g., "17")'),
        toVersion: z.string().describe('Target Angular version (e.g., "18")'),
        projectPath: z.string().optional().describe('Path to project (defaults to current directory)'),
      },
    },
    async ({ fromVersion, toVersion, projectPath }) => {
      const result = await breakingChangesDetectionTools.handleBreakingChangesDetectionTool('detect_breaking_changes', { fromVersion, toVersion, projectPath }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'get_breaking_changes_documentation',
    {
      title: 'Get Breaking Changes Documentation',
      description: 'Retrieve version-specific breaking changes documentation',
      inputSchema: {
        version: z.string().describe('Angular version (e.g., "18")'),
      },
    },
    async ({ version }) => {
      const result = await breakingChangesDetectionTools.handleBreakingChangesDetectionTool('get_breaking_changes_documentation', { version }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ========================================
  // BACKUP AND RESTORE TOOLS
  // ========================================

  mcpServer.registerTool(
    'migration_backup',
    {
      title: 'Create Project Backup',
      description: 'Create a backup of the Angular project (optional, can be done at any time)',
      inputSchema: {
        sessionId: z.string().describe('Session ID'),
        backupName: z.string().optional().describe('Custom backup name (optional, auto-generated if not provided)'),
        skipNodeModules: z.boolean().optional().describe('Skip backing up node_modules (default: true, recommended)'),
        skipGit: z.boolean().optional().describe('Skip backing up .git directory (default: false, keeps version history)'),
        skipDist: z.boolean().optional().describe('Skip backing up dist directory (default: true)'),
        skipCoverage: z.boolean().optional().describe('Skip backing up coverage directory (default: true)'),
      },
    },
    async ({ sessionId, backupName, skipNodeModules, skipGit, skipDist, skipCoverage }) => {
      const result = await backupRestoreTools.handleBackupRestoreTool('migration_backup', { sessionId, backupName, skipNodeModules, skipGit, skipDist, skipCoverage }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'migration_restore',
    {
      title: 'Restore Project from Backup',
      description: 'Restore the Angular project from a backup',
      inputSchema: {
        sessionId: z.string().describe('Session ID'),
        backupPath: z.string().optional().describe('Absolute path to backup directory (use this OR backupName)'),
        backupName: z.string().optional().describe('Backup name from .migration-backups (use this OR backupPath)'),
        force: z.boolean().optional().describe('Force restore even if backup metadata is missing (default: false)'),
        createSafetyBackup: z.boolean().optional().describe('Create safety backup of current state before restoring (default: true, recommended)'),
        preserveGit: z.boolean().optional().describe('Preserve .git directory during restore (default: true)'),
        reinstallDependencies: z.boolean().optional().describe('Reinstall node_modules after restore (default: true)'),
      },
    },
    async ({ sessionId, backupPath, backupName, force, createSafetyBackup, preserveGit, reinstallDependencies }) => {
      const result = await backupRestoreTools.handleBackupRestoreTool('migration_restore', { sessionId, backupPath, backupName, force, createSafetyBackup, preserveGit, reinstallDependencies }, sessionManager, progressCallback);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Set up CallToolRequestSchema handler on underlying Server for backward compatibility
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
      } else if (name.startsWith('breaking_changes_')) {
        result = await breakingChangesTools.handleBreakingChangesTool(name, toolArgs, sessionManager, progressCallback);
      } else if (name === 'analyze_project_version' || name === 'check_migration_prerequisites' || name === 'generate_migration_plan') {
        const standardResult = await analysisPlanningTools.handleAnalysisPlanningTool(name, toolArgs, sessionManager, progressCallback);
        result = convertToLegacyFormat(standardResult);
      } else if (name === 'detect_breaking_changes' || name === 'get_breaking_changes_documentation') {
        const standardResult = await breakingChangesDetectionTools.handleBreakingChangesDetectionTool(name, toolArgs, sessionManager, progressCallback);
        result = convertToLegacyFormat(standardResult);
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

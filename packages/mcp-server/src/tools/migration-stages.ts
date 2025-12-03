/**
 * Stage-Based Migration Tool Handlers
 *
 * Implements 12 stage-specific MCP tools following SOLID principles:
 * - 7 core migration stage tools (pre-migration, v15-v20, post-migration)
 * - 1 optional feature migration tool (standalone components)
 * - 4 stage management tools (get_current, skip_to, get_all, validate_node)
 *
 * Architecture:
 * - Single Responsibility: Each tool has one clear purpose
 * - DRY: Shared validation and error handling
 * - Cross-platform: Windows/macOS/Linux support via platform utilities
 * - Node validation: Validates Node.js v22 before execution
 */

import { SessionManager } from '../session/manager.js';
import { ToolResult } from '../types.js';
import {
  validateNodeVersion,
  getNodeVersionError,
  getPlatform,
  ANGULAR_MIGRATION_STAGES,
  OPTIONAL_FEATURE_MIGRATIONS,
  ALL_MIGRATION_STAGES,
  getNextRecommendedStage,
  getAvailableOptionalStages,
  type StageDefinition,
  type StageExecutionOptions,
  type StageExecutionResult,
} from '@angular-migration/workflow-engine';

/**
 * Read-only tools that don't require Node validation or execution
 */
const READ_ONLY_TOOLS = [
  'migration_stage_get_current',
  'migration_stage_get_all',
  'migration_stage_validate_node',
];

/**
 * Main handler function - routes tool calls to specific implementations
 */
export async function handleMigrationStageTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  // 1. VALIDATE NODE VERSION (unless it's a read-only tool)
  if (!READ_ONLY_TOOLS.includes(toolName)) {
    const nodeValidation = validateNodeVersion(22);
    if (!nodeValidation.valid) {
      return {
        success: false,
        error: 'Node.js version mismatch',
        details: {
          required: nodeValidation.requiredVersion,
          current: nodeValidation.currentVersion,
        },
        message: getNodeVersionError(nodeValidation),
        nextStep: {
          action: 'Install Node.js v22',
          description: 'Install the required Node.js version and retry',
          reasoning: 'Angular 20 requires Node.js v22 for optimal compatibility',
        },
      };
    }
  }

  // 2. Route to appropriate handler
  switch (toolName) {
    // Core migration stage tools (7 tools)
    case 'migration_stage_pre_migration':
      return executeStage('migration_stage_pre_migration', args, sessionManager);
    case 'migration_stage_v15':
      return executeStage('migration_stage_v15', args, sessionManager);
    case 'migration_stage_v16':
      return executeStage('migration_stage_v16', args, sessionManager);
    case 'migration_stage_v17':
      return executeStage('migration_stage_v17', args, sessionManager);
    case 'migration_stage_v18':
      return executeStage('migration_stage_v18', args, sessionManager);
    case 'migration_stage_v19':
      return executeStage('migration_stage_v19', args, sessionManager);
    case 'migration_stage_v20':
      return executeStage('migration_stage_v20', args, sessionManager);
    case 'migration_stage_post_migration':
      return executeStage('migration_stage_post_migration', args, sessionManager);

    // Optional feature migration tool (1 tool)
    case 'migration_feature_standalone':
      return executeFeatureStandalone(args, sessionManager);

    // Stage management tools (4 tools)
    case 'migration_stage_get_current':
      return stageGetCurrent(args, sessionManager);
    case 'migration_stage_skip_to':
      return stageSkipTo(args, sessionManager);
    case 'migration_stage_get_all':
      return stageGetAll(args, sessionManager);
    case 'migration_stage_validate_node':
      return validateNodeVersionTool(args, sessionManager);

    default:
      return {
        success: false,
        error: `Unknown migration tool: ${toolName}`,
      };
  }
}

/**
 * Execute a migration stage (DRY implementation for all 7 core stages)
 */
async function executeStage(
  stageId: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;

  // Validate session exists
  if (!sessionId) {
    return {
      success: false,
      error: 'Missing required parameter: sessionId',
      nextStep: {
        action: 'Create a session first',
        description: 'Use workflow_start or create a migration session',
        reasoning: 'A session is required to track migration state',
      },
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
      nextStep: {
        action: 'Create a new session',
        description: 'The specified session does not exist',
        reasoning: 'Sessions may have expired or been deleted',
      },
    };
  }

  // Get stage definition
  const stage = session.engine.getStageById(stageId);
  if (!stage) {
    return {
      success: false,
      error: `Stage not found: ${stageId}`,
    };
  }

  // Validate current stage matches requested stage
  const currentStage = session.engine.getCurrentStage();
  if (currentStage?.id !== stageId) {
    return {
      success: false,
      error: `Cannot execute stage ${stage.name}. Current stage is ${currentStage?.name || 'unknown'}`,
      details: {
        requestedStage: stageId,
        currentStage: currentStage?.id || 'none',
      },
      troubleshooting: {
        likelyCause: 'Stage execution must follow sequential order',
        suggestedFixes: [
          `Use migration_stage_skip_to to jump to ${stage.name}`,
          'Complete the current stage first',
          'Use migration_stage_get_current to see current status',
        ],
        relatedDocs: [],
        canRetry: false,
        canRollback: false,
      },
      nextStep: {
        action: 'migration_stage_get_current',
        description: 'Check current stage and progress',
        reasoning: 'Need to understand current position in migration workflow',
      },
    };
  }

  // Build execution options from args
  const options: StageExecutionOptions = {
    skipValidations: args.skipValidations === true,
    autoConfirm: args.autoConfirm === true,
    continueOnError: args.continueOnError === true,
  };

  // Execute the stage
  try {
    const startTime = Date.now();
    const result: StageExecutionResult = await session.engine.executeStage(stageId, options);
    const duration = Date.now() - startTime;

    // Handle confirmation pause
    if (result.requiresConfirmation) {
      return {
        success: true,
        data: {
          requiresConfirmation: true,
          message: result.confirmationMessage,
          stage: stageId,
          completedSteps: result.results.filter((r) => r.success).length,
        },
        message: 'Stage execution paused for confirmation',
        nextStep: {
          action: `Confirm and call ${stageId} again`,
          description: 'Review the proposed changes and confirm to proceed',
          reasoning: 'This stage requires user confirmation before proceeding',
        },
      };
    }

    // Handle success
    if (result.success) {
      const completedStageIds = new Set<string>(
        session.engine.getState().completedSteps
          .map((stepId: string) => {
            // Find which stage this step belongs to
            for (const s of ALL_MIGRATION_STAGES) {
              const steps = session.engine.getStageSteps(s.id);
              if (steps.some((step) => step.id === stepId)) {
                return s.id;
              }
            }
            return null;
          })
          .filter((id: string | null): id is string => id !== null)
      );

      const nextStage = getNextRecommendedStage(stageId, completedStageIds);
      const optionalStages = getAvailableOptionalStages(completedStageIds);

      return {
        success: true,
        data: {
          stage: stage.name,
          stageId,
          results: result.results,
          duration,
        },
        message: `Stage ${stage.name} completed successfully`,
        nextStep: nextStage
          ? {
              action: nextStage.id,
              description: `Proceed with ${nextStage.name}`,
              reasoning: `${stage.name} is complete. Next major version is ${nextStage.version || 'N/A'}`,
              optional: optionalStages.map((s) => ({
                action: s.id,
                description: s.description,
              })),
            }
          : {
              action: 'migration_stage_post_migration',
              description: 'Generate final migration report',
              reasoning: 'All migration stages complete',
            },
      };
    }

    // Handle failure
    return {
      success: false,
      error: `Stage ${stage.name} failed`,
      details: {
        stage: stageId,
        failedStep: result.failedStep,
        results: result.results,
        duration,
      },
      troubleshooting: {
        likelyCause: result.error || 'Step execution failed',
        suggestedFixes: [
          'Review error output from failed step',
          'Fix issues and retry the stage',
          'Use state_load_checkpoint to restore previous state if needed',
        ],
        relatedDocs: [
          'https://update.angular.io',
          'https://angular.io/guide/update-to-latest-version',
        ],
        canRetry: true,
        canRollback: true,
      },
      nextStep: {
        action: `Fix issues and retry ${stageId}`,
        description: 'Resolve the errors and call this stage again',
        reasoning: 'The stage can be retried from the last successful checkpoint',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Exception during stage execution: ${errorMessage}`,
      details: {
        stage: stageId,
      },
      nextStep: {
        action: 'Review error and retry',
        description: 'Fix the issue and retry the stage',
        reasoning: 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Execute optional standalone components migration
 */
async function executeFeatureStandalone(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;

  if (!sessionId) {
    return {
      success: false,
      error: 'Missing required parameter: sessionId',
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
    };
  }

  // Check if v15 is completed (minimum requirement)
  const v15Status = session.engine.getStageStatus('migration_stage_v15');
  if (v15Status !== 'completed') {
    return {
      success: false,
      error: 'Standalone components migration requires Angular 15 or higher',
      details: {
        currentStatus: v15Status,
        requiredStage: 'migration_stage_v15',
      },
      troubleshooting: {
        likelyCause: 'Angular 15 migration not yet completed',
        suggestedFixes: [
          'Complete migration_stage_v15 first',
          'Standalone components feature was introduced in Angular 15',
        ],
        relatedDocs: [
          'https://angular.io/guide/standalone-components',
        ],
        canRetry: false,
        canRollback: false,
      },
      nextStep: {
        action: 'migration_stage_v15',
        description: 'Complete Angular 15 upgrade first',
        reasoning: 'Standalone components require Angular 15+',
      },
    };
  }

  // Execute standalone migration stage
  const stageId = 'migration_feature_standalone';
  const options: StageExecutionOptions = {
    skipValidations: args.skipValidations === true,
    autoConfirm: args.autoConfirm === true,
    continueOnError: args.continueOnError === true,
  };

  try {
    const startTime = Date.now();
    const result = await session.engine.executeStage(stageId, options);
    const duration = Date.now() - startTime;

    if (result.requiresConfirmation) {
      return {
        success: true,
        data: {
          requiresConfirmation: true,
          message: result.confirmationMessage,
          stage: stageId,
        },
        message: 'Standalone migration paused for confirmation',
        nextStep: {
          action: 'Confirm and retry',
          description: 'Review changes and confirm',
          reasoning: 'Standalone migration requires confirmation',
        },
      };
    }

    if (result.success) {
      return {
        success: true,
        data: {
          stage: 'Standalone Components Migration',
          stageId,
          results: result.results,
          duration,
        },
        message: 'Standalone components migration completed successfully',
        nextStep: {
          action: 'Continue with main migration sequence',
          description: 'Return to the main Angular version upgrade sequence',
          reasoning: 'Optional feature migration complete',
        },
      };
    }

    return {
      success: false,
      error: 'Standalone migration failed',
      details: {
        failedStep: result.failedStep,
        results: result.results,
      },
      nextStep: {
        action: 'Fix issues and retry',
        description: 'Resolve errors and retry standalone migration',
        reasoning: 'Migration can be retried',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Exception during standalone migration: ${errorMessage}`,
    };
  }
}

/**
 * Get current stage information with progress
 */
async function stageGetCurrent(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;

  if (!sessionId) {
    return {
      success: false,
      error: 'Missing required parameter: sessionId',
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
    };
  }

  const currentStage = session.engine.getCurrentStage();
  if (!currentStage) {
    return {
      success: true,
      data: {
        currentStage: null,
        message: 'No current stage (workflow may be complete or not started)',
      },
      nextStep: {
        action: 'migration_stage_get_all',
        description: 'View all stages to understand workflow status',
        reasoning: 'No active stage found',
      },
    };
  }

  const progress = session.engine.getStageProgress(currentStage.id);
  const status = session.engine.getStageStatus(currentStage.id);

  return {
    success: true,
    data: {
      stage: currentStage,
      progress,
      status,
      currentStep: session.engine.getCurrentStep(),
    },
    message: `Current stage: ${currentStage.name}`,
    nextStep: {
      action: currentStage.id,
      description: `Execute ${currentStage.name}`,
      reasoning: 'This is the next stage in the migration sequence',
    },
  };
}

/**
 * Skip to a specific stage by ID
 */
async function stageSkipTo(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;
  const stageId = args.stageId as string;

  if (!sessionId || !stageId) {
    return {
      success: false,
      error: 'Missing required parameters: sessionId, stageId',
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
    };
  }

  const stage = session.engine.getStageById(stageId);
  if (!stage) {
    return {
      success: false,
      error: `Stage not found: ${stageId}`,
      troubleshooting: {
        likelyCause: 'Invalid stage ID',
        suggestedFixes: [
          'Use migration_stage_get_all to see available stages',
          'Check stage ID spelling',
        ],
        relatedDocs: [],
        canRetry: false,
        canRollback: false,
      },
    };
  }

  const success = session.engine.skipToStage(stageId);
  if (success) {
    return {
      success: true,
      data: {
        stage,
        newCurrentStep: session.engine.getCurrentStep(),
      },
      message: `Skipped to stage: ${stage.name}`,
      nextStep: {
        action: stageId,
        description: `Execute ${stage.name}`,
        reasoning: 'Successfully navigated to requested stage',
      },
    };
  }

  return {
    success: false,
    error: `Failed to skip to stage: ${stageId}`,
    nextStep: {
      action: 'migration_stage_get_current',
      description: 'Check current position',
      reasoning: 'Skip operation failed',
    },
  };
}

/**
 * Get all stages with status information
 */
async function stageGetAll(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string | undefined;

  // If no session provided, return stage definitions only
  if (!sessionId) {
    return {
      success: true,
      data: {
        coreStages: ANGULAR_MIGRATION_STAGES,
        optionalFeatures: OPTIONAL_FEATURE_MIGRATIONS,
        allStages: ALL_MIGRATION_STAGES,
      },
      message: 'All available migration stages',
      nextStep: {
        action: 'Create a session to track progress',
        description: 'Use workflow_start to begin migration',
        reasoning: 'No session provided - showing stage definitions only',
      },
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
    };
  }

  // Get status for all stages
  const stagesWithStatus = ALL_MIGRATION_STAGES.map((stage) => {
    const status = session.engine.getStageStatus(stage.id);
    const progress = session.engine.getStageProgress(stage.id);
    return {
      ...stage,
      status,
      progress,
    };
  });

  const currentStage = session.engine.getCurrentStage();
  const completedStageIds = new Set<string>(
    stagesWithStatus.filter((s) => s.status === 'completed').map((s) => s.id)
  );
  const nextStage = currentStage ? getNextRecommendedStage(currentStage.id, completedStageIds) : null;

  return {
    success: true,
    data: {
      stages: stagesWithStatus,
      currentStage,
      totalStages: ALL_MIGRATION_STAGES.length,
      completedStages: stagesWithStatus.filter((s) => s.status === 'completed').length,
    },
    message: 'All migration stages with status',
    nextStep: nextStage
      ? {
          action: nextStage.id,
          description: `Proceed with ${nextStage.name}`,
          reasoning: 'Next recommended stage in sequence',
        }
      : {
          action: 'Review completed stages',
          description: 'All stages complete or waiting for next action',
          reasoning: 'No clear next stage',
        },
  };
}

/**
 * Validate Node.js version without executing anything
 */
async function validateNodeVersionTool(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const requiredMajor = (args.requiredMajor as number) || 22;
  const validation = validateNodeVersion(requiredMajor);

  if (validation.valid) {
    return {
      success: true,
      data: {
        valid: true,
        currentVersion: validation.currentVersion,
        requiredVersion: validation.requiredVersion,
        platform: getPlatform(),
      },
      message: `Node.js version ${validation.currentVersion} is compatible`,
      nextStep: {
        action: 'Proceed with migration',
        description: 'Node.js version meets requirements',
        reasoning: 'Version validation passed',
      },
    };
  }

  return {
    success: false,
    error: 'Node.js version mismatch',
    data: {
      valid: false,
      currentVersion: validation.currentVersion,
      requiredVersion: validation.requiredVersion,
      platform: getPlatform(),
      installInstructions: validation.installInstructions,
    },
    message: getNodeVersionError(validation),
    nextStep: {
      action: 'Install Node.js v22',
      description: 'Install the required Node.js version',
      reasoning: 'Current version does not meet requirements',
    },
  };
}

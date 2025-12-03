/**
 * Workflow Management Tools
 * Handles workflow start, step execution, status tracking
 */

import { SessionManager } from '../session/manager.js';
import { ToolResult, SessionInfo, MigrationPlan } from '../types.js';
import { ANGULAR_MIGRATION_WORKFLOW } from '@angular-migration/workflow-engine';

export async function handleWorkflowTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  switch (toolName) {
    case 'workflow_start':
      return await workflowStart(args, sessionManager);
    case 'workflow_step_next':
      return await workflowStepNext(args, sessionManager);
    case 'workflow_step_skip':
      return await workflowStepSkip(args, sessionManager);
    case 'workflow_get_plan':
      return await workflowGetPlan(args);
    case 'workflow_get_status':
      return await workflowGetStatus(args, sessionManager);
    case 'workflow_list_sessions':
      return await workflowListSessions(sessionManager);
    default:
      return {
        success: false,
        error: `Unknown workflow tool: ${toolName}`,
      };
  }
}

async function workflowStart(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const projectPath = args.projectPath as string;
  const currentVersion = (args.currentVersion as string) || undefined;
  const targetVersion = (args.targetVersion as string) || '20';
  const skipTests = (args.skipTests as boolean) || false;
  const skipLint = (args.skipLint as boolean) || false;
  const autoConfirm = (args.autoConfirm as boolean) || false;

  if (!projectPath) {
    return {
      success: false,
      error: 'projectPath is required',
    };
  }

  try {
    const session = sessionManager.createSession(projectPath, {
      currentVersion,
      targetVersion,
      skipTests,
      skipLint,
      autoConfirm,
    });

    // Check for existing checkpoint
    const hasCheckpoint = await sessionManager.hasCheckpoint(session.id);
    let checkpointMessage = '';

    if (hasCheckpoint) {
      checkpointMessage = '\n\n⚠️ Found existing checkpoint for this project. Use state_load_checkpoint to resume.';
    }

    return {
      success: true,
      data: {
        sessionId: session.id,
        projectPath: session.projectPath,
        currentVersion: session.context.currentVersion,
        targetVersion: session.context.targetVersion,
        totalSteps: ANGULAR_MIGRATION_WORKFLOW.length,
        hasCheckpoint,
      },
      message: `Migration session created: ${session.id}${checkpointMessage}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function workflowStepNext(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;

  if (!sessionId) {
    return {
      success: false,
      error: 'sessionId is required',
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
    };
  }

  try {
    const currentStep = session.engine.getCurrentStep();
    if (!currentStep) {
      return {
        success: false,
        error: 'No current step available. Workflow may be complete.',
      };
    }

    // Execute the current step (delegate to Copilot for auto-fix)
    const result = {
      step: {
        id: currentStep.id,
        title: currentStep.title,
        description: currentStep.description,
        version: currentStep.version,
        requiresConfirmation: currentStep.requiresConfirmation,
      },
      actions: currentStep.actions.map(action => ({
        type: action.type,
        description: action.description,
        command: action.command,
      })),
      validations: currentStep.validations?.map(validation => ({
        description: validation.description,
      })) || [],
    };

    return {
      success: true,
      data: result,
      message: `Step ready: ${currentStep.title}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function workflowStepSkip(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;
  const reason = (args.reason as string) || 'No reason provided';

  if (!sessionId) {
    return {
      success: false,
      error: 'sessionId is required',
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
    };
  }

  try {
    const currentStep = session.engine.getCurrentStep();
    if (!currentStep) {
      return {
        success: false,
        error: 'No current step to skip',
      };
    }

    // Skip to next step
    const state = session.engine.getState();
    session.engine.skipToStep(state.currentStepIndex + 1);

    return {
      success: true,
      data: {
        skippedStep: currentStep.title,
        reason,
      },
      message: `Skipped step: ${currentStep.title}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function workflowGetPlan(args: Record<string, unknown>): Promise<ToolResult> {
  const targetVersion = (args.targetVersion as string) || '20';

  try {
    const plan: MigrationPlan = {
      totalSteps: ANGULAR_MIGRATION_WORKFLOW.length,
      estimatedDuration: '2-4 hours',
      steps: ANGULAR_MIGRATION_WORKFLOW.map(step => ({
        id: step.id,
        title: step.title,
        version: step.version,
        description: step.description,
        requiresConfirmation: step.requiresConfirmation,
      })),
    };

    return {
      success: true,
      data: plan,
      message: `Migration plan for Angular ${targetVersion} (${plan.totalSteps} steps)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function workflowGetStatus(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;

  if (!sessionId) {
    return {
      success: false,
      error: 'sessionId is required',
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
    };
  }

  try {
    const state = session.engine.getState();
    const hasCheckpoint = await sessionManager.hasCheckpoint(sessionId);

    const status: SessionInfo = {
      id: session.id,
      projectPath: session.projectPath,
      currentVersion: session.context.currentVersion,
      targetVersion: session.context.targetVersion,
      currentStepIndex: state.currentStepIndex,
      totalSteps: ANGULAR_MIGRATION_WORKFLOW.length,
      completedSteps: state.completedSteps.length,
      hasCheckpoint,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
    };

    return {
      success: true,
      data: status,
      message: `Session status: ${status.completedSteps}/${status.totalSteps} steps completed`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function workflowListSessions(
  sessionManager: SessionManager
): Promise<ToolResult> {
  try {
    const sessions = sessionManager.listSessions();

    const sessionList = sessions.map(session => ({
      id: session.id,
      projectPath: session.projectPath,
      targetVersion: session.context.targetVersion,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        count: sessions.length,
        sessions: sessionList,
      },
      message: `Found ${sessions.length} active session(s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

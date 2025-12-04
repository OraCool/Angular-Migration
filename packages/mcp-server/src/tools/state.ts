/**
 * State Management Tools
 * Handles checkpoint save/load/delete operations
 */

import { SessionManager } from '../session/manager.js';
import { ToolResult, ProgressCallback } from '../types.js';

export async function handleStateTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback?: ProgressCallback
): Promise<ToolResult> {
  switch (toolName) {
    case 'state_save_checkpoint':
      return await stateSaveCheckpoint(args, sessionManager);
    case 'state_load_checkpoint':
      return await stateLoadCheckpoint(args, sessionManager);
    case 'state_delete_checkpoint':
      return await stateDeleteCheckpoint(args, sessionManager);
    case 'state_has_checkpoint':
      return await stateHasCheckpoint(args, sessionManager);
    default:
      return {
        success: false,
        error: `Unknown state tool: ${toolName}`,
      };
  }
}

async function stateSaveCheckpoint(
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
    await sessionManager.saveSessionState(sessionId, state, session.context);

    return {
      success: true,
      data: {
        sessionId,
        currentStepIndex: state.currentStepIndex,
        completedSteps: state.completedSteps.length,
      },
      message: 'Checkpoint saved successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function stateLoadCheckpoint(
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

  try {
    const state = await sessionManager.loadSessionState(sessionId);

    if (!state) {
      return {
        success: false,
        error: `No checkpoint found for session: ${sessionId}`,
      };
    }

    // Get or create session
    let session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Session not found: ${sessionId}. Create a new session first.`,
      };
    }

    // Restore state by calling skipToStep
    session.engine.skipToStep(state.currentStepIndex);

    return {
      success: true,
      data: {
        sessionId,
        currentStepIndex: state.currentStepIndex,
        completedSteps: state.completedSteps.length,
        backupPath: state.backupPath,
      },
      message: 'Checkpoint loaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function stateDeleteCheckpoint(
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

  try {
    await sessionManager.deleteCheckpoint(sessionId);

    return {
      success: true,
      data: { sessionId },
      message: 'Checkpoint deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function stateHasCheckpoint(
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

  try {
    const hasCheckpoint = await sessionManager.hasCheckpoint(sessionId);

    return {
      success: true,
      data: {
        sessionId,
        hasCheckpoint,
      },
      message: hasCheckpoint
        ? 'Checkpoint exists'
        : 'No checkpoint found',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

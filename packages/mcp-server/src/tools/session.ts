/**
 * Session Management Tools
 * Handles session creation, listing, and deletion
 */

import path from 'path';
import { SessionManager } from '../session/manager.js';
import { ToolResult, ProgressCallback } from '../types.js';

export async function handleSessionTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback?: ProgressCallback
): Promise<ToolResult> {
  switch (toolName) {
    case 'session_create':
      return await sessionCreate(args, sessionManager, progressCallback);
    case 'session_list':
      return await sessionList(sessionManager);
    case 'session_get':
      return await sessionGet(args, sessionManager);
    case 'session_delete':
      return await sessionDelete(args, sessionManager);
    default:
      return {
        success: false,
        error: `Unknown session tool: ${toolName}`,
      };
  }
}

/**
 * Create a new migration session
 */
async function sessionCreate(
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback?: ProgressCallback
): Promise<ToolResult> {
  // Check if projectPath was provided
  let projectPath = args.projectPath as string;

  // Log for debugging
  console.error('[session_create] Received args:', JSON.stringify(args, null, 2));
  console.error('[session_create] Extracted projectPath:', projectPath);

  if (!projectPath) {
    // No path provided - return helpful error with extraction instructions
    return {
      success: false,
      error: 'Missing required parameter: projectPath',
      message: `
⚠️  Project Path Required - You MUST Extract It From User's Message

🔍 CRITICAL ISSUE:
You called session_create without the required projectPath parameter.
Received: ${JSON.stringify(args)}
Expected: An object with a "projectPath" property

📋 WHAT YOU NEED TO DO NOW:
1. Re-read the user's original message
2. Find the project path in their message
3. Call this tool again with the path as the projectPath parameter

✅ CORRECT USAGE EXAMPLES:

Unix/macOS/Linux:
{
  "projectPath": "/Users/username/dev/my-angular-app"
}

Windows:
{
  "projectPath": "C:\\\\Users\\\\username\\\\dev\\\\my-angular-app"
}
or
{
  "projectPath": "C:/Users/username/dev/my-angular-app"
}

❌ WRONG - What you just did:
${JSON.stringify(args)}

EXTRACTION PATTERNS:

User message: "migrate angular application (folder /Users/john/projects/my-app) from version 14 to 15"
→ Extract: /Users/john/projects/my-app
→ Call: session_create({ "projectPath": "/Users/john/projects/my-app" })

User message: "migrate angular project at C:\\\\dev\\\\my-app from v14 to v15"
→ Extract: C:\\\\dev\\\\my-app
→ Call: session_create({ "projectPath": "C:\\\\dev\\\\my-app" })

User message: "help me migrate the app in C:/projects/angular-app"
→ Extract: C:/projects/angular-app
→ Call: session_create({ "projectPath": "C:/projects/angular-app" })
      `.trim(),
      details: {
        missingParameter: 'projectPath',
        receivedArgs: args,
        extractionHint: 'Look for path patterns in user message: (folder <path>), at <path>, in <path>. Unix paths start with /, Windows paths start with drive letter (C:, D:, etc.)',
        expectedFormat: 'Absolute path - Unix: /Users/name/path/to/project, Windows: C:\\\\path\\\\to\\\\project or C:/path/to/project',
        mustContain: 'angular.json file',
      },
    };
  }
  
  // Validate it's an Angular project
  const fs = await import('fs/promises');
  const angularJsonPath = path.join(projectPath, 'angular.json');
  
  try {
    await fs.access(angularJsonPath);
  } catch {
    return {
      success: false,
      error: `Not a valid Angular project: ${projectPath}`,
      message: `
⚠️  Invalid Project Path

The path you provided does not contain an angular.json file:
  Path checked: ${projectPath}
  Looking for: ${angularJsonPath}
  Status: NOT FOUND

📍 Please verify:
  1. The path is correct
  2. The directory contains angular.json
  3. You have read permissions

Example (Unix/macOS/Linux): ls -la "${angularJsonPath}"
Example (Windows): dir "${angularJsonPath}"
      `.trim(),
      details: {
        providedPath: projectPath,
        checkedFor: angularJsonPath,
      },
    };
  }

  try {
    // Report progress
    if (progressCallback) {
      progressCallback({
        message: `Creating migration session for: ${projectPath}`,
        type: 'info',
        progress: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Create session with default target version (Angular 20)
    const session = sessionManager.createSession(projectPath, {
      targetVersion: '20', // Default target version
      currentVersion: '14', // Default starting version
    });
    const sessionId = session.id;

    // Get project info from context
    const context = session.engine.getContext();
    const currentVersion = context.currentVersion;
    const targetVersion = context.targetVersion;

    // Report success
    if (progressCallback) {
      progressCallback({
        message: `Session created successfully: ${sessionId}`,
        type: 'success',
        progress: 100,
        timestamp: new Date().toISOString(),
        metadata: { sessionId, projectPath },
      });
    }

    return {
      success: true,
      data: {
        sessionId,
        projectPath,
        currentVersion,
        targetVersion,
        createdAt: new Date().toISOString(),
      },
      message: `Migration session created: ${sessionId}`,
      nextStep: {
        action: 'migration_stage_pre_migration',
        description: 'Run pre-migration stage (backup, validation, git commit)',
        reasoning: 'Pre-migration prepares your project for the upgrade process',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (progressCallback) {
      progressCallback({
        message: `Failed to create session: ${errorMessage}`,
        type: 'error',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: false,
      error: `Failed to create session: ${errorMessage}`,
      details: {
        projectPath,
      },
      troubleshooting: {
        likelyCause: 'Invalid project path or missing angular.json',
        suggestedFixes: [
          'Verify the project path exists and is absolute',
          'Check that angular.json exists in the project root',
          'Ensure you have read permissions for the directory',
        ],
        relatedDocs: [],
        canRetry: true,
        canRollback: false,
      },
    };
  }
}

/**
 * List all active sessions
 */
async function sessionList(sessionManager: SessionManager): Promise<ToolResult> {
  const sessions = sessionManager.listSessions().map((session) => {
    const context = session.engine.getContext();
    const progress = session.engine.getProgress();

    return {
      sessionId: session.id,
      projectPath: context.projectPath,
      currentVersion: context.currentVersion,
      targetVersion: context.targetVersion,
      currentStepIndex: progress.current,
      totalSteps: progress.total,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    };
  });

  if (sessions.length === 0) {
    return {
      success: true,
      data: { sessions: [] },
      message: 'No active sessions',
      nextStep: {
        action: 'session_create',
        description: 'Create a new migration session',
        reasoning: 'You need a session to start the migration process',
      },
    };
  }

  return {
    success: true,
    data: { sessions, count: sessions.length },
    message: `Found ${sessions.length} active session(s)`,
    nextStep: {
      action: 'Use session_get to see details',
      description: 'Get detailed information about a specific session',
      reasoning: 'Session details help you understand the current migration state',
    },
  };
}

/**
 * Get detailed session information
 */
async function sessionGet(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  let sessionId = args.sessionId as string;

  // Auto-detect session if not provided
  if (!sessionId) {
    const recentSession = sessionManager.getMostRecentSession();
    if (!recentSession) {
      return {
        success: false,
        error: 'No sessionId provided and no active sessions found',
        nextStep: {
          action: 'session_create',
          description: 'Create a new migration session first',
          reasoning: 'You need an active session to get session details',
        },
      };
    }
    sessionId = recentSession.id;
    console.error(`[sessionGet] Auto-detected session: ${sessionId}`);
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionId}`,
      nextStep: {
        action: 'session_list',
        description: 'List all available sessions',
        reasoning: 'The specified session may have expired or been deleted',
      },
    };
  }

  const currentStage = session.engine.getCurrentStage();
  const state = session.engine.getState();
  const context = session.engine.getContext();
  const progress = session.engine.getProgress();

  // Check if checkpoint exists for this session
  const hasCheckpoint = await sessionManager.hasCheckpoint(sessionId);

  return {
    success: true,
    data: {
      sessionId: session.id,
      projectPath: context.projectPath,
      currentVersion: context.currentVersion,
      targetVersion: context.targetVersion,
      currentStage: currentStage
        ? {
            id: currentStage.id,
            name: currentStage.name,
            description: currentStage.description,
          }
        : null,
      progress: {
        currentStepIndex: progress.current,
        totalSteps: progress.total,
        completedSteps: state.completedSteps.length,
      },
      hasCheckpoint,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    },
    message: `Session details for: ${sessionId}`,
    nextStep: currentStage
      ? {
          action: currentStage.id,
          description: `Continue with ${currentStage.name}`,
          reasoning: 'This is the current stage in your migration workflow',
        }
      : {
          action: 'migration_stage_pre_migration',
          description: 'Start pre-migration stage',
          reasoning: 'Begin the migration process',
        },
  };
}

/**
 * Delete a session
 */
async function sessionDelete(
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

  // Delete the session
  sessionManager.deleteSession(sessionId);

  return {
    success: true,
    data: { sessionId },
    message: `Session deleted: ${sessionId}`,
    nextStep: {
      action: 'session_create',
      description: 'Create a new session if needed',
      reasoning: 'The previous session has been removed',
    },
  };
}

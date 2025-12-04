/**
 * Breaking Changes Fix Tools
 * Applies automated fixes for Angular version-specific breaking changes
 */

import { SessionManager } from '../session/manager.js';
import { ToolResult, ProgressCallback } from '../types.js';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Map of Angular versions to their breaking changes fix scripts
 */
const BREAKING_CHANGES_SCRIPTS: Record<string, string> = {
  '16': 'fix-angular-16-breaking-changes.sh',
  '17': 'fix-angular-17-breaking-changes.sh',
  '19': 'fix-angular-19-breaking-changes.sh',
  '20': 'fix-angular-20-breaking-changes.sh',
};

/**
 * Handle breaking changes tool calls
 */
export async function handleBreakingChangesTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback?: ProgressCallback
): Promise<ToolResult> {
  switch (toolName) {
    case 'breaking_changes_fix':
      return await fixBreakingChanges(args, sessionManager, progressCallback);
    case 'breaking_changes_list_available':
      return await listAvailableFixes();
    default:
      return {
        success: false,
        error: `Unknown breaking changes tool: ${toolName}`,
      };
  }
}

/**
 * Apply breaking changes fixes for a specific Angular version
 */
async function fixBreakingChanges(
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback?: ProgressCallback
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;
  const targetVersion = args.targetVersion as string;
  const dryRun = args.dryRun as boolean | undefined;

  // Auto-detect session if not provided
  let session = sessionId ? sessionManager.getSession(sessionId) : undefined;
  if (!session) {
    const recentSession = sessionManager.getMostRecentSession();
    if (!recentSession) {
      return {
        success: false,
        error: 'No sessionId provided and no active sessions found',
        nextStep: {
          action: 'session_create',
          description: 'Create a migration session first',
          reasoning: 'A session is required to apply breaking changes fixes',
        },
      };
    }
    session = recentSession;
  }

  // Validate target version
  if (!targetVersion) {
    return {
      success: false,
      error: 'Missing required parameter: targetVersion',
      details: {
        availableVersions: Object.keys(BREAKING_CHANGES_SCRIPTS),
      },
      nextStep: {
        action: 'Specify target version',
        description: 'Provide the Angular version for which to apply breaking changes fixes (e.g., "16", "17", "19", "20")',
        reasoning: 'Different Angular versions have different breaking changes that require specific fixes',
      },
    };
  }

  // Check if script exists for this version
  const scriptName = BREAKING_CHANGES_SCRIPTS[targetVersion];
  if (!scriptName) {
    return {
      success: false,
      error: `No breaking changes fix script available for Angular ${targetVersion}`,
      details: {
        requestedVersion: targetVersion,
        availableVersions: Object.keys(BREAKING_CHANGES_SCRIPTS),
      },
      message: `Breaking changes fixes are available for: ${Object.keys(BREAKING_CHANGES_SCRIPTS).join(', ')}`,
      nextStep: {
        action: 'Use available version',
        description: 'Choose one of the available Angular versions',
        reasoning: `Angular ${targetVersion} either doesn't have breaking changes or the fix script hasn't been created yet`,
      },
    };
  }

  const context = session.engine.getContext();
  const projectPath = context.projectPath;

  // Find the script in the workspace
  const scriptPath = resolve(
    __dirname,
    '../../../acp-agent/scripts',
    scriptName
  );

  if (!existsSync(scriptPath)) {
    return {
      success: false,
      error: `Breaking changes fix script not found: ${scriptName}`,
      details: {
        expectedPath: scriptPath,
        scriptName,
      },
      troubleshooting: {
        likelyCause: 'Script file missing or workspace structure changed',
        suggestedFixes: [
          'Verify the acp-agent package is properly installed',
          `Check if script exists at: ${scriptPath}`,
          'Rebuild the workspace: npm install',
        ],
        relatedDocs: [],
        canRetry: false,
        canRollback: false,
      },
    };
  }

  try {
    if (progressCallback) {
      progressCallback({
        message: `Applying Angular ${targetVersion} breaking changes fixes...`,
        type: 'info',
        progress: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Execute the fix script
    const command = dryRun
      ? `bash "${scriptPath}" "${projectPath}" --dry-run`
      : `bash "${scriptPath}" "${projectPath}"`;

    console.error(`[Breaking Changes] Executing: ${command}`);

    const output = execSync(command, {
      cwd: projectPath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (progressCallback) {
      progressCallback({
        message: `Successfully applied Angular ${targetVersion} breaking changes fixes`,
        type: 'success',
        progress: 100,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      data: {
        version: targetVersion,
        scriptExecuted: scriptName,
        projectPath,
        dryRun: dryRun || false,
        output: output.trim(),
      },
      message: dryRun
        ? `[DRY RUN] Breaking changes fixes for Angular ${targetVersion} would be applied`
        : `Successfully applied breaking changes fixes for Angular ${targetVersion}`,
      nextStep: {
        action: 'Review changes and test',
        description: 'Review the applied fixes and run tests to verify everything works',
        reasoning: 'Automated fixes may need manual verification and testing',
      },
    };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    const errorOutput = error.stdout || error.stderr || '';

    if (progressCallback) {
      progressCallback({
        message: `Failed to apply breaking changes fixes: ${errorMessage}`,
        type: 'error',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: false,
      error: `Failed to apply breaking changes fixes for Angular ${targetVersion}`,
      details: {
        version: targetVersion,
        scriptPath,
        errorMessage,
        output: errorOutput,
      },
      troubleshooting: {
        likelyCause: 'Script execution failed or project structure issues',
        suggestedFixes: [
          'Check the error output for specific issues',
          'Verify the project structure is valid',
          'Try running in dry-run mode first: dryRun: true',
          `Manually run: bash ${scriptPath} ${projectPath}`,
        ],
        relatedDocs: [],
        canRetry: true,
        canRollback: false,
      },
    };
  }
}

/**
 * List all available breaking changes fix scripts
 */
async function listAvailableFixes(): Promise<ToolResult> {
  const fixes = Object.entries(BREAKING_CHANGES_SCRIPTS).map(([version, script]) => ({
    version,
    script,
    description: `Fixes for Angular ${version} breaking changes`,
  }));

  return {
    success: true,
    data: {
      availableFixes: fixes,
      count: fixes.length,
    },
    message: `${fixes.length} breaking changes fix scripts available`,
    nextStep: {
      action: 'breaking_changes_fix',
      description: 'Apply fixes for a specific version using breaking_changes_fix tool',
      reasoning: 'Each Angular version has specific breaking changes that need to be addressed',
    },
  };
}

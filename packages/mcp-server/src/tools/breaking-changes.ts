/**
 * Breaking Changes Fix Tools
 * Applies automated fixes for Angular version-specific breaking changes
 */

import { SessionManager } from '../session/manager.js';
import { ToolResult, ProgressCallback } from '../types.js';
import {
  fixAngular15BreakingChanges,
  fixAngular16BreakingChanges,
  fixAngular17BreakingChanges,
  fixAngular19BreakingChanges,
  fixAngular20BreakingChanges,
  type BreakingChangesFixer
} from 'angular-migration-acp-agent/breaking-changes';

/**
 * Map of Angular versions to their breaking changes fix functions
 * Cross-platform TypeScript implementations (Windows, macOS, Linux)
 */
const BREAKING_CHANGES_FIXERS: Record<string, BreakingChangesFixer> = {
  '15': fixAngular15BreakingChanges,
  '16': fixAngular16BreakingChanges,
  '17': fixAngular17BreakingChanges,
  '19': fixAngular19BreakingChanges,
  '20': fixAngular20BreakingChanges,
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
        availableVersions: Object.keys(BREAKING_CHANGES_FIXERS),
      },
      nextStep: {
        action: 'Specify target version',
        description: 'Provide the Angular version for which to apply breaking changes fixes (e.g., "15", "16", "17", "19", "20")',
        reasoning: 'Different Angular versions have different breaking changes that require specific fixes',
      },
    };
  }

  // Check if fixer exists for this version
  const fixer = BREAKING_CHANGES_FIXERS[targetVersion];
  if (!fixer) {
    return {
      success: false,
      error: `No breaking changes fix available for Angular ${targetVersion}`,
      details: {
        requestedVersion: targetVersion,
        availableVersions: Object.keys(BREAKING_CHANGES_FIXERS),
      },
      message: `Breaking changes fixes are available for: ${Object.keys(BREAKING_CHANGES_FIXERS).join(', ')}`,
      nextStep: {
        action: 'Use available version',
        description: 'Choose one of the available Angular versions',
        reasoning: `Angular ${targetVersion} either doesn't have breaking changes or the fix hasn't been implemented yet`,
      },
    };
  }

  const context = session.engine.getContext();
  const projectPath = context.projectPath;

  try {
    if (progressCallback) {
      progressCallback({
        message: `Applying Angular ${targetVersion} breaking changes fixes...`,
        type: 'info',
        progress: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.error(`[Breaking Changes] Running fixes for Angular ${targetVersion} in ${projectPath}`);

    // Execute the TypeScript fixer function
    const result = await fixer(projectPath);

    if (progressCallback) {
      progressCallback({
        message: result.success 
          ? `Successfully applied Angular ${targetVersion} breaking changes` 
          : `Failed to apply Angular ${targetVersion} breaking changes`,
        type: result.success ? 'success' : 'error',
        progress: 100,
        timestamp: new Date().toISOString(),
      });
    }

    if (!result.success) {
      return {
        success: false,
        error: result.message,
        details: {
          version: targetVersion,
          projectPath,
          fixerDetails: result.details,
          warnings: result.warnings,
          errors: result.errors,
        },
        troubleshooting: {
          likelyCause: 'Fix execution failed or project structure issues',
          suggestedFixes: [
            'Check the error details above for specific issues',
            'Verify the project structure is valid Angular project',
            'Check that all files are readable/writable',
            ...result.errors.slice(0, 3),
          ],
          relatedDocs: [],
          canRetry: true,
          canRollback: false,
        },
      };
    }

    return {
      success: true,
      data: {
        version: targetVersion,
        projectPath,
        details: result.details,
        warnings: result.warnings,
      },
      message: result.message,
      nextStep: {
        action: 'Review changes and test',
        description: 'Review the applied fixes and run tests to verify everything works',
        reasoning: 'Automated fixes may need manual verification and testing',
      },
    };
  } catch (error: any) {
    const errorMessage = error.message || String(error);

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
        projectPath,
        errorMessage,
      },
      troubleshooting: {
        likelyCause: 'Unexpected error during fix execution',
        suggestedFixes: [
          'Check the error message above',
          'Verify the project path is correct',
          'Ensure TypeScript compilation is working',
          'Check file permissions in the project',
        ],
        relatedDocs: [],
        canRetry: true,
        canRollback: false,
      },
    };
  }
}

/**
 * List all available breaking changes fix implementations
 */
async function listAvailableFixes(): Promise<ToolResult> {
  const fixes = Object.keys(BREAKING_CHANGES_FIXERS).map((version) => ({
    version,
    description: `Cross-platform fixes for Angular ${version} breaking changes`,
  }));

  return {
    success: true,
    data: {
      availableFixes: fixes,
      count: fixes.length,
    },
    message: `${fixes.length} breaking changes fix implementations available`,
    nextStep: {
      action: 'breaking_changes_fix',
      description: 'Apply fixes for a specific version using breaking_changes_fix tool',
      reasoning: 'Each Angular version has specific breaking changes that need to be addressed',
    },
  };
}

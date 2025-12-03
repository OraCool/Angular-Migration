/**
 * Backup and Restore Tools
 * Handles project backup creation and restoration
 */

import {
  createBackup,
  restoreBackup,
  listBackups,
  getBackupMetadata,
  deleteBackup,
  type BackupOptions,
  type RestoreOptions,
} from '@angular-migration/workflow-engine';
import { SessionManager } from '../session/manager.js';
import { ToolResult } from '../types.js';

export async function handleBackupRestoreTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  switch (toolName) {
    case 'migration_backup':
      return await migrationBackup(args, sessionManager);
    case 'migration_restore':
      return await migrationRestore(args, sessionManager);
    default:
      return {
        success: false,
        error: `Unknown backup/restore tool: ${toolName}`,
      };
  }
}

/**
 * Create a backup of the Angular project
 */
async function migrationBackup(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;
  const backupName = args.backupName as string | undefined;
  const skipNodeModules = args.skipNodeModules !== false; // Default true
  const skipGit = args.skipGit as boolean | undefined;
  const skipDist = args.skipDist !== false; // Default true
  const skipCoverage = args.skipCoverage !== false; // Default true

  if (!sessionId) {
    return {
      success: false,
      error: 'sessionId is required',
    };
  }

  try {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Session not found: ${sessionId}`,
      };
    }

    const projectPath = session.context.projectPath;

    // List existing backups before creating new one
    const existingBackups = listBackups(projectPath);

    const backupOptions: BackupOptions = {
      projectPath,
      backupName,
      excludeNodeModules: skipNodeModules,
      excludeGit: skipGit,
      excludeDist: skipDist,
      excludeCoverage: skipCoverage,
      createMetadata: true,
    };

    const result = await createBackup(backupOptions);

    if (!result.success) {
      return {
        success: false,
        error: result.error || result.message,
        message: result.message,
      };
    }

    const allBackups = listBackups(projectPath);
    const newBackupCount = allBackups.length - existingBackups.length;

    return {
      success: true,
      data: {
        backupPath: result.backupPath,
        size: result.size,
        fileCount: result.fileCount,
        duration: result.duration,
        totalBackups: allBackups.length,
      },
      message: `✅ Backup created successfully!\n\n` +
        `📁 Location: ${result.backupPath}\n` +
        `💾 Size: ${result.size}\n` +
        `📄 Files: ${result.fileCount} files backed up\n` +
        `⏱️  Duration: ${Math.round(result.duration / 1000)}s\n\n` +
        `Total backups: ${allBackups.length} (${newBackupCount} new)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to create backup',
    };
  }
}

/**
 * Restore the Angular project from a backup
 */
async function migrationRestore(
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  const sessionId = args.sessionId as string;
  const backupPath = args.backupPath as string | undefined;
  const backupName = args.backupName as string | undefined;
  const force = args.force as boolean | undefined;
  const createSafetyBackup = args.createSafetyBackup !== false; // Default true
  const preserveGit = args.preserveGit !== false; // Default true
  const reinstallDependencies = args.reinstallDependencies !== false; // Default true

  if (!sessionId) {
    return {
      success: false,
      error: 'sessionId is required',
    };
  }

  if (!backupPath && !backupName) {
    return {
      success: false,
      error: 'Either backupPath or backupName is required',
    };
  }

  try {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Session not found: ${sessionId}`,
      };
    }

    const projectPath = session.context.projectPath;

    // Determine backup path
    let finalBackupPath = backupPath;

    if (!finalBackupPath && backupName) {
      // Look up backup by name
      const backupDir = `${projectPath}/../.migration-backups`;
      finalBackupPath = `${backupDir}/${backupName}`;
    }

    if (!finalBackupPath) {
      return {
        success: false,
        error: 'Could not determine backup path',
      };
    }

    // Check if backup exists and get metadata
    const metadata = getBackupMetadata(finalBackupPath);

    if (!metadata && !force) {
      return {
        success: false,
        error: `Backup not found or invalid: ${finalBackupPath}. Use force=true to restore anyway.`,
      };
    }

    const restoreOptions: RestoreOptions = {
      backupPath: finalBackupPath,
      projectPath,
      force,
      createSafetyBackup,
      preserveGit,
      reinstallDependencies,
    };

    const result = await restoreBackup(restoreOptions);

    if (!result.success) {
      return {
        success: false,
        error: result.error || result.message,
        message: result.message,
      };
    }

    return {
      success: true,
      data: {
        backupPath: result.backupPath,
        safetyBackupPath: result.safetyBackupPath,
        duration: result.duration,
      },
      message: `✅ Restore completed successfully!\n\n` +
        `📥 Restored from: ${result.backupPath}\n` +
        (result.safetyBackupPath ? `🛟 Safety backup: ${result.safetyBackupPath}\n` : '') +
        `⏱️  Duration: ${Math.round(result.duration / 1000)}s\n\n` +
        (metadata ? `📋 Backup info:\n` +
          `   - Created: ${metadata.date}\n` +
          `   - Angular version: ${metadata.angularVersion || 'unknown'}\n` +
          `   - Node version: ${metadata.nodeVersion}\n` +
          `   - Platform: ${metadata.platform}\n` : '') +
        (reinstallDependencies ? `\n✅ Dependencies reinstalled` : ''),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to restore backup',
    };
  }
}

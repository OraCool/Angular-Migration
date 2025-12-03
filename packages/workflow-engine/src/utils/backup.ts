/**
 * Backup and Restore Utilities
 * Cross-platform backup operations for Angular projects
 * Extracted and enhanced from backup.sh and restore-backup.sh
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getPlatform } from './platform.js';
import { detectPackageManager, formatBytes } from './package-manager.js';

export interface BackupOptions {
  projectPath: string;
  backupDir?: string;
  backupName?: string;
  excludeNodeModules?: boolean;
  excludeGit?: boolean;
  excludeDist?: boolean;
  excludeCoverage?: boolean;
  createMetadata?: boolean;
}

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  message: string;
  error?: string;
  duration: number;
  size?: string;
  fileCount?: number;
  metadata?: BackupMetadata;
}

export interface BackupMetadata {
  timestamp: string;
  source: string;
  createdBy: string;
  backupType: string;
  date: string;
  angularVersion?: string;
  nodeVersion: string;
  platform: string;
}

export interface RestoreOptions {
  backupPath: string;
  projectPath: string;
  force?: boolean;
  createSafetyBackup?: boolean;
  preserveGit?: boolean;
  reinstallDependencies?: boolean;
}

export interface RestoreResult {
  success: boolean;
  backupPath?: string;
  safetyBackupPath?: string;
  message: string;
  error?: string;
  duration: number;
}

/**
 * Default exclusions for backup
 */
const DEFAULT_EXCLUSIONS = [
  'node_modules',
  'dist',
  '.angular',
  'coverage',
  '.vscode',
  '.idea',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '.cache',
  'tmp',
  'temp',
];

/**
 * Create backup of Angular project (cross-platform)
 *
 * @param options - Backup options
 * @returns Backup result with path and metadata
 */
export async function createBackup(
  options: BackupOptions
): Promise<BackupResult> {
  const startTime = Date.now();
  const {
    projectPath,
    backupDir,
    backupName,
    excludeNodeModules = true,
    excludeGit = false, // Include .git by default for version history
    excludeDist = true,
    excludeCoverage = true,
    createMetadata = true,
  } = options;

  try {
    // Validate project path
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found in ${projectPath}`);
    }

    // Generate backup name with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    const finalBackupName = backupName || `backup-${timestamp}`;

    // Determine backup directory
    const finalBackupDir =
      backupDir || path.join(projectPath, '..', '.migration-backups');

    // Create backup directory structure
    if (!fs.existsSync(finalBackupDir)) {
      fs.mkdirSync(finalBackupDir, { recursive: true });
    }

    const backupPath = path.join(finalBackupDir, finalBackupName);

    if (fs.existsSync(backupPath)) {
      throw new Error(`Backup directory already exists: ${backupPath}`);
    }

    console.log('🔄 Creating backup of Angular project...');
    console.log(`  Source: ${projectPath}`);
    console.log(`  Destination: ${backupPath}`);

    // Build exclusion list
    const exclusions = [...DEFAULT_EXCLUSIONS];
    if (!excludeNodeModules) {
      const idx = exclusions.indexOf('node_modules');
      if (idx > -1) exclusions.splice(idx, 1);
    }
    if (excludeGit) {
      exclusions.push('.git');
    }
    if (!excludeDist) {
      const idx = exclusions.indexOf('dist');
      if (idx > -1) exclusions.splice(idx, 1);
    }
    if (!excludeCoverage) {
      const idx = exclusions.indexOf('coverage');
      if (idx > -1) exclusions.splice(idx, 1);
    }

    // Copy project files (cross-platform)
    console.log('📦 Copying project files...');
    await copyDirectory(projectPath, backupPath, exclusions);

    let fileCount = 0;

    // Create backup metadata
    if (createMetadata) {
      const metadata: BackupMetadata = {
        timestamp,
        source: projectPath,
        createdBy: 'angular-migration-agent',
        backupType: 'full',
        date: new Date().toISOString(),
        nodeVersion: process.version,
        platform: getPlatform(),
      };

      // Try to read Angular version from package.json
      try {
        const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const angularCore = pkgJson.dependencies?.['@angular/core'];
        if (angularCore) {
          metadata.angularVersion = angularCore.replace(/[\^~]/, '');
        }
      } catch (err) {
        console.warn('Warning: Could not read Angular version from package.json');
      }

      const metadataPath = path.join(backupPath, 'backup-info.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      fileCount = countFiles(backupPath);
    }

    // Calculate backup size
    const size = getDirectorySize(backupPath);
    const formattedSize = formatBytes(size);

    console.log('✅ Backup created successfully!');
    console.log(`  Location: ${backupPath}`);
    console.log(`  Size: ${formattedSize}`);
    if (fileCount > 0) {
      console.log(`  Files backed up: ${fileCount}`);
    }

    const duration = Date.now() - startTime;
    return {
      success: true,
      backupPath,
      message: `Backup created successfully at ${backupPath}`,
      duration,
      size: formattedSize,
      fileCount,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Failed to create backup',
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Restore project from backup (cross-platform)
 *
 * @param options - Restore options
 * @returns Restore result with status
 */
export async function restoreBackup(
  options: RestoreOptions
): Promise<RestoreResult> {
  const startTime = Date.now();
  const {
    backupPath,
    projectPath,
    force = false,
    createSafetyBackup = true,
    preserveGit = true,
    reinstallDependencies = true,
  } = options;

  let safetyBackupPath: string | undefined;

  try {
    // Validate backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup directory does not exist: ${backupPath}`);
    }

    // Check for backup metadata
    const metadataPath = path.join(backupPath, 'backup-info.json');
    if (!fs.existsSync(metadataPath)) {
      console.warn('⚠️  Warning: backup-info.json not found. This may not be a valid backup.');
      if (!force) {
        throw new Error(
          'Backup metadata not found. Use force=true to restore anyway.'
        );
      }
    } else {
      // Read and display backup metadata
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log('📋 Backup metadata:');
      console.log(`  Created: ${metadata.date}`);
      console.log(`  Source: ${metadata.source}`);
      if (metadata.angularVersion) {
        console.log(`  Angular version: ${metadata.angularVersion}`);
      }
    }

    console.log('🔄 Restoring Angular project from backup...');
    console.log(`  Backup: ${backupPath}`);
    console.log(`  Target: ${projectPath}`);

    // Create safety backup of current state
    if (createSafetyBackup && fs.existsSync(projectPath)) {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .split('.')[0];
      safetyBackupPath = `${projectPath}.before-restore-${timestamp}`;

      console.log(`📦 Creating safety backup: ${safetyBackupPath}`);
      await copyDirectory(projectPath, safetyBackupPath, []);
    }

    // Remove current project files (except .git if preserving)
    if (fs.existsSync(projectPath)) {
      console.log('🗑️  Removing current project files...');
      const items = fs.readdirSync(projectPath);

      for (const item of items) {
        if (preserveGit && item === '.git') {
          console.log('  Preserving .git directory');
          continue;
        }

        const itemPath = path.join(projectPath, item);
        fs.rmSync(itemPath, { recursive: true, force: true });
      }
    } else {
      // Create project directory if it doesn't exist
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Restore from backup
    console.log('📥 Restoring files from backup...');
    const exclusions = preserveGit ? [] : []; // No exclusions for restore
    await copyDirectory(backupPath, projectPath, exclusions);

    // Remove backup metadata file from restored project
    const restoredMetadataPath = path.join(projectPath, 'backup-info.json');
    if (fs.existsSync(restoredMetadataPath)) {
      fs.unlinkSync(restoredMetadataPath);
    }

    // Reinstall dependencies
    if (reinstallDependencies) {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        console.log('📦 Reinstalling dependencies...');
        const packageManager = detectPackageManager(projectPath);
        const platform = getPlatform();

        let installCmd = packageManager.installCommand;
        if (platform === 'windows' && packageManager.type === 'npm') {
          installCmd = 'npm.cmd install';
        }

        execSync(installCmd, {
          cwd: projectPath,
          stdio: 'inherit',
        });
      }
    }

    console.log('✅ Restore completed successfully!');
    console.log(`  Restored to: ${projectPath}`);
    if (safetyBackupPath) {
      console.log(`  Safety backup: ${safetyBackupPath}`);
    }

    const duration = Date.now() - startTime;
    return {
      success: true,
      backupPath,
      safetyBackupPath,
      message: `Project restored successfully from ${backupPath}`,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Failed to restore backup',
      error: errorMessage,
      duration,
    };
  }
}

/**
 * List available backups for a project
 *
 * @param projectPath - Project path
 * @param backupDir - Custom backup directory (optional)
 * @returns Array of backup names sorted by date (newest first)
 */
export function listBackups(
  projectPath: string,
  backupDir?: string
): string[] {
  const finalBackupDir =
    backupDir || path.join(projectPath, '..', '.migration-backups');

  if (!fs.existsSync(finalBackupDir)) {
    return [];
  }

  try {
    return fs
      .readdirSync(finalBackupDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .filter((dirent) => {
        // Verify it's a valid backup (has backup-info.json)
        const metadataPath = path.join(
          finalBackupDir,
          dirent.name,
          'backup-info.json'
        );
        return fs.existsSync(metadataPath);
      })
      .map((dirent) => dirent.name)
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    console.warn('Warning: Could not list backups:', error);
    return [];
  }
}

/**
 * Get backup metadata
 *
 * @param backupPath - Path to backup directory
 * @returns Backup metadata or null
 */
export function getBackupMetadata(backupPath: string): BackupMetadata | null {
  const metadataPath = path.join(backupPath, 'backup-info.json');

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch (error) {
    console.warn('Warning: Could not read backup metadata:', error);
    return null;
  }
}

/**
 * Delete a backup
 *
 * @param backupPath - Path to backup directory
 * @returns True if deleted successfully
 */
export function deleteBackup(backupPath: string): boolean {
  try {
    if (!fs.existsSync(backupPath)) {
      return false;
    }

    fs.rmSync(backupPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error('Error deleting backup:', error);
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Copy directory recursively with exclusions (cross-platform)
 */
async function copyDirectory(
  src: string,
  dest: string,
  exclusions: string[]
): Promise<void> {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);

    // Check if item should be excluded
    if (shouldExclude(item.name, exclusions)) {
      continue;
    }

    if (item.isDirectory()) {
      await copyDirectory(srcPath, destPath, exclusions);
    } else if (item.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    } else if (item.isSymbolicLink()) {
      // Handle symbolic links
      const linkTarget = fs.readlinkSync(srcPath);
      fs.symlinkSync(linkTarget, destPath);
    }
  }
}

/**
 * Check if item should be excluded
 */
function shouldExclude(itemName: string, exclusions: string[]): boolean {
  for (const exclusion of exclusions) {
    // Exact match
    if (itemName === exclusion) {
      return true;
    }

    // Wildcard match (e.g., *.log)
    if (exclusion.includes('*')) {
      const pattern = exclusion.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(itemName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get directory size recursively (in bytes)
 */
function getDirectorySize(dirPath: string): number {
  let totalSize = 0;

  function calculateSize(currentPath: string): void {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(currentPath, item.name);

      if (item.isDirectory()) {
        calculateSize(itemPath);
      } else if (item.isFile()) {
        try {
          const stats = fs.statSync(itemPath);
          totalSize += stats.size;
        } catch (err) {
          // Skip files we can't read
        }
      }
    }
  }

  try {
    calculateSize(dirPath);
  } catch (error) {
    console.warn('Warning: Could not calculate directory size:', error);
  }

  return totalSize;
}

/**
 * Count files recursively
 */
function countFiles(dirPath: string): number {
  let count = 0;

  function countFilesRecursive(currentPath: string): void {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(currentPath, item.name);

      if (item.isDirectory()) {
        countFilesRecursive(itemPath);
      } else if (item.isFile()) {
        count++;
      }
    }
  }

  try {
    countFilesRecursive(dirPath);
  } catch (error) {
    console.warn('Warning: Could not count files:', error);
  }

  return count;
}

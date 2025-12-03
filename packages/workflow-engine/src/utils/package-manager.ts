/**
 * Package Manager Utilities
 * Cross-platform package management operations
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getPlatform } from './platform.js';

export interface CleanPackagesOptions {
  projectPath: string;
  removeNodeModules?: boolean;
  removeLockFile?: boolean;
  reinstall?: boolean;
}

export interface CleanPackagesResult {
  success: boolean;
  message: string;
  error?: string;
  duration: number;
  details?: {
    nodeModulesRemoved: boolean;
    lockFileRemoved: boolean;
    packagesReinstalled: boolean;
  };
}

export interface PackageManagerInfo {
  type: 'npm' | 'yarn' | 'pnpm';
  lockFile: string;
  installCommand: string;
}

/**
 * Detect which package manager is being used in the project
 */
export function detectPackageManager(projectPath: string): PackageManagerInfo {
  const yarnLock = path.join(projectPath, 'yarn.lock');
  const pnpmLock = path.join(projectPath, 'pnpm-lock.yaml');
  const npmLock = path.join(projectPath, 'package-lock.json');

  if (fs.existsSync(yarnLock)) {
    return {
      type: 'yarn',
      lockFile: 'yarn.lock',
      installCommand: 'yarn install',
    };
  }

  if (fs.existsSync(pnpmLock)) {
    return {
      type: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      installCommand: 'pnpm install',
    };
  }

  return {
    type: 'npm',
    lockFile: 'package-lock.json',
    installCommand: 'npm install',
  };
}

/**
 * Clean packages for reproducible builds (cross-platform)
 * Extracted from install.sh script
 *
 * This function:
 * 1. Removes node_modules directory
 * 2. Removes lock file (package-lock.json, yarn.lock, or pnpm-lock.yaml)
 * 3. Optionally reinstalls packages
 *
 * @param options - Clean packages options
 * @returns Result with success status and details
 */
export async function cleanPackages(
  options: CleanPackagesOptions
): Promise<CleanPackagesResult> {
  const startTime = Date.now();
  const {
    projectPath,
    removeNodeModules = true,
    removeLockFile = true,
    reinstall = true,
  } = options;

  const details = {
    nodeModulesRemoved: false,
    lockFileRemoved: false,
    packagesReinstalled: false,
  };

  try {
    // Validate project path
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found in ${projectPath}`);
    }

    // Detect package manager
    const packageManager = detectPackageManager(projectPath);

    // 1. Remove node_modules
    if (removeNodeModules) {
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        console.log('🧹 Removing node_modules...');
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
        details.nodeModulesRemoved = true;
        console.log('✅ node_modules removed');
      } else {
        console.log('ℹ️  node_modules does not exist, skipping removal');
      }
    }

    // 2. Remove lock file
    if (removeLockFile) {
      const lockFilePath = path.join(projectPath, packageManager.lockFile);
      if (fs.existsSync(lockFilePath)) {
        console.log(`🧹 Removing ${packageManager.lockFile}...`);
        fs.unlinkSync(lockFilePath);
        details.lockFileRemoved = true;
        console.log(`✅ ${packageManager.lockFile} removed`);
      } else {
        console.log(`ℹ️  ${packageManager.lockFile} does not exist, skipping removal`);
      }
    }

    // 3. Reinstall packages
    if (reinstall) {
      console.log(`📦 Installing packages using ${packageManager.type}...`);
      const platform = getPlatform();

      // Get the correct command for the platform
      let installCmd = packageManager.installCommand;
      if (platform === 'windows' && packageManager.type === 'npm') {
        // On Windows, npm might need .cmd extension
        installCmd = 'npm.cmd install';
      }

      execSync(installCmd, {
        cwd: projectPath,
        stdio: 'inherit',
        encoding: 'utf8',
      });

      details.packagesReinstalled = true;
      console.log('✅ Packages installed successfully');
    }

    const duration = Date.now() - startTime;
    return {
      success: true,
      message: 'Packages cleaned successfully',
      duration,
      details,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Failed to clean packages',
      error: errorMessage,
      duration,
      details,
    };
  }
}

/**
 * Check if node_modules exists
 */
export function hasNodeModules(projectPath: string): boolean {
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  return fs.existsSync(nodeModulesPath);
}

/**
 * Get node_modules directory size (in bytes)
 */
export function getNodeModulesSize(projectPath: string): number {
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    return 0;
  }

  let totalSize = 0;

  function calculateSize(dirPath: string): void {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        calculateSize(itemPath);
      } else if (item.isFile()) {
        const stats = fs.statSync(itemPath);
        totalSize += stats.size;
      }
    }
  }

  try {
    calculateSize(nodeModulesPath);
  } catch (error) {
    console.warn('Warning: Could not calculate node_modules size:', error);
  }

  return totalSize;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

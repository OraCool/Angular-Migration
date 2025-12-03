/**
 * Package Management Tools
 * Handles package compatibility and update checks
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SessionManager } from '../session/manager.js';
import { ToolResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function handlePackageTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  switch (toolName) {
    case 'packages_get_compatibility':
      return await packagesGetCompatibility(args);
    case 'packages_check_updates':
      return await packagesCheckUpdates(args);
    default:
      return {
        success: false,
        error: `Unknown package tool: ${toolName}`,
      };
  }
}

async function packagesGetCompatibility(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const angularVersion = args.angularVersion as string;

  if (!angularVersion) {
    return {
      success: false,
      error: 'angularVersion is required',
    };
  }

  try {
    // Try to load compatibility matrix from workflow-engine package
    // The matrix is copied during build to workflow-engine/dist/assets/
    const matrixPath = path.join(
      __dirname,
      '../../node_modules/@angular-migration/workflow-engine/dist/assets/package-compatibility-matrix.json'
    );

    let compatibilityData: Record<string, any>;

    try {
      const matrixContent = await fs.readFile(matrixPath, 'utf-8');
      compatibilityData = JSON.parse(matrixContent);
    } catch {
      // Fallback: provide basic compatibility info
      compatibilityData = {
        [angularVersion]: {
          '@angular/cli': `^${angularVersion}.0.0`,
          '@angular/core': `^${angularVersion}.0.0`,
          '@angular/common': `^${angularVersion}.0.0`,
          '@angular/platform-browser': `^${angularVersion}.0.0`,
          '@angular/platform-browser-dynamic': `^${angularVersion}.0.0`,
          'typescript': angularVersion === '20' ? '~5.6.0' : '~5.3.0',
          'rxjs': '~7.8.0',
          'zone.js': '~0.15.0',
        },
      };
    }

    const versionData = compatibilityData[angularVersion];

    if (!versionData) {
      return {
        success: false,
        error: `No compatibility data found for Angular ${angularVersion}`,
      };
    }

    return {
      success: true,
      data: {
        angularVersion,
        packages: versionData,
      },
      message: `Compatibility matrix for Angular ${angularVersion}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function packagesCheckUpdates(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const projectPath = args.projectPath as string;

  if (!projectPath) {
    return {
      success: false,
      error: 'projectPath is required',
    };
  }

  try {
    // Read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Collect Angular packages
    const angularPackages: Record<string, string> = {};
    const otherPackages: Record<string, string> = {};

    for (const [pkg, version] of Object.entries(deps)) {
      if (pkg.startsWith('@angular/')) {
        angularPackages[pkg] = version as string;
      } else if (
        ['typescript', 'rxjs', 'zone.js', 'tslib'].includes(pkg)
      ) {
        otherPackages[pkg] = version as string;
      }
    }

    return {
      success: true,
      data: {
        angularPackages,
        otherPackages,
        suggestions: [
          'Run "ng update @angular/cli @angular/core" to update Angular packages',
          'Check https://update.angular.io for detailed migration guide',
        ],
      },
      message: `Found ${Object.keys(angularPackages).length} Angular packages`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

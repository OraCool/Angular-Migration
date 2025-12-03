/**
 * Validation Tools
 * Handles project, Node version, and dependency validation
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { SessionManager } from '../session/manager.js';
import { ToolResult, ValidationInfo } from '../types.js';
import {
  getCurrentNodeVersion,
  getRecommendedNodeVersion,
  isVersionCompatible,
} from '@angular-migration/workflow-engine';

export async function handleValidationTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager
): Promise<ToolResult> {
  switch (toolName) {
    case 'validate_project':
      return await validateProject(args);
    case 'validate_node_version':
      return await validateNodeVersion(args);
    case 'validate_dependencies':
      return await validateDependencies(args);
    default:
      return {
        success: false,
        error: `Unknown validation tool: ${toolName}`,
      };
  }
}

async function validateProject(
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
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if directory exists
    try {
      await fs.access(projectPath);
    } catch {
      errors.push(`Directory does not exist: ${projectPath}`);
      return {
        success: false,
        data: { valid: false, errors, warnings, suggestions },
        error: 'Project directory not found',
      };
    }

    // Check for package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Check for Angular dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (!deps['@angular/core']) {
        errors.push('Not an Angular project: @angular/core not found');
      }

      // Check Angular version
      const angularVersion = deps['@angular/core'];
      if (angularVersion) {
        suggestions.push(`Current Angular version: ${angularVersion}`);
      }
    } catch {
      errors.push('package.json not found or invalid');
    }

    // Check for angular.json
    const angularJsonPath = path.join(projectPath, 'angular.json');
    try {
      await fs.access(angularJsonPath);
    } catch {
      warnings.push('angular.json not found (may not be Angular CLI project)');
    }

    // Check for tsconfig.json
    const tsconfigPath = path.join(projectPath, 'tsconfig.json');
    try {
      await fs.access(tsconfigPath);
    } catch {
      warnings.push('tsconfig.json not found');
    }

    const validation: ValidationInfo = {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };

    return {
      success: true,
      data: validation,
      message: validation.valid
        ? 'Project validation passed'
        : 'Project validation failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function validateNodeVersion(
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
    const currentNode = await getCurrentNodeVersion();
    const recommendedNode = getRecommendedNodeVersion(angularVersion);

    // Convert recommended version string to NodeVersionRequirement array
    const requirements = [{
      minVersion: recommendedNode,
      recommended: recommendedNode,
    }];
    const compatible = isVersionCompatible(currentNode, requirements);

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    suggestions.push(`Current Node.js: ${currentNode}`);
    suggestions.push(`Recommended for Angular ${angularVersion}: Node ${recommendedNode}.x`);

    if (!compatible) {
      errors.push(
        `Node.js ${currentNode} is not compatible with Angular ${angularVersion}`
      );
      suggestions.push(`Please upgrade to Node.js ${recommendedNode}.x`);
    }

    const validation: ValidationInfo = {
      valid: compatible,
      errors,
      warnings,
      suggestions,
    };

    return {
      success: true,
      data: validation,
      message: compatible
        ? 'Node version is compatible'
        : 'Node version is incompatible',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function validateDependencies(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const projectPath = args.projectPath as string;
  const targetVersion = args.targetVersion as string;

  if (!projectPath || !targetVersion) {
    return {
      success: false,
      error: 'projectPath and targetVersion are required',
    };
  }

  try {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Check Angular packages
    const angularPackages = Object.keys(deps).filter(key =>
      key.startsWith('@angular/')
    );

    for (const pkg of angularPackages) {
      const version = deps[pkg];
      // Simple version check (could be enhanced with compatibility matrix)
      if (version.includes('^') || version.includes('~')) {
        suggestions.push(`${pkg}: ${version} (will be updated)`);
      }
    }

    // Check for common peer dependency issues
    if (deps['rxjs']) {
      const rxjsVersion = deps['rxjs'];
      suggestions.push(`RxJS version: ${rxjsVersion}`);
    }

    // Check for deprecated packages
    const deprecatedPackages = [
      '@angular/http', // Deprecated in favor of @angular/common/http
      'tslint', // Deprecated in favor of ESLint
    ];

    for (const deprecatedPkg of deprecatedPackages) {
      if (deps[deprecatedPkg]) {
        warnings.push(`Deprecated package found: ${deprecatedPkg}`);
        suggestions.push(`Consider migrating from ${deprecatedPkg}`);
      }
    }

    const validation: ValidationInfo = {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };

    return {
      success: true,
      data: validation,
      message:
        errors.length === 0
          ? 'Dependencies validation passed'
          : 'Dependencies validation found issues',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

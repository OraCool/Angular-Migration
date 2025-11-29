/**
 * Entry Node - Initialize migration workflow
 *
 * This node:
 * - Validates project structure
 * - Detects current Angular version
 * - Sets up initial state
 */

import type { MigrationState } from '../state.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Entry node function
 * Initializes the migration workflow by validating the project and detecting versions
 */
export async function entryNode(state: MigrationState): Promise<Partial<MigrationState>> {
  console.log('🚀 Initializing Angular migration workflow...');

  // Validate project structure
  const projectPath = state.projectPath;
  const packageJsonPath = path.join(projectPath, 'package.json');
  const angularJsonPath = path.join(projectPath, 'angular.json');

  if (!fs.existsSync(packageJsonPath)) {
    return {
      isComplete: true,
      lastError: `package.json not found at ${packageJsonPath}`,
    };
  }

  if (!fs.existsSync(angularJsonPath)) {
    return {
      isComplete: true,
      lastError: `angular.json not found at ${angularJsonPath}`,
    };
  }

  // Detect current Angular version if not provided
  let currentVersion = state.currentVersion;
  if (!currentVersion) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const angularCore = packageJson.dependencies?.['@angular/core'] ||
                         packageJson.devDependencies?.['@angular/core'];

      if (angularCore) {
        // Extract version number (e.g., "^15.2.0" -> "15")
        const versionMatch = angularCore.match(/(\d+)\./);
        if (versionMatch) {
          currentVersion = versionMatch[1];
        }
      }
    } catch (error) {
      return {
        isComplete: true,
        lastError: `Failed to detect Angular version: ${error}`,
      };
    }
  }

  if (!currentVersion) {
    return {
      isComplete: true,
      lastError: 'Could not detect Angular version from package.json',
    };
  }

  // Validate versions
  const current = parseInt(currentVersion, 10);
  const target = parseInt(state.targetVersion, 10);

  if (isNaN(current) || isNaN(target)) {
    return {
      isComplete: true,
      lastError: `Invalid version numbers: current=${currentVersion}, target=${state.targetVersion}`,
    };
  }

  if (current >= target) {
    return {
      isComplete: true,
      lastError: `Project is already at or beyond target version (current: v${current}, target: v${target})`,
    };
  }

  console.log(`✅ Project validated: Angular v${current} → v${target}`);

  // Update state with validated information
  return {
    currentVersion,
    currentStepIndex: 0,
    lastError: null,
  };
}

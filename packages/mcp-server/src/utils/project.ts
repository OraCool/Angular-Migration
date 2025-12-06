/**
 * Project Utilities
 * Common operations for Angular project analysis
 * Eliminates duplication of file reading and version parsing logic
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Result of reading package.json
 */
export interface PackageJsonResult {
  success: boolean;
  data?: any;
  error?: string;
  path?: string;
}

/**
 * Angular version information
 */
export interface AngularVersionInfo {
  success: boolean;
  version?: string;
  major?: number;
  minor?: number;
  patch?: number;
  error?: string;
}

/**
 * Node.js version information
 */
export interface NodeVersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
}

/**
 * Utility class for common Angular project operations
 */
export class ProjectUtils {
  /**
   * Read and parse package.json from a project directory
   *
   * @param projectPath - Path to project root
   * @returns Package.json contents or error
   *
   * @example
   * ```typescript
   * const result = ProjectUtils.readPackageJson('/path/to/project');
   * if (!result.success) {
   *   return ResponseBuilder.error({...});
   * }
   * const packageJson = result.data;
   * ```
   */
  static readPackageJson(projectPath: string): PackageJsonResult {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return {
        success: false,
        error: `package.json not found at ${packageJsonPath}`,
        path: packageJsonPath,
      };
    }

    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const data = JSON.parse(content);
      return {
        success: true,
        data,
        path: packageJsonPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to parse package.json: ${errorMessage}`,
        path: packageJsonPath,
      };
    }
  }

  /**
   * Get Angular version from package.json
   *
   * @param projectPath - Path to project root
   * @returns Angular version information
   *
   * @example
   * ```typescript
   * const version = ProjectUtils.getAngularVersion('/path/to/project');
   * if (!version.success) {
   *   console.error(version.error);
   * } else {
   *   console.log(`Angular ${version.major}.${version.minor}.${version.patch}`);
   * }
   * ```
   */
  static getAngularVersion(projectPath: string): AngularVersionInfo {
    const pkgResult = this.readPackageJson(projectPath);
    if (!pkgResult.success) {
      return { success: false, error: pkgResult.error };
    }

    const angularCore =
      pkgResult.data.dependencies?.['@angular/core'] ||
      pkgResult.data.devDependencies?.['@angular/core'];

    if (!angularCore) {
      return {
        success: false,
        error: '@angular/core not found in dependencies or devDependencies',
      };
    }

    // Parse version (supports formats: ^18.0.0, ~18.0.0, 18.0.0, >=18.0.0)
    const versionMatch = angularCore.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch) {
      return {
        success: false,
        error: `Could not parse Angular version: ${angularCore}`,
      };
    }

    const [, major, minor, patch] = versionMatch;

    return {
      success: true,
      version: angularCore,
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
    };
  }

  /**
   * Get current Node.js version
   *
   * @returns Node.js version information
   *
   * @example
   * ```typescript
   * const node = ProjectUtils.getNodeVersion();
   * console.log(`Node.js ${node.major}.${node.minor}.${node.patch}`);
   * ```
   */
  static getNodeVersion(): NodeVersionInfo {
    const version = process.version; // e.g., "v22.11.0"
    const match = version.match(/v(\d+)\.(\d+)\.(\d+)/);

    if (!match) {
      // Fallback - should never happen
      return {
        version,
        major: 0,
        minor: 0,
        patch: 0,
      };
    }

    const [, major, minor, patch] = match;

    return {
      version,
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
    };
  }

  /**
   * Check if Angular version is within supported range
   *
   * @param major - Angular major version
   * @param minSupported - Minimum supported version (default: 14)
   * @param maxSupported - Maximum supported version (default: 20)
   * @returns True if version is supported
   */
  static isAngularVersionSupported(
    major: number,
    minSupported: number = 14,
    maxSupported: number = 20
  ): boolean {
    return major >= minSupported && major <= maxSupported;
  }

  /**
   * Generate migration path from current version to target
   *
   * @param fromMajor - Current Angular major version
   * @param toMajor - Target Angular major version (default: 20)
   * @returns Array of version strings representing migration path
   *
   * @example
   * ```typescript
   * const path = ProjectUtils.generateMigrationPath(15, 18);
   * // Returns: ['16.0.0', '17.0.0', '18.0.0']
   * ```
   */
  static generateMigrationPath(fromMajor: number, toMajor: number = 20): string[] {
    const path: string[] = [];
    for (let v = fromMajor + 1; v <= toMajor; v++) {
      path.push(`${v}.0.0`);
    }
    return path;
  }

  /**
   * Get required Node.js version for Angular version
   *
   * @param angularMajor - Angular major version
   * @returns Minimum required Node.js major version
   *
   * @example
   * ```typescript
   * const required = ProjectUtils.getRequiredNodeVersion(18);
   * console.log(`Node.js ${required}+ required`); // "Node.js 18+ required"
   * ```
   */
  static getRequiredNodeVersion(angularMajor: number): number {
    // Angular version to Node.js version mapping
    // Based on official Angular requirements
    if (angularMajor >= 19) return 22;
    if (angularMajor >= 17) return 20;
    if (angularMajor >= 15) return 18;
    return 14; // Minimum for older versions
  }

  /**
   * Check if project directory contains angular.json
   *
   * @param projectPath - Path to check
   * @returns True if angular.json exists
   */
  static isAngularProject(projectPath: string): boolean {
    const angularJsonPath = path.join(projectPath, 'angular.json');
    return fs.existsSync(angularJsonPath);
  }

  /**
   * Get project dependencies from package.json
   *
   * @param projectPath - Path to project root
   * @returns Combined dependencies and devDependencies
   */
  static getProjectDependencies(projectPath: string): Record<string, string> | null {
    const pkgResult = this.readPackageJson(projectPath);
    if (!pkgResult.success) {
      return null;
    }

    return {
      ...(pkgResult.data.dependencies || {}),
      ...(pkgResult.data.devDependencies || {}),
    };
  }

  /**
   * Check if a specific package is installed
   *
   * @param projectPath - Path to project root
   * @param packageName - Package name to check
   * @returns True if package is found in dependencies
   */
  static hasPackage(projectPath: string, packageName: string): boolean {
    const deps = this.getProjectDependencies(projectPath);
    return deps ? packageName in deps : false;
  }

  /**
   * Validate project path exists and is a directory
   *
   * @param projectPath - Path to validate
   * @returns Validation result with error message if invalid
   */
  static validateProjectPath(projectPath: string): { valid: boolean; error?: string } {
    if (!fs.existsSync(projectPath)) {
      return {
        valid: false,
        error: `Project path does not exist: ${projectPath}`,
      };
    }

    const stat = fs.statSync(projectPath);
    if (!stat.isDirectory()) {
      return {
        valid: false,
        error: `Project path is not a directory: ${projectPath}`,
      };
    }

    return { valid: true };
  }
}

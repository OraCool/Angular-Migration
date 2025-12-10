/**
 * Validation Tools
 * Handles project, Node version, and dependency validation
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { SessionManager } from '../session/manager.js';
import { ToolResult, ValidationInfo, ProgressCallback } from '../types.js';
import {
  getCurrentNodeVersion,
  getRecommendedNodeVersion,
  isVersionCompatible,
} from '@angular-migration/workflow-engine';

export async function handleValidationTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback?: ProgressCallback
): Promise<ToolResult> {
  switch (toolName) {
    case 'validate_project':
      return await validateProject(args);
    case 'validate_node_version':
      return await validateNodeVersion(args);
    case 'validate_dependencies':
      return await validateDependencies(args);
    case 'validate_material_mdc_readiness':
      return await validateMaterialMdcReadiness(args);
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

/**
 * Validate project readiness for Angular Material v15 MDC migration
 * Checks for deprecated Material properties that block MDC migration
 */
async function validateMaterialMdcReadiness(
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
    const findings: Record<string, string[]> = {};

    const srcPath = path.join(projectPath, 'src');

    // Check if src directory exists
    try {
      await fs.access(srcPath);
    } catch {
      return {
        success: false,
        error: `Source directory not found: ${srcPath}`,
      };
    }

    // Helper function to find files recursively
    async function findFiles(
      dir: string,
      pattern: RegExp,
      extensions: string[]
    ): Promise<Array<{ file: string; matches: string[] }>> {
      const results: Array<{ file: string; matches: string[] }> = [];

      async function walk(currentDir: string): Promise<void> {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await walk(fullPath);
            }
          } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            const content = await fs.readFile(fullPath, 'utf-8');
            const matches = content.match(pattern);

            if (matches && matches.length > 0) {
              results.push({
                file: path.relative(projectPath, fullPath),
                matches: [...new Set(matches)], // Unique matches
              });
            }
          }
        }
      }

      await walk(dir);
      return results;
    }

    // 1. Check for floatLabel="never" (CRITICAL - blocks MDC migration)
    const floatLabelFiles = await findFiles(
      srcPath,
      /floatLabel\s*=\s*["']never["']/g,
      ['.html']
    );

    if (floatLabelFiles.length > 0) {
      errors.push(
        `Found ${floatLabelFiles.length} file(s) using floatLabel="never" (BLOCKS MDC migration)`
      );
      findings['floatLabel="never"'] = floatLabelFiles.map(f => f.file);
      suggestions.push(
        'Replace floatLabel="never" with floatLabel="auto" before v15 upgrade'
      );
    }

    // 2. Check for appearance="standard" (CRITICAL - blocks MDC migration)
    const appearanceFiles = await findFiles(
      srcPath,
      /appearance\s*=\s*["']standard["']/g,
      ['.html']
    );

    if (appearanceFiles.length > 0) {
      errors.push(
        `Found ${appearanceFiles.length} file(s) using appearance="standard" (BLOCKS MDC migration)`
      );
      findings['appearance="standard"'] = appearanceFiles.map(f => f.file);
      suggestions.push(
        'Replace appearance="standard" with appearance="outline" or "fill" before v15 upgrade'
      );
    }

    // 3. Check for mat-tab-nav-bar without [tabPanel] (WARNING)
    const tabNavBarFiles = await findFiles(
      srcPath,
      /<mat-tab-nav-bar(?![^>]*\[tabPanel\])/g,
      ['.html']
    );

    if (tabNavBarFiles.length > 0) {
      warnings.push(
        `Found ${tabNavBarFiles.length} file(s) using mat-tab-nav-bar without [tabPanel] binding`
      );
      findings['mat-tab-nav-bar missing [tabPanel]'] = tabNavBarFiles.map(f => f.file);
      suggestions.push(
        'Add [tabPanel] binding to mat-tab-nav-bar and wrap content in <mat-tab-nav-panel>'
      );
    }

    // 4. Check for Material Slider usage (MANUAL MIGRATION REQUIRED)
    const sliderFiles = await findFiles(
      srcPath,
      /<mat-slider/g,
      ['.html']
    );

    if (sliderFiles.length > 0) {
      warnings.push(
        `Found ${sliderFiles.length} file(s) using mat-slider (MANUAL migration required)`
      );
      findings['mat-slider'] = sliderFiles.map(f => f.file);
      suggestions.push(
        'Material Slider was completely rewritten in v15 - manual migration required after upgrade'
      );
    }

    // 5. Check for legacy Material CSS classes
    const legacyCssFiles = await findFiles(
      srcPath,
      /\.(mat-form-field-flex|mat-form-field-outline|mat-form-field-infix)\b/g,
      ['.scss', '.css']
    );

    if (legacyCssFiles.length > 0) {
      warnings.push(
        `Found ${legacyCssFiles.length} file(s) using legacy Material CSS classes`
      );
      findings['Legacy CSS classes'] = legacyCssFiles.map(f => f.file);
      suggestions.push(
        'Update CSS classes: mat-form-field-* → mat-mdc-form-field-*'
      );
    }

    // 6. Check if Angular Material is installed
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (!deps['@angular/material']) {
        suggestions.push('Angular Material not detected in this project');
      } else {
        const materialVersion = deps['@angular/material'];
        suggestions.push(`Current Angular Material version: ${materialVersion}`);
      }
    } catch {
      warnings.push('Could not read package.json');
    }

    const validation: ValidationInfo = {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };

    // Build detailed report
    let detailedReport = '# Material MDC Readiness Report\n\n';

    if (errors.length === 0 && warnings.length === 0) {
      detailedReport += '✅ **No blocking issues found!** Project appears ready for Material v15 MDC migration.\n\n';
    } else {
      detailedReport += '## Summary\n\n';
      if (errors.length > 0) {
        detailedReport += `- **${errors.length} CRITICAL issue(s)** that will block MDC migration\n`;
      }
      if (warnings.length > 0) {
        detailedReport += `- **${warnings.length} warning(s)** that require attention\n`;
      }
      detailedReport += '\n';
    }

    if (Object.keys(findings).length > 0) {
      detailedReport += '## Findings\n\n';
      for (const [issue, files] of Object.entries(findings)) {
        detailedReport += `### ${issue}\n\n`;
        detailedReport += `**Affected files (${files.length}):**\n`;
        files.forEach(file => {
          detailedReport += `- ${file}\n`;
        });
        detailedReport += '\n';
      }
    }

    if (suggestions.length > 0) {
      detailedReport += '## Recommended Actions\n\n';
      suggestions.forEach((suggestion, index) => {
        detailedReport += `${index + 1}. ${suggestion}\n`;
      });
      detailedReport += '\n';
    }

    detailedReport += '## Next Steps\n\n';
    if (errors.length > 0) {
      detailedReport += '1. Fix all CRITICAL issues listed above before upgrading to Angular 15\n';
      detailedReport += '2. Run `migration_v15_apply_breaking_changes` after upgrade to automate remaining fixes\n';
      detailedReport += '3. Review Material Slider usage and plan manual migration\n';
    } else {
      detailedReport += '1. Proceed with Angular 15 upgrade\n';
      detailedReport += '2. Run `migration_v15_apply_breaking_changes` to apply automated MDC fixes\n';
      detailedReport += '3. Test Material components thoroughly after migration\n';
    }

    detailedReport += '\n**Documentation:** Read guide://material-mdc-migration for detailed migration instructions\n';

    return {
      success: true,
      data: {
        ...validation,
        findings,
        report: detailedReport,
        ready: errors.length === 0,
      },
      message: validation.valid
        ? 'Project is ready for Material MDC migration'
        : 'Project has blocking issues for Material MDC migration',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

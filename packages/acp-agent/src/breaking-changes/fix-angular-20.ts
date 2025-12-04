/**
 * Angular 20 Breaking Changes Fixes
 * 
 * Key Changes in Angular 20:
 * - Highcharts v11 → v12 migration
 * - highcharts-angular v4 → v5 migration
 * - Final deprecated package replacements
 * - Zoneless mode available (experimental)
 * - Material 3 is default
 * - Node.js 20.11+ or 22+ required
 * - TypeScript 5.6+ required
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FixResult } from './index.js';

export async function fixAngular20BreakingChanges(projectPath: string): Promise<FixResult> {
  const details: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Verify this is an Angular project
    const angularJsonPath = path.join(projectPath, 'angular.json');
    try {
      await fs.access(angularJsonPath);
    } catch {
      return {
        success: false,
        message: 'Not an Angular project',
        details: [],
        warnings: [],
        errors: ['angular.json not found in project root']
      };
    }

    details.push('Starting Angular 20 breaking changes fixes...');

    // 1. Check Highcharts usage and version
    await checkHighchartsVersion(projectPath, details, warnings);

    // 2. Check highcharts-angular version
    await checkHighchartsAngularVersion(projectPath, details, warnings);

    // 3. Final check for deprecated packages
    await finalDeprecatedPackagesCheck(projectPath, details, warnings, errors);

    // 4. Check zoneless mode readiness
    await checkZonelessMode(projectPath, details, warnings);

    // 5. Verify Node.js version
    await verifyNodeVersion(projectPath, details, warnings);

    // 6. Verify TypeScript version
    await verifyTypeScriptVersion(projectPath, details, warnings);

    // 7. Check Material 3 theme
    await checkMaterial3Theme(projectPath, details, warnings);

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? 'Angular 20 breaking changes check complete'
        : 'Angular 20 breaking changes check complete with critical issues',
      details,
      warnings,
      errors
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: 'Failed to check Angular 20 breaking changes',
      details,
      warnings,
      errors
    };
  }
}

async function checkHighchartsVersion(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[1/7] Checking Highcharts version and usage...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const highchartsVersion = packageJson.dependencies?.highcharts;

    if (highchartsVersion) {
      details.push(`  Current Highcharts version: ${highchartsVersion}`);

      const srcPath = path.join(projectPath, 'src');
      const tsFiles = await findFiles(srcPath, ['.ts']);

      const filesWithHighcharts = tsFiles.filter(async file => {
        try {
          const content = await fs.readFile(file, 'utf-8');
          return content.includes('highcharts') || content.includes('from \'highcharts\'');
        } catch {
          return false;
        }
      });

      if (filesWithHighcharts.length > 0) {
        warnings.push('Highcharts v12 Breaking Changes:');
        warnings.push('  - Enhanced accessibility features (may affect custom a11y)');
        warnings.push('  - Some deprecated methods removed');
        warnings.push('  - Improved TypeScript types (may reveal type issues)');
        warnings.push('');
        warnings.push('Action Required:');
        warnings.push('  1. Review Highcharts v12 changelog');
        warnings.push('  2. Test all chart types and configurations');
        warnings.push('  3. Verify custom chart options still work');
        warnings.push('  4. Check accessibility features');
      } else {
        details.push('✓ No Highcharts usage found in source files');
      }
    } else {
      details.push('✓ Highcharts not used in project');
    }
  } catch (error) {
    warnings.push('Could not check Highcharts version');
  }
}

async function checkHighchartsAngularVersion(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[2/7] Checking highcharts-angular version...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const hcAngularVersion = packageJson.dependencies?.['highcharts-angular'];

    if (hcAngularVersion) {
      details.push(`  Current highcharts-angular version: ${hcAngularVersion}`);
      warnings.push('highcharts-angular v5 requires Angular 20+');
      warnings.push('Verify compatibility after update');
    } else {
      details.push('ℹ highcharts-angular not found');
    }
  } catch (error) {
    warnings.push('Could not check highcharts-angular version');
  }
}

async function finalDeprecatedPackagesCheck(
  projectPath: string,
  details: string[],
  warnings: string[],
  errors: string[]
): Promise<void> {
  details.push('[3/7] Final check for packages requiring replacement...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    let mustReplace = false;

    // Check for ngx-material-timepicker
    if (dependencies['ngx-material-timepicker']) {
      errors.push('⚠️ CRITICAL: ngx-material-timepicker should be replaced');
      errors.push('Recommended replacements:');
      errors.push('  1. Angular Material Datepicker + Luxon adapter:');
      errors.push('     npm install @angular/material-luxon-adapter luxon');
      errors.push('  2. ngx-mat-timepicker (actively maintained):');
      errors.push('     npm install ngx-mat-timepicker');
      errors.push('  3. Custom implementation with Material form controls');
      mustReplace = true;
    }

    // Check for @swimlane/ngx-graph
    if (dependencies['@swimlane/ngx-graph']) {
      warnings.push('⚠️ WARNING: @swimlane/ngx-graph may have compatibility issues');
      warnings.push('Consider alternatives:');
      warnings.push('  1. ngx-charts (same team, better maintained)');
      warnings.push('  2. echarts-for-angular');
      warnings.push('  3. D3.js direct integration');
      warnings.push('  4. Fork and maintain if critical to your app');
      mustReplace = true;
    }

    // Check for ngx-perfect-scrollbar
    if (dependencies['ngx-perfect-scrollbar']) {
      errors.push('❌ CRITICAL ERROR: ngx-perfect-scrollbar still present!');
      errors.push('This should have been removed in Angular 16');
      mustReplace = true;
    }

    if (mustReplace) {
      warnings.push('');
      warnings.push('🚨 Package replacements required before production!');
    } else {
      details.push('✓ No deprecated packages requiring immediate replacement');
    }
  } catch (error) {
    warnings.push('Could not check package.json');
  }
}

async function checkZonelessMode(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[4/7] Checking zoneless mode readiness...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const hasZoneJs = packageJson.dependencies?.['zone.js'] || packageJson.devDependencies?.['zone.js'];

    if (hasZoneJs) {
      warnings.push('ℹ️ Angular 20 supports zoneless mode (experimental)');
      warnings.push('Benefits of zoneless:');
      warnings.push('  - ~30% smaller bundles (no zone.js)');
      warnings.push('  - Better performance');
      warnings.push('  - Simpler mental model');
      warnings.push('');
      warnings.push('To evaluate zoneless mode:');
      warnings.push('  1. Set up development environment');
      warnings.push('  2. Remove zone.js from polyfills');
      warnings.push('  3. Test application thoroughly');
      warnings.push('  4. Measure performance improvements');
    } else {
      details.push('✓ Already in zoneless mode');
    }
  } catch (error) {
    warnings.push('Could not check zone.js presence');
  }
}

async function verifyNodeVersion(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[5/7] Verifying Node.js version...');

  try {
    const nodeVersion = process.version.slice(1); // Remove 'v' prefix
    const nodeMajor = parseInt(nodeVersion.split('.')[0]);

    details.push(`  Current Node.js version: ${nodeVersion}`);

    if (nodeMajor < 20) {
      warnings.push('Angular 20 recommends Node.js 20.11+ or 22+');
      warnings.push(`Current version (${nodeVersion}) may work but is not recommended`);
    } else if (nodeMajor === 20) {
      details.push('✓ Node.js 20 LTS - Good choice');
    } else if (nodeMajor >= 22) {
      details.push('✓ Node.js 22+ - Latest LTS');
    } else {
      details.push('✓ Node.js version compatible');
    }
  } catch (error) {
    warnings.push('Could not verify Node.js version');
  }
}

async function verifyTypeScriptVersion(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[6/7] Verifying TypeScript version...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const tsVersion = packageJson.devDependencies?.typescript || 'unknown';
    details.push(`  Current TypeScript version: ${tsVersion}`);

    if (tsVersion === 'unknown' || compareVersion(tsVersion, '5.6.0') < 0) {
      warnings.push('Angular 20 requires TypeScript 5.6+');
    } else {
      details.push('✓ TypeScript version compatible');
    }
  } catch (error) {
    warnings.push('Could not verify TypeScript version');
  }
}

async function checkMaterial3Theme(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[7/7] Checking Material 3 theme setup...');

  const srcPath = path.join(projectPath, 'src');
  const scssFiles = await findFiles(srcPath, ['.scss']);

  const themeFiles = scssFiles.filter(async file => {
    try {
      const content = await fs.readFile(file, 'utf-8');
      return content.includes('@angular/material');
    } catch {
      return false;
    }
  });

  if (themeFiles.length > 0) {
    warnings.push('ℹ️ Material 3 is the default in Angular 20');
    warnings.push('Verify your custom themes:');
    warnings.push('  - Use Material 3 design tokens');
    warnings.push('  - Update color palettes if needed');
    warnings.push('  - Test component density settings');
  } else {
    details.push('✓ Using default Material theme');
  }
}

async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          }
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Silently skip directories we can't read
    }
  }

  await walk(dir);
  return files;
}

function compareVersion(version1: string, version2: string): number {
  // Remove ^ ~ and other prefixes
  const clean1 = version1.replace(/^[\^~>=<]+/, '');
  const clean2 = version2.replace(/^[\^~>=<]+/, '');

  const parts1 = clean1.split('.').map(n => parseInt(n) || 0);
  const parts2 = clean2.split('.').map(n => parseInt(n) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

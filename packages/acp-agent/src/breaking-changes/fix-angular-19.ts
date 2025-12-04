/**
 * Angular 19 Breaking Changes Fixes
 * 
 * Key Changes in Angular 19:
 * - AG-Grid v31 → v32 migration (Row selection syntax)
 * - Package compatibility warnings (ngx-material-timepicker, @swimlane/ngx-graph)
 * - TypeScript 5.5+ required
 * - Signals are stable
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FixResult } from './index.js';

export async function fixAngular19BreakingChanges(projectPath: string): Promise<FixResult> {
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

    details.push('Starting Angular 19 breaking changes fixes...');

    // 1. Check for AG-Grid row selection updates
    await checkAGGridRowSelection(projectPath, details, warnings);

    // 2. Check for deprecated packages
    await checkDeprecatedPackages(projectPath, details, warnings);

    // 3. Verify TypeScript version
    await verifyTypeScriptVersion(projectPath, details, warnings);

    // 4. Check marked package version
    await checkMarkedVersion(projectPath, details, warnings);

    // 5. Check Signals adoption
    await checkSignalsAdoption(projectPath, details, warnings);

    return {
      success: true,
      message: 'Angular 19 breaking changes check complete',
      details,
      warnings,
      errors
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: 'Failed to check Angular 19 breaking changes',
      details,
      warnings,
      errors
    };
  }
}

async function checkAGGridRowSelection(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[1/5] Checking for AG-Grid row selection updates...');

  const srcPath = path.join(projectPath, 'src');
  const tsFiles = await findFiles(srcPath, ['.ts']);

  let hasAGGrid = false;
  const oldSyntaxFiles: string[] = [];

  for (const file of tsFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');

      if (content.includes('ag-grid')) {
        hasAGGrid = true;

        // Check for old row selection syntax
        if (/rowSelection\s*[:=]\s*['"]single['"]/.test(content) ||
            /rowSelection\s*[:=]\s*['"]multiple['"]/.test(content)) {
          oldSyntaxFiles.push(path.relative(projectPath, file));
        }

        // Check for suppressCellSelection (deprecated)
        if (content.includes('suppressCellSelection')) {
          let updatedContent = content.replace(/suppressCellSelection/g, 'suppressCellFocus');
          await fs.writeFile(file, updatedContent, 'utf-8');
          details.push(`  Updated suppressCellSelection → suppressCellFocus in ${path.relative(projectPath, file)}`);
        }
      }
    } catch {
      // Skip files we can't read
    }
  }

  if (hasAGGrid) {
    details.push('  Found AG-Grid usage in project');

    if (oldSyntaxFiles.length > 0) {
      warnings.push('Found old AG-Grid row selection syntax in:');
      oldSyntaxFiles.forEach(file => warnings.push(`  ${file}`));
      warnings.push('');
      warnings.push('Update required:');
      warnings.push("  OLD: rowSelection: 'single'");
      warnings.push("  NEW: rowSelection: { mode: 'singleRow' }");
      warnings.push('');
      warnings.push("  OLD: rowSelection: 'multiple'");
      warnings.push("  NEW: rowSelection: { mode: 'multiRow' }");
    } else {
      details.push('✓ No old row selection syntax found');
    }
  } else {
    details.push('✓ No AG-Grid usage found');
  }
}

async function checkDeprecatedPackages(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[2/5] Checking for deprecated/unmaintained packages...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Check for ngx-material-timepicker
    if (dependencies['ngx-material-timepicker']) {
      warnings.push('⚠️ ngx-material-timepicker has limited Angular 19 support');
      warnings.push('Consider migrating to:');
      warnings.push('  - Angular Material datepicker with Luxon adapter');
      warnings.push('  - ngx-mat-timepicker (actively maintained)');
      warnings.push('  - Custom implementation');
    }

    // Check for @swimlane/ngx-graph
    if (dependencies['@swimlane/ngx-graph']) {
      warnings.push('⚠️ @swimlane/ngx-graph has limited recent updates');
      warnings.push('Test thoroughly or consider alternatives:');
      warnings.push('  - ngx-charts (same team, better maintained)');
      warnings.push('  - echarts-for-angular');
      warnings.push('  - D3.js direct integration');
    }

    // Check for ngx-perfect-scrollbar
    if (dependencies['ngx-perfect-scrollbar']) {
      warnings.push('❌ CRITICAL: ngx-perfect-scrollbar should have been removed in Angular 16');
      warnings.push('This package is no longer compatible');
    }

    if (warnings.length === 1) {
      // Only the section header was added
      details.push('✓ No deprecated packages found');
    }
  } catch (error) {
    warnings.push(`Could not check package.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function verifyTypeScriptVersion(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[3/5] Verifying TypeScript version...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const tsVersion = packageJson.devDependencies?.typescript || 'unknown';
    details.push(`  Current TypeScript version: ${tsVersion}`);

    if (tsVersion === 'unknown' || compareVersion(tsVersion, '5.5.0') < 0) {
      warnings.push('Angular 19 requires TypeScript 5.5+');
    } else {
      details.push('✓ TypeScript version compatible');
    }
  } catch (error) {
    warnings.push('Could not verify TypeScript version');
  }
}

async function checkMarkedVersion(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[4/5] Checking marked package version...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const markedVersion = packageJson.dependencies?.marked;

    if (markedVersion) {
      details.push(`  Current marked version: ${markedVersion}`);

      if (compareVersion(markedVersion, '14.0.0') < 0) {
        warnings.push('Consider updating marked to v14 for Angular 19');
        warnings.push('Test markdown rendering after update');
      } else {
        details.push('✓ marked version compatible');
      }
    } else {
      details.push('ℹ marked package not found');
    }
  } catch (error) {
    warnings.push('Could not check marked version');
  }
}

async function checkSignalsAdoption(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[5/5] Checking for Signals adoption...');

  const srcPath = path.join(projectPath, 'src');
  const tsFiles = await findFiles(srcPath, ['.ts']);

  let signalsUsageCount = 0;

  for (const file of tsFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.match(/\b(signal|computed|effect)\b/g);
      if (matches) {
        signalsUsageCount += matches.length;
      }
    } catch {
      // Skip files we can't read
    }
  }

  if (signalsUsageCount < 5) {
    warnings.push('ℹ️ Signals are stable in Angular 19');
    warnings.push('Consider using signals for new reactive state:');
    warnings.push('  - signal() for reactive values');
    warnings.push('  - computed() for derived state');
    warnings.push('  - effect() for side effects');
  } else {
    details.push('✓ Signals already in use');
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

/**
 * Angular 17 Breaking Changes Fixes
 * 
 * Key Changes in Angular 17:
 * - Material MDC Migration (Legacy components removed)
 * - Control Flow syntax available (@if, @for, @switch)
 * - TypeScript 5.2+ required
 * - appearance="legacy" removed from form fields
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import type { FixResult } from './index.js';

export async function fixAngular17BreakingChanges(projectPath: string): Promise<FixResult> {
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

    details.push('Starting Angular 17 breaking changes fixes...');

    // 1. Run Material MDC Migration Schematic
    await runMDCMigration(projectPath, details, warnings);

    // 2. Check for remaining legacy components
    await checkLegacyComponents(projectPath, details, warnings);

    // 3. Fix form field appearances
    await fixFormFieldAppearances(projectPath, details, warnings);

    // 4. Verify TypeScript version
    await verifyTypeScriptVersion(projectPath, details, warnings);

    // 5. Check custom Material themes
    await checkCustomThemes(projectPath, details, warnings);

    return {
      success: true,
      message: 'Angular 17 breaking changes applied successfully',
      details,
      warnings,
      errors
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: 'Failed to apply Angular 17 breaking changes',
      details,
      warnings,
      errors
    };
  }
}

async function runMDCMigration(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[1/5] Running Material MDC Migration...');

  try {
    // Run the Angular Material MDC migration schematic
    const output = execSync(
      'npx ng generate @angular/material:mdc-migration --defaults',
      {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      }
    );
    details.push('✓ MDC migration complete');
    if (output) {
      details.push(`  ${output.trim()}`);
    }
  } catch (error) {
    warnings.push('MDC migration schematic not available or already applied');
  }
}

async function checkLegacyComponents(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[2/5] Checking for remaining legacy components...');

  const srcPath = path.join(projectPath, 'src');
  const files = await findFiles(srcPath, ['.html', '.ts']);

  const legacyUsages: string[] = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes('mat-legacy-')) {
        legacyUsages.push(path.relative(projectPath, file));
      }
    } catch {
      // Skip files we can't read
    }
  }

  if (legacyUsages.length > 0) {
    warnings.push('Found legacy components that need manual migration:');
    legacyUsages.slice(0, 10).forEach(file => warnings.push(`  ${file}`));
    if (legacyUsages.length > 10) {
      warnings.push(`  ... and ${legacyUsages.length - 10} more`);
    }
    warnings.push('These components were removed in Angular 17.');
  } else {
    details.push('✓ No legacy components found');
  }
}

async function fixFormFieldAppearances(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[3/5] Checking form field appearances...');

  const srcPath = path.join(projectPath, 'src');
  const htmlFiles = await findFiles(srcPath, ['.html']);

  let filesUpdated = 0;

  for (const file of htmlFiles) {
    try {
      let content = await fs.readFile(file, 'utf-8');

      if (content.includes('appearance="legacy"')) {
        // Replace appearance="legacy" with appearance="outline"
        content = content.replace(/appearance="legacy"/g, 'appearance="outline"');
        await fs.writeFile(file, content, 'utf-8');
        filesUpdated++;
      }
    } catch (error) {
      warnings.push(`Failed to update ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (filesUpdated > 0) {
    details.push(`✓ Updated form field appearances to 'outline' in ${filesUpdated} file(s)`);
    warnings.push("Review if 'fill' appearance is preferred for some fields");
  } else {
    details.push('✓ No legacy appearances found');
  }
}

async function verifyTypeScriptVersion(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[4/5] Verifying TypeScript version...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const tsVersion = packageJson.devDependencies?.typescript || 'unknown';
    details.push(`  Current TypeScript version: ${tsVersion}`);

    if (tsVersion === 'unknown' || compareVersion(tsVersion, '5.2.0') < 0) {
      warnings.push('Angular 17 requires TypeScript 5.2+');
      warnings.push(`Current version (${tsVersion}) may be incompatible`);
    } else {
      details.push('✓ TypeScript version compatible');
    }
  } catch (error) {
    warnings.push('Could not verify TypeScript version');
  }
}

async function checkCustomThemes(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[5/5] Checking for custom Material themes...');

  const srcPath = path.join(projectPath, 'src');
  const scssFiles = await findFiles(srcPath, ['.scss']);

  const themeFiles = scssFiles.filter(file =>
    file.includes('theme') || file.includes('material')
  );

  if (themeFiles.length > 0) {
    warnings.push('Found theme files that may need updates for MDC components:');
    themeFiles.forEach(file => warnings.push(`  ${path.relative(projectPath, file)}`));
    warnings.push('Review Material theming documentation: https://material.angular.io/guide/theming');
  } else {
    details.push('✓ No custom theme files found');
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

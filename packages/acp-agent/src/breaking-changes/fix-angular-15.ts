/**
 * Angular 15 Breaking Changes Fixes
 * 
 * Key Changes in Angular 15:
 * - Material Chips API redesign (mat-chip-list → mat-chip-listbox)
 * - Removal of legacy View Engine compiler
 * - Optional Standalone Components API
 * - RxJS 7.5+ interop changes
 * - MatLegacy* components deprecated
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FixResult } from './index.js';

export async function fixAngular15BreakingChanges(projectPath: string): Promise<FixResult> {
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

    details.push('Starting Angular 15 breaking changes fixes...');

    // 1. Fix Material Chips API
    await fixMaterialChipsAPI(projectPath, details, warnings);

    // 2. Update TypeScript chip references
    await fixTypeScriptChipReferences(projectPath, details, warnings);

    // 3. Fix Polyfills configuration
    await fixPolyfills(projectPath, details, warnings);

    // 4. Update test files
    await fixTestFiles(projectPath, details, warnings);

    // 5. Verify module imports
    await verifyModuleImports(projectPath, details, warnings);

    return {
      success: true,
      message: 'Angular 15 breaking changes applied successfully',
      details,
      warnings,
      errors
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: 'Failed to apply Angular 15 breaking changes',
      details,
      warnings,
      errors
    };
  }
}

async function fixMaterialChipsAPI(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[1/5] Fixing Material Chips API...');

  const srcPath = path.join(projectPath, 'src');
  const htmlFiles = await findFiles(srcPath, '.html');

  let filesUpdated = 0;

  for (const file of htmlFiles) {
    try {
      let content = await fs.readFile(file, 'utf-8');

      if (content.includes('mat-chip-list')) {
        // Replace mat-chip-list with mat-chip-listbox
        content = content.replace(/<mat-chip-list/g, '<mat-chip-listbox');
        content = content.replace(/<\/mat-chip-list>/g, '</mat-chip-listbox>');
        content = content.replace(/mat-chip-list/g, 'mat-chip-listbox');

        // Replace mat-chip with mat-chip-option (for selectable chips)
        content = content.replace(/<mat-chip\s/g, '<mat-chip-option ');
        content = content.replace(/<\/mat-chip>/g, '</mat-chip-option>');

        await fs.writeFile(file, content, 'utf-8');
        filesUpdated++;
        details.push(`  Updated: ${path.relative(projectPath, file)}`);
      }
    } catch (error) {
      warnings.push(`Failed to update ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (filesUpdated > 0) {
    details.push(`✓ Material Chips API updated in ${filesUpdated} file(s)`);
  } else {
    details.push('ℹ No mat-chip-list usage found');
  }
}

async function fixTypeScriptChipReferences(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[2/5] Updating TypeScript chip references...');

  const srcPath = path.join(projectPath, 'src');
  const tsFiles = await findFiles(srcPath, '.ts');

  let filesUpdated = 0;

  for (const file of tsFiles) {
    try {
      let content = await fs.readFile(file, 'utf-8');

      if (content.includes('MatChipList')) {
        // Replace MatChipList imports and usages
        content = content.replace(/MatChipList/g, 'MatChipListbox');
        content = content.replace(/MatChip,/g, 'MatChipOption,');
        content = content.replace(/MatChip$/gm, 'MatChipOption');

        await fs.writeFile(file, content, 'utf-8');
        filesUpdated++;
        details.push(`  Updated: ${path.relative(projectPath, file)}`);
      }
    } catch (error) {
      warnings.push(`Failed to update ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (filesUpdated > 0) {
    details.push(`✓ TypeScript chip references updated in ${filesUpdated} file(s)`);
  } else {
    details.push('ℹ No MatChipList references found in TypeScript');
  }
}

async function fixPolyfills(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[3/5] Checking polyfills configuration...');

  const polyfillsPath = path.join(projectPath, 'src', 'polyfills.ts');

  try {
    await fs.access(polyfillsPath);
    let content = await fs.readFile(polyfillsPath, 'utf-8');

    if (content.includes("import 'zone.js/dist/zone';")) {
      content = content.replace(
        /import 'zone\.js\/dist\/zone';/g,
        "import 'zone.js';"
      );
      await fs.writeFile(polyfillsPath, content, 'utf-8');
      details.push('  Updated zone.js import');
      details.push('✓ Polyfills updated');
    } else {
      details.push('ℹ Polyfills already using correct zone.js import');
    }
  } catch {
    details.push('ℹ No polyfills.ts file found (might be using angular.json configuration)');
  }
}

async function fixTestFiles(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[4/5] Updating test files...');

  const srcPath = path.join(projectPath, 'src');
  const specFiles = await findFiles(srcPath, '.spec.ts');

  let filesUpdated = 0;

  for (const file of specFiles) {
    try {
      let content = await fs.readFile(file, 'utf-8');

      if (content.includes('MatChipList')) {
        content = content.replace(/MatChipList/g, 'MatChipListbox');
        content = content.replace(/MatChip,/g, 'MatChipOption,');

        await fs.writeFile(file, content, 'utf-8');
        filesUpdated++;
      }
    } catch (error) {
      warnings.push(`Failed to update test file ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (filesUpdated > 0) {
    details.push(`✓ Test files updated (${filesUpdated} file(s))`);
  } else {
    details.push('ℹ No MatChipList in test files');
  }
}

async function verifyModuleImports(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[5/5] Checking module imports...');

  const srcPath = path.join(projectPath, 'src');
  const moduleFiles = await findFiles(srcPath, '.module.ts');

  let hasMatChipsModule = false;

  for (const file of moduleFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');

      if (content.includes('MatChipsModule')) {
        hasMatChipsModule = true;
        if (!content.includes('@angular/material/chips')) {
          warnings.push(`${path.relative(projectPath, file)} imports MatChipsModule but might be missing the import`);
        }
      }
    } catch (error) {
      warnings.push(`Failed to check ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (hasMatChipsModule) {
    details.push('✓ Module imports checked');
  } else {
    details.push('ℹ No NgModule files with MatChipsModule found (might be using standalone components)');
  }
}

async function findFiles(dir: string, extension: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }

  await walk(dir);
  return files;
}

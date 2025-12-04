/**
 * Angular 16 Breaking Changes Fixes
 * 
 * Key Changes in Angular 16:
 * - Material Chips API further refined (mat-chip-list → mat-chip-set)
 * - Removal of ngx-perfect-scrollbar (deprecated, use native CSS)
 * - TypeScript 4.9+ required
 * - Standalone components become recommended
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FixResult } from './index.js';

export async function fixAngular16BreakingChanges(projectPath: string): Promise<FixResult> {
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

    details.push('Starting Angular 16 breaking changes fixes...');

    // 1. Fix Material Chips API (mat-chip-list → mat-chip-set)
    await fixMaterialChipsAPI(projectPath, details, warnings);

    // 2. Remove ngx-perfect-scrollbar
    await removeNgxPerfectScrollbar(projectPath, details, warnings);

    // 3. Update scrollable-container component
    await updateScrollableContainer(projectPath, details, warnings);

    return {
      success: true,
      message: 'Angular 16 breaking changes applied successfully',
      details,
      warnings,
      errors
    };
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: 'Failed to apply Angular 16 breaking changes',
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
  details.push('[1/3] Fixing Material Chips API...');

  const srcPath = path.join(projectPath, 'src');
  const files = await findFiles(srcPath, ['.html', '.scss', '.css']);

  let filesUpdated = 0;

  for (const file of files) {
    try {
      let content = await fs.readFile(file, 'utf-8');
      let modified = false;

      if (file.endsWith('.html')) {
        if (content.includes('mat-chip-list')) {
          content = content.replace(/<mat-chip-list/g, '<mat-chip-set');
          content = content.replace(/<\/mat-chip-list>/g, '</mat-chip-set>');
          content = content.replace(/<mat-chip\s/g, '<mat-chip-option ');
          content = content.replace(/<\/mat-chip>/g, '</mat-chip-option>');
          modified = true;
        }
      }

      if ((file.endsWith('.scss') || file.endsWith('.css')) && content.includes('mat-chip-list')) {
        content = content.replace(/mat-chip-list/g, 'mat-chip-set');
        modified = true;
      }

      if (modified) {
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

async function removeNgxPerfectScrollbar(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[2/3] Removing ngx-perfect-scrollbar...');

  const packageJsonPath = path.join(projectPath, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.dependencies && packageJson.dependencies['ngx-perfect-scrollbar']) {
      delete packageJson.dependencies['ngx-perfect-scrollbar'];
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
      details.push('✓ Removed ngx-perfect-scrollbar from package.json');

      // Remove from shared.module.ts if it exists
      const sharedModulePath = path.join(projectPath, 'src', 'app', 'shared', 'shared.module.ts');
      try {
        let sharedModule = await fs.readFile(sharedModulePath, 'utf-8');
        if (sharedModule.includes('PerfectScrollbarModule')) {
          // Remove import statement
          sharedModule = sharedModule.replace(/import\s+{[^}]*PerfectScrollbarModule[^}]*}\s+from\s+['"][^'"]+['"];?\n?/g, '');
          // Remove from imports array
          sharedModule = sharedModule.replace(/,?\s*PerfectScrollbarModule\s*,?/g, '');
          await fs.writeFile(sharedModulePath, sharedModule, 'utf-8');
          details.push('✓ Removed PerfectScrollbarModule from shared.module.ts');
        }
      } catch {
        // shared.module.ts doesn't exist or couldn't be read - that's fine
      }
    } else {
      details.push('ℹ ngx-perfect-scrollbar not found in package.json');
    }
  } catch (error) {
    warnings.push(`Failed to remove ngx-perfect-scrollbar: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function updateScrollableContainer(
  projectPath: string,
  details: string[],
  warnings: string[]
): Promise<void> {
  details.push('[3/3] Updating scrollable-container component...');

  const componentDir = path.join(projectPath, 'src', 'app', 'shared', 'components', 'scrollable-container');

  try {
    // Check if directory exists
    await fs.access(componentDir);

    // Create TypeScript component
    const tsContent = `import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scrollable-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scrollable-container.component.html',
  styleUrls: ['./scrollable-container.component.scss']
})
export class ScrollableContainerComponent {
  @Input() maxHeight: string = '400px';
}
`;

    // Create HTML template
    const htmlContent = `<div class="scrollable-container" [style.max-height]="maxHeight">
  <ng-content></ng-content>
</div>
`;

    // Create SCSS
    const scssContent = `.scrollable-container {
  overflow-y: auto;
  overflow-x: hidden;

  /* Custom scrollbar styles for webkit browsers */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
}
`;

    await fs.writeFile(path.join(componentDir, 'scrollable-container.component.ts'), tsContent, 'utf-8');
    await fs.writeFile(path.join(componentDir, 'scrollable-container.component.html'), htmlContent, 'utf-8');
    await fs.writeFile(path.join(componentDir, 'scrollable-container.component.scss'), scssContent, 'utf-8');

    details.push('✓ Updated scrollable-container to use native scrolling');
  } catch {
    details.push('ℹ scrollable-container component not found - skipping');
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

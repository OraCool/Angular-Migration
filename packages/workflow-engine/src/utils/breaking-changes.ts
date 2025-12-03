/**
 * Breaking Changes Utilities
 * Automated fixes for Angular version-specific breaking changes
 * Extracted from fix-angular-*-breaking-changes.sh scripts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface BreakingChangeFix {
  version: string;
  description: string;
  apply: (projectPath: string) => Promise<FixResult>;
}

export interface FixResult {
  success: boolean;
  message: string;
  changes: string[];
  warnings: string[];
  errors: string[];
}

export interface FileReplacement {
  pattern: RegExp;
  replacement: string;
  fileTypes: string[];
  description: string;
}

/**
 * Apply breaking change fixes for specific Angular version
 *
 * @param projectPath - Project directory path
 * @param version - Angular version (e.g., "16", "17", "19", "20")
 * @returns Fix result with changes made
 */
export async function applyBreakingChangeFixes(
  projectPath: string,
  version: string
): Promise<FixResult> {
  console.log(`🔧 Applying Angular ${version} breaking change fixes...`);

  switch (version) {
    case '16':
      return await fixAngular16BreakingChanges(projectPath);
    case '17':
      return await fixAngular17BreakingChanges(projectPath);
    case '19':
      return await fixAngular19BreakingChanges(projectPath);
    case '20':
      return await fixAngular20BreakingChanges(projectPath);
    default:
      return {
        success: true,
        message: `No automated fixes available for Angular ${version}`,
        changes: [],
        warnings: [`No breaking change fixes defined for version ${version}`],
        errors: [],
      };
  }
}

/**
 * Angular 16 Breaking Changes
 * - Material Chips API changes (mat-chip-list → mat-chip-set)
 * - Remove ngx-perfect-scrollbar (Ivy incompatible)
 * - Replace with native CSS scrolling
 */
async function fixAngular16BreakingChanges(
  projectPath: string
): Promise<FixResult> {
  const changes: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const srcPath = path.join(projectPath, 'src');

    // 1. Fix Angular Material Chips API
    console.log('📝 Fixing Angular Material Chips API...');
    const chipsReplacements: FileReplacement[] = [
      {
        pattern: /<mat-chip-list/g,
        replacement: '<mat-chip-set',
        fileTypes: ['.html'],
        description: 'Replace mat-chip-list opening tag',
      },
      {
        pattern: /<\/mat-chip-list>/g,
        replacement: '</mat-chip-set>',
        fileTypes: ['.html'],
        description: 'Replace mat-chip-list closing tag',
      },
      {
        pattern: /<mat-chip\s/g,
        replacement: '<mat-chip-option ',
        fileTypes: ['.html'],
        description: 'Replace mat-chip with mat-chip-option',
      },
      {
        pattern: /<\/mat-chip>/g,
        replacement: '</mat-chip-option>',
        fileTypes: ['.html'],
        description: 'Replace mat-chip closing tag',
      },
      {
        pattern: /mat-chip-list/g,
        replacement: 'mat-chip-set',
        fileTypes: ['.scss', '.css'],
        description: 'Replace mat-chip-list in styles',
      },
    ];

    const chipsChanges = await applyReplacements(
      srcPath,
      chipsReplacements
    );
    changes.push(...chipsChanges);

    // 2. Remove ngx-perfect-scrollbar from package.json
    console.log('📝 Removing ngx-perfect-scrollbar...');
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.dependencies?.['ngx-perfect-scrollbar']) {
        delete pkg.dependencies['ngx-perfect-scrollbar'];
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        changes.push('Removed ngx-perfect-scrollbar from package.json');
      }
    }

    // 3. Update scrollable-container component (if exists)
    const scrollableContainerPath = path.join(
      srcPath,
      'app/shared/components/scrollable-container'
    );
    if (fs.existsSync(scrollableContainerPath)) {
      console.log('📝 Updating scrollable-container component...');
      createNativeScrollableContainer(scrollableContainerPath);
      changes.push('Updated scrollable-container to use native CSS scrolling');
    }

    // 4. Remove PerfectScrollbarModule imports
    const moduleFiles = findFiles(srcPath, ['.ts'], /\.module\.ts$/);
    for (const file of moduleFiles) {
      let content = fs.readFileSync(file, 'utf8');
      const original = content;

      // Remove import line
      content = content.replace(
        /import\s*{\s*.*?PerfectScrollbarModule.*?}\s*from\s*['"].*?['"];?\s*\n?/g,
        ''
      );

      // Remove from imports array
      content = content.replace(/,?\s*PerfectScrollbarModule\s*,?/g, '');

      if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changes.push(`Removed PerfectScrollbarModule from ${path.basename(file)}`);
      }
    }

    return {
      success: true,
      message: 'Angular 16 breaking changes fixed successfully',
      changes,
      warnings,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      success: false,
      message: 'Failed to apply Angular 16 breaking changes',
      changes,
      warnings,
      errors,
    };
  }
}

/**
 * Angular 17 Breaking Changes
 * - Material MDC Migration (legacy components removed)
 * - Control Flow syntax preparation
 * - Form field appearance updates
 */
async function fixAngular17BreakingChanges(
  projectPath: string
): Promise<FixResult> {
  const changes: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const srcPath = path.join(projectPath, 'src');

    // 1. Run Material MDC Migration Schematic
    console.log('🔄 Running Material MDC Migration schematic...');
    try {
      execSync('ng generate @angular/material:mdc-migration --defaults', {
        cwd: projectPath,
        stdio: 'inherit',
      });
      changes.push('Ran Material MDC migration schematic');
    } catch (error) {
      warnings.push('MDC migration schematic not available or already applied');
    }

    // 2. Check for remaining legacy components
    console.log('🔄 Checking for remaining legacy components...');
    const legacyComponents = findInFiles(
      srcPath,
      /mat-legacy-/,
      ['.html', '.ts']
    );
    if (legacyComponents.length > 0) {
      warnings.push(
        `Found ${legacyComponents.length} files with legacy components that may need manual migration`
      );
    }

    // 3. Replace appearance="legacy" with appearance="outline"
    console.log('🔄 Updating form field appearances...');
    const appearanceReplacements: FileReplacement[] = [
      {
        pattern: /appearance="legacy"/g,
        replacement: 'appearance="outline"',
        fileTypes: ['.html'],
        description: 'Replace legacy form field appearance',
      },
    ];

    const appearanceChanges = await applyReplacements(
      srcPath,
      appearanceReplacements
    );
    changes.push(...appearanceChanges);

    if (appearanceChanges.length > 0) {
      warnings.push(
        "Review if 'fill' appearance is preferred for some form fields"
      );
    }

    // 4. Check for custom Material themes
    const themeFiles = findFiles(
      srcPath,
      ['.scss'],
      /theme|material/i
    );
    if (themeFiles.length > 0) {
      warnings.push(
        `Found ${themeFiles.length} theme files - custom themes may need updates for MDC components`
      );
    }

    return {
      success: true,
      message: 'Angular 17 breaking changes fixed successfully',
      changes,
      warnings,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      success: false,
      message: 'Failed to apply Angular 17 breaking changes',
      changes,
      warnings,
      errors,
    };
  }
}

/**
 * Angular 19 Breaking Changes
 * - Zone.js optional (zoneless support)
 * - Injection context requirements
 */
async function fixAngular19BreakingChanges(
  projectPath: string
): Promise<FixResult> {
  const changes: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Angular 19 has fewer breaking changes that require automated fixes
    // Most changes are opt-in features

    warnings.push(
      'Angular 19 introduced zoneless support (experimental) - no automated fixes needed'
    );
    warnings.push(
      'Review injection context usage if using inject() outside constructor'
    );

    return {
      success: true,
      message: 'Angular 19 breaking changes checked',
      changes,
      warnings,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      success: false,
      message: 'Failed to apply Angular 19 breaking changes',
      changes,
      warnings,
      errors,
    };
  }
}

/**
 * Angular 20 Breaking Changes
 * - Full zoneless support
 * - New signal-based APIs
 */
async function fixAngular20BreakingChanges(
  projectPath: string
): Promise<FixResult> {
  const changes: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Angular 20 is mostly additive with opt-in features
    warnings.push(
      'Angular 20 introduced stable zoneless support - consider migrating to zoneless'
    );
    warnings.push(
      'New signal-based APIs available - consider using signal inputs/outputs'
    );

    return {
      success: true,
      message: 'Angular 20 breaking changes checked',
      changes,
      warnings,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      success: false,
      message: 'Failed to apply Angular 20 breaking changes',
      changes,
      warnings,
      errors,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Apply file replacements recursively
 */
async function applyReplacements(
  dirPath: string,
  replacements: FileReplacement[]
): Promise<string[]> {
  const changes: string[] = [];

  function processFile(filePath: string): void {
    const ext = path.extname(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const replacement of replacements) {
      if (replacement.fileTypes.includes(ext)) {
        if (replacement.pattern.test(content)) {
          content = content.replace(replacement.pattern, replacement.replacement);
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      changes.push(`Updated: ${path.relative(dirPath, filePath)}`);
    }
  }

  function walkDir(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dir, item.name);

      // Skip node_modules, dist, etc.
      if (
        item.isDirectory() &&
        !['node_modules', 'dist', '.angular', 'coverage'].includes(item.name)
      ) {
        walkDir(itemPath);
      } else if (item.isFile()) {
        processFile(itemPath);
      }
    }
  }

  walkDir(dirPath);
  return changes;
}

/**
 * Find files matching pattern
 */
function findFiles(
  dirPath: string,
  extensions: string[],
  namePattern?: RegExp
): string[] {
  const files: string[] = [];

  function walkDir(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dir, item.name);

      if (
        item.isDirectory() &&
        !['node_modules', 'dist', '.angular', 'coverage'].includes(item.name)
      ) {
        walkDir(itemPath);
      } else if (item.isFile()) {
        const ext = path.extname(item.name);
        if (extensions.includes(ext)) {
          if (!namePattern || namePattern.test(item.name)) {
            files.push(itemPath);
          }
        }
      }
    }
  }

  walkDir(dirPath);
  return files;
}

/**
 * Find files containing pattern
 */
function findInFiles(
  dirPath: string,
  pattern: RegExp,
  extensions: string[]
): string[] {
  const matches: string[] = [];

  function walkDir(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dir, item.name);

      if (
        item.isDirectory() &&
        !['node_modules', 'dist', '.angular', 'coverage'].includes(item.name)
      ) {
        walkDir(itemPath);
      } else if (item.isFile()) {
        const ext = path.extname(item.name);
        if (extensions.includes(ext)) {
          try {
            const content = fs.readFileSync(itemPath, 'utf8');
            if (pattern.test(content)) {
              matches.push(itemPath);
            }
          } catch (error) {
            // Skip files we can't read
          }
        }
      }
    }
  }

  walkDir(dirPath);
  return matches;
}

/**
 * Create native CSS scrollable container component
 */
function createNativeScrollableContainer(componentPath: string): void {
  // TypeScript component
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

  // HTML template
  const htmlContent = `<div class="scrollable-container" [style.max-height]="maxHeight">
  <ng-content></ng-content>
</div>
`;

  // SCSS styles
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

  fs.writeFileSync(
    path.join(componentPath, 'scrollable-container.component.ts'),
    tsContent
  );
  fs.writeFileSync(
    path.join(componentPath, 'scrollable-container.component.html'),
    htmlContent
  );
  fs.writeFileSync(
    path.join(componentPath, 'scrollable-container.component.scss'),
    scssContent
  );
}

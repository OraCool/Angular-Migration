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
    case '15':
      return await fixAngular15BreakingChanges(projectPath);
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
 * Angular 15 Breaking Changes
 * - Material MDC Pre-Migration fixes (floatLabel, appearance, CSS classes)
 * - Material Slider detection and diagnostic report
 * - mat-tab-nav-bar tabPanel requirement detection
 * - Run official MDC migration schematic
 */
async function fixAngular15BreakingChanges(
  projectPath: string
): Promise<FixResult> {
  const changes: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const srcPath = path.join(projectPath, 'src');

    // 1. Fix floatLabel="never" (CRITICAL - blocks MDC migration)
    console.log('📝 Fixing floatLabel="never" deprecation...');
    const floatLabelReplacements: FileReplacement[] = [
      {
        pattern: /floatLabel\s*=\s*["']never["']/g,
        replacement: 'floatLabel="auto"',
        fileTypes: ['.html'],
        description: 'Replace floatLabel="never" with "auto" (required for MDC)',
      },
    ];
    const floatLabelChanges = await applyReplacements(
      srcPath,
      floatLabelReplacements
    );
    changes.push(...floatLabelChanges);

    // 2. Fix appearance="standard" (CRITICAL - blocks MDC migration)
    console.log('📝 Fixing appearance="standard" deprecation...');
    const appearanceReplacements: FileReplacement[] = [
      {
        pattern: /appearance\s*=\s*["']standard["']/g,
        replacement: 'appearance="outline"',
        fileTypes: ['.html'],
        description: 'Replace appearance="standard" with "outline" (required for MDC)',
      },
    ];
    const appearanceChanges = await applyReplacements(
      srcPath,
      appearanceReplacements
    );
    changes.push(...appearanceChanges);

    // 3. Update CSS classes (mat-* → mat-mdc-*)
    console.log('📝 Updating Material CSS classes...');
    const cssReplacements: FileReplacement[] = [
      {
        pattern: /\.mat-form-field-flex\b/g,
        replacement: '.mat-mdc-form-field-flex',
        fileTypes: ['.scss', '.css'],
        description: 'Update form field flex CSS class to MDC',
      },
      {
        pattern: /\.mat-form-field-outline\b/g,
        replacement: '.mat-mdc-form-field-outline',
        fileTypes: ['.scss', '.css'],
        description: 'Update form field outline CSS class to MDC',
      },
      {
        pattern: /\.mat-form-field-infix\b/g,
        replacement: '.mat-mdc-form-field-infix',
        fileTypes: ['.scss', '.css'],
        description: 'Update form field infix CSS class to MDC',
      },
    ];
    const cssChanges = await applyReplacements(srcPath, cssReplacements);
    changes.push(...cssChanges);

    // 4. Detect mat-tab-nav-bar without [tabPanel] binding (WARNING)
    console.log('🔍 Checking mat-tab-nav-bar components...');
    const tabNavFiles = findInFiles(
      srcPath,
      /<mat-tab-nav-bar(?![^>]*\[tabPanel\])/,
      ['.html']
    );
    if (tabNavFiles.length > 0) {
      warnings.push(
        `Found ${tabNavFiles.length} mat-tab-nav-bar component(s) missing [tabPanel] binding. ` +
        `This is required in Angular 15+. Add: [tabPanel]="tabPanel" and <mat-tab-nav-panel #tabPanel>`
      );

      for (const file of tabNavFiles.slice(0, 5)) {
        warnings.push(`  - ${path.relative(projectPath, file)}`);
      }
      if (tabNavFiles.length > 5) {
        warnings.push(`  ... and ${tabNavFiles.length - 5} more files`);
      }
    }

    // 5. Material Slider detection and diagnostic report
    console.log('🔍 Checking for Material Slider usage...');
    const sliderFiles = findInFiles(srcPath, /<mat-slider/, ['.html']);
    if (sliderFiles.length > 0) {
      warnings.push(
        `Found ${sliderFiles.length} file(s) using mat-slider. ` +
        `Material 15 completely rewrote the slider API - manual migration required.`
      );

      // Generate detailed diagnostic report
      const sliderReport = await generateSliderDiagnosticReport(
        projectPath,
        srcPath,
        sliderFiles
      );

      // Save report to project root
      const reportPath = path.join(projectPath, 'material-slider-migration.md');
      fs.writeFileSync(reportPath, sliderReport, 'utf8');

      warnings.push(
        `Slider migration guide created: material-slider-migration.md`
      );

      // Analyze deprecated properties
      for (const file of sliderFiles.slice(0, 10)) {
        const content = fs.readFileSync(file, 'utf8');
        const deprecatedProps: string[] = [];

        if (/\[tickInterval\]/.test(content)) deprecatedProps.push('tickInterval');
        if (/\[thumbLabel\]/.test(content)) deprecatedProps.push('thumbLabel');
        if (/\[vertical\]/.test(content)) deprecatedProps.push('vertical');
        if (/\[invert\]/.test(content)) deprecatedProps.push('invert');
        if (/\[displayWith\]/.test(content)) deprecatedProps.push('displayWith');

        if (deprecatedProps.length > 0) {
          warnings.push(
            `  ${path.relative(projectPath, file)}: Uses deprecated properties: ${deprecatedProps.join(', ')}`
          );
        }
      }

      if (sliderFiles.length > 10) {
        warnings.push(`  ... and ${sliderFiles.length - 10} more slider files`);
      }
    }

    // 6. Run Material MDC Migration schematic
    console.log('🔄 Running Material MDC migration schematic...');
    try {
      execSync('ng generate @angular/material:mdc-migration --defaults', {
        cwd: projectPath,
        stdio: 'inherit',
      });
      changes.push('Ran Material MDC migration schematic');
    } catch (error) {
      warnings.push(
        'MDC migration schematic failed or not available. ' +
        'You may need to run it manually: ng generate @angular/material:mdc-migration'
      );
    }

    // 7. Verify no legacy components remain after migration
    console.log('✅ Verifying legacy components removed...');
    const legacyComponents = findInFiles(
      srcPath,
      /mat-legacy-|MatLegacy/,
      ['.html', '.ts']
    );
    if (legacyComponents.length > 0) {
      warnings.push(
        `Found ${legacyComponents.length} file(s) with legacy Material components after migration. ` +
        `These may need manual review.`
      );

      for (const file of legacyComponents.slice(0, 5)) {
        warnings.push(`  - ${path.relative(projectPath, file)}`);
      }
      if (legacyComponents.length > 5) {
        warnings.push(`  ... and ${legacyComponents.length - 5} more files`);
      }
    } else {
      changes.push('Verified: No legacy Material components found');
    }

    return {
      success: true,
      message: 'Angular 15 Material MDC breaking changes fixed successfully',
      changes,
      warnings,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    return {
      success: false,
      message: 'Failed to apply Angular 15 breaking changes',
      changes,
      warnings,
      errors,
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
 * - Verify Material MDC Migration completed (legacy components removed in v17)
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

    // 1. Verify MDC Migration completed (should have been done in v15)
    console.log('✅ Verifying Material MDC migration completion...');
    const legacyComponents = findInFiles(
      srcPath,
      /mat-legacy-|MatLegacy/,
      ['.html', '.ts']
    );

    if (legacyComponents.length > 0) {
      errors.push(
        `ERROR: Found ${legacyComponents.length} legacy Material component(s) in Angular 17. ` +
        `Legacy components were removed in v17. MDC migration should have been completed in v15.`
      );

      for (const file of legacyComponents.slice(0, 5)) {
        errors.push(`  - ${path.relative(projectPath, file)}`);
      }
      if (legacyComponents.length > 5) {
        errors.push(`  ... and ${legacyComponents.length - 5} more files`);
      }

      errors.push(
        `Manual action required: Remove all mat-legacy-* imports and components. ` +
        `See Material MDC migration guide for component replacements.`
      );
    } else {
      changes.push('Verified: No legacy Material components found (MDC migration complete)');
    }

    // 2. Additional legacy component check in imports
    console.log('🔄 Checking for legacy Material imports...');
    const legacyImports = findInFiles(
      srcPath,
      /@angular\/material\/legacy-/,
      ['.ts']
    );
    if (legacyImports.length > 0) {
      errors.push(
        `Found ${legacyImports.length} file(s) with legacy Material imports. ` +
        `These must be updated to MDC imports.`
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

/**
 * Generate Material Slider diagnostic report with migration guidance
 */
async function generateSliderDiagnosticReport(
  projectPath: string,
  srcPath: string,
  sliderFiles: string[]
): Promise<string> {
  let report = '# Material Slider Migration Guide (Angular 15)\n\n';
  report += '## Overview\n\n';
  report += 'Material Slider was completely rewritten in Angular 15 with a new API.\n';
  report += 'This report analyzes your slider usage and provides migration guidance.\n\n';
  report += '## Files Requiring Migration\n\n';
  report += `Found ${sliderFiles.length} file(s) using mat-slider:\n\n`;

  for (const file of sliderFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(projectPath, file);

    report += `### ${relativePath}\n\n`;

    // Detect deprecated properties
    const deprecatedProps: string[] = [];
    if (/\[tickInterval\]/.test(content)) deprecatedProps.push('tickInterval');
    if (/\[thumbLabel\]/.test(content)) deprecatedProps.push('thumbLabel');
    if (/\[vertical\]/.test(content)) deprecatedProps.push('vertical');
    if (/\[invert\]/.test(content)) deprecatedProps.push('invert');
    if (/\[displayWith\]/.test(content)) deprecatedProps.push('displayWith');

    if (deprecatedProps.length > 0) {
      report += '**Deprecated Properties Used:**\n';
      for (const prop of deprecatedProps) {
        report += `- \`[${prop}]\`\n`;
      }
      report += '\n';
    }

    report += '**Migration Steps:**\n\n';
    report += '1. Add `<input matSliderThumb>` inside `<mat-slider>`\n';
    report += '2. Move `[(ngModel)]` or `[value]` from `<mat-slider>` to `<input matSliderThumb>`\n';
    report += '3. Move event bindings to `<input matSliderThumb>`\n';

    // Specific migration guidance for deprecated properties
    if (deprecatedProps.includes('tickInterval')) {
      report += '4. Replace `[tickInterval]` with `discrete` attribute and `showTickMarks` on slider\n';
    }
    if (deprecatedProps.includes('thumbLabel')) {
      report += '4. Remove `[thumbLabel]` - thumb label is always shown for discrete sliders\n';
    }
    if (deprecatedProps.includes('vertical')) {
      report += '4. **WARNING**: `[vertical]` is not supported in Angular 15 - horizontal only\n';
    }
    if (deprecatedProps.includes('invert')) {
      report += '4. **WARNING**: `[invert]` is not supported in Angular 15\n';
    }
    if (deprecatedProps.includes('displayWith')) {
      report += '4. Replace `[displayWith]` with a custom formatter in your component\n';
    }

    report += '\n**Before/After Example:**\n\n';
    report += '```html\n';
    report += '<!-- BEFORE (Angular 14) -->\n';
    report += '<mat-slider\n';
    report += '  [min]="0"\n';
    report += '  [max]="100"\n';
    if (deprecatedProps.includes('tickInterval')) {
      report += '  [tickInterval]="1"\n';
    }
    if (deprecatedProps.includes('thumbLabel')) {
      report += '  [thumbLabel]="true"\n';
    }
    report += '  [(ngModel)]="value">\n';
    report += '</mat-slider>\n\n';
    report += '<!-- AFTER (Angular 15) -->\n';
    report += '<mat-slider\n';
    report += '  [min]="0"\n';
    report += '  [max]="100"';
    if (deprecatedProps.includes('tickInterval')) {
      report += '\n  discrete\n  showTickMarks';
    }
    report += '>\n';
    report += '  <input matSliderThumb [(ngModel)]="value">\n';
    report += '</mat-slider>\n';
    report += '```\n\n';
  }

  report += '## Additional Resources\n\n';
  report += '- [Official Material Slider Documentation](https://material.angular.io/components/slider/overview)\n';
  report += '- [Material 15 Migration Guide](https://material.angular.io/guide/mdc-migration)\n';
  report += '- [Slider API Reference](https://material.angular.io/components/slider/api)\n\n';

  report += '## Testing Checklist\n\n';
  report += 'After migration, verify:\n\n';
  report += '- [ ] Slider values bind correctly\n';
  report += '- [ ] Min/max ranges work as expected\n';
  report += '- [ ] Step increments function properly\n';
  report += '- [ ] Event handlers fire correctly\n';
  report += '- [ ] Visual appearance matches design requirements\n';
  report += '- [ ] Accessibility (keyboard navigation, ARIA labels) works\n';

  return report;
}

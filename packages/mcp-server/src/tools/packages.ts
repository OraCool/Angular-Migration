/**
 * Package Management Tools
 * Handles package compatibility and update checks
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SessionManager } from '../session/manager.js';
import { ToolResult, ProgressCallback } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function handlePackageTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback?: ProgressCallback
): Promise<ToolResult> {
  switch (toolName) {
    case 'packages_get_compatibility':
      return await packagesGetCompatibility(args);
    case 'packages_check_updates':
      return await packagesCheckUpdates(args);
    case 'packages_get_breaking_changes':
      return await packagesGetBreakingChanges(args);
    default:
      return {
        success: false,
        error: `Unknown package tool: ${toolName}`,
      };
  }
}

async function packagesGetCompatibility(
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
    // Try to load compatibility matrix from workflow-engine package
    // The matrix is copied during build to workflow-engine/dist/assets/
    const matrixPath = path.join(
      __dirname,
      '../../node_modules/@angular-migration/workflow-engine/dist/assets/package-compatibility-matrix.json'
    );

    let compatibilityData: Record<string, any>;

    try {
      const matrixContent = await fs.readFile(matrixPath, 'utf-8');
      compatibilityData = JSON.parse(matrixContent);
    } catch {
      // Fallback: provide basic compatibility info
      compatibilityData = {
        [angularVersion]: {
          '@angular/cli': `^${angularVersion}.0.0`,
          '@angular/core': `^${angularVersion}.0.0`,
          '@angular/common': `^${angularVersion}.0.0`,
          '@angular/platform-browser': `^${angularVersion}.0.0`,
          '@angular/platform-browser-dynamic': `^${angularVersion}.0.0`,
          'typescript': angularVersion === '20' ? '~5.6.0' : '~5.3.0',
          'rxjs': '~7.8.0',
          'zone.js': '~0.15.0',
        },
      };
    }

    const versionData = compatibilityData[angularVersion];

    if (!versionData) {
      return {
        success: false,
        error: `No compatibility data found for Angular ${angularVersion}`,
      };
    }

    return {
      success: true,
      data: {
        angularVersion,
        packages: versionData,
      },
      message: `Compatibility matrix for Angular ${angularVersion}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function packagesCheckUpdates(
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
    // Read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Collect Angular packages
    const angularPackages: Record<string, string> = {};
    const otherPackages: Record<string, string> = {};

    for (const [pkg, version] of Object.entries(deps)) {
      if (pkg.startsWith('@angular/')) {
        angularPackages[pkg] = version as string;
      } else if (
        ['typescript', 'rxjs', 'zone.js', 'tslib'].includes(pkg)
      ) {
        otherPackages[pkg] = version as string;
      }
    }

    return {
      success: true,
      data: {
        angularPackages,
        otherPackages,
        suggestions: [
          'Run "ng update @angular/cli @angular/core" to update Angular packages',
          'Check https://update.angular.io for detailed migration guide',
        ],
      },
      message: `Found ${Object.keys(angularPackages).length} Angular packages`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Breaking changes knowledge base for Angular versions
 * Organized by version and package
 * Exported for use in resources
 */
export const BREAKING_CHANGES_DB: Record<string, Record<string, string[]>> = {
  '15': {
    '@angular/core': [
      'Removed deprecated ViewEngine support - Ivy is now the only rendering engine',
      'Removed deprecated `entryComponents` - no longer needed with Ivy',
      'Removed deprecated `RendererFactory2` and `Renderer2` legacy APIs',
      'Removed deprecated `NgProbeToken` - use Ivy debugging utilities',
      'Removed deprecated `Compiler` methods - use JIT compilation alternatives',
    ],
    '@angular/router': [
      'Removed deprecated `ActivatedRoute.component` property',
      'Changed default `relativeLinkResolution` to "corrected" from "legacy"',
      'Removed deprecated `loadChildren` string syntax - use dynamic imports',
    ],
    '@angular/common': [
      'Removed deprecated `date` pipe `DATE_PIPE_DEFAULT_TIMEZONE` - use `DATE_PIPE_DEFAULT_OPTIONS`',
      'Removed deprecated `XhrFactory` - use `HttpClient`',
    ],
    'typescript': [
      'Minimum version is now 4.8.x',
      'TypeScript 4.9.x is supported',
    ],
    'rxjs': [
      'Minimum version is now 7.5.x',
    ],
  },
  '16': {
    '@angular/core': [
      'Removed deprecated `ComponentFactoryResolver` - use standalone components or dynamic imports',
      'Removed deprecated `NgModule` APIs in favor of standalone components',
      'Required Signals - new reactive primitive for state management',
      'Removed support for TypeScript versions < 4.9.3',
      'Removed deprecated `ReflectiveInjector` - use `Injector.create()`',
    ],
    '@angular/forms': [
      'Typed Forms now default - `FormControl`, `FormGroup`, `FormArray` are now generic',
      'Removed deprecated `ngModel` with reactive forms warnings',
    ],
    '@angular/router': [
      'Router standalone APIs available - `provideRouter()` replaces `RouterModule.forRoot()`',
      'Removed deprecated `initialNavigation` string values - use boolean',
    ],
    'typescript': [
      'Minimum version is now 4.9.3',
      'TypeScript 5.0.x is supported',
    ],
  },
  '17': {
    '@angular/core': [
      'Removed deprecated `ModuleWithProviders` without generic type',
      'Removed deprecated `@Component.entryComponents`',
      'Standalone components are now recommended over NgModules',
      'New control flow syntax: @if, @for, @switch replaces *ngIf, *ngFor, *ngSwitch',
      'New defer syntax: @defer for lazy loading',
    ],
    '@angular/common': [
      'Removed deprecated `NgSwitch` structural directive syntax',
      'Removed deprecated `AsyncPipe` with `null` handling',
    ],
    '@angular/router': [
      'Functional guards and resolvers are now recommended over class-based',
      'Removed deprecated `CanLoad` - use `CanMatch` instead',
    ],
    '@angular/platform-browser': [
      'Removed deprecated `BrowserModule.withServerTransition()` - use `provideClientHydration()`',
    ],
    'typescript': [
      'Minimum version is now 5.2.x',
      'TypeScript 5.2.x is required',
    ],
  },
  '18': {
    '@angular/core': [
      'Removed legacy View Engine APIs completely',
      'Signals become stable - recommended for all state management',
      'New signal inputs: `input()`, `input.required()` replace `@Input()`',
      'New signal outputs: `output()` replaces `@Output()`',
      'Required signal-based change detection optimizations',
      'Zoneless change detection available as experimental',
    ],
    '@angular/forms': [
      'Signal-based forms available as developer preview',
      'New `FormField` signal APIs',
    ],
    '@angular/router': [
      'Functional route configuration becomes standard',
      'Removed deprecated `RouterModule` in favor of `provideRouter()`',
    ],
    'typescript': [
      'Minimum version is now 5.4.x',
      'TypeScript 5.4.x is required',
    ],
    'rxjs': [
      'Minimum version is now 7.8.x',
      'RxJS 7.8+ includes interop with signals',
    ],
  },
  '19': {
    '@angular/core': [
      'Zoneless by default - Zone.js is now optional',
      'Signal components required for new projects',
      'Removed all legacy `@Input()` decorator support - use `input()` signal',
      'Removed all legacy `@Output()` decorator support - use `output()` signal',
      'ViewChild and ContentChild now return signals',
      'Incremental hydration available',
    ],
    '@angular/forms': [
      'Signal-based forms become stable',
      'Removed legacy reactive forms APIs',
      'New form signal primitives: `formControl()`, `formGroup()`',
    ],
    '@angular/router': [
      'Signal-based router state - `ActivatedRoute` properties return signals',
      'Removed deprecated `RouterModule` - only `provideRouter()` supported',
    ],
    '@angular/common': [
      'All structural directives removed - use @if, @for, @switch control flow',
      'Removed *ngIf, *ngFor, *ngSwitch completely',
    ],
    'typescript': [
      'Minimum version is now 5.5.x',
      'TypeScript 5.5.x is required',
    ],
    'zone.js': [
      'Zone.js is now optional - zoneless is the default',
      'Required only if using legacy change detection',
    ],
  },
  '20': {
    '@angular/core': [
      'Removed Zone.js from default bundles',
      'All APIs are signal-based by default',
      'Removed deprecated decorator-based inputs/outputs',
      'Required standalone components - NgModules deprecated for removal',
      'New resource() API for async data loading',
      'Incremental hydration is stable',
    ],
    '@angular/forms': [
      'Only signal-based forms supported',
      'Legacy `FormControl`, `FormGroup`, `FormArray` removed',
      'New unified form API with signals',
    ],
    '@angular/router': [
      'Router fully signal-based',
      'View transitions API stable',
      'Removed class-based guards completely',
    ],
    '@angular/common': [
      'Only @if, @for, @switch control flow supported',
      'Removed all structural directive support',
    ],
    '@angular/platform-browser': [
      'Server-side rendering (SSR) with full hydration is standard',
      'Removed legacy platform APIs',
    ],
    'typescript': [
      'Minimum version is now 5.6.x',
      'TypeScript 5.6.x is required',
    ],
    'rxjs': [
      'Signal/RxJS interop is stable',
      'toSignal() and toObservable() are recommended patterns',
    ],
  },
};

async function packagesGetBreakingChanges(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const projectPath = args.projectPath as string;
  const fromVersion = args.fromVersion as string;
  const toVersion = args.toVersion as string;

  if (!projectPath || !fromVersion || !toVersion) {
    return {
      success: false,
      error: 'projectPath, fromVersion, and toVersion are required',
    };
  }

  try {
    // Read package.json to get current packages
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Determine which versions we need to cover
    const from = parseInt(fromVersion, 10);
    const to = parseInt(toVersion, 10);

    if (isNaN(from) || isNaN(to) || from >= to) {
      return {
        success: false,
        error: `Invalid version range: ${fromVersion} to ${toVersion}`,
      };
    }

    // Collect breaking changes for each version in the range
    const breakingChangesByPackage: Record<string, {
      currentVersion: string;
      targetVersion: string;
      changes: Record<string, string[]>;
    }> = {};

    // Get all packages that are in the project
    const relevantPackages = new Set<string>();
    for (const pkg of Object.keys(deps)) {
      if (pkg.startsWith('@angular/') || ['typescript', 'rxjs', 'zone.js', 'tslib'].includes(pkg)) {
        relevantPackages.add(pkg);
      }
    }

    // Collect breaking changes for each version in the upgrade path
    for (let version = from + 1; version <= to; version++) {
      const versionStr = version.toString();
      const versionChanges = BREAKING_CHANGES_DB[versionStr];

      if (versionChanges) {
        for (const pkg of relevantPackages) {
          if (versionChanges[pkg]) {
            if (!breakingChangesByPackage[pkg]) {
              breakingChangesByPackage[pkg] = {
                currentVersion: deps[pkg] || 'unknown',
                targetVersion: `^${toVersion}.0.0`,
                changes: {},
              };
            }
            breakingChangesByPackage[pkg].changes[versionStr] = versionChanges[pkg];
          }
        }
      }
    }

    // Calculate summary statistics
    let totalChanges = 0;
    for (const pkg of Object.values(breakingChangesByPackage)) {
      for (const changes of Object.values(pkg.changes)) {
        totalChanges += changes.length;
      }
    }

    return {
      success: true,
      data: {
        fromVersion,
        toVersion,
        affectedPackages: Object.keys(breakingChangesByPackage).length,
        totalBreakingChanges: totalChanges,
        breakingChanges: breakingChangesByPackage,
        recommendations: [
          `Review ${totalChanges} breaking changes across ${Object.keys(breakingChangesByPackage).length} packages`,
          'Test thoroughly after each version upgrade',
          'Update code incrementally following the migration guide',
          'Consider using Angular CLI schematics: ng update @angular/cli @angular/core',
          'Check https://update.angular.io for interactive migration guide',
        ],
      },
      message: `Found ${totalChanges} breaking changes for Angular ${fromVersion} → ${toVersion}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

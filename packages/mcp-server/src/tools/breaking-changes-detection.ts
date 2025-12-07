/**
 * Breaking Changes Detection Tools
 * AST-based detection of version-specific breaking changes
 * Implements spec from MCP_SERVER_AGENT_PROMPT.md
 *
 * REFACTORED: Uses utility classes for DRY and SOLID compliance
 */

import * as fs from 'fs';
import * as path from 'path';
import { StandardToolResponse, StandardErrorResponse, BreakingChangeDetection } from '../types.js';
import { SessionManager } from '../session/manager.js';
import { ProgressCallback } from '../types.js';
import { ResponseBuilder } from '../utils/responses.js';
import { ProgressTracker } from '../utils/progress.js';
import {
  FILE_PATTERNS,
  EXCLUDED_DIRECTORIES,
  PROGRESS,
  ERROR_CODES,
  TOOL_NAMES,
  BREAKING_CHANGE_CATEGORY,
  SEVERITY,
  getBreakingChangesUri,
  shouldExcludeFile,
} from '../constants.js';

/**
 * Breaking change pattern definition
 */
interface BreakingChangePattern {
  id: string;
  category: typeof BREAKING_CHANGE_CATEGORY[keyof typeof BREAKING_CHANGE_CATEGORY];
  severity: typeof SEVERITY[keyof typeof SEVERITY];
  description: string;
  pattern: RegExp;
  contextPattern?: RegExp;
  autoFix: boolean;
  schematic: boolean;
  migrationGuide: string;
  replacement?: string;
}

/**
 * Angular 15 Breaking Changes Patterns
 * Updated based on migrations/scripts/modules/breaking-changes/v15.psm1
 */
const V15_BREAKING_CHANGES: BreakingChangePattern[] = [
  // CRITICAL: TypeScript target configuration
  {
    id: 'v15-typescript-target-es2022',
    category: BREAKING_CHANGE_CATEGORY.CONFIG_CHANGES,
    severity: SEVERITY.CRITICAL,
    description: 'TypeScript target should be ES2022 (not ES2020)',
    pattern: /"target"\s*:\s*"ES2020"/,
    autoFix: true,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#typescript-target',
    replacement: '"target": "ES2022"',
  },

  // CRITICAL: Router relativeLinkResolution removed
  {
    id: 'v15-router-relative-link-resolution',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.CRITICAL,
    description: 'Router relativeLinkResolution property removed',
    pattern: /relativeLinkResolution\s*:/,
    contextPattern: /RouterModule\.forRoot/,
    autoFix: true,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#router-config',
  },

  // CRITICAL: Material Chips API changes (3 migration paths)
  {
    id: 'v15-material-chips-grid-input',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.CRITICAL,
    description: 'Material Chips: Form input chips - use mat-chip-grid + mat-chip-row (with matChipInputFor)',
    pattern: /mat-chip-list|MatChipList/,
    contextPattern: /matChipInputFor/,
    autoFix: true,
    schematic: true,
    migrationGuide: getBreakingChangesUri('15') + '#material-chips-grid',
  },

  {
    id: 'v15-material-chips-selectable',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.CRITICAL,
    description: 'Material Chips: Selectable chips - use mat-chip-listbox + mat-chip-option (with [selected])',
    pattern: /mat-chip-list|MatChipList/,
    contextPattern: /\[selected\]/,
    autoFix: true,
    schematic: true,
    migrationGuide: getBreakingChangesUri('15') + '#material-chips-selectable',
  },

  {
    id: 'v15-material-chips-display',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.CRITICAL,
    description: 'Material Chips: Display-only chips - use mat-chip-set ([selected] → [highlighted])',
    pattern: /mat-chip-list|MatChipList/,
    autoFix: true,
    schematic: true,
    migrationGuide: getBreakingChangesUri('15') + '#material-chips-display',
  },

  {
    id: 'v15-material-chips-selected-property',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.HIGH,
    description: 'Material Chips: [selected] property changed - depends on chip type (grid/listbox/set)',
    pattern: /\[selected\]/,
    contextPattern: /mat-chip/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('15') + '#material-chips',
  },

  // HIGH: Material Form Field
  {
    id: 'v15-material-form-field-outline-gap',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.HIGH,
    description: 'Material Form Field: updateOutlineGap() method removed',
    pattern: /\.updateOutlineGap\s*\(/,
    autoFix: true,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#material-form-field',
  },

  // MEDIUM: ag-Grid imports
  {
    id: 'v15-aggrid-imports',
    category: BREAKING_CHANGE_CATEGORY.IMPORT_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'ag-Grid: stylesheet import paths changed',
    pattern: /@import\s+['"]~ag-grid/,
    autoFix: true,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#aggrid-imports',
  },

  {
    id: 'v15-aggrid-api-changes',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'ag-Grid: detailNode and IRowNode API changes require manual review',
    pattern: /detailNode|IRowNode/,
    contextPattern: /ag-grid/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#aggrid-api',
  },

  // MEDIUM MANUAL: Highcharts
  {
    id: 'v15-highcharts-api-changes',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'Highcharts: Type definitions changed (zoomType property location changed)',
    pattern: /zoomType|ChartOptions/,
    contextPattern: /highcharts|Highcharts/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#highcharts-api',
  },

  // CRITICAL MANUAL: Material Slider
  {
    id: 'v15-material-slider-api',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.CRITICAL,
    description: 'Material Slider: API completely changed (MANUAL MIGRATION REQUIRED)',
    pattern: /mat-slider|MatSlider/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('15') + '#material-slider',
  },

  // HIGH MANUAL: RxJS subscribe syntax
  {
    id: 'v15-rxjs-subscribe-syntax',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.HIGH,
    description: 'RxJS: Old subscribe() syntax deprecated (use observer object)',
    pattern: /\.subscribe\s*\(\s*\w+\s*=>/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#rxjs-subscribe',
  },

  // HIGH MANUAL: ControlValueAccessor
  {
    id: 'v15-control-value-accessor',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'ControlValueAccessor: setDisabledState() method now required',
    pattern: /implements\s+ControlValueAccessor/,
    contextPattern: /setDisabledState/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#control-value-accessor',
  },

  // HIGH MANUAL: Material Theming
  {
    id: 'v15-material-theming',
    category: BREAKING_CHANGE_CATEGORY.CONFIG_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'Material Theming: Theme configuration format changed (@import → @use, mat-palette → mat.define-palette)',
    pattern: /@import\s+['"]~?@angular\/material\/theming['"]|mat-palette\(|mat-light-theme\(|mat-dark-theme\(|angular-material-theme\(/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('15') + '#material-theming',
  },

  // Router guards recommendation
  {
    id: 'v15-router-guards-boolean',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'Router guards must return Observable<boolean | UrlTree> instead of boolean',
    pattern: /canActivate.*:\s*boolean/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('15') + '#router-guards',
  },
];

/**
 * Angular 16 Breaking Changes Patterns
 */
const V16_BREAKING_CHANGES: BreakingChangePattern[] = [
  {
    id: 'v16-material-chips-deprecated',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.HIGH,
    description: 'Material Chips API deprecated',
    pattern: /MatChipInputEvent|mat-chip-list/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('16') + '#material-chips',
  },
  {
    id: 'v16-provided-in-any',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.MEDIUM,
    description: "providedIn: 'any' is deprecated",
    pattern: /providedIn:\s*['"]any['"]/,
    autoFix: true,
    schematic: false,
    migrationGuide: getBreakingChangesUri('16') + '#provided-in-any',
    replacement: "providedIn: 'root'",
  },
];

/**
 * Angular 17 Breaking Changes Patterns
 */
const V17_BREAKING_CHANGES: BreakingChangePattern[] = [
  {
    id: 'v17-control-flow-ngif',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.MEDIUM,
    description: 'Consider migrating to new @if syntax',
    pattern: /\*ngIf/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('17') + '#control-flow',
  },
  {
    id: 'v17-inject-usage',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.LOW,
    description: 'Consider using inject() function instead of constructor injection',
    pattern: /constructor\s*\([^)]*private.*:\s*\w+/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('17') + '#inject-function',
  },
];

/**
 * Angular 18 Breaking Changes Patterns
 */
const V18_BREAKING_CHANGES: BreakingChangePattern[] = [
  // CRITICAL: HttpClientModule and related modules deprecated
  {
    id: 'v18-http-client-module',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.CRITICAL,
    description: 'HttpClientModule deprecated - use provideHttpClient()',
    pattern: /HttpClientModule/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('18') + '#http-client-module',
  },
  {
    id: 'v18-http-client-testing-module',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.CRITICAL,
    description: 'HttpClientTestingModule deprecated - use provideHttpClientTesting()',
    pattern: /HttpClientTestingModule/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('18') + '#http-client-testing',
  },
  {
    id: 'v18-http-client-xsrf-module',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.MEDIUM,
    description: 'HttpClientXsrfModule deprecated - use provideHttpClient(withXsrfConfiguration())',
    pattern: /HttpClientXsrfModule/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('18') + '#http-client-xsrf',
  },
  {
    id: 'v18-http-client-jsonp-module',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.MEDIUM,
    description: 'HttpClientJsonpModule deprecated - use provideHttpClient(withJsonpSupport())',
    pattern: /HttpClientJsonpModule/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('18') + '#http-client-jsonp',
  },

  // MEDIUM: Import changes
  {
    id: 'v18-state-key-imports',
    category: BREAKING_CHANGE_CATEGORY.IMPORT_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'StateKey/TransferState moved to @angular/core',
    pattern: /from\s+['"]@angular\/platform-browser['"]/,
    contextPattern: /(StateKey|TransferState|makeStateKey)/,
    autoFix: true,
    schematic: false,
    migrationGuide: getBreakingChangesUri('18') + '#state-key-imports',
    replacement: "from '@angular/core'",
  },

  // HIGH: Removed features
  {
    id: 'v18-server-transfer-state-module',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.HIGH,
    description: 'ServerTransferStateModule removed',
    pattern: /ServerTransferStateModule/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('18') + '#server-transfer-state',
  },

  // MEDIUM: Removed platform APIs
  {
    id: 'v18-platform-worker-apis',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.MEDIUM,
    description: 'Platform Worker APIs removed (WebWorker platform removed)',
    pattern: /isPlatformWorkerUi|isPlatformWorkerApp/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('18') + '#platform-worker',
  },
  {
    id: 'v18-platform-dynamic-server',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.MEDIUM,
    description: 'platformDynamicServer removed - use renderApplication',
    pattern: /platformDynamicServer/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('18') + '#platform-dynamic-server',
  },

  // HIGH: Router redirects must be absolute
  {
    id: 'v18-route-redirects-absolute',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'Route redirects must be absolute (start with /)',
    pattern: /redirectTo\s*:\s*['"][^\/]/,
    contextPattern: /path\s*:/,
    autoFix: false,
    schematic: true,
    migrationGuide: getBreakingChangesUri('18') + '#route-redirects',
  },
];

/**
 * Angular 19 Breaking Changes Patterns
 */
const V19_BREAKING_CHANGES: BreakingChangePattern[] = [
  // CRITICAL: BrowserModule.withServerTransition removed
  {
    id: 'v19-browser-module-with-server-transition',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.CRITICAL,
    description: 'BrowserModule.withServerTransition() removed - use APP_ID provider',
    pattern: /\.withServerTransition\s*\(/,
    contextPattern: /BrowserModule/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#browser-module-server-transition',
  },

  // HIGH: KeyValueDiffers.factories removed
  {
    id: 'v19-key-value-differs-factories',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.HIGH,
    description: 'KeyValueDiffers.factories property removed',
    pattern: /KeyValueDiffers/,
    contextPattern: /\.factories/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#key-value-differs',
  },

  // MEDIUM: Testability methods removed
  {
    id: 'v19-testability-methods',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.MEDIUM,
    description: 'Testability zone.js-specific methods removed',
    pattern: /increasePendingRequestCount|decreasePendingRequestCount|getPendingRequestCount/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#testability-methods',
  },

  // MEDIUM: ApplicationRef.tick() error handling changed
  {
    id: 'v19-application-ref-tick',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'ApplicationRef.tick() no longer catches errors',
    pattern: /ApplicationRef/,
    contextPattern: /\.tick\s*\(/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#application-ref-tick',
  },

  // MEDIUM: HTTP caching behavior changed
  {
    id: 'v19-http-transfer-cache-auth',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'HTTP transfer cache: requests with auth headers now prevented from caching',
    pattern: /withHttpTransferCache/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#http-transfer-cache',
  },

  // HIGH: TypeScript version requirement
  {
    id: 'v19-typescript-version',
    category: BREAKING_CHANGE_CATEGORY.CONFIG_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'TypeScript 5.9+ required (5.8 and older no longer supported)',
    pattern: /"typescript"\s*:\s*["'][~^]?5\.[0-8]/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#typescript-version',
  },

  // HIGH: Third-party - AG-Grid v32 changes
  {
    id: 'v19-aggrid-column-api',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'AG-Grid v32: ColumnApi removed, use gridApi instead',
    pattern: /ColumnApi/,
    contextPattern: /ag-grid/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#aggrid-column-api',
  },
  {
    id: 'v19-aggrid-set-row-data',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'AG-Grid v32: setRowData() replaced with setGridOption()',
    pattern: /\.setRowData\s*\(/,
    contextPattern: /ag-grid|gridApi/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#aggrid-set-row-data',
  },
  {
    id: 'v19-aggrid-set-quick-filter',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'AG-Grid v32: setQuickFilter() replaced with setGridOption()',
    pattern: /\.setQuickFilter\s*\(/,
    contextPattern: /ag-grid|gridApi/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#aggrid-set-quick-filter',
  },

  // MEDIUM: Third-party - ngx-translate
  {
    id: 'v19-translate-http-loader',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: '@ngx-translate/http-loader@17: Constructor no longer accepts path parameters',
    pattern: /new\s+TranslateHttpLoader\s*\(\s*\w+\s*,/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#translate-http-loader',
  },

  // MEDIUM: Standalone components in NgModules
  {
    id: 'v19-standalone-in-declarations',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'Standalone components should be in imports, not declarations',
    pattern: /declarations\s*:\s*\[/,
    contextPattern: /standalone\s*:\s*true/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#standalone-declarations',
  },
];

/**
 * Angular 20 Breaking Changes Patterns
 */
const V20_BREAKING_CHANGES: BreakingChangePattern[] = [
  // CRITICAL: InjectFlags removed
  {
    id: 'v20-inject-flags',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.CRITICAL,
    description: 'InjectFlags removed - use options object instead',
    pattern: /\bInjectFlags\b/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('20') + '#inject-flags',
  },

  // CRITICAL: TestBed.get removed
  {
    id: 'v20-testbed-get',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.CRITICAL,
    description: 'TestBed.get() removed - use TestBed.inject()',
    pattern: /TestBed\.get\s*\(/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('20') + '#testbed-get',
  },

  // HIGH: provideExperimentalZonelessChangeDetection renamed
  {
    id: 'v20-zoneless-provider-rename',
    category: BREAKING_CHANGE_CATEGORY.DEPRECATED_API,
    severity: SEVERITY.HIGH,
    description: 'provideExperimentalZonelessChangeDetection renamed to provideZonelessChangeDetection',
    pattern: /provideExperimentalZonelessChangeDetection/,
    autoFix: true,
    schematic: false,
    migrationGuide: getBreakingChangesUri('20') + '#zoneless-provider',
    replacement: 'provideZonelessChangeDetection',
  },

  // MEDIUM: ignoreChangesOutsideZone removed
  {
    id: 'v20-ignore-changes-outside-zone',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.MEDIUM,
    description: 'ignoreChangesOutsideZone option removed',
    pattern: /ignoreChangesOutsideZone/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('20') + '#ignore-changes-outside-zone',
  },

  // MEDIUM: Highcharts v11→v12 import syntax
  {
    id: 'v20-highcharts-import',
    category: BREAKING_CHANGE_CATEGORY.IMPORT_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'Highcharts v12: import syntax changed',
    pattern: /import\s+\*\s+as\s+Highcharts\s+from\s+['"]highcharts['"]/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('20') + '#highcharts-import',
  },
];

/**
 * Angular 21 Breaking Changes Patterns
 */
const V21_BREAKING_CHANGES: BreakingChangePattern[] = [
  // CRITICAL: NgModuleFactory removed
  {
    id: 'v21-ng-module-factory',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.CRITICAL,
    description: 'NgModuleFactory removed - migrate to standalone components',
    pattern: /NgModuleFactory/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('21') + '#ng-module-factory',
  },

  // HIGH: ApplicationConfig import moved
  {
    id: 'v21-application-config-import',
    category: BREAKING_CHANGE_CATEGORY.IMPORT_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'ApplicationConfig moved from @angular/platform-browser to @angular/core',
    pattern: /from\s+['"]@angular\/platform-browser['"]/,
    contextPattern: /ApplicationConfig/,
    autoFix: true,
    schematic: false,
    migrationGuide: getBreakingChangesUri('21') + '#application-config-import',
    replacement: "from '@angular/core'",
  },

  // HIGH: Router.lastSuccessfulNavigation is now a signal
  {
    id: 'v21-router-last-successful-navigation',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'Router.lastSuccessfulNavigation is now a signal - add () to access value',
    pattern: /\.lastSuccessfulNavigation(?!\()/,
    contextPattern: /Router/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('21') + '#router-last-successful-navigation',
  },

  // CRITICAL: UpgradeAdapter removed
  {
    id: 'v21-upgrade-adapter',
    category: BREAKING_CHANGE_CATEGORY.REMOVED_FEATURE,
    severity: SEVERITY.CRITICAL,
    description: 'UpgradeAdapter removed - migrate to standalone components',
    pattern: /UpgradeAdapter/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('21') + '#upgrade-adapter',
  },

  // HIGH: Zoneless by default
  {
    id: 'v21-zoneless-by-default',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'Angular 21 is zoneless by default - add provideZoneChangeDetection() for zone.js',
    pattern: /bootstrapApplication|bootstrapModule/,
    contextPattern: /providers\s*:/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('21') + '#zoneless-default',
  },

  // MEDIUM: ngComponentOutletContent type changed
  {
    id: 'v21-ng-component-outlet-content',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'ngComponentOutletContent type changed - now requires array of nodes',
    pattern: /ngComponentOutletContent/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('21') + '#ng-component-outlet-content',
  },

  // HIGH: TypeScript 5.9+ required
  {
    id: 'v21-typescript-version',
    category: BREAKING_CHANGE_CATEGORY.CONFIG_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'TypeScript 5.9+ required',
    pattern: /"typescript"\s*:\s*["'][~^]?5\.[0-8]/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('21') + '#typescript-version',
  },
];

/**
 * Version-specific pattern mapping
 */
const VERSION_PATTERNS: Record<string, BreakingChangePattern[]> = {
  '15': V15_BREAKING_CHANGES,
  '16': V16_BREAKING_CHANGES,
  '17': V17_BREAKING_CHANGES,
  '18': V18_BREAKING_CHANGES,
  '19': V19_BREAKING_CHANGES,
  '20': V20_BREAKING_CHANGES,
  '21': V21_BREAKING_CHANGES,
};

/**
 * Scan a file for breaking changes
 */
function scanFileForBreakingChanges(
  filePath: string,
  patterns: BreakingChangePattern[]
): BreakingChangeDetection[] {
  const detections: BreakingChangeDetection[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of patterns) {
      // Check if pattern matches
      if (pattern.pattern.test(content)) {
        // If context pattern is required, check it too
        if (pattern.contextPattern && !pattern.contextPattern.test(content)) {
          continue;
        }

        // Find line numbers
        const affectedLines: Array<{ line: number; snippet: string }> = [];

        lines.forEach((line, index) => {
          if (pattern.pattern.test(line)) {
            // Additional context check if needed
            if (!pattern.contextPattern || pattern.contextPattern.test(content)) {
              affectedLines.push({
                line: index + 1,
                snippet: line.trim(),
              });
            }
          }
        });

        if (affectedLines.length > 0) {
          detections.push({
            id: pattern.id,
            category: pattern.category,
            severity: pattern.severity as 'critical' | 'high' | 'medium' | 'low',
            description: pattern.description,
            affectedFiles: affectedLines.map((al) => ({
              path: filePath,
              line: al.line,
              snippet: al.snippet,
            })),
            autoFixAvailable: pattern.autoFix,
            schematicAvailable: pattern.schematic,
            migrationGuide: pattern.migrationGuide,
          });
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read
    console.error(`Error scanning ${filePath}:`, error);
  }

  return detections;
}

/**
 * Find all relevant files for breaking changes detection
 * Includes TypeScript, JSON (tsconfig), and SCSS files
 */
function findRelevantFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip excluded directories using constant
      if (!EXCLUDED_DIRECTORIES.includes(file as any)) {
        findRelevantFiles(filePath, fileList);
      }
    } else {
      // Include TypeScript files (except spec files)
      if (file.endsWith(FILE_PATTERNS.TYPESCRIPT) && !file.endsWith(FILE_PATTERNS.SPEC_FILE)) {
        fileList.push(filePath);
      }
      // Include tsconfig*.json files
      else if (file.includes(FILE_PATTERNS.TSCONFIG_PATTERN) && file.endsWith(FILE_PATTERNS.JSON)) {
        fileList.push(filePath);
      }
      // Include SCSS/SASS files
      else if (file.endsWith(FILE_PATTERNS.SCSS) || file.endsWith(FILE_PATTERNS.SASS)) {
        fileList.push(filePath);
      }
      // Include HTML template files
      else if (file.endsWith(FILE_PATTERNS.HTML)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

/**
 * Detect breaking changes in codebase
 * Tool: detect_breaking_changes
 */
export async function detectBreakingChanges(
  args: { fromVersion: string; toVersion: string; projectPath?: string },
  sessionManager: SessionManager,
  progressCallback: ProgressCallback
): Promise<StandardToolResponse | StandardErrorResponse> {
  const fromVersion = args.fromVersion;
  const toVersion = args.toVersion;
  const projectPath = args.projectPath || process.cwd();

  const tracker = new ProgressTracker(progressCallback, {
    toolName: TOOL_NAMES.DETECT_BREAKING_CHANGES,
  });

  tracker.info(`Scanning for breaking changes: v${fromVersion} → v${toVersion}`, PROGRESS.VALIDATION);

  try {
    // Get patterns for target version
    const patterns = VERSION_PATTERNS[toVersion];
    if (!patterns) {
      return ResponseBuilder.unsupportedVersionError(toVersion, Object.keys(VERSION_PATTERNS));
    }

    tracker.info('Finding files to scan (TS, JSON, SCSS, HTML)', PROGRESS.READING);

    // Find all relevant files (TypeScript, tsconfig, SCSS, HTML templates)
    const filesToScan = findRelevantFiles(projectPath);

    tracker.info(`Scanning ${filesToScan.length} files`, PROGRESS.PARSING);

    // Scan each file
    const allDetections: BreakingChangeDetection[] = [];
    let filesScanned = 0;

    for (const file of filesToScan) {
      const detections = scanFileForBreakingChanges(file, patterns);
      allDetections.push(...detections);

      filesScanned++;
      if (filesScanned % 10 === 0) {
        const progress = PROGRESS.PARSING + ((filesScanned / filesToScan.length) * (PROGRESS.GENERATING - PROGRESS.PARSING));
        tracker.info(`Scanned ${filesScanned}/${filesToScan.length} files`, progress);
      }
    }

    tracker.success('Scan complete', PROGRESS.COMPLETE);

    // Group by ID to avoid duplicates
    const uniqueDetections = new Map<string, BreakingChangeDetection>();
    for (const detection of allDetections) {
      if (!uniqueDetections.has(detection.id)) {
        uniqueDetections.set(detection.id, detection);
      } else {
        // Merge affected files
        const existing = uniqueDetections.get(detection.id)!;
        existing.affectedFiles.push(...detection.affectedFiles);
      }
    }

    const breakingChanges = Array.from(uniqueDetections.values());

    // Calculate statistics
    const criticalIssues = breakingChanges.filter((bc) => bc.severity === SEVERITY.CRITICAL).length;
    const autoFixableIssues = breakingChanges.filter((bc) => bc.autoFixAvailable).length;

    const hasIssues = breakingChanges.length > 0;

    return ResponseBuilder[hasIssues ? 'warning' : 'success']({
      data: {
        version: toVersion,
        scanCompleted: true,
        filesScanned: filesToScan.length,
        breakingChanges,
        totalIssues: breakingChanges.length,
        criticalIssues,
        autoFixableIssues,
      },
      nextAction: hasIssues
        ? 'Review detected breaking changes and apply automated fixes'
        : 'No breaking changes detected - proceed with migration',
      instructionRef: getBreakingChangesUri(toVersion),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    tracker.error(`Detection failed: ${errorMessage}`);

    return ResponseBuilder.operationFailedError('detect breaking changes', errorMessage);
  }
}

/**
 * Get breaking changes documentation
 * Tool: get_breaking_changes_documentation
 */
export async function getBreakingChangesDocumentation(
  args: { version: string },
  sessionManager: SessionManager,
  progressCallback: ProgressCallback
): Promise<StandardToolResponse | StandardErrorResponse> {
  const version = args.version;

  try {
    const patterns = VERSION_PATTERNS[version];
    if (!patterns) {
      return ResponseBuilder.error({
        code: ERROR_CODES.VERSION_PARSE_ERROR,
        message: `No documentation for Angular ${version}`,
        details: `Supported versions: ${Object.keys(VERSION_PATTERNS).join(', ')}`,
        nextAction: 'Use a supported version',
      });
    }

    const criticalChanges = patterns
      .filter((p) => p.severity === SEVERITY.CRITICAL || p.severity === SEVERITY.HIGH)
      .map((p) => ({
        title: p.description,
        description: `Pattern: ${p.pattern.source}`,
        impact: `${p.severity.toUpperCase()} - May cause build or runtime errors`,
        autoFixed: p.autoFix,
      }));

    return ResponseBuilder.success({
      data: {
        version,
        resourceUri: getBreakingChangesUri(version),
        summary: `Angular ${version} has ${patterns.length} known breaking changes`,
        criticalChanges,
        totalChanges: patterns.length,
        officialGuideUrl: `https://angular.io/guide/update-to-version-${version}`,
      },
      nextAction: 'Read full documentation for migration instructions',
      instructionRef: getBreakingChangesUri(version),
      automated: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return ResponseBuilder.operationFailedError('retrieve documentation', errorMessage);
  }
}

/**
 * Main handler for breaking changes detection tools
 */
export async function handleBreakingChangesDetectionTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback: ProgressCallback
): Promise<StandardToolResponse | StandardErrorResponse> {
  switch (toolName) {
    case TOOL_NAMES.DETECT_BREAKING_CHANGES:
      return detectBreakingChanges(
        args as { fromVersion: string; toVersion: string; projectPath?: string },
        sessionManager,
        progressCallback
      );

    case TOOL_NAMES.GET_BREAKING_CHANGES_DOCS:
      return getBreakingChangesDocumentation(args as { version: string }, sessionManager, progressCallback);

    default:
      return ResponseBuilder.error({
        code: ERROR_CODES.OPERATION_FAILED,
        message: `Unknown breaking changes tool: ${toolName}`,
        details: 'Tool not implemented',
        nextAction: 'Use a valid tool name',
      });
  }
}

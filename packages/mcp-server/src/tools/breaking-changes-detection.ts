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
 */
const V15_BREAKING_CHANGES: BreakingChangePattern[] = [
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
];

/**
 * Angular 19 Breaking Changes Patterns
 */
const V19_BREAKING_CHANGES: BreakingChangePattern[] = [
  {
    id: 'v19-aggrid-breaking-changes',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.HIGH,
    description: 'AG-Grid breaking changes in v32+',
    pattern: /ag-grid-angular|ag-grid-community/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('19') + '#aggrid',
  },
];

/**
 * Angular 20 Breaking Changes Patterns
 */
const V20_BREAKING_CHANGES: BreakingChangePattern[] = [
  {
    id: 'v20-highcharts-updates',
    category: BREAKING_CHANGE_CATEGORY.BEHAVIOR_CHANGES,
    severity: SEVERITY.MEDIUM,
    description: 'Highcharts compatibility updates',
    pattern: /highcharts/,
    autoFix: false,
    schematic: false,
    migrationGuide: getBreakingChangesUri('20') + '#highcharts',
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
 * Find all TypeScript files in a directory
 * Uses constants for excluded directories and file patterns
 */
function findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip excluded directories using constant
      if (!EXCLUDED_DIRECTORIES.includes(file as any)) {
        findTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith(FILE_PATTERNS.TYPESCRIPT) && !file.endsWith(FILE_PATTERNS.SPEC_FILE)) {
      fileList.push(filePath);
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

    tracker.info('Finding TypeScript files', PROGRESS.READING);

    // Find all TypeScript files
    const tsFiles = findTypeScriptFiles(projectPath);

    tracker.info(`Scanning ${tsFiles.length} files`, PROGRESS.PARSING);

    // Scan each file
    const allDetections: BreakingChangeDetection[] = [];
    let filesScanned = 0;

    for (const file of tsFiles) {
      const detections = scanFileForBreakingChanges(file, patterns);
      allDetections.push(...detections);

      filesScanned++;
      if (filesScanned % 10 === 0) {
        const progress = PROGRESS.PARSING + ((filesScanned / tsFiles.length) * (PROGRESS.GENERATING - PROGRESS.PARSING));
        tracker.info(`Scanned ${filesScanned}/${tsFiles.length} files`, progress);
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
        filesScanned: tsFiles.length,
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

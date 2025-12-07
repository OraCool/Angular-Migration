/**
 * Application Constants
 * Centralized configuration values and magic numbers
 * Eliminates duplication and improves maintainability
 */

/**
 * Angular version constraints
 */
export const ANGULAR_VERSION = {
  /** Minimum supported Angular major version */
  MIN_SUPPORTED: 14,

  /** Maximum supported Angular major version */
  MAX_SUPPORTED: 21,

  /** Default target version for migrations */
  DEFAULT_TARGET: 21,

  /** Supported version range for display */
  SUPPORTED_RANGE: '14-21',
} as const;

/**
 * Node.js version requirements
 */
export const NODE_VERSION = {
  /** Minimum Node.js major version for Angular 15+ */
  MIN_FOR_ANGULAR_15: 18,

  /** Minimum Node.js major version for Angular 17+ */
  MIN_FOR_ANGULAR_17: 20,

  /** Minimum Node.js major version for Angular 19+ */
  MIN_FOR_ANGULAR_19: 22,

  /** Default minimum Node.js version */
  DEFAULT_MIN: 18,

  /** Default required version string */
  DEFAULT_REQUIRED: '18.13.0+',
} as const;

/**
 * File patterns for code scanning
 */
export const FILE_PATTERNS = {
  /** TypeScript file extension */
  TYPESCRIPT: '.ts',

  /** TypeScript spec file pattern */
  SPEC_FILE: '.spec.ts',

  /** All TypeScript files glob pattern */
  ALL_TS: '**/*.ts',

  /** JSON file extension */
  JSON: '.json',

  /** SCSS file extension */
  SCSS: '.scss',

  /** SASS file extension */
  SASS: '.sass',

  /** CSS file extension */
  CSS: '.css',

  /** HTML file extension */
  HTML: '.html',

  /** Package.json filename */
  PACKAGE_JSON: 'package.json',

  /** Angular.json filename */
  ANGULAR_JSON: 'angular.json',

  /** tsconfig.json filename */
  TSCONFIG_JSON: 'tsconfig.json',

  /** tsconfig pattern */
  TSCONFIG_PATTERN: 'tsconfig',
} as const;

/**
 * Directory patterns to exclude from scanning
 */
export const EXCLUDED_DIRECTORIES = [
  'node_modules',
  'dist',
  'coverage',
  '.angular',
  '.git',
  'build',
  'out',
] as const;

/**
 * Progress percentage milestones
 * Standard progress points for consistency across tools
 */
export const PROGRESS = {
  /** Starting progress */
  START: 0,

  /** Initial validation complete */
  VALIDATION: 10,

  /** Reading files/configuration */
  READING: 20,

  /** Parsing data */
  PARSING: 40,

  /** Processing/analyzing */
  PROCESSING: 60,

  /** Generating results */
  GENERATING: 80,

  /** Nearly complete */
  FINALIZING: 90,

  /** Complete */
  COMPLETE: 100,
} as const;

/**
 * MCP Resource URI schemes
 * Spec-compliant URI patterns for documentation resources
 */
export const RESOURCE_URI = {
  /** Breaking changes URI scheme */
  BREAKING_CHANGES_SCHEME: 'breaking-changes://',

  /** Migration guide URI scheme */
  GUIDE_SCHEME: 'guide://',

  /** Breaking changes overview */
  BREAKING_CHANGES_OVERVIEW: 'breaking-changes://overview',

  /** Migration guides */
  GUIDES: {
    PREREQUISITES: 'guide://prerequisites',
    BACKUP: 'guide://backup',
    VALIDATION: 'guide://validation',
    TROUBLESHOOTING: 'guide://troubleshooting',
    STANDALONE_MIGRATION: 'guide://standalone-migration',
    SIGNALS_MIGRATION: 'guide://signals-migration',
    CONTROL_FLOW_MIGRATION: 'guide://control-flow-migration',
  },
} as const;

/**
 * Generate breaking changes URI for a specific version
 *
 * @param version - Angular version (e.g., '15', '18')
 * @returns Breaking changes URI
 *
 * @example
 * ```typescript
 * const uri = RESOURCE_URI.breakingChangesFor('18');
 * // Returns: 'breaking-changes://v18'
 * ```
 */
export function getBreakingChangesUri(version: string | number): string {
  return `${RESOURCE_URI.BREAKING_CHANGES_SCHEME}v${version}`;
}

/**
 * Generate migration guide URI for a specific version
 *
 * @param version - Angular version (e.g., '15', '18')
 * @returns Migration guide URI
 *
 * @example
 * ```typescript
 * const uri = getMigrationGuideUri('18');
 * // Returns: 'guide://migrate/v18'
 * ```
 */
export function getMigrationGuideUri(version: string | number): string {
  return `${RESOURCE_URI.GUIDE_SCHEME}migrate/v${version}`;
}

/**
 * Generate breaking changes anchor link
 *
 * @param version - Angular version
 * @param anchor - Section anchor (e.g., 'http-client-module')
 * @returns Full URI with anchor
 *
 * @example
 * ```typescript
 * const uri = getBreakingChangesAnchor('18', 'http-client-module');
 * // Returns: 'breaking-changes://v18#http-client-module'
 * ```
 */
export function getBreakingChangesAnchor(version: string | number, anchor: string): string {
  return `${getBreakingChangesUri(version)}#${anchor}`;
}

/**
 * Error codes
 * Standardized error codes for consistent error handling
 */
export const ERROR_CODES = {
  /** File not found errors */
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PACKAGE_JSON_NOT_FOUND: 'PACKAGE_JSON_NOT_FOUND',
  ANGULAR_JSON_NOT_FOUND: 'ANGULAR_JSON_NOT_FOUND',

  /** Version errors */
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  VERSION_PARSE_ERROR: 'VERSION_PARSE_ERROR',

  /** Angular-specific errors */
  ANGULAR_NOT_FOUND: 'ANGULAR_NOT_FOUND',
  NOT_ANGULAR_PROJECT: 'NOT_ANGULAR_PROJECT',

  /** Node.js errors */
  NODE_VERSION_INCOMPATIBLE: 'NODE_VERSION_INCOMPATIBLE',

  /** Git errors */
  GIT_NOT_INSTALLED: 'GIT_NOT_INSTALLED',
  GIT_DIRTY_WORKING_TREE: 'GIT_DIRTY_WORKING_TREE',

  /** Operation errors */
  OPERATION_FAILED: 'OPERATION_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MIGRATION_FAILED: 'MIGRATION_FAILED',

  /** Path errors */
  INVALID_PATH: 'INVALID_PATH',
  PATH_NOT_DIRECTORY: 'PATH_NOT_DIRECTORY',
} as const;

/**
 * Breaking change severity levels
 */
export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

/**
 * Breaking change categories
 */
export const BREAKING_CHANGE_CATEGORY = {
  DEPRECATED_API: 'Deprecated API',
  IMPORT_CHANGES: 'Import Changes',
  CONFIG_CHANGES: 'Configuration Changes',
  BEHAVIOR_CHANGES: 'Behavior Changes',
  REMOVED_FEATURE: 'Removed Feature',
} as const;

/**
 * Migration stage names
 */
export const MIGRATION_STAGES = {
  PREREQUISITES: 'prerequisites',
  BACKUP: 'backup',
  VERSION_UPDATE: 'version_update',
  DEPENDENCIES: 'dependencies',
  BREAKING_CHANGES: 'breaking_changes',
  BUILD_VALIDATION: 'build_validation',
  TEST_VALIDATION: 'test_validation',
  COMPLETION: 'completion',
} as const;

/**
 * Tool names for progress tracking
 */
export const TOOL_NAMES = {
  ANALYZE_PROJECT: 'analyze_project_version',
  CHECK_PREREQUISITES: 'check_migration_prerequisites',
  GENERATE_PLAN: 'generate_migration_plan',
  DETECT_BREAKING_CHANGES: 'detect_breaking_changes',
  GET_BREAKING_CHANGES_DOCS: 'get_breaking_changes_documentation',
} as const;

/**
 * Default timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  /** Default command execution timeout (2 minutes) */
  COMMAND_EXECUTION: 120000,

  /** NPM install timeout (5 minutes) */
  NPM_INSTALL: 300000,

  /** Build timeout (10 minutes) */
  BUILD: 600000,

  /** Test timeout (15 minutes) */
  TEST: 900000,
} as const;

/**
 * Validation thresholds
 */
export const THRESHOLDS = {
  /** Maximum allowed dependencies with vulnerabilities */
  MAX_VULNERABLE_DEPS: 0,

  /** Minimum test coverage percentage */
  MIN_TEST_COVERAGE: 80,

  /** Maximum bundle size increase percentage */
  MAX_BUNDLE_SIZE_INCREASE: 10,
} as const;

/**
 * Common NPM commands
 */
export const NPM_COMMANDS = {
  INSTALL: 'npm install',
  CI: 'npm ci',
  UPDATE: 'npm update',
  OUTDATED: 'npm outdated',
  AUDIT: 'npm audit',
  BUILD: 'npm run build',
  TEST: 'npm test',
  LINT: 'npm run lint',
} as const;

/**
 * Git commands
 */
export const GIT_COMMANDS = {
  STATUS: 'git status',
  DIFF: 'git diff',
  ADD: 'git add',
  COMMIT: 'git commit',
  STASH: 'git stash',
  STASH_POP: 'git stash pop',
} as const;

/**
 * Check if a version is within supported range
 *
 * @param major - Angular major version
 * @returns True if version is supported
 */
export function isVersionSupported(major: number): boolean {
  return major >= ANGULAR_VERSION.MIN_SUPPORTED && major <= ANGULAR_VERSION.MAX_SUPPORTED;
}

/**
 * Get required Node.js version for Angular version
 *
 * @param angularMajor - Angular major version
 * @returns Required Node.js major version
 */
export function getRequiredNodeVersion(angularMajor: number): number {
  if (angularMajor >= 19) return NODE_VERSION.MIN_FOR_ANGULAR_19;
  if (angularMajor >= 17) return NODE_VERSION.MIN_FOR_ANGULAR_17;
  if (angularMajor >= 15) return NODE_VERSION.MIN_FOR_ANGULAR_15;
  return NODE_VERSION.DEFAULT_MIN;
}

/**
 * Check if a file should be excluded from scanning
 *
 * @param filePath - File path to check
 * @returns True if file should be excluded
 */
export function shouldExcludeFile(filePath: string): boolean {
  // Exclude spec files
  if (filePath.endsWith(FILE_PATTERNS.SPEC_FILE)) {
    return true;
  }

  // Exclude files in excluded directories
  return EXCLUDED_DIRECTORIES.some((dir) => filePath.includes(`/${dir}/`));
}

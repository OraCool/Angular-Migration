/**
 * Workflow Engine for Step-by-Step Angular Migration
 * Handles sequential upgrades with user confirmation and rollback support
 */

import type {
  SessionId,
  Plan,
  PlanEntry,
  StageExecutionOptions,
  StageExecutionResult,
  StepExecutionResult,
  StageProgress,
  ProgressCallback,
  ProgressUpdate,
} from '../types/index.js';
import { StateManager } from './state-manager.js';
import {
  type StageDefinition,
  getStageById as getStageDefinitionById,
  getStageByStepIndex,
} from './workflow-stages.js';
import { execSync, spawn } from 'child_process';
import { getPlatform, getShellCommand } from '../utils/platform.js';
import { updatePackages } from '../utils/package-updater.js';
import { applyBreakingChangeFixes } from '../utils/breaking-changes.js';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  version?: string; // Target Angular version for this step
  requiredNodeVersion?: string; // Required Node.js version (e.g., '18.13' or '18.13+,20.9+')
  requiresConfirmation: boolean;
  requiresBackup: boolean;
  actions: WorkflowAction[];
  rollbackActions?: WorkflowAction[];
  validations: WorkflowValidation[];
  retry?: RetryConfig; // Retry configuration for this step
}

export interface RetryConfig {
  maxAttempts: number; // Maximum retry attempts (1 = no retry, 2 = 1 retry, etc.)
  delayMs?: number; // Initial delay before retry (default: 1000ms)
  backoffMultiplier?: number; // Exponential backoff multiplier (default: 2)
  maxDelayMs?: number; // Maximum delay between retries (default: 30000ms)
  retryableErrors?: RegExp[]; // Only retry if error matches these patterns
}

export interface WorkflowAction {
  type: 'script' | 'command' | 'schematic' | 'manual' | 'auto-fix' | 'tool';
  name: string;
  command?: string;
  scriptPath?: string;
  args?: string[];
  workingDir?: string;
  toolName?: string; // For tool actions: name of ACP tool to invoke
  toolParams?: Record<string, any>; // For tool actions: parameters to pass to tool
  description: string;
  timeout?: number; // milliseconds
  errorPattern?: string; // For auto-fix: pattern to match in errors
  continueOnError?: boolean; // For auto-fix: continue if fix fails
}

export interface WorkflowValidation {
  type: 'build' | 'lint' | 'test' | 'custom';
  name: string;
  command?: string;
  scriptPath?: string;
  args?: string[];
  failOnError: boolean;
  description: string;
  autoFixOnError?: boolean; // Try to auto-fix if validation fails
}

export interface WorkflowState {
  currentStepIndex: number;
  currentActionIndex: number; // Track which action within current step (0-based)
  completedSteps: string[];
  completedActions: Map<string, string[]>; // stepId -> [completed action names]
  failedSteps: string[];
  backupPath?: string;
  pendingConfirmation?: {
    stepId: string;
    message: string;
  };
  lastValidationResults: Map<string, ValidationResult>;
  retryAttempts: Map<string, number>; // Track retry attempts per step ID
}

export interface ValidationResult {
  success: boolean;
  output: string;
  error?: string;
  timestamp: Date;
}

export interface WorkflowContext {
  sessionId: SessionId;
  projectPath: string;
  currentVersion: string;
  targetVersion: string;
  skipTests?: boolean;
  skipLint?: boolean;
  autoConfirm?: boolean;
  progressCallback?: ProgressCallback;
}

/**
 * Angular 14 → 20 Migration Workflow
 * Each step upgrades to the next major version
 */
export const ANGULAR_MIGRATION_WORKFLOW: WorkflowStep[] = [
  {
    id: 'pre-migration-backup',
    title: 'Pre-Migration Backup',
    description: 'Create a full backup of the current codebase',
    requiresConfirmation: false,
    requiresBackup: false, // Don't double-backup - the handler creates it
    actions: [],
    validations: [],
  },

  {
    id: 'pre-migration-validation',
    title: 'Pre-Migration Validation',
    description: 'Validate current state before migration',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [],
    validations: [
      {
        type: 'custom',
        name: 'pre-migration-check',
        scriptPath: './scripts/pre_migration_check.sh',
        args: ['20'],
        failOnError: false, // Informational only - shows what needs fixing
        description: 'Run comprehensive pre-migration check',
      },
      {
        type: 'build',
        name: 'pre-build',
        command: 'npm run build',
        failOnError: false, // Don't block if build has warnings/optimization errors
        description: 'Verify project builds before migration',
      },
      {
        type: 'custom',
        name: 'dependency-check',
        command: 'npm list --depth=0',
        failOnError: false, // Informational - check dependencies
        description: 'Check dependency compatibility',
      },
    ],
  },

  {
    id: 'git-commit',
    title: 'Git Commit',
    description: 'Commit changes to ensure clean repository (required by Angular CLI)',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'git-add',
        command: 'git add -A',
        description: 'Stage all changes',
      },
      {
        type: 'command',
        name: 'git-commit',
        command: 'git diff-index --quiet HEAD || git commit -m "Pre-migration checkpoint - Angular 14"',
        description: 'Commit staged changes (if any)',
      },
    ],
    validations: [],
  },

  {
    id: 'upgrade-v15',
    title: 'Upgrade to Angular 15',
    description: 'Update Angular from v14 to v15 (Standalone Components introduced)',
    version: '15',
    requiresConfirmation: true,
    requiresBackup: false,
    retry: {
      maxAttempts: 3,
      delayMs: 2000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      retryableErrors: [
        /ETIMEDOUT/i,
        /ECONNRESET/i,
        /ENOTFOUND/i,
        /fetch failed/i,
        /network.*error/i,
        /registry.*error/i,
      ],
    },
    actions: [
      {
        type: 'tool',
        name: 'update-package-json-v15',
        toolName: 'update_packages',
        toolParams: { targetVersion: '15' },
        description: '⚠️ Update package.json to Angular 15 - MANUAL INSTALLATION REQUIRED AFTER THIS STEP',
        timeout: 60000,
      },
    ],
    rollbackActions: [
      {
        type: 'script',
        name: 'restore-backup',
        scriptPath: './scripts/restore-backup.sh',
        description: 'Restore from backup',
      },
    ],
    validations: [
      {
        type: 'custom',
        name: 'verify-v15-version',
        command: 'npx ng version | grep "Angular: 15"',
        failOnError: true,
        description: 'Verify Angular is actually version 15',
        autoFixOnError: false,
      },
      {
        type: 'build',
        name: 'build-v15',
        command: 'npm run build',
        failOnError: false,
        description: 'Verify build after v15 upgrade',
        autoFixOnError: true,
      },
    ],
  },

  {
    id: 'git-commit-v15',
    title: 'Git Commit - Angular 15',
    description: 'Commit Angular 15 upgrade',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'git-add-v15',
        command: 'git add -A',
        description: 'Stage Angular 15 changes',
      },
      {
        type: 'command',
        name: 'git-commit-v15',
        command: 'git commit -m "Upgraded to Angular 15" || true',
        description: 'Commit Angular 15 upgrade',
      },
    ],
    validations: [],
  },

  {
    id: 'migrate-standalone',
    title: 'Migrate to Standalone Components',
    description: 'Convert NgModule-based components to standalone (Angular 15+ feature)',
    requiresConfirmation: true,
    requiresBackup: false,
    actions: [
      {
        type: 'schematic',
        name: 'standalone-migration',
        command: 'ng generate @angular/core:standalone',
        description: 'Run standalone components migration schematic',
      },
      {
        type: 'tool',
        name: 'fix-standalone-issues',
        toolName: 'fix_standalone_issues',
        toolParams: {},
        description: 'Fix common issues after standalone migration (Material Chips API, missing dependencies)',
        timeout: 300000,
      },
    ],
    validations: [
      {
        type: 'build',
        name: 'build-standalone',
        command: 'npm run build',
        failOnError: false, // Changed to false so auto-fix can attempt
        description: 'Verify build after standalone migration',
        autoFixOnError: true, // ADDED: Enable auto-fix for build errors
      },
      {
        type: 'lint',
        name: 'lint-standalone',
        command: 'npm run lint',
        failOnError: false,
        description: 'Check for linting issues',
        autoFixOnError: true, // ADDED: Enable auto-fix for lint errors
      },
      {
        type: 'test',
        name: 'test-standalone',
        command: 'npm test -- --watch=false',
        failOnError: false, // Changed to false so auto-fix can attempt
        description: 'Verify tests pass after standalone migration',
        autoFixOnError: true, // ADDED: Enable auto-fix for test errors
      },
    ],
  },

  {
    id: 'git-commit-standalone',
    title: 'Git Commit - Standalone Components',
    description: 'Commit standalone components migration',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'git-add-standalone',
        command: 'git add -A',
        description: 'Stage standalone migration changes',
      },
      {
        type: 'command',
        name: 'git-commit-standalone',
        command: 'git commit -m "Migrated to standalone components" || true',
        description: 'Commit standalone migration',
      },
    ],
    validations: [],
  },

  {
    id: 'upgrade-v16',
    title: 'Upgrade to Angular 16',
    description: 'Update Angular from v15 to v16 (Signals introduced)',
    version: '16',
    requiresConfirmation: true,
    requiresBackup: false,
    retry: {
      maxAttempts: 3,
      delayMs: 2000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      retryableErrors: [
        /ETIMEDOUT/i,
        /ECONNRESET/i,
        /ENOTFOUND/i,
        /fetch failed/i,
        /network.*error/i,
        /registry.*error/i,
      ],
    },
    actions: [
      {
        type: 'tool',
        name: 'update-package-json-v16',
        toolName: 'update_packages',
        toolParams: { targetVersion: '16' },
        description: 'Update ALL packages (Angular, Material, TypeScript, ag-grid, etc.) to v16 compatible versions',
        timeout: 600000,
      },
      {
        type: 'tool',
        name: 'fix-breaking-changes-v16',
        toolName: 'fix_breaking_changes',
        toolParams: { version: '16' },
        description: 'Fix Angular 16 breaking changes (Material Chips API, remove PerfectScrollbar)',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'run-migrations-v16',
        command: 'npx ng update @angular/core@16 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular 16 migration schematics (if any)',
        timeout: 180000,
      },
      {
        type: 'command',
        name: 'run-material-migrations-v16',
        command: 'npx ng update @angular/material@16 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular Material 16 migration schematics (MDC components, legacy module removal)',
        timeout: 180000,
      },
    ],
    rollbackActions: [
      {
        type: 'script',
        name: 'restore-backup',
        scriptPath: './scripts/restore-backup.sh',
        description: 'Restore from backup',
      },
    ],
    validations: [
      {
        type: 'build',
        name: 'build-v16',
        command: 'npm run build',
        failOnError: false,
        description: 'Verify build after v16 upgrade',
        autoFixOnError: true,
      },
    ],
  },

  {
    id: 'git-commit-v16',
    title: 'Git Commit - Angular 16',
    description: 'Commit Angular 16 upgrade',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'git-add-v16',
        command: 'git add -A',
        description: 'Stage Angular 16 changes',
      },
      {
        type: 'command',
        name: 'git-commit-v16',
        command: 'git commit -m "Upgraded to Angular 16" || true',
        description: 'Commit Angular 16 upgrade',
      },
    ],
    validations: [],
  },

  {
    id: 'upgrade-v17',
    title: 'Upgrade to Angular 17',
    description: 'Update Angular from v16 to v17 (Material MDC migration, New Control Flow syntax)',
    version: '17',
    requiresConfirmation: true,
    requiresBackup: false,
    retry: {
      maxAttempts: 3,
      delayMs: 2000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      retryableErrors: [
        /ETIMEDOUT/i,
        /ECONNRESET/i,
        /ENOTFOUND/i,
        /fetch failed/i,
        /network.*error/i,
        /registry.*error/i,
      ],
    },
    actions: [
      {
        type: 'tool',
        name: 'update-package-json-v17',
        toolName: 'update_packages',
        toolParams: { targetVersion: '17' },
        description: 'Update ALL packages (Angular, Material, TypeScript, ag-grid, etc.) to v17 compatible versions',
        timeout: 600000,
      },
      {
        type: 'tool',
        name: 'fix-breaking-changes-v17',
        toolName: 'fix_breaking_changes',
        toolParams: { version: '17' },
        description: 'Fix Angular 17 breaking changes (Material MDC migration, legacy components removal)',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'run-migrations-v17',
        command: 'npx ng update @angular/core@17 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular 17 migration schematics (if any)',
        timeout: 180000,
      },
      {
        type: 'command',
        name: 'run-material-migrations-v17',
        command: 'npx ng update @angular/material@17 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular Material 17 migration schematics (MDC migration completion, legacy components removal)',
        timeout: 180000,
      },
    ],
    rollbackActions: [
      {
        type: 'script',
        name: 'restore-backup',
        scriptPath: './scripts/restore-backup.sh',
        description: 'Restore from backup',
      },
    ],
    validations: [
      {
        type: 'build',
        name: 'build-v17',
        command: 'npm run build',
        failOnError: false,
        description: 'Verify build after v17 upgrade',
        autoFixOnError: true,
      },
    ],
  },

  {
    id: 'migrate-control-flow',
    title: 'Migrate to New Control Flow Syntax',
    description: 'Convert *ngIf/*ngFor/*ngSwitch to @if/@for/@switch',
    requiresConfirmation: true,
    requiresBackup: false,
    actions: [
      {
        type: 'schematic',
        name: 'control-flow-migration',
        command: 'ng generate @angular/core:control-flow',
        description: 'Run control flow migration schematic',
      },
    ],
    validations: [
      {
        type: 'build',
        name: 'build-control-flow',
        command: 'npm run build',
        failOnError: false,
        description: 'Verify build after control flow migration',
        autoFixOnError: true,
      },
      {
        type: 'test',
        name: 'test-control-flow',
        command: 'npm test -- --watch=false',
        failOnError: false,
        description: 'Verify tests pass after control flow migration',
        autoFixOnError: true,
      },
    ],
  },

  {
    id: 'git-commit-control-flow',
    title: 'Git Commit - Control Flow Migration',
    description: 'Commit control flow syntax migration',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'git-add-control-flow',
        command: 'git add -A',
        description: 'Stage control flow changes',
      },
      {
        type: 'command',
        name: 'git-commit-control-flow',
        command: 'git commit -m "Migrated to new control flow syntax" || true',
        description: 'Commit control flow migration',
      },
    ],
    validations: [],
  },

  {
    id: 'upgrade-v18',
    title: 'Upgrade to Angular 18',
    description: 'Update Angular from v17 to v18 (Material 3, Zoneless change detection)',
    version: '18',
    requiresConfirmation: true,
    requiresBackup: false,
    retry: {
      maxAttempts: 3,
      delayMs: 2000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      retryableErrors: [
        /ETIMEDOUT/i,
        /ECONNRESET/i,
        /ENOTFOUND/i,
        /fetch failed/i,
        /network.*error/i,
        /registry.*error/i,
      ],
    },
    actions: [
      {
        type: 'tool',
        name: 'update-package-json-v18',
        toolName: 'update_packages',
        toolParams: { targetVersion: '18' },
        description: 'Update package.json to Angular 18 and reinstall dependencies',
        timeout: 600000,
      },
      {
        type: 'command',
        name: 'run-migrations-v18',
        command: 'npx ng update @angular/core@18 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular 18 migration schematics (if any)',
        timeout: 180000,
      },
      {
        type: 'command',
        name: 'run-material-migrations-v18',
        command: 'npx ng update @angular/material@18 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular Material 18 migration schematics (Material 3 theming updates)',
        timeout: 180000,
      },
    ],
    rollbackActions: [
      {
        type: 'script',
        name: 'restore-backup',
        scriptPath: './scripts/restore-backup.sh',
        description: 'Restore from backup',
      },
    ],
    validations: [
      {
        type: 'build',
        name: 'build-v18',
        command: 'npm run build',
        failOnError: false,
        description: 'Verify build after v18 upgrade',
        autoFixOnError: true,
      },
    ],
  },

  {
    id: 'git-commit-v18',
    title: 'Git Commit - Angular 18',
    description: 'Commit Angular 18 upgrade',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'git-add-v18',
        command: 'git add -A',
        description: 'Stage Angular 18 changes',
      },
      {
        type: 'command',
        name: 'git-commit-v18',
        command: 'git commit -m "Upgraded to Angular 18" || true',
        description: 'Commit Angular 18 upgrade',
      },
    ],
    validations: [],
  },

  {
    id: 'upgrade-v19',
    title: 'Upgrade to Angular 19',
    description: 'Update Angular from v18 to v19 (AG-Grid v32, Signals stable, Package compatibility)',
    version: '19',
    requiresConfirmation: true,
    requiresBackup: false,
    retry: {
      maxAttempts: 3,
      delayMs: 2000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      retryableErrors: [
        /ETIMEDOUT/i,
        /ECONNRESET/i,
        /ENOTFOUND/i,
        /fetch failed/i,
        /network.*error/i,
        /registry.*error/i,
      ],
    },
    actions: [
      {
        type: 'tool',
        name: 'update-package-json-v19',
        toolName: 'update_packages',
        toolParams: { targetVersion: '19' },
        description: 'Update package.json to Angular 19 and reinstall dependencies',
        timeout: 600000,
      },
      {
        type: 'tool',
        name: 'fix-breaking-changes-v19',
        toolName: 'fix_breaking_changes',
        toolParams: { version: '19' },
        description: 'Fix Angular 19 breaking changes (AG-Grid v32 row selection, package compatibility warnings)',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'run-migrations-v19',
        command: 'npx ng update @angular/core@19 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular 19 migration schematics (if any)',
        timeout: 180000,
      },
      {
        type: 'command',
        name: 'run-material-migrations-v19',
        command: 'npx ng update @angular/material@19 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular Material 19 migration schematics (API updates and deprecation fixes)',
        timeout: 180000,
      },
    ],
    rollbackActions: [
      {
        type: 'script',
        name: 'restore-backup',
        scriptPath: './scripts/restore-backup.sh',
        description: 'Restore from backup',
      },
    ],
    validations: [
      {
        type: 'build',
        name: 'build-v19',
        command: 'npm run build',
        failOnError: false,
        description: 'Verify build after v19 upgrade',
        autoFixOnError: true,
      },
    ],
  },

  {
    id: 'git-commit-v19',
    title: 'Git Commit - Angular 19',
    description: 'Commit Angular 19 upgrade',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'git-add-v19',
        command: 'git add -A',
        description: 'Stage Angular 19 changes',
      },
      {
        type: 'command',
        name: 'git-commit-v19',
        command: 'git commit -m "Upgraded to Angular 19" || true',
        description: 'Commit Angular 19 upgrade',
      },
    ],
    validations: [],
  },

  {
    id: 'upgrade-v20',
    title: 'Upgrade to Angular 20',
    description: 'Update Angular from v19 to v20 (Highcharts v12, Zoneless ready, Material 3, Final target)',
    version: '20',
    requiresConfirmation: true,
    requiresBackup: false,
    retry: {
      maxAttempts: 3,
      delayMs: 2000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
      retryableErrors: [
        /ETIMEDOUT/i,
        /ECONNRESET/i,
        /ENOTFOUND/i,
        /fetch failed/i,
        /network.*error/i,
        /registry.*error/i,
      ],
    },
    actions: [
      {
        type: 'tool',
        name: 'update-package-json-v20',
        toolName: 'update_packages',
        toolParams: { targetVersion: '20' },
        description: 'Update package.json to Angular 20 and reinstall dependencies',
        timeout: 600000,
      },
      {
        type: 'tool',
        name: 'fix-breaking-changes-v20',
        toolName: 'fix_breaking_changes',
        toolParams: { version: '20' },
        description: 'Fix Angular 20 breaking changes (Highcharts v12, deprecated package replacements, zoneless readiness)',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'run-migrations-v20',
        command: 'npx ng update @angular/core@20 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular 20 migration schematics (if any)',
        timeout: 180000,
      },
      {
        type: 'command',
        name: 'run-material-migrations-v20',
        command: 'npx ng update @angular/material@20 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular Material 20 migration schematics (latest Material updates and API refinements)',
        timeout: 180000,
      },
    ],
    rollbackActions: [
      {
        type: 'script',
        name: 'restore-backup',
        scriptPath: './scripts/restore-backup.sh',
        description: 'Restore from backup',
      },
    ],
    validations: [
      {
        type: 'build',
        name: 'build-v20',
        command: 'npm run build',
        failOnError: false,
        description: 'Verify build after v20 upgrade',
        autoFixOnError: true,
      },
      {
        type: 'lint',
        name: 'lint-v20',
        command: 'npm run lint',
        failOnError: false,
        description: 'Final lint check',
        autoFixOnError: true,
      },
      {
        type: 'test',
        name: 'test-v20',
        command: 'npm test -- --watch=false',
        failOnError: false,
        description: 'Verify final tests pass',
        autoFixOnError: true,
      },
    ],
  },

  {
    id: 'git-commit-v20',
    title: 'Git Commit - Angular 20',
    description: 'Commit Angular 20 upgrade (Final)',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'git-add-v20',
        command: 'git add -A',
        description: 'Stage Angular 20 changes',
      },
      {
        type: 'command',
        name: 'git-commit-v20',
        command: 'git commit -m "Upgraded to Angular 20 - Migration Complete!" || true',
        description: 'Commit final Angular 20 upgrade',
      },
    ],
    validations: [],
  },

  {
    id: 'post-migration-report',
    title: 'Generate Migration Report',
    description: 'Create comprehensive migration summary',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'script',
        name: 'generate-report',
        scriptPath: './scripts/generate-report.sh',
        description: 'Generate detailed migration report',
      },
    ],
    validations: [],
  },
];

export class WorkflowEngine {
  private state: WorkflowState;
  private stateManager?: StateManager;

  constructor(
    private workflow: WorkflowStep[],
    private context: WorkflowContext,
    stateManager?: StateManager
  ) {
    this.stateManager = stateManager;
    this.state = {
      currentStepIndex: 0,
      currentActionIndex: 0,
      completedSteps: [],
      completedActions: new Map(),
      failedSteps: [],
      lastValidationResults: new Map(),
      retryAttempts: new Map(),
    };
  }

  getState(): WorkflowState {
    return { ...this.state };
  }

  getContext(): WorkflowContext {
    return this.context;
  }

  /**
   * Set progress callback for streaming updates
   * @param callback - Function to call with progress updates
   */
  setProgressCallback(callback?: ProgressCallback): void {
    this.context.progressCallback = callback;
  }

  /**
   * Get current progress callback
   * @returns Current progress callback or undefined
   */
  getProgressCallback(): ProgressCallback | undefined {
    return this.context.progressCallback;
  }

  getCurrentStep(): WorkflowStep | null {
    if (this.state.currentStepIndex >= this.workflow.length) {
      return null;
    }
    return this.workflow[this.state.currentStepIndex];
  }

  getNextStep(): WorkflowStep | null {
    const nextIndex = this.state.currentStepIndex + 1;
    if (nextIndex >= this.workflow.length) {
      return null;
    }
    return this.workflow[nextIndex];
  }

  getPlan(): Plan {
    const entries: PlanEntry[] = this.workflow.map((step, index) => {
      let status: PlanEntry['status'];
      
      if (this.state.failedSteps.includes(step.id)) {
        // Use 'pending' for failed steps since 'failed' is not in PlanEntryStatus
        status = 'pending';
      } else if (this.state.completedSteps.includes(step.id)) {
        status = 'completed';
      } else if (index === this.state.currentStepIndex) {
        status = 'in_progress';
      } else {
        status = 'pending';
      }

      return {
        id: step.id,
        title: `${step.version ? `v${step.version}: ` : ''}${step.title}`,
        priority: step.requiresConfirmation ? 'high' : 'medium',
        status,
      };
    });

    return { entries };
  }

  needsConfirmation(): boolean {
    const currentStep = this.getCurrentStep();
    return currentStep?.requiresConfirmation ?? false;
  }

  getConfirmationMessage(): string | null {
    const currentStep = this.getCurrentStep();
    if (!currentStep || !currentStep.requiresConfirmation) {
      return null;
    }

    const actions = currentStep.actions.map(a => `  - ${a.description}`).join('\n');
    const validations = currentStep.validations.map(v => `  - ${v.description}`).join('\n');

    return `## Confirmation Required: ${currentStep.title}

${currentStep.description}

**Actions to be performed:**
${actions}

**Validations:**
${validations}

${currentStep.rollbackActions ? '⚠️ **Rollback available** if this step fails\n' : ''}
**Proceed with this step?** (yes/no)`;
  }

  confirmStep(): void {
    this.state.pendingConfirmation = undefined;
  }

  async advanceToNextStep(): Promise<void> {
    const currentStep = this.getCurrentStep();
    if (currentStep) {
      this.state.completedSteps.push(currentStep.id);
    }
    this.state.currentStepIndex++;
    this.state.currentActionIndex = 0; // Reset action index for new step

    // Auto-save checkpoint after advancing
    if (this.stateManager) {
      try {
        await this.stateManager.saveCheckpoint(
          this.context.sessionId,
          this.state,
          this.context
        );
      } catch (error) {
        // Log error but don't fail the workflow
        process.stderr.write(
          `[WorkflowEngine] ⚠️ Failed to save checkpoint: ${error}\n`
        );
      }
    }
  }

  markStepFailed(stepId: string): void {
    if (!this.state.failedSteps.includes(stepId)) {
      this.state.failedSteps.push(stepId);
    }
  }

  /**
   * Check if a step can be rolled back
   */
  canRollback(stepId?: string): boolean {
    const targetStepId = stepId || this.getCurrentStep()?.id;
    if (!targetStepId) {
      return false;
    }

    const step = this.workflow.find((s) => s.id === targetStepId);
    return !!(step && step.rollbackActions && step.rollbackActions.length > 0);
  }

  /**
   * Get rollback actions for a step
   */
  getRollbackActions(stepId?: string): WorkflowAction[] | null {
    const targetStepId = stepId || this.getCurrentStep()?.id;
    if (!targetStepId) {
      return null;
    }

    const step = this.workflow.find((s) => s.id === targetStepId);
    return step?.rollbackActions || null;
  }

  setBackupPath(path: string): void {
    this.state.backupPath = path;
  }

  recordValidationResult(validationName: string, result: ValidationResult): void {
    this.state.lastValidationResults.set(validationName, result);
  }

  /**
   * Increment retry attempt counter for a step
   * Returns the new retry count
   */
  incrementRetryAttempt(stepId: string): number {
    const currentCount = this.state.retryAttempts.get(stepId) || 0;
    const newCount = currentCount + 1;
    this.state.retryAttempts.set(stepId, newCount);
    return newCount;
  }

  /**
   * Get retry attempt count for a step
   */
  getRetryAttempt(stepId: string): number {
    return this.state.retryAttempts.get(stepId) || 0;
  }

  /**
   * Reset retry attempt counter for a step
   */
  resetRetryAttempt(stepId: string): void {
    this.state.retryAttempts.delete(stepId);
  }

  /**
   * Mark an action as completed for a specific step
   */
  markActionCompleted(stepId: string, actionName: string): void {
    const completedActions = this.state.completedActions.get(stepId) || [];
    if (!completedActions.includes(actionName)) {
      completedActions.push(actionName);
      this.state.completedActions.set(stepId, completedActions);
    }
    // Increment action index for current step
    if (this.getCurrentStep()?.id === stepId) {
      this.state.currentActionIndex++;
    }
  }

  /**
   * Check if an action is already completed for a specific step
   */
  isActionCompleted(stepId: string, actionName: string): boolean {
    const completedActions = this.state.completedActions.get(stepId) || [];
    return completedActions.includes(actionName);
  }

  /**
   * Get current action index within the current step
   */
  getCurrentActionIndex(): number {
    return this.state.currentActionIndex;
  }

  /**
   * Reset action progress for a step (when retrying or restarting)
   */
  resetActionProgress(stepId: string): void {
    this.state.completedActions.delete(stepId);
    if (this.getCurrentStep()?.id === stepId) {
      this.state.currentActionIndex = 0;
    }
  }

  isComplete(): boolean {
    return this.state.currentStepIndex >= this.workflow.length;
  }

  getProgress(): { current: number; total: number; percentage: number } {
    const total = this.workflow.length;
    const current = this.state.completedSteps.length;
    const percentage = Math.round((current / total) * 100);
    return { current, total, percentage };
  }

  /**
   * Skip to a specific step by ID or index
   * Useful for resuming an interrupted migration
   */
  skipToStep(stepIdOrIndex: string | number): boolean {
    let targetIndex: number;

    if (typeof stepIdOrIndex === 'number') {
      targetIndex = stepIdOrIndex;
    } else {
      targetIndex = this.workflow.findIndex(step => step.id === stepIdOrIndex);
    }

    if (targetIndex < 0 || targetIndex >= this.workflow.length) {
      return false;
    }

    // Mark all previous steps as completed
    this.state.completedSteps = this.workflow
      .slice(0, targetIndex)
      .map(step => step.id);
    
    this.state.currentStepIndex = targetIndex;
    return true;
  }

  /**
   * Get list of all steps for resume menu
   */
  getAllSteps(): Array<{ id: string; title: string; index: number }> {
    return this.workflow.map((step, index) => ({
      id: step.id,
      title: step.title,
      index,
    }));
  }

  /**
   * Factory method to restore WorkflowEngine from checkpoint
   */
  static async fromCheckpoint(
    sessionId: SessionId,
    stateManager?: StateManager
  ): Promise<WorkflowEngine | null> {
    const manager = stateManager || new StateManager();

    try {
      const checkpoint = await manager.loadCheckpoint(sessionId);

      if (!checkpoint) {
        return null; // No checkpoint found
      }

      // Deserialize state and context
      const { state, context } = StateManager.deserializeState(checkpoint);

      // Create engine with restored state
      const engine = new WorkflowEngine(ANGULAR_MIGRATION_WORKFLOW, context, manager);
      engine.state = state;

      process.stderr.write(
        `[WorkflowEngine] ✅ Restored from checkpoint: step ${state.currentStepIndex}/${ANGULAR_MIGRATION_WORKFLOW.length}\n`
      );

      return engine;
    } catch (error) {
      process.stderr.write(
        `[WorkflowEngine] ❌ Failed to restore from checkpoint: ${error}\n`
      );
      return null;
    }
  }

  // ========================================
  // Stage-Aware Methods (8 methods)
  // ========================================

  /**
   * Get the current stage based on current step index
   * @returns The current stage definition or null if no current step
   */
  getCurrentStage(): StageDefinition | null {
    return getStageByStepIndex(this.state.currentStepIndex) || null;
  }

  /**
   * Get a stage definition by ID
   * @param stageId - The stage identifier
   * @returns The stage definition or null if not found
   */
  getStageById(stageId: string): StageDefinition | null {
    return getStageDefinitionById(stageId) || null;
  }

  /**
   * Get all workflow steps for a specific stage
   * @param stageId - The stage identifier
   * @returns Array of workflow steps in the stage
   */
  getStageSteps(stageId: string): WorkflowStep[] {
    const stage = this.getStageById(stageId);
    if (!stage) {
      return [];
    }

    const [startIndex, endIndex] = stage.stepRange;
    return this.workflow.slice(startIndex, endIndex + 1);
  }

  /**
   * Skip to the start of a specific stage
   * @param stageId - The stage identifier
   * @returns True if successfully skipped to stage
   */
  skipToStage(stageId: string): boolean {
    const stage = this.getStageById(stageId);
    if (!stage) {
      return false;
    }

    const [startIndex] = stage.stepRange;
    return this.skipToStep(startIndex);
  }

  /**
   * Get progress information for a specific stage
   * @param stageId - The stage identifier
   * @returns Stage progress information
   */
  getStageProgress(stageId: string): StageProgress | null {
    const stage = this.getStageById(stageId);
    if (!stage) {
      return null;
    }

    const [startIndex, endIndex] = stage.stepRange;
    const stageSteps = this.workflow.slice(startIndex, endIndex + 1);
    const stepsTotal = stageSteps.length;

    // Count how many steps in this stage are completed
    const stepsCompleted = stageSteps.filter((step) =>
      this.state.completedSteps.includes(step.id)
    ).length;

    const percentage = stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0;

    const status = this.getStageStatus(stageId);

    return {
      stageId,
      stepsCompleted,
      stepsTotal,
      percentage,
      status,
    };
  }

  /**
   * Get the status of a specific stage
   * @param stageId - The stage identifier
   * @returns Stage status: 'pending', 'in_progress', 'completed', or 'failed'
   */
  getStageStatus(
    stageId: string
  ): 'pending' | 'in_progress' | 'completed' | 'failed' {
    const stage = this.getStageById(stageId);
    if (!stage) {
      return 'pending';
    }

    const [startIndex, endIndex] = stage.stepRange;
    const stageSteps = this.workflow.slice(startIndex, endIndex + 1);

    // Check if any step in this stage failed
    const hasFailed = stageSteps.some((step) =>
      this.state.failedSteps.includes(step.id)
    );
    if (hasFailed) {
      return 'failed';
    }

    // Check if all steps in this stage are completed
    const allCompleted = stageSteps.every((step) =>
      this.state.completedSteps.includes(step.id)
    );
    if (allCompleted) {
      return 'completed';
    }

    // Check if current step is within this stage
    if (
      this.state.currentStepIndex >= startIndex &&
      this.state.currentStepIndex <= endIndex
    ) {
      return 'in_progress';
    }

    // Otherwise it's pending
    return 'pending';
  }

  /**
   * Execute a single workflow step (extracted for reuse by executeStage)
   * @param step - The workflow step to execute
   * @param options - Execution options
   * @returns Step execution result
   */
  async executeStep(
    step: WorkflowStep,
    options: StageExecutionOptions = {}
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const outputs: string[] = [];

    try {
      // Inform user about manual package cleaning requirement (if it's an upgrade step)
      if (step.id.startsWith('upgrade-v') && !options.skipPackageClean) {
        outputs.push(
          '⚠️  Package cleaning required - this will be handled in manual installation steps',
          '📝 The package.json will be updated, and you will receive manual installation instructions'
        );
      }

      // Get already completed actions for this step
      const completedActions = this.state.completedActions.get(step.id) || [];

      // Execute each action in the step
      for (const action of step.actions) {
        // Skip already completed actions (for resumption)
        if (completedActions.includes(action.name)) {
          outputs.push(`⏭️  Skipping already completed action: ${action.name}`);
          continue;
        }

        outputs.push(`\n▶️  Executing: ${action.description}`);

        const actionResult = await this.executeAction(action, step, options);

        if (actionResult.output) {
          outputs.push(actionResult.output);
        }

        if (!actionResult.success) {
          if (action.continueOnError) {
            outputs.push(`⚠️  Action failed but continuing: ${actionResult.error}`);
          } else {
            throw new Error(`Action '${action.name}' failed: ${actionResult.error}`);
          }
        } else {
          outputs.push(`✅ ${action.name} completed`);

          // Mark action as completed
          if (!this.state.completedActions.has(step.id)) {
            this.state.completedActions.set(step.id, []);
          }
          this.state.completedActions.get(step.id)!.push(action.name);
        }
      }

      const duration = Date.now() - startTime;

      return {
        stepId: step.id,
        success: true,
        output: outputs.join('\n'),
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        stepId: step.id,
        success: false,
        error: errorMessage,
        output: outputs.join('\n'),
        duration,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute a single action
   * @param action - The action to execute
   * @param step - The parent workflow step
   * @param options - Execution options
   * @returns Action execution result
   */
  private async executeAction(
    action: WorkflowAction,
    step: WorkflowStep,
    options: StageExecutionOptions = {}
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      switch (action.type) {
        case 'command':
          return await this.executeCommandAction(action);

        case 'schematic':
          return await this.executeSchematicAction(action);

        case 'script':
          return await this.executeScriptAction(action);

        case 'tool':
          return await this.executeToolAction(action, step);

        case 'auto-fix':
          return await this.executeAutoFixAction(action, step);

        case 'manual':
          return this.executeManualAction(action);

        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse progress message to extract meaningful information
   */
  private parseProgressMessage(chunk: string, commandStr: string): string {
    // Trim whitespace
    const trimmed = chunk.trim();
    if (!trimmed) return '';

    // For npm install, extract meaningful progress indicators
    if (commandStr.includes('npm install') || commandStr.includes('npm i ')) {
      // Parse npm progress indicators like "added 123 packages" or "⸨████████████⸩ ⠹ reify:..."
      if (trimmed.includes('added') && trimmed.includes('package')) {
        return `📦 ${trimmed}`;
      }
      if (trimmed.includes('removed') && trimmed.includes('package')) {
        return `🗑️  ${trimmed}`;
      }
      if (trimmed.includes('changed') && trimmed.includes('package')) {
        return `🔄 ${trimmed}`;
      }
      if (trimmed.includes('reify')) {
        return `⚙️  Installing and linking packages...`;
      }
      if (trimmed.includes('idealTree')) {
        return `🌳 Calculating dependency tree...`;
      }
      if (trimmed.includes('fetch')) {
        return `⬇️  Downloading packages...`;
      }
      // Show progress bars but clean them up
      if (trimmed.includes('⸨') || trimmed.includes('░') || trimmed.includes('█')) {
        return `⏳ Installing packages (in progress)...`;
      }
    }

    // For build commands
    if (commandStr.includes('build') || commandStr.includes('ng build')) {
      if (trimmed.includes('Building') || trimmed.includes('Compiling')) {
        return `🔨 ${trimmed}`;
      }
      if (trimmed.includes('✔') || trimmed.includes('successfully')) {
        return `✅ ${trimmed}`;
      }
    }

    // For git commands
    if (commandStr.includes('git')) {
      return `📝 ${trimmed}`;
    }

    // For Angular CLI commands
    if (commandStr.includes('ng update') || commandStr.includes('ng migrate')) {
      return `🔄 ${trimmed}`;
    }

    // Default: return as-is but limit length
    return trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
  }

  /**
   * Execute a command action (shell command)
   */
  /**
   * Execute a command with streaming output support
   * Uses spawn for long-running commands to provide progress updates
   */
  private async executeCommandActionStreaming(
    action: WorkflowAction
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!action.command) {
      throw new Error('Command action requires a command');
    }

    const commandStr = action.command; // Type narrowing - we know it's not undefined after the check

    return new Promise((resolve, reject) => {
      const platform = getPlatform();
      const command = getShellCommand(commandStr, platform);
      const workingDir = action.workingDir || this.context.projectPath;
      const timeout = action.timeout || 600000; // Default 10 minutes for streaming commands

      // Parse command into shell and args
      const isWindows = platform === 'windows';
      const shell = isWindows ? 'powershell.exe' : '/bin/bash';
      const shellArgs = isWindows ? ['-Command', command] : ['-c', command];

      const child = spawn(shell, shellArgs, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let lastProgressUpdate = Date.now();

      // Use shorter interval for npm install (more frequent updates)
      const isNpmInstall = commandStr.includes('npm install') || commandStr.includes('npm i ');
      const progressInterval = isNpmInstall ? 500 : 2000; // 500ms for npm, 2s for others

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      // Stream stdout with progress updates
      child.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;

        // Send progress update if callback exists and interval elapsed
        if (this.context.progressCallback && Date.now() - lastProgressUpdate > progressInterval) {
          const message = this.parseProgressMessage(chunk, commandStr);
          this.context.progressCallback({
            message,
            type: 'info',
            timestamp: new Date().toISOString(),
          });
          lastProgressUpdate = Date.now();
        }
      });

      // Stream stderr with progress updates
      child.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;

        // npm writes progress to stderr, so treat it as info
        if (this.context.progressCallback && Date.now() - lastProgressUpdate > progressInterval) {
          const message = this.parseProgressMessage(chunk, commandStr);
          this.context.progressCallback({
            message,
            type: 'info',
            timestamp: new Date().toISOString(),
          });
          lastProgressUpdate = Date.now();
        }
      });

      // Handle process completion
      child.on('close', (code) => {
        clearTimeout(timeoutHandle);

        // Check if this is an acceptable "error" (e.g., git commit with no changes)
        if (code !== 0 && !commandStr.includes('|| true') && !commandStr.includes('git commit')) {
          resolve({
            success: false,
            error: stderr || `Command exited with code ${code}`,
            output: stdout,
          });
        } else {
          resolve({
            success: true,
            output: stdout.trim() || stderr.trim() || 'Command completed (no output)',
          });
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  private async executeCommandAction(
    action: WorkflowAction
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!action.command) {
      throw new Error('Command action requires a command');
    }

    // Use streaming execution if progress callback is set
    if (this.context.progressCallback) {
      return this.executeCommandActionStreaming(action);
    }

    try {
      const platform = getPlatform();
      const command = getShellCommand(action.command, platform);
      const workingDir = action.workingDir || this.context.projectPath;

      const output = execSync(command, {
        cwd: workingDir,
        encoding: 'utf8',
        timeout: action.timeout || 120000, // Default 2 minutes
        stdio: 'pipe',
      });

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error: any) {
      // execSync throws on non-zero exit, but that's not always an error
      // (e.g., "git commit" returns 1 if nothing to commit)
      const output = error.stdout ? error.stdout.toString() : '';
      const stderr = error.stderr ? error.stderr.toString() : '';

      // Check if this is an acceptable "error" (e.g., git commit with no changes)
      if (action.command?.includes('|| true') || action.command?.includes('git commit')) {
        return {
          success: true,
          output: output || stderr || 'Command completed (no output)',
        };
      }

      return {
        success: false,
        error: stderr || error.message,
        output,
      };
    }
  }

  /**
   * Execute a schematic action (Angular CLI schematic)
   */
  private async executeSchematicAction(
    action: WorkflowAction
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!action.command) {
      throw new Error('Schematic action requires a command');
    }

    try {
      const platform = getPlatform();
      const command = getShellCommand(action.command, platform);

      const output = execSync(command, {
        cwd: this.context.projectPath,
        encoding: 'utf8',
        timeout: action.timeout || 300000, // Default 5 minutes for schematics
        stdio: 'pipe',
      });

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error: any) {
      const stderr = error.stderr ? error.stderr.toString() : '';
      const stdout = error.stdout ? error.stdout.toString() : '';

      return {
        success: false,
        error: stderr || error.message,
        output: stdout,
      };
    }
  }

  /**
   * Execute a script action (shell script file)
   */
  private async executeScriptAction(
    action: WorkflowAction
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!action.scriptPath) {
      throw new Error('Script action requires a scriptPath');
    }

    try {
      const platform = getPlatform();
      const scriptCommand = platform === 'windows'
        ? `powershell -ExecutionPolicy Bypass -File "${action.scriptPath}"`
        : `bash "${action.scriptPath}"`;

      const args = action.args ? ' ' + action.args.join(' ') : '';
      const fullCommand = scriptCommand + args;

      const output = execSync(fullCommand, {
        cwd: action.workingDir || this.context.projectPath,
        encoding: 'utf8',
        timeout: action.timeout || 300000, // Default 5 minutes
        stdio: 'pipe',
      });

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error: any) {
      const stderr = error.stderr ? error.stderr.toString() : '';
      const stdout = error.stdout ? error.stdout.toString() : '';

      return {
        success: false,
        error: stderr || error.message,
        output: stdout,
      };
    }
  }

  /**
   * Execute a tool action (call internal utility function)
   */
  private async executeToolAction(
    action: WorkflowAction,
    step: WorkflowStep
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!action.toolName) {
      throw new Error('Tool action requires a toolName');
    }

    const toolParams = action.toolParams || {};

    try {
      switch (action.toolName) {
        case 'update_packages': {
          const targetVersion = toolParams.targetVersion || step.version;
          if (!targetVersion) {
            throw new Error('update_packages requires targetVersion parameter or step version');
          }

          const result = await updatePackages({
            projectPath: this.context.projectPath,
            targetVersion,
            createBackup: false, // Already handled by workflow
            dryRun: false,
            progressCallback: this.context.progressCallback, // Pass progress callback for streaming
          });

          if (!result.success) {
            return {
              success: false,
              error: result.error || result.message,
            };
          }

          // Return the full message from updatePackages which includes install status
          return {
            success: true,
            output: result.message,
          };
        }

        case 'fix_standalone_issues':
        case 'fix_breaking_changes': {
          const version = step.version || toolParams.version;
          if (!version) {
            throw new Error('Breaking changes fix requires version parameter or step version');
          }

          const result = await applyBreakingChangeFixes(
            this.context.projectPath,
            version
          );

          if (!result.success) {
            return {
              success: false,
              error: result.errors.join('\n'),
            };
          }

          let output = result.message;
          if (result.changes.length > 0) {
            output += `\n\nChanges:\n${result.changes.map((c) => `  - ${c}`).join('\n')}`;
          }
          if (result.warnings.length > 0) {
            output += `\n\nWarnings:\n${result.warnings.map((w) => `  ⚠️  ${w}`).join('\n')}`;
          }

          return {
            success: true,
            output,
          };
        }

        default:
          throw new Error(`Unknown tool: ${action.toolName}`);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute an auto-fix action (automatic error fixing)
   */
  private async executeAutoFixAction(
    action: WorkflowAction,
    step: WorkflowStep
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    // Auto-fix is handled by LLM-fixer or pattern-fixer tools
    // For now, we'll return success (the actual fixing happens in MCP tool handlers)
    return {
      success: true,
      output: `Auto-fix action ${action.name} will be handled by error detection system`,
    };
  }

  /**
   * Execute a manual action (requires user intervention)
   */
  private executeManualAction(
    action: WorkflowAction
  ): { success: boolean; output?: string; error?: string } {
    // Manual actions are just informational
    return {
      success: true,
      output: `Manual action: ${action.description}\nPlease complete this step manually and confirm.`,
    };
  }

  /**
   * Execute all steps in a migration stage
   * @param stageId - The stage identifier
   * @param options - Stage execution options
   * @returns Stage execution result with all step results
   */
  async executeStage(
    stageId: string,
    options: StageExecutionOptions = {}
  ): Promise<StageExecutionResult> {
    const stage = this.getStageById(stageId);
    const progressCallback = options.progressCallback;

    if (!stage) {
      return {
        success: false,
        stage: stageId,
        results: [],
        error: `Stage not found: ${stageId}`,
      };
    }

    // Set progress callback on context so command actions can use it for streaming
    const previousCallback = this.context.progressCallback;
    if (progressCallback) {
      this.context.progressCallback = progressCallback;
    }

    const stageSteps = this.getStageSteps(stageId);
    const results: StepExecutionResult[] = [];
    let failedStep: string | undefined;

    // Report stage start
    if (progressCallback) {
      progressCallback({
        message: `Starting stage: ${stage.name}`,
        type: 'stage',
        totalSteps: stageSteps.length,
        completedSteps: 0,
        progress: 0,
        timestamp: new Date().toISOString(),
        metadata: { stageId, stageName: stage.name },
      });
    }

    // Execute each step in the stage
    for (let i = 0; i < stageSteps.length; i++) {
      const step = stageSteps[i];

      // Check if step requires confirmation
      if (step.requiresConfirmation && !options.autoConfirm) {
        return {
          success: true,
          stage: stageId,
          requiresConfirmation: true,
          confirmationMessage: this.getConfirmationMessage() || undefined,
          results,
        };
      }

      // Report step start
      if (progressCallback) {
        progressCallback({
          message: `Executing: ${step.title}`,
          type: 'action',
          currentStep: step.id,
          totalSteps: stageSteps.length,
          completedSteps: i,
          progress: Math.round((i / stageSteps.length) * 100),
          timestamp: new Date().toISOString(),
          metadata: { stepId: step.id, stepTitle: step.title },
        });
      }

      // Execute the step
      const stepResult = await this.executeStep(step, options);
      results.push(stepResult);

      if (!stepResult.success) {
        failedStep = step.id;
        this.markStepFailed(step.id);

        // Report step failure
        if (progressCallback) {
          progressCallback({
            message: `Step failed: ${step.title}`,
            type: 'error',
            currentStep: step.id,
            totalSteps: stageSteps.length,
            completedSteps: i,
            progress: Math.round((i / stageSteps.length) * 100),
            timestamp: new Date().toISOString(),
            metadata: { stepId: step.id, error: stepResult.error },
          });
        }

        if (!options.continueOnError) {
          break;
        }
      } else {
        // Advance to next step (marks completed and increments currentStepIndex)
        await this.advanceToNextStep();

        // Report step success
        if (progressCallback) {
          progressCallback({
            message: `Completed: ${step.title}`,
            type: 'success',
            currentStep: step.id,
            totalSteps: stageSteps.length,
            completedSteps: i + 1,
            progress: Math.round(((i + 1) / stageSteps.length) * 100),
            timestamp: new Date().toISOString(),
            metadata: { stepId: step.id },
          });
        }
      }
    }

    const success = !failedStep;

    // Report stage completion
    if (progressCallback) {
      progressCallback({
        message: success ? `Stage completed: ${stage.name}` : `Stage failed: ${stage.name}`,
        type: success ? 'success' : 'error',
        totalSteps: stageSteps.length,
        completedSteps: results.filter(r => r.success).length,
        progress: 100,
        timestamp: new Date().toISOString(),
        metadata: { stageId, success, failedStep },
      });
    }

    // Restore previous progress callback
    this.context.progressCallback = previousCallback;

    return {
      success,
      stage: stageId,
      results,
      failedStep,
      error: failedStep ? `Step ${failedStep} failed` : undefined,
    };
  }
}

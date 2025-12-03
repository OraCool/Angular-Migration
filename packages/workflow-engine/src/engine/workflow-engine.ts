/**
 * Workflow Engine for Step-by-Step Angular Migration
 * Handles sequential upgrades with user confirmation and rollback support
 */

import type { SessionId, Plan, PlanEntry } from '../types/index.js';
import { StateManager } from './state-manager.js';

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
        description: 'Update ALL packages (Angular, Material, TypeScript, ag-grid, etc.) to v15 compatible versions',
        timeout: 600000, // 10 minutes for npm install
      },
      {
        type: 'command',
        name: 'run-migrations-v15',
        command: 'npx ng update @angular/core@15 --migrate-only --allow-dirty --force || true',
        description: 'Run Angular 15 migration schematics (if any)',
        timeout: 180000,
      },
      {
        type: 'auto-fix',
        name: 'fix-polyfills-v15',
        errorPattern: 'polyfills',
        description: 'Auto-fix polyfills configuration if needed',
        continueOnError: true,
      },
      {
        type: 'auto-fix',
        name: 'fix-test-specs-v15',
        errorPattern: 'Expected.*arguments.*but got 0',
        description: 'Auto-fix test spec constructor calls',
        continueOnError: true,
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
}

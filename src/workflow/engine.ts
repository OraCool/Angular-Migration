/**
 * Workflow Engine for Step-by-Step Angular Migration
 * Handles sequential upgrades with user confirmation and rollback support
 */

import type { SessionId, Plan, PlanEntry } from '../types/acp.js';

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
}

export interface WorkflowAction {
  type: 'script' | 'command' | 'schematic' | 'manual' | 'auto-fix';
  name: string;
  command?: string;
  scriptPath?: string;
  args?: string[];
  workingDir?: string;
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
  completedSteps: string[];
  failedSteps: string[];
  backupPath?: string;
  pendingConfirmation?: {
    stepId: string;
    message: string;
  };
  lastValidationResults: Map<string, ValidationResult>;
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
    actions: [
      {
        type: 'command',
        name: 'ng-update-v15',
        command: 'ng update @angular/core@15 @angular/cli@15 @angular/material@15 --allow-dirty --force',
        description: 'Update Angular and Material to version 15 (combined to avoid migration issues)',
        timeout: 300000, // 5 minutes
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
    actions: [
      {
        type: 'command',
        name: 'ng-update-v16',
        command: 'ng update @angular/core@16 @angular/cli@16 --allow-dirty --force',
        description: 'Update Angular to version 16',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v16',
        command: 'ng update @angular/material@16 --allow-dirty --force',
        description: 'Update Angular Material to version 16',
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
    description: 'Update Angular from v16 to v17 (New Control Flow syntax)',
    version: '17',
    requiresConfirmation: true,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'ng-update-v17',
        command: 'ng update @angular/core@17 @angular/cli@17 --allow-dirty --force',
        description: 'Update Angular to version 17',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v17',
        command: 'ng update @angular/material@17 --allow-dirty --force',
        description: 'Update Angular Material to version 17',
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
    actions: [
      {
        type: 'command',
        name: 'ng-update-v18',
        command: 'ng update @angular/core@18 @angular/cli@18 --allow-dirty --force',
        description: 'Update Angular to version 18',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v18',
        command: 'ng update @angular/material@18 --allow-dirty --force',
        description: 'Update Angular Material to version 18 (Material 3)',
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
    description: 'Update Angular from v18 to v19',
    version: '19',
    requiresConfirmation: true,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'ng-update-v19',
        command: 'ng update @angular/core@19 @angular/cli@19 --allow-dirty --force',
        description: 'Update Angular to version 19',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v19',
        command: 'ng update @angular/material@19 --allow-dirty --force',
        description: 'Update Angular Material to version 19',
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
    description: 'Update Angular from v19 to v20 (Final target version)',
    version: '20',
    requiresConfirmation: true,
    requiresBackup: false,
    actions: [
      {
        type: 'command',
        name: 'ng-update-v20',
        command: 'ng update @angular/core@20 @angular/cli@20 --allow-dirty --force',
        description: 'Update Angular to version 20',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v20',
        command: 'ng update @angular/material@20 --allow-dirty --force',
        description: 'Update Angular Material to version 20',
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

  constructor(
    private workflow: WorkflowStep[],
    private context: WorkflowContext
  ) {
    this.state = {
      currentStepIndex: 0,
      completedSteps: [],
      failedSteps: [],
      lastValidationResults: new Map(),
    };
  }

  getState(): WorkflowState {
    return { ...this.state };
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
        content: `${step.version ? `v${step.version}: ` : ''}${step.title}`,
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
  }

  markStepFailed(stepId: string): void {
    this.state.failedSteps.push(stepId);
  }

  setBackupPath(path: string): void {
    this.state.backupPath = path;
  }

  recordValidationResult(validationName: string, result: ValidationResult): void {
    this.state.lastValidationResults.set(validationName, result);
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
}

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
  requiresConfirmation: boolean;
  requiresBackup: boolean;
  actions: WorkflowAction[];
  rollbackActions?: WorkflowAction[];
  validations: WorkflowValidation[];
}

export interface WorkflowAction {
  type: 'script' | 'command' | 'schematic' | 'manual';
  name: string;
  command?: string;
  scriptPath?: string;
  args?: string[];
  workingDir?: string;
  description: string;
  timeout?: number; // milliseconds
}

export interface WorkflowValidation {
  type: 'build' | 'lint' | 'test' | 'custom';
  name: string;
  command?: string;
  scriptPath?: string;
  failOnError: boolean;
  description: string;
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
    requiresBackup: true,
    actions: [
      {
        type: 'script',
        name: 'create-backup',
        scriptPath: './scripts/backup.sh',
        description: 'Create timestamped backup',
      },
    ],
    validations: [
      {
        type: 'custom',
        name: 'verify-backup',
        scriptPath: './scripts/verify-backup.sh',
        failOnError: true,
        description: 'Verify backup was created successfully',
      },
    ],
  },

  {
    id: 'pre-migration-validation',
    title: 'Pre-Migration Validation',
    description: 'Validate current state before migration',
    requiresConfirmation: false,
    requiresBackup: false,
    actions: [
      {
        type: 'script',
        name: 'install-deps',
        scriptPath: './scripts/install.sh',
        description: 'Install current dependencies',
      },
    ],
    validations: [
      {
        type: 'build',
        name: 'pre-build',
        command: 'npm run build',
        failOnError: true,
        description: 'Ensure project builds before migration',
      },
      {
        type: 'lint',
        name: 'pre-lint',
        command: 'npm run lint',
        failOnError: false,
        description: 'Check linting status',
      },
      {
        type: 'test',
        name: 'pre-test',
        command: 'npm test -- --watch=false',
        failOnError: false,
        description: 'Run tests to establish baseline',
      },
    ],
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
        command: 'ng update @angular/core@15 @angular/cli@15',
        description: 'Update Angular to version 15',
        timeout: 300000, // 5 minutes
      },
      {
        type: 'command',
        name: 'update-material-v15',
        command: 'ng update @angular/material@15',
        description: 'Update Angular Material to version 15',
        timeout: 180000, // 3 minutes
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
        name: 'build-v15',
        command: 'npm run build',
        failOnError: true,
        description: 'Verify build after v15 upgrade',
      },
      {
        type: 'test',
        name: 'test-v15',
        command: 'npm test -- --watch=false',
        failOnError: true,
        description: 'Verify tests pass after v15 upgrade',
      },
    ],
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
        failOnError: true,
        description: 'Verify build after standalone migration',
      },
      {
        type: 'lint',
        name: 'lint-standalone',
        command: 'npm run lint',
        failOnError: false,
        description: 'Check for linting issues',
      },
      {
        type: 'test',
        name: 'test-standalone',
        command: 'npm test -- --watch=false',
        failOnError: true,
        description: 'Verify tests pass after standalone migration',
      },
    ],
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
        command: 'ng update @angular/core@16 @angular/cli@16',
        description: 'Update Angular to version 16',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v16',
        command: 'ng update @angular/material@16',
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
        failOnError: true,
        description: 'Verify build after v16 upgrade',
      },
      {
        type: 'test',
        name: 'test-v16',
        command: 'npm test -- --watch=false',
        failOnError: true,
        description: 'Verify tests pass after v16 upgrade',
      },
    ],
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
        command: 'ng update @angular/core@17 @angular/cli@17',
        description: 'Update Angular to version 17',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v17',
        command: 'ng update @angular/material@17',
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
        failOnError: true,
        description: 'Verify build after v17 upgrade',
      },
      {
        type: 'test',
        name: 'test-v17',
        command: 'npm test -- --watch=false',
        failOnError: true,
        description: 'Verify tests pass after v17 upgrade',
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
        failOnError: true,
        description: 'Verify build after control flow migration',
      },
      {
        type: 'test',
        name: 'test-control-flow',
        command: 'npm test -- --watch=false',
        failOnError: true,
        description: 'Verify tests pass after control flow migration',
      },
    ],
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
        command: 'ng update @angular/core@18 @angular/cli@18',
        description: 'Update Angular to version 18',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v18',
        command: 'ng update @angular/material@18',
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
        failOnError: true,
        description: 'Verify build after v18 upgrade',
      },
      {
        type: 'test',
        name: 'test-v18',
        command: 'npm test -- --watch=false',
        failOnError: true,
        description: 'Verify tests pass after v18 upgrade',
      },
    ],
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
        command: 'ng update @angular/core@19 @angular/cli@19',
        description: 'Update Angular to version 19',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v19',
        command: 'ng update @angular/material@19',
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
        failOnError: true,
        description: 'Verify build after v19 upgrade',
      },
      {
        type: 'test',
        name: 'test-v19',
        command: 'npm test -- --watch=false',
        failOnError: true,
        description: 'Verify tests pass after v19 upgrade',
      },
    ],
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
        command: 'ng update @angular/core@20 @angular/cli@20',
        description: 'Update Angular to version 20',
        timeout: 300000,
      },
      {
        type: 'command',
        name: 'update-material-v20',
        command: 'ng update @angular/material@20',
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
        failOnError: true,
        description: 'Verify build after v20 upgrade',
      },
      {
        type: 'lint',
        name: 'lint-v20',
        command: 'npm run lint',
        failOnError: false,
        description: 'Final lint check',
      },
      {
        type: 'test',
        name: 'test-v20',
        command: 'npm test -- --watch=false',
        failOnError: true,
        description: 'Final test verification',
      },
    ],
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
}

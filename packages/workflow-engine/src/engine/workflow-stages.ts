/**
 * Angular Migration Workflow Stages
 * Defines logical groupings of workflow steps into stages
 * Each stage represents a cohesive unit of migration work (typically one Angular version)
 */

/**
 * Stage definition interface
 * Represents a logical grouping of workflow steps
 */
export interface StageDefinition {
  /** Unique stage identifier (e.g., 'migration_stage_v15') */
  id: string;
  /** Human-readable stage name (e.g., 'Angular 15 Upgrade') */
  name: string;
  /** Detailed description of what this stage accomplishes */
  description: string;
  /** Angular version this stage targets (e.g., '15'), undefined for non-version stages */
  version?: string;
  /** Step range [startIndex, endIndex] inclusive - indexes into ANGULAR_MIGRATION_WORKFLOW */
  stepRange: [number, number];
  /** Whether this stage requires user confirmation */
  requiresConfirmation: boolean;
  /** Number of confirmation prompts in this stage (if requiresConfirmation is true) */
  confirmationCount?: number;
  /** Estimated time to complete this stage */
  estimatedDuration: string;
  /** IDs of stages that must be completed before this stage can run */
  dependencies?: string[];
  /** Whether this stage is optional (can be skipped or run later) */
  optional?: boolean;
}

/**
 * Core migration stages (7 stages in sequential order)
 * These represent the main Angular version migration path from 14 to 20
 */
export const ANGULAR_MIGRATION_STAGES: StageDefinition[] = [
  {
    id: 'migration_stage_pre_migration',
    name: 'Pre-Migration',
    description: 'Create backup, validate current state, commit to git',
    stepRange: [0, 2],
    requiresConfirmation: false,
    estimatedDuration: '2-5 minutes',
    dependencies: [],
  },
  {
    id: 'migration_stage_v15',
    name: 'Angular 15 Upgrade',
    description:
      'Update to Angular 15 (standalone components migration is now a separate optional tool)',
    version: '15',
    stepRange: [3, 4],
    requiresConfirmation: true,
    confirmationCount: 1,
    estimatedDuration: '5-8 minutes',
    dependencies: ['migration_stage_pre_migration'],
  },
  {
    id: 'migration_stage_v16',
    name: 'Angular 16 Upgrade',
    description: 'Update to Angular 16 (Signals introduced)',
    version: '16',
    stepRange: [7, 8],
    requiresConfirmation: true,
    confirmationCount: 1,
    estimatedDuration: '5-8 minutes',
    dependencies: ['migration_stage_v15'],
  },
  {
    id: 'migration_stage_v17',
    name: 'Angular 17 Upgrade',
    description: 'Update to Angular 17 and migrate to new control flow syntax (@if, @for, @switch)',
    version: '17',
    stepRange: [9, 11],
    requiresConfirmation: true,
    confirmationCount: 2,
    estimatedDuration: '10-15 minutes',
    dependencies: ['migration_stage_v16'],
  },
  {
    id: 'migration_stage_v18',
    name: 'Angular 18 Upgrade',
    description: 'Update to Angular 18 (Signal inputs/outputs become stable)',
    version: '18',
    stepRange: [12, 13],
    requiresConfirmation: true,
    confirmationCount: 1,
    estimatedDuration: '5-8 minutes',
    dependencies: ['migration_stage_v17'],
  },
  {
    id: 'migration_stage_v19',
    name: 'Angular 19 Upgrade',
    description: 'Update to Angular 19 (Zoneless by default)',
    version: '19',
    stepRange: [14, 15],
    requiresConfirmation: true,
    confirmationCount: 1,
    estimatedDuration: '5-8 minutes',
    dependencies: ['migration_stage_v18'],
  },
  {
    id: 'migration_stage_v20',
    name: 'Angular 20 Upgrade',
    description: 'Update to Angular 20 (final target version)',
    version: '20',
    stepRange: [16, 17],
    requiresConfirmation: true,
    confirmationCount: 1,
    estimatedDuration: '5-8 minutes',
    dependencies: ['migration_stage_v19'],
  },
  {
    id: 'migration_stage_post_migration',
    name: 'Post-Migration',
    description: 'Generate comprehensive migration report',
    stepRange: [18, 18],
    requiresConfirmation: false,
    estimatedDuration: '1-2 minutes',
    dependencies: ['migration_stage_v20'],
  },
];

/**
 * Optional feature migrations (1 optional migration)
 * These can be run at any time after their dependencies are met
 */
export const OPTIONAL_FEATURE_MIGRATIONS: StageDefinition[] = [
  {
    id: 'migration_feature_standalone',
    name: 'Standalone Components Migration',
    description:
      'Convert NgModule-based components to standalone (can run after v15+, recommended before v17)',
    stepRange: [5, 6],
    requiresConfirmation: true,
    confirmationCount: 1,
    estimatedDuration: '8-12 minutes',
    dependencies: ['migration_stage_v15'], // Must have v15 at minimum
    optional: true,
  },
];

/**
 * All stages combined (core + optional)
 * Useful for tools that need to search across all stage types
 */
export const ALL_MIGRATION_STAGES: StageDefinition[] = [
  ...ANGULAR_MIGRATION_STAGES,
  ...OPTIONAL_FEATURE_MIGRATIONS,
];

/**
 * Get a stage definition by ID
 * @param stageId - The stage identifier
 * @returns The stage definition or undefined if not found
 */
export function getStageById(stageId: string): StageDefinition | undefined {
  return ALL_MIGRATION_STAGES.find((stage) => stage.id === stageId);
}

/**
 * Get the stage that contains a specific workflow step
 * @param stepIndex - The workflow step index (0-based)
 * @returns The stage definition or undefined if not found
 */
export function getStageByStepIndex(stepIndex: number): StageDefinition | undefined {
  return ALL_MIGRATION_STAGES.find(
    (stage) => stepIndex >= stage.stepRange[0] && stepIndex <= stage.stepRange[1]
  );
}

/**
 * Get all stages that depend on a specific stage
 * @param stageId - The stage identifier
 * @returns Array of stages that depend on the specified stage
 */
export function getDependentStages(stageId: string): StageDefinition[] {
  return ALL_MIGRATION_STAGES.filter(
    (stage) => stage.dependencies && stage.dependencies.includes(stageId)
  );
}

/**
 * Validate that a stage's dependencies are met
 * @param stage - The stage to validate
 * @param completedStageIds - Set of completed stage IDs
 * @returns True if all dependencies are met
 */
export function areDependenciesMet(
  stage: StageDefinition,
  completedStageIds: Set<string>
): boolean {
  if (!stage.dependencies || stage.dependencies.length === 0) {
    return true;
  }

  return stage.dependencies.every((depId) => completedStageIds.has(depId));
}

/**
 * Get the next recommended stage after completing a stage
 * @param currentStageId - The current stage identifier
 * @param completedStageIds - Set of completed stage IDs
 * @returns The next recommended stage or undefined if migration is complete
 */
export function getNextRecommendedStage(
  currentStageId: string,
  completedStageIds: Set<string>
): StageDefinition | undefined {
  const currentStage = getStageById(currentStageId);
  if (!currentStage) {
    return undefined;
  }

  // Find the next sequential core stage
  const currentIndex = ANGULAR_MIGRATION_STAGES.findIndex((s) => s.id === currentStageId);
  if (currentIndex !== -1 && currentIndex < ANGULAR_MIGRATION_STAGES.length - 1) {
    const nextStage = ANGULAR_MIGRATION_STAGES[currentIndex + 1];
    if (areDependenciesMet(nextStage, completedStageIds)) {
      return nextStage;
    }
  }

  // Check if there are optional stages available
  const availableOptional = OPTIONAL_FEATURE_MIGRATIONS.filter(
    (stage) =>
      !completedStageIds.has(stage.id) && areDependenciesMet(stage, completedStageIds)
  );

  if (availableOptional.length > 0) {
    return availableOptional[0];
  }

  return undefined;
}

/**
 * Get optional stages that can be run at the current point
 * @param completedStageIds - Set of completed stage IDs
 * @returns Array of optional stages that can be run now
 */
export function getAvailableOptionalStages(
  completedStageIds: Set<string>
): StageDefinition[] {
  return OPTIONAL_FEATURE_MIGRATIONS.filter(
    (stage) =>
      !completedStageIds.has(stage.id) && areDependenciesMet(stage, completedStageIds)
  );
}

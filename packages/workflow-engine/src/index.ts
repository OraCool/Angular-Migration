/**
 * @angular-migration/workflow-engine
 * Shared workflow engine for Angular migration
 */

// Engine exports
export {
  WorkflowEngine,
  ANGULAR_MIGRATION_WORKFLOW
} from './engine/workflow-engine.js';

export { StateManager } from './engine/state-manager.js';

// Note: WorkflowExecutor is not exported yet as it has ACP-specific dependencies
// that need to be refactored. Will be added in a future version.

// Types
export type {
  WorkflowStep,
  WorkflowAction,
  WorkflowValidation,
  WorkflowState,
  WorkflowContext,
  ValidationResult,
  RetryConfig,
} from './engine/workflow-engine.js';

export type {
  CheckpointData,
  CheckpointMetadata,
} from './engine/state-manager.js';

export type {
  SessionId,
  Plan,
  PlanEntry,
  WorkflowEngineConfig,
  StageExecutionOptions,
  StageExecutionResult,
  StepExecutionResult,
  StageProgress,
} from './types/index.js';

// Stage definitions and utilities
export {
  ANGULAR_MIGRATION_STAGES,
  OPTIONAL_FEATURE_MIGRATIONS,
  ALL_MIGRATION_STAGES,
  getStageById,
  getStageByStepIndex,
  getDependentStages,
  areDependenciesMet,
  getNextRecommendedStage,
  getAvailableOptionalStages,
} from './engine/workflow-stages.js';

export type { StageDefinition } from './engine/workflow-stages.js';

// Subtask definitions and utilities for granular control
export {
  VERSION_UPGRADE_SUBTASKS,
  getSubtasksByStageId,
  getSubtaskById,
} from './engine/workflow-stages.js';

export type { SubtaskDefinition } from './engine/workflow-stages.js';

// Cross-platform utilities
export {
  getPlatform,
  getShellCommand,
  escapeForShell,
} from './utils/platform.js';

export type { Platform } from './utils/platform.js';

// Node.js version validation utilities
export {
  validateNodeVersion,
  getNodeVersionError,
  getInstallInstructions,
} from './utils/node-version-validator.js';

export type { NodeVersionValidation } from './utils/node-version-validator.js';

// Legacy node version utilities (for backward compatibility with acp-agent)
export {
  parseNodeRequirements,
  compareVersions,
  isVersionCompatible,
  getCurrentNodeVersion,
  isNvmAvailable,
  getRecommendedNodeVersion,
  listNvmVersions,
  findBestMatch,
  switchNodeVersion,
} from './utils/node-version.js';

export type { NodeVersionRequirement } from './utils/node-version.js';

// Package management utilities
export {
  cleanPackages,
  detectPackageManager,
  hasNodeModules,
  getNodeModulesSize,
  formatBytes,
} from './utils/package-manager.js';

export type {
  CleanPackagesOptions,
  CleanPackagesResult,
  PackageManagerInfo,
} from './utils/package-manager.js';

// Backup and restore utilities
export {
  createBackup,
  restoreBackup,
  listBackups,
  getBackupMetadata,
  deleteBackup,
} from './utils/backup.js';

export type {
  BackupOptions,
  BackupResult,
  BackupMetadata,
  RestoreOptions,
  RestoreResult,
} from './utils/backup.js';

// Package update utilities
export {
  updatePackages,
  getCurrentAngularVersion,
  validatePackageJson,
} from './utils/package-updater.js';

export type {
  PackageUpdateOptions,
  PackageUpdateResult,
  PackageChange,
  CompatibilityMatrix,
  VersionConfig,
} from './utils/package-updater.js';

// Breaking changes utilities
export {
  applyBreakingChangeFixes,
} from './utils/breaking-changes.js';

export type {
  BreakingChangeFix,
  FixResult,
  FileReplacement,
} from './utils/breaking-changes.js';

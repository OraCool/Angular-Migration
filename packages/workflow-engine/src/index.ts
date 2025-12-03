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

export type { SessionId, Plan, PlanEntry, WorkflowEngineConfig } from './types/index.js';

// Utils - export all node version functions
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

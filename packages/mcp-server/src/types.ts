/**
 * Type definitions for MCP Server
 */

import type { WorkflowStep, WorkflowState } from '@angular-migration/workflow-engine';

/**
 * Next step recommendation
 */
export interface NextStepRecommendation {
  action: string;
  description: string;
  reasoning: string;
  optional?: Array<{
    action: string;
    description: string;
  }>;
}

/**
 * Detailed error information
 */
export interface ErrorDetails {
  stage?: string;
  step?: string;
  action?: string;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
  duration?: number;
  timestamp?: string;
  required?: string;
  current?: string;
  [key: string]: unknown;
}

/**
 * Troubleshooting guidance
 */
export interface TroubleshootingInfo {
  likelyCause: string;
  suggestedFixes: string[];
  relatedDocs: string[];
  canRetry: boolean;
  canRollback: boolean;
}

/**
 * Tool execution result (legacy format - kept for backward compatibility)
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;

  /** Next step recommendation (required for all tools) */
  nextStep?: NextStepRecommendation;

  /** Detailed error information */
  details?: ErrorDetails;

  /** Troubleshooting guidance */
  troubleshooting?: TroubleshootingInfo;
}

/**
 * Standardized MCP Tool Response (from MCP_SERVER_AGENT_PROMPT.md spec)
 * All new tools MUST return this format
 */
export interface StandardToolResponse {
  /** Status of the operation */
  status: "success" | "warning" | "error";

  /** Tool-specific data */
  data: unknown;

  /** Clear instruction for next step */
  nextAction: string;

  /** MCP Resource URI reference or null */
  instructionRef: string | null;

  /** Command user must run manually or null */
  userAction: string | null;

  /** Whether this tool performs automated actions */
  automated: boolean;
}

/**
 * Standardized Error Response (from MCP_SERVER_AGENT_PROMPT.md spec)
 */
export interface StandardErrorResponse {
  /** Always "error" */
  status: "error";

  /** Error details */
  error: {
    /** ERROR_CODE in UPPER_SNAKE_CASE */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Technical details for debugging */
    details: string;
  };

  /** How to resolve the error */
  nextAction: string;

  /** Whether rollback is available */
  rollbackAvailable: boolean;

  /** MCP Resource URI reference or null */
  instructionRef: string | null;
}

/**
 * Workflow step info for MCP responses
 */
export interface StepInfo {
  id: string;
  index: number;
  title: string;
  description: string;
  version?: string;
  requiresConfirmation: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Session info for MCP responses
 */
export interface SessionInfo {
  id: string;
  projectPath: string;
  currentVersion: string;
  targetVersion: string;
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  hasCheckpoint: boolean;
  createdAt: string;
  lastActivityAt: string;
}

/**
 * Migration plan summary
 */
export interface MigrationPlan {
  totalSteps: number;
  estimatedDuration: string;
  steps: Array<{
    id: string;
    title: string;
    version?: string;
    description: string;
    requiresConfirmation: boolean;
  }>;
}

/**
 * Validation result
 */
export interface ValidationInfo {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Progress update notification
 */
export interface ProgressUpdate {
  /** Progress message */
  message: string;

  /** Current progress percentage (0-100) */
  progress?: number;

  /** Current step being executed */
  currentStep?: string;

  /** Total steps */
  totalSteps?: number;

  /** Steps completed */
  completedSteps?: number;

  /** Type of progress update */
  type?: 'info' | 'success' | 'warning' | 'error' | 'stage' | 'action';

  /** Timestamp */
  timestamp?: string;

  /** MCP tool name that generated this update */
  toolName?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Progress callback for streaming updates
 */
export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * Streaming-enabled tool result
 */
export interface StreamingToolResult extends ToolResult {
  /** Indicates if the tool supports streaming */
  streamed?: boolean;

  /** Progress updates collected during execution */
  progressUpdates?: ProgressUpdate[];
}

/**
 * Breaking change detection result
 */
export interface BreakingChangeDetection {
  /** Unique ID for this breaking change */
  id: string;

  /** Category of breaking change */
  category: 'Deprecated API' | 'Import Changes' | 'Configuration Changes' | 'Behavior Changes' | 'Removed Feature';

  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Description of the breaking change */
  description: string;

  /** Files affected by this change */
  affectedFiles: Array<{
    path: string;
    line: number;
    snippet: string;
  }>;

  /** Whether auto-fix is available */
  autoFixAvailable: boolean;

  /** Whether schematic is available */
  schematicAvailable: boolean;

  /** URI to migration guide */
  migrationGuide: string;
}

/**
 * Package dependency info
 */
export interface PackageDependency {
  /** Package name */
  package: string;

  /** Current version */
  currentVersion: string;

  /** Recommended/compatible version */
  compatibleVersion?: string;

  /** Whether update is required */
  updateRequired: boolean;

  /** Reason for incompatibility */
  reason?: string;

  /** Whether this is a breaking change */
  breaking?: boolean;
}

/**
 * Node.js version compatibility check
 */
export interface NodeVersionCheck {
  /** Current Node.js version */
  currentVersion: string;

  /** Required Node.js version */
  requiredVersion: string;

  /** Whether version is compatible */
  compatible: boolean;

  /** Suggested action if incompatible */
  suggestedAction?: string;
}

/**
 * Project analysis result
 */
export interface ProjectAnalysis {
  /** Current Angular version */
  currentVersion: string;

  /** Target Angular version */
  targetVersion: string;

  /** Migration path (array of versions) */
  migrationPath: string[];

  /** Node.js version info */
  nodeVersion: NodeVersionCheck;

  /** Project path */
  projectPath: string;
}

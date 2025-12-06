/**
 * Progress Tracker Utility
 * Standardizes progress callback patterns and eliminates duplication
 * Provides fluent API for common progress reporting scenarios
 */

import { ProgressCallback, ProgressUpdate } from '../types.js';

/**
 * Configuration for ProgressTracker
 */
export interface ProgressTrackerConfig {
  /** Total number of steps (optional, enables automatic progress calculation) */
  totalSteps?: number;

  /** Tool name to include in progress updates */
  toolName?: string;

  /** Whether to automatically calculate progress percentage */
  autoProgress?: boolean;

  /** Initial progress percentage (default: 0) */
  initialProgress?: number;
}

/**
 * ProgressTracker - Wraps ProgressCallback with convenient methods
 * Eliminates duplicated progress reporting patterns throughout the codebase
 *
 * @example
 * ```typescript
 * const tracker = new ProgressTracker(progressCallback, {
 *   totalSteps: 5,
 *   toolName: 'analyze_project_version'
 * });
 *
 * tracker.step(1, 'Reading package.json');
 * tracker.step(2, 'Parsing Angular version');
 * tracker.complete('Analysis complete');
 * ```
 */
export class ProgressTracker {
  private callback: ProgressCallback;
  private config: ProgressTrackerConfig;
  private currentStepNumber: number = 0;
  private currentProgress: number;

  /**
   * Create a new ProgressTracker
   *
   * @param callback - The progress callback function
   * @param config - Configuration options
   */
  constructor(callback: ProgressCallback, config: ProgressTrackerConfig = {}) {
    this.callback = callback;
    this.config = {
      autoProgress: true,
      initialProgress: 0,
      ...config,
    };
    this.currentProgress = this.config.initialProgress || 0;
  }

  /**
   * Report a step in the process
   * Automatically calculates progress if totalSteps is configured
   *
   * @param stepNumber - Current step number (1-indexed)
   * @param message - Step description
   * @param type - Type of update (default: 'info')
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * tracker.step(1, 'Reading package.json');
   * tracker.step(2, 'Parsing Angular version', 'info');
   * ```
   */
  step(
    stepNumber: number,
    message: string,
    type: ProgressUpdate['type'] = 'info',
    metadata?: Record<string, unknown>
  ): void {
    this.currentStepNumber = stepNumber;

    // Auto-calculate progress if totalSteps is configured
    let progress = this.currentProgress;
    if (this.config.autoProgress && this.config.totalSteps) {
      progress = Math.round((stepNumber / this.config.totalSteps) * 100);
      this.currentProgress = progress;
    }

    this.callback({
      message,
      type,
      progress,
      currentStep: `${stepNumber}`,
      totalSteps: this.config.totalSteps,
      completedSteps: stepNumber - 1,
      toolName: this.config.toolName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Report an info message
   *
   * @param message - Info message
   * @param progress - Optional manual progress percentage
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * tracker.info('Analyzing project structure', 25);
   * ```
   */
  info(message: string, progress?: number, metadata?: Record<string, unknown>): void {
    if (progress !== undefined) {
      this.currentProgress = progress;
    }

    this.callback({
      message,
      type: 'info',
      progress: this.currentProgress,
      toolName: this.config.toolName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Report a success message
   *
   * @param message - Success message
   * @param progress - Optional manual progress percentage
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * tracker.success('Package.json parsed successfully');
   * ```
   */
  success(message: string, progress?: number, metadata?: Record<string, unknown>): void {
    if (progress !== undefined) {
      this.currentProgress = progress;
    }

    this.callback({
      message,
      type: 'success',
      progress: this.currentProgress,
      toolName: this.config.toolName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Report a warning message
   *
   * @param message - Warning message
   * @param progress - Optional manual progress percentage
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * tracker.warning('Deprecated package detected');
   * ```
   */
  warning(message: string, progress?: number, metadata?: Record<string, unknown>): void {
    if (progress !== undefined) {
      this.currentProgress = progress;
    }

    this.callback({
      message,
      type: 'warning',
      progress: this.currentProgress,
      toolName: this.config.toolName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Report an error message
   *
   * @param message - Error message
   * @param metadata - Additional metadata (e.g., error details)
   *
   * @example
   * ```typescript
   * tracker.error('Failed to read package.json', { error: err.message });
   * ```
   */
  error(message: string, metadata?: Record<string, unknown>): void {
    this.callback({
      message,
      type: 'error',
      progress: this.currentProgress,
      toolName: this.config.toolName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Report a stage transition
   *
   * @param message - Stage description
   * @param progress - Optional manual progress percentage
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * tracker.stage('Prerequisites check');
   * ```
   */
  stage(message: string, progress?: number, metadata?: Record<string, unknown>): void {
    if (progress !== undefined) {
      this.currentProgress = progress;
    }

    this.callback({
      message,
      type: 'stage',
      progress: this.currentProgress,
      toolName: this.config.toolName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Report an action being performed
   *
   * @param message - Action description
   * @param progress - Optional manual progress percentage
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * tracker.action('Running npm install');
   * ```
   */
  action(message: string, progress?: number, metadata?: Record<string, unknown>): void {
    if (progress !== undefined) {
      this.currentProgress = progress;
    }

    this.callback({
      message,
      type: 'action',
      progress: this.currentProgress,
      toolName: this.config.toolName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Report completion (100% progress)
   *
   * @param message - Completion message (default: 'Complete')
   * @param metadata - Additional metadata
   *
   * @example
   * ```typescript
   * tracker.complete('Migration analysis complete');
   * ```
   */
  complete(message: string = 'Complete', metadata?: Record<string, unknown>): void {
    this.currentProgress = 100;

    this.callback({
      message,
      type: 'success',
      progress: 100,
      completedSteps: this.config.totalSteps,
      toolName: this.config.toolName,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Update progress percentage manually
   *
   * @param progress - Progress percentage (0-100)
   * @param message - Optional message
   *
   * @example
   * ```typescript
   * tracker.updateProgress(45, 'Processing files');
   * ```
   */
  updateProgress(progress: number, message?: string): void {
    this.currentProgress = Math.max(0, Math.min(100, progress));

    if (message) {
      this.callback({
        message,
        type: 'info',
        progress: this.currentProgress,
        toolName: this.config.toolName,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get current progress percentage
   *
   * @returns Current progress (0-100)
   */
  getProgress(): number {
    return this.currentProgress;
  }

  /**
   * Get current step number
   *
   * @returns Current step number
   */
  getCurrentStep(): number {
    return this.currentStepNumber;
  }

  /**
   * Send a custom progress update
   * For advanced use cases where the standard methods don't fit
   *
   * @param update - Custom progress update
   *
   * @example
   * ```typescript
   * tracker.custom({
   *   message: 'Custom operation',
   *   type: 'info',
   *   progress: 55,
   *   metadata: { custom: 'data' }
   * });
   * ```
   */
  custom(update: Partial<ProgressUpdate>): void {
    const fullUpdate: ProgressUpdate = {
      message: update.message || 'Processing',
      type: update.type || 'info',
      progress: update.progress ?? this.currentProgress,
      toolName: update.toolName || this.config.toolName,
      timestamp: update.timestamp || new Date().toISOString(),
      ...update,
    };

    if (update.progress !== undefined) {
      this.currentProgress = update.progress;
    }

    this.callback(fullUpdate);
  }
}

/**
 * Create a ProgressTracker with step-based configuration
 * Convenience factory for common use case of step-by-step progress
 *
 * @param callback - Progress callback
 * @param totalSteps - Total number of steps
 * @param toolName - Tool name for tracking
 * @returns Configured ProgressTracker
 *
 * @example
 * ```typescript
 * const tracker = createStepTracker(progressCallback, 5, 'analyze_project');
 * tracker.step(1, 'Reading package.json');
 * tracker.step(2, 'Parsing version');
 * ```
 */
export function createStepTracker(
  callback: ProgressCallback,
  totalSteps: number,
  toolName?: string
): ProgressTracker {
  return new ProgressTracker(callback, {
    totalSteps,
    toolName,
    autoProgress: true,
  });
}

/**
 * Create a ProgressTracker with manual progress control
 * For cases where progress isn't linear or step-based
 *
 * @param callback - Progress callback
 * @param toolName - Tool name for tracking
 * @returns Configured ProgressTracker
 *
 * @example
 * ```typescript
 * const tracker = createManualTracker(progressCallback, 'migrate_version');
 * tracker.info('Starting migration', 0);
 * tracker.info('Halfway done', 50);
 * tracker.complete('Migration complete');
 * ```
 */
export function createManualTracker(
  callback: ProgressCallback,
  toolName?: string
): ProgressTracker {
  return new ProgressTracker(callback, {
    toolName,
    autoProgress: false,
  });
}

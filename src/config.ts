/**
 * Configuration Management
 * Centralizes all environment-based and default configurations
 */

import * as path from 'path';
import * as os from 'os';

export interface AppConfig {
  /** Path to the Angular Migration Workshop directory containing scripts and guides */
  workshopRoot: string;

  /** Default project path (can be overridden per-session) */
  projectRoot?: string;

  /** Default checkpoint storage directory */
  checkpointDir: string;

  /** Thread history storage directory */
  threadsDir: string;

  /** Agent registry and messages storage directory */
  agentsDir: string;

  /** Workflow options */
  workflow: {
    skipTests: boolean;
    skipLint: boolean;
    autoConfirm: boolean;
  };
}

/**
 * Get workshop root path from environment or use sensible default
 * Priority:
 * 1. WORKSHOP_ROOT environment variable
 * 2. ~/.angular-migration/workshop (local user directory)
 */
function getWorkshopRoot(): string {
  if (process.env.WORKSHOP_ROOT) {
    return process.env.WORKSHOP_ROOT;
  }

  // Default to user's home directory
  return path.join(os.homedir(), '.angular-migration', 'workshop');
}

/**
 * Get checkpoint directory from environment or use default
 */
function getCheckpointDir(): string {
  if (process.env.CHECKPOINT_DIR) {
    return process.env.CHECKPOINT_DIR;
  }

  return path.join(os.homedir(), '.angular-migration', 'checkpoints');
}

/**
 * Get threads directory from environment or use default
 */
function getThreadsDir(): string {
  if (process.env.THREADS_DIR) {
    return process.env.THREADS_DIR;
  }

  return path.join(os.homedir(), '.angular-migration', 'threads');
}

/**
 * Get agents directory from environment or use default
 */
function getAgentsDir(): string {
  if (process.env.AGENTS_DIR) {
    return process.env.AGENTS_DIR;
  }

  return path.join(os.homedir(), '.angular-migration', 'agents');
}

/**
 * Load application configuration from environment variables
 */
export function loadConfig(): AppConfig {
  return {
    workshopRoot: getWorkshopRoot(),
    projectRoot: process.env.PROJECT_ROOT,
    checkpointDir: getCheckpointDir(),
    threadsDir: getThreadsDir(),
    agentsDir: getAgentsDir(),
    workflow: {
      skipTests: process.env.SKIP_TESTS === 'true',
      skipLint: process.env.SKIP_LINT === 'true',
      autoConfirm: process.env.AUTO_CONFIRM === 'true',
    },
  };
}

/**
 * Global configuration instance
 * Load once at startup to avoid repeated environment variable lookups
 */
export const config: AppConfig = loadConfig();

/**
 * Log configuration on startup (useful for debugging)
 */
export function logConfig(): void {
  process.stderr.write('[Config] Loaded configuration:\n');
  process.stderr.write(`  Workshop Root: ${config.workshopRoot}\n`);
  process.stderr.write(`  Checkpoint Dir: ${config.checkpointDir}\n`);
  process.stderr.write(`  Threads Dir: ${config.threadsDir}\n`);
  process.stderr.write(`  Agents Dir: ${config.agentsDir}\n`);
  if (config.projectRoot) {
    process.stderr.write(`  Project Root: ${config.projectRoot}\n`);
  }
  process.stderr.write(`  Skip Tests: ${config.workflow.skipTests}\n`);
  process.stderr.write(`  Skip Lint: ${config.workflow.skipLint}\n`);
  process.stderr.write(`  Auto Confirm: ${config.workflow.autoConfirm}\n`);
}

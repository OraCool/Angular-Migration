/**
 * Workflow Executor - Runs migration workflow steps with ACP integration
 */

import { spawn, SpawnOptions } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  WorkflowEngine,
  WorkflowAction,
  WorkflowValidation,
  ValidationResult,
  WorkflowContext,
} from './engine.js';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  duration: number;
}

export class WorkflowExecutor {
  constructor(
    private engine: WorkflowEngine,
    private context: WorkflowContext
  ) {}

  /**
   * Execute a workflow action (command, script, or schematic)
   */
  async executeAction(action: WorkflowAction): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      let result: ExecutionResult;

      switch (action.type) {
        case 'command':
        case 'schematic':
          result = await this.runCommand(
            action.command!,
            action.args,
            action.workingDir || this.context.projectPath,
            action.timeout
          );
          break;

        case 'script':
          result = await this.runScript(
            action.scriptPath!,
            action.args,
            action.workingDir || this.context.projectPath,
            action.timeout
          );
          break;

        case 'manual':
          // Manual actions require user intervention
          result = {
            success: true,
            output: `Manual action required: ${action.description}`,
            duration: 0,
          };
          break;

        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a validation step (build, lint, test, custom)
   */
  async executeValidation(validation: WorkflowValidation): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      let result: ExecutionResult;

      if (validation.scriptPath) {
        result = await this.runScript(
          validation.scriptPath,
          undefined,
          this.context.projectPath
        );
      } else if (validation.command) {
        // Skip validation if context says so
        if (validation.type === 'test' && this.context.skipTests) {
          return {
            success: true,
            output: 'Tests skipped by configuration',
            timestamp: new Date(),
          };
        }

        if (validation.type === 'lint' && this.context.skipLint) {
          return {
            success: true,
            output: 'Linting skipped by configuration',
            timestamp: new Date(),
          };
        }

        result = await this.runCommand(
          validation.command,
          undefined,
          this.context.projectPath
        );
      } else {
        throw new Error('Validation must have either command or scriptPath');
      }

      const validationResult: ValidationResult = {
        success: validation.failOnError ? result.success : true,
        output: result.output,
        error: result.error,
        timestamp: new Date(),
      };

      // Record validation result in engine
      this.engine.recordValidationResult(validation.name, validationResult);

      return validationResult;
    } catch (error) {
      const validationResult: ValidationResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };

      this.engine.recordValidationResult(validation.name, validationResult);
      return validationResult;
    }
  }

  /**
   * Run a shell command
   */
  private runCommand(
    command: string,
    args?: string[],
    cwd?: string,
    timeout?: number
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const options: SpawnOptions = {
        cwd: cwd || this.context.projectPath,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      };

      // Parse command and args
      const commandParts = command.split(' ');
      const cmd = commandParts[0];
      const cmdArgs = [...commandParts.slice(1), ...(args || [])];

      const child = spawn(cmd, cmdArgs, options);

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (timeout) {
        timeoutId = setTimeout(() => {
          killed = true;
          child.kill('SIGTERM');
        }, timeout);
      }

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (killed) {
          resolve({
            success: false,
            output: stdout,
            error: `Command timed out after ${timeout}ms`,
            exitCode: -1,
            duration: 0,
          });
        } else {
          resolve({
            success: code === 0,
            output: stdout,
            error: stderr || undefined,
            exitCode: code || 0,
            duration: 0,
          });
        }
      });

      child.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        resolve({
          success: false,
          output: stdout,
          error: error.message,
          duration: 0,
        });
      });
    });
  }

  /**
   * Run a shell script
   */
  private async runScript(
    scriptPath: string,
    args?: string[],
    cwd?: string,
    timeout?: number
  ): Promise<ExecutionResult> {
    // Resolve script path relative to project or absolute
    const resolvedPath = path.isAbsolute(scriptPath)
      ? scriptPath
      : path.join(this.context.projectPath, scriptPath);

    // Check if script exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return {
        success: false,
        output: '',
        error: `Script not found: ${resolvedPath}`,
        duration: 0,
      };
    }

    // Make script executable on Unix-like systems
    if (process.platform !== 'win32') {
      try {
        await fs.chmod(resolvedPath, '755');
      } catch {
        // Ignore chmod errors
      }
    }

    // Run the script
    return this.runCommand(resolvedPath, args, cwd, timeout);
  }

  /**
   * Create a backup of the project
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      this.context.projectPath,
      '..',
      `angular-backup-${timestamp}`
    );

    const result = await this.runCommand(
      `cp -R "${this.context.projectPath}" "${backupPath}"`
    );

    if (!result.success) {
      throw new Error(`Backup failed: ${result.error}`);
    }

    this.engine.setBackupPath(backupPath);
    return backupPath;
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    const result = await this.runCommand(
      `rm -rf "${this.context.projectPath}" && cp -R "${backupPath}" "${this.context.projectPath}"`
    );

    if (!result.success) {
      throw new Error(`Restore failed: ${result.error}`);
    }
  }
}

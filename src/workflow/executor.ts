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
import { LLMFixerService } from '../services/llm-fixer.js';
import { findPatternFix } from '../services/pattern-fixer.js';
import { config } from '../config.js';

/**
 * Resolve workshop script path
 */
function resolveWorkshopScript(scriptName: string): string {
  return path.join(config.workshopRoot, 'scripts', scriptName);
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  duration: number;
}

export interface ExecutorCallbacks {
  sendThought?: (message: string) => Promise<void>;
  sendMessage?: (message: string) => Promise<void>;
}

export class WorkflowExecutor {
  private llmFixer: LLMFixerService;
  private callbacks?: ExecutorCallbacks;
  
  constructor(
    private engine: WorkflowEngine,
    private context: WorkflowContext,
    callbacks?: ExecutorCallbacks
  ) {
    this.callbacks = callbacks;
    this.llmFixer = new LLMFixerService(config.workshopRoot, true, callbacks); // Enable LLM with messaging
  }

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
        
        case 'auto-fix':
          // Auto-fix action: try pattern-based or LLM fix
          result = await this.runAutoFix(action);
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
    
    process.stderr.write(`[Validation] Starting: ${validation.name} (type: ${validation.type})\n`);
    if (validation.command) {
      process.stderr.write(`[Validation] Command: ${validation.command}\n`);
    }

    try {
      let result: ExecutionResult;

      if (validation.scriptPath) {
        result = await this.runScript(
          validation.scriptPath,
          validation.args,
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

      const duration = Date.now() - startTime;
      const validationResult: ValidationResult = {
        success: validation.failOnError ? result.success : true,
        output: result.output,
        error: result.error,
        timestamp: new Date(),
      };
      
      // Log validation result
      process.stderr.write(`[Validation] Completed: ${validation.name} in ${duration}ms\n`);
      process.stderr.write(`[Validation] Result: ${validationResult.success ? '✅ PASS' : '❌ FAIL'}\n`);
      
      if (result.exitCode !== undefined) {
        process.stderr.write(`[Validation] Exit code: ${result.exitCode}\n`);
      }
      
      if (validationResult.error) {
        // Show FULL error, not just preview - critical for debugging
        process.stderr.write(`[Validation] ===== FULL ERROR OUTPUT =====\n`);
        process.stderr.write(validationResult.error);
        process.stderr.write(`\n[Validation] ===== END ERROR OUTPUT =====\n`);
      }
      
      if (validationResult.output && validationResult.output.length > 0) {
        process.stderr.write(`[Validation] ===== FULL OUTPUT =====\n`);
        process.stderr.write(validationResult.output);
        process.stderr.write(`\n[Validation] ===== END OUTPUT =====\n`);
      }

      // Record validation result in engine
      this.engine.recordValidationResult(validation.name, validationResult);

      return validationResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      process.stderr.write(`[Validation] EXCEPTION in ${validation.name} after ${duration}ms\n`);
      process.stderr.write(`[Validation] Exception: ${errorMessage}\n`);
      
      const validationResult: ValidationResult = {
        success: false,
        output: '',
        error: errorMessage,
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
        const text = data.toString();
        stdout += text;
        // Stream to stderr for real-time visibility
        process.stderr.write(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        // Stream to stderr for real-time visibility
        process.stderr.write(text);
      });

      child.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Log captured output lengths for debugging
        process.stderr.write(`[Executor] Command finished. Exit code: ${code}, stdout: ${stdout.length} bytes, stderr: ${stderr.length} bytes\n`);

        if (killed) {
          resolve({
            success: false,
            output: stdout,
            error: `Command timed out after ${timeout}ms`,
            exitCode: -1,
            duration: 0,
          });
        } else {
          // Check for test/lint errors even if exit code is 0 (Karma, Jest, ESLint sometimes exit 0)
          const combinedOutput = stdout + stderr;
          const hasKarmaError = /ERROR \[karma-server\]|Error: Found \d+ load error/i.test(combinedOutput);
          const hasJestError = /FAIL|Test Suites: \d+ failed/i.test(combinedOutput);
          const hasLintError = /\d+ error|✖ \d+ problem/i.test(combinedOutput);
          const hasBuildError = /ERROR in|Error: src\/|Build failed|Compilation failed|error NG\d+/i.test(combinedOutput);
          
          const hasErrorInOutput = hasKarmaError || hasJestError || hasLintError || hasBuildError;
          const failed = code !== 0 || hasErrorInOutput;
          
          // ALWAYS log error detection for debugging
          process.stderr.write(`[Executor] Exit code: ${code}, hasErrorInOutput: ${hasErrorInOutput}, failed: ${failed}\n`);
          if (hasBuildError) {
            process.stderr.write(`[Executor] Build error detected in output!\n`);
            // Log first 500 chars of output that triggered detection
            const errorMatch = combinedOutput.match(/(ERROR in|Error: src\/|error NG\d+).{0,200}/i);
            if (errorMatch) {
              process.stderr.write(`[Executor] Matched: ${errorMatch[0]}\n`);
            }
          }
          
          // Log error detection for debugging
          if (hasErrorInOutput && code === 0) {
            process.stderr.write(`[Executor] Detected error in output despite exit code 0:\n`);
            if (hasKarmaError) process.stderr.write(`[Executor]   - Karma error detected\n`);
            if (hasJestError) process.stderr.write(`[Executor]   - Jest error detected\n`);
            if (hasLintError) process.stderr.write(`[Executor]   - Lint error detected\n`);
            if (hasBuildError) process.stderr.write(`[Executor]   - Build error detected\n`);
          }
          
          // If command failed but stderr is empty, use stdout or generic message
          const errorMessage = failed
            ? (stderr || stdout || `Command exited with code ${code}`)
            : undefined;
          
          resolve({
            success: !failed,
            output: stdout,
            error: errorMessage,
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
   * Run a shell script (resolves workshop paths automatically)
   */
  private async runScript(
    scriptPath: string,
    args?: string[],
    cwd?: string,
    timeout?: number
  ): Promise<ExecutionResult> {
    // If path starts with './scripts/', resolve from workshop root
    const resolvedPath = scriptPath.startsWith('./scripts/') 
      ? resolveWorkshopScript(path.basename(scriptPath))
      : path.isAbsolute(scriptPath)
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

    // Use rsync to exclude build artifacts and dependencies
    const result = await this.runCommand(
      `rsync -av --exclude='node_modules' --exclude='dist' --exclude='.angular' --exclude='coverage' --exclude='.git' "${this.context.projectPath}/" "${backupPath}/"`
    );

    if (!result.success) {
      throw new Error(`Backup failed: ${result.error}`);
    }

    // Add backup folders to .gitignore
    await this.updateGitignore();

    this.engine.setBackupPath(backupPath);
    return backupPath;
  }

  /**
   * Update .gitignore to exclude backup folders
   */
  private async updateGitignore(): Promise<void> {
    const gitignorePath = path.join(this.context.projectPath, '..', '.gitignore');
    const backupPattern = 'angular-backup-*';

    try {
      let content = '';
      try {
        content = await fs.readFile(gitignorePath, 'utf-8');
      } catch {
        // .gitignore doesn't exist, create new
      }

      // Check if pattern already exists
      if (!content.includes(backupPattern)) {
        // Add backup pattern with comment
        const newContent = content.trim() + (content ? '\n\n' : '') + 
          '# Angular migration backups\n' + backupPattern + '\n';
        await fs.writeFile(gitignorePath, newContent, 'utf-8');
      }
    } catch (error) {
      // Ignore gitignore errors - not critical
      process.stderr.write(`Warning: Could not update .gitignore: ${error}\n`);
    }
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
  
  /**
   * Auto-fix: Try pattern-based fix first, then LLM if enabled
   */
  private async runAutoFix(action: WorkflowAction): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get last validation error if available
      const lastError = this.getLastValidationError();
      const errorToFix = action.errorPattern 
        ? (lastError?.includes(action.errorPattern) ? lastError : '')
        : lastError;
      
      if (!errorToFix) {
        return {
          success: true,
          output: 'No matching error to fix',
          duration: Date.now() - startTime,
        };
      }
      
      // 1. Try pattern-based fix
      const patternFix = findPatternFix(errorToFix);
      if (patternFix) {
        const commands = await patternFix.fix(this.context.projectPath, errorToFix);
        
        let allSuccess = true;
        let output = `Pattern fix: ${patternFix.description}\n`;
        
        for (const cmd of commands) {
          const result = await this.runCommand(cmd, undefined, this.context.projectPath);
          output += `\n${cmd}\n${result.output}`;
          
          if (!result.success && !action.continueOnError) {
            allSuccess = false;
            break;
          }
        }
        
        return {
          success: allSuccess || action.continueOnError || false,
          output,
          duration: Date.now() - startTime,
        };
      }
      
      // 2. Fallback to LLM fix
      if (this.callbacks?.sendThought) {
        await this.callbacks.sendThought('🤖 No pattern match found. Consulting LLM for fix...');
      }
      
      const fixResult = await this.llmFixer.fixError({
        error: errorToFix,
        errorType: 'Build Errors', // TODO: detect from error
        workshopRoot: config.workshopRoot,
        angularVersion: this.context.currentVersion,
      });
      
      if (fixResult.success && fixResult.commands) {
        let output = fixResult.usedLLM 
          ? `LLM fix: ${fixResult.explanation}\n` 
          : `Fix: ${fixResult.explanation}\n`;
        
        for (const cmd of fixResult.commands) {
          const result = await this.runCommand(cmd, undefined, this.context.projectPath);
          output += `\n${cmd}\n${result.output}`;
        }
        
        return {
          success: true,
          output,
          duration: Date.now() - startTime,
        };
      }
      
      return {
        success: action.continueOnError || false,
        output: fixResult.explanation || 'No fix available',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: action.continueOnError || false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Get last validation error from engine state
   */
  private getLastValidationError(): string | undefined {
    const state = this.engine.getState();
    const lastResults = Array.from(state.lastValidationResults.values());
    const lastFailure = lastResults.reverse().find(r => !r.success);
    return lastFailure?.error || lastFailure?.output;
  }
}


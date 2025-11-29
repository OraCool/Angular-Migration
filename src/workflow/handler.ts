/**
 * Workflow-Integrated Angular Migration Handler
 * Manages step-by-step migration with user confirmations
 */

import type { SessionState } from '../index.js';
import type { SessionId } from '../types/acp.js';
import { JsonRpcTransport } from '../transport/jsonrpc.js';
import {
  WorkflowEngine,
  WorkflowContext,
  ANGULAR_MIGRATION_WORKFLOW,
} from './engine.js';
import { WorkflowExecutor } from './executor.js';
import { generateEnhancedErrorMessage, getRecommendedScripts } from './issue-mapper.js';
import { validateNodeVersion, switchNodeVersion, installNodeVersion } from '../utils/node-version-checker.js';

export class WorkflowMigrationHandler {
  private workflows = new Map<SessionId, { 
    engine: WorkflowEngine; 
    executor: WorkflowExecutor;
    session: SessionState;
    projectPath: string; // Store project path for easy access
  }>();

  constructor(private transport: JsonRpcTransport) {}

  /**
   * Start a new step-by-step migration workflow
   */
  async startWorkflow(
    sessionId: SessionId,
    session: SessionState,
    options: {
      currentVersion?: string; // Optional - will auto-detect if not provided
      targetVersion: string;
      skipTests?: boolean;
      skipLint?: boolean;
      autoConfirm?: boolean;
      customFolder?: string | null;
      resumeFromStep?: string | number; // Step ID or index to resume from
    }
  ): Promise<void> {
    // Determine project path - use custom folder if provided, otherwise use session cwd
    let projectPath = session.cwd;
    if (options.customFolder) {
      const path = await import('path');
      projectPath = path.isAbsolute(options.customFolder)
        ? options.customFolder
        : path.join(session.cwd, options.customFolder);
    }

    // Auto-detect current Angular version if not provided
    let currentVersion = options.currentVersion;
    if (!currentVersion) {
      currentVersion = await this.detectAngularVersion(projectPath);
      await this.sendMessage(
        sessionId,
        `🔍 Detected Angular version: **${currentVersion}**`
      );
    }
    
    const context: WorkflowContext = {
      sessionId,
      projectPath,
      currentVersion, // Use the auto-detected or provided version
      targetVersion: options.targetVersion,
      skipTests: options.skipTests,
      skipLint: options.skipLint,
      autoConfirm: options.autoConfirm,
    };

    const engine = new WorkflowEngine(ANGULAR_MIGRATION_WORKFLOW, context);
    const executor = new WorkflowExecutor(engine, context, {
      sendThought: (msg) => this.sendThought(sessionId, msg),
      sendMessage: (msg) => this.sendMessage(sessionId, msg),
    });

    this.workflows.set(sessionId, { engine, executor, session, projectPath });

    // Resume from specific step if requested
    if (options.resumeFromStep !== undefined) {
      const success = engine.skipToStep(options.resumeFromStep);
      if (success) {
        await this.sendMessage(
          sessionId,
          `📍 Resuming migration from step: **${engine.getCurrentStep()?.title}**`
        );
      } else {
        await this.sendMessage(
          sessionId,
          `⚠️ Could not find step: ${options.resumeFromStep}. Starting from beginning.`
        );
      }
    } else if (!options.currentVersion) {
      // Auto-skip to appropriate step based on detected version
      const startingStepId = this.findStartingStep(currentVersion);
      if (startingStepId) {
        const success = engine.skipToStep(startingStepId);
        if (success) {
          await this.sendMessage(
            sessionId,
            `⏩ Starting from Angular ${currentVersion} → skipping to: **${engine.getCurrentStep()?.title}**`
          );
        }
      }
    }

    process.stderr.write(`[Workflow] Started workflow for session ${sessionId}, path: ${context.projectPath}\n`);

    // Send initial plan
    await this.sendPlan(sessionId, engine);

    // Check Node.js version compatibility before starting
    const currentStep = engine.getCurrentStep();
    if (currentStep?.version) {
      await this.checkNodeVersion(sessionId, currentStep.version, context.projectPath);
    }

    // Send introduction message
    await this.sendMessage(
      sessionId,
      `# 🚀 Step-by-Step Angular Migration Workflow

I'll guide you through upgrading from Angular ${options.currentVersion} to ${options.targetVersion}.

**Project Path:** \`${context.projectPath}\`

## Migration Approach

This workflow consists of **${ANGULAR_MIGRATION_WORKFLOW.length} steps** that will:

1. **Create backups** before each major change
2. **Upgrade incrementally** through each Angular version (14→15→16→17→18→19→20)
3. **Run validations** (build, lint, tests) after each step
4. **Request confirmation** before critical operations
5. **Support rollback** if any step fails

## Safety Features

✅ **Automatic backups** before major upgrades
✅ **Build validation** after each step  
✅ **Test execution** to catch regressions
✅ **User confirmation** for breaking changes
✅ **Rollback support** if needed

${options.skipTests ? '⚠️ **Tests will be skipped** (not recommended)\n' : ''}${
        options.skipLint ? '⚠️ **Linting will be skipped**\n' : ''
      }${options.autoConfirm ? '⚠️ **Auto-confirm enabled** - no prompts\n' : ''}

Ready to begin!

**Type "proceed" or "yes" to start the first step.**`
    );

    // Set awaiting confirmation to start
    session.awaitingConfirmation = {
      type: 'workflow-step',
    };
    
    process.stderr.write(`[Workflow] Workflow setup complete, awaiting user confirmation to start\n`);
  }

  /**
   * Handle user confirmation response
   */
  async handleConfirmation(sessionId: SessionId, confirmed: boolean): Promise<void> {
    process.stderr.write(`[Workflow] handleConfirmation called: ${confirmed}\n`);
    
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      process.stderr.write(`[Workflow] ERROR: No workflow found for confirmation\n`);
      throw new Error('No active workflow for session');
    }

    const { engine } = workflow;
    const currentStep = engine.getCurrentStep();

    if (!currentStep) {
      process.stderr.write(`[Workflow] No current step, workflow may be complete\n`);
      await this.sendMessage(sessionId, '✅ Migration workflow completed!');
      return;
    }

    if (!confirmed) {
      await this.sendMessage(
        sessionId,
        `❌ Step cancelled: ${currentStep.title}\n\nWorkflow paused. You can:\n1. Resume with "continue migration"\n2. Rollback with "rollback migration"\n3. Cancel with "cancel migration"`
      );
      return;
    }

    // User confirmed, proceed with step
    process.stderr.write(`[Workflow] User confirmed step ${currentStep.id}\n`);
    engine.confirmStep();
    
    // Clear awaiting confirmation state
    workflow.session.awaitingConfirmation = undefined;
    
    await this.executeCurrentStep(sessionId);
  }

  /**
   * Execute the current workflow step
   */
  private async executeCurrentStep(sessionId: SessionId): Promise<void> {
    process.stderr.write(`[Workflow] executeCurrentStep called for session ${sessionId}\n`);
    
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      process.stderr.write(`[Workflow] ERROR: No workflow found in executeCurrentStep\n`);
      return;
    }

    const { engine, executor } = workflow;
    const currentStep = engine.getCurrentStep();

    if (!currentStep) {
      process.stderr.write(`[Workflow] No current step, completing workflow\n`);
      await this.completeWorkflow(sessionId);
      return;
    }

    process.stderr.write(`[Workflow] Executing step: ${currentStep.id} (${currentStep.title})\n`);
    await this.sendThought(sessionId, `Starting: ${currentStep.title}`);

    // Check Node.js version compatibility before upgrade steps
    if (currentStep.version) {
      const workflow = this.workflows.get(sessionId);
      if (workflow) {
        await this.checkNodeVersion(sessionId, currentStep.version, workflow.projectPath);
      }
    }

    try {
      // Handle backup - either explicit backup step or steps that require backup
      if (currentStep.id === 'pre-migration-backup' || (currentStep.requiresBackup && currentStep.id !== 'pre-migration-backup')) {
        process.stderr.write(`[Workflow] Creating backup for step ${currentStep.id}\n`);
        
        await this.sendThought(sessionId, 'Creating backup...');
        const toolCall = await this.createToolCall(sessionId, 'Create Backup', 'execute', {});

        const backupPath = await executor.createBackup();
        process.stderr.write(`[Workflow] Backup created at: ${backupPath}\n`);

        await this.updateToolCall(sessionId, toolCall.toolCallId, {
          status: 'completed',
          rawOutput: { backupPath },
        });

        await this.sendMessage(sessionId, `✅ Backup created: ${backupPath}`);
      }
      
      process.stderr.write(`[Workflow] Step ${currentStep.id} has ${currentStep.actions.length} actions and ${currentStep.validations.length} validations\n`);

      // Execute all actions in the step
      for (const action of currentStep.actions) {
        await this.sendThought(sessionId, action.description);

        const toolCall = await this.createToolCall(
          sessionId,
          action.name,
          action.type === 'command' || action.type === 'schematic' ? 'execute' : 'search',
          {
            command: action.command,
            script: action.scriptPath,
          }
        );

        const result = await executor.executeAction(action);

        await this.updateToolCall(sessionId, toolCall.toolCallId, {
          status: result.success ? 'completed' : 'failed',
          rawOutput: {
            success: result.success,
            duration: result.duration,
            exitCode: result.exitCode,
          },
          content: [
            {
              type: 'content',
              content: {
                type: 'text',
                text: result.output || result.error || '',
              },
            },
          ],
        });

        if (!result.success) {
          // Try auto-fix for action errors (use LLM if patterns don't match)
          const errorText = result.error || '';
          
          process.stderr.write(`[Auto-Fix] Action failed: ${action.name}\n`);
          await this.sendMessage(sessionId, `🔧 **Action failed: ${action.name}**. Attempting auto-fix...`);
          
          // Create auto-fix action (will try patterns first, then LLM)
          const autoFixAction = {
            type: 'auto-fix' as const,
            name: `auto-fix-${action.name}`,
            errorPattern: errorText,
            description: `Automatic fix for ${action.name} errors`,
            continueOnError: false,
          };
          
          const autoFixResult = await executor.executeAction(autoFixAction);
          
          if (autoFixResult.success) {
            process.stderr.write(`[Auto-Fix] ✅ Fix applied for ${action.name}. Retrying action...\n`);
            await this.sendMessage(sessionId, `✅ **Fix applied**. Retrying ${action.name}...`);
            
            // Retry the original action
            const retryResult = await executor.executeAction(action);
            
            if (retryResult.success) {
              process.stderr.write(`[Auto-Fix] ✅ Action succeeded after auto-fix!\n`);
              await this.sendMessage(sessionId, `✅ **${action.name} succeeded** after auto-fix!`);
              // Continue to next action
              continue;
            } else {
              process.stderr.write(`[Auto-Fix] ❌ Action still failing after auto-fix\n`);
              await this.sendMessage(sessionId, `⚠️ **Action still failing** after auto-fix:\n\`\`\`\n${retryResult.error?.substring(0, 500)}\n\`\`\``);
              throw new Error(`Action failed: ${action.name}\n${retryResult.error}`);
            }
          } else {
            process.stderr.write(`[Auto-Fix] ❌ Auto-fix failed: ${autoFixResult.error}\n`);
            await this.sendMessage(sessionId, `⚠️ **Auto-fix failed:** ${autoFixResult.error}`);
          }
          
          throw new Error(`Action failed: ${action.name}\n${result.error}`);
        }
      }

      // Execute validations
      let allValidationsPassed = true;

      for (const validation of currentStep.validations) {
        await this.sendThought(sessionId, `🔍 ${validation.description}`);
        await this.sendThought(sessionId, `Running: ${validation.command || validation.scriptPath}`);

        const toolCall = await this.createToolCall(
          sessionId,
          validation.name,
          'validate',
          { type: validation.type }
        );

        let result = await executor.executeValidation(validation);
        
        // Send validation result to client
        if (result.success) {
          await this.sendThought(sessionId, `✅ ${validation.name}: PASSED`);
        } else {
          await this.sendThought(sessionId, `❌ ${validation.name}: FAILED`);
          
          // Send error output to client (first 1000 chars)
          if (result.error) {
            const errorPreview = result.error.substring(0, 1000);
            await this.sendMessage(sessionId, `**Error Output:**\n\`\`\`\n${errorPreview}${result.error.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\``);
          }
        }
        
        // Send output preview to client if available
        if (result.output && result.output.length > 100) {
          const outputPreview = result.output.substring(0, 500);
          await this.sendThought(sessionId, `Output: ${outputPreview}${result.output.length > 500 ? '... (see full log)' : ''}`);
        }

        // Auto-fix on error if enabled
        if (!result.success && validation.autoFixOnError) {
          process.stderr.write(`[Auto-Fix] Triggered for validation: ${validation.name}\n`);
          process.stderr.write(`[Auto-Fix] ===== FULL ERROR FOR AUTO-FIX =====\n`);
          process.stderr.write(result.error || 'No error message');
          process.stderr.write(`\n[Auto-Fix] ===== END ERROR =====\n`);
          
          await this.sendThought(sessionId, `Validation failed. Attempting automatic fix...`);
          await this.sendMessage(sessionId, `🔧 **Auto-fix triggered for ${validation.name}**`);
          
          // Create auto-fix action from validation error
          const autoFixAction = {
            type: 'auto-fix' as const,
            name: `auto-fix-${validation.name}`,
            errorPattern: result.error || '',
            description: `Automatic fix for ${validation.name} errors`,
            continueOnError: false,
          };

          const autoFixResult = await executor.executeAction(autoFixAction);
          
          if (autoFixResult.success) {
            process.stderr.write(`[Auto-Fix] ✅ Fix applied successfully for ${validation.name}\n`);
            await this.sendMessage(sessionId, `✅ **Auto-fix applied successfully**. Re-running validation...`);
            await this.sendThought(sessionId, `Fix details: ${autoFixResult.output || 'Pattern-based fix applied'}`);
            
            // Re-run validation after fix
            process.stderr.write(`[Auto-Fix] Re-running validation: ${validation.name}\n`);
            result = await executor.executeValidation(validation);
            
            if (result.success) {
              process.stderr.write(`[Auto-Fix] ✅ Validation passed after fix!\n`);
              await this.sendMessage(sessionId, `✅ **Validation now passing** after auto-fix!`);
            } else {
              process.stderr.write(`[Auto-Fix] ❌ Validation still failing after fix\n`);
              await this.sendMessage(sessionId, `⚠️ **Validation still failing** after auto-fix. Manual intervention may be needed.`);
              
              // Send the new error
              if (result.error) {
                const errorPreview = result.error.substring(0, 1000);
                await this.sendMessage(sessionId, `**Remaining Error:**\n\`\`\`\n${errorPreview}${result.error.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\``);
              }
            }
          } else {
            process.stderr.write(`[Auto-Fix] ❌ Fix failed: ${autoFixResult.error}\n`);
            await this.sendMessage(sessionId, `⚠️ **Auto-fix failed:** ${autoFixResult.error}`);
          }
        }

        await this.updateToolCall(sessionId, toolCall.toolCallId, {
          status: result.success ? 'completed' : 'failed',
          rawOutput: {
            success: result.success,
          },
          content: [
            {
              type: 'content',
              content: {
                type: 'text',
                text: result.output || result.error || '',
              },
            },
          ],
        });

        if (!result.success && validation.failOnError) {
          allValidationsPassed = false;
          throw new Error(`Validation failed: ${validation.name}\n${result.error}`);
        }
      }

      // Step completed successfully
      process.stderr.write(`[Workflow] Step ${currentStep.id} completed successfully\n`);
      
      await engine.advanceToNextStep();
      await this.sendPlan(sessionId, engine);

      const progress = engine.getProgress();
      process.stderr.write(`[Workflow] Progress: ${progress.current}/${progress.total} (${progress.percentage}%)\n`);
      
      await this.sendMessage(
        sessionId,
        `✅ **${currentStep.title}** completed!\n\nProgress: ${progress.current}/${progress.total} steps (${progress.percentage}%)`
      );

      // Small delay to ensure messages are sent
      await new Promise(resolve => setTimeout(resolve, 100));

      // Move to next step
      process.stderr.write(`[Workflow] Moving to next step after ${currentStep.id}\n`);
      await this.executeNextStep(sessionId);
    } catch (error) {
      // Step failed - use enhanced error messaging
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[Workflow] ERROR in step ${currentStep.id}: ${errorMessage}\n`);
      
      engine.markStepFailed(currentStep.id);
      await this.sendPlan(sessionId, engine);

      // Generate enhanced error message with agent recommendations
      const enhancedError = generateEnhancedErrorMessage(errorMessage);
      
      await this.sendMessage(
        sessionId,
        `${enhancedError}\n\n**Options:**\n1. Retry this step\n2. Rollback to previous backup\n3. Skip this step (not recommended)\n4. Cancel migration`
      );

      // Check if rollback is available
      if (currentStep.rollbackActions && currentStep.rollbackActions.length > 0) {
        await this.sendMessage(
          sessionId,
          `💡 **Rollback available** - I can restore from backup if needed.`
        );
      }
    }
  }

  /**
   * Execute the next step (handles confirmation if needed)
   */
  private async executeNextStep(sessionId: SessionId): Promise<void> {
    process.stderr.write(`[Workflow] executeNextStep called for session ${sessionId}\n`);
    
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      process.stderr.write(`[Workflow] ERROR: No workflow found for session ${sessionId}\n`);
      return;
    }

    const { engine } = workflow;
    const currentStep = engine.getCurrentStep();
    
    process.stderr.write(`[Workflow] Current step: ${currentStep ? currentStep.id : 'NULL'}\n`);

    if (!currentStep) {
      await this.completeWorkflow(sessionId);
      return;
    }

    // Check if step requires confirmation
    if (currentStep.requiresConfirmation) {
      process.stderr.write(`[Workflow] Step ${currentStep.id} requires confirmation\n`);
      const confirmationMessage = engine.getConfirmationMessage();
      if (confirmationMessage) {
        await this.sendMessage(sessionId, confirmationMessage);
        // Set session to await confirmation
        workflow.session.awaitingConfirmation = {
          type: 'workflow-step',
        };
        process.stderr.write(`[Workflow] Awaiting user confirmation for step ${currentStep.id}\n`);
        // Wait for user response (will be handled by handleConfirmation)
        return;
      }
    }

    // No confirmation needed, execute immediately
    process.stderr.write(`[Workflow] No confirmation needed, executing step ${currentStep.id} immediately\n`);
    await this.executeCurrentStep(sessionId);
  }

  /**
   * Complete the workflow
   */
  private async completeWorkflow(sessionId: SessionId): Promise<void> {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return;

    const { engine } = workflow;
    const progress = engine.getProgress();

    await this.sendMessage(
      sessionId,
      `# 🎉 Migration Complete!

**Successfully completed ${progress.current}/${progress.total} steps**

## Summary

Your Angular project has been upgraded from version 14 to version 20!

### What Changed

✅ **Angular Core & CLI** - Updated to version 20
✅ **Angular Material** - Updated to version 20 (Material 3)
✅ **Standalone Components** - All components converted
✅ **Control Flow Syntax** - Migrated to \`@if\`, \`@for\`, \`@switch\`
✅ **Build & Tests** - Validated after each step

### Next Steps

1. **Review Changes**
   \`\`\`bash
   git diff
   \`\`\`

2. **Manual Testing**
   - Test all critical features
   - Verify UI components render correctly
   - Check for console errors

3. **Optional Enhancements**
   - Convert more \`@Input/@Output\` to signals
   - Implement zoneless change detection
   - Optimize with OnPush strategy

4. **Commit Changes**
   \`\`\`bash
   git add .
   git commit -m "chore: migrate from Angular 14 to 20"
   \`\`\`

A detailed migration report has been generated in your project directory.

**Need help?** Just ask!`
    );

    // Clean up workflow
    this.workflows.delete(sessionId);
  }

  /**
   * Rollback to previous backup
   */
  async rollback(sessionId: SessionId): Promise<void> {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      throw new Error('No active workflow for session');
    }

    const { engine, executor } = workflow;
    const state = engine.getState();

    if (!state.backupPath) {
      await this.sendMessage(sessionId, '❌ No backup available for rollback');
      return;
    }

    await this.sendThought(sessionId, `Rolling back to backup: ${state.backupPath}`);

    const toolCall = await this.createToolCall(sessionId, 'Rollback', 'execute', {
      backup: state.backupPath,
    });

    try {
      await executor.restoreBackup(state.backupPath);

      await this.updateToolCall(sessionId, toolCall.toolCallId, {
        status: 'completed',
      });

      await this.sendMessage(
        sessionId,
        `✅ Successfully rolled back to backup\n\nProject restored to state from: ${state.backupPath}`
      );

      // Clear workflow
      this.workflows.delete(sessionId);
    } catch (error) {
      await this.updateToolCall(sessionId, toolCall.toolCallId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });

      await this.sendMessage(sessionId, `❌ Rollback failed: ${error}`);
    }
  }

  // Helper methods for ACP communication
  private async sendMessage(sessionId: SessionId, text: string): Promise<void> {
    this.transport.sendNotification('session/update', {
      sessionId,
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: {
          type: 'text',
          text,
        },
      },
    });
    // Ensure notification is written
    await this.transport.flush();
  }

  private async sendThought(sessionId: SessionId, text: string): Promise<void> {
    this.transport.sendNotification('session/update', {
      sessionId,
      update: {
        sessionUpdate: 'agent_thought_chunk',
        content: {
          type: 'text',
          text,
        },
      },
    });
    // Ensure notification is written
    await this.transport.flush();
  }

  private async sendPlan(sessionId: SessionId, engine: WorkflowEngine): Promise<void> {
    this.transport.sendNotification('session/update', {
      sessionId,
      update: {
        sessionUpdate: 'plan',
        plan: engine.getPlan(),
      },
    });
    // Ensure notification is written
    await this.transport.flush();
  }

  /**
   * Detect current Angular version from package.json
   */
  private async detectAngularVersion(projectPath: string): Promise<string> {
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      // Check both dependencies and devDependencies
      const deps = packageJson.dependencies || {};
      const devDeps = packageJson.devDependencies || {};
      const coreVersion = deps['@angular/core'] || devDeps['@angular/core'];

      if (coreVersion) {
        // Extract major version number (e.g., "^14.0.0" -> "14")
        const match = coreVersion.match(/(\d+)\./);
        if (match) {
          return match[1];
        }
      }
    } catch (error) {
      // If detection fails, default to 14
      console.error('[Handler] Failed to detect Angular version:', error);
    }
    return '14'; // Default to v14 if detection fails
  }

  /**
   * Find the appropriate starting step based on current Angular version
   */
  private findStartingStep(currentVersion: string): string | null {
    const version = parseInt(currentVersion, 10);
    
    // Map current version to appropriate starting step
    switch (version) {
      case 14:
        return null; // Start from beginning
      case 15:
        return 'migrate-standalone'; // Skip v15 upgrade, do standalone migration
      case 16:
        return 'upgrade-v17'; // Skip to v17 upgrade
      case 17:
        return 'migrate-control-flow'; // Do control flow migration
      case 18:
        return 'upgrade-v19'; // Skip to v19 upgrade
      case 19:
        return 'upgrade-v20'; // Final upgrade
      default:
        return null; // Unknown version, start from beginning
    }
  }

  /**
   * Check Node.js version compatibility and offer to switch if needed
   */
  private async checkNodeVersion(
    sessionId: SessionId,
    angularVersion: string,
    projectPath: string
  ): Promise<void> {
    // Official Angular Node.js requirements
    // Source: https://angular.dev/reference/versions
    const nodeRequirements: Record<string, string> = {
      '14': '14.20.0-14.999.999,16.14.0-16.999.999,18.10.0-18.999.999',
      '15': '14.20.0-14.999.999,16.14.0-16.999.999,18.10.0-18.999.999',
      '16': '16.14.0-16.999.999,18.10.0-18.999.999',
      '17': '18.13.0-18.999.999,20.9.0-20.999.999',
      '18': '18.19.0-18.999.999,20.11.0-20.999.999',
      '19': '18.19.0-18.999.999,20.11.0-20.999.999,22.0.0-22.999.999',
      '20': '20.11.0-20.999.999,22.0.0-22.999.999',
    };

    const requiredVersions = nodeRequirements[angularVersion];
    if (!requiredVersions) {
      return; // No requirement defined
    }

    try {
      const validation = await validateNodeVersion(requiredVersions);
      
      if (validation.isCompatible) {
        await this.sendMessage(sessionId, validation.message);
        return;
      }

      // Not compatible - show warning and offer solutions
      await this.sendMessage(
        sessionId,
        `## ⚠️ Node.js Version Incompatibility\n\n${validation.message}\n\nAngular ${angularVersion} requires Node.js ${requiredVersions}`
      );

      if (validation.suggestedAction === 'switch' && validation.installedCompatibleVersion) {
        await this.sendMessage(
          sessionId,
          `\n� Automatically switching to Node.js ${validation.installedCompatibleVersion} using NVM...`
        );
        
        const switched = await switchNodeVersion(validation.installedCompatibleVersion);
        if (switched) {
          await this.sendMessage(
            sessionId,
            `✅ Successfully switched to Node.js ${validation.installedCompatibleVersion}\n\nProceeding with migration...`
          );
        } else {
          await this.sendMessage(
            sessionId,
            `❌ Failed to switch Node version automatically.\n\nPlease manually run:\n\`\`\`bash\nnvm use ${validation.installedCompatibleVersion}\n\`\`\`\n\nThen restart the migration.`
          );
          throw new Error(`Failed to switch to Node.js ${validation.installedCompatibleVersion}`);
        }
      } else if (validation.suggestedAction === 'install' && validation.recommendedVersion) {
        await this.sendMessage(
          sessionId,
          `\n📦 Node.js ${validation.recommendedVersion} is not installed.\n\nInstalling automatically using NVM...`
        );
        
        const installed = await installNodeVersion(validation.recommendedVersion);
        if (installed) {
          await this.sendMessage(
            sessionId,
            `✅ Successfully installed Node.js ${validation.recommendedVersion}\n\nSwitching to new version...`
          );
          
          const switched = await switchNodeVersion(validation.recommendedVersion);
          if (switched) {
            await this.sendMessage(
              sessionId,
              `✅ Now using Node.js ${validation.recommendedVersion}\n\nProceeding with migration...`
            );
          } else {
            await this.sendMessage(
              sessionId,
              `❌ Installed but failed to switch.\n\nPlease manually run:\n\`\`\`bash\nnvm use ${validation.recommendedVersion}\n\`\`\`\n\nThen restart the migration.`
            );
            throw new Error(`Failed to switch to Node.js ${validation.recommendedVersion}`);
          }
        } else {
          await this.sendMessage(
            sessionId,
            `❌ Failed to install Node.js ${validation.recommendedVersion}.\n\nPlease manually run:\n\`\`\`bash\nnvm install ${validation.recommendedVersion}\nnvm use ${validation.recommendedVersion}\n\`\`\`\n\nThen restart the migration.`
          );
          throw new Error(`Failed to install Node.js ${validation.recommendedVersion}`);
        }
      } else {
        await this.sendMessage(
          sessionId,
          `\n⚠️ NVM is not available. Please manually install and switch to a compatible Node.js version:\n\n**Compatible versions:** ${requiredVersions}\n\n**Recommended:** ${validation.recommendedVersion || '18.19.0'}\n\nAfter switching Node versions, restart the migration.`
        );
        throw new Error('Incompatible Node.js version and NVM not available');
      }
    } catch (error) {
      await this.sendMessage(
        sessionId,
        `⚠️ Failed to check Node.js version: ${error}\n\nPlease ensure you have Node.js ${requiredVersions} installed.`
      );
    }
  }

  private async createToolCall(
    sessionId: SessionId,
    title: string,
    kind: 'execute' | 'search' | 'validate',
    input: Record<string, unknown>
  ): Promise<{ toolCallId: string }> {
    const toolCallId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.transport.sendNotification('session/update', {
      sessionId,
      update: {
        sessionUpdate: 'tool_call',
        toolCall: {
          toolCallId,
          title,
          kind,
          status: 'in_progress',
          rawInput: input,
          content: [],
          locations: [],
        },
      },
    });

    // Ensure notification is written
    await this.transport.flush();

    return { toolCallId };
  }

  private async updateToolCall(
    sessionId: SessionId,
    toolCallId: string,
    update: {
      status?: 'in_progress' | 'completed' | 'failed';
      rawOutput?: unknown;
      content?: unknown[];
      error?: string;
    }
  ): Promise<void> {
    this.transport.sendNotification('session/update', {
      sessionId,
      update: {
        sessionUpdate: 'tool_call_update',
        update: {
          toolCallId,
          ...update,
        },
      },
    });
    
    // Ensure notification is written
    await this.transport.flush();
  }
}

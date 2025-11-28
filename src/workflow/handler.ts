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

export class WorkflowMigrationHandler {
  private workflows = new Map<SessionId, { 
    engine: WorkflowEngine; 
    executor: WorkflowExecutor;
    session: SessionState;
  }>();

  constructor(private transport: JsonRpcTransport) {}

  /**
   * Start a new step-by-step migration workflow
   */
  async startWorkflow(
    sessionId: SessionId,
    session: SessionState,
    options: {
      currentVersion: string;
      targetVersion: string;
      skipTests?: boolean;
      skipLint?: boolean;
      autoConfirm?: boolean;
      customFolder?: string | null;
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
    
    const context: WorkflowContext = {
      sessionId,
      projectPath,
      currentVersion: options.currentVersion,
      targetVersion: options.targetVersion,
      skipTests: options.skipTests,
      skipLint: options.skipLint,
      autoConfirm: options.autoConfirm,
    };

    const engine = new WorkflowEngine(ANGULAR_MIGRATION_WORKFLOW, context);
    const executor = new WorkflowExecutor(engine, context);

    this.workflows.set(sessionId, { engine, executor, session });

    process.stderr.write(`[Workflow] Started workflow for session ${sessionId}, path: ${context.projectPath}\n`);

    // Send initial plan
    await this.sendPlan(sessionId, engine);

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
          throw new Error(`Action failed: ${action.name}\n${result.error}`);
        }
      }

      // Execute validations
      let allValidationsPassed = true;

      for (const validation of currentStep.validations) {
        await this.sendThought(sessionId, validation.description);

        const toolCall = await this.createToolCall(
          sessionId,
          validation.name,
          'validate',
          { type: validation.type }
        );

        const result = await executor.executeValidation(validation);

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
      // Step failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[Workflow] ERROR in step ${currentStep.id}: ${errorMessage}\n`);
      
      engine.markStepFailed(currentStep.id);
      await this.sendPlan(sessionId, engine);

      await this.sendMessage(
        sessionId,
        `❌ **Step failed:** ${currentStep.title}\n\n**Error:** ${errorMessage}\n\n**Options:**\n1. Retry this step\n2. Rollback to previous backup\n3. Skip this step (not recommended)\n4. Cancel migration`
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

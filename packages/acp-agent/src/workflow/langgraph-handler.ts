/**
 * LangGraph Workflow Handler for ACP Integration
 *
 * This handler integrates the LangGraph workflow with Zed's ACP transport layer.
 * It manages the communication between the workflow state machine and the Zed IDE.
 */

import type { SessionId, SessionNotification, TextContent } from '../types/acp.js';
import type { WorkflowContext } from '@angular-migration/workflow-engine';
import { ANGULAR_MIGRATION_WORKFLOW, StateManager } from '@angular-migration/workflow-engine';
import { streamMigrationWorkflow } from './langgraph/graph.js';
import { StateHelpers, type MigrationState } from './langgraph/state.js';

/**
 * Minimal transport interface for sending messages to Zed
 * In a real implementation, this would use the full ACP protocol
 */
export interface ACPTransport {
  sendThought(sessionId: SessionId, message: string): Promise<void>;
  sendMessage(sessionId: SessionId, message: string): Promise<void>;
}

export class LangGraphWorkflowHandler {
  private stateManager: StateManager;

  constructor(
    private transport: ACPTransport,
    private projectPath: string
  ) {
    this.stateManager = new StateManager(projectPath);
  }

  /**
   * Execute the migration workflow with ACP integration
   *
   * This is what gets called when the user starts a migration in Zed.
   */
  async handleMigrationWorkflow(
    sessionId: SessionId,
    context: WorkflowContext
  ): Promise<void> {
    try {
      // Send initial message to user in Zed
      await this.sendMessage(
        sessionId,
        `🚀 Starting Angular migration: v${context.currentVersion} → v${context.targetVersion}`
      );

      // Create initial state
      const initialState = StateHelpers.createInitialState(context);

      // Stream workflow execution with real-time updates
      for await (const state of streamMigrationWorkflow(
        ANGULAR_MIGRATION_WORKFLOW,
        initialState
      )) {
        // Update progress in Zed
        await this.updateProgress(sessionId, state);

        // Handle user confirmations
        if (state.pendingConfirmation) {
          const approved = await this.requestConfirmation(
            sessionId,
            state.pendingConfirmation.stepId,
            state.pendingConfirmation.message
          );

          // Update state with user response
          state.userResponse = approved ? 'yes' : 'no';
        }

        // Report errors
        if (state.lastError && !state.shouldRetry) {
          await this.reportError(sessionId, state);
        }

        // Show retry attempts
        if (state.shouldRetry && state.currentStepData) {
          await this.reportRetry(sessionId, state.currentStepData);
        }

        // Show rollback
        if (state.shouldRollback) {
          await this.reportRollback(sessionId, state);
        }

        // Check for completion
        if (state.isComplete) {
          await this.sendCompletion(sessionId, state);
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.sendMessage(
        sessionId,
        `❌ Migration failed: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Send progress update to Zed
   *
   * This appears as a "thought" in the Zed chat window
   */
  private async updateProgress(
    sessionId: SessionId,
    state: MigrationState
  ): Promise<void> {
    const progress = StateHelpers.getProgress(
      state,
      ANGULAR_MIGRATION_WORKFLOW.length
    );

    const currentStep = ANGULAR_MIGRATION_WORKFLOW[state.currentStepIndex];

    if (!currentStep) {
      return;
    }

    // Create progress bar
    const barWidth = 20;
    const filledWidth = Math.round((progress.percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);

    // Send thought to Zed (appears as assistant thinking)
    await this.sendThought(
      sessionId,
      `\n📊 **Migration Progress: ${progress.percentage}%** (${progress.current}/${progress.total})\n${bar}\n\n▶️  **Current Step:** ${currentStep.title}${currentStep.version ? ` (Angular v${currentStep.version})` : ''}`
    );
  }

  /**
   * Request user confirmation in Zed
   *
   * This sends a message to the user and waits for their response
   */
  private async requestConfirmation(
    sessionId: SessionId,
    stepId: string,
    message: string
  ): Promise<boolean> {
    // Format the confirmation message for Zed
    const formattedMessage = `
⏸️  **Confirmation Required**

${message}

**Options:**
- Reply **"yes"** or **"y"** to proceed
- Reply **"no"** or **"n"** to skip this step
- Reply **"abort"** to cancel the migration

What would you like to do?
`;

    // Send message to user in Zed
    await this.sendMessage(sessionId, formattedMessage);

    // In actual implementation, this would wait for user response
    // via the ACP transport's message handling
    // For now, we'll return true (auto-confirm)
    // The real implementation would:
    // 1. Set a flag that we're waiting for user input
    // 2. Return a promise that resolves when user responds
    // 3. Parse the user's response and return boolean

    return true; // TODO: Implement actual user response handling
  }

  /**
   * Report error to user in Zed
   */
  private async reportError(
    sessionId: SessionId,
    state: MigrationState
  ): Promise<void> {
    const currentStep = ANGULAR_MIGRATION_WORKFLOW[state.currentStepIndex];

    await this.sendMessage(
      sessionId,
      `❌ **Step Failed:** ${currentStep?.title}\n\n**Error:** ${state.lastError}\n\n${
        state.shouldRollback
          ? '🔙 Rolling back changes...'
          : '⏭️  Continuing to next step...'
      }`
    );
  }

  /**
   * Report retry attempt to user in Zed
   */
  private async reportRetry(
    sessionId: SessionId,
    stepData: NonNullable<MigrationState['currentStepData']>
  ): Promise<void> {
    const currentStep = ANGULAR_MIGRATION_WORKFLOW.find(
      (s) => s.id === stepData.stepId
    );

    const maxAttempts = currentStep?.retry?.maxAttempts || 1;

    await this.sendThought(
      sessionId,
      `🔄 **Retrying:** ${currentStep?.title}\n\n**Attempt:** ${stepData.retryCount + 1}/${maxAttempts}\n**Reason:** ${stepData.lastError || 'Unknown error'}`
    );
  }

  /**
   * Report rollback to user in Zed
   */
  private async reportRollback(
    sessionId: SessionId,
    state: MigrationState
  ): Promise<void> {
    const currentStep = ANGULAR_MIGRATION_WORKFLOW[state.currentStepIndex];

    await this.sendMessage(
      sessionId,
      `🔙 **Rolling Back:** ${currentStep?.title}\n\nRestoring previous state...`
    );
  }

  /**
   * Send completion message to user in Zed
   */
  private async sendCompletion(
    sessionId: SessionId,
    state: MigrationState
  ): Promise<void> {
    const hasFailures = state.failedSteps.length > 0;

    const message = `
${hasFailures ? '⚠️' : '✅'} **Migration ${hasFailures ? 'Completed with Issues' : 'Complete'}!**

**Summary:**
- ✅ Completed: ${state.completedSteps.length} steps
- ❌ Failed: ${state.failedSteps.length} steps
- ⏱️  Duration: ${this.calculateDuration(state.startedAt)}

${
  state.failedSteps.length > 0
    ? `\n**Failed Steps:**\n${state.failedSteps.map((s) => `  - ${s}`).join('\n')}`
    : ''
}

${
  hasFailures
    ? '\n⚠️  **Note:** Some steps failed. Please review the errors above and manually fix any issues.'
    : '\n🎉 **Success!** Your Angular project has been successfully migrated.'
}
`;

    await this.sendMessage(sessionId, message);
  }

  /**
   * Send a thought message (appears as assistant thinking in Zed)
   */
  private async sendThought(
    sessionId: SessionId,
    message: string
  ): Promise<void> {
    await this.transport.sendThought(sessionId, message);
  }

  /**
   * Send a regular message to user (appears as assistant response in Zed)
   */
  private async sendMessage(
    sessionId: SessionId,
    message: string
  ): Promise<void> {
    await this.transport.sendMessage(sessionId, message);
  }

  /**
   * Calculate duration from start time
   */
  private calculateDuration(startTime: Date): string {
    const duration = Date.now() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}

/**
 * Example usage in main handler
 *
 * This shows how to use the LangGraph handler in your main ACP handler
 */
export async function handleMigrationWithLangGraph(
  transport: ACPTransport,
  sessionId: SessionId,
  context: WorkflowContext
): Promise<void> {
  const handler = new LangGraphWorkflowHandler(transport, context.projectPath);
  await handler.handleMigrationWorkflow(sessionId, context);
}

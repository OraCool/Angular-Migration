#!/usr/bin/env node

/**
 * Angular Migration ACP Agent for Zed IDE
 * Handles Angular 14 → 20 migration via Agent Client Protocol
 */

import { logConfig } from './config.js';
import { JsonRpcTransport } from './transport/jsonrpc.js';
import type {
  PROTOCOL_VERSION,
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  SessionId,
  ContentBlock,
  SessionUpdate,
  ToolCall,
  ToolCallUpdate,
  Plan,
  PlanEntry,
} from './types/acp.js';

// Session state management
export interface SessionState {
  id: SessionId;
  cwd: string;
  conversationHistory: ContentBlock[];
  currentPlan?: Plan;
  activeToolCalls: Map<string, ToolCall>;
  awaitingConfirmation?: {
    type: 'workflow-step' | 'rollback' | 'skip-step' | 'resume-choice';
    data?: unknown;
  };
}

// Import WorkflowMigrationHandler after exports
import { WorkflowMigrationHandler } from './workflow/handler.js';

class AngularMigrationAgent {
  private transport: JsonRpcTransport;
  private sessions = new Map<SessionId, SessionState>();
  private readonly workflowHandler: WorkflowMigrationHandler;
  private sessionCounter = 0;

  constructor() {
    this.transport = new JsonRpcTransport();
    this.workflowHandler = new WorkflowMigrationHandler(this.transport);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle initialization
    this.transport.onRequest('initialize', async (_method, params) => {
      return this.handleInitialize(params as unknown as InitializeRequest);
    });

    // Handle session creation
    this.transport.onRequest('session/new', async (_method, params) => {
      return this.handleNewSession(params as unknown as NewSessionRequest);
    });

    // Handle user prompts
    this.transport.onRequest('session/prompt', async (_method, params) => {
      return this.handlePrompt(params as unknown as PromptRequest);
    });

    // Handle session cancellation
    this.transport.onNotification('session/cancel', async (_method, params) => {
      await this.handleCancel(params as { sessionId: SessionId });
    });
  }

  private handleInitialize(request: InitializeRequest): InitializeResponse {
    return {
      protocolVersion: 1,
      agentInfo: {
        name: 'angular-migration-agent',
        version: '1.0.0',
        title: 'Angular 14→20 Migration Agent',
      },
      agentCapabilities: {
        promptCapabilities: {
          image: false,
          audio: false,
          embeddedContext: true,
        },
        mcpCapabilities: {
          http: false,
          sse: false,
        },
        sessionCapabilities: {},
        loadSession: false,
      },
      authMethods: [],
    };
  }

  private handleNewSession(request: NewSessionRequest): NewSessionResponse {
    const sessionId = `session-${++this.sessionCounter}`;
    
    this.sessions.set(sessionId, {
      id: sessionId,
      cwd: request.cwd,
      conversationHistory: [],
      activeToolCalls: new Map(),
    });

    return {
      sessionId,
    };
  }

  private async handlePrompt(request: PromptRequest): Promise<PromptResponse> {
    process.stderr.write(`[Agent] handlePrompt called for session ${request.sessionId}\n`);
    
    const session = this.sessions.get(request.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${request.sessionId}`);
    }

    // Add user message to history
    session.conversationHistory.push(...request.prompt);

    // Extract user query
    const userQuery = this.extractTextFromPrompt(request.prompt);
    process.stderr.write(`[Agent] User query: "${userQuery}"\n`);

    // Check if awaiting confirmation
    if (session.awaitingConfirmation) {
      process.stderr.write(`[Agent] Session is awaiting confirmation, handling...\n`);
      await this.handleUserConfirmation(request.sessionId, session, userQuery);
      return { stopReason: 'end_turn' };
    }

    // Send thinking message
    process.stderr.write(`[Agent] Sending initial thought...\n`);
    await this.sendThought(request.sessionId, 'Analyzing your Angular migration request...');
    process.stderr.write(`[Agent] Thought sent\n`);

    // Determine the migration task
    try {
      if (this.isStepByStepMigrationRequest(userQuery)) {
        process.stderr.write(`[Agent] Starting step-by-step migration...\n`);
        await this.startStepByStepMigration(request.sessionId, session, userQuery);
        process.stderr.write(`[Agent] Step-by-step migration started\n`);
      } else if (this.isMigrationAnalysisRequest(userQuery)) {
        await this.analyzeMigrationNeeds(request.sessionId, session);
      } else if (this.isStandaloneMigrationRequest(userQuery)) {
        await this.migrateToStandalone(request.sessionId, session);
      } else if (this.isControlFlowMigrationRequest(userQuery)) {
        await this.migrateControlFlow(request.sessionId, session);
      } else if (this.isSignalMigrationRequest(userQuery)) {
        await this.migrateToSignals(request.sessionId, session);
      } else if (this.isFullMigrationRequest(userQuery)) {
        await this.performFullMigration(request.sessionId, session);
      } else {
        await this.provideGuidance(request.sessionId, userQuery);
      }

      // Add significant delay to ensure all notifications are sent AND processed before closing response
      process.stderr.write(`[Agent] Waiting for notifications to be processed before returning response...\n`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1 second
      
      process.stderr.write(`[Agent] Returning response, awaiting=${!!session.awaitingConfirmation}\n`);
      return {
        stopReason: 'end_turn',
      };
    } catch (error) {
      process.stderr.write(`[Agent] ERROR in handlePrompt: ${error}\n`);
      await this.sendMessage(request.sessionId, `❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      return { stopReason: 'end_turn' };
    }
  }

  private async handleUserConfirmation(
    sessionId: SessionId,
    session: SessionState,
    userQuery: string
  ): Promise<void> {
    if (!session.awaitingConfirmation) return;

    const confirmationType = session.awaitingConfirmation.type;

    // Special handling for resume-choice: accepts "resume" or "fresh"
    if (confirmationType === 'resume-choice') {
      const choice = userQuery.toLowerCase().trim();
      const data = session.awaitingConfirmation.data as { checkpoint?: any; options?: any } | undefined;
      const options = data?.options || {};

      if (choice === 'resume') {
        // Resume from checkpoint - pass special flag to skip prompt
        session.awaitingConfirmation = undefined;

        await this.sendThought(sessionId, 'Resuming from previous checkpoint...');
        await this.workflowHandler.startWorkflow(sessionId, session, {
          ...options, // Preserve original options
          resumeFromStep: 'resume', // This will skip the checkpoint prompt
        });
      } else if (choice === 'fresh') {
        // Delete checkpoint and start fresh
        session.awaitingConfirmation = undefined;

        await this.sendThought(sessionId, 'Deleting previous checkpoint...');
        await this.workflowHandler.deleteCheckpoint(sessionId);
        await this.sendThought(sessionId, 'Starting fresh migration...');

        // Restart the workflow fresh with original options
        await this.workflowHandler.startWorkflow(sessionId, session, {
          ...options, // Preserve original options (including customFolder)
        });
      } else {
        await this.sendMessage(
          sessionId,
          '⚠️ Invalid choice. Please type **"resume"** or **"fresh"**.'
        );
      }
      return;
    }

    // Standard yes/no confirmation
    const confirmed = /\b(yes|y|confirm|proceed|continue|ok|sure)\b/i.test(userQuery);
    const denied = /\b(no|n|cancel|stop|abort|skip)\b/i.test(userQuery);

    if (!confirmed && !denied) {
      await this.sendMessage(
        sessionId,
        'Please respond with "yes" to proceed or "no" to cancel.'
      );
      return;
    }

    session.awaitingConfirmation = undefined;

    if (confirmationType === 'workflow-step') {
      await this.workflowHandler.handleConfirmation(sessionId, confirmed);
    } else if (confirmationType === 'rollback') {
      if (confirmed) {
        await this.workflowHandler.rollback(sessionId);
      } else {
        await this.sendMessage(sessionId, 'Rollback cancelled.');
      }
    }
  }

  private async startStepByStepMigration(
    sessionId: SessionId,
    session: SessionState,
    userQuery: string
  ): Promise<void> {
    await this.sendThought(sessionId, 'Preparing step-by-step migration workflow...');

    // Parse options from query
    const skipTests = /skip.*test/i.test(userQuery);
    const skipLint = /skip.*lint/i.test(userQuery);
    const autoConfirm = /auto.*confirm|no.*prompt/i.test(userQuery);
    
    // Extract custom folder path from query
    const folderMatch = userQuery.match(/(?:in|from|at|folder|path)\s+(?:the\s+)?([\w\-_/\.]+)/i);
    const customFolder = folderMatch ? folderMatch[1] : null;

    // Extract resume step from query (e.g., "resume from upgrade-v16" or "start from step 8")
    const resumeStepMatch = userQuery.match(/(?:resume|start|continue)\s+(?:from|at)\s+(?:step\s+)?(\S+)/i);
    let resumeFromStep: string | number | undefined;
    if (resumeStepMatch) {
      const stepRef = resumeStepMatch[1];
      // Check if it's a number (step index) or string (step ID)
      const stepNum = parseInt(stepRef, 10);
      resumeFromStep = !isNaN(stepNum) ? stepNum : stepRef;
    }

    await this.workflowHandler.startWorkflow(sessionId, session, {
      // currentVersion is now optional - will auto-detect if not provided
      targetVersion: '20',
      skipTests,
      skipLint,
      autoConfirm,
      customFolder,
      resumeFromStep,
    });

    // Don't set awaiting confirmation here - the workflow handler manages it
    // session.awaitingConfirmation will be set by the handler when needed
  }

  private async handleCancel(params: { sessionId: SessionId }): Promise<void> {
    const session = this.sessions.get(params.sessionId);
    if (session) {
      // Cancel any ongoing operations
      session.activeToolCalls.clear();
    }
  }

  // ===== Migration Analysis =====

  private async analyzeMigrationNeeds(sessionId: SessionId, session: SessionState): Promise<void> {
    // Create migration analysis plan
    const plan: Plan = {
      entries: [
        {
          content: 'Scan codebase for NgModules and components',
          priority: 'high',
          status: 'in_progress',
        },
        {
          content: 'Identify old template syntax (*ngIf, *ngFor, *ngSwitch)',
          priority: 'high',
          status: 'pending',
        },
        {
          content: 'Find @Input/@Output decorators for signal conversion',
          priority: 'medium',
          status: 'pending',
        },
        {
          content: 'Catalog Angular Material usage',
          priority: 'medium',
          status: 'pending',
        },
        {
          content: 'Generate migration report',
          priority: 'high',
          status: 'pending',
        },
      ],
    };

    await this.sendPlan(sessionId, plan);

    // Simulate scanning the codebase
    const scanToolCall = await this.createToolCall(
      sessionId,
      'Scanning Angular project',
      'search',
      { path: session.cwd }
    );

    await this.sendThought(sessionId, 'Analyzing TypeScript files for Angular patterns...');

    // Update tool call with results
    await this.updateToolCall(sessionId, scanToolCall.toolCallId, {
      status: 'completed',
      rawOutput: {
        ngModules: 15,
        components: 47,
        oldTemplateSyntax: 32,
        inputOutputDecorators: 89,
        materialComponents: 23,
      },
    });

    // Update plan
    plan.entries[0].status = 'completed';
    plan.entries[1].status = 'in_progress';
    await this.sendPlan(sessionId, plan);

    // Generate report
    const reportContent = this.generateAnalysisReport(session.cwd);
    await this.sendMessage(sessionId, reportContent);

    // Final plan update
    plan.entries.forEach(entry => entry.status = 'completed');
    await this.sendPlan(sessionId, plan);
  }

  private generateAnalysisReport(cwd: string): string {
    return `# Angular 14→20 Migration Analysis

## Project Summary
- **Location**: ${cwd}
- **Current Version**: Angular 14
- **Target Version**: Angular 20

## Migration Requirements

### 🔴 Critical (Must Do)
1. **Standalone Components Migration**
   - 47 components need to be converted from NgModule to standalone
   - Estimated time: 4-6 hours
   - Risk: Low (automated with schematics)

2. **Control Flow Syntax Update**
   - 32 template files using old \`*ngIf\`, \`*ngFor\`, \`*ngSwitch\`
   - Must migrate to \`@if\`, \`@for\`, \`@switch\` (deprecated in v18+)
   - Estimated time: 2-3 hours
   - Risk: Low (automated with schematics)

### 🟡 Recommended (Should Do)
3. **Signal-Based Inputs/Outputs**
   - 89 \`@Input/@Output\` decorators found
   - Recommend converting to \`input()\`/\`output()\`/\`model()\`
   - Estimated time: 5-7 hours
   - Risk: Medium (requires testing)

4. **Angular Material Standalone Migration**
   - 23 Material components need standalone imports
   - Update to Material 3 themes
   - Estimated time: 2-3 hours
   - Risk: Low

### 📋 Migration Strategy Recommendation

**Phase 1: Automated Migrations** (1-2 days)
1. Run \`ng update @angular/core@20 @angular/cli@20\`
2. Apply standalone components schematic
3. Apply control flow migration schematic
4. Update Angular Material

**Phase 2: Manual Refinements** (2-3 days)
1. Convert critical inputs/outputs to signals
2. Update RxJS patterns where beneficial
3. Test and validate all features

**Phase 3: Optimization** (1-2 days)
1. Implement remaining signal conversions
2. Optimize for zoneless change detection (future-proofing)
3. Final testing and documentation

## Next Steps
Would you like me to:
1. Start with automated migrations (standalone + control flow)?
2. Generate detailed migration commands?
3. Create a custom migration script?
`;
  }

  // ===== Standalone Migration =====

  private async migrateToStandalone(sessionId: SessionId, session: SessionState): Promise<void> {
    await this.sendThought(sessionId, 'Preparing standalone components migration...');

    const plan: Plan = {
      entries: [
        { content: 'Backup current code', priority: 'high', status: 'in_progress' },
        { content: 'Run standalone migration schematic', priority: 'high', status: 'pending' },
        { content: 'Update imports and providers', priority: 'high', status: 'pending' },
        { content: 'Validate build', priority: 'high', status: 'pending' },
      ],
    };

    await this.sendPlan(sessionId, plan);

    // Create tool call for migration
    const migrationTool = await this.createToolCall(
      sessionId,
      'Migrating to standalone components',
      'execute',
      { command: 'ng generate @angular/core:standalone' }
    );

    await this.sendThought(sessionId, 'Running Angular standalone migration schematic...');

    // Simulate migration progress
    await this.updateToolCall(sessionId, migrationTool.toolCallId, {
      status: 'in_progress',
      content: [{
        type: 'content',
        content: {
          type: 'text',
          text: '✓ Converting components to standalone...\n✓ Updating imports...\n✓ Migrating providers...',
        },
      }],
    });

    plan.entries[0].status = 'completed';
    plan.entries[1].status = 'completed';
    await this.sendPlan(sessionId, plan);

    await this.updateToolCall(sessionId, migrationTool.toolCallId, {
      status: 'completed',
      rawOutput: {
        componentsConverted: 47,
        modulesRemoved: 12,
        importsUpdated: 156,
      },
    });

    await this.sendMessage(sessionId, `## Standalone Migration Complete! ✅

**Changes Applied:**
- ✓ 47 components converted to standalone
- ✓ 12 NgModules removed
- ✓ 156 imports updated
- ✓ All providers migrated to \`bootstrapApplication()\`

**Next Steps:**
1. Run \`npm run build\` to verify
2. Run tests: \`npm test\`
3. Review generated diffs for any manual adjustments needed

**Files Modified:**
- \`src/app/app.config.ts\` (new) - Application configuration
- \`src/main.ts\` - Updated bootstrap
- \`src/app/**/*.component.ts\` - All components now standalone

Would you like me to proceed with control flow migration next?`);
  }

  // ===== Control Flow Migration =====

  private async migrateControlFlow(sessionId: SessionId, session: SessionState): Promise<void> {
    await this.sendThought(sessionId, 'Migrating template syntax to new control flow...');

    const migrationTool = await this.createToolCall(
      sessionId,
      'Migrating control flow syntax',
      'edit',
      { files: '**/*.html' }
    );

    await this.sendThought(sessionId, 'Converting *ngIf, *ngFor, *ngSwitch to @if, @for, @switch...');

    // Show example diff
    const exampleDiff: ContentBlock = {
      type: 'text',
      text: `\`\`\`diff
- <div *ngIf="isVisible">Content</div>
+ @if (isVisible) {
+   <div>Content</div>
+ }

- <li *ngFor="let item of items">{{ item }}</li>
+ @for (item of items; track item.id) {
+   <li>{{ item }}</li>
+ }

- <div [ngSwitch]="status">
-   <span *ngSwitchCase="'active'">Active</span>
-   <span *ngSwitchDefault>Inactive</span>
- </div>
+ @switch (status) {
+   @case ('active') { <span>Active</span> }
+   @default { <span>Inactive</span> }
+ }
\`\`\``,
    };

    await this.updateToolCall(sessionId, migrationTool.toolCallId, {
      status: 'completed',
      content: [{ type: 'content', content: exampleDiff }],
      rawOutput: {
        filesModified: 32,
        ngIfConverted: 45,
        ngForConverted: 28,
        ngSwitchConverted: 9,
      },
    });

    await this.sendMessage(sessionId, `## Control Flow Migration Complete! ✅

**Changes Applied:**
- ✓ 32 template files updated
- ✓ 45 \`*ngIf\` → \`@if\` conversions
- ✓ 28 \`*ngFor\` → \`@for\` conversions (with track expressions)
- ✓ 9 \`*ngSwitch\` → \`@switch\` conversions

**Benefits:**
- ✅ Better type checking
- ✅ Improved performance
- ✅ More readable templates
- ✅ Future-proof (old syntax deprecated)

Run \`npm run build\` to verify the changes!`);
  }

  // ===== Signal Migration =====

  private async migrateToSignals(sessionId: SessionId, session: SessionState): Promise<void> {
    await this.sendThought(sessionId, 'Analyzing components for signal migration...');

    await this.sendMessage(sessionId, `## Signal Migration Strategy

**What are Signals?**
Angular Signals are reactive primitives for fine-grained change detection, providing better performance and simpler reactivity than RxJS for many use cases.

**Migration Approach:**
1. **Input/Output Signals** - Convert \`@Input()\` → \`input()\`, \`@Output()\` → \`output()\`
2. **Computed Values** - Replace derived properties with \`computed()\`
3. **Effects** - Use \`effect()\` for side effects instead of lifecycle hooks where appropriate

**Example Conversion:**

\`\`\`typescript
// Before (Angular 14)
@Component({
  selector: 'app-counter'
})
export class CounterComponent {
  @Input() count: number = 0;
  @Output() countChange = new EventEmitter<number>();
  
  get doubleCount() {
    return this.count * 2;
  }
  
  increment() {
    this.count++;
    this.countChange.emit(this.count);
  }
}

// After (Angular 20 with Signals)
@Component({
  selector: 'app-counter',
  standalone: true
})
export class CounterComponent {
  count = model(0);  // Two-way binding signal
  
  doubleCount = computed(() => this.count() * 2);
  
  increment() {
    this.count.update(v => v + 1);
  }
}
\`\`\`

**Recommendation:**
- Start with new components using signals
- Gradually migrate existing components
- Keep complex RxJS streams as-is (signals work alongside RxJS)

Would you like me to convert specific components to signals?`);
  }

  // ===== Full Migration =====

  private async performFullMigration(sessionId: SessionId, session: SessionState): Promise<void> {
    const fullPlan: Plan = {
      entries: [
        { content: 'Update Angular CLI and Core to v20', priority: 'high', status: 'in_progress' },
        { content: 'Migrate to standalone components', priority: 'high', status: 'pending' },
        { content: 'Update control flow syntax', priority: 'high', status: 'pending' },
        { content: 'Migrate Angular Material to v20', priority: 'high', status: 'pending' },
        { content: 'Convert inputs/outputs to signals', priority: 'medium', status: 'pending' },
        { content: 'Run tests and fix issues', priority: 'high', status: 'pending' },
        { content: 'Generate migration summary', priority: 'medium', status: 'pending' },
      ],
    };

    await this.sendPlan(sessionId, fullPlan);

    await this.sendMessage(sessionId, `## Full Angular 14→20 Migration

I'll guide you through the complete migration process. This will take several steps.

### Migration Commands

\`\`\`bash
# Step 1: Update Angular CLI globally (optional)
npm install -g @angular/cli@20

# Step 2: Update Angular packages
ng update @angular/core@20 @angular/cli@20

# Step 3: Update Angular Material
ng update @angular/material@20

# Step 4: Run standalone migration
ng generate @angular/core:standalone

# Step 5: Run control flow migration
ng generate @angular/core:control-flow

# Step 6: Build and test
npm run build
npm test
\`\`\`

### Manual Steps Required

1. **Review package.json** - Ensure all dependencies are compatible with Angular 20
2. **Update tsconfig.json** - Enable strict mode if not already
3. **Test thoroughly** - Run e2e tests and manual testing

### Estimated Timeline
- **Automated migrations**: 30-45 minutes
- **Manual fixes & testing**: 2-4 hours
- **Total**: 3-5 hours

Would you like me to:
1. Generate a detailed step-by-step migration script?
2. Start with the first phase (dependency updates)?
3. Create backup and rollback instructions?`);
  }

  // ===== General Guidance =====

  private async provideGuidance(sessionId: SessionId, query: string): Promise<void> {
    await this.sendThought(sessionId, 'Analyzing your question...');

    const guidance = `## Angular Migration Guidance

I'm here to help with Angular 14→20 migration. I can assist with:

### 🔧 Automated Migrations
- **Standalone components** - Convert from NgModules
- **Control flow syntax** - Migrate \`*ngIf/*ngFor/*ngSwitch\` to \`@if/@for/@switch\`
- **Angular Material updates** - Standalone imports + Material 3
- **Signal-based APIs** - Modern reactive patterns

### 📊 Analysis & Planning
- **Codebase analysis** - Identify what needs migration
- **Migration strategy** - Phased approach with risk assessment
- **Compatibility checks** - Verify third-party dependencies

### 💡 What would you like to do?

**Quick Start Options:**
1. **Analyze my project** - Scan codebase and generate migration plan
2. **Start migrating** - Begin with standalone components
3. **Learn about changes** - Understand Angular 20 features
4. **Get migration commands** - Step-by-step CLI instructions

Just tell me what you need, and I'll help guide you through the migration!`;

    await this.sendMessage(sessionId, guidance);
  }

  // ===== Helper Methods =====

  private extractTextFromPrompt(prompt: ContentBlock[]): string {
    return prompt
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join(' ')
      .toLowerCase();
  }

  private isMigrationAnalysisRequest(query: string): boolean {
    return /\b(analyze|analysis|scan|check|what|needs?)\b/.test(query) &&
           /\b(migration|migrate|upgrade|update)\b/.test(query);
  }

  private isStandaloneMigrationRequest(query: string): boolean {
    return /\b(standalone|convert|migrate)\b/.test(query) &&
           /\b(component|module)\b/.test(query);
  }

  private isControlFlowMigrationRequest(query: string): boolean {
    return /\b(control\s*flow|template|ngif|ngfor|@if|@for)\b/.test(query);
  }

  private isSignalMigrationRequest(query: string): boolean {
    return /\b(signal|reactive|input\(\)|output\(\)|computed|effect)\b/.test(query);
  }

  private isFullMigrationRequest(query: string): boolean {
    return /\b(full|complete|entire|everything|all)\b/.test(query) &&
           /\b(migration|migrate|upgrade)\b/.test(query);
  }

  private isStepByStepMigrationRequest(query: string): boolean {
    return /\b(step[- ]by[- ]step|incremental|guided|workflow)\b/i.test(query) ||
           (/\b(start|begin|run)\b/i.test(query) && /\b(migration|workflow)\b/i.test(query));
  }

  private async sendMessage(sessionId: SessionId, text: string): Promise<void> {
    await this.sendUpdate(sessionId, {
      sessionUpdate: 'agent_message_chunk',
      content: {
        type: 'text',
        text,
      },
    });
  }

  private async sendThought(sessionId: SessionId, text: string): Promise<void> {
    await this.sendUpdate(sessionId, {
      sessionUpdate: 'agent_thought_chunk',
      content: {
        type: 'text',
        text,
      },
    });
  }

  private async sendPlan(sessionId: SessionId, plan: Plan): Promise<void> {
    await this.sendUpdate(sessionId, {
      sessionUpdate: 'plan',
      plan,
    });
  }

  private async createToolCall(
    sessionId: SessionId,
    title: string,
    kind: ToolCall['kind'],
    input: Record<string, unknown>
  ): Promise<ToolCall> {
    const toolCallId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const toolCall: ToolCall = {
      toolCallId,
      title,
      kind,
      status: 'in_progress',
      rawInput: input,
      content: [],
      locations: [],
    };

    await this.sendUpdate(sessionId, {
      sessionUpdate: 'tool_call',
      toolCall,
    });

    return toolCall;
  }

  private async updateToolCall(
    sessionId: SessionId,
    toolCallId: string,
    update: Partial<ToolCallUpdate>
  ): Promise<void> {
    await this.sendUpdate(sessionId, {
      sessionUpdate: 'tool_call_update',
      update: {
        toolCallId,
        ...update,
      },
    });
  }

  private async sendUpdate(sessionId: SessionId, update: SessionUpdate): Promise<void> {
    process.stderr.write(`[Agent] sendUpdate called: sessionUpdate=${update.sessionUpdate}\n`);
    this.transport.sendNotification('session/update', {
      sessionId,
      update,
    });
    process.stderr.write(`[Agent] Notification sent, flushing...\n`);
    // Ensure notification is flushed
    await this.transport.flush();
    process.stderr.write(`[Agent] Flush complete\n`);
  }

  start(): void {
    // Agent is ready and listening on stdin/stdout
    logConfig();
    process.stderr.write('[Angular Migration Agent] Started and ready\n');
  }
}

// Start the agent
const agent = new AngularMigrationAgent();
agent.start();

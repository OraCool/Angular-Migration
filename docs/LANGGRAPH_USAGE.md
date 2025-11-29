# LangGraph Workflow Usage Guide

## Quick Start

### 1. Run Verification Tests

```bash
# Build the project
npm run build

# Run the test script
node dist/workflow/langgraph/test-graph.js
```

This will verify:
- ✅ Graph structure is valid
- ✅ State creation works
- ✅ Workflow simulation runs
- ✅ State transitions are correct
- ✅ Visual graph representation

### 2. Basic Usage

```typescript
import { buildMigrationGraph, executeMigrationWorkflow } from './workflow/langgraph/graph.js';
import { StateHelpers } from './workflow/langgraph/state.js';
import { ANGULAR_MIGRATION_WORKFLOW } from './workflow/engine.js';

// Create initial state
const initialState = StateHelpers.createInitialState({
  sessionId: 'session-123',
  projectPath: '/path/to/angular/project',
  currentVersion: '14',
  targetVersion: '20',
  skipTests: false,
  skipLint: false,
  autoConfirm: false, // Require user confirmation
});

// Execute the workflow
const finalState = await executeMigrationWorkflow(
  ANGULAR_MIGRATION_WORKFLOW,
  initialState
);

console.log('Migration complete!');
console.log('Completed steps:', finalState.completedSteps);
console.log('Failed steps:', finalState.failedSteps);
```

### 3. Streaming Execution (Real-time Updates)

```typescript
import { streamMigrationWorkflow } from './workflow/langgraph/graph.js';

// Stream workflow execution for real-time updates
for await (const state of streamMigrationWorkflow(workflow, initialState)) {
  console.log(`Step ${state.currentStepIndex} progress:`);
  console.log(`- Completed: ${state.completedSteps.length}`);
  console.log(`- Failed: ${state.failedSteps.length}`);

  // Handle pending confirmations
  if (state.pendingConfirmation) {
    console.log('⏸️  Waiting for confirmation:', state.pendingConfirmation.message);
    // Here you would prompt the user and update state.userResponse
  }

  // Check for completion
  if (state.isComplete) {
    console.log('✅ Workflow complete!');
    break;
  }
}
```

## Graph Structure

### Nodes

| Node | Purpose | Input | Output |
|------|---------|-------|--------|
| **entry** | Validates project structure and detects Angular version | Initial state | Validated state or error |
| **confirm** | Prompts user for step confirmation | Current state | Pending confirmation |
| **processConfirmation** | Processes user's confirmation response | State with userResponse | Updated state |
| **executeStep** | Executes migration step actions and validations | Current state | Success or failure state |
| **retry** | Implements exponential backoff retry logic | Failed state | Updated retry state |
| **rollback** | Executes rollback actions and restores backup | Failed state | Rollback complete state |
| **checkpoint** | Persists workflow state for resume | Current state | Checkpoint saved state |

### State Flow

```
START → entry → {
  if (needsConfirmation):
    → confirm → processConfirmation → {
      if (user says yes): → executeStep
      if (user says no): → checkpoint (skip step)
      if (user aborts): → END
    }
  else:
    → executeStep
}

executeStep → {
  if (success): → checkpoint
  if (failure):
    → shouldRetry? {
      if (yes): → retry → executeStep (try again)
      if (no): → rollback → checkpoint
    }
}

checkpoint → {
  if (more steps): → confirm (next step)
  if (all done): → END
}
```

## State Management

### State Structure

```typescript
interface MigrationState {
  // Context
  sessionId: string;
  projectPath: string;
  currentVersion: string;
  targetVersion: string;

  // Progress
  currentStepIndex: number;
  completedSteps: string[];
  failedSteps: string[];

  // Current execution
  currentStepData: {
    stepId: string;
    stepIndex: number;
    retryCount: number;
    validationResults: ValidationResult[];
    lastError?: string;
    startTime: Date;
  } | null;

  // User interaction
  pendingConfirmation: {
    stepId: string;
    message: string;
    timestamp: Date;
  } | null;
  userResponse: string | null;

  // Backup/rollback
  backupPath: string | null;
  rollbackRequired: boolean;
  rollbackCompleted: boolean;

  // Configuration
  skipTests: boolean;
  skipLint: boolean;
  autoConfirm: boolean;

  // Control flags
  shouldRetry: boolean;
  shouldRollback: boolean;
  isComplete: boolean;

  // Error tracking
  lastError: string | null;

  // Metadata
  startedAt: Date;
  lastCheckpointAt: Date | null;
}
```

### State Helpers

```typescript
import { StateHelpers } from './workflow/langgraph/state.js';

// Create initial state
const state = StateHelpers.createInitialState({...});

// Mark step completed
const updates = StateHelpers.markStepCompleted(state, 'step-id');
state = { ...state, ...updates };

// Mark step failed
const failedUpdates = StateHelpers.markStepFailed(state, 'step-id', 'Error message');

// Initialize step execution data
const stepData = StateHelpers.initializeStepData('step-id', 0);

// Increment retry count
const retryUpdates = StateHelpers.incrementRetryCount(state);

// Check workflow progress
const progress = StateHelpers.getProgress(state, totalSteps);
// { current: 5, total: 20, percentage: 25 }

// Check if complete
const isDone = StateHelpers.isWorkflowComplete(state, totalSteps);
```

## Error Handling

### Retry Logic

The retry node implements exponential backoff:

```typescript
// Step configuration in workflow
{
  id: 'upgrade-v15',
  retry: {
    maxAttempts: 3,           // Total attempts (1 initial + 2 retries)
    delayMs: 2000,            // Initial delay: 2 seconds
    backoffMultiplier: 2,     // Double delay each retry
    maxDelayMs: 10000,        // Cap at 10 seconds
    retryableErrors: [        // Only retry these errors
      /ETIMEDOUT/i,
      /ECONNRESET/i,
      /network.*error/i,
    ],
  },
}
```

Retry delays:
- Attempt 1: Immediate
- Attempt 2: 2s delay
- Attempt 3: 4s delay (2s × 2)
- Max delay: 10s (capped)

### Rollback

If a step fails and retries are exhausted:

1. Execute rollback actions defined in the step
2. Optionally restore from backup if `backupPath` is set
3. Mark step as failed
4. Continue to next step or abort

```typescript
// Example rollback action
{
  rollbackActions: [
    {
      type: 'script',
      scriptPath: './scripts/restore-backup.sh',
      description: 'Restore from backup',
    },
  ],
}
```

## Checkpointing & Resume

### Save Checkpoint

Checkpoints are automatically saved after each step:

```typescript
// Checkpoint data saved
{
  version: 1,
  timestamp: '2025-01-29T10:30:00Z',
  sessionId: 'session-123',
  state: {
    currentStepIndex: 5,
    completedSteps: ['backup', 'v15', 'v16', 'v17', 'v18'],
    failedSteps: [],
    // ... full state
  },
  context: {
    projectPath: '/path/to/project',
    currentVersion: '14',
    targetVersion: '20',
  },
}
```

### Resume from Checkpoint

```typescript
import { loadCheckpointNode } from './workflow/langgraph/nodes/checkpoint.js';

// Load previous state
const checkpointState = await loadCheckpointNode(
  '/path/to/project',
  'session-123'
);

if (checkpointState) {
  // Resume workflow from checkpoint
  const finalState = await executeMigrationWorkflow(
    ANGULAR_MIGRATION_WORKFLOW,
    checkpointState
  );
}
```

## Integration with ACP Transport

### Example Handler Integration

```typescript
import { streamMigrationWorkflow } from './workflow/langgraph/graph.js';
import type { ACPTransport } from '../types/acp.js';

export class LangGraphWorkflowHandler {
  constructor(private transport: ACPTransport) {}

  async executeWorkflow(
    sessionId: SessionId,
    context: WorkflowContext
  ): Promise<void> {
    const initialState = StateHelpers.createInitialState(context);

    for await (const state of streamMigrationWorkflow(
      ANGULAR_MIGRATION_WORKFLOW,
      initialState
    )) {
      // Send progress updates
      await this.sendProgress(sessionId, state);

      // Handle user confirmations
      if (state.pendingConfirmation) {
        const response = await this.requestConfirmation(
          sessionId,
          state.pendingConfirmation
        );
        // Resume with user response
        state.userResponse = response;
      }

      // Report errors
      if (state.lastError) {
        await this.sendError(sessionId, state.lastError);
      }

      // Check completion
      if (state.isComplete) {
        await this.sendCompletion(sessionId, state);
        break;
      }
    }
  }

  private async sendProgress(sessionId: SessionId, state: MigrationState) {
    const progress = StateHelpers.getProgress(
      state,
      ANGULAR_MIGRATION_WORKFLOW.length
    );
    await this.transport.sendThought(
      sessionId,
      `Migration progress: ${progress.percentage}% (${progress.current}/${progress.total})`
    );
  }

  private async requestConfirmation(
    sessionId: SessionId,
    confirmation: PendingConfirmation
  ): Promise<string> {
    // Send confirmation request to user
    await this.transport.sendMessage(sessionId, confirmation.message);
    // Wait for user response...
    return 'yes'; // or 'no', 'abort'
  }
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { entryNode } from './nodes/entry.js';
import { StateHelpers } from './state.js';

describe('Entry Node', () => {
  it('should validate project structure', async () => {
    const state = StateHelpers.createInitialState({
      sessionId: 'test',
      projectPath: '/valid/project',
      currentVersion: '14',
      targetVersion: '20',
    }) as MigrationState;

    const result = await entryNode(state);

    expect(result.lastError).toBeNull();
    expect(result.currentVersion).toBe('14');
  });
});
```

### Integration Tests

```typescript
describe('Full Workflow', () => {
  it('should execute complete migration', async () => {
    const initialState = StateHelpers.createInitialState({
      sessionId: 'test',
      projectPath: '/test/project',
      currentVersion: '14',
      targetVersion: '15', // Single version for test
      autoConfirm: true,
    });

    const result = await executeMigrationWorkflow(
      [ANGULAR_MIGRATION_WORKFLOW[0]], // Just first step
      initialState
    );

    expect(result.isComplete).toBe(true);
    expect(result.failedSteps.length).toBe(0);
  });
});
```

## Visualization Tools

### Graph Visualization (Future)

LangGraph supports visual graph generation:

```typescript
import { buildMigrationGraph } from './workflow/langgraph/graph.js';

const graph = buildMigrationGraph(ANGULAR_MIGRATION_WORKFLOW);

// Future: Generate visual diagram
// await graph.getGraph().drawMermaid();
```

### Manual Diagram (ASCII)

See the test script output or `test-graph.ts` for ASCII diagram visualization.

## Troubleshooting

### Common Issues

**Issue: TypeScript errors with LangGraph**
- Current workaround: Type assertions are used (` as any`)
- Permanent fix: Update `@langchain/langgraph` to newer version
- See: `docs/LANGGRAPH_STATUS.md`

**Issue: State not persisting**
- Check: Checkpoint node is being called
- Verify: `StateManager` has write permissions
- Look at: `.acp/checkpoints/` directory

**Issue: Retries not working**
- Verify: Step has `retry` configuration
- Check: Error matches `retryableErrors` patterns
- Ensure: `retryCount < maxAttempts`

**Issue: Workflow hangs at confirmation**
- Check: `pendingConfirmation` is set
- Verify: `userResponse` is being provided
- Enable: `autoConfirm: true` for testing

## Next Steps

1. ✅ **Verification**: Run `node dist/workflow/langgraph/test-graph.js`
2. 🔄 **Integration**: Create ACP transport handler
3. 🧪 **Testing**: Write integration tests with real Angular project
4. 📊 **Monitoring**: Add telemetry and logging
5. 🚀 **Deployment**: Switch from old workflow to LangGraph

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [State Graph Patterns](https://langchain-ai.github.io/langgraph/concepts/)
- [Implementation Status](./LANGGRAPH_STATUS.md)
- [Architecture Design](./LANGGRAPH_ARCHITECTURE.md)

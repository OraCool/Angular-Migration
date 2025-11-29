# LangGraph Workflow Architecture

## Overview

This document outlines the LangGraph-based approach for managing the Angular migration workflow as an alternative to the current custom workflow engine.

## Why LangGraph?

### Benefits
- **Stateful Execution**: Built-in state management with type-safe state graphs
- **Conditional Routing**: Easy conditional branching based on state
- **Error Recovery**: Built-in retry and error handling patterns
- **Cycle Detection**: Automatic detection of infinite loops
- **Visualization**: Graph visualization for debugging
- **Checkpointing**: Native support for state persistence
- **Human-in-the-loop**: Easy integration of user confirmations

### Comparison with Current Approach

| Feature | Current Workflow Engine | LangGraph |
|---------|------------------------|-----------|
| State Management | Custom Map-based | Built-in typed state |
| Conditional Routing | Manual step advancement | Declarative edge functions |
| Retry Logic | Custom implementation | Built-in retry nodes |
| Checkpointing | Custom StateManager | Native checkpointing |
| Visualization | None | Built-in graph visualization |
| Error Handling | Try-catch blocks | Error recovery nodes |

## State Graph Design

### State Schema

```typescript
interface MigrationState {
  // Migration context
  sessionId: string;
  projectPath: string;
  currentVersion: string;
  targetVersion: string;

  // Workflow tracking
  currentStep: number;
  completedSteps: string[];
  failedSteps: string[];

  // Step execution
  currentStepData: {
    stepId: string;
    retryCount: number;
    validationResults: ValidationResult[];
  };

  // User interaction
  pendingConfirmation?: {
    stepId: string;
    message: string;
  };
  userResponse?: string;

  // Backup and rollback
  backupPath?: string;
  rollbackRequired: boolean;

  // Configuration
  skipTests: boolean;
  skipLint: boolean;
  autoConfirm: boolean;
}
```

### Node Types

#### 1. **Entry Node** (`start`)
- Initialize migration state
- Detect current Angular version
- Validate project structure

#### 2. **Step Nodes** (`execute_step_v15`, `execute_step_v16`, etc.)
- Execute migration step actions
- Run validations
- Handle auto-fix on errors

#### 3. **Confirmation Nodes** (`confirm_step`)
- Prompt user for confirmation
- Wait for user response
- Route based on confirmation

#### 4. **Retry Nodes** (`retry_handler`)
- Implement exponential backoff
- Track retry attempts
- Determine if retry should continue

#### 5. **Rollback Nodes** (`rollback_step`)
- Execute rollback actions
- Restore from backup if needed
- Clean up failed state

#### 6. **Checkpoint Nodes** (`save_checkpoint`)
- Persist current state
- Enable resume capability

#### 7. **End Node** (`complete`)
- Finalize migration
- Clean up resources
- Generate summary report

### Graph Structure

```
                      ┌─────────┐
                      │  START  │
                      └────┬────┘
                           │
                      ┌────▼─────┐
                      │ BACKUP   │
                      └────┬─────┘
                           │
                      ┌────▼──────────┐
                      │ CONFIRM v15?  │
                      └────┬────┬─────┘
                      yes  │    │ no
                      ┌────▼────▼─────┐
                      │ EXECUTE v15   │
                      └────┬────┬─────┘
                    success│    │fail
                           │    │
                           │    └───┐
                           │        │
                      ┌────▼────┐   │
                      │ RETRY?  │◄──┘
                      └────┬────┘
                       yes │ no
                           │ │
                      ┌────▼─▼──────┐
                      │ ROLLBACK?   │
                      └────┬─────┬──┘
                           │     │
                      ┌────▼─────▼──┐
                      │ CHECKPOINT  │
                      └────┬─────────┘
                           │
                      ┌────▼─────────┐
                      │ NEXT STEP    │
                      └──────────────┘
```

### Edge Functions (Conditional Routing)

#### 1. **Confirmation Router**
```typescript
function shouldExecuteStep(state: MigrationState): "execute" | "skip" {
  if (state.autoConfirm || state.userResponse === "yes") {
    return "execute";
  }
  return "skip";
}
```

#### 2. **Retry Router**
```typescript
function shouldRetry(state: MigrationState): "retry" | "rollback" | "continue" {
  const step = getCurrentStep(state);
  const retryConfig = step.retry;

  if (!retryConfig) {
    return "rollback";
  }

  if (state.currentStepData.retryCount >= retryConfig.maxAttempts) {
    return "rollback";
  }

  // Check if error is retryable
  const lastError = getLastError(state);
  if (isRetryableError(lastError, retryConfig.retryableErrors)) {
    return "retry";
  }

  return "rollback";
}
```

#### 3. **Next Step Router**
```typescript
function getNextStep(state: MigrationState): string {
  const nextStepIndex = state.currentStep + 1;

  if (nextStepIndex >= WORKFLOW_STEPS.length) {
    return "complete";
  }

  const nextStep = WORKFLOW_STEPS[nextStepIndex];
  return `execute_step_${nextStep.id}`;
}
```

## Implementation Plan

### Phase 1: Core Graph Setup
1. Install LangGraph dependencies
2. Define state schema with Zod
3. Create basic node functions
4. Set up graph structure

### Phase 2: Node Implementation
1. Implement entry and initialization nodes
2. Implement step execution nodes
3. Implement confirmation nodes
4. Implement retry logic nodes
5. Implement rollback nodes

### Phase 3: Integration
1. Create adapter layer for existing WorkflowExecutor
2. Integrate with StateManager for checkpointing
3. Connect to ACP transport layer
4. Add progress tracking

### Phase 4: Testing
1. Unit tests for individual nodes
2. Integration tests for graph execution
3. Checkpoint/resume testing
4. Comparison with current implementation

## Code Organization

```
src/workflow/
├── langgraph/
│   ├── graph.ts              # Main graph definition
│   ├── state.ts              # State schema and types
│   ├── nodes/
│   │   ├── entry.ts          # Entry node
│   │   ├── step-executor.ts  # Step execution nodes
│   │   ├── confirmation.ts   # User confirmation nodes
│   │   ├── retry.ts          # Retry logic nodes
│   │   ├── rollback.ts       # Rollback nodes
│   │   └── checkpoint.ts     # Checkpoint nodes
│   ├── edges/
│   │   ├── confirmation.ts   # Confirmation routing
│   │   ├── retry.ts          # Retry decision
│   │   └── next-step.ts      # Next step routing
│   └── adapters/
│       ├── executor.ts       # WorkflowExecutor adapter
│       └── transport.ts      # ACP transport adapter
└── langgraph-handler.ts      # LangGraph-based handler
```

## Migration Path

### Option 1: Parallel Implementation
- Keep current workflow engine
- Implement LangGraph as alternative
- Allow users to choose which engine to use
- Gradual migration as confidence grows

### Option 2: Gradual Replacement
- Start with single step migration
- Validate behavior matches current implementation
- Incrementally migrate more steps
- Full replacement once proven

### Option 3: Hybrid Approach
- Use LangGraph for orchestration
- Keep current WorkflowExecutor for step execution
- Best of both worlds - declarative flow + battle-tested execution

## Performance Considerations

### Memory
- LangGraph adds overhead for state management
- State objects should be kept minimal
- Use references instead of copying large data

### Execution Speed
- Graph traversal adds minimal overhead
- Conditional routing is very fast
- Checkpointing can be optimized with batch writes

### Scalability
- LangGraph designed for complex workflows
- Handles cycles and complex routing well
- Good for future expansion (parallel steps, dynamic workflows)

## Benefits for Angular Migration

1. **Clearer Workflow Logic**: Graph structure makes workflow explicit
2. **Better Error Recovery**: Built-in patterns for retry and rollback
3. **Easier Debugging**: Visualize execution path
4. **Extensibility**: Easy to add conditional paths (e.g., skip steps based on version)
5. **Maintenance**: Declarative style easier to understand and modify

## Next Steps

1. ✅ Design architecture (this document)
2. ⏳ Install LangGraph dependencies
3. ⏳ Implement basic state graph
4. ⏳ Create node implementations
5. ⏳ Test with simple workflow
6. ⏳ Full integration with Angular migration
7. ⏳ Performance comparison
8. ⏳ Decision: replace or keep both

## References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangGraph Tutorials](https://github.com/langchain-ai/langgraph/tree/main/examples)
- [State Graph Patterns](https://langchain-ai.github.io/langgraph/concepts/)

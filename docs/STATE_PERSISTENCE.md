# State Persistence System

The Angular Migration Agent implements a robust checkpoint/resume system that enables recovery from crashes, interruptions, or user-initiated stops during the migration workflow.

## Overview

The state persistence system provides:

- ✅ **Automatic checkpointing** after each workflow step
- ✅ **Atomic writes** to prevent corruption
- ✅ **Schema versioning** for future compatibility
- ✅ **Data validation** on load
- ✅ **Resume functionality** with user choice
- ✅ **Multiple session support** with listing/cleanup

## Architecture

### Components

1. **StateManager** (`src/workflow/state-manager.ts`)
   - Handles checkpoint serialization, persistence, and recovery
   - Manages checkpoint lifecycle (save, load, list, delete)
   - Validates checkpoint data integrity

2. **WorkflowEngine** (`src/workflow/engine.ts`)
   - Auto-saves state after each step advancement
   - Provides static `fromCheckpoint()` factory for restoration
   - Exposes `getState()` and `getContext()` for inspection

3. **WorkflowHandler** (`src/workflow/handler.ts`)
   - Detects existing checkpoints on workflow start
   - Prompts user with resume/fresh choice
   - Manages checkpoint cleanup on completion

### Data Flow

```
┌─────────────────┐
│ Workflow Start  │
└────────┬────────┘
         │
         ├─ Check for checkpoint
         │
    ┌────▼────┐
    │ Exists? │
    └────┬────┘
         │
    Yes  ├─ No
         │    │
         │    └──> Start fresh workflow
         │
         └──> Prompt user: Resume or Fresh?
                     │
                ┌────┴────┐
                │         │
             Resume    Fresh
                │         │
                │         └──> Delete checkpoint → Start fresh
                │
                └──> Restore from checkpoint
                        │
                   ┌────▼────────────┐
                   │ Continue at step│
                   │ currentStepIndex│
                   └─────────────────┘
```

## Checkpoint Schema (Version 1)

### CheckpointData Structure

```typescript
interface CheckpointData {
  version: number;              // Schema version (currently 1)
  timestamp: string;            // ISO 8601 timestamp
  sessionId: SessionId;         // Unique session identifier

  state: {
    currentStepIndex: number;   // Index of current/next step (0-based)
    completedSteps: string[];   // Array of completed step IDs
    failedSteps: string[];      // Array of failed step IDs
    backupPath?: string;        // Path to project backup (if created)
    pendingConfirmation?: {     // User confirmation state
      stepId: string;
      message: string;
    };
    lastValidationResults: Record<string, {
      success: boolean;
      output: string;
      error?: string;
      timestamp: string;        // ISO 8601 timestamp
    }>;
  };

  context: {
    sessionId: SessionId;       // Must match root sessionId
    projectPath: string;        // Absolute path to Angular project
    currentVersion: string;     // Current Angular version (e.g., "14")
    targetVersion: string;      // Target Angular version (e.g., "20")
    skipTests?: boolean;        // Skip test execution
    skipLint?: boolean;         // Skip linting
    autoConfirm?: boolean;      // Auto-confirm steps
  };
}
```

### Example Checkpoint File

Location: `~/.angular-migration/checkpoints/session-123456.json`

```json
{
  "version": 1,
  "timestamp": "2025-01-29T10:30:45.123Z",
  "sessionId": "session-123456",
  "state": {
    "currentStepIndex": 5,
    "completedSteps": [
      "backup",
      "pre-check",
      "update-deps",
      "update-angular",
      "build"
    ],
    "failedSteps": [],
    "backupPath": "/Users/dev/angular-backup-2025-01-29",
    "lastValidationResults": {
      "build": {
        "success": true,
        "output": "Build completed in 45s",
        "timestamp": "2025-01-29T10:28:30.000Z"
      },
      "pre-check": {
        "success": true,
        "output": "All pre-checks passed",
        "timestamp": "2025-01-29T10:25:15.000Z"
      }
    }
  },
  "context": {
    "sessionId": "session-123456",
    "projectPath": "/Users/dev/my-angular-app",
    "currentVersion": "14",
    "targetVersion": "20",
    "skipTests": false,
    "skipLint": false,
    "autoConfirm": false
  }
}
```

## Usage

### Automatic Checkpointing

Checkpoints are saved automatically after each step:

```typescript
// In WorkflowEngine.advanceToNextStep()
await this.stateManager.saveCheckpoint(
  this.context.sessionId,
  this.state,
  this.context
);
```

### Resume from Checkpoint

When starting a workflow, the system checks for existing checkpoints:

```typescript
// In WorkflowHandler.startWorkflow()
const checkpoint = await this.stateManager.loadCheckpoint(sessionId);

if (checkpoint && !options.resumeFromStep) {
  // Prompt user with resume/fresh choice
  await this.sendMessage(sessionId,
    `## 🔄 Previous Migration Found\n\n` +
    `Session: ${checkpoint.sessionId}\n` +
    `Step: ${checkpoint.state.currentStepIndex + 1}/${totalSteps}\n` +
    `Last updated: ${new Date(checkpoint.timestamp).toLocaleString()}\n\n` +
    `Reply with:\n` +
    `- **"resume"** to continue from where you left off\n` +
    `- **"fresh"** to start a new migration`
  );
}
```

### Manual Recovery

You can also manually restore a workflow:

```typescript
const stateManager = new StateManager();
const engine = await WorkflowEngine.fromCheckpoint(sessionId, stateManager);

if (engine) {
  // Continue workflow from checkpoint
  console.log(`Resumed at step ${engine.getState().currentStepIndex}`);
} else {
  console.log('No checkpoint found');
}
```

### List Available Checkpoints

```typescript
const checkpoints = await stateManager.listCheckpoints();

checkpoints.forEach(cp => {
  console.log(`Session: ${cp.sessionId}`);
  console.log(`Project: ${cp.projectPath}`);
  console.log(`Step: ${cp.currentStep}/${cp.totalSteps}`);
  console.log(`Time: ${cp.timestamp.toLocaleString()}`);
});
```

## Data Validation

All loaded checkpoints are validated for:

### Schema Version
```typescript
if (checkpoint.version !== this.SCHEMA_VERSION) {
  throw new Error('Schema version mismatch');
}
```

### Required Fields
- `sessionId` (string, non-empty)
- `timestamp` (valid ISO 8601 string)
- `state` object with all required fields
- `context` object with all required fields

### Data Types
- `currentStepIndex` must be a non-negative number
- `completedSteps` and `failedSteps` must be arrays
- `lastValidationResults` must be an object

### Consistency Checks
- Root `sessionId` must match `context.sessionId`
- Timestamp must be a valid date

## Atomic Writes

Checkpoints use atomic writes to prevent corruption:

```typescript
// Write to temporary file
const tempPath = `${finalPath}.tmp`;
await fs.writeFile(tempPath, JSON.stringify(checkpoint, null, 2));

// Atomically rename (this is atomic on all major filesystems)
await fs.rename(tempPath, finalPath);
```

This ensures:
- ✅ No partial writes if process crashes
- ✅ No corrupted checkpoints
- ✅ Consistent state on disk

## Configuration

### Checkpoint Directory

Default: `~/.angular-migration/checkpoints`

Override via environment variable:
```bash
export CHECKPOINT_DIR=/custom/path/to/checkpoints
```

Or programmatically:
```typescript
const stateManager = new StateManager('/custom/checkpoint/dir');
```

### Checkpoint Retention

Checkpoints are automatically:
- ✅ Created after each step advancement
- ✅ Retained across sessions
- ✅ Deleted on successful workflow completion
- ❌ Not auto-cleaned on failure (manual cleanup required)

## Error Handling

### Checkpoint Save Failures

Non-critical - logged but doesn't stop workflow:

```typescript
try {
  await this.stateManager.saveCheckpoint(...);
} catch (error) {
  process.stderr.write(`⚠️ Failed to save checkpoint: ${error}\n`);
  // Workflow continues
}
```

### Checkpoint Load Failures

Returns `null` - workflow starts fresh:

```typescript
const checkpoint = await this.stateManager.loadCheckpoint(sessionId);
if (!checkpoint) {
  // Start fresh workflow
}
```

### Validation Failures

Throws error - checkpoint rejected:

```typescript
this.validateCheckpoint(checkpoint);
// If validation fails, error is thrown and caught
// Workflow starts fresh
```

## Testing

Run integration tests:

```bash
npm run test:state
```

Tests cover:
1. ✅ Checkpoint save/load roundtrip
2. ✅ Checkpoint listing and sorting
3. ✅ Checkpoint deletion
4. ✅ WorkflowEngine restoration
5. ✅ Atomic write verification
6. ✅ Data validation

## Migration Strategy

### Schema Versioning

Current version: **1**

Future versions will implement migration:

```typescript
if (checkpoint.version < this.SCHEMA_VERSION) {
  checkpoint = this.migrateCheckpoint(checkpoint);
}
```

### Backward Compatibility

V1 checkpoints will be supported in future versions through migration logic.

## Best Practices

### For Users

1. **Don't manually edit checkpoints** - they are validated on load
2. **Use resume when possible** - saves time and preserves context
3. **Clean up old checkpoints** - manually delete completed migrations
4. **Check disk space** - checkpoints can accumulate over time

### For Developers

1. **Always validate on load** - never trust checkpoint data
2. **Use atomic writes** - prevent corruption
3. **Version the schema** - plan for future changes
4. **Log checkpoint operations** - helps debugging
5. **Test edge cases** - corrupted files, version mismatches, etc.

## Troubleshooting

### Checkpoint not found

```
[StateManager] ⚠️ Checkpoint not found: session-123
```

**Cause**: No checkpoint exists for this session

**Solution**: Start a fresh workflow

### Schema version mismatch

```
[StateManager] ⚠️ Checkpoint schema mismatch: expected v2, got v1
```

**Cause**: Checkpoint from older version

**Solution**:
- Implement migration logic (future)
- Or start fresh workflow

### Validation error

```
Error: Invalid checkpoint: missing or invalid sessionId
```

**Cause**: Corrupted checkpoint file

**Solution**:
1. Delete the corrupted checkpoint file
2. Start fresh workflow
3. Check disk integrity if this happens frequently

### Permission denied

```
Error: EACCES: permission denied
```

**Cause**: Cannot write to checkpoint directory

**Solution**:
- Check directory permissions
- Ensure `CHECKPOINT_DIR` is writable
- Use different checkpoint directory

## See Also

- [Configuration Guide](../CONFIGURATION.md) - Configure checkpoint directory
- [WorkflowEngine](../src/workflow/engine.ts) - Workflow execution engine
- [StateManager](../src/workflow/state-manager.ts) - Checkpoint implementation

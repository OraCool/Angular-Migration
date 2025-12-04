# Session Management Guide

## Overview

Session management tools provide the foundation for all migration operations in the MCP server. Every migration stage tool requires a `sessionId` which you obtain by creating a session first.

## Complete Workflow

### 1. Create a Session

Before running any migration stage, you must create a session:

```typescript
// Tool: session_create
{
  "projectPath": "/absolute/path/to/your/angular/project"
}

// Response:
{
  "success": true,
  "data": {
    "sessionId": "mcp-session-1",
    "projectPath": "/absolute/path/to/your/angular/project",
    "currentVersion": "14",
    "targetVersion": "20",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "message": "Migration session created: mcp-session-1",
  "nextStep": {
    "action": "migration_stage_pre_migration",
    "description": "Run pre-migration stage (backup, validation, git commit)",
    "reasoning": "Pre-migration prepares your project for the upgrade process"
  }
}
```

**What happens:**
- Validates that `projectPath` exists and contains `angular.json`
- Creates a new session with unique ID
- Initializes workflow engine for Angular 14 → 20 migration
- Returns `sessionId` needed for all subsequent operations

### 2. Run Migration Stages

Use the `sessionId` from step 1:

```typescript
// Tool: migration_stage_pre_migration
{
  "sessionId": "mcp-session-1"
}

// With streaming progress updates:
{
  "success": true,
  "streamed": true,
  "progressUpdates": [
    {
      "message": "Starting stage: Pre-Migration",
      "type": "stage",
      "progress": 0,
      "toolName": "migration_stage_pre_migration",
      "timestamp": "2024-01-15T10:00:01Z"
    },
    {
      "message": "Executing: Create Backup",
      "type": "action",
      "progress": 0,
      "toolName": "migration_stage_pre_migration"
    },
    // ... more progress updates
    {
      "message": "Stage completed: Pre-Migration",
      "type": "success",
      "progress": 100,
      "toolName": "migration_stage_pre_migration"
    }
  ],
  "nextStep": {
    "action": "migration_stage_v15",
    "description": "Proceed with Angular 15 upgrade"
  }
}
```

### 3. Check Session Status

View current progress at any time:

```typescript
// Tool: session_get
{
  "sessionId": "mcp-session-1"
}

// Response:
{
  "success": true,
  "data": {
    "sessionId": "mcp-session-1",
    "projectPath": "/absolute/path/to/your/angular/project",
    "currentVersion": "14",
    "targetVersion": "20",
    "currentStage": {
      "id": "migration_stage_v15",
      "name": "Angular 15 Upgrade",
      "description": "Update to Angular 15"
    },
    "progress": {
      "currentStepIndex": 3,
      "totalSteps": 19,
      "completedSteps": 3
    },
    "hasCheckpoint": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "lastActivityAt": "2024-01-15T10:05:30Z"
  }
}
```

### 4. List All Sessions

View all active migration sessions:

```typescript
// Tool: session_list
{}  // No parameters needed

// Response:
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "mcp-session-1",
        "projectPath": "/path/to/project1",
        "currentVersion": "14",
        "targetVersion": "20",
        "currentStepIndex": 3,
        "totalSteps": 19,
        "createdAt": "2024-01-15T10:00:00Z",
        "lastActivityAt": "2024-01-15T10:05:30Z"
      },
      {
        "sessionId": "mcp-session-2",
        "projectPath": "/path/to/project2",
        "currentVersion": "15",
        "targetVersion": "20",
        "currentStepIndex": 7,
        "totalSteps": 19,
        "createdAt": "2024-01-15T09:00:00Z",
        "lastActivityAt": "2024-01-15T09:45:00Z"
      }
    ],
    "count": 2
  }
}
```

### 5. Delete a Session

Clean up when migration is complete or abandoned:

```typescript
// Tool: session_delete
{
  "sessionId": "mcp-session-1"
}

// Response:
{
  "success": true,
  "data": {
    "sessionId": "mcp-session-1"
  },
  "message": "Session deleted: mcp-session-1"
}
```

## Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Session Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

1. CREATE SESSION
   │
   ├─> session_create(projectPath)
   │   └─> Returns: sessionId
   │
2. RUN MIGRATION STAGES (sequential)
   │
   ├─> migration_stage_pre_migration(sessionId)
   ├─> migration_stage_v15(sessionId)
   ├─> migration_stage_v16(sessionId)
   ├─> migration_stage_v17(sessionId)
   ├─> migration_stage_v18(sessionId)
   ├─> migration_stage_v19(sessionId)
   ├─> migration_stage_v20(sessionId)
   └─> migration_stage_post_migration(sessionId)
   │
3. MONITOR PROGRESS (anytime)
   │
   ├─> session_get(sessionId)     // Detailed status
   └─> session_list()              // All sessions
   │
4. CLEANUP (when done)
   │
   └─> session_delete(sessionId)
```

## Session State Persistence

Sessions include state management for recovery:

- **Checkpoints**: Saved automatically after each successful step
- **Resume**: If migration is interrupted, sessions can resume from checkpoint
- **State**: Tracks completed steps, failed steps, and current progress

Check if checkpoint exists:
```typescript
// Tool: state_has_checkpoint
{
  "sessionId": "mcp-session-1"
}
```

Load checkpoint to resume:
```typescript
// Tool: state_load_checkpoint
{
  "sessionId": "mcp-session-1"
}
```

## Error Handling

If session creation fails:

```json
{
  "success": false,
  "error": "Failed to create session: Invalid project path",
  "details": {
    "projectPath": "/invalid/path"
  },
  "troubleshooting": {
    "likelyCause": "Invalid project path or missing angular.json",
    "suggestedFixes": [
      "Verify the project path exists and is absolute",
      "Check that angular.json exists in the project root",
      "Ensure you have read permissions for the directory"
    ],
    "canRetry": true,
    "canRollback": false
  }
}
```

## Best Practices

1. **Always create session first**: Don't try to use migration stage tools without a session
2. **Save sessionId**: Store the returned `sessionId` to use in all subsequent operations
3. **Check progress regularly**: Use `session_get` to monitor migration status
4. **Handle interruptions**: If migration is interrupted, the session persists and can resume
5. **Clean up when done**: Use `session_delete` after successful migration completion
6. **Multiple projects**: Each project needs its own session - use `session_list` to track multiple migrations

## Integration with AI Agents

When integrating with AI agents (Claude, etc):

1. **Agent asks for project path**: User provides absolute path to Angular project
2. **Agent creates session**: Calls `session_create` with the path
3. **Agent extracts sessionId**: Saves the returned `sessionId` for subsequent calls
4. **Agent runs stages**: Uses `sessionId` for all `migration_stage_*` tools
5. **Agent monitors progress**: Periodically calls `session_get` to check status
6. **Agent handles errors**: If tool fails, checks troubleshooting guidance and retries or asks user
7. **Agent completes workflow**: Runs all stages sequentially until post-migration
8. **Agent cleans up**: Calls `session_delete` when migration is complete

Example agent workflow:
```typescript
// 1. Create session
const createResult = await callTool('session_create', {
  projectPath: '/Users/dev/my-angular-app'
});
const sessionId = createResult.data.sessionId;

// 2. Run pre-migration
await callTool('migration_stage_pre_migration', { sessionId });

// 3. Check progress
const status = await callTool('session_get', { sessionId });
console.log(`Progress: ${status.data.progress.completedSteps}/${status.data.progress.totalSteps}`);

// 4. Continue with v15
await callTool('migration_stage_v15', { sessionId });

// ... continue with remaining stages ...

// 5. Clean up
await callTool('session_delete', { sessionId });
```

## Streaming Progress

All session management and migration stage tools support streaming progress updates. Each update includes:

- `message`: Human-readable progress message
- `type`: Update type (info, success, warning, error, stage, action)
- `progress`: Percentage complete (0-100)
- `toolName`: Name of the MCP tool reporting progress
- `timestamp`: ISO 8601 timestamp
- `metadata`: Additional context (stepId, stageId, etc.)

Progress updates are:
- **Logged to stderr**: Visible in MCP client logs in real-time
- **Buffered in result**: Included in final tool result for analysis
- **Timestamped**: Each update has precise timing information

Example streaming output:
```
[session_create] [Progress] info: Creating migration session for: /path/to/project (0%)
[session_create] [Progress] success: Session created successfully: mcp-session-1 (100%)
```

## Troubleshooting

### Session not found
If you get "Session not found" error:
- Session may have been deleted
- Wrong `sessionId` provided
- Use `session_list` to see available sessions

### Multiple sessions for same project
You can create multiple sessions for the same project, but:
- Each has independent state
- Recommended to delete old sessions first
- Use `session_list` to identify active sessions

### Lost sessionId
If you lose the `sessionId`:
- Use `session_list` to find your project
- Match by `projectPath` and `lastActivityAt`
- If you can't find it, create a new session

## Next Steps

After creating a session:
1. Review [Migration Stages Guide](./MIGRATION_STAGES.md) for detailed stage documentation
2. Read [Streaming Guide](./STREAMING.md) for progress monitoring
3. Check [Error Handling Guide](./ERROR_HANDLING.md) for troubleshooting tips

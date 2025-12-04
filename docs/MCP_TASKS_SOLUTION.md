# MCP Tasks - The Correct Solution for Long-Running Operations

## Executive Summary

You're absolutely right! [Issue #1060](https://github.com/modelcontextprotocol/typescript-sdk/issues/1060) implements **Tasks** (SEP-1686), which **IS the correct solution** for long-running operations like Angular migrations.

**Tasks solve the timeout problem fundamentally differently than progress notifications:**
- ✅ **Tasks**: Tool returns immediately with task ID, client polls for status
- ❌ **Progress notifications**: Tool blocks for entire duration, sends progress updates

## What Are Tasks?

From [PR #1041](https://github.com/modelcontextprotocol/typescript-sdk/pull/1041):

> Tasks enable clients to track long-running operations with explicit status polling and result retrieval capabilities.

### Key Benefits

1. **Immediate Return**: Server creates task and returns immediately (no blocking)
2. **Client Polling**: Client polls task status at intervals (no timeout)
3. **Resumability**: Survives disconnections and reconnections
4. **Result Retrieval**: Results available after completion for TTL duration
5. **Status Tracking**: Explicit states: `working`, `completed`, `failed`, `cancelled`, `input_required`

## How Tasks Work

### Architecture Flow

```
┌─────────┐                    ┌─────────┐
│ Client  │                    │ Server  │
└────┬────┘                    └────┬────┘
     │                              │
     │ 1. callToolStream()          │
     ├─────────────────────────────>│
     │                              │
     │ 2. taskCreated               │
     │<─────────────────────────────┤
     │   { taskId: "abc123" }       │
     │                              │
     │ (Server works in background) │
     │                              │
     │ 3. Poll getTask(taskId)      │
     ├─────────────────────────────>│
     │                              │
     │ 4. taskStatus                │
     │<─────────────────────────────┤
     │   { status: "working" }      │
     │                              │
     │ (Wait pollInterval)          │
     │                              │
     │ 5. Poll getTask(taskId)      │
     ├─────────────────────────────>│
     │                              │
     │ 6. result                    │
     │<─────────────────────────────┤
     │   { status: "completed" }    │
     └──────────────────────────────┘
```

### Client-Side API

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({ /* config */ });

// ✅ Use experimental tasks API
const stream = client.experimental.tasks.callToolStream({
  name: 'migration_stage_v15',
  arguments: { sessionId: 'mcp-123' }
});

// Iterate over streaming responses
for await (const message of stream) {
  switch (message.type) {
    case 'taskCreated':
      console.log('Task started:', message.task.taskId);
      console.log('Poll interval:', message.task.pollInterval);
      break;

    case 'taskStatus':
      console.log('Status update:', message.task.status);
      // working, completed, failed, cancelled, input_required
      break;

    case 'result':
      console.log('Operation completed:', message.result);
      break;

    case 'error':
      console.error('Operation failed:', message.error);
      break;
  }
}
```

### Server-Side API

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTaskStore } from '@modelcontextprotocol/sdk/experimental/tasks/stores/in-memory.js';

// Create McpServer (not Server) for Tasks support
const server = new McpServer(
  { name: '@angular-migration/mcp-server', version: '1.0.0' },
  {
    capabilities: { tools: {}, resources: {}, prompts: {} },
    // ✅ REQUIRED: Provide task store
    experimental: {
      taskStore: new InMemoryTaskStore()
    }
  }
);

// Register task-based tool
server.experimental.tasks.registerToolTask(
  'migration_stage_v15',
  {
    description: 'Execute Angular 15 upgrade (5-10 minutes)',
    inputSchema: z.object({
      sessionId: z.string(),
    }),
    execution: {
      taskSupport: 'required'  // Client MUST use task mode
    }
  },
  {
    // ✅ createTask: Returns immediately
    createTask: async (args, extra) => {
      const { sessionId } = args;

      // Create task with TTL (5 hours)
      const task = await extra.taskStore.createTask({
        ttl: 5 * 60 * 60 * 1000,
        pollInterval: 2000,  // Client should poll every 2s
      });

      // Start background work (non-blocking)
      startMigrationInBackground(task.taskId, sessionId, extra.taskStore);

      // Return task immediately
      return { task };
    },

    // ✅ getTask: Return current status when polled
    getTask: async (args, extra) => {
      return extra.taskStore.getTask(extra.taskId);
    },

    // ✅ getTaskResult: Return final result
    getTaskResult: async (args, extra) => {
      return extra.taskStore.getTaskResult(extra.taskId);
    }
  }
);

// Background worker (async)
async function startMigrationInBackground(
  taskId: string,
  sessionId: string,
  taskStore: TaskStore
) {
  try {
    // Set status to working
    await taskStore.updateTaskStatus(taskId, 'working');

    // Execute long-running migration
    const session = sessionManager.get(sessionId);
    const result = await session.engine.executeStage('migration_stage_v15', {
      progressCallback: (update) => {
        // Progress updates don't block - just logged
        console.error(`[Task ${taskId}] ${update.message}`);
      }
    });

    // Store result
    await taskStore.storeTaskResult(taskId, 'completed', {
      content: [{
        type: 'text',
        text: `Migration to Angular 15 completed successfully`
      }]
    });

  } catch (error) {
    // Store error
    await taskStore.storeTaskResult(taskId, 'failed', {
      content: [{
        type: 'text',
        text: `Migration failed: ${error.message}`
      }],
      isError: true
    });
  }
}
```

## Why Tasks Solve the Timeout Problem

### Problem with Progress Notifications

```
Client                                   Server
  │                                        │
  │ callTool('migration_stage_v15')       │
  ├───────────────────────────────────────>│
  │                                        │ (Executing for 10 minutes...)
  │                                        │ Send progress notification
  │<───────────────────────────────────────┤
  │                                        │
  │ (Client may not reset timeout!)       │
  │                                        │
  ⏱️ TIMEOUT after 2 minutes              │
  │                                        │
  │                                        │ (Still executing...)
  │                                        │
  │                                        │ Complete after 10 minutes
  │                                        │ (but client disconnected)
```

### Solution with Tasks

```
Client                                   Server
  │                                        │
  │ callToolStream('migration_stage_v15') │
  ├───────────────────────────────────────>│
  │                                        │ Create task immediately
  │ taskCreated { taskId: "abc" }         │
  │<───────────────────────────────────────┤
  │                                        │
  │                                        │ (Executing in background...)
  │                                        │
  │ getTask("abc") [every 2s]             │
  ├───────────────────────────────────────>│
  │ taskStatus { status: "working" }      │
  │<───────────────────────────────────────┤
  │                                        │
  │ ⏱️ No timeout - quick polls           │
  │                                        │
  │ getTask("abc")                         │
  ├───────────────────────────────────────>│
  │ result { status: "completed" }        │
  │<───────────────────────────────────────┤
  └────────────────────────────────────────┘
```

**Key Difference:**
- **Progress**: Single long request (2-10 minutes) → timeout
- **Tasks**: Many short requests (polls every 2s) → no timeout

## Implementation Plan

### Phase 1: Convert Server to McpServer

```typescript
// OLD: packages/mcp-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
const server = new Server({ /* config */ });

// NEW: packages/mcp-server/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTaskStore } from '@modelcontextprotocol/sdk/experimental/tasks/stores/in-memory.js';

const server = new McpServer(
  { name: '@angular-migration/mcp-server', version: '1.0.0' },
  {
    capabilities: { tools: {}, resources: {}, prompts: {} },
    experimental: {
      taskStore: new InMemoryTaskStore(),
    }
  }
);
```

### Phase 2: Register Task-Based Tools

For each `migration_stage_*` tool:

```typescript
// packages/mcp-server/src/tools/migration-stages-tasks.ts
import { z } from 'zod';
import type { TaskStore } from '@modelcontextprotocol/sdk/experimental/tasks/interfaces.js';

export function registerMigrationStageTasks(
  server: McpServer,
  sessionManager: SessionManager
) {
  // v15
  server.experimental.tasks.registerToolTask(
    'migration_stage_v15',
    {
      description: 'Execute Angular 15 upgrade (5-10 minutes)',
      inputSchema: z.object({
        sessionId: z.string(),
        skipStandalone: z.boolean().optional(),
        autoConfirm: z.boolean().optional(),
      }),
      execution: {
        taskSupport: 'required'  // Force task mode
      }
    },
    {
      createTask: async (args, extra) => {
        const task = await extra.taskStore.createTask({
          ttl: 5 * 60 * 60 * 1000,  // 5 hours
          pollInterval: 2000,        // Poll every 2s
        });

        // Start in background (non-blocking)
        executeMigrationStageInBackground(
          'migration_stage_v15',
          task.taskId,
          args,
          sessionManager,
          extra.taskStore
        );

        return { task };
      },

      getTask: async (args, extra) => {
        return extra.taskStore.getTask(extra.taskId);
      },

      getTaskResult: async (args, extra) => {
        return extra.taskStore.getTaskResult(extra.taskId);
      }
    }
  );

  // Repeat for v16, v17, v18, v19, v20...
}

// Background worker
async function executeMigrationStageInBackground(
  stageId: string,
  taskId: string,
  args: any,
  sessionManager: SessionManager,
  taskStore: TaskStore
) {
  try {
    await taskStore.updateTaskStatus(taskId, 'working');

    const session = sessionManager.get(args.sessionId);
    const result = await session.engine.executeStage(stageId, {
      progressCallback: (update) => {
        // Just log - doesn't block
        console.error(`[Task ${taskId}] ${update.message}`);
      }
    });

    await taskStore.storeTaskResult(taskId, 'completed', {
      content: [{
        type: 'text',
        text: `Stage ${stageId} completed successfully`
      }]
    });

  } catch (error) {
    await taskStore.storeTaskResult(taskId, 'failed', {
      content: [{
        type: 'text',
        text: `Stage failed: ${error.message}`
      }],
      isError: true
    });
  }
}
```

### Phase 3: Update Client Usage

The client (Zed/Claude Code) must use the experimental tasks API:

```typescript
// Client-side (in Zed/Claude Code)
const stream = client.experimental.tasks.callToolStream({
  name: 'migration_stage_v15',
  arguments: { sessionId: 'mcp-123' }
});

for await (const message of stream) {
  if (message.type === 'taskCreated') {
    console.log('Migration started:', message.task.taskId);
  } else if (message.type === 'taskStatus') {
    console.log('Status:', message.task.status);
  } else if (message.type === 'result') {
    console.log('Completed:', message.result);
  }
}
```

## Does This Solve Our Timeout?

**YES - IF the client uses `callToolStream()`**

### Why It Works

1. **Immediate return**: `createTask()` returns in < 1s (no timeout)
2. **Short polling requests**: Each `getTask()` request completes in < 1s (no timeout)
3. **No long-running requests**: Never wait 10 minutes for a single response

### Client Requirements

The client MUST:
1. Use `client.experimental.tasks.callToolStream()` instead of `client.callTool()`
2. Handle task status updates in the stream
3. Poll automatically based on `pollInterval` returned by server

### If Client Doesn't Support Tasks

If Zed/Claude Code doesn't support experimental Tasks yet:
- Old tools with progress notifications will still work (with timeout risk)
- Can provide both APIs:
  - `migration_stage_v15` - Regular tool with progress (current)
  - `migration_stage_v15_task` - Task-based tool (new)

## Comparison Matrix

| Feature | Progress Notifications | Tasks (SEP-1686) |
|---------|----------------------|------------------|
| **Request Duration** | 5-10 minutes (single request) | < 1 second (immediate return) |
| **Timeout Risk** | ❌ High (client may timeout) | ✅ None (short polls) |
| **Client Support** | Limited (progressToken optional) | ✅ Standard (Tasks in spec) |
| **Resumability** | ❌ No (request must complete) | ✅ Yes (poll after reconnect) |
| **Result Retrieval** | ❌ Only during execution | ✅ Available for TTL duration |
| **Status Tracking** | Limited (progress numbers) | ✅ Explicit states |
| **Cancellation** | Limited | ✅ Built-in support |
| **Best For** | Operations < 2 minutes | Operations > 2 minutes |

## Recommendation

**Use Tasks for Angular migrations:**

1. ✅ **Solves timeout fundamentally** - No long-running requests
2. ✅ **Better UX** - Client can show progress bar from polling
3. ✅ **Resumable** - Survives disconnections
4. ✅ **Standard approach** - Part of MCP specification
5. ✅ **Production-ready** - Merged and released in SDK

## Next Steps

1. **Convert server from `Server` to `McpServer`**
2. **Add `InMemoryTaskStore` to server config**
3. **Register task-based versions of migration tools**
4. **Test with client that supports `callToolStream()`**
5. **Keep old tools for backward compatibility**

## Sources

- [Issue #1060: SEP-1686 Tasks Implementation](https://github.com/modelcontextprotocol/typescript-sdk/issues/1060)
- [PR #1041: Tasks Implementation (MERGED)](https://github.com/modelcontextprotocol/typescript-sdk/pull/1041)
- [TypeScript SDK - Experimental Tasks](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/src/examples)
- [MCP Architecture - Tasks](https://modelcontextprotocol.io/docs/learn/architecture)

## Conclusion

**You were correct!** Issue #1060 (Tasks) IS the solution for long-running operations.

**Why it works:**
- Returns immediately with task ID (no blocking)
- Client polls every 2 seconds (no timeout on polls)
- Background execution completes independently
- Results available after completion

**This is the correct MCP pattern for 5-10 minute operations like Angular migrations.**

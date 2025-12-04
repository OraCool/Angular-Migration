# MCP Progress Notifications - Correct Implementation Analysis

## Executive Summary

After investigating the official MCP specification and SDK, **we are NOT using the correct approach** for progress notifications. Our current implementation has several issues that prevent it from working properly.

## What We're Doing Wrong

### 1. Not Using the Correct API

**Current (WRONG)**:
```typescript
extra.sendNotification({
  method: 'notifications/progress',
  params: {
    progressToken: progressToken || 0,  // ❌ WRONG: Creating fake token
    progress: update.completedSteps || 0,
    total: update.totalSteps,
    message: update.message,
  },
});
```

**Correct (from official examples)**:
```typescript
await server.notification({
  method: "notifications/progress",
  params: {
    progress: i,
    total: steps,
    progressToken,  // ✅ Must come from client request
  },
}, { relatedRequestId: extra.requestId });  // ✅ Must include requestId
```

### 2. Not Checking for progressToken from Client

**Current Issue**: We're creating a fake `progressToken || 0` instead of checking if the client actually sent one.

**Correct Approach**: The client MUST send `progressToken` in the request metadata (`request.params._meta?.progressToken`). If the client doesn't send it, the client doesn't support progress notifications.

```typescript
// ✅ CORRECT
const progressToken = request.params._meta?.progressToken;

if (progressToken !== undefined) {
  // Client supports progress - send notifications
  await server.notification({ ... }, { relatedRequestId: extra.requestId });
}
```

### 3. Missing relatedRequestId

**Critical**: Progress notifications MUST include `relatedRequestId` to correlate with the original request. We're not including this.

```typescript
// ✅ REQUIRED
{ relatedRequestId: extra.requestId }
```

## Official MCP Specification

According to the [MCP Progress specification](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress/):

1. **Client-initiated**: The client provides a `progressToken` in `_meta` field of the request
2. **Token format**: Must be string or integer, unique across all active requests
3. **Notification format**:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "notifications/progress",
     "params": {
       "progressToken": "abc123",
       "progress": 50,
       "total": 100
     }
   }
   ```
4. **Out-of-band**: Notifications are sent asynchronously, don't wait for response

## Working Example from Official SDK

From [`everything.ts`](https://github.com/modelcontextprotocol/servers/blob/main/src/everything/everything.ts):

```typescript
if (name === ToolName.LONG_RUNNING_OPERATION) {
  const validatedArgs = LongRunningOperationSchema.parse(args);
  const { duration, steps } = validatedArgs;
  const stepDuration = duration / steps;

  // ✅ STEP 1: Extract progressToken from request metadata
  const progressToken = request.params._meta?.progressToken;

  for (let i = 1; i < steps + 1; i++) {
    await new Promise((resolve) =>
      setTimeout(resolve, stepDuration * 1000)
    );

    // ✅ STEP 2: Only send if client provided progressToken
    if (progressToken !== undefined) {
      // ✅ STEP 3: Use server.notification() with relatedRequestId
      await server.notification({
        method: "notifications/progress",
        params: {
          progress: i,
          total: steps,
          progressToken,
        },
      }, { relatedRequestId: extra.requestId });
    }
  }

  return {
    content: [{
      type: "text",
      text: `Long running operation completed.`,
    }],
  };
}
```

## Why Our Current Approach Doesn't Work

1. **Using wrong API**: `extra.sendNotification()` vs `server.notification()`
2. **No relatedRequestId**: Client can't correlate notifications with requests
3. **Fake progressToken**: We create `progressToken || 0` instead of checking client support
4. **No request metadata access**: We're not extracting `request.params._meta?.progressToken`

## Client-Side Reality

**Critical Finding**: Even with correct implementation, this might not work because:

From [Issue #461](https://github.com/modelcontextprotocol/typescript-sdk/issues/461):

> "Whether to accept progress (pass `progressToken` to the server) and whether to reset the timeout when receiving progress are usually controlled by the MCP Client itself."

**Known Client Limitations**:
- **Zed**: May not send `progressToken` in requests
- **Claude Code**: Unknown support level
- **Cline**: Reportedly lacks progress notification functionality entirely

## Alternative: Experimental Tasks API

For truly long-running operations (minutes to hours), MCP offers experimental Tasks:

```typescript
// From SDK experimental/tasks
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer({ /* config */ });

// Use Tasks for operations that may take minutes/hours
server.experimental.tasks.requestStream(request, schema, {
  taskCreationParams: {
    title: "Angular 15 Migration",
    description: "Upgrading to Angular 15 with package installation"
  }
});
```

**Benefits of Tasks**:
- Client can poll for status
- Results available after completion
- Survives disconnections
- Better suited for 5-10 minute operations

## Correct Implementation Plan

### Option A: Fix Progress Notifications (Quick Fix)

```typescript
// In packages/mcp-server/src/tools/index.ts
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const { name, arguments: args, _meta } = request.params;

  // ✅ Extract progressToken from request metadata
  const progressToken = _meta?.progressToken;

  const progressCallback: ProgressCallback = (update: ProgressUpdate) => {
    // Only send if client provided progressToken
    if (progressToken !== undefined) {
      // ✅ Use server.notification() with relatedRequestId
      server.notification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress: update.completedSteps || 0,
          total: update.totalSteps,
        },
      }, {
        relatedRequestId: extra.requestId  // ✅ Critical for correlation
      }).catch(err => {
        // Silently ignore if client doesn't support
        console.error('[Progress notification error]', err);
      });
    }
  };

  // ... rest of handler
});
```

### Option B: Use Experimental Tasks (Better for Long Operations)

```typescript
// Wrap long-running tool in Task
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Convert Server to McpServer for Tasks support
const mcpServer = new McpServer(
  { name: '@angular-migration/mcp-server', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

// For long-running operations
mcpServer.setToolHandler('migration_stage_v15', async (args, extra) => {
  // Return task that can be polled
  return await mcpServer.experimental.tasks.createTask({
    title: 'Angular 15 Upgrade',
    description: 'Package update and migration',
  }, async (taskContext) => {
    // Execute with progress updates
    // Client can poll task status
  });
});
```

## Recommendations

### Immediate Actions

1. **Fix our implementation** to match official example:
   - Extract `progressToken` from `request.params._meta`
   - Use `server.notification()` instead of `extra.sendNotification()`
   - Include `relatedRequestId` in notification options
   - Remove fallback to `progressToken || 0`

2. **Test with progressToken logging**:
   ```typescript
   console.error(`[DEBUG] progressToken from client: ${progressToken}`);
   console.error(`[DEBUG] progressToken type: ${typeof progressToken}`);
   console.error(`[DEBUG] progressToken undefined: ${progressToken === undefined}`);
   ```

3. **Document client requirements** in README:
   - Client must send `progressToken` in request `_meta`
   - Client must reset timeout on progress notifications
   - Not all clients support this feature

### Future Considerations

1. **Evaluate Tasks API** for Angular migrations (5-10 minute operations)
2. **Add client capability detection** to warn users if client doesn't support progress
3. **Consider fallback strategy** for clients without progress support:
   - Break migrations into smaller stages
   - Provide pre-flight duration estimates
   - Document expected completion times

## Sources

- [MCP Progress Specification](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress/)
- [Official Example: everything.ts](https://github.com/modelcontextprotocol/servers/blob/main/src/everything/everything.ts)
- [TypeScript SDK Issue #461: Progress notifications](https://github.com/modelcontextprotocol/typescript-sdk/issues/461)
- [GitHub Issue #982: Long-running tools](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/982)
- [MCP Architecture Overview](https://modelcontextprotocol.io/docs/learn/architecture)

## Conclusion

**Our current implementation violates MCP specification in 3 critical ways**:
1. Not extracting `progressToken` from client request
2. Using wrong API (`extra.sendNotification` vs `server.notification`)
3. Missing `relatedRequestId` for correlation

**Even after fixing, it may not work** because:
- Zed/Claude Code may not send `progressToken`
- Clients may not reset timeout on progress notifications
- This is a client-side limitation, not server issue

**Best path forward**:
1. Fix implementation to match specification (correct approach)
2. Add extensive logging to confirm client support
3. Consider experimental Tasks API for true long-running operations
4. Document client requirements clearly

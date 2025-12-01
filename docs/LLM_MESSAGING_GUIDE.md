# LLM Messaging in Zed Agent Thread

## Overview

When the Angular Migration Agent uses LLM to fix errors, all reasoning and decisions are now streamed to the Zed agent thread via ACP `SessionUpdate` messages. This provides full transparency into what the AI is thinking and doing.

## Message Flow

### 1. Pattern Fix Attempt (Silent)
When a pattern-based fix matches, no LLM is needed. Only the result is shown:
```
✅ Pattern fix: Fix peer dependency conflicts when upgrading to Angular 15
```

### 2. LLM Fallback Triggered
When no pattern matches, the agent notifies the user:
```
🤖 No pattern match found. Consulting LLM for fix...
```

### 3. LLM Context Sent
Before calling OpenAI, the agent shows it's preparing the request:
```
📝 Sending error context to LLM...
```

### 4. LLM Analysis (Reasoning)
After receiving the LLM response, the agent shows the AI's reasoning:
```
💡 LLM Analysis:
The error indicates that polyfills.ts is missing from the TypeScript compilation.
Angular 15 changed the polyfills configuration format from a single file path
to an array of paths. This requires updates to angular.json and tsconfig files.
```

### 5. LLM Fix Strategy
The final fix strategy is summarized:
```
✅ LLM Fix Strategy: Update polyfills configuration for Angular 15
Commands: 3
```

## Implementation Details

### Architecture
```
handler.ts (ACP interface)
  ↓ creates with callbacks
executor.ts (workflow execution)
  ↓ passes callbacks
llm-fixer.ts (LLM service)
  ↓ sends messages via
ACP SessionUpdate → Zed agent thread
```

### Code Changes

#### 1. Executor Callbacks (`executor.ts`)
```typescript
export interface ExecutorCallbacks {
  sendThought?: (message: string) => Promise<void>;
  sendMessage?: (message: string) => Promise<void>;
}

constructor(
  private engine: WorkflowEngine,
  private context: WorkflowContext,
  callbacks?: ExecutorCallbacks
)
```

#### 2. LLM Messaging (`llm-fixer.ts`)
```typescript
if (this.callbacks?.sendThought) {
  await this.callbacks.sendThought('📝 Sending error context to LLM...');
}

const response = await this.openai!.chat.completions.create({...});

if (this.callbacks?.sendThought) {
  await this.callbacks.sendThought(`💡 LLM Analysis:\n${parsed.reasoning || parsed.explanation}`);
}
```

#### 3. Handler Wiring (`handler.ts`)
```typescript
const executor = new WorkflowExecutor(engine, context, {
  sendThought: (msg) => this.sendThought(sessionId, msg),
  sendMessage: (msg) => this.sendMessage(sessionId, msg),
});
```

## Benefits

### 1. Transparency
Users can see exactly what the LLM is analyzing and why it chose a particular fix.

### 2. Debugging
When fixes fail, the LLM's reasoning helps understand what went wrong.

### 3. Learning
Users can learn Angular migration patterns by reading the LLM's analysis.

### 4. Trust
Seeing the thought process builds confidence in the automated fixes.

### 5. Cost Awareness
Users are notified when LLM is consulted (vs. free pattern-based fixes).

## Message Types

### `sendThought` (Reasoning)
Used for:
- LLM analysis and reasoning
- Internal decision-making
- Progress updates during LLM calls

Rendered in Zed as **thinking/reasoning messages** (lighter styling).

### `sendMessage` (Results)
Used for:
- Final fix strategies
- Action confirmations
- User-facing results

Rendered in Zed as **primary messages** (normal styling).

## Example Session

```
User: Run migration to Angular 15

Agent:
  ℹ️ Starting Angular 14 → 15 upgrade...
  📦 Running: ng update @angular/core@15...
  
  [build fails]
  
  ❌ Validation failed: Build check
  Error: polyfills.ts is missing from the TypeScript compilation
  
  🤖 No pattern match found. Consulting LLM for fix...
  📝 Sending error context to LLM...
  
  💡 LLM Analysis:
  Angular 15 changed the polyfills configuration format. The error occurs
  because tsconfig.app.json doesn't include src/polyfills.ts in the files
  array, and angular.json expects polyfills to be an array of paths.
  
  The fix requires:
  1. Adding polyfills.ts to tsconfig.app.json files array
  2. Converting angular.json polyfills from string to array
  3. Ensuring polyfills.ts exists with required imports
  
  ✅ LLM Fix Strategy: Update polyfills configuration for Angular 15
  Commands: 3
  
  ✅ Auto-fix applied successfully. Re-running validation...
  ✅ Build check passed
```

## Cost Control

Pattern-based fixes (90%+ of errors): **$0.00**
LLM fixes (remaining 10%): **~$0.10-0.50 per fix** (GPT-4o)

Users can see when LLM is consulted via the 🤖 message, making costs predictable.

## Future Enhancements

1. **Permission Requests**: Ask user before calling LLM (ACP enhancement)
2. **Cost Estimates**: Show estimated cost before LLM call
3. **Reasoning Capture**: Save LLM reasoning to generate new patterns
4. **Feedback Loop**: Convert successful LLM fixes into patterns automatically

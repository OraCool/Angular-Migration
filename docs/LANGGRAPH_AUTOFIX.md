# LangGraph Auto-Fix Feature

## Overview

The auto-fix feature provides **intelligent, automated error fixing** using a hybrid approach:
1. **Pattern-based fixes** (fast, free) - Common known issues
2. **LLM-based fixes** (intelligent, OpenAI API) - Complex unknown errors

This creates a **fix-retry loop** that automatically resolves build, test, and lint errors during migration.

## How It Works

### Flow Diagram

```
Validation Fails (build/test/lint)
         ↓
   autoFixOnError enabled?
         ↓ YES
   ┌─────────────┐
   │  AUTO-FIX   │
   │   NODE      │
   └──────┬──────┘
          │
    Try Pattern Fix
          ↓
    Pattern found?
      ↙     ↘
    YES      NO
     ↓        ↓
   Apply   Try LLM Fix
          (GPT-4)
     ↓        ↓
   ┌──────────┴─────┐
   │  Apply Fix     │
   │  Commands      │
   └──────┬─────────┘
          │
    Fix successful?
      ↙     ↘
    YES      NO
     ↓        ↓
Re-run    Rollback
Validation
```

### State Tracking

The workflow tracks:
- **Auto-fix attempts** - How many times we've tried to fix
- **Fix history** - What fixes were applied
- **Max attempts** - Limit to prevent infinite loops (default: 3)
- **Last validation name** - Which validation failed

## Configuration

### Enabling Auto-Fix on Validations

In your workflow steps (src/workflow/engine.ts):

```typescript
{
  id: 'upgrade-v16',
  title: 'Upgrade to Angular 16',
  validations: [
    {
      type: 'build',
      name: 'build-v16',
      command: 'npm run build',
      failOnError: false,
      autoFixOnError: true, // <-- Enable auto-fix
    },
    {
      type: 'test',
      name: 'test-v16',
      command: 'npm test -- --watch=false',
      failOnError: false,
      autoFixOnError: true, // <-- Enable auto-fix
    },
  ],
}
```

### Max Attempts Configuration

Control how many times auto-fix will attempt before giving up:

```typescript
const initialState = StateHelpers.createInitialState({
  sessionId: 'my-session',
  projectPath: '/path/to/project',
  currentVersion: '14',
  targetVersion: '20',
  // ... other config
});

// Override max attempts (default is 3)
initialState.maxAutoFixAttempts = 5;
```

## Pattern-Based Fixes

Fast, free fixes for common known issues. Examples:

### Missing Imports

**Error:**
```
error TS2304: Cannot find name 'Component'
```

**Fix:**
```bash
# Add missing import
sed -i "1i import { Component } from '@angular/core';" src/app/app.component.ts
```

### Deprecated APIs

**Error:**
```
'@ViewChild' requires a 'static' flag
```

**Fix:**
```bash
# Add static flag
sed -i 's/@ViewChild(\([^)]*\))/@ViewChild(\1, { static: true })/' src/**/*.ts
```

### Missing Dependencies

**Error:**
```
Cannot find module '@angular/forms'
```

**Fix:**
```bash
npm install @angular/forms
```

## LLM-Based Fixes

For complex errors that don't match patterns, the system uses GPT-4:

### Process

1. **Send to LLM:**
   - Full error message
   - File context (if available)
   - Angular version
   - Error type (build/test/lint)

2. **Receive:**
   - Fix commands to execute
   - Explanation of the issue
   - File changes (if needed)

3. **Apply:**
   - Execute fix commands
   - Track in history
   - Re-run validation

### Example: Complex Type Error

**Error:**
```
error TS2322: Type 'Observable<User | null>' is not assignable to type 'Observable<User>'.
  Type 'User | null' is not assignable to type 'User'.
```

**LLM Fix:**
```typescript
// Add RxJS operator to filter null values
import { filter } from 'rxjs/operators';

this.user$ = this.store.select('user').pipe(
  filter((user): user is User => user !== null)
);
```

## State Schema

### Auto-Fix Fields

```typescript
interface MigrationState {
  // Auto-fix control
  shouldAutoFix: boolean;           // Should route to autoFix node?
  currentAutoFixAttempt: number;    // Current attempt count
  maxAutoFixAttempts: number;       // Max attempts before giving up

  // Tracking
  lastValidationName: string | null; // Which validation failed
  autoFixHistory: AutoFixResult[];   // History of all fixes
}

interface AutoFixResult {
  validationName: string;    // Name of validation that failed
  errorBefore: string;       // Error message before fix
  fixApplied: string;        // Description of fix applied
  usedLLM: boolean;          // true if LLM was used, false if pattern
  timestamp: Date;           // When fix was applied
  success: boolean;          // Did fix resolve the error?
  errorAfter?: string;       // Error message after fix (if still failing)
}
```

## Graph Integration

### Nodes

**autoFix Node** - Located at: `src/workflow/langgraph/nodes/auto-fix.ts`

Responsibilities:
1. Check max attempts not exceeded
2. Get last validation error
3. Try pattern fix first
4. Fallback to LLM if needed
5. Execute fix commands
6. Record in history
7. Signal retry or rollback

### Edges

**shouldAutoFixStep** - Located at: `src/workflow/langgraph/edges/auto-fix.ts`

Routes from executeStep:
- `'autoFix'` - if validation failed with autoFixOnError=true
- `'retry'` - if should retry without auto-fix
- `'rollback'` - if should rollback
- `'checkpoint'` - if successful

**afterAutoFix** - Located at: `src/workflow/langgraph/edges/auto-fix.ts`

Routes from autoFix:
- `'executeStep'` - if fix applied, retry validation
- `'rollback'` - if fix failed or max attempts reached

## Monitoring

### Viewing Fix History

```typescript
for await (const state of streamMigrationWorkflow(workflow, initialState)) {
  // Check auto-fix history
  if (state.autoFixHistory.length > 0) {
    const lastFix = state.autoFixHistory[state.autoFixHistory.length - 1];

    console.log('Auto-fix applied:');
    console.log(`  Validation: ${lastFix.validationName}`);
    console.log(`  Used LLM: ${lastFix.usedLLM ? 'Yes' : 'No (pattern)'}`);
    console.log(`  Fix: ${lastFix.fixApplied}`);
    console.log(`  Success: ${lastFix.success}`);
  }

  // Check current attempt
  if (state.shouldAutoFix) {
    console.log(`Auto-fix attempt ${state.currentAutoFixAttempt + 1}/${state.maxAutoFixAttempts}`);
  }
}
```

### ACP Integration (Zed IDE)

The LangGraph handler sends real-time updates:

```typescript
export class LangGraphWorkflowHandler {
  async handleMigrationWorkflow(sessionId: SessionId, context: WorkflowContext) {
    for await (const state of streamMigrationWorkflow(workflow, initialState)) {
      // Report auto-fix attempts
      if (state.shouldAutoFix) {
        await this.sendMessage(
          sessionId,
          `🔧 **Auto-fix triggered** for ${state.lastValidationName}\n` +
          `Attempt ${state.currentAutoFixAttempt + 1}/${state.maxAutoFixAttempts}`
        );
      }

      // Report fix results
      if (state.autoFixHistory.length > 0) {
        const lastFix = state.autoFixHistory[state.autoFixHistory.length - 1];

        if (lastFix.success) {
          await this.sendMessage(
            sessionId,
            `✅ **Auto-fix successful**\n` +
            `${lastFix.usedLLM ? '🤖 LLM' : '📋 Pattern'}: ${lastFix.fixApplied}`
          );
        } else {
          await this.sendMessage(
            sessionId,
            `⚠️ **Auto-fix failed**\n` +
            `Will ${state.shouldAutoFix ? 'retry' : 'rollback'}`
          );
        }
      }
    }
  }
}
```

## Cost Management

### Pattern Fixes: $0

Pattern-based fixes are free and instant:
- No API calls
- No token usage
- Sub-second execution

### LLM Fixes: GPT-4 API Costs

LLM fixes use OpenAI API:
- ~500-2000 tokens per fix request
- GPT-4 Turbo: ~$0.01-$0.04 per fix
- Typical migration: 5-10 LLM fixes = $0.05-$0.40

**Cost Optimization:**
- Patterns are tried first (free)
- LLM only for unknown errors
- Max attempts limit prevents runaway costs
- Track `usedLLM` in history to monitor

## Example: Full Auto-Fix Cycle

### Step 1: Build Fails

```
npm run build

ERROR in src/app/app.component.ts:15:3
error TS2304: Cannot find name 'Component'
```

### Step 2: Auto-Fix Triggered

```
[AutoFix] Attempting fix for: build-v16
[AutoFix] Attempt 1/3
[AutoFix] Error: Cannot find name 'Component'
```

### Step 3: Pattern Match Found

```
[LLM] Pattern match found: 'Missing @angular/core import'
[LLM] Description: Add missing import statement
[LLM] Cost: $0 (pattern-based fix)
```

### Step 4: Fix Applied

```
[AutoFix] Running: sed -i "1i import { Component } from '@angular/core';" src/app/app.component.ts
[AutoFix] ✅ Fix applied successfully
```

### Step 5: Re-Run Validation

```
[StepExecutor] Re-running validation: build-v16
npm run build
✅ Build successful!
```

### Step 6: Continue Migration

```
[AutoFix] Validation now passing after auto-fix
[Workflow] Moving to next step
```

## Troubleshooting

### Auto-Fix Not Triggering

**Check:**
1. Is `autoFixOnError: true` on the validation?
2. Is `OPENAI_API_KEY` set for LLM fixes?
3. Are you within `maxAutoFixAttempts`?

### Fix Doesn't Resolve Error

**Possible causes:**
1. Error is too complex for current patterns
2. LLM suggested incorrect fix
3. Fix needs manual review

**Solution:**
Check `autoFixHistory` to see what was attempted:

```typescript
const lastFix = state.autoFixHistory[state.autoFixHistory.length - 1];
console.log('Fix attempted:', lastFix.fixApplied);
console.log('Error after fix:', lastFix.errorAfter);
```

### Max Attempts Reached

```
[AutoFix] Max auto-fix attempts (3) reached
[Edge:AutoFix] Routing to rollback
```

**Solution:**
- Increase `maxAutoFixAttempts` if needed
- Check pattern fixes are up-to-date
- Review error manually

## Best Practices

### 1. Start with Patterns

Add common errors to pattern-fixer.ts:

```typescript
export const PATTERN_FIXES: PatternFix[] = [
  {
    name: 'missing-angular-core-import',
    description: 'Add missing @angular/core import',
    detect: (error) => /Cannot find name '(Component|Injectable|NgModule)'/.test(error),
    async fix(projectRoot, error) {
      const match = error.match(/Cannot find name '(\w+)'/);
      const symbol = match?.[1];
      return [`echo "import { ${symbol} } from '@angular/core';" | cat - src/app/app.component.ts > temp && mv temp src/app/app.component.ts`];
    },
  },
];
```

### 2. Monitor LLM Usage

Track costs by checking `usedLLM` flag:

```typescript
const llmFixesCount = state.autoFixHistory.filter(f => f.usedLLM).length;
const estimatedCost = llmFixesCount * 0.02; // $0.02 average per LLM fix
console.log(`LLM fixes used: ${llmFixesCount} (~$${estimatedCost.toFixed(2)})`);
```

### 3. Set Reasonable Limits

```typescript
// For development/testing: allow more attempts
maxAutoFixAttempts: 5

// For production migrations: limit attempts
maxAutoFixAttempts: 3
```

### 4. Review Fix History

Always review what fixes were applied:

```typescript
if (state.isComplete) {
  console.log('\\n📋 Auto-Fix Summary:');
  state.autoFixHistory.forEach((fix, i) => {
    console.log(`${i + 1}. ${fix.validationName}`);
    console.log(`   ${fix.usedLLM ? '🤖 LLM' : '📋 Pattern'}: ${fix.fixApplied}`);
    console.log(`   ${fix.success ? '✅' : '❌'} ${fix.success ? 'Resolved' : 'Failed'}`);
  });
}
```

## See Also

- [LangGraph Architecture](./LANGGRAPH_ARCHITECTURE.md)
- [LangGraph Usage Guide](./LANGGRAPH_USAGE.md)
- [LangGraph Quick Start](./LANGGRAPH_QUICKSTART.md)
- [Pattern Fixer](../src/services/pattern-fixer.ts)
- [LLM Fixer](../src/services/llm-fixer.ts)

# Subtask Architecture for Granular Migration Control

## Problem Statement

The user experienced three critical issues with the stage-level migration tools:

1. **Timeouts**: Even with Tasks API, long `npm install` operations (5-10 minutes) still caused timeouts
2. **Lack of Control**: Couldn't retry individual operations (e.g., retry just `npm install` without redoing package updates)
3. **Poor Progress Visibility**: During 5-10 minute operations, users couldn't see what was happening

## Solution: Granular Subtasks

Split each Angular version upgrade into **5 atomic subtasks**:

### Subtask Breakdown

| Order | Subtask ID | Operation | Duration | Can Timeout? | Purpose |
|-------|-----------|-----------|----------|--------------|---------|
| 0 | `update_packages` | Update package.json | < 1 min | ❌ | Fast, no risk |
| 1 | `install_dependencies` | Run npm install | 5-10 min | ⚠️ **YES** | **Isolate timeout culprit** |
| 2 | `run_migrations` | Angular migrations | 2-5 min | Maybe | Separate from install |
| 3 | `build_validate` | Build & validate | 2-5 min | Maybe | Can skip/retry |
| 4 | `commit` | Git commit | < 1 min | ❌ | Fast cleanup |

### Benefits

1. **Timeout Isolation**:
   - If `install_dependencies` times out → retry JUST that subtask
   - No need to redo package updates or re-run migrations

2. **Better Control**:
   - Skip `build_validate` if needed (quick iteration)
   - Retry `run_migrations` after fixing issues
   - Commit separately after reviewing changes

3. **Progress Visibility**:
   - See exactly which operation is running
   - Know if stuck on npm install vs migrations
   - Better ETAs for each phase

4. **Simpler Debugging**:
   - If build fails → it's isolated to that subtask
   - If migrations fail → retry without reinstalling
   - Clear separation of concerns

## Tool Design

### Hybrid Approach

**High-level tools (simple usage)**:
- `migration_stage_v15` → Runs all 5 subtasks automatically
- Users who want "just migrate v15" use this

**Granular subtask tools (power users)**:
- `migration_v15_update_packages`
- `migration_v15_install_dependencies` ← **Most important for timeout isolation**
- `migration_v15_run_migrations`
- `migration_v15_build_validate`
- `migration_v15_commit`

### Total Tools

- **6 Angular versions** (v15-v20) × **5 subtasks each** = **30 subtask tools**
- **8 high-level stage tools** (pre-migration, v15-v20, post-migration)
- **4 management tools** (get_current, skip_to, get_all, validate_node)
- **4 session tools** (create, list, get, delete)

**Total: ~46 tools** (manageable, well-organized)

## Implementation

### 1. Subtask Definitions

Created `SubtaskDefinition` interface in `workflow-stages.ts`:
```typescript
export interface SubtaskDefinition {
  id: string;                    // e.g., 'migration_v15_install_dependencies'
  name: string;                  // e.g., 'Install Dependencies'
  description: string;
  stageId: string;               // Parent stage ID
  order: number;                 // Execution order (0-4)
  estimatedDuration: string;
  canTimeout: boolean;           // Mark long operations
  requiresConfirmation: boolean;
  dependencies?: string[];       // Previous subtask dependencies
}
```

### 2. Subtask Generation

Helper function creates 5 subtasks per version:
```typescript
function createVersionSubtasks(version: string): SubtaskDefinition[] {
  return [
    { id: `migration_v${version}_update_packages`, ... },
    { id: `migration_v${version}_install_dependencies`, canTimeout: true, ... },
    { id: `migration_v${version}_run_migrations`, ... },
    { id: `migration_v${version}_build_validate`, ... },
    { id: `migration_v${version}_commit`, ... },
  ];
}
```

### 3. Task Handlers

Each subtask is a **Task-based tool** (like stage tools):
- Returns immediately with task ID
- Polls every 2 seconds
- Background execution
- Progress updates

### 4. State Tracking

Track completion of each subtask:
```typescript
{
  stageId: 'migration_stage_v15',
  completedSubtasks: [
    'migration_v15_update_packages',
    'migration_v15_install_dependencies',
    'migration_v15_run_migrations'
    // Still need: build_validate, commit
  ]
}
```

## Usage Scenarios

### Scenario 1: Normal Migration (High-level tool)

```
User: Use migration_stage_v15 tool
→ Runs all 5 subtasks automatically
→ Progress: "Update packages... Install dependencies (5 min)... Migrations... Build... Commit"
→ Success: v15 complete
```

### Scenario 2: Timeout on npm install

```
User: Use migration_stage_v15 tool
→ Update packages ✅
→ Install dependencies ⏱️ TIMEOUT after 10 minutes
→ Status: Failed at subtask 'install_dependencies'

User: Retry just the failed subtask
Use migration_v15_install_dependencies tool
→ Retry npm install only
→ Success ✅
→ Resume from next subtask

User: Continue with remaining subtasks
Use migration_v15_run_migrations tool
→ Run migrations ✅
Use migration_v15_build_validate tool
→ Build ✅
Use migration_v15_commit tool
→ Commit ✅
```

### Scenario 3: Skip build during iteration

```
User: Use migration_v15_update_packages tool ✅
User: Use migration_v15_install_dependencies tool ✅
User: Use migration_v15_run_migrations tool ✅
User: Skip build_validate (want to test first)
User: Use migration_v15_commit tool ✅
```

## Next Steps

1. ✅ Create subtask definitions in `workflow-stages.ts`
2. ✅ Export subtask types from workflow-engine
3. ⏳ Create subtask task handlers in `migration-subtasks.ts`
4. ⏳ Register 30 subtask tools in MCP server
5. ⏳ Test timeout isolation and retry scenarios
6. ⏳ Update user documentation

## Expected Outcomes

1. **No more timeouts** - npm install isolated to 1 subtask
2. **Easy retry** - Retry just the failed operation
3. **Better visibility** - See exactly what's running
4. **More control** - Skip/retry individual steps
5. **Faster iteration** - Don't redo everything on failure

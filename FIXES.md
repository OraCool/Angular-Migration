# Recent Fixes

## Issue: Agent Stops After Backup

**Problem:** The agent created a backup but didn't continue with the next migration steps.

**Root Cause:**
1. The first workflow step (`pre-migration-backup`) had `requiresBackup: true` AND a backup script action, causing a double backup attempt
2. The backup step tried to run external scripts that didn't need to be executed
3. The workflow logic didn't properly handle the backup-only step

**Fixes Applied:**

### 1. Simplified Backup Step
**File:** `src/workflow/engine.ts`
- Changed `pre-migration-backup` step to have empty actions and validations
- Set `requiresBackup: false` since the handler creates the backup directly
- This prevents the confusing double-backup scenario

### 2. Updated Backup Logic in Handler
**File:** `src/workflow/handler.ts`
- Modified backup logic to handle the explicit `pre-migration-backup` step
- Backup is now created when:
  - Step ID is `'pre-migration-backup'`, OR
  - Step has `requiresBackup: true` (for later steps)
- Ensures backup is created for the first step

### 3. Added .gitignore Support
**File:** `src/workflow/executor.ts`
- Added `updateGitignore()` method
- Automatically adds `angular-backup-*` pattern to `.gitignore`
- Creates `.gitignore` if it doesn't exist
- Silently fails if `.gitignore` update fails (non-critical operation)

### 4. Custom Folder Support
**Files:** `src/index.ts`, `src/workflow/handler.ts`
- Added regex to extract custom folder from user query
- Supports patterns like:
  - `in current_app`
  - `from my-app`
  - `at /absolute/path`
- Resolves relative paths from session cwd
- Uses absolute paths as-is

## Testing

After these fixes, the workflow should:
1. ✅ Create initial backup successfully
2. ✅ Add backup folder to .gitignore
3. ✅ Continue to the next validation step
4. ✅ Support custom project folders
5. ✅ Complete all 11 migration steps

## How to Test

```bash
# 1. Rebuild the agent
npm run build

# 2. Restart Zed (completely quit and reopen)

# 3. Open an Angular project
cd /path/to/angular-project
zed .

# 4. Start migration
run step-by-step migration

# Or with custom folder:
run step-by-step migration in my-app
```

## Expected Behavior

The agent should now:
1. Show introduction message
2. Create backup for step 1
3. Update .gitignore with backup pattern
4. Continue to step 2 (validation)
5. Pause for user confirmation at step 3
6. Complete all steps until final report

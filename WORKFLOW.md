# Step-by-Step Migration Workflow

This document describes the automated workflow for migrating Angular applications from version 14 to 20.

## Overview

The workflow engine provides a **guided, incremental migration** with:

- ✅ **11 sequential steps** from Angular 14→20
- ✅ **Automatic backups** before critical changes
- ✅ **User confirmation** for breaking changes
- ✅ **Rollback support** if steps fail
- ✅ **Validation** (build, lint, tests) after each step

## Starting the Workflow

In Zed Assistant, request a step-by-step migration:

```
@Angular Migration run step-by-step migration
```

or

```
@Angular Migration start migration workflow
```

## Workflow Steps

### Step 1: Pre-Migration Backup
- **Purpose**: Create full project backup (excluding node_modules)
- **Confirmation**: No
- **Actions**:
  - Run `scripts/backup.sh`
  - Store backup path
- **Validations**:
  - Verify backup exists and contains essential files

### Step 2: Pre-Migration Validation
- **Purpose**: Establish baseline before migration
- **Confirmation**: No
- **Actions**:
  - Install current dependencies
- **Validations**:
  - Build must succeed
  - Lint check (non-blocking)
  - Tests run (non-blocking)

### Step 3: Upgrade to Angular 15
- **Purpose**: Update to Angular 15 (standalone components support)
- **Confirmation**: ⚠️ **YES**
- **Actions**:
  - `ng update @angular/core@15 @angular/cli@15`
  - `ng update @angular/material@15`
- **Validations**:
  - Build must succeed
  - Tests must pass
- **Rollback**: Available

### Step 4: Migrate to Standalone Components
- **Purpose**: Convert all components from NgModule to standalone
- **Confirmation**: ⚠️ **YES**
- **Actions**:
  - `ng generate @angular/core:standalone`
- **Validations**:
  - Build must succeed
  - Lint check (non-blocking)
  - Tests must pass
- **Rollback**: Available

### Step 5: Upgrade to Angular 16
- **Purpose**: Update to Angular 16 (Signals introduced)
- **Confirmation**: ⚠️ **YES**
- **Actions**:
  - `ng update @angular/core@16 @angular/cli@16`
  - `ng update @angular/material@16`
- **Validations**:
  - Build must succeed
  - Tests must pass
- **Rollback**: Available

### Step 6: Upgrade to Angular 17
- **Purpose**: Update to Angular 17 (New control flow syntax)
- **Confirmation**: ⚠️ **YES**
- **Actions**:
  - `ng update @angular/core@17 @angular/cli@17`
  - `ng update @angular/material@17`
- **Validations**:
  - Build must succeed
  - Tests must pass
- **Rollback**: Available

### Step 7: Migrate Control Flow Syntax
- **Purpose**: Convert `*ngIf/*ngFor/*ngSwitch` to `@if/@for/@switch`
- **Confirmation**: ⚠️ **YES**
- **Actions**:
  - `ng generate @angular/core:control-flow`
- **Validations**:
  - Build must succeed
  - Tests must pass
- **Rollback**: Available

### Step 8: Upgrade to Angular 18
- **Purpose**: Update to Angular 18 (Material 3, Zoneless)
- **Confirmation**: ⚠️ **YES**
- **Actions**:
  - `ng update @angular/core@18 @angular/cli@18`
  - `ng update @angular/material@18`
- **Validations**:
  - Build must succeed
  - Tests must pass
- **Rollback**: Available

### Step 9: Upgrade to Angular 19
- **Purpose**: Update to Angular 19
- **Confirmation**: ⚠️ **YES**
- **Actions**:
  - `ng update @angular/core@19 @angular/cli@19`
  - `ng update @angular/material@19`
- **Validations**:
  - Build must succeed
  - Tests must pass
- **Rollback**: Available

### Step 10: Upgrade to Angular 20
- **Purpose**: Final upgrade to Angular 20
- **Confirmation**: ⚠️ **YES**
- **Actions**:
  - `ng update @angular/core@20 @angular/cli@20`
  - `ng update @angular/material@20`
- **Validations**:
  - Build must succeed
  - Lint check (non-blocking)
  - Tests must pass
- **Rollback**: Available

### Step 11: Post-Migration Report
- **Purpose**: Generate comprehensive migration summary
- **Confirmation**: No
- **Actions**:
  - Run `scripts/generate-report.sh`
  - Create `MIGRATION_REPORT.md`
- **Validations**: None

## User Interaction

### Confirmation Prompts

When a step requires confirmation, the agent will display:

```
## Confirmation Required: Upgrade to Angular 15

Update Angular from v14 to v15 (Standalone Components introduced)

**Actions to be performed:**
  - Update Angular to version 15
  - Update Angular Material to version 15

**Validations:**
  - Verify build after v15 upgrade
  - Verify tests pass after v15 upgrade

⚠️ **Rollback available** if this step fails

**Proceed with this step?** (yes/no)
```

### Responding to Confirmations

Reply with one of:

- **To proceed**: `yes`, `y`, `confirm`, `proceed`, `continue`, `ok`, `sure`
- **To cancel**: `no`, `n`, `cancel`, `stop`, `abort`

The agent waits for your response before executing the step.

## Progress Tracking

The agent displays a live plan showing:

- ✅ **Completed steps** - Marked as done
- 🔄 **Current step** - In progress
- ⏳ **Pending steps** - Not yet started

Example:
```
Progress: 3/11 steps (27%)

✅ Pre-Migration Backup
✅ Pre-Migration Validation
✅ Upgrade to Angular 15
🔄 Migrate to Standalone Components
⏳ Upgrade to Angular 16
⏳ Upgrade to Angular 17
...
```

## Handling Failures

If a step fails, the agent will:

1. **Mark the step as failed**
2. **Display the error message**
3. **Offer options**:
   - Retry this step
   - Rollback to previous backup
   - Skip this step (not recommended)
   - Cancel migration

### Rolling Back

If you need to rollback to the last backup:

```
@Angular Migration rollback migration
```

The agent will:
1. Remove current project files (except `.git`)
2. Restore from the most recent backup
3. Reinstall dependencies

A safety backup of your current state is created before restoring.

## Configuration Options

### Skip Tests

If you want to skip running tests (not recommended):

```
@Angular Migration run migration workflow skip tests
```

### Skip Linting

If you want to skip linting checks:

```
@Angular Migration run migration workflow skip lint
```

### Auto-Confirm Mode

⚠️ **Use with caution** - Auto-approve all confirmations:

```
@Angular Migration run migration workflow auto confirm
```

This mode is useful for testing but bypasses all safety checks.

## External Scripts

The workflow executes these shell scripts:

### `scripts/backup.sh`
- Creates timestamped backup directory
- Uses `rsync` to copy files (excludes node_modules, dist, .git)
- Generates `backup-info.json` metadata
- Returns backup path

### `scripts/restore-backup.sh`
- Takes backup directory as argument
- Creates safety backup of current state
- Removes current files (except .git)
- Restores from backup
- Reinstalls dependencies

### `scripts/verify-backup.sh`
- Checks backup directory exists
- Verifies essential files present (package.json, tsconfig.json, angular.json)
- Displays backup metadata
- Returns success/failure

### `scripts/install.sh`
- Removes node_modules and package-lock.json
- Performs clean `npm install`
- Shows installed Angular CLI version

### `scripts/generate-report.sh`
- Creates `MIGRATION_REPORT.md` in project directory
- Documents completed migrations
- Lists dependencies
- Provides recommendations
- Notes future considerations

All scripts support both macOS and Linux.

## Workflow State

The workflow engine maintains state including:

- Current step index
- Completed steps list
- Failed steps list
- Backup path (for rollback)
- Validation results
- User confirmation status

State is session-specific and cleared when the workflow completes or is cancelled.

## Best Practices

1. **Commit before starting**
   ```bash
   git add .
   git commit -m "chore: pre-migration checkpoint"
   ```

2. **Run on a branch**
   ```bash
   git checkout -b feature/angular-20-migration
   ```

3. **Review changes between steps**
   ```bash
   git diff
   ```

4. **Keep backups**
   - Backups are created automatically
   - Don't delete them until migration is complete

5. **Test thoroughly**
   - Don't skip test validations
   - Run manual E2E tests after completion

6. **Document issues**
   - Note any manual fixes required
   - Update MIGRATION_REPORT.md

## Troubleshooting

### "Backup failed"
- Check disk space
- Verify write permissions on parent directory
- Ensure rsync is installed

### "Build validation failed"
- Review error output from the agent
- Check if dependencies are compatible
- Try: `rm -rf node_modules && npm install`

### "Tests failed after upgrade"
- Review test output
- Check for breaking API changes
- Update test configurations if needed
- Consider skipping tests temporarily (not recommended)

### "Rollback not working"
- Verify backup path exists
- Check backup-info.json is present
- Try manual restore: `cp -R /backup/path ./project`

### "Agent stops responding"
- Check Zed logs: View → Toggle Log Panel
- Restart Zed
- Rebuild agent: `npm run build`

## Advanced Usage

### Custom Workflow Steps

Edit `src/workflow/engine.ts` to add custom steps:

```typescript
{
  id: 'custom-step',
  title: 'My Custom Step',
  description: 'Description here',
  requiresConfirmation: true,
  requiresBackup: false,
  actions: [
    {
      type: 'command',
      name: 'my-action',
      command: 'npm run custom-script',
      description: 'Run custom script',
    },
  ],
  validations: [
    {
      type: 'build',
      name: 'verify-build',
      command: 'npm run build',
      failOnError: true,
      description: 'Verify build',
    },
  ],
}
```

Then rebuild: `npm run build`

### Programmatic Access

The workflow engine can be used independently:

```typescript
import { WorkflowEngine, ANGULAR_MIGRATION_WORKFLOW } from './workflow/engine.js';

const engine = new WorkflowEngine(ANGULAR_MIGRATION_WORKFLOW, context);
const currentStep = engine.getCurrentStep();
// ...
```

## Migration Timeline

Typical timeline for a medium-sized Angular project:

- **Automated steps**: 30-60 minutes
- **User confirmations**: 10-15 minutes
- **Manual fixes**: 1-3 hours
- **Testing**: 2-4 hours
- **Total**: 4-8 hours

Larger projects or complex customizations may take longer.

## Post-Migration

After workflow completion:

1. **Review MIGRATION_REPORT.md**
2. **Run full test suite** (unit + E2E)
3. **Manual testing** of critical features
4. **Check console** for warnings/errors
5. **Review git diff** for unexpected changes
6. **Update documentation**
7. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: migrate to Angular 20"
   ```
8. **Delete backups** (after verification)

## Support

For issues, questions, or contributions:

- GitHub Issues: [link]
- Documentation: [link]
- Angular Update Guide: https://angular.dev/update-guide

---

**Happy migrating! 🚀**

# Workshop Integration Status

## Overview
This document tracks the integration of workshop resources (`/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop`) into the Angular Migration ACP Agent.

## Workshop Resources
- **Scripts**: 14 automation scripts (`scripts/`)
- **Agent Roles**: 11 specialist agent templates (`agents/roles/`)
- **Migration Plan**: 4-day hackathon workflow (`plan/four_day_migration_plan.md`)
- **Issue Mapping**: 60+ error-to-agent mappings (`docs/issue_agents_mapping.md`)

## Integration Checklist

### ✅ Phase 1: Script Path Resolution
- [x] Added `getWorkshopRoot()` with environment variable support (WORKSHOP_ROOT)
- [x] Added `resolveWorkshopScript()` for automatic path resolution
- [x] Updated `runScript()` to auto-resolve `./scripts/*` paths
- [x] Created `.env.example` with WORKSHOP_ROOT configuration

**Files Modified**:
- [src/workflow/executor.ts](src/workflow/executor.ts#L17-L26) - Workshop path helpers
- [.env.example](.env.example) - Configuration template

### ✅ Phase 2: Validation Scripts Integration
- [x] Added `args?: string[]` to WorkflowValidation interface
- [x] Updated pre-migration validation to use workshop scripts:
  - `pre_migration_check.sh --comprehensive`
  - `verify_build.sh`
  - `verify_dependencies.sh --strict`

**Files Modified**:
- [src/workflow/engine.ts](src/workflow/engine.ts#L31-L39) - WorkflowValidation interface
- [src/workflow/engine.ts](src/workflow/engine.ts#L77-L115) - Pre-migration validation step

### ✅ Phase 3: Intelligent Error Routing
- [x] Created issue-mapper.ts with 25+ error patterns
- [x] Implemented `findAgentForError()` with RegExp matching
- [x] Implemented `generateEnhancedErrorMessage()` with:
  - Category classification (Build, Material, Component, HTTP, etc.)
  - Priority indicators (🔴 Critical, 🟡 Medium, 🟢 Low)
  - Agent recommendations (@BuildFixer, @CodeModernizer, etc.)
  - Workshop prompt paths (agents/roles/*.md)
  - Recommended scripts
  - Troubleshooting steps
- [x] Integrated enhanced error messages into workflow handler

**Files Created**:
- [src/workflow/issue-mapper.ts](src/workflow/issue-mapper.ts) - 270 lines, 25 patterns

**Files Modified**:
- [src/workflow/handler.ts](src/workflow/handler.ts#L1-L15) - Import issue-mapper
- [src/workflow/handler.ts](src/workflow/handler.ts#L273-L310) - Enhanced error handling

### ⏳ Phase 4: Migration Plan Alignment (PENDING)
- [ ] Align workflow steps with 4-day migration plan structure:
  - Day 1: Setup, Pre-migration validation, v15 upgrade
  - Day 2: v16-v17 upgrades, Testing
  - Day 3: v18-v19 upgrades, Performance
  - Day 4: v20 upgrade, Final validation
- [ ] Add team role assignments (Build Fixer, Code Modernizer, etc.)
- [ ] Integrate exit criteria from migration plan
- [ ] Add progress tracking with workshop milestones

**Target Files**:
- [src/workflow/engine.ts](src/workflow/engine.ts) - Workflow step definitions

## Error Pattern Coverage

### 25 Issue Patterns Mapped:
1. **Build Errors** (7 patterns):
   - TS2322 (type assignment)
   - TS2339 (property not found)
   - TS2345 (argument type mismatch)
   - TS2304 (name not found)
   - TS2307 (module not found)
   - TS7006 (implicit any)
   - Compilation failures

2. **Material Issues** (3 patterns):
   - Material import errors
   - Component module errors
   - Theming problems

3. **Component Issues** (3 patterns):
   - Standalone component errors
   - Decorator issues
   - Lifecycle hook problems

4. **HTTP/Services** (2 patterns):
   - HttpClient errors
   - Service injection failures

5. **Dependencies** (2 patterns):
   - Package compatibility
   - Peer dependency conflicts

6. **Infrastructure** (3 patterns):
   - Build configuration
   - Polyfills issues
   - Asset loading

7. **Tests** (2 patterns):
   - Test failures
   - Spec errors

8. **Version Issues** (3 patterns):
   - Migration schematic failures
   - Version conflicts
   - Deprecated API usage

## Testing Checklist

### Before Testing in Zed:
- [x] Build succeeds (`npm run build`)
- [x] TypeScript compilation clean
- [x] No import errors

### Testing in Zed IDE:
- [ ] Launch agent in Zed
- [ ] Verify notifications stream correctly
- [ ] Test pre-migration validation:
  - [ ] Workshop scripts execute (pre_migration_check.sh, verify_build.sh, verify_dependencies.sh)
  - [ ] Script output appears in Zed UI
  - [ ] Script arguments pass correctly
- [ ] Trigger intentional error:
  - [ ] Error message shows category
  - [ ] Priority indicator displays (🔴/🟡/🟢)
  - [ ] Recommended agent shows (@BuildFixer, etc.)
  - [ ] Workshop prompt path shows (agents/roles/*.md)
  - [ ] Troubleshooting steps appear
- [ ] Test workshop script path resolution:
  - [ ] `./scripts/pre_migration_check.sh` resolves to workshop path
  - [ ] Script execution works from project directory
- [ ] Verify workflow progression:
  - [ ] Backup step executes
  - [ ] Validation step uses workshop scripts
  - [ ] User confirmation prompts work
  - [ ] Step-by-step execution maintains state

### Environment Configuration:
```bash
# Option 1: Use default path (hardcoded)
# No .env file needed

# Option 2: Custom workshop path
cp .env.example .env
# Edit .env and set WORKSHOP_ROOT=/path/to/your/workshop
```

## Example Enhanced Error Output

```
🔴 Critical - Build Errors

Error processing step 'upgrade-v16': Build failed

@BuildFixer may help with this issue.

Workshop Prompt: agents/roles/build_fixer.md

Recommended Scripts:
- verify_build.sh
- check_typescript_strict.sh

Troubleshooting:
1. Review TypeScript configuration (tsconfig.json)
2. Check for breaking changes in Angular 16
3. Verify all imports are correct
4. Run `ng build --verbose` for detailed output
```

## Workshop Script Inventory

### Validation Scripts:
- `pre_migration_check.sh` - Comprehensive pre-flight checks
- `verify_build.sh` - Build verification
- `verify_dependencies.sh` - Dependency validation

### Analysis Scripts:
- `check_angular_version.sh` - Version detection
- `find_breaking_changes.sh` - Breaking change analysis
- `analyze_bundle.sh` - Bundle size analysis
- `check_deprecated_apis.sh` - Deprecated API detection

### Maintenance Scripts:
- `backup_before_migration.sh` - Project backup
- `migration_status.sh` - Progress tracking
- `check_control_flow.sh` - Control flow syntax
- `check_typescript_strict.sh` - Strict mode checks
- `check_zone_flags.sh` - Zone.js configuration
- `migration_toolbox.sh` - Utility toolbox

## Agent Role Templates

1. **BuildFixer** (15KB) - TypeScript compilation, build configuration
2. **CodeModernizer** (15KB) - Language features, strict mode, signals
3. **StyleMigrator** (12KB) - SCSS, theming, Material Design
4. **LogicRefactorer** (16KB) - RxJS, services, component logic
5. **DependencyAuditor** (16KB) - Package compatibility, peer dependencies
6. **InfraPerf Optimizer** (12KB) - Build performance, lazy loading
7. **UnitTestMigrator** (10KB) - Jasmine/Karma to Jest/Vitest
8. **E2ETestMigrator** (12KB) - Protractor to Playwright/Cypress
9. **ArchitectureReviewer** (13KB) - SOLID principles, design patterns
10. **CodeReviewer** (17KB) - Code quality, best practices
11. **TestMigrator** (14KB) - General test migration strategies

## Next Steps

1. **Complete Migration Plan Alignment**:
   - Parse `plan/four_day_migration_plan.md`
   - Extract day-by-day workflow structure
   - Map current steps to migration plan phases
   - Add team role assignments per step

2. **Add Progress Tracking**:
   - Implement milestone tracking from migration plan
   - Add exit criteria validation per day
   - Create progress dashboard in Zed UI

3. **Test Complete Workflow**:
   - Run full migration workflow in Zed
   - Validate all workshop scripts execute
   - Verify error routing works end-to-end
   - Test user confirmation flow

4. **Documentation**:
   - Update README with workshop integration
   - Document environment variables
   - Add troubleshooting guide
   - Create workshop usage examples

## Configuration

### Environment Variables:
- `WORKSHOP_ROOT` - Path to workshop directory (default: `/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop`)
- `PROJECT_ROOT` - Override default project path (optional)
- `SKIP_TESTS` - Skip test execution (optional, default: false)
- `SKIP_LINT` - Skip linting (optional, default: false)
- `AUTO_CONFIRM` - Auto-confirm workflow steps (optional, default: false)

### File Locations:
- Workshop scripts: `${WORKSHOP_ROOT}/scripts/*.sh`
- Agent roles: `${WORKSHOP_ROOT}/agents/roles/*.md`
- Migration plan: `${WORKSHOP_ROOT}/plan/four_day_migration_plan.md`
- Issue mappings: `${WORKSHOP_ROOT}/docs/issue_agents_mapping.md`

## Build Status

✅ **Last Build**: Successful (TypeScript compilation clean)

**Recent Fixes**:
1. Fixed undefined error messages when scripts fail (now shows stdout/exit code)
2. Moved pre-migration-check from action to validation (failOnError: false) - it's informational only
3. **macOS Compatibility**: Replaced Linux-specific `grep -P` commands with cross-platform `npm` commands for critical validations (build, dependencies)

**macOS Note**: Workshop scripts use `grep -P` (Perl regex) which isn't available on macOS. Critical validations now use `npm` commands:
- `verify_build.sh` → `npm run build`
- `verify_dependencies.sh` → `npm list --depth=0`
- `pre_migration_check.sh` still runs but failures are informational only (failOnError: false)

**Build Output**:
```
> angular-migration-acp-agent@1.0.0 build
> tsc
```

## Summary

### Integration Progress: 75% Complete (3/4 phases)
- ✅ Script path resolution
- ✅ Validation scripts integration
- ✅ Intelligent error routing
- ⏳ Migration plan alignment

### Testing Status: Ready for Zed Testing
- Build succeeds
- TypeScript compilation clean
- Workshop helpers functional
- Enhanced error messages implemented

### Next Action: Test in Zed IDE
Launch the agent and verify:
1. Workshop scripts execute correctly
2. Error messages show agent recommendations
3. Pre-migration validation uses workshop scripts
4. Workflow progression maintains state

# Migrate to Angular 20

> **Angular 19 → Angular 20 Migration Guide - Final Target Version**

Angular 20 is the final target version in this migration path. It represents the culmination of the Angular 14→20 journey with a fully modern, signal-based, and performant application architecture.

---

## 📋 Overview

**Angular 20 Key Features:**
- 🎯 Mature signal-based reactivity
- ⚡ Production-ready zoneless change detection
- 🚀 Optimized performance across the board
- 📦 Enhanced build system
- 🛠️ Refined developer experience
- ✨ Stabilized modern APIs

**Migration Difficulty**: 🟢 Low
**Estimated Time**: 2-4 hours
**Node.js Requirement**: 20.11+ or 22.x
**TypeScript Requirement**: 5.6+

---

## 🔄 What Changes

### Package Updates

| Package | Angular 19 | Angular 20 | Notes |
|---------|------------|------------|-------|
| @angular/core | 19.x | **20.0.0** | Core framework |
| @angular/cli | 19.x | **20.0.0** | Angular CLI |
| @angular/material | 19.x | **20.0.0** | Material Design |
| TypeScript | ~5.5.0 | **~5.6.3** | Required upgrade |
| RxJS | ~7.8.0 | **~7.8.0** | No change |
| zone.js | Optional | **Optional** | Not needed for zoneless |

### Third-Party Package Updates

| Package | Angular 19 | Angular 20 | Notes |
|---------|------------|------------|-------|
| ag-grid-angular | ^31.0.0 | **^32.0.0** | Grid component |
| ngx-charts | ^20.0.0 | **^20.0.0** | No change |
| highcharts | ^11.0.0 | **^12.0.0** | **Breaking changes** |
| highcharts-angular | ^4.0.0 | **^5.0.0** | Companion upgrade |

### Breaking Changes

The migration is organized into three categories based on automation level:

---

**What Gets Automatically Fixed by v20.psm1:**

#### 1. provideExperimentalZonelessChangeDetection Renamed ✅ **AUTO-FIXED**

The migration script automatically renames the experimental API:

**Before (Angular 19):**
```typescript
import { provideExperimentalZonelessChangeDetection } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [provideExperimentalZonelessChangeDetection()]
});
```

**After (Angular 20):**
```typescript
import { provideZonelessChangeDetection } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()] // Now Developer Preview
});
```

#### 2. Highcharts v11 → v12 Import Syntax ✅ **AUTO-FIXED**

The migration script automatically fixes Highcharts imports:

**Before (Highcharts 11):**
```typescript
import * as Highcharts from 'highcharts';
import * as HighchartsMore from 'highcharts/highcharts-more';

const options: Highcharts.Options = {
  chart: { type: 'line' },
  series: [{ type: 'line', data: [1, 2, 3] }]
};
```

**After (Highcharts 12):**
```typescript
import Highcharts from 'highcharts'; // ✅ Fixed
import HighchartsMore from 'highcharts/highcharts-more'; // ✅ Fixed

const options: Highcharts.Options = {
  chart: { type: 'line' },
  series: [{ type: 'line', data: [1, 2, 3] }]
};
```

#### 3. Highcharts Module Imports ✅ **AUTO-FIXED**

The migration script automatically fixes all Highcharts module imports:

**Before:**
```typescript
import * as SolidGauge from 'highcharts/modules/solid-gauge';
import * as Exporting from 'highcharts/modules/exporting';
```

**After:**
```typescript
import SolidGauge from 'highcharts/modules/solid-gauge'; // ✅ Fixed
import Exporting from 'highcharts/modules/exporting'; // ✅ Fixed
```

---

**What Gets Automatically Detected:**

#### 4. InjectFlags Removed ⚠️ **CRITICAL - DETECTED**

The migration script detects this removed API and provides interactive migration guidance:

**Before (Angular 19):**
```typescript
import { InjectFlags } from '@angular/core';

const service = injector.get(MyService, null, InjectFlags.Optional);
```

**After (Angular 20):**
```typescript
// Remove InjectFlags import
const service = injector.get(MyService, { optional: true });
```

**Impact:** InjectFlags has been removed from `Injector.get`, `EnvironmentInjector.get`, `TestBed.get`, and `TestBed.inject`.

**Action:** Replace InjectFlags parameters with options objects.

#### 5. TestBed.get Removed ⚠️ **CRITICAL - DETECTED**

The migration script detects usage in test files:

**Before (Angular 19):**
```typescript
const service = TestBed.get(MyService);
```

**After (Angular 20):**
```typescript
const service = TestBed.inject(MyService); // ✅ Use inject instead
```

**Impact:** All test files using `TestBed.get()` must be updated.

**Action:** Search for `TestBed.get(` and replace with `TestBed.inject(`.

#### 6. provideZoneChangeDetection Error Handling Changed ℹ️ **INFO**

**Impact:** TestBed now rethrows errors regardless of `provideZoneChangeDetection` usage.

**Action:** Update tests to handle errors properly. Tests should prevent or account for errors.

#### 7. ignoreChangesOutsideZone Removed ⚠️ **DETECTED**

**Impact:** This option is no longer available for ZoneJS configuration.

**Action:** Remove `ignoreChangesOutsideZone` from ZoneJS configuration.

#### 8. ng-reflect-* Attributes Deprecated ℹ️ **INFO**

**Impact:** Runtime no longer produces `ng-reflect-*` attributes by default.

**Action:** Debug tools relying on these attributes may need updates.

#### 9. Structural Directives Deprecated ℹ️ **INFO**

**Impact:** `*ngIf`, `*ngFor`, `*ngSwitch` are officially deprecated.

**Recommended:** Migrate to control flow syntax (`@if`, `@for`, `@switch`).

**Migration:**
```bash
npx ng generate @angular/core:control-flow
```

#### 10. Node.js Version Requirements ⚠️ **DETECTED**

**Impact:**
- Node.js v18 is no longer supported
- Node.js v22.0-22.10 are not supported

**Required:** Node.js v20.11.1+ or v22.11.0+

**package.json update:**
```json
{
  "engines": {
    "node": ">=20.11.1 || ^22.11.0",
    "npm": ">=10.0.0"
  }
}
```

---

**What Requires Manual Review (New Features):**

#### 11. TypeScript 5.6 Improvements

TypeScript 5.6 has stricter type checking:

```typescript
// More strict null checks
interface Config {
  name: string;
  value?: number; // Must explicitly mark optional
}

// Iterator helper methods (new in TS 5.6)
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2); // Better type inference
```

#### 12. Control Flow Migration (Optional)

Consider migrating from structural directives to control flow syntax:

```html
<!-- Before: *ngIf -->
<div *ngIf="user">{{ user.name }}</div>

<!-- After: @if -->
@if (user) {
  <div>{{ user.name }}</div>
}
```

#### 13. Zoneless Change Detection (Developer Preview)

```typescript
import { provideZonelessChangeDetection } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection() // Now Developer Preview (was Experimental)
  ]
});
```

---

## 🚀 Migration Steps

### Step 1: Verify Prerequisites

```powershell
# Run prerequisites check
..\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "20"
```

**Manual Check:**
```bash
# Node.js version (must be 20.11+ or 22.x)
node --version  # Should be v20.11.0+ or v22.x.x

# Current Angular version (should be 19.x)
npm list @angular/core

# Git status
git status
```

### Step 2: Create Backup

```powershell
..\migrations\scripts\01-create-backup.ps1
```

Or git commit:

```bash
git add .
git commit -m "chore: snapshot before Angular 20 migration - FINAL VERSION"
git push
```

### Step 3: Update Package Versions

```powershell
# Automated migration (recommended)
..\migrations\scripts\migrate-to-v20.ps1

# Or manual package update
Import-Module ..\migrations\scripts\modules\PackageManager.psm1
Update-PackageJson -ProjectPath "." -TargetVersion "20"
```

**What this does:**
- Updates all `@angular/*` packages to 20.0.0
- Updates TypeScript to ~5.6.3
- Updates Highcharts to ^12.0.0
- Updates ag-grid-angular to ^32.0.0
- Updates other third-party packages

### Step 4: Install Dependencies

```powershell
# Remove old dependencies
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force

# Install new dependencies
npm install
```

### Step 5: Run Angular Update Schematics

```bash
# Update Angular core
npx ng update @angular/core@20 --migrate-only --allow-dirty

# Update Angular CLI
npx ng update @angular/cli@20 --migrate-only --allow-dirty
```

### Step 6: Update Angular Material

```bash
# Update Material components
npx ng update @angular/material@20 --migrate-only --allow-dirty
```

### Step 7: Apply Breaking Changes Fixes

The migration script automatically applies breaking changes fixes:

```powershell
# This happens automatically during migrate-to-v20.ps1
# Or run manually:
Import-Module ..\migrations\scripts\modules\breaking-changes\v20.psm1
Invoke-Angular20BreakingChanges -ProjectPath "."
```

**What This Step Does:**

**Section 1: Official Angular 20 Core Breaking Changes (8 detections + 1 auto-fix)**
1. ⚠️ **InjectFlags usage** - CRITICAL detection with migration examples
2. ⚠️ **TestBed.get usage** - CRITICAL detection in test files
3. ℹ️ **provideZoneChangeDetection** - INFO about behavior change
4. ✅ **provideExperimentalZonelessChangeDetection** - AUTO-FIX rename to provideZonelessChangeDetection
5. ⚠️ **ignoreChangesOutsideZone** - Detection
6. ℹ️ **ng-reflect-* attributes** - INFO about deprecation
7. ℹ️ **Structural directives** - INFO about *ngIf, *ngFor, *ngSwitch deprecation
8. ⚠️ **Node.js version** - Validate package.json requirements

**Section 2: Third-Party Breaking Changes (2 auto-fixes)**
9. ✅ **Highcharts imports** - AUTO-FIX `import * as Highcharts` → `import Highcharts`
10. ✅ **Highcharts modules** - AUTO-FIX module import syntax

**Section 3: Comprehensive Warnings**
- All 10 breaking changes with before/after examples
- New features overview (zoneless, control flow)
- Recommended actions
- Documentation links

**Expected Output:**
```
🔧 Applying Angular 20 breaking changes and migrations...

📋 Section 1: Official Angular 20 Core Breaking Changes
═══════════════════════════════════════════════════════
📝 Checking for InjectFlags usage...
  ✓ No InjectFlags usage found
📝 Checking for TestBed.get() usage...
  ✓ No TestBed.get() usage found
📝 Checking for provideZoneChangeDetection usage...
  ✓ No provideZoneChangeDetection usage found
📝 Renaming provideExperimentalZonelessChangeDetection → provideZonelessChangeDetection...
  ✓ No provideExperimentalZonelessChangeDetection usage found
📝 Checking for ignoreChangesOutsideZone usage...
  ✓ No ignoreChangesOutsideZone usage found
📝 Checking for ng-reflect-* attributes...
  ✓ No ng-reflect-* usage found in templates
📝 Checking for deprecated structural directives (*ngIf, *ngFor, *ngSwitch)...
  ℹ️  Found structural directives in 45 file(s)
     *ngIf, *ngFor, *ngSwitch are now officially deprecated
     Consider migrating to control flow syntax (@if, @for, @switch)
📝 Checking Node.js version requirements...
  ℹ️  package.json engines.node: >=20.11.1

📋 Section 2: Third-Party Breaking Changes
═══════════════════════════════════════════════
📝 Fixing Highcharts v12 import syntax...
  ✅ Fixed Highcharts import syntax in 3 file(s)
📝 Fixing Highcharts module import syntax...
  ✅ Fixed Highcharts module imports in 2 file(s)

Angular 20 breaking changes processed successfully
  Total automated fixes: 5
  Total detections/warnings: 14

⚠️  Important Warnings and Recommendations:
  (Comprehensive warnings displayed here...)
```

**Manual Fixes Required:**

If the script detects InjectFlags or TestBed.get usage, you'll need to manually update:

**InjectFlags Fix:**
```typescript
// Find all InjectFlags usage
grep -r "InjectFlags" src/

// Replace with options object
// Before: injector.get(MyService, null, InjectFlags.Optional)
// After:  injector.get(MyService, { optional: true })
```

**TestBed.get Fix:**
```typescript
// Find all TestBed.get usage
grep -r "TestBed.get" src/

// Replace with TestBed.inject
// Before: const service = TestBed.get(MyService);
// After:  const service = TestBed.inject(MyService);
```

### Step 8: Build the Project

```powershell
..\migrations\scripts\validate-build.ps1
```

Or manually:

```bash
npm run build
```

**Expected Output:**
```
Application bundle generation complete.
Initial chunk files | Names         | Raw size
main.js             | main          | 238.45 kB (smaller than before!)
polyfills.js        | polyfills     |  34.21 kB (if using zoneless)
styles.css          | styles        |  76.89 kB

Build at: 2025-01-12T17:30:45.789Z
Time: 9876ms (faster with Angular 20!)
```

### Step 9: Run Tests

```powershell
..\migrations\scripts\validate-tests.ps1
```

Or manually:

```bash
npm test -- --watch=false
```

### Step 10: Run Linter

```powershell
..\migrations\scripts\validate-lint.ps1
```

Or manually:

```bash
npm run lint -- --fix
```

### Step 11: Manual Testing

```bash
npm start
```

**Critical Test Checklist:**
- [ ] Application loads without errors
- [ ] All Highcharts render correctly (v12 imports fixed)
- [ ] Chart interactions work (zoom, pan, tooltips)
- [ ] Highcharts modules work (More, SolidGauge, Exporting)
- [ ] AG Grid renders and functions properly
- [ ] Forms work
- [ ] Routing works
- [ ] API calls work
- [ ] Authentication works
- [ ] Tests pass (TestBed.inject used, not TestBed.get)
- [ ] No InjectFlags usage errors
- [ ] Zoneless change detection works (if enabled)
- [ ] Control flow syntax works (if migrated)
- [ ] No console errors or warnings
- [ ] Performance is good (check DevTools)

### Step 12: Commit Changes

```bash
git add .
git commit -m "chore: migrate to Angular 20 - FINAL VERSION ✨

- Updated all @angular packages to 20.0.0
- Updated TypeScript to 5.6.3
- Updated Highcharts to v12.0.0
- Updated ag-grid-angular to v32.0.0
- Fixed Highcharts v12 import syntax (import * as → import)
- Fixed Highcharts module imports
- Renamed provideExperimentalZonelessChangeDetection → provideZonelessChangeDetection
- Updated Node.js requirements (v20.11.1+ or v22.11.0+)
- Verified no InjectFlags or TestBed.get usage
- Structural directives deprecated (*ngIf, *ngFor, *ngSwitch)
- All tests passing
- Migration complete!"
git push
```

### Step 13: Generate Final Migration Report

```powershell
..\migrations\scripts\generate-migration-report.ps1 -OutputPath "migration-final-report.md"
```

---

## ⚠️ Common Issues

### Issue 1: Highcharts Import Errors

**Error:**
```
Cannot find default export for Highcharts
```

**Cause**: Import syntax changed in Highcharts 12

**Solution:**
```typescript
// Find and replace
// OLD: import * as Highcharts from 'highcharts';
// NEW: import Highcharts from 'highcharts';

// Same for modules:
// OLD: import * as HighchartsMore from 'highcharts/highcharts-more';
// NEW: import HighchartsMore from 'highcharts/highcharts-more';
```

### Issue 2: Highcharts Rendering Issues

**Symptom**: Charts don't render or look different

**Cause**: Highcharts 12 styling changes

**Solution:**
```typescript
// Check chart options for deprecated properties
// Review Highcharts 12 changelog:
// https://www.highcharts.com/blog/changelog/

// May need to update:
const options: Highcharts.Options = {
  // Update deprecated options
  // Adjust styling if needed
};
```

### Issue 3: AG Grid Type Errors

**Error:**
```
Property 'xyz' does not exist on type 'GridOptions'
```

**Cause**: AG Grid 32 has updated TypeScript definitions

**Solution:**
```typescript
// Check AG Grid 32 migration guide
// Update grid options to match new API
import { GridOptions } from 'ag-grid-community';

const gridOptions: GridOptions = {
  // Update to AG Grid 32 API
};
```

### Issue 4: TypeScript 5.6 Strict Errors

**Error:**
```
Type 'undefined' is not assignable to type 'string'
```

**Solution:**
```typescript
// Use proper type guards
interface User {
  name: string;
  email?: string;
}

function getEmail(user: User): string {
  return user.email ?? 'no-email@example.com';
}
```

### Issue 5: Node.js Version Mismatch

**Error:**
```
The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Upgrade to Node.js 20 or 22
nvm install 20
nvm use 20

# Or
nvm install 22
nvm use 22

# Verify
node --version  # Should be v20.11.0+ or v22.x.x
```

---

## 🔄 Rollback Procedure

If critical issues occur:

```powershell
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-TIMESTAMP"
npm install
```

Or git rollback:

```bash
git reset --hard <commit-hash-before-migration>
npm install
npm run build
```

---

## ✅ Final Verification Checklist

**Angular 20 Migration Complete:**

- [ ] `package.json` shows Angular 20.0.0
- [ ] TypeScript is 5.6.3
- [ ] Highcharts is 12.x.x
- [ ] ag-grid-angular is 32.x.x
- [ ] Node.js is v20.11.1+ or v22.11.0+
- [ ] Build completes successfully
- [ ] Build is faster than Angular 14
- [ ] Bundle size is smaller than Angular 14
- [ ] All tests pass
- [ ] Linter passes
- [ ] Dev server starts
- [ ] All charts render correctly (Highcharts v12)
- [ ] Highcharts imports use `import Highcharts` (not `import * as`)
- [ ] All grids work (AG Grid v32)
- [ ] Forms work
- [ ] Routing works
- [ ] Authentication works
- [ ] API integration works
- [ ] No InjectFlags errors
- [ ] No TestBed.get usage (all use TestBed.inject)
- [ ] provideZonelessChangeDetection renamed correctly
- [ ] Zoneless change detection works (if enabled)
- [ ] Control flow syntax works (if migrated)
- [ ] No console errors
- [ ] Performance is good
- [ ] Changes committed to git
- [ ] Final migration report generated

---

## 🎉 Migration Complete!

**Congratulations!** You have successfully migrated from Angular 14 to Angular 20!

### What You've Achieved

✨ **6 Major Version Upgrades:**
- ✅ Angular 14 → 15
- ✅ Angular 15 → 16
- ✅ Angular 16 → 17
- ✅ Angular 17 → 18
- ✅ Angular 18 → 19
- ✅ Angular 19 → 20

🚀 **Modern Angular Stack:**
- Signals for reactive state management
- Optional zoneless change detection
- Built-in control flow (@if, @for, @switch)
- Standalone components
- Deferrable views
- Resource API for async data
- Enhanced TypeScript support

📦 **Updated Dependencies:**
- TypeScript 4.7 → 5.6
- Highcharts 11 → 12
- AG Grid 30 → 32
- Latest Material Design Components

⚡ **Performance Improvements:**
- Faster builds (esbuild-based)
- Smaller bundle sizes
- More efficient change detection
- Better runtime performance

---

## 📊 Before vs After Comparison

### Performance Metrics (Typical Medium App)

| Metric | Angular 14 | Angular 20 | Improvement |
|--------|------------|------------|-------------|
| **Build Time** | 55s | 10s | **82% faster** |
| **Bundle Size** | 950 KB | 620 KB | **35% smaller** |
| **Initial Load** | 3.2s | 1.8s | **44% faster** |
| **Runtime Performance** | Baseline | +35% | **35% faster** |

### Technology Stack

| Component | Angular 14 | Angular 20 |
|-----------|------------|------------|
| **Change Detection** | Zone.js (required) | Zoneless (optional) |
| **State Management** | Services + RxJS | Signals + RxJS |
| **Templates** | *ngIf, *ngFor | @if, @for, @defer |
| **Components** | NgModule-based | Standalone |
| **Build System** | Webpack | esbuild |
| **TypeScript** | 4.7 | 5.6 |

---

## 📚 Next Steps

### 1. Post-Migration Validation

```powershell
# Generate comprehensive report
..\migrations\scripts\generate-migration-report.ps1
```

**See**: [Post-Migration Validation](08-post-migration-validation.md) for detailed checklist

### 2. Optional Migrations

Consider these optional improvements:

**Migrate to Standalone Components:**
```bash
# See detailed guide
```
**See**: [Optional Standalone Migration](optional-standalone-migration.md)

**Migrate to Control Flow Syntax:**
```bash
# Migrate *ngIf → @if, *ngFor → @for
npx ng generate @angular/core:control-flow
```
**See**: [Optional Control Flow Migration](optional-control-flow-migration.md)

**Enable Zoneless Change Detection:**
```typescript
// main.ts
provideExperimentalZonelessChangeDetection()
```

### 3. Deployment

- [ ] Deploy to staging environment
- [ ] Run comprehensive manual testing
- [ ] Load testing and performance validation
- [ ] Security audit
- [ ] Deploy to production
- [ ] Monitor for issues

### 4. Documentation

- [ ] Update project README
- [ ] Document new Angular 20 features used
- [ ] Update team documentation
- [ ] Share migration report with team

---

## 🔗 References

- [Angular 20 Release Notes](https://blog.angular.io)
- [Angular Update Guide](https://update.angular.io/)
- [Highcharts 12 Changelog](https://www.highcharts.com/blog/changelog/)
- [AG Grid 32 Release](https://www.ag-grid.com/changelog/)
- [TypeScript 5.6 Release](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html)

---

## 📈 Migration Timeline Summary

### Total Time Investment

| Version | Estimated Time | Difficulty |
|---------|---------------|------------|
| 14 → 15 | 2-4 hours | 🟢 Low |
| 15 → 16 | 3-6 hours | 🟡 Medium |
| 16 → 17 | 4-8 hours | 🟡 Medium-High |
| 17 → 18 | 2-4 hours | 🟢 Low |
| 18 → 19 | 3-6 hours | 🟡 Medium |
| 19 → 20 | 2-4 hours | 🟢 Low |
| **Total** | **15-32 hours** | - |

**Actual time depends on:**
- Project size and complexity
- Number of third-party dependencies
- Test coverage
- Team familiarity with new features

---

## 🎯 What's Next?

**Migration successful?** → See [Post-Migration Validation](08-post-migration-validation.md)

**Want to explore new features?** → See optional migration guides

**Need help?** → See [Troubleshooting](troubleshooting.md)

---

## 🏆 Success!

You've completed the full Angular 14 → 20 migration journey!

Your application now runs on the latest Angular with:
- Modern signal-based reactivity
- Optional zoneless change detection
- Enhanced performance
- Smaller bundle sizes
- Better developer experience
- Latest security updates

**Well done! 🎉**

---

**Quick Command Reference:**

```powershell
# Complete migration
..\migrations\scripts\migrate-to-v20.ps1

# Validate
..\migrations\scripts\validate-build.ps1
..\migrations\scripts\validate-tests.ps1

# Fix Highcharts imports
..\migrations\scripts\fix-breaking-changes-v20.ps1

# Generate final report
..\migrations\scripts\generate-migration-report.ps1
```

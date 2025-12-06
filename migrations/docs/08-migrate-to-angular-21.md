# Migrate to Angular 21

> **Angular 20 → Angular 21 Migration Guide**

Angular 21 makes zoneless change detection the default, introduces Signal Forms, enhances AI-first tooling, and brings Vitest as the new default testing framework. This is a significant release focused on performance and developer experience.

---

## 📋 Overview

**Angular 21 Key Features:**
- ⚡ **Zoneless by default** - better performance without Zone.js
- 📝 **Signal Forms** - reactive forms with signals
- 🤖 **AI-first tooling** - enhanced developer experience with AI
- 🧪 **Vitest default** - modern testing framework (replaces Karma/Jasmine)
- 🎯 **TypeScript 5.9+** - latest TypeScript features
- 🚀 **Enhanced performance** - faster builds and runtime
- ♿ **Improved ARIA** - better accessibility support

**Migration Difficulty**: 🟠 Medium to High
**Estimated Time**: 4-8 hours
**Node.js Requirement**: 20.11.1+ or 22.11+
**TypeScript Requirement**: 5.9+

---

## 🔄 What Changes

### Package Updates

| Package | Angular 20 | Angular 21 | Notes |
|---------|------------|------------|-------|
| @angular/core | 20.0.0 | **21.0.0** | Core framework |
| @angular/cli | 20.0.0 | **21.0.0** | Angular CLI |
| @angular/material | 20.0.0 | **21.0.0** | Material Design |
| TypeScript | ~5.6.0 | **~5.9.0** | Required upgrade |
| RxJS | ~7.8.0 | **~7.8.0** | No change |
| zone.js | ~0.15.0 | **~0.15.0** | Now optional |
| AG-Grid | ~32.x | **~33.0** | Major upgrade |
| Highcharts | ~11.x | **~12.1** | Major upgrade |

### Breaking Changes

The migration is organized into three categories based on automation level:

---

**What Gets Automatically Fixed by v21.psm1:**

#### 1. Router.lastSuccessfulNavigation Signal ✅ **AUTO-FIXED**

The migration script automatically adds signal invocation:

**Before (Angular 20):**
```typescript
const nav = this.router.lastSuccessfulNavigation;
```

**After (Angular 21):**
```typescript
const nav = this.router.lastSuccessfulNavigation(); // Signal invocation
```

**Impact:** `lastSuccessfulNavigation` is now a signal and must be invoked.

#### 2. ApplicationConfig Import ✅ **AUTO-FIXED**

The migration script automatically fixes import location:

**Before (Angular 20):**
```typescript
import { ApplicationConfig } from '@angular/platform-browser';
```

**After (Angular 21):**
```typescript
import { ApplicationConfig } from '@angular/core';
```

**Impact:** `ApplicationConfig` export removed from `@angular/platform-browser`.

---

**What Gets Automatically Detected:**

#### 3. Zoneless by Default ⚠️ **CRITICAL - DETECTED**

The migration script detects if Zone.js support is needed:

**Impact:** Angular 21 apps are zoneless by default. If your app relies on Zone.js, you need to explicitly opt-in.

**Migration (Auto-applied by ng update):**
```typescript
import { bootstrapApplication, provideZoneChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection() // Explicitly enable Zone.js
  ]
});
```

**Note:** The Angular CLI migration will automatically add this if your app uses Zone.js.

**Zoneless Benefits:**
- ~50KB smaller bundle size (no zone.js)
- Better performance (no monkey-patching)
- Simpler mental model
- Better integration with signals

**Migration to Zoneless:**
```typescript
// 1. Remove Zone.js from polyfills
// 2. Ensure all components use OnPush or signals
// 3. Call ChangeDetectorRef.markForCheck() when needed

import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <div>Count: {{ count() }}</div>
    <button (click)="increment()">+</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class CounterComponent {
  count = signal(0);

  increment() {
    this.count.update(c => c + 1); // Automatically triggers change detection
  }
}
```

#### 4. NgModuleFactory Removed ⚠️ **CRITICAL - DETECTED**

The migration script detects usage of the removed `NgModuleFactory`:

**Before (Angular 20):**
```typescript
import { NgModuleFactory } from '@angular/core';

const factory: NgModuleFactory<MyModule> = ...;
```

**After (Angular 21):**
```typescript
import { Type } from '@angular/core';

const module: Type<MyModule> = MyModule; // Use NgModule directly
```

**Impact:** `NgModuleFactory` has been completely removed. Use `NgModule` types directly.

#### 5. UpgradeAdapter Removed ⚠️ **CRITICAL - DETECTED**

The migration script detects usage of removed `UpgradeAdapter`:

**Before (Angular 20):**
```typescript
import { UpgradeAdapter } from '@angular/upgrade';
```

**After (Angular 21):**
```typescript
import { UpgradeModule } from '@angular/upgrade/static';
```

**Impact:** `UpgradeAdapter` has been removed. Use `upgrade/static` instead.

**Migration Guide:** https://angular.dev/guide/upgrade

#### 6. ignoreChangesOutsideZone Removed ⚠️ **DETECTED**

The migration script detects usage of removed option:

**Impact:** `ignoreChangesOutsideZone` is no longer available for configuring ZoneJS change detection.

**Migration:**
```typescript
// Before (Angular 20)
provideZoneChangeDetection({
  ignoreChangesOutsideZone: true // ❌ Removed
})

// After (Angular 21)
provideZoneChangeDetection() // Remove the option
```

#### 7. TypeScript 5.9+ Required ⚠️ **CRITICAL - DETECTED**

The migration script checks TypeScript version:

**Requirement:** TypeScript 5.9 or higher

**Migration:**
```bash
npm install typescript@~5.9.0
```

**New TypeScript 5.9 Features:**
- Better type inference
- Improved performance
- New utility types

---

**What Requires Manual Review:**

#### 8. Router Navigation Timing

**Impact:** Router navigations may take several additional microtasks to complete.

**Issue:** Tests that depend on exact navigation timing may fail.

**Migration:**
```typescript
// Before (Angular 20)
router.navigate(['/path']);
expect(component.data).toBe(newData); // May fail

// After (Angular 21)
await router.navigate(['/path']);
expect(component.data).toBe(newData); // ✅ Correct

// Or in tests:
await fixture.whenStable();
expect(component.data).toBe(newData);
```

#### 9. TestBed Error Handling

**Impact:** Using `provideZoneChangeDetection` in TestBed no longer prevents error rethrowing.

**Before (Angular 20):**
Errors could be suppressed by using `provideZoneChangeDetection` in TestBed.

**After (Angular 21):**
Errors are always rethrown, regardless of configuration.

**Migration:**
```typescript
// Update tests to handle expected errors
it('should handle error', () => {
  expect(() => {
    component.throwError();
  }).toThrow(); // Explicitly handle expected errors
});
```

#### 10. ngComponentOutletContent Type

**Impact:** Type changed from `any[][] | undefined` to `Node[][] | undefined`.

**Migration:**
```typescript
// Before (Angular 20)
@Input() ngComponentOutletContent?: any[][];

// After (Angular 21)
@Input() ngComponentOutletContent?: Node[][];
```

#### 11. IE and Legacy Edge Support Removed

**Impact:** Internet Explorer and non-Chromium Edge are no longer supported.

**Migration:**
- Update browser support documentation
- Update `browserslist` configuration
- Remove IE-specific polyfills

```json
// .browserslistrc
last 2 Chrome versions
last 2 Firefox versions
last 2 Safari versions
last 2 Edge versions
# No IE support
```

#### 12. typeCheckHostBindings Strictness

**Impact:** Previously hidden type issues in host bindings may show up.

**Migration:**
```typescript
// Option 1: Fix type issues (recommended)
@HostBinding('class.active')
get isActive(): boolean {
  return this.active; // Ensure correct type
}

// Option 2: Disable strict host binding checks (temporary)
// tsconfig.json
{
  "angularCompilerOptions": {
    "typeCheckHostBindings": false // Not recommended
  }
}
```

---

**Third-Party Library Updates:**

#### 13. AG-Grid v33 Upgrade

**Impact:** AG-Grid v33 may have breaking changes.

**Check:** https://www.ag-grid.com/changelog/

**Migration:** Review AG-Grid v33 migration guide for any API changes.

#### 14. Highcharts v12 Upgrade

**Impact:** Highcharts v12 may have breaking changes.

**Check:** https://www.highcharts.com/blog/changelog/

**Migration:** Review Highcharts v12 changelog for any API changes.

---

## 🚀 Migration Steps

### Step 1: Verify Prerequisites

```powershell
# Run prerequisites check
..\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "21"
```

**Manual Check:**
```bash
# Node.js version (must be 20.11.1+ or 22.11+)
node --version  # Should be v20.11.1 or higher (NOT v22.0-v22.10)

# Current Angular version (should be 20.x)
npm list @angular/core

# Git status
git status
```

### Step 2: Create Backup

```powershell
# Create timestamped backup
..\migrations\scripts\01-create-backup.ps1
```

Or git commit:

```bash
git add .
git commit -m "chore: snapshot before Angular 21 migration"
git push
```

### Step 3: Update Package Versions

```powershell
# Automated migration (recommended)
..\migrations\scripts\migrate-to-v21.ps1

# Or manual package update
Import-Module ..\migrations\scripts\modules\PackageManager.psm1
Update-PackageJson -ProjectPath "." -TargetVersion "21"
```

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
npx ng update @angular/core@21 --migrate-only --allow-dirty

# Update Angular CLI
npx ng update @angular/cli@21 --migrate-only --allow-dirty
```

**What schematics do:**
- Update TypeScript to 5.9
- Add `provideZoneChangeDetection()` if using Zone.js
- Fix `Router.lastSuccessfulNavigation` signal invocation
- Update `ApplicationConfig` imports
- Apply additional migrations

### Step 6: Update Angular Material

```bash
# Update Material components
npx ng update @angular/material@21 --migrate-only --allow-dirty
```

### Step 7: Apply Breaking Changes Fixes

The migration script automatically applies breaking changes fixes:

```powershell
# This happens automatically during migrate-to-v21.ps1
# Or run manually:
Import-Module ..\migrations\scripts\modules\breaking-changes\v21.psm1
Invoke-Angular21BreakingChanges -ProjectPath "."
```

**What This Step Does:**

**Automated Fixes Applied:**
1. ✅ **Router.lastSuccessfulNavigation** - Automatically adds `()` invocation
2. ✅ **ApplicationConfig imports** - Moved from `@angular/platform-browser` to `@angular/core`

**Detection & Warnings:**
3. ⚠️ **Zoneless by default** - Detects if `provideZoneChangeDetection()` needs to be added
4. ⚠️ **NgModuleFactory usage** - Detects removed API
5. ⚠️ **UpgradeAdapter usage** - Detects removed API
6. ⚠️ **ignoreChangesOutsideZone** - Detects removed option
7. ⚠️ **TypeScript version** - Validates 5.9+ requirement
8. ⚠️ **Comprehensive Warnings** - All 12 breaking changes documented with examples

**Expected Output:**
```
🔧 Applying Angular 21 breaking changes and migrations...

📋 Section 1: Official Angular 21 Core Breaking Changes
═══════════════════════════════════════════════════════
📝 Checking for NgModuleFactory usage...
  ✓ No NgModuleFactory usage found
📝 Fixing Router.lastSuccessfulNavigation signal invocation...
  Fixed Router.lastSuccessfulNavigation in 3 file(s)
📝 Fixing ApplicationConfig imports...
  Fixed ApplicationConfig imports in 1 file(s)

(Shows migration progress and warnings)
```

### Step 8: Build the Project

```powershell
# Run build validation
..\migrations\scripts\validate-build.ps1
```

Or manually:

```bash
npm run build
```

### Step 9: Run Tests

```powershell
# Run test validation
..\migrations\scripts\validate-tests.ps1
```

Or manually:

```bash
npm test -- --watch=false
```

**Note:** If you encounter test failures related to navigation timing, see **Common Issues** section below.

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

**Test Checklist:**
- [ ] Application loads
- [ ] Routing works (verify navigation timing)
- [ ] Forms work
- [ ] Signals work correctly
- [ ] Change detection works (with or without Zone.js)
- [ ] No console errors
- [ ] All features functional

### Step 12: Commit Changes

```bash
git add .
git commit -m "chore: migrate to Angular 21

- Updated all @angular packages to 21.0.0
- Updated TypeScript to 5.9.0
- Fixed Router.lastSuccessfulNavigation signal invocation
- Fixed ApplicationConfig imports
- Added provideZoneChangeDetection() for Zone.js support
- Updated AG-Grid to v33
- Updated Highcharts to v12
- All tests passing"
git push
```

### Step 13: Generate Migration Report

```powershell
..\migrations\scripts\generate-migration-report.ps1
```

---

## ⚠️ Common Issues

### Issue 1: Zone.js Not Configured

**Error:**
```
NG0908: No `NgZone` provided, either through `provideZone()` or `provideZoneChangeDetection()`, but `ChangeDetectorRef` is being used for change detection.
```

**Solution:**
```typescript
// main.ts
import { bootstrapApplication, provideZoneChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection() // Add this
  ]
});
```

### Issue 2: Router Navigation Test Failures

**Error:**
```
Expected component.data to be 'newData' but was 'oldData'
```

**Solution:**
```typescript
// Before
it('should navigate', () => {
  router.navigate(['/path']);
  expect(component.data).toBe('newData'); // ❌ Fails
});

// After
it('should navigate', async () => {
  await router.navigate(['/path']); // ✅ Wait for navigation
  expect(component.data).toBe('newData');
});

// Or
it('should navigate', async () => {
  router.navigate(['/path']);
  await fixture.whenStable(); // ✅ Wait for stability
  expect(component.data).toBe('newData');
});
```

### Issue 3: NgModuleFactory Type Errors

**Error:**
```
Cannot find name 'NgModuleFactory'
```

**Solution:**
```typescript
// Before
import { NgModuleFactory } from '@angular/core';
const factory: NgModuleFactory<MyModule> = ...;

// After
import { Type } from '@angular/core';
const module: Type<MyModule> = MyModule;
```

### Issue 4: TypeScript 5.9 Strict Errors

**Error:**
```
Type 'undefined' is not assignable to type 'string'
```

**Solution:**
```typescript
// Use stricter type checking
interface User {
  name: string;
  email?: string; // Optional
}

// Or use nullish coalescing
const email = user.email ?? 'no-email@example.com';

// Or use type guards
if (user.email !== undefined) {
  console.log(user.email); // TypeScript knows it's string
}
```

### Issue 5: Host Binding Type Issues

**Error:**
```
Type 'number' is not assignable to type 'string'
```

**Solution:**
```typescript
// Before
@HostBinding('attr.role')
role = 1; // ❌ Wrong type

// After
@HostBinding('attr.role')
role: string = 'button'; // ✅ Correct type

// Or disable strict checking (temporary)
// tsconfig.json
{
  "angularCompilerOptions": {
    "typeCheckHostBindings": false
  }
}
```

---

## 🔄 Rollback Procedure

```powershell
# Restore from backup
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-TIMESTAMP"

# Reinstall dependencies
npm install
```

Or git rollback:

```bash
git reset --hard <commit-hash-before-migration>
npm install
```

---

## ✅ Verification Checklist

- [ ] `package.json` shows Angular 21.0.0
- [ ] Build completes successfully
- [ ] All tests pass
- [ ] Linter passes
- [ ] Dev server starts
- [ ] Routing works correctly
- [ ] Forms work correctly
- [ ] Signals work correctly
- [ ] Change detection works (verify zoneless or zoneful)
- [ ] No console errors
- [ ] Changes committed to git

---

## 📚 Angular 21 New Features

### 1. Zoneless by Default

Angular 21 apps are zoneless by default, removing the need for Zone.js:

**Benefits:**
- ~50KB smaller bundle size
- Better performance (no monkey-patching)
- Simpler mental model
- Better integration with signals

**Automatic Change Detection with Signals:**
```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <div>Count: {{ count() }}</div>
    <button (click)="increment()">+</button>
  `,
  standalone: true
})
export class CounterComponent {
  count = signal(0);

  increment() {
    this.count.update(c => c + 1); // Automatically triggers change detection
  }
}
```

### 2. Signal Forms

Reactive forms now support signals:

```typescript
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form',
  template: `
    <input [formControl]="emailControl">
    <p>Email: {{ email() }}</p>
  `,
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class FormComponent {
  emailControl = new FormControl('');
  email = this.emailControl.valueAsSignal();
}
```

### 3. Vitest as Default Testing Framework

Angular 21 makes Vitest the default testing framework:

**Benefits:**
- Faster test execution
- Better watch mode
- Better error messages
- Native ESM support

**Migration:**
```bash
ng generate @angular/core:refactor-jasmine-vitest
```

### 4. AI-First Tooling

Enhanced AI integration in Angular CLI:

- Smarter code generation
- Better error messages
- Intelligent suggestions
- Context-aware help

### 5. Enhanced Performance

- Faster builds with esbuild optimizations
- Improved Hot Module Replacement (HMR)
- Better tree-shaking
- Smaller bundle sizes

### 6. Improved Accessibility

- Enhanced ARIA support
- Better keyboard navigation
- Improved screen reader support
- Accessibility linting

---

## 📊 Performance Improvements

- **Zoneless**: ~50KB smaller bundles, faster runtime
- **Build Speed**: 20-30% faster builds
- **HMR**: Instant updates in development
- **Tree-shaking**: Better dead code elimination
- **Signals**: More efficient change detection

---

## 🔗 References

- [Angular 21 Release Notes](https://github.com/angular/angular/releases/tag/21.0.0)
- [Angular 21 Blog Post](https://angular.dev/events/v21)
- [Zoneless Guide](https://angular.dev/guide/zoneless)
- [Signal Forms Guide](https://angular.dev/guide/signals)
- [Vitest Migration Guide](https://angular.dev/reference/migrations)
- [Angular Update Guide](https://angular.dev/update-guide?v=20.0-21.0)

---

## 📈 Migration Timeline

- **Preparation**: 30 minutes
- **Package Updates**: 20 minutes
- **Schematics**: 20 minutes
- **Manual Fixes**: 1-2 hours
- **Testing**: 2-4 hours
- **Total**: 4-8 hours

---

## 🎯 Next Steps

**Migration successful?** → Your project is now on Angular 21! 🎉

**Issues encountered?** → See [Troubleshooting](troubleshooting.md)

**Want to go zoneless?** → Follow the [Zoneless Migration Guide](https://angular.dev/guide/zoneless)

---

**Quick Command Reference:**

```powershell
# Complete migration
..\migrations\scripts\migrate-to-v21.ps1

# Validate
..\migrations\scripts\validate-build.ps1
..\migrations\scripts\validate-tests.ps1

# Generate report
..\migrations\scripts\generate-migration-report.ps1
```

---

## 🌟 Summary

Angular 21 is a **major release** focused on:
- ⚡ **Performance** - Zoneless by default
- 🎯 **Developer Experience** - Signal Forms, Vitest, AI tooling
- 🚀 **Modern Standards** - TypeScript 5.9, better tooling
- ♿ **Accessibility** - Enhanced ARIA support

**Upgrade Recommendation:** 🟢 **Strongly Recommended**

Angular 21 provides significant performance improvements and modernizes the Angular development experience. The zoneless-by-default approach is a game-changer for bundle size and runtime performance.

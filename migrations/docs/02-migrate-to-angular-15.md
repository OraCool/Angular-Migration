# Migrate to Angular 15

> **Angular 14 → Angular 15 Migration Guide**

Angular 15 is the first step in the migration path to Angular 20. This version introduces standalone components as a stable feature, improved developer experience, and performance enhancements.

---

## 📋 Overview

**Angular 15 Key Features:**
- 🎯 Standalone components (stable, but optional)
- 🎨 Directive composition API
- 🚀 Router improvements and functional guards
- 🖼️ NgOptimizedImage directive for image optimization
- 📦 Simplified component authoring
- ⚡ Improved build performance

**Migration Difficulty**: 🟢 Low to Medium
**Estimated Time**: 2-4 hours
**Node.js Requirement**: 14.20+, 16.x, or 18.x
**TypeScript Requirement**: 4.8+

---

## 🔄 What Changes

### Package Updates

| Package | Angular 14 | Angular 15 | Notes |
|---------|------------|------------|-------|
| @angular/core | 14.x | **15.2.0** | Core framework |
| @angular/cli | 14.x | **15.2.0** | Angular CLI |
| @angular/material | 14.x | **15.2.0** | Material Design |
| TypeScript | ~4.7.0 | **~4.8.4** | Required upgrade |
| RxJS | ~7.5.0 | **~7.8.0** | Reactive extensions |
| zone.js | ~0.11.4 | **~0.12.0** | Change detection |

### Breaking Changes

#### 1. Router `CanActivate` Functional Guards

**Before (Angular 14):**
```typescript
// Class-based guard
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const isAuthenticated = !!localStorage.getItem('token');
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}

// Route configuration
const routes: Routes = [
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] }
];
```

**After (Angular 15 - Recommended):**
```typescript
// Functional guard (new in Angular 15)
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard = () => {
  const router = inject(Router);
  const isAuthenticated = !!localStorage.getItem('token');

  if (!isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

// Route configuration
const routes: Routes = [
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] }
];
```

**Note**: Class-based guards still work in Angular 15, but functional guards are the new recommended pattern.

#### 2. `@angular/router` API Changes

The `DATE_PIPE_DEFAULT_TIMEZONE` token has been removed. Use `DATE_PIPE_DEFAULT_OPTIONS` instead:

**Before:**
```typescript
import { DATE_PIPE_DEFAULT_TIMEZONE } from '@angular/common';

providers: [
  { provide: DATE_PIPE_DEFAULT_TIMEZONE, useValue: 'America/New_York' }
]
```

**After:**
```typescript
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';

providers: [
  { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: 'America/New_York' } }
]
```

#### 3. TypeScript Strict Mode Improvements

Angular 15 has better TypeScript strict mode support. If you have `strict: true` in `tsconfig.json`, you may see new errors:

```typescript
// Angular 14: This might have passed
ngOnInit() {
  this.user = null; // Error in Angular 15 with strict mode
}

// Angular 15: Explicit typing required
user: User | null = null;

ngOnInit() {
  this.user = null; // Now OK
}
```

#### 4. `setDisabledState` in Custom Form Controls

If you have custom form controls, `setDisabledState` is now required:

**Before (Angular 14):**
```typescript
export class CustomInputComponent implements ControlValueAccessor {
  writeValue(value: any): void { }
  registerOnChange(fn: any): void { }
  registerOnTouched(fn: any): void { }
  // setDisabledState was optional
}
```

**After (Angular 15):**
```typescript
export class CustomInputComponent implements ControlValueAccessor {
  writeValue(value: any): void { }
  registerOnChange(fn: any): void { }
  registerOnTouched(fn: any): void { }

  // Now required
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
```

---

## 🚀 Migration Steps

### Step 1: Verify Prerequisites

Ensure you meet all requirements:

```powershell
# Run prerequisites check
..\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "15"
```

**Manual Check:**
```bash
# Node.js version (must be 14.20+, 16.x, or 18.x)
node --version

# Current Angular version (should be 14.x)
npm list @angular/core

# Git status (should be clean)
git status
```

### Step 2: Create Backup

Create a backup before starting:

```powershell
# Create timestamped backup
..\migrations\scripts\01-create-backup.ps1

# Verify backup created
Test-Path "backups\backup-*"
```

Or create git commit:

```bash
git add .
git commit -m "chore: snapshot before Angular 15 migration"
git push
```

### Step 3: Update Package Versions

Run the migration script:

```powershell
# Automated migration (recommended)
..\migrations\scripts\migrate-to-v15.ps1

# Or run steps manually:
# Update package.json
Import-Module ..\migrations\scripts\modules\PackageManager.psm1
Update-PackageJson -ProjectPath "." -TargetVersion "15"
```

**What this does:**
- Updates all `@angular/*` packages to 15.2.0
- Updates TypeScript to ~4.8.4
- Updates RxJS to ~7.8.0
- Updates zone.js to ~0.12.0
- Updates third-party packages to compatible versions

### Step 4: Install Dependencies

```powershell
# Remove old dependencies
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force

# Install new dependencies
npm install
```

### Step 5: Run Angular Update Schematics

Angular provides automated migration schematics:

```bash
# Update Angular core
npx ng update @angular/core@15 --migrate-only --allow-dirty

# Update Angular CLI
npx ng update @angular/cli@15 --migrate-only --allow-dirty
```

**What schematics do:**
- Update imports and API usage
- Modify configuration files
- Apply code transformations
- Update deprecated patterns

### Step 6: Update Angular Material (if using)

```bash
# Update Material components
npx ng update @angular/material@15 --migrate-only --allow-dirty
```

### Step 7: Fix Breaking Changes

Run the breaking changes script:

```powershell
# Automated fixes
..\migrations\scripts\fix-breaking-changes-v15.ps1

# Or use module function
Import-Module ..\migrations\scripts\modules\BreakingChanges.psm1
Invoke-BreakingChangesFix -ProjectPath "." -Version "15"
```

**Manual Fixes:**

If you need to manually update code:

1. **Update Date Pipe Configuration:**
```typescript
// Find and replace in app.module.ts or providers
// OLD: DATE_PIPE_DEFAULT_TIMEZONE
// NEW: DATE_PIPE_DEFAULT_OPTIONS with { timezone: '...' }
```

2. **Add setDisabledState to Custom Controls:**
```bash
# Find all ControlValueAccessor implementations
grep -r "implements ControlValueAccessor" src/

# Add setDisabledState method to each
```

### Step 8: Build the Project

```powershell
# Run build validation
..\migrations\scripts\validate-build.ps1
```

Or manually:

```bash
# Clean build
npm run build

# Or for production
npm run build -- --configuration production
```

**Expected Output:**
```
✔ Browser application bundle generation complete.
✔ Copying assets complete.
✔ Index html generation complete.

Build at: 2025-01-12T15:45:12.123Z
Time: 38456ms
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

### Step 10: Run Linter

```powershell
# Run lint validation
..\migrations\scripts\validate-lint.ps1
```

Or manually:

```bash
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Step 11: Manual Testing

Start the development server and test:

```bash
npm start
```

**Test Checklist:**
- [ ] Application loads without errors
- [ ] Routing works (all routes accessible)
- [ ] Forms work (reactive and template-driven)
- [ ] Authentication/guards work
- [ ] API calls work
- [ ] Material components render correctly
- [ ] No console errors in browser DevTools

### Step 12: Commit Changes

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "chore: migrate to Angular 15

- Updated all @angular packages to 15.2.0
- Updated TypeScript to 4.8.4
- Updated RxJS to 7.8.0
- Applied breaking changes fixes
- All tests passing"

# Push to remote
git push
```

### Step 13: Generate Migration Report

```powershell
# Create comprehensive report
..\migrations\scripts\generate-migration-report.ps1
```

---

## ⚠️ Common Issues

### Issue 1: TypeScript Compilation Errors

**Error:**
```
error TS2322: Type 'null' is not assignable to type 'User'
```

**Cause**: Stricter TypeScript checks in Angular 15

**Solution:**
```typescript
// Add null to type union
user: User | null = null;

// Or use optional chaining
this.user?.name
```

### Issue 2: RxJS Deprecation Warnings

**Error:**
```
'subscribe(next, error, complete)' is deprecated
```

**Solution:**
```typescript
// Before (deprecated)
this.service.getData().subscribe(
  data => console.log(data),
  error => console.error(error),
  () => console.log('complete')
);

// After (Angular 15)
this.service.getData().subscribe({
  next: data => console.log(data),
  error: error => console.error(error),
  complete: () => console.log('complete')
});
```

### Issue 3: RouterModule Configuration Warnings

**Warning:**
```
RouterModule.forRoot() should only be called in the root module
```

**Solution:**
```typescript
// In app.module.ts (root module)
@NgModule({
  imports: [RouterModule.forRoot(routes)]
})

// In feature modules
@NgModule({
  imports: [RouterModule.forChild(routes)]
})
```

### Issue 4: Zone.js Errors

**Error:**
```
Zone.js is not loaded
```

**Solution:**
```typescript
// Ensure zone.js is imported in src/polyfills.ts or src/main.ts
import 'zone.js';  // Must be imported before Angular

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
```

### Issue 5: Build Performance Issues

**Symptom**: Slow build times

**Solution:**
```json
// Update angular.json for better caching
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "buildOptimizer": true,
            "optimization": true,
            "sourceMap": false
          }
        }
      }
    }
  }
}
```

---

## 🔄 Rollback Procedure

If you encounter critical issues:

### Quick Rollback

```powershell
# Restore from backup
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-TIMESTAMP"

# Reinstall dependencies
npm install

# Verify rollback
npm run build
npm test
```

### Git Rollback

```bash
# Reset to commit before migration
git log --oneline  # Find commit hash
git reset --hard <commit-hash-before-migration>

# Reinstall dependencies
npm install

# Force push if already pushed (use with caution)
git push --force
```

---

## ✅ Verification Checklist

After migration, verify:

- [ ] `package.json` shows Angular 15.2.0
- [ ] `npm list @angular/core` shows 15.2.0
- [ ] Build completes successfully (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Dev server starts (`npm start`)
- [ ] Application loads in browser without errors
- [ ] All routes work
- [ ] Forms work (validation, submission)
- [ ] Authentication/authorization works
- [ ] API integration works
- [ ] Material components render correctly
- [ ] No console errors or warnings
- [ ] Changes committed to git
- [ ] Migration report generated

---

## 📚 Angular 15 New Features (Optional Exploration)

While not required for migration, consider exploring:

### 1. Standalone Components

```typescript
// New in Angular 15: Create component without NgModule
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-greeting',
  standalone: true,
  imports: [CommonModule],
  template: `<h1>Hello {{ name }}!</h1>`
})
export class GreetingComponent {
  name = 'Angular 15';
}
```

### 2. Directive Composition API

```typescript
// Compose multiple directives
@Component({
  selector: 'app-button',
  standalone: true,
  hostDirectives: [
    { directive: MatRipple },
    { directive: MatTooltip, inputs: ['matTooltip: tooltip'] }
  ],
  template: `<button>Click me</button>`
})
export class AppButtonComponent {}
```

### 3. NgOptimizedImage Directive

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <img ngSrc="hero.jpg" width="400" height="200" priority>
  `
})
```

**See**: [Optional Standalone Migration](optional-standalone-migration.md) for full guide

---

## 📊 Performance Improvements

Angular 15 brings performance improvements out of the box:

- **Faster Builds**: Up to 50% faster in large applications
- **Smaller Bundles**: Improved tree-shaking reduces bundle sizes
- **Better Change Detection**: Optimized change detection algorithm
- **Router Performance**: Faster route resolution

**No action required** - these improvements are automatic!

---

## 🔗 References

- [Angular 15 Release Notes](https://blog.angular.io/angular-v15-is-now-available-df7be7f2f4c8)
- [Angular Update Guide](https://update.angular.io/?v=14.0-15.0)
- [TypeScript 4.8 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-8.html)
- [RxJS 7.8 Documentation](https://rxjs.dev/)

---

## 📈 Migration Timeline

- **Preparation**: 30 minutes (backup, verify prerequisites)
- **Package Updates**: 15 minutes (update package.json, npm install)
- **Schematics**: 20 minutes (run ng update commands)
- **Breaking Changes**: 30 minutes (manual fixes)
- **Testing**: 1-2 hours (build, test, manual testing)
- **Total**: 2-4 hours

---

## 🎯 Next Steps

**Migration successful?** → Continue to [Angular 16 Migration](03-migrate-to-angular-16.md)

**Want to explore new features?** → See [Optional Standalone Migration](optional-standalone-migration.md)

**Issues encountered?** → See [Troubleshooting](troubleshooting.md)

---

**Quick Command Reference:**

```powershell
# Complete migration
..\migrations\scripts\migrate-to-v15.ps1

# Validate
..\migrations\scripts\validate-build.ps1
..\migrations\scripts\validate-tests.ps1

# Generate report
..\migrations\scripts\generate-migration-report.ps1
```

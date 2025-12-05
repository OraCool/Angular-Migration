# Migrate to Angular 18

> **Angular 17 → Angular 18 Migration Guide**

Angular 18 stabilizes signals, introduces experimental zoneless change detection, and brings significant improvements to server-side rendering and hydration.

---

## 📋 Overview

**Angular 18 Key Features:**
- 🎯 Signals stable and production-ready
- ⚡ Experimental zoneless change detection
- 🔄 Improved hydration and SSR
- 📦 Enhanced Material components
- 🚀 Performance improvements
- 🛠️ Better developer experience

**Migration Difficulty**: 🟢 Low to Medium
**Estimated Time**: 2-4 hours
**Node.js Requirement**: 18.13+
**TypeScript Requirement**: 5.4+

---

## 🔄 What Changes

### Package Updates

| Package | Angular 17 | Angular 18 | Notes |
|---------|------------|------------|-------|
| @angular/core | 17.x | **18.2.0** | Core framework |
| @angular/cli | 17.x | **18.2.0** | Angular CLI |
| @angular/material | 17.x | **18.2.0** | Material Design |
| TypeScript | ~5.2.0 | **~5.4.5** | Required upgrade |
| RxJS | ~7.8.0 | **~7.8.0** | No change |
| zone.js | ~0.14.0 | **~0.14.7** | Optional with zoneless |

### Breaking Changes

#### 1. Signal-based APIs Now Stable

Signals are now the recommended pattern for state management:

**Before (Angular 17 - Experimental):**
```typescript
import { signal, computed } from '@angular/core';

export class AppComponent {
  // Signals were experimental
  count = signal(0);
}
```

**After (Angular 18 - Stable):**
```typescript
import { signal, computed, effect } from '@angular/core';

export class AppComponent {
  // Signals are now stable and recommended
  count = signal(0);
  doubleCount = computed(() => this.count() * 2);

  constructor() {
    effect(() => console.log('Count:', this.count()));
  }
}
```

#### 2. Route Redirects Must Be Absolute

**Before (Angular 17):**
```typescript
const routes: Routes = [
  { path: 'old', redirectTo: 'new' }, // Relative redirect
  { path: 'new', component: NewComponent }
];
```

**After (Angular 18):**
```typescript
const routes: Routes = [
  { path: 'old', redirectTo: '/new' }, // Must be absolute
  { path: 'new', component: NewComponent }
];
```

#### 3. `@angular/platform-server` API Changes

For SSR applications, some APIs have changed:

**Before:**
```typescript
import { renderModule } from '@angular/platform-server';

const html = await renderModule(AppModule, {
  document: '<app-root></app-root>',
  url: '/'
});
```

**After:**
```typescript
import { renderApplication } from '@angular/platform-server';

const html = await renderApplication(AppComponent, {
  appId: 'app',
  document: '<app-root></app-root>',
  url: '/'
});
```

#### 4. Hydration Enabled by Default

For SSR apps, hydration is now enabled by default:

```typescript
import { bootstrapApplication, provideClientHydration } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration() // Now enabled by default in Angular 18
  ]
});
```

---

## 🚀 Migration Steps

### Step 1: Verify Prerequisites

```powershell
# Run prerequisites check
..\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "18"
```

**Manual Check:**
```bash
# Node.js version (must be 18.13+)
node --version  # Should be v18.13.0 or higher

# Current Angular version (should be 17.x)
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
git commit -m "chore: snapshot before Angular 18 migration"
git push
```

### Step 3: Update Package Versions

```powershell
# Automated migration (recommended)
..\migrations\scripts\migrate-to-v18.ps1

# Or manual package update
Import-Module ..\migrations\scripts\modules\PackageManager.psm1
Update-PackageJson -ProjectPath "." -TargetVersion "18"
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
npx ng update @angular/core@18 --migrate-only --allow-dirty

# Update Angular CLI
npx ng update @angular/cli@18 --migrate-only --allow-dirty
```

**What schematics do:**
- Update TypeScript to 5.4
- Convert relative redirects to absolute
- Update SSR APIs if applicable
- Apply signal-based API improvements

### Step 6: Update Angular Material

```bash
# Update Material components
npx ng update @angular/material@18 --migrate-only --allow-dirty
```

### Step 7: Build the Project

```powershell
# Run build validation
..\migrations\scripts\validate-build.ps1
```

Or manually:

```bash
npm run build
```

### Step 8: Run Tests

```powershell
# Run test validation
..\migrations\scripts\validate-tests.ps1
```

Or manually:

```bash
npm test -- --watch=false
```

### Step 9: Run Linter

```powershell
..\migrations\scripts\validate-lint.ps1
```

Or manually:

```bash
npm run lint -- --fix
```

### Step 10: Manual Testing

```bash
npm start
```

**Test Checklist:**
- [ ] Application loads
- [ ] Routing works (verify redirects)
- [ ] Forms work
- [ ] Signals work correctly
- [ ] No console errors
- [ ] SSR works (if applicable)

### Step 11: Commit Changes

```bash
git add .
git commit -m "chore: migrate to Angular 18

- Updated all @angular packages to 18.2.0
- Updated TypeScript to 5.4.5
- Applied route redirect fixes
- All tests passing"
git push
```

### Step 12: Generate Migration Report

```powershell
..\migrations\scripts\generate-migration-report.ps1
```

---

## ⚠️ Common Issues

### Issue 1: Relative Route Redirects

**Error:**
```
Route redirect must be absolute
```

**Solution:**
```typescript
// Find all relative redirects
// Change: redirectTo: 'new'
// To: redirectTo: '/new'

const routes: Routes = [
  { path: 'old', redirectTo: '/new' } // Add leading slash
];
```

### Issue 2: SSR Hydration Errors

**Error:**
```
Hydration failed due to mismatch
```

**Solution:**
```typescript
// Ensure server and client render the same
// Avoid:
if (typeof window !== 'undefined') {
  // This causes hydration mismatch
}

// Instead use:
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

export class MyComponent {
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Browser-specific code
    }
  }
}
```

### Issue 3: TypeScript 5.4 Errors

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

- [ ] `package.json` shows Angular 18.2.0
- [ ] Build completes successfully
- [ ] All tests pass
- [ ] Linter passes
- [ ] Dev server starts
- [ ] Routing works (redirects are absolute)
- [ ] Signals work correctly
- [ ] SSR/hydration works (if applicable)
- [ ] No console errors
- [ ] Changes committed to git

---

## 📚 Angular 18 New Features

### 1. Stable Signals

```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <div>
      <p>Count: {{ count() }}</p>
      <p>Double: {{ doubleCount() }}</p>
      <button (click)="increment()">Increment</button>
    </div>
  `
})
export class CounterComponent {
  count = signal(0);
  doubleCount = computed(() => this.count() * 2);

  constructor() {
    effect(() => {
      console.log('Count changed to:', this.count());
    });
  }

  increment() {
    this.count.update(c => c + 1);
  }
}
```

### 2. Experimental Zoneless Change Detection

Enable zoneless mode for better performance:

```typescript
import { bootstrapApplication, provideExperimentalZonelessChangeDetection } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});
```

**Benefits:**
- No zone.js dependency
- Smaller bundle size
- Better performance
- Simpler mental model

**Requirements:**
- Must use signals or OnPush strategy
- Must call `ChangeDetectorRef.markForCheck()` manually when needed

### 3. Enhanced SSR and Hydration

```typescript
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(
      withEventReplay() // Replay user events during hydration
    )
  ]
});
```

### 4. New `@let` Syntax (Experimental)

```html
<!-- Define local template variables -->
@let user = currentUser$ | async;
@let name = user?.name ?? 'Guest';

@if (user) {
  <p>Welcome {{ name }}!</p>
}
```

---

## 📊 Performance Improvements

- **Signals**: More efficient change detection
- **Zoneless**: Smaller bundles, faster runtime
- **Hydration**: Faster initial page load for SSR
- **Build**: Continued improvements in build speed

---

## 🔗 References

- [Angular 18 Release Notes](https://blog.angular.io/angular-v18-is-now-available-e79d5ac0affe)
- [Signals Guide](https://angular.dev/guide/signals)
- [Zoneless Change Detection](https://angular.dev/guide/experimental/zoneless)
- [Hydration Guide](https://angular.dev/guide/hydration)
- [Angular Update Guide](https://update.angular.io/?v=17.0-18.0)

---

## 📈 Migration Timeline

- **Preparation**: 30 minutes
- **Package Updates**: 15 minutes
- **Schematics**: 15 minutes
- **Manual Fixes**: 30 minutes
- **Testing**: 1-2 hours
- **Total**: 2-4 hours

---

## 🎯 Next Steps

**Migration successful?** → Continue to [Angular 19 Migration](06-migrate-to-angular-19.md)

**Issues encountered?** → See [Troubleshooting](troubleshooting.md)

---

**Quick Command Reference:**

```powershell
# Complete migration
..\migrations\scripts\migrate-to-v18.ps1

# Validate
..\migrations\scripts\validate-build.ps1
..\migrations\scripts\validate-tests.ps1

# Generate report
..\migrations\scripts\generate-migration-report.ps1
```

# Migrate to Angular 19

> **Angular 18 → Angular 19 Migration Guide**

Angular 19 makes zoneless change detection stable, introduces standalone components as the default, and brings powerful new reactive primitives with `resource()` and `linkedSignal()`.

---

## 📋 Overview

**Angular 19 Key Features:**
- 🎯 Zoneless change detection (stable)
- 🔄 Standalone components as default
- 📡 `resource()` API for async data fetching
- 🔗 `linkedSignal()` for derived state
- ⚡ Enhanced performance
- 🛠️ Improved developer experience

**Migration Difficulty**: 🟡 Medium
**Estimated Time**: 3-6 hours
**Node.js Requirement**: 18.19+ or 20.x
**TypeScript Requirement**: 5.5+

---

## 🔄 What Changes

### Package Updates

| Package | Angular 18 | Angular 19 | Notes |
|---------|------------|------------|-------|
| @angular/core | 18.x | **19.0.0** | Core framework |
| @angular/cli | 18.x | **19.0.0** | Angular CLI |
| @angular/material | 18.x | **19.0.0** | Material Design |
| TypeScript | ~5.4.0 | **~5.5.4** | Required upgrade |
| RxJS | ~7.8.0 | **~7.8.0** | No change |
| zone.js | ~0.14.7 | **Optional** | Not needed for zoneless |

### Breaking Changes

#### 1. Standalone Components by Default

**New projects** created with Angular 19 use standalone components by default.

**Migration for existing apps:**

```typescript
// Before (NgModule-based)
@NgModule({
  declarations: [AppComponent, HeaderComponent],
  imports: [BrowserModule, CommonModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

**After (Standalone - Recommended):**
```typescript
// app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header />
    <router-outlet />
  `
})
export class AppComponent {}

// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig);
```

**Note**: NgModule-based apps still work in Angular 19. Migration to standalone is optional but recommended.

#### 2. Zoneless Change Detection (Stable)

Can now remove zone.js dependency:

**Before (Angular 18):**
```typescript
// main.ts
import 'zone.js'; // Required

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent);
```

**After (Angular 19 - Zoneless):**
```typescript
// main.ts
// No zone.js import needed!

import { bootstrapApplication, provideExperimentalZonelessChangeDetection } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});
```

**Benefits:**
- Smaller bundle size (~50KB saved)
- Better performance
- Simpler debugging
- Works great with signals

**Requirements for zoneless:**
- Use signals or `OnPush` strategy
- Call `ChangeDetectorRef.markForCheck()` when using observables

#### 3. `TestBed` API Changes

**Before:**
```typescript
import { TestBed } from '@angular/core/testing';

TestBed.configureTestingModule({
  declarations: [MyComponent]
});
```

**After (for standalone components):**
```typescript
import { TestBed } from '@angular/core/testing';

TestBed.configureTestingModule({
  imports: [MyComponent] // Standalone components go in imports
});
```

#### 4. Router `redirectTo` Function Support

**New in Angular 19:**
```typescript
const routes: Routes = [
  {
    path: 'old/:id',
    redirectTo: ({ params }) => `/new/${params['id']}`
  }
];
```

---

## 🚀 Migration Steps

### Step 1: Verify Prerequisites

```powershell
# Run prerequisites check
..\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "19"
```

**Manual Check:**
```bash
# Node.js version (must be 18.19+ or 20.x)
node --version

# Current Angular version (should be 18.x)
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
git commit -m "chore: snapshot before Angular 19 migration"
git push
```

### Step 3: Update Package Versions

```powershell
# Automated migration (recommended)
..\migrations\scripts\migrate-to-v19.ps1

# Or manual package update
Import-Module ..\migrations\scripts\modules\PackageManager.psm1
Update-PackageJson -ProjectPath "." -TargetVersion "19"
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
npx ng update @angular/core@19 --migrate-only --allow-dirty

# Update Angular CLI
npx ng update @angular/cli@19 --migrate-only --allow-dirty
```

**What schematics do:**
- Update TypeScript to 5.5
- Convert TestBed configurations for standalone components
- Update router redirects if needed
- Apply API improvements

### Step 6: Update Angular Material

```bash
# Update Material components
npx ng update @angular/material@19 --migrate-only --allow-dirty
```

### Step 7: Fix Breaking Changes

```powershell
# Automated fixes
..\migrations\scripts\fix-breaking-changes-v19.ps1

# Or use module function
Import-Module ..\migrations\scripts\modules\BreakingChanges.psm1
Invoke-BreakingChangesFix -ProjectPath "." -Version "19"
```

**Manual Fixes:**

1. **Update TestBed for Standalone Components:**

```bash
# Find test files
grep -r "TestBed.configureTestingModule" src/**/*.spec.ts
```

Update each:
```typescript
// If MyComponent is standalone, move to imports:
TestBed.configureTestingModule({
  imports: [MyComponent], // Changed from declarations
  providers: [MyService]
});
```

2. **Consider Enabling Zoneless (Optional):**

```typescript
// main.ts
import { bootstrapApplication, provideExperimentalZonelessChangeDetection } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});
```

If enabling zoneless, ensure:
- All components use signals or OnPush
- Call `markForCheck()` when using observables

### Step 8: Build the Project

```powershell
..\migrations\scripts\validate-build.ps1
```

Or manually:

```bash
npm run build
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

**Test Checklist:**
- [ ] Application loads
- [ ] Routing works
- [ ] Forms work
- [ ] Change detection works (if zoneless)
- [ ] Async operations work
- [ ] No console errors

### Step 12: Commit Changes

```bash
git add .
git commit -m "chore: migrate to Angular 19

- Updated all @angular packages to 19.0.0
- Updated TypeScript to 5.5.4
- Updated TestBed configurations
- All tests passing"
git push
```

### Step 13: Generate Migration Report

```powershell
..\migrations\scripts\generate-migration-report.ps1
```

---

## ⚠️ Common Issues

### Issue 1: TestBed Configuration Errors

**Error:**
```
Component 'MyComponent' is standalone and cannot be declared in an NgModule
```

**Solution:**
```typescript
// Move standalone components to imports
TestBed.configureTestingModule({
  imports: [MyComponent], // Not declarations
  providers: []
});
```

### Issue 2: Zoneless Change Detection Issues

**Error:**
```
View not updating in zoneless mode
```

**Solution:**
```typescript
import { ChangeDetectorRef, inject } from '@angular/core';

export class MyComponent {
  private cdr = inject(ChangeDetectorRef);

  loadData() {
    this.http.get('/api/data').subscribe(data => {
      this.data = data;
      this.cdr.markForCheck(); // Required in zoneless
    });
  }
}

// Or use signals (preferred):
export class MyComponent {
  data = signal<any>(null);

  loadData() {
    this.http.get('/api/data').subscribe(data => {
      this.data.set(data); // Automatically triggers update
    });
  }
}
```

### Issue 3: TypeScript 5.5 Strict Errors

**Error:**
```
Type 'null' is not assignable to parameter of type 'string'
```

**Solution:**
```typescript
// Use type guards
function processName(name: string | null) {
  if (name !== null) {
    console.log(name.toUpperCase());
  }
}

// Or nullish coalescing
const displayName = user.name ?? 'Unknown';
```

---

## 🔄 Rollback Procedure

```powershell
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-TIMESTAMP"
npm install
```

Or git rollback:

```bash
git reset --hard <commit-hash-before-migration>
npm install
```

---

## ✅ Verification Checklist

- [ ] `package.json` shows Angular 19.0.0
- [ ] Build completes successfully
- [ ] All tests pass
- [ ] Linter passes
- [ ] Dev server starts
- [ ] Application works correctly
- [ ] TestBed configurations updated
- [ ] Zoneless works (if enabled)
- [ ] Changes committed to git

---

## 📚 Angular 19 New Features

### 1. `resource()` API

New reactive API for async data fetching:

```typescript
import { resource } from '@angular/core';

export class UserComponent {
  userId = input.required<string>();

  user = resource({
    request: () => ({ id: this.userId() }),
    loader: ({ request }) => fetch(`/api/users/${request.id}`).then(r => r.json())
  });
}
```

Template:
```html
@if (user.isLoading()) {
  <p>Loading...</p>
} @else if (user.hasValue()) {
  <p>{{ user.value().name }}</p>
} @else if (user.error()) {
  <p>Error: {{ user.error() }}</p>
}
```

### 2. `linkedSignal()` API

Create derived signals with write capability:

```typescript
import { linkedSignal } from '@angular/core';

export class Component {
  count = signal(0);

  // Derived signal that can also be set independently
  displayCount = linkedSignal({
    source: this.count,
    computation: (source, previous) => {
      // Can transform source value
      return source * 2;
    }
  });

  // Can still set independently
  setDisplay(value: number) {
    this.displayCount.set(value);
  }
}
```

### 3. Enhanced Standalone API

```typescript
// Simplified app configuration
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideExperimentalZonelessChangeDetection()
  ]
};
```

### 4. Stable Zoneless Change Detection

```typescript
// main.ts
import { bootstrapApplication, provideExperimentalZonelessChangeDetection } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});
```

**Benefits:**
- ~50KB smaller bundle
- Faster runtime performance
- Simpler mental model
- Better debugging

---

## 📊 Performance Improvements

- **Zoneless**: ~20% faster change detection
- **Signals**: More efficient reactivity
- **Resource API**: Optimized async data handling
- **Bundle Size**: Smaller with zoneless (~50KB saved)

---

## 🔗 References

- [Angular 19 Release Notes](https://blog.angular.io/meet-angular-v19-7b29dfd05b84)
- [Resource API Guide](https://angular.dev/api/core/resource)
- [LinkedSignal Guide](https://angular.dev/api/core/linkedSignal)
- [Zoneless Guide](https://angular.dev/guide/experimental/zoneless)
- [Angular Update Guide](https://update.angular.io/?v=18.0-19.0)

---

## 📈 Migration Timeline

- **Preparation**: 30 minutes
- **Package Updates**: 15 minutes
- **Schematics**: 20 minutes
- **Manual Fixes**: 1-2 hours
- **Testing**: 2-3 hours
- **Total**: 3-6 hours

---

## 🎯 Next Steps

**Migration successful?** → Continue to [Angular 20 Migration](07-migrate-to-angular-20.md)

**Issues encountered?** → See [Troubleshooting](troubleshooting.md)

---

**Quick Command Reference:**

```powershell
# Complete migration
..\migrations\scripts\migrate-to-v19.ps1

# Validate
..\migrations\scripts\validate-build.ps1
..\migrations\scripts\validate-tests.ps1

# Fix breaking changes
..\migrations\scripts\fix-breaking-changes-v19.ps1

# Generate report
..\migrations\scripts\generate-migration-report.ps1
```

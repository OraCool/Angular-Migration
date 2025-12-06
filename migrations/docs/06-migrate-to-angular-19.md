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

The migration is organized into three categories based on automation level:

---

**What Gets Automatically Fixed by v19.psm1:**

#### 1. TranslateHttpLoader Constructor ✅ **AUTO-FIXED**

The migration script automatically fixes `@ngx-translate/http-loader@17.0.0` constructor:

**Before:**
```typescript
new TranslateHttpLoader(http, './assets/i18n/', '.json')
```

**After:**
```typescript
new TranslateHttpLoader(http) // Parameters removed in v17.0.0
```

#### 2. Standalone Components in NgModules ✅ **AUTO-FIXED**

The migration script moves standalone components from `declarations` to `imports`:

**Before:**
```typescript
@NgModule({
  declarations: [MyStandaloneComponent], // ❌ Error in Angular 19
  imports: [CommonModule]
})
```

**After:**
```typescript
@NgModule({
  declarations: [],
  imports: [CommonModule, MyStandaloneComponent] // ✅ Correct
})
```

#### 3. AG-Grid v32 API Changes ✅ **AUTO-FIXED**

The migration script updates AG-Grid v32 API usage:

**Changes:**
- Removes `ColumnApi` imports and usage
- `setRowData()` → `setGridOption('rowData', data)`
- `setQuickFilter()` → `setGridOption('quickFilterText', text)`

#### 4. i18n Service Return Types ✅ **AUTO-FIXED**

Fixes readonly return type for `getLangs()` method.

---

**What Gets Automatically Detected:**

#### 5. BrowserModule.withServerTransition() Removed ⚠️ **CRITICAL - DETECTED**

The migration script detects this removed API:

**Before (Angular 18):**
```typescript
import { BrowserModule } from '@angular/platform-browser';

@NgModule({
  imports: [
    BrowserModule.withServerTransition({ appId: 'my-app' }) // ❌ REMOVED
  ]
})
```

**After (Angular 19):**
```typescript
import { BrowserModule } from '@angular/platform-browser';
import { APP_ID } from '@angular/core';

@NgModule({
  imports: [BrowserModule],
  providers: [{ provide: APP_ID, useValue: 'my-app' }] // ✅ New approach
})
```

#### 6. KeyValueDiffers.factories Removed ⚠️ **DETECTED**

The migration script detects usage of the removed `.factories` property.

**Migration:** Remove all usage of `KeyValueDiffers.factories`.

#### 7. Testability Methods Removed ⚠️ **DETECTED**

The migration script detects removed zone.js-specific methods:
- `increasePendingRequestCount()`
- `decreasePendingRequestCount()`
- `getPendingRequestCount()`

**Migration:** Not needed for zoneless apps.

#### 8. ApplicationRef.tick() Error Handling Changed ⚠️ **DETECTED**

**Impact:** No longer catches errors and reports to ErrorHandler.

**Migration:** Wrap `tick()` calls in try-catch if needed.

#### 9. HTTP Caching with Auth Headers ⚠️ **DETECTED**

**Impact:** Requests with authorization headers now prevented from caching by default.

**Migration (to opt-out):**
```typescript
import { provideHttpClient, withHttpTransferCache } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withHttpTransferCache({
        includeRequestsWithAuthHeaders: true // Restore old behavior
      })
    )
  ]
});
```

#### 10. @localize Schematic Changes ⚠️ **DETECTED**

**Migration:**
```bash
# Before
ng add @angular/localize --name=my-app

# After
ng add @angular/localize --project=my-app
```

#### 11. TypeScript <5.9 No Longer Supported ⚠️ **DETECTED**

**Requirement:** TypeScript 5.9 or higher

The migration script checks your `package.json` and warns if TypeScript version is too old.

---

**What Requires Manual Review (New Features):**

#### 12. Standalone Components by Default

**New projects** created with Angular 19 use standalone components by default.

**Note**: NgModule-based apps still work in Angular 19. Migration to standalone is optional but recommended.

#### 13. Zoneless Change Detection (Stable)

Can now remove zone.js dependency (~50KB saved):

```typescript
import { bootstrapApplication, provideExperimentalZonelessChangeDetection } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
});
```

**Requirements:**
- Use signals or `OnPush` strategy
- Call `ChangeDetectorRef.markForCheck()` when using observables

#### 14. Router `redirectTo` Function Support

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

### Step 7: Apply Breaking Changes Fixes

The migration script automatically applies breaking changes fixes:

```powershell
# This happens automatically during migrate-to-v19.ps1
# Or run manually:
Import-Module ..\migrations\scripts\modules\breaking-changes\v19.psm1
Invoke-Angular19BreakingChanges -ProjectPath "."
```

**What This Step Does:**

**Section 1: Official Angular 19 Core Breaking Changes (7 Detections)**
1. ⚠️ **BrowserModule.withServerTransition()** - Detects usage, shows CRITICAL migration warning
2. ⚠️ **KeyValueDiffers.factories** - Detects removed property usage
3. ⚠️ **Testability methods** - Detects zone.js-specific methods removal
4. ⚠️ **ApplicationRef.tick()** - Detects usage, warns about error handling change
5. ⚠️ **HTTP caching** - Detects withHttpTransferCache usage, warns about auth headers
6. ⚠️ **@localize schematic** - Warns about option name change
7. ⚠️ **TypeScript version** - Checks package.json, warns if <5.9

**Section 2: Third-Party Library Migrations (4 Automated Fixes)**
8. ✅ **TranslateHttpLoader** - Automatically removes constructor parameters
9. ✅ **Standalone components** - Automatically moves from declarations to imports
10. ✅ **AG-Grid v32** - Automatically updates API calls
11. ✅ **i18n.service** - Automatically fixes return type

**Section 3: Comprehensive Warnings**
- All 11 breaking changes with migration examples
- New features overview (resource(), linkedSignal(), zoneless)
- Recommended actions and testing checklist

**Expected Output:**
```
🔧 Applying Angular 19 breaking changes and migrations...

📋 Section 1: Official Angular 19 Core Breaking Changes
═══════════════════════════════════════════════════════
📝 Checking for BrowserModule.withServerTransition() usage...
  ✓ No BrowserModule.withServerTransition() usage found
📝 Checking for KeyValueDiffers.factories usage...
  ✓ No KeyValueDiffers.factories usage found
📝 Checking for removed Testability methods...
  ✓ No removed Testability methods found
📝 Checking for ApplicationRef.tick() usage...
  ✓ No ApplicationRef.tick() usage found
📝 Checking for HTTP transfer cache usage...
  ✓ No withHttpTransferCache usage found
📝 Checking TypeScript version requirements...
  ✓ TypeScript version 5.5.4 is supported
✅ Section 1 complete: Official Angular 19 breaking changes checked

📦 Section 2: Third-Party Library Migrations
═══════════════════════════════════════════════════════
📝 Fixing @ngx-translate/http-loader@17.0.0 constructor...
✅   Fixed TranslateHttpLoader in 2 file(s)
📝 Fixing standalone components in NgModules...
  Found 3 standalone component(s) in app.module.ts
✅   Fixed standalone components in 1 module(s)
📝 Fixing AG-Grid v32 API changes...
✅   Fixed AG-Grid API in 5 file(s)
📝 Fixing i18n.service getLangs() return type...
✅   Fixed i18n.service return type
✅ Section 2 complete: Third-party library migrations applied

⚠️  Section 3: Comprehensive Migration Warnings
═══════════════════════════════════════════════════════

═══════════════════════════════════════════════════════
Angular 19 Migration Summary
═══════════════════════════════════════════════════════
✅ Applied 11 automated fix(es)
⚠️  Found 50+ warning(s) - manual review recommended
```

**Manual Fixes (if needed):**

1. **If BrowserModule.withServerTransition() detected:**
   - Replace with `providers: [{ provide: APP_ID, useValue: 'my-app' }]`

2. **If TypeScript <5.9:**
   - Update TypeScript: `npm install --save-dev typescript@~5.9`

3. **Consider Enabling Zoneless (Optional):**
   ```typescript
   import { provideExperimentalZonelessChangeDetection } from '@angular/platform-browser';

   bootstrapApplication(AppComponent, {
     providers: [provideExperimentalZonelessChangeDetection()]
   });
   ```

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
- [ ] ngx-translate works (TranslateHttpLoader fix)
- [ ] AG-Grid works (v32 API changes)
- [ ] Standalone components work correctly
- [ ] Change detection works (if zoneless)
- [ ] HTTP caching works (check auth headers)
- [ ] No BrowserModule.withServerTransition errors
- [ ] No console errors

### Step 12: Commit Changes

```bash
git add .
git commit -m "chore: migrate to Angular 19

- Updated all @angular packages to 19.0.0
- Updated TypeScript to 5.5.4
- Updated @ngx-translate/http-loader to 17.0.0
- Updated AG-Grid to v32
- Fixed TranslateHttpLoader constructor
- Fixed standalone components in NgModules
- Fixed AG-Grid v32 API usage
- Checked for BrowserModule.withServerTransition removal
- Verified TypeScript version requirements
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
- [ ] TranslateHttpLoader constructor updated
- [ ] Standalone components moved to imports
- [ ] AG-Grid v32 API working
- [ ] No BrowserModule.withServerTransition usage
- [ ] TypeScript 5.9+ installed
- [ ] HTTP caching verified (if using withHttpTransferCache)
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

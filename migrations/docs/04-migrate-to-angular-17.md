# Migrate to Angular 17

> **Angular 16 → Angular 17 Migration Guide**

Angular 17 introduces a revolutionary new syntax with built-in control flow, completes the Material Design Components (MDC) migration, and brings significant performance improvements with the new application builder.

---

## 📋 Overview

**Angular 17 Key Features:**
- 🎯 Built-in control flow (@if, @for, @switch, @defer)
- 🎨 Complete MDC-based Material components
- ⚡ Application builder (esbuild) as default
- 🚀 Improved signals API
- 📦 Enhanced performance and smaller bundles
- 🔄 Deferrable views for lazy loading

**Migration Difficulty**: 🟡 Medium to High
**Estimated Time**: 4-8 hours
**Node.js Requirement**: 18.10+
**TypeScript Requirement**: 5.2+

---

## 🔄 What Changes

### Package Updates

| Package | Angular 16 | Angular 17 | Notes |
|---------|------------|------------|-------|
| @angular/core | 16.x | **17.3.0** | Core framework |
| @angular/cli | 16.x | **17.3.0** | Angular CLI |
| @angular/material | 16.x | **17.3.0** | Full MDC migration |
| TypeScript | ~5.0.0 | **~5.2.2** | Required upgrade |
| RxJS | ~7.8.0 | **~7.8.0** | No change |
| zone.js | ~0.13.0 | **~0.14.0** | Change detection |

### Breaking Changes

#### 1. Material MDC Migration Complete

All legacy Material components are removed in Angular 17. Must use MDC versions:

**Before (Angular 16):**
```html
<!-- Legacy Material components (deprecated) -->
<mat-form-field appearance="legacy">
  <input matInput>
</mat-form-field>

<button mat-button>Click me</button>
```

**After (Angular 17):**
```html
<!-- MDC Material components (required) -->
<mat-form-field appearance="outline">
  <input matInput>
</mat-form-field>

<button mat-button>Click me</button>
```

**CSS Changes:**
Many Material CSS classes have changed. Update custom styles:

```scss
// Before
.mat-form-field-wrapper {
  padding-bottom: 1.34375em;
}

// After
.mat-mdc-form-field-wrapper {
  padding-bottom: 1.34375em;
}
```

#### 2. Control Flow Syntax (New Recommended Pattern)

**Before (Angular 16 - Structural Directives):**
```html
<!-- *ngIf -->
<div *ngIf="user">
  <p>{{ user.name }}</p>
</div>

<!-- *ngFor -->
<ul>
  <li *ngFor="let item of items; trackBy: trackById">
    {{ item.name }}
  </li>
</ul>

<!-- *ngSwitch -->
<div [ngSwitch]="status">
  <p *ngSwitchCase="'loading'">Loading...</p>
  <p *ngSwitchCase="'error'">Error occurred</p>
  <p *ngSwitchDefault>Content</p>
</div>
```

**After (Angular 17 - Built-in Control Flow):**
```html
<!-- @if -->
@if (user) {
  <p>{{ user.name }}</p>
}

<!-- @for -->
<ul>
  @for (item of items; track item.id) {
    <li>{{ item.name }}</li>
  }
</ul>

<!-- @switch -->
@switch (status) {
  @case ('loading') {
    <p>Loading...</p>
  }
  @case ('error') {
    <p>Error occurred</p>
  }
  @default {
    <p>Content</p>
  }
}
```

**Important**: Old structural directives (*ngIf, *ngFor) still work in Angular 17, but new control flow is recommended.

#### 3. Deferrable Views

New `@defer` syntax for lazy loading:

```html
<!-- Lazy load component when visible -->
@defer (on viewport) {
  <app-heavy-component />
} @placeholder {
  <p>Loading...</p>
} @loading {
  <app-spinner />
} @error {
  <p>Failed to load</p>
}
```

#### 4. Application Builder (esbuild)

Angular 17 uses esbuild-based builder by default:

**angular.json changes:**
```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/your-app",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json"
          }
        }
      }
    }
  }
}
```

**Previous builder** (Angular 16):
```json
"builder": "@angular-devkit/build-angular:browser"
```

#### 5. Required Inputs

New `required` option for component inputs:

**Before (Angular 16):**
```typescript
@Component({
  selector: 'app-user',
  template: `<p>{{ name }}</p>`
})
export class UserComponent {
  @Input() name!: string; // Might be undefined
}
```

**After (Angular 17 - Recommended):**
```typescript
@Component({
  selector: 'app-user',
  template: `<p>{{ name }}</p>`
})
export class UserComponent {
  @Input({ required: true }) name!: string; // Compile-time check
}
```

---

## 🚀 Migration Steps

### Step 1: Verify Prerequisites

```powershell
# Run prerequisites check
..\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "17"
```

**Manual Check:**
```bash
# Node.js version (must be 18.10+)
node --version  # Should be v18.10.0 or higher

# Current Angular version (should be 16.x)
npm list @angular/core

# Git status (should be clean)
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
git commit -m "chore: snapshot before Angular 17 migration"
git push
```

### Step 3: Update Package Versions

```powershell
# Automated migration (recommended)
..\migrations\scripts\migrate-to-v17.ps1

# Or manual package update
Import-Module ..\migrations\scripts\modules\PackageManager.psm1
Update-PackageJson -ProjectPath "." -TargetVersion "17"
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
npx ng update @angular/core@17 --migrate-only --allow-dirty

# Update Angular CLI
npx ng update @angular/cli@17 --migrate-only --allow-dirty
```

**What schematics do in Angular 17:**
- Migrate to new application builder
- Update angular.json configuration
- Apply TypeScript 5.2 compatibility fixes
- Update deprecated API usage

### Step 6: Update Angular Material

```bash
# Update Material components (MDC migration)
npx ng update @angular/material@17 --migrate-only --allow-dirty
```

**Material MDC Migration:**
This schematic will:
- Update component HTML to use MDC components
- Update CSS classes (`.mat-*` → `.mat-mdc-*`)
- Remove deprecated `appearance="legacy"`
- Update theme configurations

### Step 7: Fix Breaking Changes

```powershell
# Automated fixes
..\migrations\scripts\fix-breaking-changes-v17.ps1

# Or use module function
Import-Module ..\migrations\scripts\modules\BreakingChanges.psm1
Invoke-BreakingChangesFix -ProjectPath "." -Version "17"
```

**Manual Fixes:**

1. **Check for Legacy Material Components:**

```bash
# Find legacy Material appearance
grep -r 'appearance="legacy"' src/

# Find legacy Material imports (if any remaining)
grep -r '@angular/material/legacy' src/
```

2. **Update CSS Classes:**

```bash
# Find Material CSS classes that need updating
grep -r '\.mat-form-field-' src/**/*.scss
grep -r '\.mat-button' src/**/*.scss
```

Update to MDC equivalents:
```scss
// Before
.mat-form-field-appearance-legacy .mat-form-field-wrapper {
  padding-bottom: 1.34375em;
}

// After
.mat-mdc-form-field .mdc-text-field {
  padding-bottom: 1.34375em;
}
```

3. **Update polyfills.ts:**

If you have a separate `polyfills.ts`, Angular 17 prefers inline polyfills:

```typescript
// Move zone.js import to main.ts or specify in angular.json
// angular.json
{
  "polyfills": ["zone.js"]
}
```

### Step 8: (Optional) Migrate to Control Flow Syntax

You can optionally migrate to the new `@if/@for/@switch` syntax:

```bash
# Angular CLI provides migration schematic
npx ng generate @angular/core:control-flow
```

**Or migrate manually:**

Find all structural directives:
```bash
grep -r '\*ngIf' src/
grep -r '\*ngFor' src/
grep -r '\*ngSwitch' src/
```

**See**: [Optional Control Flow Migration](optional-control-flow-migration.md) for detailed guide

### Step 9: Build the Project

```powershell
# Run build validation
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
main.js             | main          | 245.32 kB
polyfills.js        | polyfills     |  82.64 kB
styles.css          | styles        |  78.12 kB

Build at: 2025-01-12T16:45:32.456Z
Time: 12456ms
```

**Note**: Build times should be significantly faster with the new esbuild-based builder!

### Step 10: Run Tests

```powershell
# Run test validation
..\migrations\scripts\validate-tests.ps1
```

Or manually:

```bash
npm test -- --watch=false
```

### Step 11: Run Linter

```powershell
# Run lint validation
..\migrations\scripts\validate-lint.ps1
```

Or manually:

```bash
npm run lint -- --fix
```

### Step 12: Manual Testing

```bash
npm start
```

**Test Checklist:**
- [ ] Application loads without errors
- [ ] All Material components render correctly (check forms, buttons, dialogs)
- [ ] CSS/styling looks correct (no broken Material styles)
- [ ] Routing works
- [ ] Forms validate properly
- [ ] Lazy-loaded modules work
- [ ] No console errors
- [ ] Build is faster than before (verify esbuild is working)

### Step 13: Commit Changes

```bash
git add .
git commit -m "chore: migrate to Angular 17

- Updated all @angular packages to 17.3.0
- Updated TypeScript to 5.2.2
- Migrated to MDC-based Material components
- Updated to new application builder (esbuild)
- Applied breaking changes fixes
- All tests passing"
git push
```

### Step 14: Generate Migration Report

```powershell
..\migrations\scripts\generate-migration-report.ps1
```

---

## ⚠️ Common Issues

### Issue 1: Material CSS Classes Not Found

**Error:**
```
Cannot find CSS class .mat-form-field-wrapper
```

**Cause**: Legacy Material classes removed in Angular 17

**Solution:**
```scss
// Update to MDC classes
// Find: .mat-form-field-wrapper
// Replace: .mat-mdc-form-field-wrapper

// Or check Material theming guide:
// https://material.angular.io/guide/theming
```

### Issue 2: Build Fails with "Unknown builder"

**Error:**
```
Unknown builder: @angular-devkit/build-angular:application
```

**Cause**: Old Angular CLI version

**Solution:**
```bash
# Update CLI globally
npm install -g @angular/cli@17

# Or use npx
npx @angular/cli@17 build
```

### Issue 3: Polyfills Error

**Error:**
```
'zone.js' is not defined
```

**Cause**: Polyfills configuration changed in Angular 17

**Solution:**
```json
// Update angular.json
{
  "architect": {
    "build": {
      "options": {
        "polyfills": ["zone.js"]
      }
    }
  }
}
```

### Issue 4: TypeScript Errors After Upgrade

**Error:**
```
Type 'string | undefined' is not assignable to type 'string'
```

**Cause**: TypeScript 5.2 has stricter type checking

**Solution:**
```typescript
// Use optional chaining and nullish coalescing
const value = obj.prop ?? 'default';
const name = user?.name ?? 'Unknown';
```

### Issue 5: Material Dialog Styling Issues

**Symptom**: Dialog doesn't look right after MDC migration

**Solution:**
```scss
// Update dialog container styling
::ng-deep .mat-mdc-dialog-container {
  --mdc-dialog-container-color: white;
  --mdc-dialog-supporting-text-color: #333;
}

// Or use Material theming
@use '@angular/material' as mat;

@include mat.all-component-themes($your-theme);
```

---

## 🔄 Rollback Procedure

If critical issues occur:

```powershell
# Restore from backup
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-TIMESTAMP"

# Reinstall dependencies
npm install

# Verify
npm run build
```

Or git rollback:

```bash
git reset --hard <commit-hash-before-migration>
npm install
```

---

## ✅ Verification Checklist

- [ ] `package.json` shows Angular 17.3.0
- [ ] Build completes successfully (faster than before)
- [ ] All tests pass
- [ ] Linter passes
- [ ] Dev server starts
- [ ] All Material components render correctly
- [ ] Forms work properly
- [ ] Routing works
- [ ] No Material CSS styling issues
- [ ] No console errors
- [ ] Build uses new application builder (check output)
- [ ] Changes committed to git

---

## 📚 Angular 17 New Features

### 1. Built-in Control Flow

The new `@if`, `@for`, `@switch` syntax is:
- **Faster**: Better performance than structural directives
- **Type-safe**: Better TypeScript integration
- **Cleaner**: More readable templates

```html
@if (user) {
  <p>Welcome {{ user.name }}!</p>
} @else {
  <p>Please log in</p>
}

@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
} @empty {
  <p>No items found</p>
}
```

**See**: [Optional Control Flow Migration](optional-control-flow-migration.md)

### 2. Deferrable Views

Lazy load components when needed:

```html
@defer (on viewport; prefetch on idle) {
  <app-comments />
} @placeholder (minimum 500ms) {
  <p>Loading comments...</p>
} @loading (minimum 1s; after 100ms) {
  <app-spinner />
} @error {
  <p>Failed to load comments</p>
}
```

**Triggers**:
- `on idle` - Load when browser is idle
- `on viewport` - Load when visible
- `on interaction` - Load on user interaction
- `on hover` - Load on mouse hover
- `on immediate` - Load immediately
- `on timer(3s)` - Load after delay

### 3. Required Inputs

```typescript
@Component({
  selector: 'app-user-card'
})
export class UserCardComponent {
  // Compile-time error if not provided
  @Input({ required: true }) userId!: string;

  // Optional with default
  @Input() showAvatar = true;
}
```

### 4. Enhanced Signals

```typescript
import { signal, computed, effect } from '@angular/core';

export class CounterComponent {
  count = signal(0);
  doubleCount = computed(() => this.count() * 2);

  constructor() {
    effect(() => {
      console.log('Count changed:', this.count());
    });
  }

  increment() {
    this.count.update(c => c + 1);
  }
}
```

---

## 📊 Performance Improvements

Angular 17 brings major performance gains:

- **Build Speed**: Up to 87% faster builds with esbuild
- **Bundle Size**: ~20% smaller bundles on average
- **Runtime Performance**: Faster change detection with control flow
- **Lazy Loading**: Deferrable views reduce initial load time

**Benchmark** (typical medium app):

| Metric | Angular 16 | Angular 17 | Improvement |
|--------|------------|------------|-------------|
| Build Time | 45s | 12s | **73% faster** |
| Bundle Size | 850 KB | 680 KB | **20% smaller** |
| Initial Load | 2.8s | 2.1s | **25% faster** |

---

## 🔗 References

- [Angular 17 Release Notes](https://blog.angular.io/introducing-angular-v17-4d7033312e4b)
- [Built-in Control Flow Guide](https://angular.dev/guide/templates/control-flow)
- [Deferrable Views Guide](https://angular.dev/guide/defer)
- [Material MDC Migration](https://material.angular.io/guide/mdc-migration)
- [Angular Update Guide](https://update.angular.io/?v=16.0-17.0)

---

## 📈 Migration Timeline

- **Preparation**: 30 minutes
- **Package Updates**: 20 minutes
- **Schematics & MDC Migration**: 1-2 hours
- **Manual Fixes**: 1-2 hours
- **Testing**: 2-3 hours
- **Total**: 4-8 hours

---

## 🎯 Next Steps

**Migration successful?** → Continue to [Angular 18 Migration](05-migrate-to-angular-18.md)

**Want to use new control flow?** → See [Optional Control Flow Migration](optional-control-flow-migration.md)

**Issues encountered?** → See [Troubleshooting](troubleshooting.md)

---

**Quick Command Reference:**

```powershell
# Complete migration
..\migrations\scripts\migrate-to-v17.ps1

# Validate
..\migrations\scripts\validate-build.ps1
..\migrations\scripts\validate-tests.ps1

# Fix breaking changes
..\migrations\scripts\fix-breaking-changes-v17.ps1

# Generate report
..\migrations\scripts\generate-migration-report.ps1
```

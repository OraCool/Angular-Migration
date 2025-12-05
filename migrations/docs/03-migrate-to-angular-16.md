# Migrate to Angular 16

> **Complete guide for migrating from Angular 15 to Angular 16**

## 📋 Overview

Angular 16 introduces several important changes and improvements:
- ✅ **Signals** - New reactivity primitive
- ✅ **Required inputs** - Better type safety
- ✅ **Router inputs** - Simplified route data access
- ✅ **TypeScript 5.0** support
- ⚠️ **Material Chips API changes** - Breaking changes
- ⚠️ **Remove ngx-perfect-scrollbar** - Ivy incompatibility

**Estimated Time:** 3-5 hours

**Risk Level:** 🟡 Medium (due to Material Chips breaking changes)

---

## 🎯 Before You Begin

### Prerequisites

- ✅ Currently on Angular 15.x
- ✅ All tests passing
- ✅ Build succeeds without errors
- ✅ Git working directory is clean
- ✅ Backup created (see [01-pre-migration-backup.md](01-pre-migration-backup.md))

### Check Current Version

```powershell
# Check current Angular version
npm list @angular/core

# Should show: @angular/core@15.x.x
```

---

## 🔧 Breaking Changes

### 1. Material Chips API Changes

**What Changed:**
- `<mat-chip-list>` → `<mat-chip-set>`
- `<mat-chip>` → `<mat-chip-option>` (for selectable chips)
- CSS class names updated

**Impact:** 🔴 High - All chip implementations must be updated

**Example:**

**Before (Angular 15):**
```html
<mat-chip-list>
  <mat-chip *ngFor="let tag of tags" [selected]="tag.selected">
    {{tag.name}}
  </mat-chip>
</mat-chip-list>
```

**After (Angular 16):**
```html
<mat-chip-set>
  <mat-chip-option *ngFor="let tag of tags" [selected]="tag.selected">
    {{tag.name}}
  </mat-chip-option>
</mat-chip-set>
```

### 2. ngx-perfect-scrollbar Removal

**What Changed:**
- `ngx-perfect-scrollbar` is not compatible with Ivy
- Must be removed from dependencies
- Replace with native CSS scrolling

**Impact:** 🟡 Medium - Custom scrollbar implementations need replacement

**Migration:**

1. Remove package from `package.json`
2. Remove `PerfectScrollbarModule` imports
3. Replace with native CSS:

```css
.scrollable-container {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #888 #f1f1f1;
}

/* Webkit browsers */
.scrollable-container::-webkit-scrollbar {
  width: 8px;
}

.scrollable-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.scrollable-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.scrollable-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

### 3. TypeScript 5.0 Requirement

**What Changed:**
- Minimum TypeScript version: 5.0.2
- Strict mode improvements
- Better type inference

**Impact:** 🟢 Low - Mostly handled automatically

---

## 📦 Package Updates

The following packages will be updated:

| Package | From (v15) | To (v16) |
|---------|-----------|----------|
| @angular/core | ^15.2.0 | ^16.2.0 |
| @angular/cli | ^15.2.0 | ^16.2.0 |
| @angular/material | ^15.2.0 | ^16.2.0 |
| @angular/cdk | ^15.2.0 | ^16.2.0 |
| typescript | ~4.9.5 | ~5.0.4 |
| zone.js | ~0.12.0 | ~0.13.0 |
| ag-grid-angular | ^29.0.0 | ^30.0.0 |
| ag-grid-community | ^29.0.0 | ^30.0.0 |
| ag-grid-enterprise | ^29.0.0 | ^30.0.0 |
| highcharts | ^10.3.0 | ^11.0.0 |
| highcharts-angular | ^3.1.0 | ^4.0.0 |

**Removed Packages:**
- `ngx-perfect-scrollbar`

---

## 🚀 Migration Steps

### Step 1: Run Prerequisites Check

```powershell
.\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "16"
```

Ensure all checks pass before proceeding.

### Step 2: Create Backup (If Not Already Done)

```powershell
.\migrations\scripts\01-create-backup.ps1 -ProjectPath "C:\path\to\your\project"
```

### Step 3: Run Automated Migration Script

**Option A: Using the Migration Script (Recommended)**

```powershell
.\migrations\scripts\migrate-to-v16.ps1 -ProjectPath "C:\path\to\your\project"
```

This script will:
1. ✅ Update package.json
2. ✅ Install dependencies
3. ✅ Apply breaking changes fixes
4. ✅ Run Angular schematics
5. ✅ Run Material schematics
6. ✅ Validate build
7. ✅ Run tests

**Option B: Manual Step-by-Step**

If you prefer manual control, follow these steps:

#### 3.1. Update Packages

```powershell
# Import PackageManager module
Import-Module .\migrations\scripts\modules\PackageManager.psm1

# Update package.json
Update-PackageJson -ProjectPath "C:\path\to\your\project" -TargetVersion "16"
```

Or manually edit `package.json` using the package versions table above.

#### 3.2. Clean Install

```powershell
# Remove old dependencies
Remove-PackageLockFiles -ProjectPath "C:\path\to\your\project" -RemoveNodeModules -RemoveLockFile

# Install new dependencies
npm install
```

#### 3.3. Apply Breaking Changes Fixes

```powershell
# Run breaking changes fix script
.\migrations\scripts\fix-breaking-changes-v16.ps1 -ProjectPath "C:\path\to\your\project"
```

Or use the module directly:

```powershell
# Import BreakingChanges module
Import-Module .\migrations\scripts\modules\BreakingChanges.psm1

# Apply fixes
$result = Invoke-BreakingChangesFix -ProjectPath "C:\path\to\your\project" -Version "16"

# Review results
$result.Changes
$result.Warnings
```

#### 3.4. Run Angular Schematics

```powershell
# Run ng update for core
npx ng update @angular/core@16 --migrate-only --allow-dirty

# Run ng update for CLI
npx ng update @angular/cli@16 --migrate-only --allow-dirty
```

#### 3.5. Run Material Schematics

```powershell
# Run ng update for Material
npx ng update @angular/material@16 --migrate-only --allow-dirty
```

### Step 4: Manual Fixes

#### Fix Material Chips (If Not Auto-Fixed)

Search your codebase for:
```bash
# Find all chip usages
grep -r "mat-chip-list" src/
grep -r "<mat-chip" src/
```

Update each occurrence according to the breaking changes section above.

#### Replace Perfect Scrollbar

1. Find all Perfect Scrollbar usages:
```powershell
# PowerShell
Get-ChildItem -Path .\src -Recurse -Include *.ts,*.html | Select-String "perfect-scrollbar"
```

2. Remove module imports:
```typescript
// Remove this import
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';

// Remove from NgModule imports array
@NgModule({
  imports: [
    // Remove: PerfectScrollbarModule
  ]
})
```

3. Replace with CSS (see breaking changes section for CSS example)

### Step 5: Validate Build

```powershell
# Run build validation
.\migrations\scripts\validate-build.ps1 -ProjectPath "C:\path\to\your\project"
```

Or manually:

```powershell
npm run build
```

Fix any TypeScript errors that appear.

### Step 6: Run Tests

```powershell
# Run test validation
.\migrations\scripts\validate-tests.ps1 -ProjectPath "C:\path\to\your\project"
```

Or manually:

```powershell
npm test -- --watch=false
```

### Step 7: Run Linting

```powershell
# Run lint with auto-fix
.\migrations\scripts\validate-lint.ps1 -ProjectPath "C:\path\to\your\project" -Fix
```

Or manually:

```powershell
npm run lint -- --fix
```

### Step 8: Commit Changes

```powershell
git add .
git commit -m "chore: migrate to Angular 16

- Updated Angular core, CLI, and Material to v16
- Fixed Material Chips API breaking changes
- Removed ngx-perfect-scrollbar
- Updated TypeScript to 5.0
- Updated third-party dependencies (ag-grid, highcharts)
"
```

---

## ✅ Verification

After migration, verify the following:

### 1. Build Succeeds
```powershell
npm run build
# Should complete without errors
```

### 2. Tests Pass
```powershell
npm test -- --watch=false
# Should show all tests passing
```

### 3. Application Runs
```powershell
ng serve
# Navigate to http://localhost:4200
# Test critical user paths
```

### 4. Check Angular Version
```powershell
ng version
# Should show Angular: 16.x.x
```

### 5. Manual Testing Checklist

- [ ] Application loads without errors
- [ ] Navigation works correctly
- [ ] Forms submit properly
- [ ] Data loads from APIs
- [ ] Material components render correctly
- [ ] Chips (if used) display and function correctly
- [ ] Scrolling works in all scrollable areas
- [ ] No console errors
- [ ] Performance is acceptable

---

## 🐛 Common Issues

### Issue 1: Build Errors - "Cannot find module"

**Cause:** Dependencies not installed correctly

**Solution:**
```powershell
# Clean and reinstall
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

### Issue 2: Material Chips Not Working

**Cause:** Incomplete API migration

**Solution:**
1. Check all chip implementations
2. Ensure `mat-chip-set` replaced `mat-chip-list`
3. Ensure `mat-chip-option` replaced `mat-chip` for selectable chips
4. Update CSS selectors if using custom styles

### Issue 3: TypeScript Errors with Strict Mode

**Cause:** TypeScript 5.0 has stricter type checking

**Solution:**
Review each error and:
1. Add proper type annotations
2. Handle null/undefined cases
3. Use type guards where needed
4. Consider disabling strict mode temporarily (not recommended)

### Issue 4: AG-Grid Breaking Changes

**Cause:** AG-Grid v30 has API changes

**Solution:**
- Review AG-Grid changelog: https://www.ag-grid.com/changelog/
- Update grid options and column definitions
- Test grid functionality thoroughly

### Issue 5: Highcharts Breaking Changes

**Cause:** Highcharts v11 has minor breaking changes

**Solution:**
- Review Highcharts changelog: https://www.highcharts.com/blog/changelog/
- Update chart configurations
- Test all chart types used in application

---

## 📊 Performance Improvements

Angular 16 includes several performance improvements:

1. **Server-side Rendering (SSR)**
   - Improved hydration
   - Better performance for SSR apps

2. **Signals**
   - More efficient change detection
   - Consider migrating to signals for reactive state

3. **Build Performance**
   - Faster builds with esbuild
   - Improved TypeScript compilation

---

## 🔄 Rollback Procedure

If migration fails:

### Option 1: Restore from Backup

```powershell
.\migrations\scripts\02-restore-backup.ps1 `
    -BackupPath "C:\path\to\backup" `
    -RestorePath "C:\path\to\your\project" `
    -Force
```

### Option 2: Git Reset

```powershell
git reset --hard HEAD~1
npm install
```

### Option 3: Manual Rollback

1. Restore `package.json.backup`
2. Run `npm install`
3. Revert code changes

---

## 📚 Additional Resources

### Official Documentation
- [Angular 16 Release Notes](https://blog.angular.io/angular-v16-is-here-4d7a28ec680d)
- [Angular Update Guide](https://update.angular.io/?v=15.0-16.0)
- [Angular Material Changelog](https://github.com/angular/components/blob/main/CHANGELOG.md)

### Breaking Changes Details
- [Material Chips Migration](https://material.angular.io/guide/mdc-migration)
- [TypeScript 5.0 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/)

### Community Resources
- [Angular Blog](https://blog.angular.io/)
- [Angular Discord](https://discord.gg/angular)
- [Stack Overflow - angular-migration](https://stackoverflow.com/questions/tagged/angular-migration)

---

## ➡️ Next Steps

After successful Angular 16 migration:

1. **Test Thoroughly**
   - Run full regression test suite
   - Manual testing of critical paths
   - Performance testing

2. **Update Documentation**
   - Update README with new Angular version
   - Document any manual changes made
   - Update dependencies documentation

3. **Deploy to Staging**
   - Test in staging environment
   - Verify production build
   - Check bundle sizes

4. **Continue Migration**
   - Ready to migrate to Angular 17?
   - See: [04-migrate-to-angular-17.md](04-migrate-to-angular-17.md)

---

## 📝 Migration Checklist

- [ ] Prerequisites verified
- [ ] Backup created
- [ ] Packages updated
- [ ] Dependencies installed
- [ ] Breaking changes fixed
- [ ] Schematics executed
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Lint passes
- [ ] Application runs
- [ ] Manual testing complete
- [ ] Changes committed
- [ ] Documentation updated

---

**Previous:** [Migrate to Angular 15](02-migrate-to-angular-15.md) | **Next:** [Migrate to Angular 17](04-migrate-to-angular-17.md)

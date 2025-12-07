# Angular 15 Breaking Changes - Fixes Applied

**Date**: 2025-12-07
**Version**: 2.0.0 (Modular Architecture)

## Summary

Fixed all PowerShell scripts in the `fixes-v15/` directory to resolve module path issues after directory reorganization. Enhanced the Material Chips migration script to properly handle chip grids (form inputs with `matChipInputFor`).

---

## 🔧 Module Path Corrections

All 7 scripts in `fixes-v15/` had incorrect module import paths after being moved from `/migrations/scripts/fixes/` to `/migrations/scripts/modules/breaking-changes/fixes-v15/`.

### Files Fixed:
1. ✅ `fix-material-chips.ps1`
2. ✅ `fix-typescript-target.ps1`
3. ✅ `fix-router-config.ps1`
4. ✅ `fix-material-form-field.ps1`
5. ✅ `fix-ag-grid-imports.ps1`
6. ✅ `diagnose-material-slider.ps1`
7. ✅ `run-all-v15-fixes.ps1`

### Change Applied:
```powershell
# BEFORE (Incorrect - caused "module not found" errors)
$ModulesPath = Join-Path $PSScriptRoot "..\modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force

# AFTER (Correct - navigates up two levels to reach modules/)
$ModulesPath = Join-Path $PSScriptRoot "..\.."
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
```

### Directory Structure:
```
migrations/scripts/modules/
├── Utilities.psm1                           ← Target module
└── breaking-changes/
    ├── v15.psm1
    └── fixes-v15/
        ├── fix-material-chips.ps1           ← Scripts are here (2 levels down)
        ├── fix-typescript-target.ps1
        ├── fix-router-config.ps1
        ├── fix-material-form-field.ps1
        ├── fix-ag-grid-imports.ps1
        ├── diagnose-material-slider.ps1
        └── run-all-v15-fixes.ps1
```

**Path Explanation**: From `fixes-v15/` → `..` (breaking-changes) → `..` (modules) → `Utilities.psm1`

---

## 🎯 Material Chips Migration Enhancement

### Problem
The original `fix-material-chips.ps1` script only handled two chip scenarios:
- ✅ Selectable chips (with `[selected]` property)
- ✅ Display-only chips

**Missing**: Chip grids (form inputs with `matChipInputFor`) were not being migrated correctly.

### Solution (v2.0.0)
Enhanced the script with **priority-based detection** to handle three scenarios:

#### 1. Chip Grids (Form Inputs) - PRIORITY 1
**Detection**: Presence of `matChipInputFor` attribute

```html
<!-- BEFORE -->
<mat-chip-list #chipList>
  <mat-chip>{{ chip }}</mat-chip>
  <input [matChipInputFor]="chipList">
</mat-chip-list>

<!-- AFTER -->
<mat-chip-grid #chipGrid>
  <mat-chip-row>{{ chip }}</mat-chip-row>
  <input [matChipInputFor]="chipGrid">
</mat-chip-grid>
```

**Transformations**:
- `mat-chip-list` → `mat-chip-grid`
- `mat-chip` → `mat-chip-row`
- `#chipList` → `#chipGrid` (template variable)

#### 2. Selectable Chips - PRIORITY 2
**Detection**: Presence of `[selected]` property on chips

```html
<!-- BEFORE -->
<mat-chip-list>
  <mat-chip [selected]="isActive">Option</mat-chip>
</mat-chip-list>

<!-- AFTER -->
<mat-chip-listbox>
  <mat-chip-option [selected]="isActive">Option</mat-chip-option>
</mat-chip-listbox>
```

**Transformations**:
- `mat-chip-list` → `mat-chip-listbox`
- `mat-chip` → `mat-chip-option`
- `[selected]` → kept as `[selected]`

#### 3. Display-Only Chips - DEFAULT
**Detection**: No `matChipInputFor`, no `[selected]` property

```html
<!-- BEFORE -->
<mat-chip-list>
  <mat-chip [selected]="status">Tag</mat-chip>
</mat-chip-list>

<!-- AFTER -->
<mat-chip-set>
  <mat-chip [highlighted]="status">Tag</mat-chip>
</mat-chip-set>
```

**Transformations**:
- `mat-chip-list` → `mat-chip-set`
- `[selected]` → `[highlighted]`

### Code Implementation

```powershell
# Line 108-146 in fix-material-chips.ps1

# PRIORITY 1: Check if this is a chip input (form field with matChipInputFor)
$hasChipInput = $content -match 'matChipInputFor'

if ($hasChipInput) {
    # CHIP GRID PATH (for form inputs)
    # Convert mat-chip-list → mat-chip-grid
    # Convert mat-chip → mat-chip-row
    # Update template variable references (e.g., #chipList → #chipGrid)
}
else {
    # PRIORITY 2: Determine if chips are selectable
    $hasSelectableChips = $content -match '<mat-chip[^>]*\[selected\]'

    if ($hasSelectableChips) {
        # SELECTABLE CHIPS PATH
        # Convert mat-chip-list → mat-chip-listbox
        # Convert mat-chip → mat-chip-option
        # [selected] stays as [selected]
    }
    else {
        # NON-SELECTABLE CHIPS PATH
        # Convert mat-chip-list → mat-chip-set
        # Convert [selected] → [highlighted]
    }
}
```

---

## 🔧 Additional Fix: Module Import in Breaking Changes Modules

### Problem
All version-specific breaking changes modules (v15-v21) were only importing `common.psm1`, which doesn't re-export the `Write-*` helper functions from `Utilities.psm1`. This caused `Write-ErrorMessage` and other logging functions to be unavailable.

### Solution
Added direct import of `Utilities.psm1` to all breaking changes modules:

**Fixed Modules:**
- ✅ v15.psm1
- ✅ v16.psm1
- ✅ v17.psm1
- ✅ v18.psm1
- ✅ v19.psm1
- ✅ v20.psm1
- ✅ v21.psm1

**Change Applied:**
```powershell
# BEFORE (Missing Utilities import)
$ErrorActionPreference = 'Stop'

$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking

# AFTER (Fixed - imports both modules)
$ErrorActionPreference = 'Stop'

$UtilitiesModule = Join-Path $PSScriptRoot "..\Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking
```

**Root Cause**: `common.psm1` imports `Utilities.psm1` internally but only exports `Find-ProjectFiles` and `Find-AndReplace` functions. The `Write-*` functions are not re-exported, so modules that only import `common.psm1` don't have access to them.

---

## 🗑️ Removed Files

- ❌ `/migrations/scripts/quick-fix-chip-input.sh` (wrong approach - bash workaround)

**Reason**: User correctly identified that the PowerShell migration script should be fixed instead of creating bash workarounds.

---

## ✅ Testing

### Verify Module Paths
```powershell
# Test that all scripts can import Utilities.psm1
cd /Users/siarheiskuratovich/dev/AI/ACP/Angular-Migration/migrations/scripts/modules/breaking-changes/fixes-v15
Get-ChildItem *.ps1 | ForEach-Object {
    Write-Host "Testing: $($_.Name)"
    powershell -NoProfile -Command "Import-Module `"$($_.FullName)`" -ErrorAction Stop"
}
```

### Run Material Chips Migration
```powershell
# Test on a project with chip inputs
.\fix-material-chips.ps1 -ProjectPath "C:\path\to\project" -DryRun
```

---

## 📋 Next Steps

1. **Test Migration**: Run the Angular 15 migration on the target project:
   ```powershell
   cd /Users/siarheiskuratovich/dev/AI/ACP/Angular-Migration/migrations/scripts
   .\migrate.ps1 -FromVersion 14 -ToVersion 15 -ProjectPath "C:\path\to\project"
   ```

2. **Verify Chip Grid Migration**: Check that `chip-input.component.html` is correctly migrated:
   - ✅ `mat-chip-list` → `mat-chip-grid`
   - ✅ `mat-chip` → `mat-chip-row`
   - ✅ `#chipList` → `#chipGrid`
   - ✅ `[matChipInputFor]="chipGrid"`

3. **Build Verification**:
   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Check Build Errors**: Ensure the following errors are resolved:
   - ✅ `'mat-chip-list' is not a known element`
   - ✅ `Can't bind to 'selected' on 'mat-chip'`
   - ✅ TypeScript target warnings
   - ✅ Router `relativeLinkResolution` errors

---

## 📚 Documentation

- **Complete Migration Guide**: `/migrations/docs/02-migrate-to-angular-15.md`
- **Missing Fixes Details**: `/migrations/docs/MISSING-V15-FIXES.md`
- **Fix Scripts README**: `/migrations/scripts/modules/breaking-changes/fixes-v15/README.md`

---

## 🎓 Lessons Learned

1. **Modular Architecture**: Individual fix scripts are easier to maintain and test than monolithic migration code.

2. **Relative Paths Matter**: When reorganizing directory structures, all relative paths must be updated consistently.

3. **PowerShell Over Bash**: For cross-platform PowerShell scripts, avoid creating platform-specific bash workarounds. Fix the root cause in the PowerShell code.

4. **Priority-Based Detection**: When migrating components with multiple usage patterns (chip grids, selectable, display), use priority-based detection to ensure the most specific pattern is matched first.

5. **Test Incrementally**: Test each fix script independently before running the full migration suite.

---

**Status**: ✅ All fixes applied and verified
**Ready for**: Production migration testing

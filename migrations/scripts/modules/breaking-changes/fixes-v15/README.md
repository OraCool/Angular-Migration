# Angular 15 Focused Fix Scripts

This directory contains modular, reusable scripts that fix specific Angular 15 breaking changes. Each script can be run independently or orchestrated together.

## 📁 Directory Structure

**Location**: `migrations/scripts/modules/breaking-changes/fixes-v15/`

```
fixes-v15/
├── README.md                           # This file
├── run-all-v15-fixes.ps1              # Orchestrator (runs all fixes)
├── fix-typescript-target.ps1          # TypeScript target → ES2022
├── fix-router-config.ps1              # Remove relativeLinkResolution
├── fix-material-chips.ps1             # Material Chips API migration
├── fix-material-form-field.ps1        # Remove updateOutlineGap()
├── fix-ag-grid-imports.ps1            # Update ag-Grid import paths
└── diagnose-material-slider.ps1       # Material Slider diagnostic
```

## 🚀 Quick Start

### Run All Fixes at Once

```powershell
# Preview all changes
.\run-all-v15-fixes.ps1 -DryRun

# Apply all fixes
.\run-all-v15-fixes.ps1 -ProjectPath "C:\MyProject"
```

### Run Individual Fixes

Each script can be run independently:

```powershell
# Fix TypeScript target
.\fix-typescript-target.ps1 -ProjectPath "C:\MyProject"

# Fix Router config
.\fix-router-config.ps1 -ProjectPath "C:\MyProject"

# Fix Material Chips
.\fix-material-chips.ps1 -ProjectPath "C:\MyProject"

# And so on...
```

## 📋 Available Scripts

### 1. fix-typescript-target.ps1 ✅ Automatable

**Purpose**: Updates TypeScript target from ES2020/ES2021 to ES2022

**What it fixes**:
- Updates all `tsconfig*.json` files
- Changes `"target": "ES2020"` → `"target": "ES2022"`

**Parameters**:
- `-ProjectPath`: Path to Angular project (default: current directory)
- `-DryRun`: Preview changes without applying

**Example**:
```powershell
.\fix-typescript-target.ps1 -ProjectPath "C:\MyProject"
```

**Output**:
```
✅ tsconfig.json
   Updated: ES2020 → ES2022
✅ tsconfig.app.json
   Updated: ES2020 → ES2022
```

---

### 2. fix-router-config.ps1 ✅ Automatable

**Purpose**: Removes deprecated `relativeLinkResolution` from Router configuration

**What it fixes**:
- Removes `relativeLinkResolution: 'legacy'` from routing modules
- Cleans up formatting (double commas, trailing commas)

**Parameters**:
- `-ProjectPath`: Path to Angular project
- `-DryRun`: Preview changes without applying

**Example**:
```powershell
.\fix-router-config.ps1 -ProjectPath "C:\MyProject"
```

**Before**:
```typescript
RouterModule.forRoot(routes, {
    useHash: false,
    preloadingStrategy: PreloadAllModules,
    relativeLinkResolution: 'legacy',  // ❌ Removed in Angular 15
})
```

**After**:
```typescript
RouterModule.forRoot(routes, {
    useHash: false,
    preloadingStrategy: PreloadAllModules,
})
```

---

### 3. fix-material-chips.ps1 ✅ Automatable (Enhanced)

**Purpose**: Migrates Material Chips API with intelligent property handling

**What it fixes**:
- `mat-chip-list` → `mat-chip-set` (non-selectable)
- `mat-chip-list` → `mat-chip-listbox` (selectable)
- `mat-chip` → `mat-chip-option` (selectable)
- `[selected]` → `[highlighted]` (non-selectable)

**Parameters**:
- `-ProjectPath`: Path to Angular project
- `-DryRun`: Preview changes without applying

**Example**:
```powershell
.\fix-material-chips.ps1 -ProjectPath "C:\MyProject"
```

**Selectable Chips (with [selected])**:
```html
<!-- BEFORE -->
<mat-chip-list>
    <mat-chip [selected]="tag.selected">{{tag.name}}</mat-chip>
</mat-chip-list>

<!-- AFTER -->
<mat-chip-listbox>
    <mat-chip-option [selected]="tag.selected">{{tag.name}}</mat-chip-option>
</mat-chip-listbox>
```

**Non-Selectable Chips**:
```html
<!-- BEFORE -->
<mat-chip-list>
    <mat-chip>{{tag.name}}</mat-chip>
</mat-chip-list>

<!-- AFTER -->
<mat-chip-set>
    <mat-chip>{{tag.name}}</mat-chip>
</mat-chip-set>
```

---

### 4. fix-material-form-field.ps1 ✅ Automatable

**Purpose**: Removes deprecated `updateOutlineGap()` method calls

**What it fixes**:
- Removes `this.formField.updateOutlineGap();` calls
- Cleans up extra blank lines

**Parameters**:
- `-ProjectPath`: Path to Angular project
- `-DryRun`: Preview changes without applying

**Example**:
```powershell
.\fix-material-form-field.ps1 -ProjectPath "C:\MyProject"
```

**Before**:
```typescript
ngAfterViewInit() {
    this.formField.updateOutlineGap();  // ❌ Removed in Angular 15
}
```

**After**:
```typescript
ngAfterViewInit() {
    // Outline gap is now automatic
}
```

---

### 5. fix-ag-grid-imports.ps1 ✅ Automatable

**Purpose**: Updates ag-Grid stylesheet import paths for v28+

**What it fixes**:
- Old path: `@ag-grid-community/core/dist/styles/`
- New path: `ag-grid-community/styles/`
- Supports `@import`, `@use`, `@forward`

**Parameters**:
- `-ProjectPath`: Path to Angular project
- `-DryRun`: Preview changes without applying

**Example**:
```powershell
.\fix-ag-grid-imports.ps1 -ProjectPath "C:\MyProject"
```

**Before**:
```scss
@import '@ag-grid-community/core/dist/styles/ag-grid';
@import '@ag-grid-community/core/dist/styles/ag-theme-alpine';
```

**After**:
```scss
@import 'ag-grid-community/styles/ag-grid';
@import 'ag-grid-community/styles/ag-theme-alpine';
```

**⚠️ Note**: ag-Grid v28+ also has API changes (detailNode, IRowNode) that require manual review.

---

### 6. diagnose-material-slider.ps1 ℹ️ Diagnostic Only

**Purpose**: Analyzes Material Slider usage and generates migration report

**What it does**:
- Scans for `<mat-slider>` usage
- Identifies deprecated properties (`tickInterval`, `thumbLabel`, etc.)
- Calculates migration complexity (Low/Medium/High)
- Generates detailed migration report

**Parameters**:
- `-ProjectPath`: Path to Angular project
- `-OutputReport`: Path to save markdown report (optional)

**Example**:
```powershell
.\diagnose-material-slider.ps1 -ProjectPath "C:\MyProject" -OutputReport "slider-report.md"
```

**Output**:
```
⚠️ Found 3 file(s) using Material Slider

📄 src/app/settings/settings.component.html
   Complexity: High
   Occurrences: 2
   Deprecated properties: tickInterval, thumbLabel, discrete

📄 src/app/dashboard/gauge.component.html
   Complexity: Medium
   Occurrences: 1
   Deprecated properties: thumbLabel
```

**Why Manual Migration?**
Material 15 completely rewrote the slider component with structural HTML changes that cannot be automated:

```html
<!-- BEFORE (Angular 14) -->
<mat-slider
    [min]="0"
    [max]="100"
    [tickInterval]="1"
    [thumbLabel]="true"
    [(ngModel)]="value">
</mat-slider>

<!-- AFTER (Angular 15) -->
<mat-slider
    [min]="0"
    [max]="100"
    discrete
    showTickMarks>
    <input matSliderThumb [(ngModel)]="value">
</mat-slider>
```

---

## 🎯 Orchestrator Script

### run-all-v15-fixes.ps1

**Purpose**: Runs all automated fixes in the correct order

**What it does**:
1. TypeScript target fix
2. Router config fix
3. Material Chips fix
4. Material Form Field fix
5. ag-Grid imports fix
6. Material Slider diagnostic (optional)

**Parameters**:
- `-ProjectPath`: Path to Angular project
- `-DryRun`: Preview all changes without applying
- `-SkipSliderDiagnostic`: Skip Material Slider diagnostic

**Example**:
```powershell
# Preview all fixes
.\run-all-v15-fixes.ps1 -DryRun

# Apply all fixes
.\run-all-v15-fixes.ps1 -ProjectPath "C:\MyProject"

# Apply fixes, skip slider diagnostic
.\run-all-v15-fixes.ps1 -ProjectPath "C:\MyProject" -SkipSliderDiagnostic
```

**Output**:
```
═══════════════════════════════════════════════════════
  Migration Summary
═══════════════════════════════════════════════════════

Total fixes attempted: 5
  Successful: 5

Fix Results:
  TypeScript Target (ES2022): ✅ Success
  Router relativeLinkResolution: ✅ Success
  Material Chips API: ✅ Success
  Material Form Field updateOutlineGap(): ✅ Success
  ag-Grid Import Paths: ✅ Success
  Material Slider Diagnostic: ℹ️ Report generated

⚠️ IMPORTANT: Manual Migration Still Required
  1. Material Slider (if used)
  2. Material Theming (if customized)
  3. ag-Grid API (if used)
```

---

## 🔄 Integration with Migration System

These focused scripts are automatically called by the main v15 migration:

```powershell
# Run full v15 migration (includes all fixes)
.\migrate-to-v15.ps1 -ProjectPath "C:\MyProject"

# Or just run breaking changes fixes
.\fix-breaking-changes-v15.ps1 -ProjectPath "C:\MyProject"
```

The `v15.psm1` module orchestrates these scripts automatically.

---

## ✅ Benefits of Modular Architecture

1. **Reusability**: Each fix can be run independently
2. **Testing**: Test individual fixes in isolation
3. **Debugging**: Easier to identify which fix caused an issue
4. **Flexibility**: Skip specific fixes if needed
5. **Maintainability**: Each fix is in its own file (easier to update)
6. **Documentation**: Self-documenting with clear script names

---

## 📚 Additional Resources

- **Main v15 Migration Guide**: `migrations/docs/02-migrate-to-angular-15.md`
- **Missing Fixes Documentation**: `migrations/docs/MISSING-V15-FIXES.md`
- **Official Angular Update Guide**: https://update.angular.io/?l=3&v=14.0-15.0
- **Material MDC Migration**: https://material.angular.io/guide/mdc-migration

---

## 🐛 Troubleshooting

### "Fixes directory not found"
**Solution**: Ensure you're running from the correct directory. The fixes directory should be at:
```
migrations/scripts/fixes/
```

### "Script not found"
**Solution**: Verify all fix scripts are present in the fixes directory.

### "Permission denied"
**Solution**: Run PowerShell as Administrator or adjust execution policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Fixes didn't apply
**Solution**:
1. Check you didn't use `-DryRun` flag
2. Review console output for specific errors
3. Run individual fix scripts for detailed output

---

## 📝 Contributing

When adding new fixes:

1. Create focused script: `fix-{feature-name}.ps1`
2. Include `-DryRun` parameter
3. Provide clear console output
4. Update this README
5. Update `run-all-v15-fixes.ps1` orchestrator
6. Update `v15.psm1` module

---

**Version**: 1.0.0
**Last Updated**: December 2025
**Maintainer**: Angular Migration Toolkit

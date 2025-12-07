# Missing Angular 15 Migration Fixes

This document lists the breaking changes that were **NOT** handled by the current v15 migration script but appeared in real-world migrations.

## Summary of Missing Fixes

Based on actual migration attempts, the following breaking changes need to be added to the v15 migration automation:

| Category | Issue | Status | Priority |
|----------|-------|--------|----------|
| TypeScript Config | Target not updated to ES2022 | ❌ Missing | 🔴 Critical |
| Router | relativeLinkResolution not removed | ❌ Missing | 🔴 Critical |
| Material Slider | API completely changed | ❌ Missing | 🔴 Critical |
| Material Chips | Property changes (selected → highlighted) | ⚠️ Partial | 🔴 Critical |
| Material Form Field | updateOutlineGap() removed | ❌ Missing | 🟡 High |
| Material Theming | Theme config format changed | ❌ Missing | 🟡 High |
| ag-Grid | Import paths changed | ❌ Missing | 🟢 Medium |
| ag-Grid | API changes (detailNode, IRowNode) | ❌ Missing | 🟢 Medium |
| Highcharts | API changes (zoomType) | ❌ Missing | 🟢 Medium |

---

## Detailed Fixes Needed

### 1. TypeScript Target Configuration ✅ AUTOMATABLE

**Issue**: Build warns that target should be ES2022

**Error Message**:
```
TypeScript compiler options "target" and "useDefineForClassFields" are set to "ES2022" and "false" respectively by the Angular CLI.
NOTE: You can set the "target" to "ES2022" in the project's tsconfig to remove this warning.
```

**Fix Required**:
Update all `tsconfig*.json` files:

```json
{
  "compilerOptions": {
    "target": "ES2022",  // Changed from "ES2020"
    // ...
  }
}
```

**Files to Check**:
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.spec.json`

**Automation Approach**:
```powershell
# Find all tsconfig files and update target
$tsconfigFiles = Get-ChildItem -Path $ProjectPath -Filter "tsconfig*.json" -Recurse
foreach ($file in $tsconfigFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $content = $content -replace '"target"\s*:\s*"ES2020"', '"target": "ES2022"'
    Set-Content -Path $file.FullName -Value $content -NoNewline
}
```

---

### 2. Router relativeLinkResolution ✅ AUTOMATABLE

**Issue**: Property removed from Angular 15 Router

**Error Message**:
```
error TS2345: Argument of type '{ useHash: false; preloadingStrategy: typeof PreloadAllModules; relativeLinkResolution: string; }' is not assignable to parameter of type 'ExtraOptions'.
Object literal may only specify known properties, and 'relativeLinkResolution' does not exist in type 'ExtraOptions'.
```

**Fix Required**:
Remove the `relativeLinkResolution` property from `RouterModule.forRoot()`:

```typescript
// BEFORE (Angular 14)
RouterModule.forRoot(routes, {
    useHash: false,
    preloadingStrategy: PreloadAllModules,
    relativeLinkResolution: 'legacy',  // ❌ Remove this line
})

// AFTER (Angular 15)
RouterModule.forRoot(routes, {
    useHash: false,
    preloadingStrategy: PreloadAllModules,
})
```

**Files to Check**:
- `app-routing.module.ts`
- Any module with `RouterModule.forRoot()`

**Automation Approach**:
```powershell
# Find routing modules and remove relativeLinkResolution
$routingFiles = Get-ChildItem -Path $srcPath -Filter "*-routing.module.ts" -Recurse
foreach ($file in $routingFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    # Remove the entire line containing relativeLinkResolution
    $content = $content -replace "\s*relativeLinkResolution\s*:\s*['""][^'""]*['""],?\s*\r?\n?", ""
    Set-Content -Path $file.FullName -Value $content -NoNewline
}
```

---

### 3. Material Slider API Changes ⚠️ COMPLEX

**Issue**: Material 15 completely rewrote the slider component

**Error Message**:
```
error NG8002: Can't bind to 'tickInterval' since it isn't a known property of 'mat-slider'.
```

**API Changes**:
| Old (Angular 14) | New (Angular 15) | Notes |
|------------------|------------------|-------|
| `tickInterval` | Removed | No replacement |
| `thumbLabel` | Removed | No replacement |
| `discrete` | Use `discrete` attribute | Now an attribute, not property |
| `min` | `min` | Still works |
| `max` | `max` | Still works |
| `value` | `value` | Still works |
| `[(ngModel)]` | `[(ngModel)]` | Still works |

**Fix Required**:
```html
<!-- BEFORE (Angular 14) -->
<mat-slider
    [min]="0"
    [max]="4"
    [tickInterval]="1"
    [thumbLabel]="true"
    [(ngModel)]="value">
</mat-slider>

<!-- AFTER (Angular 15) -->
<mat-slider
    [min]="0"
    [max]="4"
    discrete
    showTickMarks>
    <input matSliderThumb [(ngModel)]="value">
</mat-slider>
```

**Automation Approach**:
⚠️ **Complex** - Requires HTML parsing and structural changes. Recommend manual review or advanced AST-based tool.

**Manual Steps**:
1. Search for `<mat-slider` in HTML files
2. Remove `[tickInterval]`, `[thumbLabel]`
3. Add `discrete` and `showTickMarks` attributes if needed
4. Add `<input matSliderThumb>` inside the slider

---

### 4. Material Chips Property Changes ⚠️ COMPLEX

**Issue**: Individual chip properties changed

**Error Message**:
```
error NG8002: Can't bind to 'selected' since it isn't a known property of 'mat-chip'.
```

**Current Script Limitation**:
The script converts `mat-chip-list` → `mat-chip-set` but doesn't handle:
- `mat-chip` property changes
- Selectable chips need to become `mat-chip-option`

**API Changes**:
| Component | Old Property | New Property | Notes |
|-----------|-------------|--------------|-------|
| `mat-chip` | `[selected]` | `[highlighted]` | For visual highlighting only |
| `mat-chip-option` | `[selected]` | `[selected]` | Use this for selectable chips |

**Fix Required**:
```html
<!-- BEFORE (Angular 14) -->
<mat-chip-list>
    <mat-chip [selected]="tag.selected" (click)="toggle(tag)">
        {{tag.name}}
    </mat-chip>
</mat-chip-list>

<!-- AFTER (Angular 15) - Option 1: Non-selectable -->
<mat-chip-set>
    <mat-chip [highlighted]="tag.highlighted">
        {{tag.name}}
    </mat-chip>
</mat-chip-set>

<!-- AFTER (Angular 15) - Option 2: Selectable -->
<mat-chip-listbox>
    <mat-chip-option [selected]="tag.selected">
        {{tag.name}}
    </mat-chip-option>
</mat-chip-listbox>
```

**Automation Approach**:
```powershell
# Enhanced chips migration
foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file -Raw

    # Step 1: Already handled by current script
    # mat-chip-list → mat-chip-set

    # Step 2: Handle selectable chips
    # If mat-chip has [selected], convert to mat-chip-option
    if ($content -match '<mat-chip[^>]*\[selected\]') {
        # Replace mat-chip-set with mat-chip-listbox for selectable chips
        $content = $content -replace '<mat-chip-set', '<mat-chip-listbox'
        $content = $content -replace '</mat-chip-set>', '</mat-chip-listbox>'

        # Replace mat-chip with mat-chip-option
        $content = $content -replace '<mat-chip(\s)', '<mat-chip-option$1'
        $content = $content -replace '</mat-chip>', '</mat-chip-option>'
    }

    # Step 3: Convert [selected] to [highlighted] for non-selectable chips
    $content = $content -replace '\[selected\]', '[highlighted]'

    Set-Content -Path $file -Value $content -NoNewline
}
```

---

### 5. Material Form Field updateOutlineGap() ✅ AUTOMATABLE

**Issue**: Method removed from MatFormField

**Error Message**:
```
error TS2339: Property 'updateOutlineGap' does not exist on type 'MatFormField'.
```

**Fix Required**:
```typescript
// BEFORE (Angular 14)
this.formField.updateOutlineGap();  // ❌ Remove this

// AFTER (Angular 15)
// Remove the call - outline gap is now automatic
```

**Automation Approach**:
```powershell
# Find and remove updateOutlineGap calls
$tsFiles = Get-ChildItem -Path $srcPath -Filter "*.ts" -Recurse
foreach ($file in $tsFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    # Remove the entire line with updateOutlineGap()
    $content = $content -replace ".*\.updateOutlineGap\(\);?\s*\r?\n?", ""
    Set-Content -Path $file.FullName -Value $content -NoNewline
}
```

---

### 6. Material Theming Format Changes ⚠️ COMPLEX

**Issue**: Theme configuration format changed in Material 15

**Warning Message**:
```
Angular Material themes should be created from a map containing the keys "color", "typography", and "density".
The color value should be a map containing the palette values for "primary", "accent", and "warn".
```

**Fix Required**:
```scss
// BEFORE (Angular 14)
@import '~@angular/material/theming';

$my-primary: mat-palette($mat-indigo);
$my-accent: mat-palette($mat-pink);
$my-warn: mat-palette($mat-red);

$my-theme: mat-light-theme($my-primary, $my-accent, $my-warn);

@include angular-material-theme($my-theme);

// AFTER (Angular 15)
@use '@angular/material' as mat;

$my-primary: mat.define-palette(mat.$indigo-palette);
$my-accent: mat.define-palette(mat.$pink-palette);
$my-warn: mat.define-palette(mat.$red-palette);

$my-theme: mat.define-light-theme((
  color: (
    primary: $my-primary,
    accent: $my-accent,
    warn: $my-warn,
  ),
  typography: mat.define-typography-config(),
  density: 0,
));

@include mat.all-component-themes($my-theme);
```

**Key Changes**:
1. `@import` → `@use '@angular/material' as mat`
2. `mat-palette()` → `mat.define-palette()`
3. `mat-light-theme()` → `mat.define-light-theme()` with map structure
4. Theme must include `color`, `typography`, and `density` keys
5. `angular-material-theme()` → `mat.all-component-themes()`

**Automation Approach**:
⚠️ **Very Complex** - Requires SCSS parsing. Recommend using Material schematics:
```bash
ng generate @angular/material:mdc-migration
```

---

### 7. ag-Grid Import Paths ✅ AUTOMATABLE

**Issue**: ag-Grid v28+ changed stylesheet import paths

**Error Message**:
```
SassError: Can't find stylesheet to import.
@import '@ag-grid-community/core/dist/styles/ag-grid';
```

**Fix Required**:
```scss
// BEFORE (ag-Grid v27 and earlier)
@import '@ag-grid-community/core/dist/styles/ag-grid';
@import '@ag-grid-community/core/dist/styles/ag-theme-alpine';

// AFTER (ag-Grid v28+)
@import 'ag-grid-community/styles/ag-grid';
@import 'ag-grid-community/styles/ag-theme-alpine';
```

**Automation Approach**:
```powershell
# Update ag-grid imports in SCSS files
$scssFiles = Get-ChildItem -Path $srcPath -Filter "*.scss" -Recurse
foreach ($file in $scssFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $content = $content -replace "@import\s+['""]@ag-grid-community/core/dist/styles/", "@import 'ag-grid-community/styles/"
    Set-Content -Path $file.FullName -Value $content -NoNewline
}
```

---

### 8. ag-Grid API Changes ⚠️ COMPLEX

**Issue**: ag-Grid v28+ changed row node API

**Error Messages**:
```
error TS2339: Property 'detailNode' does not exist on type 'IRowNode<any>'.
error TS2740: Type 'IRowNode<any>' is missing the following properties from type 'RowNode<any>'
```

**Fix Required**:
```typescript
// BEFORE (ag-Grid v27)
import { RowNode } from 'ag-grid-community';

if (row.detailNode && row.expanded) {
    this.updateDetailTableHeight(row.detailNode);
}

// AFTER (ag-Grid v28+)
import { IRowNode } from 'ag-grid-community';

// Master-detail is now configured differently
// Check ag-Grid v28 migration guide for master-detail changes
```

**Automation Approach**:
⚠️ **Complex** - Requires understanding of ag-Grid usage patterns. Recommend:
1. Update to latest ag-Grid version
2. Review ag-Grid v28 migration guide
3. Manual code review for master-detail features

---

### 9. Highcharts API Changes ⚠️ COMPLEX

**Issue**: Highcharts type definitions changed

**Error Message**:
```
error TS2322: Type '{ type: string; zoomType: string; ... }' is not assignable to type 'ChartOptions'.
Object literal may only specify known properties, and 'zoomType' does not exist in type 'ChartOptions'.
```

**Fix Required**:
Check Highcharts version compatibility and type definitions.

**Automation Approach**:
⚠️ **Library-specific** - Update Highcharts package and review breaking changes.

---

## Automation Priority Matrix

### High Priority (Must Automate) 🔴
1. ✅ TypeScript target → ES2022
2. ✅ Remove relativeLinkResolution
3. ✅ Remove updateOutlineGap()
4. ✅ ag-Grid import paths

### Medium Priority (Should Automate) 🟡
5. ⚠️ Material Chips (partial - basic migration)
6. ⚠️ Material Theming (use schematics)

### Low Priority (Manual Review) 🟢
7. ⚠️ Material Slider (complex structural changes)
8. ⚠️ ag-Grid API (library-specific)
9. ⚠️ Highcharts (library-specific)

---

## Recommended Script Enhancement

Create an enhanced `v15.psm1` with these sections:

```powershell
function Invoke-Angular15BreakingChanges {
    # Section 1: TypeScript Config (NEW)
    # Section 2: Router Configuration (NEW)
    # Section 3: DATE_PIPE (existing)
    # Section 4: Material Chips (enhanced)
    # Section 5: Material Form Field (NEW)
    # Section 6: ag-Grid Imports (NEW)
    # Section 7: Manual Review Warnings (enhanced)
}
```

---

## Next Steps

1. **Immediate**: Add high-priority automatable fixes to `v15.psm1`
2. **Short-term**: Enhance Material Chips migration
3. **Long-term**: Create library-specific migration guides (ag-Grid, Highcharts)
4. **Documentation**: Update migration guide with all these issues

---

## Testing Checklist

After enhancing the script, test with:

- [ ] Project with custom Material theme
- [ ] Project using ag-Grid
- [ ] Project using Material slider
- [ ] Project with custom router configuration
- [ ] Project with Material chips
- [ ] Project with custom form fields

---

## References

- [Angular 15 Update Guide](https://update.angular.io/?l=3&v=14.0-15.0)
- [Material 15 Migration](https://material.angular.io/guide/mdc-migration)
- [ag-Grid v28 Migration](https://www.ag-grid.com/javascript-data-grid/upgrading-to-ag-grid-28/)
- [Router Breaking Changes](https://github.com/angular/angular/blob/main/CHANGELOG.md#1500-2022-11-16)

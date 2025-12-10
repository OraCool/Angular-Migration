# Angular Material MDC Migration Guide

## Overview

Angular Material 15 introduced **Material Design Components (MDC)** to replace legacy components. This is a major architectural change that aligns Angular Material with the official Material Design specification from Google.

This guide covers the automated MDC migration integrated into the Angular migration workflow.

## Migration Timeline

| Version | MDC Migration Stage | Automation Level | Status |
|---------|---------------------|------------------|--------|
| v15 | Pre-MDC fixes + Initial migration | ✅ **High** (automated) | **CRITICAL** - Must complete here |
| v16 | Continue with MDC components | ⚠️ Medium (some manual) | Refinements |
| v17 | Legacy components **REMOVED** | ❌ N/A (must be complete) | **BREAKING** - No legacy support |

**Key Point**: Material v17 completely removes legacy components. MDC migration **MUST** be completed before upgrading to v17.

## What Happens During v15 Upgrade

The automated migration (`migration_v15_apply_breaking_changes` subtask) performs:

### 1. Critical Pre-Migration Fixes ✅ Automated

**floatLabel="never" → "auto"**
- **Why**: MDC components don't support `floatLabel="never"`
- **Detection**: Scans all `.html` files
- **Fix**: Automatically replaced with `floatLabel="auto"`

**appearance="standard" → "outline"**
- **Why**: MDC components only support "fill" and "outline" appearances
- **Detection**: Scans all `.html` files
- **Fix**: Automatically replaced with `appearance="outline"`

**CSS Class Updates**
- `mat-form-field-flex` → `mat-mdc-form-field-flex`
- `mat-form-field-outline` → `mat-mdc-form-field-outline`
- `mat-form-field-infix` → `mat-mdc-form-field-infix`

### 2. Material Slider Analysis ⚠️ Manual Required

Material Slider was **completely rewritten** in v15 with no backward compatibility:

**What the migration does:**
- Detects all `<mat-slider>` usage
- Analyzes deprecated properties (tickInterval, thumbLabel, vertical, invert, displayWith)
- Generates comprehensive migration guide: `material-slider-migration.md`

**Why no automation:**
- Structural HTML changes required
- No direct property replacements
- Each usage is unique

**See**: Generated `material-slider-migration.md` in your project root

### 3. Official MDC Migration Schematic ✅ Automated

Runs: `ng generate @angular/material:mdc-migration --defaults`

**What it does:**
- Converts component imports from legacy to MDC versions
- Updates templates where possible
- Adds `// TODO(mdc-migration)` comments for manual review

### 4. Post-Migration Verification ✅ Automated

- Scans for remaining `mat-legacy-*` components
- Reports any legacy imports
- Provides guidance for manual cleanup

## mat-tab-nav-bar [tabPanel] Requirement

### Issue

MDC tab-nav-bar requires explicit `[tabPanel]` binding:

```html
<!-- BEFORE (Angular 14) -->
<mat-tab-nav-bar>
  <a mat-tab-link>Link 1</a>
  <a mat-tab-link>Link 2</a>
</mat-tab-nav-bar>
<router-outlet></router-outlet>

<!-- AFTER (Angular 15) -->
<mat-tab-nav-bar [tabPanel]="tabPanel">
  <a mat-tab-link>Link 1</a>
  <a mat-tab-link>Link 2</a>
</mat-tab-nav-bar>
<mat-tab-nav-panel #tabPanel>
  <router-outlet></router-outlet>
</mat-tab-nav-panel>
```

### Detection

The migration detects mat-tab-nav-bar without `[tabPanel]` and warns you about affected files.

### Fix

Manual - must add `[tabPanel]` binding and `<mat-tab-nav-panel>` wrapper.

## Material Slider Migration (Manual)

### Why No Automation?

Material Slider in v15 is a complete rewrite:
- Different HTML structure required
- No direct replacements for many properties
- Manual testing needed for each instance

### New Structure

```html
<!-- BEFORE (v14) -->
<mat-slider
  [min]="0"
  [max]="100"
  [tickInterval]="1"
  [thumbLabel]="true"
  [(ngModel)]="value">
</mat-slider>

<!-- AFTER (v15) -->
<mat-slider
  [min]="0"
  [max]="100"
  discrete
  showTickMarks>
  <input matSliderThumb [(ngModel)]="value">
</mat-slider>
```

### Key Changes

| Old Property | New Approach |
|--------------|--------------|
| `[tickInterval]="1"` | `discrete` + `showTickMarks` attributes |
| `[thumbLabel]="true"` | Always shown for discrete sliders |
| `[(ngModel)]` on slider | Move to `<input matSliderThumb>` |
| `[vertical]="true"` | ❌ Not supported in v15 |
| `[invert]="true"` | ❌ Not supported in v15 |
| `[displayWith]` | Custom formatter in component |

### Migration Process

1. **Review generated report**: Check `material-slider-migration.md` in project root
2. **Update HTML structure**: Add `<input matSliderThumb>` inside slider
3. **Move bindings**: Transfer `[(ngModel)]` and events to input element
4. **Handle deprecated properties**: Use table above for replacements
5. **Test thoroughly**: Verify functionality and appearance

## CSS Class Changes

### Automated Replacements

The migration automatically updates common CSS selectors:

| Old Class | New Class |
|-----------|-----------|
| `.mat-form-field-flex` | `.mat-mdc-form-field-flex` |
| `.mat-form-field-outline` | `.mat-mdc-form-field-outline` |
| `.mat-form-field-infix` | `.mat-mdc-form-field-infix` |

### Manual Review Needed

Some DOM structures changed in MDC components. Review custom CSS for:

- **Form field appearance customization**
- **Chip component styling**
- **Select dropdown styling**
- **Tab styling**
- **Custom theme mixins**

Search your SCSS files for:
- `mat-` prefixed classes (may need `mat-mdc-` update)
- `// TODO(mdc-migration)` comments added by the schematic
- Material component selectors

## What Requires Manual Review

### 1. Custom Material Themes

If you have custom themes, check:

```scss
// Old format (may still work but check)
@import '~@angular/material/theming';
$custom-primary: mat-palette($mat-indigo);

// MDC format (recommended)
@use '@angular/material' as mat;
$custom-primary: mat.define-palette(mat.$indigo-palette);
```

### 2. Component Templates with TODO Comments

The schematic adds comments for items needing review:

```html
<!-- TODO(mdc-migration): Check if the following change is needed -->
```

Search your project for these and address each one.

### 3. Unit Tests

Material component DOM structure changed. Update tests that:
- Query by Material-specific classes
- Check internal component structure
- Rely on specific HTML hierarchy

## Angular 17 Upgrade Verification

When you upgrade to Angular 17, the migration **verifies** (doesn't re-run) MDC migration:

**Checks performed:**
- Scans for `mat-legacy-*` components (ERROR if found)
- Checks for `@angular/material/legacy-*` imports (ERROR if found)
- Provides clear error messages if legacy components remain

**If errors occur:**
- Go back and complete MDC migration before v17
- Remove all legacy component references
- Update imports to MDC versions

## Testing Checklist

After v15 migration completion:

### Visual Testing
- [ ] All form fields render correctly
- [ ] Float labels work as expected
- [ ] Chip components display properly
- [ ] Select dropdowns function correctly
- [ ] Tab navigation renders properly

### Functional Testing
- [ ] Form field interactions (focus, blur, validation)
- [ ] Chip input components (add, remove chips)
- [ ] Sliders work after manual migration
- [ ] Tab navigation works with tabPanel
- [ ] Material dialogs open/close correctly

### Build & Console
- [ ] Build succeeds without warnings
- [ ] No console errors about unknown elements
- [ ] No runtime errors in browser console
- [ ] All Material component imports resolve

### Custom Styles
- [ ] Custom themes apply correctly
- [ ] Component styling matches design
- [ ] No broken layouts
- [ ] Responsive behavior maintained

## Troubleshooting

### Issue: "mat-chip-list is not a known element"

**Cause**: Chips API not migrated, or migration didn't complete

**Fix**:
```bash
# Re-run breaking changes for v15
npm run migrate -- apply-breaking-changes --version=15
```

Or manually update templates:
```html
<!-- Change from -->
<mat-chip-list>
  <mat-chip>Chip 1</mat-chip>
</mat-chip-list>

<!-- To -->
<mat-chip-set>
  <mat-chip-option>Chip 1</mat-chip-option>
</mat-chip-set>
```

### Issue: Form field outline gap incorrect

**Cause**: Custom CSS targeting old classes

**Fix**: Update CSS selectors to use `.mat-mdc-*` classes:

```scss
// Change from
.mat-form-field-outline {
  border-color: blue;
}

// To
.mat-mdc-form-field-outline {
  border-color: blue;
}
```

### Issue: Slider not working after migration

**Cause**: Incomplete manual migration

**Fix**: Verify structure:
```html
<!-- Must have this structure -->
<mat-slider [min]="0" [max]="100">
  <input matSliderThumb [(ngModel)]="value">
</mat-slider>
```

### Issue: Legacy components still present in v17

**Cause**: MDC migration not completed in v15

**Fix**:
1. Downgrade to v16 if possible
2. Complete MDC migration
3. Verify no legacy components remain:
   ```bash
   grep -r "mat-legacy-" src/
   ```
4. Upgrade to v17 again

### Issue: Custom theme not applying

**Cause**: Theme format may need updates for MDC

**Fix**: Review theme configuration:
```scss
// Ensure using MDC-compatible theme structure
@use '@angular/material' as mat;

$theme: mat.define-light-theme((
  color: (
    primary: mat.define-palette(mat.$indigo-palette),
    accent: mat.define-palette(mat.$pink-palette),
  ),
  typography: mat.define-typography-config(),
  density: 0,
));
```

## Migration Workflow Integration

### Subtask Structure (v15 Upgrade)

1. **update_packages** - Update package.json to Angular 15
2. **install_dependencies** - Run npm install
3. **run_migrations** - Run `ng update` migrations
4. **apply_breaking_changes** ← **MDC migration happens here** (requires confirmation)
5. **build_validate** - Build project
6. **commit** - Commit changes

### MCP Tool Usage

```typescript
// Run v15 breaking changes with MDC migration
migration_v15_apply_breaking_changes({
  sessionId: "session-123",
  autoConfirm: false,  // Recommended: review changes first
  skipValidation: false
})
```

### Output Format

The breaking changes tool returns:

```json
{
  "success": true,
  "message": "Angular 15 Material MDC breaking changes fixed successfully",
  "changes": [
    "Updated: src/app/forms/user-form.component.html (floatLabel fixed)",
    "Updated: src/app/styles/material.scss (CSS classes updated)",
    "Ran Material MDC migration schematic",
    "Verified: No legacy Material components found"
  ],
  "warnings": [
    "Found 3 file(s) using mat-slider. Manual migration required.",
    "Slider migration guide created: material-slider-migration.md",
    "  src/app/settings/settings.component.html: Uses deprecated properties: tickInterval, thumbLabel"
  ],
  "errors": []
}
```

## Resources

### Official Documentation
- [Angular Material MDC Migration Guide](https://material.angular.io/guide/mdc-migration)
- [Material Design Components](https://material.io/components)
- [Angular Material Components](https://material.angular.io/components/categories)

### Generated Project Files
- `material-slider-migration.md` - Slider-specific migration guide (if sliders detected)
- Git diff - Review all automated changes before committing

### Internal Documentation
- [Breaking Changes Analysis](./BREAKING_CHANGES_ANALYSIS.md)
- [v15 Breaking Changes](../migrations/docs/breaking-changes/v15.md)

## Summary

✅ **Automated in v15:**
- floatLabel="never" → "auto"
- appearance="standard" → "outline"
- CSS class updates (mat-* → mat-mdc-*)
- Official MDC migration schematic
- Legacy component verification

⚠️ **Manual in v15:**
- Material Slider migration (complete rewrite)
- mat-tab-nav-bar [tabPanel] binding
- Custom theme updates (case-by-case)
- CSS adjustments for MDC structure

❌ **Blocked in v17:**
- Legacy components completely removed
- Must complete MDC migration before v17 upgrade
- Verification only (no migration possible)

**Best Practice**: Complete MDC migration in v15, test thoroughly in v16, then upgrade to v17 with confidence.

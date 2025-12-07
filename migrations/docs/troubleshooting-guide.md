# Migration Troubleshooting Guide

This guide covers common issues encountered during Angular migrations and their solutions.

## Table of Contents

- [Installation Failures](#installation-failures)
- [Build Errors](#build-errors)
- [Test Failures](#test-failures)
- [NX Workspace Issues](#nx-workspace-issues)
- [Breaking Changes](#breaking-changes)

---

## Installation Failures

### Error: ERESOLVE - Unable to Resolve Dependency Tree

**Symptom:**
```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error
npm error While resolving: client@0.0.0
npm error Found: @angular/compiler-cli@17.3.12
npm error node_modules/@angular/compiler-cli
npm error   dev @angular/compiler-cli@"^17.3.11" from the root project
npm error
npm error Could not resolve dependency:
npm error peer @angular/compiler-cli@"^16.0.0 || ^16.2.0-next.0" from ng-packagr@16.2.3
npm error node_modules/ng-packagr
npm error   dev ng-packagr@"16.2.3" from the root project
```

**Root Cause:**
Angular ecosystem packages (like `ng-packagr`, `@angular/fire`, `@angular-eslint/*`) have strict peer dependency requirements and must match the Angular core version.

**Solution (Automatic):**
As of the latest migration scripts, this is handled automatically:

1. **Auto-detection**: The script detects ERESOLVE errors
2. **Auto-retry**: Automatically retries `npm install` with `--legacy-peer-deps`
3. **Auto-update**: Updates common ecosystem packages to match Angular version:
   - `ng-packagr`
   - `@angular/pwa`
   - `@angular/fire`
   - `@angular-eslint/*` packages

**Solution (Manual - if needed):**
```bash
# Update specific package to match Angular version
npm install ng-packagr@^17.0.0 --save-dev --legacy-peer-deps

# Or update all packages with legacy peer deps
npm install --legacy-peer-deps
```

**Prevention:**
The migration scripts now automatically update these packages in `package.json` before running `npm install`.

---

### Error: Failed to Install Dependencies

**Symptom:**
```
❌ Migration failed: Failed to install dependencies
ℹ️  Duration: 00:29
```

**Possible Causes:**
1. Peer dependency conflicts (see above)
2. Network issues
3. npm cache corruption
4. Incompatible Node.js version

**Solutions:**

**1. Clear npm cache and retry:**
```powershell
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**2. Check Node.js version:**
```bash
node --version

# For Angular 17, you need Node.js >= 18.10.0
# Update Node.js if needed using nvm:
nvm install 18
nvm use 18
```

**3. Use legacy peer deps (temporary workaround):**
```bash
npm install --legacy-peer-deps
```

**4. Check for corrupted packages:**
```bash
npm audit
npm audit fix
```

---

### Error: Cannot Find Module

**Symptom:**
```
Error: Cannot find module '@angular/core'
```

**Solution:**
```bash
# Remove and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Build Errors

### TypeScript Compilation Errors

**Symptom:**
```
error TS2322: Type 'X' is not assignable to type 'Y'
```

**Common Causes & Solutions:**

**1. TypeScript version mismatch:**
```json
// Check package.json for correct TypeScript version
// Angular 17 requires TypeScript ~5.2.2
"devDependencies": {
  "typescript": "~5.2.2"
}
```

**2. Strict mode issues:**
```typescript
// Enable strictNullChecks gradually
"compilerOptions": {
  "strictNullChecks": false  // Temporarily disable, then fix issues
}
```

**3. Import path changes:**
```typescript
// Before (Angular 15)
import { MatLegacyChipsModule } from '@angular/material/legacy-chips';

// After (Angular 17)
import { MatChipsModule } from '@angular/material/chips';
```

**Fix with breaking changes script:**
```powershell
.\migrations\scripts\fix-breaking-changes-v17.ps1 -ProjectPath .
```

---

### Module Not Found Errors

**Symptom:**
```
Module not found: Error: Can't resolve '@angular/material/chips'
```

**Solutions:**

**1. Update imports to new paths:**
```typescript
// Use migration script
.\migrations\scripts\fix-breaking-changes-v17.ps1 -ProjectPath .
```

**2. Check if package is installed:**
```bash
npm list @angular/material
npm install @angular/material@^17.0.0
```

---

## Test Failures

### Karma/Jasmine Test Errors

**Symptom:**
```
Error: Cannot find module 'zone.js/testing'
```

**Solution:**
```typescript
// test.ts (Update import path)
// Before
import 'zone.js/dist/zone-testing';

// After (Angular 17)
import 'zone.js/testing';
```

**Fix automatically:**
```powershell
.\migrations\scripts\fix-breaking-changes-v17.ps1 -ProjectPath .
```

---

### Component Test Failures

**Symptom:**
```
NullInjectorError: No provider for MatDialog!
```

**Solution:**
```typescript
// Before
TestBed.configureTestingModule({
  declarations: [MyComponent]
});

// After (with proper imports)
TestBed.configureTestingModule({
  imports: [MatDialogModule],
  declarations: [MyComponent]
});

// Or use standalone components
TestBed.configureTestingModule({
  imports: [MyComponent, MatDialogModule]
});
```

---

## NX Workspace Issues

### Prerequisites Check Failed

**Symptom:**
```
❌ Prerequisites check failed
❌   - Required file not found: angular.json
❌   - Required file not found: tsconfig.json
```

**Solution:**
The latest migration scripts automatically detect NX workspaces. See [NX Workspace Migration Guide](./nx-workspace-migration-guide.md) for details.

**What changed:**
- Scripts now look for `nx.json`, `workspace.json`, or `angular.json`
- Accept `tsconfig.base.json` as alternative to `tsconfig.json`
- Show "NX workspace detected" message

---

### Build Failures in NX Workspace

**Symptom:**
```
nx build my-app
Error: Cannot find configuration for 'build'
```

**Solutions:**

**1. Clear NX cache:**
```bash
npx nx reset
```

**2. Reinstall dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**3. Use NX migrate instead:**
```bash
# Recommended approach for NX workspaces
npx nx migrate @angular/core@17
npm install
npx nx migrate --run-migrations
```

See [NX Workspace Migration Guide](./nx-workspace-migration-guide.md) for hybrid approach.

---

## Breaking Changes

### Material Component API Changes

**Symptom:**
```
Error: MatLegacyChipsModule is not exported from @angular/material
```

**Solution:**
Angular 15+ removed legacy Material components. Use the migration script:

```powershell
.\migrations\scripts\fix-breaking-changes-v17.ps1 -ProjectPath .
```

**Manual fix:**
```typescript
// Before (Angular 14)
import { MatLegacyChipsModule } from '@angular/material/legacy-chips';

// After (Angular 17)
import { MatChipsModule } from '@angular/material/chips';
```

---

### Router Configuration Changes

**Symptom:**
```
Error: withDebugTracing is not a function
```

**Solution:**
```typescript
// Before (Angular 14)
RouterModule.forRoot(routes, { enableTracing: true })

// After (Angular 17)
RouterModule.forRoot(
  routes,
  withDebugTracing()
)
```

---

### RxJS Breaking Changes

**Symptom:**
```
Error: subscribe() requires complete error and next handlers
```

**Solution:**
```typescript
// Before
observable.subscribe(value => console.log(value));

// After (Angular 16+)
observable.subscribe({
  next: value => console.log(value),
  error: err => console.error(err)
});
```

---

## General Troubleshooting Steps

When encountering any migration issue:

### 1. Check Prerequisites

```powershell
# Run prerequisite check
.\migrations\scripts\00-prerequisites-check.ps1 -ProjectPath . -TargetVersion 17
```

### 2. Review Logs

Check the migration output for specific errors:
- Package installation logs
- Build error messages
- Test failure details

### 3. Clean Build

```bash
# Remove build artifacts
rm -rf dist .angular node_modules package-lock.json

# Reinstall
npm install

# Rebuild
npm run build
```

### 4. Run Breaking Changes Fixes

```powershell
# For Angular 17
.\migrations\scripts\fix-breaking-changes-v17.ps1 -ProjectPath .
```

### 5. Check Documentation

- [Angular Update Guide](https://update.angular.io/)
- [Angular Material Changelog](https://github.com/angular/components/blob/main/CHANGELOG.md)
- [NX Migration Guide](https://nx.dev/core-features/automate-updating-dependencies)

### 6. Validate Step by Step

```powershell
# Validate build
.\migrations\scripts\validate-build.ps1 -ProjectPath .

# Validate tests (if applicable)
.\migrations\scripts\validate-tests.ps1 -ProjectPath .

# Validate lint (if applicable)
.\migrations\scripts\validate-lint.ps1 -ProjectPath .
```

---

## Getting Help

If you're still stuck after trying these solutions:

1. **Check the error message carefully** - Often includes the solution
2. **Search the Angular Update Guide** - https://update.angular.io/
3. **Review breaking changes documentation** - `migrations/docs/03-migrate-to-angular-17.md`
4. **Check GitHub issues** - Angular, Material, and NX repositories
5. **Create a minimal reproduction** - Helps isolate the issue

---

## Prevention Tips

To avoid migration issues:

1. **Always commit before migrating** - Easy rollback if needed
2. **Update one major version at a time** - Easier to debug
3. **Run tests after each migration step** - Catch issues early
4. **Review breaking changes documentation** - Know what to expect
5. **Keep dependencies up to date** - Smaller migration deltas
6. **Use the `--CommitSteps` flag** - Creates audit trail

```powershell
# Example: Step-by-step migration with commits
.\migrate-to-v17.ps1 -ProjectPath . -CommitSteps
```

---

## Quick Reference

### Common Commands

```powershell
# Prerequisites check
.\migrations\scripts\00-prerequisites-check.ps1 -ProjectPath . -TargetVersion 17

# Full migration with commits
.\migrations\scripts\migrate-to-v17.ps1 -ProjectPath . -CommitSteps

# Fix breaking changes only
.\migrations\scripts\fix-breaking-changes-v17.ps1 -ProjectPath .

# Validate build
.\migrations\scripts\validate-build.ps1 -ProjectPath .

# Create backup
.\migrations\scripts\01-create-backup.ps1 -ProjectPath .

# Restore backup
.\migrations\scripts\02-restore-backup.ps1 -ProjectPath .
```

### npm Commands

```bash
# Clean install
rm -rf node_modules package-lock.json && npm install

# Install with legacy peer deps
npm install --legacy-peer-deps

# Clear cache
npm cache clean --force

# Check for outdated packages
npm outdated

# Audit for vulnerabilities
npm audit
```

### NX Commands

```bash
# Clear cache
npx nx reset

# Migrate to latest
npx nx migrate latest

# Run migrations
npx nx migrate --run-migrations

# Build all projects
nx run-many --target=build --all

# Test all projects
nx run-many --target=test --all
```

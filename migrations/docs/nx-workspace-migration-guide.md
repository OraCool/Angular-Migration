# NX Workspace Migration Guide

## Overview

This guide covers migrating NX workspaces to newer Angular versions. NX workspaces have a different structure than standard Angular projects and require special considerations.

## NX vs Standard Angular Workspaces

### File Structure Differences

| Standard Angular | NX Workspace |
|-----------------|--------------|
| `angular.json` | `nx.json` + `workspace.json` or `angular.json` |
| `tsconfig.json` | `tsconfig.base.json` |
| Single app in `src/` | Multiple apps in `apps/` and libs in `libs/` |

### Key Differences

1. **Monorepo Structure**: NX workspaces typically contain multiple applications and libraries
2. **Build System**: NX uses its own build orchestration and caching
3. **Migration Tools**: NX provides `nx migrate` command for framework updates
4. **Configuration**: Workspace configuration is split across multiple files

## Migration Approaches

### Approach 1: Use NX Migration Tools (Recommended)

NX provides its own migration system that's aware of the monorepo structure:

```bash
# Step 1: Run NX migrate to generate migration.json
npx nx migrate latest

# Or migrate to a specific version
npx nx migrate @angular/core@17

# Step 2: Install dependencies
npm install

# Step 3: Run migrations
npx nx migrate --run-migrations

# Step 4: Clean up
rm migrations.json
```

**Advantages:**
- ✅ NX-aware: Handles monorepo structure correctly
- ✅ Automated: Runs all necessary schematics
- ✅ Safe: Creates migration.json for review before applying
- ✅ Tested: Official NX migration path

**When to use:**
- For standard NX workspace migrations
- When you want NX-specific optimizations
- When migrating NX plugins and tools

### Approach 2: Use These Migration Scripts

Our migration scripts now support NX workspaces for the prerequisite checks, but with important caveats:

```powershell
# The scripts will detect NX workspace automatically
.\migrate-to-v17.ps1 -ProjectPath /path/to/nx/workspace -SkipTests -SkipLint -CommitSteps
```

**Advantages:**
- ✅ Step-by-step commits for audit trail
- ✅ Breaking changes detection and fixes
- ✅ Detailed reporting
- ✅ Custom validation scripts

**Limitations:**
- ⚠️ Designed for standard Angular CLI workflows
- ⚠️ May not handle NX-specific features optimally
- ⚠️ Won't update NX plugins automatically
- ⚠️ Build/test commands may need adjustment for NX

**When to use:**
- When you want granular control over migration steps
- When you need detailed audit trail with git commits per step
- For NX workspaces that primarily use Angular CLI patterns

## Hybrid Approach (Best of Both Worlds)

Combine both approaches for maximum control:

```bash
# 1. Generate NX migration plan
npx nx migrate @angular/core@17

# 2. Review migrations.json to understand what will change

# 3. Run NX migrations
npx nx migrate --run-migrations

# 4. Use our breaking changes scripts for additional fixes
pwsh -File ./migrations/scripts/fix-breaking-changes-v17.ps1 -ProjectPath .

# 5. Run validation
pwsh -File ./migrations/scripts/validate-build.ps1 -ProjectPath .

# 6. Clean up
rm migrations.json
```

## Prerequisites Check

The migration scripts now automatically detect NX workspaces and adjust requirements:

### Standard Angular Workspace Requirements
- ✅ `package.json`
- ✅ `angular.json`
- ✅ `tsconfig.json`

### NX Workspace Requirements
- ✅ `package.json`
- ✅ `nx.json` OR `workspace.json` OR `angular.json`
- ✅ `tsconfig.base.json` OR `tsconfig.json`

## NX-Specific Considerations

### 1. Application Selection

For NX workspaces with multiple apps, you may want to migrate one app at a time:

```bash
# Using NX migrate with specific scope
npx nx migrate @angular/core@17 --scope=@myorg/my-app
```

### 2. Build Commands

NX uses different build commands:

```bash
# Standard Angular
npm run build

# NX Workspace
nx build my-app
# or
nx run-many --target=build --all
```

Update your CI/CD scripts accordingly.

### 3. Test Commands

```bash
# Standard Angular
npm test

# NX Workspace
nx test my-app
# or
nx run-many --target=test --all
```

### 4. Configuration Files

NX may split configuration across:
- `nx.json` - NX-specific configuration
- `workspace.json` or `angular.json` - Project/app configuration
- `tsconfig.base.json` - Base TypeScript configuration
- Individual `tsconfig.json` files in each app/lib

## Troubleshooting

### Error: "Required file not found: angular.json"

**Before Fix:**
```
❌ Prerequisites check failed
❌   - Required file not found: angular.json
❌   - Required file not found: tsconfig.json
```

**After Fix:**
The updated scripts now detect NX workspaces and check for the appropriate files:
- Looks for `nx.json`, `workspace.json`, or `angular.json`
- Accepts `tsconfig.base.json` as alternative to `tsconfig.json`

### Build Failures After Migration

If builds fail after migration in NX workspace:

1. **Clear NX cache:**
   ```bash
   npx nx reset
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for NX-specific breaking changes:**
   ```bash
   npx nx migrate @nrwl/workspace@latest
   ```

### Module Resolution Issues

If you see TypeScript errors about missing modules:

1. Check `tsconfig.base.json` path mappings
2. Verify `paths` configuration includes all libraries
3. Ensure `@nrwl/webpack` or build plugins are up to date

## Migration Checklist for NX Workspaces

- [ ] Backup your workspace
- [ ] Commit all pending changes
- [ ] Review current NX version: `npx nx --version`
- [ ] Review current Angular version: `ng version` or check `package.json`
- [ ] Choose migration approach (NX migrate vs. custom scripts)
- [ ] Review `migrations.json` if using NX migrate
- [ ] Run migration
- [ ] Clear NX cache: `npx nx reset`
- [ ] Rebuild all projects: `nx run-many --target=build --all`
- [ ] Run all tests: `nx run-many --target=test --all`
- [ ] Fix any breaking changes
- [ ] Update CI/CD pipelines if needed
- [ ] Commit migration changes

## Recommended Migration Strategy

For NX workspaces, we recommend this order:

1. **Use NX migrate for framework updates** (handles Angular, NX plugins)
2. **Use our breaking changes scripts** (for additional Angular-specific fixes)
3. **Use our validation scripts** (for build/test/lint verification)

This gives you NX-aware migration plus our detailed breaking changes detection and fixes.

## Example: Complete NX Workspace Migration to Angular 17

```bash
# 1. Prerequisites
git status  # Ensure clean working directory
npm list @angular/core  # Check current version

# 2. Run NX migrate
npx nx migrate @angular/core@17
cat migrations.json  # Review planned migrations

# 3. Install updated packages
npm install

# 4. Run NX migrations
npx nx migrate --run-migrations

# 5. Apply our breaking changes fixes
pwsh -File ./migrations/scripts/fix-breaking-changes-v17.ps1 -ProjectPath .

# 6. Clear cache and rebuild
npx nx reset
nx run-many --target=build --all

# 7. Run tests
nx run-many --target=test --all

# 8. Commit
git add .
git commit -m "chore: migrate to Angular 17"

# 9. Clean up
rm migrations.json
```

## Additional Resources

- [NX Migration Guide](https://nx.dev/core-features/automate-updating-dependencies)
- [Angular Update Guide](https://update.angular.io/)
- [NX and Angular Version Compatibility](https://nx.dev/packages/angular)

## Support

For issues specific to:
- **NX workspaces**: Check [NX documentation](https://nx.dev)
- **Angular migrations**: See [Angular update guide](https://update.angular.io/)
- **These scripts**: Open an issue in this repository

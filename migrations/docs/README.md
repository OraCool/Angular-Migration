# Angular 14 → 20 Manual Migration Guide

> **Comprehensive guide for migrating Angular projects from version 14 to 20 using PowerShell scripts**

This guide provides step-by-step instructions for manually migrating Angular applications from version 14 to version 20 without requiring MCP or ACP automation tools.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Migration Overview](#migration-overview)
- [Prerequisites](#prerequisites)
- [Migration Path](#migration-path)
- [Documentation Structure](#documentation-structure)
- [PowerShell Scripts](#powershell-scripts)
- [Estimated Timeline](#estimated-timeline)
- [Risk Assessment](#risk-assessment)
- [Getting Help](#getting-help)

---

## 🚀 Quick Start

**For experienced developers who want to get started immediately:**

```powershell
# 1. Check prerequisites
.\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "20"

# 2. Create backup
.\migrations\scripts\01-create-backup.ps1

# 3. Run migration (example for v16)
.\migrations\scripts\migrate-to-v16.ps1 -AutoCommit

# 4. Continue through each version...
```

**For detailed guidance, continue reading below.**

---

## 📖 Migration Overview

This migration covers upgrading an Angular application through 6 major versions:

**14 → 15 → 16 → 17 → 18 → 19 → 20**

Each version upgrade includes:
- ✅ Package version updates
- ✅ Breaking changes fixes
- ✅ Angular CLI schematics execution
- ✅ Build and test validation
- ✅ Git commit (optional)

### Why Incremental Migration?

Angular requires **incremental version upgrades** - you cannot skip versions. Each major version includes:
- API changes that require code modifications
- Dependency updates that may have incompatibilities
- Build tooling changes
- New features and deprecations

---

## ✅ Prerequisites

Before starting the migration, ensure you have:

### Required Tools
- **PowerShell** 5.1+ (Windows) or PowerShell Core 7+ (cross-platform)
- **Node.js** 14.20+ (version requirements vary by Angular version)
- **npm** 6+ or **yarn** 1.22+
- **Git** for version control
- **Angular CLI** (will be updated during migration)

### Project Requirements
- ✅ Angular 14.x project
- ✅ All changes committed to git
- ✅ Clean working directory
- ✅ Passing tests and build
- ✅ Backup of your project

### PowerShell Setup
```powershell
# Check PowerShell version
$PSVersionTable.PSVersion

# Set execution policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**📖 Detailed Prerequisites:** See [00-prerequisites.md](00-prerequisites.md)

---

## 🗺️ Migration Path

### Complete Migration Sequence

```
Angular 14 (Current)
    ↓
    ├─ Pre-Migration ────────────────────┐
    │  └─ Backup & Validation            │
    ↓                                     │
Angular 15 Upgrade ─────────────────────┤
    ├─ Package updates                   │
    ├─ Breaking changes fixes            │ Core
    ├─ Schematics execution              │ Migration
    └─ Validation & commit               │ Path
    ↓                                     │
[Optional: Standalone Migration] ───────┤
    ↓                                     │
Angular 16 Upgrade ─────────────────────┤
    ↓                                     │
[Optional: Signals Migration] ──────────┤
    ↓                                     │
Angular 17 Upgrade ─────────────────────┤
    ├─ + Control Flow Migration          │
    ↓                                     │
Angular 18 Upgrade ─────────────────────┤
    ↓                                     │
Angular 19 Upgrade ─────────────────────┤
    ↓                                     │
Angular 20 Upgrade (Target) ────────────┘
    ↓
Post-Migration Validation
    └─ Final testing & cleanup
```

### Optional Migrations

**Standalone Components** (After v15+, Before v17)
- Converts NgModule-based components to standalone
- Recommended before v17 upgrade
- See: [optional-standalone-migration.md](optional-standalone-migration.md)

**Signal-Based Components** (After v16+, After Standalone)
- Converts to signal-based reactive state management
- Requires standalone components and OnPush change detection
- See: [optional-signals-migration.md](optional-signals-migration.md)

**Control Flow Migration** (After v17)
- Converts `*ngIf/*ngFor/*ngSwitch` to `@if/@for/@switch`
- Can be automated or manual
- See: [optional-control-flow-migration.md](optional-control-flow-migration.md)

---

## 📚 Documentation Structure

### Getting Started
| Document | Description |
|----------|-------------|
| [00-prerequisites.md](00-prerequisites.md) | Prerequisites and environment setup |
| [01-pre-migration-backup.md](01-pre-migration-backup.md) | Backup strategy and procedures |

### Version-Specific Guides
| Document | Description | Estimated Time |
|----------|-------------|----------------|
| [02-migrate-to-angular-15.md](02-migrate-to-angular-15.md) | Angular 14 → 15 upgrade | 2-4 hours |
| [03-migrate-to-angular-16.md](03-migrate-to-angular-16.md) | Angular 15 → 16 upgrade | 3-5 hours |
| [04-migrate-to-angular-17.md](04-migrate-to-angular-17.md) | Angular 16 → 17 upgrade | 4-6 hours |
| [05-migrate-to-angular-18.md](05-migrate-to-angular-18.md) | Angular 17 → 18 upgrade | 2-3 hours |
| [06-migrate-to-angular-19.md](06-migrate-to-angular-19.md) | Angular 18 → 19 upgrade | 2-3 hours |
| [07-migrate-to-angular-20.md](07-migrate-to-angular-20.md) | Angular 19 → 20 upgrade | 2-4 hours |

### Optional Migrations
| Document | Description | When to Apply |
|----------|-------------|---------------|
| [optional-standalone-migration.md](optional-standalone-migration.md) | Standalone components migration | After v15, before v17 |
| [optional-signals-migration.md](optional-signals-migration.md) | Signal-based components migration | After v16, after standalone |
| [optional-control-flow-migration.md](optional-control-flow-migration.md) | Control flow syntax migration | After v17 |

### Post-Migration
| Document | Description |
|----------|-------------|
| [08-post-migration-validation.md](08-post-migration-validation.md) | Final validation and testing |
| [troubleshooting.md](troubleshooting.md) | Common issues and solutions |

---

## 🛠️ PowerShell Scripts

All scripts are located in `migrations/scripts/`

### Utility Scripts
```powershell
# Check prerequisites
.\00-prerequisites-check.ps1 -TargetVersion "20"

# Create backup
.\01-create-backup.ps1 -ProjectPath "C:\MyProject"

# Restore from backup
.\02-restore-backup.ps1 -BackupPath "C:\angular-backup-2025-01-01"
```

### Migration Scripts
```powershell
# Migrate to specific version
.\migrate-to-v15.ps1 -ProjectPath "C:\MyProject"
.\migrate-to-v16.ps1 -ProjectPath "C:\MyProject" -AutoCommit
.\migrate-to-v17.ps1 -ProjectPath "C:\MyProject"
# ... and so on for v18, v19, v20
```

### Breaking Changes Fix Scripts
```powershell
# Fix version-specific breaking changes
.\fix-breaking-changes-v15.ps1 -ProjectPath "C:\MyProject"
.\fix-breaking-changes-v16.ps1 -ProjectPath "C:\MyProject"
.\fix-breaking-changes-v17.ps1 -ProjectPath "C:\MyProject"
# ... and so on
```

### Validation Scripts
```powershell
# Run validation checks
.\validate-build.ps1 -ProjectPath "C:\MyProject"
.\validate-tests.ps1 -ProjectPath "C:\MyProject"
.\validate-lint.ps1 -ProjectPath "C:\MyProject" -Fix
```

### Optional Migration Scripts
```powershell
# Optional migrations
.\migrate-to-standalone.ps1 -ProjectPath "C:\MyProject" -TargetScope all
.\migrate-to-signals.ps1 -ProjectPath "C:\MyProject" -TargetScope all
.\migrate-control-flow.ps1 -ProjectPath "C:\MyProject"
```

### PowerShell Modules

The scripts use modular PowerShell functions located in `migrations/scripts/modules/`:

- **Utilities.psm1** - Common utilities (backup, git, logging)
- **PackageManager.psm1** - Package updates and dependency management
- **BreakingChanges.psm1** - Automated breaking changes fixes
- **Validation.psm1** - Build, test, and lint validation
- **Migration.psm1** - Core migration orchestration
- **StandaloneMigration.psm1** - Standalone components conversion utilities
- **SignalsMigration.psm1** - Signal-based components conversion utilities

#### Using Modules Directly

You can also import and use the modules directly for custom workflows:

```powershell
# Import modules
Import-Module .\migrations\scripts\modules\Migration.psm1

# Use functions
$result = Invoke-AngularMigration `
    -ProjectPath "C:\MyProject" `
    -TargetVersion "16" `
    -AutoCommit

# Check package compatibility
$compat = Test-PackageCompatibility `
    -ProjectPath "C:\MyProject" `
    -TargetVersion "16"
```

---

## ⏱️ Estimated Timeline

### Total Migration Time

**Minimum:** 15-20 hours (experienced team, simple project)
**Typical:** 25-35 hours (medium complexity project)
**Maximum:** 40-60 hours (complex project with many dependencies)

### Breakdown by Stage

| Stage | Time Estimate | Notes |
|-------|---------------|-------|
| Prerequisites & Setup | 1-2 hours | Environment setup, backup |
| v14 → v15 | 2-4 hours | First major upgrade |
| v15 → v16 | 3-5 hours | Material Chips API changes |
| v16 → v17 | 4-6 hours | MDC migration, control flow |
| v17 → v18 | 2-3 hours | Incremental improvements |
| v18 → v19 | 2-3 hours | AG-Grid updates |
| v19 → v20 | 2-4 hours | Final version |
| Post-Migration Testing | 4-8 hours | Comprehensive testing |
| Buffer for Issues | 5-10 hours | Unexpected problems |

### Factors Affecting Timeline

**⚡ Faster Migration:**
- Small codebase (< 50k LOC)
- Few third-party dependencies
- Good test coverage
- Modern code patterns
- Dedicated migration team

**🐌 Slower Migration:**
- Large codebase (> 200k LOC)
- Many third-party dependencies
- Legacy code patterns
- Custom Material themes
- Limited testing infrastructure

---

## ⚠️ Risk Assessment

### Risk Levels by Version

| Upgrade | Risk Level | Key Concerns |
|---------|-----------|--------------|
| 14 → 15 | 🟢 Low | Mostly handled by schematics |
| 15 → 16 | 🟡 Medium | Material Chips API, PerfectScrollbar removal |
| 16 → 17 | 🔴 High | MDC migration, breaking changes |
| 17 → 18 | 🟢 Low | Incremental improvements |
| 18 → 19 | 🟡 Medium | AG-Grid breaking changes |
| 19 → 20 | 🟡 Medium | Highcharts updates, final cleanup |

### Risk Mitigation Strategies

1. **Create Comprehensive Backups**
   - Project backup before each version
   - Git commit after each successful migration
   - Database backup if applicable

2. **Test Incrementally**
   - Run tests after each version upgrade
   - Manual testing of critical paths
   - Regression testing suite

3. **Use Feature Flags**
   - Roll out changes gradually
   - A/B testing for new features
   - Easy rollback capability

4. **Plan Rollback Strategy**
   - Document rollback procedures
   - Keep backups accessible
   - Test rollback process

---

## 🆘 Getting Help

### Documentation Resources

1. **This Guide** - Complete migration documentation
2. **Troubleshooting Guide** - [troubleshooting.md](troubleshooting.md)
3. **Official Angular Docs** - https://angular.dev/update-guide
4. **Breaking Changes Analysis** - `/docs/BREAKING_CHANGES_ANALYSIS.md`

### Common Issues

See the [Troubleshooting Guide](troubleshooting.md) for solutions to:
- Build errors
- Dependency conflicts
- Breaking changes
- Migration script errors
- Rollback procedures

### Support Channels

- **Angular Official Discord** - https://discord.gg/angular
- **Stack Overflow** - Tag: `angular-migration`
- **GitHub Issues** - Project-specific issues

---

## 📝 Migration Checklist

Use this checklist to track your migration progress:

- [ ] Prerequisites verified ([00-prerequisites.md](00-prerequisites.md))
- [ ] Backup created ([01-pre-migration-backup.md](01-pre-migration-backup.md))
- [ ] Angular 15 migration complete ([02-migrate-to-angular-15.md](02-migrate-to-angular-15.md))
- [ ] Angular 16 migration complete ([03-migrate-to-angular-16.md](03-migrate-to-angular-16.md))
- [ ] Angular 17 migration complete ([04-migrate-to-angular-17.md](04-migrate-to-angular-17.md))
- [ ] Angular 18 migration complete ([05-migrate-to-angular-18.md](05-migrate-to-angular-18.md))
- [ ] Angular 19 migration complete ([06-migrate-to-angular-19.md](06-migrate-to-angular-19.md))
- [ ] Angular 20 migration complete ([07-migrate-to-angular-20.md](07-migrate-to-angular-20.md))
- [ ] Post-migration validation complete ([08-post-migration-validation.md](08-post-migration-validation.md))
- [ ] All tests passing
- [ ] Production deployment tested

**Optional:**
- [ ] Standalone components migration ([optional-standalone-migration.md](optional-standalone-migration.md))
- [ ] Signal-based components migration ([optional-signals-migration.md](optional-signals-migration.md))
- [ ] Control flow migration ([optional-control-flow-migration.md](optional-control-flow-migration.md))

---

## 📄 License

This migration guide and associated PowerShell scripts are provided as-is for Angular migration purposes.

---

## 🔄 Version History

- **v1.0.0** (2025-01-05) - Initial release
  - Complete migration guide for Angular 14 → 20
  - PowerShell scripts and modules
  - Comprehensive documentation

---

**Ready to begin?** Start with [Prerequisites](00-prerequisites.md) →

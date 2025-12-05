# Pre-Migration Backup & Validation

> **Protect your project before starting the migration**

Before making any changes to your Angular project, it's critical to create comprehensive backups and validate the current state. This ensures you can always recover if something goes wrong.

---

## 🎯 Overview

This guide covers:
- Creating full project backups
- Validating current project state
- Git best practices for migration
- Restoring from backups if needed

**Time Required**: 15-30 minutes
**Risk Level**: 🟢 Low (safety measure)

---

## 📋 Pre-Backup Checklist

Before creating a backup, ensure:

- [ ] All current work is committed to git
- [ ] `git status` shows a clean working directory
- [ ] Current branch is identified and documented
- [ ] Project builds successfully (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] No uncommitted configuration changes
- [ ] Sufficient disk space available (check with `df -h .` or `Get-PSDrive`)

---

## 💾 Backup Strategy

### What Gets Backed Up

The backup includes:
- ✅ **Source code**: `src/`, `e2e/`, all TypeScript/HTML/CSS files
- ✅ **Configuration**: `package.json`, `angular.json`, `tsconfig.json`, `.browserslistrc`
- ✅ **Documentation**: `README.md`, docs folder
- ✅ **Git metadata**: `.git/` directory
- ✅ **Environment files**: `.env`, `.env.*` (if present)
- ✅ **Custom scripts**: Any bash, PowerShell, or build scripts
- ✅ **Assets**: Images, fonts, static files in `src/assets/`

### What Gets Excluded

To save space and time, these are excluded:
- ❌ **node_modules/**: Can be reinstalled with `npm install`
- ❌ **dist/**, **build/**: Generated build artifacts
- ❌ **.angular/**: Angular build cache
- ❌ **coverage/**: Test coverage reports
- ❌ **.vscode/**, **.idea/**: IDE-specific settings (optional)
- ❌ **tmp/**, **temp/**: Temporary files

### Backup Naming Convention

Backups are timestamped for easy identification:

```
backups/
├── backup-20250112-143022/           # YYYYMMDD-HHMMSS format
│   ├── backup-info.json              # Backup metadata
│   ├── src/
│   ├── package.json
│   └── ...
└── backup-20250112-150045/           # Another backup
    └── ...
```

---

## 🚀 Creating a Backup

### Automated Backup (Recommended)

Use the PowerShell backup script:

```powershell
# Navigate to project root
cd C:\path\to\your-angular-project

# Run backup script
..\migrations\scripts\01-create-backup.ps1

# Or with explicit project path
..\migrations\scripts\01-create-backup.ps1 -ProjectPath "C:\path\to\project"
```

**Output:**
```
═══════════════════════════════════════════════════════
  Project Backup Creation
═══════════════════════════════════════════════════════

✓ Creating backup...
  Source: C:\path\to\project
  Destination: C:\path\to\project\backups\backup-20250112-143022

✓ Copying files (excluding node_modules, dist, .angular)...
✓ Saving backup metadata...
✓ Verifying backup integrity...

✓ Backup created successfully!

Backup Information:
  Location: C:\path\to\project\backups\backup-20250112-143022
  Size: 125.3 MB
  Files: 1,247
  Angular Version: 14.2.0
  Created: 2025-01-12 14:30:22

Keep this backup until migration is complete and verified.
```

### Manual Backup

If you prefer manual backup:

**Windows:**
```powershell
# Create backup directory
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "backups\backup-$timestamp"
New-Item -ItemType Directory -Path $backupPath

# Copy project files (excluding node_modules, dist, etc.)
robocopy . $backupPath /E /XD node_modules dist .angular coverage .git
```

**macOS/Linux:**
```bash
# Create backup directory
timestamp=$(date +%Y%m%d-%H%M%S)
backup_path="backups/backup-$timestamp"
mkdir -p "$backup_path"

# Copy project files
rsync -av --exclude='node_modules' \
          --exclude='dist' \
          --exclude='.angular' \
          --exclude='coverage' \
          . "$backup_path/"
```

---

## 🔍 Verifying Backup Integrity

After creating a backup, verify it's complete:

```powershell
# Verify backup automatically
..\migrations\scripts\01-create-backup.ps1 -VerifyOnly -BackupPath "backups\backup-20250112-143022"
```

**Manual Verification:**

```powershell
# Check if critical files exist
Test-Path "backups\backup-20250112-143022\package.json"
Test-Path "backups\backup-20250112-143022\angular.json"
Test-Path "backups\backup-20250112-143022\src\main.ts"

# Check backup metadata
Get-Content "backups\backup-20250112-143022\backup-info.json" | ConvertFrom-Json
```

**Expected backup-info.json:**
```json
{
  "BackupDate": "2025-01-12T14:30:22",
  "ProjectPath": "C:\\path\\to\\project",
  "AngularVersion": "14.2.0",
  "NodeVersion": "v18.19.0",
  "FileCount": 1247,
  "BackupSizeMB": 125.3
}
```

---

## 🔄 Restoring from Backup

If you need to rollback during migration:

### Quick Restore

```powershell
# Restore from most recent backup
..\migrations\scripts\02-restore-backup.ps1

# Or specify backup path
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-20250112-143022"
```

### Preview Before Restoring (Recommended)

```powershell
# Preview what will be restored (no changes made)
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-20250112-143022" -WhatIf
```

**Output:**
```
═══════════════════════════════════════════════════════
  Restore from Backup
═══════════════════════════════════════════════════════

Backup Information:
  Path: C:\path\to\project\backups\backup-20250112-143022
  Created: 2025-01-12 14:30:22
  Angular Version: 14.2.0
  Size: 125.3 MB

⚠️  WARNING: This will restore your project to the state from 2025-01-12 14:30:22

WhatIf: The following changes would be made:
  - Current package.json would be replaced
  - Current src/ directory would be replaced
  - All files modified after 2025-01-12 14:30:22 would be lost

To proceed, run without -WhatIf flag.
```

### Complete Restore Process

```powershell
# Step 1: Verify backup exists and is valid
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-20250112-143022" -WhatIf

# Step 2: Create safety backup of current state (optional)
..\migrations\scripts\01-create-backup.ps1

# Step 3: Restore
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-20250112-143022"

# Step 4: Reinstall dependencies
npm install

# Step 5: Verify project still builds
npm run build
```

---

## 🗂️ Git Best Practices

### Create a Migration Branch

**Always** work on a dedicated branch for migration:

```bash
# Ensure working directory is clean
git status

# Create and switch to migration branch
git checkout -b migration/angular-14-to-20

# Or for specific version upgrades
git checkout -b migration/v16-upgrade

# Push branch to remote (creates backup on remote)
git push -u origin migration/angular-14-to-20
```

### Commit Current State

Before starting migration:

```bash
# Stage all current changes
git add .

# Commit with clear message
git commit -m "chore: snapshot before Angular 14→20 migration

- Current version: Angular 14.2.0
- All tests passing
- Build successful
- Ready for migration"

# Push to remote
git push
```

### Git Tags for Milestones

Tag each successful stage:

```bash
# After completing Angular 16 migration
git tag -a v16-migration-complete -m "Successfully migrated to Angular 16"
git push origin v16-migration-complete

# After completing Angular 20 migration
git tag -a v20-migration-complete -m "Successfully migrated to Angular 20"
git push origin v20-migration-complete
```

---

## ✅ Validating Current State

Before starting migration, validate your project's current state.

### Build Validation

```powershell
# Run build and check for errors
..\migrations\scripts\validate-build.ps1
```

Or manually:

```bash
npm run build
```

Expected output:
```
✔ Browser application bundle generation complete.
✔ Copying assets complete.
✔ Index html generation complete.

Build at: 2025-01-12T14:35:42.123Z - Hash: abc123def456
Time: 45678ms
```

### Test Validation

```powershell
# Run test suite
..\migrations\scripts\validate-tests.ps1
```

Or manually:

```bash
npm test -- --watch=false
```

Expected output:
```
✔ 42 tests passed
✔ 0 tests failed
Coverage: 78.5%
```

### Lint Validation

```powershell
# Run linter
..\migrations\scripts\validate-lint.ps1
```

Or manually:

```bash
npm run lint
```

Expected output:
```
All files pass linting.
```

---

## 💿 Disk Space Requirements

### Check Available Space

**Windows:**
```powershell
Get-PSDrive C | Select-Object Used,Free

# Or for current directory
Get-PSDrive (Get-Location).Drive.Name | Select-Object Used,Free
```

**macOS/Linux:**
```bash
df -h .
```

### Space Requirements

| Item | Space Required |
|------|----------------|
| **Current Project** | ~500 MB - 2 GB |
| **Backup Copy** | Same as current project |
| **node_modules** (per version) | ~300 MB - 1 GB |
| **Build artifacts** | ~100 MB - 500 MB |
| **Safety margin** | 2-3 GB |

**Recommended**: 10+ GB free disk space for safe migration

### Cleanup if Space Limited

```bash
# Remove old build artifacts
rm -rf dist/
rm -rf .angular/
rm -rf coverage/

# Clean npm cache
npm cache clean --force

# Remove old node_modules (will be reinstalled)
rm -rf node_modules/
```

---

## 📊 Backup Management

### List All Backups

```powershell
# List backups with details
Get-ChildItem backups\ | Where-Object { $_.PSIsContainer } | ForEach-Object {
    $info = Get-Content (Join-Path $_.FullName "backup-info.json") | ConvertFrom-Json
    [PSCustomObject]@{
        Name = $_.Name
        Date = $info.BackupDate
        AngularVersion = $info.AngularVersion
        SizeMB = $info.BackupSizeMB
    }
} | Format-Table -AutoSize
```

### Delete Old Backups

After successful migration, delete old backups to save space:

```powershell
# Review backups before deleting
Get-ChildItem backups\ | Select-Object Name, CreationTime, @{N='SizeMB';E={(Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB}}

# Delete specific backup
Remove-Item "backups\backup-20250112-143022" -Recurse -Force

# Keep only last 3 backups, delete older ones
Get-ChildItem backups\ |
    Sort-Object CreationTime -Descending |
    Select-Object -Skip 3 |
    Remove-Item -Recurse -Force
```

---

## ⚠️ Common Issues

### Issue: Backup Takes Too Long

**Cause**: Including node_modules or large files

**Solution:**
```powershell
# Verify exclusions are working
..\migrations\scripts\01-create-backup.ps1 -Verbose

# Manually exclude additional directories
# Edit 01-create-backup.ps1 and add to $excludeDirs array
```

### Issue: Insufficient Disk Space

**Error**: "Not enough disk space to create backup"

**Solution:**
```powershell
# Check current usage
Get-PSDrive C | Select-Object Used,Free

# Free up space
Remove-Item dist\ -Recurse -Force
Remove-Item .angular\ -Recurse -Force
npm cache clean --force

# Consider external backup location
..\migrations\scripts\01-create-backup.ps1 -BackupPath "D:\backups\angular-migration"
```

### Issue: Cannot Restore Backup

**Error**: "Access denied" or "File in use"

**Solution:**
```powershell
# Close all IDE windows and dev servers
# Stop any running npm processes
Get-Process node | Stop-Process -Force

# Run PowerShell as Administrator
# Try restore again
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-20250112-143022"
```

### Issue: Backup Integrity Check Failed

**Error**: "Critical files missing from backup"

**Solution:**
```powershell
# Create new backup with verbose output
..\migrations\scripts\01-create-backup.ps1 -Verbose

# Manually verify critical files
Test-Path "backups\backup-TIMESTAMP\package.json"
Test-Path "backups\backup-TIMESTAMP\angular.json"
Test-Path "backups\backup-TIMESTAMP\src\main.ts"
```

---

## 📝 Backup Checklist

Before proceeding to migration:

- [ ] Local backup created successfully
- [ ] Backup verified and metadata saved
- [ ] Git branch created for migration
- [ ] Current state committed to git
- [ ] Remote git repository updated (pushed)
- [ ] Git tag created for current state (optional)
- [ ] Build validation passed
- [ ] Test validation passed
- [ ] Lint validation passed
- [ ] Sufficient disk space confirmed (10+ GB)
- [ ] Backup location documented and accessible
- [ ] Team members notified (if applicable)

---

## 🎯 Quick Reference

### Create Backup
```powershell
..\migrations\scripts\01-create-backup.ps1
```

### Verify Backup
```powershell
Test-Path "backups\backup-TIMESTAMP\backup-info.json"
```

### Create Git Branch
```bash
git checkout -b migration/angular-14-to-20
git push -u origin migration/angular-14-to-20
```

### Validate Current State
```powershell
..\migrations\scripts\validate-build.ps1
..\migrations\scripts\validate-tests.ps1
```

### Restore if Needed
```powershell
..\migrations\scripts\02-restore-backup.ps1 -BackupPath "backups\backup-TIMESTAMP"
```

---

**All validations passed and backup created?** → Continue to [Angular 15 Migration](02-migrate-to-angular-15.md)

**Need help?** → See [Troubleshooting](troubleshooting.md)

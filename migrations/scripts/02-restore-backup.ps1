<#
.SYNOPSIS
    Restores an Angular project from backup.

.DESCRIPTION
    Restores a project from a previously created backup. Can verify
    backup integrity before restoring.

.PARAMETER BackupPath
    Path to the backup directory.

.PARAMETER RestorePath
    Path where to restore the project (optional).

.PARAMETER Force
    Skip confirmation prompts.

.PARAMETER WhatIf
    Show what would be restored without actually restoring.

.EXAMPLE
    .\02-restore-backup.ps1 -BackupPath "C:\angular-backup-2025-01-05_14-30-00"

.EXAMPLE
    .\02-restore-backup.ps1 -BackupPath "C:\Backups\myproject" -RestorePath "C:\MyProject" -Force

.NOTES
    Part of Angular Migration Toolkit
    Author: Angular Migration Toolkit
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,

    [Parameter(Mandatory = $false)]
    [string]$RestorePath = "",

    [Parameter(Mandatory = $false)]
    [switch]$Force = $false,

    [Parameter(Mandatory = $false)]
    [switch]$WhatIf = $false
)

$ErrorActionPreference = 'Stop'

# Import modules
$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force

# Display header
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Angular Project Restore" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Resolve backup path
if (Test-Path $BackupPath) {
    $BackupPath = Resolve-Path $BackupPath
}

Write-InfoMessage "Restoring from backup..."
Write-InfoMessage "  Backup: $BackupPath"
Write-Host ""

# Verify backup integrity
Write-InfoMessage "Verifying backup integrity..."
$isValid = Test-BackupIntegrity -BackupPath $BackupPath

if (-not $isValid) {
    Write-ErrorMessage "Backup verification failed!"
    Write-InfoMessage "The backup may be corrupted or incomplete."
    exit 1
}

Write-Host ""

# Read backup metadata
$metadataPath = Join-Path $BackupPath "backup-info.json"
if (Test-Path $metadataPath) {
    $metadata = Get-Content -Path $metadataPath | ConvertFrom-Json
    Write-InfoMessage "Backup Information:"
    Write-InfoMessage "  Created: $($metadata.timestamp)"
    Write-InfoMessage "  Original source: $($metadata.source)"
    Write-InfoMessage "  Type: $($metadata.backup_type)"
    Write-Host ""
}

# WhatIf mode
if ($WhatIf) {
    Write-InfoMessage "WhatIf Mode - No changes will be made"
    Write-Host ""
    Write-Success "Backup verification passed!"
    Write-InfoMessage "Backup contains:"

    $files = Get-ChildItem -Path $BackupPath -Recurse -File | Measure-Object
    Write-InfoMessage "  Files: $($files.Count)"
    Write-InfoMessage "  Size: $(Get-ProjectSize -Path $BackupPath)"
    Write-Host ""
    exit 0
}

# Confirm restore
if (-not $Force) {
    Write-WarningMessage "This will restore the project from backup."
    Write-WarningMessage "Any changes made after the backup will be lost!"
    Write-Host ""
    $response = Read-Host "Do you want to continue? (y/N)"
    if ($response -ne 'y') {
        Write-InfoMessage "Restore cancelled."
        exit 0
    }
    Write-Host ""
}

# Restore
try {
    $restoreParams = @{
        BackupPath = $BackupPath
        Force      = $true
    }

    if ($RestorePath) {
        $restoreParams.RestorePath = $RestorePath
    }

    $success = Restore-ProjectBackup @restoreParams

    if ($success) {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Success "Project restored successfully!"
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""

        Write-InfoMessage "Next steps:"
        Write-InfoMessage "  1. Run: npm install"
        Write-InfoMessage "  2. Verify: npm run build"
        Write-InfoMessage "  3. Test: npm test"
        Write-Host ""

        exit 0
    }
    else {
        Write-ErrorMessage "Restore failed!"
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Red
    Write-ErrorMessage "Restore failed!"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-ErrorMessage "Error: $_"
    Write-Host ""
    exit 1
}

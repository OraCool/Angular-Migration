<#
.SYNOPSIS
    Creates a timestamped backup of the Angular project.

.DESCRIPTION
    Creates a complete backup of the project excluding build artifacts
    and dependencies. Includes metadata file for tracking purposes.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER BackupPath
    Custom backup path (optional). If not specified, creates backup
    in parent directory with timestamp.

.EXAMPLE
    .\01-create-backup.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\01-create-backup.ps1 -ProjectPath "C:\MyProject" -BackupPath "D:\Backups\myproject-backup"

.NOTES
    Part of Angular Migration Toolkit
    Author: Angular Migration Toolkit
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [string]$BackupPath = ""
)

$ErrorActionPreference = 'Stop'

# Import modules
$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force

# Display header
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Angular Project Backup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Resolve project path
$ProjectPath = Resolve-Path $ProjectPath

Write-InfoMessage "Creating backup of Angular project..."
Write-InfoMessage "  Source: $ProjectPath"
Write-Host ""

# Create backup
try {
    $backupParams = @{
        ProjectPath = $ProjectPath
    }

    if ($BackupPath) {
        $backupParams.BackupPath = $BackupPath
    }

    $result = New-ProjectBackup @backupParams

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Success "Backup created successfully!"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    Write-InfoMessage "Backup Details:"
    Write-InfoMessage "  Location: $($result.Path)"
    Write-InfoMessage "  Size: $($result.Size)"
    Write-InfoMessage "  Files: $($result.FileCount)"
    Write-Host ""

    Write-InfoMessage "Backup metadata saved to:"
    Write-InfoMessage "  $(Join-Path $result.Path 'backup-info.json')"
    Write-Host ""

    Write-Success "Next steps:"
    Write-InfoMessage "  1. Verify backup: .\02-restore-backup.ps1 -BackupPath '$($result.Path)' -WhatIf"
    Write-InfoMessage "  2. Proceed with migration"
    Write-InfoMessage "  3. Keep this backup until migration is verified successful"
    Write-Host ""

    exit 0
}
catch {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Red
    Write-ErrorMessage "Backup failed!"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-ErrorMessage "Error: $_"
    Write-Host ""
    exit 1
}

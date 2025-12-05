<#
.SYNOPSIS
    Checks prerequisites for Angular migration.

.DESCRIPTION
    Validates that all required tools and conditions are met before
    starting the Angular migration process.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER TargetVersion
    Target Angular version to migrate to.

.EXAMPLE
    .\00-prerequisites-check.ps1 -ProjectPath "C:\MyProject" -TargetVersion "16"

.NOTES
    Part of Angular Migration Toolkit
    Author: Angular Migration Toolkit
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [ValidateSet("15", "16", "17", "18", "19", "20")]
    [string]$TargetVersion = "20"
)

$ErrorActionPreference = 'Stop'

# Import modules
$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -DisableNameChecking
Import-Module (Join-Path $ModulesPath "Migration.psm1") -DisableNameChecking

# Display header
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Angular Migration Prerequisites Check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Resolve project path
$ProjectPath = Resolve-Path $ProjectPath

Write-InfoMessage "Project: $ProjectPath"
Write-InfoMessage "Target Version: Angular $TargetVersion"
Write-Host ""

# Run prerequisites check
$result = Test-MigrationPrerequisites -ProjectPath $ProjectPath -TargetVersion $TargetVersion

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($result.Ready) {
    Write-Host "  ✅ Prerequisites Check: PASSED" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Success "All prerequisites met! You can proceed with migration."
    Write-Host ""
    Write-InfoMessage "Next steps:"
    Write-InfoMessage "  1. Create backup: .\01-create-backup.ps1 -ProjectPath '$ProjectPath'"
    Write-InfoMessage "  2. Run migration: .\migrate-to-v$TargetVersion.ps1 -ProjectPath '$ProjectPath'"
    exit 0
}
else {
    Write-Host "  ❌ Prerequisites Check: FAILED" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-ErrorMessage "Prerequisites check failed. Please resolve the following issues:"
    Write-Host ""

    foreach ($issue in $result.Issues) {
        Write-ErrorMessage "  ❌ $issue"
    }

    if ($result.Warnings.Count -gt 0) {
        Write-Host ""
        Write-WarningMessage "Warnings:"
        foreach ($warning in $result.Warnings) {
            Write-WarningMessage "  ⚠️  $warning"
        }
    }

    Write-Host ""
    exit 1
}

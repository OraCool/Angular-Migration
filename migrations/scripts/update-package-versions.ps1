<#
.SYNOPSIS
    Updates package.json versions to match target Angular version without running full migration.

.DESCRIPTION
    This script updates package versions in package.json to match the target Angular version
    using the compatibility matrix. Useful for fixing partially migrated projects.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER TargetVersion
    Target Angular version (14, 15, 16, 17, 18, 19, 20, 21).

.EXAMPLE
    .\update-package-versions.ps1 -ProjectPath "C:\MyProject" -TargetVersion 17

.EXAMPLE
    .\update-package-versions.ps1 -TargetVersion 17

.NOTES
    Use this script when:
    - You have a partially migrated project
    - Angular core is at one version but ecosystem packages are outdated
    - You need to fix package.json without running full migration
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $true)]
    [ValidateSet("14", "15", "16", "17", "18", "19", "20", "21")]
    [string]$TargetVersion
)

$ErrorActionPreference = 'Stop'

# Import modules
$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "PackageManager.psm1") -Force

# Resolve project path
$ProjectPath = Resolve-Path $ProjectPath

# Display header
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Update Package Versions to Angular $TargetVersion" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-Host ""

# Confirm
Write-WarningMessage "This will update package.json to Angular $TargetVersion versions."
Write-WarningMessage "Make sure you have committed your changes before proceeding."
Write-Host ""

$response = Read-Host "Do you want to continue? (y/N)"
if ($response -ne 'y') {
    Write-InfoMessage "Update cancelled."
    exit 0
}

Write-Host ""

# Update package.json
try {
    Write-InfoMessage "Updating package.json..."
    $result = Update-PackageJson -ProjectPath $ProjectPath -TargetVersion $TargetVersion

    if ($result.Success) {
        Write-Host ""
        Write-Success "package.json updated successfully!"
        Write-Host ""

        if ($result.Changes.Count -gt 0) {
            Write-InfoMessage "Updated packages ($($result.Changes.Count) changes):"
            foreach ($change in $result.Changes) {
                Write-Host "  - $($change.Package): $($change.From) → $($change.To)" -ForegroundColor Yellow
            }
        }

        if ($result.Removed.Count -gt 0) {
            Write-Host ""
            Write-InfoMessage "Removed packages:"
            foreach ($pkg in $result.Removed) {
                Write-Host "  - $pkg" -ForegroundColor Red
            }
        }

        Write-Host ""
        Write-InfoMessage "Next steps:"
        Write-InfoMessage "  1. Review changes: git diff package.json"
        Write-InfoMessage "  2. Install dependencies: npm install --legacy-peer-deps"
        Write-InfoMessage "  3. Test your application"
        Write-Host ""
        exit 0
    }
    else {
        Write-Host ""
        Write-ErrorMessage "Failed to update package.json"
        Write-ErrorMessage "  Error: $($result.Error)"
        Write-Host ""
        exit 1
    }
}
catch {
    Write-Host ""
    Write-ErrorMessage "Error: $_"
    Write-Host ""
    exit 1
}

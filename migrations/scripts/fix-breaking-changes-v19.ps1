<#
.SYNOPSIS
    Fixes Angular 19 breaking changes.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.EXAMPLE
    .\fix-breaking-changes-v19.ps1 -ProjectPath "C:\MyProject"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = "."
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "BreakingChanges.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "Applying Angular 19 Breaking Changes Fixes..." -ForegroundColor Cyan
Write-Host ""

$result = Invoke-BreakingChangesFix -ProjectPath $ProjectPath -Version "19"

if ($result.Success) {
    Write-Success "Breaking changes check completed"
    if ($result.Warnings.Count -gt 0) {
        Write-Host ""
        Write-WarningMessage "Notes:"
        foreach ($warning in $result.Warnings) {
            Write-WarningMessage "  - $warning"
        }
    }
    exit 0
}
else {
    Write-ErrorMessage "Failed to check breaking changes"
    exit 1
}

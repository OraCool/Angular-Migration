<#
.SYNOPSIS
    Validates the Angular build.

.DESCRIPTION
    Runs the Angular build process and validates it completes successfully.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER Configuration
    Build configuration (production or development).

.EXAMPLE
    .\validate-build.ps1

.EXAMPLE
    .\validate-build.ps1 -ProjectPath "C:\MyProject" -Configuration production
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [ValidateSet('production', 'development')]
    [string]$Configuration = 'production'
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "Validation.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Build Validation" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$result = Invoke-BuildValidation -ProjectPath $ProjectPath -Configuration $Configuration

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($result.Success) {
    Write-Host "  ✅ Build: PASSED" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 0
}
else {
    Write-Host "  ❌ Build: FAILED" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-ErrorMessage "Build failed with errors:"
    foreach ($error in $result.Errors) {
        Write-Host "  $error" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
}

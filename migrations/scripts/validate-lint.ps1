<#
.SYNOPSIS
    Validates linting.

.DESCRIPTION
    Runs ESLint validation and optionally fixes issues.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER Fix
    Automatically fix linting errors.

.EXAMPLE
    .\validate-lint.ps1

.EXAMPLE
    .\validate-lint.ps1 -ProjectPath "C:\MyProject" -Fix
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [switch]$Fix = $false
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "Validation.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Lint Validation$(if ($Fix) { ' (Auto-Fix Enabled)' })" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$result = Invoke-LintValidation -ProjectPath $ProjectPath -Fix:$Fix

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($result.Success) {
    Write-Host "  ✅ Lint: PASSED" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 0
}
else {
    Write-Host "  ⚠️  Lint: ISSUES FOUND" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    if ($result.Errors.Count -gt 0) {
        Write-ErrorMessage "Errors found: $($result.Errors.Count)"
    }

    if ($result.Warnings.Count -gt 0) {
        Write-WarningMessage "Warnings found: $($result.Warnings.Count)"
    }

    if (-not $Fix) {
        Write-Host ""
        Write-InfoMessage "Run with -Fix to automatically fix issues:"
        Write-InfoMessage "  .\validate-lint.ps1 -Fix"
    }

    Write-Host ""
    exit 1
}

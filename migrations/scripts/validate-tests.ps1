<#
.SYNOPSIS
    Validates Angular tests.

.DESCRIPTION
    Runs the Angular test suite and validates all tests pass.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.EXAMPLE
    .\validate-tests.ps1

.EXAMPLE
    .\validate-tests.ps1 -ProjectPath "C:\MyProject"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = "."
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "Validation.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Test Validation" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$result = Invoke-TestValidation -ProjectPath $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($result.Success) {
    Write-Host "  ✅ Tests: PASSED" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    exit 0
}
else {
    Write-Host "  ❌ Tests: FAILED" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-ErrorMessage "Tests failed:"
    foreach ($error in $result.Errors) {
        Write-Host "  $error" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
}

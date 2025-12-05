<#
.SYNOPSIS
    Migrates Angular project to version 20.

.DESCRIPTION
    Performs complete Angular 20 migration including package updates,
    breaking changes fixes, schematics, and validation.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER SkipInstall
    Skip removing node_modules and running npm install (uses existing dependencies).

.PARAMETER SkipTests
    Skip running tests after migration.

.PARAMETER SkipLint
    Skip running lint after migration.

.PARAMETER AutoCommit
    Automatically commit changes after successful migration.

.EXAMPLE
    .\migrate-to-v20.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\migrate-to-v20.ps1 -ProjectPath "C:\MyProject" -AutoCommit -SkipTests

.EXAMPLE
    .\migrate-to-v20.ps1 -ProjectPath "C:\MyProject" -SkipInstall

.NOTES
    Part of Angular Migration Toolkit
    Author: Angular Migration Toolkit

    This script can be used as a template for other version migrations.
    Simply copy and change the version number throughout.
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [switch]$SkipClean = $false,

    [Parameter(Mandatory = $false)]
    [switch]$KeepNodeModules = $false,

    [Parameter(Mandatory = $false)]
    [switch]$SkipInstall = $false,

    [Parameter(Mandatory = $false)]
    [switch]$SkipTests = $false,

    [Parameter(Mandatory = $false)]
    [switch]$SkipLint = $false,

    [Parameter(Mandatory = $false)]
    [switch]$AutoCommit = $false
)
$ErrorActionPreference = 'Stop'

# Import modules
$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "Migration.psm1") -Force

# Resolve project path
$ProjectPath = Resolve-Path $ProjectPath

# Display header
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Angular 20 Migration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-Host ""

# Confirm migration
Write-WarningMessage "This will migrate your project to Angular 20."
Write-WarningMessage "It is recommended to:"
Write-WarningMessage "  1. Commit all changes before migration"
Write-WarningMessage "  2. Create a backup of your project"
Write-WarningMessage "  3. Review breaking changes documentation"
Write-Host ""

$response = Read-Host "Do you want to continue? (y/N)"
if ($response -ne 'y') {
    Write-InfoMessage "Migration cancelled."
    exit 0
}

Write-Host ""

# Run migration
try {
    $result = Invoke-AngularMigration `
        -ProjectPath $ProjectPath `
        -TargetVersion "20" `
        -SkipClean:$SkipClean `
        -KeepNodeModules:$KeepNodeModules `
        -SkipInstall:$SkipInstall `
        -SkipTests:$SkipTests `
        -SkipLint:$SkipLint `
        -AutoCommit:$AutoCommit

    if ($result.Success) {
        Write-Host ""
        Write-Success "Migration to Angular 20 completed successfully!"
        Write-Host ""
        Write-InfoMessage "Next steps:"
        Write-InfoMessage "  1. Review the changes: git diff"
        Write-InfoMessage "  2. Test your application thoroughly"
        Write-InfoMessage "  3. Commit the changes: git add . && git commit -m 'chore: migrate to Angular 20'"
        Write-Host ""
        Write-InfoMessage "To continue migration:"
        Write-InfoMessage "  .\migrate-to-v17.ps1 -ProjectPath '$ProjectPath'"
        exit 0
    }
    else {
        Write-Host ""
        Write-ErrorMessage "Migration failed: $($result.Message)"
        Write-Host ""
        Write-InfoMessage "Troubleshooting:"
        Write-InfoMessage "  1. Review the error messages above"
        Write-InfoMessage "  2. Check migration documentation: migrations/docs/03-migrate-to-angular-20.md"
        Write-InfoMessage "  3. Restore from backup if needed: .\02-restore-backup.ps1"
        exit 1
    }
}
catch {
    Write-Host ""
    Write-ErrorMessage "Migration failed with error: $_"
    Write-Host ""
    Write-InfoMessage "Troubleshooting:"
    Write-InfoMessage "  1. Check the error message above"
    Write-InfoMessage "  2. Review migration documentation"
    Write-InfoMessage "  3. Restore from backup if needed"
    exit 1
}

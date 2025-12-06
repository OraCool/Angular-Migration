<#
.SYNOPSIS
    Migrates Angular project to version 21.

.DESCRIPTION
    Performs complete Angular 21 migration including package updates,
    breaking changes fixes, schematics, and validation.

    Key Angular 21 Changes:
    - Zoneless by default (requires explicit provideZoneChangeDetection if using Zone.js)
    - TypeScript 5.9+ required
    - NgModuleFactory removed
    - Router.lastSuccessfulNavigation is now a signal
    - ApplicationConfig import moved from @angular/platform-browser to @angular/core
    - UpgradeAdapter removed (use upgrade/static)
    - ignoreChangesOutsideZone removed
    - Router navigation timing changes
    - TestBed error handling changes

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
    .\migrate-to-v21.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\migrate-to-v21.ps1 -ProjectPath "C:\MyProject" -AutoCommit -SkipTests

.EXAMPLE
    .\migrate-to-v21.ps1 -ProjectPath "C:\MyProject" -SkipInstall

.NOTES
    Part of Angular Migration Toolkit
    Author: Angular Migration Toolkit
    Angular Version: 21 (Zoneless by Default)

    Important: Angular 21 is zoneless by default. If your application relies on
    Zone.js, the migration will automatically add provideZoneChangeDetection().
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
Write-Host "  Angular 21 Migration (Zoneless by Default)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-Host ""

# Confirm migration
Write-WarningMessage "This will migrate your project to Angular 21."
Write-WarningMessage "It is recommended to:"
Write-WarningMessage "  1. Commit all changes before migration"
Write-WarningMessage "  2. Create a backup of your project"
Write-WarningMessage "  3. Review breaking changes documentation"
Write-Host ""
Write-Host "  Key Changes in Angular 21:" -ForegroundColor Yellow
Write-Host "  • Zoneless by default (Zone.js support will be added if needed)" -ForegroundColor Yellow
Write-Host "  • TypeScript 5.9+ required" -ForegroundColor Yellow
Write-Host "  • NgModuleFactory removed" -ForegroundColor Yellow
Write-Host "  • Router.lastSuccessfulNavigation is now a signal" -ForegroundColor Yellow
Write-Host "  • UpgradeAdapter removed (use upgrade/static)" -ForegroundColor Yellow
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
        -TargetVersion "21" `
        -SkipClean:$SkipClean `
        -KeepNodeModules:$KeepNodeModules `
        -SkipInstall:$SkipInstall `
        -SkipTests:$SkipTests `
        -SkipLint:$SkipLint `
        -AutoCommit:$AutoCommit

    if ($result.Success) {
        Write-Host ""
        Write-Success "Migration to Angular 21 completed successfully!"
        Write-Host ""
        Write-InfoMessage "Next steps:"
        Write-InfoMessage "  1. Review the changes: git diff"
        Write-InfoMessage "  2. Check if provideZoneChangeDetection() was added (if using Zone.js)"
        Write-InfoMessage "  3. Test your application thoroughly"
        Write-InfoMessage "  4. Review zoneless migration guidance: migrations/docs/08-migrate-to-angular-21.md"
        Write-InfoMessage "  5. Commit the changes: git add . && git commit -m 'chore: migrate to Angular 21'"
        Write-Host ""
        Write-InfoMessage "Angular 21 New Features:"
        Write-InfoMessage "  • Zoneless by default - better performance"
        Write-InfoMessage "  • Signal Forms - reactive forms with signals"
        Write-InfoMessage "  • Vitest as default testing framework"
        Write-InfoMessage "  • AI-first tooling enhancements"
        exit 0
    }
    else {
        Write-Host ""
        Write-ErrorMessage "Migration failed: $($result.Message)"
        Write-Host ""
        Write-InfoMessage "Troubleshooting:"
        Write-InfoMessage "  1. Review the error messages above"
        Write-InfoMessage "  2. Check migration documentation: migrations/docs/08-migrate-to-angular-21.md"
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

<#
.SYNOPSIS
    Migrates Angular application to standalone components architecture.

.DESCRIPTION
    Converts NgModule-based Angular application to use standalone components.
    This is a recommended architectural pattern introduced in Angular 14+ and
    the default approach in Angular 15+.

    Migration Steps:
    1. Convert components to standalone
    2. Move imports from NgModule to component decorators
    3. Update routing to use standalone components
    4. Convert bootstrap to standalone
    5. Remove unnecessary NgModules

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER TargetScope
    Scope of migration: 'all', 'feature', 'component'
    - 'all': Migrate entire application to standalone
    - 'feature': Migrate specific feature module
    - 'component': Migrate specific component only

.PARAMETER ModuleName
    Name of the feature module to migrate (when TargetScope='feature').

.PARAMETER ComponentPath
    Path to component to migrate (when TargetScope='component').

.PARAMETER DryRun
    Preview changes without applying them.

.PARAMETER SkipTests
    Skip running tests after migration.

.PARAMETER AutoCommit
    Automatically commit changes after successful migration.

.EXAMPLE
    .\migrate-to-standalone.ps1 -ProjectPath "C:\MyProject" -TargetScope all

.EXAMPLE
    .\migrate-to-standalone.ps1 -TargetScope feature -ModuleName "UserModule"

.EXAMPLE
    .\migrate-to-standalone.ps1 -TargetScope component -ComponentPath "src/app/user/user.component.ts"

.NOTES
    Part of Angular Migration Toolkit
    Author: Angular Migration Toolkit

    Prerequisites:
    - Angular 14+ (standalone components support)
    - All dependencies must be Ivy-compatible

    References:
    - https://angular.io/guide/standalone-components
    - https://angular.io/guide/standalone-migration
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [ValidateSet("all", "feature", "component")]
    [string]$TargetScope = "all",

    [Parameter(Mandatory = $false)]
    [string]$ModuleName,

    [Parameter(Mandatory = $false)]
    [string]$ComponentPath,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun = $false,

    [Parameter(Mandatory = $false)]
    [switch]$SkipTests = $false,

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
Write-Host "  Standalone Components Migration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-InfoMessage "Scope: $TargetScope"
if ($DryRun) {
    Write-WarningMessage "DRY RUN MODE - No changes will be applied"
}
Write-Host ""

# Validate parameters
if ($TargetScope -eq "feature" -and -not $ModuleName) {
    Write-ErrorMessage "ModuleName is required when TargetScope is 'feature'"
    exit 1
}

if ($TargetScope -eq "component" -and -not $ComponentPath) {
    Write-ErrorMessage "ComponentPath is required when TargetScope is 'component'"
    exit 1
}

# Confirm migration
Write-WarningMessage "This will migrate your application to standalone components."
Write-WarningMessage "It is recommended to:"
Write-WarningMessage "  1. Commit all changes before migration"
Write-WarningMessage "  2. Create a backup of your project"
Write-WarningMessage "  3. Review Angular standalone components guide"
Write-Host ""

if (-not $DryRun) {
    $response = Read-Host "Do you want to continue? (y/N)"
    if ($response -ne 'y') {
        Write-InfoMessage "Migration cancelled."
        exit 0
    }
}

Write-Host ""

# Run migration
try {
    $startTime = Get-Date

    Write-InfoMessage "═══════════════════════════════════════════════════════"
    Write-InfoMessage "  Standalone Components Migration"
    Write-InfoMessage "═══════════════════════════════════════════════════════"

    # TODO: Implement migration logic based on TargetScope
    switch ($TargetScope) {
        "all" {
            Write-InfoMessage "`nMigrating entire application to standalone..."
            Write-WarningMessage "Full application migration - Implementation pending"
            Write-InfoMessage "This will:"
            Write-InfoMessage "  1. Convert all components to standalone"
            Write-InfoMessage "  2. Update all imports and dependencies"
            Write-InfoMessage "  3. Convert routing to standalone"
            Write-InfoMessage "  4. Update bootstrap configuration"
            Write-InfoMessage "  5. Remove unnecessary NgModules"
        }
        "feature" {
            Write-InfoMessage "`nMigrating feature module: $ModuleName..."
            Write-WarningMessage "Feature module migration - Implementation pending"
            Write-InfoMessage "This will:"
            Write-InfoMessage "  1. Convert all components in $ModuleName to standalone"
            Write-InfoMessage "  2. Update module imports"
            Write-InfoMessage "  3. Update routing if applicable"
        }
        "component" {
            Write-InfoMessage "`nMigrating component: $ComponentPath..."
            Write-WarningMessage "Single component migration - Implementation pending"
            Write-InfoMessage "This will:"
            Write-InfoMessage "  1. Add standalone: true to component decorator"
            Write-InfoMessage "  2. Move required imports to component"
            Write-InfoMessage "  3. Remove component from NgModule declarations"
        }
    }

    $duration = (Get-Date) - $startTime

    Write-Host ""
    Write-InfoMessage "═══════════════════════════════════════════════════════"
    Write-WarningMessage "Migration script created but implementation is pending"
    Write-InfoMessage "Duration: $($duration.ToString('mm\:ss'))"
    Write-InfoMessage "═══════════════════════════════════════════════════════"
    Write-Host ""

    Write-InfoMessage "Next steps:"
    Write-InfoMessage "  1. Use Angular CLI schematics: ng generate @angular/core:standalone"
    Write-InfoMessage "  2. Manually convert components using this guide:"
    Write-InfoMessage "     https://angular.io/guide/standalone-migration"
    Write-InfoMessage "  3. Review and test each migration step"
    Write-Host ""

    exit 0
}
catch {
    $duration = (Get-Date) - $startTime

    Write-Host ""
    Write-ErrorMessage "Migration failed with error: $_"
    Write-InfoMessage "Duration: $($duration.ToString('mm\:ss'))"
    Write-Host ""
    Write-InfoMessage "Troubleshooting:"
    Write-InfoMessage "  1. Check the error message above"
    Write-InfoMessage "  2. Review Angular standalone migration guide"
    Write-InfoMessage "  3. Restore from backup if needed"
    exit 1
}

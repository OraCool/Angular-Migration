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
    Write-Host ""

    # Save current directory and change to project directory
    $originalLocation = Get-Location
    Set-Location $ProjectPath

    $migrationSuccess = $true
    $changes = @()

    try {
        switch ($TargetScope) {
            "all" {
                Write-InfoMessage "Step 1/3: Converting components, directives, and pipes to standalone..."
                $convertCmd = if ($DryRun) {
                    "ng generate @angular/core:standalone --dry-run"
                } else {
                    "ng generate @angular/core:standalone"
                }

                $convertOutput = Invoke-Expression $convertCmd 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-ErrorMessage "Failed to convert to standalone: $convertOutput"
                    $migrationSuccess = $false
                } else {
                    Write-Success "✓ Converted components to standalone"
                    $changes += "Converted components, directives, and pipes to standalone"
                }

                if ($migrationSuccess) {
                    Write-Host ""
                    Write-InfoMessage "Step 2/3: Removing unnecessary NgModules..."
                    $pruneCmd = if ($DryRun) {
                        "ng generate @angular/core:standalone --mode=prune-ng-modules --dry-run"
                    } else {
                        "ng generate @angular/core:standalone --mode=prune-ng-modules"
                    }

                    $pruneOutput = Invoke-Expression $pruneCmd 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        Write-WarningMessage "Failed to prune NgModules (this may be expected): $pruneOutput"
                    } else {
                        Write-Success "✓ Removed unnecessary NgModules"
                        $changes += "Pruned unnecessary NgModules"
                    }
                }

                if ($migrationSuccess) {
                    Write-Host ""
                    Write-InfoMessage "Step 3/3: Converting bootstrap to standalone..."
                    $bootstrapCmd = if ($DryRun) {
                        "ng generate @angular/core:standalone --mode=standalone-bootstrap --dry-run"
                    } else {
                        "ng generate @angular/core:standalone --mode=standalone-bootstrap"
                    }

                    $bootstrapOutput = Invoke-Expression $bootstrapCmd 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        Write-WarningMessage "Failed to convert bootstrap (this may be expected): $bootstrapOutput"
                    } else {
                        Write-Success "✓ Converted to standalone bootstrap"
                        $changes += "Converted bootstrap to standalone"
                    }
                }
            }
            "feature" {
                Write-InfoMessage "Migrating feature module: $ModuleName..."
                $featureCmd = if ($DryRun) {
                    "ng generate @angular/core:standalone --mode=convert-to-standalone --path=$ModuleName --dry-run"
                } else {
                    "ng generate @angular/core:standalone --mode=convert-to-standalone --path=$ModuleName"
                }

                $featureOutput = Invoke-Expression $featureCmd 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-ErrorMessage "Failed to migrate feature module: $featureOutput"
                    $migrationSuccess = $false
                } else {
                    Write-Success "✓ Migrated feature module: $ModuleName"
                    $changes += "Migrated feature module: $ModuleName"
                }
            }
            "component" {
                Write-InfoMessage "Migrating component: $ComponentPath..."
                $componentCmd = if ($DryRun) {
                    "ng generate @angular/core:standalone --mode=convert-to-standalone --path=$ComponentPath --dry-run"
                } else {
                    "ng generate @angular/core:standalone --mode=convert-to-standalone --path=$ComponentPath"
                }

                $componentOutput = Invoke-Expression $componentCmd 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-ErrorMessage "Failed to migrate component: $componentOutput"
                    $migrationSuccess = $false
                } else {
                    Write-Success "✓ Migrated component: $ComponentPath"
                    $changes += "Migrated component: $ComponentPath"
                }
            }
        }

        # Restore original directory
        Set-Location $originalLocation

        if (-not $migrationSuccess) {
            throw "Standalone migration failed"
        }

        # Run tests if not skipped
        if (-not $SkipTests -and -not $DryRun) {
            Write-Host ""
            Write-InfoMessage "Running tests..."
            Set-Location $ProjectPath

            $testOutput = & npm test 2>&1
            Set-Location $originalLocation

            if ($LASTEXITCODE -ne 0) {
                Write-WarningMessage "Tests failed. Please review and fix."
            } else {
                Write-Success "✓ Tests passed"
            }
        }

        # Auto commit if requested
        if ($AutoCommit -and -not $DryRun) {
            Write-Host ""
            Write-InfoMessage "Committing changes..."
            Set-Location $ProjectPath

            & git add . 2>&1 | Out-Null
            & git commit -m "chore: migrate to standalone components" 2>&1 | Out-Null

            Set-Location $originalLocation

            if ($LASTEXITCODE -eq 0) {
                Write-Success "✓ Changes committed"
            }
        }

        $duration = (Get-Date) - $startTime

        Write-Host ""
        Write-InfoMessage "═══════════════════════════════════════════════════════"
        Write-Success "Standalone migration completed successfully!"
        Write-InfoMessage "Duration: $($duration.ToString('mm\:ss'))"
        Write-InfoMessage "═══════════════════════════════════════════════════════"
        Write-Host ""

        if ($changes.Count -gt 0) {
            Write-InfoMessage "Changes applied:"
            foreach ($change in $changes) {
                Write-InfoMessage "  ✓ $change"
            }
            Write-Host ""
        }

        Write-InfoMessage "Next steps:"
        Write-InfoMessage "  1. Review the changes: git diff"
        Write-InfoMessage "  2. Test your application thoroughly"
        Write-InfoMessage "  3. Update any custom code that references NgModules"
        Write-Host ""

        exit 0
    }
    catch {
        # Restore original directory in case of error
        Set-Location $originalLocation
        throw
    }
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

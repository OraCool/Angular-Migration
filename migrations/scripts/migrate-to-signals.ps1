<#
.SYNOPSIS
    Migrates Angular components to use signal-based APIs.

.DESCRIPTION
    Converts Angular components to use modern signal-based reactive state:
    - Component properties → signal()
    - Computed properties (getters) → computed()
    - @Input decorators → input() / input.required()
    - @Output decorators → output()
    - Two-way bindings → model()
    - Template updates for signal getters

    Prerequisites:
    - Angular version 16+ (signals introduced in v16, stable in v17+)
    - Components must be standalone
    - Components must use OnPush change detection

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER TargetScope
    Scope of migration:
    - 'all': Migrate all components in the project
    - 'feature': Migrate components in a specific feature directory
    - 'component': Migrate a single component

.PARAMETER ComponentPath
    Path to specific component to migrate (when TargetScope='component').

.PARAMETER FeaturePath
    Path to feature directory (when TargetScope='feature').

.PARAMETER DryRun
    Preview changes without applying them.

.PARAMETER SkipTests
    Skip running tests after migration.

.PARAMETER AutoCommit
    Automatically commit changes after successful migration.

.EXAMPLE
    .\migrate-to-signals.ps1 -ProjectPath "C:\MyProject" -TargetScope all

.EXAMPLE
    .\migrate-to-signals.ps1 -TargetScope feature -FeaturePath "src/app/dashboard"

.EXAMPLE
    .\migrate-to-signals.ps1 -TargetScope component -ComponentPath "src/app/user/user.component.ts"

.EXAMPLE
    .\migrate-to-signals.ps1 -TargetScope all -DryRun

.NOTES
    Part of Angular Migration Toolkit
    Author: Angular Migration Toolkit

    Prerequisites:
    - Angular 16+ (signals support)
    - Components must be standalone (run migrate-to-standalone.ps1 first)
    - Components should use OnPush change detection

    References:
    - https://angular.io/guide/signals
    - https://angular.io/api/core/signal
    - https://angular.io/api/core/input
    - https://angular.io/api/core/output
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [ValidateSet("all", "feature", "component")]
    [string]$TargetScope = "all",

    [Parameter(Mandatory = $false)]
    [string]$ComponentPath,

    [Parameter(Mandatory = $false)]
    [string]$FeaturePath,

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
Import-Module (Join-Path $ModulesPath "SignalsMigration.psm1") -Force

# Resolve project path
$ProjectPath = Resolve-Path $ProjectPath

# Display header
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Signal-Based Components Migration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-InfoMessage "Scope: $TargetScope"
if ($DryRun) {
    Write-WarningMessage "DRY RUN MODE - No changes will be applied"
}
Write-Host ""

# Validate parameters
if ($TargetScope -eq "component" -and -not $ComponentPath) {
    Write-ErrorMessage "ComponentPath is required when TargetScope is 'component'"
    exit 1
}

if ($TargetScope -eq "feature" -and -not $FeaturePath) {
    Write-ErrorMessage "FeaturePath is required when TargetScope is 'feature'"
    exit 1
}

# Run migration
try {
    $startTime = Get-Date

    # Step 1: Validate prerequisites
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-InfoMessage "Step 1: Validating Prerequisites"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    $prereqResult = Test-SignalsMigrationPrerequisites -ProjectPath $ProjectPath

    if (-not $prereqResult.Success) {
        foreach ($error in $prereqResult.Errors) {
            Write-ErrorMessage "  ❌ $error"
        }
        Write-Host ""
        Write-ErrorMessage "Prerequisites not met. Please fix errors and try again."
        exit 1
    }

    Write-Success "  ✅ Angular version: $($prereqResult.AngularVersion)"

    # Display warnings for non-compliant components
    if ($prereqResult.NonStandaloneComponents.Count -gt 0) {
        Write-Host ""
        Write-WarningMessage "  ⚠️  Non-standalone components found:"
        Write-WarningMessage "     Run migrate-to-standalone.ps1 first to convert these components"
        Write-Host ""

        if ($TargetScope -eq "all") {
            Write-ErrorMessage "Cannot migrate all components - some are not standalone"
            Write-InfoMessage "Run: .\migrate-to-standalone.ps1 -TargetScope all"
            exit 1
        }
    }

    if ($prereqResult.NonOnPushComponents.Count -gt 0) {
        Write-Host ""
        Write-WarningMessage "  ⚠️  Components without OnPush change detection found:"
        Write-WarningMessage "     Signals work best with OnPush. Consider updating changeDetection first"
        Write-Host ""

        if (-not $DryRun) {
            $response = Read-Host "Continue anyway? (y/N)"
            if ($response -ne 'y') {
                Write-InfoMessage "Migration cancelled."
                exit 0
            }
        }
    }

    # Step 2: Discover components to migrate
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-InfoMessage "Step 2: Discovering Components"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    $componentsToMigrate = @()

    switch ($TargetScope) {
        "all" {
            Write-InfoMessage "Discovering all components in project..."
            $componentsToMigrate = Get-ChildItem -Path $ProjectPath -Recurse -Filter "*.component.ts" -File |
            Where-Object {
                $_.FullName -notmatch 'node_modules' -and
                $_.FullName -notmatch 'dist' -and
                $_.FullName -notmatch '.angular'
            } |
            Select-Object -ExpandProperty FullName
        }
        "feature" {
            Write-InfoMessage "Discovering components in feature: $FeaturePath"
            $fullFeaturePath = Join-Path $ProjectPath $FeaturePath
            $componentsToMigrate = Get-ChildItem -Path $fullFeaturePath -Recurse -Filter "*.component.ts" -File |
            Select-Object -ExpandProperty FullName
        }
        "component" {
            Write-InfoMessage "Migrating single component: $ComponentPath"
            $fullComponentPath = Join-Path $ProjectPath $ComponentPath
            if (Test-Path $fullComponentPath) {
                $componentsToMigrate = @($fullComponentPath)
            }
            else {
                Write-ErrorMessage "Component not found: $fullComponentPath"
                exit 1
            }
        }
    }

    Write-InfoMessage "Found $($componentsToMigrate.Count) components to migrate"
    Write-Host ""

    if ($componentsToMigrate.Count -eq 0) {
        Write-WarningMessage "No components found to migrate"
        exit 0
    }

    # Confirm migration
    if (-not $DryRun) {
        Write-WarningMessage "This will migrate $($componentsToMigrate.Count) component(s) to use signals."
        Write-WarningMessage "It is recommended to:"
        Write-WarningMessage "  1. Commit all changes before migration"
        Write-WarningMessage "  2. Create a backup of your project"
        Write-WarningMessage "  3. Review the signals guide: https://angular.io/guide/signals"
        Write-Host ""
        $response = Read-Host "Do you want to continue? (y/N)"
        if ($response -ne 'y') {
            Write-InfoMessage "Migration cancelled."
            exit 0
        }
    }

    # Step 3: Migrate components
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-InfoMessage "Step 3: Migrating Components"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    $migrationResults = @{
        TotalComponents     = $componentsToMigrate.Count
        SuccessCount        = 0
        FailedCount         = 0
        TotalProperties     = 0
        TotalGetters        = 0
        TotalInputs         = 0
        TotalOutputs        = 0
        TotalModels         = 0
        TotalTemplateUpdates = 0
        AllChanges          = @()
        AllWarnings         = @()
        AllErrors           = @()
    }

    foreach ($componentPath in $componentsToMigrate) {
        $componentName = Split-Path $componentPath -Leaf
        Write-InfoMessage "Processing: $componentName"

        try {
            # Convert properties to signals
            $propResult = Convert-PropertyToSignal -ComponentPath $componentPath -DryRun:$DryRun
            $migrationResults.TotalProperties += $propResult.ConvertedProperties.Count
            $migrationResults.AllChanges += $propResult.Changes
            $migrationResults.AllWarnings += $propResult.Warnings
            $migrationResults.AllErrors += $propResult.Errors

            $allSignalProperties = $propResult.ConvertedProperties

            # Convert getters to computed
            $computedResult = Convert-ComputedProperties -ComponentPath $componentPath -DryRun:$DryRun
            $migrationResults.TotalGetters += $computedResult.ConvertedGetters.Count
            $migrationResults.AllChanges += $computedResult.Changes
            $migrationResults.AllWarnings += $computedResult.Warnings
            $migrationResults.AllErrors += $computedResult.Errors

            $allSignalProperties += $computedResult.ConvertedGetters

            # Convert @Input/@Output to signals
            $ioResult = Convert-InputOutputToSignals -ComponentPath $componentPath -DryRun:$DryRun
            $migrationResults.TotalInputs += $ioResult.ConvertedInputs.Count
            $migrationResults.TotalOutputs += $ioResult.ConvertedOutputs.Count
            $migrationResults.TotalModels += $ioResult.ConvertedModels.Count
            $migrationResults.AllChanges += $ioResult.Changes
            $migrationResults.AllWarnings += $ioResult.Warnings
            $migrationResults.AllErrors += $ioResult.Errors

            $allSignalProperties += $ioResult.ConvertedInputs
            $allSignalProperties += $ioResult.ConvertedModels

            # Update template
            if ($allSignalProperties.Count -gt 0) {
                $templateResult = Update-ComponentTemplate -ComponentPath $componentPath -SignalProperties $allSignalProperties -DryRun:$DryRun
                $migrationResults.TotalTemplateUpdates += $templateResult.TemplateUpdates
                $migrationResults.AllChanges += $templateResult.Changes
                $migrationResults.AllWarnings += $templateResult.Warnings
                $migrationResults.AllErrors += $templateResult.Errors

                # Update tests
                $testResult = Update-ComponentTests -ComponentPath $componentPath -SignalProperties $allSignalProperties -DryRun:$DryRun
                $migrationResults.AllChanges += $testResult.Changes
                $migrationResults.AllWarnings += $testResult.Warnings
                $migrationResults.AllErrors += $testResult.Errors
            }

            $migrationResults.SuccessCount++
            Write-Host ""
        }
        catch {
            $migrationResults.FailedCount++
            $migrationResults.AllErrors += $_.Exception.Message
            Write-ErrorMessage "  ❌ Failed to migrate: $_"
            Write-Host ""
        }
    }

    # Step 4: Display summary
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-InfoMessage "Migration Summary"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    Write-InfoMessage "Components:"
    Write-InfoMessage "  Total: $($migrationResults.TotalComponents)"
    Write-Success "  ✅ Successful: $($migrationResults.SuccessCount)"
    if ($migrationResults.FailedCount -gt 0) {
        Write-ErrorMessage "  ❌ Failed: $($migrationResults.FailedCount)"
    }
    Write-Host ""

    Write-InfoMessage "Conversions:"
    Write-InfoMessage "  Properties → signal(): $($migrationResults.TotalProperties)"
    Write-InfoMessage "  Getters → computed(): $($migrationResults.TotalGetters)"
    Write-InfoMessage "  @Input → input(): $($migrationResults.TotalInputs)"
    Write-InfoMessage "  @Output → output(): $($migrationResults.TotalOutputs)"
    Write-InfoMessage "  Two-way → model(): $($migrationResults.TotalModels)"
    Write-InfoMessage "  Template updates: $($migrationResults.TotalTemplateUpdates)"
    Write-Host ""

    if ($migrationResults.AllWarnings.Count -gt 0) {
        Write-WarningMessage "Warnings:"
        foreach ($warning in ($migrationResults.AllWarnings | Select-Object -Unique)) {
            Write-WarningMessage "  ⚠️  $warning"
        }
        Write-Host ""
    }

    if ($migrationResults.AllErrors.Count -gt 0) {
        Write-ErrorMessage "Errors:"
        foreach ($error in ($migrationResults.AllErrors | Select-Object -Unique)) {
            Write-ErrorMessage "  ❌ $error"
        }
        Write-Host ""
    }

    # Step 5: Run tests (if not skipped and not dry run)
    if (-not $SkipTests -and -not $DryRun) {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-InfoMessage "Step 5: Running Tests"
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""

        Write-InfoMessage "Building project..."
        $buildResult = & npm run build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "Build failed. Please fix errors before committing."
            Write-Host $buildResult
        }
        else {
            Write-Success "  ✅ Build successful"

            Write-InfoMessage "Running tests..."
            $testResult = & npm test -- --watch=false 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-WarningMessage "Some tests failed. Review and fix before committing."
            }
            else {
                Write-Success "  ✅ All tests passed"
            }
        }
    }

    # Step 6: Auto-commit (if requested and successful)
    if ($AutoCommit -and -not $DryRun -and $migrationResults.FailedCount -eq 0) {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-InfoMessage "Step 6: Committing Changes"
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""

        $commitMessage = "refactor: migrate to signal-based components

- Converted $($migrationResults.TotalProperties) properties to signal()
- Converted $($migrationResults.TotalGetters) getters to computed()
- Converted $($migrationResults.TotalInputs) @Input to input()
- Converted $($migrationResults.TotalOutputs) @Output to output()
- Converted $($migrationResults.TotalModels) two-way bindings to model()
- Updated templates and tests for signal APIs

Migration performed by Angular Migration Toolkit"

        git add .
        git commit -m $commitMessage
        Write-Success "  ✅ Changes committed"
    }

    $duration = (Get-Date) - $startTime

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    if ($DryRun) {
        Write-InfoMessage "Migration Preview Complete"
    }
    else {
        Write-Success "Migration Complete!"
    }
    Write-InfoMessage "Duration: $($duration.ToString('mm\:ss'))"
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    if ($DryRun) {
        Write-InfoMessage "This was a dry run. No changes were applied."
        Write-InfoMessage "Run without -DryRun to apply changes."
    }
    else {
        Write-InfoMessage "Next steps:"
        Write-InfoMessage "  1. Review the changes in your editor"
        Write-InfoMessage "  2. Test your application thoroughly"
        Write-InfoMessage "  3. Commit changes if not auto-committed"
        Write-InfoMessage "  4. Read signals guide: https://angular.io/guide/signals"
    }
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
    Write-InfoMessage "  2. Review signals migration guide"
    Write-InfoMessage "  3. Restore from backup if needed"
    exit 1
}

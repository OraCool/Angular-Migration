<#
.SYNOPSIS
    Runs all Angular 15 automated breaking change fixes.

.DESCRIPTION
    Orchestrator script that runs all individual fix scripts in the correct order:
    1. TypeScript target → ES2022
    2. Router relativeLinkResolution removal
    3. Material Chips migration
    4. Material Form Field updateOutlineGap() removal
    5. ag-Grid imports update
    6. Material Slider diagnostic (manual migration required)

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER DryRun
    Preview all changes without applying them.

.PARAMETER SkipSliderDiagnostic
    Skip the Material Slider diagnostic report.

.EXAMPLE
    .\run-all-v15-fixes.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\run-all-v15-fixes.ps1 -DryRun

.EXAMPLE
    .\run-all-v15-fixes.ps1 -SkipSliderDiagnostic

.NOTES
    Version: 1.0.0
    Related: Angular 15 Migration
    Orchestrates: All v15 automated breaking change fixes
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [switch]$DryRun = $false,

    [Parameter(Mandatory = $false)]
    [switch]$SkipSliderDiagnostic = $false
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "..\modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath
$FixesPath = $PSScriptRoot

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Angular 15 Automated Fixes (All)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-InfoMessage "Fixes Directory: $FixesPath"
if ($DryRun) {
    Write-WarningMessage "DRY RUN MODE - No changes will be applied"
}
Write-Host ""

$totalFixes = 0
$successfulFixes = 0
$failedFixes = 0
$fixResults = @{}

# Helper function to run a fix script
function Invoke-FixScript {
    param(
        [string]$ScriptName,
        [string]$DisplayName
    )

    $script:totalFixes++

    Write-Host ""
    Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Running: $DisplayName" -ForegroundColor Cyan
    Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""

    $scriptPath = Join-Path $FixesPath $ScriptName

    if (-not (Test-Path $scriptPath)) {
        Write-WarningMessage "Script not found: $ScriptName"
        $fixResults[$DisplayName] = "Skipped (script not found)"
        return
    }

    try {
        $params = @{
            ProjectPath = $ProjectPath
        }

        if ($DryRun) {
            $params.DryRun = $true
        }

        & $scriptPath @params

        if ($LASTEXITCODE -eq 0) {
            $script:successfulFixes++
            $fixResults[$DisplayName] = "✅ Success"
        }
        else {
            $script:failedFixes++
            $fixResults[$DisplayName] = "⚠️ Completed with warnings"
        }
    }
    catch {
        $script:failedFixes++
        $fixResults[$DisplayName] = "❌ Failed: $_"
        Write-ErrorMessage "Failed to run $DisplayName : $_"
    }
}

# Run all fixes in order
try {
    Write-InfoMessage "Starting automated fixes..."
    Write-InfoMessage "This will run all Angular 15 breaking change fixes"
    Write-Host ""

    # Fix 1: TypeScript Target
    Invoke-FixScript -ScriptName "fix-typescript-target.ps1" -DisplayName "TypeScript Target (ES2022)"

    # Fix 2: Router Config
    Invoke-FixScript -ScriptName "fix-router-config.ps1" -DisplayName "Router relativeLinkResolution"

    # Fix 3: Material Chips
    Invoke-FixScript -ScriptName "fix-material-chips.ps1" -DisplayName "Material Chips API"

    # Fix 4: Material Form Field
    Invoke-FixScript -ScriptName "fix-material-form-field.ps1" -DisplayName "Material Form Field updateOutlineGap()"

    # Fix 5: ag-Grid Imports
    Invoke-FixScript -ScriptName "fix-ag-grid-imports.ps1" -DisplayName "ag-Grid Import Paths"

    # Diagnostic: Material Slider (optional)
    if (-not $SkipSliderDiagnostic) {
        Write-Host ""
        Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  Running: Material Slider Diagnostic" -ForegroundColor Cyan
        Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host ""

        $sliderScriptPath = Join-Path $FixesPath "diagnose-material-slider.ps1"

        if (Test-Path $sliderScriptPath) {
            try {
                $reportFile = "material-slider-migration-report.md"
                & $sliderScriptPath -ProjectPath $ProjectPath -OutputReport $reportFile
                $fixResults["Material Slider Diagnostic"] = "ℹ️ Report generated: $reportFile"
            }
            catch {
                Write-WarningMessage "Failed to run Material Slider diagnostic: $_"
                $fixResults["Material Slider Diagnostic"] = "⚠️ Failed to generate report"
            }
        }
    }

    # Summary
    Write-Host ""
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Migration Summary" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    Write-InfoMessage "Total fixes attempted: $totalFixes"
    Write-Host "  Successful: $successfulFixes" -ForegroundColor Green
    if ($failedFixes -gt 0) {
        Write-Host "  Failed/Warnings: $failedFixes" -ForegroundColor Yellow
    }
    Write-Host ""

    Write-InfoMessage "Fix Results:"
    foreach ($fix in $fixResults.GetEnumerator()) {
        $resultColor = if ($fix.Value -match "✅") { "Green" }
                      elseif ($fix.Value -match "⚠️") { "Yellow" }
                      elseif ($fix.Value -match "❌") { "Red" }
                      else { "Cyan" }

        Write-Host "  $($fix.Key): " -NoNewline
        Write-Host $fix.Value -ForegroundColor $resultColor
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Next Steps" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    if ($DryRun) {
        Write-InfoMessage "This was a DRY RUN - no changes were applied"
        Write-InfoMessage "Run without -DryRun to apply the changes"
    }
    else {
        Write-InfoMessage "Automated fixes completed!"
        Write-Host ""
        Write-WarningMessage "⚠️  IMPORTANT: Manual Migration Still Required"
        Write-Host ""
        Write-Host "  1. Material Slider (if used):" -ForegroundColor Yellow
        Write-Host "     - Review: material-slider-migration-report.md" -ForegroundColor Yellow
        Write-Host "     - Manual HTML structure changes required" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  2. Material Theming (if customized):" -ForegroundColor Yellow
        Write-Host "     - Run: ng generate @angular/material:mdc-migration" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  3. ag-Grid API (if used):" -ForegroundColor Yellow
        Write-Host "     - Check for detailNode, RowNode usage" -ForegroundColor Yellow
        Write-Host "     - See: ag-grid.com/javascript-data-grid/upgrading-to-ag-grid-28/" -ForegroundColor Yellow
        Write-Host ""
        Write-InfoMessage "Build and test your application:"
        Write-Host "  npm run build" -ForegroundColor Gray
        Write-Host "  npm test" -ForegroundColor Gray
        Write-Host "  npm run lint" -ForegroundColor Gray
        Write-Host ""
        Write-InfoMessage "Documentation:"
        Write-Host "  migrations/docs/02-migrate-to-angular-15.md" -ForegroundColor Gray
        Write-Host "  migrations/docs/MISSING-V15-FIXES.md" -ForegroundColor Gray
    }

    Write-Host ""

    if ($failedFixes -gt 0) {
        Write-WarningMessage "Some fixes completed with warnings - review the output above"
        exit 1
    }
    else {
        Write-Success "All automated fixes completed successfully!"
        exit 0
    }
}
catch {
    Write-Host ""
    Write-ErrorMessage "Failed to run automated fixes: $_"
    exit 1
}

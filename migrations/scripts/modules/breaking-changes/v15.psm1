<#
.SYNOPSIS
    Angular 15 specific breaking changes fixes.

.DESCRIPTION
    Automates the following Angular 14 → 15 breaking changes using focused fix scripts:

    AUTOMATED FIXES:
    1. TypeScript target ES2020 → ES2022 in tsconfig files
    2. Router relativeLinkResolution property removal
    3. Material Chips API migration (mat-chip-list → mat-chip-set + properties)
    4. Material Form Field updateOutlineGap() removal
    5. ag-Grid stylesheet import paths update

    DIAGNOSTICS:
    - Material Slider usage analysis (manual migration required)

    MANUAL REVIEW WARNINGS:
    - Material Theming format (use Material schematics)
    - ag-Grid API changes (detailNode, IRowNode)
    - RxJS subscribe() syntax deprecation
    - ControlValueAccessor.setDisabledState requirement
    - Functional router guards recommendation

.PARAMETER ProjectPath
    Path to the Angular project root directory.

.RETURNS
    Hashtable with the following keys:
    - Success: Boolean indicating if fixes completed without errors
    - Message: Summary message
    - Changes: Array of applied changes
    - Warnings: Array of warnings for manual review
    - Errors: Array of errors encountered

.EXAMPLE
    Invoke-Angular15BreakingChanges -ProjectPath "C:\projects\my-app"

.NOTES
    Version: 2.0.0 (Modular)
    Author: Angular Migration Toolkit
    Angular Version: 15
    Related Docs: migrations/docs/02-migrate-to-angular-15.md
                  migrations/docs/MISSING-V15-FIXES.md

    Architecture: This module orchestrates individual fix scripts located in
                  migrations/scripts/fixes/ for better maintainability and reusability.
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 15 using modular fix scripts.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Invoke-Angular15BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 15 breaking change fixes (Modular)..."

    try {
        # Locate the fixes-v15 directory (in the same directory as this module)
        $FixesPath = Join-Path $PSScriptRoot "fixes-v15"

        if (-not (Test-Path $FixesPath)) {
            $warnings += "Fixes directory not found: $FixesPath"
            $warnings += "Expected location: migrations/scripts/modules/breaking-changes/fixes-v15/"

            # If fixes directory doesn't exist, provide minimal legacy support
            $warnings += "Please ensure the fixes-v15 directory exists with individual fix scripts"
            $warnings += "See: migrations/docs/MISSING-V15-FIXES.md for migration script details"

            return @{
                Success  = $true
                Message  = "Breaking changes check completed (legacy mode)"
                Changes  = @()
                Warnings = $warnings
                Errors   = @()
            }
        }

        # Helper function to run a fix script silently (non-interactive)
        function Invoke-SilentFixScript {
            param(
                [string]$ScriptPath,
                [string]$FixName
            )

            if (-not (Test-Path $ScriptPath)) {
                return @{
                    Success = $false
                    Message = "Script not found"
                    Changes = @()
                }
            }

            try {
                # Capture output by redirecting to null and checking exit code
                $result = & $ScriptPath -ProjectPath $ProjectPath 2>&1 | Out-String

                # Parse the output for change information
                $changeCount = 0
                if ($result -match "Files updated:\s+(\d+)") {
                    $changeCount = [int]$matches[1]
                }

                if ($LASTEXITCODE -eq 0 -and $changeCount -gt 0) {
                    return @{
                        Success = $true
                        Message = "$FixName completed"
                        Changes = @("$FixName: $changeCount file(s) updated")
                    }
                }
                elseif ($LASTEXITCODE -eq 0) {
                    return @{
                        Success = $true
                        Message = "$FixName: no changes needed"
                        Changes = @()
                    }
                }
                else {
                    return @{
                        Success = $false
                        Message = "$FixName failed"
                        Changes = @()
                    }
                }
            }
            catch {
                return @{
                    Success = $false
                    Message = "$FixName failed: $_"
                    Changes = @()
                }
            }
        }

        # ============================================================================
        # Run Individual Fix Scripts
        # ============================================================================

        Write-InfoMessage "Running modular fix scripts..."

        # Fix 1: TypeScript Target
        Write-InfoMessage "📝 Checking TypeScript target configuration..."
        $tsResult = Invoke-SilentFixScript `
            -ScriptPath (Join-Path $FixesPath "fix-typescript-target.ps1") `
            -FixName "TypeScript Target (ES2022)"

        if ($tsResult.Success) {
            $changes += $tsResult.Changes
            if ($tsResult.Changes.Count -gt 0) {
                Write-Success "  TypeScript target updated"
            }
            else {
                Write-InfoMessage "  TypeScript target already configured"
            }
        }
        else {
            $warnings += $tsResult.Message
        }

        # Fix 2: Router Config
        Write-InfoMessage "📝 Checking Router configuration..."
        $routerResult = Invoke-SilentFixScript `
            -ScriptPath (Join-Path $FixesPath "fix-router-config.ps1") `
            -FixName "Router relativeLinkResolution"

        if ($routerResult.Success) {
            $changes += $routerResult.Changes
            if ($routerResult.Changes.Count -gt 0) {
                Write-Success "  Router configuration updated"
            }
            else {
                Write-InfoMessage "  No router configuration changes needed"
            }
        }
        else {
            $warnings += $routerResult.Message
        }

        # Fix 3: Material Chips
        Write-InfoMessage "📝 Checking Material Chips usage..."
        $chipsResult = Invoke-SilentFixScript `
            -ScriptPath (Join-Path $FixesPath "fix-material-chips.ps1") `
            -FixName "Material Chips API"

        if ($chipsResult.Success) {
            $changes += $chipsResult.Changes
            if ($chipsResult.Changes.Count -gt 0) {
                Write-Success "  Material Chips migrated"
            }
            else {
                Write-InfoMessage "  No Material Chips found"
            }
        }
        else {
            $warnings += $chipsResult.Message
        }

        # Fix 4: Material Form Field
        Write-InfoMessage "📝 Checking Material Form Field usage..."
        $formFieldResult = Invoke-SilentFixScript `
            -ScriptPath (Join-Path $FixesPath "fix-material-form-field.ps1") `
            -FixName "Material Form Field updateOutlineGap()"

        if ($formFieldResult.Success) {
            $changes += $formFieldResult.Changes
            if ($formFieldResult.Changes.Count -gt 0) {
                Write-Success "  updateOutlineGap() calls removed"
            }
            else {
                Write-InfoMessage "  No updateOutlineGap() calls found"
            }
        }
        else {
            $warnings += $formFieldResult.Message
        }

        # Fix 5: ag-Grid Imports
        Write-InfoMessage "📝 Checking ag-Grid imports..."
        $agGridResult = Invoke-SilentFixScript `
            -ScriptPath (Join-Path $FixesPath "fix-ag-grid-imports.ps1") `
            -FixName "ag-Grid Import Paths"

        if ($agGridResult.Success) {
            $changes += $agGridResult.Changes
            if ($agGridResult.Changes.Count -gt 0) {
                Write-Success "  ag-Grid imports updated"
                $warnings += "ag-Grid API changes may require manual review (detailNode, IRowNode)"
            }
            else {
                Write-InfoMessage "  No ag-Grid imports found"
            }
        }
        else {
            $warnings += $agGridResult.Message
        }

        # ============================================================================
        # Manual Review Warnings
        # ============================================================================

        Write-InfoMessage "📝 Adding manual review warnings..."

        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 15 Breaking Changes - Manual Review Required"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""

        # CRITICAL: Material Slider
        $warnings += "⚠️  CRITICAL: Material Slider API Changed (Manual Migration Required)"
        $warnings += "   - Run diagnostic: migrations/scripts/fixes/diagnose-material-slider.ps1"
        $warnings += "   - See: migrations/docs/MISSING-V15-FIXES.md#3-material-slider"
        $warnings += ""

        # CRITICAL: Material Theming
        $warnings += "⚠️  CRITICAL: Material Theming Format Changed"
        $warnings += "   - Run: ng generate @angular/material:mdc-migration"
        $warnings += "   - See: migrations/docs/MISSING-V15-FIXES.md#6-material-theming"
        $warnings += ""

        # Standard warnings
        $warnings += "1. RxJS subscribe() syntax deprecated:"
        $warnings += "   - Old: .subscribe(data => {}, error => {}, () => {})"
        $warnings += "   - New: .subscribe({ next: data => {}, error: error => {}, complete: () => {} })"
        $warnings += ""
        $warnings += "2. ControlValueAccessor.setDisabledState() now required:"
        $warnings += "   - Search for: 'implements ControlValueAccessor'"
        $warnings += "   - Ensure each has: setDisabledState(isDisabled: boolean): void { }"
        $warnings += ""
        $warnings += "3. Build and test your application:"
        $warnings += "   - Run: npm run build"
        $warnings += "   - Run: npm test"
        $warnings += "   - Run: npm run lint"
        $warnings += ""
        $warnings += "4. Documentation:"
        $warnings += "   - Complete guide: migrations/docs/02-migrate-to-angular-15.md"
        $warnings += "   - Missing fixes: migrations/docs/MISSING-V15-FIXES.md"
        $warnings += "═══════════════════════════════════════════════════════════════════"

        # ============================================================================
        # Summary and Results
        # ============================================================================

        Write-Success "Angular 15 breaking changes processed successfully (Modular)"
        Write-InfoMessage "  Automated fixes applied: $($changes.Count)"

        if ($changes.Count -gt 0) {
            Write-InfoMessage "`n  Changes made:"
            foreach ($change in $changes) {
                Write-InfoMessage "    ✓ $change"
            }
        }

        if ($warnings.Count -gt 0) {
            Write-Host ""
            Write-WarningMessage "⚠️  Important: Please review the warnings above for manual fixes."
        }

        return @{
            Success  = $true
            Message  = "Angular 15 breaking changes processed (Modular: $($changes.Count) automated fix(es))"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        Write-ErrorMessage "Failed to apply Angular 15 breaking changes: $_"

        return @{
            Success  = $false
            Message  = "Failed to apply Angular 15 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

Export-ModuleMember -Function 'Invoke-Angular15BreakingChanges'

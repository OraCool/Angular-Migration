<#
.SYNOPSIS
    Angular 17 specific breaking changes fixes.

.DESCRIPTION
    Handles breaking changes introduced in Angular 17:
    - Auto-fix angular.json configuration (browserTarget → buildTarget)
    - Auto-fix Zone.js deep imports (zone.js/bundles → zone.js)
    - Detect and warn about Material MDC migration requirement
    - Warn about Router API removals (setupTestingRouter, malformedUriErrorHandler)
    - Warn about NgSwitch === equality change
    - Warn about Node.js 18.13+, TypeScript 5.2+, Zone.js 0.14+ requirements
    - Inform about optional migrations (control flow, application builder)

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Angular Version: 17
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$UtilitiesModule = Join-Path $PSScriptRoot "..\Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 17.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Invoke-Angular17BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 17 breaking change fixes..."

    try {
        $srcPath = Join-Path $ProjectPath "src"

        # ============================================================================
        # SECTION 1: Material MDC Migration Check (CRITICAL)
        # ============================================================================

        Write-InfoMessage "📝 Checking for Material MDC migration requirement..."

        $packageJsonPath = Join-Path $ProjectPath "package.json"
        $materialMdcCheckNeeded = $false

        if (Test-Path $packageJsonPath) {
            try {
                $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

                # Check if Angular Material is a dependency
                if ($packageJson.dependencies.'@angular/material' -or $packageJson.devDependencies.'@angular/material') {
                    $materialMdcCheckNeeded = $true

                    # Search for potential legacy Material component usage
                    $htmlFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.html')
                    $tsFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')

                    $legacyComponentPatterns = @(
                        'mat-form-field',
                        'mat-autocomplete',
                        'mat-checkbox',
                        'mat-chips',
                        'mat-dialog',
                        'mat-input',
                        'mat-list',
                        'mat-menu',
                        'mat-paginator',
                        'mat-progress-bar',
                        'mat-progress-spinner',
                        'mat-radio',
                        'mat-select',
                        'mat-slider',
                        'mat-slide-toggle',
                        'mat-snack-bar',
                        'mat-table',
                        'mat-tabs',
                        'mat-tooltip'
                    )

                    $legacyUsageCount = 0
                    foreach ($pattern in $legacyComponentPatterns) {
                        $htmlMatches = $htmlFiles | ForEach-Object {
                            $content = Get-Content $_ -Raw
                            if ($content -match $pattern) { 1 } else { 0 }
                        } | Measure-Object -Sum
                        $legacyUsageCount += $htmlMatches.Sum
                    }

                    if ($legacyUsageCount -gt 0) {
                        # CRITICAL: Legacy Material components detected
                        Write-Host ""
                        Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
                        Write-Host "  CRITICAL: Angular Material MDC Migration Required" -ForegroundColor Red
                        Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
                        Write-Host ""
                        Write-WarningMessage "Angular Material v17 has REMOVED all legacy (non-MDC) components."
                        Write-WarningMessage "Found $legacyUsageCount potential legacy component usage(s) in your code."
                        Write-Host ""
                        Write-InfoMessage "MDC migration MUST run before upgrading to Angular 17."
                        Write-InfoMessage "This schematic will update your components, templates, and styles."
                        Write-Host ""

                        # Prompt user to run MDC migration
                        $response = Read-Host "Run Material MDC migration now? (Y/n)"

                        if ($response -ne 'n' -and $response -ne 'N') {
                            Write-InfoMessage "Running Material MDC migration..."
                            Write-InfoMessage "Command: ng generate @angular/material:mdc-migration"
                            Write-Host ""

                            try {
                                # Save current directory and change to project directory
                                $originalLocation = Get-Location
                                Set-Location $ProjectPath

                                # Run the MDC migration schematic
                                $mdcOutput = & ng generate "@angular/material:mdc-migration" 2>&1

                                # Restore original directory
                                Set-Location $originalLocation

                                if ($LASTEXITCODE -eq 0) {
                                    Write-Success "MDC migration completed successfully!"
                                    Write-Host ""
                                    Write-InfoMessage "Changes made:"
                                    Write-InfoMessage "  - Updated Material component templates"
                                    Write-InfoMessage "  - Migrated CSS classes (.mat-* → .mat-mdc-*)"
                                    Write-InfoMessage "  - Updated theme configurations"
                                    Write-Host ""
                                    Write-WarningMessage "IMPORTANT: Please review the changes carefully!"
                                    Write-WarningMessage "  - Check component templates for visual changes"
                                    Write-WarningMessage "  - Verify custom theme overrides still work"
                                    Write-WarningMessage "  - Test all Material dialogs, forms, and tables"
                                    Write-Host ""

                                    $changes += "Ran Material MDC migration (migrated $legacyUsageCount component usage(s))"

                                    # Ask if user wants to review before continuing
                                    $continueResponse = Read-Host "Continue with Angular 17 migration? (Y/n)"

                                    if ($continueResponse -eq 'n' -or $continueResponse -eq 'N') {
                                        Write-InfoMessage "Migration paused for MDC review."
                                        Write-Host ""
                                        Write-InfoMessage "Next steps:"
                                        Write-InfoMessage "  1. Review changes: git diff"
                                        Write-InfoMessage "  2. Test Material components thoroughly"
                                        Write-InfoMessage "  3. Commit MDC changes: git add . && git commit -m 'chore: migrate to Material MDC'"
                                        Write-InfoMessage "  4. Re-run Angular 17 migration when ready"

                                        return @{
                                            Success  = $true
                                            Message  = "MDC migration completed - paused for review"
                                            Changes  = $changes
                                            Warnings = @("Migration paused at user request for MDC review")
                                            Errors   = @()
                                        }
                                    }

                                    Write-Success "Continuing with Angular 17 migration..."
                                }
                                else {
                                    # Restore original directory
                                    Set-Location $originalLocation

                                    # MDC migration failed
                                    Write-ErrorMessage "MDC migration failed!"
                                    Write-ErrorMessage "Output: $mdcOutput"
                                    Write-Host ""
                                    Write-ErrorMessage "Cannot continue with Angular 17 migration."
                                    Write-InfoMessage "Troubleshooting:"
                                    Write-InfoMessage "  1. Review the error output above"
                                    Write-InfoMessage "  2. Fix any issues with your Material components"
                                    Write-InfoMessage "  3. Run manually: ng generate @angular/material:mdc-migration"
                                    Write-InfoMessage "  4. Re-run Angular 17 migration when ready"

                                    return @{
                                        Success  = $false
                                        Message  = "MDC migration failed"
                                        Changes  = $changes
                                        Warnings = $warnings
                                        Errors   = @("ng generate @angular/material:mdc-migration failed with exit code $LASTEXITCODE")
                                    }
                                }
                            }
                            catch {
                                # Restore original directory in case of error
                                if ($originalLocation) {
                                    Set-Location $originalLocation
                                }

                                Write-ErrorMessage "Error running MDC migration: $_"
                                Write-Host ""
                                Write-InfoMessage "Please run manually: ng generate @angular/material:mdc-migration"

                                $warnings += "Could not automatically run MDC migration - please run manually"
                            }
                        }
                        else {
                            # User declined MDC migration
                            Write-Host ""
                            Write-WarningMessage "⚠️  Skipping MDC migration - This is NOT recommended!"
                            Write-Host ""
                            Write-ErrorMessage "Angular Material v17 will FAIL without MDC migration."
                            Write-InfoMessage "You have two options:"
                            Write-InfoMessage "  1. Cancel now and run: ng generate @angular/material:mdc-migration"
                            Write-InfoMessage "  2. Continue anyway (migration will likely FAIL)"
                            Write-Host ""

                            $forceResponse = Read-Host "Continue without MDC migration? (y/N)"

                            if ($forceResponse -ne 'y' -and $forceResponse -ne 'Y') {
                                Write-InfoMessage "Migration cancelled."
                                Write-Host ""
                                Write-InfoMessage "To migrate properly:"
                                Write-InfoMessage "  1. Run: ng generate @angular/material:mdc-migration"
                                Write-InfoMessage "  2. Review and test the changes"
                                Write-InfoMessage "  3. Re-run Angular 17 migration"

                                return @{
                                    Success  = $false
                                    Message  = "Migration cancelled - MDC migration required"
                                    Changes  = $changes
                                    Warnings = @("User cancelled migration to run MDC migration manually")
                                    Errors   = @()
                                }
                            }

                            # User chose to continue without MDC migration (risky!)
                            Write-WarningMessage "Continuing without MDC migration - expect BUILD FAILURES!"
                            $warnings += ""
                            $warnings += "═══════════════════════════════════════════════════════════════════"
                            $warnings += "⚠️  WARNING: MDC Migration Skipped"
                            $warnings += "═══════════════════════════════════════════════════════════════════"
                            $warnings += "User chose to skip Material MDC migration."
                            $warnings += "Angular Material v17 upgrade will likely FAIL."
                            $warnings += ""
                            $warnings += "To fix, run: ng generate @angular/material:mdc-migration"
                            $warnings += "═══════════════════════════════════════════════════════════════════"
                        }
                    }
                    else {
                        Write-InfoMessage "  No legacy Material component patterns detected"
                    }
                }
                else {
                    Write-InfoMessage "  Angular Material not found in dependencies - skipping MDC check"
                }
            }
            catch {
                Write-Verbose "Error checking Material usage: $_"
                $warnings += "Could not verify Material MDC migration status"
            }
        }

        # ============================================================================
        # SECTION 1.5: angular.json browserTarget → buildTarget Migration
        # ============================================================================

        Write-InfoMessage "📝 Updating angular.json configuration..."

        $angularJsonPath = Join-Path $ProjectPath "angular.json"
        if (Test-Path $angularJsonPath) {
            try {
                $angularJsonContent = Get-Content -Path $angularJsonPath -Raw
                $originalAngularJson = $angularJsonContent

                # Replace browserTarget with buildTarget (Angular 17+ requirement)
                # This affects serve, extract-i18n, and other configurations
                $angularJsonContent = $angularJsonContent -replace '"browserTarget":', '"buildTarget":'

                if ($angularJsonContent -ne $originalAngularJson) {
                    Set-Content -Path $angularJsonPath -Value $angularJsonContent -NoNewline
                    Write-Success "  ✓ Updated angular.json: browserTarget → buildTarget"
                    $changes += "Updated angular.json configuration (browserTarget → buildTarget)"
                } else {
                    Write-InfoMessage "  ✓ angular.json already up-to-date"
                }
            }
            catch {
                Write-WarningMessage "  Failed to update angular.json: $_"
                $warnings += "Could not update angular.json browserTarget property"
            }
        }

        # ============================================================================
        # SECTION 2: Zone.js Deep Imports Auto-Fix
        # ============================================================================

        Write-InfoMessage "📝 Fixing Zone.js deep imports..."

        $zoneJsFilesToCheck = @(
            (Join-Path $ProjectPath "karma.conf.js"),
            (Join-Path $srcPath "test.ts"),
            (Join-Path $srcPath "polyfills.ts")
        )

        $zoneJsFixCount = 0
        foreach ($file in $zoneJsFilesToCheck) {
            if (Test-Path $file) {
                try {
                    $content = Get-Content -Path $file -Raw
                    $originalContent = $content

                    # Replace deprecated deep imports
                    $content = $content -replace "zone\.js/bundles/zone-testing\.js", "zone.js/testing"
                    $content = $content -replace "zone\.js/bundles/zone-testing", "zone.js/testing"
                    $content = $content -replace "zone\.js/dist/zone", "zone.js"
                    $content = $content -replace "'zone-testing-bundle'", "'zone.js/testing'"
                    $content = $content -replace '"zone-testing-bundle"', '"zone.js/testing"'
                    $content = $content -replace "'zone-testing-node-bundle'", "'zone.js/testing'"
                    $content = $content -replace '"zone-testing-node-bundle"', '"zone.js/testing"'

                    if ($content -ne $originalContent) {
                        Set-Content -Path $file -Value $content -NoNewline
                        $zoneJsFixCount++
                        $fileName = [System.IO.Path]::GetFileName($file)
                        $changes += "Fixed Zone.js imports in: $fileName"
                    }
                }
                catch {
                    Write-Verbose "Error processing Zone.js imports in $file : $_"
                    $fileName = [System.IO.Path]::GetFileName($file)
                    $warnings += "Could not process Zone.js imports in: $fileName"
                }
            }
        }

        if ($zoneJsFixCount -gt 0) {
            Write-Success "  Fixed Zone.js imports in $zoneJsFixCount file(s)"
        }
        else {
            Write-InfoMessage "  No deprecated Zone.js imports found"
        }

        # ============================================================================
        # SECTION 3: Router API Removals Detection
        # ============================================================================

        Write-InfoMessage "📝 Checking for removed Router APIs..."

        $routerApiPatterns = @{
            'setupTestingRouter'          = 'Use provideRouter or RouterModule.forRoot instead'
            'malformedUriErrorHandler'    = 'Handle URL parsing in UrlSerializer.parse method'
            'canceledNavigationResolution' = 'Configure via provideRouter feature functions'
            'paramsInheritanceStrategy'   = 'Configure via provideRouter feature functions'
            'titleStrategy'               = 'Configure via provideRouter feature functions'
            'urlUpdateStrategy'           = 'Configure via provideRouter feature functions'
            'urlHandlingStrategy'         = 'Configure via provideRouter feature functions'
        }

        $routerApiUsages = @{}
        $tsFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')

        foreach ($pattern in $routerApiPatterns.Keys) {
            $count = 0
            foreach ($file in $tsFiles) {
                $content = Get-Content $file -Raw
                if ($content -match $pattern) {
                    $count++
                }
            }
            if ($count -gt 0) {
                $routerApiUsages[$pattern] = $count
            }
        }

        if ($routerApiUsages.Count -gt 0) {
            $warnings += ""
            $warnings += "⚠️  Found usage of removed Router APIs:"
            foreach ($api in $routerApiUsages.Keys) {
                $count = $routerApiUsages[$api]
                $migration = $routerApiPatterns[$api]
                $warnings += "  - $api ($count occurrence(s)) → $migration"
            }
            Write-WarningMessage "  Found $($routerApiUsages.Count) removed Router API usage(s)"
        }
        else {
            Write-InfoMessage "  No removed Router APIs detected"
        }

        # ============================================================================
        # SECTION 4: NgSwitch Equality Detection
        # ============================================================================

        Write-InfoMessage "📝 Checking for NgSwitch usage..."

        $ngSwitchCount = 0
        $htmlFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.html')

        foreach ($file in $htmlFiles) {
            $content = Get-Content $file -Raw
            $matches = [regex]::Matches($content, '\*ngSwitchCase')
            $ngSwitchCount += $matches.Count
        }

        if ($ngSwitchCount -gt 0) {
            $warnings += ""
            $warnings += "⚠️  NgSwitch Equality Check Changed:"
            $warnings += "  Found $ngSwitchCount *ngSwitchCase usage(s)"
            $warnings += "  Angular 17 uses strict equality (===) instead of loose equality (==)"
            $warnings += "  Review cases where types might not match (e.g., string '0' vs number 0)"
            Write-InfoMessage "  Found $ngSwitchCount NgSwitch usage(s) - review for type safety"
        }

        # ============================================================================
        # SECTION 5: Comprehensive Manual Review Warnings
        # ============================================================================

        Write-InfoMessage "📝 Adding comprehensive manual review warnings..."

        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 17 Breaking Changes - Manual Review Required"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "1. Prerequisites & Dependencies:"
        $warnings += "   - Node.js 18.13.0+ is now required (v16 no longer supported)"
        $warnings += "   - TypeScript 5.2+ is now required (older versions not supported)"
        $warnings += "   - Zone.js 0.14.x is now required (0.13.x no longer supported)"
        $warnings += "   - Run: node --version (should show v18.13.0 or newer)"
        $warnings += "   - Run: npx tsc --version (should show 5.2.0 or newer)"
        $warnings += ""
        $warnings += "2. Router API Removals (BREAKING):"
        $warnings += "   The following were removed from RouterModule.forRoot options:"
        $warnings += "   - setupTestingRouter (use provideRouter in tests)"
        $warnings += "   - malformedUriErrorHandler (use UrlSerializer.parse instead)"
        $warnings += "   - canceledNavigationResolution, paramsInheritanceStrategy"
        $warnings += "   - titleStrategy, urlUpdateStrategy, urlHandlingStrategy"
        $warnings += "   Migration: Use provideRouter with feature functions instead"
        $warnings += "   Example: provideRouter(routes, withRouterConfig({...}))"
        $warnings += ""
        $warnings += "3. Zone.js Deep Imports Removed (BREAKING):"
        $warnings += "   The following imports are no longer available:"
        $warnings += "   - zone.js/bundles/zone-testing.js → use zone.js/testing"
        $warnings += "   - zone.js/dist/zone → use zone.js"
        $warnings += "   - zone-testing-bundle → use zone.js/testing"
        $warnings += "   - zone-testing-node-bundle → use zone.js/testing"
        $warnings += "   These imports have been automatically fixed if found."
        $warnings += ""
        $warnings += "4. NgSwitch Equality Change (BREAKING):"
        $warnings += "   NgSwitch now uses strict equality (===) instead of loose (==)"
        $warnings += "   Old behavior: *ngSwitchCase=`"'0'`" matched number 0"
        $warnings += "   New behavior: *ngSwitchCase=`"'0'`" only matches string '0'"
        $warnings += "   Action: Review all *ngSwitchCase usages for type consistency"
        $warnings += ""
        $warnings += "5. Deprecated APIs (Warnings):"
        $warnings += "   - NgProbeToken: No longer used internally (Ivy transition complete)"
        $warnings += "   - AnimationDriver.NOOP: Use NoopAnimationDriver instead"
        $warnings += "   These APIs still work but will be removed in future versions."
        $warnings += ""
        $warnings += "6. Optional Migrations (Recommended):"
        $warnings += "   A. New Control Flow Syntax (Developer Preview in v17):"
        $warnings += "      - Migrate *ngIf, *ngFor, *ngSwitch to @if, @for, @switch"
        $warnings += "      - Benefits: 90% performance improvement, better type checking"
        $warnings += "      - Run: ng generate @angular/core:control-flow"
        $warnings += "      - Note: Optional in v17, old syntax still works"
        $warnings += ""
        $warnings += "   B. Application Builder (esbuild/Vite):"
        $warnings += "      - New default builder for faster builds"
        $warnings += "      - Automatically prompted by: ng update @angular/cli"
        $warnings += "      - Provides significant build speed improvements"
        $warnings += ""
        $warnings += "7. Testing & Validation:"
        $warnings += "   - Run build: npm run build"
        $warnings += "   - Run tests: npm test"
        $warnings += "   - Run lint: npm run lint"
        $warnings += "   - Search for removed Router APIs in your IDE"
        $warnings += "   - Test all Material components if using Angular Material"
        $warnings += "   - Verify NgSwitch cases have correct types"
        $warnings += ""
        $warnings += "8. Additional Resources:"
        $warnings += "   - Migration guide: migrations/docs/04-migrate-to-angular-17.md"
        $warnings += "   - Official guide: https://angular.dev/update-guide?v=16.0-17.0"
        $warnings += "   - Control flow: https://angular.dev/guide/templates/control-flow"
        $warnings += "   - Deprecations: https://v17.angular.io/guide/deprecations"
        $warnings += "═══════════════════════════════════════════════════════════════════"

        Write-Success "Angular 17 breaking changes processed successfully"
        Write-InfoMessage "  Total automated fixes: $($changes.Count)"
        Write-InfoMessage "  Manual review items: See warnings above"

        if ($changes.Count -gt 0) {
            Write-InfoMessage "`n  Automated fixes applied:"
            foreach ($change in $changes) {
                Write-InfoMessage "    ✓ $change"
            }
        }

        if ($materialMdcCheckNeeded) {
            Write-Host ""
            Write-WarningMessage "IMPORTANT: Review Material MDC migration warning above before proceeding!"
        }

        return @{
            Success  = $true
            Message  = "Angular 17 breaking changes processed successfully ($($changes.Count) automated fix(es))"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        Write-ErrorMessage "Failed to apply Angular 17 breaking changes: $_"

        return @{
            Success  = $false
            Message  = "Failed to apply Angular 17 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

#region Export Module Members

Export-ModuleMember -Function 'Invoke-Angular17BreakingChanges'

#endregion

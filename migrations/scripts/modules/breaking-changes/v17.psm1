<#
.SYNOPSIS
    Angular 17 specific breaking changes fixes.

.DESCRIPTION
    Handles breaking changes introduced in Angular 17:
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
                        $warnings += ""
                        $warnings += "═══════════════════════════════════════════════════════════════════"
                        $warnings += "⚠️  CRITICAL: Angular Material MDC Migration Required"
                        $warnings += "═══════════════════════════════════════════════════════════════════"
                        $warnings += ""
                        $warnings += "Angular Material v17 has REMOVED all legacy (non-MDC) components."
                        $warnings += "Found $legacyUsageCount potential legacy component usage(s) in your code."
                        $warnings += ""
                        $warnings += "BEFORE upgrading to Angular Material v17, you MUST run:"
                        $warnings += "  ng generate @angular/material:mdc-migration"
                        $warnings += ""
                        $warnings += "This schematic will migrate all legacy components to MDC equivalents."
                        $warnings += "Failure to do this will cause BUILD FAILURES in Angular Material v17."
                        $warnings += ""
                        $warnings += "After running the migration, review and test all Material components."
                        $warnings += "═══════════════════════════════════════════════════════════════════"

                        Write-WarningMessage "  Found Material components - MDC migration may be required"
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

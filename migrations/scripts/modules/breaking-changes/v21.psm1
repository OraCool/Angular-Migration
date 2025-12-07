<#
.SYNOPSIS
    Angular 21 specific breaking changes fixes and detections.

.DESCRIPTION
    Comprehensive Angular 21 migration handling:

    SECTION 1: Official Angular 21 Core Breaking Changes
    - Detect NgModuleFactory usage (removed)
    - Fix Router.lastSuccessfulNavigation signal invocation
    - Fix ApplicationConfig imports (moved from @angular/platform-browser to @angular/core)
    - Detect UpgradeAdapter usage (removed)
    - Detect ignoreChangesOutsideZone usage (removed)
    - Warn about zoneless-by-default change (requires explicit provideZoneChangeDetection)
    - Warn about TypeScript 5.9+ requirement
    - Warn about Router navigation timing changes
    - Warn about TestBed error handling changes
    - Warn about ngComponentOutletContent type change

    SECTION 2: Third-Party Library Migrations
    - Warn about AG-Grid v33 upgrade
    - Warn about Highcharts v12 upgrade

    SECTION 3: Comprehensive Warnings
    - All 10 official breaking changes with migration examples
    - Third-party library migration notes
    - TypeScript version requirements
    - Zoneless migration guidance
    - New features overview

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Angular Version: 21
    Approach: Hybrid (Official + Third-Party)
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$UtilitiesModule = Join-Path $PSScriptRoot "..\Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 21.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Invoke-Angular21BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 21 breaking changes and migrations..."

    try {
        $srcPath = Join-Path $ProjectPath "src"

        # ========================================================================
        # SECTION 1: OFFICIAL ANGULAR 21 CORE BREAKING CHANGES
        # ========================================================================

        Write-Host ""
        Write-InfoMessage "📋 Section 1: Official Angular 21 Core Breaking Changes"
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        # 1. Detect NgModuleFactory usage [CRITICAL]
        Write-InfoMessage "📝 Checking for NgModuleFactory usage..."

        $tsFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')
        $ngModuleFactoryFound = @()

        foreach ($file in $tsFiles) {
            $content = Get-Content $file -Raw
            if ($content -match 'NgModuleFactory') {
                $ngModuleFactoryFound += [System.IO.Path]::GetFileName($file)
            }
        }

        if ($ngModuleFactoryFound.Count -gt 0) {
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host "  CRITICAL: NgModuleFactory Removed in Angular 21" -ForegroundColor Red
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host ""
            Write-WarningMessage "NgModuleFactory has been REMOVED in Angular 21."
            Write-WarningMessage "Found usage in the following files:"
            Write-Host ""

            foreach ($file in $ngModuleFactoryFound) {
                Write-Host "  ⚠️  $file" -ForegroundColor Yellow
            }

            Write-Host ""
            Write-Host "  Migration Required:" -ForegroundColor Cyan
            Write-Host "  ───────────────────" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  Before (Angular 20):" -ForegroundColor Gray
            Write-Host "    import { NgModuleFactory } from '@angular/core';" -ForegroundColor Gray
            Write-Host "    const factory: NgModuleFactory<MyModule> = ..." -ForegroundColor Gray
            Write-Host ""
            Write-Host "  After (Angular 21):" -ForegroundColor Green
            Write-Host "    import { NgModule } from '@angular/core';" -ForegroundColor Green
            Write-Host "    const module: Type<MyModule> = MyModule;" -ForegroundColor Green
            Write-Host ""

            $warnings += "CRITICAL: Found NgModuleFactory usage in $($ngModuleFactoryFound.Count) file(s)"
        } else {
            Write-InfoMessage "  ✓ No NgModuleFactory usage found"
        }

        # 2. Fix Router.lastSuccessfulNavigation signal invocation
        Write-InfoMessage "📝 Fixing Router.lastSuccessfulNavigation signal invocation..."

        $routerFilesFixed = 0
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $originalContent = $content

                # Skip if file doesn't use Router or lastSuccessfulNavigation
                if ($content -notmatch 'lastSuccessfulNavigation') {
                    continue
                }

                # Fix: router.lastSuccessfulNavigation → router.lastSuccessfulNavigation()
                # But avoid double-fixing: router.lastSuccessfulNavigation() → router.lastSuccessfulNavigation()()
                # Pattern: lastSuccessfulNavigation not followed by ( or already invoked
                $content = $content -replace '\.lastSuccessfulNavigation(?!\s*\()', '.lastSuccessfulNavigation()'

                if ($content -ne $originalContent) {
                    Set-Content -Path $file -Value $content -NoNewline
                    $routerFilesFixed++
                    $changes += "Fixed Router.lastSuccessfulNavigation signal in: $([System.IO.Path]::GetFileName($file))"
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
                $fileName = [System.IO.Path]::GetFileName($file)
                $warnings += "Could not process file: $fileName"
            }
        }

        if ($routerFilesFixed -gt 0) {
            Write-Success "  Fixed Router.lastSuccessfulNavigation in $routerFilesFixed file(s)"
        } else {
            Write-InfoMessage "  ✓ No Router.lastSuccessfulNavigation fixes needed"
        }

        # 3. Fix ApplicationConfig imports
        Write-InfoMessage "📝 Fixing ApplicationConfig imports..."

        $appConfigFilesFixed = 0
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $originalContent = $content

                # Skip if file doesn't import ApplicationConfig
                if ($content -notmatch "from\s+['`"]@angular/platform-browser['`"]" -or $content -notmatch 'ApplicationConfig') {
                    continue
                }

                # Fix: ApplicationConfig from @angular/platform-browser → @angular/core
                $content = $content -replace "import\s*\{([^}]*ApplicationConfig[^}]*)\}\s*from\s*['`"]@angular/platform-browser['`"]", "import {`$1} from '@angular/core'"

                if ($content -ne $originalContent) {
                    Set-Content -Path $file -Value $content -NoNewline
                    $appConfigFilesFixed++
                    $changes += "Fixed ApplicationConfig import in: $([System.IO.Path]::GetFileName($file))"
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
                $fileName = [System.IO.Path]::GetFileName($file)
                $warnings += "Could not process ApplicationConfig import in: $fileName"
            }
        }

        if ($appConfigFilesFixed -gt 0) {
            Write-Success "  Fixed ApplicationConfig imports in $appConfigFilesFixed file(s)"
        } else {
            Write-InfoMessage "  ✓ No ApplicationConfig import fixes needed"
        }

        # 4. Detect UpgradeAdapter usage [CRITICAL]
        Write-InfoMessage "📝 Checking for UpgradeAdapter usage..."

        $upgradeAdapterFound = @()
        foreach ($file in $tsFiles) {
            $content = Get-Content $file -Raw
            if ($content -match 'UpgradeAdapter') {
                $upgradeAdapterFound += [System.IO.Path]::GetFileName($file)
            }
        }

        if ($upgradeAdapterFound.Count -gt 0) {
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host "  CRITICAL: UpgradeAdapter Removed in Angular 21" -ForegroundColor Red
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host ""
            Write-WarningMessage "UpgradeAdapter has been REMOVED in Angular 21."
            Write-WarningMessage "Found usage in the following files:"
            Write-Host ""

            foreach ($file in $upgradeAdapterFound) {
                Write-Host "  ⚠️  $file" -ForegroundColor Yellow
            }

            Write-Host ""
            Write-Host "  Migration Required:" -ForegroundColor Cyan
            Write-Host "  ───────────────────" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  Use upgrade/static instead:" -ForegroundColor Green
            Write-Host "    import { UpgradeModule } from '@angular/upgrade/static';" -ForegroundColor Green
            Write-Host ""
            Write-Host "  Docs: https://angular.dev/guide/upgrade" -ForegroundColor Cyan
            Write-Host ""

            $warnings += "CRITICAL: Found UpgradeAdapter usage in $($upgradeAdapterFound.Count) file(s)"
        } else {
            Write-InfoMessage "  ✓ No UpgradeAdapter usage found"
        }

        # 5. Detect ignoreChangesOutsideZone usage
        Write-InfoMessage "📝 Checking for ignoreChangesOutsideZone usage..."

        $ignoreChangesFound = @()
        foreach ($file in $tsFiles) {
            $content = Get-Content $file -Raw
            if ($content -match 'ignoreChangesOutsideZone') {
                $ignoreChangesFound += [System.IO.Path]::GetFileName($file)
            }
        }

        if ($ignoreChangesFound.Count -gt 0) {
            Write-WarningMessage "  Found ignoreChangesOutsideZone usage in $($ignoreChangesFound.Count) file(s):"
            foreach ($file in $ignoreChangesFound) {
                Write-Host "    - $file" -ForegroundColor Yellow
            }
            Write-Host ""
            Write-Host "  ignoreChangesOutsideZone has been removed in Angular 21." -ForegroundColor Yellow
            Write-Host "  Remove this option from provideZoneChangeDetection config." -ForegroundColor Yellow
            Write-Host ""
            $warnings += "ignoreChangesOutsideZone option removed in Angular 21"
        } else {
            Write-InfoMessage "  ✓ No ignoreChangesOutsideZone usage found"
        }

        # 6. Check for zoneless migration requirement
        Write-InfoMessage "📝 Checking zone.js configuration..."

        $mainTsPath = Join-Path $srcPath "main.ts"
        if (Test-Path $mainTsPath) {
            $mainContent = Get-Content $mainTsPath -Raw

            # Check if provideZoneChangeDetection is present
            if ($mainContent -notmatch 'provideZoneChangeDetection' -and $mainContent -match 'bootstrapApplication') {
                Write-Host ""
                Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
                Write-Host "  IMPORTANT: Zoneless by Default in Angular 21" -ForegroundColor Yellow
                Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "  Angular 21 is zoneless by default." -ForegroundColor Cyan
                Write-Host ""
                Write-Host "  If your app relies on Zone.js, add explicitly:" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "    import { provideZoneChangeDetection } from '@angular/core';" -ForegroundColor Green
                Write-Host ""
                Write-Host "    bootstrapApplication(AppComponent, {" -ForegroundColor Green
                Write-Host "      providers: [provideZoneChangeDetection()]" -ForegroundColor Green
                Write-Host "    });" -ForegroundColor Green
                Write-Host ""
                Write-Host "  Note: ng update migration will add this automatically if needed." -ForegroundColor Cyan
                Write-Host ""

                $warnings += "Zoneless by default - add provideZoneChangeDetection() if using Zone.js"
            }
        }

        # ========================================================================
        # SECTION 2: THIRD-PARTY LIBRARY MIGRATIONS
        # ========================================================================

        Write-Host ""
        Write-InfoMessage "📦 Section 2: Third-Party Library Migrations"
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        # AG-Grid v33 migration check
        Write-InfoMessage "📝 Checking AG-Grid version..."
        $packageJsonPath = Join-Path $ProjectPath "package.json"
        if (Test-Path $packageJsonPath) {
            $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
            $agGridVersion = $packageJson.dependencies.'@ag-grid-community/core'

            if ($agGridVersion -and $agGridVersion -match "^~?32\.") {
                Write-Host ""
                Write-Host "  ℹ️  AG-Grid v33 Upgrade Available" -ForegroundColor Cyan
                Write-Host "  ─────────────────────────────────" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "  Current: AG-Grid v32" -ForegroundColor Gray
                Write-Host "  Target:  AG-Grid v33" -ForegroundColor Green
                Write-Host ""
                Write-Host "  Review AG-Grid v33 migration guide for breaking changes." -ForegroundColor Yellow
                Write-Host "  Docs: https://www.ag-grid.com/changelog/" -ForegroundColor Cyan
                Write-Host ""
                $warnings += "AG-Grid v33 upgrade recommended - check migration guide"
            }

            # Highcharts v12 migration check
            $highchartsVersion = $packageJson.dependencies.'highcharts'
            if ($highchartsVersion -and $highchartsVersion -match "^~?11\.") {
                Write-Host ""
                Write-Host "  ℹ️  Highcharts v12 Upgrade Available" -ForegroundColor Cyan
                Write-Host "  ───────────────────────────────────" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "  Current: Highcharts v11" -ForegroundColor Gray
                Write-Host "  Target:  Highcharts v12" -ForegroundColor Green
                Write-Host ""
                Write-Host "  Review Highcharts v12 changelog for breaking changes." -ForegroundColor Yellow
                Write-Host "  Docs: https://www.highcharts.com/blog/changelog/" -ForegroundColor Cyan
                Write-Host ""
                $warnings += "Highcharts v12 upgrade recommended - check changelog"
            }
        }

        # ========================================================================
        # SECTION 3: COMPREHENSIVE WARNINGS
        # ========================================================================

        Write-Host ""
        Write-InfoMessage "⚠️  Section 3: Comprehensive Migration Warnings"
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 21 Breaking Changes - Complete Reference"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "1. TypeScript 5.9+ Required (CRITICAL)"
        $warnings += "   ────────────────────────────────────"
        $warnings += "   • TypeScript versions < 5.9 are no longer supported"
        $warnings += "   • Update: npm install typescript@~5.9.0"
        $warnings += "   • Check tsconfig.json for any version-specific settings"
        $warnings += ""
        $warnings += "2. Zoneless by Default (CRITICAL)"
        $warnings += "   ──────────────────────────────"
        $warnings += "   • Angular 21 apps are zoneless by default"
        $warnings += "   • If your app relies on Zone.js, add explicitly:"
        $warnings += "     import { provideZoneChangeDetection } from '@angular/core';"
        $warnings += "     bootstrapApplication(AppComponent, {"
        $warnings += "       providers: [provideZoneChangeDetection()]"
        $warnings += "     });"
        $warnings += "   • Migration will add this automatically if needed"
        $warnings += "   • Zone.js is still included for backwards compatibility"
        $warnings += "   • Consider migrating to zoneless for better performance"
        $warnings += ""
        $warnings += "3. NgModuleFactory Removed (CRITICAL)"
        $warnings += "   ───────────────────────────────────"
        $warnings += "   • NgModuleFactory has been removed"
        $warnings += "   • Use NgModule directly instead"
        $warnings += "   • Before: const factory: NgModuleFactory<MyModule>"
        $warnings += "   • After:  const module: Type<MyModule> = MyModule"
        $warnings += ""
        $warnings += "4. Router.lastSuccessfulNavigation is Signal (AUTO-FIXED)"
        $warnings += "   ────────────────────────────────────────────────────"
        $warnings += "   • lastSuccessfulNavigation is now a signal"
        $warnings += "   • Must be invoked: router.lastSuccessfulNavigation()"
        $warnings += "   • Migration fixed this automatically"
        $warnings += "   • Verify in complex router logic"
        $warnings += ""
        $warnings += "5. ApplicationConfig Import Location (AUTO-FIXED)"
        $warnings += "   ───────────────────────────────────────────────"
        $warnings += "   • ApplicationConfig removed from @angular/platform-browser"
        $warnings += "   • Import from @angular/core instead"
        $warnings += "   • Migration fixed this automatically"
        $warnings += ""
        $warnings += "6. UpgradeAdapter Removed (CRITICAL)"
        $warnings += "   ──────────────────────────────────"
        $warnings += "   • UpgradeAdapter has been removed"
        $warnings += "   • Use upgrade/static instead:"
        $warnings += "     import { UpgradeModule } from '@angular/upgrade/static';"
        $warnings += "   • Docs: https://angular.dev/guide/upgrade"
        $warnings += ""
        $warnings += "7. ignoreChangesOutsideZone Removed"
        $warnings += "   ─────────────────────────────────"
        $warnings += "   • ignoreChangesOutsideZone is no longer available"
        $warnings += "   • Remove this option from provideZoneChangeDetection config"
        $warnings += ""
        $warnings += "8. Router Navigation Timing"
        $warnings += "   ────────────────────────"
        $warnings += "   • Router navigations may take several additional microtasks"
        $warnings += "   • Tests dependent on exact navigation timing may need updates"
        $warnings += "   • Most common fix: ensure all navigations complete before assertions"
        $warnings += "   • Use: await fixture.whenStable() or router.navigate().then()"
        $warnings += ""
        $warnings += "9. TestBed Error Handling"
        $warnings += "   ──────────────────────"
        $warnings += "   • Using provideZoneChangeDetection in TestBed no longer prevents rethrowing"
        $warnings += "   • Errors in tests will now be rethrown regardless"
        $warnings += "   • Tests should prevent or account for expected errors"
        $warnings += "   • Use: expect(() => ...).toThrow() for expected errors"
        $warnings += ""
        $warnings += "10. ngComponentOutletContent Type Change"
        $warnings += "    ───────────────────────────────────────"
        $warnings += "    • Type changed from any`[`]`[`] | undefined to Node`[`]`[`] | undefined"
        $warnings += "    • May cause TypeScript errors if using strict type checking"
        $warnings += "    • Update type annotations accordingly"
        $warnings += ""
        $warnings += "11. IE and Non-Chromium Edge Support Removed"
        $warnings += "    ───────────────────────────────────────────"
        $warnings += "    • Internet Explorer no longer supported"
        $warnings += "    • Non-Chromium Edge (Legacy Edge) no longer supported"
        $warnings += "    • Update browser support requirements"
        $warnings += "    • Update browserslist configuration if needed"
        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "New Features in Angular 21"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "• Zoneless by Default - Better performance without Zone.js"
        $warnings += "• Signal Forms - Reactive forms with signals"
        $warnings += "• AI-First Tooling - Enhanced developer experience with AI"
        $warnings += "• Vitest as Default - Modern testing framework (replaces Karma/Jasmine)"
        $warnings += "• Improved Build Performance - Faster builds and HMR"
        $warnings += "• Enhanced ARIA Support - Better accessibility"
        $warnings += "• TypeScript 5.9 Support - Latest TypeScript features"
        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Recommended Actions"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "1. Run build: npm run build"
        $warnings += "2. Run tests: npm test"
        $warnings += "3. Run lint:  npm run lint"
        $warnings += "4. Check for NgModuleFactory usage"
        $warnings += "5. Check for UpgradeAdapter usage"
        $warnings += "6. Verify Zone.js configuration (zoneless vs zoneful)"
        $warnings += "7. Review TypeScript 5.9 strictness errors"
        $warnings += "8. Test router navigation timing in critical flows"
        $warnings += "9. Update browser support documentation"
        $warnings += "10. Consider migrating tests to Vitest"
        $warnings += ""
        $warnings += "Documentation: https://angular.dev"
        $warnings += "Update Guide: https://angular.dev/update-guide"
        $warnings += "Migration Tool: ng update @angular/core@21 @angular/cli@21"
        $warnings += "═══════════════════════════════════════════════════════════════════"

        Write-Success "Angular 21 breaking changes processed successfully"
        Write-InfoMessage "  Total changes applied: $($changes.Count)"

        if ($warnings.Count -gt 0) {
            Write-WarningMessage "`nImportant Warnings:"
            foreach ($warning in $warnings) {
                Write-WarningMessage "  $warning"
            }
        }

        return @{
            Success  = $true
            Message  = "Angular 21 breaking changes processed successfully"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Message  = "Failed to apply Angular 21 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

#region Export Module Members

Export-ModuleMember -Function 'Invoke-Angular21BreakingChanges'

#endregion

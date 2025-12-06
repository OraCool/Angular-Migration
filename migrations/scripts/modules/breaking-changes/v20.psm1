<#
.SYNOPSIS
    Angular 20 specific breaking changes fixes and detections.

.DESCRIPTION
    Handles breaking changes introduced in Angular 20:

    OFFICIAL ANGULAR 20 CORE BREAKING CHANGES:
    - InjectFlags removed from DI APIs (CRITICAL detection)
    - TestBed.get removed - use TestBed.inject (CRITICAL detection)
    - provideZoneChangeDetection error handling changed (INFO)
    - provideExperimentalZonelessChangeDetection renamed (AUTO-FIX)
    - ignoreChangesOutsideZone removed (detection)
    - ng-reflect-* attributes deprecated (INFO)
    - Structural directives deprecated (INFO)
    - Node.js version requirements (v18 not supported, v22.0-22.10 not supported)

    THIRD-PARTY BREAKING CHANGES:
    - Highcharts v11→v12 import syntax (AUTO-FIX)
    - Highcharts modules import syntax (AUTO-FIX)

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Angular Version: 20
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking

<#
.SYNOPSIS
    Applies breaking change fixes and detections for Angular 20.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Invoke-Angular20BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 20 breaking changes and migrations..."
    Write-Host ""

    try {
        $srcPath = Join-Path $ProjectPath "src"

        # Get all TypeScript files for analysis
        $tsFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')
        $moduleFiles = $tsFiles | Where-Object { $_ -match '\.module\.ts$' }

        Write-Host "📋 Section 1: Official Angular 20 Core Breaking Changes" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""

        # ═══════════════════════════════════════════════════════════════════
        # SECTION 1: OFFICIAL ANGULAR 20 CORE BREAKING CHANGES
        # ═══════════════════════════════════════════════════════════════════

        # 1. Detect InjectFlags usage (CRITICAL)
        Write-InfoMessage "📝 Checking for InjectFlags usage..."

        $injectFlagsFound = @()
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content $file -Raw
                if ($content -match '\bInjectFlags\b') {
                    $injectFlagsFound += [System.IO.Path]::GetFileName($file)
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
            }
        }

        if ($injectFlagsFound.Count -gt 0) {
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host "  CRITICAL: InjectFlags Removed in Angular 20" -ForegroundColor Red
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host ""
            Write-WarningMessage "InjectFlags has been REMOVED in Angular 20."
            Write-WarningMessage "Found usage in the following files:"
            Write-Host ""

            foreach ($file in $injectFlagsFound) {
                Write-Host "  ⚠️  $file" -ForegroundColor Yellow
            }

            Write-Host ""
            Write-Host "  Migration Required:" -ForegroundColor Cyan
            Write-Host "  ───────────────────" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  Before (Angular 19):" -ForegroundColor Gray
            Write-Host "    import { InjectFlags } from '@angular/core';" -ForegroundColor Gray
            Write-Host "    const service = injector.get(MyService, null, InjectFlags.Optional);" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  After (Angular 20):" -ForegroundColor Green
            Write-Host "    // Remove InjectFlags import" -ForegroundColor Green
            Write-Host "    const service = injector.get(MyService, { optional: true });" -ForegroundColor Green
            Write-Host ""

            $warnings += "CRITICAL: Found InjectFlags usage in $($injectFlagsFound.Count) file(s)"
        }
        else {
            Write-InfoMessage "  ✓ No InjectFlags usage found"
        }

        # 2. Detect TestBed.get usage (CRITICAL)
        Write-InfoMessage "📝 Checking for TestBed.get() usage..."

        $testBedGetFound = @()
        $specFiles = $tsFiles | Where-Object { $_ -match '\.spec\.ts$' }

        foreach ($file in $specFiles) {
            try {
                $content = Get-Content $file -Raw
                if ($content -match 'TestBed\.get\s*\(') {
                    $testBedGetFound += [System.IO.Path]::GetFileName($file)
                }
            }
            catch {
                Write-Verbose "Error processing spec file $file : $_"
            }
        }

        if ($testBedGetFound.Count -gt 0) {
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host "  CRITICAL: TestBed.get() Removed in Angular 20" -ForegroundColor Red
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host ""
            Write-WarningMessage "TestBed.get() has been REMOVED in Angular 20."
            Write-WarningMessage "Found usage in the following test files:"
            Write-Host ""

            foreach ($file in $testBedGetFound) {
                Write-Host "  ⚠️  $file" -ForegroundColor Yellow
            }

            Write-Host ""
            Write-Host "  Migration Required:" -ForegroundColor Cyan
            Write-Host "  ───────────────────" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  Before (Angular 19):" -ForegroundColor Gray
            Write-Host "    const service = TestBed.get(MyService);" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  After (Angular 20):" -ForegroundColor Green
            Write-Host "    const service = TestBed.inject(MyService);" -ForegroundColor Green
            Write-Host ""

            $warnings += "CRITICAL: Found TestBed.get() in $($testBedGetFound.Count) test file(s)"
        }
        else {
            Write-InfoMessage "  ✓ No TestBed.get() usage found"
        }

        # 3. Check provideZoneChangeDetection usage (INFO)
        Write-InfoMessage "📝 Checking for provideZoneChangeDetection usage..."

        $provideZoneFound = @()
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content $file -Raw
                if ($content -match 'provideZoneChangeDetection') {
                    $provideZoneFound += [System.IO.Path]::GetFileName($file)
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
            }
        }

        if ($provideZoneFound.Count -gt 0) {
            Write-InfoMessage "  ℹ️  Found provideZoneChangeDetection in $($provideZoneFound.Count) file(s)"
            Write-InfoMessage "     Behavior changed: TestBed now rethrows errors regardless of this provider"
            $warnings += "INFO: provideZoneChangeDetection behavior changed - TestBed error handling updated"
        }
        else {
            Write-InfoMessage "  ✓ No provideZoneChangeDetection usage found"
        }

        # 4. Fix provideExperimentalZonelessChangeDetection → provideZonelessChangeDetection (AUTO-FIX)
        Write-InfoMessage "📝 Renaming provideExperimentalZonelessChangeDetection → provideZonelessChangeDetection..."

        $zonelessRenameCount = 0
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $original = $content

                # Replace function name in import
                $content = $content -replace 'provideExperimentalZonelessChangeDetection', 'provideZonelessChangeDetection'

                if ($content -ne $original) {
                    Set-Content -Path $file -Value $content -NoNewline
                    $zonelessRenameCount++
                    $changes += "Renamed provideExperimentalZonelessChangeDetection in: $([System.IO.Path]::GetFileName($file))"
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
                $errors += "Failed to rename provideExperimentalZonelessChangeDetection in: $([System.IO.Path]::GetFileName($file))"
            }
        }

        if ($zonelessRenameCount -gt 0) {
            Write-Success "  ✅ Renamed provideExperimentalZonelessChangeDetection in $zonelessRenameCount file(s)"
        }
        else {
            Write-InfoMessage "  ✓ No provideExperimentalZonelessChangeDetection usage found"
        }

        # 5. Detect ignoreChangesOutsideZone usage
        Write-InfoMessage "📝 Checking for ignoreChangesOutsideZone usage..."

        $ignoreChangesFound = @()
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content $file -Raw
                if ($content -match 'ignoreChangesOutsideZone') {
                    $ignoreChangesFound += [System.IO.Path]::GetFileName($file)
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
            }
        }

        if ($ignoreChangesFound.Count -gt 0) {
            Write-WarningMessage "  ⚠️  Found ignoreChangesOutsideZone in $($ignoreChangesFound.Count) file(s)"
            Write-WarningMessage "     This option has been removed - remove from ZoneJS configuration"
            $warnings += "Found ignoreChangesOutsideZone in $($ignoreChangesFound.Count) file(s) - removed in Angular 20"
        }
        else {
            Write-InfoMessage "  ✓ No ignoreChangesOutsideZone usage found"
        }

        # 6. Check ng-reflect-* usage (INFO)
        Write-InfoMessage "📝 Checking for ng-reflect-* attributes..."

        $ngReflectFound = @()
        $htmlFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.html')

        foreach ($file in $htmlFiles) {
            try {
                $content = Get-Content $file -Raw
                if ($content -match 'ng-reflect-') {
                    $ngReflectFound += [System.IO.Path]::GetFileName($file)
                }
            }
            catch {
                Write-Verbose "Error processing HTML file $file : $_"
            }
        }

        if ($ngReflectFound.Count -gt 0) {
            Write-InfoMessage "  ℹ️  Found ng-reflect-* attributes in $($ngReflectFound.Count) file(s)"
            Write-InfoMessage "     These are deprecated and no longer produced by runtime by default"
            $warnings += "INFO: ng-reflect-* attributes deprecated - runtime no longer produces them by default"
        }
        else {
            Write-InfoMessage "  ✓ No ng-reflect-* usage found in templates"
        }

        # 7. Check structural directives usage (INFO)
        Write-InfoMessage "📝 Checking for deprecated structural directives (*ngIf, *ngFor, *ngSwitch)..."

        $structuralDirectivesFound = @()
        foreach ($file in $htmlFiles) {
            try {
                $content = Get-Content $file -Raw
                if ($content -match '\*ngIf|\*ngFor|\*ngSwitch') {
                    $structuralDirectivesFound += [System.IO.Path]::GetFileName($file)
                }
            }
            catch {
                Write-Verbose "Error processing HTML file $file : $_"
            }
        }

        if ($structuralDirectivesFound.Count -gt 0) {
            Write-InfoMessage "  ℹ️  Found structural directives in $($structuralDirectivesFound.Count) file(s)"
            Write-InfoMessage "     *ngIf, *ngFor, *ngSwitch are now officially deprecated"
            Write-InfoMessage "     Consider migrating to control flow syntax (@if, @for, @switch)"
            $warnings += "INFO: Structural directives (*ngIf, *ngFor, *ngSwitch) deprecated - consider @if, @for, @switch"
        }
        else {
            Write-InfoMessage "  ✓ No deprecated structural directives found (already using control flow!)"
        }

        # 8. Node.js version check
        Write-InfoMessage "📝 Checking Node.js version requirements..."

        $packageJsonPath = Join-Path $ProjectPath "package.json"
        if (Test-Path $packageJsonPath) {
            $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

            # Check engines field
            if ($packageJson.engines -and $packageJson.engines.node) {
                $nodeVersion = $packageJson.engines.node
                Write-InfoMessage "  ℹ️  package.json engines.node: $nodeVersion"

                # Warn if v18 is in range
                if ($nodeVersion -match '18') {
                    Write-WarningMessage "  ⚠️  Node.js v18 is no longer supported in Angular 20"
                    Write-WarningMessage "     Update engines.node to: '>=20.11.1 || ^22.11.0'"
                    $warnings += "Node.js v18 no longer supported - requires v20.11.1+ or v22.11+"
                }
            }
            else {
                Write-InfoMessage "  ℹ️  No engines.node field in package.json"
                Write-InfoMessage "     Recommended: Add engines.node: '>=20.11.1 || ^22.11.0'"
            }
        }

        Write-Host ""
        Write-Host "📋 Section 2: Third-Party Breaking Changes" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""

        # ═══════════════════════════════════════════════════════════════════
        # SECTION 2: THIRD-PARTY BREAKING CHANGES
        # ═══════════════════════════════════════════════════════════════════

        # 9. Fix Highcharts import syntax: import * as Highcharts → import Highcharts (AUTO-FIX)
        Write-InfoMessage "📝 Fixing Highcharts v12 import syntax..."

        $highchartsFixCount = 0
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $original = $content

                # Fix main Highcharts import
                # Before: import * as Highcharts from 'highcharts';
                # After: import Highcharts from 'highcharts';
                $content = $content -replace 'import\s+\*\s+as\s+Highcharts\s+from\s+[' + "'" + '"]highcharts[' + "'" + '"]', "import Highcharts from 'highcharts'"

                if ($content -ne $original) {
                    Set-Content -Path $file -Value $content -NoNewline
                    $highchartsFixCount++
                    $changes += "Fixed Highcharts import syntax in: $([System.IO.Path]::GetFileName($file))"
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
                $errors += "Failed to fix Highcharts import in: $([System.IO.Path]::GetFileName($file))"
            }
        }

        if ($highchartsFixCount -gt 0) {
            Write-Success "  ✅ Fixed Highcharts import syntax in $highchartsFixCount file(s)"
        }
        else {
            Write-InfoMessage "  ✓ No Highcharts legacy imports found"
        }

        # 10. Fix Highcharts module imports (AUTO-FIX)
        Write-InfoMessage "📝 Fixing Highcharts module import syntax..."

        $highchartsModuleFixCount = 0
        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $original = $content

                # Fix Highcharts module imports
                # Before: import * as HighchartsMore from 'highcharts/highcharts-more';
                # After: import HighchartsMore from 'highcharts/highcharts-more';
                $content = $content -replace 'import\s+\*\s+as\s+(\w+)\s+from\s+[' + "'" + '"]highcharts/', 'import $1 from ' + "'" + 'highcharts/'

                # Before: import * as SolidGauge from 'highcharts/modules/solid-gauge';
                # After: import SolidGauge from 'highcharts/modules/solid-gauge';
                # (already covered by the regex above)

                if ($content -ne $original) {
                    Set-Content -Path $file -Value $content -NoNewline
                    $highchartsModuleFixCount++
                    $changes += "Fixed Highcharts module imports in: $([System.IO.Path]::GetFileName($file))"
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
                $errors += "Failed to fix Highcharts module imports in: $([System.IO.Path]::GetFileName($file))"
            }
        }

        if ($highchartsModuleFixCount -gt 0) {
            Write-Success "  ✅ Fixed Highcharts module imports in $highchartsModuleFixCount file(s)"
        }
        else {
            Write-InfoMessage "  ✓ No Highcharts module legacy imports found"
        }

        Write-Host ""

        # ═══════════════════════════════════════════════════════════════════
        # SECTION 3: COMPREHENSIVE WARNINGS
        # ═══════════════════════════════════════════════════════════════════

        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 20 Breaking Changes - Comprehensive Guide"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "OFFICIAL ANGULAR 20 CORE BREAKING CHANGES:"
        $warnings += ""
        $warnings += "1. InjectFlags Removed (CRITICAL)"
        $warnings += "   Old: injector.get(MyService, null, InjectFlags.Optional)"
        $warnings += "   New: injector.get(MyService, { optional: true })"
        $warnings += "   Affects: Injector.get, EnvironmentInjector.get, TestBed.get, TestBed.inject"
        $warnings += ""
        $warnings += "2. TestBed.get Removed (CRITICAL)"
        $warnings += "   Old: const service = TestBed.get(MyService);"
        $warnings += "   New: const service = TestBed.inject(MyService);"
        $warnings += ""
        $warnings += "3. provideZoneChangeDetection Error Handling Changed"
        $warnings += "   TestBed now rethrows errors regardless of provideZoneChangeDetection usage"
        $warnings += "   Action: Update tests to handle errors properly"
        $warnings += ""
        $warnings += "4. provideExperimentalZonelessChangeDetection Renamed (AUTO-FIXED)"
        $warnings += "   Old: provideExperimentalZonelessChangeDetection()"
        $warnings += "   New: provideZonelessChangeDetection() // Now Developer Preview"
        $warnings += ""
        $warnings += "5. ignoreChangesOutsideZone Removed"
        $warnings += "   This option is no longer available for ZoneJS configuration"
        $warnings += "   Action: Remove from configuration"
        $warnings += ""
        $warnings += "6. ng-reflect-* Attributes Deprecated"
        $warnings += "   Runtime stops producing ng-reflect-* attributes by default"
        $warnings += "   Impact: Debug tools relying on these may need updates"
        $warnings += ""
        $warnings += "7. Structural Directives Deprecated"
        $warnings += "   *ngIf, *ngFor, *ngSwitch are officially deprecated"
        $warnings += "   Recommended: Migrate to @if, @for, @switch control flow syntax"
        $warnings += "   Migration: npx ng generate @angular/core:control-flow"
        $warnings += ""
        $warnings += "8. Node.js Version Requirements"
        $warnings += "   - Node.js v18 is no longer supported"
        $warnings += "   - Node.js v22.0-22.10 are not supported"
        $warnings += "   Required: Node.js v20.11.1+ or v22.11.0+"
        $warnings += ""
        $warnings += "THIRD-PARTY BREAKING CHANGES:"
        $warnings += ""
        $warnings += "9. Highcharts v11 → v12 Import Syntax (AUTO-FIXED)"
        $warnings += "   Old: import * as Highcharts from 'highcharts';"
        $warnings += "   New: import Highcharts from 'highcharts';"
        $warnings += ""
        $warnings += "10. Highcharts Module Imports (AUTO-FIXED)"
        $warnings += "    Old: import * as HighchartsMore from 'highcharts/highcharts-more';"
        $warnings += "    New: import HighchartsMore from 'highcharts/highcharts-more';"
        $warnings += ""
        $warnings += "NEW FEATURES IN ANGULAR 20:"
        $warnings += ""
        $warnings += "1. Zoneless Change Detection (Developer Preview)"
        $warnings += "   - provideZonelessChangeDetection() now stable for production testing"
        $warnings += "   - Smaller bundle size, better performance"
        $warnings += "   - Requires signals or OnPush strategy"
        $warnings += ""
        $warnings += "2. Enhanced TypeScript 5.6+ Support"
        $warnings += "   - Better type inference"
        $warnings += "   - Stricter null checks"
        $warnings += "   - Iterator helper methods"
        $warnings += ""
        $warnings += "3. Control Flow Syntax Recommended"
        $warnings += "   - @if, @for, @switch now the preferred approach"
        $warnings += "   - Better type narrowing"
        $warnings += "   - Improved performance"
        $warnings += ""
        $warnings += "RECOMMENDED ACTIONS:"
        $warnings += ""
        $warnings += "1. Run build: npm run build"
        $warnings += "2. Run tests: npm test"
        $warnings += "3. Search for InjectFlags usage and update to options object"
        $warnings += "4. Replace TestBed.get with TestBed.inject in all tests"
        $warnings += "5. Update Node.js to v20.11.1+ or v22.11.0+"
        $warnings += "6. Test Highcharts rendering after import changes"
        $warnings += "7. Consider migrating to control flow syntax (@if, @for, @switch)"
        $warnings += "8. Update package.json engines.node field"
        $warnings += ""
        $warnings += "DOCUMENTATION:"
        $warnings += ""
        $warnings += "- Angular 20 Release: https://blog.angular.io"
        $warnings += "- Angular Update Guide: https://update.angular.io/?v=19.0-20.0"
        $warnings += "- Highcharts 12 Changelog: https://www.highcharts.com/blog/changelog/"
        $warnings += "- Control Flow Migration: https://angular.dev/guide/control-flow"
        $warnings += "═══════════════════════════════════════════════════════════════════"

        $totalChanges = $changes.Count
        $totalWarnings = $warnings.Count
        $totalErrors = $errors.Count

        Write-Success "Angular 20 breaking changes processed successfully"
        Write-InfoMessage "  Total automated fixes: $totalChanges"
        Write-InfoMessage "  Total detections/warnings: $totalWarnings"

        if ($totalWarnings -gt 0) {
            Write-Host ""
            Write-WarningMessage "⚠️  Important Warnings and Recommendations:"
            Write-Host ""
            foreach ($warning in $warnings) {
                if ($warning -and $warning -notmatch '^═+$') {
                    Write-WarningMessage "  $warning"
                }
            }
        }

        if ($totalErrors -gt 0) {
            Write-Host ""
            Write-Host "❌ Errors encountered:" -ForegroundColor Red
            foreach ($error in $errors) {
                Write-Host "  $error" -ForegroundColor Red
            }
        }

        return @{
            Success  = $totalErrors -eq 0
            Message  = if ($totalErrors -eq 0) { "Angular 20 breaking changes processed: $totalChanges fix(es), $totalWarnings warning(s)" } else { "Failed with $totalErrors error(s)" }
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Message  = "Failed to apply Angular 20 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

#region Export Module Members

Export-ModuleMember -Function 'Invoke-Angular20BreakingChanges'

#endregion

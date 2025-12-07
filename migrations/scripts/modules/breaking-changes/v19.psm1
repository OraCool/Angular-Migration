<#
.SYNOPSIS
    Angular 19 specific breaking changes fixes and detections.

.DESCRIPTION
    Comprehensive Angular 19 migration handling:

    SECTION 1: Official Angular 19 Core Breaking Changes
    - Detect BrowserModule.withServerTransition() removal
    - Detect KeyValueDiffers.factories removal
    - Detect Testability methods removal (zone.js specific)
    - Warn about ApplicationRef.tick() error handling change
    - Warn about HTTP caching with auth headers
    - Warn about @localize schematic changes
    - Warn about TypeScript <5.9 no longer supported

    SECTION 2: Third-Party Library Migrations
    - Fix @ngx-translate/http-loader@17.0.0 API changes (constructor no longer takes parameters)
    - Fix standalone components being declared instead of imported in NgModules
    - Fix AG-Grid v32 API changes (ColumnApi removed, API methods changed)
    - Fix i18n.service getLangs() readonly return type

    SECTION 3: Comprehensive Warnings
    - All 7 official breaking changes with migration examples
    - Third-party library migration notes
    - TypeScript version requirements
    - Zoneless migration guidance
    - New features overview

.NOTES
    Version: 2.0.0
    Author: Angular Migration Toolkit
    Angular Version: 19
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
    Applies breaking change fixes for Angular 19.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Invoke-Angular19BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 19 breaking changes and migrations..."

    try {
        $srcPath = Join-Path $ProjectPath "src"

        # ========================================================================
        # SECTION 1: OFFICIAL ANGULAR 19 CORE BREAKING CHANGES
        # ========================================================================

        Write-Host ""
        Write-InfoMessage "📋 Section 1: Official Angular 19 Core Breaking Changes"
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        # 1. Detect BrowserModule.withServerTransition() removal [CRITICAL]
        Write-InfoMessage "📝 Checking for BrowserModule.withServerTransition() usage..."

        $moduleFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts') |
                       Where-Object { $_ -match '\.module\.ts$' }

        $withServerTransitionFound = @()

        foreach ($file in $moduleFiles) {
            $content = Get-Content $file -Raw
            if ($content -match '\.withServerTransition\s*\(') {
                $withServerTransitionFound += [System.IO.Path]::GetFileName($file)
            }
        }

        if ($withServerTransitionFound.Count -gt 0) {
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host "  CRITICAL: BrowserModule.withServerTransition() Removed" -ForegroundColor Red
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Red
            Write-Host ""
            Write-WarningMessage "BrowserModule.withServerTransition() has been REMOVED in Angular 19."
            Write-WarningMessage "Found usage in the following files:"
            Write-Host ""

            foreach ($file in $withServerTransitionFound) {
                Write-Host "  ⚠️  $file" -ForegroundColor Yellow
            }

            Write-Host ""
            Write-Host "  Migration Required:" -ForegroundColor Cyan
            Write-Host "  ───────────────────" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  Before (Angular 18):" -ForegroundColor Gray
            Write-Host "    BrowserModule.withServerTransition({ appId: 'my-app' })" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  After (Angular 19):" -ForegroundColor Green
            Write-Host "    imports: [BrowserModule]," -ForegroundColor Green
            Write-Host "    providers: [{ provide: APP_ID, useValue: 'my-app' }]" -ForegroundColor Green
            Write-Host ""
            Write-Host "  Docs: https://angular.dev/api/platform-browser/BrowserModule" -ForegroundColor Cyan
            Write-Host ""

            $warnings += "CRITICAL: Found BrowserModule.withServerTransition() in $($withServerTransitionFound.Count) file(s)"
        } else {
            Write-InfoMessage "  ✓ No BrowserModule.withServerTransition() usage found"
        }

        # 2. Detect KeyValueDiffers.factories removal
        Write-InfoMessage "📝 Checking for KeyValueDiffers.factories usage..."

        $tsFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')
        $keyValueDiffersFactoriesFound = @()

        foreach ($file in $tsFiles) {
            $content = Get-Content $file -Raw
            if ($content -match 'KeyValueDiffers' -and $content -match '\.factories') {
                $keyValueDiffersFactoriesFound += [System.IO.Path]::GetFileName($file)
            }
        }

        if ($keyValueDiffersFactoriesFound.Count -gt 0) {
            Write-WarningMessage "  Found KeyValueDiffers.factories usage in $($keyValueDiffersFactoriesFound.Count) file(s):"
            foreach ($file in $keyValueDiffersFactoriesFound) {
                Write-Host "    - $file" -ForegroundColor Yellow
            }
            $warnings += "KeyValueDiffers.factories property removed in Angular 19"
        } else {
            Write-InfoMessage "  ✓ No KeyValueDiffers.factories usage found"
        }

        # 3. Detect Testability methods removal (zone.js specific)
        Write-InfoMessage "📝 Checking for removed Testability methods..."

        $testabilityMethods = @('increasePendingRequestCount', 'decreasePendingRequestCount', 'getPendingRequestCount')
        $testabilityMethodsFound = @{}

        foreach ($method in $testabilityMethods) {
            $foundFiles = $tsFiles | Where-Object {
                $content = Get-Content $_ -Raw
                $content -match $method
            }
            if ($foundFiles.Count -gt 0) {
                $testabilityMethodsFound[$method] = $foundFiles.Count
            }
        }

        if ($testabilityMethodsFound.Count -gt 0) {
            Write-WarningMessage "  Found removed Testability methods:"
            foreach ($method in $testabilityMethodsFound.Keys) {
                $count = $testabilityMethodsFound[$method]
                Write-Host "    - $method ($count occurrence(s))" -ForegroundColor Yellow
            }
            $warnings += "Testability methods (increasePendingRequestCount, etc.) removed in Angular 19"
        } else {
            Write-InfoMessage "  ✓ No removed Testability methods found"
        }

        # 4. Detect ApplicationRef.tick() usage
        Write-InfoMessage "📝 Checking for ApplicationRef.tick() usage..."

        $appRefTickFound = $tsFiles | Where-Object {
            $content = Get-Content $_ -Raw
            $content -match 'ApplicationRef' -and $content -match '\.tick\s*\('
        }

        if ($appRefTickFound.Count -gt 0) {
            Write-WarningMessage "  Found ApplicationRef.tick() in $($appRefTickFound.Count) file(s)"
            $warnings += "ApplicationRef.tick() error handling changed in Angular 19 - errors no longer caught by ErrorHandler"
        } else {
            Write-InfoMessage "  ✓ No ApplicationRef.tick() usage found"
        }

        # 5. Detect withHttpTransferCache usage
        Write-InfoMessage "📝 Checking for HTTP transfer cache usage..."

        $httpTransferCacheFiles = $tsFiles | Where-Object {
            $content = Get-Content $_ -Raw
            $content -match 'withHttpTransferCache'
        }

        if ($httpTransferCacheFiles.Count -gt 0) {
            Write-WarningMessage "  Found withHttpTransferCache in $($httpTransferCacheFiles.Count) file(s)"
            $warnings += "HTTP caching behavior changed: requests with auth headers are now prevented from caching by default"
        } else {
            Write-InfoMessage "  ✓ No withHttpTransferCache usage found"
        }

        # 6. TypeScript version check
        Write-InfoMessage "📝 Checking TypeScript version requirements..."

        $packageJsonPath = Join-Path $ProjectPath "package.json"
        if (Test-Path $packageJsonPath) {
            $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
            $tsVersion = $null

            if ($packageJson.devDependencies -and $packageJson.devDependencies.typescript) {
                $tsVersion = $packageJson.devDependencies.typescript
            }

            if ($tsVersion) {
                # Extract version number (handle ~, ^, etc.)
                if ($tsVersion -match '[\d\.]+') {
                    $versionNum = $matches[0]
                    $majorMinor = $versionNum -replace '(\d+\.\d+).*', '$1'

                    if ([double]$majorMinor -lt 5.9) {
                        Write-WarningMessage "  TypeScript version $tsVersion may not be supported (Angular 19 requires TS 5.9+)"
                        $warnings += "TypeScript <5.9 is no longer supported in Angular 19"
                    } else {
                        Write-InfoMessage "  ✓ TypeScript version $tsVersion is supported"
                    }
                }
            }
        }

        Write-Success "Section 1 complete: Official Angular 19 breaking changes checked"

        # ========================================================================
        # SECTION 2: THIRD-PARTY LIBRARY MIGRATIONS
        # ========================================================================

        Write-Host ""
        Write-InfoMessage "📦 Section 2: Third-Party Library Migrations"
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        # 7. Fix TranslateHttpLoader constructor (v17.0.0 API change)
        Write-InfoMessage "📝 Fixing @ngx-translate/http-loader@17.0.0 constructor..."

        $translationFixCount = 0
        foreach ($file in $moduleFiles) {
            $content = Get-Content -Path $file -Raw
            $original = $content

            # The new API doesn't accept constructor parameters
            # Old: new TranslateHttpLoader(http, './assets/i18n/', '.json')
            # New: new TranslateHttpLoader(http)
            # Properly capture the http parameter and keep only that
            if ($content -match 'new\s+TranslateHttpLoader\s*\(\s*(\w+)\s*,') {
                $httpParam = $matches[1]
                $content = $content -replace 'new\s+TranslateHttpLoader\s*\([^)]+\)', "new TranslateHttpLoader($httpParam)"
            }

            if ($content -ne $original) {
                Set-Content -Path $file -Value $content -NoNewline
                $translationFixCount++
                $changes += "Fixed TranslateHttpLoader constructor in: $([System.IO.Path]::GetFileName($file))"
            }
        }

        if ($translationFixCount -gt 0) {
            Write-Success "  Fixed TranslateHttpLoader in $translationFixCount file(s)"
        } else {
            Write-InfoMessage "  ✓ No TranslateHttpLoader issues found"
        }

        # 8. Fix standalone components in NgModules
        Write-InfoMessage "📝 Fixing standalone components in NgModules..."
        $standaloneFixCount = 0

        foreach ($file in $moduleFiles) {
            $content = Get-Content -Path $file -Raw
            $original = $content

            # Find all declarations and check if they're standalone
            if ($content -match 'declarations\s*:\s*\[([\s\S]*?)\]') {
                $declarationsBlock = $matches[1]
                $componentNames = $declarationsBlock -split ',' | ForEach-Object { $_.Trim() -replace '^(\w+).*', '$1' } | Where-Object { $_ -ne '' }

                $standaloneComponents = @()

                # Check each component to see if it's standalone
                foreach ($componentName in $componentNames) {
                    # Try to find the component file in the project
                    $componentFiles = Get-ChildItem -Path $srcPath -Recurse -Filter "*$componentName*.ts" -ErrorAction SilentlyContinue |
                                     Where-Object { $_.Name -notmatch '\.spec\.ts$' }

                    foreach ($componentFile in $componentFiles) {
                        $componentContent = Get-Content -Path $componentFile.FullName -Raw -ErrorAction SilentlyContinue
                        if ($componentContent -match "@Component\s*\(\s*\{[\s\S]*?standalone\s*:\s*true[\s\S]*?\}\s*\)") {
                            $standaloneComponents += $componentName
                            break
                        }
                    }
                }

                # If we found standalone components, move them from declarations to imports
                if ($standaloneComponents.Count -gt 0) {
                    Write-InfoMessage "  Found $($standaloneComponents.Count) standalone component(s) in $([System.IO.Path]::GetFileName($file))"

                    # Remove standalone components from declarations
                    foreach ($component in $standaloneComponents) {
                        # Remove from declarations (handle various comma scenarios)
                        $content = $content -replace ",\s*$component\s*(?=,|\s*\])", ''
                        $content = $content -replace "$component\s*,\s*", ''
                        $content = $content -replace "declarations\s*:\s*\[\s*$component\s*\]", 'declarations: []'
                    }

                    # Add to imports array
                    foreach ($component in $standaloneComponents) {
                        if ($content -match 'imports\s*:\s*\[([\s\S]*?)\]') {
                            # Add to existing imports
                            $importsBlock = $matches[1]
                            if ($importsBlock.Trim() -eq '') {
                                # Empty imports array
                                $content = $content -replace 'imports\s*:\s*\[\s*\]', "imports: [$component]"
                            } else {
                                # Non-empty imports - add with comma
                                $content = $content -replace '(imports\s*:\s*\[[\s\S]*?)(\])', "`$1, $component`$2"
                            }
                        } else {
                            # No imports array - create one (add after declarations)
                            $content = $content -replace '(declarations\s*:\s*\[[^\]]*\])', "`$1,`n  imports: [$component]"
                        }
                    }

                    $standaloneFixCount++
                    $changes += "Moved $($standaloneComponents.Count) standalone component(s) to imports in $([System.IO.Path]::GetFileName($file))"
                }
            }

            if ($content -ne $original) {
                Set-Content -Path $file -Value $content -NoNewline
            }
        }

        if ($standaloneFixCount -gt 0) {
            Write-Success "  Fixed standalone components in $standaloneFixCount module(s)"
        } else {
            Write-InfoMessage "  ✓ No standalone component issues found"
        }

        # 9. Fix AG-Grid v32 API changes
        Write-InfoMessage "📝 Fixing AG-Grid v32 API changes..."
        $agGridFixCount = 0

        foreach ($file in $tsFiles) {
            $content = Get-Content -Path $file -Raw
            $original = $content

            # Remove ColumnApi import
            $content = $content -replace ',\s*ColumnApi\s*(?=,|\})', ''
            $content = $content -replace 'ColumnApi\s*,\s*', ''

            # Remove gridColumnApi property declarations
            $content = $content -replace '(private|public|protected)?\s*gridColumnApi\s*[!?]?:\s*ColumnApi\s*;', ''

            # Remove gridColumnApi assignments
            $content = $content -replace 'this\.gridColumnApi\s*=\s*event\.columnApi\s*;', ''

            # Replace setRowData with setGridOption
            $content = $content -replace '\.setRowData\(', '.setGridOption(''rowData'', '

            # Replace setQuickFilter with setGridOption
            $content = $content -replace '\.setQuickFilter\(([^)]+)\)', '.setGridOption(''quickFilterText'', $1)'

            if ($content -ne $original) {
                Set-Content -Path $file -Value $content -NoNewline
                $agGridFixCount++
                $changes += "Fixed AG-Grid API in: $([System.IO.Path]::GetFileName($file))"
            }
        }

        if ($agGridFixCount -gt 0) {
            Write-Success "  Fixed AG-Grid API in $agGridFixCount file(s)"
        } else {
            Write-InfoMessage "  ✓ No AG-Grid API issues found"
        }

        # 10. Fix i18n.service getLangs() readonly return type
        Write-InfoMessage "📝 Fixing i18n.service getLangs() return type..."
        $i18nServicePath = Join-Path $srcPath "app/core/services/i18n.service.ts"

        if (Test-Path $i18nServicePath) {
            $content = Get-Content -Path $i18nServicePath -Raw
            $original = $content

            # Change string[] to readonly string[] or add type cast
            $content = $content -replace 'getLangs\(\):\s*string\[\]', 'getLangs(): readonly string[]'

            # Or add type assertion where it's returned
            $content = $content -replace 'return\s+this\.translate\.getLangs\(\)\s*;', 'return this.translate.getLangs() as string[];'

            if ($content -ne $original) {
                Set-Content -Path $i18nServicePath -Value $content -NoNewline
                $changes += "Fixed i18n.service getLangs() return type"
                Write-Success "  Fixed i18n.service return type"
            }
        } else {
            Write-InfoMessage "  ✓ i18n.service not found (skipped)"
        }

        Write-Success "Section 2 complete: Third-party library migrations applied"

        # ========================================================================
        # SECTION 3: COMPREHENSIVE WARNINGS
        # ========================================================================

        Write-Host ""
        Write-InfoMessage "⚠️  Section 3: Comprehensive Migration Warnings"
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 19 Breaking Changes - Comprehensive Guide"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "OFFICIAL ANGULAR 19 BREAKING CHANGES:"
        $warnings += ""
        $warnings += "1. BrowserModule.withServerTransition() - REMOVED"
        $warnings += "   Old: BrowserModule.withServerTransition({ appId: 'my-app' })"
        $warnings += "   New: imports: [BrowserModule], providers: [{ provide: APP_ID, useValue: 'my-app' }]"
        $warnings += ""
        $warnings += "2. KeyValueDiffers.factories - REMOVED"
        $warnings += "   Migration: Remove usage of .factories property"
        $warnings += ""
        $warnings += "3. Testability Methods - REMOVED (zone.js specific)"
        $warnings += "   - increasePendingRequestCount()"
        $warnings += "   - decreasePendingRequestCount()"
        $warnings += "   - getPendingRequestCount()"
        $warnings += "   Migration: Not needed for zoneless apps"
        $warnings += ""
        $warnings += "4. ApplicationRef.tick() - ERROR HANDLING CHANGED"
        $warnings += "   Impact: No longer catches errors and reports to ErrorHandler"
        $warnings += "   Migration: Wrap tick() calls in try-catch if needed"
        $warnings += ""
        $warnings += "5. HTTP Caching - DEFAULT BEHAVIOR CHANGED"
        $warnings += "   Impact: Requests with auth headers now prevented from caching by default"
        $warnings += "   Opt-out: provideHttpClient(withHttpTransferCache({ includeRequestsWithAuthHeaders: true }))"
        $warnings += ""
        $warnings += "6. @localize Schematic - OPTION REMOVED"
        $warnings += "   Old: ng add @angular/localize --name=my-app"
        $warnings += "   New: ng add @angular/localize --project=my-app"
        $warnings += ""
        $warnings += "7. TypeScript Version - REQUIREMENT UPDATED"
        $warnings += "   Required: TypeScript 5.9 or higher"
        $warnings += "   Check: package.json devDependencies.typescript"
        $warnings += ""
        $warnings += "THIRD-PARTY LIBRARY CHANGES:"
        $warnings += ""
        $warnings += "8. @ngx-translate/http-loader@17.0.0 - CONSTRUCTOR CHANGED"
        $warnings += "   Old: new TranslateHttpLoader(http, './assets/i18n/', '.json')"
        $warnings += "   New: new TranslateHttpLoader(http)"
        $warnings += "   Status: ✅ AUTOMATICALLY FIXED"
        $warnings += ""
        $warnings += "9. Standalone Components in NgModules - BEST PRACTICE"
        $warnings += "   Old: declarations: [StandaloneComponent]"
        $warnings += "   New: imports: [StandaloneComponent]"
        $warnings += "   Status: ✅ AUTOMATICALLY FIXED"
        $warnings += ""
        $warnings += "10. AG-Grid v32 - API CHANGES"
        $warnings += "   - ColumnApi removed (use gridApi instead)"
        $warnings += "   - setRowData() → setGridOption('rowData', data)"
        $warnings += "   - setQuickFilter() → setGridOption('quickFilterText', text)"
        $warnings += "   Status: ✅ AUTOMATICALLY FIXED"
        $warnings += ""
        $warnings += "NEW FEATURES (OPTIONAL):"
        $warnings += ""
        $warnings += "11. Zoneless Change Detection (Stable)"
        $warnings += "   - Remove zone.js dependency (~50KB smaller bundle)"
        $warnings += "   - Use: provideExperimentalZonelessChangeDetection()"
        $warnings += "   - Requires: Signals or OnPush strategy"
        $warnings += ""
        $warnings += "12. resource() API - Async Data Fetching"
        $warnings += "   - New reactive API for loading data"
        $warnings += "   - Docs: https://angular.dev/api/core/resource"
        $warnings += ""
        $warnings += "13. linkedSignal() API - Derived Writable Signals"
        $warnings += "   - Create derived signals with write capability"
        $warnings += "   - Docs: https://angular.dev/api/core/linkedSignal"
        $warnings += ""
        $warnings += "RECOMMENDED ACTIONS:"
        $warnings += ""
        $warnings += "1. Run build: npm run build"
        $warnings += "2. Run tests: npm test"
        $warnings += "3. Run lint: npm run lint"
        $warnings += "4. Search for BrowserModule.withServerTransition in module files"
        $warnings += "5. Update TypeScript to 5.9+ if needed"
        $warnings += "6. Consider enabling zoneless change detection"
        $warnings += "7. Review HTTP caching behavior with auth headers"
        $warnings += "8. Test thoroughly in all supported browsers"
        $warnings += ""
        $warnings += "REFERENCES:"
        $warnings += "- Angular 19 Release: https://blog.angular.dev/meet-angular-v19-7b29dfd05b84"
        $warnings += "- Changelog: https://github.com/angular/angular/blob/main/CHANGELOG.md"
        $warnings += "- Update Guide: https://angular.dev/update-guide?v=18.0-19.0"
        $warnings += "═══════════════════════════════════════════════════════════════════"

        # Summary
        $totalChanges = $changes.Count
        $totalWarnings = $warnings.Count
        $totalErrors = $errors.Count

        Write-Host ""
        Write-InfoMessage "═══════════════════════════════════════════════════════"
        Write-InfoMessage "Angular 19 Migration Summary"
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        if ($totalChanges -gt 0) {
            Write-Success "✅ Applied $totalChanges automated fix(es)"
        }
        if ($totalWarnings -gt 0) {
            Write-WarningMessage "⚠️  Found $totalWarnings warning(s) - manual review recommended"
        }
        if ($totalErrors -gt 0) {
            Write-ErrorMessage "❌ Encountered $totalErrors error(s)"
        }

        Write-Host ""

        if ($totalWarnings -gt 0) {
            Write-WarningMessage "Important Warnings (see above for full details):"
            foreach ($warning in $warnings | Select-Object -First 20) {
                if ($warning -ne "") {
                    Write-WarningMessage "  $warning"
                }
            }
        }

        return @{
            Success  = $totalErrors -eq 0
            Message  = if ($totalErrors -eq 0) { "Angular 19 breaking changes processed: $totalChanges fix(es), $totalWarnings warning(s)" } else { "Failed with $totalErrors error(s)" }
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errorMsg = "Failed to apply Angular 19 breaking changes: $($_.Exception.Message)"
        Write-ErrorMessage $errorMsg
        $errors += $errorMsg

        return @{
            Success  = $false
            Message  = $errorMsg
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

Export-ModuleMember -Function 'Invoke-Angular19BreakingChanges'

<#
.SYNOPSIS
    Angular 18 specific breaking changes fixes.

.DESCRIPTION
    Handles breaking changes introduced in Angular 18:
    - Auto-fix StateKey/TransferState imports (@angular/platform-browser → @angular/core)
    - Detect HttpClientModule deprecation (→ provideHttpClient)
    - Detect ServerTransferStateModule removal
    - Detect removed platform APIs (isPlatformWorkerUi, isPlatformWorkerApp)
    - Warn about OnPush root views change detection change
    - Warn about route redirects must be absolute
    - Inform about signals stable and zoneless change detection

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Angular Version: 18
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 18.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Invoke-Angular18BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 18 breaking change fixes..."

    try {
        $srcPath = Join-Path $ProjectPath "src"

        # ============================================================================
        # SECTION 1: StateKey/TransferState Import Fix (AUTO-FIX)
        # ============================================================================

        Write-InfoMessage "📝 Fixing StateKey/TransferState imports..."

        $tsFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')
        $importFixCount = 0

        foreach ($file in $tsFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $originalContent = $content

                # Check if file has StateKey/TransferState/makeStateKey imports from platform-browser
                if ($content -match "(StateKey|TransferState|makeStateKey)") {
                    if ($content -match "from\s+['\x22]@angular/platform-browser['\x22]") {

                        # Replace imports: platform-browser → core (simple regex replacement)
                        $content = $content -replace "from\s+['\x22]@angular/platform-browser['\x22]", "from '@angular/core'"
                    }
                }

                if ($content -ne $originalContent) {
                    Set-Content -Path $file -Value $content -NoNewline
                    $importFixCount++
                    $fileName = [System.IO.Path]::GetFileName($file)
                    $changes += "Fixed StateKey/TransferState imports in: $fileName"
                }
            }
            catch {
                Write-Verbose "Error processing imports in $file : $_"
                $fileName = [System.IO.Path]::GetFileName($file)
                $warnings += "Could not process imports in: $fileName"
            }
        }

        if ($importFixCount -gt 0) {
            Write-Success "  Fixed StateKey/TransferState imports in $importFixCount file(s)"
        }
        else {
            Write-InfoMessage "  No StateKey/TransferState imports from @angular/platform-browser found"
        }

        # ============================================================================
        # SECTION 2: HttpClientModule Deprecation Detection (CRITICAL)
        # ============================================================================

        Write-InfoMessage "📝 Checking for deprecated HttpClientModule usage..."

        $httpModuleUsages = @()
        $moduleFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts') |
                       Where-Object { $_ -match '\.module\.ts$|main\.ts$|app\.config\.ts$' }

        $httpModulePatterns = @{
            'HttpClientModule'        = 'Use provideHttpClient() instead'
            'HttpClientTestingModule' = 'Use provideHttpClientTesting() instead'
            'HttpClientXsrfModule'    = 'Configure via provideHttpClient(withXsrfConfiguration())'
            'HttpClientJsonpModule'   = 'Configure via provideHttpClient(withJsonpSupport())'
        }

        $httpModuleFound = @{}

        foreach ($file in $moduleFiles) {
            $content = Get-Content $file -Raw
            foreach ($module in $httpModulePatterns.Keys) {
                if ($content -match $module) {
                    if (-not $httpModuleFound.ContainsKey($module)) {
                        $httpModuleFound[$module] = @()
                    }
                    $httpModuleFound[$module] += [System.IO.Path]::GetFileName($file)
                }
            }
        }

        if ($httpModuleFound.Count -gt 0) {
            Write-Host ""
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
            Write-Host "  CRITICAL: HttpClientModule Deprecated in Angular 18" -ForegroundColor Red
            Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
            Write-Host ""
            Write-WarningMessage "HttpClientModule and related modules are DEPRECATED in Angular 18."
            Write-WarningMessage "Found usage in the following files:"
            Write-Host ""

            foreach ($module in $httpModuleFound.Keys) {
                $files = $httpModuleFound[$module]
                $migration = $httpModulePatterns[$module]
                Write-Host "  ⚠️  $module" -ForegroundColor Yellow
                foreach ($file in $files) {
                    Write-Host "      - $file" -ForegroundColor Gray
                }
                Write-Host "      Migration: $migration" -ForegroundColor Cyan
                Write-Host ""
            }

            $warnings += ""
            $warnings += "═══════════════════════════════════════════════════════════════════"
            $warnings += "CRITICAL: HttpClientModule Deprecated - Action Required"
            $warnings += "═══════════════════════════════════════════════════════════════════"
            $warnings += ""
            $warnings += "Angular 18 has deprecated HttpClientModule in favor of provideHttpClient()."
            $warnings += ""
            $warnings += "Migration steps:"
            $warnings += "1. Remove HttpClientModule from imports in NgModule or standalone config"
            $warnings += "2. Add provideHttpClient() to providers array"
            $warnings += ""
            $warnings += "BEFORE (Angular 17):"
            $warnings += "  import { HttpClientModule } from '@angular/common/http';"
            $warnings += "  @NgModule({"
            $warnings += "    imports: [HttpClientModule]"
            $warnings += "  })"
            $warnings += ""
            $warnings += "AFTER (Angular 18):"
            $warnings += "  import { provideHttpClient } from '@angular/common/http';"
            $warnings += "  bootstrapApplication(AppComponent, {"
            $warnings += "    providers: [provideHttpClient()]"
            $warnings += "  });"
            $warnings += ""
            $warnings += "For testing:"
            $warnings += "  import { provideHttpClientTesting } from '@angular/common/http/testing';"
            $warnings += "  TestBed.configureTestingModule({"
            $warnings += "    providers: ["
            $warnings += "      provideHttpClient(),"
            $warnings += "      provideHttpClientTesting()"
            $warnings += "    ]"
            $warnings += "  });"
            $warnings += ""
            $warnings += "The ng update schematic will automatically migrate most cases."
            $warnings += "═══════════════════════════════════════════════════════════════════"
        }
        else {
            Write-InfoMessage "  No deprecated HttpClientModule usage found"
        }

        # ============================================================================
        # SECTION 3: ServerTransferStateModule Removal Detection
        # ============================================================================

        Write-InfoMessage "📝 Checking for removed ServerTransferStateModule..."

        $serverModuleFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')
        $serverTransferStateUsages = @()

        foreach ($file in $serverModuleFiles) {
            $content = Get-Content $file -Raw
            if ($content -match 'ServerTransferStateModule') {
                $serverTransferStateUsages += [System.IO.Path]::GetFileName($file)
            }
        }

        if ($serverTransferStateUsages.Count -gt 0) {
            $warnings += ""
            $warnings += "⚠️  ServerTransferStateModule Removed:"
            $warnings += "  Found in $($serverTransferStateUsages.Count) file(s): $($serverTransferStateUsages -join ', ')"
            $warnings += "  ServerTransferStateModule has been removed in Angular 18."
            $warnings += "  TransferState can now be injected directly without importing a module."
            $warnings += "  Action: Remove ServerTransferStateModule from imports"
            Write-WarningMessage "  Found ServerTransferStateModule usage in $($serverTransferStateUsages.Count) file(s)"
        }
        else {
            Write-InfoMessage "  No ServerTransferStateModule usage found"
        }

        # ============================================================================
        # SECTION 4: Removed Platform APIs Detection
        # ============================================================================

        Write-InfoMessage "📝 Checking for removed platform APIs..."

        $removedApis = @{
            'isPlatformWorkerUi'   = 'Removed (no replacement - WebWorker platform removed)'
            'isPlatformWorkerApp'  = 'Removed (no replacement - WebWorker platform removed)'
            'platformDynamicServer' = 'Removed (use renderApplication from @angular/platform-server)'
            'matchesElement'       = 'Removed from AnimationDriver (internal API)'
        }

        $removedApiUsages = @{}

        foreach ($api in $removedApis.Keys) {
            $usages = $tsFiles | Where-Object {
                $content = Get-Content $_ -Raw
                $content -match $api
            }
            if ($usages.Count -gt 0) {
                $removedApiUsages[$api] = $usages.Count
            }
        }

        if ($removedApiUsages.Count -gt 0) {
            $warnings += ""
            $warnings += "⚠️  Removed Platform APIs Detected:"
            foreach ($api in $removedApiUsages.Keys) {
                $count = $removedApiUsages[$api]
                $migration = $removedApis[$api]
                $warnings += "  - $api ($count occurrence(s)) → $migration"
            }
            Write-WarningMessage "  Found $($removedApiUsages.Count) removed API usage(s)"
        }
        else {
            Write-InfoMessage "  No removed platform APIs detected"
        }

        # ============================================================================
        # SECTION 5: Comprehensive Manual Review Warnings
        # ============================================================================

        Write-InfoMessage "📝 Adding comprehensive manual review warnings..."

        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 18 Breaking Changes - Manual Review Required"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "1. Prerequisites & Dependencies:"
        $warnings += "   - Node.js 18.13.0+ is now required (v16 no longer supported)"
        $warnings += "   - TypeScript 5.4+ is now required (5.3 and older not supported)"
        $warnings += "   - Zone.js 0.14.x recommended (zoneless mode available experimentally)"
        $warnings += "   - Run: node --version (should show v18.13.0 or newer)"
        $warnings += "   - Run: npx tsc --version (should show 5.4.0 or newer)"
        $warnings += ""
        $warnings += "2. HttpClientModule Deprecated (CRITICAL):"
        $warnings += "   HttpClientModule, HttpClientTestingModule, and related modules deprecated."
        $warnings += "   Migration:"
        $warnings += "   - Remove: import { HttpClientModule } from '@angular/common/http'"
        $warnings += "   - Add: import { provideHttpClient } from '@angular/common/http'"
        $warnings += "   - Update: bootstrapApplication(App, { providers: [provideHttpClient()] })"
        $warnings += "   - For JSONP: use provideHttpClient(withJsonpSupport())"
        $warnings += "   - For XSRF: use provideHttpClient(withXsrfConfiguration({...}))"
        $warnings += "   The ng update schematic should handle most migrations automatically."
        $warnings += ""
        $warnings += "3. StateKey/TransferState Import Changes (AUTO-FIXED):"
        $warnings += "   StateKey, TransferState, and makeStateKey moved to @angular/core."
        $warnings += "   Old: import { StateKey, TransferState } from '@angular/platform-browser'"
        $warnings += "   New: import { StateKey, TransferState } from '@angular/core'"
        $warnings += "   These imports have been automatically fixed if found."
        $warnings += ""
        $warnings += "4. ServerTransferStateModule Removed:"
        $warnings += "   ServerTransferStateModule no longer exists."
        $warnings += "   TransferState can now be injected directly without module."
        $warnings += "   Action: Remove ServerTransferStateModule from server module imports"
        $warnings += ""
        $warnings += "5. Platform Worker APIs Removed:"
        $warnings += "   The following were removed without replacement:"
        $warnings += "   - isPlatformWorkerUi (WebWorker platform removed)"
        $warnings += "   - isPlatformWorkerApp (WebWorker platform removed)"
        $warnings += "   Action: Remove these checks if present in your code"
        $warnings += ""
        $warnings += "6. OnPush Root Views Change Detection Change:"
        $warnings += "   OnPush views at the root now need markForCheck() for host bindings."
        $warnings += "   Previous behavior: Root views refreshed host bindings automatically"
        $warnings += "   New behavior: OnPush strategy respected even for root views"
        $warnings += "   Impact: Host bindings on root OnPush components may not update"
        $warnings += "   Action: Call changeDetectorRef.markForCheck() when updating host bindings"
        $warnings += ""
        $warnings += "7. Route Redirects Must Be Absolute:"
        $warnings += "   Relative redirects are no longer allowed in route configuration."
        $warnings += "   Old: { path: 'old', redirectTo: 'new' }  // Relative"
        $warnings += "   New: { path: 'old', redirectTo: '/new' } // Absolute (leading /)"
        $warnings += "   The ng update schematic should automatically fix these."
        $warnings += ""
        $warnings += "8. SSR API Changes:"
        $warnings += "   renderModule deprecated in favor of renderApplication."
        $warnings += "   Old: import { renderModule } from '@angular/platform-server'"
        $warnings += "   New: import { renderApplication } from '@angular/platform-server'"
        $warnings += "   Migration: await renderApplication(AppComponent, { appId: 'app', ... })"
        $warnings += ""
        $warnings += "9. Hydration Enabled by Default (SSR):"
        $warnings += "   For SSR applications, hydration is now enabled by default."
        $warnings += "   Ensure server and client render identical content."
        $warnings += "   Avoid: typeof window !== 'undefined' checks"
        $warnings += "   Use: isPlatformBrowser(inject(PLATFORM_ID)) instead"
        $warnings += ""
        $warnings += "10. Router Guards Can Return RedirectCommand:"
        $warnings += "   Guards can now return RedirectCommand in addition to boolean/UrlTree."
        $warnings += "   Example: return new RedirectCommand(router.parseUrl('/login'))"
        $warnings += "   Update code that expects only boolean | UrlTree from guards."
        $warnings += ""
        $warnings += "11. AnimationDriver.matchesElement Removed:"
        $warnings += "   This internal API has been removed (unused since Ivy)."
        $warnings += "   Action: Remove if referenced in custom animation code"
        $warnings += ""
        $warnings += "12. platformDynamicServer Removed:"
        $warnings += "   Use renderApplication from @angular/platform-server instead."
        $warnings += "   Migration: Switch to standalone bootstrap with renderApplication"
        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 18 New Features (Optional)"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "1. Signals Stable (Production Ready):"
        $warnings += "   Signals, computed, and effects are now stable APIs."
        $warnings += "   Recommended for new development and gradual migration."
        $warnings += "   Example: count = signal(0); doubleCount = computed(() => count() * 2)"
        $warnings += "   Learn more: https://angular.dev/guide/signals"
        $warnings += ""
        $warnings += "2. Experimental Zoneless Change Detection:"
        $warnings += "   Angular can now run without zone.js for better performance."
        $warnings += "   Requirements: Use signals or OnPush everywhere"
        $warnings += "   Enable: provideExperimentalZonelessChangeDetection()"
        $warnings += "   Benefits: Smaller bundles, better performance, simpler mental model"
        $warnings += "   Learn more: https://angular.dev/guide/experimental/zoneless"
        $warnings += ""
        $warnings += "3. Enhanced SSR and Hydration:"
        $warnings += "   - Event replay during hydration (withEventReplay())"
        $warnings += "   - Improved incremental hydration"
        $warnings += "   - Better server-side rendering performance"
        $warnings += "   Learn more: https://angular.dev/guide/hydration"
        $warnings += ""
        $warnings += "4. New @let Syntax (Experimental):"
        $warnings += "   Define template variables without structural directives."
        $warnings += "   Example: @let user = currentUser$ | async;"
        $warnings += "            @if (user) { <p>Welcome {{ user.name }}!</p> }"
        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Testing & Validation Steps"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "1. Build & Test:"
        $warnings += "   - Run build: npm run build"
        $warnings += "   - Run tests: npm test"
        $warnings += "   - Run lint: npm run lint"
        $warnings += ""
        $warnings += "2. Manual Verification:"
        $warnings += "   - Check all route redirects have leading /"
        $warnings += "   - Verify HttpClient still works after provideHttpClient migration"
        $warnings += "   - Test SSR/hydration if using server-side rendering"
        $warnings += "   - Verify OnPush root components work correctly"
        $warnings += ""
        $warnings += "3. Resources:"
        $warnings += "   - Migration guide: migrations/docs/05-migrate-to-angular-18.md"
        $warnings += "   - Official guide: https://update.angular.io/?v=17.0-18.0"
        $warnings += "   - Angular 18 blog: https://blog.angular.io/angular-v18-is-now-available"
        $warnings += "   - Signals guide: https://angular.dev/guide/signals"
        $warnings += "   - Zoneless guide: https://angular.dev/guide/experimental/zoneless"
        $warnings += "═══════════════════════════════════════════════════════════════════"

        Write-Success "Angular 18 breaking changes processed successfully"
        Write-InfoMessage "  Total automated fixes: $($changes.Count)"
        Write-InfoMessage "  Detection warnings: See above for HttpClientModule, removed APIs, etc."

        if ($changes.Count -gt 0) {
            Write-InfoMessage "`n  Automated fixes applied:"
            foreach ($change in $changes) {
                Write-InfoMessage "    ✓ $change"
            }
        }

        return @{
            Success  = $true
            Message  = "Angular 18 breaking changes processed successfully ($($changes.Count) automated fix(es))"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        Write-ErrorMessage "Failed to apply Angular 18 breaking changes: $_"

        return @{
            Success  = $false
            Message  = "Failed to apply Angular 18 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

#region Export Module Members

Export-ModuleMember -Function 'Invoke-Angular18BreakingChanges'

#endregion

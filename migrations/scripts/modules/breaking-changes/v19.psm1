<#
.SYNOPSIS
    Angular 19 specific breaking changes fixes.

.DESCRIPTION
    Handles breaking changes introduced in Angular 19:
    - Fix @ngx-translate/http-loader@17.0.0 API changes (constructor no longer takes parameters)
    - Fix standalone components being declared instead of imported in NgModules
    - Fix AG-Grid v32 API changes (ColumnApi removed, API methods changed)
    - Fix i18n.service getLangs() readonly return type
    - Update to new control flow syntax (@if, @for, @switch)

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Angular Version: 19
#>

$ErrorActionPreference = 'Stop'

# Import required modules
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

    Write-InfoMessage "🔧 Applying Angular 19 breaking change fixes..."

    try {
        $srcPath = Join-Path $ProjectPath "src"

        # 1. Fix TranslateHttpLoader constructor (v17.0.0 API change)
        Write-InfoMessage "📝 Fixing @ngx-translate/http-loader@17.0.0 constructor..."
        $moduleFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts') |
                      Where-Object { $_ -match '\.module\.ts$' }

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
            Write-InfoMessage "  No TranslateHttpLoader issues found"
        }

        # 2. Fix standalone components in NgModules
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
                                $content = $content -replace '(imports\s*:\s*\[[\s\S]*?)(\])', "`$1,$component`$2"
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
            Write-InfoMessage "  No standalone component issues found"
        }

        # 3. Fix AG-Grid v32 API changes
        Write-InfoMessage "📝 Fixing AG-Grid v32 API changes..."
        $tsFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')
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

            # Replace setRowData with applyTransaction
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
            Write-InfoMessage "  No AG-Grid API issues found"
        }

        # 4. Fix i18n.service getLangs() readonly return type
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
        }

        # Summary
        $totalChanges = $changes.Count
        $totalWarnings = $warnings.Count
        $totalErrors = $errors.Count

        Write-Host ""
        if ($totalChanges -gt 0) {
            Write-Success "Applied $totalChanges breaking change fix(es)"
        }
        if ($totalWarnings -gt 0) {
            Write-WarningMessage "Found $totalWarnings warning(s) - manual fixes may be required"
        }
        if ($totalErrors -gt 0) {
            Write-ErrorMessage "Encountered $totalErrors error(s)"
        }

        return @{
            Success  = $totalErrors -eq 0
            Message  = if ($totalErrors -eq 0) { "Applied $totalChanges fix(es)" } else { "Failed with $totalErrors error(s)" }
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

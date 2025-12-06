<#
.SYNOPSIS
    Angular 16 specific breaking changes fixes.

.DESCRIPTION
    Handles breaking changes introduced in Angular 16:
    - Migrate Sass @import to @use for Material themes
    - Remove PerfectScrollbar (deprecated, use native CSS scrolling)
    - Update ScrollableContainerComponent to native overflow
    - Warnings about View Engine removal, TypeScript 4.9+, Zone.js 0.13+

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Angular Version: 16
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 16.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Invoke-Angular16BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 16 breaking change fixes..."

    try {
        $srcPath = Join-Path $ProjectPath "src"

        # 1. Migrate Sass @import to @use for Angular Material themes
        Write-InfoMessage "📝 Migrating Sass @import to @use for Material themes..."

        $scssFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.scss')
        $sassFilesFixed = 0

        foreach ($file in $scssFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $originalContent = $content

                # Skip if already migrated to @use syntax
                if ($content -match "@use\s+['""]@angular/material['""]" -and $content -notmatch "@import\s+['""]~?@angular/material") {
                    continue
                }

                # Skip if file has no Material imports
                if ($content -notmatch "@import\s+['""]~?@angular/material") {
                    continue
                }

                # Replace @import with @use for Material theme files
                # Handles both single and double quotes, with optional ~ prefix
                $content = $content -replace "@import\s+['""]~?@angular/material/theming['""];?", "@use '@angular/material' as mat;"
                $content = $content -replace "@import\s+['""]~?@angular/material/prebuilt-themes/[^'""]+['""];?", "@use '@angular/material' as mat;"

                # Replace common theme function calls (only if not already using mat. prefix)
                $content = $content -replace "(?<!mat\.)\bmat-palette\(", "mat.define-palette("
                $content = $content -replace "(?<!mat\.)\bmat-light-theme\(", "mat.define-light-theme("
                $content = $content -replace "(?<!mat\.)\bmat-dark-theme\(", "mat.define-dark-theme("
                $content = $content -replace "(?<!mat\.)\bmat-typography-config\(", "mat.define-typography-config("

                # Validate migration was successful
                if ($content -ne $originalContent) {
                    # Verify @use syntax exists and @import is gone
                    if ($content -match "@use\s+['""]@angular/material['""]" -and $content -notmatch "@import\s+['""]~?@angular/material") {
                        Set-Content -Path $file -Value $content -NoNewline
                        $sassFilesFixed++
                        $changes += "Migrated Sass @import to @use in: $([System.IO.Path]::GetFileName($file))"
                    }
                    else {
                        $fileName = [System.IO.Path]::GetFileName($file)
                        $warnings += "Sass migration may need manual review in: $fileName"
                    }
                }
            }
            catch {
                Write-Verbose "Error processing Sass file $file : $_"
                $fileName = [System.IO.Path]::GetFileName($file)
                $warnings += "Could not process Sass file: $fileName"
            }
        }

        if ($sassFilesFixed -gt 0) {
            Write-Success "  Migrated $sassFilesFixed Sass file(s) to @use syntax"
        } else {
            Write-InfoMessage "  No Sass @import statements found that need migration"
        }

        # 2. Remove PerfectScrollbar (no longer needed, use native CSS scrolling)
        Write-InfoMessage "📝 Removing PerfectScrollbar imports from modules..."
        $moduleFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts') |
                       Where-Object { $_ -match '\.module\.ts$' }

        $perfectScrollbarRemoved = 0
        foreach ($file in $moduleFiles) {
            $content = Get-Content -Path $file -Raw
            $original = $content

            # Remove PerfectScrollbar import statement
            $content = $content -replace "import\s*\{[^}]*PerfectScrollbar[^}]*\}\s*from\s*['""]ngx-perfect-scrollbar['""];\s*`n?", ""

            # Remove from imports/exports arrays (handle commas correctly)
            # Pattern 1: PerfectScrollbarModule followed by comma
            $content = $content -replace 'PerfectScrollbarModule\s*,\s*', ''
            # Pattern 2: Comma followed by PerfectScrollbarModule (at end of array)
            $content = $content -replace ',\s*PerfectScrollbarModule\s*(?=\])', ''
            # Pattern 3: Standalone PerfectScrollbarModule (only item in array)
            $content = $content -replace 'PerfectScrollbarModule', ''

            if ($content -ne $original) {
                Set-Content -Path $file -Value $content -NoNewline
                $perfectScrollbarRemoved++
                $changes += "Removed PerfectScrollbarModule from $([System.IO.Path]::GetFileName($file))"
            }
        }

        if ($perfectScrollbarRemoved -gt 0) {
            Write-Success "  Removed PerfectScrollbar from $perfectScrollbarRemoved module(s)"
        } else {
            Write-InfoMessage "  No PerfectScrollbar imports found"
        }

        # 3. Update ScrollableContainerComponent to use native CSS scrolling
        Write-InfoMessage "📝 Updating ScrollableContainerComponent to use native CSS scrolling..."
        $scrollableComponentPath = Join-Path $srcPath "app/shared/components/scrollable-container/scrollable-container.component.ts"

        if (Test-Path $scrollableComponentPath) {
            $content = Get-Content -Path $scrollableComponentPath -Raw
            $original = $content

            # Remove PerfectScrollbar import
            $content = $content -replace "import\s*\{[^}]*PerfectScrollbar[^}]*\}\s*from\s*['""]ngx-perfect-scrollbar['""];\s*`n?", ""

            # Replace PerfectScrollbar config with simple inputs
            $content = $content -replace "@Input\(\)\s+config\?:\s*PerfectScrollbarConfigInterface;", "@Input() suppressScrollX: boolean = false;`n  @Input() suppressScrollY: boolean = false;"

            # Remove scrollbarConfig property
            $content = $content -replace "scrollbarConfig:\s*PerfectScrollbarConfigInterface\s*=\s*\{[^}]+\};", ""

            if ($content -ne $original) {
                Set-Content -Path $scrollableComponentPath -Value $content -NoNewline
                $changes += "Updated ScrollableContainerComponent to use native CSS scrolling"
                Write-Success "  Updated ScrollableContainerComponent"
            }
        }

        # Update ScrollableContainerComponent HTML template
        $scrollableTemplatePath = Join-Path $srcPath "app/shared/components/scrollable-container/scrollable-container.component.html"

        if (Test-Path $scrollableTemplatePath) {
            $content = Get-Content -Path $scrollableTemplatePath -Raw
            $original = $content

            # Replace perfectScrollbar directive with native CSS overflow
            $content = $content -replace '\[perfectScrollbar\]="scrollbarConfig"', '[style.overflow-x]="suppressScrollX ? ''hidden'' : ''auto''"[NEWLINE]  [style.overflow-y]="suppressScrollY ? ''hidden'' : ''auto''"'
            $content = $content -replace '\[NEWLINE\]', "`n"

            if ($content -ne $original) {
                Set-Content -Path $scrollableTemplatePath -Value $content -NoNewline
                $changes += "Updated ScrollableContainerComponent template"
                Write-Success "  Updated ScrollableContainerComponent template"
            }
        }

        # 4. Add warnings about breaking changes that require manual intervention
        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 16 Breaking Changes - Manual Review Required"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "1. TypeScript & Dependencies:"
        $warnings += "   - TypeScript 4.9+ is now required (4.8 no longer supported)"
        $warnings += "   - Zone.js 0.11.x and 0.12.x are no longer supported (use 0.13+)"
        $warnings += "   - Node.js v14 is no longer supported (use v16 or v18)"
        $warnings += ""
        $warnings += "2. View Engine Removal:"
        $warnings += "   - View Engine (ngcc) has been removed"
        $warnings += "   - Ensure all dependencies are Ivy-compatible"
        $warnings += "   - Check package.json for any View Engine-only libraries"
        $warnings += ""
        $warnings += "3. API Removals:"
        $warnings += "   - entryComponents deleted from @NgModule and @Component APIs"
        $warnings += "   - XhrFactory export from @angular/common/http has been removed"
        $warnings += "     * Use: import { XhrFactory } from '@angular/common' instead"
        $warnings += "   - EventManager.addGlobalEventListener has been removed"
        $warnings += "     * Use: addEventListener or Renderer2 instead"
        $warnings += "   - ReflectiveInjector has been removed"
        $warnings += "     * Use: Injector.create() as replacement"
        $warnings += "   - BrowserTransferStateModule has been removed"
        $warnings += "     * TransferState can be injected directly without module"
        $warnings += ""
        $warnings += "4. Testing Changes:"
        $warnings += "   - MockPlatformLocation is now provided by default in tests"
        $warnings += "   - Tests relying on BrowserPlatformLocation may need updates"
        $warnings += "   - Check direct window.history access in tests and components"
        $warnings += "   - Use Angular Location APIs instead of direct browser APIs"
        $warnings += ""
        $warnings += "5. Angular Material:"
        $warnings += "   - Deprecated: ripple property on MatButton, MatCheckbox, MatChip"
        $warnings += "   - Material theme mixins now have stricter validation"
        $warnings += "   - Review custom themes for compatibility"
        $warnings += "   - Sass @import → @use migration (attempted above, verify results)"
        $warnings += ""
        $warnings += "6. Type System Changes:"
        $warnings += "   - QueryList.filter now supports type narrowing"
        $warnings += "   - May require updates if using type guard functions"
        $warnings += "   - Scroll event's routerEvent may be NavigationSkipped (not just NavigationEnd)"
        $warnings += ""
        $warnings += "7. Recommended Actions:"
        $warnings += "   - Run build: npm run build"
        $warnings += "   - Run tests: npm test"
        $warnings += "   - Run lint: npm run lint"
        $warnings += "   - Search for removed APIs: EventManager.addGlobalEventListener, ReflectiveInjector"
        $warnings += "   - Review Material components using ripple property"
        $warnings += "   - Test thoroughly in all supported browsers"
        $warnings += "═══════════════════════════════════════════════════════════════════"

        Write-Success "Angular 16 breaking changes processed successfully"
        Write-InfoMessage "  Total changes: $($changes.Count)"

        if ($warnings.Count -gt 0) {
            Write-WarningMessage "`nImportant Warnings:"
            foreach ($warning in $warnings) {
                Write-WarningMessage "  $warning"
            }
        }

        return @{
            Success  = $true
            Message  = "Angular 16 breaking changes processed successfully"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Message  = "Failed to apply Angular 16 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

#region Export Module Members

Export-ModuleMember -Function 'Invoke-Angular16BreakingChanges'

#endregion

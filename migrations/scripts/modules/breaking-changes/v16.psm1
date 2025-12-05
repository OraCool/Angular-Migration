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
            $content = Get-Content -Path $file -Raw
            $originalContent = $content

            # Replace @import with @use for Material theme files
            $content = $content -replace "@import\s+['""]~?@angular/material/theming['""]", "@use '@angular/material' as mat"
            $content = $content -replace "@import\s+['""]~?@angular/material/prebuilt-themes/[^'""]+['""]", "@use '@angular/material' as mat"

            # Replace common theme function calls
            $content = $content -replace "\bmat-palette\(", "mat.define-palette("
            $content = $content -replace "\bmat-light-theme\(", "mat.define-light-theme("
            $content = $content -replace "\bmat-dark-theme\(", "mat.define-dark-theme("
            $content = $content -replace "\bmat-typography-config\(", "mat.define-typography-config("

            if ($content -ne $originalContent) {
                Set-Content -Path $file -Value $content -NoNewline
                $sassFilesFixed++
                $changes += "Migrated Sass @import to @use in: $([System.IO.Path]::GetFileName($file))"
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
        $warnings += "Angular 16 Breaking Changes - Manual Review Required:"
        $warnings += "  - TypeScript 4.9+ is now required"
        $warnings += "  - Zone.js 0.11.x and 0.12.x are no longer supported (use 0.13+)"
        $warnings += "  - View Engine (ngcc) has been removed - ensure all dependencies are Ivy-compatible"
        $warnings += "  - Deprecated: ripple property on MatButton, MatCheckbox, MatChip"
        $warnings += "  - entryComponents deleted from @NgModule and @Component APIs"
        $warnings += "  - XhrFactory export from @angular/common/http has been removed"
        $warnings += "  - Material theme mixins now have stricter validation - review custom themes"
        $warnings += "  - If using Sass @import for Material themes, migrate to @use (attempted above)"

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

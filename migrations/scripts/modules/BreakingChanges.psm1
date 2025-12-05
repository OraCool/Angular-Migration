<#
.SYNOPSIS
    Breaking changes fix utilities for Angular migrations.

.DESCRIPTION
    Provides automated fixes for version-specific Angular breaking changes including
    Material API changes, deprecated package removal, and code transformations.

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Based on: /packages/workflow-engine/src/utils/breaking-changes.ts
#>

$ErrorActionPreference = 'Stop'

# Import Utilities module
$UtilitiesModule = Join-Path $PSScriptRoot "Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

#region File Search and Replace Functions

<#
.SYNOPSIS
    Finds files matching patterns in a directory tree.

.PARAMETER Path
    Root directory path to search.

.PARAMETER FileExtensions
    Array of file extensions to match (e.g., ".ts", ".html").

.PARAMETER ExcludePatterns
    Array of directory patterns to exclude.

.RETURNS
    Array of matching file paths.
#>
function Find-ProjectFiles {
    [CmdletBinding()]
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $false)]
        [string[]]$FileExtensions = @('.ts', '.html', '.scss', '.css'),

        [Parameter(Mandatory = $false)]
        [string[]]$ExcludePatterns = @('node_modules', 'dist', '.angular', 'coverage')
    )

    $files = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
             Where-Object {
                 $file = $_
                 $isExcluded = $false

                 # Check if file is in excluded directory
                 foreach ($pattern in $ExcludePatterns) {
                     if ($file.FullName -like "*\$pattern\*" -or $file.FullName -like "*/$pattern/*") {
                         $isExcluded = $true
                         break
                     }
                 }

                 # Check if file has matching extension
                 $hasMatchingExtension = $FileExtensions -contains $file.Extension

                 -not $isExcluded -and $hasMatchingExtension
             }

    return $files.FullName
}

<#
.SYNOPSIS
    Applies regex replacements to files.

.PARAMETER Path
    Directory path to search.

.PARAMETER Pattern
    Regex pattern to match.

.PARAMETER Replacement
    Replacement string.

.PARAMETER FileExtensions
    File extensions to process.

.RETURNS
    Array of modified file paths.
#>
function Find-AndReplace {
    [CmdletBinding()]
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Pattern,

        [Parameter(Mandatory = $true)]
        [string]$Replacement,

        [Parameter(Mandatory = $false)]
        [string[]]$FileExtensions = @('.ts', '.html', '.scss', '.css')
    )

    $modifiedFiles = @()
    $files = Find-ProjectFiles -Path $Path -FileExtensions $FileExtensions

    foreach ($file in $files) {
        try {
            $content = Get-Content -Path $file -Raw
            $newContent = $content -replace $Pattern, $Replacement

            if ($content -ne $newContent) {
                Set-Content -Path $file -Value $newContent -NoNewline
                $modifiedFiles += $file
            }
        }
        catch {
            Write-Verbose "Error processing file $file : $_"
        }
    }

    return $modifiedFiles
}

#endregion

#region Version-Specific Breaking Changes Fixes

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 16.

.DESCRIPTION
    Fixes for Angular 16:
    - Migrate Sass @import to @use for Material themes
    - Add warnings about View Engine removal
    - Add warnings about deprecated ripple properties
    - Note: Material Chips API migration (mat-chip-list → mat-chip-set) was in v15, not v16!

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Fix-Angular16BreakingChanges {
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

        # 2. Add warnings about breaking changes that require manual intervention
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

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 17.

.DESCRIPTION
    Fixes for Angular 17:
    - Material MDC migration warnings
    - Legacy component detection
    - Form field appearance updates

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Fix-Angular17BreakingChanges {
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

        # 1. Check for legacy Material components
        Write-InfoMessage "📝 Checking for legacy Material components..."
        $files = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts', '.html')

        foreach ($file in $files) {
            $content = Get-Content -Path $file -Raw

            if ($content -match 'mat-legacy-') {
                $warnings += "Legacy Material component found in: $([System.IO.Path]::GetFileName($file))"
            }
        }

        # 2. Replace appearance="legacy" with appearance="outline"
        Write-InfoMessage "📝 Updating form field appearance..."
        $modifiedFiles = Find-AndReplace -Path $srcPath `
                                          -Pattern 'appearance="legacy"' `
                                          -Replacement 'appearance="outline"' `
                                          -FileExtensions @('.html')

        if ($modifiedFiles.Count -gt 0) {
            $changes += "Updated form field appearance in $($modifiedFiles.Count) files"
        }

        # 3. Add warning about Material theme updates
        $warnings += "Manual review required: Custom Material themes may need updates for MDC components"
        $warnings += "Run 'ng generate @angular/material:mdc-migration' to complete MDC migration"

        Write-Success "Angular 17 breaking changes fixes applied"
        Write-InfoMessage "  Total changes: $($changes.Count)"
        Write-InfoMessage "  Warnings: $($warnings.Count)"

        return @{
            Success  = $true
            Message  = "Angular 17 breaking changes fixes applied"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Message  = "Failed to apply Angular 17 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 19.

.DESCRIPTION
    Fixes for Angular 19:
    - AG-Grid v32 migration notes
    - Deprecated package warnings
    - Zoneless support preparation

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Fix-Angular19BreakingChanges {
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
        # Check package.json for affected packages
        $packageJsonPath = Join-Path $ProjectPath "package.json"

        if (Test-Path $packageJsonPath) {
            $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

            # Check for AG-Grid
            if ($packageJson.dependencies.PSObject.Properties.Name -contains 'ag-grid-angular') {
                $warnings += "AG-Grid v32 has breaking changes in row selection API - manual review required"
                $warnings += "See: https://www.ag-grid.com/angular-data-grid/upgrading-to-ag-grid-32/"
            }

            # Check for deprecated packages
            $deprecatedPackages = @('ngx-material-timepicker', '@swimlane/ngx-graph')
            foreach ($pkg in $deprecatedPackages) {
                if ($packageJson.dependencies.PSObject.Properties.Name -contains $pkg) {
                    $warnings += "Package '$pkg' may have compatibility issues with Angular 19"
                }
            }
        }

        # Add zoneless mode preparation notes
        $warnings += "Angular 19 introduces stable zoneless support - consider migration after upgrade"
        $warnings += "Review signal adoption for better zoneless compatibility"

        Write-Success "Angular 19 breaking changes review completed"
        Write-InfoMessage "  Warnings: $($warnings.Count)"

        return @{
            Success  = $true
            Message  = "Angular 19 breaking changes review completed"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Message  = "Failed to review Angular 19 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 20.

.DESCRIPTION
    Fixes for Angular 20:
    - Highcharts v12 migration
    - Final deprecated package cleanup
    - Zoneless mode recommendations

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Fix-Angular20BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 20 breaking change fixes..."

    try {
        # Check package.json for Highcharts
        $packageJsonPath = Join-Path $ProjectPath "package.json"

        if (Test-Path $packageJsonPath) {
            $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

            # Check for Highcharts
            if ($packageJson.dependencies.PSObject.Properties.Name -contains 'highcharts') {
                $warnings += "Highcharts v12 has breaking changes - review changelog"
                $warnings += "See: https://www.highcharts.com/blog/changelog/#highcharts-v12.0.0"
            }

            # Check for highcharts-angular
            if ($packageJson.dependencies.PSObject.Properties.Name -contains 'highcharts-angular') {
                $warnings += "highcharts-angular v5 requires Highcharts v12+"
            }
        }

        # Add final migration recommendations
        $warnings += "Angular 20 is the final target version - consider these next steps:"
        $warnings += "  1. Migrate to zoneless mode for better performance"
        $warnings += "  2. Adopt signal-based components and inputs"
        $warnings += "  3. Review and update to Material 3 design tokens"
        $warnings += "  4. Update to latest Node.js LTS (20.11+ or 22+)"

        Write-Success "Angular 20 breaking changes review completed"
        Write-InfoMessage "  Warnings: $($warnings.Count)"

        return @{
            Success  = $true
            Message  = "Angular 20 breaking changes review completed"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Message  = "Failed to review Angular 20 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 15.

.DESCRIPTION
    Fixes for Angular 15 are minimal - mainly documentation and preparation.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Fix-Angular15BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()

    Write-InfoMessage "🔧 Applying Angular 15 breaking changes..."

    # Material 15 Chips API Migration
    Write-InfoMessage "  Migrating Material Chips API (mat-chip-list → mat-chip-set)..."

    # Find all HTML files
    $htmlFiles = Find-ProjectFiles -Path $ProjectPath -FileExtensions @('.html')
    $chipFilesFixed = 0

    foreach ($file in $htmlFiles) {
        $content = Get-Content -Path $file -Raw
        $originalContent = $content

        # Replace mat-chip-list with mat-chip-set
        $content = $content -replace '<mat-chip-list\s', '<mat-chip-set '
        $content = $content -replace '</mat-chip-list>', '</mat-chip-set>'

        # Replace mat-chip-list attributes
        $content = $content -replace '\#chipList', '#chipSet'
        $content = $content -replace 'chipList', 'chipSet'

        # Note: mat-chip usually becomes mat-chip-option inside chip sets
        # but we need to be careful - standalone mat-chip might stay as is
        # The ng update schematic should handle this, but if not:
        # $content = $content -replace '<mat-chip\s', '<mat-chip-option '
        # $content = $content -replace '</mat-chip>', '</mat-chip-option>'

        if ($content -ne $originalContent) {
            Set-Content -Path $file -Value $content -NoNewline
            $chipFilesFixed++
            $changes += "Updated Material Chips API in: $file"
        }
    }

    if ($chipFilesFixed -gt 0) {
        Write-Success "  Fixed Material Chips API in $chipFilesFixed file(s)"
    }
    else {
        Write-InfoMessage "  No Material Chips API usage found"
    }

    # TypeScript imports migration
    Write-InfoMessage "  Updating TypeScript imports..."
    $tsFiles = Find-ProjectFiles -Path $ProjectPath -FileExtensions @('.ts')
    $importFilesFixed = 0

    foreach ($file in $tsFiles) {
        $content = Get-Content -Path $file -Raw
        $originalContent = $content

        # Replace MatChipList imports
        $content = $content -replace 'MatChipList', 'MatChipSet'
        $content = $content -replace 'MatChipListModule', 'MatChipsModule'

        if ($content -ne $originalContent) {
            Set-Content -Path $file -Value $content -NoNewline
            $importFilesFixed++
            $changes += "Updated imports in: $file"
        }
    }

    if ($importFilesFixed -gt 0) {
        Write-Success "  Fixed imports in $importFilesFixed file(s)"
    }

    $warnings += "Angular 15 introduces standalone components (optional)"
    $warnings += "TypeScript 4.8+ is required"
    $warnings += "Review Material Chips changes - some mat-chip may need to be mat-chip-option"

    Write-Success "Angular 15 breaking changes applied successfully"

    return @{
        Success  = $true
        Message  = "Angular 15 breaking changes applied ($($changes.Count) changes)"
        Changes  = $changes
        Warnings = $warnings
        Errors   = @()
    }
}

<#
.SYNOPSIS
    Applies breaking change fixes for a specific Angular version.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER Version
    Angular version (15, 16, 17, 19, 20).

.RETURNS
    Hashtable with fix results.

.EXAMPLE
    $result = Invoke-BreakingChangesFix -ProjectPath "C:\MyProject" -Version "16"
#>
function Invoke-BreakingChangesFix {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $true)]
        [ValidateSet("15", "16", "17", "19", "20")]
        [string]$Version
    )

    Write-InfoMessage "🔧 Applying Angular $Version breaking change fixes..."

    switch ($Version) {
        "15" { return Fix-Angular15BreakingChanges -ProjectPath $ProjectPath }
        "16" { return Fix-Angular16BreakingChanges -ProjectPath $ProjectPath }
        "17" { return Fix-Angular17BreakingChanges -ProjectPath $ProjectPath }
        "19" { return Fix-Angular19BreakingChanges -ProjectPath $ProjectPath }
        "20" { return Fix-Angular20BreakingChanges -ProjectPath $ProjectPath }
        default {
            return @{
                Success  = $true
                Message  = "No automated fixes available for Angular $Version"
                Changes  = @()
                Warnings = @("No breaking change fixes defined for version $Version")
                Errors   = @()
            }
        }
    }
}

#endregion

#region Export Module Members

Export-ModuleMember -Function @(
    'Find-ProjectFiles',
    'Find-AndReplace',
    'Fix-Angular15BreakingChanges',
    'Fix-Angular16BreakingChanges',
    'Fix-Angular17BreakingChanges',
    'Fix-Angular19BreakingChanges',
    'Fix-Angular20BreakingChanges',
    'Invoke-BreakingChangesFix'
)

#endregion

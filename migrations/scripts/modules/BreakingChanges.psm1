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
    - Material Chips API changes (mat-chip-list → mat-chip-set)
    - Remove ngx-perfect-scrollbar
    - Replace with native CSS scrolling

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

        # 1. Fix Angular Material Chips API in HTML files
        Write-InfoMessage "📝 Fixing Angular Material Chips API..."

        $chipReplacements = @(
            @{ Pattern = '<mat-chip-list'; Replacement = '<mat-chip-set'; Ext = @('.html') },
            @{ Pattern = '</mat-chip-list>'; Replacement = '</mat-chip-set>'; Ext = @('.html') },
            @{ Pattern = '<mat-chip\s'; Replacement = '<mat-chip-option '; Ext = @('.html') },
            @{ Pattern = '</mat-chip>'; Replacement = '</mat-chip-option>'; Ext = @('.html') },
            @{ Pattern = 'mat-chip-list'; Replacement = 'mat-chip-set'; Ext = @('.scss', '.css') }
        )

        foreach ($replacement in $chipReplacements) {
            $modifiedFiles = Find-AndReplace -Path $srcPath `
                                              -Pattern $replacement.Pattern `
                                              -Replacement $replacement.Replacement `
                                              -FileExtensions $replacement.Ext

            if ($modifiedFiles.Count -gt 0) {
                $changes += "Updated Material Chips API in $($modifiedFiles.Count) files"
                Write-Verbose "  Modified: $($modifiedFiles -join ', ')"
            }
        }

        # 2. Remove ngx-perfect-scrollbar from package.json
        Write-InfoMessage "📝 Removing ngx-perfect-scrollbar..."
        $packageJsonPath = Join-Path $ProjectPath "package.json"

        if (Test-Path $packageJsonPath) {
            $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

            if ($packageJson.dependencies.PSObject.Properties.Name -contains 'ngx-perfect-scrollbar') {
                $packageJson.dependencies.PSObject.Properties.Remove('ngx-perfect-scrollbar')
                $packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath
                $changes += "Removed ngx-perfect-scrollbar from package.json"
            }
        }

        # 3. Remove PerfectScrollbarModule imports from module files
        Write-InfoMessage "📝 Removing PerfectScrollbarModule imports..."
        $moduleFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts') |
                       Where-Object { $_ -match '\.module\.ts$' }

        foreach ($file in $moduleFiles) {
            $content = Get-Content -Path $file -Raw
            $original = $content

            # Remove import statement
            $content = $content -replace "import\s*\{[^}]*PerfectScrollbarModule[^}]*\}\s*from\s*['""][^'""]*['""];\s*`n?", ""

            # Remove from imports array
            $content = $content -replace ',?\s*PerfectScrollbarModule\s*,?', ''

            if ($content -ne $original) {
                Set-Content -Path $file -Value $content -NoNewline
                $changes += "Removed PerfectScrollbarModule from $([System.IO.Path]::GetFileName($file))"
            }
        }

        Write-Success "Angular 16 breaking changes fixed successfully"
        Write-InfoMessage "  Total changes: $($changes.Count)"

        return @{
            Success  = $true
            Message  = "Angular 16 breaking changes fixed successfully"
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

    Write-InfoMessage "🔧 Checking Angular 15 breaking changes..."

    # Angular 15 breaking changes are mostly handled by ng update schematics
    $warnings += "Angular 15 introduces standalone components (optional)"
    $warnings += "TypeScript 4.8+ is required"
    $warnings += "Most breaking changes are handled automatically by 'ng update'"

    Write-Success "Angular 15 breaking changes review completed"

    return @{
        Success  = $true
        Message  = "Angular 15 breaking changes review completed"
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

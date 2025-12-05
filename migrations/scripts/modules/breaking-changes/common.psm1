<#
.SYNOPSIS
    Common utilities for breaking changes fixes.

.DESCRIPTION
    Shared functions for file search, pattern replacement, and other
    common operations used across version-specific breaking changes.

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
#>

$ErrorActionPreference = 'Stop'

# Import Utilities module
$UtilitiesModule = Join-Path $PSScriptRoot "..\Utilities.psm1"
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

#region Export Module Members

Export-ModuleMember -Function @(
    'Find-ProjectFiles',
    'Find-AndReplace'
)

#endregion

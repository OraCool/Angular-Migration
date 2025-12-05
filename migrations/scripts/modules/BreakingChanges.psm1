<#
.SYNOPSIS
    Breaking changes fix dispatcher for Angular migrations.

.DESCRIPTION
    Central dispatcher that routes breaking changes fixes to version-specific
    modules. This keeps the codebase organized and maintainable by separating
    each Angular version's breaking changes into dedicated files.

.NOTES
    Version: 2.0.0
    Author: Angular Migration Toolkit

    Architecture:
    - Main dispatcher (this file) routes to version-specific modules
    - Common utilities in breaking-changes/common.psm1
    - Version-specific fixes in breaking-changes/v{VERSION}.psm1
#>

$ErrorActionPreference = 'Stop'

# Import Utilities module
$UtilitiesModule = Join-Path $PSScriptRoot "Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

#region Version-Specific Breaking Changes Dispatcher

<#
.SYNOPSIS
    Applies breaking change fixes for a specific Angular version.

.DESCRIPTION
    Routes to the appropriate version-specific module to apply breaking changes.
    Each Angular version has its own dedicated module for maintainability.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER Version
    Angular version (15, 16, 17, 18, 19, 20).

.RETURNS
    Hashtable with fix results including success status, changes, warnings, and errors.

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
        [ValidateSet("15", "16", "17", "18", "19", "20")]
        [string]$Version
    )

    Write-InfoMessage "🔍 Loading breaking changes for Angular $Version..."

    # Determine version-specific module path
    $versionModulePath = Join-Path $PSScriptRoot "breaking-changes\v$Version.psm1"

    # Check if version-specific module exists
    if (-not (Test-Path $versionModulePath)) {
        Write-WarningMessage "No breaking changes module found for Angular $Version"
        Write-InfoMessage "  Expected path: $versionModulePath"
        Write-InfoMessage "  Skipping breaking changes fixes for this version"

        return @{
            Success  = $true
            Message  = "No breaking changes defined for Angular $Version"
            Changes  = @()
            Warnings = @("No breaking changes module found for version $Version")
            Errors   = @()
        }
    }

    try {
        # Import version-specific module
        Import-Module $versionModulePath -Force -DisableNameChecking

        # Call version-specific function
        $functionName = "Invoke-Angular${Version}BreakingChanges"

        if (Get-Command $functionName -ErrorAction SilentlyContinue) {
            Write-InfoMessage "✅ Executing $functionName..."
            $result = & $functionName -ProjectPath $ProjectPath
            return $result
        }
        else {
            throw "Function $functionName not found in module $versionModulePath"
        }
    }
    catch {
        Write-ErrorMessage "Failed to apply breaking changes for Angular $Version : $_"
        return @{
            Success  = $false
            Message  = "Failed to apply breaking changes"
            Changes  = @()
            Warnings = @()
            Errors   = @($_.Exception.Message)
        }
    }
}

#endregion

#region Export Module Members

Export-ModuleMember -Function 'Invoke-BreakingChangesFix'

#endregion

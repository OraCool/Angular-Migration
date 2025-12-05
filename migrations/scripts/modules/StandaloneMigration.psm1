<#
.SYNOPSIS
    Standalone components migration utilities.

.DESCRIPTION
    Provides functions to convert NgModule-based Angular applications
    to use standalone components architecture.

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit

    References:
    - https://angular.io/guide/standalone-components
    - https://angular.io/guide/standalone-migration
    - https://angular.io/api/core/standalone
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$UtilitiesModule = Join-Path $PSScriptRoot "Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

#region Component Conversion

<#
.SYNOPSIS
    Converts a component to standalone.

.DESCRIPTION
    Adds standalone: true to component decorator and moves required
    imports from NgModule to the component decorator.

.PARAMETER ComponentPath
    Path to the component TypeScript file.

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with conversion results.

.EXAMPLE
    $result = Convert-ComponentToStandalone -ComponentPath "src/app/user/user.component.ts"
#>
function Convert-ComponentToStandalone {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔄 Converting component to standalone: $ComponentPath"

    if (-not (Test-Path $ComponentPath)) {
        $errors += "Component file not found: $ComponentPath"
        return @{
            Success  = $false
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }

    try {
        $content = Get-Content -Path $ComponentPath -Raw
        $originalContent = $content

        # Check if already standalone
        if ($content -match "standalone\s*:\s*true") {
            Write-InfoMessage "  Component is already standalone"
            return @{
                Success  = $true
                Changes  = @("Component already standalone")
                Warnings = @()
                Errors   = @()
            }
        }

        # Add standalone: true to @Component decorator
        # Pattern: @Component({ ... })
        # Replace with: @Component({ standalone: true, ... })
        $content = $content -replace "(@Component\s*\(\s*\{)", "`$1`n  standalone: true,"

        # TODO: Analyze NgModule imports and add them to component
        # This requires:
        # 1. Finding the parent NgModule
        # 2. Extracting imports from NgModule
        # 3. Adding imports array to component decorator
        # 4. Determining which imports are needed by this component

        if ($content -ne $originalContent) {
            $changes += "Added standalone: true to component decorator"

            if (-not $DryRun) {
                Set-Content -Path $ComponentPath -Value $content -NoNewline
                Write-Success "  Component converted to standalone"
            }
            else {
                Write-InfoMessage "  [DRY RUN] Would add standalone: true"
            }
        }

        return @{
            Success  = $true
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

<#
.SYNOPSIS
    Extracts imports needed by a component from its NgModule.

.DESCRIPTION
    Analyzes the component's template and TypeScript code to determine
    which imports from the parent NgModule are actually used.

.PARAMETER ComponentPath
    Path to the component TypeScript file.

.PARAMETER ModulePath
    Path to the parent NgModule file.

.RETURNS
    Array of import statements needed by the component.

.EXAMPLE
    $imports = Get-ComponentRequiredImports -ComponentPath "..." -ModulePath "..."
#>
function Get-ComponentRequiredImports {
    [CmdletBinding()]
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $true)]
        [string]$ModulePath
    )

    # TODO: Implement import analysis
    # 1. Parse component template for directives/components used
    # 2. Parse component TypeScript for services/pipes used
    # 3. Match against NgModule imports
    # 4. Return list of required imports

    Write-WarningMessage "Import analysis not yet implemented"
    return @()
}

#endregion

#region NgModule Conversion

<#
.SYNOPSIS
    Removes component from NgModule declarations after standalone conversion.

.DESCRIPTION
    Updates NgModule to remove the component from declarations array
    after it has been converted to standalone.

.PARAMETER ModulePath
    Path to the NgModule file.

.PARAMETER ComponentName
    Name of the component to remove (e.g., "UserComponent").

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with update results.

.EXAMPLE
    $result = Update-NgModuleAfterStandalone -ModulePath "..." -ComponentName "UserComponent"
#>
function Update-NgModuleAfterStandalone {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ModulePath,

        [Parameter(Mandatory = $true)]
        [string]$ComponentName,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "📝 Updating NgModule: $ModulePath"

    if (-not (Test-Path $ModulePath)) {
        $errors += "Module file not found: $ModulePath"
        return @{
            Success  = $false
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }

    try {
        $content = Get-Content -Path $ModulePath -Raw
        $originalContent = $content

        # Remove component from declarations array
        # Pattern 1: ComponentName followed by comma
        $content = $content -replace "$ComponentName\s*,\s*", ''
        # Pattern 2: Comma followed by ComponentName (at end)
        $content = $content -replace ",\s*$ComponentName\s*(?=\])", ''
        # Pattern 3: Standalone ComponentName
        $content = $content -replace $ComponentName, ''

        # Remove import statement if component is in same directory
        # TODO: More sophisticated import removal

        if ($content -ne $originalContent) {
            $changes += "Removed $ComponentName from NgModule declarations"

            if (-not $DryRun) {
                Set-Content -Path $ModulePath -Value $content -NoNewline
                Write-Success "  NgModule updated"
            }
            else {
                Write-InfoMessage "  [DRY RUN] Would remove $ComponentName from declarations"
            }
        }

        return @{
            Success  = $true
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

#endregion

#region Routing Conversion

<#
.SYNOPSIS
    Converts routing module to use standalone components.

.DESCRIPTION
    Updates routing configuration to use standalone components
    without requiring NgModule wrappers.

.PARAMETER RoutingModulePath
    Path to the routing module file.

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with conversion results.

.EXAMPLE
    $result = Convert-RoutingToStandalone -RoutingModulePath "app-routing.module.ts"
#>
function Convert-RoutingToStandalone {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$RoutingModulePath,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    # TODO: Implement routing conversion
    # 1. Replace loadChildren with standalone component imports
    # 2. Update route configurations
    # 3. Remove RouterModule.forChild() wrappers where applicable

    Write-WarningMessage "Routing conversion not yet implemented"

    return @{
        Success  = $true
        Changes  = @()
        Warnings = @("Routing conversion pending implementation")
        Errors   = @()
    }
}

#endregion

#region Bootstrap Conversion

<#
.SYNOPSIS
    Converts application bootstrap to use standalone components.

.DESCRIPTION
    Updates main.ts to use bootstrapApplication instead of
    platformBrowserDynamic().bootstrapModule().

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with conversion results.

.EXAMPLE
    $result = Convert-BootstrapToStandalone -ProjectPath "C:\MyProject"
#>
function Convert-BootstrapToStandalone {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    # TODO: Implement bootstrap conversion
    # 1. Update main.ts to use bootstrapApplication
    # 2. Create app.config.ts with providers
    # 3. Remove AppModule references

    Write-WarningMessage "Bootstrap conversion not yet implemented"

    return @{
        Success  = $true
        Changes  = @()
        Warnings = @("Bootstrap conversion pending implementation")
        Errors   = @()
    }
}

#endregion

#region Export Module Members

Export-ModuleMember -Function @(
    'Convert-ComponentToStandalone',
    'Get-ComponentRequiredImports',
    'Update-NgModuleAfterStandalone',
    'Convert-RoutingToStandalone',
    'Convert-BootstrapToStandalone'
)

#endregion

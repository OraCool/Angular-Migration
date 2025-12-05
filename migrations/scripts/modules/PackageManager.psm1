<#
.SYNOPSIS
    Package management utilities for Angular migrations.

.DESCRIPTION
    Provides functions to update package.json versions, install dependencies,
    and manage compatibility based on the package compatibility matrix.

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Based on: /packages/workflow-engine/src/utils/package-updater.ts
#>

$ErrorActionPreference = 'Stop'

# Import Utilities module
$UtilitiesModule = Join-Path $PSScriptRoot "Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

#region Package Update Functions

<#
.SYNOPSIS
    Gets compatible package versions for a target Angular version.

.PARAMETER TargetVersion
    Target Angular version (e.g., "15", "16", "17").

.PARAMETER MatrixPath
    Path to package-compatibility-matrix.json (optional).

.RETURNS
    Hashtable with version configurations.

.EXAMPLE
    $versions = Get-CompatibleVersions -TargetVersion "16"
#>
function Get-CompatibleVersions {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("14", "15", "16", "17", "18", "19", "20")]
        [string]$TargetVersion,

        [Parameter(Mandatory = $false)]
        [string]$MatrixPath
    )

    # Determine matrix path
    if (-not $MatrixPath) {
        $MatrixPath = Join-Path $PSScriptRoot "..\config\package-compatibility-matrix.json"
    }

    if (-not (Test-Path $MatrixPath)) {
        throw "Package compatibility matrix not found: $MatrixPath"
    }

    Write-InfoMessage "📝 Reading compatibility matrix from: $MatrixPath"
    $matrix = Get-Content -Path $MatrixPath -Raw | ConvertFrom-Json

    if (-not $matrix.versions.$TargetVersion) {
        throw "Unknown Angular version: $TargetVersion"
    }

    Write-Success "Compatibility matrix loaded for Angular $TargetVersion"

    return @{
        Angular      = $matrix.versions.$TargetVersion.angular
        TypeScript   = $matrix.versions.$TargetVersion.typescript
        RxJS         = $matrix.versions.$TargetVersion.rxjs
        ZoneJs       = $matrix.versions.$TargetVersion.'zone.js'
        Tslib        = $matrix.versions.$TargetVersion.tslib
        Dependencies = $matrix.versions.$TargetVersion.dependencies
        Removed      = $matrix.versions.$TargetVersion.removed
        Notes        = $matrix.versions.$TargetVersion.notes
    }
}

<#
.SYNOPSIS
    Updates package.json with compatible versions for target Angular version.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER TargetVersion
    Target Angular version.

.PARAMETER MatrixPath
    Path to compatibility matrix (optional).

.PARAMETER CreateBackup
    Whether to create backup of package.json.

.RETURNS
    Hashtable with update results.

.EXAMPLE
    $result = Update-PackageJson -ProjectPath "C:\MyProject" -TargetVersion "16"
#>
function Update-PackageJson {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $true)]
        [ValidateSet("14", "15", "16", "17", "18", "19", "20")]
        [string]$TargetVersion,

        [Parameter(Mandatory = $false)]
        [string]$MatrixPath,

        [Parameter(Mandatory = $false)]
        [switch]$CreateBackup = $true
    )

    $changes = @()
    $removed = @()

    Write-InfoMessage "📝 Updating package.json to Angular $TargetVersion..."

    # Validate project path
    $packageJsonPath = Join-Path $ProjectPath "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        throw "package.json not found in $ProjectPath"
    }

    # Load package.json
    $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

    # Create backup if requested
    if ($CreateBackup) {
        $backupPath = "$packageJsonPath.backup"
        Copy-Item -Path $packageJsonPath -Destination $backupPath -Force
        Write-InfoMessage "📋 Backup created: $backupPath"
    }

    # Get compatible versions
    $versions = Get-CompatibleVersions -TargetVersion $TargetVersion -MatrixPath $MatrixPath

    # Ensure dependencies objects exist
    if (-not $packageJson.dependencies) {
        $packageJson | Add-Member -NotePropertyName 'dependencies' -NotePropertyValue @{} -Force
    }
    if (-not $packageJson.devDependencies) {
        $packageJson | Add-Member -NotePropertyName 'devDependencies' -NotePropertyValue @{} -Force
    }

    # Update Angular core packages
    Write-InfoMessage "Updating Angular core packages..."
    $corePackages = @(
        '@angular/animations',
        '@angular/common',
        '@angular/compiler',
        '@angular/core',
        '@angular/forms',
        '@angular/language-service',
        '@angular/platform-browser',
        '@angular/platform-browser-dynamic',
        '@angular/router'
    )

    foreach ($package in $corePackages) {
        if ($packageJson.dependencies.PSObject.Properties.Name -contains $package) {
            $oldVersion = $packageJson.dependencies.$package
            $newVersion = "^$($versions.Angular.core)"
            $packageJson.dependencies.$package = $newVersion
            $changes += @{
                Package = $package
                From    = $oldVersion
                To      = $newVersion
                Type    = 'dependencies'
            }
            Write-Host "  - $package : $oldVersion → $newVersion"
        }
    }

    # Update Material and CDK
    Write-InfoMessage "Updating Angular Material and CDK..."
    $materialPackages = @(
        @{ Name = '@angular/cdk'; Version = $versions.Angular.cdk },
        @{ Name = '@angular/material'; Version = $versions.Angular.material },
        @{ Name = '@angular/material-moment-adapter'; Version = $versions.Angular.material }
    )

    foreach ($pkg in $materialPackages) {
        if ($packageJson.dependencies.PSObject.Properties.Name -contains $pkg.Name) {
            $oldVersion = $packageJson.dependencies.$($pkg.Name)
            $newVersion = "^$($pkg.Version)"
            $packageJson.dependencies.$($pkg.Name) = $newVersion
            $changes += @{
                Package = $pkg.Name
                From    = $oldVersion
                To      = $newVersion
                Type    = 'dependencies'
            }
            Write-Host "  - $($pkg.Name): $oldVersion → $newVersion"
        }
    }

    # Update CLI packages
    Write-InfoMessage "Updating Angular CLI..."
    $cliPackages = @(
        @{ Name = '@angular/cli'; Version = $versions.Angular.cli; Type = 'devDependencies' },
        @{ Name = '@angular-devkit/build-angular'; Version = $versions.Angular.cli; Type = 'devDependencies' },
        @{ Name = '@angular/compiler-cli'; Version = $versions.Angular.core; Type = 'devDependencies' }
    )

    foreach ($pkg in $cliPackages) {
        $depType = $pkg.Type
        if ($packageJson.$depType.PSObject.Properties.Name -contains $pkg.Name) {
            $oldVersion = $packageJson.$depType.$($pkg.Name)
            $newVersion = "^$($pkg.Version)"
            $packageJson.$depType.$($pkg.Name) = $newVersion
            $changes += @{
                Package = $pkg.Name
                From    = $oldVersion
                To      = $newVersion
                Type    = $depType
            }
            Write-Host "  - $($pkg.Name): $oldVersion → $newVersion"
        }
    }

    # Update TypeScript
    Write-InfoMessage "Updating TypeScript to $($versions.TypeScript)..."
    if ($packageJson.devDependencies.PSObject.Properties.Name -contains 'typescript') {
        $oldVersion = $packageJson.devDependencies.typescript
        $packageJson.devDependencies.typescript = $versions.TypeScript
        $changes += @{
            Package = 'typescript'
            From    = $oldVersion
            To      = $versions.TypeScript
            Type    = 'devDependencies'
        }
        Write-Host "  - typescript: $oldVersion → $($versions.TypeScript)"
    }

    # Update RxJS
    Write-InfoMessage "Updating RxJS..."
    if ($packageJson.dependencies.PSObject.Properties.Name -contains 'rxjs') {
        $oldVersion = $packageJson.dependencies.rxjs
        $packageJson.dependencies.rxjs = $versions.RxJS
        $changes += @{
            Package = 'rxjs'
            From    = $oldVersion
            To      = $versions.RxJS
            Type    = 'dependencies'
        }
        Write-Host "  - rxjs: $oldVersion → $($versions.RxJS)"
    }

    # Update zone.js
    Write-InfoMessage "Updating zone.js..."
    if ($packageJson.dependencies.PSObject.Properties.Name -contains 'zone.js') {
        $oldVersion = $packageJson.dependencies.'zone.js'
        $packageJson.dependencies.'zone.js' = $versions.ZoneJs
        $changes += @{
            Package = 'zone.js'
            From    = $oldVersion
            To      = $versions.ZoneJs
            Type    = 'dependencies'
        }
        Write-Host "  - zone.js: $oldVersion → $($versions.ZoneJs)"
    }

    # Update tslib
    if ($packageJson.dependencies.PSObject.Properties.Name -contains 'tslib') {
        $oldVersion = $packageJson.dependencies.tslib
        $packageJson.dependencies.tslib = $versions.Tslib
        $changes += @{
            Package = 'tslib'
            From    = $oldVersion
            To      = $versions.Tslib
            Type    = 'dependencies'
        }
        Write-Host "  - tslib: $oldVersion → $($versions.Tslib)"
    }

    # Update third-party dependencies
    if ($versions.Dependencies) {
        Write-InfoMessage "Updating third-party packages..."
        foreach ($property in $versions.Dependencies.PSObject.Properties) {
            $pkgName = $property.Name
            $pkgVersion = $property.Value

            if ($packageJson.dependencies.PSObject.Properties.Name -contains $pkgName) {
                $oldVersion = $packageJson.dependencies.$pkgName
                $packageJson.dependencies.$pkgName = $pkgVersion
                $changes += @{
                    Package = $pkgName
                    From    = $oldVersion
                    To      = $pkgVersion
                    Type    = 'dependencies'
                }
                Write-Host "  - $pkgName : $oldVersion → $pkgVersion"
            }
        }
    }

    # Remove deprecated packages
    if ($versions.Removed) {
        Write-InfoMessage "Removing deprecated packages..."
        foreach ($pkgName in $versions.Removed) {
            if ($packageJson.dependencies.PSObject.Properties.Name -contains $pkgName) {
                $packageJson.dependencies.PSObject.Properties.Remove($pkgName)
                $removed += $pkgName
                Write-Host "  - Removing $pkgName from dependencies"
            }
            if ($packageJson.devDependencies.PSObject.Properties.Name -contains $pkgName) {
                $packageJson.devDependencies.PSObject.Properties.Remove($pkgName)
                $removed += $pkgName
                Write-Host "  - Removing $pkgName from devDependencies"
            }
        }
    }

    # Write updated package.json
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath

    Write-Success "package.json updated with $($changes.Count) package changes"

    return @{
        Success  = $true
        Changes  = $changes
        Removed  = $removed
        FilePath = $packageJsonPath
    }
}

<#
.SYNOPSIS
    Removes package lock files and node_modules directory.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER RemoveNodeModules
    Whether to remove node_modules directory.

.PARAMETER RemoveLockFile
    Whether to remove package-lock.json.

.RETURNS
    $true if successful, $false otherwise.

.EXAMPLE
    Remove-PackageLockFiles -ProjectPath "C:\MyProject" -RemoveNodeModules -RemoveLockFile
#>
function Remove-PackageLockFiles {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $false)]
        [switch]$RemoveNodeModules,

        [Parameter(Mandatory = $false)]
        [switch]$RemoveLockFile
    )

    Write-InfoMessage "🧹 Cleaning package files..."

    $success = $true

    if ($RemoveNodeModules) {
        $nodeModulesPath = Join-Path $ProjectPath "node_modules"
        if (Test-Path $nodeModulesPath) {
            Write-InfoMessage "  Removing node_modules..."
            try {
                Remove-Item -Path $nodeModulesPath -Recurse -Force
                Write-Success "  node_modules removed"
            }
            catch {
                Write-WarningMessage "  Failed to remove node_modules: $_"
                $success = $false
            }
        }
    }

    if ($RemoveLockFile) {
        $lockFilePath = Join-Path $ProjectPath "package-lock.json"
        if (Test-Path $lockFilePath) {
            Write-InfoMessage "  Removing package-lock.json..."
            try {
                Remove-Item -Path $lockFilePath -Force
                Write-Success "  package-lock.json removed"
            }
            catch {
                Write-WarningMessage "  Failed to remove package-lock.json: $_"
                $success = $false
            }
        }
    }

    return $success
}

<#
.SYNOPSIS
    Installs npm packages with progress tracking.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER UseCI
    Use 'npm ci' instead of 'npm install' for faster, reproducible installs.

.RETURNS
    Hashtable with installation results.

.EXAMPLE
    $result = Install-Dependencies -ProjectPath "C:\MyProject"
#>
function Install-Dependencies {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $false)]
        [switch]$UseCI = $false
    )

    $startTime = Get-Date

    Write-InfoMessage "📦 Installing packages..."
    Write-InfoMessage "  Working directory: $ProjectPath"

    # Determine command
    $command = if ($UseCI) { "npm ci" } else { "npm install" }
    Write-InfoMessage "  Running: $command"

    Push-Location $ProjectPath
    try {
        # Run npm install/ci
        $output = & npm $(if ($UseCI) { 'ci' } else { 'install' }) 2>&1

        $exitCode = $LASTEXITCODE
        $duration = (Get-Date) - $startTime

        if ($exitCode -eq 0) {
            Write-Success "Packages installed successfully"
            Write-InfoMessage "  Duration: $($duration.ToString('mm\:ss'))"

            # Check node_modules
            $nodeModulesPath = Join-Path $ProjectPath "node_modules"
            if (Test-Path $nodeModulesPath) {
                Write-Success "node_modules directory created"
            }

            return @{
                Success  = $true
                Output   = $output -join "`n"
                Duration = $duration
            }
        }
        else {
            Write-WarningMessage "Package installation completed with warnings (exit code: $exitCode)"
            return @{
                Success  = $false
                Output   = $output -join "`n"
                Error    = "npm exited with code $exitCode"
                Duration = $duration
            }
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        Write-ErrorMessage "Package installation failed: $_"
        return @{
            Success  = $false
            Error    = $_.Exception.Message
            Duration = $duration
        }
    }
    finally {
        Pop-Location
    }
}

<#
.SYNOPSIS
    Gets the current Angular version from package.json.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Version string or $null if not found.

.EXAMPLE
    $version = Get-CurrentAngularVersion -ProjectPath "C:\MyProject"
#>
function Get-CurrentAngularVersion {
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $packageJsonPath = Join-Path $ProjectPath "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        return $null
    }

    try {
        $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
        $angularCore = $packageJson.dependencies.'@angular/core'

        if (-not $angularCore) {
            return $null
        }

        # Extract major version number
        if ($angularCore -match '(\d+)\.\d+\.\d+') {
            return $matches[1]
        }

        return $null
    }
    catch {
        Write-Verbose "Failed to get Angular version: $_"
        return $null
    }
}

<#
.SYNOPSIS
    Tests package compatibility for a version.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER TargetVersion
    Target Angular version to test compatibility.

.RETURNS
    Hashtable with compatibility test results.

.EXAMPLE
    $result = Test-PackageCompatibility -ProjectPath "C:\MyProject" -TargetVersion "16"
#>
function Test-PackageCompatibility {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $true)]
        [string]$TargetVersion
    )

    $issues = @()
    $warnings = @()

    # Get current version
    $currentVersion = Get-CurrentAngularVersion -ProjectPath $ProjectPath
    if (-not $currentVersion) {
        $issues += "Could not determine current Angular version"
    }

    # Load package.json
    $packageJsonPath = Join-Path $ProjectPath "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        $issues += "package.json not found"
        return @{
            Compatible = $false
            Issues     = $issues
            Warnings   = $warnings
        }
    }

    $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

    # Check for required packages
    $requiredPackages = @(
        '@angular/core',
        '@angular/common',
        '@angular/platform-browser',
        '@angular/router'
    )

    foreach ($package in $requiredPackages) {
        if ($packageJson.dependencies.PSObject.Properties.Name -notcontains $package) {
            $issues += "Missing required package: $package"
        }
    }

    # Check for CLI
    if ($packageJson.devDependencies.PSObject.Properties.Name -notcontains '@angular/cli') {
        $warnings += "Angular CLI not found in devDependencies"
    }

    return @{
        Compatible     = $issues.Count -eq 0
        Issues         = $issues
        Warnings       = $warnings
        CurrentVersion = $currentVersion
    }
}

#endregion

#region Export Module Members

Export-ModuleMember -Function @(
    'Get-CompatibleVersions',
    'Update-PackageJson',
    'Remove-PackageLockFiles',
    'Install-Dependencies',
    'Get-CurrentAngularVersion',
    'Test-PackageCompatibility'
)

#endregion

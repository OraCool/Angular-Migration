<#
.SYNOPSIS
    Core migration orchestration utilities for Angular migrations.

.DESCRIPTION
    Provides high-level functions to orchestrate complete Angular version migrations,
    combining package updates, breaking changes fixes, schematics, and validation.

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Based on: /packages/workflow-engine/src/engine/workflow-engine.ts
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$UtilitiesModule = Join-Path $PSScriptRoot "Utilities.psm1"
$PackageManagerModule = Join-Path $PSScriptRoot "PackageManager.psm1"
$BreakingChangesModule = Join-Path $PSScriptRoot "BreakingChanges.psm1"
$ValidationModule = Join-Path $PSScriptRoot "Validation.psm1"

Import-Module $UtilitiesModule -DisableNameChecking
Import-Module $PackageManagerModule -DisableNameChecking
Import-Module $BreakingChangesModule -DisableNameChecking -Force
Import-Module $ValidationModule -DisableNameChecking

#region Prerequisites Testing

<#
.SYNOPSIS
    Tests migration prerequisites for the project.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER TargetVersion
    Target Angular version.

.RETURNS
    Hashtable with prerequisites test results.

.EXAMPLE
    $result = Test-MigrationPrerequisites -ProjectPath "C:\MyProject" -TargetVersion "16"
#>
function Test-MigrationPrerequisites {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $true)]
        [ValidateSet("15", "16", "17", "18", "19", "20")]
        [string]$TargetVersion
    )

    Write-InfoMessage "🔍 Checking migration prerequisites..."

    $issues = @()
    $warnings = @()

    # Check if project path exists
    if (-not (Test-Path $ProjectPath)) {
        $issues += "Project path does not exist: $ProjectPath"
        return @{
            Ready    = $false
            Issues   = $issues
            Warnings = $warnings
        }
    }

    # Check for required files
    $requiredFiles = @('package.json', 'angular.json', 'tsconfig.json')
    foreach ($file in $requiredFiles) {
        $filePath = Join-Path $ProjectPath $file
        if (-not (Test-Path $filePath)) {
            $issues += "Required file not found: $file"
        }
    }

    # Check Node.js version
    $nodeVersion = Get-NodeVersion
    if (-not $nodeVersion) {
        $issues += "Node.js is not installed"
    }
    else {
        Write-InfoMessage "  Node.js version: $nodeVersion"

        # Version-specific Node.js requirements
        $minNodeVersion = switch ($TargetVersion) {
            "15" { [version]"14.20.0" }
            "16" { [version]"16.14.0" }
            "17" { [version]"18.10.0" }
            "18" { [version]"18.13.0" }
            "19" { [version]"18.19.0" }
            "20" { [version]"20.11.0" }
        }

        if ($nodeVersion -lt $minNodeVersion) {
            $warnings += "Node.js version $nodeVersion is below recommended minimum $minNodeVersion for Angular $TargetVersion"
        }
    }

    # Check if npm is available
    if (-not (Test-CommandExists "npm")) {
        $issues += "npm is not available"
    }

    # Check if ng CLI is available
    if (-not (Test-CommandExists "ng")) {
        $warnings += "Angular CLI (ng) is not globally installed - will use npx"
    }

    # Check git status
    $gitStatus = Test-GitStatus -ProjectPath $ProjectPath
    if ($gitStatus.IsRepo) {
        Write-InfoMessage "  Git repository detected"
        if (-not $gitStatus.IsClean) {
            $warnings += "Working directory has uncommitted changes"
        }
    }
    else {
        $warnings += "Not a git repository - version control is recommended"
    }

    # Check current Angular version
    $currentVersion = Get-CurrentAngularVersion -ProjectPath $ProjectPath
    if ($currentVersion) {
        Write-InfoMessage "  Current Angular version: $currentVersion"

        if ([int]$currentVersion -ge [int]$TargetVersion) {
            $issues += "Current version ($currentVersion) is already at or above target version ($TargetVersion)"
        }
    }
    else {
        $issues += "Could not determine current Angular version"
    }

    # Summary
    $ready = $issues.Count -eq 0

    if ($ready) {
        Write-Success "All prerequisites met for migration to Angular $TargetVersion"
    }
    else {
        Write-ErrorMessage "Prerequisites check failed"
        foreach ($issue in $issues) {
            Write-ErrorMessage "  - $issue"
        }
    }

    if ($warnings.Count -gt 0) {
        Write-WarningMessage "Warnings:"
        foreach ($warning in $warnings) {
            Write-WarningMessage "  - $warning"
        }
    }

    return @{
        Ready    = $ready
        Issues   = $issues
        Warnings = $warnings
    }
}

#endregion

#region Migration Orchestration

<#
.SYNOPSIS
    Runs Angular schematics for a specific version.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER TargetVersion
    Target Angular version.

.RETURNS
    Hashtable with schematic execution results.

.EXAMPLE
    $result = Invoke-NgUpdate -ProjectPath "C:\MyProject" -TargetVersion "16"
#>
function Invoke-NgUpdate {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $true)]
        [string]$TargetVersion
    )

    Write-InfoMessage "🔄 Running Angular schematics for version $TargetVersion..."

    $startTime = Get-Date

    Push-Location $ProjectPath
    try {
        # Run ng update for @angular/core
        Write-InfoMessage "  Running: ng update @angular/core@$TargetVersion --migrate-only --allow-dirty"
        $coreOutput = npx ng update "@angular/core@$TargetVersion" --migrate-only --allow-dirty 2>&1
        $coreExitCode = $LASTEXITCODE

        # Run ng update for @angular/cli
        Write-InfoMessage "  Running: ng update @angular/cli@$TargetVersion --migrate-only --allow-dirty"
        $cliOutput = npx ng update "@angular/cli@$TargetVersion" --migrate-only --allow-dirty 2>&1
        $cliExitCode = $LASTEXITCODE

        $duration = (Get-Date) - $startTime

        $success = $coreExitCode -eq 0 -and $cliExitCode -eq 0

        if ($success) {
            Write-Success "Angular schematics completed successfully"
        }
        else {
            Write-WarningMessage "Angular schematics completed with warnings"
        }

        return @{
            Success  = $success
            Message  = if ($success) { "Schematics executed successfully" } else { "Schematics completed with warnings" }
            Output   = @{
                Core = $coreOutput -join "`n"
                CLI  = $cliOutput -join "`n"
            }
            Duration = $duration
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        Write-ErrorMessage "ng update failed: $_"

        return @{
            Success  = $false
            Message  = "ng update failed"
            Output   = @{}
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
    Runs Angular Material schematics for a specific version.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER TargetVersion
    Target Angular version.

.RETURNS
    Hashtable with Material schematic results.

.EXAMPLE
    $result = Invoke-MaterialUpdate -ProjectPath "C:\MyProject" -TargetVersion "16"
#>
function Invoke-MaterialUpdate {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $true)]
        [string]$TargetVersion
    )

    Write-InfoMessage "🎨 Running Angular Material schematics..."

    $startTime = Get-Date

    Push-Location $ProjectPath
    try {
        # Check if Material is used
        $packageJsonPath = Join-Path $ProjectPath "package.json"
        $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

        if ($packageJson.dependencies.PSObject.Properties.Name -notcontains '@angular/material') {
            Write-InfoMessage "  Angular Material not detected - skipping"
            return @{
                Success  = $true
                Message  = "Angular Material not used - skipped"
                Output   = ""
                Duration = [timespan]::Zero
            }
        }

        # Run ng update for @angular/material
        Write-InfoMessage "  Running: ng update @angular/material@$TargetVersion --migrate-only --allow-dirty"
        $output = npx ng update "@angular/material@$TargetVersion" --migrate-only --allow-dirty 2>&1
        $exitCode = $LASTEXITCODE

        $duration = (Get-Date) - $startTime

        $success = $exitCode -eq 0

        if ($success) {
            Write-Success "Material schematics completed successfully"
        }
        else {
            Write-WarningMessage "Material schematics completed with warnings"
        }

        return @{
            Success  = $success
            Message  = if ($success) { "Material schematics executed" } else { "Material schematics completed with warnings" }
            Output   = $output -join "`n"
            Duration = $duration
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        Write-ErrorMessage "Material update failed: $_"

        return @{
            Success  = $false
            Message  = "Material update failed"
            Output   = ""
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
    Performs complete Angular version migration.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER TargetVersion
    Target Angular version.

.PARAMETER SkipClean
    Skip cleaning package files before install (keeps both node_modules and package-lock.json).

.PARAMETER CleanNodeModules
    Also remove node_modules directory during clean step (by default only package-lock.json is removed).

.PARAMETER SkipInstall
    Skip running npm install.

.PARAMETER SkipTests
    Skip test validation.

.PARAMETER SkipLint
    Skip lint validation.

.PARAMETER AutoCommit
    Automatically commit changes after successful migration.

.PARAMETER CommitSteps
    Commit after each major migration step for better traceability.
    Creates separate commits for: package updates, breaking changes, core schematics, and material schematics.
    Recommended for production migrations to maintain clear audit trail.

.RETURNS
    Hashtable with migration results.

.EXAMPLE
    $result = Invoke-AngularMigration -ProjectPath "C:\MyProject" -TargetVersion "16" -AutoCommit

.EXAMPLE
    $result = Invoke-AngularMigration -ProjectPath "C:\MyProject" -TargetVersion "16" -SkipClean

.EXAMPLE
    $result = Invoke-AngularMigration -ProjectPath "C:\MyProject" -TargetVersion "16" -CleanNodeModules

.EXAMPLE
    $result = Invoke-AngularMigration -ProjectPath "C:\MyProject" -TargetVersion "16" -SkipInstall
#>
function Invoke-AngularMigration {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $true)]
        [ValidateSet("15", "16", "17", "18", "19", "20")]
        [string]$TargetVersion,

        [Parameter(Mandatory = $false)]
        [switch]$SkipClean = $false,

        [Parameter(Mandatory = $false)]
        [switch]$KeepNodeModules = $false,

        [Parameter(Mandatory = $false)]
        [switch]$SkipInstall = $false,

        [Parameter(Mandatory = $false)]
        [switch]$SkipTests = $false,

        [Parameter(Mandatory = $false)]
        [switch]$SkipLint = $false,

        [Parameter(Mandatory = $false)]
        [switch]$AutoCommit = $false,

        [Parameter(Mandatory = $false)]
        [switch]$CommitSteps = $false
    )

    $startTime = Get-Date
    $results = @{}
    $commits = @()

    # Helper function to commit changes at each step
    function Invoke-StepCommit {
        param(
            [string]$StepName,
            [string]$Description
        )

        if ($CommitSteps) {
            Write-InfoMessage "  Committing changes: $Description"
            $commitMessage = "chore(migration): $Description"
            try {
                $commitResult = Invoke-GitCommit -ProjectPath $ProjectPath -Message $commitMessage -AddAll
                if ($commitResult) {
                    $commits += @{
                        Step = $StepName
                        Message = $commitMessage
                        Success = $true
                    }
                    Write-Success "  ✓ Committed: $Description"
                }
                else {
                    Write-WarningMessage "  ⚠ Commit skipped (no changes or not a git repo)"
                }
            }
            catch {
                Write-WarningMessage "  ⚠ Commit failed: $_"
                $commits += @{
                    Step = $StepName
                    Message = $commitMessage
                    Success = $false
                    Error = $_.Exception.Message
                }
            }
        }
    }

    Write-InfoMessage "═══════════════════════════════════════════════════════"
    Write-InfoMessage "  Angular Migration to Version $TargetVersion"
    if ($CommitSteps) {
        Write-InfoMessage "  Mode: Step-by-step commits (audit trail enabled)"
    }
    Write-InfoMessage "═══════════════════════════════════════════════════════"

    try {
        # Step 1: Prerequisites check
        Write-InfoMessage "`n[Step 1/8] Checking prerequisites..."
        $prereqResult = Test-MigrationPrerequisites -ProjectPath $ProjectPath -TargetVersion $TargetVersion
        $results['Prerequisites'] = $prereqResult

        if (-not $prereqResult.Ready) {
            throw "Prerequisites check failed. Please resolve issues before continuing."
        }

        # Step 1.5: Ensure .gitignore is configured to exclude backup files
        Write-InfoMessage "`n[Step 1.5/8] Configuring .gitignore for migration..."
        $gitignoreResult = Initialize-ProjectGitignore -ProjectPath $ProjectPath
        if (-not $gitignoreResult) {
            Write-WarningMessage "Warning: Could not update .gitignore. Backup files may be committed."
        }

        # Step 2: Update package.json
        Write-InfoMessage "`n[Step 2/8] Updating package.json..."
        $updateResult = Update-PackageJson -ProjectPath $ProjectPath -TargetVersion $TargetVersion
        $results['PackageUpdate'] = $updateResult

        if (-not $updateResult.Success) {
            throw "Failed to update package.json"
        }

        Invoke-StepCommit -StepName "PackageUpdate" -Description "update packages to Angular $TargetVersion"

        # Step 3a: Clean package files (optional)
        if (-not $SkipClean) {
            Write-InfoMessage "`n[Step 3a/8] Cleaning package files..."

            # By default: remove both node_modules and package-lock.json to prevent dependency conflicts
            # With -KeepNodeModules: only remove package-lock.json
            if ($KeepNodeModules) {
                Write-InfoMessage "  Keeping node_modules (only removing package-lock.json)"
                $cleanResult = Remove-PackageLockFiles -ProjectPath $ProjectPath -RemoveLockFile
            }
            else {
                Write-InfoMessage "  Removing both node_modules and package-lock.json for clean install"
                $cleanResult = Remove-PackageLockFiles -ProjectPath $ProjectPath -RemoveNodeModules -RemoveLockFile
            }

            if (-not $cleanResult) {
                Write-WarningMessage "  Failed to clean some files, but continuing..."
            }
        }
        else {
            Write-WarningMessage "`n[Step 3a/8] Skipping clean (keeping existing node_modules and package-lock.json)"
        }

        # Step 3b: Install dependencies (optional)
        if (-not $SkipInstall) {
            Write-InfoMessage "`n[Step 3b/8] Installing dependencies..."
            $installResult = Install-Dependencies -ProjectPath $ProjectPath
            $results['Install'] = $installResult

            if (-not $installResult.Success) {
                throw "Failed to install dependencies"
            }
        }
        else {
            Write-WarningMessage "`n[Step 3b/8] Skipping dependency installation (will use existing node_modules)"
            $results['Install'] = @{ Success = $true; Message = "Skipped" }
        }

        # Step 4: Apply breaking changes fixes
        Write-InfoMessage "`n[Step 4/8] Applying breaking changes fixes..."
        $fixResult = Invoke-BreakingChangesFix -ProjectPath $ProjectPath -Version $TargetVersion
        $results['BreakingChanges'] = $fixResult

        Invoke-StepCommit -StepName "BreakingChanges" -Description "apply Angular $TargetVersion breaking changes fixes"

        # Step 5: Run Angular schematics
        Write-InfoMessage "`n[Step 5/8] Running Angular schematics..."
        $schematicResult = Invoke-NgUpdate -ProjectPath $ProjectPath -TargetVersion $TargetVersion
        $results['Schematics'] = $schematicResult

        Invoke-StepCommit -StepName "CoreSchematics" -Description "run ng update @angular/core@$TargetVersion and @angular/cli@$TargetVersion schematics"

        # Step 6: Run Material schematics
        Write-InfoMessage "`n[Step 6/8] Running Material schematics..."
        $materialResult = Invoke-MaterialUpdate -ProjectPath $ProjectPath -TargetVersion $TargetVersion
        $results['Material'] = $materialResult

        Invoke-StepCommit -StepName "MaterialSchematics" -Description "run ng update @angular/material@$TargetVersion schematics"

        # Step 7: Validate build
        Write-InfoMessage "`n[Step 7/8] Validating build..."
        $buildResult = Invoke-BuildValidation -ProjectPath $ProjectPath
        $results['Build'] = $buildResult

        if (-not $buildResult.Success) {
            Write-WarningMessage "Build validation failed - manual fixes may be required"
        }

        # Step 8: Run tests (optional)
        if (-not $SkipTests) {
            Write-InfoMessage "`n[Step 8/8] Running tests..."
            $testResult = Invoke-TestValidation -ProjectPath $ProjectPath
            $results['Tests'] = $testResult

            if (-not $testResult.Success) {
                Write-WarningMessage "Test validation failed - manual fixes may be required"
            }
        }

        # Auto-commit if requested (and not using step commits)
        if ($AutoCommit -and -not $CommitSteps) {
            Write-InfoMessage "`nCommitting all changes..."
            $commitMessage = "chore: migrate to Angular $TargetVersion`n`nMigration completed successfully with all automated fixes applied."
            $commitResult = Invoke-GitCommit -ProjectPath $ProjectPath -Message $commitMessage -AddAll
            $results['Commit'] = @{ Success = $commitResult }
        }
        elseif ($CommitSteps -and $commits.Count -gt 0) {
            Write-InfoMessage "`nMigration commits created: $($commits.Count)"
            foreach ($commit in $commits) {
                if ($commit.Success) {
                    Write-InfoMessage "  ✓ $($commit.Message)"
                }
                else {
                    Write-WarningMessage "  ⚠ $($commit.Message) (failed)"
                }
            }
            $results['Commits'] = $commits
        }

        # Clean up backup file after successful migration
        $backupFile = Join-Path $ProjectPath "package.json.backup"
        if (Test-Path $backupFile) {
            try {
                Remove-Item -Path $backupFile -Force
                Write-InfoMessage "`nCleaned up package.json.backup"
            }
            catch {
                Write-WarningMessage "  Could not remove package.json.backup: $_"
            }
        }

        $duration = (Get-Date) - $startTime

        Write-InfoMessage "`n═══════════════════════════════════════════════════════"
        Write-Success "Migration to Angular $TargetVersion completed!"
        Write-InfoMessage "Total duration: $($duration.ToString('mm\:ss'))"
        if ($CommitSteps -and $commits.Count -gt 0) {
            Write-InfoMessage "Git commits: $($commits.Count) step(s) committed"
        }
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        return @{
            Success  = $true
            Message  = "Migration to Angular $TargetVersion completed successfully"
            Results  = $results
            Duration = $duration
            Commits  = if ($CommitSteps) { $commits } else { @() }
        }
    }
    catch {
        $duration = (Get-Date) - $startTime

        Write-InfoMessage "`n═══════════════════════════════════════════════════════"
        Write-ErrorMessage "Migration failed: $_"
        Write-InfoMessage "Duration: $($duration.ToString('mm\:ss'))"
        Write-InfoMessage "═══════════════════════════════════════════════════════"

        return @{
            Success  = $false
            Message  = "Migration failed: $($_.Exception.Message)"
            Results  = $results
            Error    = $_.Exception.Message
            Duration = $duration
        }
    }
}

#endregion

#region Export Module Members

Export-ModuleMember -Function @(
    'Test-MigrationPrerequisites',
    'Invoke-NgUpdate',
    'Invoke-MaterialUpdate',
    'Invoke-AngularMigration'
)

#endregion

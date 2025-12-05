<#
.SYNOPSIS
    Validation utilities for Angular migrations.

.DESCRIPTION
    Provides functions to validate builds, run tests, execute linting,
    and generate validation reports during Angular migrations.

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Based on: Workflow engine validation logic
#>

$ErrorActionPreference = 'Stop'

# Import Utilities module
$UtilitiesModule = Join-Path $PSScriptRoot "Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

#region Build Validation Functions

<#
.SYNOPSIS
    Runs build validation for the Angular project.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER Configuration
    Build configuration (production, development).

.RETURNS
    Hashtable with validation results.

.EXAMPLE
    $result = Invoke-BuildValidation -ProjectPath "C:\MyProject"
#>
function Invoke-BuildValidation {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $false)]
        [ValidateSet('production', 'development')]
        [string]$Configuration = 'production'
    )

    Write-InfoMessage "🏗️  Running build validation..."
    Write-InfoMessage "  Configuration: $Configuration"

    $startTime = Get-Date

    Push-Location $ProjectPath
    try {
        # Check if package.json exists
        if (-not (Test-Path "package.json")) {
            throw "package.json not found in $ProjectPath"
        }

        # Run build
        $buildCommand = if ($Configuration -eq 'production') { 'build' } else { 'build' }
        $output = npm run $buildCommand 2>&1

        $exitCode = $LASTEXITCODE
        $duration = (Get-Date) - $startTime

        if ($exitCode -eq 0) {
            Write-Success "Build completed successfully"
            Write-InfoMessage "  Duration: $($duration.ToString('mm\:ss'))"

            return @{
                Success  = $true
                Message  = "Build validation passed"
                Output   = $output -join "`n"
                Errors   = @()
                Duration = $duration
            }
        }
        else {
            $errors = $output | Where-Object { $_ -match 'error' -or $_ -match 'Error' }

            Write-ErrorMessage "Build failed with errors"
            Write-InfoMessage "  Exit code: $exitCode"
            Write-InfoMessage "  Duration: $($duration.ToString('mm\:ss'))"

            return @{
                Success  = $false
                Message  = "Build validation failed"
                Output   = $output -join "`n"
                Errors   = $errors
                Duration = $duration
            }
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        Write-ErrorMessage "Build validation error: $_"

        return @{
            Success  = $false
            Message  = "Build validation error"
            Output   = ""
            Errors   = @($_.Exception.Message)
            Duration = $duration
        }
    }
    finally {
        Pop-Location
    }
}

#endregion

#region Test Validation Functions

<#
.SYNOPSIS
    Runs test validation for the Angular project.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER Watch
    Run tests in watch mode.

.RETURNS
    Hashtable with test results.

.EXAMPLE
    $result = Invoke-TestValidation -ProjectPath "C:\MyProject"
#>
function Invoke-TestValidation {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $false)]
        [switch]$Watch = $false
    )

    Write-InfoMessage "🧪 Running test validation..."

    $startTime = Get-Date

    Push-Location $ProjectPath
    try {
        # Check if package.json exists
        if (-not (Test-Path "package.json")) {
            throw "package.json not found in $ProjectPath"
        }

        # Run tests
        $testArgs = if ($Watch) { 'test' } else { 'test', '--', '--watch=false' }
        $output = npm run @testArgs 2>&1

        $exitCode = $LASTEXITCODE
        $duration = (Get-Date) - $startTime

        if ($exitCode -eq 0) {
            Write-Success "Tests passed successfully"
            Write-InfoMessage "  Duration: $($duration.ToString('mm\:ss'))"

            return @{
                Success  = $true
                Message  = "Test validation passed"
                Output   = $output -join "`n"
                Errors   = @()
                Duration = $duration
            }
        }
        else {
            $errors = $output | Where-Object { $_ -match 'FAILED' -or $_ -match 'Error' }

            Write-ErrorMessage "Tests failed"
            Write-InfoMessage "  Exit code: $exitCode"
            Write-InfoMessage "  Duration: $($duration.ToString('mm\:ss'))"

            return @{
                Success  = $false
                Message  = "Test validation failed"
                Output   = $output -join "`n"
                Errors   = $errors
                Duration = $duration
            }
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        Write-ErrorMessage "Test validation error: $_"

        return @{
            Success  = $false
            Message  = "Test validation error"
            Output   = ""
            Errors   = @($_.Exception.Message)
            Duration = $duration
        }
    }
    finally {
        Pop-Location
    }
}

#endregion

#region Lint Validation Functions

<#
.SYNOPSIS
    Runs lint validation for the Angular project.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER Fix
    Automatically fix linting errors.

.RETURNS
    Hashtable with lint results.

.EXAMPLE
    $result = Invoke-LintValidation -ProjectPath "C:\MyProject" -Fix
#>
function Invoke-LintValidation {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $false)]
        [switch]$Fix = $false
    )

    Write-InfoMessage "🔍 Running lint validation..."

    $startTime = Get-Date

    Push-Location $ProjectPath
    try {
        # Check if package.json exists
        if (-not (Test-Path "package.json")) {
            throw "package.json not found in $ProjectPath"
        }

        # Run lint
        $lintArgs = if ($Fix) { 'lint', '--', '--fix' } else { 'lint' }
        $output = npm run @lintArgs 2>&1

        $exitCode = $LASTEXITCODE
        $duration = (Get-Date) - $startTime

        if ($exitCode -eq 0) {
            Write-Success "Lint validation passed"
            Write-InfoMessage "  Duration: $($duration.ToString('mm\:ss'))"

            return @{
                Success  = $true
                Message  = "Lint validation passed"
                Output   = $output -join "`n"
                Errors   = @()
                Warnings = @()
                Duration = $duration
            }
        }
        else {
            $errors = $output | Where-Object { $_ -match 'error' }
            $warnings = $output | Where-Object { $_ -match 'warning' }

            Write-WarningMessage "Lint validation found issues"
            Write-InfoMessage "  Exit code: $exitCode"
            Write-InfoMessage "  Errors: $($errors.Count)"
            Write-InfoMessage "  Warnings: $($warnings.Count)"
            Write-InfoMessage "  Duration: $($duration.ToString('mm\:ss'))"

            return @{
                Success  = $false
                Message  = "Lint validation failed"
                Output   = $output -join "`n"
                Errors   = $errors
                Warnings = $warnings
                Duration = $duration
            }
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        Write-ErrorMessage "Lint validation error: $_"

        return @{
            Success  = $false
            Message  = "Lint validation error"
            Output   = ""
            Errors   = @($_.Exception.Message)
            Warnings = @()
            Duration = $duration
        }
    }
    finally {
        Pop-Location
    }
}

#endregion

#region Compilation Error Detection

<#
.SYNOPSIS
    Checks for TypeScript compilation errors.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with compilation status.

.EXAMPLE
    $result = Test-CompilationErrors -ProjectPath "C:\MyProject"
#>
function Test-CompilationErrors {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    Write-InfoMessage "🔍 Checking for compilation errors..."

    Push-Location $ProjectPath
    try {
        # Run TypeScript compiler with --noEmit to check for errors
        $output = npx tsc --noEmit 2>&1

        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-Success "No compilation errors found"

            return @{
                Success = $true
                Message = "No compilation errors"
                Errors  = @()
            }
        }
        else {
            $errors = $output | Where-Object { $_ -match 'error TS' }

            Write-WarningMessage "Found $($errors.Count) compilation errors"

            return @{
                Success = $false
                Message = "Compilation errors found"
                Errors  = $errors
            }
        }
    }
    catch {
        Write-ErrorMessage "Compilation check error: $_"

        return @{
            Success = $false
            Message = "Compilation check error"
            Errors  = @($_.Exception.Message)
        }
    }
    finally {
        Pop-Location
    }
}

#endregion

#region Validation Report Generation

<#
.SYNOPSIS
    Generates a validation report with all validation results.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER OutputPath
    Path to save the validation report.

.PARAMETER ValidationResults
    Hashtable of validation results.

.RETURNS
    Path to generated report file.

.EXAMPLE
    $results = @{ Build = $buildResult; Test = $testResult; Lint = $lintResult }
    Write-ValidationReport -ProjectPath "C:\MyProject" -ValidationResults $results
#>
function Write-ValidationReport {
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $false)]
        [string]$OutputPath,

        [Parameter(Mandatory = $true)]
        [hashtable]$ValidationResults
    )

    if (-not $OutputPath) {
        $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
        $OutputPath = Join-Path $ProjectPath "validation-report-$timestamp.md"
    }

    Write-InfoMessage "📊 Generating validation report..."

    $report = @"
# Angular Migration Validation Report

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Project:** $ProjectPath

---

"@

    # Add build results
    if ($ValidationResults.Build) {
        $buildResult = $ValidationResults.Build
        $status = if ($buildResult.Success) { "✅ PASSED" } else { "❌ FAILED" }

        $report += @"

## Build Validation

**Status:** $status
**Duration:** $($buildResult.Duration.ToString('mm\:ss'))
**Message:** $($buildResult.Message)

"@

        if ($buildResult.Errors.Count -gt 0) {
            $report += @"

### Errors
``````
$($buildResult.Errors -join "`n")
``````

"@
        }
    }

    # Add test results
    if ($ValidationResults.Test) {
        $testResult = $ValidationResults.Test
        $status = if ($testResult.Success) { "✅ PASSED" } else { "❌ FAILED" }

        $report += @"

## Test Validation

**Status:** $status
**Duration:** $($testResult.Duration.ToString('mm\:ss'))
**Message:** $($testResult.Message)

"@

        if ($testResult.Errors.Count -gt 0) {
            $report += @"

### Failed Tests
``````
$($testResult.Errors -join "`n")
``````

"@
        }
    }

    # Add lint results
    if ($ValidationResults.Lint) {
        $lintResult = $ValidationResults.Lint
        $status = if ($lintResult.Success) { "✅ PASSED" } else { "⚠️  ISSUES FOUND" }

        $report += @"

## Lint Validation

**Status:** $status
**Duration:** $($lintResult.Duration.ToString('mm\:ss'))
**Message:** $($lintResult.Message)

"@

        if ($lintResult.Errors.Count -gt 0) {
            $report += @"

### Lint Errors
``````
$($lintResult.Errors -join "`n")
``````

"@
        }

        if ($lintResult.Warnings.Count -gt 0) {
            $report += @"

### Lint Warnings
``````
$($lintResult.Warnings -join "`n")
``````

"@
        }
    }

    # Summary
    $totalSuccess = $ValidationResults.Values | Where-Object { $_.Success } | Measure-Object | Select-Object -ExpandProperty Count
    $totalChecks = $ValidationResults.Count

    $report += @"

---

## Summary

**Total Checks:** $totalChecks
**Passed:** $totalSuccess
**Failed:** $($totalChecks - $totalSuccess)

**Overall Status:** $(if ($totalSuccess -eq $totalChecks) { "✅ ALL VALIDATIONS PASSED" } else { "❌ SOME VALIDATIONS FAILED" })

"@

    # Write report to file
    $report | Set-Content -Path $OutputPath

    Write-Success "Validation report generated: $OutputPath"

    return $OutputPath
}

#endregion

#region Export Module Members

Export-ModuleMember -Function @(
    'Invoke-BuildValidation',
    'Invoke-TestValidation',
    'Invoke-LintValidation',
    'Test-CompilationErrors',
    'Write-ValidationReport'
)

#endregion

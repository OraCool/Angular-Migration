<#
.SYNOPSIS
    Generates a comprehensive migration report.

.DESCRIPTION
    Creates a detailed report of the migration including all changes,
    validations, and recommendations for next steps.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER OutputPath
    Path for the report file (optional).

.EXAMPLE
    .\generate-migration-report.ps1

.EXAMPLE
    .\generate-migration-report.ps1 -ProjectPath "C:\MyProject" -OutputPath "migration-report.md"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [string]$OutputPath = ""
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "PackageManager.psm1") -Force
Import-Module (Join-Path $ModulesPath "Validation.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Migration Report Generation" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Get current Angular version
$currentVersion = Get-CurrentAngularVersion -ProjectPath $ProjectPath

# Run validations
Write-InfoMessage "Running validation checks..."
$buildResult = Invoke-BuildValidation -ProjectPath $ProjectPath
$testResult = Invoke-TestValidation -ProjectPath $ProjectPath
$lintResult = Invoke-LintValidation -ProjectPath $ProjectPath

$validations = @{
    Build = $buildResult
    Test  = $testResult
    Lint  = $lintResult
}

# Generate report
$reportPath = Write-ValidationReport `
    -ProjectPath $ProjectPath `
    -OutputPath $OutputPath `
    -ValidationResults $validations

Write-Host ""
Write-Success "Migration report generated successfully!"
Write-InfoMessage "Report location: $reportPath"
Write-Host ""

# Display summary
$allPassed = $buildResult.Success -and $testResult.Success -and $lintResult.Success

if ($allPassed) {
    Write-Success "✅ All validations passed!"
    Write-InfoMessage ""
    Write-InfoMessage "Migration to Angular $currentVersion is complete and verified."
    Write-InfoMessage ""
    Write-InfoMessage "Next steps:"
    Write-InfoMessage "  1. Review the full report: $reportPath"
    Write-InfoMessage "  2. Deploy to staging environment"
    Write-InfoMessage "  3. Run comprehensive manual testing"
    Write-InfoMessage "  4. Deploy to production"
}
else {
    Write-WarningMessage "⚠️  Some validations failed"
    Write-InfoMessage ""
    Write-InfoMessage "Review the report for details: $reportPath"
    Write-InfoMessage ""
    Write-InfoMessage "Fix any issues before deploying to production."
}

Write-Host ""
exit 0

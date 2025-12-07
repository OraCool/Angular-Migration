<#
.SYNOPSIS
    Removes deprecated relativeLinkResolution from Router configuration.

.DESCRIPTION
    Scans routing modules and removes the relativeLinkResolution property
    from RouterModule.forRoot() configuration.

    This property was removed in Angular 15 and will cause build errors.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER DryRun
    Preview changes without applying them.

.EXAMPLE
    .\fix-router-config.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\fix-router-config.ps1 -DryRun

.NOTES
    Version: 1.0.0
    Related: Angular 15+ Migration
    Fixes: Error TS2345 - 'relativeLinkResolution' does not exist in type 'ExtraOptions'
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [switch]$DryRun = $false
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "..\modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Router Config Fix (relativeLinkResolution)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
if ($DryRun) {
    Write-WarningMessage "DRY RUN MODE - No changes will be applied"
}
Write-Host ""

try {
    $srcPath = Join-Path $ProjectPath "src"

    if (-not (Test-Path $srcPath)) {
        Write-ErrorMessage "Source directory not found: $srcPath"
        exit 1
    }

    # Find routing modules
    Write-InfoMessage "Scanning for routing modules..."
    $routingFiles = Get-ChildItem -Path $srcPath -Filter "*-routing.module.ts" -Recurse
    $appModule = Get-ChildItem -Path $srcPath -Filter "app.module.ts" -Recurse

    $allFiles = @($routingFiles) + @($appModule) | Where-Object { $_ -ne $null }

    if ($allFiles.Count -eq 0) {
        Write-WarningMessage "No routing modules found"
        exit 0
    }

    Write-InfoMessage "Found $($allFiles.Count) module file(s) to check"
    Write-Host ""

    $updatedFiles = @()
    $skippedFiles = @()
    $errorFiles = @()

    foreach ($file in $allFiles) {
        $relativePath = $file.FullName.Replace($ProjectPath, "").TrimStart('\', '/')

        try {
            $content = Get-Content -Path $file.FullName -Raw
            $originalContent = $content

            # Check if file contains relativeLinkResolution
            if ($content -notmatch 'relativeLinkResolution') {
                Write-Host "  ⏭️  $relativePath" -ForegroundColor Gray
                Write-Host "      No relativeLinkResolution found" -ForegroundColor Gray
                $skippedFiles += $relativePath
                continue
            }

            # Count occurrences
            $occurrences = ([regex]::Matches($content, 'relativeLinkResolution')).Count

            # Remove the relativeLinkResolution line
            # Handles: relativeLinkResolution: 'legacy', or relativeLinkResolution: 'corrected',
            $content = $content -replace "\s*relativeLinkResolution\s*:\s*['""][^'""]*['""],?\s*\r?\n?", ""

            # Clean up double commas that might result
            $content = $content -replace ',(\s*),', ',$1'

            # Clean up trailing comma before closing brace
            $content = $content -replace ',(\s*)\}', '$1}'

            if ($content -ne $originalContent) {
                if ($DryRun) {
                    Write-Host "  🔄 $relativePath" -ForegroundColor Yellow
                    Write-Host "      Would remove: $occurrences occurrence(s)" -ForegroundColor Yellow
                }
                else {
                    Set-Content -Path $file.FullName -Value $content -NoNewline
                    Write-Host "  ✅ $relativePath" -ForegroundColor Green
                    Write-Host "      Removed: $occurrences occurrence(s)" -ForegroundColor Green
                }
                $updatedFiles += $relativePath
            }
            else {
                Write-Host "  ⚠️  $relativePath" -ForegroundColor Yellow
                Write-Host "      Found but could not remove (manual review needed)" -ForegroundColor Yellow
                $skippedFiles += $relativePath
            }
        }
        catch {
            Write-Host "  ❌ $relativePath" -ForegroundColor Red
            Write-Host "      Error: $_" -ForegroundColor Red
            $errorFiles += $relativePath
        }
    }

    # Summary
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Summary" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-InfoMessage "Total files scanned: $($allFiles.Count)"

    if ($DryRun) {
        Write-Host "  Files that would be updated: $($updatedFiles.Count)" -ForegroundColor Yellow
    }
    else {
        Write-Host "  Files updated: $($updatedFiles.Count)" -ForegroundColor Green
    }

    Write-Host "  Files skipped: $($skippedFiles.Count)" -ForegroundColor Gray

    if ($errorFiles.Count -gt 0) {
        Write-Host "  Files with errors: $($errorFiles.Count)" -ForegroundColor Red
    }

    if ($updatedFiles.Count -gt 0) {
        Write-Host ""
        if ($DryRun) {
            Write-InfoMessage "Run without -DryRun to apply changes"
        }
        else {
            Write-Success "Router configuration updated successfully!"
            Write-InfoMessage "Next: Run 'npm run build' to verify the changes"
        }
    }
    elseif ($skippedFiles.Count -eq $allFiles.Count) {
        Write-Success "No relativeLinkResolution property found!"
    }

    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-ErrorMessage "Failed to update router configuration: $_"
    exit 1
}

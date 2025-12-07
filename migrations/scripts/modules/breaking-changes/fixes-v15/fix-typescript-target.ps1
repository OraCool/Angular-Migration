<#
.SYNOPSIS
    Updates TypeScript target to ES2022 in all tsconfig files.

.DESCRIPTION
    Scans all tsconfig*.json files in the project and updates the
    "target" compiler option from ES2020 or ES2021 to ES2022.

    This is required for Angular 15+ which uses ES2022 as the default target.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER DryRun
    Preview changes without applying them.

.EXAMPLE
    .\fix-typescript-target.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\fix-typescript-target.ps1 -DryRun

.NOTES
    Version: 1.0.0
    Related: Angular 15+ Migration
    Fixes: TypeScript target warning during build
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
Write-Host "  TypeScript Target Fix (ES2022)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
if ($DryRun) {
    Write-WarningMessage "DRY RUN MODE - No changes will be applied"
}
Write-Host ""

try {
    # Find all tsconfig files (excluding node_modules, dist, .angular)
    Write-InfoMessage "Scanning for tsconfig files..."
    $tsconfigFiles = Get-ChildItem -Path $ProjectPath -Filter "tsconfig*.json" -Recurse |
        Where-Object {
            $_.DirectoryName -notmatch 'node_modules|dist|\.angular|\.nx'
        }

    if ($tsconfigFiles.Count -eq 0) {
        Write-WarningMessage "No tsconfig files found"
        exit 0
    }

    Write-InfoMessage "Found $($tsconfigFiles.Count) tsconfig file(s)"
    Write-Host ""

    $updatedFiles = @()
    $skippedFiles = @()
    $errorFiles = @()

    foreach ($file in $tsconfigFiles) {
        $relativePath = $file.FullName.Replace($ProjectPath, "").TrimStart('\', '/')

        try {
            $content = Get-Content -Path $file.FullName -Raw
            $originalContent = $content

            # Check current target
            if ($content -match '"target"\s*:\s*"([^"]+)"') {
                $currentTarget = $matches[1]

                if ($currentTarget -eq "ES2022") {
                    Write-Host "  ⏭️  $relativePath" -ForegroundColor Gray
                    Write-Host "      Already ES2022" -ForegroundColor Gray
                    $skippedFiles += $relativePath
                    continue
                }
                elseif ($currentTarget -match "ES202[01]") {
                    # Update to ES2022
                    $content = $content -replace '"target"\s*:\s*"ES202[01]"', '"target": "ES2022"'

                    if ($DryRun) {
                        Write-Host "  🔄 $relativePath" -ForegroundColor Yellow
                        Write-Host "      Would update: $currentTarget → ES2022" -ForegroundColor Yellow
                    }
                    else {
                        Set-Content -Path $file.FullName -Value $content -NoNewline
                        Write-Host "  ✅ $relativePath" -ForegroundColor Green
                        Write-Host "      Updated: $currentTarget → ES2022" -ForegroundColor Green
                    }
                    $updatedFiles += $relativePath
                }
                else {
                    Write-Host "  ⚠️  $relativePath" -ForegroundColor Yellow
                    Write-Host "      Current target: $currentTarget (manual review needed)" -ForegroundColor Yellow
                    $skippedFiles += $relativePath
                }
            }
            else {
                Write-Host "  ⚠️  $relativePath" -ForegroundColor Yellow
                Write-Host "      No 'target' property found" -ForegroundColor Yellow
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
    Write-InfoMessage "Total files scanned: $($tsconfigFiles.Count)"

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
            Write-Success "TypeScript target updated successfully!"
            Write-InfoMessage "Next: Run 'npm run build' to verify the changes"
        }
    }
    elseif ($skippedFiles.Count -eq $tsconfigFiles.Count) {
        Write-Success "All files already use ES2022 target!"
    }

    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-ErrorMessage "Failed to update TypeScript target: $_"
    exit 1
}

<#
.SYNOPSIS
    Removes deprecated MatFormField.updateOutlineGap() method calls.

.DESCRIPTION
    Scans TypeScript files and removes calls to the deprecated
    updateOutlineGap() method on MatFormField instances.

    This method was removed in Angular Material 15 as outline gap
    is now calculated automatically.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER DryRun
    Preview changes without applying them.

.EXAMPLE
    .\fix-material-form-field.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\fix-material-form-field.ps1 -DryRun

.NOTES
    Version: 1.0.0
    Related: Angular Material 15 Migration
    Fixes: Property 'updateOutlineGap' does not exist on type 'MatFormField'
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [switch]$DryRun = $false
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "..\.."
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Material Form Field Fix (updateOutlineGap)" -ForegroundColor Cyan
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

    # Find TypeScript files
    Write-InfoMessage "Scanning for TypeScript files..."
    $tsFiles = Get-ChildItem -Path $srcPath -Filter "*.ts" -Recurse |
        Where-Object {
            $_.DirectoryName -notmatch 'node_modules|dist|\.angular' -and
            $_.Name -notmatch '\.spec\.ts$'
        }

    if ($tsFiles.Count -eq 0) {
        Write-WarningMessage "No TypeScript files found"
        exit 0
    }

    Write-InfoMessage "Found $($tsFiles.Count) TypeScript file(s)"
    Write-Host ""

    $updatedFiles = @()
    $skippedFiles = @()
    $errorFiles = @()

    foreach ($file in $tsFiles) {
        $relativePath = $file.FullName.Replace($ProjectPath, "").TrimStart('\', '/')

        try {
            $content = Get-Content -Path $file.FullName -Raw
            $originalContent = $content

            # Skip if no updateOutlineGap found
            if ($content -notmatch 'updateOutlineGap') {
                $skippedFiles += $relativePath
                continue
            }

            # Count occurrences before removal
            $callCount = ([regex]::Matches($content, '\.updateOutlineGap\(\)')).Count

            # Remove the entire line with updateOutlineGap()
            # Handles various patterns:
            # - this.formField.updateOutlineGap();
            # - formField.updateOutlineGap();
            # - this._formField.updateOutlineGap();
            # - matFormField.updateOutlineGap();
            $content = $content -replace ".*\.updateOutlineGap\(\);?\s*\r?\n?", ""

            # Clean up potential extra blank lines
            $content = $content -replace "(\r?\n){3,}", "`r`n`r`n"

            if ($content -ne $originalContent) {
                if ($DryRun) {
                    Write-Host "  🔄 $relativePath" -ForegroundColor Yellow
                    Write-Host "      Would remove: $callCount updateOutlineGap() call(s)" -ForegroundColor Yellow
                }
                else {
                    Set-Content -Path $file.FullName -Value $content -NoNewline
                    Write-Host "  ✅ $relativePath" -ForegroundColor Green
                    Write-Host "      Removed: $callCount updateOutlineGap() call(s)" -ForegroundColor Green
                }
                $updatedFiles += $relativePath
            }
            else {
                Write-Host "  ⚠️  $relativePath" -ForegroundColor Yellow
                Write-Host "      Contains updateOutlineGap but could not remove (manual review needed)" -ForegroundColor Yellow
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
    Write-InfoMessage "Total TypeScript files scanned: $($tsFiles.Count)"

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
            Write-Success "updateOutlineGap() calls removed successfully!"
            Write-Host ""
            Write-InfoMessage "Note: Outline gap is now calculated automatically in Material 15"
            Write-InfoMessage "Next: Run 'npm run build' to verify the changes"
        }
    }
    elseif ($skippedFiles.Count -eq $tsFiles.Count) {
        Write-Success "No updateOutlineGap() calls found!"
    }

    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-ErrorMessage "Failed to remove updateOutlineGap() calls: $_"
    exit 1
}

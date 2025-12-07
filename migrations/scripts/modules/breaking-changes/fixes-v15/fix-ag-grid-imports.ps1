<#
.SYNOPSIS
    Updates ag-Grid stylesheet import paths for v28+.

.DESCRIPTION
    Scans SCSS/SASS/CSS files and updates ag-Grid import paths
    from the old format (@ag-grid-community/core/dist/styles/)
    to the new format (ag-grid-community/styles/).

    This is required for ag-Grid v28+ compatibility.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER DryRun
    Preview changes without applying them.

.EXAMPLE
    .\fix-ag-grid-imports.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\fix-ag-grid-imports.ps1 -DryRun

.NOTES
    Version: 1.0.0
    Related: ag-Grid v28+ Migration
    Fixes: SassError - Can't find stylesheet to import
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
Write-Host "  ag-Grid Imports Fix (v28+)" -ForegroundColor Cyan
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

    # Find style files
    Write-InfoMessage "Scanning for SCSS/SASS/CSS files..."
    $styleFiles = Get-ChildItem -Path $srcPath -Include "*.scss", "*.sass", "*.css" -Recurse |
        Where-Object { $_.DirectoryName -notmatch 'node_modules|dist|\.angular' }

    if ($styleFiles.Count -eq 0) {
        Write-WarningMessage "No style files found"
        exit 0
    }

    Write-InfoMessage "Found $($styleFiles.Count) style file(s)"
    Write-Host ""

    $updatedFiles = @()
    $skippedFiles = @()
    $errorFiles = @()

    foreach ($file in $styleFiles) {
        $relativePath = $file.FullName.Replace($ProjectPath, "").TrimStart('\', '/')

        try {
            $content = Get-Content -Path $file.FullName -Raw
            $originalContent = $content

            # Skip if no ag-grid old imports found
            if ($content -notmatch '@ag-grid-community/core/dist/styles/') {
                $skippedFiles += $relativePath
                continue
            }

            # Count occurrences before migration
            $importCount = ([regex]::Matches($content, '@ag-grid-community/core/dist/styles/')).Count

            $changes = @()

            # Update @import statements
            # FROM: @import '@ag-grid-community/core/dist/styles/ag-grid';
            # TO:   @import 'ag-grid-community/styles/ag-grid';
            if ($content -match "@import\s+['""]@ag-grid-community/core/dist/styles/") {
                $content = $content -replace "@import\s+['""]@ag-grid-community/core/dist/styles/", "@import 'ag-grid-community/styles/"
                $changes += "@import statements"
            }

            # Update @use statements (for Sass modules)
            # FROM: @use '@ag-grid-community/core/dist/styles/ag-grid';
            # TO:   @use 'ag-grid-community/styles/ag-grid';
            if ($content -match "@use\s+['""]@ag-grid-community/core/dist/styles/") {
                $content = $content -replace "@use\s+['""]@ag-grid-community/core/dist/styles/", "@use 'ag-grid-community/styles/"
                $changes += "@use statements"
            }

            # Update @forward statements (for Sass modules)
            # FROM: @forward '@ag-grid-community/core/dist/styles/ag-grid';
            # TO:   @forward 'ag-grid-community/styles/ag-grid';
            if ($content -match "@forward\s+['""]@ag-grid-community/core/dist/styles/") {
                $content = $content -replace "@forward\s+['""]@ag-grid-community/core/dist/styles/", "@forward 'ag-grid-community/styles/"
                $changes += "@forward statements"
            }

            if ($content -ne $originalContent) {
                if ($DryRun) {
                    Write-Host "  🔄 $relativePath" -ForegroundColor Yellow
                    Write-Host "      Would update: $importCount import(s) ($($changes -join ', '))" -ForegroundColor Yellow
                }
                else {
                    Set-Content -Path $file.FullName -Value $content -NoNewline
                    Write-Host "  ✅ $relativePath" -ForegroundColor Green
                    Write-Host "      Updated: $importCount import(s) ($($changes -join ', '))" -ForegroundColor Green
                }
                $updatedFiles += $relativePath
            }
            else {
                Write-Host "  ⚠️  $relativePath" -ForegroundColor Yellow
                Write-Host "      Contains old imports but could not update (manual review needed)" -ForegroundColor Yellow
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
    Write-InfoMessage "Total style files scanned: $($styleFiles.Count)"

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
            Write-Success "ag-Grid imports updated successfully!"
            Write-Host ""
            Write-InfoMessage "Important: Ensure ag-Grid packages are up to date:"
            Write-InfoMessage "  npm install ag-grid-community@latest ag-grid-angular@latest"
            Write-Host ""
            Write-InfoMessage "⚠️  ag-Grid v28+ has additional API changes:"
            Write-InfoMessage "  - detailNode property removed from IRowNode"
            Write-InfoMessage "  - Master-detail configuration changed"
            Write-InfoMessage "  - See: https://www.ag-grid.com/javascript-data-grid/upgrading-to-ag-grid-28/"
            Write-Host ""
            Write-InfoMessage "Next: Run 'npm run build' to verify the changes"
        }
    }
    elseif ($skippedFiles.Count -eq $styleFiles.Count) {
        Write-Success "No ag-Grid old-style imports found!"
    }

    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-ErrorMessage "Failed to update ag-Grid imports: $_"
    exit 1
}

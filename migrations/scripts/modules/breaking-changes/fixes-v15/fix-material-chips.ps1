<#
.SYNOPSIS
    Migrates Material Chips API from Angular 14 to Angular 15.

.DESCRIPTION
    Performs the following transformations with intelligent detection:

    CHIP GRIDS (form inputs with matChipInputFor):
    1. mat-chip-list → mat-chip-grid
    2. mat-chip → mat-chip-row
    3. #chipList → #chipGrid (template variable)

    SELECTABLE CHIPS (with [selected] property):
    1. mat-chip-list → mat-chip-listbox
    2. mat-chip → mat-chip-option
    3. [selected] → kept as [selected]

    NON-SELECTABLE CHIPS (display only):
    1. mat-chip-list → mat-chip-set
    2. [selected] → [highlighted]

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER DryRun
    Preview changes without applying them.

.EXAMPLE
    .\fix-material-chips.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\fix-material-chips.ps1 -DryRun

.NOTES
    Version: 2.0.0 (Enhanced with chip grid support)
    Related: Angular Material 15 Migration
    Fixes: mat-chip-list is unknown, Can't bind to 'selected' on 'mat-chip'
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
Write-Host "  Material Chips Fix (Angular 15)" -ForegroundColor Cyan
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

    # Find HTML files
    Write-InfoMessage "Scanning for HTML templates..."
    $htmlFiles = Get-ChildItem -Path $srcPath -Filter "*.html" -Recurse |
        Where-Object { $_.DirectoryName -notmatch 'node_modules|dist|\.angular' }

    if ($htmlFiles.Count -eq 0) {
        Write-WarningMessage "No HTML files found"
        exit 0
    }

    Write-InfoMessage "Found $($htmlFiles.Count) HTML file(s)"
    Write-Host ""

    $updatedFiles = @()
    $skippedFiles = @()
    $errorFiles = @()
    $changesSummary = @{}

    foreach ($file in $htmlFiles) {
        $relativePath = $file.FullName.Replace($ProjectPath, "").TrimStart('\', '/')

        try {
            $content = Get-Content -Path $file.FullName -Raw
            $originalContent = $content

            # Skip if no Material Chips found
            if ($content -notmatch '<mat-chip-list' -and $content -notmatch '<mat-chip\s') {
                $skippedFiles += $relativePath
                continue
            }

            $changes = @()
            $modified = $false

            # PRIORITY 1: Check if this is a chip input (form field with matChipInputFor)
            $hasChipInput = $content -match 'matChipInputFor'

            if ($hasChipInput) {
                # CHIP GRID PATH (for form inputs)

                # Convert mat-chip-list → mat-chip-grid
                if ($content -match '<mat-chip-list') {
                    $listCount = ([regex]::Matches($content, '<mat-chip-list')).Count
                    $content = $content -replace '<mat-chip-list(\s|>)', '<mat-chip-grid$1'
                    $content = $content -replace '</mat-chip-list>', '</mat-chip-grid>'
                    $changes += "mat-chip-list → mat-chip-grid ($listCount)"
                    $modified = $true
                }

                # Convert mat-chip → mat-chip-row
                if ($content -match '<mat-chip') {
                    $chipCount = ([regex]::Matches($content, '<mat-chip(\s|>)')).Count
                    $content = $content -replace '<mat-chip(\s)', '<mat-chip-row$1'
                    $content = $content -replace '<mat-chip>', '<mat-chip-row>'
                    $content = $content -replace '</mat-chip>', '</mat-chip-row>'
                    $changes += "mat-chip → mat-chip-row ($chipCount)"
                    $modified = $true
                }

                # Update template variable references (e.g., #chipList → #chipGrid)
                if ($content -match '#\w+(?=\s|>)') {
                    $oldVarName = $null
                    if ($content -match '#(chipList|chiplist)') {
                        $oldVarName = $matches[1]
                        $content = $content -replace "#$oldVarName", '#chipGrid'
                        $content = $content -replace "\[matChipInputFor\]=""$oldVarName""", '[matChipInputFor]="chipGrid"'
                        $content = $content -replace "\[matChipInputFor\]='$oldVarName'", "[matChipInputFor]='chipGrid'"
                        $content = $content -replace "\[matChipInputFor\]=$oldVarName", "[matChipInputFor]=chipGrid"
                        $changes += "Updated template variable: #$oldVarName → #chipGrid"
                        $modified = $true
                    }
                }
            }
            else {
                # PRIORITY 2: Determine if chips are selectable
                $hasSelectableChips = $content -match '<mat-chip[^>]*\[selected\]'

                if ($hasSelectableChips) {
                    # SELECTABLE CHIPS PATH

                    # Convert mat-chip-list → mat-chip-listbox
                    if ($content -match '<mat-chip-list') {
                        $listCount = ([regex]::Matches($content, '<mat-chip-list')).Count
                        $content = $content -replace '<mat-chip-list(\s|>)', '<mat-chip-listbox$1'
                        $content = $content -replace '</mat-chip-list>', '</mat-chip-listbox>'
                        $changes += "mat-chip-list → mat-chip-listbox ($listCount)"
                        $modified = $true
                    }

                    # Convert mat-chip → mat-chip-option
                    if ($content -match '<mat-chip') {
                        $chipCount = ([regex]::Matches($content, '<mat-chip(\s|>)')).Count
                        $content = $content -replace '<mat-chip(\s)', '<mat-chip-option$1'
                        $content = $content -replace '<mat-chip>', '<mat-chip-option>'
                        $content = $content -replace '</mat-chip>', '</mat-chip-option>'
                        $changes += "mat-chip → mat-chip-option ($chipCount)"
                        $modified = $true
                    }

                    # [selected] stays as [selected] for mat-chip-option
                    $changes += "[selected] kept for mat-chip-option"
                }
                else {
                    # NON-SELECTABLE CHIPS PATH

                    # Convert mat-chip-list → mat-chip-set
                    if ($content -match '<mat-chip-list') {
                        $listCount = ([regex]::Matches($content, '<mat-chip-list')).Count
                        $content = $content -replace '<mat-chip-list(\s|>)', '<mat-chip-set$1'
                        $content = $content -replace '</mat-chip-list>', '</mat-chip-set>'
                        $changes += "mat-chip-list → mat-chip-set ($listCount)"
                        $modified = $true
                    }

                    # Convert [selected] → [highlighted] for non-selectable chips
                    if ($content -match '\[selected\]') {
                        $selectedCount = ([regex]::Matches($content, '\[selected\]')).Count
                        $content = $content -replace '\[selected\]', '[highlighted]'
                        $changes += "[selected] → [highlighted] ($selectedCount)"
                        $modified = $true
                    }
                }
            }

            if ($modified -and $content -ne $originalContent) {
                if ($DryRun) {
                    Write-Host "  🔄 $relativePath" -ForegroundColor Yellow
                    foreach ($change in $changes) {
                        Write-Host "      - $change" -ForegroundColor Yellow
                    }
                }
                else {
                    Set-Content -Path $file.FullName -Value $content -NoNewline
                    Write-Host "  ✅ $relativePath" -ForegroundColor Green
                    foreach ($change in $changes) {
                        Write-Host "      - $change" -ForegroundColor Green
                    }
                }
                $updatedFiles += $relativePath
                $changesSummary[$relativePath] = $changes
            }
            else {
                if ($content -match '<mat-chip') {
                    Write-Host "  ⏭️  $relativePath" -ForegroundColor Gray
                    Write-Host "      Contains mat-chip but no changes needed" -ForegroundColor Gray
                }
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
    Write-InfoMessage "Total HTML files scanned: $($htmlFiles.Count)"

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
            Write-Success "Material Chips migrated successfully!"
            Write-Host ""
            Write-InfoMessage "Important: Verify that TypeScript files use correct imports:"
            Write-InfoMessage "  - For selectable chips: MatChipsModule with MatChipListbox, MatChipOption"
            Write-InfoMessage "  - For non-selectable: MatChipsModule with MatChipSet, MatChip"
            Write-Host ""
            Write-InfoMessage "Next: Run 'npm run build' to verify the changes"
        }
    }
    elseif ($skippedFiles.Count -eq $htmlFiles.Count) {
        Write-Success "No Material Chips migration needed!"
    }

    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-ErrorMessage "Failed to migrate Material Chips: $_"
    exit 1
}

<#
.SYNOPSIS
    Diagnoses Material Slider usage and provides migration guidance.

.DESCRIPTION
    Scans HTML files for Material Slider usage and reports:
    - Files containing mat-slider
    - Deprecated properties used (tickInterval, thumbLabel, etc.)
    - Migration recommendations

    NOTE: Material Slider was completely rewritten in Material 15.
    This script provides diagnostic information only.
    Manual migration is required due to structural HTML changes.

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER OutputReport
    Optional path to save the diagnostic report as a markdown file.

.EXAMPLE
    .\diagnose-material-slider.ps1 -ProjectPath "C:\MyProject"

.EXAMPLE
    .\diagnose-material-slider.ps1 -OutputReport "slider-migration-report.md"

.NOTES
    Version: 1.0.0
    Related: Angular Material 15 Migration
    Issue: Material Slider API completely changed - requires manual migration
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [string]$OutputReport = ""
)

$ErrorActionPreference = 'Stop'

$ModulesPath = Join-Path $PSScriptRoot "..\.."
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force

$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Material Slider Diagnostic (Angular 15)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-Host ""

$report = @()
$report += "# Material Slider Migration Diagnostic Report"
$report += ""
$report += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$report += "Project: $ProjectPath"
$report += ""
$report += "---"
$report += ""

try {
    $srcPath = Join-Path $ProjectPath "src"

    if (-not (Test-Path $srcPath)) {
        Write-ErrorMessage "Source directory not found: $srcPath"
        exit 1
    }

    # Find HTML files with mat-slider
    Write-InfoMessage "Scanning for Material Slider usage..."
    $htmlFiles = Get-ChildItem -Path $srcPath -Filter "*.html" -Recurse |
        Where-Object { $_.DirectoryName -notmatch 'node_modules|dist|\.angular' }

    $sliderFiles = @()
    $sliderDetails = @{}

    foreach ($file in $htmlFiles) {
        $content = Get-Content -Path $file.FullName -Raw

        if ($content -match '<mat-slider') {
            $sliderFiles += $file
            $relativePath = $file.FullName.Replace($ProjectPath, "").TrimStart('\', '/')

            # Analyze slider usage
            $details = @{
                Path = $relativePath
                Occurrences = ([regex]::Matches($content, '<mat-slider')).Count
                DeprecatedProps = @()
                MigrationComplexity = "Medium"
            }

            # Check for deprecated/changed properties
            if ($content -match '\[tickInterval\]') { $details.DeprecatedProps += 'tickInterval' }
            if ($content -match '\[thumbLabel\]') { $details.DeprecatedProps += 'thumbLabel' }
            if ($content -match '\[discrete\]') { $details.DeprecatedProps += 'discrete (changed to attribute)' }
            if ($content -match '\[vertical\]') { $details.DeprecatedProps += 'vertical' }
            if ($content -match '\[invert\]') { $details.DeprecatedProps += 'invert' }
            if ($content -match '\[displayWith\]') { $details.DeprecatedProps += 'displayWith' }

            # Determine complexity
            if ($details.DeprecatedProps.Count -gt 3) {
                $details.MigrationComplexity = "High"
            }
            elseif ($details.DeprecatedProps.Count -eq 0) {
                $details.MigrationComplexity = "Low"
            }

            $sliderDetails[$relativePath] = $details
        }
    }

    if ($sliderFiles.Count -eq 0) {
        Write-Success "No Material Slider usage found!"
        Write-Host ""
        $report += "## Result"
        $report += ""
        $report += "✅ **No Material Slider usage found in this project.**"
        $report += ""
    }
    else {
        Write-Host ""
        Write-WarningMessage "Found $($sliderFiles.Count) file(s) using Material Slider"
        Write-Host ""

        $report += "## Summary"
        $report += ""
        $report += "⚠️ **Found $($sliderFiles.Count) file(s) using Material Slider**"
        $report += ""
        $report += "Material 15 completely rewrote the slider component. **Manual migration required.**"
        $report += ""
        $report += "---"
        $report += ""
        $report += "## Files Requiring Migration"
        $report += ""

        # Display and report details
        $highComplexity = @()
        $mediumComplexity = @()
        $lowComplexity = @()

        foreach ($file in $sliderFiles) {
            $relativePath = $file.FullName.Replace($ProjectPath, "").TrimStart('\', '/')
            $details = $sliderDetails[$relativePath]

            # Console output
            $complexityColor = switch ($details.MigrationComplexity) {
                "High" { "Red"; $highComplexity += $relativePath }
                "Medium" { "Yellow"; $mediumComplexity += $relativePath }
                "Low" { "Green"; $lowComplexity += $relativePath }
            }

            Write-Host "  📄 $relativePath" -ForegroundColor $complexityColor
            Write-Host "      Complexity: $($details.MigrationComplexity)" -ForegroundColor $complexityColor
            Write-Host "      Occurrences: $($details.Occurrences)" -ForegroundColor $complexityColor

            if ($details.DeprecatedProps.Count -gt 0) {
                Write-Host "      Deprecated properties: $($details.DeprecatedProps -join ', ')" -ForegroundColor $complexityColor
            }
            Write-Host ""

            # Report output
            $complexityEmoji = switch ($details.MigrationComplexity) {
                "High" { "🔴" }
                "Medium" { "🟡" }
                "Low" { "🟢" }
            }

            $report += "### $complexityEmoji $relativePath"
            $report += ""
            $report += "- **Complexity:** $($details.MigrationComplexity)"
            $report += "- **Occurrences:** $($details.Occurrences)"

            if ($details.DeprecatedProps.Count -gt 0) {
                $report += "- **Deprecated Properties:**"
                foreach ($prop in $details.DeprecatedProps) {
                    $report += "  - ``$prop``"
                }
            }
            else {
                $report += "- **Deprecated Properties:** None detected"
            }

            $report += ""
        }

        # Migration guidance
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Migration Guidance" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""

        $report += "---"
        $report += ""
        $report += "## Migration Guidance"
        $report += ""

        Write-InfoMessage "Material 15 Slider Changes:"
        Write-Host ""
        Write-Host "  ❌ REMOVED Properties:" -ForegroundColor Red
        Write-Host "     - [tickInterval]     → No direct replacement" -ForegroundColor Red
        Write-Host "     - [thumbLabel]       → No direct replacement" -ForegroundColor Red
        Write-Host "     - [vertical]         → No direct replacement" -ForegroundColor Red
        Write-Host "     - [invert]           → No direct replacement" -ForegroundColor Red
        Write-Host "     - [displayWith]      → No direct replacement" -ForegroundColor Red
        Write-Host ""
        Write-Host "  🔄 CHANGED Properties:" -ForegroundColor Yellow
        Write-Host "     - [discrete]         → discrete (now an attribute)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  ✅ NEW Structure:" -ForegroundColor Green
        Write-Host "     - <input matSliderThumb> required inside <mat-slider>" -ForegroundColor Green
        Write-Host "     - showTickMarks attribute for tick marks" -ForegroundColor Green
        Write-Host ""

        $report += "### Key Changes"
        $report += ""
        $report += "#### ❌ Removed Properties (No Direct Replacement)"
        $report += ""
        $report += "- ``[tickInterval]`` - Tick marks configuration"
        $report += "- ``[thumbLabel]`` - Thumb label display"
        $report += "- ``[vertical]`` - Vertical orientation"
        $report += "- ``[invert]`` - Inverted slider"
        $report += "- ``[displayWith]`` - Custom value display function"
        $report += ""
        $report += "#### 🔄 Changed Properties"
        $report += ""
        $report += "- ``[discrete]`` → ``discrete`` (now an attribute, not a property)"
        $report += ""
        $report += "#### ✅ New Structure Required"
        $report += ""
        $report += "- ``<input matSliderThumb>`` now required inside ``<mat-slider>``"
        $report += "- ``showTickMarks`` attribute for displaying tick marks"
        $report += ""

        Write-InfoMessage "Migration Example:"
        Write-Host ""
        Write-Host "  BEFORE (Angular 14):" -ForegroundColor Yellow
        Write-Host '  <mat-slider' -ForegroundColor Gray
        Write-Host '      [min]="0"' -ForegroundColor Gray
        Write-Host '      [max]="100"' -ForegroundColor Gray
        Write-Host '      [tickInterval]="1"' -ForegroundColor Gray
        Write-Host '      [thumbLabel]="true"' -ForegroundColor Gray
        Write-Host '      [(ngModel)]="value">' -ForegroundColor Gray
        Write-Host '  </mat-slider>' -ForegroundColor Gray
        Write-Host ""
        Write-Host "  AFTER (Angular 15):" -ForegroundColor Green
        Write-Host '  <mat-slider' -ForegroundColor Gray
        Write-Host '      [min]="0"' -ForegroundColor Gray
        Write-Host '      [max]="100"' -ForegroundColor Gray
        Write-Host '      discrete' -ForegroundColor Gray
        Write-Host '      showTickMarks>' -ForegroundColor Gray
        Write-Host '      <input matSliderThumb [(ngModel)]="value">' -ForegroundColor Gray
        Write-Host '  </mat-slider>' -ForegroundColor Gray
        Write-Host ""

        $report += "### Migration Example"
        $report += ""
        $report += '```html'
        $report += "<!-- BEFORE (Angular 14) -->"
        $report += '<mat-slider'
        $report += '    [min]="0"'
        $report += '    [max]="100"'
        $report += '    [tickInterval]="1"'
        $report += '    [thumbLabel]="true"'
        $report += '    [(ngModel)]="value">'
        $report += '</mat-slider>'
        $report += ''
        $report += "<!-- AFTER (Angular 15) -->"
        $report += '<mat-slider'
        $report += '    [min]="0"'
        $report += '    [max]="100"'
        $report += '    discrete'
        $report += '    showTickMarks>'
        $report += '    <input matSliderThumb [(ngModel)]="value">'
        $report += '</mat-slider>'
        $report += '```'
        $report += ""

        Write-InfoMessage "Action Required:"
        Write-Host "  1. Manually update each mat-slider in the files listed above"
        Write-Host "  2. Add <input matSliderThumb> inside each slider"
        Write-Host "  3. Remove deprecated properties (no replacement available)"
        Write-Host "  4. Test slider functionality after migration"
        Write-Host ""

        $report += "### Action Required"
        $report += ""
        $report += "1. ✏️ Manually update each ``mat-slider`` in the files listed above"
        $report += "2. ➕ Add ``<input matSliderThumb>`` inside each slider"
        $report += "3. ➖ Remove deprecated properties (no replacement available)"
        $report += "4. ✅ Test slider functionality after migration"
        $report += ""
        $report += "### Resources"
        $report += ""
        $report += "- [Material 15 Slider Guide](https://material.angular.io/components/slider/overview)"
        $report += "- [Material MDC Migration](https://material.angular.io/guide/mdc-migration)"
        $report += ""
    }

    # Save report if requested
    if ($OutputReport -ne "") {
        $reportPath = Join-Path $ProjectPath $OutputReport
        $report | Out-File -FilePath $reportPath -Encoding utf8
        Write-Host ""
        Write-Success "Report saved to: $OutputReport"
    }

    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-ErrorMessage "Failed to diagnose Material Slider usage: $_"
    exit 1
}

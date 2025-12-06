<#
.SYNOPSIS
    Angular 15 specific breaking changes fixes.

.DESCRIPTION
    Automates the following Angular 14 → 15 breaking changes:
    1. DATE_PIPE_DEFAULT_TIMEZONE → DATE_PIPE_DEFAULT_OPTIONS
    2. Material Chips API migration (mat-chip-list → mat-chip-set)

    Provides warnings for manual fixes:
    - RxJS subscribe() syntax deprecation
    - ControlValueAccessor.setDisabledState requirement
    - Functional router guards recommendation
    - TypeScript strict mode improvements

.PARAMETER ProjectPath
    Path to the Angular project root directory.

.RETURNS
    Hashtable with the following keys:
    - Success: Boolean indicating if fixes completed without errors
    - Message: Summary message
    - Changes: Array of applied changes
    - Warnings: Array of warnings for manual review
    - Errors: Array of errors encountered

.EXAMPLE
    Invoke-Angular15BreakingChanges -ProjectPath "C:\projects\my-app"

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Angular Version: 15
    Related Docs: migrations/docs/02-migrate-to-angular-15.md
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$CommonModule = Join-Path $PSScriptRoot "common.psm1"
Import-Module $CommonModule -DisableNameChecking

<#
.SYNOPSIS
    Applies breaking change fixes for Angular 15.

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with fix results.
#>
function Invoke-Angular15BreakingChanges {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    Write-InfoMessage "🔧 Applying Angular 15 breaking change fixes..."

    try {
        $srcPath = Join-Path $ProjectPath "src"

        # ============================================================================
        # SECTION 1: DATE_PIPE_DEFAULT_TIMEZONE → DATE_PIPE_DEFAULT_OPTIONS
        # ============================================================================

        Write-InfoMessage "📝 Migrating DATE_PIPE_DEFAULT_TIMEZONE to DATE_PIPE_DEFAULT_OPTIONS..."

        $tsFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.ts')
        $moduleFiles = $tsFiles | Where-Object {
            $_ -match '\.module\.ts$' -or
            $_ -match 'providers\.ts$' -or
            $_ -match 'app\.config\.ts$'
        }

        $datePipeFixCount = 0

        foreach ($file in $moduleFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $originalContent = $content

                # Skip if already migrated
                if ($content -match 'DATE_PIPE_DEFAULT_OPTIONS' -and $content -notmatch 'DATE_PIPE_DEFAULT_TIMEZONE') {
                    continue
                }

                # Skip if no DATE_PIPE_DEFAULT_TIMEZONE found
                if ($content -notmatch 'DATE_PIPE_DEFAULT_TIMEZONE') {
                    continue
                }

                # Step 1: Replace import statement
                # FROM: import { DATE_PIPE_DEFAULT_TIMEZONE } from '@angular/common';
                # TO:   import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
                $content = $content -replace '\bDATE_PIPE_DEFAULT_TIMEZONE\b', 'DATE_PIPE_DEFAULT_OPTIONS'

                # Step 2: Replace provider configuration
                # FROM: { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: 'timezone-string' }
                # TO:   { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: 'timezone-string' } }
                # Pattern handles both single and double quotes
                $content = $content -replace `
                    "(\{\s*provide\s*:\s*)DATE_PIPE_DEFAULT_OPTIONS(\s*,\s*useValue\s*:\s*)(['""])([^'""]+)(['""])", `
                    '$1DATE_PIPE_DEFAULT_OPTIONS$2{ timezone: $3$4$5 }'

                # Verify migration was successful
                if ($content -ne $originalContent) {
                    # Additional validation: check if the new pattern exists
                    if ($content -match 'DATE_PIPE_DEFAULT_OPTIONS.*useValue\s*:\s*\{\s*timezone\s*:') {
                        Set-Content -Path $file -Value $content -NoNewline
                        $datePipeFixCount++
                        $fileName = [System.IO.Path]::GetFileName($file)
                        $changes += "Migrated DATE_PIPE_DEFAULT_OPTIONS in: $fileName"
                    }
                    else {
                        $fileName = [System.IO.Path]::GetFileName($file)
                        $warnings += "DATE_PIPE migration may need manual review in: $fileName"
                    }
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
                $fileName = [System.IO.Path]::GetFileName($file)
                $warnings += "Could not process DATE_PIPE in: $fileName"
            }
        }

        if ($datePipeFixCount -gt 0) {
            Write-Success "  Migrated DATE_PIPE in $datePipeFixCount file(s)"
        }
        else {
            Write-InfoMessage "  No DATE_PIPE_DEFAULT_TIMEZONE usage found"
        }

        # ============================================================================
        # SECTION 2: Material Chips API Migration
        # ============================================================================

        Write-InfoMessage "📝 Migrating Material Chips API (mat-chip-list → mat-chip-set)..."

        $htmlFiles = Find-ProjectFiles -Path $srcPath -FileExtensions @('.html')
        $chipsFixCount = 0

        foreach ($file in $htmlFiles) {
            try {
                $content = Get-Content -Path $file -Raw
                $originalContent = $content

                # Skip if no mat-chip-list found
                if ($content -notmatch '<mat-chip-list') {
                    continue
                }

                # Count occurrences before migration
                $listTagCount = ([regex]::Matches($content, '<mat-chip-list')).Count

                # Replace opening tags (with attributes or whitespace)
                # Pattern: <mat-chip-list> or <mat-chip-list [attr]="value">
                $content = $content -replace '<mat-chip-list(\s|>)', '<mat-chip-set$1'

                # Replace closing tags
                $content = $content -replace '</mat-chip-list>', '</mat-chip-set>'

                # Verify migration was successful
                if ($content -ne $originalContent) {
                    $setTagCount = ([regex]::Matches($content, '<mat-chip-set')).Count

                    # Validate: all mat-chip-list tags were replaced and none remain
                    if ($setTagCount -eq $listTagCount -and $content -notmatch '<mat-chip-list') {
                        Set-Content -Path $file -Value $content -NoNewline
                        $chipsFixCount++
                        $fileName = [System.IO.Path]::GetFileName($file)
                        $changes += "Migrated $listTagCount mat-chip-list tag(s) in: $fileName"
                    }
                    else {
                        $fileName = [System.IO.Path]::GetFileName($file)
                        $warnings += "Material Chips migration may be incomplete in: $fileName"
                    }
                }
            }
            catch {
                Write-Verbose "Error processing file $file : $_"
                $fileName = [System.IO.Path]::GetFileName($file)
                $warnings += "Could not process Material Chips in: $fileName"
            }
        }

        if ($chipsFixCount -gt 0) {
            Write-Success "  Migrated Material Chips in $chipsFixCount file(s)"
        }
        else {
            Write-InfoMessage "  No mat-chip-list tags found"
        }

        # ============================================================================
        # SECTION 3: Manual Review Warnings
        # ============================================================================

        Write-InfoMessage "📝 Adding manual review warnings..."

        # Add comprehensive manual review warnings
        $warnings += ""
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += "Angular 15 Breaking Changes - Manual Review Required"
        $warnings += "═══════════════════════════════════════════════════════════════════"
        $warnings += ""
        $warnings += "1. RxJS subscribe() syntax deprecated:"
        $warnings += "   - Old: .subscribe(data => {}, error => {}, () => {})"
        $warnings += "   - New: .subscribe({ next: data => {}, error: error => {}, complete: () => {} })"
        $warnings += "   - Action: Search in your IDE for '.subscribe(' to find usages"
        $warnings += "   - See: https://rxjs.dev/deprecations/subscribe-arguments"
        $warnings += ""
        $warnings += "2. ControlValueAccessor.setDisabledState() now required:"
        $warnings += "   - Search for: 'implements ControlValueAccessor'"
        $warnings += "   - Ensure each has: setDisabledState(isDisabled: boolean): void { }"
        $warnings += "   - See: migrations/docs/02-migrate-to-angular-15.md#4-setdisabledstate"
        $warnings += ""
        $warnings += "3. Functional router guards recommended (optional in Angular 15):"
        $warnings += "   - Class-based guards (CanActivate, CanDeactivate) still work"
        $warnings += "   - Consider migrating to functional guards for better tree-shaking"
        $warnings += "   - See: migrations/docs/02-migrate-to-angular-15.md#1-router-canactivate"
        $warnings += ""
        $warnings += "4. TypeScript 4.8+ has stricter null checks:"
        $warnings += "   - Compiler will catch type mismatches during build"
        $warnings += "   - Use optional chaining (?.) and nullish coalescing (??)"
        $warnings += "   - Run: npm run build to see TypeScript errors"
        $warnings += ""
        $warnings += "5. Verify prerequisites:"
        $warnings += "   - Node.js 14.20+, 16.x, or 18.x required"
        $warnings += "   - TypeScript 4.8+ required"
        $warnings += "   - Run: migrations/scripts/00-prerequisites-check.ps1 -TargetVersion 15"
        $warnings += ""
        $warnings += "6. Additional Information:"
        $warnings += "   - Review complete migration guide: migrations/docs/02-migrate-to-angular-15.md"
        $warnings += "   - Run build: npm run build"
        $warnings += "   - Run tests: npm test"
        $warnings += "   - Run lint: npm run lint"
        $warnings += "═══════════════════════════════════════════════════════════════════"

        # ============================================================================
        # SECTION 4: Summary and Results
        # ============================================================================

        Write-Success "Angular 15 breaking changes processed successfully"
        Write-InfoMessage "  Automated fixes applied: $($changes.Count)"

        if ($changes.Count -gt 0) {
            Write-InfoMessage "`n  Changes made:"
            foreach ($change in $changes) {
                Write-InfoMessage "    ✓ $change"
            }
        }

        if ($warnings.Count -gt 0) {
            Write-Host ""
            Write-WarningMessage "Important: Please review the warnings above for manual fixes."
        }

        return @{
            Success  = $true
            Message  = "Angular 15 breaking changes processed successfully ($($changes.Count) automated fix(es))"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        Write-ErrorMessage "Failed to apply Angular 15 breaking changes: $_"

        return @{
            Success  = $false
            Message  = "Failed to apply Angular 15 breaking changes"
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

Export-ModuleMember -Function 'Invoke-Angular15BreakingChanges'

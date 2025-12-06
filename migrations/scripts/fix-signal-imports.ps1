<#
.SYNOPSIS
    Fixes signal-based imports in migrated components.

.DESCRIPTION
    This script updates import statements to:
    - Add 'input', 'output', 'model' imports from '@angular/core'
    - Remove unused 'Input', 'Output', 'EventEmitter' imports

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.EXAMPLE
    .\fix-signal-imports.ps1 -ProjectPath "C:\MyProject"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = "."
)

$ErrorActionPreference = 'Stop'

# Import utilities
$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "SignalsMigration.psm1") -Force

# Resolve project path
$ProjectPath = Resolve-Path $ProjectPath

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Fixing Signal Imports" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-Host ""

# Find all TypeScript component files
$componentFiles = Get-ChildItem -Path $ProjectPath -Recurse -Filter "*.component.ts" -File |
Where-Object {
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch 'dist' -and
    $_.FullName -notmatch '.angular'
}

Write-InfoMessage "Found $($componentFiles.Count) component files"
Write-Host ""

$fixedCount = 0

foreach ($file in $componentFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    $needsInput = $false
    $needsOutput = $false
    $needsModel = $false

    # Check what signal-based APIs are used
    if ($content -match '\binput\s*[\(<]' -or $content -match '\binput\.required\s*<') {
        $needsInput = $true
    }
    if ($content -match '\boutput\s*<') {
        $needsOutput = $true
    }
    if ($content -match '\bmodel\s*<') {
        $needsModel = $true
    }

    # Add missing imports
    $importsToAdd = @()
    if ($needsInput -and $content -notmatch "import\s*\{[^}]*\binput\b[^}]*\}\s*from\s*['\`"]@angular/core['\`"]") {
        $importsToAdd += 'input'
    }
    if ($needsOutput -and $content -notmatch "import\s*\{[^}]*\boutput\b[^}]*\}\s*from\s*['\`"]@angular/core['\`"]") {
        $importsToAdd += 'output'
    }
    if ($needsModel -and $content -notmatch "import\s*\{[^}]*\bmodel\b[^}]*\}\s*from\s*['\`"]@angular/core['\`"]") {
        $importsToAdd += 'model'
    }

    if ($importsToAdd.Count -gt 0) {
        $content = Add-TypeScriptImport -Content $content -ImportSymbols $importsToAdd -FromModule '@angular/core'
    }

    # Remove old decorator imports if not used
    if ($content -notmatch '@Input\(') {
        $content = Remove-TypeScriptImport -Content $content -ImportSymbol 'Input' -FromModule '@angular/core'
    }
    if ($content -notmatch '@Output\(') {
        $content = Remove-TypeScriptImport -Content $content -ImportSymbol 'Output' -FromModule '@angular/core'
    }
    if ($content -notmatch '\bEventEmitter\b') {
        $content = Remove-TypeScriptImport -Content $content -ImportSymbol 'EventEmitter' -FromModule '@angular/core'
    }

    # Save if changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Success "  ✅ Fixed imports: $(Split-Path $file.FullName -Leaf)"
        $fixedCount++
    }
}

Write-Host ""
Write-InfoMessage "═══════════════════════════════════════════════════════"
Write-Success "Fixed imports in $fixedCount files"
Write-InfoMessage "═══════════════════════════════════════════════════════"
Write-Host ""

exit 0

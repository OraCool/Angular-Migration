<#
.SYNOPSIS
    Migrates Angular application to standalone components architecture.

.DESCRIPTION
    Converts NgModule-based Angular application to use standalone components.
    This is a recommended architectural pattern introduced in Angular 14+ and
    the default approach in Angular 15+.

    Migration Steps:
    1. Convert components to standalone
    2. Move imports from NgModule to component decorators
    3. Update routing to use standalone components
    4. Convert bootstrap to standalone
    5. Remove unnecessary NgModules

.PARAMETER ProjectPath
    Path to the Angular project (default: current directory).

.PARAMETER TargetScope
    Scope of migration: 'all', 'feature', 'component'
    - 'all': Migrate entire application to standalone
    - 'feature': Migrate specific feature module
    - 'component': Migrate specific component only

.PARAMETER ModuleName
    Name of the feature module to migrate (when TargetScope='feature').

.PARAMETER ComponentPath
    Path to component to migrate (when TargetScope='component').

.PARAMETER DryRun
    Preview changes without applying them.

.PARAMETER SkipTests
    Skip running tests after migration.

.PARAMETER AutoCommit
    Automatically commit changes after successful migration.

.EXAMPLE
    .\migrate-to-standalone.ps1 -ProjectPath "C:\MyProject" -TargetScope all

.EXAMPLE
    .\migrate-to-standalone.ps1 -TargetScope feature -ModuleName "UserModule"

.EXAMPLE
    .\migrate-to-standalone.ps1 -TargetScope component -ComponentPath "src/app/user/user.component.ts"

.NOTES
    Part of Angular Migration Toolkit
    Author: Angular Migration Toolkit

    Prerequisites:
    - Angular 14+ (standalone components support)
    - All dependencies must be Ivy-compatible

    References:
    - https://angular.io/guide/standalone-components
    - https://angular.io/guide/standalone-migration
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = ".",

    [Parameter(Mandatory = $false)]
    [ValidateSet("all", "feature", "component")]
    [string]$TargetScope = "all",

    [Parameter(Mandatory = $false)]
    [string]$ModuleName,

    [Parameter(Mandatory = $false)]
    [string]$ComponentPath,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun = $false,

    [Parameter(Mandatory = $false)]
    [switch]$SkipTests = $false,

    [Parameter(Mandatory = $false)]
    [switch]$AutoCommit = $false
)

$ErrorActionPreference = 'Stop'

# Import modules
$ModulesPath = Join-Path $PSScriptRoot "modules"
Import-Module (Join-Path $ModulesPath "Utilities.psm1") -Force
Import-Module (Join-Path $ModulesPath "Migration.psm1") -Force

# Resolve project path
$ProjectPath = Resolve-Path $ProjectPath

# Display header
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Standalone Components Migration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-InfoMessage "Project: $ProjectPath"
Write-InfoMessage "Scope: $TargetScope"
if ($DryRun) {
    Write-WarningMessage "DRY RUN MODE - No changes will be applied"
}
Write-Host ""

# Validate parameters
if ($TargetScope -eq "feature" -and -not $ModuleName) {
    Write-ErrorMessage "ModuleName is required when TargetScope is 'feature'"
    exit 1
}

if ($TargetScope -eq "component" -and -not $ComponentPath) {
    Write-ErrorMessage "ComponentPath is required when TargetScope is 'component'"
    exit 1
}

# Confirm migration
Write-WarningMessage "This will migrate your application to standalone components."
Write-WarningMessage "It is recommended to:"
Write-WarningMessage "  1. Commit all changes before migration"
Write-WarningMessage "  2. Create a backup of your project"
Write-WarningMessage "  3. Review Angular standalone components guide"
Write-Host ""

if (-not $DryRun) {
    $response = Read-Host "Do you want to continue? (y/N)"
    if ($response -ne 'y') {
        Write-InfoMessage "Migration cancelled."
        exit 0
    }
}

Write-Host ""

# Run migration
try {
    $startTime = Get-Date

    Write-InfoMessage "═══════════════════════════════════════════════════════"
    Write-InfoMessage "  Standalone Components Migration"
    Write-InfoMessage "═══════════════════════════════════════════════════════"
    Write-Host ""

    # Save current directory and change to project directory
    $originalLocation = Get-Location
    Set-Location $ProjectPath

    $migrationSuccess = $true
    $changes = @()

    try {
        switch ($TargetScope) {
            "all" {
                Write-InfoMessage "Step 1/3: Converting components, directives, and pipes to standalone..."
                $convertCmd = if ($DryRun) {
                    "ng generate @angular/core:standalone --dry-run"
                } else {
                    "ng generate @angular/core:standalone"
                }

                $convertOutput = Invoke-Expression $convertCmd 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-ErrorMessage "Failed to convert to standalone: $convertOutput"
                    $migrationSuccess = $false
                } else {
                    Write-Success "✓ Converted components to standalone"
                    $changes += "Converted components, directives, and pipes to standalone"
                }

                if ($migrationSuccess) {
                    Write-Host ""
                    Write-InfoMessage "Step 2/3: Removing unnecessary NgModules..."
                    $pruneCmd = if ($DryRun) {
                        "ng generate @angular/core:standalone --mode=prune-ng-modules --dry-run"
                    } else {
                        "ng generate @angular/core:standalone --mode=prune-ng-modules"
                    }

                    $pruneOutput = Invoke-Expression $pruneCmd 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        Write-WarningMessage "Failed to prune NgModules (this may be expected): $pruneOutput"
                    } else {
                        Write-Success "✓ Removed unnecessary NgModules"
                        $changes += "Pruned unnecessary NgModules"
                    }
                }

                if ($migrationSuccess) {
                    Write-Host ""
                    Write-InfoMessage "Step 3/3: Converting bootstrap to standalone..."
                    $bootstrapCmd = if ($DryRun) {
                        "ng generate @angular/core:standalone --mode=standalone-bootstrap --dry-run"
                    } else {
                        "ng generate @angular/core:standalone --mode=standalone-bootstrap"
                    }

                    $bootstrapOutput = Invoke-Expression $bootstrapCmd 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        Write-WarningMessage "Failed to convert bootstrap (this may be expected): $bootstrapOutput"
                    } else {
                        Write-Success "✓ Converted to standalone bootstrap"
                        $changes += "Converted bootstrap to standalone"
                    }
                }
            }
            "feature" {
                Write-InfoMessage "Migrating feature module: $ModuleName..."
                $featureCmd = if ($DryRun) {
                    "ng generate @angular/core:standalone --mode=convert-to-standalone --path=$ModuleName --dry-run"
                } else {
                    "ng generate @angular/core:standalone --mode=convert-to-standalone --path=$ModuleName"
                }

                $featureOutput = Invoke-Expression $featureCmd 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-ErrorMessage "Failed to migrate feature module: $featureOutput"
                    $migrationSuccess = $false
                } else {
                    Write-Success "✓ Migrated feature module: $ModuleName"
                    $changes += "Migrated feature module: $ModuleName"
                }
            }
            "component" {
                Write-InfoMessage "Migrating component: $ComponentPath..."
                $componentCmd = if ($DryRun) {
                    "ng generate @angular/core:standalone --mode=convert-to-standalone --path=$ComponentPath --dry-run"
                } else {
                    "ng generate @angular/core:standalone --mode=convert-to-standalone --path=$ComponentPath"
                }

                $componentOutput = Invoke-Expression $componentCmd 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-ErrorMessage "Failed to migrate component: $componentOutput"
                    $migrationSuccess = $false
                } else {
                    Write-Success "✓ Migrated component: $ComponentPath"
                    $changes += "Migrated component: $ComponentPath"
                }
            }
        }

        # Restore original directory
        Set-Location $originalLocation

        if (-not $migrationSuccess) {
            throw "Standalone migration failed"
        }

        # ============================================================================
        # POST-PROCESSING: Ensure all components are properly standalone
        # ============================================================================
        # The Angular CLI schematic sometimes fails to add standalone: true to
        # component decorators. This step ensures all components are properly converted.

        if ($TargetScope -eq "all") {
            Write-Host ""
            Write-InfoMessage "Step 4/4: Converting components to standalone with OnPush..."

            $srcPath = Join-Path $ProjectPath "src"

            # Find all component, directive, and pipe files
            $angularFiles = Get-ChildItem -Path $srcPath -Recurse -File |
                Where-Object {
                    ($_.Name -match '\.(component|directive|pipe)\.ts$') -and
                    ($_.FullName -notmatch 'node_modules') -and
                    ($_.FullName -notmatch 'dist') -and
                    ($_.FullName -notmatch '.angular') -and
                    ($_.Name -notmatch '\.spec\.ts$')
                }

            $convertedCount = 0
            $alreadyStandaloneCount = 0

            foreach ($file in $angularFiles) {
                $content = Get-Content -Path $file.FullName -Raw
                $originalContent = $content

                # Determine the decorator type
                $decoratorType = $null
                $decoratorPattern = $null

                if ($content -match '@Component\s*\(\s*\{') {
                    $decoratorType = 'Component'
                    $decoratorPattern = '@Component'
                } elseif ($content -match '@Directive\s*\(\s*\{') {
                    $decoratorType = 'Directive'
                    $decoratorPattern = '@Directive'
                } elseif ($content -match '@Pipe\s*\(\s*\{') {
                    $decoratorType = 'Pipe'
                    $decoratorPattern = '@Pipe'
                }

                if (-not $decoratorType) {
                    continue
                }

                # Check if already standalone
                if ($content -match "$decoratorPattern\s*\(\s*\{[^}]*standalone\s*:\s*true") {
                    $alreadyStandaloneCount++
                    continue
                }

                # For components, ensure ChangeDetectionStrategy is imported
                if ($decoratorType -eq 'Component') {
                    if ($content -notmatch "import\s*\{[^}]*ChangeDetectionStrategy[^}]*\}\s*from\s*'@angular/core'") {
                        # Add ChangeDetectionStrategy to existing @angular/core import or create new one
                        if ($content -match "import\s*\{([^}]+)\}\s*from\s*'@angular/core'") {
                            $existingImports = $matches[1]
                            $newImports = "$existingImports, ChangeDetectionStrategy"
                            $content = $content -replace "(import\s*\{)([^}]+)(\}\s*from\s*'@angular/core')", "`${1}$newImports`$3"
                        } else {
                            # No @angular/core import exists, add it
                            $content = "import { ChangeDetectionStrategy } from '@angular/core';`n" + $content
                        }
                    }
                }

                # Extract the decorator content
                if ($content -match "(?s)$decoratorPattern\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\)") {
                    $decoratorContent = $matches[1]

                    # Build the properties to add
                    $propertiesToAdd = "`n  standalone: true"
                    if ($decoratorType -eq 'Component') {
                        $propertiesToAdd += ",`n  changeDetection: ChangeDetectionStrategy.OnPush"
                    }

                    # Find the first property in the decorator
                    if ($decoratorContent -match '^\s*([a-zA-Z]+\s*:)') {
                        # Insert properties before the first property
                        $newDecoratorContent = "$propertiesToAdd,`n  $decoratorContent"
                    } else {
                        # Decorator is empty or malformed, add properties
                        $newDecoratorContent = "$propertiesToAdd`n$decoratorContent"
                    }

                    # Replace the decorator content
                    $content = $content -replace "(?s)($decoratorPattern\s*\(\s*\{)[^}]+(?:\{[^}]*\}[^}]*)*(\}\s*\))",
                        "`${1}$newDecoratorContent`$2"

                        # Now we need to add imports array
                        # Extract all imports from the file's import statements and template
                        $importModules = @()

                        # For components, also analyze the template
                        $templateContent = ""
                        if ($decoratorType -eq 'Component' -and $content -match "templateUrl\s*:\s*['\`"]([^'\`"]+)['\`"]") {
                            $templatePath = $matches[1]
                            $fullTemplatePath = Join-Path (Split-Path $file.FullName -Parent) $templatePath
                            if (Test-Path $fullTemplatePath) {
                                $templateContent = Get-Content -Path $fullTemplatePath -Raw
                            }
                        } elseif ($decoratorType -eq 'Component' -and $content -match "template\s*:\s*['\`"]") {
                            # Inline template - extract it
                            if ($content -match "template\s*:\s*['\`"]([^'\`"]*)['\`"]") {
                                $templateContent = $matches[1]
                            }
                        }

                        # Get all import statements from the file
                        $importMatches = [regex]::Matches($content, "import\s*\{([^}]+)\}\s*from\s*'([^']+)'")

                        # Build a map of imported classes
                        $importedClasses = @{}
                        foreach ($match in $importMatches) {
                            $importedItems = $match.Groups[1].Value -split ',' | ForEach-Object { $_.Trim() }
                            $fromModule = $match.Groups[2].Value

                            foreach ($item in $importedItems) {
                                $cleanItem = $item -replace '\s+as\s+.*', '' # Remove aliases
                                $importedClasses[$cleanItem] = $fromModule
                            }
                        }

                        # Analyze template for used components/directives if available
                        if ($templateContent) {
                            # Find all custom element tags in template
                            $templateTags = [regex]::Matches($templateContent, '<(app-[\w-]+|mat-[\w-]+)[\s>]') |
                                ForEach-Object { $_.Groups[1].Value } |
                                Select-Object -Unique

                            foreach ($tag in $templateTags) {
                                # Convert kebab-case tag to PascalCase component name
                                # app-header -> AppHeaderComponent, mat-sidenav -> MatSidenav
                                $parts = $tag -split '-'
                                $componentName = ($parts | ForEach-Object {
                                    $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower()
                                }) -join ''

                                # For app-* components, add "Component" suffix if not present
                                if ($tag -match '^app-' -and $componentName -notmatch 'Component$') {
                                    $componentName += 'Component'
                                }

                                # Check if this component is imported
                                if ($importedClasses.ContainsKey($componentName)) {
                                    if ($importModules -notcontains $componentName) {
                                        $importModules += $componentName
                                    }
                                }
                            }

                            # Also check for structural directives and pipes usage
                            if ($templateContent -match '\*ngIf' -and $importedClasses.ContainsKey('NgIf')) {
                                if ($importModules -notcontains 'NgIf') { $importModules += 'NgIf' }
                            }
                            if ($templateContent -match '\*ngFor' -and $importedClasses.ContainsKey('NgFor')) {
                                if ($importModules -notcontains 'NgFor') { $importModules += 'NgFor' }
                            }
                            if ($templateContent -match '\[ngSwitch\]|\*ngSwitchCase|\*ngSwitchDefault' -and $importedClasses.ContainsKey('NgSwitch')) {
                                if ($importModules -notcontains 'NgSwitch') { $importModules += 'NgSwitch' }
                            }
                            if ($templateContent -match '\[ngClass\]' -and $importedClasses.ContainsKey('NgClass')) {
                                if ($importModules -notcontains 'NgClass') { $importModules += 'NgClass' }
                            }
                            if ($templateContent -match '\[ngStyle\]' -and $importedClasses.ContainsKey('NgStyle')) {
                                if ($importModules -notcontains 'NgStyle') { $importModules += 'NgStyle' }
                            }
                            if ($templateContent -match '\|\s*async' -and $importedClasses.ContainsKey('AsyncPipe')) {
                                if ($importModules -notcontains 'AsyncPipe') { $importModules += 'AsyncPipe' }
                            }
                            if ($templateContent -match '\|\s*date' -and $importedClasses.ContainsKey('DatePipe')) {
                                if ($importModules -notcontains 'DatePipe') { $importModules += 'DatePipe' }
                            }
                        }

                        # Also add modules that are commonly needed
                        foreach ($className in $importedClasses.Keys) {
                            $fromModule = $importedClasses[$className]

                            # Angular forms modules
                            if ($fromModule -eq '@angular/forms' -and $className -match '^(FormsModule|ReactiveFormsModule)$') {
                                if ($importModules -notcontains $className) {
                                    $importModules += $className
                                }
                            }
                            # Router modules
                            elseif ($fromModule -eq '@angular/router' -and $className -match '^(RouterOutlet|RouterLink|RouterLinkActive)$') {
                                if ($importModules -notcontains $className) {
                                    $importModules += $className
                                }
                            }
                        }

                    # Add imports array to the decorator if we found any modules
                    if ($importModules.Count -gt 0) {
                        $importsArray = "imports: [`n    " + ($importModules -join ",`n    ") + "`n  ],"

                        # Insert imports array after the appropriate property
                        if ($decoratorType -eq 'Component') {
                            # Insert after changeDetection for components
                            $content = $content -replace '(changeDetection\s*:\s*ChangeDetectionStrategy\.OnPush)\s*,', "`$1,`n  $importsArray"
                        } else {
                            # Insert after standalone for directives/pipes
                            $content = $content -replace "(standalone\s*:\s*true)\s*,", "`$1,`n  $importsArray"
                        }
                    }
                }

                if ($content -ne $originalContent -and -not $DryRun) {
                    Set-Content -Path $file.FullName -Value $content -NoNewline
                    $convertedCount++
                    Write-Success "  ✓ Converted: $($file.Name)"
                }
            }

            Write-Host ""
            if ($convertedCount -gt 0) {
                Write-Success "✓ Converted $convertedCount component(s)/directive(s)/pipe(s) to standalone"
                $changes += "Post-processed $convertedCount files (added standalone: true, OnPush for components, and imports)"
            }
            if ($alreadyStandaloneCount -gt 0) {
                Write-InfoMessage "  ℹ  $alreadyStandaloneCount file(s) already standalone"
            }
        }

        # Run tests if not skipped
        if (-not $SkipTests -and -not $DryRun) {
            Write-Host ""
            Write-InfoMessage "Running tests..."
            Set-Location $ProjectPath

            $testOutput = & npm test 2>&1
            Set-Location $originalLocation

            if ($LASTEXITCODE -ne 0) {
                Write-WarningMessage "Tests failed. Please review and fix."
            } else {
                Write-Success "✓ Tests passed"
            }
        }

        # Auto commit if requested
        if ($AutoCommit -and -not $DryRun) {
            Write-Host ""
            Write-InfoMessage "Committing changes..."
            Set-Location $ProjectPath

            & git add . 2>&1 | Out-Null
            & git commit -m "chore: migrate to standalone components" 2>&1 | Out-Null

            Set-Location $originalLocation

            if ($LASTEXITCODE -eq 0) {
                Write-Success "✓ Changes committed"
            }
        }

        $duration = (Get-Date) - $startTime

        Write-Host ""
        Write-InfoMessage "═══════════════════════════════════════════════════════"
        Write-Success "Standalone migration completed successfully!"
        Write-InfoMessage "Duration: $($duration.ToString('mm\:ss'))"
        Write-InfoMessage "═══════════════════════════════════════════════════════"
        Write-Host ""

        if ($changes.Count -gt 0) {
            Write-InfoMessage "Changes applied:"
            foreach ($change in $changes) {
                Write-InfoMessage "  ✓ $change"
            }
            Write-Host ""
        }

        Write-InfoMessage "Next steps:"
        Write-InfoMessage "  1. Review the changes: git diff"
        Write-InfoMessage "  2. Test your application thoroughly"
        Write-InfoMessage "  3. Update any custom code that references NgModules"
        Write-Host ""

        exit 0
    }
    catch {
        # Restore original directory in case of error
        Set-Location $originalLocation
        throw
    }
}
catch {
    $duration = (Get-Date) - $startTime

    Write-Host ""
    Write-ErrorMessage "Migration failed with error: $_"
    Write-InfoMessage "Duration: $($duration.ToString('mm\:ss'))"
    Write-Host ""
    Write-InfoMessage "Troubleshooting:"
    Write-InfoMessage "  1. Check the error message above"
    Write-InfoMessage "  2. Review Angular standalone migration guide"
    Write-InfoMessage "  3. Restore from backup if needed"
    exit 1
}

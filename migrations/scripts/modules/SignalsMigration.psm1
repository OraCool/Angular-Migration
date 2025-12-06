<#
.SYNOPSIS
    Signal-based components migration utilities.

.DESCRIPTION
    Provides functions to convert Angular components to use signal-based APIs:
    - Component properties → signal()
    - Computed properties → computed()
    - @Input/@Output decorators → input()/output()/model()
    - Template updates for signal getters

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit

    References:
    - https://angular.io/guide/signals
    - https://angular.io/api/core/signal
    - https://angular.io/api/core/input
    - https://angular.io/api/core/output
#>

$ErrorActionPreference = 'Stop'

# Import required modules
$UtilitiesModule = Join-Path $PSScriptRoot "Utilities.psm1"
Import-Module $UtilitiesModule -DisableNameChecking

#region Prerequisites Validation

<#
.SYNOPSIS
    Validates prerequisites for signals migration.

.DESCRIPTION
    Checks that the project meets requirements:
    - Angular version >= 16
    - Components are standalone
    - Components use OnPush change detection

.PARAMETER ProjectPath
    Path to the Angular project.

.RETURNS
    Hashtable with validation results.

.EXAMPLE
    $result = Test-SignalsMigrationPrerequisites -ProjectPath "C:\MyProject"
#>
function Test-SignalsMigrationPrerequisites {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    $errors = @()
    $warnings = @()
    $nonStandaloneComponents = @()
    $nonOnPushComponents = @()

    Write-InfoMessage "🔍 Validating prerequisites for signals migration..."

    # Check 1: Angular version >= 16
    $packageJsonPath = Join-Path $ProjectPath "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        $errors += "package.json not found at: $packageJsonPath"
        return @{
            Success                 = $false
            AngularVersion          = $null
            NonStandaloneComponents = @()
            NonOnPushComponents     = @()
            Errors                  = $errors
            Warnings                = $warnings
        }
    }

    try {
        $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

        # Try to get Angular version from dependencies or devDependencies
        $angularCoreVersion = $packageJson.dependencies.'@angular/core'
        if (-not $angularCoreVersion) {
            $angularCoreVersion = $packageJson.devDependencies.'@angular/core'
        }

        if (-not $angularCoreVersion) {
            $errors += "@angular/core not found in package.json dependencies"
            return @{
                Success                 = $false
                AngularVersion          = $null
                NonStandaloneComponents = @()
                NonOnPushComponents     = @()
                Errors                  = $errors
                Warnings                = $warnings
            }
        }

        # Remove version prefixes (^, ~, >=, etc.) and extract version number
        $angularVersion = $angularCoreVersion -replace '^[\^~>=<]+', '' -replace '\s.*$', ''

        if ([string]::IsNullOrWhiteSpace($angularVersion)) {
            $errors += "Could not parse Angular version from: $angularCoreVersion"
            return @{
                Success                 = $false
                AngularVersion          = $null
                NonStandaloneComponents = @()
                NonOnPushComponents     = @()
                Errors                  = $errors
                Warnings                = $warnings
            }
        }

        $versionParts = $angularVersion -split '\.'
        $majorVersion = [int]$versionParts[0]

        Write-InfoMessage "  Angular version: $angularVersion (major: $majorVersion)"

        if ($majorVersion -lt 16) {
            $errors += "Angular version must be >= 16 for signals support (found: $angularVersion)"
        }

        # Check 2: Find all component files
        $componentFiles = Get-ChildItem -Path $ProjectPath -Recurse -Filter "*.component.ts" -File |
        Where-Object {
            $_.FullName -notmatch 'node_modules' -and
            $_.FullName -notmatch 'dist' -and
            $_.FullName -notmatch '.angular'
        }

        Write-InfoMessage "  Found $($componentFiles.Count) component files"

        foreach ($file in $componentFiles) {
            $content = Get-Content -Path $file.FullName -Raw

            # Check for standalone: true
            if ($content -notmatch 'standalone\s*:\s*true') {
                $nonStandaloneComponents += $file.FullName
            }

            # Check for OnPush change detection
            if ($content -notmatch 'changeDetection\s*:\s*ChangeDetectionStrategy\.OnPush') {
                $nonOnPushComponents += $file.FullName
            }
        }

        if ($nonStandaloneComponents.Count -gt 0) {
            $warnings += "$($nonStandaloneComponents.Count) components are not standalone"
            Write-WarningMessage "  ⚠️  Found $($nonStandaloneComponents.Count) non-standalone components"
        }

        if ($nonOnPushComponents.Count -gt 0) {
            $warnings += "$($nonOnPushComponents.Count) components do not use OnPush change detection"
            Write-WarningMessage "  ⚠️  Found $($nonOnPushComponents.Count) components without OnPush"
        }

        $success = $errors.Count -eq 0

        return @{
            Success                 = $success
            AngularVersion          = $angularVersion
            NonStandaloneComponents = $nonStandaloneComponents
            NonOnPushComponents     = $nonOnPushComponents
            Errors                  = $errors
            Warnings                = $warnings
        }
    }
    catch {
        $errorMsg = "Error reading package.json: $($_.Exception.Message)"
        Write-ErrorMessage $errorMsg
        $errors += $errorMsg
        return @{
            Success                 = $false
            AngularVersion          = $null
            NonStandaloneComponents = @()
            NonOnPushComponents     = @()
            Errors                  = $errors
            Warnings                = $warnings
        }
    }
}

#endregion

#region Import Management

<#
.SYNOPSIS
    Adds or updates imports in a TypeScript file.

.PARAMETER FilePath
    Path to the TypeScript file.

.PARAMETER ImportSymbols
    Array of symbols to import (e.g., 'signal', 'computed').

.PARAMETER FromModule
    Module to import from (e.g., '@angular/core').

.RETURNS
    Updated file content.
#>
function Add-TypeScriptImport {
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Content,

        [Parameter(Mandatory = $true)]
        [string[]]$ImportSymbols,

        [Parameter(Mandatory = $true)]
        [string]$FromModule
    )

    # Check if import from module exists
    if ($Content -match "import\s*\{([^}]+)\}\s*from\s*['\`"]$([regex]::Escape($FromModule))['\`"];") {
        # Import exists, add symbols if not already present
        $existingImports = $Matches[1]
        $newSymbols = @()

        foreach ($symbol in $ImportSymbols) {
            if ($existingImports -notmatch "\b$symbol\b") {
                $newSymbols += $symbol
            }
        }

        if ($newSymbols.Count -gt 0) {
            $updatedImports = $existingImports.Trim() + ", " + ($newSymbols -join ", ")
            $Content = $Content -replace "import\s*\{([^}]+)\}\s*from\s*['\`"]$([regex]::Escape($FromModule))['\`"];", "import { $updatedImports } from '$FromModule';"
        }
    }
    else {
        # Import doesn't exist, add new import statement
        $importStatement = "import { $($ImportSymbols -join ', ') } from '$FromModule';`n"

        # Add after last import or at beginning
        if ($Content -match '((?:import\s+.+?;\s*\n)+)') {
            $Content = $Content -replace '((?:import\s+.+?;\s*\n)+)', "`$1$importStatement"
        }
        else {
            $Content = $importStatement + $Content
        }
    }

    return $Content
}

<#
.SYNOPSIS
    Removes import symbol from TypeScript file.

.PARAMETER Content
    File content.

.PARAMETER ImportSymbol
    Symbol to remove (e.g., 'EventEmitter').

.PARAMETER FromModule
    Module to remove from.

.RETURNS
    Updated content.
#>
function Remove-TypeScriptImport {
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Content,

        [Parameter(Mandatory = $true)]
        [string]$ImportSymbol,

        [Parameter(Mandatory = $true)]
        [string]$FromModule
    )

    # Remove symbol from import list
    $pattern = "import\s*\{([^}]+)\}\s*from\s*['\`"]$([regex]::Escape($FromModule))['\`"];"

    if ($Content -match $pattern) {
        $imports = $Matches[1]
        $importList = $imports -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne $ImportSymbol }

        if ($importList.Count -eq 0) {
            # Remove entire import statement
            $Content = $Content -replace $pattern, ''
        }
        else {
            # Update import list
            $updatedImports = $importList -join ', '
            $Content = $Content -replace $pattern, "import { $updatedImports } from '$FromModule';"
        }
    }

    return $Content
}

#endregion

#region Property Conversion

<#
.SYNOPSIS
    Converts component properties to signals.

.PARAMETER ComponentPath
    Path to the component TypeScript file.

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with conversion results.
#>
function Convert-PropertyToSignal {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    $changes = @()
    $warnings = @()
    $errors = @()
    $convertedProperties = @()

    Write-InfoMessage "  🔄 Converting properties to signals: $(Split-Path $ComponentPath -Leaf)"

    if (-not (Test-Path $ComponentPath)) {
        $errors += "Component file not found: $ComponentPath"
        return @{
            Success              = $false
            ConvertedProperties  = @()
            Changes              = $changes
            Warnings             = $warnings
            Errors               = $errors
        }
    }

    try {
        $content = Get-Content -Path $ComponentPath -Raw
        $originalContent = $content

        # Find class properties (exclude @Input, @Output, static, readonly, methods, observables)
        # Pattern: property: Type = value; or property = value;
        $propertyPattern = '(?m)^(\s+)(?!@Input|@Output|static|readonly|private\s+readonly|public\s+readonly)(\w+)(?:\s*:\s*([^=]+?))?\s*=\s*(.+?);'

        $matches = [regex]::Matches($content, $propertyPattern)

        foreach ($match in $matches) {
            $indent = $match.Groups[1].Value
            $propName = $match.Groups[2].Value
            $propType = $match.Groups[3].Value.Trim()
            $propValue = $match.Groups[4].Value.Trim()

            # Skip if property name ends with $ (Observable convention)
            if ($propName -match '\$$') {
                continue
            }

            # Skip if already a signal
            if ($propValue -match '^\s*signal\s*[\(<]') {
                continue
            }

            # Convert to signal
            $oldDeclaration = $match.Value
            $newDeclaration = if ($propType) {
                "${indent}${propName} = signal<${propType}>(${propValue});"
            }
            else {
                "${indent}${propName} = signal(${propValue});"
            }

            $content = $content.Replace($oldDeclaration, $newDeclaration)
            $convertedProperties += $propName
            $changes += "Converted property '$propName' to signal"
        }

        if ($convertedProperties.Count -gt 0) {
            # Add signal import
            $content = Add-TypeScriptImport -Content $content -ImportSymbols @('signal') -FromModule '@angular/core'

            if ($content -ne $originalContent) {
                if (-not $DryRun) {
                    Set-Content -Path $ComponentPath -Value $content -NoNewline
                    Write-Success "    ✅ Converted $($convertedProperties.Count) properties to signals"
                }
                else {
                    Write-InfoMessage "    [DRY RUN] Would convert $($convertedProperties.Count) properties"
                }
            }
        }
        else {
            Write-InfoMessage "    No properties to convert"
        }

        return @{
            Success             = $true
            ConvertedProperties = $convertedProperties
            Changes             = $changes
            Warnings            = $warnings
            Errors              = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success             = $false
            ConvertedProperties = @()
            Changes             = $changes
            Warnings            = $warnings
            Errors              = $errors
        }
    }
}

#endregion

#region Computed Properties

<#
.SYNOPSIS
    Converts getter methods to computed signals.

.PARAMETER ComponentPath
    Path to the component TypeScript file.

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with conversion results.
#>
function Convert-ComputedProperties {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    $changes = @()
    $warnings = @()
    $errors = @()
    $convertedGetters = @()

    Write-InfoMessage "  🔄 Converting getters to computed: $(Split-Path $ComponentPath -Leaf)"

    if (-not (Test-Path $ComponentPath)) {
        $errors += "Component file not found: $ComponentPath"
        return @{
            Success          = $false
            ConvertedGetters = @()
            Changes          = $changes
            Warnings         = $warnings
            Errors           = $errors
        }
    }

    try {
        $content = Get-Content -Path $ComponentPath -Raw
        $originalContent = $content

        # Find getter methods
        # Pattern: get propertyName() { ... }
        $getterPattern = '(?m)^(\s+)get\s+(\w+)\s*\(\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}'

        $matches = [regex]::Matches($content, $getterPattern)

        foreach ($match in $matches) {
            $indent = $match.Groups[1].Value
            $getterName = $match.Groups[2].Value
            $getterBody = $match.Groups[3].Value.Trim()

            $oldGetter = $match.Value

            # Convert getter body to use signal getters (add () to signal reads)
            # This is a simplified approach - may need refinement
            $newBody = "computed(() => {`n${indent}  $getterBody`n${indent}})"

            $newDeclaration = "${indent}${getterName} = $newBody;"

            $content = $content.Replace($oldGetter, $newDeclaration)
            $convertedGetters += $getterName
            $changes += "Converted getter '$getterName' to computed()"
        }

        if ($convertedGetters.Count -gt 0) {
            # Add computed import
            $content = Add-TypeScriptImport -Content $content -ImportSymbols @('computed') -FromModule '@angular/core'

            if ($content -ne $originalContent) {
                if (-not $DryRun) {
                    Set-Content -Path $ComponentPath -Value $content -NoNewline
                    Write-Success "    ✅ Converted $($convertedGetters.Count) getters to computed()"
                }
                else {
                    Write-InfoMessage "    [DRY RUN] Would convert $($convertedGetters.Count) getters"
                }
            }
        }
        else {
            Write-InfoMessage "    No getters to convert"
        }

        return @{
            Success          = $true
            ConvertedGetters = $convertedGetters
            Changes          = $changes
            Warnings         = $warnings
            Errors           = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success          = $false
            ConvertedGetters = @()
            Changes          = $changes
            Warnings         = $warnings
            Errors           = $errors
        }
    }
}

#endregion

#region Input/Output Conversion

<#
.SYNOPSIS
    Converts @Input/@Output decorators to input()/output()/model().

.PARAMETER ComponentPath
    Path to the component TypeScript file.

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with conversion results.
#>
function Convert-InputOutputToSignals {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    $changes = @()
    $warnings = @()
    $errors = @()
    $convertedInputs = @()
    $convertedOutputs = @()
    $convertedModels = @()

    Write-InfoMessage "  🔄 Converting @Input/@Output to signals: $(Split-Path $ComponentPath -Leaf)"

    if (-not (Test-Path $ComponentPath)) {
        $errors += "Component file not found: $ComponentPath"
        return @{
            Success           = $false
            ConvertedInputs   = @()
            ConvertedOutputs  = @()
            ConvertedModels   = @()
            Changes           = $changes
            Warnings          = $warnings
            Errors            = $errors
        }
    }

    try {
        $content = Get-Content -Path $ComponentPath -Raw
        $originalContent = $content

        # First, detect two-way binding pairs (for model())
        # Pattern: @Input() prop: Type; followed by @Output() propChange = new EventEmitter<Type>();
        $twoWayPattern = '@Input\(\)\s+(\w+)(?:\s*:\s*([^;=]+))?[^;]*;\s*@Output\(\)\s+\1Change\s*=\s*new\s+EventEmitter<([^>]+)>\(\);'

        $twoWayMatches = [regex]::Matches($content, $twoWayPattern)

        foreach ($match in $twoWayMatches) {
            $propName = $match.Groups[1].Value
            $propType = if ($match.Groups[2].Value) { $match.Groups[2].Value.Trim() } else { $match.Groups[3].Value.Trim() }

            $oldDeclaration = $match.Value
            $newDeclaration = "$propName = model<$propType>();"

            $content = $content.Replace($oldDeclaration, $newDeclaration)
            $convertedModels += $propName
            $changes += "Converted two-way binding '$propName' to model()"
        }

        # Convert remaining @Input decorators
        # Pattern 1: Required input - @Input({ required: true }) prop!: Type;
        $requiredInputPattern = '@Input\(\s*\{\s*required\s*:\s*true\s*\}\s*\)\s+(\w+)!\s*:\s*([^;]+);'
        $content = [regex]::Replace($content, $requiredInputPattern, {
                param($match)
                $propName = $match.Groups[1].Value
                $propType = $match.Groups[2].Value.Trim()
                $convertedInputs += $propName
                $changes += "Converted required input '$propName' to input.required()"
                return "$propName = input.required<$propType>();"
            })

        # Pattern 2: Input with default value - @Input() prop = value; or @Input() prop: Type = value;
        $inputWithDefaultPattern = '@Input\(\)\s+(\w+)(?:\s*:\s*([^=]+?))?\s*=\s*(.+?);'
        $content = [regex]::Replace($content, $inputWithDefaultPattern, {
                param($match)
                $propName = $match.Groups[1].Value
                $defaultValue = $match.Groups[3].Value.Trim()
                $convertedInputs += $propName
                $changes += "Converted input '$propName' to input() with default"
                return "$propName = input($defaultValue);"
            })

        # Pattern 3: Input without default - @Input() prop: Type;
        $inputPattern = '@Input\(\)\s+(\w+)\s*:\s*([^;]+);'
        $content = [regex]::Replace($content, $inputPattern, {
                param($match)
                $propName = $match.Groups[1].Value
                $propType = $match.Groups[2].Value.Trim()
                $convertedInputs += $propName
                $changes += "Converted input '$propName' to input()"
                return "$propName = input<$propType>();"
            })

        # Convert @Output decorators
        # Pattern: @Output() event = new EventEmitter<Type>();
        $outputPattern = '@Output\(\)\s+(\w+)\s*=\s*new\s+EventEmitter<([^>]+)>\(\);'
        $content = [regex]::Replace($content, $outputPattern, {
                param($match)
                $propName = $match.Groups[1].Value
                $propType = $match.Groups[2].Value.Trim()
                $convertedOutputs += $propName
                $changes += "Converted output '$propName' to output()"
                return "$propName = output<$propType>();"
            })

        # Add necessary imports
        $importsToAdd = @()
        if ($convertedInputs.Count -gt 0) {
            $importsToAdd += 'input'
        }
        if ($convertedOutputs.Count -gt 0) {
            $importsToAdd += 'output'
        }
        if ($convertedModels.Count -gt 0) {
            $importsToAdd += 'model'
        }

        if ($importsToAdd.Count -gt 0) {
            $content = Add-TypeScriptImport -Content $content -ImportSymbols $importsToAdd -FromModule '@angular/core'
        }

        # Remove EventEmitter import if no longer used
        if (($convertedOutputs.Count -gt 0 -or $convertedModels.Count -gt 0) -and $content -notmatch 'EventEmitter') {
            $content = Remove-TypeScriptImport -Content $content -ImportSymbol 'EventEmitter' -FromModule '@angular/core'
        }

        if ($content -ne $originalContent) {
            if (-not $DryRun) {
                Set-Content -Path $ComponentPath -Value $content -NoNewline
                $totalConverted = $convertedInputs.Count + $convertedOutputs.Count + $convertedModels.Count
                Write-Success "    ✅ Converted $totalConverted @Input/@Output to signals"
            }
            else {
                Write-InfoMessage "    [DRY RUN] Would convert @Input/@Output to signals"
            }
        }
        else {
            Write-InfoMessage "    No @Input/@Output to convert"
        }

        return @{
            Success          = $true
            ConvertedInputs  = $convertedInputs
            ConvertedOutputs = $convertedOutputs
            ConvertedModels  = $convertedModels
            Changes          = $changes
            Warnings         = $warnings
            Errors           = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success          = $false
            ConvertedInputs  = @()
            ConvertedOutputs = @()
            ConvertedModels  = @()
            Changes          = $changes
            Warnings         = $warnings
            Errors           = $errors
        }
    }
}

#endregion

#region Template Updates

<#
.SYNOPSIS
    Updates component template to use signal getters.

.PARAMETER ComponentPath
    Path to the component TypeScript file.

.PARAMETER SignalProperties
    Array of property names converted to signals.

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with update results.
#>
function Update-ComponentTemplate {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $true)]
        [string[]]$SignalProperties,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    $changes = @()
    $warnings = @()
    $errors = @()
    $templateUpdates = 0

    if ($SignalProperties.Count -eq 0) {
        return @{
            Success         = $true
            TemplateUpdates = 0
            Changes         = @()
            Warnings        = @()
            Errors          = @()
        }
    }

    Write-InfoMessage "  🔄 Updating component template: $(Split-Path $ComponentPath -Leaf)"

    try {
        $componentContent = Get-Content -Path $ComponentPath -Raw

        # Find template - either inline or external
        $templatePath = $null
        $templateContent = $null
        $isInlineTemplate = $false

        # Check for inline template
        if ($componentContent -match "template\s*:\s*[`'\`"]([^`'\`"]*)[`'\`"]") {
            $templateContent = $Matches[1]
            $isInlineTemplate = $true
        }
        elseif ($componentContent -match "templateUrl\s*:\s*['\`"]([^'\`"]+)['\`"]") {
            $templateUrl = $Matches[1]
            $componentDir = Split-Path $ComponentPath -Parent
            $templatePath = Join-Path $componentDir $templateUrl

            if (Test-Path $templatePath) {
                $templateContent = Get-Content -Path $templatePath -Raw
            }
            else {
                $warnings += "Template file not found: $templatePath"
                return @{
                    Success         = $true
                    TemplateUpdates = 0
                    Changes         = @()
                    Warnings        = $warnings
                    Errors          = @()
                }
            }
        }

        if (-not $templateContent) {
            $warnings += "No template found"
            return @{
                Success         = $true
                TemplateUpdates = 0
                Changes         = @()
                Warnings        = $warnings
                Errors          = @()
            }
        }

        $originalTemplate = $templateContent

        # For each signal property, add () to reads
        foreach ($prop in $SignalProperties) {
            # Pattern 1: Interpolation - {{ prop }} → {{ prop() }}
            $templateContent = [regex]::Replace($templateContent, "\{\{\s*$prop\s*\}\}", "{{ $prop() }}")

            # Pattern 2: Property binding - [attr]="prop" → [attr]="prop()"
            $templateContent = [regex]::Replace($templateContent, "\[([^\]]+)\]=`"$prop`"", "[`$1]=`"$prop()`"")

            # Pattern 3: Structural directives - *ngIf="prop" → *ngIf="prop()"
            $templateContent = [regex]::Replace($templateContent, "\*ng(If|For)=`"$prop\b", "*ng`$1=`"$prop()")

            # Pattern 4: Event binding assignments - (click)="prop = value" → (click)="prop.set(value)"
            $templateContent = [regex]::Replace($templateContent, "\((\w+)\)=`"$prop\s*=\s*([^`"]+)`"", "(`$1)=`"$prop.set(`$2)`"")
        }

        if ($templateContent -ne $originalTemplate) {
            $templateUpdates = ($templateContent.Length - $originalTemplate.Length)

            if (-not $DryRun) {
                if ($isInlineTemplate) {
                    # Update inline template in component file
                    $updatedComponent = $componentContent -replace "template\s*:\s*[`'\`"]([^`'\`"]*)[`'\`"]", "template: `"$templateContent`""
                    Set-Content -Path $ComponentPath -Value $updatedComponent -NoNewline
                }
                else {
                    # Update external template file
                    Set-Content -Path $templatePath -Value $templateContent -NoNewline
                }
                Write-Success "    ✅ Updated template with signal getters"
                $changes += "Updated template to use signal getters"
            }
            else {
                Write-InfoMessage "    [DRY RUN] Would update template"
            }
        }
        else {
            Write-InfoMessage "    No template updates needed"
        }

        return @{
            Success         = $true
            TemplateUpdates = $templateUpdates
            Changes         = $changes
            Warnings        = $warnings
            Errors          = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success         = $false
            TemplateUpdates = 0
            Changes         = $changes
            Warnings        = $warnings
            Errors          = $errors
        }
    }
}

#endregion

#region Test Updates

<#
.SYNOPSIS
    Updates component tests to use signal APIs.

.PARAMETER ComponentPath
    Path to the component TypeScript file.

.PARAMETER SignalProperties
    Array of property names converted to signals.

.PARAMETER DryRun
    Preview changes without applying them.

.RETURNS
    Hashtable with update results.
#>
function Update-ComponentTests {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $true)]
        [string[]]$SignalProperties,

        [Parameter(Mandatory = $false)]
        [switch]$DryRun = $false
    )

    $changes = @()
    $warnings = @()
    $errors = @()

    if ($SignalProperties.Count -eq 0) {
        return @{
            Success  = $true
            Changes  = @()
            Warnings = @()
            Errors   = @()
        }
    }

    Write-InfoMessage "  🔄 Updating component tests: $(Split-Path $ComponentPath -Leaf)"

    try {
        # Find spec file
        $specPath = $ComponentPath -replace '\.ts$', '.spec.ts'

        if (-not (Test-Path $specPath)) {
            $warnings += "Spec file not found: $specPath"
            return @{
                Success  = $true
                Changes  = @()
                Warnings = $warnings
                Errors   = @()
            }
        }

        $content = Get-Content -Path $specPath -Raw
        $originalContent = $content

        # For each signal property
        foreach ($prop in $SignalProperties) {
            # Pattern 1: Property read - component.prop → component.prop()
            $content = [regex]::Replace($content, "component\.$prop\b(?!\()", "component.$prop()")

            # Pattern 2: Property write - component.prop = value → component.prop.set(value)
            $content = [regex]::Replace($content, "component\.$prop\s*=\s*([^;]+);", "component.$prop.set(`$1);")
        }

        if ($content -ne $originalContent) {
            if (-not $DryRun) {
                Set-Content -Path $specPath -Value $content -NoNewline
                Write-Success "    ✅ Updated test file"
                $changes += "Updated test file with signal APIs"
            }
            else {
                Write-InfoMessage "    [DRY RUN] Would update test file"
            }
        }
        else {
            Write-InfoMessage "    No test updates needed"
        }

        return @{
            Success  = $true
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
    catch {
        $errors += $_.Exception.Message
        return @{
            Success  = $false
            Changes  = $changes
            Warnings = $warnings
            Errors   = $errors
        }
    }
}

#endregion

#region Export Module Members

Export-ModuleMember -Function @(
    'Test-SignalsMigrationPrerequisites',
    'Convert-PropertyToSignal',
    'Convert-ComputedProperties',
    'Convert-InputOutputToSignals',
    'Update-ComponentTemplate',
    'Update-ComponentTests'
)

#endregion

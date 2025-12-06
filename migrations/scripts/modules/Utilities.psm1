<#
.SYNOPSIS
    Common utility functions for Angular migration scripts.

.DESCRIPTION
    Provides reusable utility functions including backup/restore, git operations,
    colored output, command validation, and Node.js version management.

.NOTES
    Version: 1.0.0
    Author: Angular Migration Toolkit
    Based on: /packages/acp-agent/scripts/*.sh
#>

$ErrorActionPreference = 'Stop'

#region Color Output Functions

<#
.SYNOPSIS
    Writes colored output to the console.

.PARAMETER Message
    The message to write.

.PARAMETER Color
    The color to use (Success, Warning, Error, Info).

.EXAMPLE
    Write-ColorOutput "Operation completed" -Color Success
#>
function Write-ColorOutput {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Message,

        [Parameter(Mandatory = $false)]
        [ValidateSet('Success', 'Warning', 'Error', 'Info', 'Default')]
        [string]$Color = 'Default'
    )

    $colorMap = @{
        'Success' = 'Green'
        'Warning' = 'Yellow'
        'Error'   = 'Red'
        'Info'    = 'Cyan'
        'Default' = 'White'
    }

    $foregroundColor = $colorMap[$Color]
    Write-Host $Message -ForegroundColor $foregroundColor
}

<#
.SYNOPSIS
    Writes a success message with a checkmark emoji.
#>
function Write-Success {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Message
    )

    Write-ColorOutput "✅ $Message" -Color Success
}

<#
.SYNOPSIS
    Writes an error message with a cross emoji.
#>
function Write-ErrorMessage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Message
    )

    Write-ColorOutput "❌ $Message" -Color Error
}

<#
.SYNOPSIS
    Writes a warning message with a warning emoji.
#>
function Write-WarningMessage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Message
    )

    Write-ColorOutput "⚠️  $Message" -Color Warning
}

<#
.SYNOPSIS
    Writes an info message with an info emoji.
#>
function Write-InfoMessage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Message
    )

    Write-ColorOutput "ℹ️  $Message" -Color Info
}

#endregion

#region Command Validation Functions

<#
.SYNOPSIS
    Tests if a command exists in the system.

.PARAMETER Command
    The command name to test.

.RETURNS
    $true if command exists, $false otherwise.

.EXAMPLE
    Test-CommandExists "node"
#>
function Test-CommandExists {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Command
    )

    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

#endregion

#region Node.js Version Functions

<#
.SYNOPSIS
    Gets the current Node.js version.

.RETURNS
    Version object or $null if Node.js is not installed.

.EXAMPLE
    $version = Get-NodeVersion
    if ($version) { Write-Host "Node.js version: $version" }
#>
function Get-NodeVersion {
    [CmdletBinding()]
    [OutputType([version])]
    param()

    if (-not (Test-CommandExists "node")) {
        return $null
    }

    try {
        $output = node --version 2>&1
        $versionString = $output -replace '^v', ''
        return [version]$versionString
    }
    catch {
        Write-Verbose "Failed to get Node.js version: $_"
        return $null
    }
}

<#
.SYNOPSIS
    Tests if the current Node.js version meets the minimum requirement.

.PARAMETER MinVersion
    The minimum required Node.js version.

.PARAMETER MaxVersion
    The maximum allowed Node.js version (optional).

.RETURNS
    $true if version is compatible, $false otherwise.

.EXAMPLE
    Test-NodeVersionCompatibility -MinVersion "18.0.0" -MaxVersion "20.99.99"
#>
function Test-NodeVersionCompatibility {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory = $true)]
        [version]$MinVersion,

        [Parameter(Mandatory = $false)]
        [version]$MaxVersion
    )

    $currentVersion = Get-NodeVersion

    if (-not $currentVersion) {
        Write-WarningMessage "Node.js is not installed"
        return $false
    }

    if ($currentVersion -lt $MinVersion) {
        Write-WarningMessage "Node.js version $currentVersion is below minimum required version $MinVersion"
        return $false
    }

    if ($MaxVersion -and $currentVersion -gt $MaxVersion) {
        Write-WarningMessage "Node.js version $currentVersion exceeds maximum supported version $MaxVersion"
        return $false
    }

    return $true
}

#endregion

#region Backup Functions

<#
.SYNOPSIS
    Creates a timestamped backup of the project.

.PARAMETER ProjectPath
    Path to the Angular project.

.PARAMETER BackupPath
    Custom backup path (optional). If not specified, creates backup in parent directory.

.PARAMETER ExcludePatterns
    Array of patterns to exclude from backup.

.RETURNS
    Hashtable with backup information.

.EXAMPLE
    $backup = New-ProjectBackup -ProjectPath "C:\MyProject"
    Write-Host "Backup created at: $($backup.Path)"
#>
function New-ProjectBackup {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $false)]
        [string]$BackupPath,

        [Parameter(Mandatory = $false)]
        [string[]]$ExcludePatterns = @(
            'node_modules',
            'dist',
            '.angular',
            '.git',
            'coverage',
            '.vscode',
            '.idea'
        )
    )

    Write-InfoMessage "Creating backup of Angular project..."
    Write-InfoMessage "  Source: $ProjectPath"

    # Validate project path
    if (-not (Test-Path $ProjectPath)) {
        throw "Project path does not exist: $ProjectPath"
    }

    # Generate backup path if not provided
    if (-not $BackupPath) {
        $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
        $parentPath = Split-Path -Parent $ProjectPath
        $BackupPath = Join-Path $parentPath "angular-backup-$timestamp"
    }

    Write-InfoMessage "  Destination: $BackupPath"

    # Create backup directory
    $null = New-Item -ItemType Directory -Path $BackupPath -Force

    # Copy files with exclusions
    Write-InfoMessage "📦 Copying project files..."

    $copyParams = @{
        Path        = (Join-Path $ProjectPath "*")
        Destination = $BackupPath
        Recurse     = $true
        Force       = $true
        Exclude     = $ExcludePatterns
    }

    Copy-Item @copyParams

    # Create backup metadata
    $metadata = @{
        timestamp   = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        source      = $ProjectPath
        created_by  = "angular-migration-toolkit"
        backup_type = "full"
        date        = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    }

    $metadataPath = Join-Path $BackupPath "backup-info.json"
    $metadata | ConvertTo-Json | Set-Content -Path $metadataPath

    # Calculate backup size
    $backupSize = Get-ProjectSize -Path $BackupPath
    $fileCount = (Get-ChildItem -Path $BackupPath -Recurse -File).Count

    Write-Success "Backup created successfully!"
    Write-InfoMessage "  Location: $BackupPath"
    Write-InfoMessage "  Size: $backupSize"
    Write-InfoMessage "  Files backed up: $fileCount"

    return @{
        Path      = $BackupPath
        Size      = $backupSize
        FileCount = $fileCount
        Metadata  = $metadata
    }
}

<#
.SYNOPSIS
    Restores a project from a backup.

.PARAMETER BackupPath
    Path to the backup directory.

.PARAMETER RestorePath
    Path where to restore the project (optional). If not specified, prompts user.

.PARAMETER Force
    Overwrite existing files without prompting.

.RETURNS
    $true if restore successful, $false otherwise.

.EXAMPLE
    Restore-ProjectBackup -BackupPath "C:\angular-backup-2025-01-01_12-00-00" -RestorePath "C:\MyProject" -Force
#>
function Restore-ProjectBackup {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$BackupPath,

        [Parameter(Mandatory = $false)]
        [string]$RestorePath,

        [Parameter(Mandatory = $false)]
        [switch]$Force
    )

    Write-InfoMessage "Restoring project from backup..."
    Write-InfoMessage "  Backup: $BackupPath"

    # Validate backup path
    if (-not (Test-Path $BackupPath)) {
        Write-ErrorMessage "Backup path does not exist: $BackupPath"
        return $false
    }

    # Read backup metadata
    $metadataPath = Join-Path $BackupPath "backup-info.json"
    if (Test-Path $metadataPath) {
        $metadata = Get-Content -Path $metadataPath | ConvertFrom-Json
        Write-InfoMessage "  Created: $($metadata.timestamp)"
        Write-InfoMessage "  Original source: $($metadata.source)"
    }

    # Determine restore path
    if (-not $RestorePath) {
        Write-WarningMessage "No restore path specified. Please provide a path:"
        $RestorePath = Read-Host "Restore path"
    }

    Write-InfoMessage "  Restore to: $RestorePath"

    # Check if restore path exists
    if (Test-Path $RestorePath) {
        if (-not $Force) {
            $response = Read-Host "Destination exists. Overwrite? (y/N)"
            if ($response -ne 'y') {
                Write-InfoMessage "Restore cancelled"
                return $false
            }
        }

        # Backup existing content first
        Write-InfoMessage "Creating safety backup of existing content..."
        $safetyBackupPath = "$RestorePath-before-restore-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
        Copy-Item -Path $RestorePath -Destination $safetyBackupPath -Recurse -Force
        Write-InfoMessage "  Safety backup created: $safetyBackupPath"
    }

    # Create restore directory
    $null = New-Item -ItemType Directory -Path $RestorePath -Force

    # Copy files from backup
    Write-InfoMessage "📦 Restoring files..."
    Copy-Item -Path (Join-Path $BackupPath "*") -Destination $RestorePath -Recurse -Force -Exclude "backup-info.json"

    Write-Success "Project restored successfully!"
    Write-InfoMessage "  Location: $RestorePath"

    return $true
}

<#
.SYNOPSIS
    Tests the integrity of a backup.

.PARAMETER BackupPath
    Path to the backup directory.

.RETURNS
    $true if backup is valid, $false otherwise.

.EXAMPLE
    $isValid = Test-BackupIntegrity -BackupPath "C:\angular-backup-2025-01-01_12-00-00"
#>
function Test-BackupIntegrity {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$BackupPath
    )

    Write-InfoMessage "Verifying backup integrity..."

    # Check if backup exists
    if (-not (Test-Path $BackupPath)) {
        Write-ErrorMessage "Backup path does not exist: $BackupPath"
        return $false
    }

    # Check for metadata file
    $metadataPath = Join-Path $BackupPath "backup-info.json"
    if (-not (Test-Path $metadataPath)) {
        Write-WarningMessage "Backup metadata file not found"
        return $false
    }

    # Validate metadata
    try {
        $metadata = Get-Content -Path $metadataPath | ConvertFrom-Json
        if (-not $metadata.timestamp -or -not $metadata.source) {
            Write-ErrorMessage "Backup metadata is incomplete"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "Failed to read backup metadata: $_"
        return $false
    }

    # Check for essential project files
    $essentialFiles = @('package.json', 'angular.json', 'tsconfig.json')
    foreach ($file in $essentialFiles) {
        $filePath = Join-Path $BackupPath $file
        if (-not (Test-Path $filePath)) {
            Write-WarningMessage "Essential file missing: $file"
        }
    }

    Write-Success "Backup integrity verified"
    return $true
}

#endregion

#region Git Functions

<#
.SYNOPSIS
    Checks the current git status.

.PARAMETER ProjectPath
    Path to the project.

.RETURNS
    Hashtable with git status information.

.EXAMPLE
    $status = Test-GitStatus -ProjectPath "C:\MyProject"
#>
function Test-GitStatus {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath
    )

    Push-Location $ProjectPath
    try {
        # Check if current directory is in a git repository (works for subdirectories too)
        $gitCheck = git rev-parse --git-dir 2>&1
        $isGitRepo = $LASTEXITCODE -eq 0

        if (-not $isGitRepo) {
            return @{
                IsRepo    = $false
                IsClean   = $false
                Message   = "Not a git repository"
                Branch    = $null
                HasChanges = $false
            }
        }

        $branch = git rev-parse --abbrev-ref HEAD 2>&1
        $status = git status --porcelain 2>&1
        $hasChanges = $status.Length -gt 0

        return @{
            IsRepo     = $true
            IsClean    = -not $hasChanges
            Message    = if ($hasChanges) { "Working directory has changes" } else { "Working directory clean" }
            Branch     = $branch
            HasChanges = $hasChanges
            Changes    = $status
        }
    }
    finally {
        Pop-Location
    }
}

<#
.SYNOPSIS
    Creates a git commit with the specified message.

.PARAMETER ProjectPath
    Path to the project.

.PARAMETER Message
    Commit message.

.PARAMETER AddAll
    Whether to stage all changes before committing.

.RETURNS
    $true if commit successful, $false otherwise.

.EXAMPLE
    Invoke-GitCommit -ProjectPath "C:\MyProject" -Message "chore: migrate to Angular 16" -AddAll
#>
function Invoke-GitCommit {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectPath,

        [Parameter(Mandatory = $true)]
        [string]$Message,

        [Parameter(Mandatory = $false)]
        [switch]$AddAll
    )

    Push-Location $ProjectPath
    try {
        $gitStatus = Test-GitStatus -ProjectPath $ProjectPath

        if (-not $gitStatus.IsRepo) {
            Write-WarningMessage "Not a git repository. Skipping commit."
            return $false
        }

        if (-not $gitStatus.HasChanges) {
            Write-InfoMessage "No changes to commit"
            return $true
        }

        if ($AddAll) {
            Write-InfoMessage "Staging all changes..."
            git add -A
        }

        Write-InfoMessage "Creating commit: $Message"
        git commit -m $Message

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Commit created successfully"
            return $true
        }
        else {
            Write-ErrorMessage "Failed to create commit"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "Git commit failed: $_"
        return $false
    }
    finally {
        Pop-Location
    }
}

#endregion

#region File System Functions

<#
.SYNOPSIS
    Calculates the size of a directory or file.

.PARAMETER Path
    Path to directory or file.

.RETURNS
    Human-readable size string.

.EXAMPLE
    $size = Get-ProjectSize -Path "C:\MyProject"
#>
function Get-ProjectSize {
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return "0 B"
    }

    $bytes = (Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
              Measure-Object -Property Length -Sum).Sum

    if ($bytes -eq 0) { return "0 B" }

    $sizes = 'B', 'KB', 'MB', 'GB', 'TB'
    $order = [Math]::Floor([Math]::Log($bytes, 1024))
    $size = $bytes / [Math]::Pow(1024, $order)

    return "{0:N2} {1}" -f $size, $sizes[$order]
}

#endregion

#region Export Module Members

Export-ModuleMember -Function @(
    'Write-ColorOutput',
    'Write-Success',
    'Write-ErrorMessage',
    'Write-WarningMessage',
    'Write-InfoMessage',
    'Test-CommandExists',
    'Get-NodeVersion',
    'Test-NodeVersionCompatibility',
    'New-ProjectBackup',
    'Restore-ProjectBackup',
    'Test-BackupIntegrity',
    'Test-GitStatus',
    'Invoke-GitCommit',
    'Get-ProjectSize'
)

#endregion

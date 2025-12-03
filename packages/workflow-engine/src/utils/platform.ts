/**
 * Cross-Platform Utilities
 * Provides platform detection and command/argument escaping for cross-platform compatibility
 * Supports Windows (PowerShell), macOS (bash), and Linux (bash)
 */

/**
 * Platform type
 */
export type Platform = 'windows' | 'macos' | 'linux';

/**
 * Get the current platform
 * @returns The current platform: 'windows', 'macos', or 'linux'
 */
export function getPlatform(): Platform {
  const platform = process.platform;

  if (platform === 'win32') {
    return 'windows';
  }

  if (platform === 'darwin') {
    return 'macos';
  }

  return 'linux';
}

/**
 * Adapt a shell command for the target platform
 * On Windows, wraps complex commands in PowerShell
 * On Unix systems, returns the command as-is
 *
 * @param command - The shell command to adapt
 * @param platform - Target platform (defaults to current platform)
 * @returns The adapted command suitable for the target platform
 *
 * @example
 * // On Windows, this:
 * getShellCommand('git add -A && git commit -m "message"')
 * // Returns:
 * 'powershell -Command "git add -A; if ($?) { git commit -m \'message\' }"'
 *
 * @example
 * // On Unix, this:
 * getShellCommand('git add -A && git commit -m "message"')
 * // Returns (unchanged):
 * 'git add -A && git commit -m "message"'
 */
export function getShellCommand(
  command: string,
  platform?: Platform
): string {
  const os = platform || getPlatform();

  // On Windows, wrap complex commands in PowerShell
  if (os === 'windows') {
    // Check if command contains bash-specific operators that need PowerShell wrapping
    if (command.includes('&&') || command.includes('||') || command.includes('|')) {
      // Convert bash operators to PowerShell equivalents
      let psCommand = command;

      // Replace && with PowerShell's ; if ($?) { }
      // This is a simplified conversion - for full correctness we'd need a proper parser
      // For now, we'll wrap the entire command and let PowerShell handle it
      psCommand = psCommand.replace(/&&/g, '; if ($?) { ').replace(/$/g, ' }');

      // Escape double quotes for PowerShell
      psCommand = psCommand.replace(/"/g, '\\"');

      return `powershell -Command "${psCommand}"`;
    }
  }

  // For Unix systems or simple Windows commands, return as-is
  return command;
}

/**
 * Escape a string for safe use as a shell argument
 * Uses platform-appropriate escaping:
 * - Windows (PowerShell): Double quotes with internal quote doubling
 * - Unix (bash): Single quotes with escaped single quotes
 *
 * @param arg - The argument to escape
 * @param platform - Target platform (defaults to current platform)
 * @returns The escaped argument safe for shell execution
 *
 * @example
 * // On Windows:
 * escapeForShell('Hello "World"')
 * // Returns:
 * '"Hello ""World"""'
 *
 * @example
 * // On Unix:
 * escapeForShell("Don't")
 * // Returns:
 * "'Don'\\''t'"
 */
export function escapeForShell(
  arg: string,
  platform?: Platform
): string {
  const os = platform || getPlatform();

  if (os === 'windows') {
    // PowerShell escaping: wrap in double quotes, double internal quotes
    return `"${arg.replace(/"/g, '""')}"`;
  }

  // Bash escaping: wrap in single quotes, escape internal single quotes
  // The pattern '\'' ends the quoted string, adds an escaped quote, and starts a new quoted string
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

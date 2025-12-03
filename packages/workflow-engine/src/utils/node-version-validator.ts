/**
 * Node.js Version Validation Utilities
 * Validates Node.js version requirements for Angular migrations
 * Does NOT automatically install or switch versions - only validates and provides guidance
 */

import { getPlatform, type Platform } from './platform.js';

/**
 * Node.js version validation result
 */
export interface NodeVersionValidation {
  /** Whether the current Node.js version meets requirements */
  valid: boolean;
  /** Current Node.js version (e.g., "v22.1.0") */
  currentVersion: string;
  /** Required Node.js version (e.g., "22.x.x") */
  requiredVersion: string;
  /** Error message if validation failed */
  error?: string;
  /** Platform-specific installation instructions */
  installInstructions?: {
    windows: string;
    macos: string;
    linux: string;
  };
}

/**
 * Validate that the current Node.js version meets requirements
 * Angular 20 requires Node.js v22 for optimal compatibility
 *
 * @param requiredMajor - Required major version (default: 22)
 * @returns Validation result with installation instructions if needed
 *
 * @example
 * const validation = validateNodeVersion(22);
 * if (!validation.valid) {
 *   console.error(getNodeVersionError(validation));
 *   process.exit(1);
 * }
 */
export function validateNodeVersion(
  requiredMajor: number = 22
): NodeVersionValidation {
  const currentVersion = process.version; // e.g., "v22.1.0"
  const currentMajor = parseInt(currentVersion.slice(1).split('.')[0], 10);

  const requiredVersion = `${requiredMajor}.x.x`;

  if (currentMajor === requiredMajor) {
    return {
      valid: true,
      currentVersion,
      requiredVersion,
    };
  }

  return {
    valid: false,
    currentVersion,
    requiredVersion,
    error: `Node.js v${requiredMajor} is required for Angular 20 migration. Current version: ${currentVersion}`,
    installInstructions: {
      windows: `Download from https://nodejs.org/en/download/ or use 'winget install OpenJS.NodeJS.LTS'`,
      macos: `Use Homebrew: 'brew install node@${requiredMajor}' or download from https://nodejs.org`,
      linux: `Use nvm: 'nvm install ${requiredMajor}' or package manager (apt, yum, dnf)`,
    },
  };
}

/**
 * Generate a formatted error message for Node.js version mismatch
 * Includes platform-specific installation instructions
 *
 * @param validation - Validation result from validateNodeVersion()
 * @returns Formatted error message with installation guidance
 *
 * @example
 * const validation = validateNodeVersion(22);
 * if (!validation.valid) {
 *   throw new Error(getNodeVersionError(validation));
 * }
 */
export function getNodeVersionError(
  validation: NodeVersionValidation
): string {
  if (validation.valid) {
    return '';
  }

  const platform = getPlatform();
  const instructions = validation.installInstructions;

  const platformInstructions = instructions
    ? instructions[platform]
    : 'See https://nodejs.org for installation';

  return `
Node.js Version Mismatch
━━━━━━━━━━━━━━━━━━━━━━━━━━
Required: ${validation.requiredVersion}
Current:  ${validation.currentVersion}

${validation.error}

Installation Instructions (${platform}):
${platformInstructions}

After installing Node.js v${validation.requiredVersion.split('.')[0]}, restart your terminal and try again.
  `.trim();
}

/**
 * Get platform-specific Node.js installation instructions
 *
 * @param requiredMajor - Required major version (default: 22)
 * @param platform - Target platform (defaults to current platform)
 * @returns Installation instructions for the target platform
 */
export function getInstallInstructions(
  requiredMajor: number = 22,
  platform?: Platform
): string {
  const os = platform || getPlatform();

  const instructions: Record<Platform, string> = {
    windows: `
Windows Installation Options:
1. Download installer from: https://nodejs.org/en/download/
2. Use winget: winget install OpenJS.NodeJS.LTS
3. Use Chocolatey: choco install nodejs-lts
4. Use nvm-windows: https://github.com/coreybutler/nvm-windows`,
    macos: `
macOS Installation Options:
1. Use Homebrew: brew install node@${requiredMajor}
2. Download installer from: https://nodejs.org/en/download/
3. Use nvm: nvm install ${requiredMajor}
4. Use MacPorts: port install nodejs${requiredMajor}`,
    linux: `
Linux Installation Options:
1. Use nvm (recommended):
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
   nvm install ${requiredMajor}
2. Use package manager:
   - Debian/Ubuntu: sudo apt-get update && sudo apt-get install nodejs
   - RHEL/CentOS: sudo yum install nodejs
   - Fedora: sudo dnf install nodejs
3. Download from: https://nodejs.org/en/download/`,
  };

  return instructions[os];
}

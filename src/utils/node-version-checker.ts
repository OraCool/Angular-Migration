/**
 * Node.js Version Checker and NVM Integration
 * Validates Node version compatibility with Angular versions
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface NodeVersionRequirement {
  minVersion: string;
  maxVersion?: string;
  recommended?: string;
}

/**
 * Parse Node version requirements string (e.g., "18.13.0-18.999.999,20.9.0-20.999.999")
 * Supports ranges (min-max) for strict validation against Angular requirements
 */
export function parseNodeRequirements(requirementString: string): NodeVersionRequirement[] {
  const requirements: NodeVersionRequirement[] = [];
  
  const parts = requirementString.split(',').map(s => s.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [minVersion, maxVersion] = part.split('-');
      requirements.push({ minVersion, maxVersion });
    } else if (part.endsWith('+')) {
      // Legacy support for "+" notation (not recommended)
      const minVersion = part.slice(0, -1);
      const majorVersion = parseInt(minVersion.split('.')[0], 10);
      const nextMajor = (majorVersion + 1).toString();
      requirements.push({ 
        minVersion,
        maxVersion: nextMajor + '.0.0'
      });
    } else {
      // Exact version
      requirements.push({ minVersion: part, maxVersion: part });
    }
  }
  
  return requirements;
}

/**
 * Compare two semantic versions (e.g., "18.13.0" vs "18.10.0")
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(n => parseInt(n, 10));
  const parts2 = v2.split('.').map(n => parseInt(n, 10));
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  
  return 0;
}

/**
 * Check if current Node version satisfies requirements
 */
export function isVersionCompatible(
  currentVersion: string,
  requirements: NodeVersionRequirement[]
): boolean {
  // Check if current version satisfies ANY of the requirements
  for (const req of requirements) {
    const meetsMin = compareVersions(currentVersion, req.minVersion) >= 0;
    const meetsMax = !req.maxVersion || compareVersions(currentVersion, req.maxVersion) <= 0;
    
    if (meetsMin && meetsMax) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get current Node.js version
 */
export async function getCurrentNodeVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync('node --version');
    // Remove 'v' prefix (e.g., "v18.13.0" -> "18.13.0")
    return stdout.trim().replace(/^v/, '');
  } catch (error) {
    throw new Error(`Failed to get Node version: ${error}`);
  }
}

/**
 * Check if NVM is available
 */
export async function isNvmAvailable(): Promise<boolean> {
  try {
    // Try to source nvm and check if it's available
    // NVM is a shell function, not a binary, so we need to source it first
    const { stdout } = await execAsync(
      'bash -c "source ~/.nvm/nvm.sh 2>/dev/null && command -v nvm" || bash -c "source ~/.bashrc 2>/dev/null && command -v nvm" || bash -c "source ~/.zshrc 2>/dev/null && command -v nvm"',
      { shell: '/bin/bash' }
    );
    return stdout.trim().length > 0;
  } catch {
    // Also try checking if NVM_DIR is set
    try {
      const { stdout } = await execAsync('echo $NVM_DIR');
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Get recommended Node version for Angular version
 */
export function getRecommendedNodeVersion(angularVersion: string): string {
  const versionMap: Record<string, string> = {
    '14': '18.10.0',
    '15': '18.10.0',
    '16': '18.19.0',
    '17': '20.11.0',
    '18': '20.11.0',
    '19': '22.0.0',
    '20': '22.0.0',
  };
  
  return versionMap[angularVersion] || '20.11.0';
}

/**
 * List available Node versions via NVM
 */
export async function listNvmVersions(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      'bash -c "source ~/.nvm/nvm.sh 2>/dev/null && nvm ls --no-colors" || bash -c "source ~/.bashrc 2>/dev/null && nvm ls --no-colors" || bash -c "source ~/.zshrc 2>/dev/null && nvm ls --no-colors"',
      { shell: '/bin/bash' }
    );
    
    // Parse version numbers from nvm ls output
    const versions: string[] = [];
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      // Match patterns like "v20.11.0" or "->  v20.11.0" or "*   v20.11.0"
      const match = line.match(/v(\d+\.\d+\.\d+)/);
      if (match) {
        versions.push(match[1]);
      }
    }
    
    return versions;
  } catch (error) {
    console.error('[NVM] Failed to list versions:', error);
    return [];
  }
}

/**
 * Find best matching installed Node version
 */
export function findBestMatch(
  installedVersions: string[],
  requirements: NodeVersionRequirement[]
): string | null {
  const compatible = installedVersions.filter(version =>
    isVersionCompatible(version, requirements)
  );
  
  if (compatible.length === 0) {
    return null;
  }
  
  // Return highest compatible version
  return compatible.sort(compareVersions).reverse()[0];
}

/**
 * Switch Node version using NVM
 */
export async function switchNodeVersion(version: string): Promise<boolean> {
  try {
    const { stdout, stderr } = await execAsync(
      `bash -c "source ~/.nvm/nvm.sh 2>/dev/null && nvm use ${version}" || bash -c "source ~/.bashrc 2>/dev/null && nvm use ${version}" || bash -c "source ~/.zshrc 2>/dev/null && nvm use ${version}"`,
      { shell: '/bin/bash' }
    );
    
    console.log(`[NVM] ${stdout}`);
    if (stderr) {
      console.error(`[NVM] ${stderr}`);
    }
    
    return true;
  } catch (error) {
    console.error(`[NVM] Failed to switch to Node ${version}:`, error);
    return false;
  }
}

/**
 * Install Node version using NVM
 */
export async function installNodeVersion(version: string): Promise<boolean> {
  try {
    console.log(`[NVM] Installing Node.js ${version}...`);
    const { stdout, stderr } = await execAsync(
      `bash -c "source ~/.nvm/nvm.sh 2>/dev/null && nvm install ${version}" || bash -c "source ~/.bashrc 2>/dev/null && nvm install ${version}" || bash -c "source ~/.zshrc 2>/dev/null && nvm install ${version}"`,
      { shell: '/bin/bash' }
    );
    
    console.log(`[NVM] ${stdout}`);
    if (stderr) {
      console.error(`[NVM] ${stderr}`);
    }
    
    return true;
  } catch (error) {
    console.error(`[NVM] Failed to install Node ${version}:`, error);
    return false;
  }
}

/**
 * Validate Node version and suggest actions
 */
export interface NodeValidationResult {
  isCompatible: boolean;
  currentVersion: string;
  requiredVersions: string;
  recommendedVersion?: string;
  installedCompatibleVersion?: string;
  suggestedAction?: 'switch' | 'install' | 'manual';
  message: string;
}

export async function validateNodeVersion(
  requiredVersions: string
): Promise<NodeValidationResult> {
  const currentVersion = await getCurrentNodeVersion();
  const requirements = parseNodeRequirements(requiredVersions);
  const isCompatible = isVersionCompatible(currentVersion, requirements);
  
  const result: NodeValidationResult = {
    isCompatible,
    currentVersion,
    requiredVersions,
    message: '',
  };
  
  if (isCompatible) {
    result.message = `✅ Node.js ${currentVersion} is compatible`;
    return result;
  }
  
  // Not compatible - check if NVM is available
  const nvmAvailable = await isNvmAvailable();
  
  if (!nvmAvailable) {
    result.suggestedAction = 'manual';
    result.message = [
      `⚠️ Node.js ${currentVersion} is not compatible`,
      `Required: ${requiredVersions}`,
      `Please install NVM or manually switch Node version`,
    ].join('\n');
    return result;
  }
  
  // NVM available - check for compatible installed versions
  const installedVersions = await listNvmVersions();
  const bestMatch = findBestMatch(installedVersions, requirements);
  
  if (bestMatch) {
    result.installedCompatibleVersion = bestMatch;
    result.suggestedAction = 'switch';
    result.message = [
      `⚠️ Node.js ${currentVersion} is not compatible`,
      `Required: ${requiredVersions}`,
      `Found compatible version: ${bestMatch}`,
      `Suggested: nvm use ${bestMatch}`,
    ].join('\n');
  } else {
    // No compatible version installed - suggest installation
    result.recommendedVersion = getRecommendedNodeVersion(
      requirements[0].minVersion.split('.')[0]
    );
    result.suggestedAction = 'install';
    result.message = [
      `⚠️ Node.js ${currentVersion} is not compatible`,
      `Required: ${requiredVersions}`,
      `No compatible version installed`,
      `Suggested: nvm install ${result.recommendedVersion}`,
    ].join('\n');
  }
  
  return result;
}

/**
 * Package Updater Utilities
 * Updates package.json versions for Angular migrations
 * Extracted from update-all-packages.sh script
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync, spawn } from 'child_process';
import { detectPackageManager, cleanPackages } from './package-manager.js';
import type { ProgressCallback } from '../types/index.js';

// ES modules compatibility: resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface PackageUpdateOptions {
  projectPath: string;
  targetVersion: string;
  matrixPath?: string;
  dryRun?: boolean;
  createBackup?: boolean;
  progressCallback?: ProgressCallback;
}

export interface PackageUpdateResult {
  success: boolean;
  message: string;
  error?: string;
  changes?: PackageChange[];
  removed?: string[];
  duration: number;
}

export interface PackageChange {
  package: string;
  from: string;
  to: string;
  type: 'dependencies' | 'devDependencies';
}

export interface CompatibilityMatrix {
  versions: {
    [version: string]: VersionConfig;
  };
  unchangedPackages?: {
    packages: string[];
  };
}

export interface VersionConfig {
  angular: {
    core: string;
    cli: string;
    material: string;
    cdk: string;
  };
  typescript: string;
  rxjs: string;
  'zone.js': string;
  tslib: string;
  dependencies?: { [key: string]: string };
  removed?: string[];
  notes?: string;
}

/**
 * Install packages with streaming progress updates
 */
async function installPackagesWithProgress(
  projectPath: string,
  installCommand: string,
  progressCallback?: ProgressCallback
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const [command, ...args] = installCommand.split(' ');

    const child = spawn(command, args, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';
    let lastUpdate = Date.now();
    let packageCount = 0;

    // Send initial progress
    if (progressCallback) {
      progressCallback({
        message: '📦 Starting package installation...',
        type: 'info',
        timestamp: new Date().toISOString(),
      });
    }

    // Monitor stdout
    child.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;

      // Parse npm output for package counts
      const addedMatch = chunk.match(/added (\d+)/);
      if (addedMatch) {
        packageCount = parseInt(addedMatch[1], 10);
      }

      // Send progress every 500ms
      if (progressCallback && Date.now() - lastUpdate > 500) {
        let message = chunk.trim();

        // Format npm output nicely
        if (message.includes('added') && message.includes('package')) {
          message = `📦 ${message}`;
        } else if (message.includes('reify')) {
          message = `⚙️  Installing and linking packages...`;
        } else if (message.includes('idealTree')) {
          message = `🌳 Calculating dependency tree...`;
        } else if (message.includes('fetch')) {
          message = `⬇️  Downloading packages...`;
        } else if (message.length > 200) {
          message = message.substring(0, 200) + '...';
        }

        progressCallback({
          message,
          type: 'info',
          timestamp: new Date().toISOString(),
          metadata: { packageCount },
        });

        lastUpdate = Date.now();
      }
    });

    // Monitor stderr (npm writes progress to stderr)
    child.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;

      // Send progress every 500ms
      if (progressCallback && Date.now() - lastUpdate > 500) {
        let message = chunk.trim();

        // Format npm stderr output
        if (message.includes('WARN')) {
          message = `⚠️  ${message}`;
        } else if (message.length > 200) {
          message = message.substring(0, 200) + '...';
        }

        if (message) {
          progressCallback({
            message,
            type: 'info',
            timestamp: new Date().toISOString(),
          });
        }

        lastUpdate = Date.now();
      }
    });

    // Handle completion
    child.on('close', (code) => {
      if (progressCallback) {
        if (code === 0) {
          progressCallback({
            message: `✅ Package installation completed successfully (${packageCount} packages)`,
            type: 'success',
            timestamp: new Date().toISOString(),
            metadata: { packageCount },
          });
        } else {
          progressCallback({
            message: `⚠️  Package installation completed with warnings (exit code: ${code})`,
            type: 'info',
            timestamp: new Date().toISOString(),
          });
        }
      }

      resolve({
        success: code === 0 || stderr.includes('WARN'),
        output: stdout || stderr,
        error: code !== 0 ? stderr : undefined,
      });
    });

    // Handle errors
    child.on('error', (error) => {
      if (progressCallback) {
        progressCallback({
          message: `❌ Package installation error: ${error.message}`,
          type: 'error',
          timestamp: new Date().toISOString(),
        });
      }

      resolve({
        success: false,
        output: stdout,
        error: error.message,
      });
    });
  });
}

/**
 * Update all packages to target Angular version
 *
 * @param options - Update options
 * @returns Update result with changes
 */
export async function updatePackages(
  options: PackageUpdateOptions
): Promise<PackageUpdateResult> {
  const startTime = Date.now();
  const {
    projectPath,
    targetVersion,
    matrixPath,
    dryRun = false,
    createBackup = true,
    progressCallback,
  } = options;

  const changes: PackageChange[] = [];
  const removed: string[] = [];
  const logs: string[] = []; // Collect all log messages for output

  try {
    // Step 1: Validate project path
    if (progressCallback) {
      progressCallback({
        message: `🔍 Validating project at ${projectPath}...`,
        type: 'info',
        timestamp: new Date().toISOString(),
      });
    }

    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found in ${projectPath}`);
    }

    // Load package.json
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Step 2: Create backup if requested
    if (createBackup && !dryRun) {
      if (progressCallback) {
        progressCallback({
          message: '📋 Creating backup of package.json...',
          type: 'info',
          timestamp: new Date().toISOString(),
        });
      }

      const backupPath = packageJsonPath + '.backup';
      fs.writeFileSync(backupPath, JSON.stringify(pkgJson, null, 2) + '\n');
      console.log(`📋 Backup created: ${backupPath}`);

      if (progressCallback) {
        progressCallback({
          message: `✅ Backup created: ${backupPath}`,
          type: 'success',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Load compatibility matrix
    const finalMatrixPath =
      matrixPath ||
      path.join(__dirname, '../../assets/package-compatibility-matrix.json');

    if (!fs.existsSync(finalMatrixPath)) {
      throw new Error(`Compatibility matrix not found: ${finalMatrixPath}`);
    }

    console.log('📝 Reading compatibility matrix...');
    const matrix: CompatibilityMatrix = JSON.parse(
      fs.readFileSync(finalMatrixPath, 'utf8')
    );

    // Get configuration for target version
    const config = matrix.versions[targetVersion];
    if (!config) {
      throw new Error(`Unknown Angular version: ${targetVersion}`);
    }

    console.log(`✅ Compatibility matrix loaded for Angular ${targetVersion}`);

    // Step 3: Update package.json
    if (progressCallback) {
      progressCallback({
        message: `📝 Updating package.json to Angular ${targetVersion}...`,
        type: 'info',
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure dependencies and devDependencies objects exist
    if (!pkgJson.dependencies) pkgJson.dependencies = {};
    if (!pkgJson.devDependencies) pkgJson.devDependencies = {};

    // Update Angular core packages
    console.log('Updating Angular core packages...');
    const angularCorePackages = [
      '@angular/animations',
      '@angular/common',
      '@angular/compiler',
      '@angular/core',
      '@angular/forms',
      '@angular/language-service',
      '@angular/platform-browser',
      '@angular/platform-browser-dynamic',
      '@angular/router',
    ];

    for (const pkgName of angularCorePackages) {
      if (pkgJson.dependencies[pkgName]) {
        const oldVersion = pkgJson.dependencies[pkgName];
        const newVersion = '^' + config.angular.core;
        pkgJson.dependencies[pkgName] = newVersion;
        changes.push({
          package: pkgName,
          from: oldVersion,
          to: newVersion,
          type: 'dependencies',
        });
        console.log(`  - ${pkgName}: ${oldVersion} → ${newVersion}`);
      }
    }

    // Update Material and CDK
    console.log('Updating Angular Material and CDK...');
    const materialPackages = [
      { name: '@angular/cdk', version: config.angular.cdk },
      { name: '@angular/material', version: config.angular.material },
      { name: '@angular/material-moment-adapter', version: config.angular.material },
    ];

    for (const { name, version } of materialPackages) {
      if (pkgJson.dependencies[name]) {
        const oldVersion = pkgJson.dependencies[name];
        const newVersion = '^' + version;
        pkgJson.dependencies[name] = newVersion;
        changes.push({
          package: name,
          from: oldVersion,
          to: newVersion,
          type: 'dependencies',
        });
        console.log(`  - ${name}: ${oldVersion} → ${newVersion}`);
      }
    }

    // Update CLI
    console.log('Updating Angular CLI...');
    const cliPackages = [
      { name: '@angular/cli', version: config.angular.cli, type: 'devDependencies' as const },
      { name: '@angular-devkit/build-angular', version: config.angular.cli, type: 'devDependencies' as const },
      { name: '@angular/compiler-cli', version: config.angular.core, type: 'devDependencies' as const },
    ];

    for (const { name, version, type } of cliPackages) {
      if (pkgJson[type][name]) {
        const oldVersion = pkgJson[type][name];
        const newVersion = '^' + version;
        pkgJson[type][name] = newVersion;
        changes.push({
          package: name,
          from: oldVersion,
          to: newVersion,
          type,
        });
        console.log(`  - ${name}: ${oldVersion} → ${newVersion}`);
      }
    }

    // Update TypeScript
    console.log(`Updating TypeScript to ${config.typescript}...`);
    if (pkgJson.devDependencies['typescript']) {
      const oldVersion = pkgJson.devDependencies['typescript'];
      pkgJson.devDependencies['typescript'] = config.typescript;
      changes.push({
        package: 'typescript',
        from: oldVersion,
        to: config.typescript,
        type: 'devDependencies',
      });
      console.log(`  - typescript: ${oldVersion} → ${config.typescript}`);
    }

    // Update RxJS
    console.log('Updating RxJS...');
    if (pkgJson.dependencies['rxjs']) {
      const oldVersion = pkgJson.dependencies['rxjs'];
      pkgJson.dependencies['rxjs'] = config.rxjs;
      changes.push({
        package: 'rxjs',
        from: oldVersion,
        to: config.rxjs,
        type: 'dependencies',
      });
      console.log(`  - rxjs: ${oldVersion} → ${config.rxjs}`);
    }

    // Update zone.js
    console.log('Updating zone.js...');
    if (pkgJson.dependencies['zone.js']) {
      const oldVersion = pkgJson.dependencies['zone.js'];
      pkgJson.dependencies['zone.js'] = config['zone.js'];
      changes.push({
        package: 'zone.js',
        from: oldVersion,
        to: config['zone.js'],
        type: 'dependencies',
      });
      console.log(`  - zone.js: ${oldVersion} → ${config['zone.js']}`);
    }

    // Update tslib
    if (pkgJson.dependencies['tslib']) {
      const oldVersion = pkgJson.dependencies['tslib'];
      pkgJson.dependencies['tslib'] = config.tslib;
      changes.push({
        package: 'tslib',
        from: oldVersion,
        to: config.tslib,
        type: 'dependencies',
      });
      console.log(`  - tslib: ${oldVersion} → ${config.tslib}`);
    }

    // Update third-party dependencies
    if (config.dependencies) {
      console.log('Updating third-party packages...');
      for (const [pkgName, version] of Object.entries(config.dependencies)) {
        if (pkgJson.dependencies[pkgName]) {
          const oldVersion = pkgJson.dependencies[pkgName];
          pkgJson.dependencies[pkgName] = version;
          changes.push({
            package: pkgName,
            from: oldVersion,
            to: version,
            type: 'dependencies',
          });
          console.log(`  - ${pkgName}: ${oldVersion} → ${version}`);
        }
      }
    }

    // Remove deprecated packages
    if (config.removed && Array.isArray(config.removed)) {
      console.log('Removing deprecated packages...');
      for (const pkgName of config.removed) {
        if (pkgJson.dependencies[pkgName]) {
          console.log(`  - Removing ${pkgName} from dependencies`);
          delete pkgJson.dependencies[pkgName];
          removed.push(pkgName);
        }
        if (pkgJson.devDependencies[pkgName]) {
          console.log(`  - Removing ${pkgName} from devDependencies`);
          delete pkgJson.devDependencies[pkgName];
          removed.push(pkgName);
        }
      }
    }

    // Step 4: Write updated package.json (unless dry run)
    if (!dryRun) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
      console.log('✅ package.json updated');

      if (progressCallback) {
        progressCallback({
          message: `✅ package.json updated with ${changes.length} package changes`,
          type: 'success',
          timestamp: new Date().toISOString(),
          metadata: { changesCount: changes.length },
        });
      }

      // Step 5: Save package.json to version control (optional git commit happens in workflow)
      const gitMsg = '📝 package.json ready for clean install';
      console.log(gitMsg);
      logs.push(gitMsg);

      // Step 6: Clean node_modules and lock files before install
      const cleanMsg = '🧹 Cleaning node_modules and lock files...';
      console.log(cleanMsg);
      logs.push(cleanMsg);

      if (progressCallback) {
        progressCallback({
          message: cleanMsg,
          type: 'info',
          timestamp: new Date().toISOString(),
        });
      }

      // Remove node_modules and lock files for clean install
      const cleanResult = await cleanPackages({
        projectPath,
        removeNodeModules: true,
        removeLockFile: true,
        reinstall: false, // We'll install manually with progress tracking
      });

      if (!cleanResult.success) {
        throw new Error(`Failed to clean packages: ${cleanResult.error}`);
      }

      const cleanedMsg = `✅ Cleaned: ${cleanResult.details?.nodeModulesRemoved ? 'node_modules' : ''} ${cleanResult.details?.lockFileRemoved ? 'lock file' : ''}`;
      console.log(cleanedMsg);
      logs.push(cleanedMsg);

      if (progressCallback) {
        progressCallback({
          message: cleanedMsg,
          type: 'success',
          timestamp: new Date().toISOString(),
        });
      }

      // Step 7: Detect package manager and install packages with streaming
      const packageManager = detectPackageManager(projectPath);

      // Log the exact directory where we'll run npm install
      const dirMsg = `📁 Working directory: ${projectPath}`;
      console.log(dirMsg);
      logs.push(dirMsg);

      const installMsg = `\n📦 Installing packages using ${packageManager.type}...`;
      console.log(installMsg);
      logs.push(installMsg);

      const runMsg = `Running: ${packageManager.installCommand} in ${projectPath}`;
      console.log(runMsg);
      logs.push(runMsg);

      // Define nodeModulesPath for before/after checks
      const nodeModulesPath = path.join(projectPath, 'node_modules');

      // Use streaming installation with progress updates
      const installResult = await installPackagesWithProgress(
        projectPath,
        packageManager.installCommand,
        progressCallback
      );

      // Check if node_modules exists after install
      const afterExists = fs.existsSync(nodeModulesPath);
      const afterMsg = `📦 node_modules after install: ${afterExists ? 'EXISTS' : 'DOES NOT EXIST'}`;
      console.log(afterMsg);
      logs.push(afterMsg);

      if (installResult.success) {
        const successMsg = '✅ Packages installed successfully';
        console.log(successMsg);
        logs.push(successMsg);

        if (installResult.output) {
          logs.push('--- INSTALL OUTPUT START ---');
          logs.push(installResult.output);
          logs.push('--- INSTALL OUTPUT END ---');
        }
      } else {
        // Log warning but don't fail - the package.json is updated
        const warnMsg = `⚠️  ${packageManager.installCommand} had warnings`;
        console.warn(warnMsg);
        logs.push(warnMsg);

        if (installResult.error) {
          console.warn('--- INSTALL ERROR START ---');
          console.warn(installResult.error);
          console.warn('--- INSTALL ERROR END ---');
          logs.push('--- INSTALL ERROR START ---');
          logs.push(installResult.error);
          logs.push('--- INSTALL ERROR END ---');
        }
      }
    } else {
      console.log('ℹ️  Dry run - no changes written to package.json');
    }

    const duration = Date.now() - startTime;
    const summaryMsg = `Successfully updated ${changes.length} packages to Angular ${targetVersion} compatible versions`;
    
    // Add breaking changes suggestion for versions that have automated fixes available
    const versionsWithBreakingChangesFixes = ['15', '16', '17', '19', '20'];
    const nextStepHint = versionsWithBreakingChangesFixes.includes(targetVersion)
      ? `\n\n📋 Next Step: Apply breaking changes fixes for Angular ${targetVersion}\n   Use: breaking_changes_fix tool with version=${targetVersion}`
      : '';
    
    const fullMessage = logs.length > 0
      ? `${summaryMsg}${nextStepHint}\n\n${logs.join('\n')}`
      : `${summaryMsg}${nextStepHint}`;

    return {
      success: true,
      message: fullMessage,
      changes,
      removed: removed.length > 0 ? removed : undefined,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Failed to update packages',
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Get current Angular version from package.json
 *
 * @param projectPath - Project path
 * @returns Angular version string or null
 */
export function getCurrentAngularVersion(projectPath: string): string | null {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const angularCore = pkgJson.dependencies?.['@angular/core'];

    if (!angularCore) {
      return null;
    }

    // Extract version number (remove ^, ~, etc.)
    const match = angularCore.match(/(\d+)\.\d+\.\d+/);
    return match ? match[1] : null;
  } catch (error) {
    console.warn('Warning: Could not read Angular version from package.json');
    return null;
  }
}

/**
 * Validate that package.json has all required Angular packages
 *
 * @param projectPath - Project path
 * @returns Validation result with missing packages
 */
export function validatePackageJson(
  projectPath: string
): { valid: boolean; missing: string[] } {
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return { valid: false, missing: ['package.json file'] };
  }

  const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const missing: string[] = [];

  const requiredPackages = [
    '@angular/core',
    '@angular/common',
    '@angular/platform-browser',
    '@angular/router',
  ];

  const requiredDevPackages = [
    '@angular/cli',
    '@angular/compiler-cli',
    'typescript',
  ];

  for (const pkg of requiredPackages) {
    if (!pkgJson.dependencies?.[pkg]) {
      missing.push(pkg);
    }
  }

  for (const pkg of requiredDevPackages) {
    if (!pkgJson.devDependencies?.[pkg]) {
      missing.push(pkg);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

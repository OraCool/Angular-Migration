/**
 * Package Updater Utilities
 * Updates package.json versions for Angular migrations
 * Extracted from update-all-packages.sh script
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PackageUpdateOptions {
  projectPath: string;
  targetVersion: string;
  matrixPath?: string;
  dryRun?: boolean;
  createBackup?: boolean;
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
  } = options;

  const changes: PackageChange[] = [];
  const removed: string[] = [];

  try {
    // Validate project path
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found in ${projectPath}`);
    }

    // Load package.json
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Create backup if requested
    if (createBackup && !dryRun) {
      const backupPath = packageJsonPath + '.backup';
      fs.writeFileSync(backupPath, JSON.stringify(pkgJson, null, 2) + '\n');
      console.log(`📋 Backup created: ${backupPath}`);
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

    // Write updated package.json (unless dry run)
    if (!dryRun) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
      console.log('✅ package.json updated');
    } else {
      console.log('ℹ️  Dry run - no changes written to package.json');
    }

    const duration = Date.now() - startTime;
    return {
      success: true,
      message: `Successfully updated ${changes.length} packages to Angular ${targetVersion} compatible versions`,
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

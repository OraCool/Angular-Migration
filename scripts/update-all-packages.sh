#!/bin/bash

# Update All Packages Script
# Updates ALL packages (Angular, Material, TypeScript, ag-grid, highcharts, etc.)
# to compatible versions based on the package-compatibility-matrix.json

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
TARGET_VERSION="$1"
PROJECT_PATH="${2:-$(pwd)}"

if [ -z "$TARGET_VERSION" ]; then
  echo -e "${RED}❌ Usage: $0 <angular-version> [project-path]${NC}"
  echo "Example: $0 16 /path/to/angular-project"
  exit 1
fi

echo -e "${BLUE}📦 Complete Package Updater${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Target Angular Version: ${TARGET_VERSION}${NC}"
echo -e "${BLUE}Project Path: ${PROJECT_PATH}${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MATRIX_FILE="$SCRIPT_DIR/../package-compatibility-matrix.json"

if [ ! -f "$MATRIX_FILE" ]; then
  echo -e "${RED}❌ Compatibility matrix not found: $MATRIX_FILE${NC}"
  exit 1
fi

# Change to project directory
cd "$PROJECT_PATH"

echo -e "${GREEN}📝 Reading compatibility matrix...${NC}"

# Extract versions using Node.js
node -e "
const fs = require('fs');
const matrix = JSON.parse(fs.readFileSync('$MATRIX_FILE', 'utf8'));
const version = '$TARGET_VERSION';

if (!matrix.versions[version]) {
  console.error('Unknown Angular version: ' + version);
  process.exit(1);
}

const config = matrix.versions[version];

// Output the configuration
console.log(JSON.stringify(config, null, 2));
" > /tmp/package-config-${TARGET_VERSION}.json

# Check if extraction succeeded
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to read compatibility matrix${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Compatibility matrix loaded${NC}"

# Update package.json using Node.js
echo -e "${GREEN}📝 Updating package.json...${NC}"

node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('/tmp/package-config-${TARGET_VERSION}.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update Angular packages
console.log('Updating Angular core packages...');
pkg.dependencies['@angular/animations'] = '^' + config.angular.core;
pkg.dependencies['@angular/common'] = '^' + config.angular.core;
pkg.dependencies['@angular/compiler'] = '^' + config.angular.core;
pkg.dependencies['@angular/core'] = '^' + config.angular.core;
pkg.dependencies['@angular/forms'] = '^' + config.angular.core;
pkg.dependencies['@angular/language-service'] = '^' + config.angular.core;
pkg.dependencies['@angular/platform-browser'] = '^' + config.angular.core;
pkg.dependencies['@angular/platform-browser-dynamic'] = '^' + config.angular.core;
pkg.dependencies['@angular/router'] = '^' + config.angular.core;

// Update Material and CDK
console.log('Updating Angular Material and CDK...');
pkg.dependencies['@angular/cdk'] = '^' + config.angular.cdk;
pkg.dependencies['@angular/material'] = '^' + config.angular.material;
if (pkg.dependencies['@angular/material-moment-adapter']) {
  pkg.dependencies['@angular/material-moment-adapter'] = '^' + config.angular.material;
}

// Update CLI
console.log('Updating Angular CLI...');
pkg.devDependencies['@angular/cli'] = '^' + config.angular.cli;
pkg.devDependencies['@angular-devkit/build-angular'] = '^' + config.angular.cli;
pkg.devDependencies['@angular/compiler-cli'] = '^' + config.angular.core;

// Update TypeScript
console.log('Updating TypeScript to ' + config.typescript + '...');
pkg.devDependencies['typescript'] = config.typescript;

// Update RxJS
console.log('Updating RxJS...');
pkg.dependencies['rxjs'] = config.rxjs;

// Update zone.js
console.log('Updating zone.js...');
pkg.dependencies['zone.js'] = config['zone.js'];

// Update tslib
pkg.dependencies['tslib'] = config.tslib;

// Update third-party dependencies
console.log('Updating third-party packages...');
for (const [pkgName, version] of Object.entries(config.dependencies || {})) {
  if (pkg.dependencies[pkgName]) {
    console.log('  - ' + pkgName + ': ' + version);
    pkg.dependencies[pkgName] = version;
  }
}

// Remove deprecated packages
if (config.removed && Array.isArray(config.removed)) {
  console.log('Removing deprecated packages...');
  for (const pkgName of config.removed) {
    if (pkg.dependencies[pkgName]) {
      console.log('  - Removing ' + pkgName);
      delete pkg.dependencies[pkgName];
    }
  }
}

// Write updated package.json
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4) + '\n');
console.log('✅ package.json updated');
"

# Clean up temp file
rm -f /tmp/package-config-${TARGET_VERSION}.json

echo -e "${GREEN}✅ All package versions updated${NC}"

# Show what changed
echo -e "${YELLOW}📋 Changes made:${NC}"
if [ -f "package.json.backup" ]; then
  diff -u package.json.backup package.json || true
fi

# Reinstall dependencies
echo -e "${YELLOW}🧹 Removing node_modules and package-lock.json...${NC}"
rm -rf node_modules package-lock.json

echo -e "${GREEN}🔄 Running npm install...${NC}"
npm install --legacy-peer-deps

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All packages updated to Angular ${TARGET_VERSION} compatible versions!${NC}"

# Verify installation
INSTALLED_ANGULAR=$(npm list @angular/core --depth=0 2>/dev/null | grep @angular/core | awk -F@ '{print $3}' || echo "unknown")
INSTALLED_TYPESCRIPT=$(npm list typescript --depth=0 2>/dev/null | grep typescript | awk -F@ '{print $2}' || echo "unknown")
echo -e "${GREEN}📦 Installed Angular: ${INSTALLED_ANGULAR}${NC}"
echo -e "${GREEN}📦 Installed TypeScript: ${INSTALLED_TYPESCRIPT}${NC}"

exit 0

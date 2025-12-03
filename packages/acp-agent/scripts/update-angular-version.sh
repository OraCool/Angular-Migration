#!/bin/bash

# Update Angular Version Script
# Updates package.json to specific Angular version and reinstalls dependencies
# This ensures package.json, package-lock.json, and node_modules are all in sync

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
TARGET_VERSION="$1"
PROJECT_PATH="${2:-$(pwd)}"  # Default to current directory if not provided

if [ -z "$TARGET_VERSION" ]; then
  echo -e "${RED}❌ Usage: $0 <angular-version> [project-path]${NC}"
  echo "Example: $0 15 /path/to/angular-project"
  echo "         $0 15  (uses current directory)"
  exit 1
fi

echo -e "${BLUE}📦 Angular Version Updater${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Target Version: ${TARGET_VERSION}${NC}"
echo -e "${BLUE}Project Path: ${PROJECT_PATH}${NC}"

# Function to source NVM
source_nvm() {
  if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    return 0
  elif [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
    return 0
  elif [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc"
    return 0
  fi
  return 1
}

# Determine required Node version for Angular version
get_required_node_version() {
  local angular_version=$1

  if [ "$angular_version" -ge 19 ]; then
    echo "22"
  elif [ "$angular_version" -ge 17 ]; then
    echo "20"
  else
    echo "18"
  fi
}

# Determine required npm version for Node version
# Returns the recommended npm version for each Node major version
get_required_npm_version() {
  local node_version=$1

  case "$node_version" in
    18)
      echo "10.2.4"  # Bundled with Node 18.20.8
      ;;
    20)
      echo "10.2.3"  # Bundled with Node 20.11.0
      ;;
    22)
      echo "10.5.0"  # Bundled with Node 22.0.0
      ;;
    *)
      echo "10"      # Default to npm 10.x for unknown versions
      ;;
  esac
}

# Switch to required Node version
REQUIRED_NODE=$(get_required_node_version "$TARGET_VERSION")

if source_nvm; then
  echo -e "${BLUE}📦 Checking Node.js version...${NC}"
  CURRENT_VERSION=$(node --version | sed 's/v//')
  MAJOR_VERSION=$(echo $CURRENT_VERSION | cut -d. -f1)

  if [[ "$MAJOR_VERSION" != "$REQUIRED_NODE" ]]; then
    echo -e "${YELLOW}⚠️  Current: v${CURRENT_VERSION}${NC}"
    echo -e "${GREEN}🔄 Switching to Node v${REQUIRED_NODE}...${NC}"

    # Try to use the version
    if nvm use "$REQUIRED_NODE" 2>/dev/null; then
      echo -e "${GREEN}✅ Switched to Node $(node --version)${NC}"
    else
      # Version not installed - install it
      echo -e "${YELLOW}📥 Node v${REQUIRED_NODE} not installed. Installing...${NC}"
      if nvm install "$REQUIRED_NODE"; then
        echo -e "${GREEN}✅ Installed and switched to Node $(node --version)${NC}"
      else
        echo -e "${RED}❌ Failed to install Node v${REQUIRED_NODE}${NC}"
        exit 1
      fi
    fi
  else
    echo -e "${GREEN}✅ Node $(node --version) is already active${NC}"
  fi

  # Ensure correct npm version for this Node version
  REQUIRED_NPM=$(get_required_npm_version "$REQUIRED_NODE")
  echo -e "${BLUE}📦 Checking npm version...${NC}"
  CURRENT_NPM=$(npm --version)
  CURRENT_NPM_MAJOR=$(echo $CURRENT_NPM | cut -d. -f1)
  REQUIRED_NPM_MAJOR=$(echo $REQUIRED_NPM | cut -d. -f1)

  if [[ "$CURRENT_NPM_MAJOR" != "$REQUIRED_NPM_MAJOR" ]]; then
    echo -e "${YELLOW}⚠️  Current npm: v${CURRENT_NPM}${NC}"
    echo -e "${GREEN}🔄 Installing npm v${REQUIRED_NPM}...${NC}"

    if npm install -g npm@${REQUIRED_NPM} --force 2>/dev/null; then
      CURRENT_NPM=$(npm --version)
      echo -e "${GREEN}✅ Installed npm v${CURRENT_NPM}${NC}"
    else
      echo -e "${RED}❌ Failed to install npm v${REQUIRED_NPM}${NC}"
      echo -e "${YELLOW}   Continuing with npm v${CURRENT_NPM} (may cause issues)${NC}"
    fi
  else
    echo -e "${GREEN}✅ npm v${CURRENT_NPM} is compatible${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  NVM not found. Using system Node version.${NC}"
  CURRENT_VERSION=$(node --version | sed 's/v//')
  MAJOR_VERSION=$(echo $CURRENT_VERSION | cut -d. -f1)

  if [[ "$MAJOR_VERSION" != "$REQUIRED_NODE" ]]; then
    echo -e "${RED}❌ Node version mismatch!${NC}"
    echo -e "${RED}   Required: v${REQUIRED_NODE}.x${NC}"
    echo -e "${RED}   Current: v${CURRENT_VERSION}${NC}"
    echo -e "${YELLOW}   Please install NVM: https://github.com/nvm-sh/nvm${NC}"
    exit 1
  fi
fi

# Change to project directory
cd "$PROJECT_PATH"

# Version mapping for Angular packages
# These are the stable versions for each major release
declare -A ANGULAR_VERSIONS=(
  ["15"]="15.2.10"
  ["16"]="16.2.12"
  ["17"]="17.3.11"
  ["18"]="18.2.7"
  ["19"]="19.0.5"
  ["20"]="20.0.0"
)

declare -A MATERIAL_VERSIONS=(
  ["15"]="15.2.9"
  ["16"]="16.2.14"
  ["17"]="17.3.10"
  ["18"]="18.2.8"
  ["19"]="19.0.4"
  ["20"]="20.0.0"
)

# TypeScript version compatibility for each Angular version
declare -A TYPESCRIPT_VERSIONS=(
  ["15"]="4.9.5"   # Angular 15: TypeScript 4.8.2 - 4.9.x
  ["16"]="5.0.4"   # Angular 16: TypeScript 4.9.3 - 5.0.x
  ["17"]="5.2.2"   # Angular 17: TypeScript 5.2.x - 5.3.x
  ["18"]="5.4.5"   # Angular 18: TypeScript 5.4.x
  ["19"]="5.5.4"   # Angular 19: TypeScript 5.5.x
  ["20"]="5.6.0"   # Angular 20: TypeScript 5.6.x
)

ANGULAR_VERSION="${ANGULAR_VERSIONS[$TARGET_VERSION]}"
MATERIAL_VERSION="${MATERIAL_VERSIONS[$TARGET_VERSION]}"
TYPESCRIPT_VERSION="${TYPESCRIPT_VERSIONS[$TARGET_VERSION]}"

if [ -z "$ANGULAR_VERSION" ]; then
  echo -e "${RED}❌ Unknown Angular version: ${TARGET_VERSION}${NC}"
  echo -e "${YELLOW}Supported versions: 15, 16, 17, 18, 19, 20${NC}"
  exit 1
fi

echo -e "${GREEN}📝 Updating package.json to Angular ${ANGULAR_VERSION}...${NC}"

# Backup package.json
cp package.json package.json.backup

# Update Angular core packages using sed (portable, no jq dependency)
# This updates all @angular/* packages except @angular-devkit
sed -i.tmp "s|\"@angular/animations\": \"[^\"]*\"|\"@angular/animations\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/common\": \"[^\"]*\"|\"@angular/common\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/compiler\": \"[^\"]*\"|\"@angular/compiler\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/core\": \"[^\"]*\"|\"@angular/core\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/forms\": \"[^\"]*\"|\"@angular/forms\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/language-service\": \"[^\"]*\"|\"@angular/language-service\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/platform-browser\": \"[^\"]*\"|\"@angular/platform-browser\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/platform-browser-dynamic\": \"[^\"]*\"|\"@angular/platform-browser-dynamic\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/router\": \"[^\"]*\"|\"@angular/router\": \"^${ANGULAR_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/compiler-cli\": \"[^\"]*\"|\"@angular/compiler-cli\": \"^${ANGULAR_VERSION}\"|g" package.json

# Update Angular Material and CDK
sed -i.tmp "s|\"@angular/cdk\": \"[^\"]*\"|\"@angular/cdk\": \"^${MATERIAL_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/material\": \"[^\"]*\"|\"@angular/material\": \"^${MATERIAL_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular/material-moment-adapter\": \"[^\"]*\"|\"@angular/material-moment-adapter\": \"^${MATERIAL_VERSION}\"|g" package.json

# Update Angular CLI
# CLI version matches the major version but uses different patch versions
declare -A CLI_VERSIONS=(
  ["15"]="15.2.11"
  ["16"]="16.2.14"
  ["17"]="17.3.8"
  ["18"]="18.2.7"
  ["19"]="19.0.6"
  ["20"]="20.0.0"
)

CLI_VERSION="${CLI_VERSIONS[$TARGET_VERSION]}"
sed -i.tmp "s|\"@angular/cli\": \"[^\"]*\"|\"@angular/cli\": \"^${CLI_VERSION}\"|g" package.json
sed -i.tmp "s|\"@angular-devkit/build-angular\": \"[^\"]*\"|\"@angular-devkit/build-angular\": \"^${CLI_VERSION}\"|g" package.json

# Update TypeScript version
echo -e "${GREEN}📝 Updating TypeScript to ${TYPESCRIPT_VERSION}...${NC}"
sed -i.tmp "s|\"typescript\": \"[^\"]*\"|\"typescript\": \"${TYPESCRIPT_VERSION}\"|g" package.json

# Remove temporary files created by sed
rm -f package.json.tmp

echo -e "${GREEN}✅ package.json updated${NC}"

# Show what changed
echo -e "${YELLOW}📋 Changes:${NC}"
diff -u package.json.backup package.json || true

# Clean node_modules and package-lock.json for fresh install
echo -e "${YELLOW}🧹 Removing node_modules and package-lock.json...${NC}"
rm -rf node_modules package-lock.json

echo -e "${GREEN}🔄 Running npm install...${NC}"
npm install --legacy-peer-deps

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Angular ${TARGET_VERSION} update complete!${NC}"

# Verify installation
INSTALLED_VERSION=$(npx ng version 2>/dev/null | grep "Angular:" | awk '{print $2}' || echo "unknown")
echo -e "${GREEN}📦 Installed version: ${INSTALLED_VERSION}${NC}"

# Clean up backup on success
rm -f package.json.backup

exit 0

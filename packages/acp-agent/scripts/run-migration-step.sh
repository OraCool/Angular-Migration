#!/bin/bash

# Migration Step Runner with Node Version Management
# Executes a migration step with the correct Node.js version

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
REQUIRED_NODE_VERSION="$1"
PROJECT_PATH="$2"
COMMAND="$3"

if [ -z "$REQUIRED_NODE_VERSION" ] || [ -z "$PROJECT_PATH" ] || [ -z "$COMMAND" ]; then
  echo -e "${RED}❌ Usage: $0 <node-version> <project-path> <command>${NC}"
  echo "Example: $0 18 /path/to/project 'npm install'"
  exit 1
fi

echo -e "${BLUE}🔧 Migration Step Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

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

# Check if NVM is available
if ! source_nvm; then
  echo -e "${YELLOW}⚠️  NVM not found. Using system Node version.${NC}"
  CURRENT_VERSION=$(node --version | sed 's/v//')
  MAJOR_VERSION=$(echo $CURRENT_VERSION | cut -d. -f1)

  if [[ "$MAJOR_VERSION" != "$REQUIRED_NODE_VERSION" ]]; then
    echo -e "${RED}❌ Node version mismatch!${NC}"
    echo -e "${RED}   Required: v${REQUIRED_NODE_VERSION}.x${NC}"
    echo -e "${RED}   Current: v${CURRENT_VERSION}${NC}"
    echo -e "${YELLOW}   Please install NVM: https://github.com/nvm-sh/nvm${NC}"
    exit 1
  fi
else
  # NVM is available - switch to required version
  echo -e "${BLUE}📦 Checking Node.js version...${NC}"
  CURRENT_VERSION=$(node --version | sed 's/v//')
  MAJOR_VERSION=$(echo $CURRENT_VERSION | cut -d. -f1)

  if [[ "$MAJOR_VERSION" != "$REQUIRED_NODE_VERSION" ]]; then
    echo -e "${YELLOW}⚠️  Current: v${CURRENT_VERSION}${NC}"
    echo -e "${GREEN}🔄 Switching to Node v${REQUIRED_NODE_VERSION}...${NC}"

    # Try to use the version
    if nvm use "$REQUIRED_NODE_VERSION" 2>/dev/null; then
      echo -e "${GREEN}✅ Switched to Node $(node --version)${NC}"
    else
      # Version not installed - install it
      echo -e "${YELLOW}📥 Node v${REQUIRED_NODE_VERSION} not installed. Installing...${NC}"
      if nvm install "$REQUIRED_NODE_VERSION"; then
        echo -e "${GREEN}✅ Installed and switched to Node $(node --version)${NC}"
      else
        echo -e "${RED}❌ Failed to install Node v${REQUIRED_NODE_VERSION}${NC}"
        exit 1
      fi
    fi
  else
    echo -e "${GREEN}✅ Node $(node --version) is already active${NC}"
  fi
fi

# Verify we have the correct version
FINAL_VERSION=$(node --version | sed 's/v//')
FINAL_MAJOR=$(echo $FINAL_VERSION | cut -d. -f1)

if [[ "$FINAL_MAJOR" != "$REQUIRED_NODE_VERSION" ]]; then
  echo -e "${RED}❌ Failed to switch to Node v${REQUIRED_NODE_VERSION}${NC}"
  echo -e "${RED}   Current: v${FINAL_VERSION}${NC}"
  exit 1
fi

# Ensure correct npm version for this Node version
REQUIRED_NPM=$(get_required_npm_version "$REQUIRED_NODE_VERSION")
echo -e "${BLUE}📦 Checking npm version...${NC}"
CURRENT_NPM=$(npm --version 2>/dev/null || echo "0.0.0")
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

# Change to project directory
echo -e "${BLUE}📂 Project: ${PROJECT_PATH}${NC}"
cd "$PROJECT_PATH"

# Add node_modules/.bin to PATH so local binaries like 'ng' are accessible
export PATH="$PROJECT_PATH/node_modules/.bin:$PATH"
echo -e "${GREEN}✅ Added node_modules/.bin to PATH${NC}"

# Execute the migration command
echo -e "${BLUE}🚀 Running: ${COMMAND}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Run command and capture exit code
eval "$COMMAND"
EXIT_CODE=$?

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Command completed successfully${NC}"
else
  echo -e "${RED}❌ Command failed with exit code: ${EXIT_CODE}${NC}"
fi

exit $EXIT_CODE

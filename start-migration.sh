#!/bin/bash

# Angular Migration Agent Starter Script
# Ensures correct Node.js version before starting the server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Checking Node.js version...${NC}"

# Check if NVM is available
if command -v nvm &> /dev/null || [ -f "$HOME/.nvm/nvm.sh" ]; then
  # Source NVM
  if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
  fi

  CURRENT_VERSION=$(node --version | sed 's/v//')
  REQUIRED_VERSION="18.20.8"

  # Check if current version is compatible (Node 18.x or 20.x)
  MAJOR_VERSION=$(echo $CURRENT_VERSION | cut -d. -f1)

  if [[ "$MAJOR_VERSION" != "18" ]] && [[ "$MAJOR_VERSION" != "20" ]]; then
    echo -e "${YELLOW}⚠️  Current Node version: ${CURRENT_VERSION}${NC}"
    echo -e "${YELLOW}📦 Migration agent works best with Node 18.x or 20.x${NC}"
    echo -e "${GREEN}🔄 Switching to Node ${REQUIRED_VERSION}...${NC}"

    # Try to use Node 18
    nvm use 18 2>/dev/null || {
      echo -e "${YELLOW}📥 Node 18 not installed. Installing...${NC}"
      nvm install 18
    }

    echo -e "${GREEN}✅ Switched to Node $(node --version)${NC}"
  else
    echo -e "${GREEN}✅ Node version ${CURRENT_VERSION} is compatible${NC}"
  fi
else
  echo -e "${RED}⚠️  NVM not found. Using system Node version.${NC}"
  echo -e "${YELLOW}   For best results, install NVM: https://github.com/nvm-sh/nvm${NC}"
fi

echo -e "${GREEN}🚀 Starting Angular Migration Agent...${NC}"
npm start

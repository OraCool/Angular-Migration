#!/bin/bash

# Install Dependencies Script
# Safely install npm dependencies

set -e

PROJECT_DIR="${1:-.}"

echo "📦 Installing dependencies..."
echo "  Project: ${PROJECT_DIR}"

cd "${PROJECT_DIR}"

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found in ${PROJECT_DIR}"
  exit 1
fi

# Clean install for reproducible builds
echo "🧹 Performing clean install..."
rm -rf node_modules package-lock.json

npm install

echo "✅ Dependencies installed successfully!"

# Show installed Angular version
if command -v ng &> /dev/null; then
  echo "📊 Angular CLI version:"
  ng version --help > /dev/null 2>&1 || true
fi

exit 0

#!/bin/bash

# Quick setup script for Angular Migration Agent

set -e

echo "🚀 Angular Migration Agent - Quick Setup"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. You have: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Build project
echo "🔨 Building agent..."
npm run build
echo ""

# Get absolute path
AGENT_PATH="$(cd "$(dirname "$0")" && pwd)/dist/index.js"

echo "✅ Build complete!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Open Zed IDE settings (Cmd+, or Ctrl+,)"
echo ""
echo "2. Add this configuration to settings.json:"
echo ""
echo '{'
echo '  "agent_servers": {'
echo '    "Angular Migration": {'
echo '      "type": "custom",'
echo '      "command": "node",'
echo "      \"args\": [\"$AGENT_PATH\"],"
echo '      "env": {}'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "3. Restart Zed IDE"
echo ""
echo "4. Open your Angular project in Zed"
echo ""
echo "5. Open Assistant panel (Cmd+? or Ctrl+?)"
echo ""
echo "6. Select 'Angular Migration' from the dropdown"
echo ""
echo "7. Type: analyze my project"
echo ""
echo "🎉 Ready to migrate Angular 14→20!"

# MCP Server Quick Start Guide

Get the Angular Migration MCP server running in 5 minutes.

## Prerequisites

- ✅ Node.js v22.x installed
- ✅ npm or yarn
- ✅ Zed IDE, VS Code, or Claude Desktop installed

## Quick Setup

### 1. Build the Server (2 minutes)

```bash
# Clone or navigate to the project
cd Angular-Migration

# Install and build all packages
npm install
cd packages/workflow-engine && npm run build
cd ../mcp-server && npm run build

# Verify build
ls dist/index.js  # Should exist
```

### 2. Get Your Path (from project root )

```bash
cd ../../
pwd
# Copy this path - you'll need it for configuration
```

Your server path will be: `[YOUR_PATH]/packages/mcp-server/dist/index.js`

---

## Configuration Snippets

### For Zed IDE

Add to Zed's `settings.json` (`⌘,` on macOS):

```json
{
  "context_servers": {
    "angular-migration": {
      "command": "node",
      "args": ["[YOUR_PATH]/packages/mcp-server/dist/index.js"]
    }
  }
}
```

**Test**: Open Zed Assistant (`⌘?`) → Type `/context` → See "angular-migration"

---

### For VS Code

1. Install **"Model Context Protocol"** extension
2. Add to `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "angular-migration": {
      "command": "node",
      "args": ["[YOUR_PATH]/packages/mcp-server/dist/index.js"]
    }
  }
}
```

**Test**: Command Palette (`⌘⇧P`) → "MCP: List Tools" → See 25 tools

---

### For Claude Desktop

Edit config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "angular-migration": {
      "command": "node",
      "args": ["[YOUR_PATH]/packages/mcp-server/dist/index.js"]
    }
  }
}
```

**Test**: Ask Claude: "List the angular-migration MCP tools"

---

## First Migration

### 1. Start a Session

Ask your AI assistant:
```
Create a migration session for my Angular project at /path/to/my-app
```

Response will include a session ID like: `mcp-abc123`

### 2. Run Pre-Migration

```
Run pre-migration stage for session mcp-abc123
```

This will:
- ✅ Create backup
- ✅ Validate project
- ✅ Commit current state

### 3. Upgrade Angular

```
Run migration stage v15 for session mcp-abc123
```

The AI will execute the upgrade, show progress, and recommend the next step.

### 4. Continue Through Versions

Just follow the recommendations! Each stage tells you what to do next:
- v15 → v16 → v17 → v18 → v19 → v20 → Post-migration

---

## Common Commands

### Check Progress
```
What's the current stage for session [session-id]?
```

### List All Stages
```
Show all migration stages for session [session-id]
```

### Create Backup Anytime
```
Create a backup for session [session-id]
```

### Jump to Specific Version
```
Skip to Angular 17 stage for session [session-id]
```

---

## Troubleshooting

### "MCP Server Not Found"

**Quick Fix**:
1. Check the path is absolute (not relative)
2. Verify file exists: `ls [YOUR_PATH]/dist/index.js`
3. Restart your IDE/application
4. Check IDE logs for detailed errors

### "Node Version Error"

**Quick Fix**:
```bash
node --version  # Should be v22.x.x

# If wrong version:
nvm install 22
nvm use 22

# Rebuild
cd packages/mcp-server
npm run build
```

### "Build Failed"

**Quick Fix**:
```bash
cd packages/mcp-server
rm -rf dist node_modules
npm install
npm run build
```

---

## Next Steps

- 📖 Read full documentation: [`packages/mcp-server/README.md`](../packages/mcp-server/README.md)
- 🔧 Explore all 25 tools in your MCP client
- 🎯 Run your first complete migration v14 → v20
- 💡 Check best practices in [`docs/`](./README.md)

---

## What's Available

### 25 MCP Tools

**Core Migration** (8 stages):
- Pre-migration → v15 → v16 → v17 → v18 → v19 → v20 → Post-migration

**Optional Features** (1):
- Standalone components migration

**Stage Management** (4):
- Get current, skip to, list all, validate Node version

**Supporting Tools** (12):
- State management (4)
- Validation (3)
- Package management (3)
- Backup/restore (2)

### Key Features

- ✅ **Cross-platform**: Windows, macOS, Linux
- ✅ **Node v22 validation**: Ensures compatibility
- ✅ **Resumption support**: Continue after failures
- ✅ **Comprehensive errors**: Detailed diagnostics
- ✅ **Next-step recommendations**: Always know what to do next

---

## Support

**Need help?**
- Check [Troubleshooting](../packages/mcp-server/README.md#troubleshooting)
- Review IDE logs for detailed errors
- Verify Node.js v22 is installed
- Open an issue with full error details

**Ready to migrate?** Start with your first session! 🚀

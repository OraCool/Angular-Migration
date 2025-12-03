# Angular Migration Toolkit

AI-powered tooling for automated Angular 14 → 20 migration with two integration options:

1. **🆕 MCP Server** (Recommended) - Model Context Protocol server compatible with:
   - **Zed IDE** (native support)
   - **VS Code** (via MCP extension)
   - **Claude Desktop** (native support)
   - Any MCP-compatible client

2. **ACP Agent** (Legacy) - Agent Client Protocol for Zed IDE only

---

## 🚀 Quick Start - MCP Server (Recommended)

The MCP server provides 25 stage-based tools for automated migration with better structure and error handling.

### Installation (5 minutes)

```bash
# Build the server
cd Angular-Migration
npm install
cd packages/workflow-engine && npm run build
cd ../mcp-server && npm run build

# Get your path
pwd  # Copy this path
```

### Configuration

**Zed IDE** - Add to settings.json (`⌘,`):
```json
{
  "context_servers": {
    "angular-migration": {
      "command": "node",
      "args": ["/YOUR/PATH/packages/mcp-server/dist/index.js"]
    }
  }
}
```

**VS Code** - Add to `.vscode/settings.json`:
```json
{
  "mcp.servers": {
    "angular-migration": {
      "command": "node",
      "args": ["/YOUR/PATH/packages/mcp-server/dist/index.js"]
    }
  }
}
```

**Claude Desktop** - Edit `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "angular-migration": {
      "command": "node",
      "args": ["/YOUR/PATH/packages/mcp-server/dist/index.js"]
    }
  }
}
```

📖 **Full MCP Documentation**: [`packages/mcp-server/README.md`](./packages/mcp-server/README.md)
⚡ **Quick Start Guide**: [`docs/MCP_QUICKSTART.md`](./docs/MCP_QUICKSTART.md)

---

## Features (MCP Server)

### 🎯 Stage-Based Migration (25 Tools)

**8 Core Stages**:
- Pre-migration (backup, validation, git commit)
- Angular 15, 16, 17, 18, 19, 20 upgrades
- Post-migration reporting

**Optional Features**:
- Standalone components migration (can run anytime after v15)

**Stage Management**:
- Get current stage with progress
- Skip to specific version
- List all stages with status
- Validate Node.js version

**Supporting Tools**:
- State management (checkpoints)
- Project validation
- Package compatibility checks
- Backup and restore
- Breaking changes detection

### ✨ Key Capabilities

- **Cross-Platform Support**: Windows (PowerShell), macOS, Linux (bash)
- **Node.js v22 Validation**: Ensures compatibility before execution
- **Resumption Support**: Continue from checkpoints after failures
- **Comprehensive Error Reporting**: Detailed diagnostics with troubleshooting
- **Next-Step Recommendations**: Every tool suggests what to do next
- **Automated Fixes**: Version-specific breaking change transformations
- **Backup/Restore**: Create and restore project snapshots anytime

---

## 📚 Legacy ACP Agent (Zed IDE Only)

The original Agent Client Protocol implementation for Zed IDE. See instructions below if you prefer the ACP agent over the MCP server.

**Note**: The MCP server is recommended for new projects as it provides better structure, error handling, and multi-IDE support.

---

## Prerequisites (for both MCP and ACP)

- Node.js 18+ and npm
- [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm) - **Recommended** for automatic version switching
- [Zed IDE](https://zed.dev/) installed
- An Angular 14 project to migrate

### ⚠️ Important: Node Version Management

The migration agent **cannot** switch Node.js versions while running. You must start the server with a compatible Node version (18.x or 20.x).

**Use the startup script (recommended):**
```bash
./start-migration.sh  # Automatically switches to correct Node version
```

**Or manually switch before starting:**
```bash
nvm use 18  # For Angular 14-16
npm run build
npm start
```

See [docs/NODE_VERSION_MANAGEMENT.md](./docs/NODE_VERSION_MANAGEMENT.md) for details.

---

## ACP Agent Installation (Legacy - Zed IDE Only)

⚠️ **Consider using the MCP server instead** - see [Quick Start](#-quick-start---mcp-server-recommended) above.

### 1. Build the ACP Agent

```bash
# Clone or navigate to this directory
cd /path/to/Angular-Migration

# Install dependencies
npm install

# Build the agent
npm run build
```

### 2. Configure Zed IDE for ACP Agent

Add the ACP agent to your Zed settings. Open Zed settings:

- **macOS**: `Zed > Settings...` or `Cmd+,`
- **Linux**: `File > Settings` or `Ctrl+,`

Add this configuration to your `settings.json`:

```json
{
  "agent_servers": {
    "Angular Migration": {
      "type": "custom",
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/Angular-Migration/dist/index.js"],
      "env": {}
    }
  }
}
```

**Important**: Replace `/ABSOLUTE/PATH/TO/Angular-Migration` with the actual absolute path to this project directory.

To find the absolute path, run:
```bash
cd /path/to/Angular-Migration && pwd
```

### 3. Verify Installation

1. Restart Zed IDE
2. Open your Angular project in Zed
3. Open the Assistant panel (`Cmd+?` or `Ctrl+?`)
4. Select "Angular Migration" from the agent dropdown
5. Type a message like "analyze my project"

You should see the agent respond with migration analysis and guidance.

## Usage

### Quick Start Commands

Once the agent is active in Zed's Assistant panel, you can ask:

**Analysis & Planning:**
```
Analyze my Angular project for migration
What needs to be migrated?
Generate a migration plan
```

**Automated Migrations:**
```
Convert to standalone components
Migrate control flow syntax
Update to Angular 20
Perform full migration
```

**Guidance & Learning:**
```
Explain Angular 20 changes
How do signals work?
Show me migration commands
What are the breaking changes?
```

### Example Workflow

1. **Analyze the project:**
   ```
   User: Analyze my project for Angular 20 migration
   Agent: [Scans codebase and generates detailed report]
   ```

2. **Start migrating:**
   ```
   User: Migrate to standalone components
   Agent: [Runs migration schematic and shows results]
   ```

3. **Update templates:**
   ```
   User: Migrate control flow syntax
   Agent: [Converts *ngIf/*ngFor to @if/@for]
   ```

4. **Get commands:**
   ```
   User: Show me the full migration commands
   Agent: [Provides step-by-step CLI instructions]
   ```

## What the Agent Can Do

### 🔍 Analysis
- Scan TypeScript/HTML files for Angular patterns
- Identify NgModules, components, and their dependencies
- Detect old template syntax usage
- Find `@Input/@Output` decorators
- Catalog Angular Material component usage
- Generate migration complexity assessment

### 🚀 Automated Migrations
- Run Angular CLI schematics
- Convert NgModule components to standalone
- Update control flow syntax in templates
- Migrate Angular Material to v20
- Update imports and providers

### 📋 Planning & Strategy
- Create phased migration plans
- Assess migration risks and effort
- Recommend migration order
- Identify breaking changes
- Provide rollback strategies

### 💡 Guidance
- Explain Angular 20 features (signals, control flow, zoneless)
- Show code examples and diffs
- Provide CLI commands
- Suggest best practices
- Answer migration questions

## Angular 14→20 Migration Overview

### Key Changes

1. **Standalone Components** (v14+)
   - Move away from NgModules
   - Components declare their own dependencies
   - Simpler bootstrapping with `bootstrapApplication()`

2. **New Control Flow** (v17+)
   - Built-in `@if`, `@for`, `@switch` syntax
   - Better type checking than directives
   - Improved performance
   - Replaces `*ngIf`, `*ngFor`, `*ngSwitch`

3. **Signal-Based Reactivity** (v16+)
   - `input()`, `output()`, `model()` functions
   - Fine-grained change detection
   - Simpler than RxJS for many use cases
   - Foundation for zoneless Angular

4. **Angular Material Standalone** (v15+)
   - All Material components as standalone
   - Import from `@angular/material/*`
   - Material 3 (Material Design 3) themes

### Migration Phases

**Phase 1: Core Updates** (1-2 days)
- Update to Angular 20
- Run standalone migration schematic
- Run control flow migration schematic
- Update Angular Material

**Phase 2: Refinements** (2-3 days)
- Convert critical components to signals
- Update RxJS patterns where beneficial
- Fix type errors and warnings
- Test all features

**Phase 3: Optimization** (1-2 days)
- Complete signal conversions
- Prepare for zoneless change detection
- Performance optimization
- Final testing and documentation

## Troubleshooting

### Agent doesn't appear in Zed

1. Check that the path in `settings.json` is correct and absolute
2. Verify the build succeeded: `ls dist/index.js` should exist
3. Check Zed's log: `Zed > View > Log` for any agent startup errors
4. Restart Zed after changing settings

### Agent responds with errors

1. Ensure you're in an Angular project directory
2. Check that the agent can read files (permissions)
3. Look at stderr output in Zed's console

### Build fails

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Development

### Project Structure

```
Angular-Migration/
├── src/
│   ├── index.ts           # Main agent entry point
│   ├── types/
│   │   └── acp.ts         # ACP protocol type definitions
│   └── transport/
│       └── jsonrpc.ts     # JSON-RPC stdio transport
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### How It Works

1. **Zed starts the agent** - Spawns `node dist/index.js` as a subprocess
2. **JSON-RPC Communication** - Agent and Zed communicate via stdin/stdout using JSON-RPC 2.0
3. **ACP Protocol** - Agent implements `initialize`, `session/new`, and `session/prompt` methods
4. **Session Management** - Each conversation is a session with its own state
5. **Streaming Updates** - Agent sends `session/update` notifications for thoughts, plans, and tool calls

### Extending the Agent

To add new migration capabilities:

1. **Add detection method** in `src/index.ts`:
   ```typescript
   private isMyFeatureRequest(query: string): boolean {
     return /\b(my-feature|special-migration)\b/.test(query);
   }
   ```

2. **Add handler method**:
   ```typescript
   private async migrateMyFeature(sessionId: SessionId, session: SessionState): Promise<void> {
     await this.sendThought(sessionId, 'Working on your feature...');
     // Implementation
   }
   ```

3. **Call from `handlePrompt()`**:
   ```typescript
   } else if (this.isMyFeatureRequest(userQuery)) {
     await this.migrateMyFeature(request.sessionId, session);
   }
   ```

4. Rebuild: `npm run build`

## Resources

- [ACP Specification](https://agentclientprotocol.com/)
- [Zed AI Documentation](https://zed.dev/docs/ai)
- [Angular Update Guide](https://update.angular.io/)
- [Angular Standalone Migration](https://angular.io/guide/standalone-migration)
- [Angular Signals](https://angular.io/guide/signals)
- [Angular Control Flow](https://angular.io/guide/control_flow)

## License

MIT

## Contributing

Contributions welcome! This agent can be extended to support:
- More specific Angular Material migrations
- RxJS to Signals conversion helpers
- Unit test migration support
- Performance optimization suggestions
- Custom migration rules per project

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Zed's AI documentation
3. Open an issue in this repository

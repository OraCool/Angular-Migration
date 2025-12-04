# Angular Migration MCP Server

A Model Context Protocol (MCP) server for automated Angular 14→20 migration with stage-based workflow management. Compatible with GitHub Copilot, Claude Desktop, Zed IDE, VS Code, and other MCP clients.

## Features

### 🎯 Stage-Based Migration (12 Tools)
- **8 Core Migration Stages**: Pre-migration → v15 → v16 → v17 → v18 → v19 → v20 → Post-migration
- **1 Optional Feature**: Standalone components migration (can run anytime after v15)
- **4 Stage Management Tools**: Get current stage, skip to stage, list all stages, validate Node version

### 🔑 Session Management (4 Tools)
- **Create Session**: Initialize migration session for a project (returns `sessionId`)
- **List Sessions**: View all active migration sessions
- **Get Session**: Check detailed status and progress
- **Delete Session**: Clean up completed or abandoned sessions

> **Note**: All migration stage tools require a `sessionId`. Always create a session first using `session_create`.

### 🛠️ Supporting Tools (13 Tools)
- **State Management** (4): Save/load/delete checkpoints, check if checkpoint exists
- **Validation** (3): Validate project structure, Node version, dependencies
- **Package Management** (3): Get compatibility matrix, check updates, get breaking changes
- **Backup/Restore** (2): Create and restore project backups

### ✨ Key Capabilities
- **Cross-Platform Support**: Works on Windows (PowerShell), macOS, and Linux (bash)
- **Node.js v22 Validation**: Ensures correct Node version before execution
- **Resumption Support**: Continue from checkpoints after failures
- **Comprehensive Error Reporting**: Detailed diagnostics with troubleshooting guidance
- **Next-Step Recommendations**: Every tool suggests what to do next

## Prerequisites

### ⚠️ Critical Requirement: Node.js v22

**You MUST have Node.js v22.x installed before using this tool.**

- **Node.js v22.x** ← **REQUIRED** (Angular 20 will not work with other versions)
- **npm or yarn** for package management
- An Angular 14+ project to migrate
- One of the following MCP clients:
  - Zed IDE (recommended for development)
  - VS Code with MCP extension
  - Claude Desktop
  - Any MCP-compatible client

> **🛑 Blocking Behavior**: If you attempt to run migration tools with the wrong Node.js version, they will **immediately stop** and display an error with installation instructions. This cannot be bypassed - it's a hard requirement.
>
> **📖 See**: [Node.js Version Requirements](./docs/NODE_VERSION_REQUIREMENTS.md) for detailed installation instructions and troubleshooting.

## Installation

### 1. Build the MCP Server

```bash
# Navigate to project root
cd /path/to/Angular-Migration

# Install dependencies for all packages
npm install

# Build workflow-engine first (required dependency)
cd packages/workflow-engine
npm run build

# Build MCP server
cd ../mcp-server
npm run build
```

Verify the build succeeded:
```bash
ls dist/index.js  # Should exist
```

### 2. Get the Absolute Path

You'll need the absolute path to the built server for configuration:

```bash
cd /path/to/Angular-Migration/packages/mcp-server
pwd
# Example output: /Users/username/dev/Angular-Migration/packages/mcp-server
```

The server entry point is: `[YOUR_PATH]/dist/index.js`

---

## Configuration by IDE

### Option A: Zed IDE (Recommended)

Zed has first-class MCP support built-in.

#### 1. Open Zed Settings

- **macOS**: `Zed > Settings...` or `⌘,`
- **Linux**: `File > Settings` or `Ctrl+,`

#### 2. Add MCP Server Configuration

Add this to your `settings.json`:

```json
{
  "context_servers": {
    "angular-migration": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/Angular-Migration/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important**: Replace `/ABSOLUTE/PATH/TO/Angular-Migration` with your actual path from step 2 above.

#### 3. Restart Zed

Close and reopen Zed IDE for changes to take effect.

#### 4. Verify Installation

1. Open your Angular project in Zed
2. Open the Assistant panel: `⌘?` (macOS) or `Ctrl+?` (Linux)
3. In the assistant, type `/context` to see available context servers
4. You should see "angular-migration" in the list
5. Test it:
   ```
   Use the angular-migration context to list all migration stages
   ```

---

### Option B: VS Code

VS Code requires the MCP extension for protocol support.

#### 1. Install MCP Extension

Search for and install the **"Model Context Protocol"** extension in VS Code:
- Open Extensions: `⌘⇧X` (macOS) or `Ctrl+Shift+X` (Windows/Linux)
- Search: "Model Context Protocol"
- Install the official MCP extension

#### 2. Configure MCP Server

Create or edit `.vscode/settings.json` in your workspace:

```json
{
  "mcp.servers": {
    "angular-migration": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/Angular-Migration/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Windows Users**: Use forward slashes or escaped backslashes in paths:
```json
"args": [
  "C:/Users/username/dev/Angular-Migration/packages/mcp-server/dist/index.js"
]
```

#### 3. Restart VS Code

Reload the window: `⌘⇧P` → "Developer: Reload Window"

#### 4. Verify Installation

1. Open Command Palette: `⌘⇧P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: "MCP: List Servers"
3. You should see "angular-migration" in the list
4. Check tools: "MCP: List Tools" → should show all 25 migration tools

---

### Option C: Claude Desktop

Claude Desktop has native MCP support.

#### 1. Locate Claude Config

**macOS**:
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux**:
```bash
~/.config/Claude/claude_desktop_config.json
```

#### 2. Add MCP Server Configuration

Edit the config file:

```json
{
  "mcpServers": {
    "angular-migration": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/Angular-Migration/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### 3. Restart Claude Desktop

Quit Claude Desktop completely and reopen.

#### 4. Verify Installation

In a Claude conversation:
```
Can you list the available MCP tools for angular-migration?
```

Claude should respond with the list of 25 migration tools.

---

## Usage Examples

### Starting a New Migration Session

**Every migration requires a session first.** The session provides a `sessionId` that is required by all migration stage tools.

Ask the AI assistant:
```
Create a new migration session for my project at /path/to/my-angular-app
```

Or call the tool directly:
```json
{
  "tool": "session_create",
  "arguments": {
    "projectPath": "/absolute/path/to/my-angular-app"
  }
}
```

The tool will:
1. Create a session with a unique `sessionId` (e.g., `mcp-session-1`)
2. Validate the project structure (checks for `angular.json`)
3. Initialize workflow for Angular 14 → 20 migration
4. Return the `sessionId` needed for all subsequent operations
5. Recommend the next step (usually `migration_stage_pre_migration`)

> **📖 Detailed Guide**: See [Session Management Guide](./docs/SESSION_MANAGEMENT.md) for complete session lifecycle documentation.

### Running Migration Stages

#### Pre-Migration (Backup & Validation)
```
Run the pre-migration stage for session [session-id]
```

This executes:
- Creates project backup
- Validates current state
- Commits current state to git

#### Upgrading Angular Versions
```
Run the migration stage for Angular 15 upgrade on session [session-id]
```

Each version upgrade:
- Updates package.json with compatible versions
- Runs `ng update` migrations
- Applies breaking change fixes
- Runs build and tests
- Commits changes

#### Optional Standalone Migration
```
Run the standalone components migration for session [session-id]
```

Can be executed anytime after v15 is complete.

### Managing Migration State

#### Check Current Progress
```
What is the current stage for session [session-id]?
```

#### Jump to Specific Version
```
Skip to Angular 17 stage for session [session-id]
```

#### List All Stages
```
Show all migration stages and their status for session [session-id]
```

### Backup and Restore

#### Create Backup
```
Create a backup of the project for session [session-id]
```

Optional parameters:
- Custom backup name
- Skip node_modules (default: true)
- Skip dist folder (default: true)

#### Restore from Backup
```
Restore the project from backup [backup-name] for session [session-id]
```

Safety features:
- Creates safety backup before restore
- Preserves .git directory by default
- Reinstalls dependencies automatically

---

## Tool Reference

### Migration Stage Tools (12 tools)

| Tool Name | Description | Steps |
|-----------|-------------|-------|
| `migration_stage_pre_migration` | Backup, validation, git commit | 0-2 |
| `migration_stage_v15` | Upgrade to Angular 15 | 3-4 |
| `migration_stage_v16` | Upgrade to Angular 16 (Signals) | 7-8 |
| `migration_stage_v17` | Upgrade to Angular 17 (Control Flow) | 9-11 |
| `migration_stage_v18` | Upgrade to Angular 18 | 12-13 |
| `migration_stage_v19` | Upgrade to Angular 19 | 14-15 |
| `migration_stage_v20` | Upgrade to Angular 20 | 16-17 |
| `migration_stage_post_migration` | Generate final report | 18 |
| `migration_feature_standalone` | Optional standalone migration | 5-6 |
| `migration_stage_get_current` | Get current stage info | - |
| `migration_stage_skip_to` | Jump to specific stage | - |
| `migration_stage_get_all` | List all stages with status | - |
| `migration_stage_validate_node` | Check Node.js v22 compatibility | - |

### Supporting Tools (13 tools)

**State Management**:
- `state_save_checkpoint` - Save current workflow state
- `state_load_checkpoint` - Restore from checkpoint
- `state_delete_checkpoint` - Delete saved checkpoint
- `state_has_checkpoint` - Check if checkpoint exists

**Validation**:
- `validate_project` - Validate Angular project structure
- `validate_node_version` - Check Node.js compatibility
- `validate_dependencies` - Validate package.json dependencies

**Package Management**:
- `packages_get_compatibility` - Get Angular version compatibility matrix
- `packages_check_updates` - Check for available updates
- `packages_get_breaking_changes` - Get breaking changes for version range

**Backup/Restore**:
- `migration_backup` - Create project backup
- `migration_restore` - Restore from backup

**Git**:
- `workflow_step_git_commit` - Commit changes with auto-generated message

---

## Troubleshooting

### MCP Server Not Found

**Zed IDE**:
1. Check the path in `settings.json` is absolute and correct
2. Verify `dist/index.js` exists: `ls /your/path/packages/mcp-server/dist/index.js`
3. Check Zed logs: `Zed > View > Server Log`
4. Restart Zed after configuration changes

**VS Code**:
1. Ensure MCP extension is installed and enabled
2. Check `.vscode/settings.json` path is correct
3. Open Output panel → Select "MCP" from dropdown to see logs
4. Reload window after changes

**Claude Desktop**:
1. Check config file location matches your OS
2. Ensure JSON is valid (no trailing commas)
3. Restart Claude Desktop completely (quit from menu, not just close window)
4. Check Claude Desktop logs (location varies by OS)

### Node Version Errors

The MCP server requires **Node.js v22** for Angular 20 compatibility.

Check your Node version:
```bash
node --version
# Should show: v22.x.x
```

If wrong version:
```bash
# Using nvm (recommended)
nvm install 22
nvm use 22

# Or download from https://nodejs.org
```

After installing Node v22, rebuild:
```bash
cd packages/mcp-server
npm run build
```

### Build Errors

Clean and rebuild:
```bash
cd packages/mcp-server
rm -rf dist node_modules
npm install
npm run build
```

Check for TypeScript errors:
```bash
npm run build 2>&1 | grep error
```

### Permission Denied Errors

On Unix-like systems, ensure the server is executable:
```bash
chmod +x packages/mcp-server/dist/index.js
```

### Connection Refused

The MCP server uses stdio transport (stdin/stdout), not network sockets. If you see connection errors:
1. Verify the `command` in config is `"node"` (not `"npm"` or `"npx"`)
2. Ensure `args` points directly to `dist/index.js`
3. Check that Node.js is in your PATH: `which node`

---

## Development

### Project Structure

```
packages/mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── types.ts              # Type definitions
│   ├── session/
│   │   └── manager.ts        # Session management
│   └── tools/
│       ├── index.ts          # Tool registration (25 tools)
│       ├── migration-stages.ts  # Stage-specific tools (12)
│       ├── backup-restore.ts    # Backup/restore tools (2)
│       ├── state.ts             # State management (4)
│       ├── validation.ts        # Validation tools (3)
│       └── packages.ts          # Package tools (3)
├── dist/                     # Compiled output (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Running in Development Mode

```bash
cd packages/mcp-server
npm run dev  # Uses tsx watch for hot reload
```

### Testing with MCP Inspector

The MCP SDK provides an inspector for testing:

```bash
# Install MCP inspector globally
npm install -g @modelcontextprotocol/inspector

# Run inspector
mcp-inspector node packages/mcp-server/dist/index.js
```

This opens a web UI for testing MCP tools directly.

### Adding New Tools

1. Create tool definition in `src/tools/index.ts`:
   ```typescript
   {
     name: 'my_new_tool',
     description: 'Description of what it does',
     inputSchema: {
       type: 'object',
       properties: {
         sessionId: { type: 'string', description: 'Session ID' },
         // ... other parameters
       },
       required: ['sessionId']
     }
   }
   ```

2. Add handler in appropriate tool file:
   ```typescript
   async function myNewTool(
     args: Record<string, unknown>,
     sessionManager: SessionManager
   ): Promise<ToolResult> {
     // Implementation
   }
   ```

3. Add routing in `src/tools/index.ts`:
   ```typescript
   if (name === 'my_new_tool') {
     result = await myModule.myNewTool(toolArgs, sessionManager);
   }
   ```

4. Rebuild: `npm run build`

---

## Architecture

### SOLID Principles

- **Single Responsibility**: Each tool has one clear purpose
- **Open/Closed**: Extensible for new Angular versions without modifying existing code
- **Liskov Substitution**: All stage tools follow the same contract
- **Interface Segregation**: Minimal, focused tool interfaces
- **Dependency Inversion**: Tools depend on abstractions (SessionManager, WorkflowEngine)

### DRY Implementation

- Shared utilities eliminate duplication (platform detection, Node validation)
- Single validation point for Node.js version
- Reusable error formatting in ToolResult type
- Common handler patterns across all tools

### Key Design Patterns

- **Strategy Pattern**: Different action handlers for different action types
- **Command Pattern**: Tools as executable commands with parameters
- **Factory Pattern**: Session creation and management
- **Observer Pattern**: Stage progress tracking

---

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Angular Update Guide](https://update.angular.io/)
- [Angular v20 Documentation](https://angular.io/)
- [Zed MCP Documentation](https://zed.dev/docs/extensions/mcp)

---

## Contributing

Contributions welcome! Areas for improvement:

- Additional automated fixes for breaking changes
- More comprehensive error recovery strategies
- Performance optimizations for large projects
- Enhanced test coverage
- Documentation improvements

---

## License

MIT

---

## Support

For issues or questions:

1. Check the Troubleshooting section above
2. Review MCP client logs for detailed error messages
3. Verify Node.js version compatibility (v22 required)
4. Open an issue in the repository with:
   - MCP client (Zed/VS Code/Claude Desktop)
   - Node.js version (`node --version`)
   - Error messages from logs
   - Steps to reproduce

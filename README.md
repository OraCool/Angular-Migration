# Angular Migration Agent for Zed IDE

An AI agent that helps migrate Angular applications from version 14 to version 20, integrated with Zed IDE via the Agent Client Protocol (ACP).

## Features

This agent provides intelligent assistance for:

- **Codebase Analysis** - Scan Angular projects to identify migration needs
- **Standalone Components** - Automated conversion from NgModules
- **Control Flow Syntax** - Migrate `*ngIf/*ngFor/*ngSwitch` to `@if/@for/@switch`
- **Signal-Based APIs** - Convert `@Input/@Output` to `input()/output()/model()`
- **Angular Material Updates** - Migrate to standalone Material components
- **Migration Planning** - Generate phased migration strategies with risk assessment
- **Step-by-Step Guidance** - Detailed commands and manual steps

## Prerequisites

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

## Installation

### 1. Build the Agent

```bash
# Clone or navigate to this directory
cd /path/to/Angular-Migration

# Install dependencies
npm install

# Build the agent
npm run build
```

### 2. Configure Zed IDE

Add the agent to your Zed settings. Open Zed settings:

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

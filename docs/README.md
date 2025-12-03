# Angular Migration Documentation

Complete documentation for the Angular 14→20 migration toolkit with MCP server and legacy ACP agent.

## 🚀 Getting Started

### Quick Start Guides

1. **[MCP Quick Start](./MCP_QUICKSTART.md)** ⭐ **Recommended**
   - Get the MCP server running in 5 minutes
   - Configuration for Zed IDE, VS Code, and Claude Desktop
   - First migration walkthrough

2. **[Legacy Quick Start](./QUICKSTART.md)**
   - Original ACP agent setup guide
   - Zed IDE only

### Choosing Your Path

- **[MCP vs ACP Comparison](./MCP_VS_ACP.md)**
  - Feature comparison table
  - Architecture differences
  - When to use each option
  - Migration path from ACP to MCP

---

## 📖 MCP Server Documentation

### Core Documentation

- **[MCP Server README](../packages/mcp-server/README.md)**
  - Complete MCP server documentation
  - 25 tools reference
  - IDE configuration (Zed, VS Code, Claude Desktop)
  - Troubleshooting guide
  - Development guide

### Key Features

**Stage-Based Migration**:
- 8 core migration stages (pre-migration → v15 → v16 → v17 → v18 → v19 → v20 → post-migration)
- 1 optional feature migration (standalone components)
- 4 stage management tools
- 12 supporting tools

**Architecture Highlights**:
- SOLID principles (Single Responsibility, Open/Closed, etc.)
- DRY implementation (shared utilities, no duplication)
- Cross-platform support (Windows PowerShell, macOS/Linux bash)
- Node.js v22 validation
- Comprehensive error handling with troubleshooting
- Next-step recommendations

---

## 🔧 Legacy ACP Agent Documentation

### Setup & Configuration

- **[Zed IDE Setup](./ZED_SETUP.md)**
  - Complete Zed IDE configuration
  - Agent Client Protocol setup
  - Troubleshooting tips

- **[Node Version Management](./NODE_VERSION_MANAGEMENT.md)**
  - NVM usage and version switching
  - Angular version → Node version mapping
  - Troubleshooting Node version issues

### Architecture & Development

- **[LangGraph Architecture](./LANGGRAPH_ARCHITECTURE.md)**
  - Original workflow engine architecture
  - State machine design
  - Node and edge definitions

- **[LangGraph Quickstart](./LANGGRAPH_QUICKSTART.md)**
  - Getting started with LangGraph workflow
  - Basic concepts and examples

- **[LangGraph Usage](./LANGGRAPH_USAGE.md)**
  - Detailed usage examples
  - Common patterns and workflows

- **[LangGraph Auto-Fix](./LANGGRAPH_AUTOFIX.md)**
  - Automated error fixing
  - LLM-based code corrections

- **[LangGraph Status](./LANGGRAPH_STATUS.md)**
  - Implementation status
  - Known issues and limitations

- **[State Persistence](./STATE_PERSISTENCE.md)**
  - How state is saved and restored
  - Checkpoint management
  - Resume after failure

- **[LLM Messaging Guide](./LLM_MESSAGING_GUIDE.md)**
  - Best practices for LLM communication
  - Prompt engineering tips

---

## 📚 Reference Documentation

### Breaking Changes

- **[Breaking Changes Analysis](./BREAKING_CHANGES_ANALYSIS.md)**
  - Comprehensive analysis of Angular 14→20 breaking changes
  - Version-by-version breakdown
  - Automated fix strategies
  - Manual intervention requirements

### Workshop & Project Integration

- **[Workshop Integration](./WORKSHOP_INTEGRATION.md)**
  - Using migration toolkit in workshops
  - Training materials and exercises
  - Best practices for teaching

- **[Workshop Inventory](./WORKSHOP_INVENTORY.md)**
  - Complete inventory of workshop resources
  - Code examples and demos
  - Teaching materials index

---

## 🗂️ Documentation Structure

```
docs/
├── README.md (this file)              # Documentation index
│
├── MCP_QUICKSTART.md                  # ⭐ New users start here
├── MCP_VS_ACP.md                      # Choose MCP or ACP
│
├── QUICKSTART.md                      # Legacy ACP quick start
├── ZED_SETUP.md                       # Zed IDE configuration
├── NODE_VERSION_MANAGEMENT.md         # Node version handling
│
├── BREAKING_CHANGES_ANALYSIS.md       # Version changes reference
│
├── LANGGRAPH_*.md                     # Legacy LangGraph docs (5 files)
├── STATE_PERSISTENCE.md               # State management
├── LLM_MESSAGING_GUIDE.md             # LLM communication
│
└── WORKSHOP_*.md                      # Workshop materials (2 files)
```

---

## 🎯 Documentation by Use Case

### "I want to migrate my project"

1. Read: [MCP Quick Start](./MCP_QUICKSTART.md)
2. Read: [MCP Server README](../packages/mcp-server/README.md)
3. Configure your IDE (Zed/VS Code/Claude)
4. Start migrating!

### "Which should I use: MCP or ACP?"

Read: [MCP vs ACP Comparison](./MCP_VS_ACP.md)

**TL;DR**: Use MCP server (better features, multi-IDE support, active development)

### "I'm having trouble with setup"

**MCP Server**:
- [MCP Server Troubleshooting](../packages/mcp-server/README.md#troubleshooting)
- [MCP Quick Start - Troubleshooting Section](./MCP_QUICKSTART.md#troubleshooting)

**ACP Agent**:
- [Zed Setup Troubleshooting](./ZED_SETUP.md)
- [Node Version Issues](./NODE_VERSION_MANAGEMENT.md)

### "I want to understand the architecture"

**MCP Server** (Recommended):
- [MCP Server README - Architecture Section](../packages/mcp-server/README.md#architecture)
- [MCP vs ACP - Architecture Comparison](./MCP_VS_ACP.md#architecture-comparison)

**ACP Agent** (Legacy):
- [LangGraph Architecture](./LANGGRAPH_ARCHITECTURE.md)
- [State Persistence](./STATE_PERSISTENCE.md)

### "I'm a developer extending the toolkit"

**MCP Server**:
- [MCP Server README - Development Section](../packages/mcp-server/README.md#development)
- [Workflow Engine README](../packages/workflow-engine/README.md) (if exists)

**General**:
- [LLM Messaging Guide](./LLM_MESSAGING_GUIDE.md)
- [Breaking Changes Analysis](./BREAKING_CHANGES_ANALYSIS.md)

### "I need breaking changes reference"

- [Breaking Changes Analysis](./BREAKING_CHANGES_ANALYSIS.md)
  - Complete version-by-version analysis
  - Automated vs manual fixes
  - Risk assessment

---

## 📦 Package Documentation

### MCP Server Package

**Location**: [`packages/mcp-server/`](../packages/mcp-server/)

**Documentation**:
- [README.md](../packages/mcp-server/README.md) - Complete reference
- [package.json](../packages/mcp-server/package.json) - Package metadata
- [tsconfig.json](../packages/mcp-server/tsconfig.json) - TypeScript config

**Key Files**:
- `src/index.ts` - MCP server entry point
- `src/tools/` - Tool implementations (25 tools)
- `src/session/` - Session management
- `dist/index.js` - Built entry point (after npm run build)

### Workflow Engine Package

**Location**: [`packages/workflow-engine/`](../packages/workflow-engine/)

**Purpose**: Shared workflow logic used by both MCP server and ACP agent

**Key Exports**:
- `WorkflowEngine` - Core execution engine
- `StateManager` - Checkpoint management
- `ANGULAR_MIGRATION_STAGES` - Stage definitions
- Utilities: platform, node-version, package-manager, backup, breaking-changes

### ACP Agent Package

**Location**: [`packages/acp-agent/`](../packages/acp-agent/)

**Documentation**: Main [README.md](../README.md#acp-agent-installation-legacy---zed-ide-only)

**Status**: Legacy/maintenance mode

---

## 🔍 Finding What You Need

### By Topic

| Topic | Documentation |
|-------|---------------|
| **Getting Started** | [MCP Quick Start](./MCP_QUICKSTART.md) |
| **IDE Setup** | [MCP Server README](../packages/mcp-server/README.md#configuration-by-ide) |
| **Tool Reference** | [MCP Server README - Tools](../packages/mcp-server/README.md#tool-reference) |
| **Troubleshooting** | [MCP Server README](../packages/mcp-server/README.md#troubleshooting) |
| **Breaking Changes** | [Breaking Changes Analysis](./BREAKING_CHANGES_ANALYSIS.md) |
| **Architecture** | [MCP vs ACP](./MCP_VS_ACP.md#architecture-comparison) |
| **Development** | [MCP Server README](../packages/mcp-server/README.md#development) |
| **Node Versions** | [Node Version Management](./NODE_VERSION_MANAGEMENT.md) |
| **State/Checkpoints** | [State Persistence](./STATE_PERSISTENCE.md) |

### By Role

**End User (Migrating a Project)**:
1. [MCP Quick Start](./MCP_QUICKSTART.md) - 5 minute setup
2. [MCP Server README](../packages/mcp-server/README.md) - Complete guide
3. [Breaking Changes](./BREAKING_CHANGES_ANALYSIS.md) - What to expect

**Developer (Extending Toolkit)**:
1. [MCP Server Development](../packages/mcp-server/README.md#development)
2. [Architecture](./MCP_VS_ACP.md#architecture-comparison)
3. [LLM Messaging Guide](./LLM_MESSAGING_GUIDE.md)

**Workshop Instructor**:
1. [Workshop Integration](./WORKSHOP_INTEGRATION.md)
2. [Workshop Inventory](./WORKSHOP_INVENTORY.md)
3. [MCP Quick Start](./MCP_QUICKSTART.md) - For students

---

## 🆕 Recent Updates

### December 2024 - MCP Server Release

- ✅ **New MCP Server**: Stage-based architecture with 25 tools
- ✅ **Multi-IDE Support**: Zed, VS Code, Claude Desktop
- ✅ **SOLID/DRY Architecture**: Clean, maintainable codebase
- ✅ **Comprehensive Documentation**: Setup guides for all IDEs
- ✅ **Cross-Platform**: Windows, macOS, Linux support

### Legacy Updates

- Original ACP agent remains in maintenance mode
- LangGraph workflow documentation archived
- State persistence system documented

---

## 📞 Getting Help

### Common Issues

1. **"MCP server not found"**
   → [MCP Troubleshooting](../packages/mcp-server/README.md#mcp-server-not-found)

2. **"Node version error"**
   → [Node Version Management](./NODE_VERSION_MANAGEMENT.md)

3. **"Build failed"**
   → [MCP Troubleshooting](../packages/mcp-server/README.md#build-errors)

4. **"Tools not appearing in IDE"**
   → Check IDE-specific setup in [MCP Server README](../packages/mcp-server/README.md#configuration-by-ide)

### Support Resources

- **Documentation**: Start with [MCP Quick Start](./MCP_QUICKSTART.md)
- **Examples**: See [Usage Examples](../packages/mcp-server/README.md#usage-examples)
- **Issues**: Check IDE logs for detailed error messages
- **Community**: Open an issue with reproduction steps

---

## 🎓 Learning Path

### For Complete Beginners

1. **Read**: [MCP Quick Start](./MCP_QUICKSTART.md) (10 min)
2. **Setup**: Follow IDE configuration (5 min)
3. **Try**: Run pre-migration on a test project (5 min)
4. **Learn**: Review [Tool Reference](../packages/mcp-server/README.md#tool-reference) (15 min)
5. **Migrate**: Start your real project!

### For Experienced Users

1. **Compare**: [MCP vs ACP](./MCP_VS_ACP.md) - See what's new
2. **Configure**: Set up MCP in your preferred IDE
3. **Explore**: Try advanced features (skip to stage, backup/restore)
4. **Optimize**: Use checkpoints for safe migration

### For Developers

1. **Architecture**: [MCP vs ACP Architecture](./MCP_VS_ACP.md#architecture-comparison)
2. **Code**: Review [MCP Server source](../packages/mcp-server/src/)
3. **Extend**: [Add new tools](../packages/mcp-server/README.md#adding-new-tools)
4. **Test**: Use MCP inspector for testing

---

## 📄 License

MIT - See [LICENSE](../LICENSE) file

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Additional automated fixes for breaking changes
- More IDE integrations
- Enhanced error recovery
- Performance optimizations
- Documentation improvements

See [MCP Server README](../packages/mcp-server/README.md#contributing) for details.

---

**Ready to start migrating?** → [MCP Quick Start Guide](./MCP_QUICKSTART.md) 🚀

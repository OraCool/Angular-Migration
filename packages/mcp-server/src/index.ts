#!/usr/bin/env node

/**
 * Angular Migration MCP Server
 * Model Context Protocol server for Angular 14→20 migration
 * Compatible with GitHub Copilot and other MCP clients
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { InMemoryTaskStore } from '@modelcontextprotocol/sdk/experimental/tasks/stores/in-memory.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import handlers
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { registerMigrationTaskTools } from './tools/migration-tasks.js';
import { registerMigrationSubtaskTools } from './tools/migration-subtasks.js';
import { SessionManager } from './session/manager.js';

/**
 * Angular Migration MCP Server
 * Provides workflow management, state tracking, and migration guidance
 * Supports long-running operations via experimental Tasks API
 */
class AngularMigrationMCPServer {
  private server: McpServer;
  private sessionManager: SessionManager;
  private taskStore: InMemoryTaskStore;

  constructor() {
    // Create task store for long-running operations
    this.taskStore = new InMemoryTaskStore();

    this.server = new McpServer(
      {
        name: '@angular-migration/mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        taskStore: this.taskStore,
      }
    );

    this.sessionManager = new SessionManager();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // IMPORTANT: Register task-based tools FIRST
    // McpServer.experimental.tasks.registerToolTask() sets up tool handlers internally
    // If we call registerTools() first, it will conflict with McpServer's handler setup

    // Register stage-level tools (8 tools: pre-migration, v15-v20, post-migration)
    registerMigrationTaskTools(this.server, this.sessionManager);

    // Register granular subtask tools (30 tools: 6 versions × 5 subtasks each)
    // Provides fine-grained control: retry npm install, skip build, etc.
    registerMigrationSubtaskTools(this.server, this.sessionManager);

    // Register traditional tools (workflow, state, packages, files, validation)
    // Pass the McpServer instance so tools can be registered with it
    registerTools(this.server, this.sessionManager);

    // Register resources (state, docs, checkpoints)
    registerResources(this.server.server, this.sessionManager);

    // Register prompts (guidance, analysis, troubleshooting)
    registerPrompts(this.server.server, this.sessionManager);

    // Error handling (use underlying Server instance)
    this.server.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      // Cleanup task store timers
      this.taskStore.cleanup();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Angular Migration MCP Server] Started and ready');
  }
}

// Start the server
const server = new AngularMigrationMCPServer();
server.start().catch((error) => {
  console.error('[Fatal Error]', error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Angular Migration MCP Server
 * Model Context Protocol server for Angular 14→20 migration
 * Compatible with GitHub Copilot and other MCP clients
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
import { SessionManager } from './session/manager.js';

/**
 * Angular Migration MCP Server
 * Provides workflow management, state tracking, and migration guidance
 */
class AngularMigrationMCPServer {
  private server: Server;
  private sessionManager: SessionManager;

  constructor() {
    this.server = new Server(
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
      }
    );

    this.sessionManager = new SessionManager();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Register tools (workflow, state, packages, files, validation)
    registerTools(this.server, this.sessionManager);

    // Register resources (state, docs, checkpoints)
    registerResources(this.server, this.sessionManager);

    // Register prompts (guidance, analysis, troubleshooting)
    registerPrompts(this.server, this.sessionManager);

    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
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

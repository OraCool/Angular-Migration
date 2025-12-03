/**
 * MCP Tools Registration
 * Registers all 15 migration workflow tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SessionManager } from '../session/manager.js';
import { ToolResult } from '../types.js';

// Import tool handlers
import * as workflowTools from './workflow.js';
import * as stateTools from './state.js';
import * as validationTools from './validation.js';
import * as packageTools from './packages.js';

/**
 * All available MCP tools
 */
const TOOLS: Tool[] = [
  // Workflow Management (6 tools)
  {
    name: 'workflow_start',
    description: 'Start a new migration workflow session',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Absolute path to the Angular project',
        },
        currentVersion: {
          type: 'string',
          description: 'Current Angular version (optional, will auto-detect)',
        },
        targetVersion: {
          type: 'string',
          description: 'Target Angular version (default: "20")',
        },
        skipTests: {
          type: 'boolean',
          description: 'Skip running tests during migration',
        },
        skipLint: {
          type: 'boolean',
          description: 'Skip running linter during migration',
        },
        autoConfirm: {
          type: 'boolean',
          description: 'Auto-confirm all prompts (dangerous)',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'workflow_step_next',
    description: 'Execute the next step in the migration workflow',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID from workflow_start',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'workflow_step_skip',
    description: 'Skip the current workflow step',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        reason: {
          type: 'string',
          description: 'Reason for skipping (optional)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'workflow_get_plan',
    description: 'Get the full migration plan with all steps',
    inputSchema: {
      type: 'object',
      properties: {
        targetVersion: {
          type: 'string',
          description: 'Target Angular version (default: "20")',
        },
      },
      required: [],
    },
  },
  {
    name: 'workflow_get_status',
    description: 'Get current workflow status and progress',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'workflow_list_sessions',
    description: 'List all active workflow sessions',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // State Management (4 tools)
  {
    name: 'state_save_checkpoint',
    description: 'Save current workflow state as a checkpoint',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'state_load_checkpoint',
    description: 'Load workflow state from a checkpoint',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'state_delete_checkpoint',
    description: 'Delete a saved checkpoint',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'state_has_checkpoint',
    description: 'Check if a checkpoint exists for a session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },

  // Validation Tools (3 tools)
  {
    name: 'validate_project',
    description: 'Validate Angular project structure and configuration',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to Angular project',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'validate_node_version',
    description: 'Validate Node.js version compatibility for Angular version',
    inputSchema: {
      type: 'object',
      properties: {
        angularVersion: {
          type: 'string',
          description: 'Angular version to validate against',
        },
      },
      required: ['angularVersion'],
    },
  },
  {
    name: 'validate_dependencies',
    description: 'Validate package.json dependencies for compatibility',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to Angular project',
        },
        targetVersion: {
          type: 'string',
          description: 'Target Angular version',
        },
      },
      required: ['projectPath', 'targetVersion'],
    },
  },

  // Package Management (2 tools)
  {
    name: 'packages_get_compatibility',
    description: 'Get package compatibility matrix for Angular versions',
    inputSchema: {
      type: 'object',
      properties: {
        angularVersion: {
          type: 'string',
          description: 'Angular version (e.g., "20")',
        },
      },
      required: ['angularVersion'],
    },
  },
  {
    name: 'packages_check_updates',
    description: 'Check for available package updates',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to Angular project',
        },
      },
      required: ['projectPath'],
    },
  },
];

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: Server, sessionManager: SessionManager): void {
  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: ToolResult;

      // Route to appropriate handler
      const toolArgs = args || {};

      if (name.startsWith('workflow_')) {
        result = await workflowTools.handleWorkflowTool(name, toolArgs, sessionManager);
      } else if (name.startsWith('state_')) {
        result = await stateTools.handleStateTool(name, toolArgs, sessionManager);
      } else if (name.startsWith('validate_')) {
        result = await validationTools.handleValidationTool(name, toolArgs, sessionManager);
      } else if (name.startsWith('packages_')) {
        result = await packageTools.handlePackageTool(name, toolArgs, sessionManager);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: errorMessage,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });
}

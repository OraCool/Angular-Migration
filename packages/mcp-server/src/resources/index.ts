/**
 * MCP Resources Registration
 * Provides read-only access to workflow state, documentation, and checkpoints
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from '../session/manager.js';
import { ANGULAR_MIGRATION_WORKFLOW } from '@angular-migration/workflow-engine';

/**
 * All available MCP resources
 */
function getResources(sessionManager: SessionManager): Resource[] {
  const sessions = sessionManager.listSessions();

  const resources: Resource[] = [
    // Static documentation resources
    {
      uri: 'migration://docs/overview',
      name: 'Migration Overview',
      description: 'Overview of the Angular 14→20 migration process',
      mimeType: 'text/markdown',
    },
    {
      uri: 'migration://docs/workflow',
      name: 'Workflow Steps',
      description: 'Complete list of migration workflow steps',
      mimeType: 'application/json',
    },
    {
      uri: 'migration://docs/compatibility',
      name: 'Package Compatibility',
      description: 'Package compatibility matrix for Angular versions',
      mimeType: 'application/json',
    },
  ];

  // Dynamic session resources
  for (const session of sessions) {
    resources.push({
      uri: `migration://sessions/${session.id}/state`,
      name: `Session ${session.id} State`,
      description: `Current workflow state for session ${session.id}`,
      mimeType: 'application/json',
    });

    resources.push({
      uri: `migration://sessions/${session.id}/plan`,
      name: `Session ${session.id} Plan`,
      description: `Migration plan with progress for session ${session.id}`,
      mimeType: 'application/json',
    });
  }

  return resources;
}

/**
 * Register all resources with the MCP server
 */
export function registerResources(
  server: Server,
  sessionManager: SessionManager
): void {
  // List all available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: getResources(sessionManager),
  }));

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      let content: string;

      if (uri === 'migration://docs/overview') {
        content = getOverviewDoc();
      } else if (uri === 'migration://docs/workflow') {
        content = JSON.stringify(getWorkflowDoc(), null, 2);
      } else if (uri === 'migration://docs/compatibility') {
        content = JSON.stringify(getCompatibilityDoc(), null, 2);
      } else if (uri.startsWith('migration://sessions/')) {
        const match = uri.match(/migration:\/\/sessions\/([^/]+)\/(state|plan)/);
        if (!match) {
          throw new Error(`Invalid session resource URI: ${uri}`);
        }

        const [, sessionId, resourceType] = match;
        const session = sessionManager.getSession(sessionId);

        if (!session) {
          throw new Error(`Session not found: ${sessionId}`);
        }

        if (resourceType === 'state') {
          content = JSON.stringify(session.engine.getState(), null, 2);
        } else if (resourceType === 'plan') {
          const state = session.engine.getState();
          const plan = session.engine.getPlan();

          content = JSON.stringify(
            {
              sessionId,
              currentStepIndex: state.currentStepIndex,
              totalSteps: ANGULAR_MIGRATION_WORKFLOW.length,
              completedSteps: state.completedSteps.length,
              plan,
            },
            null,
            2
          );
        } else {
          throw new Error(`Unknown resource type: ${resourceType}`);
        }
      } else {
        throw new Error(`Unknown resource URI: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: uri.endsWith('.json') || uri.includes('/state') || uri.includes('/plan')
              ? 'application/json'
              : 'text/markdown',
            text: content,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read resource: ${errorMessage}`);
    }
  });
}

/**
 * Generate overview documentation
 */
function getOverviewDoc(): string {
  return `# Angular 14→20 Migration Guide

## Overview

This MCP server provides an automated, step-by-step workflow for migrating Angular applications from version 14 to version 20.

## Key Features

- **25 Automated Steps**: Complete migration workflow covering all major version upgrades
- **Checkpoint System**: Save and resume migration progress at any time
- **Node.js Version Management**: Automatic switching between Node 18/20/22 as needed
- **Validation Tools**: Pre-flight checks for project structure and dependencies
- **Compatibility Matrix**: Package version compatibility for each Angular release

## Migration Process

1. **Pre-migration** (Steps 1-2)
   - Create backup
   - Run pre-migration checks

2. **Angular 15** (Steps 3-6)
   - Update packages to v15
   - Fix breaking changes
   - Update configurations

3. **Angular 16** (Steps 7-10)
   - Update packages to v16
   - Apply standalone components migration
   - Fix breaking changes

4. **Angular 17** (Steps 11-15)
   - Update packages to v17
   - Migrate control flow syntax (@if, @for, @switch)
   - Update configurations

5. **Angular 18** (Steps 16-20)
   - Update packages to v18
   - Apply zoneless migration (optional)
   - Update Material components

6. **Angular 19** (Steps 21-23)
   - Update packages to v19
   - Fix breaking changes

7. **Angular 20** (Steps 24-25)
   - Update packages to v20
   - Final validation

## Getting Started

### 1. Start a Migration Session

\`\`\`javascript
// Use the workflow_start tool
{
  "projectPath": "/path/to/your/angular/project",
  "targetVersion": "20"
}
\`\`\`

### 2. Execute Steps

\`\`\`javascript
// Use the workflow_step_next tool
{
  "sessionId": "mcp-session-1"
}
\`\`\`

### 3. Save Progress

\`\`\`javascript
// Use the state_save_checkpoint tool
{
  "sessionId": "mcp-session-1"
}
\`\`\`

## Tools Available

- **Workflow Management**: Start, execute, skip steps
- **State Management**: Save, load, delete checkpoints
- **Validation**: Validate project, Node version, dependencies
- **Package Management**: Check compatibility, updates

## Resources Available

- \`migration://docs/overview\` - This document
- \`migration://docs/workflow\` - Complete workflow steps
- \`migration://docs/compatibility\` - Package compatibility matrix
- \`migration://sessions/{id}/state\` - Session state
- \`migration://sessions/{id}/plan\` - Session plan with progress

## Prompts Available

- \`analyze-project\` - Analyze project and generate migration plan
- \`troubleshoot-error\` - Get help with migration errors
- \`recommend-approach\` - Get migration approach recommendations
- \`explain-step\` - Get detailed explanation of a workflow step
`;
}

/**
 * Generate workflow documentation
 */
function getWorkflowDoc() {
  return {
    totalSteps: ANGULAR_MIGRATION_WORKFLOW.length,
    steps: ANGULAR_MIGRATION_WORKFLOW.map((step, index) => ({
      index,
      id: step.id,
      title: step.title,
      description: step.description,
      version: step.version,
      requiresConfirmation: step.requiresConfirmation,
      actionCount: step.actions.length,
      validationCount: step.validations?.length || 0,
    })),
  };
}

/**
 * Generate compatibility documentation
 */
function getCompatibilityDoc() {
  return {
    note: 'Package compatibility matrix for Angular versions',
    versions: {
      '15': {
        '@angular/cli': '^15.0.0',
        '@angular/core': '^15.0.0',
        'typescript': '~4.8.0',
        'rxjs': '~7.5.0',
        'zone.js': '~0.12.0',
        'Node.js': '18.x',
      },
      '16': {
        '@angular/cli': '^16.0.0',
        '@angular/core': '^16.0.0',
        'typescript': '~5.0.0',
        'rxjs': '~7.8.0',
        'zone.js': '~0.13.0',
        'Node.js': '18.x',
      },
      '17': {
        '@angular/cli': '^17.0.0',
        '@angular/core': '^17.0.0',
        'typescript': '~5.2.0',
        'rxjs': '~7.8.0',
        'zone.js': '~0.14.0',
        'Node.js': '20.x',
      },
      '18': {
        '@angular/cli': '^18.0.0',
        '@angular/core': '^18.0.0',
        'typescript': '~5.4.0',
        'rxjs': '~7.8.0',
        'zone.js': '~0.14.0',
        'Node.js': '20.x',
      },
      '19': {
        '@angular/cli': '^19.0.0',
        '@angular/core': '^19.0.0',
        'typescript': '~5.6.0',
        'rxjs': '~7.8.0',
        'zone.js': '~0.15.0',
        'Node.js': '22.x',
      },
      '20': {
        '@angular/cli': '^20.0.0',
        '@angular/core': '^20.0.0',
        'typescript': '~5.6.0',
        'rxjs': '~7.8.0',
        'zone.js': '~0.15.0',
        'Node.js': '22.x',
      },
    },
  };
}

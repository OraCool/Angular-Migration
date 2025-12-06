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
import { BREAKING_CHANGES_DB } from '../tools/packages.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * All available MCP resources
 */
function getResources(sessionManager: SessionManager): Resource[] {
  const sessions = sessionManager.listSessions();

  const resources: Resource[] = [
    // AI Assistant Usage Guide - teaches how to extract parameters from natural language
    {
      uri: 'migration://usage-guide',
      name: '🤖 AI Assistant Usage Guide',
      description: 'IMPORTANT: How to extract parameters from natural language migration requests',
      mimeType: 'text/markdown',
    },

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

    // Breaking changes resources (spec-compliant URIs)
    {
      uri: 'breaking-changes://overview',
      name: 'Breaking Changes Overview',
      description: 'Overview of all breaking changes across Angular versions 15-20',
      mimeType: 'application/json',
    },
    {
      uri: 'breaking-changes://v15',
      name: 'Angular 15 Breaking Changes',
      description: 'Breaking changes introduced in Angular 15',
      mimeType: 'text/markdown',
    },
    {
      uri: 'breaking-changes://v16',
      name: 'Angular 16 Breaking Changes',
      description: 'Breaking changes introduced in Angular 16',
      mimeType: 'text/markdown',
    },
    {
      uri: 'breaking-changes://v17',
      name: 'Angular 17 Breaking Changes',
      description: 'Breaking changes introduced in Angular 17',
      mimeType: 'text/markdown',
    },
    {
      uri: 'breaking-changes://v18',
      name: 'Angular 18 Breaking Changes',
      description: 'Breaking changes introduced in Angular 18',
      mimeType: 'text/markdown',
    },
    {
      uri: 'breaking-changes://v19',
      name: 'Angular 19 Breaking Changes',
      description: 'Breaking changes introduced in Angular 19',
      mimeType: 'text/markdown',
    },
    {
      uri: 'breaking-changes://v20',
      name: 'Angular 20 Breaking Changes',
      description: 'Breaking changes introduced in Angular 20',
      mimeType: 'text/markdown',
    },

    // Migration guide resources (spec-compliant URIs)
    {
      uri: 'guide://migrate/v15',
      name: 'Migrate to Angular 15',
      description: 'Step-by-step guide for migrating to Angular 15',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://migrate/v16',
      name: 'Migrate to Angular 16',
      description: 'Step-by-step guide for migrating to Angular 16',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://migrate/v17',
      name: 'Migrate to Angular 17',
      description: 'Step-by-step guide for migrating to Angular 17',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://migrate/v18',
      name: 'Migrate to Angular 18',
      description: 'Step-by-step guide for migrating to Angular 18',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://migrate/v19',
      name: 'Migrate to Angular 19',
      description: 'Step-by-step guide for migrating to Angular 19',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://migrate/v20',
      name: 'Migrate to Angular 20',
      description: 'Step-by-step guide for migrating to Angular 20',
      mimeType: 'text/markdown',
    },

    // Supplementary documentation resources (spec-compliant URIs)
    {
      uri: 'guide://prerequisites',
      name: 'Migration Prerequisites',
      description: 'Prerequisites and preparation for migration',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://backup',
      name: 'Pre-Migration Backup',
      description: 'Creating backups before migration',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://validation',
      name: 'Post-Migration Validation',
      description: 'Validating migration success',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://troubleshooting',
      name: 'Troubleshooting Guide',
      description: 'Common issues and solutions',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://standalone-migration',
      name: 'Standalone Components Migration',
      description: 'Optional migration to standalone components',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://signals-migration',
      name: 'Signals Migration',
      description: 'Optional migration to Angular Signals',
      mimeType: 'text/markdown',
    },
    {
      uri: 'guide://control-flow-migration',
      name: 'Control Flow Migration',
      description: 'Optional migration to new control flow syntax',
      mimeType: 'text/markdown',
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

      if (uri === 'migration://usage-guide') {
        content = getUsageGuide();
      } else if (uri === 'migration://docs/overview') {
        content = getOverviewDoc();
      } else if (uri === 'migration://docs/workflow') {
        content = JSON.stringify(getWorkflowDoc(), null, 2);
      } else if (uri === 'migration://docs/compatibility') {
        content = JSON.stringify(getCompatibilityDoc(), null, 2);
      } else if (uri === 'breaking-changes://overview') {
        content = JSON.stringify(getBreakingChangesOverview(), null, 2);
      } else if (uri.startsWith('breaking-changes://v')) {
        const version = uri.replace('breaking-changes://v', '');
        content = await getBreakingChangesMarkdown(version);
      } else if (uri.startsWith('guide://migrate/v')) {
        const version = uri.replace('guide://migrate/v', '');
        content = await getMigrationGuideMarkdown(version);
      } else if (uri === 'guide://prerequisites') {
        content = await readDocFile('00-prerequisites.md');
      } else if (uri === 'guide://backup') {
        content = await readDocFile('01-pre-migration-backup.md');
      } else if (uri === 'guide://validation') {
        content = await readDocFile('08-post-migration-validation.md');
      } else if (uri === 'guide://troubleshooting') {
        content = await readDocFile('troubleshooting.md');
      } else if (uri === 'guide://standalone-migration') {
        content = await readDocFile('optional-standalone-migration.md');
      } else if (uri === 'guide://signals-migration') {
        content = await readDocFile('optional-signals-migration.md');
      } else if (uri === 'guide://control-flow-migration') {
        content = await readDocFile('optional-control-flow-migration.md');
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
- \`migration://breaking-changes/overview\` - Breaking changes overview
- \`migration://breaking-changes/{version}\` - Breaking changes for specific version (15-20)
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

/**
 * Generate breaking changes overview
 */
function getBreakingChangesOverview() {
  const versions = Object.keys(BREAKING_CHANGES_DB).sort();
  const overview = {
    description: 'Breaking changes across Angular versions 15-20',
    versions: versions,
    summary: {} as Record<string, { packages: number; totalChanges: number }>,
  };

  // Calculate summary for each version
  for (const version of versions) {
    const versionChanges = BREAKING_CHANGES_DB[version];
    const packages = Object.keys(versionChanges);
    let totalChanges = 0;

    for (const pkg of packages) {
      totalChanges += versionChanges[pkg].length;
    }

    overview.summary[version] = {
      packages: packages.length,
      totalChanges,
    };
  }

  return overview;
}

/**
 * Generate breaking changes for a specific version
 */
function getBreakingChangesForVersion(version: string) {
  const versionChanges = BREAKING_CHANGES_DB[version];

  if (!versionChanges) {
    throw new Error(`No breaking changes data for Angular ${version}`);
  }

  const packages = Object.keys(versionChanges);
  let totalChanges = 0;

  for (const pkg of packages) {
    totalChanges += versionChanges[pkg].length;
  }

  return {
    version,
    packages: packages.length,
    totalChanges,
    changes: versionChanges,
    notes: [
      `Angular ${version} introduced ${totalChanges} breaking changes across ${packages.length} packages`,
      'Review each change carefully before upgrading',
      'Test thoroughly after applying updates',
      `Visit https://update.angular.io for interactive migration guide`,
    ],
  };
}

/**
 * Read documentation file from migrations/docs
 */
async function readDocFile(filename: string): Promise<string> {
  const docPath = path.join(process.cwd(), 'migrations', 'docs', filename);
  if (!fs.existsSync(docPath)) {
    return `# Documentation Not Found\n\nFile: ${filename}\n\nThis documentation file is not yet available.`;
  }
  return fs.readFileSync(docPath, 'utf-8');
}

/**
 * Get migration guide markdown for a specific version
 */
async function getMigrationGuideMarkdown(version: string): Promise<string> {
  const versionMap: Record<string, string> = {
    '15': '02-migrate-to-angular-15.md',
    '16': '03-migrate-to-angular-16.md',
    '17': '04-migrate-to-angular-17.md',
    '18': '05-migrate-to-angular-18.md',
    '19': '06-migrate-to-angular-19.md',
    '20': '07-migrate-to-angular-20.md',
  };

  const filename = versionMap[version];
  if (!filename) {
    return `# Migration Guide Not Found\n\nNo migration guide available for Angular ${version}`;
  }

  return readDocFile(filename);
}

/**
 * Get breaking changes markdown from PowerShell modules
 */
async function getBreakingChangesMarkdown(version: string): Promise<string> {
  const psPath = path.join(process.cwd(), 'migrations', 'scripts', 'modules', 'breaking-changes', `v${version}.psm1`);

  if (!fs.existsSync(psPath)) {
    return `# Breaking Changes for Angular ${version}\n\nNo breaking changes documentation available for this version.`;
  }

  try {
    const content = fs.readFileSync(psPath, 'utf-8');

    // Extract comments and documentation from PowerShell module
    const lines = content.split('\n');
    let markdown = `# Angular ${version} Breaking Changes\n\n`;
    markdown += `> Extracted from: \`migrations/scripts/modules/breaking-changes/v${version}.psm1\`\n\n`;

    let currentSection = '';
    let inComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract comment blocks
      if (trimmed.startsWith('#')) {
        const commentText = trimmed.slice(1).trim();
        if (commentText.length > 0) {
          markdown += `${commentText}\n`;
          inComment = true;
        }
      } else if (inComment && trimmed.length > 0) {
        markdown += '\n';
        inComment = false;
      }

      // Extract function names as section headers
      if (trimmed.startsWith('function ')) {
        const funcName = trimmed.match(/function\s+([A-Za-z0-9-_]+)/)?.[1];
        if (funcName) {
          currentSection = funcName.replace(/-/g, ' ');
          markdown += `\n## ${currentSection}\n\n`;
        }
      }
    }

    markdown += `\n\n---\n\n*For more information, visit: [Angular Update Guide](https://update.angular.io)*\n`;

    return markdown;
  } catch (error) {
    return `# Breaking Changes for Angular ${version}\n\nError reading documentation: ${error}`;
  }
}

/**
 * Generate AI Assistant Usage Guide
 * This teaches AI assistants how to extract parameters from natural language
 */
function getUsageGuide(): string {
  return `# 🤖 Angular Migration MCP Server - AI Assistant Guide

## CRITICAL: Parameter Extraction from Natural Language

When users give natural language migration commands like:
- "migrate angular application (folder /path/to/project) from version 14 to 15"
- "upgrade my app at /Users/john/myapp from Angular 16 to 20"
- "start migration for project in C:\\dev\\angular-app"
- "migrate the app at C:/Users/jane/projects/my-app to version 18"

**YOU MUST EXTRACT AND PROVIDE ALL REQUIRED PARAMETERS EXPLICITLY**.

### ❌ WRONG - Do NOT pass empty objects:

\`\`\`
session_create with arguments: {}
\`\`\`

### ✅ CORRECT - Extract path from user's message:

Unix/macOS/Linux:
\`\`\`
session_create with arguments: {
  "projectPath": "/Users/siarheiskuratovich/dev/ai/migrations/angmig/current_app"
}
\`\`\`

Windows:
\`\`\`
session_create with arguments: {
  "projectPath": "C:\\\\Users\\\\username\\\\dev\\\\my-angular-app"
}
\`\`\`
or
\`\`\`
session_create with arguments: {
  "projectPath": "C:/Users/username/dev/my-angular-app"
}
\`\`\`

---

## Parameter Extraction Patterns

### Pattern 1: Folder/Directory in Parentheses
**User says**: "migrate angular application (folder /path/to/app) from v14 to v15"

**Extract**:
- projectPath: "/path/to/app"
- fromVersion: "14"
- toVersion: "15"

**Windows example**: "migrate app (folder C:\\\\projects\\\\myapp) from v14 to v15"
**Extract**: projectPath: "C:\\\\projects\\\\myapp"

### Pattern 2: "at" or "in" Keywords
**User says**: "upgrade my Angular project at /home/user/myapp to version 20"

**Extract**:
- projectPath: "/home/user/myapp"
- toVersion: "20"

**Windows example**: "upgrade project at C:/dev/angular-app to version 20"
**Extract**: projectPath: "C:/dev/angular-app"

### Pattern 3: Explicit Path Statement
**User says**: "start migration for /Users/dev/angular-project, target is Angular 17"

**Extract**:
- projectPath: "/Users/dev/angular-project"
- toVersion: "17"

**Windows example**: "start migration for D:\\\\workspace\\\\angular-app, target is Angular 17"
**Extract**: projectPath: "D:\\\\workspace\\\\angular-app"

### Pattern 4: Current Directory Reference
**User says**: "migrate the current directory from Angular 15 to 16"

**Extract**:
- projectPath: [Use process.cwd() or ask user for explicit path]
- fromVersion: "15"
- toVersion: "16"

---

## Complete Migration Workflow

When a user requests a full migration, follow these steps **IN ORDER**:

### Step 1: Extract Parameters from User Request

From: "migrate angular application (folder /path/to/app) from version 14 to version 15"

Extract:
- **projectPath**: "/path/to/app"
- **fromVersion**: "14"
- **toVersion**: "15"

### Step 2: Create Migration Session

\`\`\`
Tool: session_create
Arguments: {
  "projectPath": "/path/to/app"
}
\`\`\`

Response will include: \`{ "sessionId": "mcp-xyz123", ... }\`

**SAVE THIS SESSION ID** for all subsequent steps.

### Step 3: Validate Prerequisites

\`\`\`
Tool: migration_stage_validate_node
Arguments: {}
\`\`\`

This checks Node.js v22 requirement.

### Step 4: Run Pre-Migration Stage

\`\`\`
Tool: migration_stage_pre_migration
Arguments: {
  "sessionId": "mcp-xyz123"
}
\`\`\`

This is a **task-based tool** - it returns immediately with a task ID. Monitor progress.

### Step 5: Run Version Upgrade

For Angular 14 → 15:

\`\`\`
Tool: migration_stage_v15
Arguments: {
  "sessionId": "mcp-xyz123"
}
\`\`\`

**Wait for completion**. The success message will say:

> 📋 Next Step: Apply breaking changes fixes for Angular 15
> Use tool: breaking_changes_fix with targetVersion: "15"

### Step 6: Apply Breaking Changes Fixes

\`\`\`
Tool: breaking_changes_fix
Arguments: {
  "sessionId": "mcp-xyz123",
  "targetVersion": "15"
}
\`\`\`

This runs automated fix scripts for Angular 15 breaking changes.

### Step 7: Run Post-Migration Validation

\`\`\`
Tool: migration_stage_post_migration
Arguments: {
  "sessionId": "mcp-xyz123"
}
\`\`\`

This validates the migration succeeded.

---

## Common User Request Patterns

### Pattern: "Migrate from X to Y"

**User**: "migrate angular application (folder /path) from version 14 to version 15"

**Your Action**:
1. Extract: projectPath="/path", fromVersion="14", toVersion="15"
2. Call \`session_create\` with projectPath
3. Get sessionId from response
4. Call \`migration_stage_pre_migration\` with sessionId
5. Call \`migration_stage_v15\` with sessionId
6. Call \`breaking_changes_fix\` with sessionId and targetVersion="15"
7. Call \`migration_stage_post_migration\` with sessionId

### Pattern: "What should I do next?"

**User**: "what's next for my migration?"

**Your Action**:
1. Call \`session_list\` to find most recent session
2. Call \`migration_stage_get_current\` with sessionId
3. Read the \`nextAction\` field
4. Execute the recommended tool

### Pattern: "Check migration status"

**User**: "check the status of my migration"

**Your Action**:
1. Call \`session_list\`
2. Call \`migration_stage_get_all\` with most recent sessionId
3. Show user which stages are completed, in-progress, or pending

---

## Tool Parameter Requirements

### session_create
**REQUIRED**:
- \`projectPath\` (string): Absolute path to Angular project root

**Example**:
\`\`\`json
{
  "projectPath": "/Users/siarheiskuratovich/dev/ai/migrations/angmig/current_app"
}
\`\`\`

### All migration_stage_* tools
**REQUIRED**:
- \`sessionId\` (string): Session ID from session_create

**Example**:
\`\`\`json
{
  "sessionId": "mcp-abc123"
}
\`\`\`

### breaking_changes_fix
**REQUIRED**:
- \`targetVersion\` (string): Angular version to fix (e.g., "15", "16", "17", "19", "20")

**OPTIONAL**:
- \`sessionId\` (string): Session ID (uses most recent if omitted)
- \`dryRun\` (boolean): Preview changes without applying (default: false)

**Example**:
\`\`\`json
{
  "sessionId": "mcp-abc123",
  "targetVersion": "15",
  "dryRun": false
}
\`\`\`

---

## Error Handling

### Error: "Missing required parameter: projectPath"

**Cause**: You passed \`{}\` or omitted projectPath

**Fix**: Extract path from user's message and provide it explicitly:

\`\`\`json
{
  "projectPath": "/extracted/path/from/user/message"
}
\`\`\`

### Error: "Session not found"

**Cause**: Invalid sessionId or session was deleted

**Fix**:
1. Call \`session_list\` to see active sessions
2. Use a valid sessionId or create a new session

### Error: "Node.js version mismatch"

**Cause**: User doesn't have Node.js v22 installed

**Fix**: Tell user to install Node.js v22:
- macOS/Linux: \`nvm install 22 && nvm use 22\`
- Windows: Download from https://nodejs.org

---

## Best Practices

### ✅ DO:
- Extract ALL parameters from user's natural language input
- Use absolute paths (not relative)
- Save sessionId from session_create response
- Follow the recommended next action from each stage
- Check stage status before proceeding
- Run breaking_changes_fix after each version upgrade

### ❌ DON'T:
- Pass empty objects \`{}\` when parameters are required
- Guess paths - extract from user's message or ask
- Skip pre-migration stage (it creates backups!)
- Skip breaking changes fixes (they prevent build errors)
- Run multiple stages in parallel (they're sequential)

---

## Quick Reference

**Start migration**: session_create → migration_stage_pre_migration → migration_stage_v{X}
**After upgrade**: breaking_changes_fix
**Check status**: migration_stage_get_current
**List all stages**: migration_stage_get_all
**Validate Node.js**: migration_stage_validate_node
**Final validation**: migration_stage_post_migration

---

## Example Complete Flow

### Example 1: Unix/macOS/Linux
User says: "migrate angular application (folder /Users/john/myapp) from version 14 to version 15"

Your exact steps:

\`\`\`javascript
// Step 1: Create session
session_create({ projectPath: "/Users/john/myapp" })
// Response: { sessionId: "mcp-xyz", ... }

// Step 2: Validate Node.js
migration_stage_validate_node({})
// Response: { success: true, version: "v22.11.0" }

// Step 3: Pre-migration
migration_stage_pre_migration({ sessionId: "mcp-xyz" })
// Task created - wait for completion
\`\`\`

### Example 2: Windows
User says: "migrate the app at C:\\\\dev\\\\my-angular-app from v16 to v17"

Your exact steps:

\`\`\`javascript
// Step 1: Create session (note: use forward slashes or escaped backslashes)
session_create({ projectPath: "C:\\\\dev\\\\my-angular-app" })
// or
session_create({ projectPath: "C:/dev/my-angular-app" })
// Response: { sessionId: "mcp-abc", ... }

// Step 2: Validate Node.js
migration_stage_validate_node({})
// Response: { success: true, version: "v22.11.0" }

// Step 3: Pre-migration
migration_stage_pre_migration({ sessionId: "mcp-abc" })
// Task created - wait for completion

// Step 4: Upgrade to v15
migration_stage_v15({ sessionId: "mcp-xyz" })
// Task created - wait for completion
// Response includes: "Next Step: Apply breaking changes fixes for Angular 15"

// Step 5: Fix breaking changes
breaking_changes_fix({ 
  sessionId: "mcp-xyz",
  targetVersion: "15"
})
// Response: { success: true, filesModified: [...] }

// Step 6: Post-migration validation
migration_stage_post_migration({ sessionId: "mcp-xyz" })
// Task created - validates everything succeeded
\`\`\`

---

**Remember**: Always extract parameters explicitly. Never pass empty objects when parameters are required!
`;
}

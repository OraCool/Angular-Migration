/**
 * ACP Migration Tools
 *
 * Tools that can be invoked by the AI agent to perform migration tasks
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Calculate scripts directory
// When compiled to dist/acp/tools.js, scripts are at dist/scripts/
// So we go up one level from dist/acp/ to dist/, then into scripts/
const SCRIPTS_DIR = join(__dirname, '../scripts');

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  handler: (params: any, context: ToolContext) => Promise<any>;
}

export interface ToolContext {
  projectPath: string;
  workshopRoot: string;
  currentVersion: string;
  targetVersion: string;
}

/**
 * Execute command with proper Node version
 */
async function executeCommand(
  command: string,
  nodeVersion: string,
  projectPath: string
): Promise<{ success: boolean; output: string; error?: string }> {
  const scriptPath = join(SCRIPTS_DIR, 'run-migration-step.sh');
  const escapedCommand = command.replace(/'/g, "'\\''");
  const wrappedCommand = `bash "${scriptPath}" "${nodeVersion}" "${projectPath}" '${escapedCommand}'`;

  return new Promise((resolve) => {
    const child = spawn(wrappedCommand, [], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: code !== 0 ? stderr : undefined,
      });
    });
  });
}

/**
 * Tool: Run Migration Command
 */
export const runMigrationCommand: Tool = {
  name: 'run_migration_command',
  description: 'Execute an Angular migration command with the correct Node.js version. Use this to run npm, ng, or bash commands.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute (e.g., "npm install", "ng update @angular/core")',
      },
      nodeVersion: {
        type: 'string',
        description: 'Required Node.js version (18, 20, or 22)',
        enum: ['18', '20', '22'],
      },
    },
    required: ['command', 'nodeVersion'],
  },
  handler: async (params: { command: string; nodeVersion: string }, context: ToolContext) => {
    const result = await executeCommand(params.command, params.nodeVersion, context.projectPath);
    return {
      success: result.success,
      output: result.output,
      error: result.error,
    };
  },
};

/**
 * Tool: Read Package JSON
 */
export const readPackageJson: Tool = {
  name: 'read_package_json',
  description: 'Read and analyze package.json to see current dependencies and versions',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (params: {}, context: ToolContext) => {
    const pkgPath = path.join(context.projectPath, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);

    return {
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      angularVersion: pkg.dependencies?.['@angular/core'] || 'unknown',
    };
  },
};

/**
 * Tool: Update Packages
 */
export const updatePackages: Tool = {
  name: 'update_packages',
  description: 'Update ALL packages (Angular, Material, TypeScript, third-party) to versions compatible with target Angular version using the compatibility matrix',
  parameters: {
    type: 'object',
    properties: {
      targetVersion: {
        type: 'string',
        description: 'Target Angular version (15, 16, 17, 18, 19, 20)',
        enum: ['15', '16', '17', '18', '19', '20'],
      },
    },
    required: ['targetVersion'],
  },
  handler: async (params: { targetVersion: string }, context: ToolContext) => {
    const command = `bash "${join(SCRIPTS_DIR, 'update-all-packages.sh')}" ${params.targetVersion}`;
    const nodeVersion = parseInt(params.targetVersion) >= 19 ? '22' : parseInt(params.targetVersion) >= 17 ? '20' : '18';

    const result = await executeCommand(command, nodeVersion, context.projectPath);
    return result;
  },
};

/**
 * Tool: Fix Breaking Changes
 */
export const fixBreakingChanges: Tool = {
  name: 'fix_breaking_changes',
  description: 'Apply automated fixes for known breaking changes in a specific Angular version (Material Chips API, PerfectScrollbar removal, etc.)',
  parameters: {
    type: 'object',
    properties: {
      version: {
        type: 'string',
        description: 'Angular version that needs breaking changes fixes',
        enum: ['16', '17', '18', '19', '20'],
      },
    },
    required: ['version'],
  },
  handler: async (params: { version: string }, context: ToolContext) => {
    const scriptName = `fix-angular-${params.version}-breaking-changes.sh`;
    const scriptPath = join(SCRIPTS_DIR, scriptName);

    // Check if script exists
    try {
      await fs.access(scriptPath);
    } catch {
      return {
        success: false,
        error: `No breaking changes fix script found for Angular ${params.version}`,
      };
    }

    const command = `bash "${scriptPath}"`;
    const nodeVersion = parseInt(params.version) >= 19 ? '22' : parseInt(params.version) >= 17 ? '20' : '18';

    const result = await executeCommand(command, nodeVersion, context.projectPath);
    return result;
  },
};

/**
 * Tool: Read File
 */
export const readFile: Tool = {
  name: 'read_file',
  description: 'Read contents of a file in the project to analyze code or configuration',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Relative path to file from project root (e.g., "src/app/app.module.ts")',
      },
    },
    required: ['filePath'],
  },
  handler: async (params: { filePath: string }, context: ToolContext) => {
    const fullPath = path.join(context.projectPath, params.filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        success: true,
        content,
        path: params.filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};

/**
 * Tool: Write File
 */
export const writeFile: Tool = {
  name: 'write_file',
  description: 'Write or update a file in the project. Use this to apply code fixes.',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Relative path to file from project root',
      },
      content: {
        type: 'string',
        description: 'Complete file content to write',
      },
    },
    required: ['filePath', 'content'],
  },
  handler: async (params: { filePath: string; content: string }, context: ToolContext) => {
    const fullPath = path.join(context.projectPath, params.filePath);
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, params.content, 'utf-8');
      return {
        success: true,
        path: params.filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};

/**
 * Tool: Fix Standalone Migration Issues
 */
export const fixStandaloneMigrationIssues: Tool = {
  name: 'fix_standalone_issues',
  description: 'Fix common issues after standalone migration: Material Chips API migration (mat-chip-list → mat-chip-grid) and missing dependencies (luxon for ngx-material-timepicker)',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (_params: {}, context: ToolContext) => {
    const scriptPath = join(SCRIPTS_DIR, 'fix-standalone-migration-issues.sh');
    const nodeVersion = '18'; // Default to Node 18 for fix scripts

    const result = await executeCommand(`bash "${scriptPath}"`, nodeVersion, context.projectPath);
    return result;
  },
};

/**
 * All available tools
 */
export const MIGRATION_TOOLS: Tool[] = [
  runMigrationCommand,
  readPackageJson,
  updatePackages,
  fixBreakingChanges,
  fixStandaloneMigrationIssues,
  readFile,
  writeFile,
];

/**
 * MCP Prompts Registration
 * Provides templated guidance for common migration tasks
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from '../session/manager.js';
import { ANGULAR_MIGRATION_WORKFLOW } from '@angular-migration/workflow-engine';

/**
 * All available MCP prompts
 */
const PROMPTS: Prompt[] = [
  {
    name: 'analyze-project',
    description: 'Analyze Angular project and generate migration plan',
    arguments: [
      {
        name: 'projectPath',
        description: 'Absolute path to the Angular project',
        required: true,
      },
    ],
  },
  {
    name: 'troubleshoot-error',
    description: 'Get help troubleshooting a migration error',
    arguments: [
      {
        name: 'error',
        description: 'The error message or description',
        required: true,
      },
      {
        name: 'stepId',
        description: 'The workflow step ID where error occurred (optional)',
        required: false,
      },
    ],
  },
  {
    name: 'recommend-approach',
    description: 'Get migration approach recommendations',
    arguments: [
      {
        name: 'currentVersion',
        description: 'Current Angular version',
        required: true,
      },
      {
        name: 'targetVersion',
        description: 'Target Angular version',
        required: true,
      },
      {
        name: 'projectSize',
        description: 'Project size: small, medium, or large',
        required: false,
      },
    ],
  },
  {
    name: 'explain-step',
    description: 'Get detailed explanation of a workflow step',
    arguments: [
      {
        name: 'stepId',
        description: 'The workflow step ID to explain',
        required: true,
      },
    ],
  },
];

/**
 * Register all prompts with the MCP server
 */
export function registerPrompts(
  server: Server,
  sessionManager: SessionManager
): void {
  // List all available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS,
  }));

  // Handle prompt requests
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>;

      switch (name) {
        case 'analyze-project':
          messages = await getAnalyzeProjectPrompt(args);
          break;
        case 'troubleshoot-error':
          messages = await getTroubleshootErrorPrompt(args);
          break;
        case 'recommend-approach':
          messages = await getRecommendApproachPrompt(args);
          break;
        case 'explain-step':
          messages = await getExplainStepPrompt(args);
          break;
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }

      return {
        messages,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate prompt: ${errorMessage}`);
    }
  });
}

/**
 * Generate project analysis prompt
 */
async function getAnalyzeProjectPrompt(
  args: Record<string, string> | undefined
): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
  const projectPath = args?.projectPath;

  if (!projectPath) {
    throw new Error('projectPath argument is required');
  }

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Analyze the Angular project at "${projectPath}" and provide:

1. Current Angular version
2. Project structure assessment (components, modules, services count)
3. Migration complexity estimation (low/medium/high)
4. Recommended migration approach
5. Estimated migration time
6. List of potential breaking changes
7. Pre-migration checklist

Use the following tools to gather information:
- validate_project: Check project structure
- validate_dependencies: Check package versions
- packages_check_updates: Identify outdated packages

Provide a comprehensive analysis report in markdown format.`,
      },
    },
  ];
}

/**
 * Generate troubleshooting prompt
 */
async function getTroubleshootErrorPrompt(
  args: Record<string, string> | undefined
): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
  const error = args?.error;
  const stepId = args?.stepId;

  if (!error) {
    throw new Error('error argument is required');
  }

  let stepContext = '';
  if (stepId) {
    const step = ANGULAR_MIGRATION_WORKFLOW.find(s => s.id === stepId);
    if (step) {
      stepContext = `\n\nContext: This error occurred during step "${step.title}" (${step.description})`;
    }
  }

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Help me troubleshoot this Angular migration error:

\`\`\`
${error}
\`\`\`${stepContext}

Please provide:
1. Root cause analysis
2. Step-by-step fix instructions
3. Code examples if applicable
4. Prevention tips for future migrations
5. Related documentation links

Focus on practical, actionable solutions.`,
      },
    },
  ];
}

/**
 * Generate approach recommendation prompt
 */
async function getRecommendApproachPrompt(
  args: Record<string, string> | undefined
): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
  const currentVersion = args?.currentVersion;
  const targetVersion = args?.targetVersion;
  const projectSize = args?.projectSize || 'medium';

  if (!currentVersion || !targetVersion) {
    throw new Error('currentVersion and targetVersion arguments are required');
  }

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Recommend the best migration approach for:

- **Current Version**: Angular ${currentVersion}
- **Target Version**: Angular ${targetVersion}
- **Project Size**: ${projectSize}

Please provide:
1. **Migration Strategy**: Incremental vs. direct upgrade
2. **Phase Breakdown**: Logical grouping of version updates
3. **Time Estimates**: Per phase and total
4. **Risk Assessment**: Potential blockers and mitigation strategies
5. **Team Coordination**: Recommendations for team workflow
6. **Testing Strategy**: What to test at each phase
7. **Rollback Plan**: How to revert if issues arise

Use the workflow_get_plan tool to see available migration steps.`,
      },
    },
  ];
}

/**
 * Generate step explanation prompt
 */
async function getExplainStepPrompt(
  args: Record<string, string> | undefined
): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
  const stepId = args?.stepId;

  if (!stepId) {
    throw new Error('stepId argument is required');
  }

  const step = ANGULAR_MIGRATION_WORKFLOW.find(s => s.id === stepId);

  if (!step) {
    throw new Error(`Step not found: ${stepId}`);
  }

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Explain the following migration step in detail:

**Step**: ${step.title}
**Description**: ${step.description}
${step.version ? `**Angular Version**: ${step.version}` : ''}

Please provide:
1. **Purpose**: Why this step is necessary
2. **Actions**: Detailed breakdown of what will be done
   ${step.actions.map((a, i) => `   ${i + 1}. ${a.description}`).join('\n   ')}
3. **Expected Changes**: What files/code will be modified
4. **Validation**: How to verify the step succeeded
   ${step.validations?.map((v, i) => `   ${i + 1}. ${v.description}`).join('\n   ') || '   (No validations defined)'}
5. **Common Issues**: Potential problems and solutions
6. **Manual Intervention**: When human review is needed${step.requiresConfirmation ? ' (⚠️ This step requires confirmation)' : ''}
7. **Related Documentation**: Links to official Angular docs

Make it educational and actionable.`,
      },
    },
  ];
}

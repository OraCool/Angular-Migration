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
  {
    name: 'review-breaking-changes',
    description: 'Guide for systematically reviewing breaking changes for your migration',
    arguments: [
      {
        name: 'fromVersion',
        description: 'Current Angular version (e.g., "14")',
        required: true,
      },
      {
        name: 'toVersion',
        description: 'Target Angular version (e.g., "20")',
        required: true,
      },
      {
        name: 'projectPath',
        description: 'Absolute path to the Angular project',
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
        case 'review-breaking-changes':
          messages = await getReviewBreakingChangesPrompt(args);
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

/**
 * Generate breaking changes review prompt
 */
async function getReviewBreakingChangesPrompt(
  args: Record<string, string> | undefined
): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
  const fromVersion = args?.fromVersion;
  const toVersion = args?.toVersion;
  const projectPath = args?.projectPath;

  if (!fromVersion || !toVersion || !projectPath) {
    throw new Error('fromVersion, toVersion, and projectPath arguments are required');
  }

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Guide me through reviewing breaking changes for migrating my Angular project from version ${fromVersion} to ${toVersion}.

**Project Path**: ${projectPath}

Please follow this systematic approach:

## Step 1: Get Overview
First, retrieve the breaking changes overview:
- Use the resource: \`migration://breaking-changes/overview\`
- This shows the summary across all versions

## Step 2: Get Project-Specific Analysis
Use the tool \`packages_get_breaking_changes\` with:
- projectPath: "${projectPath}"
- fromVersion: "${fromVersion}"
- toVersion: "${toVersion}"

This will filter breaking changes to only packages used in the project.

## Step 3: Review by Priority
Organize the breaking changes by priority:

### 🔴 CRITICAL (Must Fix Immediately)
- Breaking API removals
- Type system changes
- Build/compilation errors

### 🟡 IMPORTANT (Fix During Migration)
- Deprecated API usage
- Behavioral changes
- Performance impacts

### 🟢 MINOR (Fix Post-Migration)
- Style/convention changes
- Optional optimizations
- Documentation updates

## Step 4: Create Action Plan
For each breaking change:
1. **Identify Impact**: Which files/components are affected?
2. **Plan Fix**: What code changes are needed?
3. **Estimate Effort**: Hours/days to implement
4. **Dependencies**: What must be fixed first?

## Step 5: Version-by-Version Review
Review changes for each intermediate version:
${Array.from({ length: parseInt(toVersion) - parseInt(fromVersion) }, (_, i) => {
  const version = parseInt(fromVersion) + i + 1;
  return `- **Angular ${version}**: \`migration://breaking-changes/${version}\``;
}).join('\n')}

## Step 6: Testing Strategy
For each breaking change category:
- **Forms Changes**: Test all form submissions and validations
- **Router Changes**: Test all navigation and guards
- **Component Changes**: Test all component interactions
- **Build Changes**: Verify build succeeds with new configurations

## Step 7: Documentation
Create a migration checklist:
- [ ] Review all breaking changes
- [ ] Identify affected code sections
- [ ] Create fix branches for each major change
- [ ] Update tests for new APIs
- [ ] Update documentation
- [ ] Train team on new patterns

## Output Format
Provide:
1. **Executive Summary**: Total breaking changes and estimated effort
2. **Prioritized List**: Breaking changes sorted by criticality
3. **Affected Areas**: Which parts of the codebase need updates
4. **Migration Timeline**: Suggested order of fixes
5. **Risk Assessment**: Potential blockers or complex changes
6. **Quick Wins**: Easy fixes that can be done first

Make the review comprehensive yet actionable. Focus on helping the developer understand WHAT needs to change and WHY.`,
      },
    },
  ];
}

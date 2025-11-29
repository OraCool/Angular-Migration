/**
 * Issue-Agent Mapping
 * Maps migration errors to appropriate workshop agent roles
 * Based on workshop/docs/guides/issue-agent-mapping.md
 */

import { config } from '../config.js';

export interface IssueMapping {
  pattern: RegExp;
  category: string;
  agent: string;
  priority: 'critical' | 'medium' | 'low';
  description: string;
  workshopPrompt?: string; // Path to workshop agent role file
}

/**
 * Issue mappings derived from workshop documentation
 */
export const ISSUE_MAPPINGS: IssueMapping[] = [
  // Build Errors
  {
    pattern: /TS2322|TS2339|TS2345|TS2307/,
    category: 'Build Errors',
    agent: 'BuildFixer',
    priority: 'critical',
    description: 'TypeScript compilation errors',
    workshopPrompt: 'agents/roles/build_fixer.md',
  },
  {
    pattern: /Module resolution|Cannot find module/i,
    category: 'Build Errors',
    agent: 'BuildFixer',
    priority: 'critical',
    description: 'Module resolution errors',
    workshopPrompt: 'agents/roles/build_fixer.md',
  },
  {
    pattern: /polyfills/i,
    category: 'Build Errors',
    agent: 'BuildFixer',
    priority: 'critical',
    description: 'Polyfills configuration format issues',
    workshopPrompt: 'agents/roles/build_fixer.md',
  },
  
  // Material Issues
  {
    pattern: /MatLegacy|@angular\/material.*legacy/i,
    category: 'Material Issues',
    agent: 'StyleMigrator',
    priority: 'critical',
    description: 'MatLegacy imports (must remove before v17)',
    workshopPrompt: 'agents/roles/style_migrator.md',
  },
  {
    pattern: /Material.*MDC|mdc-/i,
    category: 'Material Issues',
    agent: 'StyleMigrator',
    priority: 'critical',
    description: 'Material MDC migration',
    workshopPrompt: 'agents/roles/style_migrator.md',
  },

  // Component Issues
  {
    pattern: /Component.*not rendering|ngModule/i,
    category: 'Component Issues',
    agent: 'CodeModernizer',
    priority: 'critical',
    description: 'Component rendering or module import issues',
    workshopPrompt: 'agents/roles/code_modernizer.md',
  },
  {
    pattern: /template.*expression|{{ in }}/i,
    category: 'Component Issues',
    agent: 'CodeModernizer',
    priority: 'critical',
    description: 'Template expression errors',
    workshopPrompt: 'agents/roles/code_modernizer.md',
  },

  // HTTP/Services
  {
    pattern: /HttpClientModule|provideHttpClient/i,
    category: 'HTTP/Services',
    agent: 'LogicRefactorer',
    priority: 'critical',
    description: 'HTTP client migration',
    workshopPrompt: 'agents/roles/logic_refactorer.md',
  },
  {
    pattern: /toPromise|lastValueFrom/i,
    category: 'HTTP/Services',
    agent: 'LogicRefactorer',
    priority: 'critical',
    description: 'RxJS toPromise deprecation',
    workshopPrompt: 'agents/roles/logic_refactorer.md',
  },
  {
    pattern: /Guard|CanActivate|Router/i,
    category: 'HTTP/Services',
    agent: 'LogicRefactorer',
    priority: 'medium',
    description: 'Guard migration (class to functional)',
    workshopPrompt: 'agents/roles/logic_refactorer.md',
  },

  // Dependencies
  {
    pattern: /ngx-perfect-scrollbar|ng-in-viewport/i,
    category: 'Dependencies',
    agent: 'DependencyAuditor',
    priority: 'critical',
    description: 'View Engine library replacement needed',
    workshopPrompt: 'agents/roles/dependency_auditor.md',
  },
  {
    pattern: /AG Grid|ag-grid/i,
    category: 'Dependencies',
    agent: 'StyleMigrator',
    priority: 'critical',
    description: 'AG Grid upgrade (v28 → v31)',
    workshopPrompt: 'agents/roles/style_migrator.md',
  },
  {
    pattern: /peer dependency|ERESOLVE/i,
    category: 'Dependencies',
    agent: 'DependencyAuditor',
    priority: 'medium',
    description: 'Peer dependency warnings',
    workshopPrompt: 'agents/roles/dependency_auditor.md',
  },

  // Infrastructure
  {
    pattern: /Node\.?js|node version/i,
    category: 'Infrastructure',
    agent: 'InfraPerfOptimizer',
    priority: 'critical',
    description: 'Node.js version mismatch',
    workshopPrompt: 'agents/roles/infra_perf_optimizer.md',
  },
  {
    pattern: /Dockerfile|docker/i,
    category: 'Infrastructure',
    agent: 'InfraPerfOptimizer',
    priority: 'critical',
    description: 'Docker configuration update needed',
    workshopPrompt: 'agents/roles/infra_perf_optimizer.md',
  },

  // Tests
  {
    pattern: /Karma|Vitest|test.*fail/i,
    category: 'Unit Tests',
    agent: 'UnitTestMigrator',
    priority: 'critical',
    description: 'Unit test failures',
    workshopPrompt: 'agents/roles/unit_test_migrator.md',
  },
  {
    pattern: /Protractor|Playwright|e2e/i,
    category: 'E2E Tests',
    agent: 'E2ETestMigrator',
    priority: 'medium',
    description: 'E2E test migration needed',
    workshopPrompt: 'agents/roles/e2e_test_migrator.md',
  },

  // Version Issues
  {
    pattern: /Angular version|@angular\/core/i,
    category: 'Version Issues',
    agent: 'BuildFixer',
    priority: 'critical',
    description: 'Angular version mismatch',
    workshopPrompt: 'agents/roles/build_fixer.md',
  },
  {
    pattern: /git.*not clean|uncommitted changes/i,
    category: 'Version Issues',
    agent: 'BuildFixer',
    priority: 'critical',
    description: 'Git repository not clean',
    workshopPrompt: 'agents/roles/build_fixer.md',
  },
];

/**
 * Find the best matching agent for an error message
 */
export function findAgentForError(errorMessage: string): IssueMapping | null {
  for (const mapping of ISSUE_MAPPINGS) {
    if (mapping.pattern.test(errorMessage)) {
      return mapping;
    }
  }
  return null;
}

/**
 * Generate a helpful error message with agent suggestion
 */
export function generateEnhancedErrorMessage(
  error: string,
  workshopRoot: string = config.workshopRoot
): string {
  const mapping = findAgentForError(error);
  
  if (!mapping) {
    return `❌ **Error:**\n\n${error}\n\n**Troubleshooting:**\nCheck the workshop documentation for guidance.`;
  }

  const priorityEmoji = {
    critical: '🔴',
    medium: '🟡',
    low: '🟢',
  }[mapping.priority];

  let message = `❌ **Error:** ${mapping.description}\n\n`;
  message += `**Category:** ${mapping.category}\n`;
  message += `**Priority:** ${priorityEmoji} ${mapping.priority.toUpperCase()}\n`;
  message += `**Recommended Agent:** \`@${mapping.agent}\`\n\n`;
  
  if (mapping.workshopPrompt) {
    message += `**Next Steps:**\n`;
    message += `1. Review the agent guide: \`${workshopRoot}/${mapping.workshopPrompt}\`\n`;
    message += `2. Use the \`@${mapping.agent}\` prompt templates in Zed\n`;
    message += `3. Follow the verification steps in the guide\n\n`;
  }

  message += `**Error Details:**\n\`\`\`\n${error}\n\`\`\``;

  return message;
}

/**
 * Get workshop script recommendations for a specific issue
 */
export function getRecommendedScripts(category: string): string[] {
  const scriptRecommendations: Record<string, string[]> = {
    'Build Errors': [
      'verify_build.sh',
      'check_angular_version.sh',
      'check_typescript_strict.sh',
    ],
    'Material Issues': [
      'find_breaking_changes.sh',
    ],
    'Dependencies': [
      'verify_dependencies.sh',
      'migration_status.sh',
    ],
    'Infrastructure': [
      'pre_migration_check.sh',
    ],
    'Version Issues': [
      'check_angular_version.sh',
      'migration_status.sh',
    ],
  };

  return scriptRecommendations[category] || ['migration_status.sh'];
}

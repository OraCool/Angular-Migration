/**
 * Analysis & Planning Tools
 * Tools for project analysis, prerequisites checking, and migration planning
 * Implements spec from MCP_SERVER_AGENT_PROMPT.md
 *
 * REFACTORED: Uses utility classes for DRY and SOLID compliance
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { StandardToolResponse, StandardErrorResponse, ProjectAnalysis, NodeVersionCheck } from '../types.js';
import { SessionManager } from '../session/manager.js';
import { ProgressCallback } from '../types.js';
import { ResponseBuilder } from '../utils/responses.js';
import { ProjectUtils } from '../utils/project.js';
import { ProgressTracker, createStepTracker } from '../utils/progress.js';
import {
  ANGULAR_VERSION,
  NODE_VERSION,
  PROGRESS,
  RESOURCE_URI,
  ERROR_CODES,
  TOOL_NAMES,
  getRequiredNodeVersion,
  isVersionSupported,
  getMigrationGuideUri,
} from '../constants.js';

/**
 * Analyze project version and determine upgrade path
 * Tool: analyze_project_version
 */
export async function analyzeProjectVersion(
  args: { projectPath?: string },
  sessionManager: SessionManager,
  progressCallback: ProgressCallback
): Promise<StandardToolResponse | StandardErrorResponse> {
  const projectPath = args.projectPath || process.cwd();
  const tracker = createStepTracker(progressCallback, 5, TOOL_NAMES.ANALYZE_PROJECT);

  tracker.step(1, `Analyzing Angular project at: ${projectPath}`);

  try {
    // Validate project path
    const pathValidation = ProjectUtils.validateProjectPath(projectPath);
    if (!pathValidation.valid) {
      return ResponseBuilder.error({
        code: ERROR_CODES.INVALID_PATH,
        message: 'Invalid project path',
        details: pathValidation.error || 'Unknown error',
        nextAction: 'Verify projectPath points to valid directory',
        instructionRef: RESOURCE_URI.GUIDES.PREREQUISITES,
      });
    }

    // Read package.json using ProjectUtils
    tracker.step(2, 'Reading package.json');
    const pkgResult = ProjectUtils.readPackageJson(projectPath);
    if (!pkgResult.success) {
      return ResponseBuilder.error({
        code: ERROR_CODES.PACKAGE_JSON_NOT_FOUND,
        message: 'package.json not found in project directory',
        details: pkgResult.error || 'Unknown error',
        nextAction: 'Verify projectPath points to valid Angular project root',
        instructionRef: RESOURCE_URI.GUIDES.PREREQUISITES,
      });
    }

    // Get Angular version using ProjectUtils
    tracker.step(3, 'Parsing Angular version');
    const versionInfo = ProjectUtils.getAngularVersion(projectPath);
    if (!versionInfo.success) {
      return ResponseBuilder.error({
        code: ERROR_CODES.ANGULAR_NOT_FOUND,
        message: '@angular/core not found in package.json',
        details: versionInfo.error || 'This does not appear to be an Angular project',
        nextAction: 'Verify this is an Angular project directory',
        instructionRef: RESOURCE_URI.GUIDES.PREREQUISITES,
      });
    }

    const currentMajor = versionInfo.major!;

    // Check if version is supported
    if (!isVersionSupported(currentMajor)) {
      return ResponseBuilder.warning({
        data: {
          currentVersion: versionInfo.version,
          supported: false,
        },
        nextAction: `Angular version ${currentMajor} is outside supported range (${ANGULAR_VERSION.SUPPORTED_RANGE})`,
        instructionRef: RESOURCE_URI.GUIDES.PREREQUISITES,
      });
    }

    // Check Node.js version using ProjectUtils
    tracker.step(4, 'Checking Node.js version');
    const nodeInfo = ProjectUtils.getNodeVersion();
    const requiredNodeMajor = getRequiredNodeVersion(currentMajor);

    const nodeCheck: NodeVersionCheck = {
      currentVersion: nodeInfo.version,
      requiredVersion: `${requiredNodeMajor}.0.0+`,
      compatible: nodeInfo.major >= requiredNodeMajor,
      suggestedAction:
        nodeInfo.major < requiredNodeMajor ? `Upgrade to Node.js ${requiredNodeMajor} or higher` : undefined,
    };

    // Generate migration path using ProjectUtils
    tracker.step(5, 'Generating migration path');
    const migrationPath = ProjectUtils.generateMigrationPath(currentMajor, ANGULAR_VERSION.DEFAULT_TARGET);

    const analysis: ProjectAnalysis = {
      currentVersion: versionInfo.version!,
      targetVersion: `${ANGULAR_VERSION.DEFAULT_TARGET}.0.0`,
      migrationPath,
      nodeVersion: nodeCheck,
      projectPath,
    };

    tracker.complete('Analysis complete');

    return ResponseBuilder.success({
      data: analysis,
      nextAction: 'Run prerequisites check to validate environment',
      instructionRef: RESOURCE_URI.GUIDES.PREREQUISITES,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    tracker.error(`Analysis failed: ${errorMessage}`);

    return ResponseBuilder.operationFailedError('analyze project', errorMessage);
  }
}

/**
 * Check migration prerequisites
 * Tool: check_migration_prerequisites
 */
export async function checkMigrationPrerequisites(
  args: { projectPath?: string; targetVersion: string },
  sessionManager: SessionManager,
  progressCallback: ProgressCallback
): Promise<StandardToolResponse | StandardErrorResponse> {
  const projectPath = args.projectPath || process.cwd();
  const targetVersion = args.targetVersion;
  const tracker = createStepTracker(progressCallback, 4, TOOL_NAMES.CHECK_PREREQUISITES);

  tracker.step(1, 'Checking migration prerequisites');

  const blockers: Array<{ type: string; message: string; severity: 'critical' | 'high' }> = [];
  const warnings: Array<{ type: string; message: string }> = [];
  const checks: Record<string, boolean> = {};

  try {
    // Check 1: Git status
    tracker.step(2, 'Checking Git status');

    try {
      const gitStatus = execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8' });
      checks.gitClean = gitStatus.trim().length === 0;

      if (!checks.gitClean) {
        blockers.push({
          type: 'git_uncommitted_changes',
          message: 'Project has uncommitted changes',
          severity: 'high',
        });
      }
    } catch (error) {
      checks.gitClean = false;
      warnings.push({
        type: 'git_not_initialized',
        message: 'Git repository not initialized (not a blocker)',
      });
    }

    // Check 2: Node.js version
    tracker.step(3, 'Validating Node.js version');

    const nodeInfo = ProjectUtils.getNodeVersion();
    const targetMajor = parseInt(targetVersion, 10);
    const requiredNodeVersion = getRequiredNodeVersion(targetMajor);

    checks.nodeVersion = nodeInfo.major >= requiredNodeVersion;
    if (!checks.nodeVersion) {
      blockers.push({
        type: 'node_version',
        message: `Node.js ${nodeInfo.major}.x is below required ${requiredNodeVersion}.x`,
        severity: 'critical',
      });
    }

    // Check 3: Backup exists
    const backupPath = path.join(projectPath, '.migration-backup');
    checks.backupExists = fs.existsSync(backupPath);

    if (!checks.backupExists) {
      warnings.push({
        type: 'backup_missing',
        message: 'No backup detected in .migration-backup/',
      });
    }

    // Check 4: Angular CLI installed
    tracker.step(4, 'Checking Angular CLI');

    try {
      execSync('npx ng version', { cwd: projectPath, stdio: 'pipe' });
      checks.angularCli = true;
    } catch (error) {
      checks.angularCli = false;
      warnings.push({
        type: 'angular_cli_missing',
        message: 'Angular CLI not found (will be installed during migration)',
      });
    }

    tracker.complete('Prerequisites check complete');

    const ready = blockers.length === 0;

    return ResponseBuilder[ready ? 'success' : 'warning']({
      data: {
        ready,
        blockers,
        warnings,
        checks,
      },
      nextAction: ready
        ? 'Prerequisites validated - ready to start migration'
        : 'Resolve critical blockers before proceeding',
      instructionRef: RESOURCE_URI.GUIDES.PREREQUISITES,
      userAction: !checks.gitClean ? "git status && git commit -am 'Pre-migration snapshot'" : null,
      automated: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    tracker.error(`Prerequisites check failed: ${errorMessage}`);

    return ResponseBuilder.operationFailedError('check prerequisites', errorMessage, RESOURCE_URI.GUIDES.TROUBLESHOOTING);
  }
}

/**
 * Generate comprehensive migration plan
 * Tool: generate_migration_plan
 */
export async function generateMigrationPlan(
  args: { fromVersion: string; toVersion: string; includeOptional?: boolean },
  sessionManager: SessionManager,
  progressCallback: ProgressCallback
): Promise<StandardToolResponse | StandardErrorResponse> {
  const fromVersion = parseInt(args.fromVersion, 10);
  const toVersion = parseInt(args.toVersion, 10);
  const includeOptional = args.includeOptional || false;

  const tracker = new ProgressTracker(progressCallback, {
    toolName: TOOL_NAMES.GENERATE_PLAN,
  });

  tracker.info(`Generating migration plan: v${fromVersion} → v${toVersion}`, PROGRESS.READING);

  try {
    // Build migration steps
    const steps: Array<{
      phase: string;
      order: number;
      action: string;
      tool: string;
      automated: boolean;
      estimatedTime: string;
      version?: string;
    }> = [];

    let order = 1;

    // Preparation phase
    steps.push({
      phase: 'preparation',
      order: order++,
      action: 'Verify prerequisites',
      tool: TOOL_NAMES.CHECK_PREREQUISITES,
      automated: true,
      estimatedTime: '30 minutes',
    });

    steps.push({
      phase: 'preparation',
      order: order++,
      action: 'Create backup',
      tool: 'create_backup',
      automated: true,
      estimatedTime: '15 minutes',
    });

    // Migration phase - one step per version
    for (let v = fromVersion + 1; v <= toVersion; v++) {
      steps.push({
        phase: 'migration',
        order: order++,
        version: v.toString(),
        action: `Migrate to Angular ${v}`,
        tool: 'execute_version_migration',
        automated: true,
        estimatedTime: '3-5 hours',
      });
    }

    // Validation phase
    steps.push({
      phase: 'validation',
      order: order++,
      action: 'Validate migration',
      tool: 'validate_migration',
      automated: true,
      estimatedTime: '1 hour',
    });

    steps.push({
      phase: 'validation',
      order: order++,
      action: 'Generate migration report',
      tool: 'generate_migration_report',
      automated: true,
      estimatedTime: '15 minutes',
    });

    tracker.success('Migration plan generated', PROGRESS.COMPLETE);

    const versionCount = toVersion - fromVersion;
    const estimatedHours = 5 + versionCount * 4; // Base + per-version estimate

    const documentationRefs: string[] = [];
    for (let v = fromVersion + 1; v <= toVersion; v++) {
      documentationRefs.push(getMigrationGuideUri(v));
    }

    return ResponseBuilder.success({
      data: {
        fromVersion: `${fromVersion}.0.0`,
        toVersion: `${toVersion}.0.0`,
        estimatedDuration: `${estimatedHours}-${estimatedHours + 10} hours`,
        riskLevel: versionCount > 3 ? 'high' : versionCount > 1 ? 'medium' : 'low',
        steps,
        breakingChangesCount: versionCount * 8, // Estimate
        documentationReferences: documentationRefs,
      },
      nextAction: 'Review migration plan and run prerequisites check',
      instructionRef: getMigrationGuideUri(fromVersion + 1),
      automated: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    tracker.error(`Plan generation failed: ${errorMessage}`);

    return ResponseBuilder.operationFailedError('generate migration plan', errorMessage, RESOURCE_URI.GUIDES.TROUBLESHOOTING);
  }
}

/**
 * Main handler for analysis & planning tools
 */
export async function handleAnalysisPlanningTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionManager: SessionManager,
  progressCallback: ProgressCallback
): Promise<StandardToolResponse | StandardErrorResponse> {
  switch (toolName) {
    case TOOL_NAMES.ANALYZE_PROJECT:
      return analyzeProjectVersion(args as { projectPath?: string }, sessionManager, progressCallback);

    case TOOL_NAMES.CHECK_PREREQUISITES:
      return checkMigrationPrerequisites(
        args as { projectPath?: string; targetVersion: string },
        sessionManager,
        progressCallback
      );

    case TOOL_NAMES.GENERATE_PLAN:
      return generateMigrationPlan(
        args as { fromVersion: string; toVersion: string; includeOptional?: boolean },
        sessionManager,
        progressCallback
      );

    default:
      return ResponseBuilder.error({
        code: ERROR_CODES.OPERATION_FAILED,
        message: `Unknown analysis/planning tool: ${toolName}`,
        details: 'Tool not implemented',
        nextAction: 'Use a valid tool name',
      });
  }
}

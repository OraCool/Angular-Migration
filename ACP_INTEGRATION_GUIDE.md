# 🤖 ACP Agent Integration Guide for Angular Migration

**Purpose**: How to integrate workshop resources into ACP agent workflow  
**Workshop Location**: `/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop`  
**Last Updated**: 2025-11-28

---

## 🎯 Quick Start

### Step 1: Understand the Resources

The workshop provides:
- **11 Agent Templates** → Use as ACP agent system prompts
- **14 Scripts** → Integrate into ACP workflow automation
- **60+ Issue Mappings** → Use for intelligent error routing
- **4-Day Plan** → Use as workflow orchestration template
- **Pattern Libraries** → Use for pattern-based problem solving

### Step 2: Map Workshop Agents to ACP Agents

| Workshop Agent | ACP Agent Role | Primary Responsibility |
|----------------|----------------|------------------------|
| BuildFixer | Build & Compilation Agent | TypeScript errors, build failures |
| CodeModernizer | Code Transformation Agent | Component migration, control flow |
| StyleMigrator | Styling & Material Agent | Material MDC, CSS/SCSS |
| LogicRefactorer | Service & Logic Agent | HTTP, services, state management |
| DependencyAuditor | Dependency Management Agent | Package compatibility |
| InfraPerfOptimizer | Infrastructure Agent | Node.js, CI/CD, Docker |
| ArchitectureReviewer | Architecture Analysis Agent | Circular deps, bundle analysis |
| CodeReviewer | Quality Review Agent | Pre-PR checks, style validation |
| UnitTestMigrator | Unit Test Agent | Karma → Vitest |
| E2ETestMigrator | E2E Test Agent | Protractor → Playwright |

---

## 📂 Resource Access Patterns

### **1. Agent Prompt Templates**

**Location**: `workshop/agents/roles/*.md`

**Usage**:
```typescript
// Load agent prompt template
const agentPrompt = await fs.readFile(
  '/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop/agents/roles/build_fixer.md',
  'utf-8'
);

// Extract prompt templates
const templates = parseMarkdownSections(agentPrompt, 'Prompt Templates');

// Use as system prompt
const systemPrompt = `
${templates['Role Description']}
${templates['Responsibilities']}
${templates['Knowledge Sources']}

Current Task: ${userTask}
`;
```

**Key Sections to Extract**:
- Role Description → Agent identity
- Responsibilities → Capability list
- Knowledge Sources → External resources to query
- Prompt Templates → Pre-defined task templates

### **2. Migration Scripts**

**Location**: `workshop/scripts/*.sh`

**Usage**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Run verification script
async function verifyEnvironment(targetVersion: string) {
  const { stdout } = await execAsync(
    `/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop/scripts/pre_migration_check.sh ${targetVersion}`
  );
  return parseScriptOutput(stdout);
}

// Run during migration
async function checkDeprecatedAPIs() {
  const { stdout } = await execAsync(
    '/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop/scripts/check_deprecated_apis.sh'
  );
  return parseDeprecatedAPIs(stdout);
}
```

**Script Integration Points**:
- **Pre-Migration**: `pre_migration_check.sh`, `backup_before_migration.sh`
- **Version Check**: `check_angular_version.sh`
- **Issue Detection**: `check_deprecated_apis.sh`, `migration_toolbox.sh`
- **Verification**: `verify_build.sh`, `verify_dependencies.sh`
- **Status**: `migration_status.sh`

### **3. Issue-Agent Mapping**

**Location**: `workshop/docs/guides/issue-agent-mapping.md`

**Usage**:
```typescript
interface IssueMapping {
  category: string;
  issue: string;
  team: string;
  agent: string;
  priority: 'Critical' | 'Medium' | 'Low';
}

// Load mapping table
const mappingTable: IssueMapping[] = await loadIssueMappingTable();

// Route error to agent
function routeErrorToAgent(error: string): string {
  // Pattern matching
  if (error.match(/TS\d{4}:/)) {
    return 'BuildFixer';
  }
  if (error.includes('MatLegacy')) {
    return 'StyleMigrator';
  }
  if (error.includes('HttpClientModule')) {
    return 'LogicRefactorer';
  }
  
  // Fallback to mapping table
  const mapping = mappingTable.find(m => 
    error.includes(m.issue)
  );
  return mapping?.agent || 'BuildFixer';
}
```

### **4. Pattern Libraries**

**Location**: `workshop/docs/patterns/*.md`

**Usage**:
```typescript
interface MigrationPattern {
  name: string;
  detection: string[];
  solution: string;
  examples: string[];
  category: string;
}

// Load patterns
const patterns = {
  migration: await loadPatterns('migration-patterns.md'),
  library: await loadPatterns('library-compatibility.md'),
  build: await loadPatterns('build-optimization.md'),
  agent: await loadPatterns('agent-patterns.md')
};

// Apply pattern
function findPattern(error: string): MigrationPattern | null {
  for (const category of Object.values(patterns)) {
    for (const pattern of category) {
      if (pattern.detection.some(d => error.includes(d))) {
        return pattern;
      }
    }
  }
  return null;
}
```

### **5. 4-Day Migration Plan**

**Location**: `workshop/docs/guides/4-day-migration-plan.md`

**Usage**:
```typescript
interface DayPlan {
  day: number;
  targetVersion: string;
  prerequisites: string[];
  schedule: TimeBlock[];
  deliverables: Deliverable[];
  exitCriteria: string[];
}

// Load migration plan
const migrationPlan = await loadMigrationPlan();

// Execute day plan
async function executeDay(dayNumber: number) {
  const plan = migrationPlan[dayNumber - 1];
  
  // Check prerequisites
  await verifyPrerequisites(plan.prerequisites);
  
  // Execute schedule
  for (const timeBlock of plan.schedule) {
    await executeTimeBlock(timeBlock);
  }
  
  // Verify exit criteria
  await verifyExitCriteria(plan.exitCriteria);
}
```

---

## 🔄 Workflow Integration

### **Phase 1: Pre-Migration (Day 0)**

```typescript
async function preMigration(targetVersion: string) {
  // 1. Environment Verification
  const envCheck = await runScript('pre_migration_check.sh', targetVersion);
  if (!envCheck.passed) {
    throw new Error('Environment verification failed');
  }
  
  // 2. Backup
  await runScript('backup_before_migration.sh', 'pre-migration-baseline');
  
  // 3. Dependency Audit
  const depsCheck = await runScript('verify_dependencies.sh', targetVersion);
  const redZoneDeps = depsCheck.incompatible;
  
  // 4. Baseline Capture
  await captureTestBaseline(); // AQA team
  await capturePlaywrightBaseline(); // AQA team
  
  return {
    ready: true,
    redZoneDeps,
    baseline: { unit: unitTestCount, e2e: e2eTestCount }
  };
}
```

### **Phase 2: Version Upgrade (Dev Team Lead)**

```typescript
async function upgradeAngularVersion(targetVersion: string) {
  // 1. Verify Git Clean
  const gitStatus = await exec('git status --porcelain');
  if (gitStatus.stdout.trim() !== '') {
    throw new Error('Git repository not clean');
  }
  
  // 2. Run ng update
  const updateCmd = `ng update @angular/core@${targetVersion} @angular/cli@${targetVersion} --force`;
  const result = await execAsync(updateCmd);
  
  // 3. Capture conflicts
  const conflicts = parseUpdateOutput(result.stdout);
  
  return { success: result.exitCode === 0, conflicts };
}
```

### **Phase 3: Error Detection & Routing**

```typescript
async function detectAndRouteErrors() {
  // 1. Run build to capture errors
  let buildResult;
  try {
    buildResult = await execAsync('npm run build');
  } catch (error) {
    buildResult = { stdout: error.stdout, stderr: error.stderr };
  }
  
  // 2. Parse errors
  const errors = parseBuildErrors(buildResult.stderr);
  
  // 3. Run diagnostic scripts
  const deprecatedAPIs = await runScript('check_deprecated_apis.sh');
  const matLegacy = await runScript('migration_toolbox.sh', 'legacy');
  
  // 4. Route to agents
  const tasks = errors.map(error => ({
    error,
    agent: routeErrorToAgent(error),
    priority: determinePriority(error),
    pattern: findPattern(error)
  }));
  
  return groupTasksByAgent(tasks);
}
```

### **Phase 4: Agent Execution**

```typescript
async function executeAgentTask(agent: string, task: Task) {
  // 1. Load agent prompt
  const agentPrompt = await loadAgentPrompt(agent);
  
  // 2. Load relevant pattern
  const pattern = task.pattern || await findPattern(task.error);
  
  // 3. Query Angular MCP if needed
  let versionInfo = null;
  if (pattern?.requiresAngularMCP) {
    versionInfo = await queryAngularMCP(pattern.apiQuery);
  }
  
  // 4. Build agent context
  const context = {
    systemPrompt: agentPrompt.roleDescription,
    pattern: pattern?.solution,
    versionInfo,
    error: task.error,
    fileContext: await getRelevantFiles(task.error)
  };
  
  // 5. Execute agent
  const solution = await executeAgent(agent, context);
  
  // 6. Apply fix
  await applyFix(solution);
  
  // 7. Verify
  const verified = await verifyFix();
  
  return { success: verified, solution };
}
```

### **Phase 5: Verification**

```typescript
async function verifyMigrationStep() {
  // 1. Build verification
  const buildResult = await runScript('verify_build.sh', 'production');
  
  // 2. Test verification
  const testResult = await runTests();
  const passRate = (testResult.passed / testResult.total) * 100;
  
  // 3. Status report
  const status = await runScript('migration_status.sh');
  
  // 4. Check exit criteria
  const exitCriteria = {
    buildPasses: buildResult.success,
    testPassRate: passRate,
    criticalIssues: await checkCriticalIssues()
  };
  
  return exitCriteria;
}
```

---

## 🎨 Pattern-Based Problem Solving

### **Pattern Matching Engine**

```typescript
class PatternMatcher {
  private patterns: MigrationPattern[];
  
  async match(error: string): Promise<MigrationPattern | null> {
    // 1. Check configuration patterns
    if (error.includes('Schema validation')) {
      return this.patterns.find(p => p.name === 'Configuration Format');
    }
    
    // 2. Check API patterns
    if (error.includes('Property') && error.includes('does not exist')) {
      return this.patterns.find(p => p.name === 'API Evolution');
    }
    
    // 3. Check template patterns
    if (error.includes('Parser Error')) {
      return this.patterns.find(p => p.name === 'Template Syntax');
    }
    
    // 4. Check module patterns
    if (error.includes('Module not found')) {
      return this.patterns.find(p => p.name === 'Module Resolution');
    }
    
    return null;
  }
  
  async applySolution(pattern: MigrationPattern, context: any) {
    // Pattern-specific solution logic
    switch (pattern.category) {
      case 'Configuration':
        return await this.fixConfiguration(pattern, context);
      case 'API':
        return await this.migrateAPI(pattern, context);
      case 'Template':
        return await this.refactorTemplate(pattern, context);
      case 'Module':
        return await this.resolveModule(pattern, context);
    }
  }
}
```

### **Version-Aware Solutions**

```typescript
class VersionAwareSolver {
  async solve(issue: string, currentVersion: string, targetVersion: string) {
    // 1. Check Angular version
    const version = await this.getAngularVersion();
    
    // 2. Load version-specific pattern
    const pattern = await this.loadPattern(issue, version);
    
    // 3. Apply version-specific solution
    if (version.startsWith('14')) {
      return this.applyV14Solution(pattern);
    } else if (version.startsWith('15')) {
      return this.applyV15Solution(pattern);
    }
    // ... etc
  }
  
  private async applyV14Solution(pattern: MigrationPattern) {
    // v14-specific solution logic
    // Example: polyfills format for v14
    return {
      file: 'angular.json',
      change: { polyfills: 'src/polyfills.ts' } // string format
    };
  }
}
```

---

## 🚨 Emergency Procedures

### **Emergency Handler**

```typescript
class EmergencyHandler {
  private procedures: Map<string, () => Promise<void>>;
  
  constructor() {
    this.procedures = new Map([
      ['build-fails', this.handleBuildFailure],
      ['polyfills-error', this.handlePolyfillsError],
      ['ag-grid-issues', this.handleAGGridIssues],
      ['playwright-install-error', this.handlePlaywrightError],
      ['stuck-on-dependency', this.handleDependencyIssue]
    ]);
  }
  
  async handle(errorType: string) {
    const procedure = this.procedures.get(errorType);
    if (procedure) {
      await procedure.call(this);
    } else {
      await this.genericRecovery();
    }
  }
  
  private async handleBuildFailure() {
    // From 4-day-migration-plan.md
    await execAsync('rm -rf node_modules .angular dist');
    await execAsync('npm install');
    const result = await execAsync('npm run build');
    
    if (result.exitCode !== 0) {
      // Route to BuildFixer agent
      await this.routeToAgent('BuildFixer', result.stderr);
    }
  }
  
  private async handlePolyfillsError() {
    // Check if polyfills.ts exists
    const exists = await fs.access('src/polyfills.ts').catch(() => false);
    
    if (!exists) {
      await fs.writeFile('src/polyfills.ts', '// Polyfills\n');
    }
    
    // Update angular.json
    const angularJson = await readJSON('angular.json');
    const version = await this.getAngularVersion();
    
    if (version.startsWith('14')) {
      angularJson.projects[PROJECT_NAME].architect.build.options.polyfills = 'src/polyfills.ts';
    }
    
    await writeJSON('angular.json', angularJson);
  }
}
```

---

## 📊 Progress Tracking

### **Progress Monitor**

```typescript
class MigrationProgressMonitor {
  async trackProgress() {
    // 1. Run status script
    const status = await runScript('migration_status.sh');
    
    // 2. Parse metrics
    const metrics = {
      currentVersion: this.extractVersion(status),
      buildStatus: this.extractBuildStatus(status),
      testPassRate: this.extractTestPassRate(status),
      criticalIssues: this.extractCriticalIssues(status)
    };
    
    // 3. Update dashboard
    await this.updateDashboard(metrics);
    
    return metrics;
  }
  
  async verifyExitCriteria(day: number): Promise<boolean> {
    const criteria = EXIT_CRITERIA[day];
    const results = [];
    
    for (const criterion of criteria) {
      const passed = await this.checkCriterion(criterion);
      results.push({ criterion, passed });
    }
    
    return results.every(r => r.passed);
  }
}
```

---

## 💡 Best Practices

### **1. Always Verify Environment First**

```typescript
// CRITICAL: Always run before starting any fix
const verification = await runScript('pre_migration_check.sh', targetVersion);
if (!verification.passed) {
  // Stop and fix environment issues first
  throw new Error('Environment verification failed');
}
```

### **2. Pattern Recognition Over Specific Fixes**

```typescript
// ❌ Don't do this
if (file === 'src/app/status-cell/status-cell.component.ts') {
  // specific fix
}

// ✅ Do this
const pattern = await findPattern(error);
if (pattern?.name === 'Template Syntax Error') {
  await applyPattern(pattern, { file, error });
}
```

### **3. Incremental Fixes with Verification**

```typescript
// Fix in batches
const errorBatches = chunkArray(errors, 20);

for (const batch of errorBatches) {
  await fixBatch(batch);
  
  // Verify after each batch
  const buildResult = await execAsync('npm run build');
  if (buildResult.exitCode !== 0) {
    // Rollback and investigate
    await rollbackBatch();
    break;
  }
}
```

### **4. Version-Aware Solutions**

```typescript
// Always check version before applying fix
const currentVersion = await getAngularVersion();

if (currentVersion.startsWith('14')) {
  // v14-specific solution
} else if (currentVersion.startsWith('15')) {
  // v15-specific solution
}
```

---

## 🔗 Quick Reference

### **Script Locations**
```bash
WORKSHOP=/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop

# Verification
$WORKSHOP/scripts/pre_migration_check.sh
$WORKSHOP/scripts/migration_status.sh

# Issue Detection
$WORKSHOP/scripts/check_deprecated_apis.sh
$WORKSHOP/scripts/migration_toolbox.sh

# Verification
$WORKSHOP/scripts/verify_build.sh
$WORKSHOP/scripts/verify_dependencies.sh
```

### **Agent Prompts**
```bash
$WORKSHOP/agents/roles/build_fixer.md
$WORKSHOP/agents/roles/code_modernizer.md
$WORKSHOP/agents/roles/style_migrator.md
$WORKSHOP/agents/roles/logic_refactorer.md
$WORKSHOP/agents/roles/dependency_auditor.md
# ... etc
```

### **Documentation**
```bash
$WORKSHOP/docs/guides/4-day-migration-plan.md
$WORKSHOP/docs/guides/issue-agent-mapping.md
$WORKSHOP/docs/patterns/migration-patterns.md
$WORKSHOP/docs/patterns/library-compatibility.md
```

---

## 🎯 Implementation Checklist

- [ ] Load agent prompt templates into ACP agent system prompts
- [ ] Integrate scripts into workflow automation
- [ ] Implement issue-to-agent routing logic
- [ ] Load pattern libraries for pattern matching
- [ ] Implement version-aware solution logic
- [ ] Set up emergency procedures
- [ ] Implement progress tracking
- [ ] Configure knowledge sources (Angular MCP, Context7)
- [ ] Test end-to-end workflow
- [ ] Document ACP-specific customizations

---

## 📝 Next Steps

1. **Test Integration**: Run a pilot migration with ACP agents
2. **Refine Routing**: Tune issue-to-agent routing based on results
3. **Extend Patterns**: Add new patterns as discovered
4. **Optimize Workflow**: Adjust workflow based on performance
5. **Document Learnings**: Update pattern library with new insights

---

**Workshop Resources**: See `WORKSHOP_INVENTORY.md` for complete resource catalog.

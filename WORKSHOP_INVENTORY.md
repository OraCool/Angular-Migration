# 📚 Workshop Directory Inventory & Analysis

**Location**: `/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop`  
**Purpose**: Angular 14/15 → 20 Migration Resources  
**Last Analyzed**: 2025-11-28

---

## 📁 Directory Structure

```
workshop/
├── README.md                    # Main entry point
├── agents/                      # AI agent role definitions
│   ├── acp-agents/             # ACP agent creation
│   ├── roles/                  # Agent prompt templates (11 agents)
│   ├── workflows/              # Daily workflows
│   └── docs/                   # Agent documentation
├── docs/                        # Migration documentation
│   ├── guides/                 # Essential migration guides
│   ├── patterns/               # Pattern-based guides
│   ├── setup/                  # Setup and configuration
│   └── history/                # Archived documentation
├── scripts/                     # Migration automation scripts (14 scripts)
├── verification/               # Verification reports
└── updates/                    # Update logs
```

---

## 🎯 Essential Documents

### 1. **Main Entry Point**
- **File**: `README.md`
- **Purpose**: Workshop navigation and quick start guide
- **Key Content**:
  - Quick start links
  - Documentation structure overview
  - Learning paths for developers and tech leads
  - Focus on 4-day hackathon approach

### 2. **4-Day Migration Plan** 
- **File**: `docs/guides/4-day-migration-plan.md`
- **Purpose**: Complete day-by-day migration plan
- **Key Content**:
  - Team structure (Dev Lead + 2 sub-teams + AQA team)
  - Day-by-day schedules with time blocks
  - Prerequisites and exit criteria for each day
  - Agent assignments and dependencies
  - Emergency procedures
  - Success metrics
- **Migration Path**: v14 verify → v15 → v16 → v17 → v19 → v20
- **Team Structure**:
  - **Dev Team Lead**: Strategic oversight, runs `ng update`
  - **Sub-Team Alpha**: Frontend (3 devs - Build, Components, UI Libraries)
  - **Sub-Team Beta**: Backend & Infrastructure (3 devs - Services, Dependencies, Infra)
  - **AQA Team**: Testing (2 members - Unit Tests, E2E Tests)

### 3. **Issue-Agent Mapping**
- **File**: `docs/guides/issue-agent-mapping.md`
- **Purpose**: Quick reference for mapping issues to agents
- **Key Content**:
  - Comprehensive issue table with ~60 common issues
  - Team assignments for each issue type
  - Priority levels (Critical/Medium/Low)
  - Common issue patterns (13 patterns documented)
  - Diagnostic commands
  - Resolution workflow

---

## 🤖 AI Agents (11 Total)

### Purpose
These are **prompt template files** for use with Zed Editor's Agent Panel and MCP servers, not actual ACP agents.

### Agent Inventory

#### **1. Build Fixer** (`build_fixer.md`)
- **Manager**: Dev A1 (Alpha Team)
- **Responsibilities**: TypeScript errors, compilation issues, strict mode
- **Knowledge Sources**: Angular MCP, Context7
- **Key Templates**:
  - Pre-Fix Verification (CRITICAL - always run first)
  - Batch Error Fix
  - Strict Mode Migration
  - Import Path Resolution
- **Critical Pattern**: Always verify environment and Angular version before fixing

#### **2. Code Modernizer** (`code_modernizer.md`)
- **Manager**: Dev A2 (Alpha Team)
- **Responsibilities**: Control flow, RxJS, Standalone components, Typed Forms
- **Knowledge Sources**: Angular MCP, Context7
- **Key Templates**:
  - Control Flow Migration (*ngIf → @if)
  - RxJS Migration (toPromise → lastValueFrom)
  - Standalone Component Migration
  - Typed Forms Migration
- **Critical Discovery**: MDC migration must complete before Angular v17

#### **3. Style Migrator** (`style_migrator.md`)
- **Manager**: Dev A3 (Alpha Team)
- **Responsibilities**: Material MDC, CSS/SCSS refactoring, Material theming
- **Knowledge Sources**: Angular MCP, Context7
- **Key Templates**:
  - Material MDC Component Migration
  - CSS Variables Implementation
  - Legacy Class Cleanup
  - Theme Migration
- **Critical Pattern**: Material version must match Core version

#### **4. Logic Refactorer** (`logic_refactorer.md`)
- **Manager**: Dev B1 (Beta Team)
- **Responsibilities**: Services, HTTP, Guards, Interceptors, RxJS, State
- **Knowledge Sources**: Angular MCP, Context7
- **Key Templates**:
  - HTTP Client Migration (Module → Functional)
  - Class-based → Functional Interceptors
  - Guards Migration (Class → Functional)
  - Injection Migration (Constructor → inject())
- **Critical Patterns**:
  - Location.back() doesn't exist → use Router.navigate()
  - AG Grid v28+ API changes
  - RxJS toPromise() deprecated

#### **5. Dependency Auditor** (`dependency_auditor.md`)
- **Manager**: Dev B2 (Beta Team)
- **Responsibilities**: Package compatibility, deprecated packages, peer dependencies
- **Knowledge Sources**: Angular MCP, NPM Registry, Context7
- **Key Templates**:
  - Pre-Audit Verification (CRITICAL)
  - Pre-Upgrade Compatibility Audit
  - Deprecated Package Replacement
  - Peer Dependency Resolution
- **Critical Pattern**: Always verify actual Angular version (may differ from plan)

#### **6. Infra & Perf Optimizer** (`infra_perf_optimizer.md`)
- **Manager**: Dev B3 (Beta Team)
- **Responsibilities**: Infrastructure, Node.js, CI/CD, performance, bundle optimization
- **Knowledge Sources**: Angular MCP, Context7
- **Key Templates**:
  - Infrastructure Update (Node.js version bump)
  - Dockerfile Update
  - CI/CD Pipeline Update
  - Bundle Budget Enforcement
  - Deferrable Views Implementation
- **Focus**: Both infrastructure AND performance optimization

#### **7. Architecture Reviewer** (`architecture_reviewer.md`)
- **Manager**: Tech Lead
- **Responsibilities**: Circular dependencies, bundle analysis, module boundaries
- **Knowledge Sources**: Angular MCP, Context7
- **Key Templates**:
  - Circular Dependency Detection (madge)
  - Bundle Bloat Analysis
  - Module Boundary Verification
  - Migration Progress Tracking

#### **8. Code Reviewer** (`code_reviewer.md`)
- **Manager**: Any Developer (Self-Service)
- **Responsibilities**: Style checks, pattern validation, smell detection, test verification
- **Knowledge Sources**: Angular MCP, Context7
- **Key Templates**:
  - Pre-PR Code Review
  - Angular Style Guide Compliance
  - Pattern Validation
  - Test Coverage Verification
- **Purpose**: Gatekeeper for pre-validating work before Tech Lead review

#### **9. Unit Test Migrator** (`unit_test_migrator.md`)
- **Manager**: AQA 1
- **Responsibilities**: Karma → Vitest migration, test infrastructure, coverage
- **Knowledge Sources**: Angular MCP, Context7, Vitest Documentation
- **Key Templates**:
  - Pre-Migration Setup (Vitest infrastructure)
  - Karma to Vitest Conversion
  - TestBed Configuration Updates
  - Test Coverage Analysis
- **Independence**: Can work parallel to Angular upgrades

#### **10. E2E Test Migrator** (`e2e_test_migrator.md`)
- **Manager**: AQA 2
- **Responsibilities**: Protractor → Playwright migration, visual regression
- **Knowledge Sources**: Playwright MCP, Context7, Playwright Documentation
- **Key Templates**:
  - Playwright Setup (Day 0)
  - Page Object Migration
  - Test Syntax Conversion
  - Visual Regression Setup
- **Independence**: Can work parallel to Angular upgrades
- **Critical Pattern**: `npm init playwright@latest --yes` flag doesn't exist

#### **11. Test Migrator (Legacy)** (`test_migrator.md`)
- **Manager**: Both AQAs (backward compatibility)
- **Purpose**: Legacy agent for backward compatibility
- **Note**: New work should use UnitTestMigrator or E2ETestMigrator instead

---

## 🔧 Migration Scripts (14 Total)

All located in `scripts/` directory.

### Verification & Analysis Scripts

#### **1. pre_migration_check.sh**
- **Purpose**: Comprehensive pre-migration safety check
- **Parameters**: `[target_version]` (default: 20)
- **Runs**: All verification scripts in sequence
- **When**: Before starting migration (Day 0)
- **Output**: Pass/fail summary for all checks

#### **2. migration_status.sh**
- **Purpose**: Generate migration status report
- **Parameters**: None
- **Checks**:
  - Current Angular version
  - Phase status (Playwright, Material MDC, etc.)
  - Component migration progress
  - Test status
- **When**: Daily status check
- **Output**: Comprehensive status report with progress metrics

#### **3. check_angular_version.sh**
- **Purpose**: Verify Angular version and Node.js compatibility
- **Parameters**: `[target_version]` (default: 20)
- **Checks**:
  - Current Angular version
  - Node.js compatibility
  - TypeScript version
  - CLI version
- **Output**: Version compatibility report

#### **4. check_deprecated_apis.sh**
- **Purpose**: Find deprecated Angular APIs in codebase
- **Parameters**: None
- **Scans**: `src/` directory for patterns
- **Detects**:
  - RouterLinkWithHref
  - providedIn: 'ngModule'
  - Signal.mutate()
  - DATE_PIPE_DEFAULT_TIMEZONE
  - And more
- **Output**: List of deprecated API usages with locations

#### **5. check_typescript_strict.sh**
- **Purpose**: Check TypeScript strict mode readiness
- **Parameters**: None
- **Checks**:
  - Current strict mode settings
  - Common strict mode violations
  - Strict null check readiness
- **Output**: Strict mode readiness report

#### **6. check_control_flow.sh**
- **Purpose**: Check control flow migration status
- **Parameters**: None
- **Counts**:
  - Legacy directives (*ngIf, *ngFor, *ngSwitch)
  - New control flow (@if, @for, @switch)
- **Output**: Migration progress statistics

#### **7. check_zone_flags.sh**
- **Purpose**: Check Zone.js flags migration status
- **Parameters**: None
- **Checks**:
  - polyfills.ts existence
  - zone-flags.ts existence
  - Zone flags imports
- **Output**: Zone.js migration status

#### **8. find_breaking_changes.sh**
- **Purpose**: Scan for potential breaking changes
- **Parameters**: `[target_version]` (default: 20)
- **Scans**: Version-specific breaking changes
- **Output**: List of breaking changes with fix hints

#### **9. verify_dependencies.sh**
- **Purpose**: Verify dependency compatibility
- **Parameters**: `[target_angular_version]` (default: 20)
- **Checks**:
  - Angular package version consistency
  - AG Grid version consistency
  - Material version consistency
  - Third-party package compatibility
- **Output**: Dependency compatibility report

#### **10. verify_build.sh**
- **Purpose**: Verify build after migration
- **Parameters**: `[build_config]` (default: production)
- **Runs**: `ng build` with specified configuration
- **Checks**:
  - Build success
  - Warning count
  - Bundle size
- **Output**: Build verification report

### Utility Scripts

#### **11. backup_before_migration.sh**
- **Purpose**: Create backup before migration
- **Parameters**: `[backup_name]` (default: timestamp)
- **Backs up**:
  - package.json, package-lock.json
  - angular.json, tsconfig.json
  - src/ directory (tar.gz)
- **Output**: Backup in `backups/[name]/`

#### **12. analyze_bundle.sh**
- **Purpose**: Analyze bundle size
- **Parameters**: `[build_output_dir]` (default: dist/msp-multisnap)
- **Analyzes**:
  - Main bundle
  - Vendor bundle
  - Polyfills bundle
  - Styles
- **Output**: Bundle size report with recommendations

#### **13. migration_toolbox.sh**
- **Purpose**: Angular migration "No-AI" validator
- **Parameters**: `[check_all|legacy|rxjs|strict|deps]`
- **Checks**:
  - Legacy Material imports
  - RxJS deprecated patterns (toPromise)
  - Strict mode progress ('any' count)
  - Forbidden dependencies
- **Output**: Pass/fail for each check
- **When**: After each upgrade to verify core patterns

#### **14. create-remaining-agents.sh**
- **Purpose**: Script to create ACP agents (automation)
- **Location**: `agents/acp-agents/`
- **Note**: Template for agent creation (not actively used in Zed workflow)

---

## 📖 Pattern Documentation

### **1. Migration Patterns** (`docs/patterns/migration-patterns.md`)
- **Core Principles**:
  - Version Verification First
  - Configuration Format Changes
  - Template Syntax Restrictions
  - API Evolution
  - Module Resolution Issues
- **Pattern Categories**:
  - Configuration & Setup
  - Template & Component
  - Dependency & Library
  - Type System

### **2. Library Compatibility** (`docs/patterns/library-compatibility.md`)
- **Common Patterns**:
  - TypeScript Type Definition Mismatches
  - API Property/Method Changes
  - Module Export Changes
  - Directive/Component Property Changes
- **Examples**:
  - highcharts-angular compatibility
  - AG Grid API changes
  - Material component evolution

### **3. Build Optimization** (`docs/patterns/build-optimization.md`)
- **Patterns**:
  - Optimization Errors
  - Terser/minification issues
  - Source map problems
- **Detection Strategies**:
  - Error message analysis
  - Build type check
  - Configuration check

### **4. Agent Patterns** (`docs/patterns/agent-patterns.md`)
- **Core Principles**:
  - Pattern Recognition Over Memorization
  - Version-Aware Solutions
  - Incremental Problem Solving
  - Library Compatibility First
- **Error Pattern Categories**:
  - Configuration Errors
  - Template Errors
  - API Errors
  - Module Resolution

---

## 🔄 Workflow Documentation

### **1. Daily Cycle** (`agents/workflows/daily_cycle.md`)
- Day-by-day workflow structure
- Team coordination patterns
- Integration cycles

### **2. AQA Daily Workflow** (`agents/workflows/aqa_daily_workflow.md`)
- AQA team-specific workflows
- Test migration patterns
- Quality assurance cycles

### **3. Supervision** (`agents/workflows/supervision.md`)
- Tech Lead oversight patterns
- Team coordination
- Conflict resolution

---

## 🛠️ Setup Documentation

### **1. Zed MCP Setup** (`docs/setup/zed-mcp-setup.md`)
- Zed Editor installation
- MCP server configuration
- Angular MCP server
- Playwright MCP server
- Context7 MCP server

### **2. ACP Agents Setup** (`docs/setup/acp-agents-setup.md`)
- ACP agent configuration
- Agent creation patterns
- Agent integration

### **3. Dependency Audit** (`docs/setup/dependency-audit.md`)
- Pre-migration dependency analysis
- Compatibility checks
- Replacement planning

---

## 📊 Migration Strategy

### **Timeline**: 4 Days

| Day | Version Upgrade | Key Focus | Critical Deliverables |
|-----|----------------|-----------|---------------------|
| **Day 1** | v14 verify → v15 → v16 | Foundation + v14 completion | v14 stable, v15 complete, v16 build passes, Node 18 |
| **Day 2** | v16 → v17 | Modernization | Critical deps replaced, >70% tests |
| **Day 3** | v17 → v19 | Acceleration (double upgrade) | AG Grid upgraded, >80% tests, Node 20 |
| **Day 4** | v19 → v20 | Deployment | Production build, staging deployment, >90% tests |

### **Team Structure**:
- **1 Dev Team Lead**: Strategic oversight, runs `ng update` commands
- **3 Sub-Team Alpha** (Frontend): Build fixes, components, UI libraries
- **3 Sub-Team Beta** (Backend/Infra): Services, dependencies, infrastructure
- **2 AQA Team**: Unit tests, E2E tests (work independently)

### **Success Metrics**:

| Metric | Day 1 | Day 2 | Day 3 | Day 4 |
|--------|-------|-------|-------|-------|
| Build Status | ✅ Passes | ✅ Passes | ✅ Passes | ✅ Production |
| Test Pass Rate | Baseline | >70% | >80% | >90% |
| Node Version | 18 | 18 | 20 | 20 |
| Deployment | N/A | N/A | N/A | ✅ Staging |

---

## 🎯 ACP Agent Integration Recommendations

### **1. Agent Role Mapping**

The workshop agents are **prompt templates for Zed Editor**, not ACP agents. For ACP integration:

#### **Map to ACP Agent Roles**:
- **BuildFixer** → ACP Build & Compilation Agent
- **CodeModernizer** → ACP Code Transformation Agent
- **StyleMigrator** → ACP Styling & Material Agent
- **LogicRefactorer** → ACP Service & Logic Agent
- **DependencyAuditor** → ACP Dependency Management Agent
- **InfraPerfOptimizer** → ACP Infrastructure Agent
- **ArchitectureReviewer** → ACP Architecture Analysis Agent
- **CodeReviewer** → ACP Quality Review Agent
- **UnitTestMigrator** → ACP Unit Test Agent
- **E2ETestMigrator** → ACP E2E Test Agent

#### **Use Agent Prompts as**:
- **System Prompts**: Base instructions for ACP agents
- **Task Templates**: Pre-defined migration tasks
- **Pattern Libraries**: Common issue resolution patterns
- **Workflow Guides**: Step-by-step procedures

### **2. Script Integration**

#### **Pre-Migration Phase**:
```typescript
// ACP Workflow Step 1: Environment Verification
await runScript('pre_migration_check.sh', targetVersion);
await runScript('backup_before_migration.sh', backupName);
await runScript('verify_dependencies.sh', targetVersion);
```

#### **During Migration**:
```typescript
// ACP Workflow Step 2: Version Upgrade
// (Run by Dev Team Lead or orchestrator)
await runNgUpdate(targetVersion);

// ACP Workflow Step 3: Issue Detection
const buildErrors = await runScript('npm run build');
const deprecatedApis = await runScript('check_deprecated_apis.sh');
const legacyMaterial = await runScript('migration_toolbox.sh', 'legacy');

// ACP Workflow Step 4: Agent Assignment
// Route errors to appropriate agents based on issue-agent mapping
```

#### **Verification**:
```typescript
// ACP Workflow Step 5: Verification
await runScript('verify_build.sh', 'production');
await runScript('migration_status.sh');
await runScript('analyze_bundle.sh');
```

### **3. Issue-Agent Routing**

Use `issue-agent-mapping.md` table for routing:

```typescript
interface IssueRouting {
  errorPattern: RegExp;
  agentRole: string;
  priority: 'Critical' | 'Medium' | 'Low';
  team: string;
}

const routingTable: IssueRouting[] = [
  {
    errorPattern: /TS\d{4}:/,
    agentRole: 'BuildFixer',
    priority: 'Critical',
    team: 'Alpha A1'
  },
  {
    errorPattern: /MatLegacy/,
    agentRole: 'StyleMigrator',
    priority: 'Critical',
    team: 'Alpha A2'
  },
  // ... 60+ routing rules from issue-agent-mapping.md
];
```

### **4. Pattern-Based Problem Solving**

Integrate pattern documentation:

```typescript
interface MigrationPattern {
  name: string;
  detection: string[];
  solution: string;
  examples: string[];
}

// Load from docs/patterns/
const patterns: MigrationPattern[] = [
  {
    name: 'Polyfills Configuration Format',
    detection: ['Schema validation', 'must be string'],
    solution: 'Check Angular version → Apply version-specific format',
    examples: ['v14 uses string, v15+ may differ']
  },
  // ... all patterns from migration-patterns.md
];
```

### **5. Knowledge Sources**

#### **For Each Agent**:
- **Angular MCP**: Official Angular documentation and APIs
- **Context7**: Project-specific patterns and decisions
- **Workshop Patterns**: Pattern documentation from `docs/patterns/`
- **Issue Mapping**: Common issues and solutions from `issue-agent-mapping.md`

#### **Integration**:
```typescript
class ACPAgent {
  knowledgeSources = {
    angular: 'Angular MCP Server',
    patterns: 'Workshop Pattern Library',
    issues: 'Issue-Agent Mapping Table',
    context: 'Context7 (project-specific)'
  };
  
  async solve(issue: string) {
    // 1. Check issue-agent mapping for pattern match
    const mapping = matchIssue(issue);
    
    // 2. Load relevant pattern
    const pattern = loadPattern(mapping.patternId);
    
    // 3. Query Angular MCP for version-specific info
    const versionInfo = await queryAngularMCP(pattern.apiQuery);
    
    // 4. Apply solution template
    return applySolution(pattern, versionInfo);
  }
}
```

### **6. Workflow Orchestration**

#### **Day-by-Day Orchestration**:
```typescript
interface DayPlan {
  day: number;
  targetVersion: string;
  prerequisites: string[];
  streams: Stream[];
  exitCriteria: string[];
}

const migrationPlan: DayPlan[] = [
  {
    day: 1,
    targetVersion: 'v16',
    prerequisites: ['v14 verified', 'git clean', 'Node 18'],
    streams: [
      { name: 'Alpha A1', agent: 'BuildFixer', tasks: [...] },
      { name: 'Alpha A2', agent: 'StyleMigrator', tasks: [...] },
      // ... all streams from 4-day-migration-plan.md
    ],
    exitCriteria: ['ng build passes', 'Node 18 configured', '>0% tests']
  },
  // ... Days 2-4
];
```

### **7. Emergency Procedures**

Integrate from `4-day-migration-plan.md`:

```typescript
const emergencyProcedures = {
  'build-fails': async () => {
    await runScript('rm -rf node_modules .angular dist');
    await runScript('npm install');
    // Route to BuildFixer agent
  },
  'polyfills-error': async () => {
    // Check if polyfills.ts exists
    // Update angular.json format
    // Route to BuildFixer agent
  },
  'ag-grid-issues': async () => {
    // Check GridApi methods
    // Update CSS theme
    // Route to StyleMigrator agent
  },
  // ... all emergency procedures
};
```

---

## 📝 Key Insights for ACP Implementation

### **1. Critical Prerequisites**

Always verify BEFORE starting:
- ✅ Actual Angular version (may differ from plan assumptions)
- ✅ Git repository clean
- ✅ Node.js version matches requirements
- ✅ Current build passes
- ✅ Dependencies audited

### **2. Version-Aware Solutions**

- Every agent should check Angular version before applying fixes
- Configuration formats change between versions
- API migrations are version-specific
- Pattern library should be version-indexed

### **3. Pattern-Based Approach**

- Don't memorize specific fixes → Recognize error patterns
- Use pattern matching for issue routing
- Apply generalizable solution patterns
- Document new patterns as discovered

### **4. Team Independence**

- AQA team can work parallel to dev team
- Test migration is independent of Angular version
- Infrastructure updates can start Day 1
- Dependency audits can run continuously

### **5. Incremental Problem Solving**

Fix in order:
1. Configuration issues (easiest)
2. API issues (medium)
3. Type issues (harder)
4. Architecture issues (hardest)

Verify build after each category.

### **6. Emergency Handling**

- Clear cache and reinstall as first resort
- Check version-specific configurations
- Use diagnostic commands from scripts
- Route to appropriate agent based on error pattern

### **7. Success Metrics**

Track daily:
- Build status (dev/production)
- Test pass rate (70% → 80% → 90%)
- Node version
- Deployment status

---

## 🔗 Resource Access

### **Scripts Usage**
All scripts are bash scripts with clear usage patterns:
```bash
# Verification
./scripts/pre_migration_check.sh 20
./scripts/migration_status.sh
./scripts/check_deprecated_apis.sh

# During Migration
./scripts/migration_toolbox.sh check_all
./scripts/verify_dependencies.sh 20

# Post-Migration
./scripts/verify_build.sh production
./scripts/analyze_bundle.sh
```

### **Agent Prompts**
All agent prompts follow structure:
```markdown
# Agent Role: [Name]
## Role Description
## Responsibilities
## Knowledge Sources
## Prompt Templates
### Template 0: Pre-Fix Verification (if applicable)
### Template 1: [Primary Use Case]
### Template 2: [Secondary Use Case]
```

### **Pattern Documentation**
All patterns follow structure:
```markdown
## Pattern: [Name]
**Detection**: How to identify
**Common Scenarios**: When it occurs
**Solution Pattern**: Step-by-step resolution
**Example**: Real-world example
```

---

## 📌 Summary

The workshop provides:

1. **11 AI Agent Templates** with detailed prompt templates for all migration roles
2. **14 Automation Scripts** for verification, analysis, and status tracking
3. **Comprehensive 4-Day Plan** with schedules, dependencies, and exit criteria
4. **60+ Issue Mappings** connecting problems to agents and solutions
5. **Pattern Libraries** documenting common issues and generalizable solutions
6. **Emergency Procedures** for handling blockers and unexpected issues

**For ACP Integration**:
- Use agent prompts as system prompts and task templates
- Integrate scripts into workflow automation
- Use issue-agent mapping for intelligent routing
- Apply pattern-based problem solving
- Follow version-aware solution approach
- Implement incremental problem solving strategy

**Key Success Factors**:
- ✅ Version verification first (always check actual version)
- ✅ Pattern recognition over memorization
- ✅ Incremental fixes with verification
- ✅ Parallel work streams where possible
- ✅ Clear emergency procedures
- ✅ Daily progress tracking

This workshop is production-ready and battle-tested with real migration experience documented throughout.

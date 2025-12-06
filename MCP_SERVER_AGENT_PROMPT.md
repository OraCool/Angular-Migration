# Angular Migration MCP Server - Comprehensive AI Agent Instructions

## Overview

This MCP (Model Context Protocol) server provides specialized tools for automated Angular version migration from version 14 to 20. The server implements migration logic in **Node.js/TypeScript** and references existing documentation in `migrations/docs/` and breaking changes knowledge from PowerShell modules for guidance.

---

## Core Principles

### 1. Single Responsibility Per Tool
Each tool performs **ONE** specific task and returns instructions or references to documentation.

### 2. User Control Over Destructive Operations
The MCP server **NEVER** performs the following operations:
- ❌ `npm install` / `npm ci`
- ❌ Removal of `node_modules`
- ❌ Git commits (unless explicitly requested)
- ❌ File deletions without user confirmation

These are **user responsibilities** and tools should instruct users to perform them.

### 3. Version-Aware Behavior
All tools are scoped to specific Angular version transitions (e.g., 15→16, 17→18).

### 4. Instruction-Based Returns
Tools return:
- Clear, actionable instructions
- References to documentation (via MCP Resources)
- Detection results with migration guidance
- Node.js-based automated fixes (no shell scripts)

### 5. Safe Defaults
- Always validate before suggesting changes
- Prefer dry-run mode for code transformations
- Recommend backups before operations
- Use Node.js for file operations

---

## MCP Resources (Documentation)

The MCP server exposes breaking changes documentation and migration guides as **resources**. Tools reference these resources instead of duplicating content.

### Resource URIs

#### Breaking Changes Documentation
- `breaking-changes://v15` → Content extracted from `migrations/scripts/modules/breaking-changes/v15.psm1`
- `breaking-changes://v16` → Content from `v16.psm1`
- `breaking-changes://v17` → Content from `v17.psm1`
- `breaking-changes://v18` → Content from `v18.psm1`
- `breaking-changes://v19` → Content from `v19.psm1`
- `breaking-changes://v20` → Content from `v20.psm1`

#### Migration Guides (Markdown Documentation)
- `guide://migrate/v15` → `migrations/docs/02-migrate-to-angular-15.md`
- `guide://migrate/v16` → `migrations/docs/03-migrate-to-angular-16.md`
- `guide://migrate/v17` → `migrations/docs/04-migrate-to-angular-17.md`
- `guide://migrate/v18` → `migrations/docs/05-migrate-to-angular-18.md`
- `guide://migrate/v19` → `migrations/docs/06-migrate-to-angular-19.md`
- `guide://migrate/v20` → `migrations/docs/07-migrate-to-angular-20.md`

#### Supplementary Documentation
- `guide://prerequisites` → `migrations/docs/00-prerequisites.md`
- `guide://backup` → `migrations/docs/01-pre-migration-backup.md`
- `guide://validation` → `migrations/docs/08-post-migration-validation.md`
- `guide://troubleshooting` → `migrations/docs/troubleshooting.md`
- `guide://standalone-migration` → `migrations/docs/optional-standalone-migration.md`
- `guide://signals-migration` → `migrations/docs/optional-signals-migration.md`
- `guide://control-flow-migration` → `migrations/docs/optional-control-flow-migration.md`

---

## Tool Categories

### Category 1: Analysis & Planning

#### Tool: `analyze_project_version`

**Purpose**: Detect current Angular version and determine upgrade path

**Parameters**:
- `projectPath` (optional): Path to Angular project (defaults to current directory)

**Implementation**: Node.js reads `package.json`

**Returns**:
```json
{
  "status": "success",
  "data": {
    "currentVersion": "15.2.0",
    "targetVersion": "20.0.0",
    "migrationPath": ["16.0.0", "17.0.0", "18.0.0", "19.0.0", "20.0.0"],
    "nodeVersion": "18.19.0",
    "nodeVersionRequired": "18.13.0+",
    "nodeVersionCompatible": true
  },
  "nextAction": "Run prerequisites check to validate environment",
  "instructionRef": "guide://prerequisites",
  "userAction": null,
  "automated": true
}
```

**Implementation Notes**:
- Use Node.js `fs.readFileSync` to read `package.json`
- Parse `@angular/core` version
- Check `process.version` for Node.js version
- Return full migration path

---

#### Tool: `check_migration_prerequisites`

**Purpose**: Validate project is ready for migration

**Parameters**:
- `projectPath` (optional): Path to project
- `targetVersion`: Target Angular version (e.g., "20")

**Implementation**: Node.js checks via `child_process.execSync`

**Returns**:
```json
{
  "status": "success",
  "data": {
    "ready": false,
    "blockers": [
      {
        "type": "git_uncommitted_changes",
        "message": "Project has uncommitted changes",
        "severity": "high"
      },
      {
        "type": "node_version",
        "message": "Node.js 14.x is below required 18.13.0+",
        "severity": "critical"
      }
    ],
    "warnings": [
      {
        "type": "backup_missing",
        "message": "No backup detected in .migration-backup/"
      }
    ],
    "checks": {
      "gitClean": false,
      "nodeVersion": false,
      "backupExists": false,
      "angularCli": true
    }
  },
  "nextAction": "Resolve critical blockers before proceeding",
  "instructionRef": "guide://prerequisites",
  "userAction": "git status && git commit -am 'Pre-migration snapshot'",
  "automated": false
}
```

**Implementation Notes**:
- Execute `git status --porcelain` via Node.js
- Check Node.js version via `process.version`
- Check for `.migration-backup/` directory
- Validate `@angular/cli` in dependencies

---

#### Tool: `generate_migration_plan`

**Purpose**: Create comprehensive step-by-step migration plan

**Parameters**:
- `fromVersion`: Source Angular version (e.g., "15")
- `toVersion`: Target Angular version (e.g., "20")
- `includeOptional`: Include optional migrations (default: false)

**Returns**:
```json
{
  "status": "success",
  "data": {
    "fromVersion": "15.0.0",
    "toVersion": "20.0.0",
    "estimatedDuration": "25-35 hours",
    "riskLevel": "medium",
    "steps": [
      {
        "phase": "preparation",
        "order": 1,
        "action": "Verify prerequisites",
        "tool": "check_migration_prerequisites",
        "automated": true,
        "estimatedTime": "30 minutes"
      },
      {
        "phase": "preparation",
        "order": 2,
        "action": "Create backup",
        "tool": "create_backup",
        "automated": true,
        "estimatedTime": "15 minutes"
      },
      {
        "phase": "migration",
        "order": 3,
        "version": "16",
        "action": "Migrate to Angular 16",
        "tool": "execute_version_migration",
        "automated": true,
        "estimatedTime": "3-5 hours"
      }
    ],
    "breakingChangesCount": 47,
    "documentationReferences": [
      "guide://migrate/v16",
      "guide://migrate/v17",
      "guide://migrate/v18",
      "guide://migrate/v19",
      "guide://migrate/v20"
    ]
  },
  "nextAction": "Review migration plan and run prerequisites check",
  "instructionRef": "guide://migrate/v15",
  "automated": false
}
```

---

### Category 2: Breaking Changes Detection

#### Tool: `detect_breaking_changes`

**Purpose**: Scan codebase for version-specific breaking changes

**Parameters**:
- `fromVersion`: Source Angular version (e.g., "17")
- `toVersion`: Target Angular version (e.g., "18")
- `projectPath` (optional): Path to project

**Implementation**: Node.js TypeScript AST parsing + regex patterns

**Returns**:
```json
{
  "status": "success",
  "data": {
    "version": "18",
    "scanCompleted": true,
    "filesScanned": 156,
    "breakingChanges": [
      {
        "id": "v18-http-client-module",
        "category": "Deprecated API",
        "severity": "critical",
        "description": "HttpClientModule is deprecated",
        "affectedFiles": [
          {
            "path": "src/app/app.module.ts",
            "line": 15,
            "snippet": "imports: [HttpClientModule]"
          }
        ],
        "autoFixAvailable": false,
        "schematicAvailable": true,
        "migrationGuide": "breaking-changes://v18#http-client-module"
      },
      {
        "id": "v18-state-key-imports",
        "category": "Import Changes",
        "severity": "medium",
        "description": "StateKey/TransferState moved to @angular/core",
        "affectedFiles": [
          {
            "path": "src/app/transfer-state.service.ts",
            "line": 3,
            "snippet": "import { StateKey } from '@angular/platform-browser';"
          }
        ],
        "autoFixAvailable": true,
        "schematicAvailable": false,
        "migrationGuide": "breaking-changes://v18#state-key-imports"
      }
    ],
    "totalIssues": 12,
    "criticalIssues": 1,
    "autoFixableIssues": 5
  },
  "nextAction": "Review detected breaking changes and apply automated fixes",
  "instructionRef": "breaking-changes://v18",
  "userAction": null,
  "automated": true
}
```

**Implementation Notes**:
- Use `@typescript-eslint/parser` for AST parsing
- Implement regex patterns for each breaking change
- Use `glob` to find TypeScript files
- Read files via Node.js `fs` module
- Return line numbers and code snippets

---

#### Tool: `get_breaking_changes_documentation`

**Purpose**: Retrieve version-specific breaking changes documentation

**Parameters**:
- `version`: Angular version (e.g., "18")

**Returns**:
```json
{
  "status": "success",
  "data": {
    "version": "18",
    "resourceUri": "breaking-changes://v18",
    "summary": "Angular 18 deprecates HttpClientModule, moves StateKey to @angular/core, removes ServerTransferStateModule",
    "criticalChanges": [
      {
        "title": "HttpClientModule Deprecated",
        "description": "Replace with provideHttpClient()",
        "impact": "Critical - Application HTTP calls may break",
        "autoFixed": false
      },
      {
        "title": "StateKey Import Change",
        "description": "Import from @angular/core instead of @angular/platform-browser",
        "impact": "Medium - Build errors",
        "autoFixed": true
      }
    ],
    "totalChanges": 12,
    "officialGuideUrl": "https://angular.io/guide/update-to-version-18"
  },
  "nextAction": "Read full documentation for migration instructions",
  "instructionRef": "breaking-changes://v18",
  "automated": false
}
```

**Implementation Notes**:
- Parse PowerShell module comments to extract breaking changes
- Return reference to MCP resource
- Link to official Angular documentation

---

### Category 3: Code Transformation

#### Tool: `apply_automated_fixes`

**Purpose**: Apply automated code fixes for detected breaking changes

**Parameters**:
- `version`: Target Angular version
- `changeIds`: Array of breaking change IDs to fix (optional, defaults to all auto-fixable)
- `dryRun`: Boolean (default: true)
- `projectPath` (optional): Path to project

**Implementation**: Node.js file I/O + regex replacements

**Returns**:
```json
{
  "status": "success",
  "data": {
    "dryRun": true,
    "version": "18",
    "changesApplied": 0,
    "changesProposed": [
      {
        "changeId": "v18-state-key-imports",
        "file": "src/app/transfer-state.service.ts",
        "transformations": [
          {
            "line": 3,
            "before": "import { StateKey, TransferState } from '@angular/platform-browser';",
            "after": "import { StateKey, TransferState } from '@angular/core';",
            "applied": false
          }
        ]
      }
    ],
    "filesAffected": 5,
    "backupCreated": false
  },
  "nextAction": "Review proposed changes, then run with dryRun=false to apply",
  "instructionRef": "breaking-changes://v18",
  "userAction": null,
  "automated": true
}
```

**With dryRun=false**:
```json
{
  "status": "success",
  "data": {
    "dryRun": false,
    "version": "18",
    "changesApplied": 5,
    "filesModified": [
      "src/app/transfer-state.service.ts",
      "src/app/server/server.module.ts"
    ],
    "backupLocation": ".migration-backup/2025-01-06_14-30-00"
  },
  "nextAction": "Validate changes by running build",
  "instructionRef": "guide://migrate/v18",
  "userAction": "npm run build",
  "automated": false
}
```

**Implementation Notes**:
- Use Node.js `fs.readFileSync` and `fs.writeFileSync`
- Implement regex-based replacements
- Create backup directory via `fs.mkdirSync`
- Use `fs.cpSync` to backup files before modification

---

#### Tool: `analyze_dependency_compatibility`

**Purpose**: Check package.json dependencies against target Angular version

**Parameters**:
- `targetVersion`: Target Angular version (e.g., "18")
- `projectPath` (optional): Path to project

**Implementation**: Node.js reads `package.json` and compares versions

**Returns**:
```json
{
  "status": "success",
  "data": {
    "targetVersion": "18.2.0",
    "compatible": [
      {
        "package": "@angular/material",
        "currentVersion": "17.3.0",
        "compatibleVersion": "18.2.0",
        "updateRequired": true
      }
    ],
    "incompatible": [
      {
        "package": "@ngrx/store",
        "currentVersion": "14.0.0",
        "recommendedVersion": "18.0.0",
        "reason": "Peer dependency mismatch with Angular 18",
        "breaking": true
      }
    ],
    "peerDependencyWarnings": [
      {
        "package": "rxjs",
        "currentVersion": "7.5.0",
        "requiredVersion": "^7.8.0",
        "severity": "warning"
      }
    ]
  },
  "nextAction": "Review dependency updates and update package.json",
  "instructionRef": "guide://migrate/v18",
  "userAction": "User must run: npm install (after package.json update)",
  "automated": false
}
```

**Implementation Notes**:
- Read `package.json` via Node.js
- Compare versions using `semver` npm package
- Check peer dependencies from package metadata

---

### Category 4: Backup & File Operations

#### Tool: `create_backup`

**Purpose**: Create timestamped backup of project files

**Parameters**:
- `projectPath` (optional): Path to project
- `backupLocation` (optional): Custom backup directory

**Implementation**: Node.js file system operations

**Returns**:
```json
{
  "status": "success",
  "data": {
    "backupPath": ".migration-backup/2025-01-06_14-30-00",
    "filesBackedUp": 1247,
    "backupSizeMB": 145.3,
    "excludedPatterns": ["node_modules", "dist", ".git"],
    "timestamp": "2025-01-06T14:30:00Z"
  },
  "nextAction": "Backup created successfully - proceed with migration",
  "instructionRef": "guide://backup",
  "userAction": null,
  "automated": true
}
```

**Implementation Notes**:
- Use Node.js `fs.cpSync` with recursive option
- Create timestamped directory
- Exclude `node_modules`, `dist`, `.git` directories
- Calculate backup size

---

#### Tool: `restore_backup`

**Purpose**: Restore project from backup

**Parameters**:
- `backupPath`: Path to backup directory
- `projectPath` (optional): Path to restore to

**Implementation**: Node.js file operations

**Returns**:
```json
{
  "status": "success",
  "data": {
    "backupPath": ".migration-backup/2025-01-06_14-30-00",
    "filesRestored": 1247,
    "restoredTo": "/path/to/project"
  },
  "nextAction": "Backup restored - reinstall dependencies",
  "instructionRef": "guide://troubleshooting",
  "userAction": "npm install",
  "automated": false
}
```

---

### Category 5: Migration Execution

#### Tool: `execute_version_migration`

**Purpose**: Execute full migration for a single version increment

**Parameters**:
- `targetVersion`: Target Angular version (e.g., "16")
- `projectPath` (optional): Path to project
- `autoCommit`: Boolean (default: false)

**Implementation**: Node.js orchestration of migration steps

**Returns**:
```json
{
  "status": "success",
  "data": {
    "targetVersion": "16.0.0",
    "completedSteps": [
      {
        "step": "backup_creation",
        "status": "success",
        "message": "Backup created at .migration-backup/..."
      },
      {
        "step": "package_update",
        "status": "success",
        "message": "Updated package.json to Angular 16"
      },
      {
        "step": "dependency_install",
        "status": "pending",
        "message": "User must run: npm install"
      },
      {
        "step": "breaking_changes_detection",
        "status": "success",
        "issuesFound": 8
      },
      {
        "step": "automated_fixes",
        "status": "success",
        "fixesApplied": 5
      },
      {
        "step": "ng_update_schematics",
        "status": "pending",
        "message": "User must run Angular schematics"
      }
    ],
    "pendingUserActions": [
      "npm install",
      "npx ng update @angular/core@16 --migrate-only --allow-dirty",
      "npx ng update @angular/cli@16 --migrate-only --allow-dirty"
    ],
    "nextPhase": "validation"
  },
  "nextAction": "Complete pending user actions, then run validation",
  "instructionRef": "guide://migrate/v16",
  "userAction": "npm install",
  "automated": false
}
```

**Implementation Notes**:
- Orchestrate multiple tools in sequence
- Pause at steps requiring user action
- Track progress through migration phases
- Update package.json via Node.js

---

#### Tool: `update_package_json`

**Purpose**: Update package.json with target Angular version dependencies

**Parameters**:
- `targetVersion`: Target Angular version (e.g., "18")
- `projectPath` (optional): Path to project
- `dryRun`: Boolean (default: true)

**Implementation**: Node.js JSON manipulation

**Returns**:
```json
{
  "status": "success",
  "data": {
    "dryRun": true,
    "targetVersion": "18.2.0",
    "updates": [
      {
        "package": "@angular/core",
        "from": "17.3.0",
        "to": "18.2.0"
      },
      {
        "package": "@angular/cli",
        "from": "17.3.0",
        "to": "18.2.0"
      },
      {
        "package": "typescript",
        "from": "5.2.2",
        "to": "5.4.5"
      }
    ],
    "packagesUpdated": 12
  },
  "nextAction": "Review updates, then run with dryRun=false to apply",
  "instructionRef": "guide://migrate/v18",
  "userAction": null,
  "automated": true
}
```

**Implementation Notes**:
- Use Node.js `JSON.parse` and `JSON.stringify`
- Update dependencies and devDependencies
- Maintain formatting with proper indentation
- Write back via `fs.writeFileSync`

---

### Category 6: Validation & Testing

#### Tool: `validate_migration`

**Purpose**: Run checks after migration steps

**Parameters**:
- `checks`: Array of check types ["typescript", "build", "test", "lint"] (optional, defaults to ["typescript"])
- `projectPath` (optional): Path to project

**Implementation**: Node.js executes validation commands

**Returns**:
```json
{
  "status": "success",
  "data": {
    "checksRun": ["typescript"],
    "results": [
      {
        "check": "typescript_compilation",
        "status": "passed",
        "command": "npx tsc --noEmit",
        "duration": "12s",
        "errors": 0
      }
    ],
    "overall": "passed",
    "passedChecks": 1,
    "failedChecks": 0,
    "pendingChecks": 0,
    "buildCheckPending": true,
    "testCheckPending": true
  },
  "nextAction": "TypeScript compilation passed - user should run build and tests",
  "instructionRef": "guide://validation",
  "userAction": "npm run build && npm test",
  "automated": false
}
```

**Implementation Notes**:
- Only TypeScript compilation is automated via `child_process.execSync`
- Build and test are user responsibilities
- Parse compiler output for errors
- Return actionable error messages

---

#### Tool: `generate_migration_report`

**Purpose**: Create comprehensive migration summary

**Parameters**:
- `fromVersion`: Starting version
- `toVersion`: Ending version
- `projectPath` (optional): Path to project

**Implementation**: Node.js aggregates migration data

**Returns**:
```json
{
  "status": "success",
  "data": {
    "migration": {
      "from": "15.0.0",
      "to": "20.0.0",
      "completedAt": "2025-01-06T14:30:00Z",
      "duration": "28 hours"
    },
    "summary": {
      "versionsUpgraded": 5,
      "filesModified": 142,
      "breakingChangesFixed": 47,
      "backupsCreated": 6
    },
    "breakingChangesSummary": [
      {
        "version": "16",
        "totalChanges": 8,
        "autoFixed": 5,
        "manualFixed": 3
      },
      {
        "version": "18",
        "totalChanges": 12,
        "autoFixed": 5,
        "manualFixed": 7
      }
    ],
    "remainingTasks": [
      "Run: npm run build",
      "Run: npm test",
      "Commit changes to git"
    ],
    "recommendations": [
      "Consider migrating to standalone components",
      "Explore signal-based state management",
      "Review Angular 20 new features documentation"
    ]
  },
  "nextAction": "Review report and complete remaining tasks",
  "instructionRef": "guide://validation",
  "userAction": "npm run build && npm test",
  "automated": false
}
```

---

### Category 7: Rollback & Recovery

#### Tool: `get_rollback_instructions`

**Purpose**: Provide step-by-step rollback instructions

**Parameters**:
- `backupLocation` (optional): Path to backup
- `version`: Version to rollback from

**Returns**:
```json
{
  "status": "success",
  "data": {
    "rollbackMethod": "backup",
    "availableBackups": [
      {
        "path": ".migration-backup/2025-01-06_14-30-00",
        "version": "17.0.0",
        "created": "2025-01-06T14:30:00Z"
      }
    ],
    "steps": [
      {
        "order": 1,
        "action": "Use restore_backup tool",
        "tool": "restore_backup",
        "automated": true
      },
      {
        "order": 2,
        "action": "Reinstall dependencies",
        "command": "npm install",
        "userAction": true
      },
      {
        "order": 3,
        "action": "Verify rollback",
        "command": "npm run build && npm test",
        "userAction": true
      }
    ],
    "gitRollbackAvailable": true,
    "alternativeMethod": {
      "type": "git_reset",
      "command": "git reset --hard <commit-hash>",
      "warning": "Use only if backup restore fails"
    }
  },
  "nextAction": "Use restore_backup tool or git reset",
  "instructionRef": "guide://troubleshooting",
  "userAction": null,
  "automated": false
}
```

---

## Tool Response Format Standard

All tools **MUST** return responses in this consistent format:

```typescript
interface ToolResponse {
  status: "success" | "warning" | "error";
  data: object; // Tool-specific data
  nextAction: string; // Clear instruction for next step
  instructionRef: string | null; // MCP Resource URI or null
  userAction: string | null; // Command user must run manually or null
  automated: boolean; // Whether this tool performs automated actions
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  status: "error";
  error: {
    code: string; // ERROR_CODE in UPPER_SNAKE_CASE
    message: string; // Human-readable error
    details: string; // Technical details for debugging
  };
  nextAction: string; // How to resolve the error
  rollbackAvailable: boolean;
  instructionRef: string | null;
}
```

---

## Version-Specific Breaking Changes Detection

Each version has specific breaking change patterns to detect via **Node.js TypeScript AST parsing and regex**:

### Angular 15 Breaking Changes
```typescript
const v15BreakingChanges = {
  'router-guards-boolean': {
    pattern: /canActivate.*:\s*boolean/,
    description: 'Router guards must return Observable<boolean | UrlTree>',
    autoFix: false
  }
  // ... more patterns
};
```

### Angular 16 Breaking Changes
```typescript
const v16BreakingChanges = {
  'material-chips-deprecated': {
    pattern: /MatChipInputEvent|mat-chip-list/,
    description: 'Material Chips API deprecated',
    autoFix: false
  },
  'provided-in-any': {
    pattern: /providedIn:\s*['"]any['"]/,
    description: "providedIn: 'any' is deprecated",
    autoFix: true,
    replacement: "providedIn: 'root'"
  }
  // ... more patterns
};
```

### Angular 17 Breaking Changes
```typescript
const v17BreakingChanges = {
  'control-flow-ngif': {
    pattern: /\*ngIf/,
    description: 'Consider migrating to new @if syntax',
    autoFix: false,
    schematic: 'ng generate @angular/core:control-flow'
  },
  'inject-usage': {
    pattern: /constructor\s*\([^)]*private.*:\s*\w+/,
    description: 'Consider using inject() function',
    autoFix: false
  }
  // ... more patterns
};
```

### Angular 18 Breaking Changes
```typescript
const v18BreakingChanges = {
  'http-client-module': {
    pattern: /HttpClientModule/,
    description: 'HttpClientModule deprecated - use provideHttpClient()',
    autoFix: false,
    schematic: true
  },
  'state-key-imports': {
    pattern: /from\s+['"]@angular\/platform-browser['"]/,
    context: /(StateKey|TransferState|makeStateKey)/,
    description: 'StateKey/TransferState moved to @angular/core',
    autoFix: true,
    replacement: "from '@angular/core'"
  },
  'server-transfer-state-module': {
    pattern: /ServerTransferStateModule/,
    description: 'ServerTransferStateModule removed',
    autoFix: false
  }
  // ... more patterns (12 total from v18.psm1)
};
```

### Angular 19 Breaking Changes
```typescript
const v19BreakingChanges = {
  'aggrid-breaking-changes': {
    pattern: /ag-grid-angular|ag-grid-community/,
    description: 'AG-Grid breaking changes in v32+',
    autoFix: false
  }
  // ... more patterns
};
```

### Angular 20 Breaking Changes
```typescript
const v20BreakingChanges = {
  'highcharts-updates': {
    pattern: /highcharts/,
    description: 'Highcharts compatibility updates',
    autoFix: false
  }
  // ... more patterns
};
```

---

## Node.js Implementation Requirements

### File Operations
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Read package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8')
);

// Update package.json
fs.writeFileSync(
  path.join(projectPath, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n'
);

// Create backup
fs.cpSync(projectPath, backupPath, {
  recursive: true,
  filter: (src) => !src.includes('node_modules')
});
```

### AST Parsing for Breaking Changes
```typescript
import * as ts from 'typescript';
import { parse } from '@typescript-eslint/parser';

function detectBreakingChanges(filePath: string, patterns: BreakingChangePattern[]) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const detectedIssues = [];

  for (const pattern of patterns) {
    const matches = content.match(pattern.pattern);
    if (matches) {
      // Get line number
      const lines = content.split('\n');
      const lineNumber = lines.findIndex(line => pattern.pattern.test(line)) + 1;

      detectedIssues.push({
        id: pattern.id,
        file: filePath,
        line: lineNumber,
        snippet: lines[lineNumber - 1].trim()
      });
    }
  }

  return detectedIssues;
}
```

### File Scanning
```typescript
import { glob } from 'glob';

async function scanProject(projectPath: string) {
  const tsFiles = await glob('**/*.ts', {
    cwd: projectPath,
    ignore: ['**/node_modules/**', '**/dist/**']
  });

  return tsFiles.map(f => path.join(projectPath, f));
}
```

### Automated Fixes
```typescript
function applyAutomatedFix(
  filePath: string,
  pattern: RegExp,
  replacement: string
): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(pattern, replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
}
```

---

## Integration with Existing Documentation

### PowerShell Module Knowledge Extraction

The PowerShell modules contain valuable breaking changes documentation. The MCP server should **parse and extract** this knowledge:

**Example from v18.psm1**:
```powershell
# Lines 55-96: StateKey/TransferState Import Fix
# Lines 99-188: HttpClientModule Deprecation Detection
# Lines 190-216: ServerTransferStateModule Removal Detection
# Lines 218-255: Removed Platform APIs Detection
# Lines 258-389: Comprehensive Manual Review Warnings
```

**Node.js extraction approach**:
```typescript
function extractBreakingChangesFromPowerShell(version: string): BreakingChange[] {
  const psFilePath = `migrations/scripts/modules/breaking-changes/v${version}.psm1`;
  const content = fs.readFileSync(psFilePath, 'utf-8');

  // Parse comments and sections
  // Extract patterns, descriptions, auto-fix availability
  // Return structured breaking changes data
}
```

---

## User Action Requirements

Tools **MUST** instruct users to perform:

1. **Dependency Installation**:
   ```json
   "userAction": "npm install"
   ```

2. **Build Operations**:
   ```json
   "userAction": "npm run build"
   ```

3. **Test Execution**:
   ```json
   "userAction": "npm test"
   ```

4. **Angular Schematics**:
   ```json
   "userAction": "npx ng update @angular/core@18 --migrate-only --allow-dirty"
   ```

5. **Git Operations** (unless autoCommit=true):
   ```json
   "userAction": "git add . && git commit -m 'migration message'"
   ```

---

## Security & Safety Protocols

### 1. Backup Before Transformations
- Check for backup via `fs.existsSync('.migration-backup')`
- Create backup automatically when `dryRun=false`
- Use timestamped backup directories

### 2. Dry-Run by Default
```json
{
  "dryRun": true  // Default for all code transformation tools
}
```

### 3. File Validation
```typescript
if (!fs.existsSync(filePath)) {
  throw new Error(`File not found: ${filePath}`);
}
```

### 4. Never Delete Critical Files
- Never auto-delete `node_modules`
- Never auto-delete `package-lock.json` without backup
- Never delete user code without explicit confirmation

---

## Example Agent Interaction

**User**: "Migrate my project from Angular 17 to 18"

**Agent Flow**:
```
1. analyze_project_version()
   → Current: 17.3.0, Target: 18.2.0 ✅

2. check_migration_prerequisites(targetVersion: "18")
   → Git clean ✅, Node 18.19.0 ✅, No blockers

3. create_backup()
   → Backup created: .migration-backup/2025-01-06_14-30-00 ✅

4. detect_breaking_changes(fromVersion: "17", toVersion: "18")
   → Found 12 issues:
     • HttpClientModule deprecated (CRITICAL)
     • StateKey imports (auto-fixable)
     • ServerTransferStateModule removed
     • [... 9 more ...]

5. apply_automated_fixes(version: "18", dryRun: true)
   → Proposed 5 fixes for review

6. User approves → apply_automated_fixes(dryRun: false)
   → Applied 5 fixes ✅

7. update_package_json(targetVersion: "18", dryRun: false)
   → Updated 12 packages ✅

8. PAUSE → User Action: npm install

9. PAUSE → User Action: npx ng update @angular/core@18 --migrate-only --allow-dirty

10. validate_migration(checks: ["typescript"])
    → TypeScript compilation passed ✅

11. PAUSE → User Action: npm run build && npm test

12. generate_migration_report()
    → Migration complete! 12 breaking changes fixed.
```

---

## Summary

This MCP server provides:

✅ **Node.js-based automation** - No shell script dependencies
✅ **Single responsibility tools** - Clear boundaries
✅ **User control** - Critical operations require user action
✅ **Version-aware detection** - AST parsing + regex patterns
✅ **MCP Resources** - Documentation via URIs
✅ **Safe defaults** - Dry-run, backups, validation
✅ **TypeScript implementation** - Type-safe, maintainable

---

**Version**: 1.0.0
**Last Updated**: 2025-01-06
**Technology Stack**: Node.js, TypeScript, @typescript-eslint/parser, glob, semver

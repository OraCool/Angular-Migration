# Code Review: DRY & SOLID Principles

## Executive Summary

**Overall Assessment**: ⚠️ Moderate violations found
**Priority**: Address high-impact issues first
**Estimated Refactoring Effort**: 4-6 hours

---

## DRY (Don't Repeat Yourself) Violations

### 🔴 **HIGH PRIORITY - Repeated Error Response Creation**

**Location**: `src/tools/analysis-planning.ts` and `src/tools/breaking-changes-detection.ts`

**Issue**: Error response objects are manually constructed in multiple places with identical structure.

**Examples**:

```typescript
// analysis-planning.ts:34-45
return {
  status: 'error',
  error: {
    code: 'PACKAGE_JSON_NOT_FOUND',
    message: 'package.json not found in project directory',
    details: `Path checked: ${packageJsonPath}`,
  },
  nextAction: 'Verify projectPath points to valid Angular project root',
  rollbackAvailable: false,
  instructionRef: 'guide://prerequisites',
};

// breaking-changes-detection.ts:238-246 (similar structure)
return {
  status: 'error',
  error: {
    code: 'UNSUPPORTED_VERSION',
    message: `No breaking change patterns for Angular ${toVersion}`,
    details: 'Supported versions: 15, 16, 17, 18, 19, 20',
  },
  nextAction: 'Use a supported Angular version',
  rollbackAvailable: false,
  instructionRef: `breaking-changes://v${toVersion}`,
};
```

**Violation Count**: 10+ instances across files

**Recommended Fix**:

```typescript
// Create in src/utils/responses.ts
export class ResponseBuilder {
  static error(params: {
    code: string;
    message: string;
    details: string;
    nextAction: string;
    rollbackAvailable?: boolean;
    instructionRef?: string;
  }): StandardErrorResponse {
    return {
      status: 'error',
      error: {
        code: params.code,
        message: params.message,
        details: params.details,
      },
      nextAction: params.nextAction,
      rollbackAvailable: params.rollbackAvailable ?? false,
      instructionRef: params.instructionRef ?? null,
    };
  }

  static success(params: {
    data: unknown;
    nextAction: string;
    instructionRef?: string;
    userAction?: string;
    automated?: boolean;
  }): StandardToolResponse {
    return {
      status: 'success',
      data: params.data,
      nextAction: params.nextAction,
      instructionRef: params.instructionRef ?? null,
      userAction: params.userAction ?? null,
      automated: params.automated ?? true,
    };
  }

  static warning(params: {
    data: unknown;
    nextAction: string;
    instructionRef?: string;
    userAction?: string;
    automated?: boolean;
  }): StandardToolResponse {
    return {
      status: 'warning',
      data: params.data,
      nextAction: params.nextAction,
      instructionRef: params.instructionRef ?? null,
      userAction: params.userAction ?? null,
      automated: params.automated ?? false,
    };
  }
}

// Usage:
return ResponseBuilder.error({
  code: 'PACKAGE_JSON_NOT_FOUND',
  message: 'package.json not found in project directory',
  details: `Path checked: ${packageJsonPath}`,
  nextAction: 'Verify projectPath points to valid Angular project root',
  instructionRef: 'guide://prerequisites',
});
```

**Impact**: High - affects maintainability and consistency

---

### 🔴 **HIGH PRIORITY - Repeated File System Operations**

**Location**: `src/tools/analysis-planning.ts` and `src/tools/breaking-changes-detection.ts`

**Issue**: package.json reading logic is duplicated

**Examples**:

```typescript
// analysis-planning.ts:32-48
const packageJsonPath = path.join(projectPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  return { /* error */ };
}
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const angularCore = packageJson.dependencies?.['@angular/core'] || packageJson.devDependencies?.['@angular/core'];

// This same pattern could be repeated elsewhere
```

**Recommended Fix**:

```typescript
// Create in src/utils/project.ts
export class ProjectUtils {
  static readPackageJson(projectPath: string): {
    success: boolean;
    data?: any;
    error?: string;
  } {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return {
        success: false,
        error: `package.json not found at ${packageJsonPath}`,
      };
    }

    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      return {
        success: true,
        data: JSON.parse(content),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse package.json: ${error}`,
      };
    }
  }

  static getAngularVersion(projectPath: string): {
    success: boolean;
    version?: string;
    major?: number;
    error?: string;
  } {
    const pkgResult = this.readPackageJson(projectPath);
    if (!pkgResult.success) {
      return { success: false, error: pkgResult.error };
    }

    const angularCore =
      pkgResult.data.dependencies?.['@angular/core'] ||
      pkgResult.data.devDependencies?.['@angular/core'];

    if (!angularCore) {
      return {
        success: false,
        error: '@angular/core not found in dependencies',
      };
    }

    const versionMatch = angularCore.match(/(\d+)\./);
    const major = versionMatch ? parseInt(versionMatch[1], 10) : 0;

    return {
      success: true,
      version: angularCore,
      major,
    };
  }

  static getNodeVersion(): {
    version: string;
    major: number;
  } {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);
    return { version, major };
  }
}

// Usage:
const angularVersion = ProjectUtils.getAngularVersion(projectPath);
if (!angularVersion.success) {
  return ResponseBuilder.error({
    code: 'ANGULAR_NOT_FOUND',
    message: angularVersion.error!,
    details: 'This does not appear to be an Angular project',
    nextAction: 'Verify this is an Angular project directory',
    instructionRef: 'guide://prerequisites',
  });
}
```

---

### 🟡 **MEDIUM PRIORITY - Repeated TypeScript File Scanning**

**Location**: `src/tools/breaking-changes-detection.ts:288-303`

**Issue**: File scanning logic could be reused across multiple tools

```typescript
// Current implementation
function findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'coverage', '.angular'].includes(file)) {
        findTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}
```

**Recommended Fix**:

```typescript
// Create in src/utils/file-scanner.ts
export interface ScanOptions {
  extensions?: string[];
  excludePatterns?: string[];
  excludeDirs?: string[];
  includeTests?: boolean;
}

export class FileScanner {
  private static readonly DEFAULT_EXCLUDE_DIRS = [
    'node_modules',
    'dist',
    'coverage',
    '.angular',
    '.git',
  ];

  static findFiles(
    dir: string,
    options: ScanOptions = {}
  ): string[] {
    const {
      extensions = ['.ts'],
      excludePatterns = ['*.spec.ts'],
      excludeDirs = this.DEFAULT_EXCLUDE_DIRS,
      includeTests = false,
    } = options;

    const fileList: string[] = [];
    this.scanDirectory(dir, fileList, extensions, excludePatterns, excludeDirs, includeTests);
    return fileList;
  }

  private static scanDirectory(
    dir: string,
    fileList: string[],
    extensions: string[],
    excludePatterns: string[],
    excludeDirs: string[],
    includeTests: boolean
  ): void {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (!excludeDirs.includes(file)) {
          this.scanDirectory(filePath, fileList, extensions, excludePatterns, excludeDirs, includeTests);
        }
      } else {
        const hasValidExtension = extensions.some(ext => file.endsWith(ext));
        const isExcluded = !includeTests && excludePatterns.some(pattern =>
          this.matchPattern(file, pattern)
        );

        if (hasValidExtension && !isExcluded) {
          fileList.push(filePath);
        }
      }
    }
  }

  private static matchPattern(filename: string, pattern: string): boolean {
    // Simple pattern matching (can be enhanced with minimatch library)
    return pattern.includes('*')
      ? filename.endsWith(pattern.replace('*', ''))
      : filename === pattern;
  }
}

// Usage:
const tsFiles = FileScanner.findFiles(projectPath, {
  extensions: ['.ts'],
  includeTests: false,
});
```

---

### 🟡 **MEDIUM PRIORITY - Repeated Progress Callback Patterns**

**Location**: Throughout all tool files

**Issue**: Progress callbacks follow identical patterns

```typescript
progressCallback({
  message: `Analyzing Angular project at: ${projectPath}`,
  type: 'info',
  progress: 10,
});

progressCallback({
  message: 'Parsing Angular version',
  type: 'info',
  progress: 40,
});
```

**Recommended Fix**:

```typescript
// Create in src/utils/progress.ts
export class ProgressTracker {
  constructor(
    private callback: ProgressCallback,
    private totalSteps: number
  ) {}

  step(step: number, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const progress = (step / this.totalSteps) * 100;
    this.callback({
      message,
      type,
      progress,
      currentStep: message,
      totalSteps: this.totalSteps,
      completedSteps: step,
    });
  }

  complete(message: string = 'Complete'): void {
    this.callback({
      message,
      type: 'success',
      progress: 100,
      totalSteps: this.totalSteps,
      completedSteps: this.totalSteps,
    });
  }

  error(message: string): void {
    this.callback({
      message,
      type: 'error',
      progress: undefined,
    });
  }
}

// Usage:
const progress = new ProgressTracker(progressCallback, 5);
progress.step(1, `Analyzing Angular project at: ${projectPath}`);
progress.step(2, 'Parsing Angular version');
progress.step(3, 'Checking Node.js version');
progress.step(4, 'Generating migration path');
progress.complete('Analysis complete');
```

---

## SOLID Principles Violations

### 🔴 **S - Single Responsibility Principle (SRP)**

#### **Violation 1: Tool Handler Functions Doing Too Much**

**Location**: `src/tools/analysis-planning.ts:18-146`

**Issue**: `analyzeProjectVersion` function has multiple responsibilities:
1. Reading package.json
2. Validating Angular installation
3. Parsing version numbers
4. Checking Node.js compatibility
5. Generating migration paths
6. Sending progress updates
7. Creating response objects

**Recommended Fix**:

```typescript
// Separate into smaller, focused classes
class ProjectAnalyzer {
  constructor(private projectPath: string) {}

  async analyze(): Promise<ProjectAnalysis> {
    const packageInfo = await this.readPackageInfo();
    const angularVersion = this.extractAngularVersion(packageInfo);
    const nodeCompatibility = this.checkNodeCompatibility(angularVersion);
    const migrationPath = this.generateMigrationPath(angularVersion);

    return {
      currentVersion: angularVersion.version,
      targetVersion: '20.0.0',
      migrationPath,
      nodeVersion: nodeCompatibility,
      projectPath: this.projectPath,
    };
  }

  private async readPackageInfo(): Promise<any> {
    // Focused on reading package.json
  }

  private extractAngularVersion(packageInfo: any): AngularVersionInfo {
    // Focused on extracting Angular version
  }

  private checkNodeCompatibility(version: AngularVersionInfo): NodeVersionCheck {
    // Focused on Node.js compatibility
  }

  private generateMigrationPath(version: AngularVersionInfo): string[] {
    // Focused on generating migration path
  }
}

// Tool function becomes orchestrator
export async function analyzeProjectVersion(
  args: { projectPath?: string },
  sessionManager: SessionManager,
  progressCallback: ProgressCallback
): Promise<StandardToolResponse | StandardErrorResponse> {
  const projectPath = args.projectPath || process.cwd();
  const progress = new ProgressTracker(progressCallback, 5);

  try {
    progress.step(1, `Analyzing Angular project at: ${projectPath}`);

    const analyzer = new ProjectAnalyzer(projectPath);
    const analysis = await analyzer.analyze();

    progress.complete('Analysis complete');

    return ResponseBuilder.success({
      data: analysis,
      nextAction: 'Run prerequisites check to validate environment',
      instructionRef: 'guide://prerequisites',
    });
  } catch (error) {
    return ResponseBuilder.error({
      code: 'ANALYSIS_FAILED',
      message: 'Failed to analyze project',
      details: error.message,
      nextAction: 'Check project structure and try again',
      instructionRef: 'guide://troubleshooting',
    });
  }
}
```

**Impact**: High - improves testability and maintainability

---

#### **Violation 2: Breaking Changes Module Mixes Pattern Definitions with Detection Logic**

**Location**: `src/tools/breaking-changes-detection.ts`

**Issue**: Pattern definitions (lines 32-155) and detection logic (lines 288+) are in the same module

**Recommended Fix**:

```typescript
// Create src/patterns/breaking-changes/index.ts
export { V15_BREAKING_CHANGES } from './v15.js';
export { V16_BREAKING_CHANGES } from './v16.js';
export { V17_BREAKING_CHANGES } from './v17.js';
export { V18_BREAKING_CHANGES } from './v18.js';
export { V19_BREAKING_CHANGES } from './v19.js';
export { V20_BREAKING_CHANGES } from './v20.js';

// Create src/patterns/breaking-changes/v18.ts
export const V18_BREAKING_CHANGES: BreakingChangePattern[] = [
  {
    id: 'v18-http-client-module',
    category: 'Deprecated API',
    severity: 'critical',
    description: 'HttpClientModule deprecated - use provideHttpClient()',
    pattern: /HttpClientModule/,
    autoFix: false,
    schematic: true,
    migrationGuide: 'breaking-changes://v18#http-client-module',
  },
  // ... more patterns
];

// Create src/services/breaking-changes-scanner.ts
export class BreakingChangesScanner {
  constructor(private projectPath: string) {}

  async scan(patterns: BreakingChangePattern[]): Promise<BreakingChangeDetection[]> {
    const files = FileScanner.findFiles(this.projectPath);
    const detections: BreakingChangeDetection[] = [];

    for (const file of files) {
      const fileDetections = this.scanFile(file, patterns);
      detections.push(...fileDetections);
    }

    return this.deduplicateDetections(detections);
  }

  private scanFile(filePath: string, patterns: BreakingChangePattern[]): BreakingChangeDetection[] {
    // Scanning logic
  }

  private deduplicateDetections(detections: BreakingChangeDetection[]): BreakingChangeDetection[] {
    // Deduplication logic
  }
}
```

---

### 🟡 **O - Open/Closed Principle (OCP)**

#### **Violation: Hard-coded Version Patterns**

**Location**: `src/tools/breaking-changes-detection.ts:157-164`

**Issue**: Adding new Angular versions requires modifying existing code

```typescript
const VERSION_PATTERNS: Record<string, BreakingChangePattern[]> = {
  '15': V15_BREAKING_CHANGES,
  '16': V16_BREAKING_CHANGES,
  '17': V17_BREAKING_CHANGES,
  '18': V18_BREAKING_CHANGES,
  '19': V19_BREAKING_CHANGES,
  '20': V20_BREAKING_CHANGES,
};
```

**Recommended Fix**:

```typescript
// Create a pattern registry that's open for extension
export class BreakingChangesRegistry {
  private patterns = new Map<string, BreakingChangePattern[]>();

  register(version: string, patterns: BreakingChangePattern[]): void {
    this.patterns.set(version, patterns);
  }

  get(version: string): BreakingChangePattern[] | undefined {
    return this.patterns.get(version);
  }

  getSupportedVersions(): string[] {
    return Array.from(this.patterns.keys()).sort();
  }

  static createDefault(): BreakingChangesRegistry {
    const registry = new BreakingChangesRegistry();

    // Auto-register from pattern files
    import('./patterns/v15.js').then(m => registry.register('15', m.V15_BREAKING_CHANGES));
    import('./patterns/v16.js').then(m => registry.register('16', m.V16_BREAKING_CHANGES));
    // ... etc

    return registry;
  }
}

// Adding Angular 21 support:
// 1. Create src/patterns/breaking-changes/v21.ts
// 2. Export patterns
// 3. No modification to existing code needed!
```

---

### 🟢 **L - Liskov Substitution Principle (LSP)**

**Status**: ✅ No violations found

The code doesn't use class inheritance hierarchies, so LSP doesn't directly apply. However, the interface-based approach is good.

---

### 🟡 **I - Interface Segregation Principle (ISP)**

#### **Minor Violation: BreakingChangePattern Interface**

**Location**: `src/tools/breaking-changes-detection.ts:16-27`

**Issue**: Not all patterns use all fields (e.g., `contextPattern`, `replacement`)

```typescript
interface BreakingChangePattern {
  id: string;
  category: string;
  severity: string;
  description: string;
  pattern: RegExp;
  contextPattern?: RegExp;  // Optional, not always needed
  autoFix: boolean;
  schematic: boolean;
  migrationGuide: string;
  replacement?: string;      // Optional, only for auto-fixable patterns
}
```

**Recommended Fix**:

```typescript
// Base interface with common fields
interface BaseBreakingChangePattern {
  id: string;
  category: 'Deprecated API' | 'Import Changes' | 'Configuration Changes' | 'Behavior Changes' | 'Removed Feature';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  pattern: RegExp;
  migrationGuide: string;
}

// Specific interfaces for different pattern types
interface SimplePattern extends BaseBreakingChangePattern {
  autoFix: false;
  schematic: boolean;
}

interface AutoFixablePattern extends BaseBreakingChangePattern {
  autoFix: true;
  schematic: boolean;
  replacement: string;
}

interface ContextualPattern extends BaseBreakingChangePattern {
  contextPattern: RegExp;
  autoFix: boolean;
  schematic: boolean;
  replacement?: string;
}

// Union type
type BreakingChangePattern = SimplePattern | AutoFixablePattern | ContextualPattern;
```

---

### 🔴 **D - Dependency Inversion Principle (DIP)**

#### **Violation: Direct File System Dependencies**

**Location**: Throughout tool files

**Issue**: Tools directly depend on `fs` module rather than abstractions

```typescript
import * as fs from 'fs';

// Direct usage
const content = fs.readFileSync(filePath, 'utf-8');
```

**Recommended Fix**:

```typescript
// Create abstraction
export interface IFileSystem {
  exists(path: string): boolean;
  readFile(path: string): Promise<string>;
  readFileSync(path: string): string;
  writeFile(path: string, content: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
}

// Default implementation
export class NodeFileSystem implements IFileSystem {
  exists(path: string): boolean {
    return fs.existsSync(path);
  }

  readFileSync(path: string): string {
    return fs.readFileSync(path, 'utf-8');
  }

  async readFile(path: string): Promise<string> {
    return fs.promises.readFile(path, 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fs.promises.writeFile(path, content, 'utf-8');
  }

  async readDir(path: string): Promise<string[]> {
    return fs.promises.readdir(path);
  }
}

// Inject dependency
class ProjectAnalyzer {
  constructor(
    private projectPath: string,
    private fileSystem: IFileSystem = new NodeFileSystem()
  ) {}

  // Now testable with mock file system!
}
```

**Benefits**:
- Easy to test with mocks
- Can swap implementations (e.g., in-memory for tests)
- Decoupled from Node.js specifics

---

## Additional Code Quality Issues

### 🟡 **Magic Numbers and Strings**

**Location**: Various files

```typescript
// analysis-planning.ts:75
if (currentMajor < 14 || currentMajor > 20) {

// breaking-changes-detection.ts:404
if (filesScanned % 10 === 0) {
```

**Recommended Fix**:

```typescript
// Create src/constants.ts
export const ANGULAR_VERSION = {
  MIN_SUPPORTED: 14,
  MAX_SUPPORTED: 20,
  TARGET: 20,
} as const;

export const SCANNING = {
  PROGRESS_UPDATE_INTERVAL: 10,
  EXCLUDED_DIRS: ['node_modules', 'dist', 'coverage', '.angular'],
  TS_EXTENSION: '.ts',
  SPEC_SUFFIX: '.spec.ts',
} as const;

export const NODE_VERSION = {
  MIN_REQUIRED: 18,
  RECOMMENDED_FOR_V19_PLUS: 22,
} as const;

// Usage
if (currentMajor < ANGULAR_VERSION.MIN_SUPPORTED || currentMajor > ANGULAR_VERSION.MAX_SUPPORTED) {
```

---

### 🟡 **Error Handling Inconsistency**

**Location**: Tool functions

**Issue**: Some functions catch and return error responses, others throw

**Recommended Fix**:

```typescript
// Create standard error wrapper
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler: (error: Error) => StandardErrorResponse
): Promise<T | StandardErrorResponse> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return errorHandler(err);
  }
}

// Usage
export async function analyzeProjectVersion(...): Promise<StandardToolResponse | StandardErrorResponse> {
  return withErrorHandling(
    async () => {
      // Core logic
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = await analyzer.analyze();
      return ResponseBuilder.success({...});
    },
    (error) => ResponseBuilder.error({
      code: 'ANALYSIS_FAILED',
      message: 'Failed to analyze project',
      details: error.message,
      nextAction: 'Check project structure and try again',
      instructionRef: 'guide://troubleshooting',
    })
  );
}
```

---

## Refactoring Priority Matrix

| Priority | Issue | Impact | Effort | Files Affected |
|----------|-------|--------|--------|----------------|
| 🔴 **P0** | Response Builder (DRY) | High | Low | All tool files |
| 🔴 **P0** | Project Utils (DRY) | High | Low | 2-3 files |
| 🔴 **P1** | SRP - Tool Functions | High | Medium | All tool files |
| 🔴 **P1** | Pattern Registry (OCP) | Medium | Medium | 1 file |
| 🟡 **P2** | Progress Tracker (DRY) | Medium | Low | All tool files |
| 🟡 **P2** | File Scanner (DRY) | Medium | Low | 1-2 files |
| 🟡 **P2** | Constants Extraction | Low | Low | All files |
| 🟡 **P3** | File System Abstraction (DIP) | Medium | High | All tool files |
| 🟡 **P3** | Interface Segregation | Low | Low | 1 file |

---

## Recommended Refactoring Plan

### Phase 1: Quick Wins (2-3 hours)

1. ✅ Create `ResponseBuilder` utility class
2. ✅ Create `ProjectUtils` utility class
3. ✅ Extract constants to `constants.ts`
4. ✅ Create `ProgressTracker` class

**Files to Create**:
- `src/utils/responses.ts`
- `src/utils/project.ts`
- `src/utils/progress.ts`
- `src/constants.ts`

### Phase 2: Structural Improvements (3-4 hours)

1. ✅ Refactor tool functions to use service classes
2. ✅ Separate pattern definitions from detection logic
3. ✅ Create `BreakingChangesRegistry`
4. ✅ Create `FileScanner` utility

**Files to Create**:
- `src/services/project-analyzer.ts`
- `src/services/breaking-changes-scanner.ts`
- `src/services/breaking-changes-registry.ts`
- `src/patterns/breaking-changes/v15.ts` through `v20.ts`
- `src/utils/file-scanner.ts`

### Phase 3: Advanced (Optional, 4-6 hours)

1. ✅ Implement file system abstraction
2. ✅ Add comprehensive unit tests
3. ✅ Improve error handling consistency

---

## Testing Recommendations

With the refactored code, testing becomes much easier:

```typescript
// Example: Testing with mocked dependencies
describe('ProjectAnalyzer', () => {
  it('should detect Angular version', async () => {
    const mockFileSystem = {
      readFileSync: jest.fn().mockReturnValue(JSON.stringify({
        dependencies: { '@angular/core': '^18.0.0' }
      }))
    };

    const analyzer = new ProjectAnalyzer('/fake/path', mockFileSystem);
    const result = await analyzer.analyze();

    expect(result.currentVersion).toBe('^18.0.0');
  });
});
```

---

## Conclusion

**Current State**: Working code with moderate technical debt
**After Refactoring**: Highly maintainable, testable, and extensible codebase

**Key Benefits of Refactoring**:
1. 📉 Reduced code duplication by ~40%
2. ✅ Improved testability (dependency injection)
3. 🔧 Easier to add new Angular versions
4. 📚 Better code organization
5. 🐛 Fewer bugs through standardization

**Recommendation**: Implement Phase 1 immediately (high ROI), Phase 2 in next sprint.

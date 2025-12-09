# Angular Migration Toolkit - Universal Guide

> AI Agent Instructions for Angular migrations (versions 14 → 21) using the Angular Migration Toolkit

## Toolkit Overview

This toolkit provides comprehensive automation and guidance for Angular migrations across multiple major versions.

**Components:**

- **MCP Server**: 25 tools for stage-based migration with checkpoints
- **PowerShell Scripts**: 40+ automation scripts for Windows/macOS/Linux
- **Documentation**: 21 detailed guides covering Angular 14→21
- **Breaking Changes Modules**: Automated fixing for version-specific issues
- **Architecture**: LangGraph-based state machine with checkpoint/rollback support

**Supported Migration Paths:**

```
Angular 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21
```

**Integration Options:**

1. **MCP Server** (Recommended): Multi-IDE support (Zed, VS Code, Claude Desktop)
2. **PowerShell Scripts**: Manual execution without AI assistance

## MCP Server Tools Catalog

### Stage-Based Migration Tools (8 tools)

Execute sequential Angular version upgrades with automated breaking changes fixes.

**Available Stages:**

- `pre-migration-stage` - Validates prerequisites, creates backup
- `angular-15-stage` - Migrates Angular 14 → 15
- `angular-16-stage` - Migrates Angular 15 → 16 (Sass @use migration)
- `angular-17-stage` - Migrates Angular 16 → 17 (Material MDC - HIGH RISK)
- `angular-18-stage` - Migrates Angular 17 → 18
- `angular-19-stage` - Migrates Angular 18 → 19 (ag-Grid changes)
- `angular-20-stage` - Migrates Angular 19 → 20
- `post-migration-stage` - Validation, cleanup, reporting

**Usage Example:**

```typescript
// Execute Angular 16 migration
mcp.call("angular-16-stage", {
  projectPath: "/path/to/project",
  autoCommit: true,
  skipTests: false,
});
```

### Session Management Tools (4 tools)

Track migration progress across multiple sessions.

- `session-create` - Initialize new migration session
- `session-list` - List all migration sessions
- `session-get` - Retrieve session details and progress
- `session-delete` - Remove completed session

**Usage Example:**

```typescript
// Create session for Angular 15→20 migration
mcp.call("session-create", {
  projectPath: "/path/to/project",
  currentVersion: "15.2.10",
  targetVersion: "20",
  description: "Production app migration",
});
```

### Checkpoint Tools (4 tools)

Create restore points for safe rollback.

- `checkpoint-save` - Create named checkpoint
- `checkpoint-load` - Restore from checkpoint
- `checkpoint-delete` - Remove checkpoint
- `checkpoint-exists` - Check if checkpoint exists

**Usage Example:**

```typescript
// Checkpoint before risky Material MDC migration
mcp.call("checkpoint-save", {
  name: "pre-angular-17-mdc",
  description: "Before Material MDC migration (high risk)",
});

// Rollback if needed
mcp.call("checkpoint-load", {
  name: "pre-angular-17-mdc",
});
```

### Utility Tools (5+ tools)

- `validate-node-version` - Check Node.js compatibility
- `get-current-stage` - Determine current migration stage
- `skip-to-stage` - Jump to specific migration stage (use cautiously)
- `list-all-stages` - Show all available migration stages
- Package compatibility validation tools

### Tool Categories Summary

| Category           | Tool Count | Purpose                      |
| ------------------ | ---------- | ---------------------------- |
| Migration Stages   | 8          | Version upgrades (14→21)     |
| Session Management | 4          | Progress tracking            |
| Checkpoints        | 4          | Backup/restore               |
| Utilities          | 9+         | Validation, navigation       |
| **Total**          | **25+**    | Complete migration lifecycle |

## Universal Migration Principles

### Rule 1: NEVER Skip Angular Versions

❌ **WRONG**: Upgrade directly from Angular 15 → 18
✅ **CORRECT**: Upgrade incrementally 15 → 16 → 17 → 18

**Reason**: Each major version includes:

- API changes requiring code modifications
- Dependency version constraints
- Build tooling updates
- Migration schematics designed for previous version

### Rule 2: ALWAYS Create Backups Before Each Version

```bash
# Git checkpoint
git checkout -b angular-v16-migration
git commit -m "chore: pre-migration checkpoint"

# Or use MCP checkpoint
mcp.checkpoint-save({ name: 'pre-v16' })
```

### Rule 3: ALWAYS Validate After Each Version

**Three-Gate Validation:**

1. **Build**: `npm run build` must succeed
2. **Tests**: `npm test` must pass (or maintain baseline)
3. **Lint**: `npm run lint` should pass (zero errors)

Do NOT proceed to the next version until all three gates pass.

### Rule 4: Use Node.js Version Matching Angular Requirements

| Angular Version | Node.js Required   | TypeScript Required |
| --------------- | ------------------ | ------------------- |
| 14              | 14.15+, 16.x       | 4.6-4.8             |
| 15              | 14.20+, 16.x, 18.x | 4.8+                |
| 16              | 16.14+, 18.x       | 4.9-5.1             |
| 17              | 18.13+             | 5.2-5.3             |
| 18              | 18.13+             | 5.4-5.5             |
| 19              | 18.19+, 20.x       | 5.5-5.6             |
| 20              | 20.11+, 22.x       | 5.6+                |
| 21              | 20.11+, 22.x, 23.x | 5.6-5.7             |

**Validation Tool:**

```bash
mcp.call('validate-node-version', { targetVersion: '16' })
```

### Rule 5: Commit After Each Successful Version Upgrade

```bash
npm run build && npm test
git add .
git commit -m "chore: upgrade to Angular 16.x.x"
git tag v16-migration-success
```

## Angular 15 → 16 Migration

### Requirements

- **Node.js**: 16.14+ required
- **TypeScript**: 4.9-5.1 required
- **Estimated Time**: 3-5 hours
- **Risk Level**: MEDIUM

### Breaking Changes

#### 1. Sass @import → @use Migration (REQUIRED)

Angular Material theming requires the new `@use` syntax.

```scss
// ❌ BEFORE (Angular 14-15)
@import "~@angular/material/theming";

$my-primary: mat-palette($mat-indigo);
$my-accent: mat-palette($mat-pink);
$my-theme: mat-light-theme($my-primary, $my-accent);

@include angular-material-theme($my-theme);

// ✅ AFTER (Angular 16+)
@use "@angular/material" as mat;

$my-primary: mat.define-palette(mat.$indigo-palette);
$my-accent: mat.define-palette(mat.$pink-palette);

$my-theme: mat.define-light-theme(
  (
    color: (
      primary: $my-primary,
      accent: $my-accent,
      warn: mat.define-palette(mat.$red-palette),
    ),
  )
);

@include mat.all-component-themes($my-theme);
```

**Automation**: PowerShell module `v16.psm1` handles basic @import → @use conversion.

#### 2. Remove ngx-perfect-scrollbar (RECOMMENDED)

Replace custom scrollbar library with native CSS.

```css
/* ✅ NEW PATTERN - Native CSS Scrollbar */
.scrollable-container {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: #888 #f1f1f1; /* Firefox */
}

/* Webkit browsers (Chrome, Safari, Edge) */
.scrollable-container::-webkit-scrollbar {
  width: 8px;
}

.scrollable-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.scrollable-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.scrollable-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

#### 3. Material Form Field Appearance Default Change

Default appearance changed from `legacy` to `fill`.

```typescript
// Explicitly set appearance if you need legacy
<mat-form-field appearance="legacy">
  <input matInput>
</mat-form-field>
```

### Angular CLI Migration Command

```bash
ng update @angular/core@16 @angular/cli@16
ng update @angular/material@16
```

### Documentation

- **Official Guide**: https://angular.dev/guide/update
- **Update Tool**: https://update.angular.io/?v=15.0-16.0

## Angular 16 → 17 Migration

### Requirements

- **Node.js**: 18.13+ required (major jump from 16.x)
- **TypeScript**: 5.2-5.3 required
- **Estimated Time**: 4-6 hours
- **Risk Level**: HIGH (Material MDC migration)

### Breaking Changes

#### 1. Material MDC Migration (CRITICAL)

All Material components migrate to Material Design Components (MDC) architecture.

**Automated Schematic:**

```bash
ng generate @angular/material:mdc-migration
```

**CSS Class Prefix Changes:**

```scss
// ❌ BEFORE (Angular 16)
.mat-button {
}
.mat-form-field-wrapper {
}
.mat-chip-list {
}

// ✅ AFTER (Angular 17)
.mat-mdc-button {
}
.mat-mdc-form-field-wrapper {
}
.mat-mdc-chip-set {
}
```

**Component Structure Changes:**

Material Chips now have three distinct components:

1. **Chip Grid** (Form Input - Editable chips with input):

```html
<mat-chip-grid #chipGrid>
  <mat-chip-row *ngFor="let tag of tags" (removed)="remove(tag)">
    {{tag.name}}
    <button matChipRemove>
      <mat-icon>cancel</mat-icon>
    </button>
  </mat-chip-row>
  <input [matChipInputFor]="chipGrid" />
</mat-chip-grid>
```

2. **Chip Listbox** (Selectable - Single/multiple selection):

```html
<mat-chip-listbox>
  <mat-chip-option *ngFor="let option of options" [selected]="option.selected">
    {{option.label}}
  </mat-chip-option>
</mat-chip-listbox>
```

3. **Chip Set** (Display Only - No interaction):

```html
<mat-chip-set>
  <mat-chip *ngFor="let item of items">{{item}}</mat-chip>
</mat-chip-set>
```

**Manual Review Required:**

- Custom Material theme CSS
- Component style overrides
- Material Slider (complex structural changes)

#### 2. Control Flow Syntax (Optional)

New built-in control flow syntax as alternative to structural directives.

```typescript
// ❌ OLD SYNTAX (still supported)
<div *ngIf="user">Hello {{user.name}}</div>
<div *ngFor="let item of items; trackBy: trackById">{{item}}</div>
<div [ngSwitch]="value">
  <div *ngSwitchCase="'A'">Case A</div>
</div>

// ✅ NEW SYNTAX (Angular 17+)
@if (user) {
  <div>Hello {{user.name}}</div>
}

@for (item of items; track item.id) {
  <div>{{item}}</div>
}

@switch (value) {
  @case ('A') { <div>Case A</div> }
  @default { <div>Default</div> }
}
```

**Benefits**:

- Better type checking
- Improved performance
- No imports needed
- Cleaner syntax

**Migration**: Optional, both syntaxes supported indefinitely.

#### 3. Standalone Components (Optional)

Standalone components become the recommended approach.

```typescript
// ✅ STANDALONE COMPONENT (Angular 17+ recommended)
@Component({
  selector: "app-user-card",
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
    <mat-card>
      <mat-card-header>{{ user.name }}</mat-card-header>
      <mat-card-actions>
        <button mat-button>Edit</button>
      </mat-card-actions>
    </mat-card>
  `,
})
export class UserCardComponent {}
```

### Angular CLI Migration Command

```bash
ng update @angular/core@17 @angular/cli@17
ng update @angular/material@17
ng generate @angular/material:mdc-migration
```

### Documentation

- **MDC Migration**: https://material.angular.io/guide/mdc-migration
- **Control Flow**: https://angular.dev/guide/templates/control-flow
- **Standalone**: https://angular.dev/guide/standalone-components

## Angular 17 → 18 Migration

### Requirements

- **Node.js**: 18.13+ required
- **TypeScript**: 5.4-5.5 required
- **Estimated Time**: 2-3 hours
- **Risk Level**: LOW

### Breaking Changes

Minor incremental improvements. Key highlights:

1. **Signals Stable**: Signals API is now production-ready
2. **Signal Inputs** (Optional):

```typescript
// ✅ NEW: Signal inputs (Angular 18+)
@Component({
  selector: "app-user",
  standalone: true,
  template: "<div>{{user().name}}</div>",
})
export class UserComponent {
  user = input.required<User>(); // Signal input

  ngOnInit() {
    effect(() => {
      console.log("User changed:", this.user());
    });
  }
}
```

3. **Zoneless Support** (Experimental): Prepare for zoneless Angular

### Angular CLI Migration Command

```bash
ng update @angular/core@18 @angular/cli@18
ng update @angular/material@18
```

### Documentation

- **Signals Guide**: https://angular.dev/guide/signals
- **Signal Inputs**: https://angular.dev/guide/signals/inputs

## Angular 18 → 19 Migration

### Requirements

- **Node.js**: 18.19+ or 20.x required
- **TypeScript**: 5.5-5.6 required
- **Estimated Time**: 2-3 hours
- **Risk Level**: MEDIUM (ag-Grid changes)

### Breaking Changes

#### 1. ag-Grid Row Selection API Change

Row selection configuration changed from string to object.

```typescript
// ❌ BEFORE (ag-Grid v29-30)
gridOptions = {
  rowSelection: "single", // or 'multiple'
  rowMultiSelectWithClick: false,
};

// ✅ AFTER (ag-Grid v31+)
gridOptions = {
  rowSelection: {
    mode: "singleRow", // or 'multiRow'
    checkboxes: false,
    enableClickSelection: true,
  },
};
```

**Automation**: PowerShell module `v19.psm1` detects and fixes row selection syntax.

#### 2. Material Chips Refinements

Final refinements to Material Chips API (follow-up to v17 MDC migration).

### Angular CLI Migration Command

```bash
ng update @angular/core@19 @angular/cli@19
ng update @angular/material@19
```

### Documentation

- **ag-Grid Migration**: https://www.ag-grid.com/angular-data-grid/upgrading-to-ag-grid-31/

## Angular 19 → 20 Migration

### Requirements

- **Node.js**: 20.11+ or 22.x required
- **TypeScript**: 5.6+ required
- **Estimated Time**: 2-4 hours
- **Risk Level**: MEDIUM

### Breaking Changes

#### 1. Highcharts Major Version (11.x → 12.x)

Highcharts v12 includes API changes.

```typescript
// Review chart configurations for breaking changes
const chartOptions: Highcharts.Options = {
  // Check Highcharts 12.x migration guide
  // for specific changes affecting your charts
};
```

#### 2. Zoneless Mode Preparation

Prepare application for optional zoneless mode.

```typescript
// ✅ Zoneless providers (Angular 20+)
import { provideExperimentalZonelessChangeDetection } from "@angular/core";

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    // ... other providers
  ],
});
```

#### 3. Package Deprecation Checks

Review and replace deprecated packages:

- Check for outdated `ngx-*` packages
- Verify third-party library compatibility
- Consider native Angular alternatives

### Angular CLI Migration Command

```bash
ng update @angular/core@20 @angular/cli@20
ng update @angular/material@20
```

### Documentation

- **Zoneless**: https://angular.dev/guide/experimental/zoneless

## Standalone Components Migration

### When to Migrate

- **Available**: Angular 15.2+
- **Recommended**: Angular 17+
- **Required**: Never (optional enhancement)

### Benefits

1. **Tree-Shaking**: Smaller bundle sizes (unused components not included)
2. **Simpler Architecture**: No NgModule declarations/imports/exports
3. **Lazy Loading**: Simplified with `loadComponent`
4. **Modern**: Aligns with Angular's future direction

### Migration Pattern

#### Step 1: Convert Component to Standalone

```typescript
// ❌ BEFORE: NgModule-based component
@Component({
  selector: "app-user-card",
  templateUrl: "./user-card.component.html",
  styleUrls: ["./user-card.component.scss"],
})
export class UserCardComponent {}

// In user.module.ts
@NgModule({
  declarations: [UserCardComponent],
  imports: [CommonModule, MatCardModule],
  exports: [UserCardComponent],
})
export class UserModule {}

// ✅ AFTER: Standalone component
@Component({
  selector: "app-user-card",
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: "./user-card.component.html",
  styleUrls: ["./user-card.component.scss"],
})
export class UserCardComponent {}

// No module needed!
```

#### Step 2: Update Routing

```typescript
// ❌ BEFORE: Lazy-loaded module
const routes: Routes = [
  {
    path: "users",
    loadChildren: () =>
      import("./features/users/users.module").then((m) => m.UsersModule),
  },
];

// ✅ AFTER: Lazy-loaded component
const routes: Routes = [
  {
    path: "users",
    loadComponent: () =>
      import("./features/users/users.component").then((c) => c.UsersComponent),
  },
];
```

#### Step 3: Update AppModule/Bootstrap

```typescript
// ❌ BEFORE: Module bootstrap
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule],
  bootstrap: [AppComponent],
})
export class AppModule {}

platformBrowserDynamic().bootstrapModule(AppModule);

// ✅ AFTER: Standalone bootstrap
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    // ... other providers
  ],
});
```

### Automated Migration

```bash
# Angular 16+ schematics
ng generate @angular/core:standalone
```

### Documentation

- **Standalone Guide**: https://angular.dev/guide/standalone-components
- **Migration**: https://angular.dev/reference/migrations/standalone

## Breaking Changes Quick Reference

### Material Chips (Angular 15-17)

| Old API                          | New API                                    | Use Case             |
| -------------------------------- | ------------------------------------------ | -------------------- |
| `<mat-chip-list>` + `<mat-chip>` | `<mat-chip-grid>` + `<mat-chip-row>`       | Editable input chips |
| `<mat-chip-list>` + `<mat-chip>` | `<mat-chip-listbox>` + `<mat-chip-option>` | Selectable chips     |
| `<mat-chip-list>` + `<mat-chip>` | `<mat-chip-set>` + `<mat-chip>`            | Display-only chips   |

### Material Theming (Angular 16+)

| Old API                                | New API                                   |
| -------------------------------------- | ----------------------------------------- |
| `@import '~@angular/material/theming'` | `@use '@angular/material' as mat`         |
| `mat-palette($mat-indigo)`             | `mat.define-palette(mat.$indigo-palette)` |
| `mat-light-theme($primary, $accent)`   | `mat.define-light-theme((color: (...)))`  |
| `angular-material-theme($theme)`       | `mat.all-component-themes($theme)`        |

### Material MDC Classes (Angular 17+)

| Old Class           | New Class               |
| ------------------- | ----------------------- |
| `.mat-button`       | `.mat-mdc-button`       |
| `.mat-form-field-*` | `.mat-mdc-form-field-*` |
| `.mat-chip-*`       | `.mat-mdc-chip-*`       |
| `.mat-card-*`       | `.mat-mdc-card-*`       |

### Sass Migration (Angular 16+)

| Old Syntax            | New Syntax                   |
| --------------------- | ---------------------------- |
| `@import`             | `@use`                       |
| `$mat-indigo`         | `mat.$indigo-palette`        |
| Direct function calls | Namespaced: `mat.function()` |

### Guards (Angular 15+)

```typescript
// OLD: Class-based guard
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(): boolean { return true; }
}

// NEW: Functional guard (Angular 15.2+)
export const authGuard: CanActivateFn = (route, state) => {
  return inject(AuthService).isAuthenticated();
};

// Usage in routes
{ path: 'admin', canActivate: [authGuard], component: AdminComponent }
```

### Interceptors (Angular 15+)

```typescript
// OLD: Class-based interceptor
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req);
  }
}

// NEW: Functional interceptor (Angular 15+)
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);
};

// Usage
providers: [provideHttpClient(withInterceptors([authInterceptor]))];
```

### ag-Grid (Angular 19+)

```typescript
// OLD: String-based row selection
rowSelection: "single";

// NEW: Object-based configuration
rowSelection: {
  mode: "singleRow";
}
```

## PowerShell Script Reference

### Prerequisites & Validation

```powershell
# Check prerequisites
.\migrations\scripts\00-prerequisites-check.ps1 -TargetVersion "20"

# Validate Node.js version
.\migrations\scripts\validate-node-version.ps1 -TargetVersion "16"
```

### Backup & Restore

```powershell
# Create backup
.\migrations\scripts\01-create-backup.ps1

# Restore from backup
.\migrations\scripts\02-restore-backup.ps1 -BackupName "backup-20231215-143022"
```

### Version Migrations

```powershell
# Migrate to specific version
.\migrations\scripts\migrate-to-v15.ps1 -AutoCommit
.\migrations\scripts\migrate-to-v16.ps1 -AutoCommit
.\migrations\scripts\migrate-to-v17.ps1 -AutoCommit
.\migrations\scripts\migrate-to-v18.ps1
.\migrations\scripts\migrate-to-v19.ps1
.\migrations\scripts\migrate-to-v20.ps1

# All scripts support:
# -AutoCommit: Commit changes after successful migration
# -SkipTests: Skip test execution (not recommended)
# -SkipLint: Skip linting (not recommended)
```

### Breaking Changes Fixes

```powershell
# Fix breaking changes for specific version
.\migrations\scripts\fix-breaking-changes-v15.ps1
.\migrations\scripts\fix-breaking-changes-v16.ps1
.\migrations\scripts\fix-breaking-changes-v17.ps1
# ... v18, v19, v20
```

### Validation

```powershell
# Validate build
.\migrations\scripts\validate-build.ps1

# Validate tests
.\migrations\scripts\validate-tests.ps1

# Validate lint
.\migrations\scripts\validate-lint.ps1
```

### Optional Migrations

```powershell
# Migrate to standalone components
.\migrations\scripts\migrate-to-standalone.ps1

# Migrate to signals
.\migrations\scripts\migrate-to-signals.ps1

# Migrate to new control flow
.\migrations\scripts\migrate-to-control-flow.ps1

# Fix signal imports (if issues after signals migration)
.\migrations\scripts\fix-signal-imports.ps1
```

### Reporting

```powershell
# Generate migration report
.\migrations\scripts\generate-migration-report.ps1
```

## Best Practices & Patterns

### TypeScript Configuration

```json
// ✅ RECOMMENDED tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "dom"],
    "experimentalDecorators": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### RxJS Subscription Cleanup

```typescript
// ✅ CORRECT: Always use takeUntil for subscriptions
import { Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-user-list',
  template: '...'
})
export class UserListComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.userService.users$
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.users = users;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// ❌ WRONG: No cleanup (MEMORY LEAK)
ngOnInit() {
  this.userService.users$.subscribe(users => {
    this.users = users;
  });
}
```

### Service Injection

```typescript
// ✅ CORRECT: Use providedIn for tree-shaking
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient); // Angular 14+

  // Or constructor injection
  constructor(private http: HttpClient) {}
}

// ❌ AVOID: Module-level providers (unless needed)
@NgModule({
  providers: [DataService] // Less optimal for tree-shaking
})
```

### Component Architecture

```typescript
// ✅ RECOMMENDED: Standalone component (Angular 15.2+)
@Component({
  selector: "app-feature",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule],
  template: "...",
})
export class FeatureComponent {}
```

### Testing

```typescript
// ✅ RECOMMENDED: Maintain 80%+ coverage
describe("UserService", () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(UserService);
  });

  it("should fetch users", (done) => {
    service.getUsers().subscribe((users) => {
      expect(users.length).toBeGreaterThan(0);
      done();
    });
  });
});
```

### Performance

```typescript
// ✅ RECOMMENDED: Lazy-load feature modules
const routes: Routes = [
  {
    path: "admin",
    loadComponent: () =>
      import("./admin/admin.component").then((c) => c.AdminComponent),
  },
  // Or module-based (legacy)
  {
    path: "reports",
    loadChildren: () =>
      import("./reports/reports.module").then((m) => m.ReportsModule),
  },
];
```

### Change Detection

```typescript
// ✅ RECOMMENDED: OnPush change detection
@Component({
  selector: "app-user-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "...",
})
export class UserCardComponent {}
```

## References

### Official Angular Documentation

- **Update Guide**: https://angular.dev/guide/update
- **Update Tool**: https://update.angular.io
- **Migrations Reference**: https://angular.dev/reference/migrations
- **Standalone Components**: https://angular.dev/guide/standalone-components
- **Signals**: https://angular.dev/guide/signals
- **Control Flow**: https://angular.dev/guide/templates/control-flow
- **Testing**: https://angular.dev/guide/testing
- **Best Practices**: https://angular.dev/best-practices
- **Style Guide**: https://angular.dev/style-guide

### Material Design

- **Material Components**: https://material.angular.io/components/categories
- **MDC Migration**: https://material.angular.io/guide/mdc-migration
- **Theming Guide**: https://material.angular.io/guide/theming
- **Component Harnesses**: https://material.angular.io/guide/using-component-harnesses

### RxJS

- **Official Docs**: https://rxjs.dev
- **Operators**: https://rxjs.dev/guide/operators
- **Best Practices**: https://rxjs.dev/guide/overview

### TypeScript

- **Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Release Notes**: https://www.typescriptlang.org/docs/handbook/release-notes/overview.html

### Build & Tooling

- **Angular CLI**: https://angular.dev/cli
- **Webpack**: https://webpack.js.org/
- **esbuild**: https://esbuild.github.io/

### This Toolkit

- **Project**: Angular-Migration toolkit
- **MCP Server**: packages/mcp-server/
- **Migration Docs**: migrations/docs/
- **PowerShell Scripts**: migrations/scripts/
- **Breaking Changes Modules**: migrations/scripts/modules/breaking-changes/

---

**Toolkit Version**: 2.0
**Supported Versions**: Angular 14 → 21
**Last Updated**: December 2024
**Maintained By**: AI agents for Angular migration automation

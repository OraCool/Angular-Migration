# Angular Migration Guide - angmig-current Project

> AI Agent Instructions for migrating the `angmig-current` Angular application from version 15.2.10 to 20+

## Project Context

**Current State:**
- **Angular Version**: 15.2.10
- **TypeScript**: 4.8.x
- **Node.js Support**: 18 || 20 || 22
- **Architecture**: NgModule-based (NOT standalone components)
- **Module Pattern**: Core/Shared/Features with lazy loading
- **Size**: 107 TypeScript files, 45+ components
- **Build**: Angular CLI with 4GB heap allocation

**Key Dependencies:**
- Angular Material 15.2.9 (UI components, theming)
- ag-Grid Enterprise 29.3.5 (data grids with master-detail, row grouping)
- Highcharts 10.3.3 (charting and visualization)
- RxJS 7.8.0 (reactive programming)
- ngx-translate 14.0.0 (internationalization)
- @swimlane/ngx-graph 8.4.0 (network visualizations)
- ngx-perfect-scrollbar 10.1.1 (custom scrollbars - TO BE REPLACED)
- ngx-material-timepicker 13.1.0 (DEPRECATED - TO BE REPLACED)

**Testing Stack:**
- Karma 6.4.0 + Jasmine 4.3.0
- Code coverage enabled
- CI: ChromeHeadlessNoSandbox with 4GB heap

## Project-Specific Code Patterns

### 1. Service Pattern - BehaviorSubject State Management

```typescript
// CURRENT PATTERN (auth.service.ts)
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  login(username: string, password: string): Observable<User> {
    return of({...}).pipe(
      delay(1000),
      tap(user => this.currentUserSubject.next(user))
    );
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }
}
```

**Migration Note**: This pattern is SOLID. Preserve this approach. However, ADD subscription cleanup in components consuming this service.

### 2. HTTP Interceptor Chain

**Current Order**: AuthInterceptor → ErrorInterceptor → LoadingInterceptor

```typescript
// app.module.ts
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true }
]
```

**Migration Strategy**:
- Angular 15-17: Keep class-based interceptors
- Angular 18+: Consider functional interceptors (optional)

### 3. Route Guards Pattern

**Current**: Class-based guards implementing `CanActivate`

```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.authService.isAuthenticated()) return true;
    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }
}
```

**Migration Path**:
- Angular 15.2: Current implementation works
- Angular 16+: Consider functional guards (optional)

### 4. Reactive Forms Pattern

```typescript
// PRESERVE THIS PATTERN
export class UserDetailComponent implements OnInit {
  userForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['USER', Validators.required]
    });
  }
}
```

## Current Dependency Constraints

### Critical Migration Requirements

| Dependency | Current | Angular 16 | Angular 17 | Angular 18 | Angular 20 |
|------------|---------|------------|------------|------------|------------|
| ag-Grid | 29.3.5 | 29.x-30.x | 30.x-31.x | 31.x | 31.x |
| Highcharts | 10.3.3 | 10.x | 10.x-11.x | 11.x | 12.x |
| ngx-perfect-scrollbar | 10.1.1 | REMOVE | REMOVE | REMOVE | REMOVE |
| ngx-material-timepicker | 13.1.0 | REPLACE | REPLACE | REPLACE | REPLACE |
| RxJS | 7.8.0 | 7.8.x | 7.8.x | 7.8.x | 7.8.x |
| TypeScript | 4.8.x | 4.9-5.0 | 5.2 | 5.4 | 5.6 |

**Action Items**:
1. **ag-Grid**: Upgrade incrementally with each Angular version
   - v29 → v30 (Angular 16-17)
   - v30 → v31 (Angular 18+)
   - Breaking: `rowSelection` API changes in v31

2. **Highcharts**: Major upgrade required for Angular 20
   - v10 → v11 (Angular 18-19)
   - v11 → v12 (Angular 20)

3. **ngx-perfect-scrollbar**: Replace with native CSS scrolling
   ```css
   /* NEW PATTERN - Native CSS */
   .scrollable-container {
     overflow-y: auto;
     scrollbar-width: thin;
     scrollbar-color: #888 #f1f1f1;
   }
   ```

4. **ngx-material-timepicker**: Replace with Material native or alternative
   - Option 1: Use `<mat-timepicker>` (if available in Material 15+)
   - Option 2: Build custom time picker with `<mat-form-field>` + validators

## Migration Path from Current State

### Phase 1: Angular 15.2.10 → 16 (MEDIUM RISK)
**Estimated Time**: 6-8 hours

**Breaking Changes**:
1. **Sass @import → @use** (REQUIRED)
   ```scss
   // BEFORE
   @import '~@angular/material/theming';

   // AFTER
   @use '@angular/material' as mat;
   ```

2. **Remove ngx-perfect-scrollbar** (6 components affected)
   - Dashboard components (3)
   - Reporting components (2)
   - User management list (1)

3. **Material Form Field Appearance**
   - Default changed from `legacy` to `fill`
   - Review all `<mat-form-field>` instances

4. **TypeScript 4.8 → 4.9+**

**Validation**:
- Build: `npm run build` must succeed
- Tests: `npm run test:ci` must pass with 4GB heap
- Lint: `npm run lint` zero errors
- Bundle: Stay within 2MB initial / 5MB max budget

### Phase 2: Angular 16 → 17 (HIGH RISK - Material MDC)
**Estimated Time**: 10-14 hours

**Breaking Changes**:
1. **Material MDC Migration** (CRITICAL)
   - Run schematic: `ng generate @angular/material:mdc-migration`
   - CSS class prefixes change: `.mat-*` → `.mat-mdc-*`
   - Material Chips API changes (3 components in dashboard)

2. **Material Chips** - Three Variants:
   ```html
   <!-- Form Input Chips (Dashboard Tags) -->
   <mat-chip-grid>
     <mat-chip-row *ngFor="let tag of tags">{{tag.name}}</mat-chip-row>
   </mat-chip-grid>

   <!-- Selectable Chips (Dashboard Filters) -->
   <mat-chip-listbox>
     <mat-chip-option [selected]="filter.selected">{{filter.name}}</mat-chip-option>
   </mat-chip-listbox>

   <!-- Display-Only Chips (Report Status) -->
   <mat-chip-set>
     <mat-chip>{{status}}</mat-chip>
   </mat-chip-set>
   ```

3. **Control Flow Syntax** (Optional)
   - New: `@if`, `@for`, `@switch`
   - Old: `*ngIf`, `*ngFor`, `*ngSwitch` still supported

**Components Affected**:
- Dashboard: KpiCard, NetworkGraph, ActivityFeed
- Reporting: ReportViewer (Material Chips for tags)
- All components: Review Material theme usage

### Phase 3: Angular 17 → 18 (LOW RISK)
**Estimated Time**: 4-6 hours

**Breaking Changes**:
- Minor incremental improvements
- Signals stable (consider adoption in new code)
- TypeScript 5.4+

### Phase 4: Angular 18 → 19 (MEDIUM RISK)
**Estimated Time**: 4-6 hours

**Breaking Changes**:
1. **ag-Grid Row Selection API**
   ```typescript
   // BEFORE
   gridOptions = {
     rowSelection: 'single' // or 'multiple'
   };

   // AFTER
   gridOptions = {
     rowSelection: {
       mode: 'singleRow' // or 'multiRow'
     }
   };
   ```

2. **Node.js**: Upgrade to 20.x recommended

**Components Affected**:
- Reporting module: All AG Grid instances (5+ components)
- User management: UserListComponent (AG Grid)

### Phase 5: Angular 19 → 20 (MEDIUM RISK)
**Estimated Time**: 4-6 hours

**Breaking Changes**:
1. **Highcharts 11.x → 12.x**
   - API changes in chart configuration
   - Test all chart components thoroughly

2. **Node.js 22.x** support
3. **TypeScript 5.6+**
4. **Zoneless mode preparation** (optional)

**Components Affected**:
- Dashboard: KpiCard (3 instances with Highcharts)
- Reporting: ReportViewer (2 chart types)

**Total Estimated Time**: 24-32 hours (for complete migration 15→20)

## Testing Strategy

### Test Configuration
```json
// package.json
{
  "test": "ng test --code-coverage",
  "test:ci": "node --max_old_space_size=4096 node_modules/@angular/cli/bin/ng test --watch=false --browsers=ChromeHeadlessNoSandbox --code-coverage"
}
```

### Coverage Requirements
- **Maintain current baseline**: Do not decrease coverage during migration
- **Target**: 80%+ code coverage (not currently enforced)
- **CI Configuration**: ChromeHeadlessNoSandbox for headless environments

### Test Execution Per Version
1. Run `npm run test:ci` after each version upgrade
2. Fix broken tests immediately before proceeding
3. Verify all components render correctly
4. Test AG Grid interactions (sorting, filtering, grouping)
5. Test Highcharts rendering and interactions
6. Test authentication flow and guards
7. Test translation loading (ngx-translate)

### Known Test Issues to Watch
- Karma memory leaks (reason for 4GB heap)
- AG Grid async rendering in tests
- Material component theme testing
- Router navigation in guard tests

## Build Configuration

### Current Build Setup
```bash
# Development
npm start  # ng serve

# Production Build (4GB heap required)
npm run build  # node --max_old_space_size=4096 ... --configuration=production

# Bundle Analysis
npm run build:stats
npm run analyze  # webpack-bundle-analyzer
```

### Bundle Budgets (angular.json)
```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "2mb",
      "maximumError": "5mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "6kb",
      "maximumError": "10kb"
    }
  ]
}
```

**Migration Note**: Bundle size WILL increase during 16→17 migration due to Material MDC. Plan accordingly.

### Build Validation Gates
After each Angular version upgrade:
1. ✅ `npm run build` completes successfully
2. ✅ No bundle budget errors
3. ✅ No TypeScript compilation errors
4. ✅ Source maps generated correctly
5. ✅ Production build optimization enabled

## Breaking Changes Specific to This App

### Material Chips (3 Components Affected)
**Location**: `src/app/features/dashboard/components/`
- `kpi-card.component.ts` - Uses chips for categories
- `network-graph.component.ts` - Uses chips for node filters
- `activity-feed.component.ts` - Uses chips for activity types

**Action**: Apply appropriate chip variant (grid/listbox/set) based on usage.

### AG Grid (6 Components Affected)
**Location**: `src/app/shared/components/ag-grid/` and feature modules
- `master-detail-grid.component.ts` - Master-detail functionality
- `src/app/features/reporting/` - Multiple report grids
- `src/app/features/user-management/` - User list grid

**Actions**:
1. Angular 18→19: Update `rowSelection` API
2. Test enterprise features: Excel export, clipboard, row grouping
3. Verify custom cell renderers still work

### Highcharts (5 Components Affected)
**Location**: `src/app/features/dashboard/components/`
- `revenue-chart.component.ts`
- `kpi-card.component.ts` (3 instances)
- `src/app/features/reporting/report-viewer.component.ts`

**Action**: Angular 19→20 requires Highcharts 12.x upgrade. Test all chart types.

### Custom Scrollbar (6 Components Affected)
**Location**: Multiple locations using `[perfectScrollbar]`
- Dashboard components (3)
- Reporting components (2)
- User list (1)

**Action**: Replace with native CSS scrollbar styling in Angular 16 migration.

## Code Patterns to Preserve

### ✅ KEEP: Service Injection Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class SomeService { }
```
**Reason**: Tree-shaking optimized, Angular best practice.

### ✅ KEEP: BehaviorSubject State Management
```typescript
private stateSubject = new BehaviorSubject<State>(initialState);
public state$ = this.stateSubject.asObservable();
```
**Reason**: Solid reactive pattern, works well across all Angular versions.

### ✅ KEEP: FormBuilder Reactive Forms
```typescript
constructor(private fb: FormBuilder) {
  this.form = this.fb.group({ ... });
}
```
**Reason**: Type-safe, testable, Angular recommended approach.

### ⚠️ ADD: RxJS Subscription Cleanup
```typescript
// CURRENT: Missing cleanup (MEMORY LEAK RISK)
ngOnInit(): void {
  this.service.data$.subscribe(data => { ... });
}

// ADD THIS PATTERN:
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.service.data$
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => { ... });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### ✅ KEEP: Translation Key Hierarchy
```typescript
// Current pattern (GOOD)
this.translate.get('dashboard.kpi.revenue.title')
this.translate.get('reporting.filters.dateRange')
```

### ✅ KEEP: Grid State Persistence Pattern
```typescript
// GridStateService pattern is solid
this.gridStateService.saveState(gridId, gridState);
```

## Validation Gates

### Per-Version Migration Checklist
After EACH Angular version upgrade, verify:

1. **Build Success**
   ```bash
   npm run build
   # Must complete with exit code 0
   # Check bundle sizes are within budgets
   ```

2. **Test Success**
   ```bash
   npm run test:ci
   # All tests must pass
   # Coverage must not decrease
   ```

3. **Lint Success**
   ```bash
   npm run lint
   # Zero errors required
   # Warnings acceptable if documented
   ```

4. **Bundle Analysis**
   ```bash
   npm run build:stats
   npm run analyze
   # Review bundle size changes
   # Identify any unexpected size increases
   ```

5. **Manual Smoke Test**
   - ✅ Application starts without console errors
   - ✅ Login/authentication flow works
   - ✅ Dashboard loads with charts and grids
   - ✅ Routing and navigation functional
   - ✅ AG Grid sorting, filtering, grouping works
   - ✅ Highcharts render correctly
   - ✅ Translation switching works
   - ✅ Form validation works

## Rollback Procedures

### Git Strategy (REQUIRED)
```bash
# Before each Angular version migration
git checkout -b angular-v16-migration  # or v17, v18, etc.
git add .
git commit -m "chore: pre-migration checkpoint Angular 15.2.10"

# After successful migration
git commit -m "chore: upgrade to Angular 16.x.x"
git tag -a v16-migration-success -m "Angular 16 migration successful"
git push origin angular-v16-migration --tags
```

### Package Lock Preservation
```bash
# Before migration
cp package-lock.json package-lock.json.backup-v15

# If rollback needed
git checkout HEAD -- package.json package-lock.json
npm ci
```

### Node Modules Backup (Optional)
For large projects with long `npm install` times:
```bash
# Before migration
cp -r node_modules node_modules.backup-v15

# If rollback needed
rm -rf node_modules
mv node_modules.backup-v15 node_modules
```

## MCP Server Integration

### Available Tools
Reference the comprehensive migration toolkit at:
**Angular-Migration** (migration toolkit project)

**Key MCP Tools for This Project**:
1. `angular-15-stage` - Migrates from current 15.2.10 → 16
2. `angular-16-stage` - Migrates 16 → 17 (Material MDC)
3. `angular-17-stage` through `angular-20-stage` - Subsequent versions

### Session Management
```typescript
// Create checkpoint before migration
mcp.checkpoint-save({ name: "pre-angular-16", description: "Before Angular 16 migration" })

// If rollback needed
mcp.checkpoint-load({ name: "pre-angular-16" })
```

### Breaking Changes Automation
The toolkit includes PowerShell scripts for automated fixes:
- `migrations/scripts/modules/breaking-changes/v16.psm1` - Sass migration, PerfectScrollbar removal
- `migrations/scripts/modules/breaking-changes/v17.psm1` - Material MDC migration
- `migrations/scripts/modules/breaking-changes/v19.psm1` - ag-Grid row selection fix

**Usage**:
```powershell
.\migrations\scripts\migrate-to-v16.ps1 -AutoCommit
```

### Universal Reference
For universal Angular migration best practices, breaking changes reference, and MCP tool documentation, see:
**AGENTS.md** in the Angular-Migration toolkit project

## Known Issues & Project Gotchas

### 1. SVG Sprite Generation Scripts
**Issue**: Custom SVG sprite generation using `svg2sprite-cli`
```bash
npm run generate:svg-sprite
npm run generate:svg-sprite_flag
npm run generate:svg-sprite_perils
```
**Migration Note**: These scripts use custom Node.js tooling. Test after Node.js version upgrades.

### 2. csscomb Configuration
**Issue**: CSS property ordering tool configured
```bash
npm run csscomb
```
**Migration Note**: May need updates for new Material MDC CSS properties.

### 3. ESLint 7.32.0 (Old Version)
**Issue**: Using older ESLint version (current is ESLint 8+)
**Recommendation**: Consider upgrading to ESLint 8+ during Angular 16 migration
**Risk**: Low - current configuration works

### 4. TypeScript Strict Mode NOT Enabled
**Current**: `strict: false` (or not set) in tsconfig.json
**Recommendation**:
- Keep disabled during initial migrations
- Consider enabling incrementally after Angular 20 migration
- Will require significant code changes (explicit typing, null checks)

### 5. Memory Requirements (4GB Heap)
**Issue**: Build and tests require 4GB heap allocation
```bash
node --max_old_space_size=4096
```
**Reason**: Large bundle size, many dependencies, AG Grid + Highcharts memory usage
**Migration Note**: May increase during Material MDC migration

### 6. Browser Support
**Current**: `browserslist: ["last 2 Chrome versions"]`
**Migration Note**: Ensure this aligns with your production environment requirements

## References

### Official Angular Documentation
- **Update Guide**: https://angular.dev/guide/update
- **Update Tool**: https://update.angular.io (interactive version checker)
- **Migration Reference**: https://angular.dev/reference/migrations
- **Standalone Components**: https://angular.dev/guide/standalone-components
- **Signals Guide**: https://angular.dev/guide/signals
- **Testing Guide**: https://angular.dev/guide/testing

### Material Migration
- **MDC Migration**: https://material.angular.io/guide/mdc-migration
- **Material Theming**: https://material.angular.io/guide/theming
- **Material Components**: https://material.angular.io/components/categories

### Third-Party Documentation
- **ag-Grid Angular**: https://www.ag-grid.com/angular-data-grid/
- **ag-Grid Migration**: https://www.ag-grid.com/angular-data-grid/upgrading-to-ag-grid-31/
- **Highcharts Angular**: https://www.highcharts.com/blog/download/highcharts-angular/
- **ngx-translate**: https://github.com/ngx-translate/core

### Project-Specific Toolkit
- **Universal Migration Guide**: See AGENTS.md in Angular-Migration toolkit
- **MCP Server Tools**: See packages/mcp-server/README.md in Angular-Migration toolkit
- **Version Guides**: See migrations/docs/ in Angular-Migration toolkit

---

**Last Updated**: Based on Angular 15.2.10 project analysis
**Maintained By**: AI agents for `angmig-current` project migration

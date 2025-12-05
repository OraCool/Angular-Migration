# Troubleshooting Guide

> **Solutions to common issues during Angular 14→20 migration**

This guide covers common errors, warnings, and issues you may encounter during the migration, organized by category with clear solutions.

---

## 📋 Quick Diagnosis

### Error Categories

Click to jump to relevant section:

- [Build Errors](#-build-errors) - TypeScript, compilation, webpack errors
- [Runtime Errors](#-runtime-errors) - Browser console errors
- [Dependency Issues](#-dependency-issues) - npm, package.json problems
- [Test Failures](#-test-failures) - Unit and E2E test issues
- [Performance Issues](#-performance-issues) - Slow builds, runtime performance
- [Git Issues](#-git-issues) - Merge conflicts, branch problems
- [Version-Specific Issues](#-version-specific-issues) - Errors by Angular version

---

## 🔨 Build Errors

### Error: Cannot find module

**Full Error:**
```
Error: Cannot find module '@angular/core'
Error: Cannot find module '@angular/common'
```

**Cause:** Dependencies not installed or corrupted

**Solution:**
```bash
# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Clean npm cache
npm cache clean --force

# Reinstall dependencies
npm install

# If still failing, check Node.js version
node --version  # Should match Angular version requirements
nvm use 20  # Switch to compatible version
```

---

### Error: TypeScript compilation errors

**Error:**
```
error TS2322: Type 'string | null' is not assignable to type 'string'
error TS2339: Property 'foo' does not exist on type 'Bar'
```

**Cause:** Stricter TypeScript checking in newer versions

**Solution:**

```typescript
// Fix 1: Use proper type guards
if (value !== null) {
  console.log(value.toUpperCase()); // Now TypeScript knows value is string
}

// Fix 2: Use nullish coalescing
const displayValue = value ?? 'default';

// Fix 3: Use optional chaining
const name = user?.profile?.name;

// Fix 4: Add proper types
interface User {
  name: string;
  email?: string; // Make optional if can be undefined
}

// Fix 5: Use type assertion (last resort)
const value = obj.property as string;
```

---

### Error: Module not found in lazy loading

**Error:**
```
Error: Cannot find module './admin/admin.module'
```

**Cause:** Lazy loading path incorrect after migration to standalone

**Solution:**

```typescript
// Before (Angular 16 and earlier)
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
}

// After (Angular 17+ standalone)
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
}
```

---

### Error: Class is using Angular features but not decorated

**Error:**
```
Class is using Angular features but is not decorated. Please add an explicit Angular decorator.
```

**Cause:** Injectable, Component, or Directive missing decorator

**Solution:**

```typescript
// Add missing decorator
@Injectable({ providedIn: 'root' })
export class MyService {
  // ...
}

// Or for components
@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.component.html'
})
export class MyComponent {
  // ...
}
```

---

### Error: Unknown builder

**Error:**
```
Unknown builder: @angular-devkit/build-angular:application
```

**Cause:** Old Angular CLI version

**Solution:**

```bash
# Update CLI globally
npm install -g @angular/cli@latest

# Or use npx
npx @angular/cli@latest build

# Or update local CLI
npm install @angular/cli@latest --save-dev
```

---

### Error: Workspace extension with invalid configuration

**Error:**
```
Workspace extension with invalid name (undefined) found.
```

**Cause:** Corrupted angular.json

**Solution:**

```bash
# Backup angular.json
cp angular.json angular.json.backup

# Run Angular update to fix
npx ng update @angular/cli --migrate-only --allow-dirty

# Or manually check angular.json for syntax errors
# Look for:
# - Missing commas
# - Unclosed brackets
# - Invalid property names
```

---

## 🌐 Runtime Errors

### Error: NullInjectorError

**Error:**
```
NullInjectorError: No provider for MyService!
```

**Cause:** Service not provided

**Solution:**

```typescript
// Option 1: Add providedIn to service (recommended)
@Injectable({ providedIn: 'root' })
export class MyService {}

// Option 2: Add to app config providers
// app.config.ts
providers: [MyService]

// Option 3: Add to component providers
@Component({
  providers: [MyService]
})
export class MyComponent {}
```

---

### Error: Can't bind to 'ngIf' since it isn't a known property

**Error:**
```
Can't bind to 'ngIf' since it isn't a known property of 'div'
Can't bind to 'ngFor' since it isn't a known property of 'ul'
```

**Cause:** CommonModule not imported (standalone components)

**Solution:**

```typescript
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule], // Add this
  template: `
    <div *ngIf="condition">Content</div>
  `
})
export class MyComponent {}

// Or use new control flow (Angular 17+)
@Component({
  standalone: true,
  imports: [], // CommonModule not needed for @if/@for
  template: `
    @if (condition) {
      <div>Content</div>
    }
  `
})
export class MyComponent {}
```

---

### Error: Zone.js is not loaded

**Error:**
```
Zone.js is required for Angular
```

**Cause:** zone.js not imported or loaded

**Solution:**

```typescript
// Ensure zone.js is imported in main.ts or polyfills
import 'zone.js';

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent);

// Or check angular.json polyfills configuration:
{
  "polyfills": ["zone.js"]
}
```

---

### Error: Hydration mismatch

**Error:**
```
NG0500: During hydration Angular expected <div> but found <span>
```

**Cause:** Server and client render different HTML (SSR apps)

**Solution:**

```typescript
// Avoid platform-specific code in templates
// Instead use isPlatformBrowser

import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

export class MyComponent {
  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  ngOnInit() {
    if (this.isBrowser) {
      // Browser-only code
      window.addEventListener('scroll', this.onScroll);
    }
  }
}
```

---

### Error: ExpressionChangedAfterItHasBeenCheckedError

**Error:**
```
ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked
```

**Cause:** Value changed during change detection cycle

**Solution:**

```typescript
// Solution 1: Use ChangeDetectorRef
import { ChangeDetectorRef, inject } from '@angular/core';

export class MyComponent {
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit() {
    this.someValue = 'new value';
    this.cdr.detectChanges(); // Trigger change detection
  }
}

// Solution 2: Use setTimeout
ngAfterViewInit() {
  setTimeout(() => {
    this.someValue = 'new value';
  });
}

// Solution 3: Use signals (Angular 16+)
count = signal(0);

ngAfterViewInit() {
  this.count.set(10); // Signals handle change detection automatically
}
```

---

## 📦 Dependency Issues

### Error: ERESOLVE unable to resolve dependency tree

**Error:**
```
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! Could not resolve dependency:
npm ERR! peer @angular/core@"^16.0.0" from @angular/material@16.0.0
```

**Cause:** Incompatible package versions

**Solution:**

```bash
# Option 1: Use --legacy-peer-deps (quick fix)
npm install --legacy-peer-deps

# Option 2: Use --force (not recommended)
npm install --force

# Option 3: Fix package.json versions manually
# Check package-compatibility-matrix.json for correct versions
# Update package.json
# Then: npm install

# Option 4: Remove node_modules and start fresh
rm -rf node_modules package-lock.json
npm install
```

---

### Error: npm audit vulnerabilities

**Error:**
```
found 15 vulnerabilities (5 moderate, 10 high)
```

**Solution:**

```bash
# Auto-fix vulnerabilities
npm audit fix

# Force auto-fix (may cause breaking changes)
npm audit fix --force

# Review vulnerabilities
npm audit

# Check specific package
npm ls <package-name>

# Update specific package
npm update <package-name>
```

---

### Error: Peer dependency mismatch

**Error:**
```
npm WARN @angular/material@16.0.0 requires a peer of @angular/core@^16.0.0 but none is installed
```

**Solution:**

```bash
# Check current versions
npm list @angular/core
npm list @angular/material

# Ensure all Angular packages are same version
npm install @angular/core@16 @angular/material@16 @angular/cdk@16

# Or use ng update
npx ng update @angular/core @angular/material
```

---

## 🧪 Test Failures

### Error: Component is standalone and cannot be declared

**Error:**
```
Error: Component 'MyComponent' is standalone and cannot be declared in an NgModule
```

**Cause:** Standalone component in TestBed declarations

**Solution:**

```typescript
// Before
TestBed.configureTestingModule({
  declarations: [MyComponent] // Wrong for standalone
});

// After
TestBed.configureTestingModule({
  imports: [MyComponent] // Correct for standalone
});
```

---

### Error: Tests timing out

**Error:**
```
Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL
```

**Solution:**

```typescript
// Increase timeout for specific test
it('should load data', (done) => {
  // Test code
  done();
}, 10000); // 10 second timeout

// Or globally in test.ts
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

// Use fakeAsync for testing async code
import { fakeAsync, tick } from '@angular/core/testing';

it('should work', fakeAsync(() => {
  component.loadData();
  tick(1000); // Simulate 1 second passing
  expect(component.data).toBeDefined();
}));
```

---

### Error: Can't resolve all parameters

**Error:**
```
Can't resolve all parameters for MyComponent: (?)
```

**Cause:** Missing imports in test

**Solution:**

```typescript
TestBed.configureTestingModule({
  imports: [
    MyComponent,
    HttpClientTestingModule, // Add if using HttpClient
    RouterTestingModule // Add if using Router
  ],
  providers: [
    MyService // Add if needed
  ]
});
```

---

## ⚡ Performance Issues

### Issue: Slow build times

**Symptoms:** Build takes >60 seconds

**Solutions:**

```bash
# 1. Clear build cache
rm -rf .angular/ dist/

# 2. Update to latest Angular (better builders)
npx ng update @angular/cli @angular/core

# 3. Enable build caching (angular.json)
{
  "cli": {
    "cache": {
      "enabled": true,
      "path": ".angular/cache"
    }
  }
}

# 4. Optimize TypeScript compilation (tsconfig.json)
{
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true
  }
}

# 5. Use esbuild (Angular 17+)
# Already default in Angular 17+

# 6. Increase Node.js memory
export NODE_OPTIONS=--max-old-space-size=8192
npm run build
```

---

### Issue: Large bundle sizes

**Symptoms:** Bundle >1MB gzipped

**Solutions:**

```bash
# 1. Analyze bundle
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json

# 2. Enable production optimizations
npm run build -- --configuration production

# 3. Lazy load routes
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  }
];

# 4. Use defer for heavy components (Angular 17+)
@defer (on viewport) {
  <app-heavy-component />
}

# 5. Remove unused dependencies
npm prune
# Review package.json and remove unused packages

# 6. Enable zoneless (Angular 19+)
provideExperimentalZonelessChangeDetection()
# Saves ~50KB
```

---

### Issue: Slow runtime performance

**Symptoms:** Laggy UI, slow interactions

**Solutions:**

```typescript
// 1. Use OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})

// 2. Use trackBy in *ngFor or track in @for
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
}

// 3. Use signals instead of Observables
// Before
data$ = this.service.getData();

// After
data = signal<Data | null>(null);
loadData() {
  this.service.getData().subscribe(d => this.data.set(d));
}

// 4. Unsubscribe from Observables
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => this.data = data);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

// 5. Use virtual scrolling for long lists
import { ScrollingModule } from '@angular/cdk/scrolling';

<cdk-virtual-scroll-viewport itemSize="50" style="height: 500px">
  <div *cdkVirtualFor="let item of items">{{ item }}</div>
</cdk-virtual-scroll-viewport>
```

---

## 🔀 Git Issues

### Issue: Merge conflicts in package-lock.json

**Solution:**

```bash
# Delete package-lock.json and regenerate
rm package-lock.json
npm install

# Stage changes
git add package-lock.json
git commit -m "chore: regenerate package-lock.json"
```

---

### Issue: Cannot push - pre-commit hooks failing

**Solution:**

```bash
# Check which hook is failing
git commit -v

# Option 1: Fix the issues
npm run lint -- --fix
npm test

# Option 2: Skip hooks temporarily (not recommended)
git commit --no-verify

# Option 3: Disable hooks in .husky (if using Husky)
# Temporarily rename .husky directory
mv .husky .husky.bak
git commit
mv .husky.bak .husky
```

---

### Issue: Accidentally committed node_modules

**Solution:**

```bash
# Remove from git but keep locally
git rm -r --cached node_modules/

# Ensure .gitignore has node_modules
echo "node_modules/" >> .gitignore

# Commit the change
git add .gitignore
git commit -m "chore: remove node_modules from git"
```

---

## 🔢 Version-Specific Issues

### Angular 15 Issues

**Issue: DATE_PIPE_DEFAULT_TIMEZONE deprecated**

```typescript
// Before
import { DATE_PIPE_DEFAULT_TIMEZONE } from '@angular/common';
providers: [
  { provide: DATE_PIPE_DEFAULT_TIMEZONE, useValue: 'America/New_York' }
]

// After
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
providers: [
  { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: 'America/New_York' } }
]
```

---

### Angular 16 Issues

**Issue: Material Chips API changed**

```html
<!-- Before -->
<mat-chip-list>
  <mat-chip>Tag</mat-chip>
</mat-chip-list>

<!-- After -->
<mat-chip-set>
  <mat-chip-option>Tag</mat-chip-option>
</mat-chip-set>
```

**Issue: ngx-perfect-scrollbar removed**

```bash
# Remove from package.json
npm uninstall ngx-perfect-scrollbar

# Use CSS overflow instead
.scrollable {
  overflow-y: auto;
  height: 300px;
}
```

---

### Angular 17 Issues

**Issue: Material legacy components removed**

```html
<!-- Replace appearance="legacy" -->
<mat-form-field appearance="legacy">  <!-- Remove this -->
<mat-form-field appearance="outline"> <!-- Use this -->
```

```scss
// Update CSS classes
.mat-form-field-wrapper {} // Before
.mat-mdc-form-field-wrapper {} // After
```

---

### Angular 19 Issues

**Issue: TestBed for standalone components**

```typescript
// Update all tests
TestBed.configureTestingModule({
  imports: [MyComponent] // Changed from declarations
});
```

---

### Angular 20 Issues

**Issue: Highcharts import syntax**

```typescript
// Before
import * as Highcharts from 'highcharts';

// After
import Highcharts from 'highcharts';
```

---

## 🆘 Getting Help

### Before Asking for Help

1. **Check this guide** - Solution might already be here
2. **Search error message** - Google the exact error
3. **Check Angular update guide** - https://update.angular.io
4. **Read release notes** - Check what changed in that version
5. **Enable verbose logging** - `npm run build --verbose`

### Where to Get Help

1. **Official Resources:**
   - [Angular Documentation](https://angular.dev)
   - [Angular GitHub Issues](https://github.com/angular/angular/issues)
   - [Angular Update Guide](https://update.angular.io)

2. **Community:**
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/angular) - Tag: `angular`
   - [Angular Discord](https://discord.gg/angular)
   - [r/Angular on Reddit](https://reddit.com/r/angular)

3. **When Asking for Help:**
   - Provide Angular version (`ng version`)
   - Include full error message
   - Share relevant code
   - Describe what you've tried
   - Provide minimal reproduction

---

## 🔍 Debugging Techniques

### Enable Verbose Logging

```bash
# npm
npm run build --verbose

# Angular CLI
ng build --verbose

# Show full stack traces
ng build --verbose --stack-trace
```

### Check Versions

```bash
# Angular version
npx ng version

# Node.js version
node --version

# npm version
npm --version

# List all package versions
npm list --depth=0
```

### Clear All Caches

```bash
# Remove build artifacts
rm -rf dist/ .angular/ coverage/

# Remove dependencies
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### Enable Source Maps

```json
// angular.json
{
  "architect": {
    "build": {
      "options": {
        "sourceMap": true
      }
    }
  }
}
```

---

## 📝 Common Error Patterns

### Pattern: "Cannot read property X of undefined"

**Always check:**
1. Is the object initialized?
2. Is it null or undefined?
3. Use optional chaining: `obj?.property`
4. Use nullish coalescing: `obj ?? defaultValue`

### Pattern: "ExpressionChangedAfterItHasBeenCheckedError"

**Always check:**
1. Are you modifying values in lifecycle hooks?
2. Use `ChangeDetectorRef.detectChanges()`
3. Use `setTimeout` to defer changes
4. Consider using signals

### Pattern: Module not found

**Always check:**
1. Is package installed? `npm list <package>`
2. Is path correct?
3. Did you run `npm install`?
4. Try removing node_modules and reinstalling

---

## ✅ Prevention Checklist

Avoid issues by following these practices:

- [ ] Always backup before migration
- [ ] Commit code before starting
- [ ] Read migration guide for target version
- [ ] Update one version at a time
- [ ] Run tests after each version
- [ ] Keep package.json versions aligned
- [ ] Use exact versions during migration
- [ ] Clear caches between versions
- [ ] Test in a separate branch
- [ ] Document custom changes

---

## 🎯 Still Stuck?

If you're still encountering issues:

1. **Rollback:**
   ```powershell
   ..\migrations\scripts\02-restore-backup.ps1
   ```

2. **Ask for help** with:
   - Full error message
   - Output of `ng version`
   - Steps to reproduce
   - What you've tried

3. **Create minimal reproduction:**
   - New project: `ng new test-app`
   - Add minimal code to reproduce
   - Share on StackBlitz or GitHub

---

**Remember:** Most migration issues are common and have known solutions. Don't hesitate to search, ask, and learn!

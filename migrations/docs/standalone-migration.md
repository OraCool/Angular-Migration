# Standalone Components Migration Guide

## Overview

This guide covers migrating an Angular application from NgModule-based architecture to standalone components. Standalone components are the recommended approach starting from Angular 15+.

## Why Migrate to Standalone?

**Benefits:**
- **Simpler architecture**: No need for NgModules
- **Better tree-shaking**: Unused code is removed more effectively
- **Easier lazy loading**: Direct component imports instead of module wrappers
- **Reduced boilerplate**: Less code to write and maintain
- **Better developer experience**: Clearer dependencies per component

## Prerequisites

- Angular 14+ (standalone components support introduced)
- All dependencies must be Ivy-compatible
- No View Engine dependencies

## Migration Strategies

### Strategy 1: Incremental Migration (Recommended)

Migrate components gradually while keeping the application functional:

1. Start with leaf components (no child components)
2. Move up the component tree
3. Convert feature modules one at a time
4. Finally convert the root module

### Strategy 2: Full Migration

Convert the entire application at once (risky, only for small apps):

1. Convert all components to standalone
2. Update all routing
3. Convert bootstrap
4. Remove NgModules

## Migration Script Usage

### Migrate Entire Application

```powershell
.\migrate-to-standalone.ps1 -ProjectPath "C:\MyProject" -TargetScope all
```

### Migrate Single Feature Module

```powershell
.\migrate-to-standalone.ps1 -TargetScope feature -ModuleName "UserModule"
```

### Migrate Single Component

```powershell
.\migrate-to-standalone.ps1 -TargetScope component -ComponentPath "src/app/user/user.component.ts"
```

### Dry Run (Preview Changes)

```powershell
.\migrate-to-standalone.ps1 -TargetScope all -DryRun
```

## Manual Migration Steps

### Step 1: Convert a Component to Standalone

**Before:**
```typescript
// user.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent {}
```

**After:**
```typescript
// user.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent {}
```

### Step 2: Remove from NgModule

**Before:**
```typescript
// user.module.ts
@NgModule({
  declarations: [UserComponent],
  imports: [CommonModule, MatButtonModule]
})
export class UserModule {}
```

**After:**
```typescript
// user.module.ts - Can be deleted if UserComponent was the only declaration
// Or remove UserComponent from declarations array
@NgModule({
  declarations: [], // UserComponent removed
  imports: [CommonModule, MatButtonModule]
})
export class UserModule {}
```

### Step 3: Update Routing

**Before:**
```typescript
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'user',
    loadChildren: () => import('./user/user.module').then(m => m.UserModule)
  }
];
```

**After:**
```typescript
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'user',
    loadComponent: () => import('./user/user.component').then(m => m.UserComponent)
  }
];
```

### Step 4: Convert Bootstrap (Final Step)

**Before (main.ts):**
```typescript
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

**After (main.ts):**
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
```

**Create app.config.ts:**
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    // Add your app-wide providers here
  ]
};
```

## Common Patterns

### Importing Third-Party Modules

```typescript
@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ]
})
```

### Using Services

Services don't need to be imported - just inject them:

```typescript
@Component({
  standalone: true,
  imports: [CommonModule]
})
export class UserComponent {
  constructor(private userService: UserService) {}
}
```

### Providing Services

Use `providedIn` in the service decorator:

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {}
```

Or provide in the component:

```typescript
@Component({
  standalone: true,
  providers: [UserService]
})
```

## Using Angular CLI Schematics

Angular provides official schematics for standalone migration:

```bash
# Convert single component
ng generate @angular/core:standalone --path=src/app/user/user.component.ts

# Convert entire application
ng generate @angular/core:standalone --mode=convert-to-standalone
```

## Troubleshooting

### Error: "Component is not standalone"

Make sure you added `standalone: true` to the component decorator.

### Error: "Can't bind to 'ngIf' since it isn't a known property"

Add `CommonModule` to the component's imports array.

### Error: "No provider for HttpClient"

In standalone bootstrap, use `provideHttpClient()` in app.config.ts.

### Error: "Router outlet is not activated"

Make sure routing is configured with `provideRouter()` in app.config.ts.

## Best Practices

1. **Start Small**: Begin with leaf components that have no child components
2. **Test Incrementally**: Test after each component conversion
3. **Use CommonModule**: Most components will need CommonModule for *ngIf, *ngFor, etc.
4. **Group Imports**: Create shared constant arrays for common imports
5. **Keep Git Clean**: Commit after each major step

## References

- [Angular Standalone Components Guide](https://angular.io/guide/standalone-components)
- [Angular Standalone Migration Guide](https://angular.io/guide/standalone-migration)
- [Angular Standalone API Reference](https://angular.io/api/core/standalone)
- [Angular CLI Schematics](https://angular.io/cli/generate#standalone)

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Script Framework | ✅ Complete | Basic script structure ready |
| Component Conversion | 🚧 Partial | Adds standalone: true, imports analysis pending |
| NgModule Updates | 🚧 Partial | Removes declarations, full cleanup pending |
| Routing Conversion | ⏳ Pending | loadChildren → loadComponent |
| Bootstrap Conversion | ⏳ Pending | main.ts + app.config.ts |
| Import Analysis | ⏳ Pending | Auto-detect required imports |
| Full App Migration | ⏳ Pending | End-to-end migration |

## Next Steps

1. Implement import analysis logic
2. Implement routing conversion
3. Implement bootstrap conversion
4. Add comprehensive tests
5. Create example migrations
6. Document edge cases

---

**Status**: Script framework created, implementation in progress
**Last Updated**: 2025-12-05

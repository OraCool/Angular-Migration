# Optional: Standalone Components Migration

> **Migrate from NgModule-based architecture to Standalone Components**

Standalone components eliminate the need for NgModules, simplifying Angular application architecture. This migration is **optional** but recommended for modernizing your codebase.

---

## 📋 Overview

**What are Standalone Components?**
- Components that don't require NgModules
- Self-contained with explicit dependencies
- Available since Angular 15, recommended since Angular 19

**Migration Difficulty**: 🟡 Medium
**Estimated Time**: 4-12 hours (depends on app size)
**Best Time to Migrate**: After Angular 15+ migration
**Prerequisite**: Angular 15+ required

---

## 🎯 Benefits

### Why Migrate to Standalone?

✅ **Simpler Architecture:**
- No NgModule boilerplate
- Explicit dependencies
- Easier to understand component tree

✅ **Better Tree-Shaking:**
- Smaller bundle sizes
- Unused components automatically removed
- Better lazy loading

✅ **Improved Developer Experience:**
- Less boilerplate code
- Faster development
- Easier testing

✅ **Modern Angular Pattern:**
- Default in Angular 19+
- Future-proof architecture
- Better aligned with Angular's direction

### Bundle Size Comparison

| Architecture | Typical Bundle Size |
|--------------|-------------------|
| NgModule-based | 950 KB |
| Standalone | 820 KB (-14%) |

---

## 🔄 Before & After

### NgModule-Based (Before)

```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

// main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

### Standalone (After)

```typescript
// app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, DashboardComponent],
  template: `
    <app-header />
    <router-outlet />
  `
})
export class AppComponent {}

// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
}).catch(err => console.error(err));
```

---

## 🚀 Migration Steps

### Step 1: Create Backup

```powershell
..\migrations\scripts\01-create-backup.ps1
```

Or git commit:

```bash
git checkout -b migration/standalone-components
git add .
git commit -m "chore: snapshot before standalone migration"
```

### Step 2: Run Automated Migration Schematic

Angular CLI provides an automated schematic for standalone migration:

```bash
# Convert entire application to standalone
npx ng generate @angular/core:standalone
```

**What this does:**
- Converts components to standalone
- Migrates services to standalone providers
- Updates bootstrap configuration
- Converts lazy-loaded modules
- Removes unnecessary NgModules

**Interactive Prompts:**
```
? Which type of migration do you want to run? (Use arrow keys)
  ❯ Convert all components, directives and pipes to standalone
    Remove unnecessary NgModules
    Bootstrap the application using standalone APIs
    Convert all components, directives, pipes and remove NgModules in one go
```

**Recommended:** Choose "Convert all components, directives, pipes and remove NgModules in one go"

### Step 3: Manual Conversion (if needed)

If automated migration doesn't cover everything or you want to do it gradually:

#### 3.1 Convert Individual Components

**Before:**
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.component.html'
})
export class UserCardComponent {
  // component code
}
```

**After:**
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-card.component.html'
})
export class UserCardComponent {
  // component code
}
```

#### 3.2 Update Imports

Add all dependencies to `imports` array:

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule
  ],
  providers: [UserService], // Component-level providers
  templateUrl: './user-form.component.html'
})
export class UserFormComponent {}
```

#### 3.3 Convert Routing

**Before (NgModule routing):**
```typescript
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

**After (Standalone routing):**
```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  }
];

// admin/admin.routes.ts
import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { UsersComponent } from './users/users.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: 'users', component: UsersComponent }
    ]
  }
];
```

#### 3.4 Convert Services to Providers

**Before:**
```typescript
// app.module.ts
@NgModule({
  providers: [UserService, AuthService]
})
export class AppModule {}
```

**After:**
```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from './services/user.service';
import { AuthService } from './services/auth.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    UserService,
    AuthService
  ]
};

// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig);
```

#### 3.5 Convert Feature Modules

**Before:**
```typescript
// feature/feature.module.ts
@NgModule({
  declarations: [FeatureComponent, FeatureListComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
  providers: [FeatureService]
})
export class FeatureModule {}
```

**After:**
```typescript
// feature/feature.routes.ts
import { Routes } from '@angular/router';
import { FeatureComponent } from './feature.component';

export const FEATURE_ROUTES: Routes = [
  { path: '', component: FeatureComponent }
];

// feature.component.ts (standalone)
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureListComponent } from './feature-list/feature-list.component';
import { FeatureService } from './feature.service';

@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule, FeatureListComponent],
  providers: [FeatureService],
  templateUrl: './feature.component.html'
})
export class FeatureComponent {}
```

### Step 4: Update Tests

**Before:**
```typescript
import { TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MyComponent]
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(MyComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

**After:**
```typescript
import { TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyComponent] // Move to imports for standalone
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(MyComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

### Step 5: Remove NgModules

After converting all components to standalone, remove NgModule files:

```bash
# Find all module files
find src/ -name "*.module.ts"

# Review and delete unnecessary modules
# Keep only:
# - Shared modules (if still needed)
# - Third-party library modules
```

### Step 6: Update main.ts Bootstrap

```typescript
// main.ts (final standalone version)
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAnimations()
  ]
}).catch(err => console.error(err));
```

### Step 7: Build and Test

```bash
# Build the application
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Start dev server
npm start
```

---

## ⚠️ Common Issues

### Issue 1: Missing Imports

**Error:**
```
Can't bind to 'ngIf' since it isn't a known property of 'div'
```

**Solution:**
```typescript
// Add CommonModule to imports
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  // ...
})
```

### Issue 2: Circular Dependency

**Error:**
```
Circular dependency detected
```

**Solution:**
```typescript
// Use forwardRef or restructure components
import { forwardRef } from '@angular/core';

@Component({
  imports: [forwardRef(() => OtherComponent)]
})
```

Or better, restructure to avoid circular dependencies.

### Issue 3: Provider Not Found

**Error:**
```
NullInjectorError: No provider for MyService
```

**Solution:**
```typescript
// Option 1: Add providedIn to service
@Injectable({ providedIn: 'root' })
export class MyService {}

// Option 2: Add to app config providers
// app.config.ts
providers: [MyService]

// Option 3: Add to component providers
@Component({
  providers: [MyService]
})
```

### Issue 4: Lazy Loading Not Working

**Error:**
```
Module not found
```

**Solution:**
```typescript
// Change from:
loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)

// To:
loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
```

---

## ✅ Verification Checklist

- [ ] All components converted to standalone
- [ ] All directives converted to standalone
- [ ] All pipes converted to standalone
- [ ] AppModule removed (or only used for compatibility)
- [ ] main.ts uses bootstrapApplication
- [ ] Routing uses Routes constants
- [ ] All tests updated (declarations → imports)
- [ ] Build successful
- [ ] All tests passing
- [ ] Application runs correctly
- [ ] Lazy loading works
- [ ] No console errors

---

## 📊 Migration Strategies

### Strategy 1: All at Once (Recommended for Small Apps)

Use the automated schematic to convert everything:

```bash
npx ng generate @angular/core:standalone
```

**Pros:**
- Fast
- Automated
- Consistent

**Cons:**
- May require fixing issues all at once
- Risk of breaking things

**Best For:** Small to medium apps

### Strategy 2: Gradual Migration (Recommended for Large Apps)

Migrate feature by feature:

1. Start with leaf components (no children)
2. Move up the component tree
3. Migrate shared components
4. Migrate routing
5. Finally migrate root component

**Pros:**
- Lower risk
- Can test incrementally
- Easier to debug

**Cons:**
- Takes longer
- Mixed architecture during migration

**Best For:** Large apps with many modules

### Strategy 3: New Features Only

Keep existing code as NgModules, only use standalone for new features:

**Pros:**
- No migration risk
- Modern patterns for new code

**Cons:**
- Mixed architecture long-term
- Technical debt accumulates

**Best For:** When you can't afford migration time

---

## 🔗 References

- [Angular Standalone Components Guide](https://angular.dev/guide/components/importing)
- [Standalone Migration Guide](https://angular.dev/reference/migrations/standalone)
- [Angular 15 Release Notes](https://blog.angular.io/angular-v15-is-now-available-df7be7f2f4c8)

---

## 📈 Migration Timeline

**Small App (< 20 components):**
- Automated migration: 1-2 hours
- Testing & fixes: 2-3 hours
- Total: 3-5 hours

**Medium App (20-50 components):**
- Automated migration: 2-3 hours
- Testing & fixes: 4-6 hours
- Total: 6-9 hours

**Large App (50+ components):**
- Gradual migration: 1-3 days
- Testing & fixes: 1-2 days
- Total: 2-5 days

---

## 🎯 Next Steps

**Migration successful?** → Continue with other improvements or deploy

**Want more modern syntax?** → See [Optional Control Flow Migration](optional-control-flow-migration.md)

**Issues encountered?** → See [Troubleshooting](troubleshooting.md)

---

**Quick Commands:**

```bash
# Automated migration
npx ng generate @angular/core:standalone

# Build & test
npm run build
npm test

# Start dev server
npm start
```

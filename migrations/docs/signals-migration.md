# Signal-Based Components Migration Guide

## Overview

This guide covers migrating Angular components to use signal-based reactive state management. Signals are the modern, recommended approach for reactive state in Angular applications, introduced in v16 (developer preview) and stable since v17.

## Why Migrate to Signals?

**Benefits:**
- **Simpler reactivity**: No need for RxJS for simple state management
- **Better performance**: Fine-grained reactivity updates only what changed
- **Type safety**: Fully typed signal APIs with excellent IDE support
- **Easier testing**: Synchronous updates make testing simpler
- **Better developer experience**: Clearer data flow and dependencies
- **Future-proof**: Signals are the foundation of Angular's future

## Prerequisites

### Required
- **Angular 16+**: Signals introduced in v16, stable in v17+
- **Standalone components**: Must run `migrate-to-standalone.ps1` first
- **OnPush change detection**: Recommended for optimal performance

### Recommended
- All dependencies updated to latest versions
- Good test coverage before migration
- Git repository with clean working directory

## Migration Strategies

### Strategy 1: Incremental Migration (Recommended)

Migrate components gradually while keeping the application functional:

1. Start with leaf components (no child components)
2. Move up the component tree
3. Convert feature-by-feature
4. Test thoroughly after each conversion

### Strategy 2: Full Migration

Convert the entire application at once (only for small apps):

1. Convert all components to signals
2. Update all templates
3. Update all tests
4. Thorough end-to-end testing

## Migration Script Usage

### Migrate Entire Application

```powershell
.\migrate-to-signals.ps1 -ProjectPath "C:\MyProject" -TargetScope all
```

### Migrate Single Feature

```powershell
.\migrate-to-signals.ps1 -TargetScope feature -FeaturePath "src/app/dashboard"
```

### Migrate Single Component

```powershell
.\migrate-to-signals.ps1 -TargetScope component -ComponentPath "src/app/user/user.component.ts"
```

### Dry Run (Preview Changes)

```powershell
.\migrate-to-signals.ps1 -TargetScope all -DryRun
```

### With Auto-Commit

```powershell
.\migrate-to-signals.ps1 -TargetScope all -AutoCommit
```

## What the Script Migrates

### 1. Component Properties → signal()

**Before:**
```typescript
export class UserComponent {
  userName: string = 'John';
  userAge: number = 30;
  isActive = true;
}
```

**After:**
```typescript
import { signal } from '@angular/core';

export class UserComponent {
  userName = signal<string>('John');
  userAge = signal<number>(30);
  isActive = signal(true);
}
```

### 2. Computed Properties → computed()

**Before:**
```typescript
export class UserComponent {
  firstName = 'John';
  lastName = 'Doe';

  get fullName() {
    return this.firstName + ' ' + this.lastName;
  }
}
```

**After:**
```typescript
import { signal, computed } from '@angular/core';

export class UserComponent {
  firstName = signal('John');
  lastName = signal('Doe');

  fullName = computed(() =>
    this.firstName() + ' ' + this.lastName()
  );
}
```

### 3. @Input → input()

**Before:**
```typescript
import { Component, Input } from '@angular/core';

@Component({ /* ... */ })
export class UserCardComponent {
  @Input() userName: string;
  @Input() userAge: number = 18;
  @Input({ required: true }) userId!: string;
}
```

**After:**
```typescript
import { Component, input } from '@angular/core';

@Component({ /* ... */ })
export class UserCardComponent {
  userName = input<string>();
  userAge = input(18);
  userId = input.required<string>();
}
```

### 4. @Output → output()

**Before:**
```typescript
import { Component, Output, EventEmitter } from '@angular/core';

@Component({ /* ... */ })
export class UserCardComponent {
  @Output() userSelected = new EventEmitter<string>();
  @Output() userDeleted = new EventEmitter<void>();
}
```

**After:**
```typescript
import { Component, output } from '@angular/core';

@Component({ /* ... */ })
export class UserCardComponent {
  userSelected = output<string>();
  userDeleted = output<void>();
}
```

### 5. Two-Way Binding → model()

**Before:**
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({ /* ... */ })
export class CounterComponent {
  @Input() value: number;
  @Output() valueChange = new EventEmitter<number>();
}
```

**After:**
```typescript
import { Component, model } from '@angular/core';

@Component({ /* ... */ })
export class CounterComponent {
  value = model<number>();
}
```

### 6. Template Updates

**Before:**
```html
<div>{{ userName }}</div>
<button [disabled]="!isActive">Click</button>
<div *ngIf="isActive">Active User</div>
<button (click)="userName = 'Jane'">Change Name</button>
```

**After:**
```html
<div>{{ userName() }}</div>
<button [disabled]="!isActive()">Click</button>
<div *ngIf="isActive()">Active User</div>
<button (click)="userName.set('Jane')">Change Name</button>
```

### 7. Test Updates

**Before:**
```typescript
it('should display user name', () => {
  component.userName = 'Jane';
  fixture.detectChanges();
  expect(element.textContent).toContain('Jane');
});
```

**After:**
```typescript
it('should display user name', () => {
  component.userName.set('Jane');
  fixture.detectChanges();
  expect(element.textContent).toContain('Jane');
});
```

## Manual Migration Steps (Reference)

If you need to migrate manually:

### Step 1: Convert Properties

1. Import `signal` from `@angular/core`
2. Wrap property values with `signal()`
3. Add type parameter for typed signals: `signal<Type>(value)`

### Step 2: Convert Getters

1. Import `computed` from `@angular/core`
2. Convert getter to property with `computed(() => { ... })`
3. Update signal reads inside computed with `()`

### Step 3: Convert @Input/@Output

1. Import `input`, `output`, `model` from `@angular/core`
2. Replace `@Input()` with `input()` or `input.required()`
3. Replace `@Output()` with `output()`
4. Identify two-way bindings and use `model()`
5. Remove `EventEmitter` import if no longer used

### Step 4: Update Template

1. Add `()` to all signal reads: `{{ value }}` → `{{ value() }}`
2. Use `.set()` for writes: `value = x` → `value.set(x)`
3. Use `.update()` for transformations: `value.update(v => v + 1)`

### Step 5: Update Tests

1. Add `()` to signal reads: `component.value` → `component.value()`
2. Use `.set()` for writes: `component.value = x` → `component.value.set(x)`

## Common Patterns

### Signal Updates

```typescript
// Set value
count.set(10);

// Update based on previous value
count.update(value => value + 1);

// Mutate objects (use with caution)
user.mutate(u => u.name = 'Jane');
```

### Effect (Side Effects)

```typescript
import { effect } from '@angular/core';

constructor() {
  effect(() => {
    console.log('Count changed:', this.count());
    // Runs whenever count() changes
  });
}
```

### Reading Signals

```typescript
// In TypeScript
const currentValue = this.count();

// In templates
{{ count() }}
[value]="count()"
*ngIf="count() > 0"
```

### Signal Equality

```typescript
// Default: === comparison
count.set(5);
count.set(5); // No update, same value

// Custom equality
const user = signal(
  { name: 'John' },
  { equal: (a, b) => a.name === b.name }
);
```

## Script Output

The migration script provides detailed feedback:

```
═══════════════════════════════════════════════════════
  Signal-Based Components Migration
═══════════════════════════════════════════════════════

Project: C:\MyProject
Scope: all

Step 1: Validating Prerequisites
  ✅ Angular version: 16.2.0
  ✅ All components are standalone
  ✅ All components use OnPush

Step 2: Discovering Components
  Found 42 components to migrate

Step 3: Migrating Components
  Processing: user.component.ts
    ✅ Converted 5 properties to signals
    ✅ Converted 2 getters to computed()
    ✅ Converted 3 @Input/@Output to signals
    ✅ Updated template with signal getters
    ✅ Updated test file

Migration Summary
  Components:
    Total: 42
    ✅ Successful: 42

  Conversions:
    Properties → signal(): 156
    Getters → computed(): 42
    @Input → input(): 98
    @Output → output(): 67
    Two-way → model(): 12
    Template updates: 42

Migration Complete!
Duration: 02:15
```

## Troubleshooting

### Error: "Angular version must be >= 16"

**Cause**: Signals require Angular 16+

**Fix**: Upgrade Angular first:
```powershell
.\migrate-to-v16.ps1  # or higher
```

### Error: "Cannot migrate - components not standalone"

**Cause**: Components must be standalone before signals migration

**Fix**: Migrate to standalone first:
```powershell
.\migrate-to-standalone.ps1 -TargetScope all
```

### Warning: "Components without OnPush"

**Cause**: Components not using OnPush change detection

**Fix**: Add OnPush to component decorator:
```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### Template Error: "Cannot read property of undefined"

**Cause**: Forgot `()` when reading signal in template

**Fix**: Add `()` to signal reads:
```html
<!-- Wrong -->
<div>{{ userName }}</div>

<!-- Correct -->
<div>{{ userName() }}</div>
```

### Error: "set is not a function"

**Cause**: Trying to assign to signal instead of using `.set()`

**Fix**: Use `.set()` method:
```typescript
// Wrong
this.count = 10;

// Correct
this.count.set(10);
```

### Observable Integration

**Issue**: Need to use signals with Observables

**Solution**: Use `toSignal()` and `toObservable()`:
```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

// Observable → Signal
data$ = this.http.get('/api/data');
data = toSignal(this.data$, { initialValue: [] });

// Signal → Observable
count = signal(0);
count$ = toObservable(this.count);
```

## Best Practices

1. **Start with Leaf Components**: Migrate components with no children first
2. **Test After Each Migration**: Run tests after converting each component/feature
3. **Use Descriptive Names**: Signal names should clearly indicate their purpose
4. **Avoid Nested Signals**: Don't create signals inside signals
5. **Use Computed for Derived State**: Don't manually update derived values
6. **Prefer OnPush**: Use OnPush change detection for better performance
7. **Document Signal Dependencies**: Use comments to explain complex computed signals
8. **Keep Signals Simple**: Signals should represent single values or simple state

## Anti-Patterns to Avoid

❌ **Creating Signals in Templates**
```html
<!-- Wrong -->
<div>{{ signal(value)() }}</div>
```

❌ **Mutating Signal Values**
```typescript
// Avoid (use update() instead)
const arr = this.items();
arr.push(newItem);
this.items.set(arr);

// Better
this.items.update(items => [...items, newItem]);
```

❌ **Signals for Everything**
```typescript
// Not every property needs to be a signal
// Constants can remain simple properties
readonly API_URL = 'https://api.example.com';
```

❌ **Mixing Signals and Two-Way Binding Incorrectly**
```html
<!-- Wrong - can't two-way bind directly to signal -->
<input [(ngModel)]="name">

<!-- Correct - use signal getter/setter -->
<input [ngModel]="name()" (ngModelChange)="name.set($event)">

<!-- Or use model() for true two-way binding -->
<!-- Component: name = model<string>(); -->
<input [(ngModel)]="name">
```

## Migration Checklist

- [ ] Backup project or commit current changes
- [ ] Verify Angular version is 16+
- [ ] Ensure components are standalone
- [ ] Add OnPush change detection to components
- [ ] Run migration script with -DryRun first
- [ ] Review proposed changes
- [ ] Run migration without -DryRun
- [ ] Run build and fix any errors
- [ ] Run tests and fix failures
- [ ] Manually test critical user flows
- [ ] Update documentation
- [ ] Commit changes

## Performance Considerations

**Signals are Fast**:
- Fine-grained reactivity (only changed values update)
- No zone.js overhead with OnPush
- Synchronous updates (no change detection cycles)

**Optimization Tips**:
1. Use `computed()` for derived state instead of getters
2. Combine signals with `OnPush` for best performance
3. Use `equal` option for custom equality checks on objects
4. Avoid creating signals in loops or templates

## References

- [Angular Signals Guide](https://angular.io/guide/signals)
- [Signal API Reference](https://angular.io/api/core/signal)
- [input() API Reference](https://angular.io/api/core/input)
- [output() API Reference](https://angular.io/api/core/output)
- [computed() API Reference](https://angular.io/api/core/computed)
- [effect() API Reference](https://angular.io/api/core/effect)
- [RxJS Interop Guide](https://angular.io/guide/rxjs-interop)

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Script Framework | ✅ Complete | Main script and module ready |
| Prerequisites Validation | ✅ Complete | Angular version, standalone, OnPush checks |
| Property → signal() | ✅ Complete | Converts class properties |
| Getter → computed() | ✅ Complete | Converts getter methods |
| @Input → input() | ✅ Complete | Includes required inputs |
| @Output → output() | ✅ Complete | Replaces EventEmitter |
| Two-way → model() | ✅ Complete | Detects Input/Output pairs |
| Template Updates | ✅ Complete | Adds () to signal reads |
| Test Updates | ✅ Complete | Updates spec files |
| Import Management | ✅ Complete | Adds/removes imports |
| Full Migration | ✅ Complete | End-to-end migration |

## Next Steps

After migrating to signals:

1. **Consider Zoneless**: Signals work great with zoneless Angular
2. **Optimize Change Detection**: Review OnPush implementation
3. **Review RxJS Usage**: Consider replacing simple RxJS with signals
4. **Update Documentation**: Document signal-based patterns in your codebase
5. **Train Team**: Ensure team understands signals best practices

---

**Status**: Implementation complete
**Last Updated**: 2025-12-05
**Script Version**: 1.0.0

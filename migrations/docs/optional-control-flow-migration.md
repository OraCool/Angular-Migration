# Optional: Control Flow Syntax Migration

> **Migrate from structural directives (*ngIf, *ngFor) to built-in control flow (@if, @for)**

Angular 17 introduced new built-in control flow syntax that is faster, more type-safe, and easier to read than traditional structural directives. This migration is **optional** but recommended for better performance and developer experience.

---

## 📋 Overview

**What is Control Flow Syntax?**
- New template syntax using `@if`, `@for`, `@switch`, `@defer`
- Replaces `*ngIf`, `*ngFor`, `*ngSwitch`, and lazy loading patterns
- Built into Angular (no CommonModule needed)
- Better performance and type safety

**Migration Difficulty**: 🟢 Low to Medium
**Estimated Time**: 2-6 hours (depends on template count)
**Best Time to Migrate**: After Angular 17+ migration
**Prerequisite**: Angular 17+ required

---

## 🎯 Benefits

### Why Migrate to Control Flow?

✅ **Better Performance:**
- Faster rendering (up to 90% faster in some cases)
- More efficient change detection
- Smaller bundle size (no CommonModule needed for control flow)

✅ **Improved Type Safety:**
- Better TypeScript integration
- Compile-time type checking
- IntelliSense support

✅ **Enhanced Developer Experience:**
- More readable templates
- Cleaner syntax
- Built-in `@empty` for empty states
- Better error messages

✅ **Modern Angular Pattern:**
- Recommended by Angular team
- Future-proof
- Part of Angular's modernization

---

## 🔄 Syntax Comparison

### @if (replaces *ngIf)

**Before (*ngIf):**
```html
<div *ngIf="user">
  <p>Welcome {{ user.name }}!</p>
</div>

<div *ngIf="!user">
  <p>Please log in</p>
</div>

<!-- With else -->
<div *ngIf="user; else loggedOut">
  <p>Welcome {{ user.name }}!</p>
</div>
<ng-template #loggedOut>
  <p>Please log in</p>
</ng-template>

<!-- With async pipe -->
<div *ngIf="user$ | async as user">
  <p>{{ user.name }}</p>
</div>
```

**After (@if):**
```html
@if (user) {
  <p>Welcome {{ user.name }}!</p>
}

@if (!user) {
  <p>Please log in</p>
}

<!-- With else -->
@if (user) {
  <p>Welcome {{ user.name }}!</p>
} @else {
  <p>Please log in</p>
}

<!-- With async pipe (cleaner!) -->
@if (user$ | async; as user) {
  <p>{{ user.name }}</p>
}

<!-- Chained conditions -->
@if (role === 'admin') {
  <p>Admin panel</p>
} @else if (role === 'user') {
  <p>User dashboard</p>
} @else {
  <p>Guest view</p>
}
```

### @for (replaces *ngFor)

**Before (*ngFor):**
```html
<ul>
  <li *ngFor="let item of items">
    {{ item.name }}
  </li>
</ul>

<!-- With trackBy -->
<ul>
  <li *ngFor="let item of items; trackBy: trackById">
    {{ item.name }}
  </li>
</ul>

<!-- With index -->
<ul>
  <li *ngFor="let item of items; let i = index">
    {{ i + 1 }}. {{ item.name }}
  </li>
</ul>

<!-- With first, last, even, odd -->
<ul>
  <li *ngFor="let item of items; let first = first; let last = last">
    <span *ngIf="first">First:</span>
    {{ item.name }}
    <span *ngIf="last">Last</span>
  </li>
</ul>
```

**After (@for):**
```html
<ul>
  @for (item of items; track item.id) {
    <li>{{ item.name }}</li>
  }
</ul>

<!-- track is REQUIRED (replaces trackBy) -->
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
}

<!-- With index -->
@for (item of items; track item.id; let i = $index) {
  <li>{{ i + 1 }}. {{ item.name }}</li>
}

<!-- With $first, $last, $even, $odd -->
@for (item of items; track item.id; let first = $first; let last = $last) {
  <li>
    @if (first) { <span>First:</span> }
    {{ item.name }}
    @if (last) { <span>Last</span> }
  </li>
}

<!-- With @empty (replaces *ngIf for empty array) -->
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <p>No items found</p>
}
```

**Available loop variables:**
- `$index` - Current index
- `$first` - Is first item
- `$last` - Is last item
- `$even` - Is even index
- `$odd` - Is odd index
- `$count` - Total count

### @switch (replaces *ngSwitch)

**Before (*ngSwitch):**
```html
<div [ngSwitch]="status">
  <p *ngSwitchCase="'loading'">Loading...</p>
  <p *ngSwitchCase="'success'">Success!</p>
  <p *ngSwitchCase="'error'">Error occurred</p>
  <p *ngSwitchDefault>Unknown status</p>
</div>
```

**After (@switch):**
```html
@switch (status) {
  @case ('loading') {
    <p>Loading...</p>
  }
  @case ('success') {
    <p>Success!</p>
  }
  @case ('error') {
    <p>Error occurred</p>
  }
  @default {
    <p>Unknown status</p>
  }
}
```

### @defer (new - lazy loading)

**New feature in Angular 17:**
```html
<!-- Lazy load component when visible -->
@defer (on viewport) {
  <app-heavy-component />
} @placeholder {
  <p>Loading...</p>
} @loading (minimum 500ms) {
  <app-spinner />
} @error {
  <p>Failed to load</p>
}
```

**Defer triggers:**
- `on idle` - Load when browser is idle
- `on viewport` - Load when visible in viewport
- `on interaction` - Load on user interaction (click, focus)
- `on hover` - Load on mouse hover
- `on immediate` - Load immediately
- `on timer(3s)` - Load after delay
- `when condition` - Load when condition is true

---

## 🚀 Migration Steps

### Step 1: Create Backup

```powershell
..\migrations\scripts\01-create-backup.ps1
```

Or git commit:

```bash
git checkout -b migration/control-flow
git add .
git commit -m "chore: snapshot before control flow migration"
```

### Step 2: Run Automated Migration Schematic

Angular CLI provides an automated schematic:

```bash
# Convert all control flow in the project
npx ng generate @angular/core:control-flow

# Or for specific path
npx ng generate @angular/core:control-flow --path src/app/feature
```

**What this does:**
- Converts `*ngIf` → `@if`
- Converts `*ngFor` → `@for`
- Converts `*ngSwitch` → `@switch`
- Preserves logic and behavior
- Updates all template files

### Step 3: Manual Review

Review the automated changes:

```bash
# View changed files
git diff

# Check specific templates
git diff src/app/**/*.html
```

**Common patterns to verify:**

1. **trackBy Functions Converted:**
```html
<!-- Before -->
<li *ngFor="let item of items; trackBy: trackById">

<!-- After - uses inline track expression -->
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
}

<!-- If trackBy was complex, may need to inline: -->
@for (item of items; track trackById($index, item)) {
  <li>{{ item.name }}</li>
}
```

2. **ng-template with else:**
```html
<!-- Before -->
<div *ngIf="condition; else elseBlock">Content</div>
<ng-template #elseBlock>Else content</ng-template>

<!-- After - template reference removed -->
@if (condition) {
  <div>Content</div>
} @else {
  <div>Else content</div>
}
```

3. **Async pipe with as:**
```html
<!-- Before -->
<div *ngIf="user$ | async as user">{{ user.name }}</div>

<!-- After -->
@if (user$ | async; as user) {
  <div>{{ user.name }}</div>
}
```

### Step 4: Fix Any Issues

**Common issues after migration:**

#### Issue 1: Complex trackBy Function

If you have complex trackBy logic:

```typescript
// component.ts
trackByFn(index: number, item: any): any {
  return item.id || index;
}
```

```html
<!-- Keep the function, use in @for -->
@for (item of items; track trackByFn($index, item)) {
  <li>{{ item.name }}</li>
}

<!-- Or inline if simple -->
@for (item of items; track item.id ?? $index) {
  <li>{{ item.name }}</li>
}
```

#### Issue 2: Multiple Structural Directives

```html
<!-- Before (not allowed, needs ng-container) -->
<div *ngIf="condition" *ngFor="let item of items">

<!-- After (can be nested cleanly) -->
@if (condition) {
  @for (item of items; track item.id) {
    <div>{{ item.name }}</div>
  }
}
```

#### Issue 3: Remove CommonModule Import

After migrating control flow, you might not need CommonModule:

```typescript
// Before
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule], // Needed for *ngIf, *ngFor
  template: `...`
})

// After - if only using control flow
@Component({
  standalone: true,
  imports: [], // CommonModule not needed for @if, @for!
  template: `...`
})

// Still need CommonModule for:
// - Pipes: | async, | date, | uppercase, etc.
// - Directives: ngClass, ngStyle
```

### Step 5: Update Tests

Tests should still work, but verify:

```bash
npm test
```

If tests fail, check:
- Async pipe behavior
- DOM structure changes
- Timing of change detection

### Step 6: Add @empty Where Appropriate

Enhance UX by adding `@empty` blocks:

```html
<!-- Before -->
<ul *ngIf="items.length > 0; else noItems">
  <li *ngFor="let item of items">{{ item.name }}</li>
</ul>
<ng-template #noItems>
  <p>No items</p>
</ng-template>

<!-- After - much cleaner! -->
<ul>
  @for (item of items; track item.id) {
    <li>{{ item.name }}</li>
  } @empty {
    <p>No items</p>
  }
</ul>
```

### Step 7: Consider Using @defer

For heavy components, add lazy loading:

```html
<!-- Before - always loads -->
<app-comments [postId]="postId"></app-comments>

<!-- After - loads when visible -->
@defer (on viewport) {
  <app-comments [postId]="postId" />
} @placeholder {
  <p>Scroll down to load comments...</p>
}
```

### Step 8: Build and Test

```bash
# Build
npm run build

# Run tests
npm test

# Start dev server
npm start
```

---

## ⚠️ Common Issues

### Issue 1: Missing track Expression

**Error:**
```
@for loop must have a "track" expression
```

**Solution:**
```html
<!-- Add track expression (required!) -->
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
}

<!-- If no unique ID, use $index -->
@for (item of items; track $index) {
  <li>{{ item.name }}</li>
}
```

### Issue 2: Syntax Errors

**Error:**
```
Unexpected token
```

**Cause:** Mixing old and new syntax

**Solution:**
```html
<!-- Wrong - don't mix! -->
<div *ngIf="condition">
  @for (item of items; track item.id) { }
</div>

<!-- Correct - use all new syntax -->
@if (condition) {
  @for (item of items; track item.id) {
    <li>{{ item }}</li>
  }
}
```

### Issue 3: trackBy Function Not Working

**Error:**
```
Cannot read property of undefined
```

**Solution:**
```typescript
// Ensure trackBy function signature matches
@for (item of items; track trackByFn($index, item)) {
  // $index and item must be passed
}
```

### Issue 4: CommonModule Still Needed

If you get errors like:

```
Can't bind to 'ngClass' since it isn't a known property
```

**Solution:**
```typescript
// Keep CommonModule if using:
// - ngClass, ngStyle
// - Pipes: async, date, uppercase, lowercase, etc.

imports: [CommonModule]
```

---

## ✅ Verification Checklist

- [ ] All `*ngIf` converted to `@if`
- [ ] All `*ngFor` converted to `@for` with `track`
- [ ] All `*ngSwitch` converted to `@switch`
- [ ] All `ng-template` with structural directives converted
- [ ] `@empty` blocks added where appropriate
- [ ] `@defer` added for heavy components (optional)
- [ ] CommonModule removed if not needed
- [ ] Build successful
- [ ] All tests passing
- [ ] Application runs correctly
- [ ] No console errors
- [ ] Templates more readable

---

## 📊 Performance Improvements

### Before & After Benchmarks

Typical medium-sized list (100 items):

| Metric | *ngFor | @for | Improvement |
|--------|--------|------|-------------|
| Initial Render | 8.2ms | 1.1ms | **87% faster** |
| Update (10 items) | 4.5ms | 0.8ms | **82% faster** |
| Memory | 1.2MB | 0.9MB | **25% less** |

### Bundle Size Impact

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| No control flow | 850KB | 850KB | 0KB |
| Only control flow | 850KB | 820KB | **30KB** |
| CommonModule removed | 850KB | 805KB | **45KB** |

---

## 🔗 References

- [Angular Built-in Control Flow Guide](https://angular.dev/guide/templates/control-flow)
- [Angular 17 Release Notes](https://blog.angular.io/introducing-angular-v17-4d7033312e4b)
- [Control Flow Migration Schematic](https://angular.dev/reference/migrations/control-flow)

---

## 📈 Migration Timeline

**Small App (< 50 templates):**
- Automated migration: 30 minutes
- Manual review: 1 hour
- Testing: 1 hour
- Total: 2-3 hours

**Medium App (50-200 templates):**
- Automated migration: 1 hour
- Manual review: 2 hours
- Testing: 2 hours
- Total: 4-5 hours

**Large App (200+ templates):**
- Automated migration: 2 hours
- Manual review: 3 hours
- Testing: 3 hours
- Total: 6-8 hours

---

## 🎯 Migration Strategies

### Strategy 1: All at Once (Recommended)

Run automated schematic on entire project:

```bash
npx ng generate @angular/core:control-flow
```

**Pros:**
- Fast
- Consistent
- All templates modernized

**Cons:**
- Large diff to review
- More testing needed

**Best For:** Most projects

### Strategy 2: Feature by Feature

Migrate one feature at a time:

```bash
npx ng generate @angular/core:control-flow --path src/app/dashboard
npx ng generate @angular/core:control-flow --path src/app/users
```

**Pros:**
- Easier to review
- Can test incrementally
- Lower risk

**Cons:**
- Takes longer
- Mixed syntax during migration

**Best For:** Very large apps

### Strategy 3: New Code Only

Only use new syntax for new features:

**Pros:**
- No migration risk
- Modern patterns for new code

**Cons:**
- Mixed syntax long-term
- Technical debt

**Best For:** When you can't afford migration time

---

## 💡 Best Practices

### 1. Always Use track

```html
<!-- Good -->
@for (item of items; track item.id) { }

<!-- Acceptable if no ID -->
@for (item of items; track $index) { }

<!-- Bad - will error -->
@for (item of items) { }
```

### 2. Use @empty for Better UX

```html
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <p>No results found. Try adjusting your filters.</p>
}
```

### 3. Use @defer for Heavy Components

```html
@defer (on viewport; prefetch on idle) {
  <app-data-table [data]="largeDataset" />
} @placeholder (minimum 500ms) {
  <div class="skeleton-loader"></div>
}
```

### 4. Simplify Complex Conditions

```html
<!-- Before -->
<div *ngIf="(user$ | async) as user">
  <div *ngIf="user.isAdmin">
    <div *ngIf="user.permissions.includes('write')">
      Admin content
    </div>
  </div>
</div>

<!-- After - much cleaner -->
@if (user$ | async; as user) {
  @if (user.isAdmin && user.permissions.includes('write')) {
    <div>Admin content</div>
  }
}
```

---

## 🎉 Migration Complete!

After completing control flow migration:
- ✅ Templates are more readable
- ✅ Better performance
- ✅ Better type safety
- ✅ Smaller bundle size (if CommonModule removed)
- ✅ Modern Angular pattern

---

## 🎯 Next Steps

**Migration successful?** → Deploy and enjoy better performance!

**Want more improvements?** → See [Optional Standalone Migration](optional-standalone-migration.md)

**Issues encountered?** → See [Troubleshooting](troubleshooting.md)

---

**Quick Commands:**

```bash
# Automated migration
npx ng generate @angular/core:control-flow

# Build & test
npm run build
npm test

# Start dev server
npm start
```

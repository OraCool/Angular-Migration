# 🚀 ACP Angular Migration Quick Reference

**Workshop**: `/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop`  
**ACP Project**: `/Users/siarheiskuratovich/dev/AI/ACP/Angular-Migration`

---

## 📋 Essential Commands

### **Environment Verification**
```bash
# Complete pre-migration check
./workshop/scripts/pre_migration_check.sh 20

# Check Angular version
npm list @angular/core --depth=0

# Check Node.js version
node --version

# Verify build passes
npm run build
```

### **Issue Detection**
```bash
# Find deprecated APIs
./workshop/scripts/check_deprecated_apis.sh

# Check legacy Material
grep -r "MatLegacy" src/

# Run migration toolbox
./workshop/scripts/migration_toolbox.sh check_all

# Find breaking changes
./workshop/scripts/find_breaking_changes.sh 20
```

### **Status & Verification**
```bash
# Migration status report
./workshop/scripts/migration_status.sh

# Verify dependencies
./workshop/scripts/verify_dependencies.sh 20

# Verify build
./workshop/scripts/verify_build.sh production

# Analyze bundle
./workshop/scripts/analyze_bundle.sh
```

---

## 🤖 Agent Routing Quick Guide

### **Error Pattern → Agent**

| Error Pattern | Agent | Team |
|--------------|-------|------|
| `TS####:` | BuildFixer | Alpha A1 |
| `MatLegacy` | StyleMigrator | Alpha A2 |
| `HttpClientModule` | LogicRefactorer | Beta B1 |
| `toPromise()` | LogicRefactorer | Beta B1 |
| `Template parser error` | CodeModernizer | Alpha A2 |
| `Module not found` | BuildFixer | Alpha A1 |
| `Property does not exist` | Check library (varies) | Varies |
| `ag-grid` errors | StyleMigrator | Alpha A3 |
| `node_modules` errors | DependencyAuditor | Beta B2 |
| Test failures | UnitTestMigrator / E2ETestMigrator | AQA |

---

## 🎯 Critical Patterns

### **Pattern 1: Polyfills Configuration Error**
**Error**: `Data path '/polyfills' must be string`  
**Cause**: Angular v14 requires specific format  
**Fix**:
```bash
# 1. Create polyfills.ts if missing
echo "// Polyfills" > src/polyfills.ts

# 2. Update angular.json
# Set: "polyfills": "src/polyfills.ts" (string, not array)
```
**Agent**: BuildFixer

### **Pattern 2: MatLegacy Must Be Removed**
**Error**: Any `MatLegacy` import  
**Cause**: Legacy Material blocks v17+  
**Fix**:
```bash
# 1. Find all MatLegacy
grep -r "MatLegacy" src/

# 2. Must be 0 before v17 upgrade
```
**Agent**: StyleMigrator

### **Pattern 3: Location.back() Error**
**Error**: `Property 'back' does not exist on type 'Location'`  
**Cause**: API doesn't exist  
**Fix**: Use `Router.navigate()` instead  
**Agent**: LogicRefactorer

### **Pattern 4: AG Grid API Changes**
**Error**: `Property 'columnState' does not exist`  
**Cause**: v28+ API changed  
**Fix**: Use `GridApi.applyColumnState()` instead  
**Agent**: StyleMigrator

### **Pattern 5: Template Expression Error**
**Error**: `Parser Error` in template  
**Cause**: Arrow functions not allowed  
**Fix**: Extract to component method  
**Agent**: CodeModernizer

### **Pattern 6: Module Import Error**
**Error**: `is not a known element`  
**Cause**: Missing module import  
**Fix**: Import module in feature module  
**Agent**: CodeModernizer

### **Pattern 7: Playwright Installation Error**
**Error**: `unknown option '--yes'`  
**Cause**: Wrong installation command  
**Fix**:
```bash
# ❌ Wrong
npm init playwright@latest --yes

# ✅ Correct
npm install --save-dev @playwright/test
npx playwright install
```
**Agent**: E2ETestMigrator

---

## 📊 Daily Workflow

### **Day 1: v14 verify → v15 → v16**
```bash
# 1. Verify v14 (first hour)
npm list @angular/core --depth=0
npm run build
./workshop/scripts/check_deprecated_apis.sh

# 2. If v14, upgrade to v15
ng update @angular/core@15 @angular/cli@15 --force

# 3. Upgrade to v16
ng update @angular/core@16 @angular/cli@16 @angular/material@16 --force

# 4. Fix issues
npm run build 2>&1 | tee errors.txt
# Route errors to agents

# 5. Exit criteria
# - ng build passes
# - Node 18 configured
# - Red zone deps identified
```

### **Day 2: v16 → v17**
```bash
# 1. Upgrade
ng update @angular/core@17 @angular/cli@17 @angular/material@17 --force

# 2. Replace critical dependency
# ngx-perfect-scrollbar → native CSS or ngx-scrollbar

# 3. Fix RxJS
# toPromise() → lastValueFrom()

# 4. Exit criteria
# - ng build passes
# - ngx-perfect-scrollbar replaced
# - >70% tests passing
```

### **Day 3: v17 → v19**
```bash
# 1. Double upgrade
ng update @angular/core@18
ng update @angular/core@19

# 2. Upgrade AG Grid
npm install ag-grid-community@31 ag-grid-angular@31

# 3. Install Node 20
nvm install 20
nvm use 20

# 4. Update to provideHttpClient
# Replace HttpClientModule

# 5. Exit criteria
# - ng build passes with Node 20
# - AG Grid v31 working
# - >80% tests passing
```

### **Day 4: v19 → v20**
```bash
# 1. Final upgrade
ng update @angular/core@20 @angular/cli@20 @angular/material@20 --force

# 2. Fix template errors
# {{ in }} → {{ this.in }}

# 3. Production build
npm run build -- --configuration production

# 4. Deploy to staging
# (deployment commands)

# 5. Exit criteria
# - Production build passes
# - >90% tests passing
# - Deployed to staging
```

---

## 🚨 Emergency Procedures

### **Build Fails**
```bash
rm -rf node_modules .angular dist
npm install
npm run build
```

### **Git Not Clean**
```bash
git status
git stash  # or commit changes
```

### **Polyfills Error**
```bash
echo "// Polyfills" > src/polyfills.ts
# Update angular.json polyfills to "src/polyfills.ts"
```

### **Stuck on Dependency**
```bash
npm install --legacy-peer-deps
# Document in KNOWN_ISSUES.md
```

### **Clear All Caches**
```bash
rm -rf node_modules .angular dist .npm
npm cache clean --force
npm install
```

---

## 📈 Success Metrics

### **Exit Criteria by Day**

| Day | Build | Tests | Node | Deployment |
|-----|-------|-------|------|------------|
| 1 | ✅ Passes | Baseline | 18 | N/A |
| 2 | ✅ Passes | >70% | 18 | N/A |
| 3 | ✅ Passes | >80% | 20 | N/A |
| 4 | ✅ Production | >90% | 20 | ✅ Staging |

### **Tracking Commands**
```bash
# Build status
npm run build && echo "✅ PASS" || echo "❌ FAIL"

# Test pass rate
npm test 2>&1 | grep -E "\d+ passed"

# Version check
npm list @angular/core --depth=0
node --version

# Bundle size
./workshop/scripts/analyze_bundle.sh
```

---

## 🔍 Diagnostic Commands

### **Find Issues**
```bash
# Find MatLegacy
grep -r "MatLegacy" src/

# Find toPromise
grep -r "\.toPromise()" src/

# Find template issues
grep -r "=>" src/**/*.html

# Find deprecated APIs
./workshop/scripts/check_deprecated_apis.sh

# Find View Engine libraries
npm run build 2>&1 | grep "View Engine"
```

### **Check Configuration**
```bash
# Check polyfills
ls -la src/polyfills.ts
cat angular.json | grep polyfills

# Check tsconfig
cat tsconfig.json | grep strict

# Check package versions
npm list @angular/core @angular/cli @angular/material ag-grid-community
```

### **Verify State**
```bash
# Git status
git status

# Build status
npm run build

# Test status
npm test

# Dependency status
npm outdated
npm audit
```

---

## 📚 Resource Locations

### **Scripts**
```bash
WORKSHOP=/Users/siarheiskuratovich/dev/AI/migrations/angmig/workshop

$WORKSHOP/scripts/pre_migration_check.sh
$WORKSHOP/scripts/migration_status.sh
$WORKSHOP/scripts/check_deprecated_apis.sh
$WORKSHOP/scripts/migration_toolbox.sh
$WORKSHOP/scripts/verify_build.sh
$WORKSHOP/scripts/verify_dependencies.sh
```

### **Agent Prompts**
```bash
$WORKSHOP/agents/roles/build_fixer.md
$WORKSHOP/agents/roles/code_modernizer.md
$WORKSHOP/agents/roles/style_migrator.md
$WORKSHOP/agents/roles/logic_refactorer.md
$WORKSHOP/agents/roles/dependency_auditor.md
$WORKSHOP/agents/roles/infra_perf_optimizer.md
$WORKSHOP/agents/roles/unit_test_migrator.md
$WORKSHOP/agents/roles/e2e_test_migrator.md
```

### **Documentation**
```bash
$WORKSHOP/docs/guides/4-day-migration-plan.md
$WORKSHOP/docs/guides/issue-agent-mapping.md
$WORKSHOP/docs/patterns/migration-patterns.md
$WORKSHOP/docs/patterns/library-compatibility.md
```

---

## 🎯 Quick Decision Tree

```
Error encountered
├─ Build Error?
│  ├─ TS####: → BuildFixer
│  ├─ Polyfills: → BuildFixer (check v14 format)
│  ├─ Module not found: → BuildFixer (clear cache)
│  └─ Template parser: → CodeModernizer (extract to method)
│
├─ Material Error?
│  ├─ MatLegacy: → StyleMigrator (MUST fix before v17)
│  └─ MDC classes: → StyleMigrator (update CSS)
│
├─ Library Error?
│  ├─ AG Grid: → StyleMigrator (check API changes)
│  ├─ Highcharts: → DependencyAuditor (check compatibility)
│  └─ ngx-*: → DependencyAuditor (find replacement)
│
├─ Service/HTTP Error?
│  ├─ HttpClientModule: → LogicRefactorer (use provideHttpClient)
│  ├─ toPromise(): → LogicRefactorer (use lastValueFrom)
│  └─ Location.back(): → LogicRefactorer (use Router.navigate)
│
├─ Test Error?
│  ├─ Unit test: → UnitTestMigrator
│  └─ E2E test: → E2ETestMigrator
│
└─ Infrastructure Error?
   ├─ Node version: → InfraPerfOptimizer
   ├─ Docker: → InfraPerfOptimizer
   └─ CI/CD: → InfraPerfOptimizer
```

---

## ⚡ Pro Tips

1. **Always verify version first**: `npm list @angular/core --depth=0`
2. **Clear cache when stuck**: `rm -rf node_modules .angular dist && npm install`
3. **Fix in order**: Configuration → API → Types → Architecture
4. **Work in batches**: Fix 20-30 errors, verify build, repeat
5. **Pattern over memorization**: Recognize patterns, apply solutions
6. **Document as you go**: Update KNOWN_ISSUES.md with patterns
7. **Parallel work**: AQA can work independent of version upgrades
8. **Accept technical debt**: 70-90% tests passing is acceptable for 4-day migration
9. **Use scripts**: Don't manually check everything
10. **Emergency procedures**: Know how to recover quickly

---

## 📞 Quick Help

### **Stuck on Build?**
```bash
# Clear everything
rm -rf node_modules .angular dist
npm install
npm run build

# Still failing?
npm run build 2>&1 | tee errors.txt
# Copy errors.txt to BuildFixer agent
```

### **Stuck on Tests?**
```bash
# Acceptable pass rates:
# Day 1: Baseline (capture %)
# Day 2: >70%
# Day 3: >80%
# Day 4: >90%

# Focus on critical path tests
# Defer non-critical to Week 2
```

### **Stuck on Dependencies?**
```bash
# Check compatibility
./workshop/scripts/verify_dependencies.sh 20

# Use --legacy-peer-deps
npm install --legacy-peer-deps

# Document and move on
echo "Issue: [describe]" >> KNOWN_ISSUES.md
```

---

**See Full Documentation**:
- `WORKSHOP_INVENTORY.md` - Complete resource catalog
- `ACP_INTEGRATION_GUIDE.md` - Integration patterns and code examples
- `workshop/docs/guides/4-day-migration-plan.md` - Detailed day-by-day plan
- `workshop/docs/guides/issue-agent-mapping.md` - Comprehensive issue table

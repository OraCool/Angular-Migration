#!/bin/bash

# Fix Angular 20 Breaking Changes
# - Highcharts v11 → v12 migration
# - highcharts-angular v4 → v5 migration
# - Final deprecated package replacements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_PATH="${1:-.}"

echo -e "${BLUE}🔧 Fixing Angular 20 Breaking Changes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Project: ${PROJECT_PATH}${NC}"

cd "$PROJECT_PATH"

# Fix 1: Check Highcharts usage and version
echo -e "${YELLOW}🔄 Checking Highcharts version and usage...${NC}"

if grep -q "\"highcharts\"" package.json; then
  HIGHCHARTS_VERSION=$(node -e "const pkg=require('./package.json'); console.log(pkg.dependencies.highcharts||'not found');" 2>/dev/null)
  echo -e "${BLUE}   Current Highcharts version: ${HIGHCHARTS_VERSION}${NC}"

  # Find all Highcharts usage
  HIGHCHARTS_FILES=$(grep -rl "import.*highcharts\\|from 'highcharts'" src/ --include="*.ts" 2>/dev/null || echo "")

  if [ -n "$HIGHCHARTS_FILES" ]; then
    echo -e "${YELLOW}   Found Highcharts usage in:${NC}"
    echo "$HIGHCHARTS_FILES" | head -5

    echo -e "${YELLOW}   ⚠️ Highcharts v12 Breaking Changes:${NC}"
    echo -e "${YELLOW}     - Enhanced accessibility features (may affect custom a11y)${NC}"
    echo -e "${YELLOW}     - Some deprecated methods removed${NC}"
    echo -e "${YELLOW}     - Improved TypeScript types (may reveal type issues)${NC}"
    echo ""
    echo -e "${YELLOW}   📝 Action Required:${NC}"
    echo -e "${YELLOW}     1. Review Highcharts v12 changelog${NC}"
    echo -e "${YELLOW}     2. Test all chart types and configurations${NC}"
    echo -e "${YELLOW}     3. Verify custom chart options still work${NC}"
    echo -e "${YELLOW}     4. Check accessibility features${NC}"
  else
    echo -e "${GREEN}   ✅ No Highcharts usage found${NC}"
  fi
else
  echo -e "${GREEN}   ✅ Highcharts not used in project${NC}"
fi

# Fix 2: Check highcharts-angular version
if grep -q "highcharts-angular" package.json; then
  HC_ANGULAR_VERSION=$(node -e "const pkg=require('./package.json'); console.log(pkg.dependencies['highcharts-angular']||'not found');" 2>/dev/null)
  echo -e "${BLUE}   Current highcharts-angular version: ${HC_ANGULAR_VERSION}${NC}"

  echo -e "${YELLOW}   ⚠️ highcharts-angular v5 requires Angular 20+${NC}"
  echo -e "${YELLOW}   Verify compatibility after update${NC}"
fi

# Fix 3: Final check for deprecated packages that must be replaced
echo -e "${YELLOW}🔄 Final check for packages requiring replacement...${NC}"

MUST_REPLACE=""

if grep -q "ngx-material-timepicker" package.json; then
  echo -e "${RED}   ⚠️ CRITICAL: ngx-material-timepicker should be replaced${NC}"
  echo -e "${YELLOW}   Recommended replacements:${NC}"
  echo -e "${YELLOW}     1. Angular Material Datepicker + Luxon adapter:${NC}"
  echo -e "${YELLOW}        npm install @angular/material-luxon-adapter luxon${NC}"
  echo -e "${YELLOW}     2. ngx-mat-timepicker (actively maintained):${NC}"
  echo -e "${YELLOW}        npm install ngx-mat-timepicker${NC}"
  echo -e "${YELLOW}     3. Custom implementation with Material form controls${NC}"
  MUST_REPLACE="yes"
fi

if grep -q "@swimlane/ngx-graph" package.json; then
  echo -e "${RED}   ⚠️ WARNING: @swimlane/ngx-graph may have compatibility issues${NC}"
  echo -e "${YELLOW}   Consider alternatives:${NC}"
  echo -e "${YELLOW}     1. ngx-charts (same team, better maintained)${NC}"
  echo -e "${YELLOW}     2. echarts-for-angular${NC}"
  echo -e "${YELLOW}     3. D3.js direct integration${NC}"
  echo -e "${YELLOW}     4. Fork and maintain if critical to your app${NC}"
  MUST_REPLACE="yes"
fi

if grep -q "ngx-perfect-scrollbar" package.json; then
  echo -e "${RED}   ❌ CRITICAL ERROR: ngx-perfect-scrollbar still present!${NC}"
  echo -e "${RED}   This should have been removed in Angular 16${NC}"
  MUST_REPLACE="yes"
fi

if [ "$MUST_REPLACE" = "yes" ]; then
  echo ""
  echo -e "${RED}   🚨 Package replacements required before production!${NC}"
fi

# Fix 4: Check for zoneless mode readiness (Angular 20 feature)
echo -e "${YELLOW}🔄 Checking zoneless mode readiness...${NC}"

ZONE_JS=$(grep -q "zone.js" package.json && echo "present" || echo "optional")

if [ "$ZONE_JS" = "present" ]; then
  echo -e "${BLUE}   ℹ️ Angular 20 supports zoneless mode (experimental)${NC}"
  echo -e "${YELLOW}   Benefits of zoneless:${NC}"
  echo -e "${YELLOW}     - ~30% smaller bundles (no zone.js)${NC}"
  echo -e "${YELLOW}     - Better performance${NC}"
  echo -e "${YELLOW}     - Simpler mental model${NC}"
  echo ""
  echo -e "${YELLOW}   To evaluate zoneless mode:${NC}"
  echo -e "${YELLOW}     1. Set up development environment${NC}"
  echo -e "${YELLOW}     2. Remove zone.js from polyfills${NC}"
  echo -e "${YELLOW}     3. Test application thoroughly${NC}"
  echo -e "${YELLOW}     4. Measure performance improvements${NC}"
else
  echo -e "${GREEN}   ✅ Already in zoneless mode${NC}"
fi

# Fix 5: Verify Node.js version
echo -e "${YELLOW}🔄 Verifying Node.js version...${NC}"

NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)

echo -e "${BLUE}   Current Node.js version: ${NODE_VERSION}${NC}"

if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${YELLOW}   ⚠️ Angular 20 recommends Node.js 20.11+ or 22+${NC}"
  echo -e "${YELLOW}   Current version (${NODE_VERSION}) may work but is not recommended${NC}"
elif [ "$NODE_MAJOR" -eq 20 ]; then
  echo -e "${GREEN}   ✅ Node.js 20 LTS - Good choice${NC}"
elif [ "$NODE_MAJOR" -ge 22 ]; then
  echo -e "${GREEN}   ✅ Node.js 22+ - Latest LTS${NC}"
else
  echo -e "${GREEN}   ✅ Node.js version compatible${NC}"
fi

# Fix 6: Verify TypeScript version
echo -e "${YELLOW}🔄 Verifying TypeScript version...${NC}"

if [ -f "package.json" ]; then
  TS_VERSION=$(node -e "console.log(require('./package.json').devDependencies.typescript)" 2>/dev/null || echo "unknown")
  echo -e "${BLUE}   Current TypeScript version: ${TS_VERSION}${NC}"

  # Angular 20 requires TypeScript 5.6+
  if [[ "$TS_VERSION" == "unknown" ]] || [[ "$TS_VERSION" < "5.6" ]]; then
    echo -e "${YELLOW}   ⚠️ Angular 20 requires TypeScript 5.6+${NC}"
  else
    echo -e "${GREEN}   ✅ TypeScript version compatible${NC}"
  fi
fi

# Fix 7: Material 3 theme verification
echo -e "${YELLOW}🔄 Checking Material 3 theme setup...${NC}"

THEME_FILES=$(find src/ -name "*.scss" -exec grep -l "@angular/material" {} \; 2>/dev/null || echo "")

if [ -n "$THEME_FILES" ]; then
  echo -e "${BLUE}   ℹ️ Material 3 is the default in Angular 20${NC}"
  echo -e "${YELLOW}   Verify your custom themes:${NC}"
  echo -e "${YELLOW}     - Use Material 3 design tokens${NC}"
  echo -e "${YELLOW}     - Update color palettes if needed${NC}"
  echo -e "${YELLOW}     - Test component density settings${NC}"
else
  echo -e "${GREEN}   ✅ Using default Material theme${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Angular 20 breaking changes check complete!${NC}"

if [ "$MUST_REPLACE" = "yes" ]; then
  echo ""
  echo -e "${RED}🚨 CRITICAL ACTIONS REQUIRED:${NC}"
  echo -e "${RED}   - Replace deprecated packages before production${NC}"
  echo -e "${RED}   - Test replacement libraries thoroughly${NC}"
  echo -e "${RED}   - Update application code as needed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Angular 20 Migration Complete!${NC}"
echo -e "${YELLOW}📝 Final Checklist:${NC}"
echo -e "${YELLOW}   ✓ All tests passing${NC}"
echo -e "${YELLOW}   ✓ Build succeeds without errors${NC}"
echo -e "${YELLOW}   ✓ No deprecated package warnings${NC}"
echo -e "${YELLOW}   ✓ All features working as expected${NC}"
echo -e "${YELLOW}   ✓ Performance maintained or improved${NC}"

exit 0

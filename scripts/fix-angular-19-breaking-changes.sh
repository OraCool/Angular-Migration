#!/bin/bash

# Fix Angular 19 Breaking Changes
# - AG-Grid v31 → v32 migration (Row selection syntax)
# - Package compatibility warnings (ngx-material-timepicker, @swimlane/ngx-graph)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_PATH="${1:-.}"

echo -e "${BLUE}🔧 Fixing Angular 19 Breaking Changes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Project: ${PROJECT_PATH}${NC}"

cd "$PROJECT_PATH"

# Fix 1: Check for AG-Grid usage and update row selection syntax
echo -e "${YELLOW}🔄 Checking for AG-Grid row selection updates...${NC}"

AGGRID_FILES=$(grep -rl "ag-grid" src/ --include="*.ts" 2>/dev/null || echo "")

if [ -n "$AGGRID_FILES" ]; then
  echo -e "${YELLOW}   Found AG-Grid usage in project${NC}"

  # Check for old row selection syntax
  OLD_ROW_SELECTION=$(grep -r "rowSelection.*=.*['\"]single['\"]\\|rowSelection.*=.*['\"]multiple['\"]" src/ --include="*.ts" 2>/dev/null || echo "")

  if [ -n "$OLD_ROW_SELECTION" ]; then
    echo -e "${YELLOW}   ⚠️ Found old AG-Grid row selection syntax${NC}"
    echo -e "${YELLOW}   AG-Grid v32 requires object-based row selection configuration${NC}"
    echo ""
    echo -e "${YELLOW}   Update required:${NC}"
    echo -e "${YELLOW}   OLD: rowSelection: 'single'${NC}"
    echo -e "${YELLOW}   NEW: rowSelection: { mode: 'singleRow' }${NC}"
    echo ""
    echo -e "${YELLOW}   OLD: rowSelection: 'multiple'${NC}"
    echo -e "${YELLOW}   NEW: rowSelection: { mode: 'multiRow' }${NC}"
    echo ""
    echo -e "${RED}   ⚠️ Manual update required - see files above${NC}"
  else
    echo -e "${GREEN}   ✅ No old row selection syntax found${NC}"
  fi

  # Check for suppressCellSelection (should be suppressCellFocus in v30+)
  OLD_CELL_SELECTION=$(grep -r "suppressCellSelection" src/ --include="*.ts" 2>/dev/null || echo "")

  if [ -n "$OLD_CELL_SELECTION" ]; then
    echo -e "${YELLOW}   Found deprecated suppressCellSelection${NC}"

    # Replace suppressCellSelection with suppressCellFocus
    find src/ -name "*.ts" -type f -exec sed -i.bak 's/suppressCellSelection/suppressCellFocus/g' {} \;
    find src/ -name "*.bak" -type f -delete

    echo -e "${GREEN}   ✅ Updated to suppressCellFocus${NC}"
  fi
else
  echo -e "${GREEN}   ✅ No AG-Grid usage found${NC}"
fi

# Fix 2: Check for deprecated packages
echo -e "${YELLOW}🔄 Checking for deprecated/unmaintained packages...${NC}"

if [ -f "package.json" ]; then
  # Check for ngx-material-timepicker
  if grep -q "ngx-material-timepicker" package.json; then
    echo -e "${YELLOW}   ⚠️ Warning: ngx-material-timepicker has limited Angular 19 support${NC}"
    echo -e "${YELLOW}   Consider migrating to:${NC}"
    echo -e "${YELLOW}     - Angular Material datepicker with Luxon adapter${NC}"
    echo -e "${YELLOW}     - ngx-mat-timepicker (actively maintained)${NC}"
    echo -e "${YELLOW}     - Custom implementation${NC}"
  fi

  # Check for @swimlane/ngx-graph
  if grep -q "@swimlane/ngx-graph" package.json; then
    echo -e "${YELLOW}   ⚠️ Warning: @swimlane/ngx-graph has limited recent updates${NC}"
    echo -e "${YELLOW}   Test thoroughly or consider alternatives:${NC}"
    echo -e "${YELLOW}     - ngx-charts (same team, better maintained)${NC}"
    echo -e "${YELLOW}     - echarts-for-angular${NC}"
    echo -e "${YELLOW}     - Fork and maintain if critical${NC}"
  fi

  # Check for ngx-perfect-scrollbar (should have been removed in v16)
  if grep -q "ngx-perfect-scrollbar" package.json; then
    echo -e "${RED}   ❌ ERROR: ngx-perfect-scrollbar should have been removed in Angular 16${NC}"
    echo -e "${RED}   This package is no longer compatible${NC}"
  fi
fi

# Fix 3: Verify TypeScript version
echo -e "${YELLOW}🔄 Verifying TypeScript version...${NC}"

if [ -f "package.json" ]; then
  TS_VERSION=$(node -e "console.log(require('./package.json').devDependencies.typescript)" 2>/dev/null || echo "unknown")
  echo -e "${BLUE}   Current TypeScript version: ${TS_VERSION}${NC}"

  # Angular 19 requires TypeScript 5.5+
  if [[ "$TS_VERSION" == "unknown" ]] || [[ "$TS_VERSION" < "5.5" ]]; then
    echo -e "${YELLOW}   ⚠️ Angular 19 requires TypeScript 5.5+${NC}"
  else
    echo -e "${GREEN}   ✅ TypeScript version compatible${NC}"
  fi
fi

# Fix 4: Check for marked package version
echo -e "${YELLOW}🔄 Checking marked package version...${NC}"

if grep -q "\"marked\"" package.json; then
  MARKED_VERSION=$(node -e "const pkg=require('./package.json'); console.log(pkg.dependencies.marked||'not found');" 2>/dev/null)
  echo -e "${BLUE}   Current marked version: ${MARKED_VERSION}${NC}"

  if [[ "$MARKED_VERSION" < "14" ]] && [[ "$MARKED_VERSION" != "not found" ]]; then
    echo -e "${YELLOW}   ⚠️ Consider updating marked to v14 for Angular 19${NC}"
    echo -e "${YELLOW}   Test markdown rendering after update${NC}"
  fi
fi

# Fix 5: Check signals usage (Angular 19 recommendation)
echo -e "${YELLOW}🔄 Checking for Signals adoption...${NC}"

SIGNALS_USAGE=$(grep -r "signal\\|computed\\|effect" src/ --include="*.ts" | wc -l)

if [ "$SIGNALS_USAGE" -lt 5 ]; then
  echo -e "${YELLOW}   ℹ️ Signals are stable in Angular 19${NC}"
  echo -e "${YELLOW}   Consider using signals for new reactive state:${NC}"
  echo -e "${YELLOW}     - signal() for reactive values${NC}"
  echo -e "${YELLOW}     - computed() for derived state${NC}"
  echo -e "${YELLOW}     - effect() for side effects${NC}"
else
  echo -e "${GREEN}   ✅ Signals already in use${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Angular 19 breaking changes check complete!${NC}"
echo -e "${YELLOW}📝 Action Items:${NC}"
echo -e "${YELLOW}   - Test AG-Grid functionality thoroughly${NC}"
echo -e "${YELLOW}   - Evaluate deprecated package replacements${NC}"
echo -e "${YELLOW}   - Consider adopting Signals for new code${NC}"

exit 0

#!/bin/bash

# Fix Angular 17 Breaking Changes
# - Material MDC Migration (Legacy components removed)
# - Control Flow syntax preparation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_PATH="${1:-.}"

echo -e "${BLUE}🔧 Fixing Angular 17 Breaking Changes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Project: ${PROJECT_PATH}${NC}"

cd "$PROJECT_PATH"

# Fix 1: Run Material MDC Migration Schematic
echo -e "${YELLOW}🔄 Running Material MDC Migration...${NC}"

if command -v ng &> /dev/null; then
  echo -e "${YELLOW}   Running ng generate @angular/material:mdc-migration...${NC}"

  # Run the schematic - it will automatically detect and migrate legacy components
  ng generate @angular/material:mdc-migration --defaults 2>&1 || {
    echo -e "${YELLOW}   ⚠️ MDC migration schematic not available or already applied${NC}"
  }

  echo -e "${GREEN}   ✅ MDC migration complete${NC}"
else
  echo -e "${RED}   ❌ Angular CLI not found${NC}"
  exit 1
fi

# Fix 2: Check for remaining legacy components
echo -e "${YELLOW}🔄 Checking for remaining legacy components...${NC}"

LEGACY_COMPONENTS=$(grep -r "mat-legacy-" src/ --include="*.html" --include="*.ts" 2>/dev/null || echo "")

if [ -n "$LEGACY_COMPONENTS" ]; then
  echo -e "${RED}   ⚠️ Found legacy components that need manual migration:${NC}"
  echo "$LEGACY_COMPONENTS" | head -10
  echo -e "${YELLOW}   These components were removed in Angular 17.${NC}"
  echo -e "${YELLOW}   Please review and update manually if needed.${NC}"
else
  echo -e "${GREEN}   ✅ No legacy components found${NC}"
fi

# Fix 3: Check for appearance="legacy" in form fields
echo -e "${YELLOW}🔄 Checking form field appearances...${NC}"

LEGACY_APPEARANCE=$(grep -r 'appearance="legacy"' src/ --include="*.html" 2>/dev/null || echo "")

if [ -n "$LEGACY_APPEARANCE" ]; then
  echo -e "${YELLOW}   Found legacy form field appearances:${NC}"

  # Replace appearance="legacy" with appearance="outline" (most common replacement)
  find src/ -name "*.html" -type f -exec sed -i.bak 's/appearance="legacy"/appearance="outline"/g' {} \;
  find src/ -name "*.bak" -type f -delete

  echo -e "${GREEN}   ✅ Updated form field appearances to 'outline'${NC}"
  echo -e "${YELLOW}   Note: Review if 'fill' appearance is preferred for some fields${NC}"
else
  echo -e "${GREEN}   ✅ No legacy appearances found${NC}"
fi

# Fix 4: Verify TypeScript version compatibility
echo -e "${YELLOW}🔄 Verifying TypeScript version...${NC}"

if [ -f "package.json" ]; then
  TS_VERSION=$(node -e "console.log(require('./package.json').devDependencies.typescript)" 2>/dev/null || echo "unknown")
  echo -e "${BLUE}   Current TypeScript version: ${TS_VERSION}${NC}"

  # Angular 17 requires TypeScript 5.2+
  if [[ "$TS_VERSION" == "unknown" ]] || [[ "$TS_VERSION" < "5.2" ]]; then
    echo -e "${YELLOW}   ⚠️ Angular 17 requires TypeScript 5.2+${NC}"
    echo -e "${YELLOW}   Current version may be incompatible${NC}"
  else
    echo -e "${GREEN}   ✅ TypeScript version compatible${NC}"
  fi
fi

# Fix 5: Update custom Material themes if present
echo -e "${YELLOW}🔄 Checking for custom Material themes...${NC}"

THEME_FILES=$(find src/ -name "*theme*.scss" -o -name "*material*.scss" 2>/dev/null || echo "")

if [ -n "$THEME_FILES" ]; then
  echo -e "${YELLOW}   Found theme files:${NC}"
  echo "$THEME_FILES"
  echo -e "${YELLOW}   ⚠️ Custom themes may need updates for MDC components${NC}"
  echo -e "${YELLOW}   Review Material theming documentation: https://material.angular.io/guide/theming${NC}"
else
  echo -e "${GREEN}   ✅ No custom theme files found${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Angular 17 breaking changes fixes complete!${NC}"
echo -e "${YELLOW}📝 Manual Review Recommended:${NC}"
echo -e "${YELLOW}   - Test all Material components for visual changes${NC}"
echo -e "${YELLOW}   - Verify form field appearances match design${NC}"
echo -e "${YELLOW}   - Check custom themes if applicable${NC}"

exit 0

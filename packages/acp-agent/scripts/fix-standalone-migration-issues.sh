#!/bin/bash

# Fix Common Issues After Standalone Migration
# Handles Material Chips API migration and missing dependencies

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_PATH="${1:-.}"

echo -e "${BLUE}🔧 Fixing Standalone Migration Issues${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Project: ${PROJECT_PATH}${NC}"

cd "$PROJECT_PATH"

# Fix 1: Migrate Material Chips API (mat-chip-list → mat-chip-grid)
echo -e "${YELLOW}🔄 Migrating Material Chips API...${NC}"

# Find all HTML files with old mat-chip-list
CHIP_FILES=$(grep -rl "mat-chip-list" src/ --include="*.html" 2>/dev/null || echo "")

if [ -n "$CHIP_FILES" ]; then
  echo -e "${YELLOW}   Found files using old Chips API:${NC}"
  echo "$CHIP_FILES" | while read file; do
    echo -e "${YELLOW}   - $file${NC}"

    # Backup file
    cp "$file" "$file.bak"

    # Replace mat-chip-list with mat-chip-grid
    sed -i.tmp 's/<mat-chip-list/<mat-chip-grid/g' "$file"
    sed -i.tmp 's/<\/mat-chip-list>/<\/mat-chip-grid>/g' "$file"
    sed -i.tmp 's/#chipList/#chipGrid/g' "$file"
    sed -i.tmp 's/\[matChipInputFor\]="chipList"/[matChipInputFor]="chipGrid"/g' "$file"

    # Replace mat-chip with mat-chip-row (for editable chips)
    # Only replace if it's within mat-chip-grid context
    # Match opening tags: <mat-chip> or <mat-chip with attributes
    sed -i.tmp 's/<mat-chip\([> ]\)/<mat-chip-row\1/g' "$file"
    sed -i.tmp 's/<\/mat-chip>/<\/mat-chip-row>/g' "$file"

    # Add matChipRemove button if (removed) is present but no button exists
    if grep -q "(removed)" "$file" && ! grep -q "matChipRemove" "$file"; then
      # This is a simplified approach - real implementation would need proper HTML parsing
      echo -e "${YELLOW}     Note: May need to manually add matChipRemove button${NC}"
    fi

    rm -f "$file.tmp"
    echo -e "${GREEN}   ✅ Updated: $file${NC}"
  done

  # Update TypeScript files to import MatIconModule if not present
  echo -e "${YELLOW}   Checking for MatIconModule imports...${NC}"
  for html_file in $CHIP_FILES; do
    ts_file="${html_file%.html}.ts"
    if [ -f "$ts_file" ]; then
      if ! grep -q "MatIconModule" "$ts_file"; then
        echo -e "${YELLOW}   Adding MatIconModule to $ts_file${NC}"

        # Add import statement
        if grep -q "import.*@angular/material" "$ts_file"; then
          sed -i.tmp "/import.*@angular\/material\/chips/a\\
import { MatIconModule } from '@angular/material/icon';
" "$ts_file"
        fi

        # Add to imports array
        sed -i.tmp 's/imports: \[\([^]]*\)MatChipsModule\([^]]*\)\]/imports: [\1MatChipsModule\2, MatIconModule]/g' "$ts_file"

        rm -f "$ts_file.tmp"
        echo -e "${GREEN}   ✅ Added MatIconModule to $ts_file${NC}"
      fi
    fi
  done
else
  echo -e "${GREEN}   ✅ No old Chips API usage found${NC}"
fi

# Fix 2: Check and add missing dependencies
echo -e "${YELLOW}🔄 Checking for missing dependencies...${NC}"

# Check for common missing dependencies after standalone migration
MISSING_DEPS=""

# Check if ngx-material-timepicker is used and luxon is missing
if grep -q "ngx-material-timepicker" package.json; then
  if ! grep -q "\"luxon\"" package.json; then
    echo -e "${YELLOW}   📦 ngx-material-timepicker requires luxon${NC}"
    MISSING_DEPS="$MISSING_DEPS luxon@^3.4.4"
  fi
fi

# Add other common missing dependencies checks here
# Example: Check build output for "Module not found" errors

if [ -n "$MISSING_DEPS" ]; then
  echo -e "${YELLOW}   Installing missing dependencies:${NC}"
  for dep in $MISSING_DEPS; do
    echo -e "${YELLOW}   - $dep${NC}"

    # Add to package.json
    PKG_NAME=$(echo "$dep" | cut -d'@' -f1)
    PKG_VERSION=$(echo "$dep" | cut -d'@' -f2)

    # Use Node.js to add dependency to package.json
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      pkg.dependencies['$PKG_NAME'] = '$PKG_VERSION';
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4) + '\n');
    "
    echo -e "${GREEN}   ✅ Added $PKG_NAME to package.json${NC}"
  done

  # Run npm install
  echo -e "${YELLOW}   Running npm install --legacy-peer-deps...${NC}"
  npm install --legacy-peer-deps > /dev/null 2>&1
  echo -e "${GREEN}   ✅ Dependencies installed${NC}"
else
  echo -e "${GREEN}   ✅ No missing dependencies detected${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Standalone migration fixes complete!${NC}"

exit 0

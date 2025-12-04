#!/bin/bash

###########################################
# Angular 15 Breaking Changes Fixes
###########################################
# Automatically fixes common breaking changes introduced in Angular 15
# Run this after upgrading to Angular 15 and running ng update
#
# Key Changes in Angular 15:
# - Material Chips API redesign (mat-chip-list → mat-chip-listbox)
# - Removal of legacy View Engine compiler
# - Optional Standalone Components API
# - RxJS 7.5+ interop changes
# - MatLegacy* components deprecated
###########################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Angular 15 Breaking Changes Fixes${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get project root (script is in packages/acp-agent/scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-$PWD}"

if [ ! -f "$PROJECT_ROOT/angular.json" ]; then
    echo -e "${RED}Error: Not an Angular project. angular.json not found in $PROJECT_ROOT${NC}"
    exit 1
fi

echo -e "${GREEN}Project root: $PROJECT_ROOT${NC}"
echo ""

###########################################
# 1. Fix Material Chips API (mat-chip-list → mat-chip-listbox)
###########################################
echo -e "${YELLOW}[1/5] Fixing Material Chips API...${NC}"

# Find all HTML files with mat-chip-list
CHIP_LIST_FILES=$(find "$PROJECT_ROOT/src" -type f -name "*.html" -exec grep -l "mat-chip-list" {} \; 2>/dev/null || true)

if [ -n "$CHIP_LIST_FILES" ]; then
    echo "Found mat-chip-list in the following files:"
    echo "$CHIP_LIST_FILES"
    echo ""
    
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            echo "  Updating: $file"
            # Replace mat-chip-list with mat-chip-listbox
            sed -i.bak 's/<mat-chip-list/<mat-chip-listbox/g' "$file"
            sed -i.bak 's/<\/mat-chip-list>/<\/mat-chip-listbox>/g' "$file"
            sed -i.bak 's/mat-chip-list/mat-chip-listbox/g' "$file"
            
            # Replace mat-chip with mat-chip-option (for selectable chips)
            sed -i.bak 's/<mat-chip /<mat-chip-option /g' "$file"
            sed -i.bak 's/<\/mat-chip>/<\/mat-chip-option>/g' "$file"
            
            # Remove backup files
            rm -f "${file}.bak"
        fi
    done <<< "$CHIP_LIST_FILES"
    
    echo -e "${GREEN}✓ Material Chips API updated${NC}"
else
    echo -e "${BLUE}ℹ No mat-chip-list usage found${NC}"
fi
echo ""

###########################################
# 2. Update TypeScript files using chips
###########################################
echo -e "${YELLOW}[2/5] Updating TypeScript chip references...${NC}"

# Find TypeScript files referencing MatChipList
CHIP_TS_FILES=$(find "$PROJECT_ROOT/src" -type f -name "*.ts" -exec grep -l "MatChipList" {} \; 2>/dev/null || true)

if [ -n "$CHIP_TS_FILES" ]; then
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            echo "  Updating: $file"
            # Replace MatChipList imports
            sed -i.bak 's/MatChipList/MatChipListbox/g' "$file"
            sed -i.bak 's/MatChip,/MatChipOption,/g' "$file"
            sed -i.bak 's/MatChip$/MatChipOption/g' "$file"
            
            # Update import paths if using legacy
            sed -i.bak "s/@angular\/material\/chips'/@angular\/material\/chips'/g" "$file"
            
            rm -f "${file}.bak"
        fi
    done <<< "$CHIP_TS_FILES"
    
    echo -e "${GREEN}✓ TypeScript chip references updated${NC}"
else
    echo -e "${BLUE}ℹ No MatChipList references found in TypeScript${NC}"
fi
echo ""

###########################################
# 3. Fix Polyfills Configuration
###########################################
echo -e "${YELLOW}[3/5] Checking polyfills configuration...${NC}"

POLYFILLS_FILE="$PROJECT_ROOT/src/polyfills.ts"

if [ -f "$POLYFILLS_FILE" ]; then
    # Angular 15 requires zone.js to be imported differently
    if grep -q "import 'zone.js/dist/zone';" "$POLYFILLS_FILE" 2>/dev/null; then
        echo "  Updating zone.js import..."
        sed -i.bak "s|import 'zone.js/dist/zone';|import 'zone.js';|g" "$POLYFILLS_FILE"
        rm -f "${POLYFILLS_FILE}.bak"
        echo -e "${GREEN}✓ Polyfills updated${NC}"
    else
        echo -e "${BLUE}ℹ Polyfills already using correct zone.js import${NC}"
    fi
else
    echo -e "${BLUE}ℹ No polyfills.ts file found (might be using angular.json configuration)${NC}"
fi
echo ""

###########################################
# 4. Fix Test Spec Files (mat-chip-list in tests)
###########################################
echo -e "${YELLOW}[4/5] Updating test files...${NC}"

SPEC_FILES=$(find "$PROJECT_ROOT/src" -type f -name "*.spec.ts" -exec grep -l "MatChipList" {} \; 2>/dev/null || true)

if [ -n "$SPEC_FILES" ]; then
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            echo "  Updating: $file"
            sed -i.bak 's/MatChipList/MatChipListbox/g' "$file"
            sed -i.bak 's/MatChip,/MatChipOption,/g' "$file"
            rm -f "${file}.bak"
        fi
    done <<< "$SPEC_FILES"
    
    echo -e "${GREEN}✓ Test files updated${NC}"
else
    echo -e "${BLUE}ℹ No MatChipList in test files${NC}"
fi
echo ""

###########################################
# 5. Update Module Imports (if using NgModules)
###########################################
echo -e "${YELLOW}[5/5] Checking module imports...${NC}"

MODULE_FILES=$(find "$PROJECT_ROOT/src" -type f -name "*.module.ts" -exec grep -l "MatChipsModule" {} \; 2>/dev/null || true)

if [ -n "$MODULE_FILES" ]; then
    echo "Found MatChipsModule imports:"
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            echo "  Checking: $file"
            # MatChipsModule is still correct, but ensure it's imported from the right path
            if ! grep -q "@angular/material/chips" "$file"; then
                echo "  ⚠ Warning: $file imports MatChipsModule but might be missing the import"
            fi
        fi
    done <<< "$MODULE_FILES"
    
    echo -e "${GREEN}✓ Module imports checked${NC}"
else
    echo -e "${BLUE}ℹ No NgModule files with MatChipsModule found (might be using standalone components)${NC}"
fi
echo ""

###########################################
# Summary
###########################################
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Angular 15 Breaking Changes Applied!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Summary of changes:${NC}"
echo "  • Material Chips API updated (mat-chip-list → mat-chip-listbox)"
echo "  • TypeScript chip references updated (MatChipList → MatChipListbox)"
echo "  • Polyfills configuration checked"
echo "  • Test files updated"
echo "  • Module imports verified"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Run 'npm run build' to verify the build succeeds"
echo "  2. Run 'npm test' to ensure tests pass"
echo "  3. Manually review any remaining deprecation warnings"
echo ""
echo -e "${BLUE}For more Angular 15 changes, see:${NC}"
echo "  https://update.angular.io/?v=14.0-15.0"
echo ""

exit 0

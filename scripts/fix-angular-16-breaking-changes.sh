#!/bin/bash

# Fix Angular 16 Breaking Changes Script
# Fixes common breaking changes when migrating to Angular 16

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
PROJECT_PATH="${1:-$(pwd)}"

echo -e "${BLUE}🔧 Angular 16 Breaking Changes Fixer${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Project Path: ${PROJECT_PATH}${NC}"

# Change to project directory
cd "$PROJECT_PATH"

# 1. Fix Angular Material Chips API
echo -e "${GREEN}📝 Fixing Angular Material Chips API...${NC}"

# Use Node.js for more reliable replacement across all files
node -e "
const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace HTML
  if (filePath.endsWith('.html')) {
    if (content.includes('mat-chip-list')) {
      content = content.replace(/<mat-chip-list/g, '<mat-chip-set');
      content = content.replace(/<\/mat-chip-list>/g, '</mat-chip-set>');
      content = content.replace(/<mat-chip\s/g, '<mat-chip-option ');
      content = content.replace(/<\/mat-chip>/g, '</mat-chip-option>');
      modified = true;
    }
  }

  // Replace SCSS/CSS
  if (filePath.endsWith('.scss') || filePath.endsWith('.css')) {
    if (content.includes('mat-chip-list')) {
      content = content.replace(/mat-chip-list/g, 'mat-chip-set');
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated: ' + filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.html') || file.endsWith('.scss') || file.endsWith('.css')) {
      replaceInFile(filePath);
    }
  });
}

walkDir('src');
console.log('✅ Material Chips API updated');
"

echo -e "${GREEN}✅ Material Chips API updated${NC}"

# 2. Remove PerfectScrollbar (deprecated and incompatible)
echo -e "${GREEN}📝 Removing ngx-perfect-scrollbar...${NC}"

# Remove from package.json
if grep -q "ngx-perfect-scrollbar" package.json; then
  # Use Node to remove the dependency
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    delete pkg.dependencies['ngx-perfect-scrollbar'];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4));
  "
  echo -e "${GREEN}✅ Removed ngx-perfect-scrollbar from package.json${NC}"
fi

# 3. Fix scrollable-container component to use native scrolling
echo -e "${GREEN}📝 Updating scrollable-container component...${NC}"

# Create fixed scrollable-container component
cat > src/app/shared/components/scrollable-container/scrollable-container.component.ts << 'EOF'
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scrollable-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scrollable-container.component.html',
  styleUrls: ['./scrollable-container.component.scss']
})
export class ScrollableContainerComponent {
  @Input() maxHeight: string = '400px';
}
EOF

# Create simple HTML template
cat > src/app/shared/components/scrollable-container/scrollable-container.component.html << 'EOF'
<div class="scrollable-container" [style.max-height]="maxHeight">
  <ng-content></ng-content>
</div>
EOF

# Create simple SCSS
cat > src/app/shared/components/scrollable-container/scrollable-container.component.scss << 'EOF'
.scrollable-container {
  overflow-y: auto;
  overflow-x: hidden;

  /* Custom scrollbar styles for webkit browsers */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
}
EOF

echo -e "${GREEN}✅ Updated scrollable-container to use native scrolling${NC}"

# 4. Remove PerfectScrollbarModule from shared.module.ts
echo -e "${GREEN}📝 Updating shared.module.ts...${NC}"

if [ -f "src/app/shared/shared.module.ts" ]; then
  # Remove PerfectScrollbarModule import line
  sed -i.bak '/import.*PerfectScrollbarModule/d' src/app/shared/shared.module.ts

  # Remove from imports array
  sed -i.bak '/PerfectScrollbarModule/d' src/app/shared/shared.module.ts

  # Clean up backup
  rm -f src/app/shared/shared.module.ts.bak

  echo -e "${GREEN}✅ Removed PerfectScrollbarModule from shared.module.ts${NC}"
fi

# 5. Reinstall dependencies
echo -e "${YELLOW}🧹 Removing node_modules and package-lock.json...${NC}"
rm -rf node_modules package-lock.json

echo -e "${GREEN}🔄 Running npm install...${NC}"
npm install --legacy-peer-deps

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Angular 16 breaking changes fixed!${NC}"
echo -e "${YELLOW}📋 Changes made:${NC}"
echo -e "  1. Updated Material Chips API (mat-chip-list → mat-chip-set)"
echo -e "  2. Removed deprecated ngx-perfect-scrollbar"
echo -e "  3. Replaced with native CSS scrolling"
echo -e "  4. Reinstalled dependencies"

echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo -e "  1. Test the application: npm run build"
echo -e "  2. Review scrollable areas for proper styling"
echo -e "  3. Run tests: npm test"

exit 0

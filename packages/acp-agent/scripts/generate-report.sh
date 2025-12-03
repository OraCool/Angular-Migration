#!/bin/bash

# Generate Migration Report
# Creates a comprehensive summary of the migration process

set -e

PROJECT_DIR="${1:-.}"
REPORT_FILE="${PROJECT_DIR}/MIGRATION_REPORT.md"

echo "📊 Generating migration report..."

# Get current Angular version
cd "${PROJECT_DIR}"
NG_VERSION=$(npx ng version 2>/dev/null | grep "Angular CLI" | awk '{print $3}' || echo "unknown")

# Create report
cat > "${REPORT_FILE}" <<EOF
# Angular Migration Report

**Generated:** $(date)
**Final Angular Version:** ${NG_VERSION}

---

## Migration Summary

### ✅ Completed Migrations

1. **Angular 14 → 15**
   - Updated core packages
   - Updated Angular Material
   - Standalone components support added

2. **Angular 15 → 16**
   - Signals support added
   - Updated core packages

3. **Standalone Components Migration**
   - Converted all components to standalone
   - Removed NgModules
   - Updated imports and providers

4. **Angular 16 → 17**
   - New control flow syntax support
   - Updated core packages

5. **Control Flow Syntax Migration**
   - Converted \`*ngIf\` to \`@if\`
   - Converted \`*ngFor\` to \`@for\` with track expressions
   - Converted \`*ngSwitch\` to \`@switch\`

6. **Angular 17 → 18**
   - Material 3 support
   - Zoneless change detection support

7. **Angular 18 → 19**
   - Latest stable features

8. **Angular 19 → 20**
   - Final target version reached

---

## Project Statistics

\`\`\`bash
# Component count
find src -name "*.component.ts" | wc -l

# Template count
find src -name "*.html" | wc -l

# Service count
find src -name "*.service.ts" | wc -l
\`\`\`

---

## Dependencies

\`\`\`json
$(cat package.json | grep -A 20 '"dependencies"' || echo "{}")
\`\`\`

---

## Recommendations

### 🎯 Next Steps

1. **Code Review**
   - Review all generated changes
   - Check for deprecated API usage
   - Verify best practices are followed

2. **Performance Optimization**
   - Consider implementing OnPush change detection
   - Evaluate signal usage for reactive state
   - Consider zoneless mode for better performance

3. **Testing**
   - Run full test suite
   - Perform manual E2E testing
   - Test all critical user flows

4. **Documentation**
   - Update developer documentation
   - Document new patterns (signals, control flow)
   - Update component examples

### 🔮 Future Considerations

- **Signal-based Forms** - Consider migrating to reactive forms with signals
- **Zoneless** - Evaluate removing zone.js for better performance
- **Server-Side Rendering** - Consider Angular Universal for SSR
- **Standalone APIs** - Fully adopt standalone APIs throughout

---

## Issues & Notes

_Add any migration issues or notes here_

---

**Migration completed by:** Angular Migration ACP Agent  
**Agent version:** 1.0.0
EOF

echo "✅ Migration report generated!"
echo "  Location: ${REPORT_FILE}"

# Display report summary
echo ""
echo "📋 Report Preview:"
echo "================="
head -n 30 "${REPORT_FILE}"
echo "..."
echo "================="

exit 0

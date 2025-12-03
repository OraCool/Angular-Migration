#!/bin/bash

# Verify Backup Script
# Checks that a backup was created successfully and contains expected files

set -e

# Get backup directory from environment or argument
BACKUP_DIR="${1:-${BACKUP_PATH}}"

if [ -z "${BACKUP_DIR}" ]; then
  echo "❌ Error: Backup directory not specified"
  exit 1
fi

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "❌ Error: Backup directory does not exist: ${BACKUP_DIR}"
  exit 1
fi

echo "🔍 Verifying backup..."
echo "  Location: ${BACKUP_DIR}"

# Check for essential files
REQUIRED_FILES=(
  "package.json"
  "tsconfig.json"
  "angular.json"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "${BACKUP_DIR}/${file}" ]; then
    MISSING_FILES+=("${file}")
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo "❌ Error: Backup is missing essential files:"
  for file in "${MISSING_FILES[@]}"; do
    echo "  - ${file}"
  done
  exit 1
fi

# Check for backup metadata
if [ -f "${BACKUP_DIR}/backup-info.json" ]; then
  echo "📋 Backup metadata:"
  cat "${BACKUP_DIR}/backup-info.json" | grep -E "(timestamp|created_by|backup_type)" || true
fi

# Count files
FILE_COUNT=$(find "${BACKUP_DIR}" -type f | wc -l)
DIR_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

echo "✅ Backup verification passed!"
echo "  Files: ${FILE_COUNT}"
echo "  Size: ${DIR_SIZE}"

exit 0

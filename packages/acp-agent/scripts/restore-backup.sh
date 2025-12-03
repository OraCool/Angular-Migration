#!/bin/bash

# Restore Script for Angular Migration
# Restores project from a backup

set -e  # Exit on error

# Get backup directory from first argument
BACKUP_DIR="${1}"
PROJECT_DIR="${2:-.}"

if [ -z "${BACKUP_DIR}" ]; then
  echo "❌ Error: Backup directory not specified"
  echo "Usage: $0 <backup-dir> [project-dir]"
  exit 1
fi

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "❌ Error: Backup directory does not exist: ${BACKUP_DIR}"
  exit 1
fi

# Check for backup metadata
if [ ! -f "${BACKUP_DIR}/backup-info.json" ]; then
  echo "⚠️  Warning: backup-info.json not found. This may not be a valid backup."
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "🔄 Restoring Angular project from backup..."
echo "  Backup: ${BACKUP_DIR}"
echo "  Target: ${PROJECT_DIR}"

# Create a safety backup of current state
if [ -d "${PROJECT_DIR}" ]; then
  SAFETY_BACKUP="${PROJECT_DIR}.before-restore-$(date +"%Y-%m-%d_%H-%M-%S")"
  echo "📦 Creating safety backup: ${SAFETY_BACKUP}"
  cp -R "${PROJECT_DIR}" "${SAFETY_BACKUP}"
fi

# Remove current project (except .git)
echo "🗑️  Removing current project files..."
find "${PROJECT_DIR}" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# Restore from backup
echo "📥 Restoring files from backup..."
rsync -av --progress "${BACKUP_DIR}/" "${PROJECT_DIR}/"

# Remove backup metadata file from restored project
rm -f "${PROJECT_DIR}/backup-info.json"

# Reinstall dependencies
if [ -f "${PROJECT_DIR}/package.json" ]; then
  echo "📦 Reinstalling dependencies..."
  cd "${PROJECT_DIR}"
  npm install
fi

echo "✅ Restore completed successfully!"
echo "  Restored to: ${PROJECT_DIR}"
if [ -n "${SAFETY_BACKUP}" ]; then
  echo "  Safety backup: ${SAFETY_BACKUP}"
fi

exit 0

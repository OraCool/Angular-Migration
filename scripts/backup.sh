#!/bin/bash

# Backup Script for Angular Migration
# Creates a timestamped backup of the entire project

set -e  # Exit on error

# Get project directory from first argument or use current directory
PROJECT_DIR="${1:-.}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="../angular-backup-${TIMESTAMP}"

echo "🔄 Creating backup of Angular project..."
echo "  Source: ${PROJECT_DIR}"
echo "  Destination: ${BACKUP_DIR}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Copy project files (excluding node_modules, dist, and other build artifacts)
echo "📦 Copying project files..."
rsync -av --progress \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.angular' \
  --exclude='.git' \
  --exclude='coverage' \
  --exclude='.vscode' \
  --exclude='.idea' \
  "${PROJECT_DIR}/" "${BACKUP_DIR}/"

# Create backup metadata file
cat > "${BACKUP_DIR}/backup-info.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "source": "${PROJECT_DIR}",
  "created_by": "angular-migration-agent",
  "backup_type": "full",
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Get directory size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

echo "✅ Backup created successfully!"
echo "  Location: ${BACKUP_DIR}"
echo "  Size: ${BACKUP_SIZE}"
echo "  Files backed up: $(find "${BACKUP_DIR}" -type f | wc -l)"

# Output backup path for the agent to capture
echo "BACKUP_PATH=${BACKUP_DIR}"

exit 0

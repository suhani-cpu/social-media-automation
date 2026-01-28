#!/bin/bash

# Database Backup Script
# Usage: ./backup-db.sh
# Can be scheduled with cron: 0 2 * * * /path/to/backup-db.sh

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/deployment/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
else
    log_error ".env file not found!"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Starting database backup..."
log_info "Timestamp: $TIMESTAMP"

# Check if container is running
if ! docker ps | grep -q social-media-postgres-prod; then
    log_error "PostgreSQL container is not running!"
    exit 1
fi

# Perform backup
docker exec social-media-postgres-prod pg_dump \
    -U ${POSTGRES_USER:-postgres} \
    -d ${POSTGRES_DB:-social_media} \
    --format=custom \
    --compress=9 \
    --verbose \
    > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Get file size
    FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup completed successfully ✓"
    log_info "Backup file: $BACKUP_FILE"
    log_info "File size: $FILESIZE"

    # Compress with gzip
    gzip -f "$BACKUP_FILE"
    log_info "Backup compressed: $BACKUP_FILE.gz ✓"

    # Upload to S3 (optional)
    if [ ! -z "$AWS_S3_BACKUP_BUCKET" ]; then
        log_info "Uploading to S3..."
        aws s3 cp "$BACKUP_FILE.gz" "s3://$AWS_S3_BACKUP_BUCKET/database-backups/db_backup_$TIMESTAMP.sql.gz"

        if [ $? -eq 0 ]; then
            log_info "Backup uploaded to S3 ✓"
        else
            log_warn "Failed to upload backup to S3"
        fi
    fi

    # Clean up old backups
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    log_info "Cleanup completed ✓"

    # List recent backups
    log_info "Recent backups:"
    ls -lh "$BACKUP_DIR" | grep "db_backup_" | tail -5

else
    log_error "Backup failed!"
    exit 1
fi

log_info "Backup process completed successfully!"

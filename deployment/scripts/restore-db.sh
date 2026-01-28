#!/bin/bash

# Database Restore Script
# Usage: ./restore-db.sh <backup_file>
# Example: ./restore-db.sh /path/to/db_backup_20260128_120000.sql.gz

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_FILE=$1

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

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    log_error "Usage: $0 <backup_file>"
    log_info "Available backups:"
    ls -lh "$PROJECT_ROOT/deployment/backups" | grep "db_backup_"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
else
    log_error ".env file not found!"
    exit 1
fi

# Warning
log_warn "=========================================="
log_warn "WARNING: This will restore the database!"
log_warn "All current data will be replaced!"
log_warn "=========================================="
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Restore cancelled"
    exit 0
fi

# Check if container is running
if ! docker ps | grep -q social-media-postgres-prod; then
    log_error "PostgreSQL container is not running!"
    exit 1
fi

log_info "Starting database restore..."
log_info "Backup file: $BACKUP_FILE"

# Decompress if gzipped
if [[ $BACKUP_FILE == *.gz ]]; then
    log_info "Decompressing backup..."
    DECOMPRESSED_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$DECOMPRESSED_FILE"
    RESTORE_FILE="$DECOMPRESSED_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Stop backend and worker to prevent connections
log_info "Stopping backend and worker..."
docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" stop backend worker

# Drop and recreate database
log_info "Recreating database..."
docker exec social-media-postgres-prod psql -U ${POSTGRES_USER:-postgres} -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-social_media};"
docker exec social-media-postgres-prod psql -U ${POSTGRES_USER:-postgres} -c "CREATE DATABASE ${POSTGRES_DB:-social_media};"

# Restore backup
log_info "Restoring backup..."
cat "$RESTORE_FILE" | docker exec -i social-media-postgres-prod pg_restore \
    -U ${POSTGRES_USER:-postgres} \
    -d ${POSTGRES_DB:-social_media} \
    --verbose

if [ $? -eq 0 ]; then
    log_info "Database restored successfully ✓"

    # Clean up decompressed file
    if [[ $BACKUP_FILE == *.gz ]]; then
        rm -f "$DECOMPRESSED_FILE"
    fi

    # Restart services
    log_info "Restarting backend and worker..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" start backend worker

    log_info "Restore completed successfully!"
else
    log_error "Restore failed!"
    log_info "Restarting services..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" start backend worker
    exit 1
fi

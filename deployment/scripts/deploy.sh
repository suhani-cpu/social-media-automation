#!/bin/bash

# Social Media Automation - Production Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/deployment/backups"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Social Media Automation Deployment${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to print messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    log_error ".env file not found!"
    log_info "Please create a .env file with required environment variables"
    exit 1
fi

# Load environment variables
source "$PROJECT_ROOT/.env"

# Validate required environment variables
required_vars=(
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_S3_BUCKET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

log_info "Environment variables validated ✓"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database if it exists
if docker ps | grep -q social-media-postgres-prod; then
    log_info "Creating database backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

    docker exec social-media-postgres-prod pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-social_media} > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        log_info "Database backed up to: $BACKUP_FILE ✓"
        gzip "$BACKUP_FILE"
        log_info "Backup compressed: $BACKUP_FILE.gz ✓"
    else
        log_warn "Database backup failed (container might not be running)"
    fi
fi

# Pull latest changes (if using git)
if [ -d "$PROJECT_ROOT/.git" ]; then
    log_info "Pulling latest changes from git..."
    cd "$PROJECT_ROOT"
    git pull
    log_info "Git pull completed ✓"
fi

# Build and start containers
log_info "Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

log_info "Starting containers..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 10

# Check service health
services=("postgres" "redis" "backend" "frontend" "nginx")
for service in "${services[@]}"; do
    container_name="social-media-${service}-prod"

    if docker ps | grep -q "$container_name"; then
        log_info "$service is running ✓"
    else
        log_error "$service failed to start!"
        log_info "Checking logs..."
        docker-compose -f "$COMPOSE_FILE" logs "$service" --tail=50
        exit 1
    fi
done

# Run database migrations
log_info "Running database migrations..."
docker exec social-media-backend-prod npx prisma migrate deploy
log_info "Migrations completed ✓"

# Clean up old images
log_info "Cleaning up old Docker images..."
docker image prune -f

# Show container status
log_info "Container status:"
docker-compose -f "$COMPOSE_FILE" ps

# Health checks
log_info "Performing health checks..."

# Check backend health
backend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$backend_health" -eq 200 ]; then
    log_info "Backend health check: OK ✓"
else
    log_error "Backend health check failed (HTTP $backend_health)"
fi

# Check frontend health
frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$frontend_health" -eq 200 ]; then
    log_info "Frontend health check: OK ✓"
else
    log_error "Frontend health check failed (HTTP $frontend_health)"
fi

# Show logs
log_info "Recent logs (last 20 lines):"
docker-compose -f "$COMPOSE_FILE" logs --tail=20

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Services:"
echo "  - Frontend: http://localhost:3001"
echo "  - Backend API: http://localhost:3000"
echo "  - Nginx: http://localhost (HTTP) / https://localhost (HTTPS)"
echo ""
echo "Management commands:"
echo "  - View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  - Stop services: docker-compose -f $COMPOSE_FILE down"
echo "  - Restart service: docker-compose -f $COMPOSE_FILE restart [service]"
echo ""

#!/bin/bash

# Health Check Script
# Usage: ./health-check.sh
# Can be scheduled with cron for monitoring

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "=========================================="
echo "Social Media Automation - Health Check"
echo "Timestamp: $(date)"
echo "=========================================="
echo ""

# Check Docker containers
echo "Container Status:"
services=("postgres" "redis" "backend" "worker" "frontend" "nginx")
all_healthy=true

for service in "${services[@]}"; do
    container_name="social-media-${service}-prod"

    if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        # Check health status
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")

        if [ "$health" == "healthy" ]; then
            log_info "$service: Running (Healthy)"
        elif [ "$health" == "no-healthcheck" ]; then
            log_info "$service: Running (No health check)"
        else
            log_error "$service: Running (Unhealthy: $health)"
            all_healthy=false
        fi
    else
        log_error "$service: Not running"
        all_healthy=false
    fi
done

echo ""

# Check HTTP endpoints
echo "HTTP Endpoint Health:"

# Backend API
backend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$backend_response" -eq 200 ]; then
    log_info "Backend API: Responding (HTTP 200)"
else
    log_error "Backend API: Not responding (HTTP $backend_response)"
    all_healthy=false
fi

# Frontend
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null || echo "000")
if [ "$frontend_response" -eq 200 ]; then
    log_info "Frontend: Responding (HTTP 200)"
else
    log_error "Frontend: Not responding (HTTP $frontend_response)"
    all_healthy=false
fi

# Nginx
nginx_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
if [ "$nginx_response" -eq 200 ]; then
    log_info "Nginx: Responding (HTTP 200)"
else
    log_error "Nginx: Not responding (HTTP $nginx_response)"
    all_healthy=false
fi

echo ""

# Check disk usage
echo "Resource Usage:"

# Disk space
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    log_info "Disk usage: ${disk_usage}%"
elif [ "$disk_usage" -lt 90 ]; then
    log_warn "Disk usage: ${disk_usage}% (Getting high)"
else
    log_error "Disk usage: ${disk_usage}% (Critical)"
    all_healthy=false
fi

# Memory usage
memory_usage=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
if [ "$memory_usage" -lt 80 ]; then
    log_info "Memory usage: ${memory_usage}%"
elif [ "$memory_usage" -lt 90 ]; then
    log_warn "Memory usage: ${memory_usage}% (Getting high)"
else
    log_error "Memory usage: ${memory_usage}% (Critical)"
fi

# Docker volumes
echo ""
echo "Docker Volumes:"
docker volume ls | grep social-media | while read -r line; do
    volume_name=$(echo "$line" | awk '{print $2}')
    volume_size=$(docker system df -v | grep "$volume_name" | awk '{print $3}' || echo "N/A")
    echo "  - $volume_name: $volume_size"
done

echo ""
echo "=========================================="
if [ "$all_healthy" = true ]; then
    log_info "All systems operational"
    exit 0
else
    log_error "Some systems are unhealthy"
    echo ""
    echo "Troubleshooting:"
    echo "  - View logs: docker-compose -f $COMPOSE_FILE logs -f [service]"
    echo "  - Restart service: docker-compose -f $COMPOSE_FILE restart [service]"
    echo "  - Full restart: docker-compose -f $COMPOSE_FILE down && docker-compose -f $COMPOSE_FILE up -d"
    exit 1
fi

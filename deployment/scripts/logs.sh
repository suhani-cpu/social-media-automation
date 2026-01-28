#!/bin/bash

# Log Viewing Script
# Usage: ./logs.sh [service] [options]
# Example: ./logs.sh backend --tail=100 --follow

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"

SERVICE=$1
shift # Remove first argument
OPTIONS="$@"

if [ -z "$SERVICE" ]; then
    echo "Available services:"
    echo "  - postgres"
    echo "  - redis"
    echo "  - backend"
    echo "  - worker"
    echo "  - frontend"
    echo "  - nginx"
    echo ""
    echo "Usage: $0 <service> [options]"
    echo ""
    echo "Options:"
    echo "  --tail=N       Show last N lines (default: all)"
    echo "  --follow       Follow log output"
    echo "  -f             Same as --follow"
    echo ""
    echo "Examples:"
    echo "  $0 backend"
    echo "  $0 backend --tail=100"
    echo "  $0 backend -f"
    echo "  $0 nginx --tail=50 --follow"
    exit 1
fi

echo "Viewing logs for: $SERVICE"
echo "Press Ctrl+C to exit"
echo "=========================================="
echo ""

docker-compose -f "$COMPOSE_FILE" logs $OPTIONS "$SERVICE"

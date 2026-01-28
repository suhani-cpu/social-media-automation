# Docker Setup Guide

This guide explains how to run the Social Media Automation platform using Docker.

## Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- At least 4GB RAM available for Docker
- 10GB free disk space

## Quick Start

### 1. Initial Setup

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd social-media-automation

# Copy environment file
cp .env.example .env

# Edit .env and configure your settings
nano .env  # or use your preferred editor
```

### 2. Start Development Environment

**Option A: Using Makefile (recommended)**
```bash
# Install dependencies and setup
make setup

# Start all services
make dev-up

# View logs
make dev-logs
```

**Option B: Using Docker Compose directly**
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### 3. Access Services

- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:3001 (when implemented)
- **Prisma Studio**: `make db-studio`

## Available Services

### Development Environment

The development setup includes:

1. **PostgreSQL** (port 5432)
   - Database for application data
   - Persistent volume: `postgres_data_dev`

2. **Redis** (port 6379)
   - Job queue and caching
   - Persistent volume: `redis_data_dev`

3. **Backend API** (port 3000)
   - Express.js REST API
   - Hot reload enabled
   - Includes FFmpeg for video processing

4. **Worker**
   - Background job processor
   - Handles video processing, publishing, analytics
   - Hot reload enabled

5. **Frontend** (port 3001) - Coming soon
   - Next.js application
   - Hot reload enabled

## Common Commands

### Using Makefile

```bash
# View all available commands
make help

# Start development
make dev-up

# Stop development
make dev-down

# View logs
make dev-logs

# Restart services
make dev-restart

# Rebuild containers
make dev-build

# Database migrations
make db-migrate

# Open Prisma Studio
make db-studio

# Show container status
make status
```

### Using Docker Compose Directly

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f backend

# Restart specific service
docker-compose -f docker-compose.dev.yml restart backend

# Rebuild containers
docker-compose -f docker-compose.dev.yml build --no-cache

# Remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.dev.yml down -v
```

## Development Workflow

### 1. Code Changes

The development setup mounts your source code, so changes are automatically reflected:

- **Backend**: Hot reload with `ts-node-dev`
- **Worker**: Hot reload with `ts-node-dev`
- **Frontend**: Hot reload with Next.js (when implemented)

### 2. Database Changes

```bash
# Create a new migration
cd backend
npx prisma migrate dev --name your_migration_name

# Apply migrations
make db-migrate

# View database in Prisma Studio
make db-studio
```

### 3. Installing New Dependencies

```bash
# Stop containers
make dev-down

# Install dependencies
cd backend
npm install package-name

# Rebuild containers
make dev-build

# Start containers
make dev-up
```

## Production Deployment

### 1. Configure Environment

```bash
# Create production env file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

### 2. Start Production Environment

```bash
# Build and start
make prod-up

# Or with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Production Differences

- No source code mounting (uses built images)
- Resource limits configured
- Log rotation enabled
- Optimized Docker images
- Redis password required
- S3 storage required (local storage not used)

## Troubleshooting

### Port Already in Use

```bash
# Find and stop conflicting service
lsof -ti:3000 | xargs kill  # Backend
lsof -ti:5432 | xargs kill  # PostgreSQL
lsof -ti:6379 | xargs kill  # Redis

# Or change ports in docker-compose.dev.yml
```

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs backend

# Check container status
docker ps -a

# Remove and recreate
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

### Database Connection Issues

```bash
# Wait for database to be ready
docker-compose -f docker-compose.dev.yml logs postgres

# Check health status
docker inspect social-media-postgres-dev | grep Health

# Reset database (WARNING: deletes data)
make db-reset
```

### FFmpeg Not Found

FFmpeg is included in the Docker images. If you get errors:

```bash
# Rebuild containers
make dev-build

# Or manually check
docker-compose -f docker-compose.dev.yml exec backend ffmpeg -version
```

### Out of Disk Space

```bash
# Remove unused Docker resources
docker system prune -a

# Remove volumes (WARNING: deletes data)
docker volume prune
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose -f docker-compose.dev.yml logs -f worker

# Check Redis connection
docker-compose -f docker-compose.dev.yml exec redis redis-cli ping

# Restart worker
docker-compose -f docker-compose.dev.yml restart worker
```

## Environment Variables

### Required for Development

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/social_media_automation
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
```

### Required for Production

All development variables plus:

```env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
POSTGRES_PASSWORD=strong-password
REDIS_PASSWORD=strong-password
```

## Volume Management

### List Volumes

```bash
docker volume ls | grep social-media
```

### Backup Database

```bash
# Export database
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres social_media_automation > backup.sql

# Import database
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres social_media_automation < backup.sql
```

### Cleanup

```bash
# Remove all containers and volumes
make clean

# Or manually
docker-compose -f docker-compose.dev.yml down -v
```

## Performance Optimization

### Adjust Resource Limits

Edit `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'      # Increase for more CPU
      memory: 4G     # Increase for more RAM
```

### Monitor Resource Usage

```bash
# Real-time stats
docker stats

# View specific container
docker stats social-media-backend-dev
```

## Security Notes

1. **Never commit .env files** - Already in .gitignore
2. **Use strong passwords** in production
3. **Enable Redis password** in production
4. **Use secrets management** for sensitive data in production
5. **Keep images updated** - Rebuild regularly

## Next Steps

1. Configure your `.env` file with API credentials
2. Start development environment: `make dev-up`
3. Run database migrations: `make db-migrate`
4. Test video upload: Upload a test video via API
5. Check worker logs: `make dev-logs` to see video processing

## Support

For issues:
1. Check logs: `make dev-logs`
2. Check container status: `make status`
3. Review this troubleshooting guide
4. Check GitHub issues

---

**Built with Docker for easy development and deployment! 🐳**

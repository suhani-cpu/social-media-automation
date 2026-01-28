# Deployment Guide

Complete guide for deploying the Social Media Automation Platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Production Deployment](#production-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)
- [Scaling](#scaling)

## Prerequisites

### Required Software

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for generating secrets)
- AWS CLI (for S3 operations)

### Required Services

- AWS S3 bucket for video storage
- PostgreSQL-compatible database (or use Docker)
- Redis instance (or use Docker)
- Domain name with DNS configuration
- SSL/TLS certificate

### Required API Access

- Instagram Graph API credentials
- YouTube Data API v3 OAuth credentials
- Facebook Graph API credentials

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd social-media-automation
```

### 2. Configure Environment Variables

```bash
# Copy production environment template
cp .env.production.example .env

# Edit environment variables
nano .env
```

**Critical variables to configure:**

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
REDIS_PASSWORD=$(openssl rand -base64 24)

# Set your domain
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Configure AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Configure social media APIs
INSTAGRAM_ACCESS_TOKEN=your-token
YOUTUBE_CLIENT_ID=your-id
YOUTUBE_CLIENT_SECRET=your-secret
FACEBOOK_APP_ID=your-id
FACEBOOK_APP_SECRET=your-secret
```

### 3. Configure SSL/TLS

#### Option A: Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
mkdir -p deployment/nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem deployment/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem deployment/nginx/ssl/key.pem
```

#### Option B: Self-Signed Certificate (Development)

```bash
mkdir -p deployment/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deployment/nginx/ssl/key.pem \
  -out deployment/nginx/ssl/cert.pem
```

### 4. Configure AWS S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://your-bucket-name --region us-east-1

# Set bucket policy (allow public read for processed videos)
aws s3api put-bucket-policy --bucket your-bucket-name --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::your-bucket-name/videos/processed/*"
  }]
}'

# Enable versioning (optional, for backup)
aws s3api put-bucket-versioning --bucket your-bucket-name \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy (optional, auto-delete old files)
aws s3api put-bucket-lifecycle-configuration --bucket your-bucket-name \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldRawVideos",
      "Status": "Enabled",
      "Prefix": "videos/raw/",
      "Expiration": {"Days": 7}
    }]
  }'
```

### 5. Configure DNS

Point your domain to your server:

```
Type: A
Name: yourdomain.com
Value: your.server.ip.address
TTL: 3600

Type: A
Name: www
Value: your.server.ip.address
TTL: 3600
```

## Production Deployment

### Automated Deployment

Use the deployment script for automated setup:

```bash
# Make scripts executable
chmod +x deployment/scripts/*.sh

# Run deployment
./deployment/scripts/deploy.sh production
```

The script will:
1. ✓ Validate environment variables
2. ✓ Backup existing database (if any)
3. ✓ Pull latest code changes
4. ✓ Build Docker images
5. ✓ Start all containers
6. ✓ Run database migrations
7. ✓ Perform health checks

### Manual Deployment

If you prefer manual control:

```bash
# Build images
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker exec social-media-backend-prod npx prisma migrate deploy

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Verify Deployment

```bash
# Run health check script
./deployment/scripts/health-check.sh

# Check individual services
curl http://localhost:3000/health  # Backend
curl http://localhost:3001         # Frontend
curl http://localhost/health       # Nginx
```

## Monitoring & Maintenance

### Health Monitoring

#### Automated Health Checks

Set up cron job for periodic health checks:

```bash
# Edit crontab
crontab -e

# Add health check every 5 minutes
*/5 * * * * /path/to/social-media-automation/deployment/scripts/health-check.sh >> /var/log/health-check.log 2>&1

# Add daily backup at 2 AM
0 2 * * * /path/to/social-media-automation/deployment/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

#### Manual Health Checks

```bash
# Full health check
./deployment/scripts/health-check.sh

# Check logs
./deployment/scripts/logs.sh backend -f
./deployment/scripts/logs.sh worker -f
./deployment/scripts/logs.sh nginx -f
```

### Viewing Logs

```bash
# View logs for specific service
./deployment/scripts/logs.sh backend --tail=100

# Follow logs in real-time
./deployment/scripts/logs.sh backend -f

# View all service logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Resource Monitoring

```bash
# Container resource usage
docker stats

# Disk usage
df -h
docker system df

# Volume sizes
docker volume ls
docker system df -v
```

### Updating Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
./deployment/scripts/deploy.sh production
```

## Backup & Recovery

### Automatic Database Backups

Backups are automatically created:
- Daily at 2 AM (via cron)
- Before each deployment
- Retained for 30 days

Backup location: `/deployment/backups/`

### Manual Backup

```bash
# Create backup
./deployment/scripts/backup-db.sh

# Backups are stored in:
# - Local: deployment/backups/
# - S3 (if configured): s3://your-backup-bucket/database-backups/
```

### Restore from Backup

```bash
# List available backups
ls -lh deployment/backups/

# Restore specific backup
./deployment/scripts/restore-db.sh deployment/backups/db_backup_20260128_120000.sql.gz
```

**Warning:** Restore will:
1. Stop backend and worker containers
2. Drop and recreate database
3. Restore backup data
4. Restart containers

### Disaster Recovery Procedure

1. **Restore Database:**
   ```bash
   ./deployment/scripts/restore-db.sh <backup-file>
   ```

2. **Restore S3 Data (if needed):**
   ```bash
   aws s3 sync s3://backup-bucket/videos/ s3://production-bucket/videos/
   ```

3. **Redeploy Application:**
   ```bash
   ./deployment/scripts/deploy.sh production
   ```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs <service>

# Check container status
docker ps -a

# Restart specific service
docker-compose -f docker-compose.prod.yml restart <service>
```

#### 2. Database Connection Error

```bash
# Check PostgreSQL is running
docker exec social-media-postgres-prod pg_isready

# Verify DATABASE_URL
docker exec social-media-backend-prod env | grep DATABASE_URL

# Check logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### 3. Redis Connection Error

```bash
# Check Redis is running
docker exec social-media-redis-prod redis-cli ping

# Verify password
docker exec social-media-redis-prod redis-cli -a $REDIS_PASSWORD ping

# Check logs
docker-compose -f docker-compose.prod.yml logs redis
```

#### 4. Nginx 502 Bad Gateway

```bash
# Check backend is running
curl http://localhost:3000/health

# Check nginx configuration
docker exec social-media-nginx-prod nginx -t

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

#### 5. Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Clean up old logs
find deployment/backups -name "*.sql.gz" -mtime +30 -delete

# Rotate nginx logs
docker exec social-media-nginx-prod logrotate /etc/logrotate.conf
```

#### 6. Video Processing Fails

```bash
# Check FFmpeg is installed
docker exec social-media-worker-prod ffmpeg -version

# Check worker logs
docker-compose -f docker-compose.prod.yml logs worker

# Check S3 permissions
aws s3 ls s3://your-bucket-name

# Restart worker
docker-compose -f docker-compose.prod.yml restart worker
```

### Debug Mode

Enable verbose logging:

```bash
# Edit .env
LOG_LEVEL=debug

# Restart services
docker-compose -f docker-compose.prod.yml restart backend worker
```

## Scaling

### Horizontal Scaling

#### Scale Workers

```bash
# Scale to 3 worker instances
docker-compose -f docker-compose.prod.yml up -d --scale worker=3

# Verify
docker ps | grep worker
```

#### Load Balancing (Nginx)

For multiple backend instances, update `deployment/nginx/nginx.conf`:

```nginx
upstream backend {
    server backend-1:3000;
    server backend-2:3000;
    server backend-3:3000;
    keepalive 32;
}
```

### Vertical Scaling

#### Resource Limits

Add resource limits to `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Database Scaling

#### PostgreSQL Optimization

```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 200;

-- Tune shared buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '4GB';

-- Reload configuration
SELECT pg_reload_conf();
```

#### Read Replicas

For high-read workloads, configure PostgreSQL read replicas and update connection strings.

### Redis Scaling

For high-traffic scenarios:

1. **Redis Cluster**: Deploy Redis Cluster for horizontal scaling
2. **Redis Sentinel**: High availability with automatic failover

## Security Best Practices

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 2. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
./deployment/scripts/deploy.sh production
```

### 3. SSL/TLS Certificate Renewal

```bash
# Auto-renewal with certbot (runs twice daily)
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
```

### 4. Rotate Secrets

Regularly rotate:
- JWT_SECRET
- Database passwords
- Redis passwords
- API keys

### 5. Monitor Logs

Regularly review logs for suspicious activity:

```bash
# Check for failed login attempts
docker-compose -f docker-compose.prod.yml logs backend | grep "401\|403"

# Check for rate limit violations
docker-compose -f docker-compose.prod.yml logs nginx | grep "429"
```

## Performance Optimization

### 1. Database Indexing

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_videos_user_id ON videos(userId);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduledFor);
```

### 2. Redis Caching

Implement caching for frequently accessed data:
- User sessions
- Video metadata
- Analytics data

### 3. CDN Integration

Serve static assets and processed videos through CDN:
- CloudFront (AWS)
- Cloudflare
- Fastly

### 4. Database Connection Pooling

Configure Prisma connection pool in backend:

```typescript
// src/config/database.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
  __internal: {
    engine: {
      connection_limit: 20,
    },
  },
});
```

## Support

For production issues:
1. Check logs: `./deployment/scripts/logs.sh <service>`
2. Run health check: `./deployment/scripts/health-check.sh`
3. Review this documentation
4. Open GitHub issue with logs and error details

## Monitoring Tools (Optional)

Consider integrating:
- **Sentry**: Error tracking
- **New Relic**: Application performance monitoring
- **DataDog**: Infrastructure monitoring
- **Grafana + Prometheus**: Metrics visualization
- **ELK Stack**: Centralized logging

## Compliance

Ensure compliance with:
- GDPR (EU users)
- CCPA (California users)
- Platform-specific terms of service (Instagram, YouTube, Facebook)
- Data retention policies
- Privacy policies

---

For development setup, see [README.md](README.md)
For testing documentation, see [TESTING.md](TESTING.md)

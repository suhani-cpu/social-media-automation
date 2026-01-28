# Nginx Configuration

This directory contains Nginx configuration for production deployment.

## SSL/TLS Certificate Setup

### Option 1: Let's Encrypt (Recommended for Production)

```bash
# Install certbot
sudo apt-get install certbot

# Stop nginx if running
docker-compose -f docker-compose.prod.yml stop nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Create ssl directory
mkdir -p deployment/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem deployment/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem deployment/nginx/ssl/key.pem

# Set permissions
sudo chmod 644 deployment/nginx/ssl/cert.pem
sudo chmod 600 deployment/nginx/ssl/key.pem

# Restart nginx
docker-compose -f docker-compose.prod.yml start nginx
```

### Option 2: Self-Signed Certificate (Development Only)

```bash
mkdir -p deployment/nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deployment/nginx/ssl/key.pem \
  -out deployment/nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Option 3: Commercial Certificate

If you have a commercial certificate:

```bash
mkdir -p deployment/nginx/ssl

# Copy your certificate files
cp /path/to/your/certificate.crt deployment/nginx/ssl/cert.pem
cp /path/to/your/private.key deployment/nginx/ssl/key.pem

# If you have intermediate certificates, combine them:
cat certificate.crt intermediate.crt > deployment/nginx/ssl/cert.pem
```

## Auto-Renewal (Let's Encrypt)

Set up automatic certificate renewal:

```bash
# Add to crontab
crontab -e

# Add this line (runs twice daily)
0 0,12 * * * certbot renew --quiet --post-hook "docker exec social-media-nginx-prod nginx -s reload"
```

## Testing Configuration

Before deploying, test nginx configuration:

```bash
# Test configuration syntax
docker exec social-media-nginx-prod nginx -t

# Reload configuration without downtime
docker exec social-media-nginx-prod nginx -s reload
```

## Customizing Configuration

To modify nginx configuration:

1. Edit `nginx.conf`
2. Test configuration: `docker exec social-media-nginx-prod nginx -t`
3. Reload: `docker-compose -f docker-compose.prod.yml restart nginx`

## Rate Limiting

Current rate limits (defined in nginx.conf):

- General API: 100 requests/minute
- Auth endpoints: 5 requests/minute

To adjust:

```nginx
# In nginx.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
```

## Security Headers

Current security headers:

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security: max-age=31536000

## Monitoring

View nginx access logs:

```bash
docker exec social-media-nginx-prod tail -f /var/log/nginx/access.log
```

View nginx error logs:

```bash
docker exec social-media-nginx-prod tail -f /var/log/nginx/error.log
```

## Troubleshooting

### 502 Bad Gateway

- Check backend is running: `curl http://localhost:3000/health`
- Check frontend is running: `curl http://localhost:3001`
- View nginx error logs: `docker-compose -f docker-compose.prod.yml logs nginx`

### SSL Certificate Errors

- Verify certificate files exist: `ls -l deployment/nginx/ssl/`
- Check certificate validity: `openssl x509 -in deployment/nginx/ssl/cert.pem -text -noout`
- Check private key: `openssl rsa -in deployment/nginx/ssl/key.pem -check`

### Connection Timeout

- Increase proxy timeouts in nginx.conf:
  ```nginx
  proxy_read_timeout 300s;
  proxy_connect_timeout 75s;
  ```

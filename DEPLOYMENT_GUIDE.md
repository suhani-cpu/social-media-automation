# Deployment Guide — Social Media Automation

## Prerequisites

### Required Tools
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Git 2.0+
- FFmpeg (for video processing)

### Required Accounts
- GitHub account
- Vercel account (frontend)
- Railway or Render account (backend)
- PostgreSQL hosting (Railway, Render, or Supabase)

---

## Part 1: Database Setup

### Option A: Railway PostgreSQL
```bash
# Install Railway CLI
npm i -g @railway/cli
railway login

# Create PostgreSQL
railway add --plugin postgresql
# Copy the DATABASE_URL from Railway dashboard
```

### Option B: Render PostgreSQL
1. Go to https://render.com
2. Click New > PostgreSQL
3. Choose plan, create database
4. Copy Internal/External Database URL

### Option C: Supabase
1. Go to https://supabase.com
2. Create project
3. Go to Settings > Database
4. Copy connection string

### Run Migrations
```bash
cd backend-nestjs
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

---

## Part 2: Backend Deployment

### Option A: Railway

```bash
cd backend-nestjs

# Init Railway project
railway init

# Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="redis://..."
railway variables set JWT_SECRET="$(openssl rand -hex 64)"
railway variables set JWT_EXPIRY="7d"
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
railway variables set ALLOW_ALL_ORIGINS="true"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"

# Add platform credentials
railway variables set YOUTUBE_CLIENT_ID="..."
railway variables set YOUTUBE_CLIENT_SECRET="..."
railway variables set YOUTUBE_REDIRECT_URI="https://your-backend.railway.app/api/oauth/youtube/callback"
railway variables set INSTAGRAM_APP_ID="..."
railway variables set INSTAGRAM_APP_SECRET="..."
railway variables set INSTAGRAM_REDIRECT_URI="https://your-backend.railway.app/api/oauth/instagram/callback"
railway variables set FACEBOOK_APP_ID="..."
railway variables set FACEBOOK_APP_SECRET="..."
railway variables set FACEBOOK_REDIRECT_URI="https://your-backend.railway.app/api/oauth/facebook/callback"

# Deploy
railway up

# Get URL
railway domain
```

### Option B: Render

Create `render.yaml` in backend-nestjs/:
```yaml
services:
  - type: web
    name: sma-backend
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install && npx prisma generate && npx nest build
    startCommand: node dist/main.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: ALLOW_ALL_ORIGINS
        value: "true"
```

1. Push to GitHub
2. Go to https://render.com > New > Blueprint
3. Connect repo, Render reads render.yaml
4. Add secrets in dashboard
5. Deploy

### Verify Backend
```bash
# Health check
curl https://YOUR_BACKEND_URL/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}

# DB health
curl https://YOUR_BACKEND_URL/api/health/db
# Expected: {"status":"healthy","database":"connected"}
```

---

## Part 3: Frontend Deployment (Vercel)

### Method 1: GitHub Auto-Deploy (Recommended)

1. Push frontend to GitHub
2. Go to https://vercel.com > Add New Project
3. Import GitHub repository
4. Configure:
   - Framework: Next.js
   - Root Directory: `frontend/` (if monorepo)
   - Build Command: `npm run build`
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL/api
   NEXT_PUBLIC_MAX_UPLOAD_SIZE=1073741824
   ```
6. Click Deploy

### Method 2: CLI

```bash
cd frontend
npm i -g vercel
vercel login
vercel --prod

# Set env vars
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://YOUR_BACKEND_URL/api
```

### Verify Frontend
```bash
# Homepage
curl -o /dev/null -w "%{http_code}" https://YOUR_FRONTEND_URL
# Expected: 200

# Embed script
curl -I https://YOUR_FRONTEND_URL/embed.js
# Expected: HTTP/2 200, Access-Control-Allow-Origin: *

# Embed test page
open https://YOUR_FRONTEND_URL/embed-test.html
```

---

## Part 4: Post-Deployment Checklist

### Update OAuth Redirect URIs
After deploying, update redirect URIs in:

1. **Google Cloud Console** (YouTube + Drive):
   - `https://YOUR_BACKEND_URL/api/oauth/youtube/callback`
   - `https://YOUR_BACKEND_URL/api/drive/callback`

2. **Facebook Developers** (Instagram + Facebook):
   - `https://YOUR_BACKEND_URL/api/oauth/instagram/callback`
   - `https://YOUR_BACKEND_URL/api/oauth/facebook/callback`

### Update Backend Env Vars
```bash
# Update redirect URIs to production
YOUTUBE_REDIRECT_URI=https://YOUR_BACKEND_URL/api/oauth/youtube/callback
INSTAGRAM_REDIRECT_URI=https://YOUR_BACKEND_URL/api/oauth/instagram/callback
FACEBOOK_REDIRECT_URI=https://YOUR_BACKEND_URL/api/oauth/facebook/callback
GOOGLE_DRIVE_REDIRECT_URI=https://YOUR_BACKEND_URL/api/drive/callback
FRONTEND_URL=https://YOUR_FRONTEND_URL
```

### CORS Verification
```bash
curl -H "Origin: https://any-cms-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://YOUR_BACKEND_URL/api/auth/login
# Should return Access-Control headers
```

### End-to-End Test
1. Visit https://YOUR_FRONTEND_URL
2. Register a new user
3. Connect a YouTube/Instagram/Facebook account
4. Import video from Google Drive
5. Generate AI caption
6. Publish post — verify progress tracking works
7. Check analytics

---

## Monitoring

### Health Endpoints
- Backend: `GET /api/health`
- Database: `GET /api/health/db`

### Logs
```bash
# Railway
railway logs

# Render
# Check dashboard > Service > Logs

# Vercel
vercel logs
```

---

## Environment Variables Reference

See `backend-nestjs/.env.example` and `frontend/.env.example` for complete lists.

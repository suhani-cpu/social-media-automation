# Quick Start Guide

## Get the Tool Running in 5 Minutes

### Prerequisites Check

```bash
# Check if you have the required tools
node --version    # Should be 20+
docker --version  # Should be 20.10+
docker-compose --version  # Should be 2.0+
```

### Option 1: Quick Development Setup (Recommended for First Time)

```bash
# 1. Navigate to the project
cd /Users/suhani/social-media-automation

# 2. Set up backend environment
cd backend
cp .env.example .env

# Edit the .env file with minimal required settings:
# - DATABASE_URL (PostgreSQL connection string)
# - REDIS_URL (Redis connection string)
# - JWT_SECRET (generate with: openssl rand -base64 32)

# 3. Install backend dependencies
npm install

# 4. Set up database
npx prisma generate
npx prisma migrate dev

# 5. Set up frontend environment
cd ../frontend
cp .env.local.example .env.local

# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3000/api

# 6. Install frontend dependencies
npm install

# 7. Start everything (from root directory)
cd ..
npm install  # Install root dependencies

# Open 3 terminals:

# Terminal 1 - Backend API
cd backend
npm run dev

# Terminal 2 - Queue Worker
cd backend
npm run worker:dev

# Terminal 3 - Frontend
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/health

---

### Option 2: Docker Setup (Full Experience)

```bash
# 1. Navigate to project
cd /Users/suhani/social-media-automation

# 2. Create environment file
cp .env.example .env

# Edit .env with required values

# 3. Start with Docker Compose
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f
```

**Access the application:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## First Time User Flow

### 1. Register an Account

**Via UI:**
- Go to http://localhost:3001
- Click "Register"
- Enter name, email, password
- Submit

**Via API:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "your@email.com",
    "password": "securePassword123"
  }'
```

### 2. Login

**Via UI:**
- Go to http://localhost:3001/login
- Enter email and password
- Click "Login"

**Via API:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "securePassword123"
  }'

# Save the token from response
```

### 3. Upload a Video

**Via UI:**
- Navigate to "Videos" in sidebar
- Click "Upload Video"
- Drag and drop a video file (MP4, MOV, AVI, WEBM - max 500MB)
- Add title and select language
- Click "Upload"
- Watch the processing progress

**Via API:**
```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@/path/to/your/video.mp4" \
  -F "title=My First Video" \
  -F "language=ENGLISH"
```

### 4. Create a Post with AI Caption

**Via UI:**
- Navigate to "Posts" → "Create Post"
- Step 1: Select your uploaded video (wait for "Ready" status)
- Step 2: Generate AI caption
  - Select language (English, Hinglish, Haryanvi, Hindi)
  - Click "Generate Captions"
  - Choose from 3 variations or edit
- Step 3: Select platforms
  - Check Instagram/YouTube/Facebook
  - Select account and post type
- Step 4: Schedule
  - Choose "Publish Now" or set future date/time
- Step 5: Review and submit

**Via API:**
```bash
# Generate caption
curl -X POST http://localhost:3000/api/posts/generate-caption \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "your-video-id",
    "language": "ENGLISH"
  }'

# Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "your-video-id",
    "accountId": "your-account-id",
    "platform": "INSTAGRAM",
    "postType": "REEL",
    "caption": "Check out this amazing video! #viral #trending",
    "scheduledFor": "2026-01-29T10:00:00Z"
  }'
```

### 5. Publish a Post

**Via UI:**
- Navigate to "Posts"
- Find your draft/scheduled post
- Click "Publish Now" in the actions menu
- Watch status change: DRAFT → PUBLISHING → PUBLISHED

**Via API:**
```bash
curl -X POST http://localhost:3000/api/posts/YOUR_POST_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```

### 6. View Analytics

**Via UI:**
- Navigate to "Analytics" in sidebar
- View metrics cards (Views, Likes, Comments, Shares)
- Check platform breakdown chart
- See views over time trend
- Review top performing posts

**Via API:**
```bash
# Get analytics summary
curl -X GET "http://localhost:3000/api/analytics?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer $TOKEN"

# Get post-specific analytics
curl -X GET http://localhost:3000/api/analytics/posts/YOUR_POST_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Key Features to Try

### 1. Multi-Platform Publishing
- Upload one video
- Create posts for Instagram, YouTube, and Facebook simultaneously
- Each platform gets optimized format automatically

### 2. AI Caption Generation
- Try all 4 languages: English, Hinglish, Haryanvi, Hindi
- Get 3 variations per generation
- Edit and customize before posting

### 3. Scheduled Posts
- Schedule posts for future dates
- View all scheduled posts in calendar view
- Automatic publishing via cron jobs

### 4. Video Processing
Watch your video transform:
- Original uploaded → Processing
- Creates 6 platform-specific formats:
  - Instagram Reel (1080x1920, 9:16)
  - Instagram Feed (1080x1080, 1:1)
  - YouTube Short (1080x1920, 9:16)
  - YouTube Video (1920x1080, 16:9)
  - Facebook Square (1080x1080, 1:1)
  - Facebook Landscape (1920x1080, 16:9)
- Generates 3 thumbnails (1s, 3s, 5s marks)

### 5. Calendar View
- Navigate to "Calendar"
- See all scheduled posts in monthly grid
- Color-coded by platform:
  - Pink: Instagram
  - Red: YouTube
  - Blue: Facebook
- Click posts to view details

### 6. Post Queue Management
- Navigate to "Posts"
- Use tabs: All, Draft, Scheduled, Published, Failed
- Search by caption or video title
- Filter by platform
- Sort by date or status
- Bulk actions available

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Check what's using the port
lsof -i :3000  # Backend
lsof -i :3001  # Frontend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Kill the process or change port in .env
```

### Issue: Database Connection Failed

```bash
# Make sure PostgreSQL is running
docker-compose up -d postgres

# Or if using local PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux

# Check connection
psql -h localhost -U postgres -d social_media
```

### Issue: Redis Connection Failed

```bash
# Start Redis
docker-compose up -d redis

# Or local Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux

# Test connection
redis-cli ping  # Should return PONG
```

### Issue: Video Processing Stuck

```bash
# Check worker logs
cd backend
npm run worker:dev

# Or with Docker
docker-compose logs -f worker

# Verify FFmpeg is installed
ffmpeg -version
```

### Issue: Frontend Can't Connect to Backend

```bash
# Verify backend is running
curl http://localhost:3000/health

# Check CORS settings in backend/src/app.ts
# Make sure FRONTEND_URL is set correctly in backend/.env

# Check NEXT_PUBLIC_API_URL in frontend/.env.local
```

---

## Development Tips

### Hot Reload
All services support hot reload:
- Backend: Changes to `.ts` files auto-reload
- Frontend: Next.js Fast Refresh
- No need to restart during development

### Database Inspection

```bash
# Open Prisma Studio (GUI for database)
cd backend
npm run prisma:studio

# Opens at http://localhost:5555
```

### View Logs

```bash
# Backend logs
cd backend
npm run dev  # Shows in console

# Worker logs
cd backend
npm run worker:dev

# Docker logs
docker-compose logs -f [service-name]
```

### API Testing

Use the provided Postman/Insomnia collection or:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test with authentication
TOKEN="your-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/videos
```

### Clearing Data

```bash
# Reset database
cd backend
npx prisma migrate reset  # WARNING: Deletes all data

# Clear Redis
redis-cli FLUSHALL

# Clear Docker volumes
docker-compose down -v
```

---

## What to Do Next

1. **Connect Social Media Accounts**
   - Get Instagram access token
   - Set up YouTube OAuth
   - Configure Facebook App

2. **Configure S3 Storage**
   - Create AWS S3 bucket
   - Add credentials to .env
   - Videos currently stored in /tmp (not persistent)

3. **Customize Settings**
   - Rate limits: `backend/src/middleware/rate-limit.middleware.ts`
   - Video formats: `backend/src/services/video-processing/formats.ts`
   - Caption prompts: `backend/src/services/caption/generator.ts`

4. **Run Tests**
   ```bash
   # Backend tests
   cd backend
   npm test

   # Frontend tests
   cd frontend
   npm test

   # With coverage
   npm test -- --coverage
   ```

5. **Deploy to Production**
   ```bash
   # See DEPLOYMENT.md for full guide
   ./deployment/scripts/deploy.sh production
   ```

---

## Getting Help

- **Documentation**: See README.md, DEPLOYMENT.md, TESTING.md
- **API Reference**: See API-EXAMPLES.md
- **Logs**: Check console output or Docker logs
- **Health Check**: http://localhost:3000/health

---

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │ Next.js 14 (Port 3001)
│   Dashboard     │ React Components, TailwindCSS
└────────┬────────┘
         │ HTTP/REST
         ↓
┌─────────────────┐
│   Backend API   │ Express.js (Port 3000)
│   + JWT Auth    │ Controllers, Routes, Middleware
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐ ┌──────────┐
│PostgreSQL│ │  Redis   │
│ Database │ │  Queue   │
└─────────┘ └────┬─────┘
                  ↓
            ┌──────────┐
            │  Worker  │ Background Jobs
            │ Process  │ Video Processing
            └────┬─────┘
                 ↓
         ┌──────────────┐
         │   Services   │
         │  - FFmpeg    │ Video transcoding
         │  - S3        │ File storage
         │  - Instagram │ Publishing
         │  - YouTube   │ Publishing
         │  - Facebook  │ Publishing
         └──────────────┘
```

---

**Ready to start? Run:**

```bash
cd /Users/suhani/social-media-automation

# Choose your option:
npm run dev              # Development (all services)
docker-compose up -d     # Docker (full stack)
```

Then open: **http://localhost:3001**

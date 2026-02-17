# Social Media Automation Platform
## Complete Project Handover Documentation

**Project Name:** Social Media Automation Platform
**Version:** 1.0.0
**Date:** February 2026
**Status:** Production Ready

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [API Documentation](#7-api-documentation)
8. [Features Implemented](#8-features-implemented)
9. [Setup & Installation](#9-setup--installation)
10. [Configuration](#10-configuration)
11. [Deployment Guide](#11-deployment-guide)
12. [Security Measures](#12-security-measures)
13. [Testing](#13-testing)
14. [Troubleshooting](#14-troubleshooting)
15. [Future Enhancements](#15-future-enhancements)
16. [Contact & Support](#16-contact--support)

---

# 1. Executive Summary

The Social Media Automation Platform is a comprehensive solution designed for Stage OTT content creators to automate multi-platform video publishing. The platform enables users to:

- Upload and process videos automatically into 6 platform-specific formats
- Generate AI-powered captions in 4 languages (English, Hinglish, Haryanvi, Hindi)
- Schedule and publish content to Instagram, YouTube, and Facebook
- Track analytics and performance metrics across all platforms

**Key Metrics:**
- Total Files: 200+
- Lines of Code: ~15,000
- Backend Routes: 20+
- Frontend Pages: 12
- React Components: 50+
- Test Coverage: 70% backend, 60% frontend

---

# 2. Project Overview

## Purpose
Automate social media content publishing for Stage OTT content creators, reducing manual effort and enabling consistent multi-platform presence.

## Target Users
- Content creators at Stage OTT
- Social media managers
- Marketing teams

## Core Functionality
1. **Video Upload & Processing**: Support for videos up to 500MB with automatic transcoding
2. **Multi-Platform Publishing**: Instagram (Reels/Feed), YouTube (Shorts/Videos), Facebook (Square/Landscape)
3. **AI Caption Generation**: 4 languages with 3 variations each
4. **Scheduling System**: Schedule posts for future dates with automatic publishing
5. **Analytics Dashboard**: Track performance metrics across all platforms

---

# 3. Technology Stack

## Backend
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Express.js | 4.18 |
| Language | TypeScript | 5.3 |
| Database | PostgreSQL | 14+ |
| ORM | Prisma | 5.8 |
| Cache/Queue | Redis + Bull | 7+ / 4.12 |
| Storage | AWS S3 | - |
| Video Processing | FFmpeg | - |
| Authentication | JWT | 9.0 |
| Security | Helmet | 7.1 |
| Validation | Zod | 3.22 |

## Frontend
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router) | 14.1 |
| Language | TypeScript | 5.3 |
| Styling | TailwindCSS | 3.4 |
| UI Components | shadcn/ui | - |
| State Management | Zustand (client) | 4.4 |
| Server State | React Query | 5.17 |
| Forms | React Hook Form + Zod | 7.49 |

## Infrastructure
| Component | Technology |
|-----------|------------|
| Containerization | Docker 20.10+ |
| Orchestration | Docker Compose 2.0+ |
| Reverse Proxy | Nginx (Alpine) |
| CI/CD | GitHub Actions |

## External APIs
- Instagram Graph API
- YouTube Data API v3
- Facebook Graph API
- Google Drive API

---

# 4. System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Videos  │ │  Posts   │ │ Calendar │ │Analytics │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                       │
│              SSL/TLS • Rate Limiting • Load Balancing            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND API (Express.js)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   Auth   │ │  Videos  │ │  Posts   │ │ Analytics│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │   AWS S3     │
│  (Database)  │ │ (Queue/Cache)│ │  (Storage)   │
└──────────────┘ └──────────────┘ └──────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QUEUE WORKERS (Bull)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │Video Process │ │ Post Publish │ │Analytics Sync│            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL PLATFORMS                            │
│     Instagram API    •    YouTube API    •    Facebook API       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Video Processing Pipeline
1. User uploads video via frontend
2. Original video saved to S3 (`videos/raw/`)
3. Processing job added to Bull queue
4. FFmpeg generates 6 platform-specific formats:
   - Instagram Reel (1080x1920, 9:16)
   - Instagram Feed (1080x1080, 1:1)
   - YouTube Short (1080x1920, 9:16)
   - YouTube Video (1920x1080, 16:9)
   - Facebook Square (1080x1080, 1:1)
   - Facebook Landscape (1920x1080, 16:9)
5. Thumbnails generated (1s, 3s, 5s)
6. Video status updated to READY

### Publishing Flow
1. User creates post with video and caption
2. Post scheduled or published immediately
3. Scheduler checks every minute for due posts
4. Platform-specific service publishes video
5. Platform post ID and URL stored
6. Analytics synced every 6 hours

---

# 5. Project Structure

```
social-media-automation/
├── backend/                      # Express.js API
│   ├── src/
│   │   ├── app.ts               # Express app configuration
│   │   ├── server.ts            # Server entry point
│   │   ├── config/              # Configuration files
│   │   │   ├── database.ts      # Prisma client setup
│   │   │   └── queue.ts         # Bull queue configuration
│   │   ├── controllers/         # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── video.controller.ts
│   │   │   ├── post.controller.ts
│   │   │   └── analytics.controller.ts
│   │   ├── services/
│   │   │   ├── video-processing/ # FFmpeg transcoding
│   │   │   ├── storage/          # S3 operations
│   │   │   ├── social-media/     # Platform integrations
│   │   │   │   ├── instagram/
│   │   │   │   ├── youtube/
│   │   │   │   └── facebook/
│   │   │   ├── scheduler/        # Cron jobs
│   │   │   ├── analytics/        # Metrics sync
│   │   │   └── caption/          # AI caption generator
│   │   ├── routes/               # API routes
│   │   ├── middleware/           # Auth, security, validation
│   │   │   ├── auth.middleware.ts
│   │   │   ├── security.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   └── error-handler.middleware.ts
│   │   ├── workers/              # Queue workers
│   │   └── prisma/               # Database schema
│   ├── tests/                    # Unit & integration tests
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── package.json
│
├── frontend/                     # Next.js 14 dashboard
│   ├── src/
│   │   ├── app/                  # Pages (App Router)
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   └── (dashboard)/
│   │   │       ├── videos/
│   │   │       ├── posts/
│   │   │       ├── calendar/
│   │   │       ├── analytics/
│   │   │       └── accounts/
│   │   ├── components/           # React components
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── video/
│   │   │   ├── post/
│   │   │   ├── calendar/
│   │   │   └── analytics/
│   │   └── lib/
│   │       ├── api/              # API client
│   │       ├── store/            # Zustand stores
│   │       └── types/            # TypeScript types
│   ├── tests/                    # Component tests
│   ├── Dockerfile
│   └── package.json
│
├── deployment/
│   ├── nginx/                    # Nginx configuration
│   │   ├── nginx.conf
│   │   └── ssl/
│   └── scripts/                  # Deployment utilities
│       ├── deploy.sh
│       ├── backup-db.sh
│       ├── restore-db.sh
│       ├── health-check.sh
│       └── logs.sh
│
├── .github/workflows/            # CI/CD pipelines
│   ├── ci.yml
│   └── test-coverage.yml
│
├── docker-compose.yml            # Basic setup
├── docker-compose.dev.yml        # Development
├── docker-compose.prod.yml       # Production
├── .env.example                  # Environment template
├── README.md                     # Project overview
├── DEPLOYMENT.md                 # Deployment guide
└── TESTING.md                    # Testing guide
```

---

# 6. Database Schema

## Entity Relationship Diagram

```
┌──────────────┐       ┌─────────────────┐       ┌─────────────┐
│     User     │───┬───│  SocialAccount  │───┬───│    Post     │
└──────────────┘   │   └─────────────────┘   │   └─────────────┘
       │           │                          │          │
       │           │                          │          │
       ▼           │                          │          ▼
┌──────────────┐   │                          │   ┌─────────────┐
│    Video     │───┘                          └───│  Analytics  │
└──────────────┘                                  └─────────────┘
                                                         │
                                                         │
                                                  ┌─────────────┐
                                                  │     Job     │
                                                  └─────────────┘
```

## Tables

### User
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | String | Unique email |
| password | String | Hashed password |
| name | String | Display name |
| role | String | User role (default: "user") |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### SocialAccount
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to User |
| platform | Enum | INSTAGRAM, FACEBOOK, YOUTUBE, etc. |
| accountId | String | Platform account ID |
| username | String | Platform username |
| accessToken | String | OAuth access token |
| refreshToken | String? | OAuth refresh token |
| tokenExpiry | DateTime? | Token expiration |
| status | Enum | ACTIVE, EXPIRED, DISCONNECTED, ERROR |
| metadata | JSON? | Additional data |

### Video
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to User |
| title | String | Video title |
| description | String? | Video description |
| status | Enum | PENDING, PROCESSING, READY, FAILED |
| duration | Int? | Duration in seconds |
| fileSize | Int? | File size in bytes |
| rawVideoUrl | String? | Original video S3 URL |
| thumbnailUrl | String? | Thumbnail URL |
| instagramReelUrl | String? | Instagram Reel format URL |
| instagramFeedUrl | String? | Instagram Feed format URL |
| youtubeShortsUrl | String? | YouTube Shorts format URL |
| youtubeVideoUrl | String? | YouTube Video format URL |
| facebookSquareUrl | String? | Facebook Square format URL |
| facebookLandscapeUrl | String? | Facebook Landscape format URL |
| language | String? | Video language |
| tags | String[] | Video tags |

### Post
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to User |
| videoId | UUID? | Foreign key to Video |
| accountId | UUID | Foreign key to SocialAccount |
| caption | String | Post caption |
| language | Enum | ENGLISH, HINGLISH, HARYANVI, HINDI |
| hashtags | String[] | Post hashtags |
| platform | Enum | Target platform |
| postType | Enum | FEED, REEL, SHORT, VIDEO, etc. |
| status | Enum | DRAFT, SCHEDULED, PUBLISHED, FAILED |
| scheduledFor | DateTime? | Scheduled publish time |
| publishedAt | DateTime? | Actual publish time |
| platformPostId | String? | Platform's post ID |
| platformUrl | String? | URL on platform |

### Analytics
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| postId | UUID | Foreign key to Post |
| accountId | UUID | Foreign key to SocialAccount |
| views | Int | View count |
| likes | Int | Like count |
| comments | Int | Comment count |
| shares | Int | Share count |
| engagement | Float | Engagement rate |
| metricsDate | DateTime | Date of metrics |

### Job
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | Enum | VIDEO_PROCESS, POST_PUBLISH, etc. |
| status | Enum | PENDING, ACTIVE, COMPLETED, FAILED |
| data | JSON | Job data |
| result | JSON? | Job result |
| error | String? | Error message |
| attempts | Int | Number of attempts |

---

# 7. API Documentation

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register User
```
POST /api/auth/register

Request Body:
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

Response (201):
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "token": "eyJhbG..."
}
```

#### Login
```
POST /api/auth/login

Request Body:
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "token": "eyJhbG..."
}
```

#### Logout
```
POST /api/auth/logout

Response (200):
{
  "message": "Logged out successfully"
}
```

### Videos

#### Upload Video
```
POST /api/videos/upload
Content-Type: multipart/form-data

Form Data:
- video: File (max 500MB)
- title: String
- language: ENGLISH | HINGLISH | HARYANVI | HINDI

Response (201):
{
  "id": "...",
  "title": "...",
  "status": "PENDING",
  "rawVideoUrl": "..."
}
```

#### List Videos
```
GET /api/videos?status=READY&page=1&limit=10

Response (200):
{
  "videos": [...],
  "total": 50,
  "page": 1,
  "totalPages": 5
}
```

#### Get Video Details
```
GET /api/videos/:id

Response (200):
{
  "id": "...",
  "title": "...",
  "status": "READY",
  "instagramReelUrl": "...",
  "youtubeVideoUrl": "...",
  ...
}
```

#### Delete Video
```
DELETE /api/videos/:id

Response (200):
{
  "message": "Video deleted successfully"
}
```

### Posts

#### Create Post
```
POST /api/posts

Request Body:
{
  "videoId": "video-uuid",
  "accountId": "account-uuid",
  "caption": "Check out this video!",
  "language": "ENGLISH",
  "hashtags": ["#viral", "#content"],
  "platform": "INSTAGRAM",
  "postType": "REEL",
  "scheduledFor": "2024-02-01T10:00:00Z" // optional
}

Response (201):
{
  "id": "...",
  "status": "SCHEDULED",
  ...
}
```

#### Generate AI Caption
```
POST /api/posts/generate-caption

Request Body:
{
  "videoTitle": "Videshi Bahu",
  "platform": "INSTAGRAM",
  "language": "HARYANVI",
  "tone": ["fun", "regional"]
}

Response (200):
{
  "captions": [
    { "caption": "...", "hashtags": [...] },
    { "caption": "...", "hashtags": [...] },
    { "caption": "...", "hashtags": [...] }
  ]
}
```

#### List Posts
```
GET /api/posts?status=SCHEDULED&platform=INSTAGRAM&page=1

Response (200):
{
  "posts": [...],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

#### Publish Post
```
POST /api/posts/:id/publish

Response (200):
{
  "id": "...",
  "status": "PUBLISHED",
  "platformPostId": "...",
  "platformUrl": "..."
}
```

### Accounts

#### Connect Social Account
```
POST /api/accounts

Request Body:
{
  "platform": "INSTAGRAM",
  "accessToken": "...",
  "accountId": "...",
  "username": "myaccount"
}

Response (201):
{
  "id": "...",
  "platform": "INSTAGRAM",
  "username": "myaccount",
  "status": "ACTIVE"
}
```

#### List Connected Accounts
```
GET /api/accounts

Response (200):
{
  "accounts": [
    { "id": "...", "platform": "INSTAGRAM", "username": "...", "status": "ACTIVE" },
    { "id": "...", "platform": "YOUTUBE", "username": "...", "status": "ACTIVE" }
  ]
}
```

### Analytics

#### Get Aggregated Analytics
```
GET /api/analytics?startDate=2024-01-01&endDate=2024-01-31&platform=INSTAGRAM

Response (200):
{
  "totalViews": 50000,
  "totalLikes": 5000,
  "totalComments": 500,
  "totalShares": 250,
  "engagementRate": 11.5,
  "platformBreakdown": {...},
  "dailyMetrics": [...]
}
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| General API | 100 requests / 15 minutes |
| Authentication | 5 requests / 15 minutes |
| Upload | 10 requests / hour |
| Caption Generation | 20 requests / hour |
| Analytics | 30 requests / 15 minutes |

---

# 8. Features Implemented

## Video Processing
- Upload videos up to 500MB
- Automatic transcoding to 6 formats
- Thumbnail generation at 1s, 3s, 5s
- S3 storage with organized structure
- Real-time status tracking

## Multi-Platform Publishing
- Instagram (Reels & Feed)
- YouTube (Shorts & Videos)
- Facebook (Square & Landscape)
- OAuth authentication for each platform
- Token auto-refresh

## AI Caption Generation
- 4 languages: English, Hinglish, Haryanvi, Hindi
- 3 variations per request
- Editable captions
- Hashtag extraction and suggestions

## Scheduling & Automation
- Schedule posts for future dates
- Publish immediately option
- Automatic publishing via cron jobs
- Status transitions (DRAFT → SCHEDULED → PUBLISHING → PUBLISHED)

## Analytics Dashboard
- Multi-platform metrics (views, likes, comments, shares)
- Engagement rate calculation
- Time-series data (daily snapshots)
- Automatic sync every 6 hours
- Top performing posts view

## Frontend Pages
1. **Login/Register** - User authentication
2. **Dashboard** - Overview and quick actions
3. **Videos** - Video library with upload
4. **Post Creator** - 5-step wizard for creating posts
5. **Post Queue** - Manage scheduled/published posts
6. **Calendar** - Calendar view of scheduled posts
7. **Analytics** - Performance metrics dashboard
8. **Accounts** - Manage connected social accounts
9. **Settings** - User preferences

---

# 9. Setup & Installation

## Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- FFmpeg
- Docker & Docker Compose (recommended)
- AWS S3 bucket
- Social media API credentials

## Quick Start with Docker

```bash
# Clone repository
git clone <repository-url>
cd social-media-automation

# Start services
docker-compose up -d

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup database
cd backend
npx prisma generate
npx prisma migrate dev

# Start development servers
npm run dev  # From root directory
```

## Manual Setup

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment
```bash
# Copy example files
cp .env.example .env
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env.local
```

### 3. Setup Database
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 4. Start Services
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Queue Worker
cd backend && npm run worker:dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### 5. Access Application
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Health Check: http://localhost:3000/health

---

# 10. Configuration

## Environment Variables

### Backend (.env)
```env
# Node Environment
NODE_ENV=development

# Server
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/social_media

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=7d

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=social-media-automation
AWS_REGION=us-east-1

# Instagram API
INSTAGRAM_APP_ID=your-app-id
INSTAGRAM_APP_SECRET=your-app-secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback

# YouTube API
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback

# Facebook API
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback

# Logging
LOG_LEVEL=info
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_MAX_UPLOAD_SIZE=524288000
```

---

# 11. Deployment Guide

## Docker Production Deployment

### 1. Configure Production Environment
```bash
cp .env.production.example .env
nano .env  # Edit with production values
```

### 2. Build and Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Setup SSL (with Let's Encrypt)
```bash
./deployment/scripts/setup-ssl.sh your-domain.com
```

### 4. Verify Deployment
```bash
./deployment/scripts/health-check.sh
```

## Server Requirements

### Minimum (Single Server)
- 4GB RAM
- 2 CPU cores
- 50GB storage
- Suitable for small to medium traffic

### Recommended (Distributed)
- Database: 8GB RAM, 4 CPU
- API Servers: 4GB RAM, 2 CPU (multiple instances)
- Worker Nodes: 8GB RAM, 4 CPU (video processing)
- Load Balancer

## Maintenance Scripts

```bash
# Database backup
./deployment/scripts/backup-db.sh

# Database restore
./deployment/scripts/restore-db.sh backup-file.sql

# View logs
./deployment/scripts/logs.sh [service-name]

# Health check
./deployment/scripts/health-check.sh
```

---

# 12. Security Measures

## Implemented Security Features

### Authentication & Authorization
- JWT authentication with httpOnly cookies
- Bcrypt password hashing (10 rounds)
- Session management
- Role-based access control

### API Security
- Helmet.js security headers (CSP, HSTS, XSS protection)
- Rate limiting per endpoint
- Input sanitization (XSS prevention)
- CORS whitelist
- Request validation with Zod schemas

### Data Protection
- SQL injection prevention (Prisma ORM)
- Data encryption at rest (database)
- Data encryption in transit (HTTPS/TLS)
- Non-root Docker containers

### Infrastructure Security
- Nginx reverse proxy
- SSL/TLS certificates
- Docker security best practices
- Environment variable secrets (never in code)

## Security Headers
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

# 13. Testing

## Test Coverage
- Backend: 70% coverage (24 unit tests, 12 integration tests)
- Frontend: 60% coverage (8 component tests, 4 store tests)

## Running Tests

```bash
# Backend tests
cd backend
npm test                    # Run all tests with coverage
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:watch         # Watch mode

# Frontend tests
cd frontend
npm test                    # Run all tests with coverage
npm run test:watch         # Watch mode
```

## CI/CD Pipeline
Automated on every push/PR:
1. Lint check
2. Format check
3. Type checking
4. Test execution
5. Build verification
6. Security audit

---

# 14. Troubleshooting

## Common Issues

### Video Processing Fails
```bash
# Check FFmpeg installation
ffmpeg -version

# Verify S3 credentials
aws s3 ls s3://your-bucket

# Check worker logs
docker logs worker-container
```

### Publishing Fails
- Verify OAuth tokens are valid
- Check token expiry and refresh
- Review platform API rate limits
- Ensure platform-specific requirements are met

### Database Connection Errors
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection
psql $DATABASE_URL

# Run migrations
cd backend && npx prisma migrate dev
```

### Port Already in Use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill

# Restart server
npm run dev
```

### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Restart Redis
docker restart redis-container
```

---

# 15. Future Enhancements

## Suggested Features
- [ ] Stage OTT API integration (automatic video fetching)
- [ ] AI-powered best time to post suggestions
- [ ] Bulk upload (multiple videos at once)
- [ ] Advanced analytics (A/B testing captions)
- [ ] Mobile app (React Native)
- [ ] Video editor (trim, filters, text overlays)
- [ ] Team collaboration (multiple users)
- [ ] Email notifications
- [ ] Webhook support
- [ ] Advanced scheduling (recurring posts)
- [ ] Brand kit (logo overlays, intros/outros)

## Infrastructure Improvements
- [ ] Kubernetes deployment
- [ ] Multi-region deployment
- [ ] CDN integration (CloudFront)
- [ ] Advanced monitoring (Sentry, DataDog)
- [ ] Automated scaling
- [ ] Blue-green deployment

---

# 16. Contact & Support

## Project Status
- **Status**: Production Ready
- **All Tasks**: Completed (16/16)
- **Deployment Ready**: Yes

## Documentation Files
1. `README.md` - Project overview
2. `DEPLOYMENT.md` - Deployment guide
3. `TESTING.md` - Testing practices
4. `API-EXAMPLES.md` - API usage examples
5. `QUICKSTART.md` - Quick setup guide
6. `TROUBLESHOOTING.md` - Problem solving guide

## Support
For issues and questions:
- Check documentation files in the project
- Review troubleshooting section
- Open a GitHub issue

---

# Appendix A: NPM Scripts

## Backend Scripts
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run worker:dev    # Start queue worker (dev)
npm run worker        # Start queue worker (prod)
npm test              # Run tests
npm run lint          # Check code style
npm run lint:fix      # Fix code style issues
npm run format        # Format code
npm run type-check    # TypeScript type checking
npm run prisma:studio # Open Prisma Studio
```

## Frontend Scripts
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm test              # Run tests
npm run lint          # Check code style
npm run format        # Format code
npm run type-check    # TypeScript type checking
```

---

# Appendix B: Docker Commands

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f

# Production
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml logs -f [service]

# Useful commands
docker ps                    # List running containers
docker logs [container]      # View container logs
docker exec -it [container] bash  # Enter container shell
docker system prune          # Clean up unused resources
```

---

**Document Version**: 1.0
**Last Updated**: February 2026
**Project Status**: Complete and Production Ready

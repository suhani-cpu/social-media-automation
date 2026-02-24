# System Architecture — Social Media Automation Tool

**Generated:** 2026-02-23
**Tool Name:** Social Media Automation (Drive se Post tak)

---

## Stack Overview

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 14 (App Router) + Tailwind + Zustand | `frontend/` |
| Backend | NestJS 10 + Prisma + Bull queues | `backend-nestjs/` |
| Database | PostgreSQL | via Prisma ORM |
| Cache/Queue | Redis + Bull | ioredis + @nestjs/bull |
| Storage | AWS S3 (optional, local fallback) | aws-sdk v2 |
| AI | Anthropic Claude (captions) | @anthropic-ai/sdk |
| Video | FFmpeg (fluent-ffmpeg) | Video processing |

---

## Backend — 51 API Endpoints (prefix: `/api`)

### Auth (5)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login |
| PUT | `/api/auth/profile` | JWT | Update profile |
| PUT | `/api/auth/onboarding` | JWT | Complete onboarding |
| GET | `/api/auth/me` | JWT | Current user |

### OAuth (6)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/oauth/youtube/authorize` | JWT | YouTube OAuth URL |
| GET | `/api/oauth/youtube/callback` | No | YouTube callback |
| GET | `/api/oauth/facebook/authorize` | JWT | Facebook OAuth URL |
| GET | `/api/oauth/facebook/callback` | No | Facebook callback |
| GET | `/api/oauth/instagram/authorize` | JWT | Instagram OAuth URL |
| GET | `/api/oauth/instagram/callback` | No | Instagram callback |

### Posts (10)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/posts/generate-caption` | JWT | AI caption generation |
| POST | `/api/posts` | JWT | Create post |
| GET | `/api/posts` | JWT | List posts |
| POST | `/api/posts/batch-publish` | JWT | Batch publish |
| POST | `/api/posts/:id/publish` | JWT | Publish post |
| POST | `/api/posts/:id/retry` | JWT | Retry failed post |
| GET | `/api/posts/:id/publish-progress` | No | Publish progress (SSE-ready) |
| GET | `/api/posts/scheduled/summary` | No | Scheduled summary |
| PUT | `/api/posts/:id/reschedule` | JWT | Reschedule post |
| DELETE | `/api/posts/:id` | JWT | Delete post |

### Videos (5)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/videos/upload` | JWT | Upload video |
| GET | `/api/videos` | JWT | List videos |
| GET | `/api/videos/:id` | JWT | Get video |
| GET | `/api/videos/:id/stream` | JWT | Stream video |
| DELETE | `/api/videos/:id` | JWT | Delete video |

### Drive (10)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/drive/auth` | JWT | Drive OAuth |
| GET | `/api/drive/callback` | No | Drive callback |
| GET | `/api/drive/status` | JWT | Connection status |
| POST | `/api/drive/disconnect` | JWT | Disconnect |
| GET | `/api/drive/folders` | JWT | List folders |
| GET | `/api/drive/files` | JWT | List files |
| POST | `/api/drive/import` | JWT | Import single video |
| POST | `/api/drive/import/batch` | JWT | Batch import |
| POST | `/api/drive/import/multiple` | JWT | Alias batch import |
| GET | `/api/drive/files/:fileId/metadata` | JWT | File metadata |

### Accounts (3)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/accounts` | JWT | List accounts |
| POST | `/api/accounts/connect` | JWT | Connect account |
| DELETE | `/api/accounts/:id` | JWT | Disconnect account |

### Analytics (6)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/analytics` | JWT | Summary |
| GET | `/api/analytics/top` | JWT | Top performing |
| GET | `/api/analytics/posts/:postId` | JWT | Post analytics |
| POST | `/api/analytics/posts/:postId/sync` | JWT | Sync analytics |
| GET | `/api/analytics/best-times` | JWT | Best posting times |
| GET | `/api/analytics/insights` | JWT | Insights |

### Sheets (2)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/sheets/preview` | JWT | Preview sheet |
| POST | `/api/sheets/import` | JWT | Import from sheet |

### Clips (1)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/clip` | JWT | Clip video |

### Health (1)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | No | Health check |

---

## Database — PostgreSQL (Prisma)

### Models
- **User** — id, email, password, name, brandName, industry, onboardingComplete, defaultLanguage, defaultPrivacy
- **SocialAccount** — platform (IG/FB/YT/Twitter/LinkedIn/Drive), OAuth tokens, status
- **Video** — multi-format URLs (IG reel/feed, YT shorts/video/square, FB square/landscape), tags, category
- **Post** — caption, language (6 languages), hashtags, platform, postType, status lifecycle, scheduling
- **Analytics** — views, likes, comments, shares, saves, engagement, reach, impressions, watchTime
- **Job** — async job tracking (video processing, publishing, analytics collection)

### Enums
- Platform: INSTAGRAM, FACEBOOK, YOUTUBE, TWITTER, LINKEDIN, GOOGLE_DRIVE
- PostStatus: DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, DELETED
- PostLanguage: ENGLISH, HINGLISH, HARYANVI, HINDI, RAJASTHANI, BHOJPURI
- PostType: FEED, STORY, REEL, SHORT, VIDEO, CAROUSEL

---

## Environment Variables

### Backend (backend-nestjs/.env)
```
DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRY, FRONTEND_URL, PORT,
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET,
YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI,
INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI,
FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_REDIRECT_URI,
GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI,
ANTHROPIC_API_KEY, LOG_LEVEL
```

### Frontend (frontend/.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_MAX_UPLOAD_SIZE=1073741824
```

---

## Third-Party Integrations
- **Instagram** — Facebook Graph API v18.0 (Container → Poll → Publish flow)
- **YouTube** — Google APIs (googleapis) with resumable upload + progress
- **Facebook** — Graph API v18.0 (simple < 25MB, resumable > 25MB)
- **Google Drive** — googleapis (folder browse, video import)
- **AWS S3** — Video/media storage with signed URLs
- **Anthropic Claude** — AI caption generation (6 languages, template fallback)
- **FFmpeg** — Video transcoding, format conversion, clipping
- **Bull/Redis** — 3 job queues (video-processing, post-publishing, analytics-sync)

---

## Frontend Architecture
- **Framework:** Next.js 14 App Router
- **State:** Zustand (auth + theme stores, localStorage persisted)
- **Data Fetching:** React Query (60s stale time)
- **HTTP Client:** Axios with JWT interceptor + 401 auto-redirect
- **Styling:** Tailwind CSS + shadcn/ui components
- **Auth:** JWT token in Zustand → Axios interceptor → ProtectedRoute wrapper

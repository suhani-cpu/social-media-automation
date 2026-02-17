# Stage OTT Social Media Automation Platform
## Comprehensive Project Briefing

**Date:** January 31, 2026
**Status:** Development Phase - Core Features Complete
**Team:** Project Manager | Solution Architect | UX/UI Designer

---

## 🎯 Executive Summary

Stage OTT Social Media Automation Platform is a comprehensive web application that enables content creators to automate video uploads and social media posting across Instagram, YouTube, and Facebook. The platform includes integrated video editing capabilities for creating platform-specific content formats.

### Project Objectives
1. Automate social media posting workflow for Stage OTT video content
2. Support multiple platforms (Instagram, YouTube, Facebook)
3. Generate AI-powered captions in 4 languages
4. Process videos for platform-specific formats
5. Enable video clipping and editing within the platform
6. Schedule posts across all platforms

---

## 📊 FOR PROJECT MANAGER

### Project Timeline & Status

#### ✅ Completed Phases

**Phase 1: Foundation (Completed)**
- Authentication system (JWT-based)
- Database schema with Prisma ORM
- User management
- API infrastructure with Express + TypeScript

**Phase 2: Core Features (Completed)**
- Video upload system (500MB limit)
- Instagram posting integration
- AI caption generation (4 languages: English, Hinglish, Haryanvi, Hindi)
- Post management (draft, scheduled, published states)
- Caption variations (3 per video)

**Phase 3: Frontend Dashboard (Completed)**
- Next.js 14 App Router architecture
- React 18.2 with TypeScript
- Stage OTT red/black branded theme
- Responsive design with TailwindCSS
- Authentication flow
- Dashboard overview
- Video library management
- Post creation wizard
- Calendar view for scheduled posts
- Analytics dashboard

**Phase 4: Video Editing Integration (Just Completed)**
- Video-cutter integration (ASHISH-KUMAR-PANDEY project)
- FFmpeg-based video processing
- Clip extraction (up to 10 minutes)
- Aspect ratio conversion (9:16, 1:1, 16:9)
- Caption overlay system
- Logo branding overlay
- Video framing and padding

#### 🚧 In Progress / Pending

**Backend Services (70% Complete)**
- ✅ Instagram posting - COMPLETE
- ✅ Caption generation - COMPLETE
- ✅ Video cutting/editing - COMPLETE
- ⚠️ YouTube posting - API setup needed
- ⚠️ Facebook posting - API setup needed
- ⚠️ Video processing (platform formats) - Needs FFmpeg setup
- ⚠️ Analytics sync - Requires platform API integration
- ⚠️ Scheduler service - Cron jobs initialized but needs testing
- ⚠️ OAuth flows - YouTube and Facebook authentication pending

**Infrastructure**
- ⚠️ FFmpeg installation required for video processing
- ⚠️ S3/Cloud storage for production (currently using /tmp)
- ⚠️ Redis setup for queue management
- ⚠️ Production deployment configuration

### Current Sprint Status

**Sprint Goal:** Video editing integration + platform-specific processing

**Completed This Sprint:**
- Video-cutter backend services integration
- Video editor UI component
- Clip API endpoint
- Aspect ratio processing
- Caption overlay system
- Logo overlay system

**Blockers:**
1. **FFmpeg not installed** - Blocking video processing features
2. **YouTube API credentials** - Needed for YouTube posting
3. **Facebook API credentials** - Needed for Facebook posting
4. **Storage solution** - Need production storage (S3/CloudFront)

### Resource Requirements

**Immediate Needs:**
1. FFmpeg installation on server
2. YouTube API access (OAuth 2.0 credentials)
3. Facebook API access (App ID + Secret)
4. AWS account for S3 storage
5. SSL certificates for production

**Technical Debt:**
- Video storage in /tmp (not persistent)
- No automated testing suite
- Missing error monitoring (Sentry/DataDog)
- No CI/CD pipeline
- Security audit pending

### Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| FFmpeg not available | HIGH | HIGH | Install immediately, add to deployment docs |
| API rate limits | MEDIUM | MEDIUM | Implement queue delays, monitoring |
| Video storage costs | MEDIUM | LOW | Set up S3 lifecycle policies |
| Token expiry issues | LOW | MEDIUM | Auto-refresh cron job in place |

### Next Milestones

**Week 1-2:**
- Install and configure FFmpeg
- Set up YouTube API integration
- Set up Facebook API integration
- Test end-to-end video posting workflow

**Week 3-4:**
- Implement S3 storage migration
- Set up Redis for queue management
- Build automated test suite
- Deploy to staging environment

**Month 2:**
- Production deployment
- User acceptance testing
- Performance optimization
- Documentation completion

---

## 🏗️ FOR SOLUTION ARCHITECT

### System Architecture Overview

#### Technology Stack

**Backend:**
- **Runtime:** Node.js v22.13.1
- **Framework:** Express.js 4.18.2
- **Language:** TypeScript 5.x
- **ORM:** Prisma (PostgreSQL)
- **Authentication:** JWT (jsonwebtoken)
- **File Upload:** Multer
- **Video Processing:** fluent-ffmpeg 2.1.2
- **Queue System:** Bull (Redis-backed)
- **Scheduling:** node-cron
- **API Clients:** Axios

**Frontend:**
- **Framework:** Next.js 14.2.35 (App Router)
- **Language:** TypeScript 5.x
- **UI Library:** React 18.2.0
- **Styling:** TailwindCSS 3.x
- **Component Library:** shadcn/ui (Radix UI primitives)
- **State Management:**
  - Zustand (client state + auth)
  - React Query (server state)
- **Form Handling:** React Hook Form + Zod validation
- **Build Tool:** Vite 5.0.0

**Database:**
- **Primary:** PostgreSQL (Prisma ORM)
- **Schema:** 8 main entities (User, Video, Post, SocialAccount, Caption, Analytics, Hashtag, PostHashtag)

**External Services:**
- Instagram Graph API
- YouTube Data API v3 (pending setup)
- Facebook Graph API (pending setup)
- AI Caption Generation (custom implementation)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Dashboard  │  │Video Library │  │ Post Manager │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Video Editor  │  │   Calendar   │  │  Analytics   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY (Express)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Middleware Layer                               │  │
│  │  [Auth] [CORS] [Rate Limit] [Validation] [Security]  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Auth API   │   │  Video API   │   │   Post API   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Caption   │  │Video Proc  │  │  Social    │           │
│  │ Generator  │  │(FFmpeg)    │  │ Publishing │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Scheduler │  │  Analytics │  │   Queue    │           │
│  │   (Cron)   │  │    Sync    │  │  Manager   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │    Redis     │   │  File System │
│   (Prisma)   │   │   (Queue)    │   │   (/tmp)     │
└──────────────┘   └──────────────┘   └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Instagram   │   │   YouTube    │   │   Facebook   │
│  Graph API   │   │  Data API    │   │  Graph API   │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Database Schema

**Core Entities:**

```prisma
model User {
  id            String          @id @default(uuid())
  email         String          @unique
  password      String
  name          String
  videos        Video[]
  socialAccounts SocialAccount[]
  posts         Post[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model Video {
  id              String    @id @default(uuid())
  userId          String
  title           String
  rawVideoUrl     String    // Original upload
  originalUrl     String?   // S3 processed
  instagramUrl    String?   // 9:16 format
  youtubeUrl      String?   // 16:9 format
  facebookUrl     String?   // 1:1 format
  status          VideoStatus // PENDING, PROCESSING, READY, FAILED
  user            User      @relation(fields: [userId], references: [id])
  posts           Post[]
  captions        Caption[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Post {
  id              String      @id @default(uuid())
  userId          String
  videoId         String
  accountId       String
  caption         String
  hashtags        String[]
  language        Language    // ENGLISH, HINGLISH, HARYANVI, HINDI
  platform        Platform    // INSTAGRAM, YOUTUBE, FACEBOOK
  postType        PostType    // REEL, FEED, SHORT, VIDEO, SQUARE, LANDSCAPE
  status          PostStatus  // DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED
  scheduledFor    DateTime?
  publishedAt     DateTime?
  platformPostId  String?
  platformUrl     String?
  user            User        @relation(fields: [userId], references: [id])
  video           Video       @relation(fields: [videoId], references: [id])
  account         SocialAccount @relation(fields: [accountId], references: [id])
  analytics       Analytics[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model SocialAccount {
  id              String      @id @default(uuid())
  userId          String
  platform        Platform
  accountName     String
  accessToken     String
  refreshToken    String?
  tokenExpiresAt  DateTime?
  isActive        Boolean     @default(true)
  user            User        @relation(fields: [userId], references: [id])
  posts           Post[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Analytics {
  id          String    @id @default(uuid())
  postId      String
  views       Int       @default(0)
  likes       Int       @default(0)
  comments    Int       @default(0)
  shares      Int       @default(0)
  engagement  Float     @default(0)
  post        Post      @relation(fields: [postId], references: [id])
  syncedAt    DateTime  @default(now())
}
```

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

**Videos:**
- `POST /api/videos/upload` - Upload video (multipart/form-data, max 500MB)
- `GET /api/videos` - List all user videos
- `GET /api/videos/:id` - Get single video
- `DELETE /api/videos/:id` - Delete video

**Video Editing (NEW):**
- `POST /api/clip` - Cut and edit video
  ```json
  {
    "videoUrl": "https://...",
    "startSeconds": 0,
    "endSeconds": 60,
    "framing": {
      "aspectRatio": "9:16",
      "paddingColor": "#000000",
      "topCaption": "Stage OTT",
      "bottomCaption": "Subscribe Now",
      "captionFontSize": 32,
      "captionColor": "#ffffff",
      "includeLogo": true,
      "logoX": 85,
      "logoY": 15,
      "logoScale": 0.15
    }
  }
  ```

**Captions:**
- `POST /api/videos/:id/captions` - Generate captions
- `GET /api/videos/:id/captions` - Get caption variations

**Posts:**
- `POST /api/posts` - Create post
- `GET /api/posts` - List all posts (with filters)
- `GET /api/posts/:id` - Get single post
- `PUT /api/posts/:id` - Update post
- `POST /api/posts/:id/publish` - Publish post immediately
- `DELETE /api/posts/:id` - Delete post

**Accounts:**
- `GET /api/accounts` - List connected accounts
- `POST /api/accounts` - Add social account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Remove account

**Analytics:**
- `GET /api/analytics` - Get analytics data (with date range)

### Security Architecture

**Authentication Flow:**
1. User logs in with email/password
2. Backend validates credentials against bcrypt hash
3. JWT token generated (7-day expiry)
4. Token stored in Zustand + localStorage (client)
5. Token sent in Authorization header for all API requests
6. Middleware validates token on protected routes

**Security Measures:**
- Helmet.js for HTTP headers
- CORS whitelist for origins
- Rate limiting (Redis-backed):
  - Global: 100 requests/15min
  - Auth: 5 requests/15min
  - Upload: 10 requests/hour
- Input sanitization on all routes
- SQL injection prevention (Prisma ORM)
- Password hashing (bcrypt, 10 rounds)
- JWT token expiration

### Video Processing Pipeline

```
1. Upload
   ↓
[User uploads video via frontend]
   ↓
[Multer receives file, stores in /tmp/uploads]
   ↓
[Video record created in DB with status: PENDING]

2. Processing (TODO - needs implementation)
   ↓
[Queue job triggered for video processing]
   ↓
[FFmpeg processes video into 6 formats]
   ├── Instagram Reel (1080x1920, 9:16)
   ├── Instagram Feed (1080x1080, 1:1)
   ├── YouTube Shorts (1080x1920, 9:16)
   ├── YouTube Video (1920x1080, 16:9)
   ├── Facebook Square (1080x1080, 1:1)
   └── Facebook Landscape (1920x1080, 16:9)
   ↓
[Generate 3 thumbnails at 1s, 3s, 5s]
   ↓
[Upload all files to S3]
   ↓
[Update Video record with URLs, status: READY]

3. Editing (NEW - Video Cutter)
   ↓
[User selects video for editing]
   ↓
[Video Editor UI loads with preview]
   ↓
[User sets clip range, aspect ratio, captions]
   ↓
[POST to /api/clip endpoint]
   ↓
[FFmpeg processes clip with options]
   ├── Cut video segment
   ├── Apply aspect ratio padding
   ├── Add text overlays (top/bottom)
   └── Add logo overlay
   ↓
[Stream processed video back to client]
   ↓
[Client downloads edited video]
```

### Scalability Considerations

**Current Limitations:**
- Single-server architecture
- File storage in /tmp (not persistent)
- No load balancing
- No CDN for video delivery
- Synchronous video processing

**Recommended Improvements:**
1. **Horizontal Scaling:**
   - Separate API servers from worker servers
   - Use Redis for session management
   - Implement sticky sessions for uploads

2. **Storage:**
   - Migrate to S3 for video storage
   - Use CloudFront CDN for delivery
   - Implement S3 lifecycle policies (delete after 30 days)

3. **Queue System:**
   - Implement Bull queues with Redis
   - Separate workers for:
     - Video processing
     - Caption generation
     - Social media publishing
     - Analytics sync
   - Auto-scaling based on queue depth

4. **Database:**
   - Add read replicas for analytics queries
   - Implement connection pooling
   - Add database indexes for common queries

5. **Caching:**
   - Redis for API responses
   - CDN for static assets
   - Browser caching headers

### Technical Debt & Recommendations

**High Priority:**
1. ⚠️ **FFmpeg Installation** - Critical for video processing
2. ⚠️ **S3 Migration** - /tmp storage not production-ready
3. ⚠️ **OAuth Implementation** - YouTube and Facebook auth incomplete
4. ⚠️ **Testing Suite** - Zero test coverage currently

**Medium Priority:**
5. Error monitoring (Sentry integration)
6. Logging infrastructure (Winston + CloudWatch)
7. CI/CD pipeline (GitHub Actions)
8. Database migrations in production
9. API documentation (Swagger/OpenAPI)

**Low Priority:**
10. WebSocket for real-time updates
11. Email notifications
12. Multi-user collaboration
13. A/B testing for captions
14. Advanced analytics dashboard

### Infrastructure Requirements

**Development:**
- Node.js 22+
- PostgreSQL 14+
- Redis 7+ (for queues)
- FFmpeg 6+ (for video processing)

**Production:**
- AWS/GCP/Azure account
- S3-compatible storage (100GB initial)
- Database: PostgreSQL (RDS or equivalent)
- Cache: Redis (ElastiCache or equivalent)
- Compute: 2x t3.medium instances minimum
- CDN: CloudFront or equivalent
- SSL certificates
- Domain name

**Estimated Monthly Costs:**
- Compute: $50-100 (2 instances)
- Database: $30-50 (managed PostgreSQL)
- Storage: $20-50 (depending on video volume)
- CDN: $10-30 (bandwidth)
- Redis: $20-30 (managed cache)
**Total: $130-260/month**

---

## 🎨 FOR UX/UI DESIGNER

### Design System

**Brand Identity:**
- **Primary Brand:** Stage OTT
- **Color Palette:**
  - Primary Red: `#DC2626` (HSL: 0 84% 55%)
  - Background Dark: `#0A0A0A` (HSL: 0 0% 7%)
  - Card Dark: `#1A1A1A` (HSL: 0 0% 10%)
  - Text Light: `#F5F5F5` (HSL: 0 0% 95%)
  - Muted: `#737373` (HSL: 0 0% 45%)

**Typography:**
- **Font Family:** System fonts (Inter-like)
- **Heading Sizes:**
  - H1: 2.25rem (36px) - Page titles
  - H2: 1.875rem (30px) - Section titles
  - H3: 1.5rem (24px) - Card titles
- **Body:** 0.875rem (14px) - Regular text
- **Small:** 0.75rem (12px) - Captions, labels

**Spacing System:**
- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Consistent padding/margins across components

### Current UI Components

**Implemented Components:**

1. **Navigation:**
   - Sidebar (fixed, 256px wide)
   - Stage OTT logo with gradient
   - Active state highlighting (red background)
   - Icons from Lucide React

2. **Header:**
   - Welcome message with user name (red highlight)
   - User info display
   - Logout button

3. **Cards:**
   - Dark background (`#1A1A1A`)
   - Subtle border
   - Rounded corners (8px)
   - Shadow on hover

4. **Buttons:**
   - Primary: Red background, white text
   - Secondary: Outlined
   - Ghost: Transparent background
   - Icon buttons for actions
   - Disabled states

5. **Forms:**
   - Input fields with borders
   - Label above input
   - Error messages below
   - Validation indicators
   - File upload with drag-drop

6. **Data Display:**
   - Stat cards (total videos, posts, etc.)
   - Empty states with helpful messages
   - Loading states
   - Tabs for filtering

7. **Video Editor (NEW):**
   - Video player with custom controls
   - Timeline scrubber
   - Time input fields
   - Aspect ratio selector
   - Caption input fields
   - Color pickers
   - Checkbox for logo toggle
   - Action buttons (Process & Download)

### User Flows

**1. Registration & Login Flow:**
```
Landing → Login Page → Enter Credentials → Dashboard
                ↓
         Register Link → Registration Form → Auto-login → Dashboard
```

**2. Video Upload Flow:**
```
Dashboard → Videos → Upload Video Button → Upload Page
   ↓
Drag & Drop or Select File → Enter Title → Upload
   ↓
Processing Status (Pending → Processing → Ready)
   ↓
Video appears in library
```

**3. Video Editing Flow (NEW):**
```
Videos Library → Select Video → Edit Button → Editor Page
   ↓
Preview Video → Set Clip Range → Choose Aspect Ratio
   ↓
Add Captions → Toggle Logo → Customize Colors
   ↓
Process & Download → Download Starts → Back to Library
```

**4. Post Creation Flow:**
```
Dashboard → Posts → Create Post → 5-Step Wizard
   ↓
Step 1: Select Video (from library)
   ↓
Step 2: Generate Caption (choose language, get 3 variations)
   ↓
Step 3: Select Platforms (Instagram/YouTube/Facebook + accounts)
   ↓
Step 4: Schedule (choose date/time or publish now)
   ↓
Step 5: Review & Confirm
   ↓
Post Created → Appears in queue
```

**5. Analytics Flow:**
```
Dashboard → Analytics → View Metrics
   ↓
Select Date Range → View Charts
   ↓
Filter by Platform → View Details
   ↓
Export Report (future feature)
```

### Screen Inventory

**Authentication Screens:**
1. `/login` - Login form with Stage OTT branding
2. `/register` - Registration form

**Dashboard Screens:**
3. `/dashboard` - Overview with stats and quick actions
4. `/dashboard/videos` - Video library grid
5. `/dashboard/videos/upload` - Video upload interface
6. `/dashboard/videos/edit/[id]` - Video editor (NEW)
7. `/dashboard/posts` - Post queue with tabs
8. `/dashboard/posts/create` - Post creation wizard
9. `/dashboard/calendar` - Calendar view of scheduled posts
10. `/dashboard/accounts` - Social media account management
11. `/dashboard/analytics` - Performance metrics
12. `/dashboard/settings` - User settings

### Responsive Design

**Breakpoints:**
- Mobile: 0-640px
- Tablet: 641-1024px
- Desktop: 1025px+

**Mobile Considerations:**
- Sidebar collapses to hamburger menu
- Video player adjusts to screen width
- Form fields stack vertically
- Cards in single column
- Reduced padding on small screens

### Accessibility

**Current Implementation:**
- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Alt text on images (where applicable)

**Improvements Needed:**
- Screen reader testing
- Color contrast validation (WCAG AA)
- Keyboard shortcuts documentation
- Skip navigation links
- Form error announcements

### Design Patterns

**Empty States:**
```
[Icon]
No items yet
Helpful message explaining next steps
[Call-to-action button]
```

**Loading States:**
- Skeleton screens for content
- Spinner for actions
- Progress bars for uploads
- Status badges for processing

**Error States:**
- Destructive color (red)
- Clear error message
- Suggested action
- Dismiss option

**Success States:**
- Green check icon
- Success message
- Auto-dismiss after 3 seconds
- Optional action button

### Component Library Locations

All UI components are in:
```
/frontend/src/components/ui/
├── button.tsx
├── card.tsx
├── input.tsx
├── label.tsx
├── progress.tsx
├── select.tsx (NEW)
├── stepper.tsx
└── tabs.tsx
```

Custom components:
```
/frontend/src/components/
├── layout/
│   ├── Header.tsx
│   └── Sidebar.tsx
├── video/
│   ├── VideoUploader.tsx
│   └── VideoEditor.tsx (NEW)
└── post/
    ├── VideoSelector.tsx
    ├── CaptionGenerator.tsx
    ├── PlatformSelector.tsx
    ├── ScheduleSelector.tsx
    └── PostReview.tsx
```

### Design Improvements Needed

**High Priority:**
1. **Video Library Cards** - Currently just a placeholder
   - Need thumbnail previews
   - Status badges (Pending/Processing/Ready)
   - Duration display
   - Action menu (Edit/Delete)
   - Hover states

2. **Post Queue Cards**
   - Thumbnail preview
   - Platform icons
   - Status indicators
   - Scheduled time display
   - Quick actions (Edit/Delete/Duplicate)

3. **Calendar View**
   - Month/Week/Day toggle
   - Event color coding by platform
   - Drag-and-drop rescheduling
   - Event details on hover

4. **Analytics Charts**
   - Line charts for trends
   - Pie charts for platform breakdown
   - Bar charts for comparisons
   - Date range picker

**Medium Priority:**
5. Video editor timeline enhancement
6. Drag-and-drop for logo positioning
7. Real-time caption preview
8. Mobile-optimized video player
9. Dark/light theme toggle

**Low Priority:**
10. Animation and transitions
11. Micro-interactions
12. Easter eggs
13. Custom illustrations

### UX Pain Points to Address

**Current Issues:**
1. ⚠️ No feedback when videos are processing
2. ⚠️ Upload progress not real-time
3. ⚠️ No preview before publishing post
4. ⚠️ No bulk actions for posts
5. ⚠️ No undo functionality
6. ⚠️ No drafts auto-save

**Recommended Solutions:**
1. Add WebSocket for real-time processing updates
2. Implement chunked upload with progress
3. Add post preview modal with platform mockups
4. Add checkbox selection + bulk action bar
5. Add undo toast notifications
6. Implement auto-save with visual indicator

### Figma/Design Files

**Not Yet Created - Recommended Structure:**
```
Stage OTT Design System
├── 01. Brand Guidelines
│   ├── Logo usage
│   ├── Color palette
│   ├── Typography
│   └── Iconography
├── 02. Components
│   ├── Atoms (buttons, inputs, etc.)
│   ├── Molecules (cards, forms, etc.)
│   └── Organisms (navigation, editors, etc.)
├── 03. Templates
│   ├── Authentication
│   ├── Dashboard layouts
│   └── Content management
└── 04. Prototypes
    ├── User onboarding
    ├── Video upload flow
    └── Post creation flow
```

---

## 🚀 Deployment & Environment

### Environment Variables

**Backend (.env):**
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/social_media

# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Auth
JWT_SECRET=your-super-secret-key-change-in-production

# File Upload
UPLOAD_DIR=/tmp/social-media-uploads
MAX_FILE_SIZE=524288000

# Instagram
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret

# YouTube (Pending)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback

# Facebook (Pending)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback

# AWS S3 (Pending)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=us-east-1

# Redis (Pending)
REDIS_URL=redis://localhost:6379

# OpenAI (for caption generation)
OPENAI_API_KEY=your-openai-key
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_MAX_UPLOAD_SIZE=524288000
```

### Getting Started

**Prerequisites:**
```bash
# Install Node.js 22+
# Install PostgreSQL 14+
# Install Redis (optional for now)
# Install FFmpeg (critical for video editing)
```

**Setup:**
```bash
# Clone repository
git clone <repo-url>
cd social-media-automation

# Backend setup
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000/api
- Health Check: http://localhost:3000/health

### API Documentation

Full API documentation needs to be created with Swagger/OpenAPI.

**Postman Collection:** Should be created with:
- All endpoints
- Sample requests
- Sample responses
- Authentication examples

---

## 📈 Metrics & KPIs

**User Engagement:**
- Daily active users
- Videos uploaded per day
- Posts created per day
- Posts published per day

**System Performance:**
- Video processing time
- API response time (p50, p95, p99)
- Upload success rate
- Publishing success rate

**Business Metrics:**
- User growth rate
- Retention rate (Day 7, Day 30)
- Platform adoption (Instagram vs YouTube vs Facebook)
- Average posts per user

---

## 📚 Documentation Links

**Repository Structure:**
```
social-media-automation/
├── backend/              # Express API
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   │   ├── video-cutting/  # NEW
│   │   └── utils/       # Helper functions
│   ├── prisma/          # Database schema
│   └── tests/           # Backend tests
├── frontend/            # Next.js app
│   └── src/
│       ├── app/         # App Router pages
│       │   ├── (auth)/
│       │   └── (dashboard)/
│       ├── components/  # React components
│       │   ├── ui/      # shadcn components
│       │   ├── layout/
│       │   ├── video/   # Video components
│       │   └── post/    # Post components
│       └── lib/         # Utilities
│           ├── api/     # API client
│           ├── store/   # Zustand stores
│           └── types/   # TypeScript types
├── temp/                # Temporary video files
└── uploads/             # Uploaded files
```

**Key Files:**
- `/backend/prisma/schema.prisma` - Database schema
- `/backend/src/app.ts` - Express app setup
- `/frontend/src/app/layout.tsx` - App layout
- `/frontend/src/lib/api/client.ts` - API client

---

## 🎯 Success Criteria

**Definition of Done:**
- [ ] FFmpeg installed and configured
- [ ] All platform APIs (Instagram/YouTube/Facebook) connected
- [ ] Video processing working for all formats
- [ ] S3 storage configured
- [ ] Automated tests with 70%+ coverage
- [ ] Performance optimized (API <200ms, video processing <2min)
- [ ] Deployed to production
- [ ] User documentation complete
- [ ] Monitoring and alerting active

**Launch Checklist:**
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Backup strategy implemented
- [ ] Rollback plan documented
- [ ] Support process defined
- [ ] Marketing materials ready

---

## 🤝 Team Contacts & Resources

**GitHub Repository:** [To be added]
**Project Management:** [To be added]
**Design Files:** [To be added]
**Deployment:** [To be added]

**Support Channels:**
- Technical Issues: [Slack/Discord channel]
- Design Questions: [Design team contact]
- Business Questions: [PM contact]

---

## 📝 Change Log

**v1.0.0 - January 31, 2026**
- Initial platform with Instagram posting
- Caption generation (4 languages)
- Video upload system
- Frontend dashboard
- Video-cutter integration

**Upcoming - v1.1.0**
- YouTube integration
- Facebook integration
- S3 storage migration
- Automated testing

---

**Last Updated:** January 31, 2026
**Document Version:** 1.0
**Status:** Active Development

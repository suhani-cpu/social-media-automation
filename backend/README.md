# Social Media Automation Backend

Express.js + TypeScript backend API for social media automation platform.

## Features

- RESTful API with Express.js
- PostgreSQL database with Prisma ORM
- JWT authentication
- Bull queue for background jobs
- S3 video storage
- FFmpeg video processing
- Multi-platform publishing (Instagram, YouTube, Facebook)
- Rate limiting and security middleware
- Automated analytics sync

## Project Structure

```
backend/
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── video.controller.ts
│   │   ├── post.controller.ts
│   │   ├── account.controller.ts
│   │   └── analytics.controller.ts
│   ├── services/          # Business logic
│   │   ├── video-processing/  # FFmpeg transcoding
│   │   ├── storage/           # S3 operations
│   │   ├── social-media/      # Platform integrations
│   │   │   ├── instagram/
│   │   │   ├── youtube/
│   │   │   └── facebook/
│   │   ├── scheduler/         # Cron jobs
│   │   ├── analytics/         # Metrics sync
│   │   └── queue/             # Job processors
│   ├── routes/            # API routes
│   ├── middleware/        # Auth, security, validation
│   ├── config/            # Configuration
│   ├── workers/           # Queue workers
│   ├── prisma/            # Database schema
│   ├── app.ts             # Express app setup
│   └── server.ts          # Server entry point
├── Dockerfile
├── .eslintrc.json
├── .prettierrc
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- FFmpeg
- AWS S3 bucket

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/social_media

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=social-media-automation
AWS_REGION=us-east-1

# Instagram
INSTAGRAM_ACCESS_TOKEN=your-instagram-token

# YouTube OAuth
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback

# Facebook OAuth
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback

# Logging
LOG_LEVEL=info

# Upload
UPLOAD_DIR=/app/uploads
```

### Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio (optional)
npx prisma studio
```

### Development

```bash
# Start API server
npm run dev

# Start queue worker (separate terminal)
npm run worker:dev

# Build for production
npm run build

# Start production server
npm start

# Start production worker
npm run worker
```

## Available Scripts

```bash
# Development
npm run dev              # Start API server with hot reload
npm run worker:dev       # Start queue worker with hot reload

# Production
npm run build            # Compile TypeScript to JavaScript
npm start                # Start production API server
npm run worker           # Start production queue worker

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio

# Code Quality
npm run lint             # Lint code with ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # TypeScript type checking
```

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Videos

#### Upload Video
```http
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

video: <file> (max 500MB)
title: "My Video"
language?: "ENGLISH" | "HINGLISH" | "HARYANVI" | "HINDI"
```

#### List Videos
```http
GET /api/videos?status=READY&limit=20&offset=0
Authorization: Bearer <token>
```

#### Get Video
```http
GET /api/videos/:id
Authorization: Bearer <token>
```

#### Delete Video
```http
DELETE /api/videos/:id
Authorization: Bearer <token>
```

### Posts

#### Generate Caption
```http
POST /api/posts/generate-caption
Authorization: Bearer <token>
Content-Type: application/json

{
  "videoId": "video-uuid",
  "language": "ENGLISH"
}
```

Response: Array of 3 caption variations

#### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "videoId": "video-uuid",
  "accountId": "account-uuid",
  "platform": "INSTAGRAM",
  "postType": "REEL",
  "caption": "Check out this amazing video!",
  "scheduledFor": "2026-01-30T10:00:00Z"
}
```

#### Publish Post
```http
POST /api/posts/:id/publish
Authorization: Bearer <token>
```

### Rate Limits

- **General API**: 100 requests / 15 minutes
- **Auth endpoints**: 5 requests / 15 minutes (with skipSuccessfulRequests)
- **Upload endpoint**: 10 requests / hour
- **Caption generation**: 20 requests / hour
- **Analytics endpoints**: 30 requests / 15 minutes

## Queue System

### Video Processing Queue

Jobs:
- `process-video` - Transcode video to 6 platform formats
- `generate-thumbnails` - Create 3 thumbnails

Configuration:
- 3 retry attempts with exponential backoff
- Priority support (higher priority = processed first)

### Post Publishing Queue

Jobs:
- `publish-instagram` - Publish to Instagram
- `publish-youtube` - Upload to YouTube
- `publish-facebook` - Post to Facebook

### Analytics Sync Queue

Jobs:
- `sync-analytics` - Fetch metrics from all platforms
- Runs every 6 hours via cron

## Video Processing

### Supported Input Formats
- MP4, MOV, AVI, WEBM
- Max file size: 500MB

### Output Formats

1. **Instagram Reel**: 1080x1920, 9:16, H.264, AAC
2. **Instagram Feed**: 1080x1080, 1:1, H.264, AAC
3. **YouTube Short**: 1080x1920, 9:16, H.264, AAC
4. **YouTube Video**: 1920x1080, 16:9, H.264, AAC
5. **Facebook Square**: 1080x1080, 1:1, H.264, AAC
6. **Facebook Landscape**: 1920x1080, 16:9, H.264, AAC

### Processing Pipeline

1. Upload to S3 (`videos/raw/`)
2. Queue processing job
3. FFmpeg transcodes to all formats
4. Upload processed videos to S3 (`videos/processed/`)
5. Generate 3 thumbnails (1s, 3s, 5s marks)
6. Update Video record with URLs
7. Set status to READY

## Security

### Implemented Measures

- **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS**: Whitelist frontend origin
- **Rate Limiting**: Per-endpoint limits with Redis
- **Input Sanitization**: Remove XSS vectors from user input
- **JWT**: Secure authentication with expiry
- **Prisma**: Parameterized queries (SQL injection prevention)
- **Validation**: Zod schemas for request validation

### Security Headers

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## Docker

### Build Image
```bash
docker build -t social-media-backend .
```

### Run Container
```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name backend \
  social-media-backend
```

## Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL
echo $DATABASE_URL

# Regenerate Prisma Client
npx prisma generate
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Verify REDIS_URL
echo $REDIS_URL
```

### FFmpeg Not Found
```bash
# Check FFmpeg installation
ffmpeg -version

# Install FFmpeg (Ubuntu)
sudo apt-get install ffmpeg

# Install FFmpeg (macOS)
brew install ffmpeg
```

### S3 Upload Fails
```bash
# Verify AWS credentials
aws s3 ls s3://your-bucket-name

# Check IAM permissions:
# - s3:PutObject
# - s3:GetObject
# - s3:DeleteObject
```

## Contributing

See root README.md for contribution guidelines.

## License

MIT

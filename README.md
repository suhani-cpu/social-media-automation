# Social Media Automation Platform

A comprehensive platform for automating social media content publishing across Instagram, YouTube, and Facebook. Built for Stage OTT content creators.

## Features

- **Multi-Platform Support**: Publish to Instagram (Reels/Feed), YouTube (Shorts/Videos), Facebook (Square/Landscape)
- **AI-Powered Captions**: Generate captions in 4 languages (English, Hinglish, Haryanvi, Hindi) with 3 variations
- **Video Processing**: Automatic transcoding to platform-specific formats (6 formats per video)
- **Scheduled Publishing**: Schedule posts with automated publishing via cron jobs
- **Analytics Dashboard**: Track performance metrics across all platforms
- **OAuth Integration**: Secure authentication with Instagram, YouTube, and Facebook
- **Cloud Storage**: S3 integration for persistent video storage
- **Queue System**: Bull + Redis for background job processing

## Tech Stack

### Backend
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Bull + Redis
- **Storage**: AWS S3
- **Video Processing**: FFmpeg
- **Security**: Helmet, express-rate-limit, JWT
- **APIs**: Instagram Graph API, YouTube Data API v3, Facebook Graph API

### Frontend
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State**: Zustand (client) + React Query (server)
- **Forms**: React Hook Form + Zod validation

## Project Structure

```
social-media-automation/
├── backend/              # Express.js API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic (video processing, social media, storage)
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth, security, rate limiting
│   │   ├── workers/      # Queue workers
│   │   ├── config/       # Configuration
│   │   └── prisma/       # Database schema
│   ├── Dockerfile
│   └── package.json
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # Pages (App Router)
│   │   ├── components/   # React components
│   │   └── lib/          # API client, types, store
│   ├── Dockerfile
│   └── package.json
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── .github/workflows/    # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- FFmpeg
- AWS S3 bucket
- Social media API credentials (Instagram, YouTube, Facebook)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd social-media-automation
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables**

   Backend `.env`:
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://user:password@localhost:5432/social_media
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-jwt-secret
   FRONTEND_URL=http://localhost:3001

   # AWS S3
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_S3_BUCKET=social-media-automation
   AWS_REGION=us-east-1

   # Instagram
   INSTAGRAM_ACCESS_TOKEN=your-token

   # YouTube
   YOUTUBE_CLIENT_ID=your-client-id
   YOUTUBE_CLIENT_SECRET=your-secret
   YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback

   # Facebook
   FACEBOOK_APP_ID=your-app-id
   FACEBOOK_APP_SECRET=your-secret
   FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback
   ```

   Frontend `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_PUBLIC_MAX_UPLOAD_SIZE=524288000
   ```

4. **Set up database**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Start development servers**
   ```bash
   # From root directory
   npm run dev

   # Or individually:
   # Backend: cd backend && npm run dev
   # Frontend: cd frontend && npm run dev
   # Queue Worker: cd backend && npm run worker:dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - API Health Check: http://localhost:3000/health

## Development

### Code Quality Tools

The project uses ESLint, Prettier, and Husky for code quality:

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npm run type-check
```

### Git Hooks

- **Pre-commit**: Runs ESLint + Prettier on staged files
- **Pre-push**: Runs type checking

### CI/CD Pipeline

GitHub Actions automatically runs on push/PR:
1. Lint & format check
2. Type checking
3. Build verification
4. Security audit

## Docker Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Videos
- `POST /api/videos/upload` - Upload video (max 500MB)
- `GET /api/videos` - List videos
- `GET /api/videos/:id` - Get video details
- `DELETE /api/videos/:id` - Delete video

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts` - List posts (filter by status, platform)
- `GET /api/posts/:id` - Get post details
- `POST /api/posts/:id/publish` - Publish post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/generate-caption` - Generate AI captions

### Accounts
- `POST /api/accounts` - Connect social media account
- `GET /api/accounts` - List connected accounts
- `DELETE /api/accounts/:id` - Disconnect account

### Analytics
- `GET /api/analytics` - Get aggregated analytics
- `GET /api/analytics/posts/:id` - Get post-specific analytics

## Video Processing Pipeline

1. **Upload**: User uploads video via frontend
2. **Storage**: Original video saved to S3 (`videos/raw/`)
3. **Queue**: Processing job added to Bull queue
4. **Transcode**: FFmpeg generates 6 platform-specific formats
   - Instagram Reel (1080x1920, 9:16)
   - Instagram Feed (1080x1080, 1:1)
   - YouTube Short (1080x1920, 9:16)
   - YouTube Video (1920x1080, 16:9)
   - Facebook Square (1080x1080, 1:1)
   - Facebook Landscape (1920x1080, 16:9)
5. **Thumbnails**: Generate 3 thumbnails (1s, 3s, 5s)
6. **Update**: Video status → READY, URLs stored in database

## Publishing Flow

1. **Create Post**: Select video, generate caption, choose platforms
2. **Schedule**: Set publish time or publish immediately
3. **Queue**: Scheduler checks every minute for due posts
4. **Publish**: Platform-specific service publishes video
5. **Track**: Store platform post ID and URL
6. **Analytics**: Sync metrics every 6 hours

## Rate Limits

- General API: 100 requests / 15 minutes
- Authentication: 5 requests / 15 minutes
- Upload: 10 requests / hour
- Caption Generation: 20 requests / hour
- Analytics: 30 requests / 15 minutes

## Security Features

- JWT authentication with httpOnly cookies
- Helmet.js security headers (CSP, HSTS, XSS protection)
- Input sanitization middleware
- CORS whitelist
- Rate limiting per endpoint
- Request validation with Zod
- SQL injection prevention (Prisma ORM)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use async/await instead of callbacks
- Write descriptive variable names
- Add JSDoc comments for complex functions
- Keep functions small and focused

## Troubleshooting

### Video processing fails
- Check FFmpeg installation: `ffmpeg -version`
- Verify S3 credentials and bucket access
- Check worker logs: `docker logs <worker-container>`

### Publishing fails
- Verify OAuth tokens are valid
- Check token expiry and refresh
- Review platform API rate limits
- Check platform-specific requirements

### Database connection errors
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Run migrations: `npx prisma migrate dev`

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

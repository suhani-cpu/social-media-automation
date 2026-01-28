# Analytics Service

Automated analytics syncing and aggregation for social media posts across Instagram, YouTube, and Facebook.

## Features

- **Automated Sync**: Cron job runs every 6 hours to sync analytics for recent posts (last 30 days)
- **Manual Sync**: Trigger sync for specific posts via API
- **Platform Support**: Instagram, YouTube, Facebook
- **Metrics Tracked**: Views, Likes, Comments, Shares, Engagement Rate
- **Historical Data**: Time-series analytics data stored daily
- **Aggregation**: Summary statistics across platforms and date ranges

## Architecture

```
┌─────────────────┐
│  Cron Job       │ Every 6 hours
│  (cron-jobs.ts) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Analytics      │ Queue sync jobs
│  Sync Queue     │ with delay spread
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Processor      │ Process one post at a time
│  (analytics-    │
│   sync.processor)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sync Service   │ Fetch data from platforms
│  (sync.ts)      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│Instagram│ │ YouTube │ │Facebook │
│Analytics│ │Analytics│ │Analytics│
└─────────┘ └─────────┘ └─────────┘
```

## Components

### 1. Sync Service (`sync.ts`)

Main service that coordinates analytics fetching and storage.

**Key Functions:**

- `syncPostAnalytics(postId)` - Sync analytics for a single post
- `syncMultiplePostsAnalytics(postIds)` - Sync multiple posts in parallel
- `getAnalyticsSummary(userId, startDate, endDate)` - Get aggregated analytics

### 2. Platform Analytics

Platform-specific analytics fetchers:

- **Instagram** (`instagram/analytics.ts`): Uses Facebook Graph API to fetch impressions, likes, comments
- **YouTube** (`youtube/analytics.ts`): Uses YouTube Data API to fetch views, likes, comments
- **Facebook** (`facebook/analytics.ts`): Uses Facebook Graph API to fetch video insights

### 3. Analytics Processor (`queue/analytics-sync.processor.ts`)

Background job processor that:
- Receives post IDs from the queue
- Calls `syncPostAnalytics()` for each post
- Handles errors gracefully (continues processing other posts)
- Retries failed jobs with exponential backoff

## Metrics Collected

| Metric | Description | All Platforms |
|--------|-------------|---------------|
| Views | Video views/impressions | ✅ |
| Likes | Like/reaction count | ✅ |
| Comments | Comment count | ✅ |
| Shares | Share/repost count | ✅ (Instagram limited) |
| Engagement Rate | (Likes + Comments + Shares) / Views * 100 | ✅ |

## Engagement Rate Calculation

```typescript
engagementRate = (likes + comments + shares) / views * 100
```

Example:
- 1000 views, 50 likes, 10 comments, 5 shares
- Engagement Rate = (50 + 10 + 5) / 1000 * 100 = 6.5%

## API Endpoints

### Get Analytics Summary

```http
GET /api/analytics?startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z&platform=INSTAGRAM
Authorization: Bearer <token>
```

**Response:**
```json
{
  "summary": {
    "views": 50000,
    "likes": 2500,
    "comments": 300,
    "shares": 100,
    "posts": 25,
    "avgEngagementRate": 5.6
  },
  "byPlatform": {
    "INSTAGRAM": { "views": 30000, "likes": 1500, ... },
    "YOUTUBE": { "views": 15000, "likes": 800, ... },
    "FACEBOOK": { "views": 5000, "likes": 200, ... }
  },
  "timeline": [
    {
      "date": "2026-01-28T00:00:00Z",
      "views": 2000,
      "likes": 100,
      "comments": 15,
      "shares": 5,
      "engagementRate": 6.0,
      "platform": "INSTAGRAM"
    }
  ]
}
```

### Get Post Analytics

```http
GET /api/analytics/posts/:postId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "postId": "uuid",
  "latest": {
    "views": 5000,
    "likes": 250,
    "comments": 30,
    "shares": 10,
    "engagementRate": 5.8,
    "metricsDate": "2026-01-28T00:00:00Z"
  },
  "history": [
    { "views": 5000, "likes": 250, ... },
    { "views": 4500, "likes": 230, ... }
  ]
}
```

### Manually Sync Analytics

```http
POST /api/analytics/posts/:postId/sync
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Analytics sync queued",
  "postId": "uuid"
}
```

### Get Top Performing Posts

```http
GET /api/analytics/top?limit=10&metric=engagementRate
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (default: 10) - Number of posts to return
- `metric` (default: engagementRate) - Metric to sort by (views, likes, comments, shares, engagementRate)

**Response:**
```json
{
  "metric": "engagementRate",
  "posts": [
    {
      "id": "uuid",
      "video": { "title": "Video Title", "thumbnailUrl": "..." },
      "platform": "INSTAGRAM",
      "postType": "REEL",
      "caption": "...",
      "publishedAt": "2026-01-20T10:00:00Z",
      "platformUrl": "https://instagram.com/p/...",
      "analytics": {
        "views": 10000,
        "likes": 800,
        "comments": 50,
        "shares": 20,
        "engagementRate": 8.7,
        "metricsDate": "2026-01-28T00:00:00Z"
      }
    }
  ]
}
```

## Automated Syncing

Analytics are automatically synced by the cron job defined in `scheduler/cron-jobs.ts`:

```typescript
// Runs every 6 hours
cron.schedule('0 */6 * * *', async () => {
  await syncAllPublishedPosts();
});
```

This cron job:
1. Finds all published posts from the last 30 days
2. Queues an analytics sync job for each post
3. Adds random delay (0-5 seconds) to spread load
4. Uses 2 retry attempts with exponential backoff

## Error Handling

- **Platform API Errors**: Returns zero metrics and logs error
- **Token Expired**: Logged and account marked as expired
- **Post Not Found**: Job fails but doesn't retry
- **Rate Limiting**: Exponential backoff retries

## Performance Optimization

1. **Queue-based Processing**: Async, non-blocking
2. **Spread Load**: Random delays between jobs
3. **Batch Processing**: Process multiple posts in parallel
4. **Graceful Degradation**: Single post failure doesn't affect others
5. **Data Deduplication**: Upsert based on postId + metricsDate

## Database Schema

```prisma
model Analytics {
  id              String   @id @default(uuid())
  postId          String
  views           Int
  likes           Int
  comments        Int
  shares          Int
  engagementRate  Float
  metricsDate     DateTime
  createdAt       DateTime @default(now())

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
}
```

## Future Enhancements

- Real-time analytics (webhooks)
- Comparative analytics (A/B testing)
- Predictive analytics (ML-based best time to post)
- Audience demographics
- Reach vs. Impressions tracking
- Story/Reel specific metrics
- Export to CSV/PDF

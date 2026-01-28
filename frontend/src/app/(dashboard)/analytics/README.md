# Analytics Dashboard

Comprehensive analytics dashboard for tracking social media performance across Instagram, YouTube, and Facebook.

## Features

### Metrics Cards

Five key metric cards displaying aggregated statistics:

1. **Total Views**: Total impressions/views across all posts
   - Subtitle shows number of posts
   - Icon: Eye

2. **Total Likes**: Total likes/reactions
   - Icon: Heart

3. **Total Comments**: Total comment count
   - Icon: MessageCircle

4. **Total Shares**: Total shares/reposts
   - Icon: Share2

5. **Average Engagement**: Engagement rate percentage
   - Formula: (likes + comments + shares) / views × 100
   - Icon: TrendingUp

### Filters

Three filter options for customizing analytics view:

1. **Start Date**: Beginning of date range (date picker)
2. **End Date**: End of date range (date picker, max today)
3. **Platform**: Filter by specific platform or view all

**Default**: Last 30 days, all platforms

### Charts

#### Platform Breakdown (Bar Chart)

Horizontal bar chart showing views per platform:
- Instagram (Pink)
- YouTube (Red)
- Facebook (Blue)

**Features:**
- Platform-specific colors
- Value labels
- Percentage-based bar widths
- Formatted numbers with commas

#### Views Over Time (Line Chart)

Timeline chart showing view trends:
- Last 14 days of data
- Grouped by date
- Aggregated across platforms
- Hover tooltips with exact values

**Features:**
- Y-axis labels (max, mid, min)
- X-axis date labels (smart spacing)
- Smooth transitions
- Responsive design

### Top Performing Posts

Ranked list of best-performing posts with metric selector:

**Metrics:**
- Most Views
- Most Likes
- Best Engagement (default)

**Display (Top 5):**
1. Rank badge (1-5)
2. Video thumbnail
3. Platform icon
4. Video title
5. Post type badge
6. Caption preview (1 line)
7. Metrics row:
   - Views (eye icon)
   - Likes (heart icon)
   - Comments (message icon)
   - Engagement rate (trending icon)
8. Platform URL link

## Components

### MetricsCard (`components/analytics/MetricsCard.tsx`)

Displays individual metric with optional icon and trend.

**Props:**
```typescript
interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}
```

**Features:**
- Large numeric display
- Icon in header
- Optional subtitle
- Optional trend indicator (↑/↓ with percentage)

### SimpleBarChart (`components/analytics/SimpleBarChart.tsx`)

Horizontal bar chart component using CSS.

**Props:**
```typescript
interface SimpleBarChartProps {
  data: BarChartData[];
  height?: number;
  valueFormatter?: (value: number) => string;
}

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}
```

**Features:**
- CSS-based bars (no external library)
- Percentage-based widths
- Custom colors per bar
- Value formatter support
- Smooth animations

### SimpleLineChart (`components/analytics/SimpleLineChart.tsx`)

Vertical bar/column chart for timeline data.

**Props:**
```typescript
interface SimpleLineChartProps {
  data: LineChartData[];
  height?: number;
  color?: string;
  valueFormatter?: (value: number) => string;
}

interface LineChartData {
  label: string;
  value: number;
}
```

**Features:**
- CSS-based columns
- Hover tooltips
- Y-axis labels
- X-axis labels (smart spacing)
- Responsive scaling

## API Integration

### Get Analytics Summary

```typescript
const { data: analytics } = useQuery({
  queryKey: ['analytics', dateRange, platformFilter],
  queryFn: () => analyticsApi.getSummary({
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-01-31T23:59:59Z',
    platform: 'INSTAGRAM', // Optional
  }),
});
```

**Response:**
```typescript
{
  summary: {
    views: 50000,
    likes: 2500,
    comments: 300,
    shares: 100,
    posts: 25,
    avgEngagementRate: 5.6
  },
  byPlatform: {
    INSTAGRAM: { views: 30000, likes: 1500, ... },
    YOUTUBE: { views: 15000, likes: 800, ... },
    FACEBOOK: { views: 5000, likes: 200, ... }
  },
  timeline: [
    {
      date: '2026-01-28',
      views: 2000,
      likes: 100,
      comments: 15,
      shares: 5,
      engagementRate: 6.0,
      platform: 'INSTAGRAM'
    }
  ]
}
```

### Get Top Posts

```typescript
const { data: topPosts } = useQuery({
  queryKey: ['analytics-top', metric],
  queryFn: () => analyticsApi.getTopPosts({
    limit: 5,
    metric: 'engagementRate',
  }),
});
```

**Response:**
```typescript
{
  metric: 'engagementRate',
  posts: [
    {
      id: 'uuid',
      video: { id: 'uuid', title: 'Video Title', thumbnailUrl: '...' },
      platform: 'INSTAGRAM',
      postType: 'REEL',
      caption: 'Caption text...',
      publishedAt: '2026-01-20T10:00:00Z',
      platformUrl: 'https://instagram.com/p/...',
      analytics: {
        views: 10000,
        likes: 800,
        comments: 50,
        shares: 20,
        engagementRate: 8.7,
        metricsDate: '2026-01-28T00:00:00Z'
      }
    }
  ]
}
```

## State Management

```typescript
const [dateRange, setDateRange] = useState({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
});
const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
const [topPostsMetric, setTopPostsMetric] = useState<'views' | 'likes' | 'engagementRate'>('engagementRate');
```

## Data Processing

### Platform Breakdown

```typescript
const platformData = useMemo(() => {
  if (!analytics?.byPlatform) return [];
  return Object.entries(analytics.byPlatform).map(([platform, data]) => ({
    label: platformConfig[platform].name,
    value: data.views,
    color: platformConfig[platform].color,
  }));
}, [analytics]);
```

### Timeline Grouping

```typescript
const timelineData = useMemo(() => {
  if (!analytics?.timeline) return [];

  // Group by date and sum values
  const grouped = analytics.timeline.reduce((acc, entry) => {
    const date = new Date(entry.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    if (!acc[date]) {
      acc[date] = { label: date, value: 0 };
    }
    acc[date].value += entry.views;
    return acc;
  }, {});

  return Object.values(grouped).slice(-14); // Last 14 days
}, [analytics]);
```

## User Flows

### View Analytics Dashboard

1. Navigate to `/dashboard/analytics`
2. See default view (last 30 days, all platforms)
3. View metric cards with totals
4. See platform breakdown chart
5. See timeline chart
6. Scroll to top performing posts

### Filter Analytics

1. Change start/end dates
2. Select platform filter
3. Charts and metrics update automatically
4. Top posts maintain separate metric filter

### View Top Posts

1. Select metric from dropdown (Views, Likes, Engagement)
2. See top 5 posts ranked
3. View detailed metrics per post
4. Click platform URL to view on platform

## Empty States

**No Analytics Data:**
- Message: "No analytics data available for the selected period"
- Appears when no posts published in date range

**No Top Posts:**
- Icon: TrendingUp
- Message: "No published posts yet"
- Subtitle: "Publish posts to start tracking analytics"

## Responsive Design

- **Mobile**: Single column layout, stacked metrics
- **Tablet**: 2-column charts, 2-3 metric cards per row
- **Desktop**: Side-by-side charts, 5 metric cards in a row

## Performance Optimization

- **Memoization**: Chart data memoized with useMemo
- **Lazy Loading**: Charts render only when data available
- **Skeleton Loaders**: Show during data fetch
- **Debouncing**: Date range changes could be debounced (not implemented)

## Chart Design Decisions

### Why CSS Charts?

Instead of using heavy chart libraries (Chart.js, Recharts), simple CSS-based charts provide:
- ✅ Zero dependencies
- ✅ Fast loading
- ✅ Full styling control
- ✅ Smooth animations
- ✅ Responsive by default
- ✅ Accessibility friendly

### Limitations

- No complex interactions (zoom, pan)
- Limited chart types (bar, column)
- Manual tooltip implementation
- No export functionality

### Future Enhancements

If more complex charts needed:
- [ ] Add recharts or chart.js library
- [ ] Line charts (actual lines, not columns)
- [ ] Pie/donut charts
- [ ] Multi-line comparison charts
- [ ] Interactive tooltips
- [ ] Export to PNG/PDF

## Engagement Rate Calculation

```typescript
engagementRate = (likes + comments + shares) / views * 100
```

**Example:**
- 1000 views
- 50 likes
- 10 comments
- 5 shares
- Engagement Rate = (50 + 10 + 5) / 1000 × 100 = 6.5%

**Interpretation:**
- < 1%: Poor engagement
- 1-3%: Average engagement
- 3-6%: Good engagement
- > 6%: Excellent engagement

## Testing

### Test Analytics Dashboard

1. Publish some posts with different platforms
2. Wait for analytics sync (runs every 6 hours automatically)
3. Or manually trigger sync via API
4. Navigate to analytics dashboard
5. Verify metrics cards show correct totals
6. Test date range filter
7. Test platform filter
8. Check platform breakdown chart
9. Check timeline chart
10. Verify top posts section
11. Change top posts metric
12. Click platform URLs

### Test with Mock Data

If no real analytics yet:
1. Backend should return zero values gracefully
2. Charts should show empty states
3. "No published posts yet" message appears

## Known Issues

- Timeline chart shows last 14 days only (intentional)
- X-axis labels may overlap on very narrow screens
- No real-time updates (manual refresh needed)
- Analytics sync is automated but may lag by up to 6 hours

## Future Enhancements

- [ ] Real-time analytics sync
- [ ] More chart types (pie, donut, area)
- [ ] Comparison view (this month vs last month)
- [ ] Export reports (PDF, CSV)
- [ ] Scheduled email reports
- [ ] Benchmark against industry averages
- [ ] Follower growth tracking
- [ ] Best time to post analysis
- [ ] Hashtag performance
- [ ] Audience demographics
- [ ] Story/Reel specific metrics
- [ ] Campaign tracking
- [ ] ROI calculator

## API Endpoints Used

### Get Analytics Summary
```http
GET /api/analytics?startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z&platform=INSTAGRAM
Authorization: Bearer <token>
```

### Get Top Performing Posts
```http
GET /api/analytics/top?limit=5&metric=engagementRate
Authorization: Bearer <token>
```

### Get Post Analytics (Individual)
```http
GET /api/analytics/posts/:postId
Authorization: Bearer <token>
```

### Sync Post Analytics
```http
POST /api/analytics/posts/:postId/sync
Authorization: Bearer <token>
```

## Troubleshooting

### "No analytics data available"
- Check if posts are published
- Wait for automated sync (every 6 hours)
- Manually trigger sync via API
- Verify date range includes published posts

### Charts not rendering
- Check browser console for errors
- Verify data format matches expected types
- Check that analytics API returns data

### Top posts empty
- Need at least 1 published post with analytics
- Wait for analytics sync
- Check selected metric filter

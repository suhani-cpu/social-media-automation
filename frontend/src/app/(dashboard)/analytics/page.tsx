'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Instagram,
  Youtube,
  Facebook,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MetricsCard } from '@/components/analytics/MetricsCard';
import { SimpleBarChart } from '@/components/analytics/SimpleBarChart';
import { SimpleLineChart } from '@/components/analytics/SimpleLineChart';
import { analyticsApi } from '@/lib/api/analytics';
import { Platform } from '@/lib/types/api';

const platformConfig: Record<string, { name: string; icon: typeof Instagram; color: string }> = {
  INSTAGRAM: { name: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
  YOUTUBE: { name: 'YouTube', icon: Youtube, color: 'bg-red-500' },
  FACEBOOK: { name: 'Facebook', icon: Facebook, color: 'bg-blue-500' },
  TWITTER: { name: 'Twitter', icon: Share2, color: 'bg-sky-500' },
  LINKEDIN: { name: 'LinkedIn', icon: Share2, color: 'bg-blue-700' },
  GOOGLE_DRIVE: { name: 'Google Drive', icon: TrendingUp, color: 'bg-green-500' },
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
  const [topPostsMetric, setTopPostsMetric] = useState<'views' | 'likes' | 'engagementRate'>(
    'engagementRate'
  );

  // Fetch analytics summary
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics', dateRange, platformFilter],
    queryFn: () =>
      analyticsApi.getSummary({
        startDate: new Date(dateRange.startDate).toISOString(),
        endDate: new Date(dateRange.endDate).toISOString(),
        platform: platformFilter !== 'ALL' ? platformFilter : undefined,
      }),
  });

  // Fetch top posts
  const { data: topPosts, isLoading: loadingTopPosts } = useQuery({
    queryKey: ['analytics-top', topPostsMetric],
    queryFn: () => analyticsApi.getTopPosts({ limit: 5, metric: topPostsMetric }),
  });

  // Platform breakdown chart data
  const platformData = useMemo(() => {
    if (!analytics?.byPlatform) return [];
    return Object.entries(analytics.byPlatform).map(([platform, data]) => ({
      label: platformConfig[platform as Platform].name,
      value: data.views,
      color: platformConfig[platform as Platform].color,
    }));
  }, [analytics]);

  // Timeline chart data
  const timelineData = useMemo(() => {
    if (!analytics?.timeline) return [];

    // Group by date and sum values
    const grouped = analytics.timeline.reduce(
      (acc, entry) => {
        const date = new Date(entry.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        if (!acc[date]) {
          acc[date] = { label: date, value: 0 };
        }
        acc[date].value += entry.views;
        return acc;
      },
      {} as Record<string, { label: string; value: number }>
    );

    return Object.values(grouped).slice(-14); // Last 14 days
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your social media performance</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={platformFilter}
                onValueChange={(value) => setPlatformFilter(value as Platform | 'ALL')}
              >
                <SelectTrigger id="platform" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Platforms</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="YOUTUBE">YouTube</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      {loadingAnalytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border p-6">
              <div className="h-4 w-20 rounded bg-gray-200"></div>
              <div className="mt-4 h-8 w-32 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricsCard
            title="Total Views"
            value={analytics.summary.views}
            icon={Eye}
            subtitle={`${analytics.summary.posts} posts`}
          />
          <MetricsCard title="Total Likes" value={analytics.summary.likes} icon={Heart} />
          <MetricsCard
            title="Total Comments"
            value={analytics.summary.comments}
            icon={MessageCircle}
          />
          <MetricsCard title="Total Shares" value={analytics.summary.shares} icon={Share2} />
          <MetricsCard
            title="Avg Engagement"
            value={`${analytics.summary.avgEngagementRate.toFixed(2)}%`}
            icon={TrendingUp}
          />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No analytics data available for the selected period
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-8 rounded bg-gray-200"></div>
                  </div>
                ))}
              </div>
            ) : (
              <SimpleBarChart data={platformData} valueFormatter={(v) => v.toLocaleString()} />
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <div className="h-48 animate-pulse rounded bg-gray-200"></div>
            ) : (
              <SimpleLineChart data={timelineData} valueFormatter={(v) => v.toLocaleString()} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Top Performing Posts</CardTitle>
            <Select
              value={topPostsMetric}
              onValueChange={(value) => setTopPostsMetric(value as any)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="views">Most Views</SelectItem>
                <SelectItem value="likes">Most Likes</SelectItem>
                <SelectItem value="engagementRate">Best Engagement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTopPosts ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-20 w-32 rounded bg-gray-200"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                    <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : topPosts && topPosts.posts.length > 0 ? (
            <div className="space-y-4">
              {topPosts.posts.map((post, index) => {
                const config = platformConfig[post.platform];
                const Icon = config.icon;
                return (
                  <div
                    key={post.id}
                    className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                      {index + 1}
                    </div>
                    {post.video.thumbnailUrl && (
                      <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded">
                        <img
                          src={post.video.thumbnailUrl}
                          alt={post.video.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                        <span className="font-medium">{post.video.title}</span>
                        <Badge variant="outline">{post.postType}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {post.caption}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.analytics.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.analytics.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {post.analytics.comments.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {post.analytics.engagementRate.toFixed(2)}%
                        </span>
                      </div>
                      {post.platformUrl && (
                        <a
                          href={post.platformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-primary hover:underline"
                        >
                          View on {config.name}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No published posts yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Publish posts to start tracking analytics
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

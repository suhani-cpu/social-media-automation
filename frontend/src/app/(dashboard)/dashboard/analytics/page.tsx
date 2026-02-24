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

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics', dateRange, platformFilter],
    queryFn: () =>
      analyticsApi.getSummary({
        startDate: new Date(dateRange.startDate).toISOString(),
        endDate: new Date(dateRange.endDate).toISOString(),
        platform: platformFilter !== 'ALL' ? platformFilter : undefined,
      }),
  });

  const { data: topPosts, isLoading: loadingTopPosts } = useQuery({
    queryKey: ['analytics-top', topPostsMetric],
    queryFn: () => analyticsApi.getTopPosts({ limit: 5, metric: topPostsMetric }),
  });

  const platformData = useMemo(() => {
    if (!analytics?.byPlatform) return [];
    return Object.entries(analytics.byPlatform).map(([platform, data]) => ({
      label: platformConfig[platform]?.name ?? platform,
      value: data.views,
      color: platformConfig[platform]?.color ?? 'bg-gray-500',
    }));
  }, [analytics]);

  const timelineData = useMemo(() => {
    if (!analytics?.timeline) return [];

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

    return Object.values(grouped).slice(-14);
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-neutral-500">Track your social media performance</p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="start-date" className="text-neutral-400 text-xs">
              Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="mt-2 bg-[#0a0a0a] border-[#1a1a1a] text-white"
            />
          </div>
          <div>
            <Label htmlFor="end-date" className="text-neutral-400 text-xs">
              End Date
            </Label>
            <Input
              id="end-date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              className="mt-2 bg-[#0a0a0a] border-[#1a1a1a] text-white"
            />
          </div>
          <div>
            <Label htmlFor="platform" className="text-neutral-400 text-xs">
              Platform
            </Label>
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
      </div>

      {/* Metrics Cards */}
      {loadingAnalytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
              <div className="h-4 w-20 rounded bg-[#1a1a1a]"></div>
              <div className="mt-4 h-8 w-32 rounded bg-[#1a1a1a]"></div>
            </div>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricsCard
            title="Total Views"
            value={analytics.summary?.views ?? 0}
            icon={Eye}
            subtitle={`${analytics.summary?.posts ?? 0} posts`}
          />
          <MetricsCard title="Total Likes" value={analytics.summary?.likes ?? 0} icon={Heart} />
          <MetricsCard
            title="Total Comments"
            value={analytics.summary?.comments ?? 0}
            icon={MessageCircle}
          />
          <MetricsCard title="Total Shares" value={analytics.summary?.shares ?? 0} icon={Share2} />
          <MetricsCard
            title="Avg Engagement"
            value={`${(analytics.summary?.avgEngagementRate ?? 0).toFixed(2)}%`}
            icon={TrendingUp}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-8 text-center">
          <p className="text-neutral-500 text-sm">
            No analytics data available for the selected period
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Platform Breakdown</h3>
          {loadingAnalytics ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-8 rounded bg-[#1a1a1a]"></div>
                </div>
              ))}
            </div>
          ) : (
            <SimpleBarChart data={platformData} valueFormatter={(v) => v.toLocaleString()} />
          )}
        </div>

        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Views Over Time (Last 14 Days)</h3>
          {loadingAnalytics ? (
            <div className="h-48 animate-pulse rounded bg-[#1a1a1a]"></div>
          ) : (
            <SimpleLineChart data={timelineData} valueFormatter={(v) => v.toLocaleString()} />
          )}
        </div>
      </div>

      {/* Top Performing Posts */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Top Performing Posts</h3>
          <Select value={topPostsMetric} onValueChange={(value) => setTopPostsMetric(value as any)}>
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

        {loadingTopPosts ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-20 w-32 rounded bg-[#1a1a1a]"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[#1a1a1a]"></div>
                  <div className="h-4 w-1/2 rounded bg-[#1a1a1a]"></div>
                </div>
              </div>
            ))}
          </div>
        ) : topPosts && topPosts.posts.length > 0 ? (
          <div className="space-y-3">
            {topPosts.posts.map((post, index) => {
              const config = platformConfig[post.platform];
              const Icon = config.icon;
              return (
                <div
                  key={post.id}
                  className="flex items-start gap-4 rounded-lg border border-[#1a1a1a] p-4 transition-colors hover:bg-[#1a1a1a]/50"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  {post.video.thumbnailUrl && (
                    <div className="h-16 w-28 flex-shrink-0 overflow-hidden rounded">
                      <img
                        src={post.video.thumbnailUrl}
                        alt={post.video.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-sm font-medium text-white">{post.video.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {post.postType}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{post.caption}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {(post.analytics?.views ?? 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {(post.analytics?.likes ?? 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {(post.analytics?.comments ?? 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {(post.analytics?.engagementRate ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    {post.platformUrl && (
                      <a
                        href={post.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-red-500 hover:text-red-400"
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
          <div className="rounded-lg border border-[#1a1a1a] p-8 text-center">
            <TrendingUp className="mx-auto h-10 w-10 text-neutral-500" />
            <h3 className="mt-4 text-base font-semibold text-white">No published posts yet</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Publish posts to start tracking analytics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

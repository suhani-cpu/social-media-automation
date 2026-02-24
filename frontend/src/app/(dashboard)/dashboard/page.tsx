'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Video,
  FileText,
  Calendar,
  TrendingUp,
  Upload,
  Plus,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';
import { analyticsApi } from '@/lib/api/posts';
import { Video as VideoType, Post } from '@/lib/types/api';
import { useAuthStore } from '@/lib/store/authStore';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: videos } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await apiClient.get<{ videos: VideoType[] }>('/videos');
      return response.data.videos;
    },
  });

  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await apiClient.get<{ posts: Post[] }>('/posts');
      return response.data.posts;
    },
  });

  const { data: bestTimes } = useQuery({
    queryKey: ['best-times'],
    queryFn: () => analyticsApi.getBestTimes(),
    staleTime: 60000,
  });

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: () => analyticsApi.getInsights(),
    staleTime: 60000,
  });

  const stats = {
    totalVideos: videos?.length || 0,
    readyVideos: videos?.filter((v) => v.status === 'READY').length || 0,
    totalPosts: posts?.length || 0,
    scheduledPosts: posts?.filter((p) => p.status === 'SCHEDULED').length || 0,
    publishedPosts: posts?.filter((p) => p.status === 'PUBLISHED').length || 0,
    failedPosts: posts?.filter((p) => p.status === 'FAILED').length || 0,
    publishingPosts: posts?.filter((p) => p.status === 'PUBLISHING').length || 0,
  };

  const _totalViews =
    insights?.platforms?.reduce(
      (acc: number, p: any) =>
        acc +
        (p.avgViews * (insights?.totalPublished || 0)) /
          Math.max(insights?.platforms?.length || 1, 1),
      0
    ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {user?.brandName ? `${user.brandName} Dashboard` : 'Dashboard'}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {user?.name ? `Welcome back, ${user.name}` : 'Manage your social media content'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/videos/upload">
              <Button
                variant="outline"
                className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </Button>
            </Link>
            <Link href="/dashboard/posts/create">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create Post
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Videos</p>
            <Video className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalVideos}</p>
          <p className="text-xs text-neutral-500 mt-1">{stats.readyVideos} ready to post</p>
        </div>

        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Published
            </p>
            <FileText className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.publishedPosts}</p>
          <p className="text-xs text-neutral-500 mt-1">{stats.totalPosts} total posts</p>
        </div>

        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Scheduled
            </p>
            <Calendar className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.scheduledPosts}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {stats.publishingPosts > 0
              ? `${stats.publishingPosts} publishing now`
              : 'Upcoming posts'}
          </p>
        </div>

        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Engagement
            </p>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {insights?.totalPublished ? `${insights.totalPublished}` : '-'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {insights?.insights?.[0] || 'Publish more to see insights'}
          </p>
        </div>
      </div>

      {/* Best Time Suggestion + Failed Posts Alert */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Best Time to Post */}
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-white">Best Time to Post</h3>
            <Sparkles className="h-3 w-3 text-red-500" />
          </div>
          {bestTimes?.hasEnoughData ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-300">{bestTimes.suggestion}</p>
              {bestTimes.bestHours?.slice(0, 3).map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">{h.hour}:00</span>
                  <span className="text-neutral-300">{h.avgEngagement}% avg engagement</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-neutral-400">
                {bestTimes?.suggestion ||
                  'Publish 5+ posts to get personalized AI time suggestions'}
              </p>
              {bestTimes?.defaultSuggestions?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-neutral-500">Industry defaults:</p>
                  {bestTimes.defaultSuggestions.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-neutral-400">
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Failed Posts Alert */}
        {stats.failedPosts > 0 ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-red-400">Failed Posts</h3>
            </div>
            <p className="text-sm text-neutral-300 mb-3">
              {stats.failedPosts} post{stats.failedPosts > 1 ? 's' : ''} failed to publish. You can
              retry them.
            </p>
            <Link href="/dashboard/posts">
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                View Failed Posts
              </Button>
            </Link>
          </div>
        ) : (
          /* Performance Insights */
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-white">Performance Insights</h3>
            </div>
            {insights?.insights?.length > 0 ? (
              <div className="space-y-3">
                {insights.insights.map((insight: string, i: number) => (
                  <p key={i} className="text-sm text-neutral-300">
                    {insight}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">
                Publish more posts to unlock performance insights
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recent Content */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Videos</h3>
            <Link href="/dashboard/videos">
              <span className="text-xs text-red-500 hover:text-red-400">View All</span>
            </Link>
          </div>
          {videos && videos.length > 0 ? (
            <div className="space-y-3">
              {videos.slice(0, 5).map((video) => (
                <div key={video.id} className="flex items-center gap-3">
                  {video.thumbnailUrl && (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-10 w-16 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{video.title}</p>
                    <p className="text-xs text-neutral-500">
                      <span
                        className={
                          video.status === 'READY'
                            ? 'text-green-500'
                            : video.status === 'PROCESSING'
                              ? 'text-yellow-500'
                              : video.status === 'FAILED'
                                ? 'text-red-500'
                                : 'text-neutral-500'
                        }
                      >
                        {video.status}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No videos yet. Upload your first video!</p>
          )}
        </div>

        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Posts</h3>
            <Link href="/dashboard/posts">
              <span className="text-xs text-red-500 hover:text-red-400">View All</span>
            </Link>
          </div>
          {posts && posts.length > 0 ? (
            <div className="space-y-3">
              {posts.slice(0, 5).map((post) => (
                <div key={post.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{post.platform}</p>
                    <span
                      className={`text-xs font-medium ${
                        post.status === 'PUBLISHED'
                          ? 'text-green-500'
                          : post.status === 'SCHEDULED'
                            ? 'text-blue-400'
                            : post.status === 'FAILED'
                              ? 'text-red-500'
                              : post.status === 'PUBLISHING'
                                ? 'text-yellow-500'
                                : 'text-neutral-500'
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-1">{post.caption}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No posts yet. Create your first post!</p>
          )}
        </div>
      </div>
    </div>
  );
}

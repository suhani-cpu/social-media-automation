'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Video, FileText, Calendar, TrendingUp, Upload, Plus, Instagram, Youtube, Facebook } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';
import { Video as VideoType, Post } from '@/lib/types/api';

export default function DashboardPage() {
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

  const stats = {
    totalVideos: videos?.length || 0,
    readyVideos: videos?.filter((v) => v.status === 'READY').length || 0,
    totalPosts: posts?.length || 0,
    scheduledPosts: posts?.filter((p) => p.status === 'SCHEDULED').length || 0,
    publishedPosts: posts?.filter((p) => p.status === 'PUBLISHED').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header with Gradient Background */}
      <div className="multi-social-gradient rounded-xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="flex gap-4 justify-end items-start p-4">
            <Instagram className="w-8 h-8 text-white" />
            <Youtube className="w-8 h-8 text-white" />
            <Facebook className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to Stage OTT 👋</h1>
              <p className="text-white/90">Automate your social media content across Instagram, YouTube & Facebook</p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/videos/upload">
                <Button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30 hover-scale">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video
                </Button>
              </Link>
              <Link href="/dashboard/posts/create">
                <Button className="bg-white text-primary hover:bg-white/90 hover-scale vibrant-glow">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Post
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Vibrant Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden hover-scale border-primary/30 hover:shadow-xl hover:shadow-primary/20 transition-all">
          <div className="stage-gradient h-1"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos 🎬</CardTitle>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVideos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ✅ {stats.readyVideos} ready to post
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden hover-scale border-[hsl(var(--instagram-pink))]/30 hover:shadow-xl hover:shadow-[hsl(var(--instagram-pink))]/20 transition-all">
          <div className="instagram-gradient h-1"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts 📱</CardTitle>
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--instagram-pink))]/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-[hsl(var(--instagram-pink))]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ✨ {stats.publishedPosts} published
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden hover-scale border-[hsl(var(--facebook-blue))]/30 hover:shadow-xl hover:shadow-[hsl(var(--facebook-blue))]/20 transition-all">
          <div className="facebook-gradient h-1"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled 📅</CardTitle>
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--facebook-blue))]/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[hsl(var(--facebook-blue))]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.scheduledPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ⏰ Upcoming posts
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden hover-scale border-[hsl(var(--youtube-red))]/30 hover:shadow-xl hover:shadow-[hsl(var(--youtube-red))]/20 transition-all">
          <div className="youtube-gradient h-1"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement 📈</CardTitle>
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--youtube-red))]/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[hsl(var(--youtube-red))]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              🚀 Coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Videos</CardTitle>
          </CardHeader>
          <CardContent>
            {videos && videos.length > 0 ? (
              <div className="space-y-4">
                {videos.slice(0, 5).map((video) => (
                  <div key={video.id} className="flex items-center gap-4">
                    {video.thumbnailUrl && (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="h-12 w-20 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{video.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Status:{' '}
                        <span
                          className={
                            video.status === 'READY'
                              ? 'text-[hsl(var(--status-success))] font-semibold'
                              : video.status === 'PROCESSING'
                              ? 'text-[hsl(var(--status-processing))] font-semibold'
                              : video.status === 'FAILED'
                              ? 'text-[hsl(var(--status-error))] font-semibold'
                              : 'text-[hsl(var(--status-pending))] font-semibold'
                          }
                        >
                          {video.status === 'READY' ? '✅ ' : video.status === 'PROCESSING' ? '⏳ ' : video.status === 'FAILED' ? '❌ ' : '⏸️ '}
                          {video.status}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No videos yet. Upload your first video!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {posts && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {post.platform === 'INSTAGRAM' && <Instagram className="w-4 h-4 text-[hsl(var(--instagram-pink))]" />}
                        {post.platform === 'YOUTUBE' && <Youtube className="w-4 h-4 text-[hsl(var(--youtube-red))]" />}
                        {post.platform === 'FACEBOOK' && <Facebook className="w-4 h-4 text-[hsl(var(--facebook-blue))]" />}
                        <p className="text-sm font-medium">{post.platform}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          post.status === 'PUBLISHED'
                            ? 'text-[hsl(var(--status-success))]'
                            : post.status === 'SCHEDULED'
                            ? 'text-[hsl(var(--facebook-blue))]'
                            : post.status === 'FAILED'
                            ? 'text-[hsl(var(--status-error))]'
                            : 'text-[hsl(var(--status-pending))]'
                        }`}
                      >
                        {post.status === 'PUBLISHED' ? '✅ ' : post.status === 'SCHEDULED' ? '📅 ' : post.status === 'FAILED' ? '❌ ' : '📝 '}
                        {post.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No posts yet. Create your first post!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

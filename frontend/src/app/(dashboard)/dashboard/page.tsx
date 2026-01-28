'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Video, FileText, Calendar, TrendingUp, Upload, Plus } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your social media automation</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/videos/upload">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </Link>
          <Link href="/dashboard/posts/create">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVideos}</div>
            <p className="text-xs text-muted-foreground">{stats.readyVideos} ready to post</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
            <p className="text-xs text-muted-foreground">{stats.publishedPosts} published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduledPosts}</div>
            <p className="text-xs text-muted-foreground">Upcoming posts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
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
                              ? 'text-green-600'
                              : video.status === 'PROCESSING'
                              ? 'text-yellow-600'
                              : video.status === 'FAILED'
                              ? 'text-red-600'
                              : 'text-gray-600'
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
                      <p className="text-sm font-medium">{post.platform}</p>
                      <span
                        className={`text-xs ${
                          post.status === 'PUBLISHED'
                            ? 'text-green-600'
                            : post.status === 'SCHEDULED'
                            ? 'text-blue-600'
                            : post.status === 'FAILED'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
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

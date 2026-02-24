'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, List, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarView } from '@/components/calendar/CalendarView';
import { PostCard } from '@/components/post/PostCard';
import { postsApi } from '@/lib/api/posts';
import { Post } from '@/lib/types/api';

export default function CalendarPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await postsApi.getAll();
      return response.posts;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const scheduledPosts = posts?.filter((post) => post.status === 'SCHEDULED') || [];

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handlePublish = async (postId: string) => {
    if (confirm('Publish this post now?')) {
      await postsApi.publish(postId);
    }
  };

  const handleDelete = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await postsApi.delete(postId);
    }
  };

  const handleReschedule = (_postId: string) => {
    alert('Reschedule feature coming soon');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            View and manage your scheduled posts ({scheduledPosts.length} scheduled)
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/posts/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </Link>
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(value) => setView(value as any)}>
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          {isLoading ? (
            <div className="animate-pulse rounded-lg border p-6">
              <div className="mb-6 h-8 w-48 rounded bg-gray-200"></div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="h-24 rounded bg-gray-200"></div>
                ))}
              </div>
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No scheduled posts</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a post and schedule it for a future date
              </p>
              <Link href="/dashboard/posts/create">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Post
                </Button>
              </Link>
            </div>
          ) : (
            <CalendarView posts={scheduledPosts} onPostClick={handlePostClick} />
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border p-4">
                  <div className="flex gap-4">
                    <div className="h-24 w-32 rounded bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                      <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                      <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <List className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No scheduled posts</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a post and schedule it for a future date
              </p>
              <Link href="/dashboard/posts/create">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Showing {scheduledPosts.length} scheduled post
                {scheduledPosts.length !== 1 ? 's' : ''}, sorted by scheduled time
              </p>
              {scheduledPosts
                .sort((a, b) => {
                  if (!a.scheduledFor || !b.scheduledFor) return 0;
                  return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
                })
                .map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPublish={handlePublish}
                    onReschedule={handleReschedule}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected Post Details Modal (Simple) */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Post Details</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedPost(null)}>
                ✕
              </Button>
            </div>
            <PostCard
              post={selectedPost}
              onPublish={handlePublish}
              onReschedule={handleReschedule}
              onDelete={handleDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

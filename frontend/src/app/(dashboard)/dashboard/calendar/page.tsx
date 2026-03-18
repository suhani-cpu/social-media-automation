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

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await postsApi.getAll();
      return response.posts;
    },
    refetchInterval: 30000,
  });

  // Include both scheduled and published posts in the calendar
  const calendarPosts =
    posts?.filter(
      (post) =>
        (post.status === 'SCHEDULED' || post.status === 'PUBLISHED' || post.status === 'FAILED') &&
        (post.scheduledFor || post.publishedAt)
    ) || [];

  const scheduledPosts = posts?.filter((post) => post.status === 'SCHEDULED') || [];

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
          <h1 className="text-2xl font-bold text-white">Content Calendar</h1>
          <p className="text-sm text-neutral-500">
            Plan and visualize your content schedule ({scheduledPosts.length} upcoming)
          </p>
        </div>
        <Link href="/dashboard/posts/create">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        </Link>
      </div>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(value) => setView(value as 'calendar' | 'list')}>
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          {isLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse rounded-lg border border-[#1a1a1a] bg-[#111] p-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-48 rounded bg-[#1a1a1a]"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 rounded bg-[#1a1a1a]"></div>
                    <div className="h-8 w-8 rounded bg-[#1a1a1a]"></div>
                    <div className="h-8 w-8 rounded bg-[#1a1a1a]"></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[280px] animate-pulse rounded-lg border border-[#1a1a1a] bg-[#111]"
                  >
                    <div className="border-b border-[#1a1a1a] p-2.5">
                      <div className="h-4 w-16 rounded bg-[#1a1a1a]"></div>
                    </div>
                    <div className="space-y-2 p-2">
                      <div className="h-12 rounded bg-[#1a1a1a]"></div>
                      <div className="h-12 rounded bg-[#1a1a1a]"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CalendarView posts={calendarPosts} />
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-[#1a1a1a] bg-[#111] p-4"
                >
                  <div className="flex gap-4">
                    <div className="h-24 w-32 rounded bg-[#1a1a1a]"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/4 rounded bg-[#1a1a1a]"></div>
                      <div className="h-4 w-3/4 rounded bg-[#1a1a1a]"></div>
                      <div className="h-4 w-1/2 rounded bg-[#1a1a1a]"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-8 text-center">
              <List className="mx-auto h-10 w-10 text-neutral-500" />
              <h3 className="mt-4 text-base font-semibold text-white">No scheduled posts</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Create a post and schedule it for a future date
              </p>
              <Link href="/dashboard/posts/create">
                <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500">
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
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PostCard } from '@/components/post/PostCard';
import { postsApi } from '@/lib/api/posts';
import { Post, PostStatus, Platform } from '@/lib/types/api';

export default function PostsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | PostStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'scheduled'>('newest');

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await postsApi.getAll();
      return response.posts;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (postId: string) => postsApi.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: (postId: string) => postsApi.publish(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    let filtered = [...posts];

    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter((post) => post.status === activeTab);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.video?.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Platform filter
    if (platformFilter !== 'ALL') {
      filtered = filtered.filter((post) => post.platform === platformFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'scheduled':
          if (!a.scheduledFor) return 1;
          if (!b.scheduledFor) return -1;
          return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [posts, activeTab, searchQuery, platformFilter, sortBy]);

  const stats = useMemo(() => {
    if (!posts) return { all: 0, draft: 0, scheduled: 0, published: 0, failed: 0 };
    return {
      all: posts.length,
      draft: posts.filter((p) => p.status === 'DRAFT').length,
      scheduled: posts.filter((p) => p.status === 'SCHEDULED').length,
      published: posts.filter((p) => p.status === 'PUBLISHED').length,
      failed: posts.filter((p) => p.status === 'FAILED').length,
    };
  }, [posts]);

  const handlePublish = async (postId: string) => {
    if (confirm('Publish this post now?')) {
      await publishMutation.mutateAsync(postId);
    }
  };

  const handleDelete = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deleteMutation.mutateAsync(postId);
    }
  };

  const handleReschedule = (postId: string) => {
    // TODO: Open reschedule modal
    alert('Reschedule feature coming soon');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-muted-foreground">Manage your social media posts</p>
        </div>
        <Link href="/dashboard/posts/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.all})</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft ({stats.draft})</TabsTrigger>
          <TabsTrigger value="SCHEDULED">Scheduled ({stats.scheduled})</TabsTrigger>
          <TabsTrigger value="PUBLISHED">Published ({stats.published})</TabsTrigger>
          <TabsTrigger value="FAILED">Failed ({stats.failed})</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="mt-4 flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label htmlFor="search" className="mb-2 block">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <Label htmlFor="platform" className="mb-2 block">
              Platform
            </Label>
            <Select
              id="platform"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform | 'ALL')}
            >
              <option value="ALL">All Platforms</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="FACEBOOK">Facebook</option>
            </Select>
          </div>

          <div className="w-full md:w-48">
            <Label htmlFor="sort" className="mb-2 block">
              Sort By
            </Label>
            <Select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="scheduled">Scheduled Time</option>
            </Select>
          </div>
        </div>

        {/* Content */}
        <TabsContent value={activeTab}>
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
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              {posts && posts.length > 0 ? (
                <>
                  <Filter className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No posts match your filters</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setPlatformFilter('ALL');
                      setActiveTab('all');
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No posts yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create your first post to get started
                  </p>
                  <Link href="/dashboard/posts/create">
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Post
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
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

      {/* Results Count */}
      {filteredPosts.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filteredPosts.length} of {stats.all} posts
        </p>
      )}
    </div>
  );
}

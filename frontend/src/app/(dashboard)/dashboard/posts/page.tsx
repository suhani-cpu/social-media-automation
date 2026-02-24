'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Filter, Send } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PostCard } from '@/components/post/PostCard';
import { PublishProgress } from '@/components/post/PublishProgress';
import { postsApi } from '@/lib/api/posts';
import { PostStatus, Platform } from '@/lib/types/api';

export default function PostsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | PostStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'scheduled'>('newest');
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const { success: showSuccess } = useToast();

  const {
    data: posts,
    isLoading,
    refetch: _refetch,
  } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await postsApi.getAll();
      return response.posts;
    },
    refetchInterval: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => postsApi.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (postId: string) => postsApi.publish(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (postId: string) => postsApi.retry(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const batchPublishMutation = useMutation({
    mutationFn: (postIds: string[]) => postsApi.batchPublish(postIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setSelectedPostIds(new Set());
    },
  });

  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    let filtered = [...posts];

    if (activeTab !== 'all') {
      filtered = filtered.filter((post) => post.status === activeTab);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.video?.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (platformFilter !== 'ALL') {
      filtered = filtered.filter((post) => post.platform === platformFilter);
    }

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

  const selectablePostIds = useMemo(() => {
    return filteredPosts
      .filter((p) => p.status === 'DRAFT' || p.status === 'SCHEDULED' || p.status === 'FAILED')
      .map((p) => p.id);
  }, [filteredPosts]);

  const allSelected =
    selectablePostIds.length > 0 && selectablePostIds.every((id) => selectedPostIds.has(id));

  const handleSelectToggle = (postId: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(selectablePostIds));
    }
  };

  const handleBatchPublish = async () => {
    if (selectedPostIds.size === 0) return;
    try {
      await batchPublishMutation.mutateAsync(Array.from(selectedPostIds));
    } catch {
      // Error handled by mutation
    }
  };

  const handleRetry = async (postId: string) => {
    try {
      const post = posts?.find((p) => p.id === postId);
      await retryMutation.mutateAsync(postId);
      setPublishingPostId(postId);
      setPublishingPlatform(post?.platform || null);
    } catch {
      // Error handled by mutation
    }
  };

  const handlePublish = async (postId: string) => {
    try {
      const post = posts?.find((p) => p.id === postId);
      await publishMutation.mutateAsync(postId);
      setPublishingPostId(postId);
      setPublishingPlatform(post?.platform || null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deleteMutation.mutateAsync(postId);
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
          <h1 className="text-2xl font-bold text-white">Posts</h1>
          <p className="text-sm text-neutral-500">Manage your social media posts</p>
        </div>
        <Link href="/dashboard/posts/create">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
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
        <div className="mt-4 flex flex-col gap-4 rounded-lg border border-[#1a1a1a] bg-[#111] p-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label htmlFor="search" className="mb-2 block text-neutral-400 text-xs">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
              <Input
                id="search"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <Label htmlFor="platform" className="mb-2 block text-neutral-400 text-xs">
              Platform
            </Label>
            <Select
              value={platformFilter}
              onValueChange={(value) => setPlatformFilter(value as Platform | 'ALL')}
            >
              <SelectTrigger id="platform">
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

          <div className="w-full md:w-48">
            <Label htmlFor="sort" className="mb-2 block text-neutral-400 text-xs">
              Sort By
            </Label>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as 'newest' | 'oldest' | 'scheduled')}
            >
              <SelectTrigger id="sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="scheduled">Scheduled Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Batch Actions */}
        {selectablePostIds.length > 0 && (
          <div className="mt-4 flex items-center gap-4 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3">
            <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-neutral-600 bg-[#0a0a0a] accent-red-600"
              />
              Select All ({selectablePostIds.length})
            </label>

            {selectedPostIds.size > 0 && (
              <>
                <span className="text-xs text-neutral-500">{selectedPostIds.size} selected</span>
                <Button
                  size="sm"
                  onClick={handleBatchPublish}
                  disabled={batchPublishMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Send className="mr-2 h-3 w-3" />
                  {batchPublishMutation.isPending
                    ? 'Publishing...'
                    : `Publish ${selectedPostIds.size} Post${selectedPostIds.size > 1 ? 's' : ''}`}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPostIds(new Set())}
                  className="text-neutral-400 hover:text-white"
                >
                  Clear
                </Button>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <TabsContent value={activeTab}>
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
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-8 text-center">
              {posts && posts.length > 0 ? (
                <>
                  <Filter className="mx-auto h-10 w-10 text-neutral-500" />
                  <h3 className="mt-4 text-base font-semibold text-white">
                    No posts match your filters
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setPlatformFilter('ALL');
                      setActiveTab('all');
                    }}
                    className="mt-4 border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a]"
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <Plus className="mx-auto h-10 w-10 text-neutral-500" />
                  <h3 className="mt-4 text-base font-semibold text-white">No posts yet</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Create your first post to get started
                  </p>
                  <Link href="/dashboard/posts/create">
                    <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white">
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
                  onRetry={handleRetry}
                  selected={selectedPostIds.has(post.id)}
                  onSelectToggle={handleSelectToggle}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Results Count */}
      {filteredPosts.length > 0 && (
        <p className="text-center text-xs text-neutral-500">
          Showing {filteredPosts.length} of {stats.all} posts
        </p>
      )}

      {/* Publish Progress Modal */}
      {publishingPostId && (
        <PublishProgress
          postId={publishingPostId}
          platform={publishingPlatform || undefined}
          onClose={() => {
            setPublishingPostId(null);
            setPublishingPlatform(null);
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          }}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            showSuccess('Published!', 'Your post has been published successfully');
          }}
        />
      )}
    </div>
  );
}

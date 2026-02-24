'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Upload, Search, Filter } from 'lucide-react';
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
import { VideoCard } from '@/components/video/VideoCard';
import { videosApi } from '@/lib/api/videos';
import { VideoStatus } from '@/lib/types/api';

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VideoStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await videosApi.getAll();
      return response.videos;
    },
    refetchInterval: 10000, // Refetch every 10 seconds to update processing status
  });

  const filteredVideos = useMemo(() => {
    if (!data) return [];

    let filtered = [...data];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((video) =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((video) => video.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [data, searchQuery, statusFilter, sortBy]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, ready: 0, processing: 0, failed: 0 };
    return {
      total: data.length,
      ready: data.filter((v) => v.status === 'READY').length,
      processing: data.filter((v) => v.status === 'PROCESSING').length,
      failed: data.filter((v) => v.status === 'FAILED').length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Videos</h1>
          <p className="text-muted-foreground">Manage your video library and upload new content</p>
        </div>
        <Link href="/dashboard/videos/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Videos</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Ready</p>
          <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Processing</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.processing}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <Label htmlFor="search" className="mb-2 block">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="w-full md:w-48">
          <Label htmlFor="status" className="mb-2 block">
            Status
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as VideoStatus | 'ALL')}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="READY">Ready</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-48">
          <Label htmlFor="sort" className="mb-2 block">
            Sort By
          </Label>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as 'newest' | 'oldest' | 'title')}
          >
            <SelectTrigger id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="title">Title (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Videos Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-lg bg-gray-200"></div>
              <div className="mt-4 h-4 rounded bg-gray-200"></div>
              <div className="mt-2 h-3 w-2/3 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-destructive">Failed to load videos. Please try again.</p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          {data && data.length > 0 ? (
            <>
              <Filter className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No videos match your filters</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No videos yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload your first video to get started
              </p>
              <Link href="/dashboard/videos/upload">
                <Button className="mt-4">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video
                </Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* Results Count */}
      {filteredVideos.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filteredVideos.length} of {stats.total} videos
        </p>
      )}
    </div>
  );
}

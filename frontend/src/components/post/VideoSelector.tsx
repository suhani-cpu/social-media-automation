'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { videosApi } from '@/lib/api/videos';
import { Video } from '@/lib/types/api';
import { formatFileSize, formatDateTime } from '@/lib/utils';

interface VideoSelectorProps {
  selectedVideo: Video | null;
  onSelect: (video: Video) => void;
}

export function VideoSelector({ selectedVideo, onSelect }: VideoSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await videosApi.getAll();
      return response.videos.filter((v) => v.status === 'READY');
    },
  });

  const filteredVideos = videos?.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Video</h3>
        <p className="text-sm text-muted-foreground">
          Choose a processed video to create your post
        </p>
      </div>

      {/* Search */}
      <div>
        <Label htmlFor="video-search">Search Videos</Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="video-search"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border p-4">
              <div className="h-24 rounded bg-gray-200"></div>
              <div className="mt-2 h-4 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : filteredVideos && filteredVideos.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => onSelect(video)}
              className={`cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
                selectedVideo?.id === video.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100">
                      <span className="text-xs text-muted-foreground">No thumbnail</span>
                    </div>
                  )}
                  {selectedVideo?.id === video.id && (
                    <div className="absolute right-1 top-1">
                      <CheckCircle className="h-5 w-5 text-primary" fill="white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h4 className="font-medium line-clamp-1">{video.title}</h4>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(video.size)}</span>
                    <span>•</span>
                    <span>{formatDateTime(video.createdAt)}</span>
                  </div>
                  <div className="mt-2">
                    <Badge variant="success" className="text-xs">
                      Ready
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {videos?.length === 0
              ? 'No ready videos found. Upload and process a video first.'
              : 'No videos match your search.'}
          </p>
        </div>
      )}
    </div>
  );
}

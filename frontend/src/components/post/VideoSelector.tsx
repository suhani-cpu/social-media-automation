'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Video as VideoIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import apiClient from '@/lib/api/client';
import { Video } from '@/lib/types/api';
import { cn } from '@/lib/utils';

interface VideoSelectorProps {
  selectedVideo: Video | null;
  onSelect: (video: Video) => void;
}

export function VideoSelector({ selectedVideo, onSelect }: VideoSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await apiClient.get<{ videos: Video[] }>('/videos');
      return response.data.videos;
    },
  });

  const readyVideos = videos?.filter((v) => v.status === 'READY') || [];

  const filteredVideos = readyVideos.filter((video) =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading videos...</div>;
  }

  if (readyVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <VideoIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No ready videos found</h3>
        <p className="text-muted-foreground">
          Upload and process a video first before creating a post.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Video</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a processed video to create your post
        </p>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Videos</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
        {filteredVideos.map((video) => (
          <Card
            key={video.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary',
              selectedVideo?.id === video.id && 'border-primary bg-primary/5'
            )}
            onClick={() => onSelect(video)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-20 h-20 bg-muted rounded flex items-center justify-center">
                  <VideoIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{video.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                      Ready
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVideos.length === 0 && searchTerm && (
        <div className="text-center py-8 text-muted-foreground">
          No videos found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}

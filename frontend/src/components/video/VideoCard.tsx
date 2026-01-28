'use client';

import { Video, VideoStatus } from '@/lib/types/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatFileSize, formatDateTime } from '@/lib/utils';
import { Clock, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  onClick?: () => void;
}

const statusConfig: Record<
  VideoStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive'; icon: any }
> = {
  PENDING: {
    label: 'Pending',
    variant: 'default',
    icon: Clock,
  },
  PROCESSING: {
    label: 'Processing',
    variant: 'warning',
    icon: Loader2,
  },
  READY: {
    label: 'Ready',
    variant: 'success',
    icon: CheckCircle,
  },
  FAILED: {
    label: 'Failed',
    variant: 'destructive',
    icon: XCircle,
  },
};

export function VideoCard({ video, onClick }: VideoCardProps) {
  const config = statusConfig[video.status];
  const Icon = config.icon;

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-lg ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-400">
              <Icon className={`mx-auto h-12 w-12 ${config.icon === Loader2 ? 'animate-spin' : ''}`} />
              <p className="mt-2 text-sm">{config.label}</p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute right-2 top-2">
          <Badge variant={config.variant} className="flex items-center gap-1">
            <Icon className={`h-3 w-3 ${config.icon === Loader2 ? 'animate-spin' : ''}`} />
            {config.label}
          </Badge>
        </div>

        {/* Duration Badge (if available) */}
        {video.duration && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="outline" className="bg-black/70 text-white border-0">
              {formatDuration(video.duration)}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <h3 className="font-semibold truncate" title={video.title}>
          {video.title}
        </h3>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(video.size)}</span>
          <span>{formatDateTime(video.createdAt)}</span>
        </div>

        {/* Error Message */}
        {video.status === 'FAILED' && video.errorMessage && (
          <div className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {video.errorMessage}
          </div>
        )}

        {/* Processing Info */}
        {video.status === 'PROCESSING' && (
          <div className="mt-2 text-xs text-muted-foreground">
            Video is being processed. This may take a few minutes.
          </div>
        )}

        {/* Ready Info */}
        {video.status === 'READY' && (
          <div className="mt-2 flex flex-wrap gap-1">
            {video.instagramReelUrl && (
              <Badge variant="outline" className="text-xs">
                IG Reel
              </Badge>
            )}
            {video.instagramFeedUrl && (
              <Badge variant="outline" className="text-xs">
                IG Feed
              </Badge>
            )}
            {video.youtubeShortsUrl && (
              <Badge variant="outline" className="text-xs">
                YT Shorts
              </Badge>
            )}
            {video.youtubeVideoUrl && (
              <Badge variant="outline" className="text-xs">
                YT Video
              </Badge>
            )}
            {video.youtubeSquareUrl && (
              <Badge variant="outline" className="text-xs">
                YT Square
              </Badge>
            )}
            {video.facebookSquareUrl && (
              <Badge variant="outline" className="text-xs">
                FB Square
              </Badge>
            )}
            {video.facebookLandscapeUrl && (
              <Badge variant="outline" className="text-xs">
                FB Landscape
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

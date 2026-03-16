'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Video as VideoIcon, Edit, Trash2, Clock, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video } from '@/lib/types/api';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
  onDelete?: (id: string) => void;
}

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500' },
  DOWNLOADING: { label: 'Downloading', color: 'bg-blue-500/10 text-blue-400' },
  PROCESSING: { label: 'Processing', color: 'bg-blue-500/10 text-blue-400' },
  READY: { label: 'Ready', color: 'bg-green-500/10 text-green-500' },
  FAILED: { label: 'Failed', color: 'bg-red-500/10 text-red-500' },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getStreamUrl(videoId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return `${API_URL}/videos/${videoId}/stream?token=${token || ''}`;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const status = statusConfig[video.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  const isReady = video.status === 'READY';

  const formatSize = (bytes: number | null | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <Card className="overflow-hidden border-[#1a1a1a] bg-[#111] hover:border-[#222] transition-all group">
      <CardContent className="p-0">
        {/* Thumbnail / Video Preview */}
        <div className="relative aspect-video bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
          {isReady && !hasError ? (
            <video
              ref={videoRef}
              src={getStreamUrl(video.id)}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              onMouseEnter={() => videoRef.current?.play()}
              onMouseLeave={() => {
                if (videoRef.current) {
                  videoRef.current.pause();
                  videoRef.current.currentTime = 0;
                }
              }}
              onError={() => setHasError(true)}
            />
          ) : (
            <VideoIcon className="h-10 w-10 text-neutral-600" />
          )}

          {/* Play icon overlay for ready videos */}
          {isReady && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-0 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                status.color
              )}
            >
              {(video.status === 'PROCESSING' || video.status === 'DOWNLOADING') && (
                <Clock className="mr-1 h-3 w-3 animate-spin" />
              )}
              {status.label}
            </span>
          </div>

          {/* Quick Actions Overlay */}
          {video.status === 'READY' && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Link href={`/dashboard/videos/edit/${video.id}`}>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                  <Edit className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-medium text-sm text-white truncate mb-1">{video.title}</h3>
          <p className="text-xs text-neutral-500">
            {formatSize(video.fileSize)}
            {video.fileSize ? ' - ' : ''}
            {new Date(video.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            {video.status === 'READY' && (
              <Link href={`/dashboard/videos/edit/${video.id}`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] hover:text-white text-xs"
                >
                  <Edit className="mr-2 h-3.5 w-3.5" />
                  Edit Video
                </Button>
              </Link>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(video.id)}
                className="text-neutral-500 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

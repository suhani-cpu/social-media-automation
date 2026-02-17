'use client';

import Link from 'next/link';
import { Video as VideoIcon, Edit, Trash2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video } from '@/lib/types/api';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
  onDelete?: (id: string) => void;
}

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-[hsl(var(--status-pending))]/10 text-[hsl(var(--status-pending))]', glow: 'shadow-[0_0_15px_hsla(48,100%,58%,0.3)]' },
  PROCESSING: { label: 'Processing', color: 'bg-[hsl(var(--status-processing))]/10 text-[hsl(var(--status-processing))]', glow: 'shadow-[0_0_15px_hsla(271,76%,63%,0.3)]' },
  READY: { label: 'Ready', color: 'bg-[hsl(var(--status-success))]/10 text-[hsl(var(--status-success))]', glow: 'shadow-[0_0_15px_hsla(142,71%,50%,0.3)]' },
  FAILED: { label: 'Failed', color: 'bg-[hsl(var(--status-error))]/10 text-[hsl(var(--status-error))]', glow: 'shadow-[0_0_15px_hsla(0,84%,55%,0.3)]' },
};

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const status = statusConfig[video.status as keyof typeof statusConfig] || statusConfig.PENDING;

  return (
    <Card className="overflow-hidden hover:border-primary transition-all group hover-scale hover:shadow-lg hover:shadow-primary/20">
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-muted via-muted to-muted/50 flex items-center justify-center">
          <VideoIcon className="h-12 w-12 text-muted-foreground" />

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm',
              status.color,
              status.glow
            )}>
              {video.status === 'PROCESSING' && (
                <Clock className="mr-1 h-3 w-3 animate-spin" />
              )}
              {status.label}
            </span>
          </div>

          {/* Quick Actions Overlay */}
          {video.status === 'READY' && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Link href={`/dashboard/videos/edit/${video.id}`}>
                <Button size="sm" variant="secondary">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold truncate mb-1">{video.title}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(video.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            {video.status === 'READY' && (
              <Link href={`/dashboard/videos/edit/${video.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Video
                </Button>
              </Link>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(video.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

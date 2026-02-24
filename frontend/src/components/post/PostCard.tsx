'use client';

import { useState } from 'react';
import {
  Instagram,
  Youtube,
  Facebook,
  Calendar,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  Send,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Post, PostStatus } from '@/lib/types/api';
import { formatDateTime } from '@/lib/utils';

interface PostCardProps {
  post: Post;
  onPublish?: (postId: string) => void;
  onReschedule?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onRetry?: (postId: string) => void;
  selected?: boolean;
  onSelectToggle?: (postId: string) => void;
}

const platformConfig: Record<string, any> = {
  INSTAGRAM: { name: 'Instagram', icon: Instagram },
  YOUTUBE: { name: 'YouTube', icon: Youtube },
  FACEBOOK: { name: 'Facebook', icon: Facebook },
};

const statusConfig: Record<
  PostStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }
> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  SCHEDULED: { label: 'Scheduled', variant: 'warning' },
  PUBLISHING: { label: 'Publishing', variant: 'warning' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
};

export function PostCard({
  post,
  onPublish,
  onReschedule,
  onDelete,
  onRetry,
  selected,
  onSelectToggle,
}: PostCardProps) {
  const [showActions, setShowActions] = useState(false);
  const config = platformConfig[post.platform];
  const statusCfg = statusConfig[post.status];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden border-[#1a1a1a] bg-[#111] transition-all hover:border-[#222]">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Selection Checkbox */}
          {onSelectToggle &&
            (post.status === 'DRAFT' ||
              post.status === 'SCHEDULED' ||
              post.status === 'FAILED') && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selected || false}
                  onChange={() => onSelectToggle(post.id)}
                  className="h-4 w-4 rounded border-neutral-600 bg-[#0a0a0a] accent-red-600"
                />
              </div>
            )}

          {/* Thumbnail */}
          {post.video?.thumbnailUrl && (
            <div className="h-24 w-32 flex-shrink-0 overflow-hidden rounded">
              <img
                src={post.video.thumbnailUrl}
                alt={post.video.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-white">{config.name}</span>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                {post.video && <p className="mt-1 text-xs text-neutral-500">{post.video.title}</p>}
              </div>

              {/* Actions Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowActions(!showActions)}
                  className="text-neutral-400 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {showActions && (
                  <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-[#1a1a1a] bg-[#111] shadow-lg">
                    <div className="py-1">
                      {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && onPublish && (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
                          onClick={() => {
                            onPublish(post.id);
                            setShowActions(false);
                          }}
                        >
                          <Send className="h-4 w-4" />
                          Publish Now
                        </button>
                      )}
                      {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && onReschedule && (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
                          onClick={() => {
                            onReschedule(post.id);
                            setShowActions(false);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          Reschedule
                        </button>
                      )}
                      {post.status === 'FAILED' && onRetry && (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
                          onClick={() => {
                            onRetry(post.id);
                            setShowActions(false);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retry Publish
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-[#1a1a1a]"
                          onClick={() => {
                            onDelete(post.id);
                            setShowActions(false);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Caption */}
            <p className="line-clamp-2 text-sm text-neutral-300">{post.caption}</p>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.hashtags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="text-xs text-red-500">
                    {tag}
                  </span>
                ))}
                {post.hashtags.length > 3 && (
                  <span className="text-xs text-neutral-500">+{post.hashtags.length - 3} more</span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-4">
                {post.scheduledFor && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(post.scheduledFor)}
                  </div>
                )}
                {post.publishedAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Published {formatDateTime(post.publishedAt)}
                  </div>
                )}
                {post.account && <span>@{post.account.username}</span>}
              </div>
              <span className="uppercase">{post.postType}</span>
            </div>

            {/* Error Message */}
            {post.status === 'FAILED' && post.errorMessage && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
                {post.errorMessage}
              </div>
            )}

            {/* Platform URL */}
            {post.status === 'PUBLISHED' && post.platformUrl && (
              <a
                href={post.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-500 hover:text-red-400"
              >
                View on {config.name}
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

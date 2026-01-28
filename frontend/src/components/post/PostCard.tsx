'use client';

import { useState } from 'react';
import { Instagram, Youtube, Facebook, Calendar, Clock, MoreVertical, Trash2, Edit, Send } from 'lucide-react';
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
}

const platformConfig = {
  INSTAGRAM: { name: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
  YOUTUBE: { name: 'YouTube', icon: Youtube, color: 'text-red-600', bg: 'bg-red-50' },
  FACEBOOK: { name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
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

export function PostCard({ post, onPublish, onReschedule, onDelete }: PostCardProps) {
  const [showActions, setShowActions] = useState(false);
  const config = platformConfig[post.platform];
  const statusCfg = statusConfig[post.status];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex gap-4">
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
                  <div className={`rounded-full p-1 ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <span className="font-medium">{config.name}</span>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                {post.video && (
                  <p className="mt-1 text-sm text-muted-foreground">{post.video.title}</p>
                )}
              </div>

              {/* Actions Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowActions(!showActions)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {showActions && (
                  <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border bg-white shadow-lg">
                    <div className="py-1">
                      {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && onPublish && (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => {
                            onPublish(post.id);
                            setShowActions(false);
                          }}
                        >
                          <Send className="h-4 w-4" />
                          Publish Now
                        </button>
                      )}
                      {(post.status === 'DRAFT' || post.status === 'SCHEDULED') &&
                        onReschedule && (
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                            onClick={() => {
                              onReschedule(post.id);
                              setShowActions(false);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            Reschedule
                          </button>
                        )}
                      {onDelete && (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-gray-100"
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
            <p className="line-clamp-2 text-sm">{post.caption}</p>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.hashtags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="text-xs text-primary">
                    {tag}
                  </span>
                ))}
                {post.hashtags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{post.hashtags.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
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
              <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {post.errorMessage}
              </div>
            )}

            {/* Platform URL */}
            {post.status === 'PUBLISHED' && post.platformUrl && (
              <a
                href={post.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
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

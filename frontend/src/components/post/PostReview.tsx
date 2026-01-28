'use client';

import { Instagram, Youtube, Facebook, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Language, Platform, PostType } from '@/lib/types/api';
import { formatFileSize } from '@/lib/utils';
import { CaptionVariation } from '@/lib/api/posts';

interface PlatformSelection {
  platform: Platform;
  accountId: string;
  accountUsername?: string;
  postType: PostType;
}

interface PostReviewProps {
  video: Video;
  caption: CaptionVariation;
  language: Language;
  platforms: PlatformSelection[];
  scheduledFor: string | null;
}

const platformConfig = {
  INSTAGRAM: { name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  YOUTUBE: { name: 'YouTube', icon: Youtube, color: 'text-red-600' },
  FACEBOOK: { name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
};

const languageNames: Record<Language, string> = {
  ENGLISH: 'English',
  HINGLISH: 'Hinglish',
  HARYANVI: 'Haryanvi',
  HINDI: 'Hindi',
};

export function PostReview({
  video,
  caption,
  language,
  platforms,
  scheduledFor,
}: PostReviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review & Confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review your post details before publishing
        </p>
      </div>

      {/* Video Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Video</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {video.thumbnailUrl && (
              <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-medium">{video.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatFileSize(video.size)}
              </p>
              <Badge variant="success" className="mt-2">
                Ready
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Caption */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Caption</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Language</p>
              <p className="mt-1">{languageNames[language]}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Text</p>
              <p className="mt-1 whitespace-pre-wrap">{caption.caption}</p>
            </div>
            {caption.hashtags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hashtags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {caption.hashtags.map((tag, index) => (
                    <span key={index} className="text-sm text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Platforms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {platforms.map((selection, index) => {
              const config = platformConfig[selection.platform];
              const Icon = config.icon;
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <p className="font-medium">{config.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selection.accountUsername || 'Account'} • {selection.postType}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{selection.postType}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledFor ? (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Scheduled</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(scheduledFor).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Publish Now</p>
                <p className="text-sm text-muted-foreground">
                  Post will be created as draft and can be published immediately
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="rounded-lg border bg-primary/5 p-4">
        <p className="text-sm font-medium">
          {scheduledFor
            ? `This post will be scheduled for ${platforms.length} platform${
                platforms.length > 1 ? 's' : ''
              }`
            : `This post will be created and ready to publish on ${platforms.length} platform${
                platforms.length > 1 ? 's' : ''
              }`}
        </p>
      </div>
    </div>
  );
}

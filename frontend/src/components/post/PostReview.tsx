'use client';

import { Instagram, Youtube, Facebook, Calendar, Clock, Video as VideoIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Language } from '@/lib/types/api';
import { PlatformSelection } from '@/lib/types/post';
import { formatFileSize } from '@/lib/utils';
import { CaptionVariation } from '@/lib/api/posts';
import { cn } from '@/lib/utils';

interface PostReviewProps {
  video: Video;
  caption: CaptionVariation;
  language: Language;
  platforms: PlatformSelection[];
  scheduledFor: string | null;
  onCaptionEdit?: (updated: CaptionVariation) => void;
}

const platformConfig: Record<string, any> = {
  INSTAGRAM: { name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  YOUTUBE: { name: 'YouTube', icon: Youtube, color: 'text-red-600' },
  FACEBOOK: { name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
};

const languageNames: Record<Language, string> = {
  ENGLISH: 'English',
  HINGLISH: 'Hinglish',
  HARYANVI: 'Haryanvi',
  HINDI: 'Hindi',
  RAJASTHANI: 'Rajasthani',
  BHOJPURI: 'Bhojpuri',
};

export function PostReview({
  video,
  caption,
  language,
  platforms,
  scheduledFor,
  onCaptionEdit,
}: PostReviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review & Confirm</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Review your post details before publishing
        </p>
      </div>

      {/* Video Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Video</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-24 h-24 bg-muted rounded flex items-center justify-center">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <VideoIcon className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{video.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {formatFileSize(video.fileSize || video.size || 0)}
                {video.duration && ` • ${Math.round(video.duration)}s`}
              </p>
              <div className="mt-2">
                <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                  Ready
                </Badge>
              </div>
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
              <p className="text-sm font-medium text-muted-foreground mb-1">Language</p>
              <p>{languageNames[language]}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Text</p>
              {onCaptionEdit ? (
                <textarea
                  value={caption.caption}
                  onChange={(e) => onCaptionEdit({ ...caption, caption: e.target.value })}
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={4}
                />
              ) : (
                <p className="whitespace-pre-wrap">{caption.caption}</p>
              )}
            </div>
            {caption.hashtags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {caption.hashtags.map((tag, index) => (
                    <span key={index} className="text-sm text-primary font-medium">
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
                    <Icon className={cn('h-5 w-5', config.color)} />
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

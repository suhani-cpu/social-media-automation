'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Instagram,
  Youtube,
  Facebook,
  X,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday as isDateToday, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Post, Platform, PostStatus } from '@/lib/types/api';

interface CalendarViewProps {
  posts: Post[];
  onPostClick?: (post: Post) => void;
}

const platformColors: Record<string, { bg: string; border: string; text: string; dot: string; iconColor: string }> = {
  INSTAGRAM: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    dot: 'bg-purple-500',
    iconColor: 'text-purple-400',
  },
  YOUTUBE: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-500',
    iconColor: 'text-red-400',
  },
  FACEBOOK: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-500',
    iconColor: 'text-blue-400',
  },
  TWITTER: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    dot: 'bg-sky-500',
    iconColor: 'text-sky-400',
  },
  LINKEDIN: {
    bg: 'bg-blue-600/10',
    border: 'border-blue-600/30',
    text: 'text-blue-300',
    dot: 'bg-blue-600',
    iconColor: 'text-blue-300',
  },
  GOOGLE_DRIVE: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    dot: 'bg-green-500',
    iconColor: 'text-green-400',
  },
};

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  INSTAGRAM: Instagram,
  YOUTUBE: Youtube,
  FACEBOOK: Facebook,
};

const statusLabels: Record<PostStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHING: 'Publishing',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
};

function getPlatformColor(platform: string) {
  return platformColors[platform] || platformColors.INSTAGRAM;
}

function getPlatformIcon(platform: string) {
  return platformIcons[platform] || Calendar;
}

export function CalendarView({ posts, onPostClick }: CalendarViewProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Week boundaries (Mon-Sun)
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Filter posts that fall within the current week (scheduled or published)
  const weekPosts = useMemo(() => {
    return posts.filter((post) => {
      const dateStr = post.scheduledFor || post.publishedAt;
      if (!dateStr) return false;
      const postDate = new Date(dateStr);
      return postDate >= weekStart && postDate <= weekEnd;
    });
  }, [posts, weekStart, weekEnd]);

  // Group posts by day
  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    weekDays.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd');
      map.set(key, []);
    });
    weekPosts.forEach((post) => {
      const dateStr = post.scheduledFor || post.publishedAt;
      if (!dateStr) return;
      const postDate = new Date(dateStr);
      const key = format(postDate, 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      existing.push(post);
      map.set(key, existing);
    });
    // Sort each day's posts by time
    map.forEach((dayPosts) => {
      dayPosts.sort((a, b) => {
        const aDate = new Date(a.scheduledFor || a.publishedAt || '');
        const bDate = new Date(b.scheduledFor || b.publishedAt || '');
        return aDate.getTime() - bDate.getTime();
      });
    });
    return map;
  }, [weekPosts, weekDays]);

  const goToPreviousWeek = useCallback(() => setCurrentDate((d) => subWeeks(d, 1)), []);
  const goToNextWeek = useCallback(() => setCurrentDate((d) => addWeeks(d, 1)), []);
  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleEmptySlotClick = (day: Date) => {
    const dateParam = format(day, 'yyyy-MM-dd');
    router.push(`/dashboard/schedule?date=${dateParam}`);
  };

  const handlePostItemClick = (post: Post) => {
    setSelectedPost(post);
    onPostClick?.(post);
  };

  const formatWeekRange = () => {
    const startMonth = format(weekStart, 'MMM d');
    const endMonth = format(weekEnd, 'MMM d, yyyy');
    return `${startMonth} - ${endMonth}`;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{formatWeekRange()}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {weekPosts.length} post{weekPosts.length !== 1 ? 's' : ''} this week
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="border-[#1a1a1a] bg-transparent text-neutral-300 hover:bg-[#1a1a1a] hover:text-white text-xs"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              className="border-[#1a1a1a] bg-transparent text-neutral-300 hover:bg-[#1a1a1a] hover:text-white h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              className="border-[#1a1a1a] bg-transparent text-neutral-300 hover:bg-[#1a1a1a] hover:text-white h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayPosts = postsByDay.get(key) || [];
          const today = isDateToday(day);

          return (
            <div
              key={key}
              className={`min-h-[280px] rounded-lg border transition-colors ${
                today
                  ? 'border-red-600/40 bg-red-600/5'
                  : 'border-[#1a1a1a] bg-[#111] hover:border-[#252525]'
              }`}
            >
              {/* Day Header */}
              <div
                className={`flex items-center justify-between border-b px-3 py-2.5 ${
                  today ? 'border-red-600/20' : 'border-[#1a1a1a]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    {format(day, 'EEE')}
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      today
                        ? 'bg-red-600 text-white'
                        : 'text-neutral-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                {dayPosts.length > 0 && (
                  <span className="text-[10px] font-medium text-neutral-500">
                    {dayPosts.length}
                  </span>
                )}
              </div>

              {/* Posts List */}
              <div className="space-y-1.5 p-2">
                {dayPosts.map((post) => {
                  const colors = getPlatformColor(post.platform);
                  const PlatformIcon = getPlatformIcon(post.platform);
                  const postDate = new Date(post.scheduledFor || post.publishedAt || '');
                  const timeStr = format(postDate, 'h:mm a');
                  const captionPreview =
                    post.caption.length > 45
                      ? post.caption.substring(0, 45) + '...'
                      : post.caption;

                  return (
                    <button
                      key={post.id}
                      onClick={() => handlePostItemClick(post)}
                      className={`w-full rounded-md border p-2 text-left transition-all hover:brightness-125 ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <PlatformIcon className={`h-3 w-3 flex-shrink-0 ${colors.iconColor}`} />
                        <span className={`text-[11px] font-semibold ${colors.text}`}>
                          {timeStr}
                        </span>
                        {post.status === 'PUBLISHED' && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500" />
                        )}
                        {post.status === 'FAILED' && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-tight text-neutral-400 line-clamp-2">
                        {captionPreview}
                      </p>
                    </button>
                  );
                })}

                {/* Empty slot - click to schedule */}
                {dayPosts.length === 0 && (
                  <button
                    onClick={() => handleEmptySlotClick(day)}
                    className="flex h-[200px] w-full items-center justify-center rounded-md border border-dashed border-[#1a1a1a] text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-400"
                  >
                    <div className="text-center">
                      <span className="block text-xl">+</span>
                      <span className="mt-1 block text-[10px]">Schedule</span>
                    </div>
                  </button>
                )}

                {/* Add more button when posts exist */}
                {dayPosts.length > 0 && (
                  <button
                    onClick={() => handleEmptySlotClick(day)}
                    className="flex w-full items-center justify-center rounded-md border border-dashed border-[#1a1a1a] py-1.5 text-[10px] text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-400"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#1a1a1a] bg-[#111] px-4 py-3 text-xs">
        <span className="font-medium text-neutral-500">Platforms:</span>
        {(['INSTAGRAM', 'YOUTUBE', 'FACEBOOK'] as const).map((platform) => {
          const colors = getPlatformColor(platform);
          const PlatformIcon = getPlatformIcon(platform);
          return (
            <div key={platform} className="flex items-center gap-1.5">
              <PlatformIcon className={`h-3.5 w-3.5 ${colors.iconColor}`} />
              <span className="capitalize text-neutral-400">{platform.toLowerCase()}</span>
            </div>
          );
        })}
        <span className="ml-2 text-neutral-600">|</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-neutral-400">Published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-neutral-400">Failed</span>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[#1a1a1a] bg-[#111] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const colors = getPlatformColor(selectedPost.platform);
                  const PIcon = getPlatformIcon(selectedPost.platform);
                  return (
                    <>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg} ${colors.border} border`}>
                        <PIcon className={`h-4 w-4 ${colors.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white capitalize">
                          {selectedPost.platform.toLowerCase()} Post
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {selectedPost.postType.toLowerCase()} &middot; {statusLabels[selectedPost.status]}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPost(null)}
                className="h-8 w-8 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-5 py-4">
              {/* Thumbnail */}
              {selectedPost.video?.thumbnailUrl && (
                <div className="overflow-hidden rounded-lg">
                  <img
                    src={selectedPost.video.thumbnailUrl}
                    alt={selectedPost.video.title || 'Post thumbnail'}
                    className="h-48 w-full object-cover"
                  />
                </div>
              )}

              {/* Video Title */}
              {selectedPost.video?.title && (
                <div>
                  <p className="text-xs font-medium text-neutral-500">Video</p>
                  <p className="mt-0.5 text-sm text-neutral-300">{selectedPost.video.title}</p>
                </div>
              )}

              {/* Caption */}
              <div>
                <p className="text-xs font-medium text-neutral-500">Caption</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap">
                  {selectedPost.caption}
                </p>
              </div>

              {/* Hashtags */}
              {selectedPost.hashtags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500">Hashtags</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedPost.hashtags.map((tag, i) => {
                      const colors = getPlatformColor(selectedPost.platform);
                      return (
                        <span
                          key={i}
                          className={`rounded-full border px-2 py-0.5 text-xs ${colors.bg} ${colors.border} ${colors.text}`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Schedule / Publish Info */}
              <div className="grid grid-cols-2 gap-3">
                {selectedPost.scheduledFor && (
                  <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                      Scheduled For
                    </p>
                    <p className="mt-1 text-xs text-neutral-300">
                      {format(new Date(selectedPost.scheduledFor), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {format(new Date(selectedPost.scheduledFor), 'h:mm a')}
                    </p>
                  </div>
                )}
                {selectedPost.publishedAt && (
                  <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                      Published At
                    </p>
                    <p className="mt-1 text-xs text-neutral-300">
                      {format(new Date(selectedPost.publishedAt), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {format(new Date(selectedPost.publishedAt), 'h:mm a')}
                    </p>
                  </div>
                )}
              </div>

              {/* Account */}
              {selectedPost.account && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>Account:</span>
                  <span className="text-neutral-300">@{selectedPost.account.username}</span>
                </div>
              )}

              {/* Error */}
              {selectedPost.status === 'FAILED' && selectedPost.errorMessage && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  {selectedPost.errorMessage}
                </div>
              )}

              {/* Platform URL */}
              {selectedPost.platformUrl && (
                <a
                  href={selectedPost.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on {selectedPost.platform.toLowerCase()}
                </a>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#1a1a1a] px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPost(null)}
                className="w-full border-[#1a1a1a] bg-transparent text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

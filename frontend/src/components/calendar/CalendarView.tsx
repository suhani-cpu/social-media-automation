'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Instagram, Youtube, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Post, Platform } from '@/lib/types/api';

interface CalendarViewProps {
  posts: Post[];
  onPostClick?: (post: Post) => void;
}

const platformConfig: Record<string, any> = {
  INSTAGRAM: { icon: Instagram, color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  YOUTUBE: { icon: Youtube, color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  FACEBOOK: { icon: Facebook, color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export function CalendarView({ posts, onPostClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const scheduledPosts = useMemo(() => {
    return posts.filter((post) => post.scheduledFor && post.status === 'SCHEDULED');
  }, [posts]);

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter((post) => {
      if (!post.scheduledFor) return false;
      const postDate = new Date(post.scheduledFor);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const previousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
      {/* Calendar Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] text-xs"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={previousMonth}
            className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Day Names */}
        {dayNames.map((day) => (
          <div key={day} className="p-2 text-center text-xs font-medium text-neutral-500">
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="p-2"></div>;
          }

          const date = new Date(year, month, day);
          const postsOnDate = getPostsForDate(date);
          const today = isToday(date);

          return (
            <div
              key={day}
              className={`min-h-24 rounded-md border p-2 transition-colors hover:bg-[#1a1a1a]/50 ${
                today ? 'border-red-600/50 bg-red-600/5' : 'border-[#1a1a1a]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${today ? 'text-red-500' : 'text-neutral-400'}`}
                >
                  {day}
                </span>
                {postsOnDate.length > 0 && (
                  <Badge variant="outline" className="h-4 text-[10px] px-1.5 border-[#1a1a1a]">
                    {postsOnDate.length}
                  </Badge>
                )}
              </div>

              {/* Posts */}
              <div className="space-y-1">
                {postsOnDate.slice(0, 3).map((post) => {
                  const pConfig = platformConfig[post.platform];
                  const PIcon = pConfig.icon;
                  const time = post.scheduledFor
                    ? new Date(post.scheduledFor).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <div
                      key={post.id}
                      className={`cursor-pointer rounded border p-1 text-[10px] transition-colors hover:bg-[#1a1a1a] ${pConfig.color}`}
                      onClick={() => onPostClick?.(post)}
                    >
                      <div className="flex items-center gap-1">
                        <PIcon className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate font-medium">{time}</span>
                      </div>
                    </div>
                  );
                })}

                {postsOnDate.length > 3 && (
                  <div className="text-[10px] text-neutral-500">+{postsOnDate.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#1a1a1a] pt-4 text-xs">
        <span className="font-medium text-neutral-400">Legend:</span>
        {(Object.keys(platformConfig) as Platform[]).map((platform) => {
          const pConfig = platformConfig[platform];
          const PIcon = pConfig.icon;
          return (
            <div key={platform} className="flex items-center gap-1.5">
              <PIcon className="h-3 w-3 text-red-500" />
              <span className="capitalize text-neutral-500">{platform.toLowerCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

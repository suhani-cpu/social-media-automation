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

const platformConfig = {
  INSTAGRAM: { icon: Instagram, color: 'bg-pink-100 text-pink-700 border-pink-300' },
  YOUTUBE: { icon: Youtube, color: 'bg-red-100 text-red-700 border-red-300' },
  FACEBOOK: { icon: Facebook, color: 'bg-blue-100 text-blue-700 border-blue-300' },
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

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

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
    <div className="rounded-lg border bg-card p-6">
      {/* Calendar Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Names */}
        {dayNames.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
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
              className={`min-h-24 rounded-lg border p-2 transition-colors hover:bg-accent ${
                today ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`text-sm font-medium ${
                    today ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {day}
                </span>
                {postsOnDate.length > 0 && (
                  <Badge variant="outline" className="h-5 text-xs">
                    {postsOnDate.length}
                  </Badge>
                )}
              </div>

              {/* Posts */}
              <div className="space-y-1">
                {postsOnDate.slice(0, 3).map((post) => {
                  const config = platformConfig[post.platform];
                  const Icon = config.icon;
                  const time = post.scheduledFor
                    ? new Date(post.scheduledFor).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <div
                      key={post.id}
                      className={`cursor-pointer rounded border p-1 text-xs transition-colors hover:shadow-sm ${config.color}`}
                      onClick={() => onPostClick?.(post)}
                    >
                      <div className="flex items-center gap-1">
                        <Icon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate font-medium">{time}</span>
                      </div>
                      <p className="line-clamp-1 mt-0.5">{post.caption}</p>
                    </div>
                  );
                })}

                {postsOnDate.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{postsOnDate.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t pt-4 text-sm">
        <span className="font-medium">Legend:</span>
        {(Object.keys(platformConfig) as Platform[]).map((platform) => {
          const config = platformConfig[platform];
          const Icon = config.icon;
          return (
            <div key={platform} className="flex items-center gap-2">
              <div className={`rounded border p-1 ${config.color}`}>
                <Icon className="h-3 w-3" />
              </div>
              <span className="capitalize">{platform.toLowerCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

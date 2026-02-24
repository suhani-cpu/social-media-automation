'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Shield, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { analyticsApi } from '@/lib/api/posts';
import { cn } from '@/lib/utils';

interface ScheduleSelectorProps {
  scheduledFor: string | null;
  onScheduleChange: (scheduledFor: string | null) => void;
  privacyStatus: string;
  onPrivacyChange: (privacy: string) => void;
  hasYouTube?: boolean;
}

export function ScheduleSelector({
  scheduledFor,
  onScheduleChange,
  privacyStatus,
  onPrivacyChange,
  hasYouTube = false,
}: ScheduleSelectorProps) {
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>(scheduledFor ? 'later' : 'now');

  const { data: bestTimes } = useQuery({
    queryKey: ['best-times'],
    queryFn: () => analyticsApi.getBestTimes(),
    staleTime: 60000,
  });

  const handleTypeChange = (type: 'now' | 'later') => {
    setScheduleType(type);
    if (type === 'now') {
      onScheduleChange(null);
    } else {
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 1);
      onScheduleChange(defaultDate.toISOString().slice(0, 16));
    }
  };

  const applySuggestedTime = (hour: number) => {
    const now = new Date();
    const suggested = new Date();
    suggested.setHours(hour, 0, 0, 0);
    // If the time already passed today, schedule for tomorrow
    if (suggested <= now) {
      suggested.setDate(suggested.getDate() + 1);
    }
    setScheduleType('later');
    onScheduleChange(suggested.toISOString().slice(0, 16));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Publish Settings</h3>
        <p className="text-sm text-neutral-500 mb-4">Choose when and how to publish</p>
      </div>

      {/* Schedule Type Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={cn(
            'cursor-pointer transition-all border-[#1a1a1a] bg-[#0a0a0a] hover:border-red-500/50',
            scheduleType === 'now' && 'border-red-500 bg-red-500/5'
          )}
          onClick={() => handleTypeChange('now')}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                  scheduleType === 'now' ? 'border-red-500 bg-red-500' : 'border-neutral-600'
                )}
              >
                {scheduleType === 'now' && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-red-500" />
                  <h4 className="font-semibold text-white">Publish Now</h4>
                </div>
                <p className="text-sm text-neutral-500">Post will be published immediately</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all border-[#1a1a1a] bg-[#0a0a0a] hover:border-red-500/50',
            scheduleType === 'later' && 'border-red-500 bg-red-500/5'
          )}
          onClick={() => handleTypeChange('later')}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                  scheduleType === 'later' ? 'border-red-500 bg-red-500' : 'border-neutral-600'
                )}
              >
                {scheduleType === 'later' && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-5 w-5 text-red-500" />
                  <h4 className="font-semibold text-white">Schedule for Later</h4>
                </div>
                <p className="text-sm text-neutral-500">Choose a specific date and time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date/Time Picker + Best Time Suggestions */}
      {scheduleType === 'later' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scheduled-datetime" className="text-neutral-400">
              Date and Time
            </Label>
            <Input
              id="scheduled-datetime"
              type="datetime-local"
              value={scheduledFor || ''}
              onChange={(e) => onScheduleChange(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="bg-[#0a0a0a] border-[#1a1a1a] text-white"
            />
            <p className="text-xs text-neutral-500">
              Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>

          {/* AI Best Time Suggestions */}
          {(bestTimes?.bestHours?.length > 0 || bestTimes?.defaultSuggestions?.length > 0) && (
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-red-500" />
                <p className="text-xs font-medium text-neutral-300">
                  {bestTimes?.hasEnoughData
                    ? 'AI Suggested Times (based on your data)'
                    : 'Suggested Times'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {bestTimes?.bestHours?.slice(0, 4).map((h: any, i: number) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    onClick={() => applySuggestedTime(h.hour)}
                    className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] text-xs"
                  >
                    {h.hour.toString().padStart(2, '0')}:00
                    {h.avgEngagement > 0 && (
                      <span className="ml-1 text-red-500">{h.avgEngagement}%</span>
                    )}
                  </Button>
                ))}
                {!bestTimes?.hasEnoughData &&
                  bestTimes?.defaultSuggestions?.map((s: string, i: number) => (
                    <span key={i} className="text-xs text-neutral-500 px-2 py-1 bg-[#111] rounded">
                      {s}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {scheduledFor && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm">
              <p className="font-medium text-white mb-1">Scheduled for:</p>
              <p className="text-neutral-400">
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
          )}
        </div>
      )}

      {/* YouTube Privacy Selection */}
      {hasYouTube && (
        <div className="space-y-3 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            <Label className="text-white font-medium">YouTube Privacy</Label>
          </div>
          <Select value={privacyStatus} onValueChange={onPrivacyChange}>
            <SelectTrigger className="bg-[#111] border-[#1a1a1a] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public — Anyone can search and view</SelectItem>
              <SelectItem value="unlisted">Unlisted — Only people with the link</SelectItem>
              <SelectItem value="private">Private — Only you can view</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-neutral-500">
            This controls who can see your video on YouTube
          </p>
        </div>
      )}
    </div>
  );
}

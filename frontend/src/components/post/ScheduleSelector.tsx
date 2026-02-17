'use client';

import { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ScheduleSelectorProps {
  scheduledFor: string | null;
  onScheduleChange: (scheduledFor: string | null) => void;
}

export function ScheduleSelector({ scheduledFor, onScheduleChange }: ScheduleSelectorProps) {
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>(
    scheduledFor ? 'later' : 'now'
  );

  const handleTypeChange = (type: 'now' | 'later') => {
    setScheduleType(type);
    if (type === 'now') {
      onScheduleChange(null);
    } else {
      // Set default to 1 hour from now
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 1);
      onScheduleChange(defaultDate.toISOString().slice(0, 16));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Schedule Post</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Publish now or schedule for later
        </p>
      </div>

      {/* Schedule Type Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={cn(
            'cursor-pointer transition-all hover:border-primary',
            scheduleType === 'now' && 'border-primary bg-primary/5'
          )}
          onClick={() => handleTypeChange('now')}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                  scheduleType === 'now' ? 'border-primary bg-primary' : 'border-gray-300'
                )}
              >
                {scheduleType === 'now' && <div className="h-2 w-2 rounded-full bg-white"></div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Publish Now</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Post will be published immediately
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all hover:border-primary',
            scheduleType === 'later' && 'border-primary bg-primary/5'
          )}
          onClick={() => handleTypeChange('later')}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                  scheduleType === 'later' ? 'border-primary bg-primary' : 'border-gray-300'
                )}
              >
                {scheduleType === 'later' && (
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Schedule for Later</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose a specific date and time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date/Time Picker */}
      {scheduleType === 'later' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scheduled-datetime">Date and Time</Label>
            <Input
              id="scheduled-datetime"
              type="datetime-local"
              value={scheduledFor || ''}
              onChange={(e) => onScheduleChange(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground">
              Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>

          {scheduledFor && (
            <div className="rounded-lg border bg-primary/5 p-3 text-sm">
              <p className="font-medium mb-1">Scheduled for:</p>
              <p className="text-muted-foreground">
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
    </div>
  );
}

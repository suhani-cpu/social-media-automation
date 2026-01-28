'use client';

import { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

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
        <h3 className="text-lg font-semibold">Schedule Post</h3>
        <p className="text-sm text-muted-foreground">
          Publish now or schedule for later
        </p>
      </div>

      {/* Schedule Type Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={`cursor-pointer p-4 transition-all hover:shadow-md ${
            scheduleType === 'now' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => handleTypeChange('now')}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                scheduleType === 'now'
                  ? 'border-primary bg-primary'
                  : 'border-gray-300'
              }`}
            >
              {scheduleType === 'now' && (
                <div className="h-2 w-2 rounded-full bg-white"></div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Publish Now</h4>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Post will be published immediately
              </p>
            </div>
          </div>
        </Card>

        <Card
          className={`cursor-pointer p-4 transition-all hover:shadow-md ${
            scheduleType === 'later' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => handleTypeChange('later')}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                scheduleType === 'later'
                  ? 'border-primary bg-primary'
                  : 'border-gray-300'
              }`}
            >
              {scheduleType === 'later' && (
                <div className="h-2 w-2 rounded-full bg-white"></div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Schedule for Later</h4>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a specific date and time
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Date/Time Picker */}
      {scheduleType === 'later' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="scheduled-datetime">Date and Time</Label>
            <Input
              id="scheduled-datetime"
              type="datetime-local"
              value={scheduledFor || ''}
              onChange={(e) => onScheduleChange(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>

          {scheduledFor && (
            <div className="rounded-lg border bg-primary/5 p-3 text-sm">
              <p className="font-medium">Scheduled for:</p>
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

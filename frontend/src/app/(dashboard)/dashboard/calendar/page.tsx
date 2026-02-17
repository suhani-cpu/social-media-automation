'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground">View your posting schedule</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Posting Schedule
          </CardTitle>
          <CardDescription>See all your scheduled posts in calendar view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[500px] items-center justify-center text-muted-foreground">
            Calendar view coming soon. Schedule your first post to see it here!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

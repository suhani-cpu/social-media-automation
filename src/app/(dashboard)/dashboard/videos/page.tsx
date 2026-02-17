'use client';

import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VideosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Videos</h1>
          <p className="text-muted-foreground">Manage your video library</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Upload className="mr-2 h-4 w-4" />
          Upload Video
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video Library</CardTitle>
          <CardDescription>All your uploaded videos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
            No videos yet. Upload your first video to get started!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

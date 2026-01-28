'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoUploader } from '@/components/video/VideoUploader';

export default function VideoUploadPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/videos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Upload Video</h1>
          </div>
          <p className="text-muted-foreground">
            Upload a video to process and share across your social media platforms
          </p>
        </div>
      </div>

      {/* Uploader */}
      <VideoUploader />

      {/* Info */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold mb-2">What happens after upload?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">1.</span>
            <span>Your video is uploaded to secure cloud storage</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">2.</span>
            <span>Processing begins to create platform-specific formats</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">3.</span>
            <span>
              7 versions are generated: Instagram Reel/Feed, YouTube Shorts/Video/Square, Facebook
              Square/Landscape
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">4.</span>
            <span>Thumbnails are extracted at 1s, 3s, and 5s marks</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">5.</span>
            <span>Once ready, you can create posts for all platforms</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoUploader } from '@/components/video/VideoUploader';

export default function VideoUploadPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/videos">
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Video</h1>
          <p className="text-sm text-neutral-500">
            Upload a video to process and share across platforms
          </p>
        </div>
      </div>

      {/* Uploader */}
      <VideoUploader />

      {/* Info */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
        <h3 className="text-sm font-semibold text-white mb-3">What happens after upload?</h3>
        <ul className="space-y-2 text-sm text-neutral-400">
          <li className="flex gap-2">
            <span className="text-red-500">1.</span>
            <span>Your video is uploaded to secure cloud storage</span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-500">2.</span>
            <span>Processing begins to create platform-specific formats</span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-500">3.</span>
            <span>7 versions are generated for Instagram, YouTube, and Facebook</span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-500">4.</span>
            <span>Thumbnails are extracted at 1s, 3s, and 5s marks</span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-500">5.</span>
            <span>Once ready, you can create posts for all platforms</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

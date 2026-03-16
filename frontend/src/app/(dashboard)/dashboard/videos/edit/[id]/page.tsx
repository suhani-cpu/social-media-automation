'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { VideoEditor } from '@/components/video/VideoEditor';
import apiClient from '@/lib/api/client';
import { Video } from '@/lib/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getStreamUrl(videoId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return `${API_URL}/videos/${videoId}/stream?token=${token || ''}`;
}

export default function VideoEditPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const {
    data: video,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['video', videoId],
    queryFn: async () => {
      const response = await apiClient.get<{ video: Video }>(`/videos/${videoId}`);
      return response.data.video;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/videos">
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Video Not Found</h1>
        </div>
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <p className="text-neutral-500">
            The video you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/dashboard/videos">
            <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white">Back to Videos</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (video.status !== 'READY') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/videos">
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Video Not Ready</h1>
        </div>
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <p className="text-neutral-500">
            This video is still processing. Please wait until it's ready before editing.
          </p>
          <p className="mt-2 text-sm text-neutral-600">Status: {video.status}</p>
          <Link href="/dashboard/videos">
            <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white">Back to Videos</Button>
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-white">Edit Video</h1>
          <p className="text-neutral-500 text-sm">{video.title}</p>
        </div>
      </div>

      {/* Video Editor */}
      {video.sourceType === 'STAGE_OTT' ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Stage OTT Content</h2>
            <p className="text-neutral-500 text-sm mb-4">
              This content was imported from Stage OTT. Video preview and clipping are not available for Stage OTT imports.
            </p>
            {video.thumbnailUrl && (
              <div className="relative w-full max-w-md mx-auto aspect-square rounded-lg overflow-hidden bg-black">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="mt-4 space-y-2 text-sm text-neutral-400">
              {video.duration && <p>Duration: {Math.floor(video.duration / 60)}m {video.duration % 60}s</p>}
              {video.stageOttData?.dialect && <p>Dialect: {video.stageOttData.dialect}</p>}
              {video.stageOttData?.contentType && <p>Type: {video.stageOttData.contentType}</p>}
              {video.stageOttData?.format && <p>Format: {video.stageOttData.format}</p>}
            </div>
          </div>
        </div>
      ) : (
        <VideoEditor
          videoUrl={getStreamUrl(videoId)}
          videoId={videoId}
          videoTitle={video.title}
          onClose={() => router.push('/dashboard/videos')}
        />
      )}
    </div>
  );
}

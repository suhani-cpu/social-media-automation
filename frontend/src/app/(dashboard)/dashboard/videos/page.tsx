'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Upload, Video as VideoIcon, Cloud, Table, Rocket, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoCard } from '@/components/video/VideoCard';
import { Toast, ToastContainer } from '@/components/ui/toast';
import { useToastStore } from '@/hooks/useToast';
import apiClient from '@/lib/api/client';
import { Video } from '@/lib/types/api';
import { DriveImportModal } from '@/components/drive/DriveImportModal';
import { SheetImportModal } from '@/components/sheets/SheetImportModal';
import { AutoPostModal } from '@/components/sheets/AutoPostModal';

export default function VideosPage() {
  const {
    data: videos,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await apiClient.get<{ videos: Video[] }>('/videos');
      return response.data.videos;
    },
  });

  const { toasts, addToast, removeToast } = useToastStore();
  const [_deletingId, setDeletingId] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isAutoPostModalOpen, setIsAutoPostModalOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      setDeletingId(id);
      try {
        await apiClient.delete(`/videos/${id}`);
        addToast({
          title: 'Video Deleted',
          description: 'Video has been deleted successfully',
          variant: 'success',
        });
        refetch();
      } catch (error: any) {
        console.error('Failed to delete video:', error);
        addToast({
          title: 'Delete Failed',
          description: error.response?.data?.message || 'Failed to delete video. Please try again.',
          variant: 'error',
        });
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <>
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </ToastContainer>

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Videos</h1>
              <p className="text-sm text-neutral-500 mt-1">Manage your video library</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsAutoPostModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Rocket className="mr-2 h-4 w-4" />
                Auto Post All
              </Button>
              <Link href="/dashboard/videos/stage-ott">
                <Button
                  variant="outline"
                  className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
                >
                  <Tv className="mr-2 h-4 w-4" />
                  Stage OTT
                </Button>
              </Link>
              <Button
                onClick={() => setIsSheetModalOpen(true)}
                variant="outline"
                className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
              >
                <Table className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
              <Button
                onClick={() => setIsDriveModalOpen(true)}
                variant="outline"
                className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
              >
                <Cloud className="mr-2 h-4 w-4" />
                From Drive
              </Button>
              <Link href="/dashboard/videos/upload">
                <Button
                  variant="outline"
                  className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Modals */}
        <DriveImportModal
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
          onImportSuccess={() => refetch()}
        />
        <SheetImportModal
          isOpen={isSheetModalOpen}
          onClose={() => setIsSheetModalOpen(false)}
          onImportSuccess={() => refetch()}
        />
        <AutoPostModal
          isOpen={isAutoPostModalOpen}
          onClose={() => setIsAutoPostModalOpen(false)}
          onSuccess={() => refetch()}
        />

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-sm">Loading videos...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!videos || videos.length === 0) && (
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
              <VideoIcon className="h-8 w-8 text-neutral-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No videos yet</h3>
            <p className="text-sm text-neutral-500 mb-4 max-w-md mx-auto">
              Upload your first video to get started
            </p>
            <Link href="/dashboard/videos/upload">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </Button>
            </Link>
          </div>
        )}

        {/* Video Grid */}
        {!isLoading && videos && videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

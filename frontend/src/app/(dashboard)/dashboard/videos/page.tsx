'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Upload, Video as VideoIcon, Cloud, Table, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VideoCard } from '@/components/video/VideoCard';
import { Toast, ToastContainer } from '@/components/ui/toast';
import { useToastStore } from '@/hooks/useToast';
import apiClient from '@/lib/api/client';
import { Video } from '@/lib/types/api';
import { DriveImportModal } from '@/components/drive/DriveImportModal';
import { SheetImportModal } from '@/components/sheets/SheetImportModal';
import { AutoPostModal } from '@/components/sheets/AutoPostModal';

export default function VideosPage() {
  const { data: videos, isLoading, refetch } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await apiClient.get<{ videos: Video[] }>('/videos');
      return response.data.videos;
    },
  });

  const { toasts, addToast, removeToast } = useToastStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isAutoPostModalOpen, setIsAutoPostModalOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm('🗑️ क्या आप वाकई इस वीडियो को डिलीट करना चाहते हैं?\n\nAre you sure you want to delete this video?')) {
      setDeletingId(id);
      try {
        await apiClient.delete(`/videos/${id}`);
        addToast({
          title: '✅ Video Deleted Successfully!',
          description: 'वीडियो सफलतापूर्वक डिलीट हो गया है',
          variant: 'success',
        });
        refetch();
      } catch (error: any) {
        console.error('Failed to delete video:', error);
        addToast({
          title: '❌ Delete Failed',
          description: error.response?.data?.message || 'वीडियो डिलीट नहीं हो सका। कृपया दोबारा कोशिश करें।',
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
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>

      <div className="space-y-6">
      {/* Vibrant Header */}
      <div className="youtube-gradient rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="flex gap-4 justify-end items-start p-4 text-white">
            <VideoIcon className="w-10 h-10 animate-pulse" />
            <Upload className="w-8 h-8" />
          </div>
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center vibrant-glow">
              <VideoIcon className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Your Video Library 🎬</h1>
              <p className="text-white/90 text-lg">Create, edit, and share amazing content ✨</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsAutoPostModalOpen(true)}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white hover-scale vibrant-glow text-xl px-8 py-7 font-bold shadow-2xl"
            >
              <Rocket className="mr-2 h-6 w-6 animate-bounce" />
              🚀 Auto Post All
            </Button>
            <Button
              onClick={() => setIsSheetModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover-scale vibrant-glow text-lg px-6 py-6"
            >
              <Table className="mr-2 h-5 w-5" />
              Bulk Import 📊
            </Button>
            <Button
              onClick={() => setIsDriveModalOpen(true)}
              className="bg-white/90 text-primary hover:bg-white hover-scale vibrant-glow text-lg px-6 py-6"
            >
              <Cloud className="mr-2 h-5 w-5" />
              Import from Drive ☁️
            </Button>
            <Link href="/dashboard/videos/upload">
              <Button className="bg-white text-primary hover:bg-white/90 hover-scale vibrant-glow text-lg px-6 py-6">
                <Upload className="mr-2 h-5 w-5" />
                Upload Video 🚀
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Drive Import Modal */}
      <DriveImportModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onImportSuccess={() => {
          refetch();
        }}
      />

      {/* Sheet Bulk Import Modal */}
      <SheetImportModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        onImportSuccess={() => {
          refetch();
        }}
      />

      {/* Auto Post Modal - SUPER SIMPLE! */}
      <AutoPostModal
        isOpen={isAutoPostModalOpen}
        onClose={() => setIsAutoPostModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading videos...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!videos || videos.length === 0) && (
        <Card className="overflow-hidden border-2 rainbow-border shadow-2xl">
          <CardContent className="text-center py-16">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-[hsl(var(--instagram-pink))]/20 via-[hsl(var(--youtube-red))]/20 to-[hsl(var(--tiktok-cyan))]/20 flex items-center justify-center mb-6 float-animation">
              <VideoIcon className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-3xl font-bold mb-3">Ready to Go Viral? 🚀</h3>
            <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto">
              Upload your first video and start your journey to social media stardom! 🌟
            </p>
            <Link href="/dashboard/videos/upload">
              <Button className="multi-social-gradient text-white hover:shadow-2xl border-0 text-lg px-8 py-6 hover-scale">
                <Upload className="mr-2 h-5 w-5" />
                Upload Your First Video 🎥
              </Button>
            </Link>
            <div className="flex gap-6 justify-center items-center mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="text-2xl emoji-pulse">📱</div>
                <span>Instagram Reels</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl emoji-pulse" style={{animationDelay: '0.5s'}}>🎬</div>
                <span>YouTube Shorts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl emoji-pulse" style={{animationDelay: '1s'}}>📺</div>
                <span>Facebook Posts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Grid */}
      {!isLoading && videos && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}

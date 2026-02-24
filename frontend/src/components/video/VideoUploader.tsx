'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { videosApi, UploadProgress } from '@/lib/api/videos';
import { formatFileSize } from '@/lib/utils';

const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || '4500000'); // 4.5MB (Vercel serverless limit)
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

interface UploadState {
  file: File | null;
  title: string;
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export function VideoUploader() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    title: '',
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP4, MOV, AVI, or WEBM.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${formatFileSize(file.size)}). Direct upload supports up to ${formatFileSize(MAX_FILE_SIZE)}. For larger files, use "From Drive" on the Videos page — upload your video to Google Drive first, then import it.`;
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        setUploadState((prev) => ({ ...prev, error, file: null }));
      } else {
        setUploadState((prev) => ({
          ...prev,
          file,
          title: file.name.replace(/\.[^/.]+$/, ''),
          error: null,
        }));
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        setUploadState((prev) => ({ ...prev, error, file: null }));
      } else {
        setUploadState((prev) => ({
          ...prev,
          file,
          title: file.name.replace(/\.[^/.]+$/, ''),
          error: null,
        }));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadState.file || !uploadState.title.trim()) {
      setUploadState((prev) => ({ ...prev, error: 'Please provide a title' }));
      return;
    }

    setUploadState((prev) => ({ ...prev, uploading: true, error: null, progress: 0 }));

    try {
      await videosApi.upload(
        {
          video: uploadState.file,
          title: uploadState.title,
        },
        (progress: UploadProgress) => {
          setUploadState((prev) => ({ ...prev, progress: progress.percentage }));
        }
      );

      setUploadState((prev) => ({ ...prev, success: true, uploading: false }));

      // Redirect to videos page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/videos');
      }, 2000);
    } catch (error: any) {
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        error: error.response?.data?.message || 'Upload failed. Please try again.',
      }));
    }
  };

  const handleReset = () => {
    setUploadState({
      file: null,
      title: '',
      uploading: false,
      progress: 0,
      error: null,
      success: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!uploadState.file && !uploadState.success && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="video-upload"
                className="hidden"
                accept="video/*"
                onChange={handleFileInput}
                disabled={uploadState.uploading}
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold">Upload Video</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your video here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                MP4, MOV, AVI, or WEBM (max {formatFileSize(MAX_FILE_SIZE)})
              </p>
              <Button
                type="button"
                className="mt-4"
                onClick={() => document.getElementById('video-upload')?.click()}
              >
                Select Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Preview & Upload */}
      {uploadState.file && !uploadState.success && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{uploadState.file.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadState.file.size)}
                  </p>
                </div>
                {!uploadState.uploading && (
                  <Button variant="ghost" size="icon" onClick={handleReset}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Video Title</Label>
                <Input
                  id="title"
                  value={uploadState.title}
                  onChange={(e) => setUploadState((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  disabled={uploadState.uploading}
                />
              </div>

              {uploadState.uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{uploadState.progress}%</span>
                  </div>
                  <Progress value={uploadState.progress} />
                </div>
              )}

              {uploadState.error && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{uploadState.error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={uploadState.uploading || !uploadState.title.trim()}
                  className="flex-1"
                >
                  {uploadState.uploading ? 'Uploading...' : 'Upload Video'}
                </Button>
                {!uploadState.uploading && (
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {uploadState.success && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold">Upload Successful!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your video is being processed. You'll be redirected to the video library.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

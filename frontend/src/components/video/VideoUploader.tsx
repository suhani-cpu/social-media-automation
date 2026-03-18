'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, CheckCircle, AlertCircle, FileVideo, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { videosApi, UploadProgress } from '@/lib/api/videos';
import { formatFileSize } from '@/lib/utils';

const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || '524288000'); // 500MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

interface FileQueueItem {
  file: File;
  title: string;
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

interface UploadState {
  files: FileQueueItem[];
  mode: 'single' | 'bulk';
}

export function VideoUploader() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    files: [],
    mode: 'single',
  });
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP4, MOV, AVI, or WEBM.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${formatFileSize(file.size)}). Max ${formatFileSize(MAX_FILE_SIZE)}.`;
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const addFilesToQueue = (fileList: FileList) => {
    const newFiles: FileQueueItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validationError = validateFile(file);
      newFiles.push({
        file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        uploading: false,
        progress: 0,
        error: validationError,
        success: false,
      });
    }
    setUploadState((prev) => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setUploadState((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const updateFileTitle = (index: number, title: string) => {
    setUploadState((prev) => ({
      ...prev,
      files: prev.files.map((f, i) => (i === index ? { ...f, title, error: null } : f)),
    }));
  };

  const uploadSingleFile = async (fileItem: FileQueueItem, index: number) => {
    setUploadState((prev) => ({
      ...prev,
      files: prev.files.map((f, i) =>
        i === index ? { ...f, uploading: true, error: null } : f
      ),
    }));

    try {
      await videosApi.upload(
        { video: fileItem.file, title: fileItem.title },
        (p: UploadProgress) => {
          setUploadState((prev) => ({
            ...prev,
            files: prev.files.map((f, i) =>
              i === index ? { ...f, progress: p.percentage } : f
            ),
          }));
        }
      );

      setUploadState((prev) => ({
        ...prev,
        files: prev.files.map((f, i) =>
          i === index ? { ...f, uploading: false, success: true, progress: 100 } : f
        ),
      }));
    } catch (err: any) {
      setUploadState((prev) => ({
        ...prev,
        files: prev.files.map((f, i) =>
          i === index
            ? { ...f, uploading: false, error: err.response?.data?.message || 'Upload failed' }
            : f
        ),
      }));
    }
  };

  const uploadAllFiles = async () => {
    const validFiles = uploadState.files.filter(
      (f) => !f.uploading && !f.success && f.title.trim() && !f.error
    );

    for (let i = 0; i < validFiles.length; i++) {
      const fileItem = uploadState.files.find(
        (f) => !f.uploading && !f.success && f.title.trim() && !f.error
      );
      if (fileItem) {
        const index = uploadState.files.indexOf(fileItem);
        await uploadSingleFile(fileItem, index);
      }
    }
  };

  const handleUpload = async () => {
    if (uploadState.mode === 'single') {
      if (!currentFile || !currentTitle.trim()) {
        setError('Please provide a title');
        return;
      }
      setUploading(true);
      setError(null);
      setProgress(0);

      try {
        await videosApi.upload(
          { video: currentFile, title: currentTitle },
          (p: UploadProgress) => setProgress(p.percentage)
        );
        setSuccess(true);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    } else {
      await uploadAllFiles();
    }
  };

  const handleReset = () => {
    setCurrentFile(null);
    setCurrentTitle('');
    setUploading(false);
    setProgress(0);
    setError(null);
    setSuccess(false);
    setUploadState({ files: [], mode: 'single' });
  };

  const handleSingleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
      } else {
        setCurrentFile(file);
        setCurrentTitle(file.name.replace(/\.[^/.]+$/, ''));
        setError(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={uploadState.mode === 'single' ? 'default' : 'outline'}
          onClick={() => setUploadState({ files: [], mode: 'single' })}
        >
          Single Upload
        </Button>
        <Button
          variant={uploadState.mode === 'bulk' ? 'default' : 'outline'}
          onClick={() => setUploadState({ files: [], mode: 'bulk' })}
        >
          Bulk Upload
        </Button>
      </div>

      {/* Single Upload Mode */}
      {uploadState.mode === 'single' && !success && (
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
                onChange={handleSingleFileSelect}
                disabled={uploading}
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold">Upload Video</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop or click to browse
              </p>
              <Button
                type="button"
                className="mt-4"
                onClick={() => document.getElementById('video-upload')?.click()}
                disabled={uploading}
              >
                Select Video
              </Button>
            </div>

            {currentFile && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <FileVideo className="h-8 w-8" />
                  <div className="flex-1">
                    <p className="font-medium">{currentFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(currentFile.size)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleReset}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Video Title</Label>
                  <Input
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="Enter video title"
                    disabled={uploading}
                  />
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !currentTitle.trim()}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload Video'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Upload Mode */}
      {uploadState.mode === 'bulk' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Bulk Upload Queue</span>
              <span className="text-sm font-normal text-muted-foreground">
                {uploadState.files.length} file(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="bulk-video-upload"
                className="hidden"
                accept="video/*"
                multiple
                onChange={handleFileInput}
              />
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-3 font-semibold">Drop videos here</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                or click to browse multiple files
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => document.getElementById('bulk-video-upload')?.click()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Files
              </Button>
            </div>

            {/* File List */}
            {uploadState.files.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadState.files.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      file.success
                        ? 'bg-green-500/10 border-green-500/30'
                        : file.error
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-muted'
                    }`}
                  >
                    <FileVideo className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Input
                        value={file.title}
                        onChange={(e) => updateFileTitle(index, e.target.value)}
                        placeholder="Video title"
                        disabled={file.uploading || file.success}
                        className="h-8"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(file.file.size)}
                      </p>
                    </div>
                    {file.uploading && (
                      <div className="w-24">
                        <Progress value={file.progress} className="h-2" />
                      </div>
                    )}
                    {file.success && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {file.error && (
                      <div className="group relative">
                        <AlertCircle className="h-5 w-5 text-destructive cursor-help" />
                        <span className="absolute right-0 top-6 bg-destructive text-destructive-foreground text-xs p-2 rounded hidden group-hover:block whitespace-nowrap z-10">
                          {file.error}
                        </span>
                      </div>
                    )}
                    {!file.uploading && !file.success && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload All Button */}
            {uploadState.files.length > 0 && (
              <Button
                onClick={uploadAllFiles}
                disabled={uploadState.files.every((f) => f.uploading || f.success)}
                className="w-full"
              >
                Upload All ({uploadState.files.filter((f) => !f.success).length} remaining)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {success && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold">Upload Successful!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your video is being processed. You'll be redirected shortly.
              </p>
              <Button className="mt-4" onClick={() => router.push('/dashboard/videos')}>
                Go to Videos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

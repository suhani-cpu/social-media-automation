'use client';

import { useState, useRef } from 'react';
import { Scissors, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import apiClient from '@/lib/api/client';

interface VideoEditorProps {
  videoUrl: string;
  videoId: string;
  videoTitle: string;
  onClose?: () => void;
}

export function VideoEditor({ videoUrl, videoId, videoTitle, onClose }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  // Clip settings
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Framing settings
  const [aspectRatio, setAspectRatio] = useState('original');
  const [topCaption, setTopCaption] = useState('');
  const [bottomCaption, setBottomCaption] = useState('');
  const [captionFontSize, setCaptionFontSize] = useState(32);
  const [captionColor, setCaptionColor] = useState('#ffffff');
  const [paddingColor, setPaddingColor] = useState('#000000');
  const [includeLogo, setIncludeLogo] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEndTime(Math.min(videoDuration, 60)); // Default to first 60 seconds
      setVideoLoading(false);
      setVideoError(false);
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
    setVideoLoading(false);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProcessVideo = async () => {
    if (endTime - startTime > 600) {
      setError('Maximum clip duration is 10 minutes');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await apiClient.post(
        '/clip',
        {
          videoId,
          startTime,
          endTime,
          format: aspectRatio,
          overlay: {
            paddingColor,
            topCaption,
            bottomCaption,
            captionFontSize,
            captionColor,
          },
        },
        {
          responseType: 'blob',
          timeout: 300000, // 5 min timeout for video processing
        }
      );

      // Create download link
      const blob = new Blob([response.data], { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${videoTitle}-edited.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsProcessing(false);
    } catch (err: any) {
      console.error('Video processing error:', err);
      setError(err.response?.data?.error || 'Failed to process video');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card>
        <CardHeader>
          <CardTitle>Video Preview</CardTitle>
          <CardDescription>Preview and select the segment to clip</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative bg-black rounded-lg overflow-hidden">
            {videoError ? (
              <div className="w-full aspect-video flex items-center justify-center bg-black">
                <div className="text-center p-6">
                  <p className="text-red-400 font-medium mb-2">Failed to load video</p>
                  <p className="text-neutral-500 text-sm">The video file could not be loaded. It may still be processing or the source is unavailable.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setVideoError(false);
                      setVideoLoading(true);
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full"
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onError={handleVideoError}
                onCanPlay={() => setVideoLoading(false)}
              />
            )}

            {/* Loading indicator */}
            {videoLoading && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <p className="text-neutral-400 text-sm">Loading video...</p>
              </div>
            )}

            {/* Play/Pause Overlay */}
            {!videoError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 bg-black/50 hover:bg-black/70 text-white"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </Button>
            </div>
            )}

            {/* Timeline */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="text-white text-sm mb-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seekToTime(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Clip Range Selector */}
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time (seconds)</Label>
                <Input
                  type="number"
                  min="0"
                  max={endTime - 1}
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStartTime(currentTime)}
                  className="w-full"
                >
                  Set to Current Time
                </Button>
              </div>

              <div className="space-y-2">
                <Label>End Time (seconds)</Label>
                <Input
                  type="number"
                  min={startTime + 1}
                  max={duration}
                  value={endTime}
                  onChange={(e) => setEndTime(parseFloat(e.target.value))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEndTime(currentTime)}
                  className="w-full"
                >
                  Set to Current Time
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Clip Duration:{' '}
                <span className="font-semibold">{formatTime(endTime - startTime)}</span>
                <span className="text-muted-foreground ml-2">(Max: 10 minutes)</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Framing & Captions */}
      <Card>
        <CardHeader>
          <CardTitle>Framing & Captions</CardTitle>
          <CardDescription>Customize the output format and add text overlays</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="9:16">9:16 (Vertical - Reels/Stories)</SelectItem>
                <SelectItem value="1:1">1:1 (Square - Instagram Feed)</SelectItem>
                <SelectItem value="16:9">16:9 (Landscape - YouTube)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Padding Color */}
          {aspectRatio !== 'original' && (
            <div className="space-y-2">
              <Label>Padding Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={paddingColor}
                  onChange={(e) => setPaddingColor(e.target.value)}
                  className="w-20"
                />
                <Input
                  type="text"
                  value={paddingColor}
                  onChange={(e) => setPaddingColor(e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
          )}

          {/* Top Caption */}
          <div className="space-y-2">
            <Label>Top Caption</Label>
            <Input
              value={topCaption}
              onChange={(e) => setTopCaption(e.target.value)}
              placeholder="Add text at the top"
            />
          </div>

          {/* Bottom Caption */}
          <div className="space-y-2">
            <Label>Bottom Caption</Label>
            <Input
              value={bottomCaption}
              onChange={(e) => setBottomCaption(e.target.value)}
              placeholder="Add text at the bottom"
            />
          </div>

          {/* Caption Settings */}
          {(topCaption || bottomCaption) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font Size</Label>
                <Input
                  type="number"
                  min="12"
                  max="72"
                  value={captionFontSize}
                  onChange={(e) => setCaptionFontSize(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={captionColor}
                    onChange={(e) => setCaptionColor(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={captionColor}
                    onChange={(e) => setCaptionColor(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeLogo"
              checked={includeLogo}
              onChange={(e) => setIncludeLogo(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="includeLogo" className="cursor-pointer">
              Include Stage OTT logo
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {onClose && (
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
        )}
        <Button onClick={handleProcessVideo} disabled={isProcessing} className="bg-primary">
          {isProcessing ? (
            'Processing...'
          ) : (
            <>
              <Scissors className="mr-2 h-4 w-4" />
              Process & Download
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Cog, Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { postsApi } from '@/lib/api/posts';
import { PublishProgress as ProgressType } from '@/lib/types/api';
import { cn } from '@/lib/utils';

interface PublishProgressProps {
  postId: string;
  platform?: string;
  onClose: () => void;
  onComplete: () => void;
}

const stages = [
  { key: 'downloading', label: 'Downloading', icon: Download },
  { key: 'converting', label: 'Converting', icon: Cog },
  { key: 'uploading', label: 'Uploading', icon: Upload },
  { key: 'done', label: 'Published', icon: CheckCircle2 },
] as const;

const platformNames: Record<string, string> = {
  YOUTUBE: 'YouTube',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
};

export function PublishProgress({ postId, platform, onClose, onComplete }: PublishProgressProps) {
  const [progress, setProgress] = useState<ProgressType>({
    stage: 'downloading',
    percent: 0,
    message: 'Starting...',
  });

  const pollProgress = useCallback(async () => {
    try {
      const data = await postsApi.getPublishProgress(postId);
      setProgress(data);

      if (data.stage === 'done') {
        setTimeout(onComplete, 1500);
      }
    } catch {
      // Ignore polling errors
    }
  }, [postId, onComplete]);

  useEffect(() => {
    pollProgress();
    const interval = setInterval(pollProgress, 1000);
    return () => clearInterval(interval);
  }, [pollProgress]);

  const isDone = progress.stage === 'done';
  const isError = progress.stage === 'error';
  const isActive = !isDone && !isError;

  const currentStageIndex = stages.findIndex((s) => s.key === progress.stage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#1a1a1a] bg-[#111] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            {isDone
              ? 'Published!'
              : isError
                ? 'Publish Failed'
                : `Publishing to ${platform ? platformNames[platform] || platform : 'platform'}...`}
          </h3>
          {isActive && <Loader2 className="h-5 w-5 animate-spin text-red-500" />}
        </div>

        {/* Stage Steps */}
        <div className="space-y-4 mb-6">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isCompleted = currentStageIndex > index || isDone;
            const isCurrent = stage.key === progress.stage;

            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all',
                    isCompleted && 'bg-green-500/20 text-green-400',
                    isCurrent && !isDone && !isError && 'bg-red-500/20 text-red-400',
                    !isCompleted && !isCurrent && 'bg-[#1a1a1a] text-neutral-600'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isCurrent && isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCompleted && 'text-green-400',
                      isCurrent && !isDone && !isError && 'text-white',
                      !isCompleted && !isCurrent && 'text-neutral-600'
                    )}
                  >
                    {stage.label}
                  </p>
                  {isCurrent && !isDone && (
                    <p className="text-xs text-neutral-500 truncate">{progress.message}</p>
                  )}
                </div>

                {/* Percentage for current stage */}
                {isCurrent && isActive && progress.percent > 0 && (
                  <span className="text-xs font-mono text-red-400">
                    {Math.round(progress.percent)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        {isActive && (
          <div className="mb-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-300"
                style={{
                  width: `${Math.max(
                    // Map stage progress to overall progress (25% per stage)
                    (currentStageIndex / stages.length) * 100 + progress.percent / stages.length,
                    2
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{progress.message}</p>
            </div>
          </div>
        )}

        {/* Done State */}
        {isDone && (
          <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p className="text-sm text-green-400">{progress.message}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onClose}
            variant={isDone ? 'default' : 'outline'}
            className={cn(
              isDone
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'border-[#1a1a1a] text-neutral-400 hover:text-white'
            )}
          >
            {isDone ? 'Done' : isError ? 'Close' : 'Run in Background'}
          </Button>
        </div>
      </div>
    </div>
  );
}

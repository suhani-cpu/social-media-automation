'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { VideoSelector } from '@/components/post/VideoSelector';
import { CaptionGenerator } from '@/components/post/CaptionGenerator';
import { PlatformSelector } from '@/components/post/PlatformSelector';
import { ScheduleSelector } from '@/components/post/ScheduleSelector';
import { PostReview } from '@/components/post/PostReview';
import { postsApi, CaptionVariation, authApi } from '@/lib/api/posts';
import { Video, Language, Platform, PostType } from '@/lib/types/api';

interface PlatformSelection {
  platform: Platform;
  accountId: string;
  postType: PostType;
}

const steps = [
  { id: 1, title: 'Video', description: 'Select video' },
  { id: 2, title: 'Caption', description: 'Generate caption' },
  { id: 3, title: 'Platforms', description: 'Select platforms' },
  { id: 4, title: 'Schedule', description: 'Choose timing' },
  { id: 5, title: 'Review', description: 'Confirm details' },
];

export default function CreatePostPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [language, setLanguage] = useState<Language>('ENGLISH');
  const [selectedCaption, setSelectedCaption] = useState<CaptionVariation | null>(null);
  const [platformSelections, setPlatformSelections] = useState<PlatformSelection[]>([]);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<string>('public');

  // Load user defaults from onboarding/profile
  useEffect(() => {
    authApi
      .getMe()
      .then((user) => {
        if (user.defaultLanguage) {
          setLanguage(user.defaultLanguage as Language);
        }
        if (user.defaultPrivacy) {
          setPrivacyStatus(user.defaultPrivacy);
        }
      })
      .catch(() => {
        /* ignore — use defaults */
      });
  }, []);

  const hasYouTube = platformSelections.some((s) => s.platform === 'YOUTUBE');

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedVideo !== null;
      case 1:
        return selectedCaption !== null;
      case 2:
        return platformSelections.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVideo || !selectedCaption || platformSelections.length === 0) {
      setError('Please complete all required steps');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const promises = platformSelections.map((selection) =>
        postsApi.create({
          videoId: selectedVideo.id,
          accountId: selection.accountId,
          caption: selectedCaption.caption,
          language,
          hashtags: selectedCaption.hashtags,
          platform: selection.platform,
          postType: selection.postType,
          scheduledFor: scheduledFor || undefined,
          metadata: selection.platform === 'YOUTUBE' ? { privacyStatus } : undefined,
        })
      );

      await Promise.all(promises);
      router.push('/dashboard/posts');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create posts. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/posts">
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Post</h1>
          <p className="text-sm text-neutral-500">
            Create and schedule posts across multiple platforms
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Stepper
        steps={steps}
        currentStep={currentStep}
        onStepClick={(index) => {
          if (index < currentStep) {
            setCurrentStep(index);
            setError(null);
          }
        }}
      />

      {/* Step Content */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
        {currentStep === 0 && (
          <VideoSelector selectedVideo={selectedVideo} onSelect={setSelectedVideo} />
        )}

        {currentStep === 1 && selectedVideo && (
          <CaptionGenerator
            videoTitle={selectedVideo.title}
            platform={platformSelections[0]?.platform || 'INSTAGRAM'}
            selectedCaption={selectedCaption}
            onSelect={setSelectedCaption}
            onLanguageChange={setLanguage}
            language={language}
          />
        )}

        {currentStep === 2 && (
          <PlatformSelector
            selections={platformSelections}
            onSelectionChange={setPlatformSelections}
          />
        )}

        {currentStep === 3 && (
          <ScheduleSelector
            scheduledFor={scheduledFor}
            onScheduleChange={setScheduledFor}
            privacyStatus={privacyStatus}
            onPrivacyChange={setPrivacyStatus}
            hasYouTube={hasYouTube}
          />
        )}

        {currentStep === 4 && selectedVideo && selectedCaption && (
          <PostReview
            video={selectedVideo}
            caption={selectedCaption}
            language={language}
            platforms={platformSelections}
            scheduledFor={scheduledFor}
            onCaptionEdit={setSelectedCaption}
          />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
          className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-2">
          <Link href="/dashboard/posts">
            <Button
              variant="ghost"
              disabled={isSubmitting}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </Button>
          </Link>

          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                'Creating...'
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create Post{platformSelections.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="text-center text-xs text-neutral-500">
        Step {currentStep + 1} of {steps.length}
      </div>
    </div>
  );
}

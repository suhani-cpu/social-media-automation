'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Sparkles,
  Hash,
  Clock,
  Send,
  Loader2,
  Video as VideoIcon,
  Globe,
  Instagram,
  Youtube,
  Facebook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { videosApi } from '@/lib/api/videos';
import { accountsApi } from '@/lib/api/accounts';
import { postsApi } from '@/lib/api/posts';
import { Video, Post, Language, Platform, PostType, SocialAccount } from '@/lib/types/api';
import apiClient from '@/lib/api/client';

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode; postType: PostType }[] = [
  { id: 'INSTAGRAM', label: 'Instagram', icon: <Instagram className="h-4 w-4" />, postType: 'REEL' },
  { id: 'YOUTUBE', label: 'YouTube', icon: <Youtube className="h-4 w-4" />, postType: 'SHORT' },
  { id: 'FACEBOOK', label: 'Facebook', icon: <Facebook className="h-4 w-4" />, postType: 'FEED' },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'HARYANVI', label: 'Haryanvi' },
  { value: 'HINGLISH', label: 'Hinglish' },
  { value: 'ENGLISH', label: 'English' },
];

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { success: showSuccess } = useToast();

  // Form state
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [caption, setCaption] = useState('');
  const [language, setLanguage] = useState<Language>('ENGLISH');
  const [hashtags, setHashtags] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch videos
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await videosApi.getAll();
      return response.videos;
    },
  });

  // Fetch accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await accountsApi.getAll();
      return response.accounts;
    },
  });

  // Fetch scheduled posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await postsApi.getAll();
      return response.posts;
    },
    refetchInterval: 15000,
  });

  const readyVideos = useMemo(
    () => (videosData || []).filter((v) => v.status === 'READY'),
    [videosData]
  );

  const selectedVideo = useMemo(
    () => readyVideos.find((v) => v.id === selectedVideoId) || null,
    [readyVideos, selectedVideoId]
  );

  const scheduledPosts = useMemo(() => {
    if (!postsData) return [];
    return postsData
      .filter((p) => p.status === 'SCHEDULED' && p.scheduledFor)
      .sort(
        (a, b) =>
          new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime()
      );
  }, [postsData]);

  // Find account for a platform
  const getAccountForPlatform = (platform: Platform): SocialAccount | undefined => {
    return (accountsData || []).find(
      (acc) => acc.platform === platform && acc.status === 'ACTIVE'
    );
  };

  // Toggle platform selection
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  // Generate AI caption
  const handleGenerateCaption = async () => {
    if (!selectedVideo) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await apiClient.post('/captions/generate', {
        videoId: selectedVideo.id,
        platform: selectedPlatforms[0] || 'INSTAGRAM',
        language,
      });

      const data = response.data;
      if (data.variations && data.variations.length > 0) {
        setCaption(data.variations[0].caption);
        if (data.variations[0].hashtags?.length > 0) {
          setHashtags(data.variations[0].hashtags.join(' '));
        }
      } else if (data.caption) {
        setCaption(data.caption);
        if (data.hashtags) {
          setHashtags(
            Array.isArray(data.hashtags) ? data.hashtags.join(' ') : data.hashtags
          );
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to generate caption. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Schedule post
  const handleSchedule = async () => {
    if (!selectedVideoId) {
      setError('Please select a video');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }
    if (!caption.trim()) {
      setError('Please enter a caption');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      setError('Please select a date and time');
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    if (new Date(scheduledFor) <= new Date()) {
      setError('Scheduled time must be in the future');
      return;
    }

    // Check all platforms have connected accounts
    const missingAccounts = selectedPlatforms.filter((p) => !getAccountForPlatform(p));
    if (missingAccounts.length > 0) {
      setError(
        `No connected account for: ${missingAccounts.join(', ')}. Connect accounts in Settings.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const hashtagList = hashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, '').trim())
        .filter(Boolean);

      const platformConfig = PLATFORMS.reduce(
        (acc, p) => ({ ...acc, [p.id]: p.postType }),
        {} as Record<Platform, PostType>
      );

      const promises = selectedPlatforms.map((platform) => {
        const account = getAccountForPlatform(platform)!;
        return postsApi.create({
          videoId: selectedVideoId,
          accountId: account.id,
          caption: caption.trim(),
          language,
          hashtags: hashtagList,
          platform,
          postType: platformConfig[platform] || 'FEED',
          scheduledFor,
        });
      });

      await Promise.all(promises);

      queryClient.invalidateQueries({ queryKey: ['posts'] });
      showSuccess('Scheduled!', `Post scheduled for ${selectedPlatforms.length} platform(s)`);

      // Reset form
      setSelectedVideoId('');
      setSelectedPlatforms([]);
      setCaption('');
      setHashtags('');
      setScheduledDate('');
      setScheduledTime('');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to schedule post. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatScheduledDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'INSTAGRAM':
        return <Instagram className="h-3.5 w-3.5" />;
      case 'YOUTUBE':
        return <Youtube className="h-3.5 w-3.5" />;
      case 'FACEBOOK':
        return <Facebook className="h-3.5 w-3.5" />;
      default:
        return <Globe className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Schedule Post</h1>
        <p className="text-sm text-neutral-500">
          Schedule posts across multiple platforms with AI-generated captions
        </p>
      </div>

      {/* Scheduling Form */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6 space-y-6">
        {/* Step 1: Select Video */}
        <div>
          <Label className="mb-2 block text-neutral-300 text-sm font-medium">
            <VideoIcon className="inline h-4 w-4 mr-1.5 text-neutral-500" />
            Select Video
          </Label>
          <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
            <SelectTrigger className="bg-[#0a0a0a] border-[#1a1a1a] text-white">
              <SelectValue placeholder={videosLoading ? 'Loading videos...' : 'Choose a video'} />
            </SelectTrigger>
            <SelectContent>
              {readyVideos.map((video) => (
                <SelectItem key={video.id} value={video.id}>
                  {video.title}
                </SelectItem>
              ))}
              {readyVideos.length === 0 && !videosLoading && (
                <SelectItem value="_none" disabled>
                  No ready videos available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Step 2: Select Platforms */}
        <div>
          <Label className="mb-2 block text-neutral-300 text-sm font-medium">
            <Globe className="inline h-4 w-4 mr-1.5 text-neutral-500" />
            Select Platforms
          </Label>
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              const account = getAccountForPlatform(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-red-600 bg-red-600/10 text-red-400'
                      : 'border-[#1a1a1a] bg-[#0a0a0a] text-neutral-400 hover:border-neutral-600 hover:text-white'
                  }`}
                >
                  {platform.icon}
                  {platform.label}
                  {!account && (
                    <span className="text-[10px] text-yellow-500">(not connected)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Language Selector */}
        <div>
          <Label className="mb-2 block text-neutral-300 text-sm font-medium">
            <Globe className="inline h-4 w-4 mr-1.5 text-neutral-500" />
            Language
          </Label>
          <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
            <SelectTrigger className="bg-[#0a0a0a] border-[#1a1a1a] text-white w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 4: AI Caption Generation + Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-neutral-300 text-sm font-medium">
              <Sparkles className="inline h-4 w-4 mr-1.5 text-neutral-500" />
              Caption
            </Label>
            <Button
              size="sm"
              onClick={handleGenerateCaption}
              disabled={!selectedVideo || isGenerating}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI Generate
                </>
              )}
            </Button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption or generate one with AI..."
            rows={4}
            className="w-full rounded-md border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
          />
          <p className="mt-1 text-xs text-neutral-500">{caption.length} characters</p>
        </div>

        {/* Step 5: Hashtags */}
        <div>
          <Label className="mb-2 block text-neutral-300 text-sm font-medium">
            <Hash className="inline h-4 w-4 mr-1.5 text-neutral-500" />
            Hashtags
          </Label>
          <Input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="trending viral comedy (space or comma separated)"
            className="bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Enter hashtags without #, separated by spaces or commas
          </p>
        </div>

        {/* Step 6: Date & Time Picker */}
        <div>
          <Label className="mb-2 block text-neutral-300 text-sm font-medium">
            <Clock className="inline h-4 w-4 mr-1.5 text-neutral-500" />
            Schedule Date & Time
          </Label>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="bg-[#0a0a0a] border-[#1a1a1a] text-white flex-1 [color-scheme:dark]"
            />
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-[#0a0a0a] border-[#1a1a1a] text-white flex-1 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSchedule}
          disabled={isSubmitting}
          className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scheduling...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Schedule Post
            </>
          )}
        </Button>
      </div>

      {/* Upcoming Scheduled Posts */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          <CalendarClock className="inline h-5 w-5 mr-2 text-neutral-500" />
          Upcoming Scheduled Posts
        </h2>

        {postsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-[#1a1a1a] bg-[#111] p-4"
              >
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded bg-[#1a1a1a]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-[#1a1a1a]" />
                    <div className="h-3 w-2/3 rounded bg-[#1a1a1a]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : scheduledPosts.length === 0 ? (
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-8 text-center">
            <CalendarClock className="mx-auto h-10 w-10 text-neutral-500" />
            <h3 className="mt-4 text-base font-semibold text-white">
              No scheduled posts
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Schedule your first post using the form above
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 rounded-lg border border-[#1a1a1a] bg-[#111] p-4 transition-colors hover:border-neutral-700"
              >
                {/* Thumbnail */}
                <div className="h-12 w-12 flex-shrink-0 rounded-md bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                  {post.video?.thumbnailUrl ? (
                    <img
                      src={post.video.thumbnailUrl}
                      alt={post.video.title || ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <VideoIcon className="h-5 w-5 text-neutral-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {post.video?.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {post.caption.length > 80
                      ? `${post.caption.slice(0, 80)}...`
                      : post.caption}
                  </p>
                </div>

                {/* Platform Badge */}
                <div className="flex items-center gap-1.5 rounded-full bg-[#1a1a1a] px-2.5 py-1 text-xs text-neutral-400">
                  {getPlatformIcon(post.platform)}
                  {post.platform.charAt(0) + post.platform.slice(1).toLowerCase()}
                </div>

                {/* Scheduled Time */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5" />
                  {formatScheduledDate(post.scheduledFor!)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

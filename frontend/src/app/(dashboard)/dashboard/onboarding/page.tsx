'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Building2, Globe, Link2 } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/posts';
import _apiClient from '@/lib/api/client';
import { cn } from '@/lib/utils';

const industries = [
  'Entertainment',
  'Education',
  'Gaming',
  'Music',
  'Comedy',
  'Fitness & Health',
  'Food & Cooking',
  'Travel',
  'Fashion & Beauty',
  'Technology',
  'Business',
  'News & Media',
  'Sports',
  'Art & Design',
  'Other',
];

const languages = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'HINGLISH', label: 'Hinglish' },
  { value: 'HARYANVI', label: 'Haryanvi' },
  { value: 'HINDI', label: 'Hindi' },
  { value: 'RAJASTHANI', label: 'Rajasthani' },
  { value: 'BHOJPURI', label: 'Bhojpuri' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('ENGLISH');

  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);

  const handleComplete = async () => {
    setSaving(true);
    try {
      const res = await authApi.completeOnboarding({
        brandName: brandName || undefined,
        industry: industry || undefined,
        defaultLanguage,
      });
      updateUser(res.user);
      router.push('/dashboard');
    } catch {
      // Still redirect even if save fails
      router.push('/dashboard');
    }
  };

  const connectPlatform = (platform: string) => {
    const urls: Record<string, string> = {
      YOUTUBE: '/api/oauth/youtube/authorize',
      INSTAGRAM: '/api/oauth/instagram/authorize',
      FACEBOOK: '/api/oauth/facebook/authorize',
      DRIVE: '/api/drive/auth',
    };
    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=700');
      // Optimistically mark as connecting
      setConnectedAccounts((prev) => [...prev, platform]);
    }
  };

  const steps = [
    {
      title: 'Your Brand',
      icon: Building2,
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-neutral-400 text-xs">Brand / Channel Name</Label>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. TechVlogs India"
              className="bg-[#0a0a0a] border-[#1a1a1a] text-white text-lg h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-neutral-400 text-xs">Industry / Category</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="bg-[#0a0a0a] border-[#1a1a1a] text-white h-12">
                <SelectValue placeholder="Choose your niche" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: 'Language',
      icon: Globe,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            Choose your default caption language. AI will generate captions in this language.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {languages.map((lang) => (
              <Card
                key={lang.value}
                className={cn(
                  'cursor-pointer transition-all border-[#1a1a1a] bg-[#0a0a0a] hover:border-red-500/50',
                  defaultLanguage === lang.value && 'border-red-500 bg-red-500/5'
                )}
                onClick={() => setDefaultLanguage(lang.value)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                      defaultLanguage === lang.value
                        ? 'border-red-500 bg-red-500'
                        : 'border-neutral-600'
                    )}
                  >
                    {defaultLanguage === lang.value && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{lang.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Connect Platforms',
      icon: Link2,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            Connect your social media accounts to start posting.
          </p>
          <div className="space-y-3">
            {[
              { key: 'YOUTUBE', name: 'YouTube', color: 'text-red-500' },
              { key: 'INSTAGRAM', name: 'Instagram', color: 'text-pink-500' },
              { key: 'FACEBOOK', name: 'Facebook', color: 'text-blue-500' },
              { key: 'DRIVE', name: 'Google Drive', color: 'text-green-500' },
            ].map((platform) => (
              <div
                key={platform.key}
                className="flex items-center justify-between p-4 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a]"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${platform.color}`}>{platform.name}</span>
                </div>
                {connectedAccounts.includes(platform.key) ? (
                  <span className="flex items-center gap-1 text-sm text-green-500">
                    <Check className="h-4 w-4" /> Connected
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => connectPlatform(platform.key)}
                    className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a]"
                  >
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-600">
            You can skip this and connect later from Settings.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-lg py-12 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Welcome to AutoPost</h1>
        <p className="text-neutral-500 mt-2">Let's set up your automation in 30 seconds</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 rounded-full transition-all',
              i <= step ? 'w-12 bg-red-500' : 'w-8 bg-[#1a1a1a]'
            )}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-8">
        <div className="flex items-center gap-3 mb-6">
          {(() => {
            const Icon = steps[step].icon;
            return <Icon className="h-6 w-6 text-red-500" />;
          })()}
          <h2 className="text-xl font-semibold text-white">{steps[step].title}</h2>
          <span className="ml-auto text-xs text-neutral-500">
            {step + 1}/{steps.length}
          </span>
        </div>
        {steps[step].content}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            className="text-neutral-400 hover:text-white"
          >
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < steps.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? (
              'Setting up...'
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Start Creating
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

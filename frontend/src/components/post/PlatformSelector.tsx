'use client';

import { useQuery } from '@tanstack/react-query';
import { Instagram, Youtube, Facebook, CheckCircle, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { accountsApi } from '@/lib/api/accounts';
import { Platform, PostType } from '@/lib/types/api';
import { PlatformSelection } from '@/lib/types/post';
import { cn } from '@/lib/utils';

interface PlatformSelectorProps {
  selections: PlatformSelection[];
  onSelectionChange: (selections: PlatformSelection[]) => void;
}

const platformConfig: Record<string, any> = {
  INSTAGRAM: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-[hsl(var(--instagram-pink))]',
    gradient: 'instagram-gradient',
    glow: 'instagram-glow',
    postTypes: [
      { value: 'REEL' as PostType, label: 'Reel 🎬 (9:16)' },
      { value: 'FEED' as PostType, label: 'Feed 📸 (1:1)' },
      { value: 'STORY' as PostType, label: 'Story ⚡' },
    ],
  },
  YOUTUBE: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-[hsl(var(--youtube-red))]',
    gradient: 'youtube-gradient',
    glow: 'youtube-glow',
    postTypes: [
      { value: 'SHORT' as PostType, label: 'Shorts 📱 (9:16)' },
      { value: 'VIDEO' as PostType, label: 'Video 🎥 (16:9)' },
      { value: 'FEED' as PostType, label: 'Square ▪️ (1:1)' },
    ],
  },
  FACEBOOK: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-[hsl(var(--facebook-blue))]',
    gradient: 'facebook-gradient',
    glow: 'facebook-glow',
    postTypes: [
      { value: 'FEED' as PostType, label: 'Feed Post 📱 (1:1)' },
      { value: 'VIDEO' as PostType, label: 'Video 🎞️ (16:9)' },
    ],
  },
};

export function PlatformSelector({ selections, onSelectionChange }: PlatformSelectorProps) {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await accountsApi.getAll();
      return response.accounts.filter((a) => a.status === 'ACTIVE');
    },
  });

  const isPlatformSelected = (platform: Platform) => {
    return selections.some((s) => s.platform === platform);
  };

  const getPlatformSelection = (platform: Platform) => {
    return selections.find((s) => s.platform === platform);
  };

  const getAccountsForPlatform = (platform: Platform) => {
    return accounts?.filter((a) => a.platform === platform) || [];
  };

  const togglePlatform = (platform: Platform) => {
    if (isPlatformSelected(platform)) {
      // Remove platform
      onSelectionChange(selections.filter((s) => s.platform !== platform));
    } else {
      // Add platform with default values
      const platformAccounts = getAccountsForPlatform(platform);
      if (platformAccounts.length === 0) return;

      const defaultPostType = platformConfig[platform].postTypes[0].value;
      onSelectionChange([
        ...selections,
        {
          platform,
          accountId: platformAccounts[0].id,
          postType: defaultPostType,
        },
      ]);
    }
  };

  const updatePlatformSelection = (platform: Platform, updates: Partial<PlatformSelection>) => {
    onSelectionChange(selections.map((s) => (s.platform === platform ? { ...s, ...updates } : s)));
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading platforms...</div>;
  }

  const hasNoAccounts = !accounts || accounts.length === 0;

  if (hasNoAccounts) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Select Platforms</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose platforms and configure post types
          </p>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="text-lg font-semibold mb-2">No connected accounts</h4>
          <p className="text-muted-foreground">
            Connect your social media accounts to create posts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Platforms</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose platforms and configure post types
        </p>
      </div>

      <div className="space-y-3">
        {(Object.keys(platformConfig) as Platform[]).map((platform) => {
          const config = platformConfig[platform];
          const Icon = config.icon;
          const isSelected = isPlatformSelected(platform);
          const selection = getPlatformSelection(platform);
          const platformAccounts = getAccountsForPlatform(platform);
          const hasAccounts = platformAccounts.length > 0;

          return (
            <Card
              key={platform}
              className={cn(
                'transition-all hover-scale overflow-hidden',
                isSelected && `border-2 ${config.glow}`,
                hasAccounts && !isSelected && 'cursor-pointer hover:border-primary',
                !hasAccounts && 'opacity-50'
              )}
              onClick={() => hasAccounts && !isSelected && togglePlatform(platform)}
            >
              {/* Gradient Top Border */}
              {isSelected && <div className={`h-1 ${config.gradient}`}></div>}
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Platform Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          isSelected ? config.gradient : 'bg-muted'
                        )}
                      >
                        <Icon className={cn('h-6 w-6', isSelected ? 'text-white' : config.color)} />
                      </div>
                      <div>
                        <h4 className="font-semibold">{config.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {hasAccounts
                            ? `${platformAccounts.length} account${
                                platformAccounts.length > 1 ? 's' : ''
                              } connected ✓`
                            : 'No accounts connected'}
                        </p>
                      </div>
                    </div>
                    {hasAccounts && (
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors cursor-pointer',
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 hover:border-primary'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            togglePlatform(platform);
                          }
                        }}
                      >
                        {isSelected && <CheckCircle className="h-5 w-5 text-white" />}
                      </div>
                    )}
                  </div>

                  {/* Platform Configuration */}
                  {isSelected && selection && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`account-${platform}`} className="text-xs">
                          Account
                        </Label>
                        <Select
                          value={selection.accountId}
                          onValueChange={(value) =>
                            updatePlatformSelection(platform, { accountId: value })
                          }
                        >
                          <SelectTrigger id={`account-${platform}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {platformAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`post-type-${platform}`} className="text-xs">
                          Post Type
                        </Label>
                        <Select
                          value={selection.postType}
                          onValueChange={(value) =>
                            updatePlatformSelection(platform, { postType: value as PostType })
                          }
                        >
                          <SelectTrigger id={`post-type-${platform}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {config.postTypes.map((type: { value: string; label: string }) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Count */}
      {selections.length > 0 && (
        <div className="rounded-lg border bg-primary/5 p-3 text-sm">
          <p className="font-medium">
            {selections.length} platform{selections.length > 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}

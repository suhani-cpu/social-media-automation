'use client';

import { useQuery } from '@tanstack/react-query';
import { Instagram, Youtube, Facebook, CheckCircle, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { accountsApi } from '@/lib/api/accounts';
import { Platform, PostType } from '@/lib/types/api';

interface PlatformSelection {
  platform: Platform;
  accountId: string;
  postType: PostType;
}

interface PlatformSelectorProps {
  selections: PlatformSelection[];
  onSelectionChange: (selections: PlatformSelection[]) => void;
}

const platformConfig = {
  INSTAGRAM: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    postTypes: [
      { value: 'REEL', label: 'Reel (9:16)' },
      { value: 'FEED', label: 'Feed (1:1)' },
      { value: 'STORY', label: 'Story' },
    ],
  },
  YOUTUBE: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-600',
    postTypes: [
      { value: 'SHORT', label: 'Shorts (9:16)' },
      { value: 'VIDEO', label: 'Video (16:9)' },
      { value: 'FEED', label: 'Square (1:1)' },
    ],
  },
  FACEBOOK: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    postTypes: [
      { value: 'FEED', label: 'Feed Post (1:1)' },
      { value: 'VIDEO', label: 'Video (16:9)' },
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

      const defaultPostType = platformConfig[platform].postTypes[0].value as PostType;
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

  const updatePlatformSelection = (
    platform: Platform,
    updates: Partial<PlatformSelection>
  ) => {
    onSelectionChange(
      selections.map((s) => (s.platform === platform ? { ...s, ...updates } : s))
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  const hasNoAccounts = !accounts || accounts.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Platforms</h3>
        <p className="text-sm text-muted-foreground">
          Choose platforms and configure post types
        </p>
      </div>

      {hasNoAccounts ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h4 className="mt-4 font-semibold">No connected accounts</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your social media accounts to create posts
          </p>
        </div>
      ) : (
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
                className={`p-4 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : hasAccounts
                    ? 'cursor-pointer hover:shadow-md'
                    : 'opacity-50'
                }`}
                onClick={() => hasAccounts && !isSelected && togglePlatform(platform)}
              >
                <div className="space-y-4">
                  {/* Platform Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-6 w-6 ${config.color}`} />
                      <div>
                        <h4 className="font-semibold">{config.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {hasAccounts
                            ? `${platformAccounts.length} account${
                                platformAccounts.length > 1 ? 's' : ''
                              } connected`
                            : 'No accounts connected'}
                        </p>
                      </div>
                    </div>
                    {hasAccounts && (
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 hover:border-primary'
                        }`}
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
                      <div>
                        <Label htmlFor={`account-${platform}`} className="text-xs">
                          Account
                        </Label>
                        <Select
                          id={`account-${platform}`}
                          value={selection.accountId}
                          onChange={(e) =>
                            updatePlatformSelection(platform, { accountId: e.target.value })
                          }
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {platformAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.username}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`post-type-${platform}`} className="text-xs">
                          Post Type
                        </Label>
                        <Select
                          id={`post-type-${platform}`}
                          value={selection.postType}
                          onChange={(e) =>
                            updatePlatformSelection(platform, {
                              postType: e.target.value as PostType,
                            })
                          }
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {config.postTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

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

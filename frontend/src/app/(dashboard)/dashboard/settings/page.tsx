'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/posts';
import { useToast } from '@/hooks/useToast';

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

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { success, error: showError } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [brandName, setBrandName] = useState(user?.brandName || '');
  const [industry, setIndustry] = useState(user?.industry || '');
  const [defaultLanguage, setDefaultLanguage] = useState(user?.defaultLanguage || 'ENGLISH');
  const [defaultPrivacy, setDefaultPrivacy] = useState(user?.defaultPrivacy || 'public');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        brandName: brandName.trim() || undefined,
        industry: industry || undefined,
      });
      updateUser(res.user);
      success('Saved', 'Profile updated successfully');
    } catch (err: any) {
      showError('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        defaultLanguage,
        defaultPrivacy,
      });
      updateUser(res.user);
      success('Saved', 'Preferences updated successfully');
    } catch (err: any) {
      showError('Error', err.response?.data?.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-neutral-500">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Profile & Brand</h3>
            <p className="text-xs text-neutral-500 mb-6">Your profile and brand information</p>

            <div className="space-y-5 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-neutral-400 text-xs">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-400 text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email || ''}
                  disabled
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-neutral-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandName" className="text-neutral-400 text-xs">
                  Brand / Channel Name
                </Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. TechVlogs India"
                  className="bg-[#0a0a0a] border-[#1a1a1a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-neutral-400 text-xs">
                  Industry
                </Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="bg-[#0a0a0a] border-[#1a1a1a] text-white">
                    <SelectValue placeholder="Select industry" />
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
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Smart Defaults</h3>
            <p className="text-xs text-neutral-500 mb-6">
              These settings are remembered for every new post
            </p>

            <div className="space-y-5 max-w-md">
              <div className="space-y-2">
                <Label className="text-neutral-400 text-xs">Default Caption Language</Label>
                <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                  <SelectTrigger className="bg-[#0a0a0a] border-[#1a1a1a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-neutral-400 text-xs">Default YouTube Privacy</Label>
                <Select value={defaultPrivacy} onValueChange={setDefaultPrivacy}>
                  <SelectTrigger className="bg-[#0a0a0a] border-[#1a1a1a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleSavePreferences}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Notification Settings</h3>
            <p className="text-xs text-neutral-500 mb-6">
              In-app notifications are always on. Email notifications coming soon.
            </p>
            <div className="space-y-4 max-w-md">
              <div className="flex items-center justify-between p-3 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a]">
                <div>
                  <p className="text-sm font-medium text-white">Publish Success</p>
                  <p className="text-xs text-neutral-500">Get notified when a post publishes</p>
                </div>
                <span className="text-xs text-green-500 font-medium">Always On</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a]">
                <div>
                  <p className="text-sm font-medium text-white">Publish Failed</p>
                  <p className="text-xs text-neutral-500">Get alerted when publishing fails</p>
                </div>
                <span className="text-xs text-green-500 font-medium">Always On</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a]">
                <div>
                  <p className="text-sm font-medium text-white">Viral Alert</p>
                  <p className="text-xs text-neutral-500">When a post gets 10x normal views</p>
                </div>
                <span className="text-xs text-green-500 font-medium">Always On</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

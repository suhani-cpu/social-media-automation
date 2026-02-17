'use client';

import { Plus, Users, Sparkles, Link as LinkIcon, CheckCircle2, Cloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api/client';
import { useEffect, useState } from 'react';

interface DriveAccount {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export default function AccountsPage() {
  const { success, error } = useToast();
  const [driveAccount, setDriveAccount] = useState<DriveAccount | null>(null);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  // Fetch Google Drive status on mount
  useEffect(() => {
    fetchDriveStatus();

    // Check for OAuth callback success/error in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('drive') === 'connected') {
        success(
          '✅ Google Drive Connected!',
          'गूगल ड्राइव सफलतापूर्वक कनेक्ट हो गया है'
        );
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        fetchDriveStatus();
      } else if (params.get('drive') === 'error') {
        error(
          '❌ Connection Failed',
          'गूगल ड्राइव कनेक्शन में समस्या आई है'
        );
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const fetchDriveStatus = async () => {
    try {
      const response = await apiClient.get('/drive/status');
      if (response.data.connected) {
        setDriveAccount(response.data.account);
      } else {
        setDriveAccount(null);
      }
    } catch (err) {
      console.error('Error fetching Drive status:', err);
    }
  };

  const handleConnectDrive = async () => {
    try {
      setIsLoadingDrive(true);
      const response = await apiClient.get('/drive/auth');
      // Redirect to Google OAuth
      window.location.href = response.data.authUrl;
    } catch (err: any) {
      error(
        '❌ Connection Failed',
        err.response?.data?.message || 'गूगल ड्राइव कनेक्शन में समस्या आई है'
      );
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!confirm('🗑️ क्या आप वाकई Google Drive को डिस्कनेक्ट करना चाहते हैं?\n\nAre you sure you want to disconnect Google Drive?')) {
      return;
    }

    try {
      setIsLoadingDrive(true);
      await apiClient.post('/drive/disconnect');
      setDriveAccount(null);
      success(
        '✅ Drive Disconnected',
        'गूगल ड्राइव डिस्कनेक्ट हो गया है'
      );
    } catch (err: any) {
      error(
        '❌ Disconnect Failed',
        err.response?.data?.message || 'डिस्कनेक्शन में समस्या आई है'
      );
    } finally {
      setIsLoadingDrive(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Vibrant Header with Social Connection Theme */}
      <div className="multi-social-gradient animated-gradient rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="flex gap-6 justify-end items-start p-6">
            <Users className="w-12 h-12 text-white animate-pulse" />
            <LinkIcon className="w-10 h-10 text-white" />
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center vibrant-glow">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">Connect & Share 🌟</h1>
                  <p className="text-white/90 text-lg mt-1">Link your social accounts and reach millions ✨</p>
                </div>
              </div>
            </div>
            <Button className="bg-white text-primary hover:bg-white/90 hover-scale vibrant-glow text-lg px-6 py-6">
              <Plus className="mr-2 h-5 w-5" />
              Add Account 🚀
            </Button>
          </div>
        </div>
      </div>

      {/* Platform Connection Cards with Logos */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <LinkIcon className="w-6 h-6 text-primary" />
          Available Platforms 📱
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Instagram Card */}
          <Card className="overflow-hidden hover-scale border-2 border-[hsl(var(--instagram-pink))]/30 hover:shadow-2xl hover:shadow-[hsl(var(--instagram-pink))]/30 transition-all group">
            <div className="instagram-gradient h-2"></div>
            <CardContent className="p-8 text-center">
              {/* Instagram Logo SVG */}
              <div className="mb-6 relative">
                <div className="w-24 h-24 mx-auto instagram-gradient rounded-3xl flex items-center justify-center instagram-glow transform group-hover:scale-110 transition-transform">
                  <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                    <path d="M12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">Instagram</h3>
              <p className="text-muted-foreground mb-6">Share Reels, Stories & Posts 📸</p>
              <Button className="w-full instagram-gradient text-white hover:shadow-lg hover:shadow-[hsl(var(--instagram-pink))]/50 border-0 text-lg py-6">
                Connect Instagram 💖
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                1B+ users waiting for your content! 🌎
              </p>
            </CardContent>
          </Card>

          {/* YouTube Card */}
          <Card className="overflow-hidden hover-scale border-2 border-[hsl(var(--youtube-red))]/30 hover:shadow-2xl hover:shadow-[hsl(var(--youtube-red))]/30 transition-all group">
            <div className="youtube-gradient h-2"></div>
            <CardContent className="p-8 text-center">
              {/* YouTube Logo SVG */}
              <div className="mb-6 relative">
                <div className="w-24 h-24 mx-auto youtube-gradient rounded-3xl flex items-center justify-center youtube-glow transform group-hover:scale-110 transition-transform">
                  <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">YouTube</h3>
              <p className="text-muted-foreground mb-6">Upload Videos & Shorts 🎥</p>
              <Button className="w-full youtube-gradient text-white hover:shadow-lg hover:shadow-[hsl(var(--youtube-red))]/50 border-0 text-lg py-6">
                Connect YouTube ❤️
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                2B+ viewers ready to watch! 📺
              </p>
            </CardContent>
          </Card>

          {/* Facebook Card */}
          <Card className="overflow-hidden hover-scale border-2 border-[hsl(var(--facebook-blue))]/30 hover:shadow-2xl hover:shadow-[hsl(var(--facebook-blue))]/30 transition-all group">
            <div className="facebook-gradient h-2"></div>
            <CardContent className="p-8 text-center">
              {/* Facebook Logo SVG */}
              <div className="mb-6 relative">
                <div className="w-24 h-24 mx-auto facebook-gradient rounded-3xl flex items-center justify-center facebook-glow transform group-hover:scale-110 transition-transform">
                  <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">Facebook</h3>
              <p className="text-muted-foreground mb-6">Post to Pages & Groups 👥</p>
              <Button className="w-full facebook-gradient text-white hover:shadow-lg hover:shadow-[hsl(var(--facebook-blue))]/50 border-0 text-lg py-6">
                Connect Facebook 💙
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                3B+ people connecting daily! 🌐
              </p>
            </CardContent>
          </Card>

          {/* Google Drive Card */}
          <Card className="overflow-hidden hover-scale border-2 border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all group">
            <div className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 h-2"></div>
            <CardContent className="p-8 text-center">
              {/* Google Drive Logo */}
              <div className="mb-6 relative">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/50 transform group-hover:scale-110 transition-transform">
                  <Cloud className="w-14 h-14 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">Google Drive</h3>
              <p className="text-muted-foreground mb-6">
                {driveAccount ? 'Connected ✅' : 'Import Videos from Cloud ☁️'}
              </p>

              {driveAccount ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                    <p className="text-sm text-emerald-900 dark:text-emerald-100 font-medium truncate">
                      {driveAccount.username}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      Connected on {new Date(driveAccount.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={handleDisconnectDrive}
                    disabled={isLoadingDrive}
                    className="w-full bg-red-500 hover:bg-red-600 text-white border-0 text-lg py-6"
                  >
                    <X className="mr-2 h-5 w-5" />
                    {isLoadingDrive ? 'Disconnecting...' : 'Disconnect ❌'}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleConnectDrive}
                  disabled={isLoadingDrive}
                  className="w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-emerald-500/50 border-0 text-lg py-6"
                >
                  {isLoadingDrive ? 'Connecting...' : 'Connect Drive 💚'}
                </Button>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                {driveAccount ? 'Import videos anytime! 📂' : 'Access your video library! 📂'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
        <div className="multi-social-gradient h-2"></div>
        <CardHeader className="bg-gradient-to-br from-card via-card to-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Your Connected Accounts 🔗</CardTitle>
              <CardDescription className="text-base">Manage all your social media connections in one place</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 via-[hsl(var(--instagram-pink))]/10 to-[hsl(var(--facebook-blue))]/10 flex items-center justify-center">
              <Users className="w-16 h-16 text-muted-foreground animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">No accounts connected yet! 🎯</h3>
              <p className="text-muted-foreground text-lg max-w-md">
                Connect your first social media account and start sharing your amazing content with the world! 🚀✨
              </p>
            </div>
            <Button size="lg" className="multi-social-gradient text-white hover:shadow-2xl hover:shadow-primary/50 border-0 text-lg px-8 py-6 hover-scale">
              <Plus className="mr-2 h-5 w-5" />
              Connect Your First Account 🌟
            </Button>
            <div className="flex gap-4 items-center text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Secure OAuth 🔒</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Instant Setup ⚡</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span>Multi-Platform 🎨</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-[hsl(var(--instagram-pink))]/20 hover-scale">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">📈</div>
            <h3 className="font-bold text-lg mb-2">Grow Your Reach</h3>
            <p className="text-sm text-muted-foreground">
              Post to multiple platforms simultaneously and expand your audience exponentially!
            </p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--youtube-red))]/20 hover-scale">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="font-bold text-lg mb-2">Save Time</h3>
            <p className="text-sm text-muted-foreground">
              Schedule posts in advance and let automation handle the rest while you create!
            </p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--facebook-blue))]/20 hover-scale">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-bold text-lg mb-2">Stay Consistent</h3>
            <p className="text-sm text-muted-foreground">
              Maintain a regular posting schedule across all platforms effortlessly!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

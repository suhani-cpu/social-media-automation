'use client';

import { Cloud, X, FileVideo, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api/client';
import { accountsApi } from '@/lib/api/accounts';
import { useEffect, useState } from 'react';
import { SocialAccount } from '@/lib/types/api';
import { DriveImportModal } from '@/components/drive/DriveImportModal';

interface DriveAccount {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export default function AccountsPage() {
  const { success, error } = useToast();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [driveAccount, setDriveAccount] = useState<DriveAccount | null>(null);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchDriveStatus();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('drive') === 'connected') {
        success('Google Drive Connected!', 'Google Drive has been connected successfully');
        window.history.replaceState({}, '', window.location.pathname);
        fetchDriveStatus();
      } else if (params.get('drive') === 'error') {
        error('Connection Failed', 'Failed to connect Google Drive');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('success') === 'youtube_connected') {
        success('YouTube Connected!', 'YouTube channel connected successfully');
        window.history.replaceState({}, '', window.location.pathname);
        fetchAccounts();
      } else if (
        params.get('error') === 'youtube_auth_failed' ||
        params.get('error') === 'youtube_connection_failed'
      ) {
        error('YouTube Connection Failed', 'Please try again');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('success') === 'facebook_connected') {
        success('Facebook Connected!', 'Facebook pages connected successfully');
        window.history.replaceState({}, '', window.location.pathname);
        fetchAccounts();
      } else if (
        params.get('error') === 'facebook_auth_failed' ||
        params.get('error') === 'facebook_connection_failed' ||
        params.get('error') === 'no_facebook_pages'
      ) {
        error('Facebook Connection Failed', 'Please try again');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('success') === 'instagram_connected') {
        success('Instagram Connected!', 'Instagram account connected successfully');
        window.history.replaceState({}, '', window.location.pathname);
        fetchAccounts();
      } else if (
        params.get('error') === 'instagram_auth_failed' ||
        params.get('error') === 'instagram_connection_failed' ||
        params.get('error') === 'no_instagram_accounts'
      ) {
        error('Instagram Connection Failed', 'Please try again');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await accountsApi.getAll();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

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

  const getAccountByPlatform = (platform: string): SocialAccount | undefined => {
    return accounts.find((a) => a.platform === platform && a.status === 'ACTIVE');
  };

  const handleDisconnect = async (accountId: string, platformName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platformName}?`)) return;
    try {
      await accountsApi.disconnect(accountId);
      success(`${platformName} Disconnected`, `${platformName} has been disconnected`);
      fetchAccounts();
    } catch (err: any) {
      error('Disconnect Failed', err.response?.data?.message || 'Failed to disconnect');
    }
  };

  const handleConnectDrive = async () => {
    try {
      setIsLoadingDrive(true);
      const response = await apiClient.get('/drive/auth');
      window.location.href = response.data.authUrl;
    } catch (err: any) {
      error('Connection Failed', err.response?.data?.message || 'Failed to connect Google Drive');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive?')) return;
    try {
      setIsLoadingDrive(true);
      await apiClient.post('/drive/disconnect');
      setDriveAccount(null);
      success('Drive Disconnected', 'Google Drive has been disconnected');
    } catch (err: any) {
      error('Disconnect Failed', err.response?.data?.message || 'Failed to disconnect');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleConnectYouTube = async () => {
    setConnecting('YOUTUBE');
    try {
      const response = await accountsApi.getYouTubeAuthUrl();
      const authUrl = response?.authUrl;
      if (!authUrl) {
        error('YouTube Connection Failed', 'No authorization URL received from server.');
        setConnecting(null);
        return;
      }
      window.location.href = authUrl;
    } catch (err: any) {
      const msg =
        err.response?.status === 401
          ? 'Session expired. Please log out and log back in.'
          : err?.response?.data?.message || err.message;
      error('YouTube Connection Failed', msg);
      setConnecting(null);
    }
  };

  const handleConnectFacebook = async () => {
    setConnecting('FACEBOOK');
    try {
      const { authUrl } = await accountsApi.getFacebookAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      const msg =
        err.response?.status === 401
          ? 'Session expired. Please log out and log back in.'
          : err?.response?.data?.message || err.message;
      error('Facebook Connection Failed', msg);
      setConnecting(null);
    }
  };

  const handleConnectInstagram = async () => {
    setConnecting('INSTAGRAM');
    try {
      const { authUrl } = await accountsApi.getInstagramAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      const msg =
        err.response?.status === 401
          ? 'Session expired. Please log out and log back in.'
          : err?.response?.data?.message || err.message;
      error('Instagram Connection Failed', msg);
      setConnecting(null);
    }
  };

  const youtubeAccount = getAccountByPlatform('YOUTUBE');
  const facebookAccount = getAccountByPlatform('FACEBOOK');
  const instagramAccount = getAccountByPlatform('INSTAGRAM');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Connected Accounts</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Link your social accounts to start sharing
            </p>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Instagram */}
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#1a1a1a] flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
              <path d="M12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Instagram</h3>
          <p className="text-xs text-neutral-500 mb-4">
            {instagramAccount ? 'Connected' : 'Reels, Stories & Posts'}
          </p>

          {instagramAccount ? (
            <div className="space-y-2">
              <div className="rounded-md bg-[#1a1a1a] p-2">
                <p className="text-xs text-neutral-300 truncate">{instagramAccount.username}</p>
              </div>
              <Button
                onClick={() => handleDisconnect(instagramAccount.id, 'Instagram')}
                variant="outline"
                className="w-full border-[#1a1a1a] text-neutral-400 hover:text-red-500 hover:border-red-500/30 text-sm"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectInstagram}
              disabled={connecting === 'INSTAGRAM'}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
            >
              {connecting === 'INSTAGRAM' ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>

        {/* YouTube */}
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#1a1a1a] flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-1">YouTube</h3>
          <p className="text-xs text-neutral-500 mb-4">
            {youtubeAccount ? 'Connected' : 'Videos & Shorts'}
          </p>

          {youtubeAccount ? (
            <div className="space-y-2">
              <div className="rounded-md bg-[#1a1a1a] p-2">
                <p className="text-xs text-neutral-300 truncate">{youtubeAccount.username}</p>
              </div>
              <Button
                onClick={() => handleDisconnect(youtubeAccount.id, 'YouTube')}
                variant="outline"
                className="w-full border-[#1a1a1a] text-neutral-400 hover:text-red-500 hover:border-red-500/30 text-sm"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectYouTube}
              disabled={connecting === 'YOUTUBE'}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
            >
              {connecting === 'YOUTUBE' ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>

        {/* Facebook */}
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#1a1a1a] flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Facebook</h3>
          <p className="text-xs text-neutral-500 mb-4">
            {facebookAccount ? 'Connected' : 'Pages & Groups'}
          </p>

          {facebookAccount ? (
            <div className="space-y-2">
              <div className="rounded-md bg-[#1a1a1a] p-2">
                <p className="text-xs text-neutral-300 truncate">{facebookAccount.username}</p>
              </div>
              <Button
                onClick={() => handleDisconnect(facebookAccount.id, 'Facebook')}
                variant="outline"
                className="w-full border-[#1a1a1a] text-neutral-400 hover:text-red-500 hover:border-red-500/30 text-sm"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectFacebook}
              disabled={connecting === 'FACEBOOK'}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
            >
              {connecting === 'FACEBOOK' ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>

        {/* Google Drive */}
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-[#1a1a1a] flex items-center justify-center mb-4">
            <Cloud className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Google Drive</h3>
          <p className="text-xs text-neutral-500 mb-4">
            {driveAccount ? 'Connected' : 'Import Videos'}
          </p>

          {driveAccount ? (
            <div className="space-y-2">
              <div className="rounded-md bg-[#1a1a1a] p-2">
                <p className="text-xs text-neutral-300 truncate">{driveAccount.username}</p>
              </div>
              <Button
                onClick={() => setIsDriveModalOpen(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
              >
                <FileVideo className="mr-2 h-3.5 w-3.5" />
                Browse Videos
              </Button>
              <Button
                onClick={handleDisconnectDrive}
                disabled={isLoadingDrive}
                variant="outline"
                className="w-full border-[#1a1a1a] text-neutral-400 hover:text-red-500 hover:border-red-500/30 text-sm"
              >
                <X className="mr-2 h-3.5 w-3.5" />
                {isLoadingDrive ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectDrive}
              disabled={isLoadingDrive}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
            >
              {isLoadingDrive ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Section */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center">
            <Users className="w-8 h-8 text-neutral-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">
              {accounts.length > 0 || driveAccount
                ? `${accounts.length + (driveAccount ? 1 : 0)} account${accounts.length + (driveAccount ? 1 : 0) !== 1 ? 's' : ''} connected`
                : 'Connect your accounts above'}
            </h3>
            <p className="text-sm text-neutral-500 max-w-md">
              Link your social media accounts to start sharing content across platforms.
            </p>
          </div>
          <div className="flex gap-6 items-center text-xs text-neutral-500 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span>Secure OAuth</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <span>Instant Setup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-500"></div>
              <span>Multi-Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drive Import Modal */}
      <DriveImportModal isOpen={isDriveModalOpen} onClose={() => setIsDriveModalOpen(false)} />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { accountsApi } from '@/lib/api/accounts';
import { SocialAccount } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';

type PlatformIcon = {
  [key: string]: string;
};

const platformIcons: PlatformIcon = {
  INSTAGRAM: '📷',
  YOUTUBE: '▶️',
  FACEBOOK: '👥',
  GOOGLE_DRIVE: '📁',
};

const platformColors: PlatformIcon = {
  INSTAGRAM: 'bg-pink-500',
  YOUTUBE: 'bg-red-500',
  FACEBOOK: 'bg-blue-500',
  GOOGLE_DRIVE: 'bg-green-500',
};

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const pages = searchParams.get('pages');
    const drive = searchParams.get('drive');

    if (drive === 'connected') {
      setMessage({ type: 'success', text: 'Google Drive connected successfully!' });
      loadAccounts();
    } else if (drive === 'error') {
      setMessage({ type: 'error', text: 'Failed to connect Google Drive. Please try again.' });
    } else if (success === 'youtube_connected') {
      setMessage({ type: 'success', text: 'YouTube channel connected successfully!' });
      loadAccounts();
    } else if (success === 'facebook_connected') {
      const pageCount = pages ? ` (${pages} page${pages !== '1' ? 's' : ''})` : '';
      setMessage({ type: 'success', text: `Facebook pages connected successfully${pageCount}!` });
      loadAccounts();
    } else if (success === 'instagram_connected') {
      const accountCount = searchParams.get('accounts');
      const accountText = accountCount
        ? ` (${accountCount} account${accountCount !== '1' ? 's' : ''})`
        : '';
      setMessage({
        type: 'success',
        text: `Instagram accounts connected successfully${accountText}!`,
      });
      loadAccounts();
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        youtube_auth_failed: 'YouTube authorization failed. Please try again.',
        youtube_connection_failed: 'Failed to connect YouTube channel.',
        facebook_auth_failed: 'Facebook authorization failed. Please try again.',
        facebook_connection_failed: 'Failed to connect Facebook pages.',
        no_facebook_pages: 'No Facebook pages found. Please create a page first.',
        instagram_auth_failed: 'Instagram authorization failed. Please try again.',
        instagram_connection_failed: 'Failed to connect Instagram accounts.',
        no_instagram_accounts:
          'No Instagram Business accounts found. Please link a Business account to your Facebook Page.',
      };
      setMessage({ type: 'error', text: errorMessages[error] || 'Connection failed.' });
    }

    // Clear URL parameters after showing message
    if (success || error || drive) {
      router.replace('/dashboard/accounts', { scroll: false });
    }
  }, [searchParams, router]);

  const loadAccounts = async () => {
    try {
      const data = await accountsApi.getAll();
      setAccounts(data.accounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setMessage({ type: 'error', text: 'Failed to load accounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleConnectYouTube = async () => {
    console.log('[YT] handleConnectYouTube called');
    setConnecting('YOUTUBE');
    try {
      console.log('[YT] Calling accountsApi.getYouTubeAuthUrl()...');
      const response = await accountsApi.getYouTubeAuthUrl();
      console.log('[YT] API response:', JSON.stringify(response));
      const authUrl = response?.authUrl;

      if (!authUrl) {
        console.error('[YT] No authUrl in response');
        setMessage({ type: 'error', text: 'No authorization URL received from server.' });
        setConnecting(null);
        return;
      }

      console.log('[YT] Redirecting to:', authUrl.substring(0, 80) + '...');
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('[YT] Error:', error?.response?.status, error?.message);
      const msg =
        error.response?.status === 401
          ? 'Session expired. Please log out and log back in.'
          : `YouTube connect failed: ${error?.response?.data?.message || error.message}`;
      alert(msg);
      setMessage({ type: 'error', text: msg });
      setConnecting(null);
    }
  };

  const handleConnectFacebook = async () => {
    try {
      setConnecting('FACEBOOK');
      const { authUrl } = await accountsApi.getFacebookAuthUrl();
      // Open in same window to handle OAuth flow
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get Facebook auth URL:', error);
      setMessage({ type: 'error', text: 'Failed to connect Facebook' });
      setConnecting(null);
    }
  };

  const handleConnectInstagram = async () => {
    try {
      setConnecting('INSTAGRAM');
      const { authUrl } = await accountsApi.getInstagramAuthUrl();
      // Open in same window to handle OAuth flow
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get Instagram auth URL:', error);
      setMessage({ type: 'error', text: 'Failed to connect Instagram' });
      setConnecting(null);
    }
  };

  const handleConnectDrive = async () => {
    try {
      setConnecting('GOOGLE_DRIVE');
      const { authUrl } = await accountsApi.getDriveAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get Google Drive auth URL:', error);
      setMessage({ type: 'error', text: 'Failed to connect Google Drive. Please try again.' });
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string, platform: string) => {
    if (!confirm(`Are you sure you want to disconnect this ${platform} account?`)) {
      return;
    }

    try {
      await accountsApi.disconnect(id);
      setMessage({ type: 'success', text: `${platform} account disconnected` });
      loadAccounts();
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect account' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { label: 'Active', className: 'bg-green-500' },
      EXPIRED: { label: 'Expired', className: 'bg-yellow-500' },
      DISCONNECTED: { label: 'Disconnected', className: 'bg-gray-500' },
      ERROR: { label: 'Error', className: 'bg-red-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DISCONNECTED;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const groupedAccounts = accounts.reduce(
    (acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    },
    {} as { [key: string]: SocialAccount[] }
  );

  const hasYouTube = accounts.some((a) => a.platform === 'YOUTUBE');
  const hasFacebook = accounts.some((a) => a.platform === 'FACEBOOK');
  const hasInstagram = accounts.some((a) => a.platform === 'INSTAGRAM');
  const hasDrive = accounts.some((a) => a.platform === 'GOOGLE_DRIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Social Accounts</h1>
        <p className="text-muted-foreground">Connect and manage your social media accounts</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === 'success'
              ? 'border-green-500 bg-green-500/10 text-green-500'
              : 'border-red-500 bg-red-500/10 text-red-500'
          }`}
        >
          <p>{message.text}</p>
          <button
            onClick={() => setMessage(null)}
            className="absolute right-4 top-4 text-current hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {/* Connection Buttons */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* YouTube */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-4xl">{platformIcons.YOUTUBE}</div>
            <div>
              <h3 className="font-semibold">YouTube</h3>
              <p className="text-sm text-muted-foreground">
                {hasYouTube ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleConnectYouTube}
            disabled={connecting === 'YOUTUBE'}
            className="w-full bg-red-500 hover:bg-red-600"
          >
            {connecting === 'YOUTUBE'
              ? 'Connecting...'
              : hasYouTube
                ? 'Reconnect YouTube'
                : 'Connect YouTube'}
          </Button>
        </Card>

        {/* Facebook */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-4xl">{platformIcons.FACEBOOK}</div>
            <div>
              <h3 className="font-semibold">Facebook</h3>
              <p className="text-sm text-muted-foreground">
                {hasFacebook ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleConnectFacebook}
            disabled={connecting === 'FACEBOOK'}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {connecting === 'FACEBOOK'
              ? 'Connecting...'
              : hasFacebook
                ? 'Reconnect Facebook'
                : 'Connect Facebook'}
          </Button>
        </Card>

        {/* Instagram */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-4xl">{platformIcons.INSTAGRAM}</div>
            <div>
              <h3 className="font-semibold">Instagram</h3>
              <p className="text-sm text-muted-foreground">
                {hasInstagram ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleConnectInstagram}
            disabled={connecting === 'INSTAGRAM'}
            className="w-full bg-pink-500 hover:bg-pink-600"
          >
            {connecting === 'INSTAGRAM'
              ? 'Connecting...'
              : hasInstagram
                ? 'Reconnect Instagram'
                : 'Connect Instagram'}
          </Button>
        </Card>

        {/* Google Drive */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-4xl">{platformIcons.GOOGLE_DRIVE}</div>
            <div>
              <h3 className="font-semibold">Google Drive</h3>
              <p className="text-sm text-muted-foreground">
                {hasDrive ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleConnectDrive}
            disabled={connecting === 'GOOGLE_DRIVE'}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            {connecting === 'GOOGLE_DRIVE'
              ? 'Connecting...'
              : hasDrive
                ? 'Reconnect Drive'
                : 'Connect Google Drive'}
          </Button>
        </Card>
      </div>

      {/* Connected Accounts List */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading accounts...</p>
        </Card>
      ) : accounts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No accounts connected yet. Connect your social media accounts to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Connected Accounts</h2>

          {Object.entries(groupedAccounts).map(([platform, platformAccounts]) => (
            <div key={platform}>
              <h3 className="text-lg font-medium mb-2 flex items-center space-x-2">
                <span>{platformIcons[platform]}</span>
                <span>{platform}</span>
              </h3>

              <div className="space-y-2">
                {platformAccounts.map((account) => (
                  <Card key={account.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-2 h-2 rounded-full ${platformColors[platform]}`} />
                        <div>
                          <p className="font-medium">{account.username}</p>
                          <p className="text-sm text-muted-foreground">ID: {account.accountId}</p>
                          {account.tokenExpiry && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(account.tokenExpiry).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {getStatusBadge(account.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(account.id, platform)}
                          className="text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold mb-2">📝 How to Connect Accounts</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>
            <strong>YouTube:</strong> Click "Connect YouTube" and authorize access to your YouTube
            channel
          </li>
          <li>
            <strong>Facebook:</strong> Click "Connect Facebook" and select which pages you want to
            manage
          </li>
          <li>
            <strong>Instagram:</strong> Click "Connect Instagram" (requires Instagram Business
            account linked to Facebook Page)
          </li>
          <li>Tokens are automatically refreshed to keep your connections active</li>
          <li>You can reconnect an account anytime to refresh permissions</li>
        </ul>
      </Card>
    </div>
  );
}

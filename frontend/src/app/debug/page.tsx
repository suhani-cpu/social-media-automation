'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import apiClient from '@/lib/api/client';

export default function DebugPage() {
  const { user, token, isAuthenticated } = useAuthStore();
  const [apiTest, setApiTest] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Test API connection
    async function testAPI() {
      try {
        const response = await apiClient.get('/videos');
        setApiTest(response.data);
      } catch (error: any) {
        setApiError(error.message);
      }
    }

    if (isAuthenticated) {
      testAPI();
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Debug Information</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Authentication State</h2>
          <div className="space-y-2">
            <p>
              <strong>Is Authenticated:</strong>{' '}
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? '✓ Yes' : '✗ No'}
              </span>
            </p>
            <p>
              <strong>Has Token:</strong>{' '}
              <span className={token ? 'text-green-600' : 'text-red-600'}>
                {token ? `✓ Yes (${token.substring(0, 20)}...)` : '✗ No'}
              </span>
            </p>
            <p>
              <strong>User:</strong>{' '}
              {user ? (
                <span className="text-green-600">
                  ✓ {user.name} ({user.email})
                </span>
              ) : (
                <span className="text-red-600">✗ No user data</span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">API Connection Test</h2>
          {isAuthenticated ? (
            <>
              {apiTest && (
                <div className="space-y-2">
                  <p className="text-green-600">✓ API Connection Successful</p>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto">
                    {JSON.stringify(apiTest, null, 2)}
                  </pre>
                </div>
              )}
              {apiError && (
                <div className="space-y-2">
                  <p className="text-red-600">✗ API Connection Failed</p>
                  <pre className="bg-red-50 p-4 rounded overflow-auto text-red-600">
                    {apiError}
                  </pre>
                </div>
              )}
              {!apiTest && !apiError && <p>Testing API connection...</p>}
            </>
          ) : (
            <p className="text-yellow-600">Please login first to test API connection</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">LocalStorage Check</h2>
          <p>
            <strong>Auth Storage:</strong>{' '}
            {typeof window !== 'undefined'
              ? localStorage.getItem('auth-storage')
                ? '✓ Present'
                : '✗ Not found'
              : 'Loading...'}
          </p>
          {typeof window !== 'undefined' && localStorage.getItem('auth-storage') && (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {localStorage.getItem('auth-storage')}
            </pre>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Environment Variables</h2>
          <p>
            <strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not set'}
          </p>
          <p>
            <strong>Max Upload Size:</strong> {process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || 'Not set'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Navigation Links</h2>
          <div className="space-x-4">
            <a href="/login" className="text-blue-600 hover:underline">
              Login
            </a>
            <a href="/dashboard" className="text-blue-600 hover:underline">
              Dashboard
            </a>
            <a href="/dashboard/videos" className="text-blue-600 hover:underline">
              Videos
            </a>
            <a href="/dashboard/posts" className="text-blue-600 hover:underline">
              Posts
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

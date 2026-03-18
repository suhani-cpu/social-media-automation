'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { apiClient } from '@/lib/api/client';

const AUTO_LOGIN_EMAIL = 'admin@stageott.com';
const AUTO_LOGIN_PASSWORD = '123456';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, setAuth, _hasHydrated } = useAuthStore();
  const [ready, setReady] = useState(false);
  const loginAttempted = useRef(false);

  // Force hydration after 2 seconds if stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!_hasHydrated) {
        useAuthStore.setState({ _hasHydrated: true });
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [_hasHydrated]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (loginAttempted.current) return;

    const token = localStorage.getItem('token');

    if (isAuthenticated && token) {
      // Verify token is still valid
      apiClient
        .get('/videos')
        .then(() => setReady(true))
        .catch(() => {
          // Token expired - clear and auto-login
          localStorage.removeItem('token');
          useAuthStore.getState().logout();
          doAutoLogin();
        });
      return;
    }

    if (token && !isAuthenticated) {
      // Have token but store not synced - try using it
      setReady(true);
      return;
    }

    // No token - auto-login
    doAutoLogin();

    function doAutoLogin() {
      loginAttempted.current = true;
      apiClient
        .post('/auth/login', { email: AUTO_LOGIN_EMAIL, password: AUTO_LOGIN_PASSWORD })
        .then((res) => {
          const { user, token: newToken } = res.data;
          localStorage.setItem('token', newToken);
          setAuth(user, newToken);
          setReady(true);
        })
        .catch(() => {
          // Login failed - try registering first, then login
          apiClient
            .post('/auth/register', { email: AUTO_LOGIN_EMAIL, password: AUTO_LOGIN_PASSWORD, name: 'Suhani' })
            .then((res) => {
              const { user, token: newToken } = res.data;
              localStorage.setItem('token', newToken);
              setAuth(user, newToken);
              setReady(true);
            })
            .catch(() => {
              router.push('/login');
            });
        });
    }
  }, [isAuthenticated, setAuth, _hasHydrated, router]);

  if (!_hasHydrated || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        <p className="absolute bottom-10 text-xs text-neutral-600">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { apiClient } from '@/lib/api/client';

const AUTO_LOGIN_EMAIL = 'suhani@stage.in';
const AUTO_LOGIN_PASSWORD = '123456';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, setAuth, _hasHydrated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    const token = localStorage.getItem('token');
    
    if (isAuthenticated || token) {
      setReady(true);
      return;
    }

    // Auto-login
    apiClient
      .post('/auth/login', { email: AUTO_LOGIN_EMAIL, password: AUTO_LOGIN_PASSWORD })
      .then((res) => {
        const { user, token: newToken } = res.data;
        localStorage.setItem('token', newToken);
        setAuth(user, newToken);
        setReady(true);
      })
      .catch(() => {
        // If auto-login fails, redirect to login
        router.push('/login');
      });
  }, [isAuthenticated, setAuth, _hasHydrated, router]);

  if (!_hasHydrated || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

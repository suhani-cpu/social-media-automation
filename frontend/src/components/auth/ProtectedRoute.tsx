'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check zustand hydration first
    if (_hasHydrated) {
      if (isAuthenticated) {
        setIsReady(true);
      } else {
        // Zustand hydrated but not authenticated - check localStorage as fallback
        const token = localStorage.getItem('token');
        if (token) {
          // Token exists in localStorage but zustand lost it (can happen after OAuth redirects)
          setIsReady(true);
        } else {
          router.push('/login');
        }
      }
      return;
    }

    // Fallback: if zustand hydration hasn't fired after 500ms, check localStorage directly
    const timeout = setTimeout(() => {
      const token = localStorage.getItem('token');
      if (token) {
        setIsReady(true);
      } else {
        router.push('/login');
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [_hasHydrated, isAuthenticated, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

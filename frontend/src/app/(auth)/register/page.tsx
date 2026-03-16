'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated) {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
    </div>
  );
}

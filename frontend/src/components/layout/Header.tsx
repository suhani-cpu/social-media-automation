'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#1a1a1a] bg-[#0a0a0a] px-6">
      <div>
        <h2 className="text-sm font-medium text-white">
          Welcome, <span className="text-red-500">{user?.name?.split(' ')[0]}</span>
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#111] text-xs text-neutral-400">
          <User className="h-3 w-3" />
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-neutral-400 hover:text-red-500 hover:bg-red-500/10 text-xs"
        >
          <LogOut className="mr-1.5 h-3 w-3" />
          Logout
        </Button>
      </div>
    </header>
  );
}

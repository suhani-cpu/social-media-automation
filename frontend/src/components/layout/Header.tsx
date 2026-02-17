'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full multi-social-gradient flex items-center justify-center vibrant-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Welcome back, <span className="text-primary">{user?.name?.split(' ')[0]}</span>! 👋
            </h2>
            <p className="text-xs text-muted-foreground">Ready to create amazing content? ✨</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Info */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50" data-testid="user-menu">
          <User className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground font-medium">{user?.email}</span>
        </div>

        {/* Logout Button */}
        <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive" data-testid="logout-button">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  FileText,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Play,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggleButton } from '@/components/ui/theme-toggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Videos', href: '/dashboard/videos', icon: Video },
  { name: 'Posts', href: '/dashboard/posts', icon: FileText },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col border-r bg-card">
      <div className="multi-social-gradient animated-gradient px-6 py-4 border-b relative overflow-hidden">
        {/* Social Media Icons Background */}
        <div className="absolute top-2 right-2 opacity-10 flex gap-1">
          <div className="w-4 h-4 rounded-full bg-white/30"></div>
          <div className="w-3 h-3 rounded-full bg-white/30 mt-1"></div>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center vibrant-glow">
            <Play className="h-6 w-6 fill-current text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Stage OTT</h1>
            <p className="text-xs text-white/90 font-medium">Social Media Manager 🚀</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover-scale',
                isActive
                  ? 'bg-primary text-primary-foreground red-glow'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-md'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle at Bottom */}
      <div className="p-4 border-t">
        <div className="mb-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Choose Your Vibe 🎨</p>
        </div>
        <ThemeToggleButton />
      </div>
    </div>
  );
}

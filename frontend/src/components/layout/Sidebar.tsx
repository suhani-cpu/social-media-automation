'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  FileText,
  Calendar,
  CalendarClock,
  Users,
  BarChart3,
  Settings,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Videos', href: '/dashboard/videos', icon: Video },
  { name: 'Posts', href: '/dashboard/posts', icon: FileText },
  { name: 'Schedule', href: '/dashboard/schedule', icon: CalendarClock },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-56 flex-col border-r border-[#1a1a1a] bg-[#0a0a0a]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
            <Play className="h-4 w-4 fill-current text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Stage OTT</h1>
            <p className="text-[10px] text-neutral-500 font-medium">Social Media Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-neutral-400 hover:bg-[#141414] hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

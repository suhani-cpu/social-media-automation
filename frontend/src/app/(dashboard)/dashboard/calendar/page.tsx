'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Youtube,
  Facebook,
  Calendar as CalendarIcon,
  X,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { postsApi } from '@/lib/api/posts';
import { Post, Platform, PostStatus } from '@/lib/types/api';

/* ── Platform config ─────────────────────────────────────────── */
const PLATFORMS = [
  { id: 'INSTAGRAM' as Platform, name: 'Instagram', icon: Instagram, color: '#E1306C', bg: 'bg-pink-500', bgLight: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-400' },
  { id: 'YOUTUBE' as Platform, name: 'YouTube', icon: Youtube, color: '#FF0000', bg: 'bg-red-500', bgLight: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400' },
  { id: 'FACEBOOK' as Platform, name: 'Facebook', icon: Facebook, color: '#1877F2', bg: 'bg-blue-500', bgLight: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400' },
] as const;

const getPlatform = (id: string) => PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  SCHEDULED: { dot: 'bg-amber-400', label: 'Scheduled' },
  PUBLISHED: { dot: 'bg-emerald-400', label: 'Published' },
  FAILED: { dot: 'bg-red-400', label: 'Failed' },
  PUBLISHING: { dot: 'bg-amber-400', label: 'Publishing' },
  DRAFT: { dot: 'bg-neutral-500', label: 'Draft' },
};

/* ── Date helpers ────────────────────────────────────────────── */
function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday = 0
  const days: { date: Date; inMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startPad - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), inMonth: false });
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Next month padding (fill to 42 = 6 rows)
  while (days.length < 42) {
    const nextD = days.length - startPad - lastDay.getDate() + 1;
    days.push({ date: new Date(year, month + 1, nextD), inMonth: false });
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ═══════════════════════════════════════════════════════════════
   CHIP — colored post indicator on calendar
   ═══════════════════════════════════════════════════════════════ */
function PostChip({ post, onClick }: { post: Post; onClick: () => void }) {
  const platform = getPlatform(post.platform);
  const Icon = platform.icon;
  const statusStyle = STATUS_STYLES[post.status] || STATUS_STYLES.DRAFT;
  const time = post.scheduledFor || post.publishedAt;

  return (
    <button
      onClick={onClick}
      className={`group/chip flex items-center gap-1.5 w-full rounded-md border px-2 py-1 text-left transition-all hover:brightness-125 ${platform.bgLight} ${platform.border}`}
    >
      <Icon className={`h-3 w-3 flex-shrink-0 ${platform.text}`} />
      <span className={`text-[10px] font-medium truncate flex-1 ${platform.text}`}>
        {time ? formatTime(time) : 'No time'}
      </span>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${statusStyle.dot}`} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POST DETAIL MODAL
   ═══════════════════════════════════════════════════════════════ */
function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const platform = getPlatform(post.platform);
  const Icon = platform.icon;
  const statusStyle = STATUS_STYLES[post.status] || STATUS_STYLES.DRAFT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[#1a1a1a] bg-[#111] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${platform.bgLight} border ${platform.border}`}>
              <Icon className={`h-4 w-4 ${platform.text}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{platform.name} Post</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] border-[#2a2a2a] px-1.5 py-0">{post.postType}</Badge>
                <span className="flex items-center gap-1 text-[10px] text-neutral-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                  {statusStyle.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {post.video?.thumbnailUrl && (
            <div className="h-44 w-full overflow-hidden rounded-xl bg-[#0a0a0a]">
              <img src={post.video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          {post.video?.title && (
            <div>
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Video</p>
              <p className="text-sm font-medium text-white mt-0.5">{post.video.title}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Caption</p>
            <p className="text-sm text-neutral-300 whitespace-pre-wrap mt-1 leading-relaxed">{post.caption}</p>
          </div>

          {post.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.hashtags.map((tag, i) => (
                <span key={i} className={`rounded-full border px-2 py-0.5 text-[10px] ${platform.bgLight} ${platform.border} ${platform.text}`}>
                  #{tag.replace('#', '')}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {post.scheduledFor && (
              <div className="rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-3">
                <p className="text-[10px] text-neutral-600 uppercase tracking-wider flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Scheduled</p>
                <p className="text-xs text-white mt-1 font-medium">{formatFullDate(post.scheduledFor)}</p>
                <p className="text-xs text-neutral-500">{formatTime(post.scheduledFor)}</p>
              </div>
            )}
            {post.publishedAt && (
              <div className="rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-3">
                <p className="text-[10px] text-neutral-600 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Published</p>
                <p className="text-xs text-white mt-1 font-medium">{formatFullDate(post.publishedAt)}</p>
                <p className="text-xs text-neutral-500">{formatTime(post.publishedAt)}</p>
              </div>
            )}
          </div>

          {post.status === 'FAILED' && post.errorMessage && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> {post.errorMessage}
            </div>
          )}

          {post.platformUrl && (
            <a href={post.platformUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400">
              <ExternalLink className="h-3 w-3" /> View on {platform.name}
            </a>
          )}
        </div>

        <div className="border-t border-[#1a1a1a] px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a]">Close</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => { const r = await postsApi.getAll(); return r.posts; },
    refetchInterval: 30000,
  });

  /* ── Navigation ────────────────────────────────────────────── */
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  /* ── Calendar grid ─────────────────────────────────────────── */
  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  /* ── Filter + group posts by day ───────────────────────────── */
  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return posts.filter((p) => {
      if (!['SCHEDULED', 'PUBLISHED', 'FAILED', 'PUBLISHING'].includes(p.status)) return false;
      if (!(p.scheduledFor || p.publishedAt)) return false;
      if (platformFilter !== 'ALL' && p.platform !== platformFilter) return false;
      return true;
    });
  }, [posts, platformFilter]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    filteredPosts.forEach((p) => {
      const d = new Date(p.scheduledFor || p.publishedAt!);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    // Sort by time within each day
    map.forEach((arr) => arr.sort((a, b) => {
      const ta = new Date(a.scheduledFor || a.publishedAt!).getTime();
      const tb = new Date(b.scheduledFor || b.publishedAt!).getTime();
      return ta - tb;
    }));
    return map;
  }, [filteredPosts]);

  /* ── Stats ─────────────────────────────────────────────────── */
  const monthPosts = useMemo(() => {
    return filteredPosts.filter((p) => {
      const d = new Date(p.scheduledFor || p.publishedAt!);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [filteredPosts, year, month]);

  const stats = useMemo(() => ({
    total: monthPosts.length,
    scheduled: monthPosts.filter((p) => p.status === 'SCHEDULED').length,
    published: monthPosts.filter((p) => p.status === 'PUBLISHED').length,
    failed: monthPosts.filter((p) => p.status === 'FAILED').length,
  }), [monthPosts]);

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Calendar</h1>
          <p className="text-sm text-neutral-500">
            {stats.total} posts in {MONTH_NAMES[month]} &middot; {stats.scheduled} scheduled &middot; {stats.published} published
          </p>
        </div>
        <Link href="/dashboard/schedule">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Schedule Post
          </Button>
        </Link>
      </div>

      {/* ── Controls: Month nav + Platform filter ───────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9 border-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#1a1a1a]">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center">
            <h2 className="text-lg font-semibold text-white">{MONTH_NAMES[month]} {year}</h2>
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9 border-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#1a1a1a]">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="ml-1 border-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#1a1a1a] text-xs">
            Today
          </Button>
        </div>

        {/* Platform filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlatformFilter('ALL')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              platformFilter === 'ALL'
                ? 'border-red-600/50 bg-red-600/10 text-red-400'
                : 'border-[#1a1a1a] bg-[#111] text-neutral-500 hover:text-white hover:border-[#2a2a2a]'
            }`}
          >
            All
          </button>
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const active = platformFilter === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPlatformFilter(active ? 'ALL' : p.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? `${p.bgLight} ${p.border} ${p.text}`
                    : 'border-[#1a1a1a] bg-[#111] text-neutral-500 hover:text-white hover:border-[#2a2a2a]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Calendar Grid ───────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#1a1a1a]">
            {DAY_NAMES.map((d) => (
              <div key={d} className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells — 6 rows */}
          <div className="grid grid-cols-7">
            {days.map(({ date, inMonth }, idx) => {
              const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const dayPosts = postsByDay.get(key) || [];
              const today = isToday(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] border-b border-r border-[#1a1a1a] p-1.5 transition-colors ${
                    !inMonth ? 'bg-[#060606]' : isWeekend ? 'bg-[#0a0a0a]' : 'bg-[#0d0d0d]'
                  } ${today ? 'ring-1 ring-inset ring-red-600/40' : ''}`}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className={`text-xs font-medium ${
                      !inMonth ? 'text-neutral-800'
                        : today ? 'flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-[11px]'
                        : 'text-neutral-400'
                    }`}>
                      {date.getDate()}
                    </span>
                    {dayPosts.length > 0 && inMonth && (
                      <span className="text-[9px] text-neutral-700 font-medium">{dayPosts.length}</span>
                    )}
                  </div>

                  {/* Post chips */}
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => (
                      <PostChip key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                    ))}
                    {dayPosts.length > 3 && (
                      <button
                        onClick={() => setSelectedPost(dayPosts[3])}
                        className="w-full text-center text-[9px] text-neutral-600 hover:text-neutral-400 py-0.5"
                      >
                        +{dayPosts.length - 3} more
                      </button>
                    )}
                  </div>

                  {/* Empty day click to schedule */}
                  {dayPosts.length === 0 && inMonth && (
                    <Link
                      href={`/dashboard/schedule?date=${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}
                      className="flex h-[70px] items-center justify-center text-neutral-800 hover:text-neutral-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-[#1a1a1a] bg-[#111] px-5 py-3">
        <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-wider">Platforms</span>
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.id} className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${p.text}`} />
              <span className="text-xs text-neutral-400">{p.name}</span>
            </div>
          );
        })}
        <span className="text-neutral-700">|</span>
        <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-wider">Status</span>
        {[
          { label: 'Scheduled', dot: 'bg-amber-400' },
          { label: 'Published', dot: 'bg-emerald-400' },
          { label: 'Failed', dot: 'bg-red-400' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            <span className="text-xs text-neutral-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Post Detail Modal ───────────────────────────────── */}
      {selectedPost && <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
  );
}

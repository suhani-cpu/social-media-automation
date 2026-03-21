'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  TrendingDown,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  Users,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { analyticsApi } from '@/lib/api/analytics';
import { Platform } from '@/lib/types/api';

/* ── Platform config ────────────────────────────────────────────── */
const PLATFORMS = [
  { id: 'INSTAGRAM' as Platform, name: 'Instagram', icon: Instagram, color: '#E1306C', bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  { id: 'YOUTUBE' as Platform, name: 'YouTube', icon: Youtube, color: '#FF0000', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  { id: 'FACEBOOK' as Platform, name: 'Facebook', icon: Facebook, color: '#1877F2', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  { id: 'TWITTER' as Platform, name: 'Twitter / X', icon: Twitter, color: '#1DA1F2', bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400' },
  { id: 'LINKEDIN' as Platform, name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', bg: 'bg-blue-700/10', border: 'border-blue-700/30', text: 'text-blue-300' },
] as const;

const getPlatformConfig = (id: string) =>
  PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];

/* ── Date presets ───────────────────────────────────────────────── */
const DATE_PRESETS = [
  { label: '7D', days: 7 },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

function getDateStr(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
}

/* ── SVG Bar Chart ──────────────────────────────────────────────── */
function BarChart({
  data,
  height = 220,
}: {
  data: { label: string; value: number; color: string }[];
  height?: number;
}) {
  if (!data.length) return <EmptyState text="No platform data" />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.min(48, Math.floor(300 / data.length));
  const gap = 16;
  const totalW = data.length * (barW + gap);

  return (
    <div className="overflow-x-auto">
      <svg width={totalW + 40} height={height + 40} className="mx-auto">
        {data.map((d, i) => {
          const barH = (d.value / max) * height;
          const x = 20 + i * (barW + gap);
          const y = height - barH + 10;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} opacity={0.85} className="transition-all duration-500 hover:opacity-100" />
              <text x={x + barW / 2} y={y - 8} textAnchor="middle" className="fill-neutral-400 text-[10px]">
                {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
              </text>
              <text x={x + barW / 2} y={height + 28} textAnchor="middle" className="fill-neutral-500 text-[10px]">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── SVG Line Chart ─────────────────────────────────────────────── */
function LineChart({
  data,
  height = 200,
  color = '#ef4444',
  label = 'Views',
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  label?: string;
}) {
  if (!data.length) return <EmptyState text="No timeline data" />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const range = max - min || 1;
  const w = Math.max(data.length * 50, 400);
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = w - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: pad.top + chartH - ((d.value - min) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${pad.top + chartH} L${points[0].x},${pad.top + chartH} Z`;

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: pad.top + chartH * (1 - pct),
    val: Math.round(min + range * pct),
  }));

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={height} className="w-full">
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.left} y1={g.y} x2={w - pad.right} y2={g.y} stroke="#1a1a1a" strokeWidth={1} />
            <text x={pad.left - 8} y={g.y + 4} textAnchor="end" className="fill-neutral-600 text-[10px]">
              {g.val >= 1000 ? `${(g.val / 1000).toFixed(0)}k` : g.val}
            </text>
          </g>
        ))}

        {/* Area + Line */}
        <path d={areaPath} fill={`url(#gradient-${label})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i} className="group">
            <circle cx={p.x} cy={p.y} r={3} fill={color} stroke="#111" strokeWidth={2} className="transition-all group-hover:r-[5]" />
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" className="cursor-pointer" />
            {/* Tooltip rect */}
            <rect x={p.x - 30} y={p.y - 34} width={60} height={22} rx={4} fill="#222" className="hidden group-hover:block" />
            <text x={p.x} y={p.y - 19} textAnchor="middle" className="fill-white text-[10px] font-medium hidden group-hover:block">
              {data[i].value.toLocaleString()}
            </text>
          </g>
        ))}

        {/* X labels */}
        {data.map((d, i) => {
          const show = data.length <= 14 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1;
          if (!show) return null;
          return (
            <text key={i} x={points[i].x} y={height - 5} textAnchor="middle" className="fill-neutral-600 text-[9px]">
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Multi-line chart for engagement ────────────────────────────── */
function MultiLineChart({
  lines,
  data,
  height = 200,
}: {
  lines: { key: string; color: string; label: string }[];
  data: Record<string, any>[];
  height?: number;
}) {
  if (!data.length) return <EmptyState text="No data" />;
  const allVals = data.flatMap((d) => lines.map((l) => d[l.key] ?? 0));
  const max = Math.max(...allVals, 1);
  const w = Math.max(data.length * 50, 400);
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = w - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={height} className="w-full">
        {/* Grid */}
        {[0, 0.5, 1].map((pct, i) => (
          <line key={i} x1={pad.left} y1={pad.top + chartH * (1 - pct)} x2={w - pad.right} y2={pad.top + chartH * (1 - pct)} stroke="#1a1a1a" strokeWidth={1} />
        ))}

        {lines.map((line) => {
          const pts = data.map((d, i) => ({
            x: pad.left + (i / Math.max(data.length - 1, 1)) * chartW,
            y: pad.top + chartH - ((d[line.key] ?? 0) / max) * chartH,
          }));
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return (
            <path key={line.key} d={path} fill="none" stroke={line.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5 text-xs text-neutral-400">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────── */
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
      <BarChart3 className="h-10 w-10 mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────────── */
function StatCard({
  title,
  value,
  icon: Icon,
  change,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: typeof Eye;
  change?: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5 hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{title}</p>
        <div className="rounded-lg bg-[#1a1a1a] p-2">
          <Icon className="h-4 w-4 text-red-500" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {change !== undefined && (
          <span className={`flex items-center text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {subtitle && <span className="text-[11px] text-neutral-600">{subtitle}</span>}
      </div>
    </div>
  );
}

/* ── Platform tab card ──────────────────────────────────────────── */
function PlatformCard({
  platform,
  data,
  isActive,
  onClick,
}: {
  platform: (typeof PLATFORMS)[number];
  data?: { views: number; likes: number; comments: number; shares: number; posts: number };
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = platform.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left w-full ${
        isActive
          ? `${platform.bg} ${platform.border} border`
          : 'border-[#1a1a1a] bg-[#111] hover:border-[#2a2a2a]'
      }`}
    >
      <div className={`rounded-lg p-2 ${isActive ? platform.bg : 'bg-[#1a1a1a]'}`}>
        <Icon className={`h-5 w-5 ${isActive ? platform.text : 'text-neutral-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-neutral-400'}`}>
          {platform.name}
        </p>
        {data ? (
          <p className="text-xs text-neutral-600 truncate">
            {data.views.toLocaleString()} views &middot; {data.posts} posts
          </p>
        ) : (
          <p className="text-xs text-neutral-600">No data</p>
        )}
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const [preset, setPreset] = useState(30);
  const [dateRange, setDateRange] = useState({
    startDate: getDateStr(30),
    endDate: getDateStr(0),
  });
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'ALL'>('ALL');
  const [topPostsMetric, setTopPostsMetric] = useState<'views' | 'likes' | 'engagementRate'>('engagementRate');

  const applyPreset = (days: number) => {
    setPreset(days);
    setDateRange({ startDate: getDateStr(days), endDate: getDateStr(0) });
  };

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () =>
      analyticsApi.getSummary({
        startDate: new Date(dateRange.startDate).toISOString(),
        endDate: new Date(dateRange.endDate).toISOString(),
      }),
  });

  const { data: topPosts, isLoading: loadingTop } = useQuery({
    queryKey: ['analytics-top', topPostsMetric],
    queryFn: () => analyticsApi.getTopPosts({ limit: 5, metric: topPostsMetric }),
  });

  const { data: insights } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: () => analyticsApi.getInsights?.() ?? Promise.resolve(null),
  });

  const { data: bestTimes } = useQuery({
    queryKey: ['analytics-best-times'],
    queryFn: () => analyticsApi.getBestTimes?.() ?? Promise.resolve(null),
  });

  /* ── Derived data ─────────────────────────────────────────── */
  const summary = analytics?.summary;
  const byPlatform = (analytics?.byPlatform ?? {}) as Record<string, { views: number; likes: number; comments: number; shares: number; posts: number }>;
  const timeline = analytics?.timeline ?? [];

  const filteredPlatformData = useMemo(() => {
    if (selectedPlatform === 'ALL') return byPlatform;
    return { [selectedPlatform]: byPlatform[selectedPlatform] } as typeof byPlatform;
  }, [byPlatform, selectedPlatform]);

  const barChartData = useMemo(() => {
    return PLATFORMS.map((p) => ({
      label: p.name.replace(' / X', ''),
      value: byPlatform[p.id]?.views ?? 0,
      color: p.color,
    })).filter((d) => d.value > 0 || selectedPlatform === 'ALL');
  }, [byPlatform, selectedPlatform]);

  const engagementBarData = useMemo(() => {
    return PLATFORMS.map((p) => ({
      label: p.name.replace(' / X', ''),
      value: byPlatform[p.id]?.likes ?? 0,
      color: p.color,
    })).filter((d) => d.value > 0 || selectedPlatform === 'ALL');
  }, [byPlatform, selectedPlatform]);

  const timelineData = useMemo(() => {
    const filtered = selectedPlatform === 'ALL'
      ? timeline
      : timeline.filter((t) => t.platform === selectedPlatform);

    const grouped = filtered.reduce((acc, entry) => {
      const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[date]) acc[date] = { label: date, value: 0, likes: 0, comments: 0 };
      acc[date].value += entry.views;
      acc[date].likes += entry.likes;
      acc[date].comments += entry.comments;
      return acc;
    }, {} as Record<string, { label: string; value: number; likes: number; comments: number }>);

    return Object.values(grouped).slice(-30);
  }, [timeline, selectedPlatform]);

  const multiLineData = useMemo(() => {
    return timelineData.map((d) => ({
      label: d.label,
      views: d.value,
      likes: d.likes,
      comments: d.comments,
    }));
  }, [timelineData]);

  const activePlatformData = useMemo(() => {
    if (selectedPlatform === 'ALL') return null;
    return byPlatform[selectedPlatform] ?? null;
  }, [selectedPlatform, byPlatform]);

  /* ── Loading skeleton ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-neutral-500">Track your content performance</p>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-neutral-500">Track your content performance across platforms</p>
        </div>

        {/* Date presets + picker */}
        <div className="flex items-center gap-2">
          {DATE_PRESETS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={preset === p.days ? 'default' : 'outline'}
              onClick={() => applyPreset(p.days)}
              className={preset === p.days ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-[#2a2a2a] text-neutral-400 hover:text-white'}
            >
              {p.label}
            </Button>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => { setPreset(0); setDateRange((prev) => ({ ...prev, startDate: e.target.value })); }}
              className="h-9 w-[130px] bg-[#0a0a0a] border-[#1a1a1a] text-white text-xs [color-scheme:dark]"
            />
            <span className="text-neutral-600 text-xs">to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => { setPreset(0); setDateRange((prev) => ({ ...prev, endDate: e.target.value })); }}
              max={getDateStr(0)}
              className="h-9 w-[130px] bg-[#0a0a0a] border-[#1a1a1a] text-white text-xs [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* ── Overview Stat Cards ─────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Impressions" value={summary?.views ?? 0} icon={Eye} subtitle={`${summary?.posts ?? 0} posts`} />
        <StatCard title="Engagement" value={`${(summary?.avgEngagementRate ?? 0).toFixed(2)}%`} icon={Activity} />
        <StatCard title="Likes" value={summary?.likes ?? 0} icon={Heart} />
        <StatCard title="Comments" value={summary?.comments ?? 0} icon={MessageCircle} />
        <StatCard title="Shares" value={summary?.shares ?? 0} icon={Share2} />
      </div>

      {/* ── Platform Tabs ──────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <button
          onClick={() => setSelectedPlatform('ALL')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 transition-all ${
            selectedPlatform === 'ALL'
              ? 'border-red-600/50 bg-red-600/10 text-white'
              : 'border-[#1a1a1a] bg-[#111] text-neutral-400 hover:border-[#2a2a2a]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm font-medium">All</span>
        </button>
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.id}
            platform={p}
            data={byPlatform[p.id]}
            isActive={selectedPlatform === p.id}
            onClick={() => setSelectedPlatform(selectedPlatform === p.id ? 'ALL' : p.id)}
          />
        ))}
      </div>

      {/* ── Platform Detail (when a specific platform is selected) ── */}
      {selectedPlatform !== 'ALL' && activePlatformData && (
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6">
          <div className="flex items-center gap-3 mb-5">
            {(() => { const cfg = getPlatformConfig(selectedPlatform); const Icon = cfg.icon; return <Icon className={`h-5 w-5 ${cfg.text}`} />; })()}
            <h2 className="text-lg font-semibold text-white">{getPlatformConfig(selectedPlatform).name} Breakdown</h2>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
            <div className="rounded-lg bg-[#0a0a0a] p-4">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Views</p>
              <p className="text-xl font-bold text-white mt-1">{activePlatformData.views.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-[#0a0a0a] p-4">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Likes</p>
              <p className="text-xl font-bold text-white mt-1">{activePlatformData.likes.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-[#0a0a0a] p-4">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Comments</p>
              <p className="text-xl font-bold text-white mt-1">{activePlatformData.comments.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-[#0a0a0a] p-4">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Shares</p>
              <p className="text-xl font-bold text-white mt-1">{activePlatformData.shares.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-[#0a0a0a] p-4">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Posts</p>
              <p className="text-xl font-bold text-white mt-1">{activePlatformData.posts.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts Row ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Impressions by Platform */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Impressions by Platform</h3>
          <p className="text-xs text-neutral-600 mb-4">Total views per platform</p>
          <BarChart data={barChartData} />
        </div>

        {/* Engagement by Platform */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Engagement by Platform</h3>
          <p className="text-xs text-neutral-600 mb-4">Total likes per platform</p>
          <BarChart data={engagementBarData} />
        </div>
      </div>

      {/* ── Timeline Charts ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Views Over Time</h3>
          <p className="text-xs text-neutral-600 mb-4">
            {selectedPlatform === 'ALL' ? 'All platforms' : getPlatformConfig(selectedPlatform).name}
          </p>
          <LineChart
            data={timelineData}
            color={selectedPlatform === 'ALL' ? '#ef4444' : getPlatformConfig(selectedPlatform).color}
            label="views"
          />
        </div>

        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Engagement Trends</h3>
          <p className="text-xs text-neutral-600 mb-4">Views, Likes & Comments over time</p>
          <MultiLineChart
            data={multiLineData}
            lines={[
              { key: 'views', color: '#ef4444', label: 'Views' },
              { key: 'likes', color: '#ec4899', label: 'Likes' },
              { key: 'comments', color: '#8b5cf6', label: 'Comments' },
            ]}
          />
        </div>
      </div>

      {/* ── Best Times to Post ─────────────────────────────────── */}
      {bestTimes && (
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Best Times to Post</h3>
          <p className="text-xs text-neutral-600 mb-4">Based on your audience engagement patterns</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {bestTimes.bestHours?.slice(0, 3).map((hour: number, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-4">
                <div className="rounded-full bg-red-600/10 p-2">
                  <Calendar className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{hour}:00</p>
                  <p className="text-xs text-neutral-500">Peak engagement hour</p>
                </div>
              </div>
            )) ?? (
              <p className="text-sm text-neutral-500 col-span-3">Not enough data yet. Publish more posts to see insights.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Top Performing Posts ────────────────────────────────── */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Top Performing Posts</h3>
            <p className="text-xs text-neutral-600 mt-0.5">Your best content ranked by performance</p>
          </div>
          <Select value={topPostsMetric} onValueChange={(v) => setTopPostsMetric(v as any)}>
            <SelectTrigger className="w-44 bg-[#0a0a0a] border-[#1a1a1a]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="views">Most Views</SelectItem>
              <SelectItem value="likes">Most Likes</SelectItem>
              <SelectItem value="engagementRate">Best Engagement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingTop ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        ) : topPosts && topPosts.posts.length > 0 ? (
          <div className="space-y-3">
            {topPosts.posts.map((post, index) => {
              const config = getPlatformConfig(post.platform);
              const Icon = config.icon;
              return (
                <div
                  key={post.id}
                  className="flex items-center gap-4 rounded-xl border border-[#1a1a1a] p-4 transition-colors hover:bg-[#1a1a1a]/40"
                >
                  {/* Rank */}
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${
                    index === 0 ? 'bg-yellow-600' : index === 1 ? 'bg-neutral-500' : index === 2 ? 'bg-amber-800' : 'bg-[#1a1a1a]'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  {post.video?.thumbnailUrl ? (
                    <div className="h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                      <img src={post.video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-14 w-24 flex-shrink-0 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                      <Eye className="h-5 w-5 text-neutral-700" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${config.text}`} />
                      <span className="text-sm font-medium text-white truncate">{post.video?.title || 'Untitled'}</span>
                      <Badge variant="outline" className="text-[10px] border-[#2a2a2a]">{post.postType}</Badge>
                    </div>
                    <p className="text-xs text-neutral-600 truncate mt-1">{post.caption}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-5 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {(post.analytics?.views ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" /> {(post.analytics?.likes ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {(post.analytics?.comments ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <TrendingUp className="h-3 w-3" /> {(post.analytics?.engagementRate ?? 0).toFixed(2)}%
                    </span>
                  </div>

                  {/* Link */}
                  {post.platformUrl && (
                    <a href={post.platformUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                      <Button size="sm" variant="outline" className="border-[#2a2a2a] text-xs hover:bg-[#1a1a1a]">
                        View
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="No published posts yet. Publish content to track performance." />
        )}
      </div>
    </div>
  );
}

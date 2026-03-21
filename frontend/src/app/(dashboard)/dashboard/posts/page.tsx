'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus,
  Search,
  Send,
  RotateCcw,
  Trash2,
  MoreVertical,
  Calendar,
  Clock,
  Eye,
  Instagram,
  Youtube,
  Facebook,
  Lightbulb,
  FileEdit,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  List,
  Hash,
  Sparkles,
  X,
  Loader2,
  ChevronDown,
  GripVertical,
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
import { useToast } from '@/hooks/useToast';
import { PublishProgress } from '@/components/post/PublishProgress';
import { postsApi } from '@/lib/api/posts';
import { videosApi } from '@/lib/api/videos';
import { accountsApi } from '@/lib/api/accounts';
import { Post, PostStatus, Platform } from '@/lib/types/api';
import apiClient from '@/lib/api/client';

/* ── Platform config ─────────────────────────────────────────── */
const PLATFORMS = [
  { id: 'INSTAGRAM' as Platform, name: 'Instagram', icon: Instagram, color: '#E1306C', bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  { id: 'YOUTUBE' as Platform, name: 'YouTube', icon: Youtube, color: '#FF0000', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  { id: 'FACEBOOK' as Platform, name: 'Facebook', icon: Facebook, color: '#1877F2', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
] as const;

const getPlatform = (id: string) => PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];

/* ── Status config ───────────────────────────────────────────── */
const STATUS_COLUMNS = [
  { id: 'DRAFT' as PostStatus, label: 'Drafts', icon: FileEdit, color: 'text-neutral-400', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', dot: 'bg-neutral-500' },
  { id: 'SCHEDULED' as PostStatus, label: 'Scheduled', icon: CalendarClock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  { id: 'PUBLISHED' as PostStatus, label: 'Published', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  { id: 'FAILED' as PostStatus, label: 'Failed', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' },
] as const;

/* ── Format helpers ──────────────────────────────────────────── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════════════════════════
   CONTENT CARD
   ═══════════════════════════════════════════════════════════════ */
function ContentCard({
  post,
  onPublish,
  onRetry,
  onDelete,
  compact,
}: {
  post: Post;
  onPublish: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const platform = getPlatform(post.platform);
  const Icon = platform.icon;

  return (
    <div className={`group rounded-xl border border-[#1a1a1a] bg-[#111] transition-all hover:border-[#2a2a2a] hover:shadow-lg hover:shadow-black/20 ${compact ? 'p-3' : 'p-4'}`}>
      {/* Top row: platform + status + menu */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1 ${platform.bg}`}>
            <Icon className={`h-3.5 w-3.5 ${platform.text}`} />
          </div>
          <span className="text-xs font-medium text-neutral-500">{platform.name}</span>
          <Badge variant="outline" className="text-[10px] border-[#2a2a2a] px-1.5 py-0">{post.postType}</Badge>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-600 hover:text-white p-1 rounded">
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-[#1a1a1a] bg-[#111] shadow-xl py-1">
                {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && (
                  <button onClick={() => { onPublish(post.id); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#1a1a1a]">
                    <Send className="h-3 w-3" /> Publish Now
                  </button>
                )}
                {post.status === 'FAILED' && (
                  <button onClick={() => { onRetry(post.id); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#1a1a1a]">
                    <RotateCcw className="h-3 w-3" /> Retry
                  </button>
                )}
                <button onClick={() => { onDelete(post.id); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-[#1a1a1a]">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      {post.video?.thumbnailUrl && !compact && (
        <div className="mb-3 h-32 w-full overflow-hidden rounded-lg bg-[#0a0a0a]">
          <img src={post.video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Video title */}
      {post.video?.title && (
        <p className="text-sm font-medium text-white truncate mb-1">{post.video.title}</p>
      )}

      {/* Caption */}
      <p className={`text-xs text-neutral-400 ${compact ? 'line-clamp-2' : 'line-clamp-3'} mb-2`}>{post.caption}</p>

      {/* Hashtags */}
      {post.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {post.hashtags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] text-red-500/70">#{tag.replace('#', '')}</span>
          ))}
          {post.hashtags.length > 3 && <span className="text-[10px] text-neutral-600">+{post.hashtags.length - 3}</span>}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-neutral-600 pt-2 border-t border-[#1a1a1a]">
        {post.scheduledFor ? (
          <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{formatDate(post.scheduledFor)}</span>
        ) : post.publishedAt ? (
          <span className="flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />{timeAgo(post.publishedAt)}</span>
        ) : (
          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{timeAgo(post.createdAt)}</span>
        )}
        {post.platformUrl && (
          <a href={post.platformUrl} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 flex items-center gap-0.5">
            <Eye className="h-2.5 w-2.5" /> View
          </a>
        )}
      </div>

      {/* Error */}
      {post.status === 'FAILED' && post.errorMessage && (
        <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/20 p-2 text-[10px] text-red-400 line-clamp-2">
          {post.errorMessage}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADD IDEA FORM
   ═══════════════════════════════════════════════════════════════ */
function AddIdeaForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState<Platform>('INSTAGRAM');
  const [postType, setPostType] = useState('REEL');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [language, setLanguage] = useState('ENGLISH');
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');

  const { data: videosData } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => { const r = await videosApi.getAll(); return r.videos; },
  });
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => { const r = await accountsApi.getAll(); return r.accounts; },
  });

  const readyVideos = (videosData || []).filter((v) => v.status === 'READY');
  const account = (accountsData || []).find((a) => a.platform === platform && a.status === 'ACTIVE');

  const postTypes: Record<string, string[]> = {
    INSTAGRAM: ['REEL', 'FEED', 'STORY'],
    YOUTUBE: ['SHORT', 'VIDEO'],
    FACEBOOK: ['FEED', 'REEL'],
  };

  const generateCaption = async () => {
    if (!selectedVideoId) return;
    const video = readyVideos.find((v) => v.id === selectedVideoId);
    if (!video) return;
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/captions/generate', {
        videoId: video.id,
        platform,
        language,
      });
      const data = res.data;
      if (data.variations?.[0]) {
        setCaption(data.variations[0].caption);
        if (data.variations[0].hashtags?.length) setHashtags(data.variations[0].hashtags.join(' '));
      } else if (data.caption) {
        setCaption(data.caption);
      }
    } catch { /* ignore */ }
    setIsGenerating(false);
  };

  const handleSubmit = async () => {
    if (!caption.trim()) { setError('Caption is required'); return; }
    setSubmitting(true);
    setError('');

    try {
      const scheduledFor = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : undefined;

      const hashtagList = hashtags.split(/[\s,]+/).map((h) => h.replace(/^#/, '').trim()).filter(Boolean);

      await postsApi.create({
        videoId: selectedVideoId || undefined,
        accountId: account?.id,
        caption: caption.trim(),
        language: language as any,
        hashtags: hashtagList,
        platform,
        postType: postType as any,
        scheduledFor,
      } as any);

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create post');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#1a1a1a] bg-[#111] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">New Post Idea</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Video select */}
          <div>
            <Label className="text-neutral-400 text-xs">Video (optional)</Label>
            <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
              <SelectTrigger className="mt-1.5 bg-[#0a0a0a] border-[#1a1a1a] text-white">
                <SelectValue placeholder="Select a video..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No video</SelectItem>
                {readyVideos.map((v) => <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Platform + Post Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-neutral-400 text-xs">Platform</Label>
              <Select value={platform} onValueChange={(v) => { setPlatform(v as Platform); setPostType(postTypes[v]?.[0] || 'FEED'); }}>
                <SelectTrigger className="mt-1.5 bg-[#0a0a0a] border-[#1a1a1a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-neutral-400 text-xs">Post Type</Label>
              <Select value={postType} onValueChange={setPostType}>
                <SelectTrigger className="mt-1.5 bg-[#0a0a0a] border-[#1a1a1a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(postTypes[platform] || ['FEED']).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-neutral-400 text-xs">Caption</Label>
              <Button size="sm" variant="outline" onClick={generateCaption} disabled={!selectedVideoId || isGenerating} className="h-7 text-[10px] border-[#2a2a2a]">
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                AI Generate
              </Button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption or post idea..."
              rows={4}
              className="w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
            />
            <p className="text-[10px] text-neutral-600 mt-1">{caption.length} characters</p>
          </div>

          {/* Hashtags */}
          <div>
            <Label className="text-neutral-400 text-xs flex items-center gap-1"><Hash className="h-3 w-3" /> Hashtags</Label>
            <Input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="trending viral comedy"
              className="mt-1.5 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600"
            />
          </div>

          {/* Schedule */}
          <div>
            <Label className="text-neutral-400 text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Schedule (leave empty for draft)</Label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="bg-[#0a0a0a] border-[#1a1a1a] text-white [color-scheme:dark]" />
              <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="bg-[#0a0a0a] border-[#1a1a1a] text-white [color-scheme:dark]" />
            </div>
          </div>

          {/* Account warning */}
          {!account && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-400">
              No {getPlatform(platform).name} account connected. <Link href="/dashboard/accounts" className="underline">Connect now</Link>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#1a1a1a] px-6 py-4">
          <Button variant="outline" onClick={onClose} className="border-[#2a2a2a] text-neutral-400">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : <><Plus className="h-4 w-4 mr-2" /> {scheduledDate ? 'Schedule Post' : 'Save as Draft'}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function PostsPage() {
  const queryClient = useQueryClient();
  const { success: showSuccess } = useToast();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'ALL'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => { const r = await postsApi.getAll(); return r.posts; },
    refetchInterval: 10000,
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => postsApi.publish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
  const retryMutation = useMutation({
    mutationFn: (id: string) => postsApi.retry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => postsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const handlePublish = async (id: string) => {
    const post = posts?.find((p) => p.id === id);
    await publishMutation.mutateAsync(id);
    setPublishingPostId(id);
    setPublishingPlatform(post?.platform || null);
  };
  const handleRetry = async (id: string) => {
    const post = posts?.find((p) => p.id === id);
    await retryMutation.mutateAsync(id);
    setPublishingPostId(id);
    setPublishingPlatform(post?.platform || null);
  };
  const handleDelete = async (id: string) => {
    if (confirm('Delete this post?')) await deleteMutation.mutateAsync(id);
  };

  /* ── Filter + group posts ──────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!posts) return [];
    return posts.filter((p) => {
      if (platformFilter !== 'ALL' && p.platform !== platformFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.caption?.toLowerCase().includes(q) || p.video?.title?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [posts, platformFilter, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, Post[]> = { DRAFT: [], SCHEDULED: [], PUBLISHED: [], FAILED: [] };
    filtered.forEach((p) => {
      if (groups[p.status]) groups[p.status].push(p);
    });
    // Sort scheduled by date, others by newest
    groups.SCHEDULED.sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());
    groups.DRAFT.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    groups.PUBLISHED.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    groups.FAILED.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return groups;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: posts?.length ?? 0,
    draft: grouped.DRAFT.length,
    scheduled: grouped.SCHEDULED.length,
    published: grouped.PUBLISHED.length,
    failed: grouped.FAILED.length,
  }), [posts, grouped]);

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Manager</h1>
          <p className="text-sm text-neutral-500">Manage posts across Instagram, YouTube & Facebook</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddForm(true)} className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> New Idea
          </Button>
          <Link href="/dashboard/posts/create">
            <Button variant="outline" className="border-[#2a2a2a] text-neutral-300">
              <FileEdit className="mr-2 h-4 w-4" /> Full Editor
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', count: stats.total, color: 'text-white', dot: 'bg-white' },
          ...STATUS_COLUMNS.map((s) => ({ label: s.label, count: stats[s.id.toLowerCase() as keyof typeof stats] || 0, color: s.color, dot: s.dot })),
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-[#1a1a1a] bg-[#111] px-4 py-3">
            <div className={`h-2 w-2 rounded-full ${s.dot}`} />
            <div>
              <p className="text-lg font-bold text-white">{s.count}</p>
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder:text-neutral-600 h-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as any)}>
            <SelectTrigger className="w-40 h-9 bg-[#0a0a0a] border-[#1a1a1a]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Platforms</SelectItem>
              {PLATFORMS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#1a1a1a] p-0.5 bg-[#0a0a0a]">
          <button onClick={() => setView('board')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'board' ? 'bg-[#1a1a1a] text-white' : 'text-neutral-500 hover:text-white'}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView('list')} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-[#1a1a1a] text-white' : 'text-neutral-500 hover:text-white'}`}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Board View ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colPosts = grouped[col.id] || [];
            const ColIcon = col.icon;
            return (
              <div key={col.id} className="space-y-3">
                {/* Column header */}
                <div className={`flex items-center justify-between rounded-xl ${col.bg} border ${col.border} px-4 py-2.5`}>
                  <div className="flex items-center gap-2">
                    <ColIcon className={`h-4 w-4 ${col.color}`} />
                    <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  </div>
                  <span className={`text-xs font-medium ${col.color}`}>{colPosts.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-3 min-h-[200px]">
                  {colPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1a1a1a] py-10 text-neutral-600">
                      <ColIcon className="h-6 w-6 mb-2" />
                      <p className="text-xs">No {col.label.toLowerCase()}</p>
                    </div>
                  ) : (
                    colPosts.map((post) => (
                      <ContentCard
                        key={post.id}
                        post={post}
                        onPublish={handlePublish}
                        onRetry={handleRetry}
                        onDelete={handleDelete}
                        compact
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View ───────────────────────────────────────── */
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-12 text-center">
              <Plus className="mx-auto h-10 w-10 text-neutral-600" />
              <h3 className="mt-4 text-base font-semibold text-white">No posts yet</h3>
              <p className="mt-1 text-sm text-neutral-500">Click "New Idea" to create your first post</p>
            </div>
          ) : (
            filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((post) => (
              <ContentCard key={post.id} post={post} onPublish={handlePublish} onRetry={handleRetry} onDelete={handleDelete} />
            ))
          )}
        </div>
      )}

      {/* ── Add Idea Modal ──────────────────────────────────── */}
      {showAddForm && (
        <AddIdeaForm
          onClose={() => setShowAddForm(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            showSuccess('Created!', 'Post idea saved');
          }}
        />
      )}

      {/* ── Publish Progress ────────────────────────────────── */}
      {publishingPostId && (
        <PublishProgress
          postId={publishingPostId}
          platform={publishingPlatform || undefined}
          onClose={() => { setPublishingPostId(null); setPublishingPlatform(null); queryClient.invalidateQueries({ queryKey: ['posts'] }); }}
          onComplete={() => { queryClient.invalidateQueries({ queryKey: ['posts'] }); showSuccess('Published!', 'Post published successfully'); }}
        />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Check, Loader2, Film, Tv } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import apiClient from '@/lib/api/client';

interface StageContent {
  contentType: string;
  title: string;
  description: string;
  slug: string;
  dialect: string;
  duration: number;
  format: string;
  status: string;
  thumbnailURL: string;
  oldContentId: number;
  createdAt: string;
}

interface StageResponse {
  items: StageContent[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

const dialectLabels: Record<string, string> = {
  har: 'Haryanvi',
  raj: 'Rajasthani',
  bho: 'Bhojpuri',
  guj: 'Gujarati',
  hin: 'Hindi',
  eng: 'English',
};

const formatDuration = (seconds: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
};

export default function StageOttPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialect, setDialect] = useState<string>('all');
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set());
  const perPage = 12;

  const { data, isLoading, error } = useQuery({
    queryKey: ['stage-ott-content', page, dialect],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (dialect !== 'all') params.set('dialect', dialect);
      const response = await apiClient.get<StageResponse>(
        `/stage-ott/content?${params}`,
      );
      return response.data;
    },
  });

  const importMutation = useMutation({
    mutationFn: async (item: StageContent) => {
      const response = await apiClient.post('/stage-ott/import', {
        oldContentId: item.oldContentId,
        title: item.title,
        description: item.description,
        thumbnailURL: item.thumbnailURL,
        dialect: item.dialect,
        duration: item.duration,
        slug: item.slug,
        contentType: item.contentType,
        format: item.format,
      });
      return response.data;
    },
    onSuccess: (_, item) => {
      setImportedIds((prev) => new Set(prev).add(item.oldContentId));
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.oldContentId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
    onError: (_, item) => {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.oldContentId);
        return next;
      });
    },
  });

  const handleImport = (item: StageContent) => {
    setImportingIds((prev) => new Set(prev).add(item.oldContentId));
    importMutation.mutate(item);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/videos">
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Stage OTT Library</h1>
            <p className="text-neutral-500 text-sm">
              Browse and import content from Stage OTT CMS
            </p>
          </div>
        </div>

        {/* Dialect Filter */}
        <Select value={dialect} onValueChange={(v) => { setDialect(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] border-[#1a1a1a] bg-[#111]">
            <SelectValue placeholder="All Dialects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dialects</SelectItem>
            <SelectItem value="har">Haryanvi</SelectItem>
            <SelectItem value="raj">Rajasthani</SelectItem>
            <SelectItem value="bho">Bhojpuri</SelectItem>
            <SelectItem value="guj">Gujarati</SelectItem>
            <SelectItem value="hin">Hindi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          Failed to load Stage OTT content. Please check API configuration.
        </div>
      )}

      {/* Content Grid */}
      {data && (
        <>
          <div className="text-sm text-neutral-500">
            {data.total} items found
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.items.map((item) => {
              const isImported = importedIds.has(item.oldContentId);
              const isImporting = importingIds.has(item.oldContentId);

              return (
                <Card
                  key={item.oldContentId}
                  className="overflow-hidden border-[#1a1a1a] bg-[#111] hover:border-[#222] transition-all"
                >
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="relative aspect-square bg-[#0a0a0a]">
                      {item.thumbnailURL ? (
                        <img
                          src={item.thumbnailURL}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          {item.contentType === 'movie' ? (
                            <Film className="h-10 w-10 text-neutral-600" />
                          ) : (
                            <Tv className="h-10 w-10 text-neutral-600" />
                          )}
                        </div>
                      )}

                      {/* Type Badge */}
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-600/80 text-white">
                          {item.contentType}
                        </span>
                      </div>

                      {/* Dialect Badge */}
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-black/60 text-neutral-300">
                          {dialectLabels[item.dialect] || item.dialect}
                        </span>
                      </div>

                      {/* Duration */}
                      {item.duration > 0 && (
                        <div className="absolute bottom-2 right-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-black/70 text-white">
                            {formatDuration(item.duration)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-white truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                        {item.description || 'No description'}
                      </p>
                      <p className="text-xs text-neutral-600 mt-1">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {item.format !== 'standard' && (
                          <span className="ml-2 text-neutral-500">{item.format}</span>
                        )}
                      </p>

                      {/* Import Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className={`w-full mt-2 text-xs ${
                          isImported
                            ? 'border-green-600/30 text-green-500 hover:bg-green-600/10'
                            : 'border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] hover:text-white'
                        }`}
                        disabled={isImported || isImporting}
                        onClick={() => handleImport(item)}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Importing...
                          </>
                        ) : isImported ? (
                          <>
                            <Check className="mr-2 h-3 w-3" />
                            Imported
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-3 w-3" />
                            Import to Library
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="border-[#1a1a1a] text-neutral-300"
              >
                Previous
              </Button>
              <span className="text-sm text-neutral-500">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="border-[#1a1a1a] text-neutral-300"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

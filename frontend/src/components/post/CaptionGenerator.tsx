'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { postsApi, CaptionVariation } from '@/lib/api/posts';
import { Language, Platform } from '@/lib/types/api';
import { cn } from '@/lib/utils';

interface CaptionGeneratorProps {
  videoTitle: string;
  platform: Platform;
  selectedCaption: CaptionVariation | null;
  onSelect: (caption: CaptionVariation) => void;
  onLanguageChange: (language: Language) => void;
  language: Language;
}

const languageOptions = [
  { value: 'ENGLISH' as Language, label: 'English' },
  { value: 'HINGLISH' as Language, label: 'Hinglish' },
  { value: 'HARYANVI' as Language, label: 'Haryanvi' },
  { value: 'HINDI' as Language, label: 'Hindi' },
];

export function CaptionGenerator({
  videoTitle,
  platform,
  selectedCaption,
  onSelect,
  onLanguageChange,
  language,
}: CaptionGeneratorProps) {
  const [variations, setVariations] = useState<CaptionVariation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await postsApi.generateCaption({
        videoTitle,
        language,
        platform,
      });
      setVariations(response.variations);

      // Auto-select first variation
      if (response.variations.length > 0 && !selectedCaption) {
        onSelect(response.variations[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate captions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Generate Caption</h3>
        <p className="text-sm text-muted-foreground mb-4">
          AI-powered captions in multiple languages
        </p>
      </div>

      {/* Language Selector */}
      <div className="space-y-2">
        <Label htmlFor="language">Language</Label>
        <div className="flex gap-2">
          <Select value={language} onValueChange={(value) => onLanguageChange(value as Language)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={isGenerating} className="flex-shrink-0">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : variations.length > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Caption Variations */}
      {variations.length > 0 && (
        <div className="space-y-3">
          <Label>Select a caption variation</Label>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {variations.map((variation, index) => (
              <Card
                key={index}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary',
                  selectedCaption?.caption === variation.caption && 'border-primary bg-primary/5'
                )}
                onClick={() => onSelect(variation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                        selectedCaption?.caption === variation.caption
                          ? 'border-primary bg-primary'
                          : 'border-gray-300'
                      )}
                    >
                      {selectedCaption?.caption === variation.caption && (
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap">{variation.caption}</p>
                      {variation.hashtags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {variation.hashtags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="text-xs text-primary font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {variations.length === 0 && !isGenerating && !error && (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="font-semibold mb-2">No captions generated yet</h4>
          <p className="text-sm text-muted-foreground">
            Select a language and click Generate to create AI-powered captions
          </p>
        </div>
      )}
    </div>
  );
}

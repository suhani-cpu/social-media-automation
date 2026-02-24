'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Rocket, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/useToast';

interface AutoPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AutoPostResult {
  success: boolean;
  title: string;
  videoId?: string;
  postId?: string;
  publishStatus?: 'published' | 'failed' | 'not_attempted';
  error?: string;
}

export function AutoPostModal({ isOpen, onClose, onSuccess }: AutoPostModalProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [sheetUrl, setSheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/1eJFuzi-9EvqchOQ3H6cbgIUO6XEJQX4kxQZZwazg7qw/edit?usp=sharing'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AutoPostResult[]>([]);
  const [step, setStep] = useState<'input' | 'processing' | 'results'>('input');

  const handleAutoPost = async () => {
    if (!sheetUrl.trim()) {
      error('⚠️ Sheet URL Required', 'Please enter Google Sheets URL');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      const response = await apiClient.post('/sheets/import', { sheetUrl }, { timeout: 300000 });

      setResults(response.data.results);
      setStep('results');

      const { succeeded, failed: _failed } = response.data.summary;
      const published = response.data.results.filter(
        (r: AutoPostResult) => r.publishStatus === 'published'
      ).length;

      if (published > 0) {
        success(
          `🎉 ${published} Posts Published!`,
          `${published} videos posted to Instagram successfully!`
        );
      } else if (succeeded > 0) {
        success(
          `✅ ${succeeded} Videos Imported`,
          `${succeeded} videos imported (connect Instagram account to publish)`
        );
      }

      onSuccess?.();
    } catch (err: any) {
      error(
        '❌ Auto Post Failed',
        err.response?.data?.message || 'Something went wrong. Please try again.'
      );
      setStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    const hadResults = results.length > 0;
    setSheetUrl(
      'https://docs.google.com/spreadsheets/d/1eJFuzi-9EvqchOQ3H6cbgIUO6XEJQX4kxQZZwazg7qw/edit?usp=sharing'
    );
    setResults([]);
    setStep('input');
    onClose();
    if (hadResults) {
      router.push('/dashboard/posts?sort=newest');
    }
  };

  if (!isOpen) return null;

  const publishedCount = results.filter((r) => r.publishStatus === 'published').length;
  const failedCount = results.filter((r) => !r.success || r.publishStatus === 'failed').length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 p-6 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">🚀 Auto Post from Sheet</h2>
                <p className="text-white/90 text-sm">
                  {step === 'input' && 'Give sheet URL, everything else is automatic! ✨'}
                  {step === 'processing' && 'Importing videos + Creating posts + Publishing...'}
                  {step === 'results' && `${publishedCount} posts published! 🎉`}
                </p>
              </div>
            </div>
            <Button
              onClick={handleClose}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              size="sm"
              disabled={isProcessing}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <CardContent className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-3">📊 Google Sheets URL:</label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-4 border-2 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6">
                <h3 className="font-bold text-xl text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
                  ✨ What Happens (100% Automatic):
                </h3>
                <ul className="space-y-3 text-lg">
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">1️⃣</span>
                    <span className="text-purple-800 dark:text-purple-200">
                      All 9:16 videos will be imported from sheet
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">2️⃣</span>
                    <span className="text-purple-800 dark:text-purple-200">
                      Captions will be taken from Description column
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">3️⃣</span>
                    <span className="text-purple-800 dark:text-purple-200">
                      All posts will be published to Instagram
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <span className="text-purple-800 dark:text-purple-200 font-bold">
                      You do nothing - just give the sheet!
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ⚠️ <strong>Important:</strong> Instagram account must be connected first. If not
                  connected, go to Accounts page and connect it.
                </p>
              </div>

              <Button
                onClick={handleAutoPost}
                disabled={isProcessing || !sheetUrl.trim()}
                className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white text-xl py-8 font-bold"
              >
                <Rocket className="mr-3 h-6 w-6" />
                🚀 Auto Post All - Do Everything Automatically!
              </Button>
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center animate-pulse">
                <Loader2 className="w-16 h-16 text-white animate-spin" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-3xl font-bold">Processing... ⚡</h3>
                <div className="space-y-2 text-lg text-muted-foreground">
                  <p>📥 Importing videos...</p>
                  <p>📝 Creating posts...</p>
                  <p>🚀 Publishing to Instagram...</p>
                  <p className="text-sm mt-4">Please wait (5-10 minutes)</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 'results' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="text-center space-y-3 pb-4 border-b">
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
                <h3 className="text-3xl font-bold">Done! 🎉</h3>
                <div className="flex gap-4 justify-center text-lg">
                  <div className="bg-green-100 dark:bg-green-950/30 px-4 py-2 rounded-lg">
                    <span className="text-green-700 dark:text-green-300 font-bold">
                      ✅ {publishedCount} Published
                    </span>
                  </div>
                  {failedCount > 0 && (
                    <div className="bg-red-100 dark:bg-red-950/30 px-4 py-2 rounded-lg">
                      <span className="text-red-700 dark:text-red-300 font-bold">
                        ❌ {failedCount} Failed
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 ${
                      result.publishStatus === 'published'
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.publishStatus === 'published' ? (
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-lg">{result.title}</div>
                        {result.publishStatus === 'published' ? (
                          <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                            ✅ Posted to Instagram successfully!
                          </div>
                        ) : result.success ? (
                          <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                            ⚠️ Video imported, but publish failed (check manually)
                          </div>
                        ) : (
                          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                            ❌ {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-center text-green-800 dark:text-green-200 font-semibold">
                  🎉 Check your Instagram profile - all videos are posted!
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        {step === 'results' && (
          <div className="border-t p-4 bg-muted/20">
            <Button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white text-lg py-6"
            >
              ✅ Done - Close
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

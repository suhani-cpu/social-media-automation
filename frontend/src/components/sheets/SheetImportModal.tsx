'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Table, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/useToast';

interface SheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

interface PreviewData {
  totalVideos: number;
  vertical9_16Videos: number;
  videosWithDriveLinks: number;
  skipped: number;
  videos: Array<{
    title: string;
    description: string;
    driveLinksCount: number;
    has9_16: boolean;
  }>;
}

interface ImportResult {
  success: boolean;
  title: string;
  videoId?: string;
  source?: string;
  error?: string;
  postCreated?: boolean;
  postId?: string;
  publishStatus?: 'not_attempted' | 'published' | 'failed';
}

export function SheetImportModal({ isOpen, onClose, onImportSuccess }: SheetImportModalProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [sheetUrl, setSheetUrl] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<'input' | 'preview' | 'importing' | 'results'>('input');

  const handlePreview = async () => {
    if (!sheetUrl.trim()) {
      error('⚠️ Sheet URL Required', 'कृपया Google Sheets URL दर्ज करें');
      return;
    }

    setIsPreview(true);
    try {
      const response = await apiClient.get('/sheets/preview', {
        params: { sheetUrl },
      });

      setPreviewData({
        ...response.data.summary,
        videos: response.data.videos,
      });
      setStep('preview');
    } catch (err: any) {
      error('❌ Preview Failed', err.response?.data?.message || 'शीट लोड करने में समस्या आई है');
    } finally {
      setIsPreview(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setStep('importing');

    try {
      const response = await apiClient.post('/sheets/import', { sheetUrl }, { timeout: 300000 });

      setImportResults(response.data.results);
      setStep('results');

      const { succeeded, failed } = response.data.summary;

      if (failed === 0) {
        success(
          `✅ All ${succeeded} Videos Imported!`,
          `सभी ${succeeded} वीडियो सफलतापूर्वक इम्पोर्ट हो गए हैं`
        );
      } else {
        success(
          `✅ ${succeeded} Videos Imported`,
          `${succeeded} वीडियो इम्पोर्ट हुए, ${failed} में समस्या आई`
        );
      }

      onImportSuccess?.();
    } catch (err: any) {
      error('❌ Import Failed', err.response?.data?.message || 'इम्पोर्ट में समस्या आई है');
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    const hadResults = importResults.length > 0;
    setSheetUrl('');
    setPreviewData(null);
    setImportResults([]);
    setStep('input');
    onClose();
    if (hadResults) {
      router.push('/dashboard/posts?sort=newest');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Table className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Bulk Import from Google Sheets 📊</h2>
                <p className="text-white/90 text-sm">
                  {step === 'input' && 'Enter Google Sheets URL to import videos'}
                  {step === 'preview' && `Found ${previewData?.totalVideos} videos`}
                  {step === 'importing' && 'Importing videos...'}
                  {step === 'results' && 'Import complete!'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleClose}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              size="sm"
              disabled={isImporting}
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
                <label className="block text-sm font-medium mb-2">Google Sheets URL *</label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Make sure the sheet is shared with "Anyone with the link"
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  📋 What This Does:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Reads video data from your Google Sheet</li>
                  <li>Imports 9:16 vertical videos only (Reels/Shorts)</li>
                  <li>Auto-creates posts with captions from sheet</li>
                  <li>Auto-publishes to Instagram immediately</li>
                  <li>Supports Hindi/Haryanvi content</li>
                  <li>100% Automated - just paste sheet URL!</li>
                </ul>
              </div>

              <Button
                onClick={handlePreview}
                disabled={isPreview || !sheetUrl.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg py-6"
              >
                {isPreview ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading Preview...
                  </>
                ) : (
                  <>
                    <Table className="mr-2 h-5 w-5" />
                    Preview Sheet Data
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && previewData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {previewData.vertical9_16Videos}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">9:16 Videos</div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {previewData.videosWithDriveLinks}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">From Drive</div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {previewData.skipped}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Skipped</div>
                  </CardContent>
                </Card>
              </div>

              {/* Video List */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Videos to Import:</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {previewData.videos &&
                    previewData.videos.map((video, index) => (
                      <div key={index} className="border-2 rounded-lg p-3 hover:bg-primary/5">
                        <div className="font-medium">{video.title}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {video.description}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {video.driveLinksCount > 0 && (
                            <span className="text-xs bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                              📁 {video.driveLinksCount} Drive link
                              {video.driveLinksCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {video.has9_16 && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                              📱 9:16 Vertical
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center animate-pulse">
                <Upload className="w-12 h-12 text-white" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Importing Videos...</h3>
                <p className="text-muted-foreground">
                  वीडियो इम्पोर्ट हो रहे हैं, कृपया प्रतीक्षा करें
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take a few minutes depending on video sizes
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <h3 className="text-2xl font-bold">Import Complete!</h3>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {importResults.map((result, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-3 ${
                      result.success
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{result.title}</div>
                          {result.success ? (
                            <div className="space-y-1">
                              <div className="text-sm text-green-600 dark:text-green-400">
                                ✅ Video imported from{' '}
                                {result.source === 'drive' ? 'Google Drive' : 'YouTube'}
                              </div>
                              {result.postCreated && (
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  📝 Post created with caption
                                </div>
                              )}
                              {result.publishStatus === 'published' && (
                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                  🚀 Published to Instagram
                                </div>
                              )}
                              {result.publishStatus === 'failed' && (
                                <div className="text-xs text-orange-600 dark:text-orange-400">
                                  ⚠️ Post created but publish failed (check manually)
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              {result.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between bg-muted/20">
          <div className="text-sm text-muted-foreground">
            {step === 'preview' && previewData && (
              <span>{previewData.vertical9_16Videos} videos ready to import (9:16 only)</span>
            )}
            {step === 'results' && (
              <span>
                {importResults.filter((r) => r.success).length} of {importResults.length} succeeded
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {step === 'input' && (
              <Button onClick={handleClose} variant="outline">
                Cancel
              </Button>
            )}

            {step === 'preview' && (
              <>
                <Button onClick={() => setStep('input')} variant="outline" disabled={isImporting}>
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import All Videos
                </Button>
              </>
            )}

            {step === 'results' && (
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

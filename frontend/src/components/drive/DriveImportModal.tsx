'use client';

import { useState, useEffect } from 'react';
import { X, Folder, FileVideo, ChevronRight, Home, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/useToast';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  isFolder: boolean;
}

interface DriveFolder {
  id: string;
  name: string;
  createdTime?: string;
}

interface DriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function DriveImportModal({ isOpen, onClose, onImportSuccess }: DriveImportModalProps) {
  const { success, error } = useToast();
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<Array<{ id?: string; name: string }>>([
    { id: undefined, name: 'My Drive' },
  ]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [view, setView] = useState<'browse' | 'import'>('browse');

  useEffect(() => {
    if (isOpen) {
      loadDriveContents(currentFolderId);
    }
  }, [isOpen, currentFolderId]);

  const loadDriveContents = async (folderId?: string) => {
    setIsLoading(true);
    try {
      // Load folders
      const foldersResponse = await apiClient.get('/drive/folders', {
        params: { parentId: folderId },
      });
      setFolders(foldersResponse.data.folders || []);

      // Load files (videos only)
      const filesResponse = await apiClient.get('/drive/files', {
        params: { folderId, videosOnly: 'true' },
      });
      setFiles(filesResponse.data.files || []);
    } catch (err: any) {
      error(
        '❌ Error Loading Drive',
        err.response?.data?.message || 'ड्राइव लोड करने में समस्या आई है'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folder: DriveFolder) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
    setSelectedFiles(new Set());
  };

  const navigateToPath = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    const targetFolder = newPath[newPath.length - 1];
    setCurrentFolderId(targetFolder.id);
    setFolderPath(newPath);
    setSelectedFiles(new Set());
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      if (newSelection.size >= 10) {
        error('⚠️ Maximum 10 files', 'अधिकतम 10 वीडियो चुन सकते हैं');
        return;
      }
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0) {
      error('⚠️ No files selected', 'कृपया वीडियो चुनें');
      return;
    }

    setIsImporting(true);
    setView('import');

    try {
      const fileIds = Array.from(selectedFiles);

      if (fileIds.length === 1) {
        // Single file import
        await apiClient.post('/drive/import', { fileId: fileIds[0] });
        success(
          '✅ Video Imported Successfully!',
          'वीडियो सफलतापूर्वक इम्पोर्ट हो गया है'
        );
      } else {
        // Multiple files import
        const response = await apiClient.post('/drive/import/multiple', { fileIds });
        const successCount = response.data.results.filter((r: any) => r.success).length;
        success(
          `✅ ${successCount} Videos Imported!`,
          `${successCount} वीडियो सफलतापूर्वक इम्पोर्ट हो गए हैं`
        );
      }

      // Reset and close
      setSelectedFiles(new Set());
      onImportSuccess?.();
      setTimeout(() => {
        onClose();
        setView('browse');
      }, 1500);
    } catch (err: any) {
      error(
        '❌ Import Failed',
        err.response?.data?.message || 'इम्पोर्ट में समस्या आई है'
      );
      setView('browse');
    } finally {
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'Unknown';
    const size = parseInt(bytes);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 p-6 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <FileVideo className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Import from Google Drive ☁️</h2>
                <p className="text-white/90 text-sm">
                  {view === 'browse'
                    ? 'Select videos to import (max 10)'
                    : 'Importing videos...'}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              size="sm"
              disabled={isImporting}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Breadcrumb */}
          {view === 'browse' && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {folderPath.map((folder, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="w-4 h-4 text-white/60" />}
                  <button
                    onClick={() => navigateToPath(index)}
                    className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {index === 0 ? <Home className="w-3 h-3" /> : <Folder className="w-3 h-3" />}
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 overflow-y-auto p-6">
          {view === 'import' ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center animate-pulse">
                <Download className="w-12 h-12 text-white" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Importing Videos...</h3>
                <p className="text-muted-foreground">
                  वीडियो इम्पोर्ट हो रहे हैं, कृपया प्रतीक्षा करें
                </p>
                <p className="text-sm text-muted-foreground">
                  Importing {selectedFiles.size} video{selectedFiles.size > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center animate-pulse">
                  <Folder className="w-8 h-8 text-white" />
                </div>
                <p className="text-muted-foreground">Loading contents...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Folders */}
              {folders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    Folders 📁
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => navigateToFolder(folder)}
                        className="flex items-center gap-3 p-3 border-2 rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {folder.createdTime
                              ? new Date(folder.createdTime).toLocaleDateString()
                              : 'Folder'}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Files */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    Video Files 🎥 ({files.length})
                  </h3>
                  <div className="grid gap-3">
                    {files.map((file) => {
                      const isSelected = selectedFiles.has(file.id);
                      return (
                        <button
                          key={file.id}
                          onClick={() => toggleFileSelection(file.id)}
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all text-left group ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500'
                              : 'hover:bg-primary/5 hover:border-primary/30'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected
                                ? 'bg-emerald-500 text-white'
                                : 'bg-blue-100 dark:bg-blue-950/50'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <FileVideo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                              {file.modifiedTime &&
                                ` • ${new Date(file.modifiedTime).toLocaleDateString()}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {folders.length === 0 && files.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <FileVideo className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">No videos found</h3>
                    <p className="text-muted-foreground">
                      इस फोल्डर में कोई वीडियो नहीं मिला
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        {view === 'browse' && !isLoading && (
          <div className="border-t p-4 flex items-center justify-between bg-muted/20">
            <div className="text-sm text-muted-foreground">
              {selectedFiles.size > 0 ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {selectedFiles.size} video{selectedFiles.size > 1 ? 's' : ''} selected
                </span>
              ) : (
                <span>Select videos to import (max 10)</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={onClose} variant="outline" disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedFiles.size === 0 || isImporting}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:shadow-lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Import {selectedFiles.size > 0 && `(${selectedFiles.size})`}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

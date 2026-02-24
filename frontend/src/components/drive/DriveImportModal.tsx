'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Folder,
  FileVideo,
  ChevronRight,
  Home,
  Download,
  Check,
  Eye,
  Grid3x3,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDriveContents(currentFolderId);
    }
  }, [isOpen, currentFolderId]);

  const loadDriveContents = async (folderId?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const foldersResponse = await apiClient.get('/drive/folders', {
        params: { parentId: folderId },
      });
      setFolders(foldersResponse.data.folders || []);

      const filesResponse = await apiClient.get('/drive/files', {
        params: { folderId, videosOnly: 'true' },
      });
      setFiles(filesResponse.data.files || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load Drive contents';
      setLoadError(msg);
      error('Error Loading Drive', msg);
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
        error('Maximum 10 files', 'You can select up to 10 videos at a time');
        return;
      }
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.slice(0, 10).map((f) => f.id)));
    }
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0) {
      error('No files selected', 'Please select videos to import');
      return;
    }

    setIsImporting(true);
    setView('import');

    try {
      const fileIds = Array.from(selectedFiles);

      if (fileIds.length === 1) {
        await apiClient.post('/drive/import', { fileId: fileIds[0] });
        success('Video Imported', 'Video has been imported successfully');
      } else {
        const response = await apiClient.post('/drive/import/multiple', { fileIds });
        const successCount = response.data.results.filter((r: any) => r.success).length;
        success(`${successCount} Videos Imported`, `${successCount} videos imported successfully`);
      }

      setSelectedFiles(new Set());
      onImportSuccess?.();
      setTimeout(() => {
        onClose();
        setView('browse');
      }, 1500);
    } catch (err: any) {
      error('Import Failed', err.response?.data?.message || 'Failed to import videos');
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
        {/* Header */}
        <div className="bg-[#111] border-b border-[#1a1a1a] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <FileVideo className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Import from Google Drive</h2>
                <p className="text-xs text-neutral-500">
                  {view === 'browse' ? 'Select videos to import (max 10)' : 'Importing videos...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {view === 'browse' && (
                <div className="flex rounded-md border border-[#1a1a1a]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 ${viewMode === 'grid' ? 'bg-[#1a1a1a] text-white' : 'text-neutral-500 hover:text-white'}`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 ${viewMode === 'list' ? 'bg-[#1a1a1a] text-white' : 'text-neutral-500 hover:text-white'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                disabled={isImporting}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Breadcrumb */}
          {view === 'browse' && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {folderPath.map((folder, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  {index > 0 && <ChevronRight className="w-3 h-3 text-neutral-600" />}
                  <button
                    onClick={() => navigateToPath(index)}
                    className="text-xs bg-[#1a1a1a] hover:bg-[#222] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 text-neutral-300"
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
        <div className="flex-1 overflow-y-auto p-5">
          {view === 'import' ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center">
                <Download className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-white">Importing Videos...</h3>
                <p className="text-sm text-neutral-500">
                  Importing {selectedFiles.size} video{selectedFiles.size > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  <Folder className="w-6 h-6 text-neutral-500 animate-pulse" />
                </div>
                <p className="text-sm text-neutral-500">Loading contents...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Folders */}
              {folders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Folders
                  </h3>
                  <div className="grid gap-2 md:grid-cols-3">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => navigateToFolder(folder)}
                        className="flex items-center gap-3 p-3 border border-[#1a1a1a] rounded-lg hover:bg-[#111] hover:border-[#222] transition-all text-left group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                          <Folder className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{folder.name}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Files - Grid View */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      Video Files ({files.length})
                    </h3>
                    {files.length > 1 && (
                      <button
                        onClick={selectAll}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        {selectedFiles.size === Math.min(files.length, 10)
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    )}
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {files.map((file) => {
                        const isSelected = selectedFiles.has(file.id);
                        return (
                          <div
                            key={file.id}
                            className={`relative group rounded-lg border overflow-hidden transition-all cursor-pointer ${
                              isSelected
                                ? 'border-red-500 ring-1 ring-red-500/30'
                                : 'border-[#1a1a1a] hover:border-[#333]'
                            }`}
                            onClick={() => toggleFileSelection(file.id)}
                          >
                            {/* Thumbnail */}
                            <div className="aspect-video bg-[#111] relative">
                              {file.thumbnailLink ? (
                                <img
                                  src={file.thumbnailLink}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileVideo className="w-8 h-8 text-neutral-600" />
                                </div>
                              )}
                              {/* Selection Badge */}
                              <div
                                className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-red-500 text-white'
                                    : 'bg-black/50 text-neutral-400 opacity-0 group-hover:opacity-100'
                                } transition-all`}
                              >
                                {isSelected ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border border-neutral-400" />
                                )}
                              </div>
                              {/* Preview Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewFile(file);
                                }}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-white transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Info */}
                            <div className="p-2">
                              <p className="text-xs font-medium text-white truncate">{file.name}</p>
                              <p className="text-[10px] text-neutral-500 mt-0.5">
                                {formatFileSize(file.size)}
                                {file.modifiedTime &&
                                  ` - ${new Date(file.modifiedTime).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* List View */
                    <div className="grid gap-2">
                      {files.map((file) => {
                        const isSelected = selectedFiles.has(file.id);
                        return (
                          <button
                            key={file.id}
                            onClick={() => toggleFileSelection(file.id)}
                            className={`flex items-center gap-3 p-3 border rounded-lg transition-all text-left ${
                              isSelected
                                ? 'bg-red-600/5 border-red-600/30'
                                : 'border-[#1a1a1a] hover:bg-[#111] hover:border-[#222]'
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-red-600 text-white' : 'bg-[#1a1a1a]'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <FileVideo className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                            {file.thumbnailLink && (
                              <img
                                src={file.thumbnailLink}
                                alt=""
                                className="w-16 h-10 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{file.name}</p>
                              <p className="text-xs text-neutral-500">
                                {formatFileSize(file.size)}
                                {file.modifiedTime &&
                                  ` - ${new Date(file.modifiedTime).toLocaleDateString()}`}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFile(file);
                              }}
                              className="text-neutral-500 hover:text-white p-1"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Error/Empty states */}
              {loadError && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
                  <X className="w-7 h-7 text-red-500" />
                  <h3 className="text-base font-semibold text-white">Failed to load Drive</h3>
                  <p className="text-sm text-red-400 max-w-lg">{loadError}</p>
                  <Button
                    onClick={() => loadDriveContents(currentFolderId)}
                    variant="outline"
                    className="border-[#1a1a1a] text-neutral-300"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {!loadError && folders.length === 0 && files.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
                  <FileVideo className="w-7 h-7 text-neutral-500" />
                  <h3 className="text-base font-semibold text-white">No videos found</h3>
                  <p className="text-sm text-neutral-500">No video files found in this folder</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {view === 'browse' && !isLoading && (
          <div className="border-t border-[#1a1a1a] p-4 flex items-center justify-between bg-[#111]">
            <div className="text-xs text-neutral-500">
              {selectedFiles.size > 0 ? (
                <span className="font-medium text-red-500">
                  {selectedFiles.size} video{selectedFiles.size > 1 ? 's' : ''} selected
                </span>
              ) : (
                <span>Select videos to import (max 10)</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={isImporting}
                className="border-[#1a1a1a] text-neutral-300 hover:bg-[#1a1a1a] text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedFiles.size === 0 || isImporting}
                className="bg-red-600 hover:bg-red-700 text-white text-sm"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Import {selectedFiles.size > 0 && `(${selectedFiles.size})`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Video Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="max-w-2xl w-full rounded-lg border border-[#1a1a1a] bg-[#111] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white truncate">{previewFile.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewFile(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {previewFile.thumbnailLink ? (
                <img
                  src={previewFile.thumbnailLink}
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <FileVideo className="w-16 h-16 text-neutral-600" />
              )}
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                {formatFileSize(previewFile.size)}
                {previewFile.modifiedTime &&
                  ` - Modified ${new Date(previewFile.modifiedTime).toLocaleDateString()}`}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  toggleFileSelection(previewFile.id);
                  setPreviewFile(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
              >
                {selectedFiles.has(previewFile.id) ? 'Deselect' : 'Select for Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

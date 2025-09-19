"use client";

import { useState, useEffect, useCallback } from 'react';

interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  pieceCid: string;
  txHash: string | null;
  blockNumber: number | null;
  storageProvider: string | null;
  uploadStatus: 'PROCESSING' | 'UPLOADED' | 'CONFIRMED' | 'PUBLISHED' | 'FAILED' | 'DELETED';
  processingError: string | null;
  duration: number | null;
  bitrate: string | null;
  genre: string | null;
  artwork: string | null;
  isPublic: boolean;
  isPremium: boolean;
  encryptionKey: string | null;
  tags: string[];
  downloadCount: number;
  playCount: number;
  lastAccessed: string | null;
  creditsCost: number;
  wasSponsored: boolean;
  uploadedAt: string;
  processedAt: string | null;
  publishedAt: string | null;
  trackId: string | null;
  creator: {
    id: string;
    stageName: string;
    genre: string[];
  } | null;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface TrackConversionData {
  title: string;
  description?: string;
  genre: string;
  isPremium?: boolean;
  price?: number;
}

interface UseUploadedFilesReturn {
  files: UploadedFile[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  refetch: () => void;
  loadMore: () => void;
  convertToTrack: (fileId: string, trackData: TrackConversionData) => Promise<boolean>;
  deleteFile: (fileId: string) => Promise<boolean>;
  updateFileMetadata: (fileId: string, metadata: Partial<UploadedFile>) => Promise<boolean>;
}

interface UseUploadedFilesOptions {
  userId?: string;
  creatorId?: string;
  status?: 'PROCESSING' | 'UPLOADED' | 'CONFIRMED' | 'PUBLISHED' | 'FAILED' | 'DELETED';
  limit?: number;
  sortBy?: 'uploadedAt' | 'fileSize' | 'playCount';
  sortOrder?: 'asc' | 'desc';
}

export function useUploadedFiles(options: UseUploadedFilesOptions = {}): UseUploadedFilesReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const {
    userId,
    creatorId,
    status,
    limit = 20,
    sortBy = 'uploadedAt',
    sortOrder = 'desc'
  } = options;

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();

    if (userId) params.append('userId', userId);
    if (creatorId) params.append('creatorId', creatorId);
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    return params.toString();
  }, [userId, creatorId, status, limit, offset, sortBy, sortOrder]);

  const fetchFiles = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setError(null);
      }

      const response = await fetch(`/api/uploaded-files?${buildQueryString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch uploaded files: ${response.statusText}`);
      }

      const data = await response.json();

      if (isLoadMore) {
        setFiles(prev => [...prev, ...data.files]);
      } else {
        setFiles(data.files || []);
        setOffset(0);
      }

      setTotalCount(data.totalCount || 0);
      setHasMore(data.hasMore || false);
    } catch (err: any) {
      console.error('Uploaded files fetch error:', err);
      setError(err.message || 'Failed to load uploaded files');
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  const refetch = useCallback(() => {
    setOffset(0);
    fetchFiles(false);
  }, [fetchFiles]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setOffset(prev => prev + limit);
    }
  }, [hasMore, loading, limit]);

  // Convert uploaded file to track
  const convertToTrack = useCallback(async (fileId: string, trackData: TrackConversionData): Promise<boolean> => {
    try {
      const response = await fetch(`/api/uploaded-files/${fileId}/convert-to-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert file to track');
      }

      // Update the file in local state
      setFiles(prev => prev.map(file =>
        file.id === fileId
          ? { ...file, uploadStatus: 'PUBLISHED' as const, publishedAt: new Date().toISOString() }
          : file
      ));

      return true;
    } catch (err: any) {
      console.error('Convert to track error:', err);
      setError(err.message || 'Failed to convert file to track');
      return false;
    }
  }, []);

  // Delete uploaded file
  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/uploaded-files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }

      // Remove file from local state
      setFiles(prev => prev.filter(file => file.id !== fileId));
      setTotalCount(prev => prev - 1);

      return true;
    } catch (err: any) {
      console.error('Delete file error:', err);
      setError(err.message || 'Failed to delete file');
      return false;
    }
  }, []);

  // Update file metadata
  const updateFileMetadata = useCallback(async (fileId: string, metadata: Partial<UploadedFile>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/uploaded-files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update file metadata');
      }

      const updatedFile = await response.json();

      // Update file in local state
      setFiles(prev => prev.map(file =>
        file.id === fileId ? { ...file, ...updatedFile } : file
      ));

      return true;
    } catch (err: any) {
      console.error('Update file metadata error:', err);
      setError(err.message || 'Failed to update file metadata');
      return false;
    }
  }, []);

  // Load more when offset changes
  useEffect(() => {
    if (offset > 0) {
      fetchFiles(true);
    }
  }, [offset, fetchFiles]);

  // Initial fetch
  useEffect(() => {
    fetchFiles(false);
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    totalCount,
    hasMore,
    refetch,
    loadMore,
    convertToTrack,
    deleteFile,
    updateFileMetadata,
  };
}

// Convenience hooks for specific use cases
export function useUserUploadedFiles(userId: string, status?: UseUploadedFilesOptions['status']) {
  return useUploadedFiles({ userId, status });
}

export function useCreatorUploadedFiles(creatorId: string, status?: UseUploadedFilesOptions['status']) {
  return useUploadedFiles({ creatorId, status });
}

export function useUnpublishedFiles(creatorId: string) {
  return useUploadedFiles({
    creatorId,
    status: 'CONFIRMED', // Files ready to be converted to tracks
    sortBy: 'uploadedAt',
    sortOrder: 'desc'
  });
}

export function useFailedUploads(userId: string) {
  return useUploadedFiles({
    userId,
    status: 'FAILED',
    sortBy: 'uploadedAt',
    sortOrder: 'desc'
  });
}
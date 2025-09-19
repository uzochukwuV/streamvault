"use client";

import { useState, useEffect, useCallback } from 'react';

interface Track {
  id: string;
  title: string;
  description: string | null;
  genre: string;
  duration: number;
  fileHash: string;
  fileName: string;
  fileSize: number;
  playCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPremium: boolean;
  price: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  creator: {
    id: string;
    stageName: string;
    genre: string[];
    description: string | null;
    walletAddress: string | null;
    totalPlays: number;
    followerCount: number;
    isVerified: boolean;
    user: {
      profileImage: string | null;
      isVerified: boolean;
    } | null;
  };
}

interface ContentFilters {
  genre?: string;
  isPremium?: boolean;
  creatorId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'playCount' | 'likeCount' | 'createdAt' | 'commentCount' | 'shareCount';
  sortOrder?: 'asc' | 'desc';
}

interface UseContentReturn {
  tracks: Track[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  refetch: () => void;
  loadMore: () => void;
}

interface UseContentHook {
  // Get content by max plays
  getContentsByMaxPlays: (limit?: number) => UseContentReturn;

  // Get content by max likes
  getContentsByMaxLikes: (limit?: number) => UseContentReturn;

  // Get content by max comments
  getContentsByMaxComments: (limit?: number) => UseContentReturn;

  // Get content by max shares
  getContentsByMaxShares: (limit?: number) => UseContentReturn;

  // Get latest content
  getLatestContent: (limit?: number) => UseContentReturn;

  // Get content by ID
  getContentById: (id: string) => {
    track: Track | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
  };

  // Get all user content
  getAllUserContent: (userId: string, filters?: ContentFilters) => UseContentReturn;

  // Get content by genre
  getContentByGenre: (genre: string, filters?: ContentFilters) => UseContentReturn;

  // Get trending content (combination of recent plays, likes, and recency)
  getTrendingContent: (limit?: number) => UseContentReturn;

  // Get premium content
  getPremiumContent: (filters?: ContentFilters) => UseContentReturn;

  // Search content
  searchContent: (query: string, filters?: ContentFilters) => UseContentReturn;
}

// Custom hook for fetching content with various filters
function useContentFetch(endpoint: string, options?: RequestInit): UseContentReturn {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setError(null);
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }

      const data = await response.json();

      if (isLoadMore) {
        setTracks(prev => [...prev, ...data.tracks]);
      } else {
        setTracks(data.tracks || []);
      }

      setTotalCount(data.totalCount || data.tracks?.length || 0);
      setHasMore(data.hasMore || false);
    } catch (err: any) {
      console.error('Content fetch error:', err);
      setError(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  const refetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchData(true);
    }
  }, [hasMore, loading, fetchData]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  return {
    tracks,
    loading,
    error,
    hasMore,
    totalCount,
    refetch,
    loadMore,
  };
}

// Custom hook for single track
function useTrackFetch(id: string) {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrack = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/content/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch track: ${response.statusText}`);
      }

      const data = await response.json();
      setTrack(data);
    } catch (err: any) {
      console.error('Track fetch error:', err);
      setError(err.message || 'Failed to load track');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refetch = useCallback(() => {
    fetchTrack();
  }, [fetchTrack]);

  useEffect(() => {
    fetchTrack();
  }, [fetchTrack]);

  return {
    track,
    loading,
    error,
    refetch,
  };
}

// Build query string from filters
function buildQueryString(filters: ContentFilters = {}): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  return params.toString() ? `?${params.toString()}` : '';
}

export function useContent(): UseContentHook {
  const getContentsByMaxPlays = (limit = 20) => {
    return useContentFetch(`/api/content${buildQueryString({
      sortBy: 'playCount',
      sortOrder: 'desc',
      limit
    })}`);
  };

  const getContentsByMaxLikes = (limit = 20) => {
    return useContentFetch(`/api/content${buildQueryString({
      sortBy: 'likeCount',
      sortOrder: 'desc',
      limit
    })}`);
  };

  const getContentsByMaxComments = (limit = 20) => {
    return useContentFetch(`/api/content${buildQueryString({
      sortBy: 'commentCount',
      sortOrder: 'desc',
      limit
    })}`);
  };

  const getContentsByMaxShares = (limit = 20) => {
    return useContentFetch(`/api/content${buildQueryString({
      sortBy: 'shareCount',
      sortOrder: 'desc',
      limit
    })}`);
  };

  const getLatestContent = (limit = 20) => {
    return useContentFetch(`/api/content${buildQueryString({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit
    })}`);
  };

  const getContentById = (id: string) => {
    return useTrackFetch(id);
  };

  const getAllUserContent = (userId: string, filters: ContentFilters = {}) => {
    return useContentFetch(`/api/content${buildQueryString({
      creatorId: userId,
      ...filters
    })}`);
  };

  const getContentByGenre = (genre: string, filters: ContentFilters = {}) => {
    return useContentFetch(`/api/content${buildQueryString({
      genre,
      ...filters
    })}`);
  };

  const getTrendingContent = (limit = 20) => {
    return useContentFetch(`/api/content/trending${buildQueryString({ limit })}`);
  };

  const getPremiumContent = (filters: ContentFilters = {}) => {
    return useContentFetch(`/api/content${buildQueryString({
      isPremium: true,
      ...filters
    })}`);
  };

  const searchContent = (query: string, filters: ContentFilters = {}) => {
    if (!query.trim()) {
      return {
        tracks: [],
        loading: false,
        error: null,
        hasMore: false,
        totalCount: 0,
        refetch: () => {},
        loadMore: () => {},
      };
    }

    return useContentFetch(`/api/content/search${buildQueryString({
      q: query,
      ...filters
    })}`);
  };

  return {
    getContentsByMaxPlays,
    getContentsByMaxLikes,
    getContentsByMaxComments,
    getContentsByMaxShares,
    getLatestContent,
    getContentById,
    getAllUserContent,
    getContentByGenre,
    getTrendingContent,
    getPremiumContent,
    searchContent,
  };
}

// Export specific hooks for convenience
export function useContentsByMaxPlays(limit?: number) {
  const { getContentsByMaxPlays } = useContent();
  return getContentsByMaxPlays(limit);
}

export function useContentsByMaxLikes(limit?: number) {
  const { getContentsByMaxLikes } = useContent();
  return getContentsByMaxLikes(limit);
}

export function useLatestContent(limit?: number) {
  const { getLatestContent } = useContent();
  return getLatestContent(limit);
}

export function useContentById(id: string) {
  const { getContentById } = useContent();
  return getContentById(id);
}

export function useTrendingContent(limit?: number) {
  const { getTrendingContent } = useContent();
  return getTrendingContent(limit);
}

export function useUserContent(userId: string, filters?: ContentFilters) {
  const { getAllUserContent } = useContent();
  return getAllUserContent(userId, filters);
}

export function useContentByGenre(genre: string, filters?: ContentFilters) {
  const { getContentByGenre } = useContent();
  return getContentByGenre(genre, filters);
}

export function useSearchContent(query: string, filters?: ContentFilters) {
  const { searchContent } = useContent();
  return searchContent(query, filters);
}
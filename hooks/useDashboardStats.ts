"use client";

import { useState, useEffect } from 'react';

interface PlatformStats {
  totalTracks: number;
  totalCreators: number;
  totalUsers: number;
  totalPlays: number;
  totalRevenue: number;
  growth: {
    tracks: string;
    creators: string;
    users: string;
    revenue: string;
  };
}

interface RecentTrack {
  id: string;
  fileName: string;
  originalName: string;
  duration: number | null;
  genre: string | null;
  uploadedAt: string;
  creator: {
    stageName: string;
    genre: string[];
  } | null;
}

interface TopCreator {
  id: string;
  stageName: string;
  genre: string[];
  followerCount: number;
  totalPlays: number;
  isVerified: boolean;
  profileImage: string | null;
}

interface DashboardStats {
  platform: PlatformStats;
  recentTracks: RecentTrack[];
  topCreators: TopCreator[];
}

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Dashboard stats error:', err);
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchStats();
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}
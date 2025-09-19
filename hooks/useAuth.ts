"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { prisma } from "@/lib/database";

interface User {
  id: string;
  username: string;
  displayName: string;
  walletAddress: string;
  profileImage?: string;
  bio?: string;
  isVerified: boolean;
  isPremium: boolean;
  followerCount: number;
  followingCount: number;
  totalPlays: number;
  creator?: Creator;
  credits?: UserCredits;
}

interface Creator {
  id: string;
  stageName: string;
  genre: string[];
  description?: string;
  walletAddress: string;
  totalPlays: number;
  monthlyPlays: number;
  followerCount: number;
  monthlyRevenue: string;
  engagementScore: number;
  hasCoin: boolean;
  coinAddress?: string;
}

interface UserCredits {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCreator: boolean;
  login: () => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  becomeCreator: (data: { stageName: string; genre: string[]; description?: string }) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user exists and create/fetch user data
  const fetchOrCreateUser = async (walletAddress: string): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) throw new Error('Failed to fetch user');

      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Failed to fetch/create user:', error);
      return null;
    }
  };

  // Login function
  const login = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const userData = await fetchOrCreateUser(address);
      setUser(userData);

      // Redirect to dashboard after successful login
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    disconnect();
    setUser(null);
    // router.push('/');
  };

  // Update user profile
  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...data }),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  // Become a creator
  const becomeCreator = async (data: { stageName: string; genre: string[]; description?: string }) => {
    if (!user) return;

    try {
      const response = await fetch('/api/auth/become-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, walletAddress: address, ...data }),
      });

      if (!response.ok) throw new Error('Failed to become creator');

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to become creator:', error);
      throw error;
    }
  };

  // Effect to handle wallet connection changes
  useEffect(() => {
    if (isConnected && address && !user && !isLoading) {
      fetchOrCreateUser(address).then(setUser);
    } else if (!isConnected) {
      setUser(null);
    }
  }, [isConnected, address, user, isLoading]);

  // Auto-redirect authenticated users
  useEffect(() => {
    if (isConnected && user && window.location.pathname === '/') {
      router.push('/dashboard');
    }
  }, [isConnected, user, router]);

  const isAuthenticated = isConnected && !!user;
  const isCreator = !!user?.creator;
  const loading = isConnecting || isLoading;

  return {
    user,
    isLoading: loading,
    isAuthenticated,
    isCreator,
    login,
    logout,
    updateProfile,
    becomeCreator,
  };
}
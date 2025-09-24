"use client";
import { useState, useCallback } from 'react';
import type { OnboardingProfile } from '@/components/onboarding/OnboardingModal';

export const useOnboarding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeOnboarding = useCallback(async (
    profile: OnboardingProfile,
    walletAddress: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          displayName: profile.displayName,
          bio: profile.bio,
          genres: profile.genres,
          userType: profile.userType,
          stageName: profile.stageName,
          creatorBio: profile.creatorBio,
          socialLinks: profile.socialLinks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    completeOnboarding,
    isLoading,
    error,
  };
};
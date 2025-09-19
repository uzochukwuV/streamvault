"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Sidebar } from "@/components/Sidebar";
import { useUnpublishedFiles } from "@/hooks/useUploadedFiles";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, updateProfile, becomeCreator } = useAuth();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Get unpublished files count for sidebar
  const unpublishedFiles = useUnpublishedFiles(user?.creator?.id || '');

  // Check authentication and show onboarding for new users
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // router.push('/');
        // return;
      }

      // Show onboarding for new users (those with default usernames)
      // if (user && user.username.startsWith('user_')) {
      //   setShowOnboarding(true);
      // }
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleOnboardingComplete = async (isCreator: boolean, data: any) => {
    try {
      // Update profile
      await updateProfile({
        username: data.profile.username,
        displayName: data.profile.displayName,
        bio: data.profile.bio,
      });

      // Create creator profile if selected
      if (isCreator && data.creator) {
        await becomeCreator({
          stageName: data.creator.stageName,
          genre: data.creator.genre,
          description: data.creator.description,
        });
      }

      setShowOnboarding(false);
    } catch (error) {
      console.error('Onboarding failed:', error);
      // Handle error - maybe show toast notification
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-bold">
            SV
          </div>
          <div className="text-white font-semibold">Loading StreamVault...</div>
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </motion.div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
 

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white flex">
      {/* Sidebar */}
      <Sidebar
        user={user}
        unpublishedCount={unpublishedFiles.files.length}
      />

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        user={user}
      />
    </div>
  );
}
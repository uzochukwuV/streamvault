"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Music,
  Star,
  ArrowRight,
  Upload,
  Coins,
  CheckCircle,
  Sparkles
} from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (isCreator: boolean, data?: any) => void;
  user: any;
}

type OnboardingStep = 'welcome' | 'profile' | 'creator-choice' | 'creator-setup' | 'complete';

export function OnboardingModal({ isOpen, onClose, onComplete, user }: OnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    displayName: user?.displayName || '',
    bio: '',
  });
  const [creatorData, setCreatorData] = useState({
    stageName: '',
    genre: [] as string[],
    description: '',
  });
  const [isCreator, setIsCreator] = useState(false);

  const genres = [
    'Electronic', 'Hip Hop', 'Pop', 'Rock', 'Jazz', 'Classical',
    'R&B', 'Country', 'Folk', 'Alternative', 'Indie', 'Reggae'
  ];

  const handleNext = () => {
    switch (step) {
      case 'welcome':
        setStep('profile');
        break;
      case 'profile':
        setStep('creator-choice');
        break;
      case 'creator-choice':
        if (isCreator) {
          setStep('creator-setup');
        } else {
          setStep('complete');
        }
        break;
      case 'creator-setup':
        setStep('complete');
        break;
    }
  };

  const handleComplete = () => {
    onComplete(isCreator, {
      profile: profileData,
      creator: isCreator ? creatorData : null,
    });
  };

  const toggleGenre = (genre: string) => {
    setCreatorData(prev => ({
      ...prev,
      genre: prev.genre.includes(genre)
        ? prev.genre.filter(g => g !== genre)
        : [...prev.genre, genre]
    }));
  };

  const canProceedProfile = profileData.username.trim() && profileData.displayName.trim();
  const canProceedCreator = creatorData.stageName.trim() && creatorData.genre.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && step === 'welcome' && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gradient-to-b from-neutral-900 to-black border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-lg font-bold">
                  SV
                </div>
                <span className="text-xl font-bold text-white">Welcome to StreamVault</span>
              </div>
              {step === 'welcome' && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Step {step === 'welcome' ? 1 : step === 'profile' ? 2 : step === 'creator-choice' ? 3 : step === 'creator-setup' ? 4 : 5} of 5</span>
                <span>{step === 'welcome' ? 'Welcome' : step === 'profile' ? 'Profile Setup' : step === 'creator-choice' ? 'Account Type' : step === 'creator-setup' ? 'Creator Profile' : 'Complete'}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: step === 'welcome' ? '20%' : step === 'profile' ? '40%' : step === 'creator-choice' ? '60%' : step === 'creator-setup' ? '80%' : '100%'
                  }}
                />
              </div>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {step === 'welcome' && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="mb-6">
                    <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-4">
                      Welcome to the Future of Music
                    </h2>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      StreamVault is a Web3 music platform where you truly own your content.
                      Let's set up your profile and get you started!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 rounded-2xl p-6">
                      <Upload className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                      <h3 className="font-semibold text-white mb-2">Upload Music</h3>
                      <p className="text-sm text-gray-400">Store your tracks permanently on Filecoin</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6">
                      <Coins className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                      <h3 className="font-semibold text-white mb-2">Creator Coins</h3>
                      <p className="text-sm text-gray-400">Launch your own creator economy</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6">
                      <Star className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                      <h3 className="font-semibold text-white mb-2">Fan Engagement</h3>
                      <p className="text-sm text-gray-400">Connect directly with your audience</p>
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto transition-all duration-200"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="mb-6">
                    <User className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                      Complete Your Profile
                    </h2>
                    <p className="text-gray-300 text-center">
                      Let's make your profile uniquely yours
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                        placeholder="Choose a unique username"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                        placeholder="Your public display name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio (Optional)
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 resize-none"
                        rows={3}
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={!canProceedProfile}
                    className={`w-full mt-8 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                      canProceedProfile
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                        : 'bg-white/5 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === 'creator-choice' && (
                <motion.div
                  key="creator-choice"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Are you a music creator?
                    </h2>
                    <p className="text-gray-300">
                      Choose how you want to use StreamVault
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <button
                      onClick={() => setIsCreator(false)}
                      className={`p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
                        !isCreator
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <User className="w-10 h-10 text-blue-400 mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Music Fan</h3>
                      <p className="text-gray-300 mb-4">
                        Discover and support your favorite artists. Invest in creator coins and access exclusive content.
                      </p>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Stream unlimited music</li>
                        <li>• Buy creator coins</li>
                        <li>• Access premium content</li>
                        <li>• Support artists directly</li>
                      </ul>
                    </button>

                    <button
                      onClick={() => setIsCreator(true)}
                      className={`p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
                        isCreator
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <Music className="w-10 h-10 text-purple-400 mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Creator</h3>
                      <p className="text-gray-300 mb-4">
                        Upload your music, build your fanbase, and monetize your creativity with creator coins.
                      </p>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Upload music to Filecoin</li>
                        <li>• Launch creator coins</li>
                        <li>• Monetize exclusive content</li>
                        <li>• Analytics & insights</li>
                      </ul>
                    </button>
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    Continue as {isCreator ? 'Creator' : 'Fan'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === 'creator-setup' && (
                <motion.div
                  key="creator-setup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="mb-6">
                    <Music className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                      Set Up Your Creator Profile
                    </h2>
                    <p className="text-gray-300 text-center">
                      Tell your fans about your music
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Stage Name *
                      </label>
                      <input
                        type="text"
                        value={creatorData.stageName}
                        onChange={(e) => setCreatorData(prev => ({ ...prev, stageName: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                        placeholder="Your artist/band name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Genres * (Select at least one)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {genres.map(genre => (
                          <button
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`p-2 rounded-lg text-sm transition-all duration-200 ${
                              creatorData.genre.includes(genre)
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={creatorData.description}
                        onChange={(e) => setCreatorData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 resize-none"
                        rows={3}
                        placeholder="Describe your music style and background..."
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={!canProceedCreator}
                    className={`w-full mt-8 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                      canProceedCreator
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                        : 'bg-white/5 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Complete Setup
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Welcome to StreamVault!
                  </h2>
                  <p className="text-gray-300 text-lg mb-8">
                    Your {isCreator ? 'creator' : 'fan'} profile is all set up. You've received{' '}
                    <span className="text-yellow-400 font-semibold">
                      {isCreator ? '600' : '100'} SV credits
                    </span>{' '}
                    to get started!
                  </p>

                  <div className="bg-white/5 rounded-2xl p-6 mb-8">
                    <h3 className="text-xl font-semibold text-white mb-4">What's Next?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isCreator ? (
                        <>
                          <div className="text-left">
                            <Upload className="w-6 h-6 text-blue-400 mb-2" />
                            <h4 className="font-semibold text-white">Upload Your First Track</h4>
                            <p className="text-sm text-gray-400">Share your music with the world</p>
                          </div>
                          <div className="text-left">
                            <Coins className="w-6 h-6 text-yellow-400 mb-2" />
                            <h4 className="font-semibold text-white">Launch Creator Coins</h4>
                            <p className="text-sm text-gray-400">Monetize your fanbase</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-left">
                            <Music className="w-6 h-6 text-purple-400 mb-2" />
                            <h4 className="font-semibold text-white">Discover Music</h4>
                            <p className="text-sm text-gray-400">Explore tracks from creators</p>
                          </div>
                          <div className="text-left">
                            <Star className="w-6 h-6 text-pink-400 mb-2" />
                            <h4 className="font-semibold text-white">Support Artists</h4>
                            <p className="text-sm text-gray-400">Buy creator coins</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleComplete}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto transition-all duration-200"
                  >
                    Enter StreamVault
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
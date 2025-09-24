"use client";
import React, { useState } from 'react';
import { X, Music, Headphones, Mic } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: OnboardingProfile) => void;
  userWalletAddress?: string;
}

export interface OnboardingProfile {
  displayName: string;
  bio?: string;
  genres: string[];
  userType: 'listener' | 'creator';
  // Creator specific
  stageName?: string;
  creatorBio?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    soundcloud?: string;
  };
}

const MUSIC_GENRES = [
  'Hip-Hop', 'Electronic', 'Pop', 'Rock', 'R&B', 'Jazz', 'Classical',
  'Country', 'Folk', 'Reggae', 'Latin', 'Afrobeat', 'Indie', 'Alternative'
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  userWalletAddress
}) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<OnboardingProfile>({
    displayName: '',
    genres: [],
    userType: 'listener'
  });

  if (!isOpen) return null;

  const updateProfile = (updates: Partial<OnboardingProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleComplete = () => {
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto border border-zinc-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Welcome to StreamVault</h2>
              <p className="text-zinc-500 text-sm mt-1">Let&apos;s set up your profile</p>
            </div>
            <div className="text-xs text-zinc-400">
              {step}/{profile.userType === 'creator' ? '4' : '3'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <WelcomeStep
              profile={profile}
              updateProfile={updateProfile}
              onNext={nextStep}
              walletAddress={userWalletAddress}
            />
          )}

          {step === 2 && (
            <JourneyChoiceStep
              profile={profile}
              updateProfile={updateProfile}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {step === 3 && profile.userType === 'listener' && (
            <ListenerSetupStep
              profile={profile}
              updateProfile={updateProfile}
              onComplete={handleComplete}
              onBack={prevStep}
            />
          )}

          {step === 3 && profile.userType === 'creator' && (
            <CreatorSetupStep
              profile={profile}
              updateProfile={updateProfile}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {step === 4 && profile.userType === 'creator' && (
            <CreatorFinalizationStep
              profile={profile}
              updateProfile={updateProfile}
              onComplete={handleComplete}
              onBack={prevStep}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Step 1: Welcome & Basic Profile
const WelcomeStep: React.FC<{
  profile: OnboardingProfile;
  updateProfile: (updates: Partial<OnboardingProfile>) => void;
  onNext: () => void;
  walletAddress?: string;
}> = ({ profile, updateProfile, onNext, walletAddress }) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto">
          <Music className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-900">Welcome to the future of music</h3>
          <p className="text-zinc-500 text-sm">
            A Web3 platform where artists earn through creator coins
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => updateProfile({ displayName: e.target.value })}
            placeholder="Enter your name"
            className="w-full px-3 py-2 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Bio <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={profile.bio || ''}
            onChange={(e) => updateProfile({ bio: e.target.value })}
            placeholder="Tell us about yourself"
            rows={3}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      {walletAddress && (
        <div className="text-xs text-zinc-500 bg-zinc-50 p-3 rounded-md">
          <strong>Connected:</strong> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!profile.displayName}
        className="w-full px-4 py-2 bg-black hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-medium rounded-md transition-colors disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
};

// Step 2: Journey Choice
const JourneyChoiceStep: React.FC<{
  profile: OnboardingProfile;
  updateProfile: (updates: Partial<OnboardingProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ profile, updateProfile, onNext, onBack }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-zinc-900">Choose your path</h3>
        <p className="text-zinc-500 text-sm mt-1">
          How do you want to use StreamVault?
        </p>
      </div>

      <div className="space-y-3">
        <div
          onClick={() => updateProfile({ userType: 'listener' })}
          className={`p-4 rounded-md border-2 cursor-pointer transition-all ${
            profile.userType === 'listener'
              ? 'border-black bg-zinc-50'
              : 'border-zinc-200 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              profile.userType === 'listener' ? 'bg-black' : 'bg-zinc-200'
            }`}>
              <Headphones className={`w-5 h-5 ${
                profile.userType === 'listener' ? 'text-white' : 'text-zinc-600'
              }`} />
            </div>
            <div>
              <h4 className="font-medium text-zinc-900">Music Lover</h4>
              <p className="text-sm text-zinc-500">Discover and support artists</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => updateProfile({ userType: 'creator' })}
          className={`p-4 rounded-md border-2 cursor-pointer transition-all ${
            profile.userType === 'creator'
              ? 'border-black bg-zinc-50'
              : 'border-zinc-200 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              profile.userType === 'creator' ? 'bg-black' : 'bg-zinc-200'
            }`}>
              <Mic className={`w-5 h-5 ${
                profile.userType === 'creator' ? 'text-white' : 'text-zinc-600'
              }`} />
            </div>
            <div>
              <h4 className="font-medium text-zinc-900">Creator</h4>
              <p className="text-sm text-zinc-500">Share music and earn rewards</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-zinc-300 hover:border-zinc-400 text-zinc-700 font-medium rounded-md transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-4 py-2 bg-black hover:bg-zinc-800 text-white font-medium rounded-md transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Step 3A: Listener Setup
const ListenerSetupStep: React.FC<{
  profile: OnboardingProfile;
  updateProfile: (updates: Partial<OnboardingProfile>) => void;
  onComplete: () => void;
  onBack: () => void;
}> = ({ profile, updateProfile, onComplete, onBack }) => {
  const toggleGenre = (genre: string) => {
    const genres = profile.genres.includes(genre)
      ? profile.genres.filter(g => g !== genre)
      : [...profile.genres, genre];
    updateProfile({ genres });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-zinc-900">What music do you love?</h3>
        <p className="text-zinc-500 text-sm mt-1">
          Select genres to personalize your feed
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MUSIC_GENRES.map(genre => (
          <button
            key={genre}
            onClick={() => toggleGenre(genre)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              profile.genres.includes(genre)
                ? 'bg-black text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      <div className="bg-zinc-50 p-4 rounded-md">
        <h4 className="font-medium text-zinc-900 mb-1">Welcome bonus</h4>
        <p className="text-sm text-zinc-600">
          You&apos;ve received <strong>100 credits</strong> to start discovering music.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-zinc-300 hover:border-zinc-400 text-zinc-700 font-medium rounded-md transition-colors"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          className="flex-1 px-4 py-2 bg-black hover:bg-zinc-800 text-white font-medium rounded-md transition-colors"
        >
          Start Listening
        </button>
      </div>
    </div>
  );
};

// Step 3B: Creator Setup
const CreatorSetupStep: React.FC<{
  profile: OnboardingProfile;
  updateProfile: (updates: Partial<OnboardingProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ profile, updateProfile, onNext, onBack }) => {
  const toggleGenre = (genre: string) => {
    const genres = profile.genres.includes(genre)
      ? profile.genres.filter(g => g !== genre)
      : [...profile.genres, genre];
    updateProfile({ genres });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-zinc-900">Creator profile</h3>
        <p className="text-zinc-500 text-sm mt-1">
          Set up your artist profile
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Artist Name
          </label>
          <input
            type="text"
            value={profile.stageName || ''}
            onChange={(e) => updateProfile({ stageName: e.target.value })}
            placeholder="Your stage name"
            className="w-full px-3 py-2 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Your Genres
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MUSIC_GENRES.map(genre => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  profile.genres.includes(genre)
                    ? 'bg-black text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Bio <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={profile.creatorBio || ''}
            onChange={(e) => updateProfile({ creatorBio: e.target.value })}
            placeholder="Tell fans about your music"
            rows={3}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-zinc-300 hover:border-zinc-400 text-zinc-700 font-medium rounded-md transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!profile.stageName || profile.genres.length === 0}
          className="flex-1 px-4 py-2 bg-black hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-medium rounded-md transition-colors disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Step 4: Creator Finalization
const CreatorFinalizationStep: React.FC<{
  profile: OnboardingProfile;
  updateProfile: (updates: Partial<OnboardingProfile>) => void;
  onComplete: () => void;
  onBack: () => void;
}> = ({ profile, updateProfile, onComplete, onBack }) => {
  const [socialLinks, setSocialLinks] = useState(profile.socialLinks || {});

  const updateSocialLinks = (platform: string, url: string) => {
    const updated = { ...socialLinks, [platform]: url };
    setSocialLinks(updated);
    updateProfile({ socialLinks: updated });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-zinc-900">Connect socials</h3>
        <p className="text-zinc-500 text-sm mt-1">
          Help fans find you <span className="text-zinc-400">(optional)</span>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Twitter/X
          </label>
          <input
            type="url"
            value={socialLinks.twitter || ''}
            onChange={(e) => updateSocialLinks('twitter', e.target.value)}
            placeholder="https://twitter.com/username"
            className="w-full px-3 py-2 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Instagram
          </label>
          <input
            type="url"
            value={socialLinks.instagram || ''}
            onChange={(e) => updateSocialLinks('instagram', e.target.value)}
            placeholder="https://instagram.com/username"
            className="w-full px-3 py-2 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            SoundCloud
          </label>
          <input
            type="url"
            value={socialLinks.soundcloud || ''}
            onChange={(e) => updateSocialLinks('soundcloud', e.target.value)}
            placeholder="https://soundcloud.com/username"
            className="w-full px-3 py-2 border border-zinc-300 rounded-md text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="bg-zinc-50 p-4 rounded-md">
        <h4 className="font-medium text-zinc-900 mb-1">Creator bonus</h4>
        <p className="text-sm text-zinc-600">
          You&apos;ve received <strong>75 credits</strong> to upload your first tracks.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-zinc-300 hover:border-zinc-400 text-zinc-700 font-medium rounded-md transition-colors"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          className="flex-1 px-4 py-2 bg-black hover:bg-zinc-800 text-white font-medium rounded-md transition-colors"
        >
          Complete Setup
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;
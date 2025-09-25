"use client"
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Home,
  Search,
  Radio,
  Heart,
  Users,
  Plus,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  Bell,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  UploadIcon,
  CogIcon,
} from "lucide-react";

import {MusicalNoteIcon} from "@heroicons/react/24/outline"
// Import our real hooks and components
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useLatestContent, useTrendingContent } from '@/hooks/useContent';
import { useAudioPlayer, type Track } from '@/hooks/useAudioPlayer';
import Link from 'next/link';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAccount } from 'wagmi';

// StreamVault Web3-enhanced UI
// - Dark, glassy aesthetic
// - Wallet connect mock, creator coin card, trading modal mock
// - On-chain / off-chain metrics panel and oracle status banner

const SAMPLE_TRACKS = [
  {
    id: 1,
    title: "The Less I Know The Better",
    artist: "Tame Impala",
    cover:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBOFnneihR50BsP8-4AqAPpzfH2trA6417iYSga2PzkLYQ0CWCX0tt_qvOlRM1ASSWCEnFxPpw4IPI2Ca8uypfgllg8UNd_0u98-5dQAfAd88IDnGwVRzbEjZPwoOKoP7bU46JKjMcK-4eyWs31mrJb-3WNSgpslf6c7M1ghL-IzQkpnUuHN7tFno8zmp1-9ki0Lcb82CFg4cpRT51EWkCk4AHRmgBZZ3HqvEVQZPMfqljJfBbAPfNliKOUM1NdoR7ZExLyTqrdFIGy",
    duration: 218,
    isPremium: false,
  },
  {
    id: 2,
    title: "Blonde",
    artist: "Frank Ocean",
    cover:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC43cIMgWMiQxiMPlYKK5NRH9zTXu-0LDq_H_ifO1XNC0EbDV9h-pEr4YnoISdB2AX5lhBT00o5IeW4fEZ0OAbbGRUqyZ6FCjLCor2XBVJ2_3uKEGKZXHngufNWN6K6M-SHhS-yGfvpH_HCT8GKI9b8xU2gIJNUwbi2GnKfDJO5R4SeK-o1lCss2cmb29XFb9P7PrwqX6fhlMdKZ52kussc9boRX7ui1o9e28wSvPBi2KwzPyGcLenhdKpjNb9rKssVh1AKP3Z3RIRI",
    duration: 260,
    isPremium: true,
    minHolding: 50, // requires 50 creator coins to access
  },
  {
    id: 3,
    title: "Currents",
    artist: "Tame Impala",
    cover:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDj4p0G5N_60TJspLFkmcwblUDdVQMvAE-MgomjsYki1Ym-GaTQiS7XgGY8ceqblUrGlVgDa5cXf2J1ru-tlKGHvbR4AfXggRlAr0V6vWcFbGAFlp6VIupiG7Iv8OjTUI1qiv6XyLziPXDA4pX3ekRkFvtkKAMuA_ye0TewV5KvNBgor028qCuTSMS0iz7GvpBLv2sjAIrGh58-8BsKM4u3xxlpXAAfARpLCab_MGilxkgEBpZocCItMlQto5Uq6W-opujIXESEcRs3",
    duration: 200,
    isPremium: false,
  },
  {
    id: 4,
    title: "Lo-Fi Beats",
    artist: "Chillhop",
    cover:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBqf4vsaUz-o_jjqOdukOhgTlooThtf_YG8JzSM-jOqXr8zIXRaUKaJYLFjz8tqsTCBupPax9dkzhBLVSkGxVkBCI2e9GsBVc6ewgMB1rltI_ED7rt-Kd19zpc7kYxyRZpBd0CI_DPOqNlXW1Z-T8h4GkArZvbnjk_gyc63Ac7JMRfrE3EB1LmwWrAnH3S6pq96kxZ3x8laoRwXy2588Er3fNaBEV6bc2WFX5RFZeq6jKM4_j73y6wON-Gfh4-nz9PXjEGfioTOC-TS",
    duration: 145,
    isPremium: false,
  },
];

function IconButton({ children, className = "", onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full p-2 hover:scale-105 transition-transform duration-150 ${className}`}
    >
      {children}
    </button>
  );
}





function shorten(addr = "") {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}


function Topbar({ onSearch, connected, onConnect, address, balance, onStartOnboarding, user }: any) {
  const needsOnboarding = !user?.username || user?.username.startsWith('user_') || !user?.credits;

  return (
    <header className="flex items-center justify-between py-4 px-6 bg-transparent">
      <div className="flex items-center gap-4">
        <div className="bg-white/5 rounded-full p-2">
          <input
            onChange={(e) => onSearch?.(e.target.value)}
            className="bg-transparent outline-none text-sm placeholder-gray-400 w-80"
            placeholder="Search artists, tracks, podcasts..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Onboarding Button */}
        <button
          onClick={onStartOnboarding}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            needsOnboarding
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 animate-pulse'
              : 'bg-white/10 text-gray-300 hover:bg-white/15'
          }`}
        >
          {needsOnboarding ? 'Complete Setup' : 'Profile Setup'}
        </button>

        <div className="flex items-center gap-4">
          <button className="bg-white/5 rounded-full p-2">
            <Bell className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <img src="https://i.pravatar.cc/40?img=32" className="w-9 h-9 rounded-full" />
            <div className="text-right">
              <div className="text-sm font-semibold">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0xF9...12A'}
              </div>
              <div className="text-xs text-gray-400">Wallet Connected</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function OracleBanner({ status }: any) {
  const isOk = status === "active";
  return (
    <div className={`p-3 rounded-xl mb-4 flex items-center gap-3 ${isOk ? "bg-green-800/40" : "bg-red-800/40"}`}>
      {isOk ? <CheckCircle className="w-5 h-5 text-green-300" /> : <AlertTriangle className="w-5 h-5 text-red-300" />}
      <div>
        <div className="text-sm font-semibold">Oracle Status: {isOk ? "Active" : "Disconnected"}</div>
        <div className="text-xs text-gray-300">Last sync: {isOk ? "2m ago" : "--"}</div>
      </div>
    </div>
  );
}

function Hero({ onPlay, latestTrack }: any) {
  return (
    <section className="rounded-2xl p-6 bg-gradient-to-r from-purple-700 via-pink-600 to-orange-500 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Good Afternoon</h2>
          <p className="text-sm opacity-90 mt-1">New releases and recommended for you</p>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => onPlay && latestTrack && onPlay(latestTrack)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full font-semibold"
            >
              <Play className="w-4 h-4" /> Play
            </button>
            <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full">
              <Plus className="w-4 h-4" /> Add to library
            </button>
          </div>
        </div>

        <div className="w-48 h-48 rounded-xl bg-white/10 grid place-items-center">
          <img
            src={latestTrack?.creator?.user?.profileImage || SAMPLE_TRACKS[0].cover}
            alt="cover"
            className="w-40 h-40 rounded-lg shadow-lg object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function CreatorCoinCard({ creator, onTrade }: any) {
  return (
    <div className="bg-white/4 p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-300">Creator</div>
          <div className="font-semibold">{creator.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Balance</div>
          <div className="font-semibold">{creator.userBalance} {creator.coinSymbol}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => onTrade('buy', creator)} className="px-3 py-1 rounded-full bg-green-600 font-semibold">Buy</button>
        <button onClick={() => onTrade('sell', creator)} className="px-3 py-1 rounded-full bg-white/5">Sell</button>
        <div className="ml-auto text-xs text-gray-300">Price: {creator.price} FIL</div>
      </div>
    </div>
  );
}

function MetricsPanel({ offChain, onChain }: any) {
  return (
    <div className="bg-white/4 p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Creator Metrics</div>
        <div className="text-xs text-gray-300">Updated 2m ago</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400">Plays (off-chain)</div>
          <div className="font-semibold text-lg">{offChain.plays.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400">Plays (on-chain)</div>
          <div className="font-semibold text-lg">{onChain.plays.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400">Followers</div>
          <div className="font-semibold text-lg">{offChain.followers.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400">Revenue (FIL)</div>
          <div className="font-semibold text-lg">{onChain.revenue}</div>
        </div>
      </div>
    </div>
  );
}

function CardsGrid({ tracks, onPlay, holdings }: any) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {tracks.map((t:any) => {
        const locked = t.isPremium && holdings < (t.minHolding || 0);
        return (
          <div
            key={t.id}
            className="bg-white/3 rounded-2xl p-3 hover:scale-105 transform transition cursor-pointer relative"
          >
            <div className="relative">
              <img src={t.cover} alt={t.title} className="w-full h-40 rounded-lg object-cover" />
              <button
                onClick={() => onPlay(t)}
                className="absolute bottom-3 right-3 bg-green-500 p-2 rounded-full shadow-lg"
              >
                <Play className="w-4 h-4 text-white" />
              </button>
              {t.isPremium && (
                <div className="absolute top-3 left-3 bg-yellow-500/95 text-black text-xs px-2 py-1 rounded">Premium</div>
              )}
              {locked && (
                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-center p-4">
                  <div>
                    <div className="text-sm font-semibold">Locked</div>
                    <div className="text-xs text-gray-300">Requires {t.minHolding} {"creator coins"}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3">
              <div className="font-semibold">{t.title}</div>
              <div className="text-xs text-gray-300">{t.artist}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RightPanel({ queue, onPlay, creators, onTrade }: any) {
  return (
    <aside className="w-80 p-4 bg-gradient-to-b from-black/40 to-black/20 rounded-2xl space-y-4">
      <h4 className="text-sm text-gray-300 font-semibold">Up Next</h4>
      <div className="mt-3 space-y-3">
        {queue.map((t:any) => (
          <div
            key={t.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition cursor-pointer"
            onClick={() => onPlay(t)}
          >
            <img src={t.cover} alt={t.title} className="w-12 h-12 rounded-md object-cover" />
            <div className="flex-1">
              <div className="text-sm font-medium">{t.title}</div>
              <div className="text-xs text-gray-400">{t.artist}</div>
            </div>
            <div className="text-xs text-gray-400">{formatTime(t.duration)}</div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-white/6">
        <h4 className="text-sm text-gray-300 mb-2">Featured Creator</h4>
        {creators.map((c: any) => (
          <div key={c.id} className="mb-3">
            <CreatorCoinCard creator={c} onTrade={onTrade} />
          </div>
        ))}
      </div>
    </aside>
  );
}

interface FooterPlayerProps {
  track: Track;
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  volume: number;
  onVolume: (volume: number) => void;
  holdings: number;
  error: string | null;
}

function FooterPlayer({
  track,
  isPlaying,
  isLoading,
  onTogglePlay,
  onNext,
  onPrevious,
  progress,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolume,
  holdings,
  error
}: FooterPlayerProps) {
  return (
    <footer className="fixed bottom-4 left-6 right-6 bg-gradient-to-r from-white/5 to-white/3 backdrop-blur-md border border-white/6 rounded-2xl p-3 flex items-center gap-6 z-50">
      <div className="flex items-center gap-3 w-1/4">
        <img src={track.cover} alt={track.title} className="w-14 h-14 rounded-md object-cover" />
        <div>
          <div className="font-semibold">{track.title}</div>
          <div className="text-xs text-neutral-300">{track.artist}</div>
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <div className="flex items-center gap-6">
          <IconButton className="text-neutral-300">
            <Shuffle className="w-5 h-5" />
          </IconButton>
          <IconButton className="text-neutral-300" onClick={onPrevious}>
            <SkipBack className="w-6 h-6" />
          </IconButton>

          <button
            onClick={onTogglePlay}
            disabled={isLoading}
            className="w-12 h-12 bg-white text-black rounded-full grid place-items-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-neutral-800 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>

          <IconButton className="text-neutral-300" onClick={onNext}>
            <SkipForward className="w-6 h-6" />
          </IconButton>
          <IconButton className="text-neutral-300">
            <Repeat className="w-5 h-5" />
          </IconButton>
        </div>

        <div className="w-full mt-3 flex items-center gap-3 text-xs text-neutral-300">
          <span>{formatTime(Math.round(currentTime))}</span>
          <div
            className="h-1 bg-white/10 rounded-full flex-1 relative cursor-pointer"
            onClick={onSeek}
          >
            <div
              className="h-1 bg-white rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>{formatTime(Math.round(duration))}</span>
        </div>

        <div className="mt-2 text-xs text-neutral-400">
          Your Creator Coin Holdings: {holdings} SV
        </div>
      </div>

      <div className="w-48 flex items-center justify-end gap-3">
        <IconButton className="text-neutral-300">
          <Volume2 className="w-5 h-5" />
        </IconButton>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="w-20"
        />
      </div>
    </footer>
  );
}

function formatTime(sec: any) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function StreamVaultApp() {
  const [search, setSearch] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Real authentication and data hooks
  const { user, isAuthenticated, isLoading } = useAuth();
  const { completeOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { address } = useAccount();
  const { stats, isLoading: statsLoading } = useDashboardStats();
  const { tracks: latestTracks } = useLatestContent(12);
  const { tracks: trendingTracks } = useTrendingContent(8);

  // Audio player hook
  const audioPlayer = useAudioPlayer();

  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeLocale, setTradeLocale] = useState<any>({ type: "buy", creator: null });
  // Memoize track conversion to prevent unnecessary re-conversions
  const convertTrackToPlayerFormat = useCallback((track: any): Track => {
    return {
      id: track.id,
      title: track.title,
      artist: track.creator?.stageName || 'Unknown Artist',
      cover: track.creator?.user?.profileImage || '/default-cover.jpg',
      duration: track.duration || 0,
      isPremium: track.isPremium || false,
      fileHash: track.fileHash,
    };
  }, []);

  // Memoize the track queue to prevent unnecessary recalculations
  const trackQueue = useMemo(() => {
    return latestTracks.map(track => convertTrackToPlayerFormat(track));
  }, [latestTracks]);

  // Set up initial queue from latest tracks (only once when tracks are loaded)
  useEffect(() => {
    if (trackQueue.length > 0 && audioPlayer.queue.length === 0) {
      audioPlayer.setQueue(trackQueue);
    }
  }, [trackQueue, audioPlayer]);

  // Check if user needs onboarding (new user without proper profile)
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Checking onboarding for user:', user);
      console.log('Username:', user.username);
      console.log('Credits:', user.credits);

      // Check if user needs onboarding
      const needsOnboarding = !user.username || user.username.startsWith('user_') || !user.credits;
      console.log('Needs onboarding:', needsOnboarding);

      setShowOnboarding(needsOnboarding);
    }
  }, [isAuthenticated, user]);

  const handleOnboardingComplete = async (profile: any) => {
    try {
      if (!address) return;

      await completeOnboarding(profile, address);
      setShowOnboarding(false);

      // Refresh the page to get updated user data
      window.location.reload();
    } catch (error) {
      console.error('Onboarding failed:', error);
    }
  };

  // Real metrics from database
  const offChain = {
    plays: stats?.platform?.totalPlays || 0,
    followers: stats?.platform?.totalCreators || 0,
  };
  const onChain = {
    plays: stats?.platform?.totalPlays || 0,
    revenue: (stats?.platform?.totalRevenue || 0).toString(),
  };


  

  const handlePlayTrack = useCallback((track: any) => {
    // Convert database track format to player format
    const playerTrack = convertTrackToPlayerFormat(track);

    // Check if premium and user doesn't hold enough, prompt to trade
    const minHolding = 50; // This would come from creator coin data
    if (playerTrack.isPremium && (user?.credits?.balance || 0) < minHolding) {
      setTradeLocale({
        type: "buy",
        creator: {
          name: playerTrack.artist,
          coinSymbol: "SV",
          price: 0.08
        }
      });
      setShowTradeModal(true);
      return;
    }

    // Play the track using the audio player
    audioPlayer.play(playerTrack);
  }, [ user?.credits?.balance, audioPlayer]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioPlayer.duration;
    audioPlayer.seek(newTime);
  }, [audioPlayer]);

  const handleVolumeChange = useCallback((volume: number) => {
    audioPlayer.setVolume(volume / 100);
  }, [audioPlayer]);

  function onTrade(type: string, creator: any) {
    setTradeLocale({ type, creator });
    setShowTradeModal(true);
  }

  function executeTrade(amount: number) {
    // TODO: Implement real trading with smart contracts
    setShowTradeModal(false);
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-neutral-300 rounded-full animate-spin"></div>
      </div>
    );
  }

  // // Show login prompt if not authenticated
  // if (!isAuthenticated) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold text-white mb-4">Welcome to StreamVault</h1>
  //         <p className="text-neutral-400 mb-6">Connect your wallet to access the dashboard</p>
  //         <Link
  //           href="/"
  //           className="px-6 py-3 bg-gradient-to-r from-neutral-600 to-neutral-500 text-white rounded-lg hover:from-neutral-500 hover:to-neutral-400 transition-colors"
  //         >
  //           Go to Home
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }

  const creators = stats?.topCreators?.map(creator => ({
    id: creator.id,
    name: creator.stageName,
    userBalance: 120, // This would come from user's creator coin holdings
    coinSymbol: "SV",
    price: 0.12
  })) || [];

  return (
    <div className="flex-1 p-6 space-y-6">
        <Topbar
          onSearch={setSearch}
          connected={isAuthenticated}
          onConnect={() => {}}
          address={user?.walletAddress}
          user={user}
          onStartOnboarding={() => setShowOnboarding(true)}
          balance={user?.credits?.balance || 0}
        />

        {/* <OracleBanner status="active" /> */}

        {/* Onboarding Banner for incomplete profiles */}
        {user && (!user.username || user.username.startsWith('user_') || !user.credits) && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-2">
              <CogIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">Complete Your Profile Setup</div>
              <div className="text-xs text-gray-300">
                Set up your profile to get started with StreamVault. Choose between listener or creator mode.
              </div>
            </div>
            <button
              onClick={() => setShowOnboarding(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Hero onPlay={handlePlayTrack} latestTrack={latestTracks[0]} />

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Trending Tracks</h3>
                <Link href="/dashboard/browse" className="text-sm text-gray-400 hover:text-white">
                  See all
                </Link>
              </div>

              <CardsGrid
                tracks={trendingTracks}
                onPlay={handlePlayTrack}
                holdings={user?.credits?.balance || 0}
              />
            </section>

            {latestTracks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Latest Releases</h3>
                  <Link href="/dashboard/browse" className="text-sm text-gray-400 hover:text-white">
                    See all
                  </Link>
                </div>

                <CardsGrid
                  tracks={latestTracks.slice(0, 8)}
                  onPlay={handlePlayTrack}
                  holdings={user?.credits?.balance || 0}
                />
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <MetricsPanel offChain={offChain} onChain={onChain} />

            <div className="bg-white/4 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">Your Credits</div>
                  <div className="font-semibold">{user?.credits?.balance || 0} Credits</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="font-semibold">{user?.creator ? 'Creator' : 'Listener'}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {user?.creator ? (
                  <Link
                    href="/dashboard/manage-uploads"
                    className="flex-1 px-3 py-2 rounded-full bg-neutral-700 hover:bg-neutral-600 font-semibold text-center transition-colors"
                  >
                    Manage Uploads
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/upload"
                    className="flex-1 px-3 py-2 rounded-full bg-neutral-700 hover:bg-neutral-600 font-semibold text-center transition-colors"
                  >
                    Upload Music
                  </Link>
                )}
                <button className="flex-1 px-3 py-2 rounded-full bg-white/5">
                  Buy Credits
                </button>
              </div>
            </div>

          </aside>
        </div>

        <div className="p-6">
          <RightPanel
            queue={latestTracks.slice(0, 5)}
            onPlay={handlePlayTrack}
            creators={creators}
            onTrade={onTrade}
          />
        </div>

        {audioPlayer.currentTrack && (
          <FooterPlayer
            track={audioPlayer.currentTrack}
            isPlaying={audioPlayer.isPlaying}
            isLoading={audioPlayer.isLoading}
            onTogglePlay={audioPlayer.togglePlay}
            onNext={audioPlayer.next}
            onPrevious={audioPlayer.previous}
            progress={audioPlayer.progress}
            currentTime={audioPlayer.currentTime}
            duration={audioPlayer.duration}
            onSeek={handleSeek}
            volume={audioPlayer.volume * 100}
            onVolume={handleVolumeChange}
            holdings={user?.credits?.balance || 0}
            error={audioPlayer.error}
          />
        )}

        {/* Trade Modal */}
        {showTradeModal && (
          <div className="fixed inset-0 bg-black/60 grid place-items-center z-50">
            <div className="w-full max-w-md bg-gray-900 p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-300">
                    {tradeLocale.type === 'buy' ? 'Buy' : 'Sell'} {tradeLocale.creator?.name || 'Creator Coin'}
                  </div>
                  <div className="font-semibold">{tradeLocale.creator?.coinSymbol || 'SV'}</div>
                </div>
                <button onClick={() => setShowTradeModal(false)} className="text-gray-400">
                  Close
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs text-gray-400">Amount</label>
                <input
                  type="number"
                  className="w-full bg-white/5 p-2 rounded"
                  defaultValue={1}
                  id="tradeAmount"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const v = Number((document.getElementById('tradeAmount') as HTMLInputElement).value || 0);
                      executeTrade(v);
                    }}
                    className="flex-1 px-3 py-2 rounded-full bg-neutral-700 hover:bg-neutral-600 font-semibold transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowTradeModal(false)}
                    className="flex-1 px-3 py-2 rounded-full bg-white/5"
                  >
                    Cancel
                  </button>
                </div>

                <div className="text-xs text-gray-400">
                  Creator coin trading coming soon with smart contracts.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Modal */}
        <OnboardingModal
          isOpen={showOnboarding}
          onComplete={handleOnboardingComplete}
          userWalletAddress={address}
        />
      </div>
  );
}

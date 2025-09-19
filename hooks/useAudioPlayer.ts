"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDownloadAndExtract } from './useFileManager';

export interface Track {
  id: string | number;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  isPremium?: boolean;
  audioUrl?: string;
  fileHash?: string;
}

interface UseAudioPlayerReturn {
  // Current track state
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  progress: number;

  // Controls
  play: (track?: Track) => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  next: () => void;
  previous: () => void;

  // Queue management
  queue: Track[];
  setQueue: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  currentTrackIndex: number;

  // Error handling
  error: string | null;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Hook for downloading and extracting files from Filecoin
  const { downloadAndExtractMutation } = useDownloadAndExtract();

  // Keep track of current blob URL for cleanup
  const currentBlobUrlRef = useRef<string | null>(null);

  // Keep track of which track we're downloading to prevent duplicate downloads
  const downloadingTrackRef = useRef<string | null>(null);

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;

      const audio = audioRef.current;

      // Event listeners
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleDurationChange = () => {
        setDuration(audio.duration || 0);
      };

      const handleLoadStart = () => {
        setIsLoading(true);
        setError(null);
      };

      const handleCanPlay = () => {
        setIsLoading(false);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        // Auto-play next track if available
        if (currentTrackIndex < queue.length - 1) {
          next();
        }
      };

      const handleError = () => {
        setIsLoading(false);
        setIsPlaying(false);
        setError('Failed to load audio file');
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('durationchange', handleDurationChange);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();

        // Clean up current blob URL
        if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
          currentBlobUrlRef.current = null;
        }
      };
    }
  }, [currentTrackIndex, queue.length]);

  // Clean up blob URLs when track changes
  useEffect(() => {
    return () => {
      // Clean up previous track's blob URL
      if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }

      // Reset downloading ref when track changes
      downloadingTrackRef.current = null;
    };
  }, [currentTrack?.id]);

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      let audioUrl = currentTrack.audioUrl;

      if (!audioUrl && currentTrack.fileHash) {
        // Check if we're already downloading this track to prevent duplicates
        const trackId = `${currentTrack.id}-${currentTrack.fileHash}`;

        if (downloadingTrackRef.current !== trackId) {
          downloadingTrackRef.current = trackId;
          setIsLoading(true);
          setError(null);

          downloadAndExtractMutation.mutate(
            {
              commp: currentTrack.fileHash,
              filename: `${currentTrack.title}.zip`
            },
            {
              onSuccess: (extractedData) => {
                downloadingTrackRef.current = null;

                if (extractedData.audioUrl) {
                  const extractedAudioUrl = extractedData.audioUrl;

                  // Track blob URL for cleanup using ref
                  if (extractedAudioUrl.startsWith('blob:')) {
                    currentBlobUrlRef.current = extractedAudioUrl;
                  }

                  if (audioRef.current && audioRef.current.src !== extractedAudioUrl) {
                    audioRef.current.src = extractedAudioUrl;
                    audioRef.current.load();
                  }
                } else {
                  setError('No audio file found in the track');
                  setIsLoading(false);
                }
              },
              onError: (error) => {
                downloadingTrackRef.current = null;
                console.error('Failed to download track:', error);
                setError('Failed to load track from Filecoin');
                setIsLoading(false);

                // Fallback to demo track for testing
                const fallbackUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3';
                if (audioRef.current) {
                  audioRef.current.src = fallbackUrl;
                  audioRef.current.load();
                }
              }
            }
          );
        }
      } else if (audioUrl) {
        // Use provided audio URL directly
        if (audioRef.current.src !== audioUrl) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();
        }
      } else {
        // Fallback demo track for testing when no fileHash
        const fallbackUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3';
        if (audioRef.current.src !== fallbackUrl) {
          audioRef.current.src = fallbackUrl;
          audioRef.current.load();
        }
      }
    }
  }, [currentTrack?.id, currentTrack?.fileHash, currentTrack?.audioUrl]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = useCallback((track?: Track) => {
    if (track && track !== currentTrack) {
      setCurrentTrack(track);
      // Update queue if this track isn't in it
      if (!queue.find(t => t.id === track.id)) {
        setQueue(prev => [...prev, track]);
        setCurrentTrackIndex(queue.length);
      } else {
        const index = queue.findIndex(t => t.id === track.id);
        setCurrentTrackIndex(index);
      }
    }

    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setError('Failed to play audio');
      });
    }
  }, [currentTrack, queue]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  }, []);

  const next = useCallback(() => {
    if (currentTrackIndex < queue.length - 1) {
      const nextTrack = queue[currentTrackIndex + 1];
      setCurrentTrack(nextTrack);
      setCurrentTrackIndex(currentTrackIndex + 1);
      if (isPlaying) {
        play(nextTrack);
      }
    }
  }, [currentTrackIndex, queue, isPlaying, play]);

  const previous = useCallback(() => {
    if (currentTrackIndex > 0) {
      const prevTrack = queue[currentTrackIndex - 1];
      setCurrentTrack(prevTrack);
      setCurrentTrackIndex(currentTrackIndex - 1);
      if (isPlaying) {
        play(prevTrack);
      }
    }
  }, [currentTrackIndex, queue, isPlaying, play]);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, track]);
  }, []);

  return {
    // Current track state
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    progress,

    // Controls
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    next,
    previous,

    // Queue management
    queue,
    setQueue,
    addToQueue,
    currentTrackIndex,

    // Error handling
    error,
  };
}
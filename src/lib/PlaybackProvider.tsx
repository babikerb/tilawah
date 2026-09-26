import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { usePlayerStore } from '../store/usePlayerStore';
import { getSurah } from '../data/surahs';
import { surahAudioUrl } from './audioUrls';

interface PlaybackContextValue {
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  progress: number;
  seekToFraction: (fraction: number) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const currentSurahId = usePlayerStore((s) => s.currentSurahId);
  const reciter = usePlayerStore((s) => s.reciter());
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const repeat = usePlayerStore((s) => s.repeat);

  const uri = currentSurahId ? surahAudioUrl(reciter, currentSurahId) : null;
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);

  const loadedUriRef = useRef<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
  }, []);

  useEffect(() => {
    if (!uri || loadedUriRef.current === uri) return;
    loadedUriRef.current = uri;
    player.replace({ uri });
    const surah = currentSurahId ? getSurah(currentSurahId) : undefined;
    if (surah) {
      player.setActiveForLockScreen(true, {
        title: surah.english,
        artist: reciter.name,
        albumTitle: 'Tilawah',
      });
    }
    if (isPlaying) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  useEffect(() => {
    if (!uri) return;
    if (isPlaying && !status.playing) player.play();
    if (!isPlaying && status.playing) player.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, uri]);

  useEffect(() => {
    // AudioPlayer is an imperative native handle (like a <video> ref); setting
    // its documented properties directly is expo-audio's intended API, not a
    // violation of hook-return immutability.
    // eslint-disable-next-line react-hooks/immutability
    player.loop = repeat;
  }, [player, repeat]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      currentTime: status.currentTime,
      duration: status.duration,
      isBuffering: status.isBuffering,
      progress: status.duration > 0 ? status.currentTime / status.duration : 0,
      seekToFraction: (fraction) => {
        if (status.duration > 0) player.seekTo(fraction * status.duration);
      },
    }),
    [status.currentTime, status.duration, status.isBuffering, player]
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider');
  return ctx;
}

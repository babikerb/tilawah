import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
  preload,
  clearAllPreloadedSources,
} from 'expo-audio';
import { usePlayerStore } from '../store/usePlayerStore';
import { getSurah } from '../data/surahs';
import { fetchSurahAyahs } from './quranApi';
import type { Ayah } from '../data/types';

interface PlaybackContextValue {
  ayahs: Ayah[];
  ayahIndex: number;
  setAyahIndex: (index: number) => void;
  loading: boolean;
  error: string | null;
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
  const setPlaying = usePlayerStore((s) => s.setPlaying);

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [ayahIndex, setAyahIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const uri = ayahs[ayahIndex]?.audioUrl || null;
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);

  const loadedUriRef = useRef<string | null>(null);
  const lastSurahIdRef = useRef<number | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
  }, []);

  // Fetch ayah text + this reciter's per-ayah audio whenever the surah or
  // reciter changes. A surah change resets to ayah 1; a reciter change on
  // the same surah keeps the current ayah (just reloads its audio source).
  useEffect(() => {
    if (!currentSurahId) return;
    const isNewSurah = lastSurahIdRef.current !== currentSurahId;
    lastSurahIdRef.current = currentSurahId;
    let cancelled = false;
    // Resetting fetch state for the newly-selected surah/reciter before the
    // request resolves is intentional here, not a synchronization bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    if (isNewSurah) setAyahIndex(0);
    fetchSurahAyahs(currentSurahId, reciter.edition)
      .then((data) => {
        if (cancelled) return;
        setAyahs(data);
        setAyahIndex((i) => (isNewSurah ? 0 : Math.min(i, data.length - 1)));
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this surah. Check your connection.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSurahId, reciter.edition]);

  // Preload every ayah's audio for the whole surah as soon as it loads, so
  // advancing between ayahs has no network gap. Sequential (not parallel) so
  // a long surah doesn't fire hundreds of simultaneous downloads at once —
  // it still finishes well ahead of playback reaching later ayahs.
  useEffect(() => {
    if (ayahs.length === 0) return;
    let cancelled = false;
    clearAllPreloadedSources().catch(() => {});
    (async () => {
      for (const ayah of ayahs) {
        if (cancelled || !ayah.audioUrl) continue;
        await preload({ uri: ayah.audioUrl }).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ayahs]);

  // Load the current ayah's audio source whenever it changes, and carry
  // playback intent (keep playing if we were already playing).
  useEffect(() => {
    if (!uri || loadedUriRef.current === uri) return;
    loadedUriRef.current = uri;
    player.replace({ uri });
    const surah = currentSurahId ? getSurah(currentSurahId) : undefined;
    const ayah = ayahs[ayahIndex];
    if (surah && ayah) {
      player.setActiveForLockScreen(true, {
        title: `${surah.english} · Ayah ${ayah.numberInSurah}`,
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

  // Auto-advance to the next ayah when the current clip finishes; loop back
  // to the first ayah if repeat is on, otherwise stop at the end of the surah.
  useEffect(() => {
    if (!status.didJustFinish) return;
    // Reacting to the audio player (an external system) finishing a clip,
    // not synchronizing React state with itself.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (ayahIndex < ayahs.length - 1) {
      setAyahIndex(ayahIndex + 1);
    } else if (repeat) {
      setAyahIndex(0);
    } else {
      setPlaying(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      ayahs,
      ayahIndex,
      setAyahIndex,
      loading,
      error,
      currentTime: status.currentTime,
      duration: status.duration,
      isBuffering: status.isBuffering,
      progress: status.duration > 0 ? status.currentTime / status.duration : 0,
      seekToFraction: (fraction) => {
        if (status.duration > 0) player.seekTo(fraction * status.duration);
      },
    }),
    [ayahs, ayahIndex, loading, error, status.currentTime, status.duration, status.isBuffering, player]
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider');
  return ctx;
}

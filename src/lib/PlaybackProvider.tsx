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
import { fetchWordTiming, type WordSegment } from './wordTiming';
import type { Ayah } from '../data/types';

/** بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ — always exactly 4 words. */
const BISMILLAH_WORD_COUNT = 4;

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
  /** [wordIndexStart, wordIndexEnd) currently being recited, or null when
   * word-timing isn't available for this reciter/ayah. */
  activeWordRange: [number, number] | null;
  /** How many leading words of the current ayah's text are the Bismillah,
   * for display purposes (rendering it as its own line above the ayah
   * proper). 0 when not applicable (Al-Fatihah ayah 1 *is* the Bismillah;
   * At-Tawbah has none) or when word-timing can't confirm a clean boundary
   * (e.g. the "disjointed letter" surah openings, which the alignment
   * tool couldn't separate into words at all). Always 4 or 0 — never a
   * guess at a fuzzy split. */
  bismillahWordCount: number;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const currentSurahId = usePlayerStore((s) => s.currentSurahId);
  const reciter = usePlayerStore((s) => s.reciter());
  const reciterId = usePlayerStore((s) => s.reciterId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setReciter = usePlayerStore((s) => s.setReciter);

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [ayahIndex, setAyahIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordTimingBySurah, setWordTimingBySurah] = useState<Map<number, WordSegment[]> | null>(null);

  const uri = ayahs[ayahIndex]?.audioUrl || null;
  const player = useAudioPlayer(uri ? { uri } : null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  const loadedUriRef = useRef<string | null>(null);
  const lastSurahIdRef = useRef<number | null>(null);
  const lastGoodReciterIdRef = useRef<string>(reciterId);

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
  //
  // Switching reciters mid-playback must be graceful: the old reciter's
  // audio and ayah text stay on screen and keep playing uninterrupted until
  // the new data is ready, and a failed switch reverts the store's
  // reciterId (so the reciter sheet doesn't show a selection that never
  // actually loaded) instead of surfacing a scary error over content that's
  // still playing fine.
  useEffect(() => {
    if (!currentSurahId) return;
    const isNewSurah = lastSurahIdRef.current !== currentSurahId;
    const hasFallbackContent = !isNewSurah && ayahs.length > 0;
    lastSurahIdRef.current = currentSurahId;
    let cancelled = false;
    // Only show the blocking loading state when there's nothing to fall
    // back on (first-ever load of a surah); a reciter switch loads quietly
    // in the background while the previous reciter keeps playing.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!hasFallbackContent) setLoading(true);
    setError(null);
    if (isNewSurah) setAyahIndex(0);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchSurahAyahs(currentSurahId, reciter.edition)
      .then((data) => {
        if (cancelled) return;
        lastGoodReciterIdRef.current = reciter.id;
        setAyahs(data);
        setAyahIndex((i) => (isNewSurah ? 0 : Math.min(i, data.length - 1)));
      })
      .catch(() => {
        if (cancelled) return;
        if (hasFallbackContent) {
          // Revert the store selection to the reciter that's still actually
          // playing, rather than leaving it pointed at a broken one.
          setReciter(lastGoodReciterIdRef.current);
        } else {
          setError('Could not load this surah. Check your connection.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSurahId, reciter.edition]);

  // Word-level highlighting is only available for a subset of reciters
  // (verified audio-identical to the source the timing data was aligned
  // against — see wordTiming.ts). A miss here just means no highlighting;
  // it never blocks or errors the surrounding ayah/audio experience.
  useEffect(() => {
    if (!currentSurahId) return;
    let cancelled = false;
    // Resetting to "no highlighting yet" for the newly-selected surah/reciter
    // before the request resolves is intentional, not a synchronization bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWordTimingBySurah(null);
    fetchWordTiming(currentSurahId, reciter.edition).then((data) => {
      if (!cancelled) setWordTimingBySurah(data);
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

  // When a clip finishes: "ayah" repeat replays the same ayah forever
  // (doesn't advance — for memorization/drilling one verse); "surah" repeat
  // advances normally and loops back to ayah 1 at the end; "off" advances
  // normally and stops at the end of the surah.
  useEffect(() => {
    if (!status.didJustFinish) return;
    // Reacting to the audio player (an external system) finishing a clip,
    // not synchronizing React state with itself.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (repeatMode === 'ayah') {
      player.seekTo(0);
      player.play();
    } else if (ayahIndex < ayahs.length - 1) {
      setAyahIndex(ayahIndex + 1);
    } else if (repeatMode === 'surah') {
      setAyahIndex(0);
    } else {
      setPlaying(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  const activeWordRange = useMemo<[number, number] | null>(() => {
    const ayah = ayahs[ayahIndex];
    const segments = ayah ? wordTimingBySurah?.get(ayah.numberInSurah) : undefined;
    if (!segments) return null;
    const ms = status.currentTime * 1000;
    const segment = segments.find(([, , start, end]) => ms >= start && ms <= end);
    return segment ? [segment[0], segment[1]] : null;
  }, [ayahs, ayahIndex, wordTimingBySurah, status.currentTime]);

  // Bismillah is baked into ayah 1's text/audio for every surah except
  // Al-Fatihah (where ayah 1 *is* the Bismillah, standalone) and At-Tawbah
  // (which has none). Splitting it out for display only when the
  // word-timing data proves a clean boundary exists — some ayahs (notably
  // the ~29 surahs opening with disjointed letters, e.g. Al-Baqarah's
  // "الٓمٓ") collapse into one alignment blob with no internal word
  // boundaries at all, so a split there would be a guess, not a fact.
  const bismillahWordCount = useMemo<number>(() => {
    const ayah = ayahs[ayahIndex];
    if (!currentSurahId || currentSurahId === 1 || currentSurahId === 9) return 0;
    if (!ayah || ayah.numberInSurah !== 1) return 0;
    const segments = wordTimingBySurah?.get(1);
    if (!segments) return 0;
    const spansAcrossBoundary = segments.some(
      ([start, end]) => start < BISMILLAH_WORD_COUNT && end > BISMILLAH_WORD_COUNT
    );
    if (spansAcrossBoundary) return 0;
    const hasCleanBoundary = segments.some(([, end]) => end === BISMILLAH_WORD_COUNT);
    return hasCleanBoundary ? BISMILLAH_WORD_COUNT : 0;
  }, [currentSurahId, ayahs, ayahIndex, wordTimingBySurah]);

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
      activeWordRange,
      bismillahWordCount,
    }),
    [
      ayahs,
      ayahIndex,
      loading,
      error,
      status.currentTime,
      status.duration,
      status.isBuffering,
      player,
      activeWordRange,
      bismillahWordCount,
    ]
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider');
  return ctx;
}

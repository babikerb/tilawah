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

/**
 * iOS's shared media server (`mediaserverd`) can crash and restart under
 * memory/CPU pressure — expo-audio's own `AudioStatus.mediaServicesDidReset`
 * field documents this exact scenario ("the player was interrupted because
 * the system's media daemon crashed"), and the native side already tries to
 * recover automatically when it happens. But that recovery isn't
 * instantaneous, and any native audio call we make from JS during that brief
 * window throws a raw, generic error ("Server was dead when activation
 * request was made") instead of waiting for it — busiest exactly when we're
 * driving playback hardest (rapid ayah/reciter switching, preloading). It's
 * a transient condition, not a real failure of the call itself, so retrying
 * after a short, backing-off delay rides it out instead of dropping the call
 * (or, before these call sites were guarded, crashing the app).
 */
function callNativeWithRetry(fn: () => void, label: string, maxAttempts = 4): Promise<boolean> {
  return new Promise((resolve) => {
    const attempt = (n: number) => {
      try {
        fn();
        resolve(true);
      } catch (err) {
        if (n >= maxAttempts) {
          console.error(`[PlaybackProvider] ${label} failed after ${n} attempts`, err);
          resolve(false);
          return;
        }
        setTimeout(() => attempt(n + 1), 250 * 2 ** (n - 1));
      }
    };
    attempt(1);
  });
}

interface BismillahBoundary {
  /** Millisecond position, within ayah 1's own audio file, where the
   * surah's real first word begins (the embedded Bismillah is everything
   * before this). */
  startMs: number;
}

interface BismillahClip {
  audioUrl: string;
  /** This reciter's Al-Fatihah-ayah-1 word segments, reused as the
   * Bismillah clip's own highlighting — it's a real, independent recitation
   * of exactly this phrase, not a guess. */
  segments: WordSegment[] | null;
}

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
  const [bismillahClip, setBismillahClip] = useState<BismillahClip | null>(null);
  // "We're done with the separate Bismillah clip for this visit to ayah 1"
  // — true once it's been played through, or once we've committed to the
  // fallback (ayah 1's own combined file) because the clip/boundary data
  // wasn't ready in time. Reset whenever we arrive at ayah 1 fresh.
  const [bismillahBypassed, setBismillahBypassed] = useState(false);

  // Bismillah is baked into ayah 1's text/audio for every surah except
  // Al-Fatihah (where ayah 1 *is* the Bismillah, standalone) and At-Tawbah
  // (which has none). Only trust a split when the word-timing data proves a
  // clean boundary — some ayahs (notably the ~29 surahs opening with
  // disjointed letters, e.g. Al-Baqarah's "الٓمٓ") collapse into one
  // alignment blob with no internal word boundaries at all, so a split
  // there would be a guess, not a fact.
  const bismillahBoundary = useMemo<BismillahBoundary | null>(() => {
    if (!currentSurahId || currentSurahId === 1 || currentSurahId === 9) return null;
    const segments = wordTimingBySurah?.get(1);
    if (!segments) return null;
    const spansAcrossBoundary = segments.some(
      ([start, end]) => start < BISMILLAH_WORD_COUNT && end > BISMILLAH_WORD_COUNT
    );
    if (spansAcrossBoundary) return null;
    // Anchor on the first *real* word's own start time, not the Bismillah's
    // last word's end time — if that end timestamp ran long in the
    // alignment data (overlapping the next word), seeking there would cut
    // into the ayah's real content. The next segment's own start is a
    // second, independent marker from the same data that can't be thrown
    // off by the previous word's timing being off.
    const firstRealWordSegment = segments.find(([start]) => start === BISMILLAH_WORD_COUNT);
    return firstRealWordSegment ? { startMs: firstRealWordSegment[2] } : null;
  }, [currentSurahId, wordTimingBySurah]);

  // Only ayah 1 itself embeds the Bismillah — every other ayah's own first
  // few words are just its own text, not a Bismillah to split out.
  const bismillahWordCount = ayahIndex === 0 && bismillahBoundary ? BISMILLAH_WORD_COUNT : 0;

  // Play the Bismillah as its own clip (not the copy embedded in ayah 1's
  // file) whenever we're freshly at ayah 1 of an eligible surah and haven't
  // already gotten through it this visit.
  const bismillahPhase = ayahIndex === 0 && !bismillahBypassed && !!bismillahBoundary && !!bismillahClip;
  // Once bypassed, ayah 1's own file needs to start past its embedded
  // Bismillah (already heard via the separate clip) instead of replaying it.
  const skipOffsetSec =
    ayahIndex === 0 && bismillahBypassed && bismillahBoundary ? bismillahBoundary.startMs / 1000 : 0;

  const uri = (bismillahPhase ? bismillahClip?.audioUrl : ayahs[ayahIndex]?.audioUrl) || null;
  // Passing a changing `{ uri }` object here (instead of a stable initial
  // value) would make the hook itself recreate — release and reconstruct —
  // the underlying native player on every ayah/Bismillah change, racing our
  // own `player.replace()` call below (two independent source-swap
  // mechanisms fighting over the same transition). That's a real
  // use-after-release crash risk on the native side, worse for slower/larger
  // loads — which is exactly the Bismillah-clip-to-ayah-1 handoff, since
  // that's always a real cross-file switch. `null` here plus exclusively
  // using `.replace()` in an effect is Expo's own documented pattern for
  // this (see the `downloadFirst` example in the expo-audio docs).
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  const loadedUriRef = useRef<string | null>(null);
  const lastSurahIdRef = useRef<number | null>(null);
  const lastGoodReciterIdRef = useRef<string>(reciterId);
  const prevAyahIndexForBismillahRef = useRef<number>(-1);

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

  // The Bismillah clip is just this reciter's Al-Fatihah ayah 1 — a real
  // recording, reusable across every surah, so it's fetched once per
  // reciter (not per surah) and cached here for reuse.
  useEffect(() => {
    let cancelled = false;
    // Resetting to "no clip yet" for the newly-selected reciter before the
    // request resolves is intentional, not a synchronization bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBismillahClip(null);
    Promise.all([fetchSurahAyahs(1, reciter.edition), fetchWordTiming(1, reciter.edition)])
      .then(([fatihahAyahs, fatihahTiming]) => {
        if (cancelled) return;
        const bismillahAyah = fatihahAyahs[0];
        if (!bismillahAyah?.audioUrl) return;
        setBismillahClip({
          audioUrl: bismillahAyah.audioUrl,
          segments: fatihahTiming?.get(1) ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reciter.edition]);

  // Fresh arrival at ayah 1 (new surah, or looped back around via repeat
  // surah) should offer the Bismillah again, if eligible.
  useEffect(() => {
    if (prevAyahIndexForBismillahRef.current !== ayahIndex && ayahIndex === 0) {
      setBismillahBypassed(false);
    }
    prevAyahIndexForBismillahRef.current = ayahIndex;
  }, [ayahIndex]);

  // Preload every ayah's audio for the whole surah as soon as it loads, so
  // advancing between ayahs has no network gap. Sequential (not parallel) so
  // a long surah doesn't fire hundreds of simultaneous downloads at once —
  // it still finishes well ahead of playback reaching later ayahs.
  //
  // The ayah/clip about to actually play right now is deliberately skipped:
  // `.replace()` (in the load-current-uri effect below) and `preload()` both
  // manipulate the *same* native preloaded-source registry for a given URL —
  // `.replace()` will pull a matching in-flight preload's item straight out
  // from under it. Racing that against our own live playback call for the
  // one URL with the least lead time before being needed (right after the
  // Bismillah clip, often just seconds) is exactly what caused a real native
  // crash ("Exception in HostFunction: player.replace(...)") on ayah 1 of
  // some surahs. Every other ayah has the entire preceding ayahs' worth of
  // playback time as a safety margin, so this only costs the "zero gap"
  // optimization for the very first ayah/clip of a freshly-started surah.
  useEffect(() => {
    if (ayahs.length === 0) return;
    let cancelled = false;
    clearAllPreloadedSources().catch(() => {});
    const activeIndex = ayahIndex;
    (async () => {
      if (bismillahClip?.audioUrl && activeIndex !== 0) {
        await preload({ uri: bismillahClip.audioUrl }).catch(() => {});
      }
      for (let i = 0; i < ayahs.length; i++) {
        if (cancelled) break;
        if (i === activeIndex) continue;
        const ayah = ayahs[i];
        if (!ayah.audioUrl) continue;
        await preload({ uri: ayah.audioUrl }).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
    // bismillahClip is intentionally excluded: it's reciter-scoped (doesn't
    // change per surah) and preloading it once here per surah load is
    // already redundant-but-harmless; re-running this whole surah preload
    // queue every time the clip reference happens to update isn't needed.
    // ayahIndex is intentionally excluded too: it's only read once, as a
    // snapshot of "which ayah is about to play" for this surah's preload
    // sweep — it shouldn't restart the whole sweep on every ayah change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayahs]);

  // Load the current audio source (the Bismillah clip, or an ayah) whenever
  // it changes, and carry playback intent (keep playing if we were already
  // playing). Ayah 1 played after the Bismillah clip has already run seeks
  // straight past its own embedded copy of it. Every native call here goes
  // through callNativeWithRetry — see its comment for why (transient
  // media-server hiccups, not real failures).
  useEffect(() => {
    if (!uri || loadedUriRef.current === uri) return;
    loadedUriRef.current = uri;
    let cancelled = false;

    (async () => {
      const replaced = await callNativeWithRetry(() => player.replace({ uri }), 'replace');
      if (cancelled) return;
      if (!replaced) {
        // Retries exhausted — reset loadedUriRef so a later change (retry,
        // reciter switch, next ayah) gets a fresh attempt instead of being
        // permanently stuck thinking this uri already "loaded".
        loadedUriRef.current = null;
        // Reacting to a native module giving up (an external system
        // failing), not synchronizing React state with itself.
        setError('Could not play this audio. Try again or switch reciters.');
        return;
      }

      const surah = currentSurahId ? getSurah(currentSurahId) : undefined;
      const ayah = ayahs[ayahIndex];
      if (surah && ayah) {
        callNativeWithRetry(
          () =>
            player.setActiveForLockScreen(true, {
              title: bismillahPhase ? `${surah.english} · Bismillah` : `${surah.english} · Ayah ${ayah.numberInSurah}`,
              artist: reciter.name,
              albumTitle: 'Tilawah',
            }),
          'setActiveForLockScreen'
        );
      }
      if (isPlaying) callNativeWithRetry(() => player.play(), 'play');
      if (skipOffsetSec > 0) {
        // `replace()` kicks off an async native load and returns immediately
        // — calling `seekTo()` right after it races that load and can
        // silently no-op, leaving playback (and the word highlighting
        // driven off currentTime) stuck at the start of ayah 1's own file
        // instead of past its embedded Bismillah. `player.isLoaded` is a
        // live native property (unlike the hook's `status`, which only
        // refreshes every `updateInterval`), so poll it directly and seek
        // the instant it's true.
        const waitAndSeek = () => {
          if (cancelled) return;
          let loaded = false;
          try {
            loaded = player.isLoaded;
          } catch {
            // Same transient media-server condition — just try again shortly.
          }
          if (loaded) {
            callNativeWithRetry(() => player.seekTo(skipOffsetSec), 'seekTo (Bismillah skip)');
          } else {
            setTimeout(waitAndSeek, 20);
          }
        };
        waitAndSeek();
      }
    })();

    // Loading ayah 1's own file while not in Bismillah phase means we've
    // committed to this path for the current visit — lock out a late
    // Bismillah-data arrival from yanking playback back to the clip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!bismillahPhase && ayahIndex === 0) setBismillahBypassed(true);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  useEffect(() => {
    if (!uri) return;
    if (isPlaying && !status.playing) callNativeWithRetry(() => player.play(), 'play');
    if (!isPlaying && status.playing) callNativeWithRetry(() => player.pause(), 'pause');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, uri]);

  // When a clip finishes: the Bismillah clip hands off to ayah 1 proper
  // (which will seek past its own embedded Bismillah, per skipOffsetSec).
  // Otherwise: "ayah" repeat replays the same ayah forever (doesn't
  // advance — for memorization/drilling one verse), from skipOffsetSec
  // rather than 0 so it doesn't replay the embedded Bismillah either;
  // "surah" repeat advances normally and loops back to ayah 1 (Bismillah
  // and all) at the end; "off" advances normally and stops at the end.
  useEffect(() => {
    if (!status.didJustFinish) return;
    // Reacting to the audio player (an external system) finishing a clip,
    // not synchronizing React state with itself.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (bismillahPhase) {
      setBismillahBypassed(true);
    } else if (repeatMode === 'ayah') {
      callNativeWithRetry(() => player.seekTo(skipOffsetSec), 'seekTo (ayah repeat)').then((seeked) => {
        if (seeked) callNativeWithRetry(() => player.play(), 'play (ayah repeat)');
      });
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
    // Guard against bleed-over when switching sources: `uri` updates the
    // instant ayahIndex/phase changes, but `status` (currentTime included)
    // still reflects the *previous* clip until the player.replace() effect
    // above has actually run and the new source's status has propagated.
    // Without this check, a leftover currentTime from the old source can
    // coincidentally fall inside a valid segment range for the *new* one's
    // totally different word timing, highlighting the wrong word for a
    // moment. loadedUriRef only catches up to `uri` once that effect has
    // run, so this correctly reads as "not ready yet" right after a switch.
    if (loadedUriRef.current !== uri) return null;
    const ms = status.currentTime * 1000;
    if (bismillahPhase) {
      const segments = bismillahClip?.segments;
      if (!segments) return null;
      const segment = segments.find(([, , start, end]) => ms >= start && ms <= end);
      return segment ? [segment[0], segment[1]] : null;
    }
    const ayah = ayahs[ayahIndex];
    const segments = ayah ? wordTimingBySurah?.get(ayah.numberInSurah) : undefined;
    if (!segments) return null;
    const segment = segments.find(([, , start, end]) => ms >= start && ms <= end);
    return segment ? [segment[0], segment[1]] : null;
  }, [ayahs, ayahIndex, wordTimingBySurah, status.currentTime, uri, bismillahPhase, bismillahClip]);

  const value = useMemo<PlaybackContextValue>(() => {
    const displayDuration = Math.max(0, status.duration - skipOffsetSec);
    const displayCurrentTime = Math.max(0, status.currentTime - skipOffsetSec);
    return {
      ayahs,
      ayahIndex,
      setAyahIndex,
      loading,
      error,
      currentTime: displayCurrentTime,
      duration: displayDuration,
      isBuffering: status.isBuffering,
      progress: displayDuration > 0 ? displayCurrentTime / displayDuration : 0,
      seekToFraction: (fraction) => {
        if (displayDuration > 0) {
          callNativeWithRetry(() => player.seekTo(skipOffsetSec + fraction * displayDuration), 'seekTo (scrub)');
        }
      },
      activeWordRange,
      bismillahWordCount,
    };
  }, [
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
    skipOffsetSec,
  ]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider');
  return ctx;
}

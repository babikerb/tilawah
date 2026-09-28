import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
  preload,
  clearAllPreloadedSources,
  type AudioPlayer,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStore } from '../store/usePlayerStore';
import { getSurah } from '../data/surahs';
import { fetchSurahAyahs } from './quranApi';
import { fetchWordTiming, type WordSegment } from './wordTiming';
import type { Ayah } from '../data/types';

/** بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ — always exactly 4 words. */
const BISMILLAH_WORD_COUNT = 4;

const BISMILLAH_CACHE_PREFIX = 'tilawah:bismillah:';

/** Each reciter's Bismillah clip is the exact same recording (their own
 * Al-Fatihah ayah 1) on every surah, so it's persisted once fetched —
 * later app launches get it instantly instead of racing a fresh network
 * request against the surah's own ayahs loading. */
async function loadCachedBismillahClip(edition: string): Promise<{ audioUrl: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(BISMILLAH_CACHE_PREFIX + edition);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { audioUrl?: string };
    return parsed.audioUrl ? { audioUrl: parsed.audioUrl } : null;
  } catch {
    return null;
  }
}

function saveCachedBismillahClip(edition: string, clip: { audioUrl: string }): void {
  AsyncStorage.setItem(BISMILLAH_CACHE_PREFIX + edition, JSON.stringify(clip)).catch(() => {});
}

interface RetryOptions {
  /** Checked before every attempt (including the first) and again before
   * each retry's backoff fires; returning true abandons the call with no
   * further native calls. Without this, a retry loop for a uri that's
   * since been superseded (e.g. the user swapped surahs again mid-retry)
   * keeps calling into the native player regardless — a real source of
   * concurrent/overlapping native calls on the same shared player object,
   * which is exactly the kind of contention that can throw ("Session
   * lookup failed") under rapid surah switching. */
  shouldAbort?: () => boolean;
  maxAttempts?: number;
}

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
function callNativeWithRetry(
  fn: () => void | Promise<void>,
  label: string,
  { shouldAbort, maxAttempts = 4 }: RetryOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const attempt = async (n: number) => {
      if (shouldAbort?.()) {
        resolve(false);
        return;
      }
      try {
        // Awaiting works uniformly whether fn() is sync (e.g. play()) or
        // returns a Promise (e.g. seekTo()) — for the latter, this also
        // makes sure we don't resolve (and let a caller proceed to, say,
        // play()) until the seek has actually landed, not just been issued.
        await fn();
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

/**
 * Wraps a play() attempt with one escalation step beyond plain retries: if
 * callNativeWithRetry's backoff still doesn't recover, the underlying
 * AVAudioSession's own bookkeeping may itself be stale (not just the one
 * command) — a persistent "Session lookup failed" error survived every
 * plain retry attempt in testing, and that phrasing points at the session
 * itself, not a one-off command glitch. Reactivating the audio mode
 * re-establishes the session before trying play() once more.
 */
async function playWithRecovery(player: AudioPlayer, shouldAbort?: () => boolean): Promise<void> {
  const ok = await callNativeWithRetry(() => player.play(), 'play', { shouldAbort });
  if (ok || shouldAbort?.()) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
  } catch {
    // Best-effort — still worth retrying play() below even if this itself
    // failed to report success.
  }
  await callNativeWithRetry(() => player.play(), 'play (after session reactivation)', { shouldAbort });
}

interface BismillahClip {
  audioUrl: string;
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
  /** How many leading words of the current ayah's *displayed text* are the
   * written Bismillah (hidden from the ayah text entirely — see
   * AyahCard). Always 4 for ayah 1 of any surah except Al-Fatihah (ayah 1
   * *is* the Bismillah) and At-Tawbah (which has none), otherwise 0. This
   * is a fact about the Uthmani text convention, not a guess: every other
   * surah's ayah 1 is written with the Bismillah prefixed. */
  bismillahWordCount: number;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const currentSurahId = usePlayerStore((s) => s.currentSurahId);
  const reciter = usePlayerStore((s) => s.reciter());
  const reciterId = usePlayerStore((s) => s.reciterId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const autoplayEnabled = usePlayerStore((s) => s.autoplayEnabled);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setReciter = usePlayerStore((s) => s.setReciter);
  const playSurah = usePlayerStore((s) => s.play);

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [ayahIndex, setAyahIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordTimingBySurah, setWordTimingBySurah] = useState<Map<number, WordSegment[]> | null>(null);
  const [bismillahClip, setBismillahClip] = useState<BismillahClip | null>(null);
  // "We're done with the separate Bismillah clip for this visit to ayah 1"
  // — true once it's been played through, or once we've committed to the
  // fallback (ayah 1's own file directly) because the clip wasn't ready in
  // time. Reset whenever we arrive at ayah 1 fresh.
  const [bismillahBypassed, setBismillahBypassed] = useState(false);
  // Bumped on every fresh arrival at ayah 1 (see the bypass-reset effect
  // below) so that a repeated Bismillah clip URL — the same file is reused
  // across every surah for a given reciter — still registers as a new
  // playback request instead of being mistaken for one already loaded.
  const [bismillahVisitId, setBismillahVisitId] = useState(0);

  // The written Bismillah prefixes ayah 1's *text* for every surah except
  // Al-Fatihah (where ayah 1 *is* the Bismillah, standalone) and At-Tawbah
  // (which has none) — a fact about the Uthmani text convention. This used
  // to also be treated as a fact about the *audio*, with word-timing data
  // used to find where an embedded Bismillah ends within ayah 1's own
  // audio file so it could be seeked past. That was wrong: verified by
  // duration (the actual per-ayah audio files run only as long as their
  // real word count implies, with no extra seconds for a spoken Bismillah)
  // — these per-ayah clips simply don't have one embedded, so seeking into
  // them was cutting real words off the start of the ayah instead of
  // skipping anything. Ayah 1's own audio now always plays from its own
  // start, in full; the Bismillah is heard only via the standalone clip.
  const bismillahEligible = !!currentSurahId && currentSurahId !== 1 && currentSurahId !== 9;
  const bismillahWordCount = ayahIndex === 0 && bismillahEligible ? BISMILLAH_WORD_COUNT : 0;

  // Play the Bismillah as its own clip whenever we're freshly at ayah 1 of
  // an eligible surah and haven't already gotten through it this visit.
  const bismillahPhase = ayahIndex === 0 && !bismillahBypassed && bismillahEligible && !!bismillahClip;
  // Eligible for a Bismillah clip that just hasn't loaded yet (and we
  // haven't given up waiting for it — see the grace-period effect below).
  // Falling straight through to ayah 1's own audio the instant its ayahs
  // happened to resolve before the clip did — two independent network
  // requests racing each other — meant the clip was often silently skipped
  // by pure timing luck instead of actually being unavailable.
  const waitingForBismillahClip = ayahIndex === 0 && bismillahEligible && !bismillahBypassed && !bismillahClip;
  // True for the whole window where ayah 1 hasn't started loading yet
  // because we're still deciding whether to play the Bismillah clip first
  // (playing it, or still waiting on it to load). Used below to hold the
  // rest-of-surah preload sweep off until that's settled — see its comment.
  const bismillahDecisionPending = ayahIndex === 0 && bismillahEligible && !bismillahBypassed;

  const uri = bismillahPhase
    ? bismillahClip?.audioUrl || null
    : waitingForBismillahClip
      ? null
      : ayahs[ayahIndex]?.audioUrl || null;
  // Identifies a single "playback request" for the load effect below and
  // the staleness guards keyed off it. Almost always just `uri` itself —
  // except the Bismillah clip is the exact same audioUrl across *every*
  // surah for a given reciter (it's the reciter's own Al-Fatihah ayah-1
  // recording, reused), so `uri` alone can't tell two different visits to
  // it apart. If a bismillah-eligible surah is swapped to again before the
  // previous one's clip naturally finished (or repeat-surah loops back to
  // it), `uri` recomputes to a string that's already equal to what's
  // currently loaded — React then sees no dependency change and never
  // re-fires the load effect at all, so the clip just keeps playing
  // whatever was left of the *previous* surah's instance instead of
  // restarting for this one. Folding in bismillahVisitId (bumped on every
  // fresh arrival at ayah 1 — see the bypass-reset effect) makes each visit
  // distinct even when the underlying file repeats.
  const requestKey = bismillahPhase ? `bismillah:${bismillahVisitId}` : uri;
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
  // 100ms was already once reduced from expo-audio's default for smoother
  // word-highlight transitions; dropped further here because the same
  // polled status is also how `didJustFinish` gets noticed (see the
  // didJustFinish effect below) — at 100ms, up to that long can pass
  // between an ayah's audio actually ending and this app finding out,
  // adding straight to the perceived gap before the next ayah starts.
  // keepAudioSessionActive matters specifically for lock-screen/Control
  // Center controls: without it, expo-audio's native pause() deactivates
  // the whole audio session (its default, since most apps don't need to
  // hold it open while paused). Deactivating tells iOS this app is done
  // with audio for now, which is exactly what makes the Now Playing widget
  // stop responding to remote play/pause after any app-initiated pause —
  // the session that would receive that command is no longer active. Real
  // media apps (Spotify included) keep the session alive through pauses
  // for this reason.
  const player = useAudioPlayer(null, { updateInterval: 35, keepAudioSessionActive: true });
  const status = useAudioPlayerStatus(player);

  // Keyed by requestKey, not raw uri — see the comment above requestKey's
  // definition for why the distinction matters (a repeated Bismillah clip
  // URL across surahs must still be treated as a new request).
  const loadedRequestKeyRef = useRef<string | null>(null);
  // The request we've *confirmed* genuinely loaded (via status.isLoaded), as
  // opposed to loadedRequestKeyRef which just tracks which request we've
  // committed to loading. Guards the didJustFinish handler below against a
  // stale "finished" signal bleeding over from the source that was just
  // replaced — see that effect's comment for why this matters.
  const finishArmedKeyRef = useRef<string | null>(null);
  const lastSurahIdRef = useRef<number | null>(null);
  const lastGoodReciterIdRef = useRef<string>(reciterId);
  const prevAyahIndexForBismillahRef = useRef<number>(-1);
  const prevSurahIdForBismillahRef = useRef<number | null>(null);

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
    if (isNewSurah) {
      setAyahIndex(0);
      // Leaving the previous surah's `ayahs` array sitting in state here
      // (as opposed to a reciter switch, where that's a deliberate graceful
      // fallback — see hasFallbackContent) is a real bug, not just stale
      // data: for the render where ayahIndex resets to 0 but this fetch
      // hasn't resolved yet, `uri` below falls through to
      // `ayahs[0]?.audioUrl` — which is the *previous* surah's own ayah-1
      // file, a real, validly-loadable URL, not the new surah's. The load
      // effect can't tell that apart from a deliberate "play ayah 1
      // directly" decision, so it commits to that stale file and locks in
      // `bismillahBypassed = true` for the new surah in the very same
      // render the bypass-reset effect below is trying to clear it —
      // permanently and silently skipping Bismillah. Clearing it to `[]`
      // here makes that render correctly resolve `uri` to `null` (nothing
      // to load yet) instead of a stale-but-valid file.
      setAyahs([]);
    }
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
  // reciter (not per surah) and cached here for reuse. It plays plainly in
  // the background before ayah 1, with no highlighting or word-tracking of
  // its own, so it needs only the audio URL — not word-timing data.
  //
  // Also checked against a persisted cache (see loadCachedBismillahClip)
  // first: fetching it fresh over the network races the target surah's own
  // ayahs loading, and if the ayahs happened to resolve first, ayah 1 would
  // commit to playing directly and permanently skip the Bismillah for that
  // visit (see the grace-period effect below) — purely by network timing
  // luck. A persisted clip sidesteps that race entirely on every launch
  // after the first.
  useEffect(() => {
    let cancelled = false;
    // Resetting to "no clip yet" for the newly-selected reciter before the
    // request resolves is intentional, not a synchronization bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBismillahClip(null);
    loadCachedBismillahClip(reciter.edition).then((cached) => {
      if (!cancelled && cached) setBismillahClip(cached);
    });
    fetchSurahAyahs(1, reciter.edition)
      .then((fatihahAyahs) => {
        if (cancelled) return;
        const bismillahAyah = fatihahAyahs[0];
        if (!bismillahAyah?.audioUrl) return;
        const clip = { audioUrl: bismillahAyah.audioUrl };
        setBismillahClip(clip);
        saveCachedBismillahClip(reciter.edition, clip);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reciter.edition]);

  // Fresh arrival at ayah 1 should offer the Bismillah again, if eligible —
  // whether that's a new surah (swapped from the home list, autoplay to the
  // next surah, etc.) or looping back around via repeat surah. A surah swap
  // needs its own check, not just "ayahIndex changed to 0": swapping to a
  // new surah while already sitting at ayahIndex 0 of the old one (e.g.
  // right at the start of a surah) left ayahIndex unchanged at 0 across the
  // swap, so the old "did ayahIndex just become 0" check never fired and
  // the new surah silently inherited whatever bypassed state the previous
  // surah had ended on.
  useEffect(() => {
    const surahChanged = prevSurahIdForBismillahRef.current !== currentSurahId;
    const ayahJustBecameZero = prevAyahIndexForBismillahRef.current !== ayahIndex && ayahIndex === 0;
    if (ayahIndex === 0 && (surahChanged || ayahJustBecameZero)) {
      setBismillahBypassed(false);
      setBismillahVisitId((v) => v + 1);
    }
    prevSurahIdForBismillahRef.current = currentSurahId;
    prevAyahIndexForBismillahRef.current = ayahIndex;
  }, [ayahIndex, currentSurahId]);

  // Give the Bismillah clip time to load before giving up and playing ayah
  // 1 directly — genuinely unavailable (fetch failed, or this reciter's
  // Al-Fatihah is missing audio) shouldn't mean silence forever. Generous
  // on purpose: the moment a surah's ayahs arrive, the preload effect below
  // starts a real sequential download of every one of its audio files —
  // for a long surah (e.g. Al-Mu'minun's 118 ayahs, An-Nur's 64) that's
  // meaningful concurrent network activity racing the Bismillah clip's own
  // small fetch for the same bandwidth on a real device, not just the fast,
  // uncontended network this was originally tuned against.
  useEffect(() => {
    if (!waitingForBismillahClip) return;
    const timer = setTimeout(() => {
      console.warn(
        '[PlaybackProvider] Gave up waiting for the Bismillah clip to load in time; playing ayah 1 without it.'
      );
      setBismillahBypassed(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [waitingForBismillahClip]);

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
  //
  // Held off entirely while bismillahDecisionPending: starting this sweep
  // the instant ayahs arrive (which can be *seconds* before the Bismillah
  // clip finishes playing) meant it spent that whole time sequentially
  // downloading ayah 2, ayah 3, etc., competing for bandwidth right up
  // until — and through — the exact moment ayah 1's own cold fetch needed
  // to start. That's what actually caused the long pause after Bismillah:
  // ayah 1 wasn't slow to fetch on its own, it was starved by this sweep
  // already being mid-download for other ayahs. Waiting for the Bismillah
  // question to be settled (played through, or bypassed) means this sweep
  // doesn't start until ayah 1's own fetch has already begun, giving that
  // fetch the network to itself for its own 800ms head start below instead
  // of arriving to a pipe already saturated by unrelated ayahs.
  useEffect(() => {
    if (ayahs.length === 0 || bismillahDecisionPending) return;
    let cancelled = false;
    clearAllPreloadedSources().catch(() => {});
    const activeIndex = ayahIndex;
    (async () => {
      // A brief head start before hammering the network with the rest of
      // this surah's audio downloads, so ayah 1's own fetch (already under
      // way by the time this runs — see above) isn't immediately joined by
      // this sweep's downloads competing for the same bandwidth. Kept
      // short on purpose: this sweep's very first target is ayah 2 (index
      // 1) — the one preloaded ayah with the *least* safety margin, since
      // it only has ayah 1's own (sometimes short, e.g. a disjointed-letter
      // opening) playback time as its buffer before it's needed. This used
      // to be 800ms, which was fine for the Bismillah-clip case this was
      // originally tuned for (several seconds of clip playback as a
      // buffer) but starved ayah 2's own preload on short first ayahs —
      // "ayah 2 sometimes takes forever to load" was this delay, not a
      // slow fetch.
      if (activeIndex === 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (cancelled) return;
      }
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
  }, [ayahs, bismillahDecisionPending]);

  // Load the current audio source (the Bismillah clip, or an ayah) whenever
  // it changes, and carry playback intent (keep playing if we were already
  // playing). Every native call here goes through callNativeWithRetry —
  // see its comment for why (transient media-server hiccups, not real
  // failures).
  useEffect(() => {
    if (!uri || loadedRequestKeyRef.current === requestKey) return;
    loadedRequestKeyRef.current = requestKey;
    // Not armed for a "finished" signal until we've actually confirmed this
    // request loaded (see the arming effect and the didJustFinish handler
    // below) — even if this exact request (e.g. a reused Bismillah clip) was
    // armed before, that confirmation was for a previous load and doesn't
    // carry over to this one.
    finishArmedKeyRef.current = null;
    let cancelled = false;

    (async () => {
      const replaced = await callNativeWithRetry(() => player.replace({ uri }), 'replace', {
        shouldAbort: () => cancelled,
      });
      if (cancelled) return;
      if (!replaced) {
        // Retries exhausted — reset loadedRequestKeyRef so a later change
        // (retry, reciter switch, next ayah) gets a fresh attempt instead of
        // being permanently stuck thinking this request already "loaded".
        loadedRequestKeyRef.current = null;
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
          'setActiveForLockScreen',
          { shouldAbort: () => cancelled }
        );
      }

      if (isPlaying) playWithRecovery(player, () => cancelled);
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
  }, [uri, requestKey]);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    if (isPlaying && !status.playing) playWithRecovery(player, () => cancelled);
    if (!isPlaying && status.playing) {
      callNativeWithRetry(() => player.pause(), 'pause', { shouldAbort: () => cancelled });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, uri]);

  // The lock screen / Control Center's play, pause, and toggle buttons (see
  // expo-audio's native MediaController) call directly into the native
  // player, entirely bypassing the `isPlaying` store state the effect above
  // uses to drive playback — so without this, pressing pause there left the
  // app still believing it was playing: the on-screen button stayed on
  // "pause", and the *next* tap anywhere touching isPlaying wouldn't do
  // what it visually promised (a "pause" tap while already externally
  // paused is a no-op; the tap after *that* would then unexpectedly
  // resume). This keeps the store in sync with reality whenever playback
  // state changes for a reason other than our own request. Guarded on
  // loadedRequestKeyRef matching so a stale `status.playing` reading from
  // the previous source mid-transition (see the same guard elsewhere in
  // this file) can't momentarily flip isPlaying off during a normal ayah
  // advance. Safe against feedback with the effect above: by the time this
  // runs, isPlaying and status.playing already agree, so that effect's own
  // conditions are both false on its next pass — no fight-back.
  useEffect(() => {
    if (!uri || loadedRequestKeyRef.current !== requestKey) return;
    if (status.playing !== isPlaying) setPlaying(status.playing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.playing, requestKey]);

  // Arms the current request for didJustFinish once we've actually confirmed
  // it loaded, rather than the instant we merely committed to loading it.
  useEffect(() => {
    if (loadedRequestKeyRef.current === requestKey && status.isLoaded) {
      finishArmedKeyRef.current = requestKey;
    }
  }, [requestKey, status.isLoaded]);

  // When a clip finishes: the Bismillah clip hands off to ayah 1 proper.
  // Otherwise: "ayah" repeat replays the same ayah forever (doesn't
  // advance — for memorization/drilling one verse); "surah" repeat advances
  // normally and loops back to ayah 1 (Bismillah and all) at the end; "off"
  // advances normally and, at the surah's last ayah, either autoplays the
  // next surah (if enabled and one exists) or stops.
  useEffect(() => {
    if (!status.didJustFinish) return;
    // Guards against a stale "finished" signal bleeding over from the
    // source that was just replaced (e.g. expo-audio not fully clearing a
    // completion notification when swapping the player's item) — without
    // this, that stale signal gets reprocessed against the *new* source's
    // (different) ayahIndex/bismillahPhase, e.g. the Bismillah clip
    // finishing correctly hands off to ayah 1, then an inherited stale
    // finish immediately advances past ayah 1 to ayah 2 without it ever
    // actually playing.
    if (finishArmedKeyRef.current !== requestKey) return;
    // Reacting to the audio player (an external system) finishing a clip,
    // not synchronizing React state with itself.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (bismillahPhase) {
      setBismillahBypassed(true);
    } else if (repeatMode === 'ayah') {
      const shouldAbort = () => loadedRequestKeyRef.current !== requestKey;
      callNativeWithRetry(() => player.seekTo(0), 'seekTo (ayah repeat)', { shouldAbort }).then((seeked) => {
        if (seeked) playWithRecovery(player, shouldAbort);
      });
    } else if (ayahIndex < ayahs.length - 1) {
      setAyahIndex(ayahIndex + 1);
    } else if (repeatMode === 'surah') {
      setAyahIndex(0);
    } else {
      const nextSurahId = currentSurahId ? currentSurahId + 1 : null;
      if (autoplayEnabled && nextSurahId && getSurah(nextSurahId)) {
        playSurah(nextSurahId);
      } else {
        setPlaying(false);
      }
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
    // moment. loadedRequestKeyRef only catches up to `requestKey` once that
    // effect has run, so this correctly reads as "not ready yet" right after
    // a switch.
    if (loadedRequestKeyRef.current !== requestKey) return null;
    // The Bismillah clip just plays plainly in the background — no
    // highlighting or word-tracking of its own.
    if (bismillahPhase) return null;
    const ms = status.currentTime * 1000;
    const ayah = ayahs[ayahIndex];
    const segments = ayah ? wordTimingBySurah?.get(ayah.numberInSurah) : undefined;
    if (!segments) return null;
    // The most recently *started* segment, not one that also still has to
    // contain `ms` within its own end — alignment data routinely has small
    // gaps between one word's end and the next word's start (more
    // noticeable after a slowly-spoken word), and requiring strict
    // containment meant the highlight blinked off for that gap. Once a
    // word's segment has started, it stays the active one — seamlessly
    // handing off the instant the next word's segment starts — right up
    // through the last word of the ayah, which now stays visible until the
    // ayah actually finishes instead of disappearing at its own nominal
    // end time.
    let segment: (typeof segments)[number] | null = null;
    for (const s of segments) {
      if (ms >= s[2] && (!segment || s[2] > segment[2])) segment = s;
    }
    if (!segment) {
      // Nothing has technically "started" yet — `ms` is still in a beat of
      // lead-in silence before the very first word's segment. Highlight
      // that first word anyway rather than showing nothing, so the
      // highlight is visible for the ayah's entire duration instead of
      // only appearing partway in.
      for (const s of segments) {
        if (!segment || s[2] < segment[2]) segment = s;
      }
    }
    if (!segment) return null;
    // The alignment data's word indices for ayah 1 start at 0 for its own
    // first *real* word (that data has no Bismillah in it at all — see the
    // note above bismillahEligible). The displayed ayahWords, though, start
    // at global index bismillahWordCount (AyahCard reserves the indices
    // before that for the hidden written Bismillah). Shifting by
    // bismillahWordCount lines the two back up; it's 0 for every ayah
    // except ayah 1, so this is a no-op everywhere else.
    return [segment[0] + bismillahWordCount, segment[1] + bismillahWordCount];
  }, [ayahs, ayahIndex, wordTimingBySurah, status.currentTime, requestKey, bismillahPhase, bismillahWordCount]);

  const value = useMemo<PlaybackContextValue>(() => {
    const duration = status.duration;
    const currentTime = status.currentTime;
    return {
      ayahs,
      ayahIndex,
      setAyahIndex,
      loading,
      error,
      currentTime,
      duration,
      isBuffering: status.isBuffering,
      progress: duration > 0 ? currentTime / duration : 0,
      seekToFraction: (fraction) => {
        if (duration > 0) {
          callNativeWithRetry(() => player.seekTo(fraction * duration), 'seekTo (scrub)', {
            shouldAbort: () => loadedRequestKeyRef.current !== requestKey,
          });
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
    requestKey,
  ]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider');
  return ctx;
}

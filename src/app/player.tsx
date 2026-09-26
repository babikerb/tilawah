import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { PaperBackground } from '../components/ui/PaperBackground';
import { StampButton } from '../components/ui/StampButton';
import { AyahCard } from '../components/player/AyahCard';
import { ProgressScrubber } from '../components/player/ProgressScrubber';
import { ReciterSheet } from '../components/reciter/ReciterSheet';
import { BackIcon, ChevronDownIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from '../components/ui/icons';
import { colors, fonts } from '../theme/tokens';
import { getSurah, juzLabel } from '../data/surahs';
import { fetchSurahAyahs } from '../lib/quranApi';
import { usePlayerStore } from '../store/usePlayerStore';
import { usePlayback } from '../lib/PlaybackProvider';
import type { Ayah } from '../data/types';

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  const currentSurahId = usePlayerStore((s) => s.currentSurahId);
  const reciter = usePlayerStore((s) => s.reciter());
  const reciterId = usePlayerStore((s) => s.reciterId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const repeat = usePlayerStore((s) => s.repeat);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat);
  const setReciter = usePlayerStore((s) => s.setReciter);

  const { currentTime, duration, progress, seekToFraction } = usePlayback();

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [ayahIndex, setAyahIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const surah = currentSurahId ? getSurah(currentSurahId) : undefined;

  useEffect(() => {
    if (!currentSurahId) {
      router.back();
    }
  }, [currentSurahId]);

  useEffect(() => {
    if (!currentSurahId) return;
    let cancelled = false;
    // Resetting fetch state for the newly-selected surah before the request
    // resolves is intentional here, not a synchronization bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setAyahIndex(0);
    fetchSurahAyahs(currentSurahId)
      .then((data) => {
        if (!cancelled) setAyahs(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load ayah text. Check your connection.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSurahId]);

  if (!surah) {
    return null;
  }

  return (
    <PaperBackground style={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <StampButton onPress={() => router.back()} size={42} gradient={[colors.tapeDark, colors.walnut]} accessibilityLabel="Back">
          <BackIcon />
        </StampButton>

        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.english} numberOfLines={1}>
              {surah.english}
            </Text>
            <Text style={styles.arabic} numberOfLines={1}>
              {surah.arabic}
            </Text>
          </View>
          <Text style={styles.meaning} numberOfLines={1}>
            {surah.meaning}
          </Text>
        </View>
      </View>

      <View style={styles.cardArea}>
        <AyahCard
          loading={loading}
          error={error}
          ayahs={ayahs}
          index={ayahIndex}
          onSelectIndex={setAyahIndex}
          juzText={juzLabel(surah.juz)}
          totalAyahs={surah.ayahs}
        />
      </View>

      <LinearGradient colors={[colors.tapeDark, colors.walnut]} style={[styles.controls, { paddingBottom: 28 + insets.bottom }]}>
        <View style={styles.progressBlock}>
          <ProgressScrubber progress={progress} onSeek={seekToFraction} />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.transport}>
          <StampButton
            onPress={() => setAyahIndex((i) => Math.max(0, i - 1))}
            size={58}
            gradient={[colors.tapeDark, colors.walnut]}
            accessibilityLabel="Previous ayah"
          >
            <PrevIcon />
          </StampButton>
          <StampButton
            onPress={togglePlay}
            size={74}
            gradient={[colors.mustard, colors.mustardDark]}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon size={22} color={colors.ink} /> : <PlayIcon size={22} color={colors.ink} />}
          </StampButton>
          <StampButton
            onPress={() => setAyahIndex((i) => Math.min(ayahs.length - 1, i + 1))}
            size={58}
            gradient={[colors.tapeDark, colors.walnut]}
            accessibilityLabel="Next ayah"
          >
            <NextIcon />
          </StampButton>
        </View>

        <View style={styles.bottomRow}>
          <Pressable onPress={toggleRepeat} style={styles.repeatButton} accessibilityRole="button" accessibilityLabel="Toggle repeat">
            <View style={styles.toggleTrack}>
              <View style={[styles.toggleThumb, repeat && styles.toggleThumbActive]} />
            </View>
            <Text style={[styles.repeatLabel, repeat && styles.repeatLabelActive]}>REPEAT</Text>
          </Pressable>

          <View style={styles.reciterBlock}>
            <Text style={styles.reciterLabel}>RECITER</Text>
            <Pressable onPress={() => sheetRef.current?.present()} style={styles.reciterButton}>
              <Text style={styles.reciterName}>{reciter.name}</Text>
              <ChevronDownIcon />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <ReciterSheet ref={sheetRef} selectedId={reciterId} onSelect={setReciter} />
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  english: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    flexShrink: 1,
  },
  arabic: {
    fontFamily: fonts.quran,
    fontSize: 20,
    color: colors.inkMid,
  },
  meaning: {
    fontFamily: fonts.serif,
    fontSize: 11,
    color: colors.inkMuted,
    fontStyle: 'italic',
    marginTop: 3,
  },
  cardArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  controls: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 3,
    borderTopColor: colors.ink,
  },
  progressBlock: {
    marginBottom: 14,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  timeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: 'rgba(237,224,181,0.30)',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 3,
    backgroundColor: colors.tapeBlack,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#4A3018',
    marginLeft: 3,
  },
  toggleThumbActive: {
    backgroundColor: colors.mustard,
    marginLeft: 25,
  },
  repeatLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(237,224,181,0.36)',
  },
  repeatLabelActive: {
    color: colors.mustard,
  },
  reciterBlock: {
    alignItems: 'flex-end',
    gap: 5,
  },
  reciterLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: 'rgba(237,224,181,0.38)',
    letterSpacing: 1.4,
  },
  reciterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#3A2510',
  },
  reciterName: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.cream,
    letterSpacing: 0.5,
  },
});

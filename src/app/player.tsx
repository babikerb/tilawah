import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { AppBackground } from '../components/ui/AppBackground';
import { SectionBox } from '../components/ui/SectionBox';
import { FlatIconButton } from '../components/ui/FlatIconButton';
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
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <FlatIconButton onPress={() => router.back()} size={36} accessibilityLabel="Back">
          <BackIcon size={16} color={colors.ink} />
        </FlatIconButton>

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
            {surah.meaning} · {reciter.name}
          </Text>
        </View>
      </View>

      <SectionBox title="AYAH" titleArabic="آية" style={styles.cardBox} noBodyPadding>
        <AyahCard
          loading={loading}
          error={error}
          ayahs={ayahs}
          index={ayahIndex}
          onSelectIndex={setAyahIndex}
          juzText={juzLabel(surah.juz)}
          totalAyahs={surah.ayahs}
        />
      </SectionBox>

      <View style={[styles.controls, { paddingBottom: 14 + insets.bottom }]}>
        <View style={styles.progressBlock}>
          <ProgressScrubber progress={progress} onSeek={seekToFraction} />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.transport}>
          <FlatIconButton
            onPress={() => setAyahIndex((i) => Math.max(0, i - 1))}
            size={40}
            accessibilityLabel="Previous ayah"
          >
            <PrevIcon size={16} color={colors.green} />
          </FlatIconButton>
          <FlatIconButton
            variant="filled"
            onPress={togglePlay}
            size={54}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon size={18} color={colors.white} /> : <PlayIcon size={18} color={colors.white} />}
          </FlatIconButton>
          <FlatIconButton
            onPress={() => setAyahIndex((i) => Math.min(ayahs.length - 1, i + 1))}
            size={40}
            accessibilityLabel="Next ayah"
          >
            <NextIcon size={16} color={colors.green} />
          </FlatIconButton>
        </View>

        <View style={styles.bottomRow}>
          <Pressable onPress={toggleRepeat} style={styles.repeatButton} accessibilityRole="button" accessibilityLabel="Toggle repeat">
            <View style={[styles.checkbox, repeat && styles.checkboxActive]}>
              {repeat && <View style={styles.checkboxDot} />}
            </View>
            <Text style={styles.repeatLabel}>Repeat</Text>
          </Pressable>

          <Pressable onPress={() => sheetRef.current?.present()} style={styles.reciterButton}>
            <Text style={styles.reciterLabel}>Reciter:</Text>
            <Text style={styles.reciterName}>{reciter.name}</Text>
            <ChevronDownIcon size={7} color={colors.inkMuted} />
          </Pressable>
        </View>
      </View>

      <ReciterSheet ref={sheetRef} selectedId={reciterId} onSelect={setReciter} />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.ink,
    flexShrink: 1,
  },
  arabic: {
    fontFamily: fonts.arabic,
    fontSize: 18,
    color: colors.ink,
  },
  meaning: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  cardBox: {
    flex: 1,
    marginBottom: 0,
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  progressBlock: {
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontFamily: fonts.ui,
    fontSize: 10,
    color: colors.inkMuted,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.green,
  },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: colors.green,
  },
  repeatLabel: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.ink,
  },
  reciterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reciterLabel: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkMuted,
  },
  reciterName: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.green,
  },
});

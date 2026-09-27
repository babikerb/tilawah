import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { AppBackground } from '../components/ui/AppBackground';
import { SectionBox } from '../components/ui/SectionBox';
import { FlatIconButton } from '../components/ui/FlatIconButton';
import { AyahCard } from '../components/player/AyahCard';
import { ProgressScrubber } from '../components/player/ProgressScrubber';
import { ReciterSheet } from '../components/reciter/ReciterSheet';
import { BackIcon, ChevronDownIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon } from '../components/ui/icons';
import { colors, fonts } from '../theme/tokens';
import { getSurah, juzLabel } from '../data/surahs';
import { usePlayerStore } from '../store/usePlayerStore';
import { usePlayback } from '../lib/PlaybackProvider';

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
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const autoplayEnabled = usePlayerStore((s) => s.autoplayEnabled);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode);
  const toggleAutoplay = usePlayerStore((s) => s.toggleAutoplay);
  const setReciter = usePlayerStore((s) => s.setReciter);

  const {
    ayahs,
    ayahIndex,
    setAyahIndex,
    loading,
    error,
    currentTime,
    duration,
    progress,
    seekToFraction,
    activeWordRange,
    bismillahWordCount,
  } = usePlayback();

  const surah = currentSurahId ? getSurah(currentSurahId) : undefined;

  useEffect(() => {
    if (!currentSurahId) {
      router.back();
    }
  }, [currentSurahId]);

  if (!surah) {
    return null;
  }

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
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
            {surah.meaning}
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
          activeWordRange={activeWordRange}
          bismillahWordCount={bismillahWordCount}
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
            onPress={() => setAyahIndex(Math.max(0, ayahIndex - 1))}
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
            onPress={() => setAyahIndex(Math.min(ayahs.length - 1, ayahIndex + 1))}
            size={40}
            accessibilityLabel="Next ayah"
          >
            <NextIcon size={16} color={colors.green} />
          </FlatIconButton>
        </View>

        <View style={styles.bottomRow}>
          <Pressable
            onPress={cycleRepeatMode}
            style={[styles.pillButton, repeatMode !== 'off' && styles.pillButtonActive]}
            accessibilityRole="button"
            accessibilityLabel={`Repeat: ${repeatMode}. Tap to change.`}
          >
            <RepeatIcon size={13} color={repeatMode !== 'off' ? colors.green : colors.inkMuted} />
            <Text style={[styles.pillLabel, repeatMode !== 'off' && styles.pillLabelActive]}>
              {repeatMode === 'off' ? 'Repeat: Off' : repeatMode === 'ayah' ? 'Repeat: Ayah' : 'Repeat: Surah'}
            </Text>
          </Pressable>

          <Pressable onPress={() => sheetRef.current?.present()} style={styles.reciterButton}>
            <Text style={styles.reciterLabel}>Reciter:</Text>
            <Text style={styles.reciterName}>{reciter.name}</Text>
            <ChevronDownIcon size={7} color={colors.inkMuted} />
          </Pressable>
        </View>

        <View style={styles.autoplayRow}>
          <Pressable
            onPress={toggleAutoplay}
            style={[styles.pillButton, autoplayEnabled && styles.pillButtonActive]}
            accessibilityRole="button"
            accessibilityLabel={`Autoplay next surah: ${autoplayEnabled ? 'on' : 'off'}. Tap to toggle.`}
          >
            <NextIcon size={13} color={autoplayEnabled ? colors.green : colors.inkMuted} />
            <Text style={[styles.pillLabel, autoplayEnabled && styles.pillLabelActive]}>
              {autoplayEnabled ? 'Autoplay: Next Surah' : 'Autoplay: Off'}
            </Text>
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
  autoplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillButtonActive: {
    backgroundColor: colors.greenLight,
    borderColor: colors.green,
  },
  pillLabel: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkMuted,
  },
  pillLabelActive: {
    fontFamily: fonts.uiMedium,
    color: colors.green,
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

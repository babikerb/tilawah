import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlatIconButton } from '../ui/FlatIconButton';
import { HeartIcon, PlayIcon } from '../ui/icons';
import { colors, fonts } from '../../theme/tokens';
import type { Surah } from '../../data/types';

interface SurahRowProps {
  surah: Surah;
  saved: boolean;
  onToggleSave: () => void;
  onPlay: () => void;
  striped: boolean;
}

export function SurahRow({ surah, saved, onToggleSave, onPlay, striped }: SurahRowProps) {
  return (
    <Pressable
      onPress={onPlay}
      accessibilityRole="button"
      accessibilityLabel={`Play ${surah.english}`}
      style={({ pressed }) => [styles.row, striped && styles.rowStriped, pressed && styles.rowPressed]}
    >
      <Text style={styles.number}>{surah.id}</Text>

      <View style={styles.names}>
        <View style={styles.topLine}>
          <Text style={styles.english}>{surah.english}</Text>
          <Text style={styles.arabic}>{surah.arabic}</Text>
        </View>
        <View style={styles.bottomLine}>
          <Text style={styles.meaning}>{surah.meaning}</Text>
          <Text style={styles.ayahs}>{surah.ayahs} ayahs</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <FlatIconButton size={30} onPress={onPlay} accessibilityLabel={`Play ${surah.english}`}>
          <PlayIcon size={11} color={colors.green} />
        </FlatIconButton>
        <FlatIconButton
          size={30}
          onPress={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          accessibilityLabel={saved ? 'Remove from saved' : 'Save surah'}
        >
          <HeartIcon size={13} filled={saved} color={colors.gold} />
        </FlatIconButton>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowStriped: {
    backgroundColor: colors.creamAlt,
  },
  rowPressed: {
    backgroundColor: colors.greenLight,
  },
  number: {
    width: 22,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.inkMuted,
  },
  names: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  english: {
    flexShrink: 1,
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.ink,
  },
  arabic: {
    fontFamily: fonts.arabic,
    fontSize: 17,
    color: colors.ink,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  meaning: {
    flexShrink: 1,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkMuted,
  },
  ayahs: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.inkMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
});

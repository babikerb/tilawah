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
      style={({ pressed }) => [
        styles.row,
        striped && styles.rowStriped,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.number}>{surah.id}</Text>

      <View style={styles.names}>
        <Text style={styles.english} numberOfLines={1}>
          {surah.english}
          <Text style={styles.meaning}> — {surah.meaning}</Text>
        </Text>
      </View>

      <Text style={styles.arabic} numberOfLines={1}>
        {surah.arabic}
      </Text>

      <Text style={styles.ayahs}>{surah.ayahs}</Text>

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
    minHeight: 44,
    paddingHorizontal: 10,
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
    width: 26,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'right',
  },
  names: {
    flex: 1,
    minWidth: 0,
  },
  english: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.ink,
  },
  meaning: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkMuted,
  },
  arabic: {
    fontFamily: fonts.arabic,
    fontSize: 16,
    color: colors.ink,
    marginHorizontal: 4,
  },
  ayahs: {
    width: 30,
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
});

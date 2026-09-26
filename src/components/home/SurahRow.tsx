import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HeartIcon } from '../ui/icons';
import { colors, fonts } from '../../theme/tokens';
import type { Surah } from '../../data/types';

interface SurahRowProps {
  surah: Surah;
  saved: boolean;
  onToggleSave: () => void;
  onPlay: () => void;
}

export function SurahRow({ surah, saved, onToggleSave, onPlay }: SurahRowProps) {
  return (
    <Pressable
      onPress={onPlay}
      accessibilityRole="button"
      accessibilityLabel={`Play ${surah.english}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.numberStamp}>
        <Text style={styles.numberText}>{String(surah.id).padStart(2, '0')}</Text>
      </View>

      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.english} numberOfLines={1}>
            {surah.english}
          </Text>
          <Text style={styles.arabic} numberOfLines={1}>
            {surah.arabic}
          </Text>
        </View>
        <View style={styles.subRow}>
          <Text style={styles.meaning} numberOfLines={1}>
            {surah.meaning}
          </Text>
          <Text style={styles.ayahCount}>{surah.ayahs} ayahs</Text>
        </View>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onToggleSave();
        }}
        hitSlop={8}
        style={styles.heartButton}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved' : 'Save surah'}
      >
        <HeartIcon size={16} filled={saved} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,17,8,0.09)',
  },
  rowPressed: {
    backgroundColor: 'rgba(26,17,8,0.05)',
  },
  numberStamp: {
    width: 34,
    height: 32,
    marginLeft: 16,
    marginRight: 12,
    borderRadius: 3,
    backgroundColor: 'rgba(26,17,8,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(26,17,8,0.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#5A4A32',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  english: {
    fontFamily: fonts.serifBold,
    fontSize: 14,
    color: colors.ink,
    flexShrink: 1,
  },
  arabic: {
    fontFamily: fonts.quran,
    fontSize: 15,
    color: colors.inkMid,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  meaning: {
    fontFamily: fonts.serif,
    fontSize: 11,
    color: colors.inkMuted,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  ayahCount: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: 'rgba(26,17,8,0.34)',
  },
  heartButton: {
    paddingVertical: 10,
    paddingLeft: 4,
    paddingRight: 14,
  },
});

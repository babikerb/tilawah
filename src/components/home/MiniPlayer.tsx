import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlatIconButton } from '../ui/FlatIconButton';
import { PauseIcon, PlayIcon } from '../ui/icons';
import { colors, fonts } from '../../theme/tokens';
import type { Reciter, Surah } from '../../data/types';

interface MiniPlayerProps {
  surah: Surah | null;
  reciter: Reciter;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpen: () => void;
}

export function MiniPlayer({ surah, reciter, isPlaying, onTogglePlay, onOpen }: MiniPlayerProps) {
  return (
    <Pressable
      onPress={onOpen}
      disabled={!surah}
      accessibilityRole="button"
      accessibilityLabel="Open now playing"
      style={styles.bar}
    >
      <View style={styles.info}>
        {surah ? (
          <Text style={styles.trackText} numberOfLines={1}>
            {surah.english} — {reciter.name}
          </Text>
        ) : (
          <Text style={styles.placeholder}>Select a surah to begin</Text>
        )}
      </View>

      <FlatIconButton
        variant="filled"
        size={34}
        onPress={(e) => {
          e.stopPropagation();
          if (surah) onTogglePlay();
        }}
        disabled={!surah}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        style={!surah && styles.disabled}
      >
        {isPlaying ? <PauseIcon size={12} color={colors.white} /> : <PlayIcon size={12} color={colors.white} />}
      </FlatIconButton>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: colors.greenDark,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  trackText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.white,
  },
  placeholder: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  disabled: {
    opacity: 0.4,
  },
});

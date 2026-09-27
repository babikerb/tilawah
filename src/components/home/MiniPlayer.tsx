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
  bottomInset?: number;
}

export function MiniPlayer({ surah, reciter, isPlaying, onTogglePlay, onOpen, bottomInset = 0 }: MiniPlayerProps) {
  return (
    <Pressable
      onPress={onOpen}
      disabled={!surah}
      accessibilityRole="button"
      accessibilityLabel="Open now playing"
      style={[styles.bar, { paddingBottom: 8 + bottomInset }]}
    >
      <View style={styles.info}>
        {surah ? (
          <>
            <Text style={styles.trackText} numberOfLines={1}>
              {surah.english}
            </Text>
            <Text style={styles.reciterText} numberOfLines={1}>
              {reciter.name}
            </Text>
          </>
        ) : (
          <Text style={styles.placeholder}>Select a surah to begin</Text>
        )}
      </View>

      <FlatIconButton
        size={36}
        onPress={(e) => {
          e.stopPropagation();
          if (surah) onTogglePlay();
        }}
        disabled={!surah}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        style={[styles.playButton, !surah && styles.disabled]}
      >
        {isPlaying ? <PauseIcon size={13} color={colors.greenDark} /> : <PlayIcon size={13} color={colors.greenDark} />}
      </FlatIconButton>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 12,
    backgroundColor: colors.green,
    borderTopWidth: 2,
    borderTopColor: colors.gold,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  trackText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: colors.white,
  },
  reciterText: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  placeholder: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  playButton: {
    backgroundColor: colors.goldLight,
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.4,
  },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VuBars } from './VuBars';
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
    <Pressable onPress={onOpen} disabled={!surah} accessibilityRole="button" accessibilityLabel="Open now playing">
      <LinearGradient colors={[colors.tapeDark, colors.walnut]} style={styles.bar}>
        <View style={styles.grille} />

        <View style={styles.info}>
          {surah ? (
            <Text style={styles.trackText} numberOfLines={1} ellipsizeMode="tail">
              {surah.english} · {reciter.name}
            </Text>
          ) : (
            <Text style={styles.placeholder}>SELECT A SURAH TO BEGIN</Text>
          )}
        </View>

        {surah && isPlaying && <VuBars active={isPlaying} />}

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (surah) onTogglePlay();
          }}
          disabled={!surah}
          style={styles.playButton}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <LinearGradient
            colors={surah ? [colors.mustard, colors.mustardDark] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)']}
            style={StyleSheet.absoluteFill}
          />
          {isPlaying ? (
            <PauseIcon size={13} color={colors.ink} />
          ) : (
            <PlayIcon size={13} color={surah ? colors.ink : 'rgba(237,224,181,0.35)'} />
          )}
        </Pressable>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    borderTopWidth: 3,
    borderTopColor: colors.ink,
  },
  grille: {
    width: 34,
    height: 34,
    borderRadius: 5,
    backgroundColor: colors.ink,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  trackText: {
    fontFamily: fonts.serifBold,
    fontSize: 13,
    color: colors.cream,
  },
  placeholder: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: 'rgba(237,224,181,0.30)',
    letterSpacing: 1,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

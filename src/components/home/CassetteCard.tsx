import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Reel } from './Reel';
import { PlayIcon } from '../ui/icons';
import { colors, fonts } from '../../theme/tokens';
import type { Reciter, Surah } from '../../data/types';

interface CassetteCardProps {
  surah: Surah;
  reciter: Reciter;
  sectionLabel: string;
  onPlay: () => void;
}

export function CassetteCard({ surah, reciter, sectionLabel, onPlay }: CassetteCardProps) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#6A4A28', '#3D2510', '#4A3018']}
        locations={[0, 0.58, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.deck}
      >
        <View style={styles.sheen}>
          <Text style={styles.sectionLabel}>{sectionLabel}</Text>
        </View>

        <View style={[styles.reelWrap, { left: 10 }]}>
          <Reel uid="hl" size={62} />
        </View>
        <View style={[styles.reelWrap, { right: 10 }]}>
          <Reel uid="hr" size={62} />
        </View>

        <View style={styles.window}>
          <View style={styles.tape} />
        </View>

        <View style={styles.notch} />
        <View style={[styles.hole, { left: '22%' }]} />
        <View style={[styles.hole, { left: '78%' }]} />
      </LinearGradient>

      <View style={styles.panel}>
        <View style={styles.titleBlock}>
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
            <Text style={styles.dot}>·</Text>
            <Text style={styles.reciter} numberOfLines={1}>
              {reciter.name.toUpperCase()}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onPlay}
          accessibilityRole="button"
          accessibilityLabel={`Play ${surah.english}`}
          style={styles.playButton}
        >
          <LinearGradient
            colors={[colors.mustard, '#A87025']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <PlayIcon size={14} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  deck: {
    height: 114,
    position: 'relative',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: 'rgba(237,224,181,0.45)',
    letterSpacing: 2,
  },
  reelWrap: {
    position: 'absolute',
    top: '52%',
    marginTop: -31,
  },
  window: {
    position: 'absolute',
    left: 82,
    right: 82,
    top: '50%',
    marginTop: -21,
    height: 42,
    backgroundColor: '#070402',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tape: {
    width: '100%',
    height: 9,
    backgroundColor: '#2A1808',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  notch: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 10,
    backgroundColor: colors.tapeBlack,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  hole: {
    position: 'absolute',
    bottom: 4,
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tapeBlack,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    backgroundColor: '#0D0904',
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 64,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  english: {
    fontFamily: fonts.serifBold,
    fontSize: 15,
    color: colors.cream,
    flexShrink: 1,
  },
  arabic: {
    fontFamily: fonts.quran,
    fontSize: 17,
    color: 'rgba(237,224,181,0.70)',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  meaning: {
    fontFamily: fonts.serif,
    fontSize: 10,
    fontStyle: 'italic',
    color: 'rgba(237,224,181,0.38)',
    flexShrink: 1,
  },
  dot: {
    color: 'rgba(237,224,181,0.18)',
    fontSize: 8,
  },
  reciter: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: 'rgba(237,224,181,0.32)',
    letterSpacing: 0.5,
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

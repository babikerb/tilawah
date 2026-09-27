import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme/tokens';
import type { Ayah } from '../../data/types';

interface AyahCardProps {
  loading: boolean;
  error: string | null;
  ayahs: Ayah[];
  index: number;
  onSelectIndex: (i: number) => void;
  juzText: string;
  totalAyahs: number;
  /** [wordIndexStart, wordIndexEnd) currently being recited, or null. */
  activeWordRange: [number, number] | null;
}

export function AyahCard({
  loading,
  error,
  ayahs,
  index,
  onSelectIndex,
  juzText,
  totalAyahs,
  activeWordRange,
}: AyahCardProps) {
  const ayah = ayahs[index];
  const words = ayah?.arabic.split(/\s+/).filter(Boolean) ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.metaStrip}>
        <Text style={styles.metaText}>{juzText}</Text>
        <Text style={styles.metaText}>{ayah ? `Ayah ${ayah.numberInSurah} of ${totalAyahs}` : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {ayah ? (
          // Prefer showing whatever ayah content we already have — e.g. while
          // a reciter switch loads quietly in the background — over a loading
          // spinner or error that would otherwise interrupt already-working
          // content and playback.
          <>
            <Text style={styles.arabic}>
              {words.map((word, i) => {
                const isActive = !!activeWordRange && i >= activeWordRange[0] && i < activeWordRange[1];
                return (
                  <Text key={i} style={isActive ? styles.wordActive : undefined}>
                    {word}
                    {i < words.length - 1 ? ' ' : ''}
                  </Text>
                );
              })}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.translation}>{ayah.translation}</Text>
          </>
        ) : loading ? (
          <ActivityIndicator color={colors.green} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </ScrollView>

      {ayahs.length > 1 && ayahs.length <= 12 && (
        <View style={styles.dots}>
          {ayahs.map((_, i) => (
            <Pressable key={i} onPress={() => onSelectIndex(i)} hitSlop={6}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
  },
  metaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.creamAlt,
  },
  metaText: {
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    color: colors.inkMuted,
  },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  arabic: {
    fontFamily: fonts.quran,
    fontSize: 26,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 58,
    writingDirection: 'rtl',
  },
  wordActive: {
    backgroundColor: colors.greenLight,
    color: colors.green,
  },
  divider: {
    width: '32%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  translation: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  errorText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
});

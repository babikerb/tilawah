import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { colors, fonts } from '../../theme/tokens';
import { splitAyahWords } from '../../lib/arabicWords';
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
  /** Leading words of `ayah.arabic` that are the Bismillah, rendered on its
   * own line above the ayah. 0 when not applicable. */
  bismillahWordCount: number;
}

/** Renders `words`, highlighting whichever fall within `activeWordRange`
 * (given in indices relative to the *full* ayah, hence `indexOffset`). */
function WordText({
  words,
  indexOffset,
  activeWordRange,
  style,
}: {
  words: string[];
  indexOffset: number;
  activeWordRange: [number, number] | null;
  style: StyleProp<TextStyle>;
}) {
  return (
    <Text style={style}>
      {words.map((word, i) => {
        const globalIndex = i + indexOffset;
        const isActive = !!activeWordRange && globalIndex >= activeWordRange[0] && globalIndex < activeWordRange[1];
        return (
          <Text key={globalIndex} style={isActive ? styles.wordActive : undefined}>
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </Text>
        );
      })}
    </Text>
  );
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
  bismillahWordCount,
}: AyahCardProps) {
  const ayah = ayahs[index];
  const words = ayah ? splitAyahWords(ayah.arabic) : [];
  const bismillahWords = bismillahWordCount > 0 ? words.slice(0, bismillahWordCount) : [];
  const ayahWords = bismillahWordCount > 0 ? words.slice(bismillahWordCount) : words;

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
            {bismillahWords.length > 0 && (
              <WordText
                words={bismillahWords}
                indexOffset={0}
                activeWordRange={activeWordRange}
                style={styles.bismillah}
              />
            )}
            <WordText
              words={ayahWords}
              indexOffset={bismillahWordCount}
              activeWordRange={activeWordRange}
              style={styles.arabic}
            />
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
  bismillah: {
    fontFamily: fonts.quran,
    fontSize: 20,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 40,
    writingDirection: 'rtl',
    marginBottom: 10,
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

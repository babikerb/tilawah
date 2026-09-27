import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
 * (given in indices relative to the *full* ayah, hence `indexOffset`).
 * `activeWordRef` is attached to whichever word is currently active, so a
 * caller can measure and auto-scroll to it. */
function WordText({
  words,
  indexOffset,
  activeWordRange,
  style,
  activeWordRef,
}: {
  words: string[];
  indexOffset: number;
  activeWordRange: [number, number] | null;
  style: StyleProp<TextStyle>;
  activeWordRef: React.RefObject<Text | null>;
}) {
  return (
    <Text style={style}>
      {words.map((word, i) => {
        const globalIndex = i + indexOffset;
        const isActive = !!activeWordRange && globalIndex >= activeWordRange[0] && globalIndex < activeWordRange[1];
        return (
          <Text
            key={globalIndex}
            ref={isActive ? activeWordRef : undefined}
            style={isActive ? styles.wordActive : undefined}
          >
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
  // The Bismillah is trimmed off the displayed ayah text entirely (it's
  // heard as its own standalone clip before ayah 1, not shown here).
  const ayahWords = bismillahWordCount > 0 ? words.slice(bismillahWordCount) : words;

  const scrollRef = useRef<ScrollView>(null);
  const activeWordRef = useRef<Text>(null);
  const scrollOffsetRef = useRef(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  };

  // A new ayah always starts scrolled to its own top, not wherever the
  // previous (possibly longer) ayah happened to leave the scroll position.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [index]);

  // Keep the currently-recited word in view as highlighting moves through a
  // long ayah that doesn't fit on screen — nudge the scroll just enough to
  // bring it back inside the viewport when it bleeds past the top or bottom,
  // rather than requiring a manual scroll to follow along.
  useEffect(() => {
    const wordNode = activeWordRef.current;
    const scrollView = scrollRef.current;
    const scrollNode = scrollView?.getNativeScrollRef();
    if (!activeWordRange || !scrollView || !scrollNode || !wordNode) return;
    const PADDING = 24;
    wordNode.measure((_wx, _wy, _wWidth, wHeight, wPageX, wPageY) => {
      scrollNode.measure((_sx, _sy, _sWidth, sHeight, _sPageX, sPageY) => {
        const overflowBottom = wPageY + wHeight - (sPageY + sHeight);
        const overflowTop = sPageY - wPageY;
        if (overflowBottom > 0) {
          scrollView.scrollTo({ y: scrollOffsetRef.current + overflowBottom + PADDING, animated: true });
        } else if (overflowTop > 0) {
          scrollView.scrollTo({ y: Math.max(0, scrollOffsetRef.current - overflowTop - PADDING), animated: true });
        }
      });
    });
  }, [activeWordRange]);

  return (
    <View style={styles.card}>
      <View style={styles.metaStrip}>
        <Text style={styles.metaText}>{juzText}</Text>
        <Text style={styles.metaText}>{ayah ? `Ayah ${ayah.numberInSurah} of ${totalAyahs}` : ''}</Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} onScroll={handleScroll} scrollEventThrottle={16}>
        {ayah ? (
          // Prefer showing whatever ayah content we already have — e.g. while
          // a reciter switch loads quietly in the background — over a loading
          // spinner or error that would otherwise interrupt already-working
          // content and playback.
          <>
            <WordText
              words={ayahWords}
              indexOffset={bismillahWordCount}
              activeWordRange={activeWordRange}
              style={styles.arabic}
              activeWordRef={activeWordRef}
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

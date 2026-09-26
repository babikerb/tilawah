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
}

export function AyahCard({ loading, error, ayahs, index, onSelectIndex, juzText, totalAyahs }: AyahCardProps) {
  const ayah = ayahs[index];

  return (
    <View style={styles.card}>
      <View style={styles.metaStrip}>
        <Text style={styles.metaText}>{juzText.toUpperCase()}</Text>
        <Text style={styles.metaText}>
          {ayah ? `AYAH ${ayah.numberInSurah} OF ${totalAyahs}` : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : ayah ? (
          <>
            <Text style={styles.arabic}>{ayah.arabic}</Text>
            <View style={styles.divider} />
            <Text style={styles.translation}>{ayah.translation}</Text>
          </>
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
    backgroundColor: 'rgba(248,238,214,0.78)',
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 10,
    overflow: 'hidden',
  },
  metaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(26,17,8,0.09)',
    backgroundColor: 'rgba(26,17,8,0.03)',
  },
  metaText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: 'rgba(26,17,8,0.40)',
    letterSpacing: 1.2,
  },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  arabic: {
    fontFamily: fonts.quran,
    fontSize: 30,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 66,
    writingDirection: 'rtl',
  },
  divider: {
    width: '38%',
    height: 1,
    backgroundColor: 'rgba(26,17,8,0.10)',
    marginVertical: 16,
  },
  translation: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 23,
    fontStyle: 'italic',
  },
  errorText: {
    fontFamily: fonts.serif,
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
    borderTopColor: 'rgba(26,17,8,0.07)',
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(26,17,8,0.14)',
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.ink,
  },
});

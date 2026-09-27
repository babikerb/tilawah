import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IslamicPatternBackground } from './IslamicPatternBackground';
import { colors, fonts } from '../../theme/tokens';

export function AppHeader({ topInset }: { topInset: number }) {
  return (
    <View style={[styles.header, { paddingTop: topInset + 10 }]}>
      <IslamicPatternBackground opacity={0.12} />
      <Text style={styles.title}>Tilawah</Text>
      <Text style={styles.titleArabic}>تِلاوَة</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.green,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.uiBold,
    fontSize: 20,
    color: colors.white,
    letterSpacing: 0.3,
  },
  titleArabic: {
    fontFamily: fonts.arabic,
    fontSize: 18,
    color: colors.goldLight,
  },
});

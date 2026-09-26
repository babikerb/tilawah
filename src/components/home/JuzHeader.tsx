import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';

export function JuzHeader({ juz }: { juz: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>JUZ {juz}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: 'rgba(26,17,8,0.38)',
    letterSpacing: 1.4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(26,17,8,0.08)',
  },
});

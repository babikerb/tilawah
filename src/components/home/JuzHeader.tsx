import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme/tokens';

export function JuzHeader({ juz }: { juz: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>JUZ {juz}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.greenLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: colors.green,
    letterSpacing: 0.6,
  },
});

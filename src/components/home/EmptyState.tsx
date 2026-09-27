import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme/tokens';

export function EmptyState({ type }: { type: 'saved' | 'search' }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type === 'saved' ? 'Nothing saved yet' : 'No results'}</Text>
      <Text style={styles.subtitle}>
        {type === 'saved' ? 'Tap the heart next to any surah to save it.' : 'Try a different name or translation.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});

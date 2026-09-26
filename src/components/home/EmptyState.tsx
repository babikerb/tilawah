import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../../theme/tokens';

export function EmptyState({ type }: { type: 'saved' | 'search' }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(26,17,8,0.20)" strokeWidth={1.5} strokeLinecap="round">
          {type === 'saved' ? (
            <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          ) : (
            <>
              <Circle cx={11} cy={11} r={7} />
              <Path d="M20 20L16 16" />
            </>
          )}
        </Svg>
      </View>
      <Text style={styles.title}>{type === 'saved' ? 'Nothing saved yet' : 'No results'}</Text>
      <Text style={styles.subtitle}>
        {type === 'saved' ? 'Tap the heart next to any surah to save it.' : 'Try a different name or translation.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 56,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(26,17,8,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(26,17,8,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 21,
    fontStyle: 'italic',
    maxWidth: 200,
  },
});

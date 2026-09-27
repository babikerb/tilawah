import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors } from '../../theme/tokens';

/** Flat cream content background — no texture, matching the classic-web aesthetic. */
export function AppBackground({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
});

import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle, type PressableProps } from 'react-native';
import { colors, radii } from '../../theme/tokens';

interface FlatIconButtonProps extends Omit<PressableProps, 'style'> {
  size?: number;
  variant?: 'outline' | 'filled' | 'plain';
  style?: StyleProp<ViewStyle>;
}

/** Small, flat, classic-web-style icon button — thin border, no gradients or shadows. */
export function FlatIconButton({ size = 32, variant = 'outline', style, ...rest }: FlatIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size },
        variant === 'outline' && styles.outline,
        variant === 'filled' && styles.filled,
        pressed && styles.pressed,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filled: {
    backgroundColor: colors.green,
  },
  pressed: {
    opacity: 0.7,
  },
});

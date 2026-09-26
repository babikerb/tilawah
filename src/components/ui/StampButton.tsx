import React, { useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/tokens';

interface StampButtonProps {
  onPress: () => void;
  size?: number;
  width?: number;
  height?: number;
  borderRadius?: number;
  gradient?: readonly [string, string];
  children: React.ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
}

/** Skeuomorphic "physical button" press effect matching the cassette-deck design language. */
export function StampButton({
  onPress,
  size,
  width,
  height,
  borderRadius = 8,
  gradient = [colors.tapeDark, colors.walnut] as const,
  children,
  accessibilityLabel,
  disabled,
}: StampButtonProps) {
  const w = width ?? size ?? 44;
  const h = height ?? size ?? 44;
  const press = useMemo(() => new Animated.Value(0), []);

  const animateTo = (toValue: number) => (_e: GestureResponderEvent) => {
    if (toValue === 1) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(press, { toValue, duration: 55, useNativeDriver: true }).start();
  };

  const translate = press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });

  return (
    <View style={{ width: w, height: h }}>
      <View
        style={[
          styles.shadow,
          { width: w, height: h, borderRadius, top: 5, left: 3 },
        ]}
      />
      <Pressable
        onPress={onPress}
        onPressIn={animateTo(1)}
        onPressOut={animateTo(0)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <Animated.View
          style={[
            styles.face,
            {
              width: w,
              height: h,
              borderRadius,
              transform: [{ translateX: translate }, { translateY: translate }],
            },
          ]}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius }]}
          />
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  face: {
    borderWidth: 2.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

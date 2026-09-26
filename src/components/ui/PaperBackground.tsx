import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

/** Aged-paper backdrop used behind the Home and Now Playing screens. */
export function PaperBackground({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgRadialGradient id="warm" cx="20%" cy="15%" r="60%">
            <Stop offset="0%" stopColor="#C89637" stopOpacity={0.1} />
            <Stop offset="100%" stopColor="#C89637" stopOpacity={0} />
          </SvgRadialGradient>
          <SvgRadialGradient id="shade" cx="80%" cy="80%" r="55%">
            <Stop offset="0%" stopColor="#643E16" stopOpacity={0.08} />
            <Stop offset="100%" stopColor="#643E16" stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#warm)" />
        <Rect width="100%" height="100%" fill="url(#shade)" />
      </Svg>
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

import React, { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';

const BAR_HEIGHTS = [8, 16, 10, 18, 12, 15];

/** Pulsing volume-unit bars shown while audio is playing. */
export function VuBars({ active }: { active: boolean }) {
  const values = useMemo(() => BAR_HEIGHTS.map(() => new Animated.Value(0.35)), []);

  useEffect(() => {
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: (0.54 + i * 0.07) * 1000,
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 0.32,
            duration: (0.54 + i * 0.07) * 1000,
            useNativeDriver: false,
          }),
        ])
      )
    );
    if (active) {
      loops.forEach((l) => l.start());
    } else {
      loops.forEach((l) => l.stop());
      values.forEach((v) => v.setValue(0.35));
    }
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <View style={styles.row}>
      {BAR_HEIGHTS.map((h, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              height: values[i].interpolate({ inputRange: [0, 1], outputRange: [0, h] }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 20,
  },
  bar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: colors.mustard,
    opacity: 0.75,
  },
});

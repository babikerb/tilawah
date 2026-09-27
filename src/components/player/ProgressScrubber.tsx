import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { colors } from '../../theme/tokens';

interface ProgressScrubberProps {
  progress: number;
  onSeek: (fraction: number) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function ProgressScrubber({ progress, onSeek }: ProgressScrubberProps) {
  const trackWidthRef = useRef(0);
  const trackXRef = useRef(0);
  const viewRef = useRef<View>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);

  const panResponder = useMemo(
    () =>
      // The handlers below only read trackWidthRef/trackXRef when a touch
      // event actually fires (they're event callbacks, not render logic),
      // which is the documented PanResponder pattern from the RN docs.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const fraction = clamp(evt.nativeEvent.locationX / Math.max(trackWidthRef.current, 1), 0, 1);
          setDragValue(fraction);
        },
        onPanResponderMove: (_evt, gesture) => {
          const fraction = clamp(
            (gesture.moveX - trackXRef.current) / Math.max(trackWidthRef.current, 1),
            0,
            1
          );
          setDragValue(fraction);
        },
        onPanResponderRelease: () => {
          setDragValue((v) => {
            if (v !== null) onSeek(v);
            return null;
          });
        },
      }),
    [onSeek]
  );

  const shown = dragValue ?? progress;

  return (
    <View
      ref={viewRef}
      style={styles.hitArea}
      onLayout={(e: LayoutChangeEvent) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
        viewRef.current?.measure((_x, _y, _w, _h, pageX) => {
          trackXRef.current = pageX;
        });
      }}
      {...panResponder.panHandlers}
    >
      <View style={styles.trackBg} />
      <View style={[styles.trackFill, { width: `${shown * 100}%` }]} />
      <View style={[styles.thumb, { left: `${shown * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    height: 24,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.green,
  },
  thumb: {
    position: 'absolute',
    backgroundColor: colors.white,
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    top: '50%',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.green,
  },
});

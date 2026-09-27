import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

/**
 * Subtle repeating 8-point star tessellation (a traditional geometric motif,
 * not tied to any particular brand) used as a header background texture.
 */
export function IslamicPatternBackground({ opacity = 0.1 }: { opacity?: number }) {
  const tile = 44;
  const r = tile / 2;
  // Two overlapping squares rotated 45° from each other, inscribed in the
  // tile, form the classic 8-point star outline when tiled edge-to-edge.
  const square = `M ${r} 4 L ${tile - 4} ${r} L ${r} ${tile - 4} L 4 ${r} Z`;
  const diamond = `M 4 4 L ${tile - 4} 4 L ${tile - 4} ${tile - 4} L 4 ${tile - 4} Z`;

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="starTile" width={tile} height={tile} patternUnits="userSpaceOnUse">
          <Path d={square} fill="none" stroke="#FFFFFF" strokeWidth={1} strokeOpacity={opacity} />
          <Path
            d={diamond}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1}
            strokeOpacity={opacity}
            transform={`rotate(45 ${r} ${r})`}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#starTile)" />
    </Svg>
  );
}

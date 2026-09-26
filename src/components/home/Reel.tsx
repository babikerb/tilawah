import React from 'react';
import Svg, { Defs, RadialGradient, Stop, Circle, Line } from 'react-native-svg';

const ANGLES = [0, 60, 120, 180, 240, 300];

/** A cassette reel — decorative SVG used on the "continue listening" card. */
export function Reel({ uid, size = 62 }: { uid: string; size?: number }) {
  const r = size / 2;
  const gid = `rg-${uid}`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id={gid} cx="35%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#2A1808" />
          <Stop offset="100%" stopColor="#0A0604" />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r - 1} fill="#0A0604" stroke="#1A1108" strokeWidth={2} />
      <Circle cx={r} cy={r} r={r - 6} fill={`url(#${gid})`} />
      {ANGLES.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <Line
            key={deg}
            x1={r + Math.cos(rad) * r * 0.28}
            y1={r + Math.sin(rad) * r * 0.28}
            x2={r + Math.cos(rad) * r * 0.6}
            y2={r + Math.sin(rad) * r * 0.6}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1.5}
          />
        );
      })}
      <Circle
        cx={r}
        cy={r}
        r={r * 0.22}
        fill="#1A1108"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
      />
      <Circle cx={r} cy={r} r={r * 0.09} fill="#0A0604" />
    </Svg>
  );
}

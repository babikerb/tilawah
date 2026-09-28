import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '../../theme/tokens';

interface IconProps {
  size?: number;
  color?: string;
}

// Every call site in this app passes an explicit `color` matching the
// current green/cream design system, so these defaults never actually
// render today — but they're kept as real theme-token fallbacks (not the
// old vintage-cassette-theme hex values previously here) so a future call
// site that forgets to pass one fails safely into the current theme
// instead of a jarring leftover color from a design that's no longer used.

export function PlayIcon({ size = 14, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M4 2L14 8L4 14V2Z" />
    </Svg>
  );
}

export function PauseIcon({ size = 14, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Rect x={2} y={2} width={4.5} height={12} rx={1} />
      <Rect x={9.5} y={2} width={4.5} height={12} rx={1} />
    </Svg>
  );
}

export function PrevIcon({ size = 20, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M19 5L9 12L19 19V5Z" />
      <Rect x={4} y={5} width={3} height={14} rx={1} />
    </Svg>
  );
}

export function NextIcon({ size = 20, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M5 5L15 12L5 19V5Z" />
      <Rect x={17} y={5} width={3} height={14} rx={1} />
    </Svg>
  );
}

export function HeartIcon({ size = 16, filled = false, color = colors.gold }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={filled ? color : 'rgba(26,17,8,0.20)'} strokeWidth={2} strokeLinecap="round">
      <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </Svg>
  );
}

export function SearchIcon({ size = 13, color = colors.inkMuted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20L16 16" />
    </Svg>
  );
}

export function CloseIcon({ size = 13, color = colors.inkMuted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M2 2L14 14M14 2L2 14" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 7, color = colors.inkMuted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <Path d="M1 3L5 7L9 3" />
    </Svg>
  );
}

export function BackIcon({ size = 18, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Path d="M19 12H5M12 5l-7 7 7 7" />
    </Svg>
  );
}

export function CheckIcon({ size = 9, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <Path d="M2 6L5 9L10 3" />
    </Svg>
  );
}

export function RepeatIcon({ size = 14, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 2l4 4-4 4" />
      <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <Path d="M7 22l-4-4 4-4" />
      <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Svg>
  );
}

/**
 * "Old-web portal" design system — evokes the classic mp3quran.net-era Islamic
 * audio sites: deep green + cream, boxed sections, thin borders, dense lists.
 */
export const colors = {
  green: '#0E5A3F',
  greenDark: '#0A4530',
  greenLight: '#E7F1EC',
  cream: '#FAF7F0',
  creamAlt: '#F1ECDF',
  white: '#FFFFFF',
  border: '#D8D3C7',
  gold: '#B8912A',
  goldLight: '#EFE2BE',
  ink: '#1F2A24',
  inkMuted: '#5C6862',
} as const;

export const fonts = {
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
  quran: 'AmiriQuran_400Regular',
  ui: 'NotoSans_400Regular',
  uiMedium: 'NotoSans_500Medium',
  uiBold: 'NotoSans_700Bold',
} as const;

export const radii = {
  sm: 2,
  md: 3,
  lg: 4,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

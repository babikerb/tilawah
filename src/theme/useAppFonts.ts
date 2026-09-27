import { useFonts } from 'expo-font';
import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_700Bold,
} from '@expo-google-fonts/noto-sans';

export function useAppFonts() {
  return useFonts({
    AmiriQuran_400Regular,
    Amiri_400Regular,
    Amiri_700Bold,
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_700Bold,
  });
}

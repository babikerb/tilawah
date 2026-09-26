import { useFonts } from 'expo-font';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';
import { Arvo_400Regular, Arvo_400Regular_Italic, Arvo_700Bold } from '@expo-google-fonts/arvo';

export function useAppFonts() {
  return useFonts({
    AlfaSlabOne_400Regular,
    SpecialElite_400Regular,
    AmiriQuran_400Regular,
    Arvo_400Regular,
    Arvo_400Regular_Italic,
    Arvo_700Bold,
  });
}

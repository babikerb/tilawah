import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RECITER, RECITERS } from '../data/reciters';
import type { Reciter } from '../data/types';

interface PlayerState {
  currentSurahId: number | null;
  reciterId: string;
  repeat: boolean;
  isPlaying: boolean;
  reciter: () => Reciter;
  play: (surahId: number) => void;
  togglePlay: () => void;
  setReciter: (reciterId: string) => void;
  toggleRepeat: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSurahId: null,
      reciterId: DEFAULT_RECITER.id,
      repeat: false,
      isPlaying: false,
      reciter: () => RECITERS.find((r) => r.id === get().reciterId) ?? DEFAULT_RECITER,
      play: (surahId) => set({ currentSurahId: surahId, isPlaying: true }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setReciter: (reciterId) => set({ reciterId }),
      toggleRepeat: () => set((state) => ({ repeat: !state.repeat })),
    }),
    {
      name: 'tilawah-player',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentSurahId: state.currentSurahId,
        reciterId: state.reciterId,
        repeat: state.repeat,
      }),
    }
  )
);

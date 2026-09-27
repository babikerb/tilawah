import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RECITER, RECITERS } from '../data/reciters';
import type { Reciter } from '../data/types';

export type RepeatMode = 'off' | 'ayah' | 'surah';

const REPEAT_CYCLE: RepeatMode[] = ['off', 'ayah', 'surah'];

interface PlayerState {
  currentSurahId: number | null;
  reciterId: string;
  repeatMode: RepeatMode;
  /** When a surah finishes with repeat off, automatically starts the next
   * surah instead of stopping. Defaults on. */
  autoplayEnabled: boolean;
  isPlaying: boolean;
  reciter: () => Reciter;
  play: (surahId: number) => void;
  togglePlay: () => void;
  setPlaying: (isPlaying: boolean) => void;
  setReciter: (reciterId: string) => void;
  cycleRepeatMode: () => void;
  toggleAutoplay: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSurahId: null,
      reciterId: DEFAULT_RECITER.id,
      repeatMode: 'off',
      autoplayEnabled: true,
      isPlaying: false,
      reciter: () => RECITERS.find((r) => r.id === get().reciterId) ?? DEFAULT_RECITER,
      play: (surahId) => set({ currentSurahId: surahId, isPlaying: true }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setReciter: (reciterId) => set({ reciterId }),
      cycleRepeatMode: () =>
        set((state) => {
          const next = REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(state.repeatMode) + 1) % REPEAT_CYCLE.length];
          return { repeatMode: next };
        }),
      toggleAutoplay: () => set((state) => ({ autoplayEnabled: !state.autoplayEnabled })),
    }),
    {
      name: 'tilawah-player',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentSurahId: state.currentSurahId,
        reciterId: state.reciterId,
        repeatMode: state.repeatMode,
        autoplayEnabled: state.autoplayEnabled,
      }),
    }
  )
);

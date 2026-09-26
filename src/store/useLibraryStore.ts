import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LibraryState {
  savedIds: number[];
  isSaved: (id: number) => boolean;
  toggleSave: (id: number) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      savedIds: [],
      isSaved: (id) => get().savedIds.includes(id),
      toggleSave: (id) =>
        set((state) => ({
          savedIds: state.savedIds.includes(id)
            ? state.savedIds.filter((s) => s !== id)
            : [...state.savedIds, id],
        })),
    }),
    {
      name: 'tilawah-library',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

import type { Reciter } from '../data/types';

/** Full-surah recitation, streamed at 128kbps from the Islamic Network CDN. */
export function surahAudioUrl(reciter: Reciter, surahId: number): string {
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciter.edition}/${surahId}.mp3`;
}

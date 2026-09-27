import type { Ayah } from '../data/types';

interface AlQuranAyah {
  number: number;
  numberInSurah: number;
  text: string;
  audio?: string;
}

interface AlQuranEdition {
  ayahs: AlQuranAyah[];
}

interface AlQuranResponse {
  code: number;
  status: string;
  data: [AlQuranEdition, AlQuranEdition, AlQuranEdition];
}

const ayahCache = new Map<string, Ayah[]>();

/** Fetches per-ayah Arabic text, translation, and this reciter's per-ayah audio clip URLs. */
export async function fetchSurahAyahs(surahId: number, reciterEdition: string): Promise<Ayah[]> {
  const cacheKey = `${surahId}:${reciterEdition}`;
  const cached = ayahCache.get(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahId}/editions/quran-uthmani,en.sahih,${reciterEdition}`
  );
  if (!res.ok) {
    throw new Error(`Failed to load surah ${surahId} (${res.status})`);
  }
  const json = (await res.json()) as AlQuranResponse;
  const [arabicEdition, translationEdition, audioEdition] = json.data;

  const ayahs: Ayah[] = arabicEdition.ayahs.map((a, i) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    arabic: a.text,
    translation: translationEdition.ayahs[i]?.text ?? '',
    audioUrl: audioEdition.ayahs[i]?.audio ?? '',
  }));

  ayahCache.set(cacheKey, ayahs);
  return ayahs;
}

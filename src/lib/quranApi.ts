import type { Ayah } from '../data/types';

interface AlQuranAyah {
  number: number;
  numberInSurah: number;
  text: string;
}

interface AlQuranEdition {
  ayahs: AlQuranAyah[];
}

interface AlQuranResponse {
  code: number;
  status: string;
  data: [AlQuranEdition, AlQuranEdition];
}

const ayahCache = new Map<number, Ayah[]>();

export async function fetchSurahAyahs(surahId: number): Promise<Ayah[]> {
  const cached = ayahCache.get(surahId);
  if (cached) return cached;

  const res = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahId}/editions/quran-uthmani,en.sahih`
  );
  if (!res.ok) {
    throw new Error(`Failed to load surah ${surahId} text (${res.status})`);
  }
  const json = (await res.json()) as AlQuranResponse;
  const [arabicEdition, translationEdition] = json.data;

  const ayahs: Ayah[] = arabicEdition.ayahs.map((a, i) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    arabic: a.text,
    translation: translationEdition.ayahs[i]?.text ?? '',
  }));

  ayahCache.set(surahId, ayahs);
  return ayahs;
}

/**
 * Word-level audio timing, for the subset of reciters where it's verified
 * accurate. See /wordtiming/ATTRIBUTION.md for the data source and the
 * byte-level audio verification behind this reciter list.
 */
const WORD_TIMING_RECITERS = new Set(['ar.alafasy', 'ar.abdurrahmaansudais', 'ar.minshawi', 'ar.mahermuaiqly']);

export function supportsWordTiming(reciterEdition: string): boolean {
  return WORD_TIMING_RECITERS.has(reciterEdition);
}

/** [wordIndexStart, wordIndexEnd, startMs, endMs]. A segment can span more than
 * one word when the alignment couldn't cleanly separate fast-spoken words. */
export type WordSegment = [number, number, number, number];

interface AyahWordTiming {
  ayah: number; // numberInSurah
  segments: WordSegment[];
}

const cache = new Map<string, Map<number, WordSegment[]> | null>();

/** Returns a map of numberInSurah -> word segments for the whole surah, or
 * null if this reciter has no word-timing data or the fetch failed. Callers
 * should treat null as "no highlighting available" — never an error state. */
export async function fetchWordTiming(
  surahId: number,
  reciterEdition: string
): Promise<Map<number, WordSegment[]> | null> {
  if (!supportsWordTiming(reciterEdition)) return null;

  const cacheKey = `${reciterEdition}:${surahId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/gh/babikerb/tilawah@master/wordtiming/${reciterEdition}/${surahId}.json`
    );
    if (!res.ok) throw new Error(`word timing fetch failed (${res.status})`);
    const data = (await res.json()) as AyahWordTiming[];
    const byAyah = new Map<number, WordSegment[]>(data.map((a) => [a.ayah, a.segments]));
    cache.set(cacheKey, byAyah);
    return byAyah;
  } catch {
    cache.set(cacheKey, null);
    return null;
  }
}

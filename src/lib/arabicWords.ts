/**
 * Splits Uthmani ayah text into words for highlighting, matching the word
 * *count* the alignment data (wordTiming.ts) actually uses.
 *
 * The Uthmani text encodes small waqf/pause marks (ۖ ۗ ۘ ۙ ۚ ۛ ۜ, the
 * sajdah sign ۩, the rub-el-hizb sign ۞, etc. — U+06D6 to U+06ED) as
 * standalone, whitespace-separated tokens. They aren't spoken, so the
 * forced-alignment data doesn't count them as words — a naive
 * whitespace split does, which silently shifts every word index after the
 * first mark and desyncs the highlight for the rest of the ayah. Confirmed
 * against real data: Al-Baqarah 255 (Ayat al-Kursi) has 58 whitespace
 * tokens but exactly 50 word segments in the timing data — the difference
 * is its 8 stop marks.
 *
 * Fix: merge a mark-only token into the previous real word instead of
 * giving it its own array slot, so it still displays but doesn't shift
 * indices. A mark with no previous word yet — e.g. Aal-e-Imran 15, which
 * opens with a standalone rub-el-hizb sign (۞) before its first real word
 * — has nothing to merge backward into, so it's held and merged into the
 * *next* real word instead; otherwise it became its own word-0, shifting
 * every real word in the ayah's highlighting off by one.
 */
export function splitAyahWords(arabicText: string): string[] {
  const tokens = arabicText.split(/\s+/).filter(Boolean);
  const words: string[] = [];
  let pendingLeadingMarks = '';
  for (const token of tokens) {
    if (isStopMarkOnly(token)) {
      if (words.length > 0) {
        words[words.length - 1] += token;
      } else {
        pendingLeadingMarks += token;
      }
    } else {
      words.push(pendingLeadingMarks + token);
      pendingLeadingMarks = '';
    }
  }
  // Only reachable if an ayah's text were nothing but marks, which doesn't
  // happen in practice — kept so a mark is never silently dropped.
  if (pendingLeadingMarks) words.push(pendingLeadingMarks);
  return words;
}

function isStopMarkOnly(token: string): boolean {
  return [...token].every((ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return code >= 0x06d6 && code <= 0x06ed;
  });
}

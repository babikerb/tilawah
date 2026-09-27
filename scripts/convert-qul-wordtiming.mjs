#!/usr/bin/env node
// Converts a QUL (Quranic Universal Library) ayah-by-ayah segment export
// into this app's word-timing format (see src/lib/wordTiming.ts), writing
// wordtiming/<editionId>/<surahId>.json for all 114 surahs — the same
// static, per-surah-file shape already used for the quran-align-derived
// data (ar.alafasy, ar.abdurrahmaansudais, ar.minshawi).
//
// Usage:
//   node scripts/convert-qul-wordtiming.mjs <editionId> <path-to-unzipped-qul-export.json>
//
// Example:
//   unzip qul-exports/113-maher-al-mu-aiqly.json -d qul-exports/_unzipped/113
//   node scripts/convert-qul-wordtiming.mjs ar.mahermuaiqly qul-exports/_unzipped/113/ayah-recitation-maher-al-mu-aiqly-murattal-hafs-948.json
//
// Why this exists (word-splitting convention mismatch): QUL's forced
// alignment counts a small, fixed set of Arabic vocative/compound
// constructions — "O Moses" (يَٰمُوسَىٰ), "here you are" (هَٰٓأَنتُمْ), "after
// that" (بَعْدَمَا), etc. — as their real 2-3 spoken words. This app's own
// text splitter (src/lib/arabicWords.ts's splitAyahWords, used for display
// and already shipping for 3 other reciters via quran-align, which keeps
// these glued as ONE word) can't change to match without breaking those
// existing reciters' alignment. Verified against all 6,236 ayahs of Maher
// Al-Muaiqly's QUL export: the WORD_MULTIPLIER rule below accounts for
// every mismatch except 4 ayahs (5:19, 5:31, 28:38, 39:56) where this
// specific recording didn't pause cleanly between the two vocative words —
// a genuine audio-alignment judgment call for that one take, not a text
// rule to encode. Those 4 ayahs are written with empty segments (no
// highlighting for just that ayah — the app already treats a missing/empty
// segment list as "no highlighting available," never an error).
//
// This does NOT touch splitAyahWords() itself or any already-shipping
// reciter's data.

import { writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [, , editionId, qulExportPath] = process.argv;
if (!editionId || !qulExportPath) {
  console.error(
    'Usage: node scripts/convert-qul-wordtiming.mjs <editionId> <path-to-unzipped-qul-export.json>'
  );
  process.exit(1);
}

// --- exact copy of arabicWords.ts's splitAyahWords — keep in sync ---
function isStopMarkOnly(token) {
  return [...token].every((ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return code >= 0x06d6 && code <= 0x06ed;
  });
}
function splitAyahWords(arabicText) {
  const tokens = arabicText.split(/\s+/).filter(Boolean);
  const words = [];
  let pendingLeadingMarks = '';
  for (const token of tokens) {
    if (isStopMarkOnly(token)) {
      if (words.length > 0) words[words.length - 1] += token;
      else pendingLeadingMarks += token;
    } else {
      words.push(pendingLeadingMarks + token);
      pendingLeadingMarks = '';
    }
  }
  if (pendingLeadingMarks) words.push(pendingLeadingMarks);
  return words;
}

const BISMILLAH_WORD_COUNT = 4;
function isBismillahEligible(surah) {
  return surah !== 1 && surah !== 9;
}

function stripLeadingMark(word) {
  return word.replace(/^[ۖ-ۭ]/, '');
}

// Every exact-match string here was extracted from real ayah text and
// verified codepoint-by-codepoint — do not hand-retype these. Arabic
// diacritic ordering (e.g. shadda vs. fatha) is visually indistinguishable
// but byte-different, and a hand-typed copy silently failed to match twice
// during development.
const YABNA_UMMA = String.fromCodePoint(0x64a, 0x64e, 0x628, 0x652, 0x646, 0x64e, 0x624, 0x64f, 0x645, 0x651, 0x64e); // يَبْنَؤُمَّ ("O son of my mother", 20:94) — 3 words
const HAA_ANTUM = String.fromCodePoint(0x647, 0x64e, 0x670, 0x653, 0x623, 0x64e, 0x646, 0x62a, 0x64f, 0x645, 0x652); // هَٰٓأَنتُمْ ("here you are") — 2 words. NOT هَٰٓؤُلَآءِ ("these"), which stays 1 word despite the shared prefix.
const BADAMA = String.fromCodePoint(0x628, 0x64e, 0x639, 0x652, 0x62f, 0x64e, 0x645, 0x64e, 0x627); // بَعْدَمَا ("after that") — 2 words
const WA_ALLAWI = String.fromCodePoint(0x648, 0x64e, 0x623, 0x64e, 0x644, 0x651, 0x64e, 0x648, 0x650); // وَأَلَّوِ ("and that if") — 2 words

/** How many real spoken words QUL's alignment counts a given displayed
 * token as. 1 for the overwhelming majority; >1 for a small, fixed set of
 * vocative/compound constructions Quranic orthography glues into one token
 * (e.g. يَٰمُوسَىٰ = "O" + "Moses"). */
function wordMultiplicity(word) {
  const stripped = stripLeadingMark(word);
  if (stripped === YABNA_UMMA) return 3;
  if (stripped === HAA_ANTUM) return 2;
  if (stripped === BADAMA) return 2;
  if (stripped === WA_ALLAWI) return 2;
  // "yaa+X" vocatives (يَٰ...), optionally after a "wa" conjunction and/or a
  // glued rub-el-hizb mark (۞) — ya+fatha+superscript-alef is what marks
  // these apart from ordinary words.
  if (/^(?:وَ)?يَٰ/.test(stripped)) return 2;
  return 1;
}

async function fetchFullUthmaniText() {
  const res = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
  if (!res.ok) throw new Error(`Failed to fetch Uthmani text: HTTP ${res.status}`);
  const json = await res.json();
  const byKey = new Map();
  for (const surah of json.data.surahs) {
    for (const ayah of surah.ayahs) {
      byKey.set(`${surah.number}:${ayah.numberInSurah}`, ayah.text);
    }
  }
  return byKey;
}

async function main() {
  console.log('Fetching Uthmani text...');
  const textByKey = await fetchFullUthmaniText();

  console.log(`Loading QUL export from ${qulExportPath}...`);
  const qul = JSON.parse(readFileSync(qulExportPath, 'utf8'));

  const bySurah = new Map();
  let skippedAyahs = [];

  for (let surah = 1; surah <= 114; surah++) {
    const ayahEntries = [];
    for (let ayah = 1; ; ayah++) {
      const key = `${surah}:${ayah}`;
      const text = textByKey.get(key);
      if (!text) break; // ran past this surah's last ayah

      const qulEntry = qul[key];
      if (!qulEntry || !qulEntry.segments || qulEntry.segments.length === 0) continue;

      let words = splitAyahWords(text);
      if (ayah === 1 && isBismillahEligible(surah)) {
        words = words.slice(BISMILLAH_WORD_COUNT);
      }

      const expectedCount = words.reduce((sum, w) => sum + wordMultiplicity(w), 0);
      const actualMax = Math.max(...qulEntry.segments.map((s) => s[0]));
      if (expectedCount !== actualMax) {
        skippedAyahs.push(`${key} (expected ${expectedCount}, QUL max ${actualMax})`);
        continue; // leave this ayah out — no highlighting for just this one
      }

      // Build displayIndex boundaries: word i owns QUL indices
      // [boundary[i], boundary[i+1]).
      const boundaries = [0];
      for (const w of words) boundaries.push(boundaries[boundaries.length - 1] + wordMultiplicity(w));

      const segments = qulEntry.segments.map(([qulIndex, startMs, endMs]) => {
        const displayIndex = boundaries.findIndex((b, i) => qulIndex > b && qulIndex <= boundaries[i + 1]);
        return [displayIndex, displayIndex + 1, startMs, endMs];
      });

      ayahEntries.push({ ayah, segments });
    }
    bySurah.set(surah, ayahEntries);
  }

  console.log(`Skipped ${skippedAyahs.length} ayahs (audio-alignment mismatch, no highlighting for those):`);
  for (const s of skippedAyahs) console.log(`  - ${s}`);

  const outDir = path.join(process.cwd(), 'wordtiming', editionId);
  await mkdir(outDir, { recursive: true });
  for (const [surah, entries] of bySurah) {
    await writeFile(path.join(outDir, `${surah}.json`), JSON.stringify(entries));
  }
  console.log(`Wrote 114 files to ${outDir}`);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});

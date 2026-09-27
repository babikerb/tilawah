# Word-timing data attribution

The per-word audio timing data in this directory (`ar.alafasy/`,
`ar.abdurrahmaansudais/`, `ar.minshawi/`) is derived from the
[quran-align](https://github.com/cpfair/quran-align) project by Collin Fair,
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Original release: https://github.com/cpfair/quran-align/releases/tag/release-2016-11-24

Each reciter's original single-file dataset was split into one JSON file per
surah (same schema: `[{ "ayah": <numberInSurah>, "segments": [[wordStart,
wordEnd, startMs, endMs], ...] }]`) for on-demand loading. No other changes
were made to the underlying alignment data.

Verified before use: the audio these timestamps were aligned against
(everyayah.com) is audio-identical to the corresponding per-ayah files served
by the app's audio CDN (cdn.islamic.network) for these three reciters —
confirmed by direct byte comparison, not assumed.

## Maher Al-Muaiqly (`ar.mahermuaiqly/`)

Derived from [QUL](https://qul.tarteel.ai) (Quranic Universal Library) by
Tarteel AI — resource id 113 ("Maher Al-Mu'aiqly", ayah-by-ayah recitation
with segments), downloaded via `scripts/download-qul-export.mjs`.

**License note:** unlike quran-align's CC BY 4.0 grant above, this data does
not carry an explicit redistribution license. Tarteel's site-wide Terms of
Use technically restrict downloading/redistributing their content; QUL's own
GitHub repository is MIT-licensed but that covers only their application
code, not this data. This was used based on informal permission the app's
developer obtained directly from QUL/Tarteel for this specific use, not a
formal open license grant — worth revisiting if that permission is ever in
question.

Verified before use: audio-identity checked for 6 ayahs spread across
different surahs (1:1, 2:255, 18:10, 36:1, 112:1, 114:6) between
cdn.islamic.network (`ar.mahermuaiqly`, this app's audio source) and QUL's
own stated source (`audio-cdn.tarteel.ai/quran/maherAlMuaiqly/`) — durations
matched within ~0.1-0.2s regardless of clip length, consistent with a
container-level encoder-padding difference rather than content drift. No
PCM-level diff tool was available to go further than MP3-header duration
comparison; treat as strong but not absolute confidence.

Converted via `scripts/convert-qul-wordtiming.mjs`, which also documents and
corrects a real word-splitting convention mismatch: QUL's alignment counts a
small, fixed set of Arabic vocative/compound constructions (e.g. يَٰمُوسَىٰ,
"O Moses") as their real 2-3 spoken words, while this app's own text
splitter (`src/lib/arabicWords.ts`, shared with the quran-align-derived
reciters above) keeps them glued as one displayed word. The conversion
script's `wordMultiplicity()` reconciles the two without changing
`splitAyahWords()` or any other reciter's data. Verified against all 6,236
ayahs of this export: the rule accounts for every mismatch except 4 ayahs
(5:19, 5:31, 28:38, 39:56), where this specific recording didn't pause
cleanly between two vocative words — a per-recording alignment judgment
call, not a text rule to encode. Those 4 ayahs were left with no
highlighting data rather than guessed at.

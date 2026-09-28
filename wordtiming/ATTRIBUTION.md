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

## Hani Rifai, Abu Bakr Ash-Shaatree, Husary, Husary (Mujawwad), Abdul Basit, Saood Ash-Shuraym

Same source and license basis as Maher Al-Muaiqly above (QUL, informal
developer permission, not a formal open-license grant — see that section's
caveat, which applies equally here). QUL resource ids: Hani Rifai (104),
Abu Bakr Ash-Shaatree (117), Husary (112 — QUL's own filename says
"murattal-hafs-957" but its `audio_url` field reveals it's actually the
plain murattal recording; QUL's differently-titled ids 110/111 for this
reciter turned out via the same `audio_url` check to be the Muallim and
Mujawwad recordings respectively — don't trust QUL's on-site titles over
each entry's own `audio_url`), Husary Mujawwad (111), Abdul Basit (115,
murattal only — QUL's mujawwad export id 114 has no matching per-ayah
audio edition on this app's audio source, so wasn't usable), Saood
Ash-Shuraym (107).

Verified before use, same standard as Maher: per-ayah audio confirmed
working on this app's audio source (Al Quran Cloud API) for each edition,
and audio-identity spot-checked (11 ayahs spread across different surahs
per reciter) against QUL's own stated audio source per ayah. Hani Rifai and
Abu Bakr Ash-Shaatree matched **byte-for-byte identical file sizes** on
every sampled ayah. Husary (both variants) and Abdul Basit matched
byte-identically or with only container-level padding differences on
nearly every sample, with one anomalous ayah each (Husary Mujawwad's 2:255,
notably a much longer/more elaborate take in one source than the other —
plausibly a genuinely different recording session for that one famous
ayah) that the segmentation step below independently caught and excluded
regardless. Saood Ash-Shuraym matched closely on 5 of 6 sampled ayahs
(small encoder-padding differences, ~0.02-0.04s) with one outlier (1:1)
that, likewise, the segmentation step excluded on its own.

One notable finding while converting: **not every reciter's QUL export
uses the vocative-splitting convention documented above.** Hani Rifai's
alignment keeps these constructions as a single segment — the same
convention this app's own text splitter already uses — so applying
Maher's multiplicity rule there produced 366 false mismatches instead of
resolving them. `convert-qul-wordtiming.mjs` now tries both conventions
per reciter and keeps whichever actually matches that export's own data
(logged as part of its output). Skipped-ayah counts per reciter, out of
6,236: Hani Rifai 0, Husary 3, Abdul Basit 4, Abu Bakr Ash-Shaatree 5,
Husary Mujawwad 5, Saood Ash-Shuraym 5 — all comparable to or better than
Maher's 4, and in every case left with no highlighting data for that
specific ayah rather than a guessed mapping.

`ar.abdulsamad` was tried and rejected as Abdul Basit's edition before
settling on `ar.abdulbasitmurattal` — despite both resolving to the same
person's name on the Al Quran Cloud API, `ar.abdulsamad`'s actual audio
turned out to be a completely different recording (durations off by tens
to hundreds of seconds per ayah), while `ar.abdulbasitmurattal` matched
QUL's export byte-for-byte. A reminder that edition identifiers and
display names on this API aren't a reliable proxy for which recording is
actually behind them — always verify the audio itself.

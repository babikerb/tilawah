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

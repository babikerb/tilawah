# Tilawah — build plan

Quran audio app. Originally built from a Figma Make file (vintage cassette
theme); redesigned per the user's request into an "old-web portal" style
inspired by mp3quran.net's 2010s-era look — deep Islamic green + cream,
boxed sections with green title strips, thin borders, dense list rows, no
gradients or skeuomorphic effects. See "Redesign" section below for the
current design system and what's done vs. still pending.

Stack: Expo SDK 57 + TypeScript, Expo Router (routes in `src/app/`), Zustand
(+ AsyncStorage persistence), `expo-audio` for playback, `@gorhom/bottom-sheet`
for the reciter picker, Al Quran Cloud API for ayah text/translation/per-ayah
audio URLs, Islamic Network CDN for the actual audio files.

## Phases

- [x] **Phase 0 — Bootstrap.** Expo TS scaffold, Expo Router wiring, fonts
      (Alfa Slab One / Special Elite / Amiri Quran / Arvo), theme tokens,
      audio + background-playback config in `app.json`.
- [x] **Phase 1 — Design system.** Reel, CassetteCard, SurahRow, JuzHeader,
      EmptyState, MiniPlayer, VuBars, StampButton (skeuomorphic press effect),
      PaperBackground, CassetteSpine, icon set.
- [x] **Phase 2 — Data layer.** 114-surah dataset, reciter list mapped to
      real CDN edition IDs, `quranApi.ts` (ayah text + translation),
      `audioUrls.ts` (full-surah stream URLs), Zustand stores
      (`usePlayerStore`, `useLibraryStore`) persisted to AsyncStorage.
- [x] **Phase 3 — Screens & navigation.** Home (`src/app/index.tsx`), Now
      Playing (`src/app/player.tsx`), Reciter bottom sheet, root layout with
      font loading + splash screen handoff.
- [x] **Phase 4 — Audio engine.** `PlaybackProvider` wrapping `expo-audio`
      (`useAudioPlayer`/`useAudioPlayerStatus`), lock-screen metadata,
      background playback, repeat-current-surah, custom scrubber.
- [x] **Phase 5 — Persistence & polish.** Saved-surahs + last-played state
      persist via AsyncStorage; loading/error states on the ayah fetch;
      accessibility labels on all interactive controls; haptic feedback on
      the stamp buttons. App icon, Android adaptive icon (+ monochrome
      themed-icon variant), and splash screen ported from the cassette
      artwork the user added to the Figma Make file — rasterized from its
      SVG source rather than cropping a mockup screenshot, so it matches
      pixel-for-pixel. Marquee ticker and true paper-grain texture remain
      simplified (see below).
- [x] **Phase 6 — QA & shippability.** `tsc --noEmit` and `expo lint` both
      clean; `expo-doctor` clean (21/21); `eas.json` build profiles
      (development/preview/production); README with run + build instructions.
      Still open: actual run on a simulator/device — this Windows machine has
      no Xcode/Android Studio, and the one `expo start --web` attempt was
      killed by the harness for low system memory before it finished
      bundling. The user chose to skip visual verification for now rather
      than retry.

## Redesign — "old-web portal" style (in progress)

Design system (`src/theme/tokens.ts`):
- Colors: `green` #0E5A3F (primary), `greenDark` #0A4530 (bars/headers),
  `greenLight` #E7F1EC (tints/selected rows), `cream` #FAF7F0 (page bg),
  `creamAlt` #F1ECDF (striped rows), `border` #D8D3C7, `gold` #B8912A /
  `goldLight` #EFE2BE (accents only), `ink` #1F2A24, `inkMuted` #5C6862.
- Fonts: Amiri (UI Arabic labels/names), Amiri Quran (scripture text only,
  kept from before — it's built for Uthmani script), Noto Sans (UI Latin
  text, 400/500/700).
- Radii: 2–4px everywhere (`radii.sm/md/lg` = 2/3/4), no pill shapes.
- Core components: `SectionBox` (bordered box, green title strip — the
  building block for every screen), `AppHeader` (green bar with a subtle
  8-point-star SVG tessellation — an original tiling pattern, not copied
  from any site), `AppBackground` (flat cream, no texture), `FlatIconButton`
  (thin border or green fill, no gradients/shadows).

Done: Home, Now Playing, and the Reciter picker sheet fully restyled.
`CassetteCard`, `Reel`, `VuBars`, `PaperBackground`, `StampButton`, and the
old `CassetteSpine` (→ renamed/rewritten as `ReciterRow`) were retired as
part of this — the vintage skeuomorphic effects don't fit a flat,
dense-list, "no gradients" style. Surah list is now literal table rows
(number / names / ayah count / icons) with alternating shading; the old
big cassette "continue listening" card is now a plain boxed row.

Still pending, per explicit user requests — each is a real feature/
architecture addition, not just styling, so treating as separate follow-up
work rather than bundling into the visual restyle:
- **Settings screen** — default reciter, language, theme, persisted.
- **Offline downloads** — real `expo-file-system` downloads, not just a UI
  affordance.
- **Recently played tracking** — new store + a home section; needs a
  policy (how many entries, keyed by surah+reciter or just surah?).
- **Arabic/English UI toggle + RTL** — real i18n (translate every UI
  string) plus `I18nManager` layout mirroring. Note: RTL layout direction
  changes in React Native require an app restart to take effect after
  toggling — can't be instant.
- **Light/dark theme toggle** — needs a theme context (current tokens are
  static consts, not swappable), plus a dark-green/charcoal palette.
- **App icon/splash mismatch**: the current icon and splash screen are the
  vintage-cassette artwork from before this redesign — they no longer
  match the new green/cream look. Needs new artwork from the user (same
  policy as before: not fabricating branding without their input).

## Audio architecture: per-ayah playback (replaced full-surah streaming)

Originally played one continuous full-surah MP3 per reciter. Rebuilt as
sequential per-ayah clips instead, driven by explicit user request for the
displayed ayah to auto-sync with what's playing:

- `quranApi.ts`'s `fetchSurahAyahs(surahId, reciterEdition)` now fetches
  three editions in one call (`quran-uthmani,en.sahih,{reciterEdition}`)
  and each `Ayah` carries its own `audioUrl`.
- `PlaybackProvider` owns `ayahs`/`ayahIndex` now (moved out of
  `player.tsx`, which previously tracked them locally and independently
  of what was actually playing) — it loads each ayah's clip in sequence,
  auto-advances on `didJustFinish`, and loops to ayah 1 or stops at the
  end of the surah depending on `repeat`. Prev/Next buttons now actually
  change what's playing, not just what's displayed.
- Whole-surah preload: as soon as a surah's ayah list loads, every ayah's
  audio is preloaded sequentially via `expo-audio`'s `preload()` (confirmed
  against the installed package's actual type definitions, not just docs)
  so advancing between ayahs has no network gap. Cleared via
  `clearAllPreloadedSources()` when switching surah/reciter.
- Bismillah: no special-casing needed. The data source already prepends it
  to ayah 1's text+audio for every surah except At-Tawbah (confirmed via
  direct API inspection), and for Al-Fatihah ayah 1 *is* the Bismillah
  itself (a standalone ayah, per the standard count of Fatihah as 7 ayahs).
- Reciter requirement going forward: **must have per-ayah audio**
  (`/v1/ayah/{n}/{edition}` returning a real `audio` field), not just
  full-surah files — many editions are "recited surah by surah" only and
  return a 404 telling you so. Verified working: `ar.alafasy`,
  `ar.abdulbasitmurattal`, `ar.husary`, `ar.abdurrahmaansudais`,
  `ar.minshawi`. Two swaps happened for this reason: Maher Al-Muaiqly
  (`ar.mahermuaiqly`) had no full-surah files at all under the old
  architecture; Saud Al-Shuraim (`ar.saudalshuraim`), his replacement, was
  then found to have no *per-ayah* files once the architecture changed —
  replaced again with Al-Husary.
- **Word-level highlighting: implemented**, for 3 of 5 reciters. Researched
  two options: the official Quran Foundation API (real word/ayah timestamp
  segments, but requires OAuth `client_id`/`client_secret` that "must stay
  on your backend" — i.e. a server we don't have, plus the user registering
  a developer account) vs. `quran-align` (a static, freely downloadable
  CC-BY-4.0 dataset, no backend needed). Went with `quran-align`.
  - Verified — not assumed — that our CDN's audio is usable with this
    data: byte-for-byte compared our per-ayah files against everyayah.com's
    (what the data was aligned against) for all 5 reciters. **Alafasy,
    As-Sudais, and Al-Minshawi are audio-identical** (only container-level
    differences: a trailing ID3 tag, a LAME header, etc. — zero difference
    in the actual audio frames). **Al-Husary is a different recording**
    (mismatched from byte 0, even at matching bitrate) — excluded. **Abdul
    Basit is unconfirmed** (~100ms estimated duration drift, no exact
    bitrate match available) — excluded per the user's choice rather than
    risk visibly-wrong highlighting.
  - Also verified word-tokenization matches between the two independent
    data sources (whitespace-splitting our `quran-uthmani` text produces
    the same per-ayah word counts as `quran-align`'s segments, checked
    against all 7 ayahs of Al-Fatihah).
  - `wordtiming/<edition>/<surahId>.json` — the original per-reciter
    dataset split into one file per surah (114 files/reciter) for on-demand
    loading, matching our existing lazy-fetch pattern. Attribution in
    `wordtiming/ATTRIBUTION.md` (CC-BY-4.0 requires it).
  - `src/lib/wordTiming.ts` fetches these from this repo via jsDelivr's
    GitHub CDN proxy (no hosting/backend needed) — a miss (unsupported
    reciter, network failure) just means no highlighting, never an error.
  - A "segment" can span more than one word (fast-spoken words the
    alignment tool couldn't cleanly separate) — `activeWordRange` in
    `PlaybackProvider` is a `[start, end)` word-index range, not a single
    index, and `AyahCard` highlights the whole range together.
  - `useAudioPlayer`'s `updateInterval` dropped to 100ms (from the
    default) for smoother highlight transitions between fast words.
  - Reciter backtracking/repetition: investigated per user question.
    The alignment data already absorbs minor hesitations/repeats by
    stretching that word's time-window rather than modeling a literal
    repeat (verified: 14-26% of ayahs across our 3 reciters have non-zero
    insertion/deletion counts, and their word-index sequences stay clean
    and monotonic regardless). No code fix exists beyond what the data
    already does — genuine backtracking would need real audio
    realignment, out of scope here.
  - **Stop-mark bug (fixed).** The Uthmani text encodes small waqf/pause
    marks (ۖ ۗ ۘ ۙ ۚ ۛ ۜ, U+06D6-U+06ED) as their own whitespace-separated
    tokens. A naive `.split(/\s+/)` counted them as words, silently
    shifting every highlight index after the first mark in an ayah.
    Confirmed against real data: Al-Baqarah 255 (Ayat al-Kursi) has 58
    whitespace tokens but exactly 50 word segments in the timing data —
    the difference is its 8 stop marks. `src/lib/arabicWords.ts`'s
    `splitAyahWords()` now merges a mark-only token into the previous real
    word (still displayed, doesn't consume its own index) instead of
    giving it a slot; verified it produces exactly 50 words for that ayah.
  - **Highlight bleed-over between ayahs (fixed).** `activeWordRange` now
    checks `loadedUriRef.current === uri` before computing anything — the
    instant `ayahIndex` changes, `uri` points at the new ayah but `status`
    (currentTime included) still reflects the *old* clip until the
    player.replace() effect has actually run. Without the guard, leftover
    currentTime from the old ayah could coincidentally land inside a valid
    segment for the new ayah's unrelated word timing and briefly highlight
    the wrong word.
  - **Highlight blinking off mid-ayah (fixed).** `activeWordRange` used to
    require playback's current time to fall *within* a segment's own
    `[start, end)` window, so any gap between one word's end and the
    next's start — routine in forced-alignment data, and more noticeable
    after a slowly-spoken word with a longer natural pause after it — left
    no segment matching and the highlight blinked off entirely for that
    gap. Changed to "the most recently *started* segment" instead: once a
    word's segment begins, it stays the active one straight through to the
    next word's segment starting, with no gap in between — and, for an
    ayah's last word, all the way to the end of that ayah's audio instead
    of disappearing at its own nominal end time. Combined with the
    existing bleed-over guard above, a word now stays visibly highlighted
    for the entirety of an ayah and only clears in the brief transition to
    the next one before highlighting its first word. Also closed the
    matching gap at the very *start* of an ayah — a beat of lead-in
    silence before the first word's segment technically begins used to
    show no highlight at all; now the first word lights up immediately,
    so the highlight is continuously visible for the ayah's whole
    duration and only ever clears between ayahs, never mid-ayah.
  - **Bismillah is now a real separate audio clip**, not just a display
    split (superseding the earlier "no separate audio needed" note below
    — the earlier version left Bismillah's duration bundled into ayah 1's
    displayed timing, which is exactly what made ayah 1 "feel off"
    compared to every other ayah). The clip is this reciter's own
    Al-Fatihah ayah 1 — a real, independent recording of exactly this
    phrase, fetched once per reciter (it's the same file for every surah)
    and cached in `PlaybackProvider`. Sequencing: play the clip, then seek
    ayah 1's own file straight past its embedded copy of the Bismillah
    (using the same `bismillahBoundary.endMs` used for the display split)
    instead of replaying it — so it's heard exactly once. Ayah 1's
    displayed duration/progress is offset-adjusted by that skip amount
    (`skipOffsetSec` in `PlaybackProvider`) so it reads as just the real
    content's length, matching every other ayah. "Repeat ayah" on ayah 1
    seeks to the offset, not to 0, for the same reason. Eligibility
    unchanged from the display-split version: Al-Fatihah, At-Tawbah, the
    ~29 disjointed-letter surahs, and Husary/Abdul Basit all keep the
    simple combined-file behavior (no boundary to seek to, so a separate
    clip would just play Bismillah twice in a row).
    Known simplification: if the per-reciter clip or boundary data hasn't
    finished loading by the time ayah 1's audio needs to start, playback
    falls back to ayah 1's own combined file with no split for that one
    visit (rather than block playback waiting on it) — Bismillah is still
    heard, just via the old embedded path that one time.
  - **Fixed: Bismillah silently skipped on most surahs, not just the
    first one or two.** Root cause: the clip's `audioUrl` is the exact same
    file across every surah for a given reciter, but the "have we already
    started loading this" guard in the load-current-uri effect compared raw
    `uri` strings — and `uri` was that effect's *only* dependency. If a
    bismillah-eligible surah was swapped to again (or repeat-surah looped
    back to ayah 1) before the previous surah's clip had naturally finished,
    `uri` recomputed to a string already equal to what was loaded — React
    saw no dependency change and never re-ran the effect at all, so the
    native player just kept playing whatever was left of the *previous*
    surah's clip instance instead of restarting for the new one. Explains
    exactly the reported symptom: the first surah played always gets a
    genuinely fresh load (nothing loaded yet to collide with), but picking
    another surah before that clip finished silently dropped it from then
    on. Fixed by introducing `requestKey` (`uri`, except during the
    Bismillah phase it's `bismillah:${bismillahVisitId}`, a counter bumped
    on every fresh arrival at ayah 1) and keying the load effect and its
    staleness guards (arm-for-finish, didJustFinish, scrub/seek abort
    checks, word-highlight bleed-over guard) off that instead of the raw
    URL — so a repeated file is still recognized as a new playback request.
  - **Fixed (second bug, same symptom): Bismillah skipped when switching
    surahs from anywhere other than ayah 1.** Only manifested when the
    surah swap required `ayahIndex` to actually change to 0 (i.e. you
    weren't already sitting on ayah 1) — confirmed via user repro:
    listened partway into a surah, then swapped, and the new surah's
    Bismillah never played. Root cause: switching surahs resets `ayahIndex`
    to 0 in one render, but the new surah's `ayahs` array doesn't arrive
    until its fetch resolves — the *previous* surah's `ayahs` was left
    sitting in state in the meantime (deliberately, for reciter switches,
    to keep old content playing gracefully — see hasFallbackContent). In
    the in-between render where `ayahIndex` is already 0 but `ayahs` is
    still the old surah's, `uri` fell through to `ayahs[0]?.audioUrl` —
    the *old* surah's own ayah-1 file, a real, validly-loadable URL. The
    load-current-uri effect can't tell that apart from a deliberate
    "play ayah 1 directly" decision, so it committed to that stale file
    and locked in `bismillahBypassed = true` for the new surah in the very
    same render the bypass-reset effect was trying to clear that flag —
    two effects racing over one flag in the same commit, and the wrong one
    ran later. Fixed by clearing `ayahs` to `[]` (not just resetting
    `ayahIndex`) the moment a genuine surah change starts, so that
    transitional render correctly resolves `uri` to `null` instead of a
    stale-but-valid file, and the load effect never fires (let alone locks
    in the bypass) until real data — or the Bismillah clip — is ready.
  - **Fixed: long pause between Bismillah finishing and ayah 1 actually
    starting.** The whole-surah preload sweep (below) started the instant a
    surah's `ayahs` arrived, which is *seconds* before the Bismillah clip
    finishes playing — so for that whole window it was sequentially
    downloading ayah 2, ayah 3, etc. in the background, still mid-download
    exactly when ayah 1's own (deliberately not preloaded — see that
    section's comment) cold fetch needed to start. Ayah 1 wasn't slow on its
    own; it was competing for bandwidth against a sweep that already had a
    head start on it. Fixed by holding the whole sweep off until the
    Bismillah question is actually settled for this visit (played through,
    or bypassed) — i.e. until ayah 1's own fetch has already begun — instead
    of starting on a fixed timer with no relationship to the clip's actual
    playback length.
  - **Added: Maher Al-Muaiqly, with highlighting.** Sourced word-timing
    data from [QUL](https://qul.tarteel.ai) (Quranic Universal Library, by
    Tarteel AI) instead of `quran-align` — the latter only ever covered 12
    reciters and doesn't include him. See `wordtiming/ATTRIBUTION.md` for
    the license caveat (informal permission, not a formal open-license
    grant like quran-align's) and the audio-identity verification. Getting
    this reciter working surfaced and fixed a real, previously-undiscovered
    bug: QUL's alignment counts certain Arabic vocative/compound
    constructions (يَٰمُوسَىٰ "O Moses", هَٰٓأَنتُمْ "here you are", بَعْدَمَا
    "after that", etc.) as their true 2-3 spoken words, while this app's
    own `splitAyahWords` (`src/lib/arabicWords.ts`) — shared with the
    already-shipping quran-align-derived reciters, which use the
    single-glued-word convention — keeps them as one displayed word.
    Changing `splitAyahWords` itself to match QUL would have broken the 3
    existing reciters' alignment, so the fix lives entirely in a new
    one-off conversion tool (`scripts/convert-qul-wordtiming.mjs`) that
    reconciles QUL's per-word indices onto this app's existing word
    boundaries without touching the shared splitter. Verified against all
    6,236 ayahs of Maher's export: the reconciliation rule accounts for
    every mismatch except 4 ayahs, where this specific recording didn't
    pause cleanly between two vocative words (a per-recording audio
    judgment call, not a text-rule gap) — those 4 ayahs ship with no
    highlighting rather than a guessed mapping. `scripts/download-qul-export.mjs`
    (a separate one-off tool, run locally with the developer's own QUL
    account credentials via env vars — never committed) discovers and
    downloads every QUL recitation resource tagged "with segments" for
    reuse if more reciters are added later this way.
  - **Investigated and rejected: Yasser Al-Dosari, Saad Al-Ghamdi, Abdullah
    Al-Juhani.** None have usable per-ayah audio on this app's audio source
    (Al Quran Cloud API) — Al-Dosari and Al-Juhani only have full-surah
    editions, Al-Ghamdi has no edition at all — so none could be added
    regardless of word-timing data. Not pursued further.
  - **Added 6 more reciters with highlighting, 2 more without.** Same QUL
    source, verification standard, and license basis as Maher above — see
    `wordtiming/ATTRIBUTION.md` for the full per-reciter writeup. With
    highlighting: Hani Rifai, Abu Bakr Ash-Shaatree, Husary, Husary
    (Mujawwad), Abdul Basit, Saood Ash-Shuraym. Without (real per-ayah
    audio, but QUL's "with segments"-tagged export for each turned out to
    be an empty stub — zero real data, same as the earlier Abdullah
    Al-Juhani finding): Abdullah Basfar, Muhammad Jibreel. Two things
    worth remembering from this round:
    - **QUL's on-site reciter titles for a resource aren't reliable** —
      Husary's 3 export variants were mislabeled relative to their actual
      content; the real identity of each only became clear from its own
      per-ayah `audio_url` field, not its display name.
    - **Same reciter name ≠ same recording** — `ar.abdulsamad` and
      `ar.abdulbasitmurattal` both resolve to "Abdul Basit" on the Al
      Quran Cloud API, but `ar.abdulsamad`'s actual audio is a completely
      different recording (durations off by tens to hundreds of seconds
      per ayah) from what QUL's export was built against, while
      `ar.abdulbasitmurattal` matched byte-for-byte. Edition identifiers
      and display names are not a substitute for verifying the audio
      itself.
    - Not every reciter's QUL export uses the same word-splitting
      convention as Maher's — Hani Rifai's keeps vocative constructions as
      one segment (matching this app's own splitter already), so
      `convert-qul-wordtiming.mjs` now tries both conventions per reciter
      and keeps whichever one actually reconciles against that export's
      own data.
  - **Ayah-transition gap reduced.** `didJustFinish` (and everything else
    read from player status) is only noticed on the next polled status
    update, so the audio player's `updateInterval` — already once lowered
    for smoother word-highlight transitions — direct-contributes to the
    perceived gap between one ayah ending and the next one starting.
    Lowered further (100ms → 35ms) for a real, low-risk reduction in that
    gap. A true zero-gap transition would need switching from this app's
    current single-player-with-`.replace()` model to expo-audio's
    `AudioPlaylist` (native `AVQueuePlayer`-backed queue, built for gapless
    playback) — a genuine rearchitecture of Bismillah sequencing,
    preloading, repeat modes, and the word-highlighting `requestKey`
    system, not attempted here.

## Orientation lock

`app.json`'s `"orientation": "portrait"` was already set, but per Expo's
own docs that's "a build-time configuration, it has no effect in Expo Go"
— which is almost certainly how the user saw it rotate, since Expo Go is
what's recommended for testing without a signed dev-client build. Added
`expo-screen-orientation`'s `lockAsync(PORTRAIT_UP)` at the root layout as
a runtime lock, which works inside Expo Go too.

## Repeat modes

Was a single on/off boolean with no indication of *what* it repeated —
ambiguous per user feedback. Now a 3-state `repeatMode` in `usePlayerStore`
('off' | 'ayah' | 'surah'), cycled by tapping the repeat control, with the
current mode spelled out in the label ("Repeat: Off/Ayah/Surah") instead of
a bare checkbox. "Ayah" replays only the current ayah forever (doesn't
advance — for memorization/drilling one verse); "surah" behaves like the
old `repeat: true` (advances normally, loops to ayah 1 at the end).

Not done: looping a custom ayah range, or looping an ayah a fixed number of
times then continuing. Deferred as a separate, bigger feature (needs new UI
for range/count selection) rather than guessed at — worth a real design
pass if wanted.

## Known simplifications vs. the Figma prototype (pre-redesign, may be stale)

- Ayah pagination dots only render for surahs with ≤12 ayahs (the prototype
  only ever had 2–7 sample ayahs; real surahs go up to 286).
- Mini-player track title doesn't marquee-scroll; it truncates instead.
- Paper background uses two soft SVG radial gradients instead of a baked
  fractal-noise texture.
- Reciter selector button uses a plain pressable instead of the full
  offset-shadow "stamp" treatment (only the round transport buttons get that).

## Lock screen / Control Center controls

expo-audio's native layer (`MediaController` on iOS) already wires play,
pause, toggle-play-pause, seek-to-position, and optional seek-forward/back
directly into `MPRemoteCommandCenter` whenever `setActiveForLockScreen` is
active — this app already calls that on every ayah/Bismillah load with
title/artist/album metadata. Reported not working in the prod build; found
two real bugs, both fixed:
- **Root cause: `keepAudioSessionActive` defaults to `false`.** expo-audio's
  native `pause()` deactivates the entire audio session when this is unset,
  which tells iOS the app is done with audio — exactly what makes the Now
  Playing widget stop responding to remote commands after any
  app-initiated pause (real media apps keep the session alive through
  pauses for this reason). Fixed by passing `keepAudioSessionActive: true`
  to `useAudioPlayer`.
- **Second bug: one-directional state sync.** The lock screen's own
  play/pause/toggle handlers call directly into the native player,
  bypassing this app's `isPlaying` store state entirely — so pressing pause
  there left the app still believing it was playing (the in-app button
  stayed on "pause", and the *next* tap wouldn't do what it visually
  promised). Added a reverse-sync effect that updates the store whenever
  `status.playing` disagrees with `isPlaying`, guarded on
  `loadedRequestKeyRef` matching so a stale status reading mid-ayah-
  transition can't misfire it. Doesn't fight the existing forward-sync
  effect: by the time it runs, both sides already agree, so that effect's
  own conditions are false on its next pass.

**"Next track"/"previous track" lock-screen buttons — implemented on iOS**
(e.g. skip to next ayah, the way Spotify skips tracks). expo-audio's own
`MediaController` only exposes seek-forward/backward by a fixed time
interval, not a "different file" track-change concept, and doesn't fit this
app's per-ayah-separate-files model — so this needed real custom native
code: `modules/lock-screen-track-controls/` is a local Expo module (Swift)
that registers `MPRemoteCommandCenter`'s `nextTrackCommand`/
`previousTrackCommand` directly — the same shared singleton expo-audio's
own MediaController uses, just the two command properties it doesn't touch,
so the two coexist without conflict. Emits `onNextTrack`/`onPreviousTrack`
events consumed in `PlaybackProvider`, mapped onto the exact same
`setAyahIndex` calls the in-app transport buttons use, so it inherits all
of that state's existing correctness (Bismillah bypass-reset, highlighting
`requestKey`, etc.) for free — the effect doesn't know or care whether an
ayahIndex change came from a screen tap or a lock-screen press. Android:
explicitly out of scope per the user's own call, not just deferred — its
media session (as configured by expo-audio, using AndroidX Media3) actively
*removes* `COMMAND_SEEK_TO_NEXT_MEDIA_ITEM`/`COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM`
from the available player commands, since ExoPlayer's queue always holds
exactly one item here too. Getting this on Android for real would mean
forking/patching expo-audio's Android module (its session/notification
internals aren't exposed for extension) — a materially bigger, riskier
undertaking than the iOS side, not a symmetrical "just add the Android
half" job.

## Over-the-air updates (EAS Update)

Added `expo-updates`, `runtimeVersion: { policy: "fingerprint" }`, and an
`updates.url` pointing at this project's EAS Update endpoint in `app.json`;
added a matching `channel` to each `eas.json` build profile
(development/preview/production) so a build only ever picks up updates
published to its own channel. See README's "Over-the-air updates" section
for the actual `eas update` command. Fingerprint-based runtime versioning
means an update is only offered to builds whose native code it's actually
compatible with — a change requiring a native rebuild (new native
dependency, config plugin, anything touching `expo prebuild`) simply won't
reach existing builds via OTA, by design.

## Not done (needs the user)

- Real device/simulator verification (no iOS/Android simulator on this
  Windows machine — verify via Expo Go on a phone, or `expo start --web`
  for a rough layout check).
- App Store / Play Store submission — needs Apple/Google developer
  credentials the assistant doesn't have.

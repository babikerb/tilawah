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
- Not done: true word-level highlighting. Needs a specialized timing
  dataset (Al Quran Cloud has none); a research project called
  `quran-align` publishes word/ayah timestamps for a handful of reciters
  synced to everyayah.com audio, not our current CDN — flagged as a
  distinct follow-up to research, not guaranteed to pan out with our
  reciters/audio source.

## Known simplifications vs. the Figma prototype (pre-redesign, may be stale)

- Ayah pagination dots only render for surahs with ≤12 ayahs (the prototype
  only ever had 2–7 sample ayahs; real surahs go up to 286).
- Mini-player track title doesn't marquee-scroll; it truncates instead.
- Paper background uses two soft SVG radial gradients instead of a baked
  fractal-noise texture.
- Reciter selector button uses a plain pressable instead of the full
  offset-shadow "stamp" treatment (only the round transport buttons get that).

## Not done (needs the user)

- Real device/simulator verification (no iOS/Android simulator on this
  Windows machine — verify via Expo Go on a phone, or `expo start --web`
  for a rough layout check).
- App Store / Play Store submission — needs Apple/Google developer
  credentials the assistant doesn't have.

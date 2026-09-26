# Tilawah — build plan

Vintage cassette-themed Quran audio app. Source design: Figma Make file
`Tilawah-Quran-App-UI-Design` (3 screens: Home, Now Playing, Reciter sheet).

Stack: Expo SDK 57 + TypeScript, Expo Router (routes in `src/app/`), Zustand
(+ AsyncStorage persistence), `expo-audio` for playback, `@gorhom/bottom-sheet`
for the reciter picker, Al Quran Cloud API for ayah text/translation, Islamic
Network CDN for full-surah reciter audio.

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

## Known simplifications vs. the Figma prototype

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

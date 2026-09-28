# Tilawah

A vintage cassette-themed Quran audio player, built with Expo + React Native.
Browse all 114 surahs grouped by Juz, play per-ayah recitations from a choice
of reciters (word-by-word highlighting synced to playback for the reciters
with verified alignment data), follow along with Arabic text and translation,
save favorites, and resume where you left off.

Design source: Figma Make — *Tilawah Quran App UI Design*.

## Stack

- **Expo SDK 57** (React Native 0.86, React 19, New Architecture)
- **Expo Router** — file-based routes in `src/app/`
- **expo-audio** — streaming playback, background audio, lock-screen controls
- **Zustand + AsyncStorage** — saved surahs and player state persistence
- **@gorhom/bottom-sheet** — reciter picker
- **Al Quran Cloud API** (`api.alquran.cloud`) — ayah text + translation
- **Islamic Network CDN** (`cdn.islamic.network`) — reciter audio streams
- **[QUL](https://qul.tarteel.ai)** (Quranic Universal Library) — word-timing
  data backing the highlighting feature for several reciters, converted
  offline into `wordtiming/` (see `wordtiming/ATTRIBUTION.md` for sourcing and
  license notes per reciter, and `scripts/` for the fetch/convert tooling)

Al Quran Cloud and Islamic Network are free, public, and require no API key.

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone (iOS or Android), or press
`i` / `a` if you have a simulator/emulator set up locally.

> This project uses native modules (`expo-audio`, `react-native-reanimated`,
> `@gorhom/bottom-sheet`, etc.) that aren't in the default Expo Go binary. If
> Expo Go reports missing native modules, build a development client instead:
> `npx expo run:ios` / `npx expo run:android`, or `eas build --profile development`.

A rough layout check is also possible in a browser via `npx expo start --web`,
though the app is designed for mobile and isn't tuned for web.

## Scripts

| Command | Purpose |
|---|---|
| `npm run start` | Start the Metro dev server |
| `npm run ios` / `npm run android` / `npm run web` | Start and open on a platform |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |

Run `typecheck` and `lint` before considering any change done.

## Project layout

```
src/
  app/            Expo Router screens (index = Home, player = Now Playing)
  components/     UI split by feature: home/, player/, reciter/, ui/
  data/           Surah list, reciter list, shared types
  lib/            Quran text API, audio URL builder, playback context
  store/          Zustand stores (player, saved-surah library)
  theme/          Design tokens (colors, fonts) and font loader
```

See `PLAN.md` for the phase-by-phase build log, known simplifications versus
the original Figma design, and what's still open.

## Building for release

This repo ships with an `eas.json` (development/preview/production profiles)
and is already linked to an EAS project (see `extra.eas.projectId` in
`app.json`). To build and submit:

```bash
npx eas-cli@latest login       # your Expo account
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform ios --profile production
npx eas-cli@latest submit --platform android --profile production
```

App Store / Play Store submission additionally requires your own Apple
Developer and Google Play Console credentials, and (separately, configured
directly in App Store Connect / Play Console, not this repo) a hosted privacy
policy URL.

## Over-the-air updates

JS/asset-only changes (no native code, no new native dependencies) can ship
via `eas update` instead of a full store build/review cycle. Each build
profile is wired to a matching update channel (`development`, `preview`,
`production` — see `eas.json`), and `runtimeVersion` uses the `fingerprint`
policy, so an update only reaches builds whose native code it's actually
compatible with.

```bash
npx eas-cli@latest update --branch production --message "Describe the change"
```

A change that touches native code (a new native dependency, a config plugin,
anything requiring `expo prebuild`) needs a real rebuild instead — an OTA
update can't ship that.

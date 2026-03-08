# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tts.bot is a Twitch Text-to-Speech bot for streamers. It connects to Twitch chat via TMI.js, synthesizes speech using AWS Polly, and supports real-time translation via AWS Translate. The app runs entirely client-side (no backend).

The **original** static HTML/JS app lives in `webfront/` (served by nginx, kept for reference).
The **React rewrite** lives in `react-app/` and is the active codebase.

## Development (react-app/)

```bash
cd react-app
npm install
npm run dev        # Vite dev server at localhost:5173
npm run build      # Produces dist/ — point nginx root here
npm run typecheck  # tsc -b with no emit
```

**Nginx**: point the server root at `react-app/dist/`. The `react-app/nginx.conf` file contains the SPA config with `try_files $uri /index.html` fallback. Run `npm run build` and reload nginx after changes.

## Architecture (react-app/src/)

### Auth flow
1. `/login` — user picks voice/language settings, clicks "Authorize on Twitch"
2. Twitch redirects to `/callback` with `#access_token=…` in URL hash
3. `CallbackPage` extracts token → writes to Zustand (persisted in localStorage) → redirects to `/app`
4. `/app` is protected — redirects to `/login` if no token

### Pages
| Route | File | Purpose |
|---|---|---|
| `/login` | `pages/LoginPage.tsx` | Voice setup + Twitch OAuth |
| `/callback` | `pages/CallbackPage.tsx` | Extracts OAuth token from URL hash |
| `/app` | `pages/StreamerDashboard.tsx` | Main TTS dashboard (protected) |
| `/cct` | `pages/CCTOverlay.tsx` | Closed Captions/Translation standalone popup |

### State (Zustand stores — `store/index.ts`)
All stores use `zustand/middleware/persist` to localStorage except session stores.

| Store | Persisted | Contents |
|---|---|---|
| `useAuthStore` | ✓ | `accessToken`, `twitchUsername` |
| `useVoiceStore` | ✓ | All voice/language selections |
| `useChattersStore` | ✓ | Per-user voice configs (`Record<username, ChatterConfig>`) |
| `useSettingsStore` | ✓ | All checkboxes (`cb*`) and text inputs (`txt*`) |
| `useAppearanceStore` | ✓ | CCT overlay visual settings |
| `useConnectionStore` | ✗ | `channel`, `connectionStatus` |
| `useChatUiStore` | ✗ | `messages[]`, `queueCount`, `isPaused`, `currentSpeakingId` |
| `useVoicesDataStore` | ✗ | `voices`, `voicesDesc`, `awsInitialized` |

### AudioPlayer (`audio/AudioPlayer.ts`)
A plain TypeScript class — **not** React state. Created once as a singleton in `hooks/useAudioPlayer.ts` via `useRef`. Key methods: `Speak`, `SpeakNow`, `SpeakNext`, `SpeakCustom`, `SpeakGame2TTS`, `Pause`, `Continue`, `Skip`, `SkipByID`, `Dump`, `DumpByUser`, `PopLastMessage`. Calls `synthesizeSpeech()` from `services/awsService.ts`.

Configure the player after AWS is initialized:
```ts
player.configure({ getSystemVoice, getSystemVoiceOption, getVoices, onQueueCount, onSpeakingId });
```

### TMI.js (`hooks/useTwitchChat.ts`)
`useTwitchChat` hook owns the Twitch chat connection lifecycle. The connection only starts when `enabled: true`. TMI client is stored in a `useRef` to avoid stale closures in handlers. All event handlers are forwarded through a stable `handlers` ref.

### AWS (`services/awsService.ts`)
- `initializeAWS()` — Cognito unauthenticated identity → credentials
- `buildVoiceLookup()` — calls `DescribeVoices`, returns normalized `voices` and `voicesDesc`
- `synthesizeSpeech()` — calls Polly, returns `Uint8Array`
- `translateText()` — calls Translate, returns `{ translatedText, sourceLangCode }`

AWS clients are module-level singletons (not React state). `useAWSServices` hook initializes them once.

### Chat pipeline (`services/chatProcessor.ts`)
`doChat()` is the main async function — ported from the original `doChat()` in `webfront/js/script.js`. It handles:
- Emote stripping (BTTV, FFZ, Twitch)
- SSML detection
- Permission checks (everyone/mod/sub/VIP)
- AWS Translate
- Levenshtein dedup (per-user and chat-wide)
- @username replacement with spoken names
- Link filtering (TLD regex built in `StreamerDashboard`)
- Calling `onSpeak` → `AudioPlayer.Speak()`

### WebSocket support
Two optional WebSocket connections managed in `StreamerDashboard.tsx`:
- `websocketCustomRef` — custom URL, handles `TTS`, `game2tts`, `GPT-Moderated` topics
- `websocketProdRef` — AWS WebSocket backend

### CCT cross-window communication
The original app called `window.cctPopup.processResults()` directly. The React version uses `window.postMessage` with `{ type: 'cct-result', text, isFinal }`. `CCTOverlay` also exposes `window.processResults` for legacy compatibility.

## Key Constants (`constants/index.ts`)
- `TWITCH_CLIENT_ID` — `dan71ek0pct1u7b8ht5u4h55zlcxvq`
- `COGNITO_IDENTITY_POOL_ID` — `us-east-1:e9babc40-c043-4729-91be-de6c1d22b919`
- `AWS_REGION` — `us-east-1`

## Original app (`webfront/`)
Static HTML/JS, no build step. `webfront/js/script.js` (4,300+ lines) is the reference implementation. Do not modify — it serves as documentation for the React rewrite.

# Link til Lyd (Netlify)

En mobilvenlig webapp der kan:

1. Hente læsbar tekst fra en URL.
2. Tage indsat tekst direkte.
3. Konvertere tekst til tale via:
   - Google Gemini TTS (konfigurerbar model, standard: `gemini-3.1-flash-tts`)
   - ElevenLabs (konfigurerbar model, standard: `eleven_v3`)

## Kør lokalt

```bash
npm install
npx netlify dev
```

Åbn derefter den lokale URL fra Netlify CLI.

## Netlify setup

I Netlify projektets **Site configuration → Environment variables** tilføjer du:

- `GOOGLE_API_KEY`
- `GOOGLE_TTS_MODEL` (valgfri, default: `gemini-3.1-flash-tts`)
- `GOOGLE_TTS_VOICE` (valgfri, default: `Kore`)
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_MODEL` (valgfri, default: `eleven_v3`)
- `ELEVENLABS_VOICE_ID` (valgfri, default: `EXAVITQu4vr4xnSDxMaL`)

> Bemærk: API nøgler ligger kun i server-side Netlify Functions og eksponeres ikke i browseren.

## API endpoints

- `POST /api/extract`
  - body: `{ "url": "https://..." }`
- `POST /api/tts`
  - body: `{ "text": "...", "provider": "google" | "elevenlabs" }`

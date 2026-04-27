# Link til Lyd (Netlify)

Mobilvenlig webapp der:
1. Henter tekst fra en artikel-URL.
2. Eller bruger tekst du selv indsætter.
3. Konverterer teksten til lyd via Google Gemini TTS eller ElevenLabs.

## Opsætning

```bash
npm install
npm run start
```

## Netlify environment variables

Tilføj disse i **Site settings → Environment variables**:

- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID` (valgfri, default er en offentlig demo-voice)

## Vigtige noter om modeller

- Google: Appen bruger som standard `gemini-2.5-flash-preview-tts` (og `gemini-2.5-pro-preview-tts`).
- ElevenLabs: Appen bruger `eleven_v3`.

Hvis du vil bruge andre model-id'er senere, kan du nemt tilføje dem i `app.js`.

## API-ruter (Netlify Functions)

- `/.netlify/functions/extract-text` – udtrækker tekst fra URL.
- `/.netlify/functions/synthesize` – konverterer tekst til lyd og returnerer base64-audio.

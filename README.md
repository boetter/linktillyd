# LinkTilLyd

Mobilvenlig webapp der kan:

1. Hente artikeltekst fra en URL.
2. Lade brugeren indsætte rå tekst manuelt.
3. Konvertere tekst til lyd via enten Google Gemini TTS eller ElevenLabs v3.

## Kør lokalt

```bash
npm install
npm run start
```

## Netlify setup

Tilføj disse Environment Variables i Netlify:

- `GOOGLE_API_KEY`
- `ELEVENLABS_API_KEY`

Appen bruger Netlify Functions, så API-nøglerne aldrig eksponeres i browseren.

## API-endpoints

- `POST /api/extract-text` `{ "url": "https://..." }`
- `POST /api/synthesize` med payload:

```json
{
  "text": "...",
  "provider": "google | elevenlabs",
  "model": "...",
  "googleVoice": "Kore",
  "elevenVoiceId": "JBFqnCBsd6RMkjVDRZzb"
}
```


const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...JSON_HEADERS,
      ...CORS_HEADERS
    },
    body: JSON.stringify(body)
  };
}

async function googleTts(text) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const model = process.env.GOOGLE_TTS_MODEL || 'gemini-3.1-flash-tts';
  const voiceName = process.env.GOOGLE_TTS_VOICE || 'Kore';

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set.');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const googleResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text }]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName
            }
          }
        }
      }
    })
  });

  const data = await googleResponse.json();

  if (!googleResponse.ok) {
    throw new Error(data?.error?.message || 'Google TTS request failed.');
  }

  const audioPart =
    data?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data) ||
    null;

  const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';
  const audioBase64 = audioPart?.inlineData?.data;

  if (!audioBase64) {
    throw new Error('Google TTS returned no audio payload.');
  }

  return {
    audioBase64,
    mimeType,
    provider: 'google',
    model
  };
}

async function elevenLabsTts(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const model = process.env.ELEVENLABS_MODEL || 'eleven_v3';
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set.');
  }

  const elevenResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: model,
        output_format: 'mp3_44100_128'
      })
    }
  );

  if (!elevenResponse.ok) {
    const errorText = await elevenResponse.text();
    throw new Error(errorText || 'ElevenLabs TTS request failed.');
  }

  const arrayBuffer = await elevenResponse.arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString('base64');

  return {
    audioBase64,
    mimeType: 'audio/mpeg',
    provider: 'elevenlabs',
    model
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Only POST is supported.' });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Invalid JSON payload.' });
  }

  const rawText = payload?.text;
  const provider = payload?.provider;

  if (!rawText || typeof rawText !== 'string') {
    return response(400, { error: 'Text is required.' });
  }

  const text = rawText.trim();

  if (text.length < 10) {
    return response(400, { error: 'Text must be at least 10 characters.' });
  }

  if (text.length > 15000) {
    return response(400, {
      error:
        'Text is too long for one request (max 15,000 chars). Split it into smaller chunks.'
    });
  }

  if (!['google', 'elevenlabs'].includes(provider)) {
    return response(400, {
      error: "Provider must be either 'google' or 'elevenlabs'."
    });
  }

  try {
    const ttsResult =
      provider === 'google' ? await googleTts(text) : await elevenLabsTts(text);

    return response(200, ttsResult);
  } catch (error) {
    return response(502, {
      error: 'TTS provider request failed.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

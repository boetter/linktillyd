const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
};

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS
  });
}

async function synthesizeWithGemini({ apiKey, modelId, text, voiceName, speakingRate }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName
          }
        },
        speakingRate
      }
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini-fejl: ${response.status} ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const b64 = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType || 'audio/wav';

  if (!b64) {
    throw new Error('Gemini returnerede ikke audio-data.');
  }

  return {
    audioBase64: b64,
    mimeType
  };
}

async function synthesizeWithElevenLabs({ apiKey, modelId, text, voiceId }) {
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      output_format: 'mp3_44100_128'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs-fejl: ${response.status} ${errText.slice(0, 300)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audioBase64: Buffer.from(arrayBuffer).toString('base64'),
    mimeType: 'audio/mpeg'
  };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return jsonError('Only POST is allowed.', 405);
  }

  try {
    const {
      text,
      provider,
      modelId,
      voiceName = 'Zephyr',
      speakingRate = 1.0,
      elevenVoiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
    } = await req.json();

    if (!text?.trim()) {
      return jsonError('Du skal indsætte en tekst først.', 400);
    }

    if (text.length > 12000) {
      return jsonError('Teksten er for lang. Del den op i mindre stykker (maks 12.000 tegn ad gangen).', 400);
    }

    if (!provider || !modelId) {
      return jsonError('Vælg både udbyder og model.', 400);
    }

    let result;

    if (provider === 'google') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return jsonError('GEMINI_API_KEY mangler i Netlify environment variables.', 500);
      }

      result = await synthesizeWithGemini({
        apiKey,
        modelId,
        text,
        voiceName,
        speakingRate
      });
    } else if (provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return jsonError('ELEVENLABS_API_KEY mangler i Netlify environment variables.', 500);
      }

      result = await synthesizeWithElevenLabs({
        apiKey,
        modelId,
        text,
        voiceId: elevenVoiceId
      });
    } else {
      return jsonError('Ukendt provider.', 400);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS
    });
  } catch (error) {
    return jsonError(error.message || 'Ukendt fejl i TTS-funktion.', 500);
  }
};

const GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const ELEVEN_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

export default async (req) => {
  if (req.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const { text, provider, model, googleVoice, elevenVoiceId } = JSON.parse(req.body || '{}');

  if (!text) {
    return jsonResponse(400, { error: 'Tekst er påkrævet' });
  }

  if (provider === 'google') {
    return synthesizeWithGoogle(text, model || 'gemini-2.5-flash-preview-tts', googleVoice || 'Kore');
  }

  if (provider === 'elevenlabs') {
    return synthesizeWithElevenLabs(text, model || 'eleven_v3', elevenVoiceId || 'JBFqnCBsd6RMkjVDRZzb');
  }

  return jsonResponse(400, { error: 'Ukendt provider' });
};

async function synthesizeWithGoogle(text, model, voiceName) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: 'GOOGLE_API_KEY mangler i Netlify environment variables' });
  }

  const response = await fetch(`${GOOGLE_ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    return jsonResponse(response.status, { error: data?.error?.message || 'Google TTS fejl' });
  }

  const base64Pcm = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Pcm) {
    return jsonResponse(500, { error: 'Ingen audio-data modtaget fra Google' });
  }

  const pcmBuffer = Buffer.from(base64Pcm, 'base64');
  const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'inline; filename="speech.wav"'
    },
    isBase64Encoded: true,
    body: wavBuffer.toString('base64')
  };
}

async function synthesizeWithElevenLabs(text, model, voiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: 'ELEVENLABS_API_KEY mangler i Netlify environment variables' });
  }

  const response = await fetch(`${ELEVEN_ENDPOINT}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: model
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return jsonResponse(response.status, { error: errorData?.detail?.message || 'ElevenLabs TTS fejl' });
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="speech.mp3"'
    },
    isBase64Encoded: true,
    body: Buffer.from(arrayBuffer).toString('base64')
  };
}

function pcmToWav(pcmBuffer, sampleRate, channels, bitDepth) {
  const blockAlign = (channels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const wavBuffer = Buffer.alloc(44 + dataSize);

  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataSize, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitDepth, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
}

const providerEl = document.querySelector('#provider');
const modelEl = document.querySelector('#model');
const articleUrlEl = document.querySelector('#articleUrl');
const articleTextEl = document.querySelector('#articleText');
const extractBtn = document.querySelector('#extractBtn');
const ttsBtn = document.querySelector('#ttsBtn');
const statusEl = document.querySelector('#status');
const playerEl = document.querySelector('#player');
const googleOptionsEl = document.querySelector('#googleOptions');
const voiceNameEl = document.querySelector('#voiceName');
const speakingRateEl = document.querySelector('#speakingRate');

const MODELS = {
  google: [
    {
      value: 'gemini-2.5-flash-preview-tts',
      label: 'Gemini 2.5 Flash Preview TTS (seneste offentlige TTS model-id)'
    },
    {
      value: 'gemini-2.5-pro-preview-tts',
      label: 'Gemini 2.5 Pro Preview TTS'
    }
  ],
  elevenlabs: [
    {
      value: 'eleven_v3',
      label: 'Eleven v3 (seneste)'
    }
  ]
};

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b91c1c' : '#1f2937';
}

function renderModels() {
  const provider = providerEl.value;
  modelEl.innerHTML = '';

  for (const model of MODELS[provider]) {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    modelEl.append(option);
  }

  googleOptionsEl.style.display = provider === 'google' ? 'grid' : 'none';
}

providerEl.addEventListener('change', renderModels);

extractBtn.addEventListener('click', async () => {
  const url = articleUrlEl.value.trim();
  if (!url) {
    setStatus('Indsæt et link først.', true);
    return;
  }

  setStatus('Henter og udtrækker tekst ...');

  try {
    const response = await fetch('/.netlify/functions/extract-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Kunne ikke hente tekst fra linket.');
    }

    articleTextEl.value = data.text;
    setStatus('Tekst hentet fra link ✅');
  } catch (error) {
    setStatus(error.message, true);
  }
});

ttsBtn.addEventListener('click', async () => {
  const text = articleTextEl.value.trim();
  if (!text) {
    setStatus('Indsæt eller hent tekst først.', true);
    return;
  }

  setStatus('Konverterer tekst til lyd ...');
  ttsBtn.disabled = true;

  try {
    const payload = {
      text,
      provider: providerEl.value,
      modelId: modelEl.value,
      voiceName: voiceNameEl.value.trim() || 'Zephyr',
      speakingRate: Number(speakingRateEl.value || '1')
    };

    const response = await fetch('/.netlify/functions/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Fejl ved TTS');
    }

    playerEl.src = `data:${data.mimeType};base64,${data.audioBase64}`;
    await playerEl.play().catch(() => {});
    setStatus('Lyden er klar 🎧');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    ttsBtn.disabled = false;
  }
});

renderModels();

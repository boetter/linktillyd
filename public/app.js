const urlInput = document.getElementById('urlInput');
const textInput = document.getElementById('textInput');
const providerInput = document.getElementById('provider');
const modelInput = document.getElementById('model');
const googleVoiceInput = document.getElementById('googleVoice');
const elevenVoiceIdInput = document.getElementById('elevenVoiceId');
const extractBtn = document.getElementById('extractBtn');
const synthesizeBtn = document.getElementById('synthesizeBtn');
const statusEl = document.getElementById('status');
const player = document.getElementById('player');
const download = document.getElementById('download');

function setStatus(message) {
  statusEl.textContent = message;
}

providerInput.addEventListener('change', () => {
  if (providerInput.value === 'google') {
    modelInput.value = 'gemini-2.5-flash-preview-tts';
  } else {
    modelInput.value = 'eleven_v3';
  }
});

extractBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus('Indsæt først et link.');
    return;
  }

  setStatus('Henter og udtrækker tekst...');
  try {
    const response = await fetch('/api/extract-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Kunne ikke hente tekst.');

    textInput.value = data.text;
    setStatus(`Tekst hentet${data.title ? `: ${data.title}` : ''}`);
  } catch (error) {
    setStatus(error.message);
  }
});

synthesizeBtn.addEventListener('click', async () => {
  const text = textInput.value.trim();
  if (!text) {
    setStatus('Indsæt tekst eller hent en artikel først.');
    return;
  }

  setStatus('Genererer lyd, vent et øjeblik...');
  synthesizeBtn.disabled = true;

  try {
    const response = await fetch('/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        provider: providerInput.value,
        model: modelInput.value.trim(),
        googleVoice: googleVoiceInput.value.trim(),
        elevenVoiceId: elevenVoiceIdInput.value.trim()
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Kunne ikke generere lyd.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    player.src = url;
    download.href = url;
    download.download = providerInput.value === 'google' ? 'artikel.wav' : 'artikel.mp3';
    setStatus('Lyd er klar ✅');
    player.play().catch(() => {});
  } catch (error) {
    setStatus(error.message);
  } finally {
    synthesizeBtn.disabled = false;
  }
});

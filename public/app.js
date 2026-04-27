const urlInput = document.getElementById('urlInput');
const extractBtn = document.getElementById('extractBtn');
const textInput = document.getElementById('textInput');
const ttsBtn = document.getElementById('ttsBtn');
const statusEl = document.getElementById('status');
const audioPlayer = document.getElementById('audioPlayer');
const downloadLink = document.getElementById('downloadLink');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#ff8080' : '#9dd39a';
}

function selectedProvider() {
  const checked = document.querySelector('input[name="provider"]:checked');
  return checked?.value || 'google';
}

async function extractTextFromUrl() {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus('Indsæt først et link.', true);
    return;
  }

  extractBtn.disabled = true;
  setStatus('Henter og udtrækker tekst fra link...');

  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || 'Kunne ikke udtrække tekst.');
    }

    textInput.value = data.text || '';
    const title = data.title ? ` (${data.title})` : '';
    setStatus(`Tekst hentet${title}. Du kan nu lave lyd.`);
  } catch (error) {
    setStatus(error.message || 'Fejl ved udtræk af tekst.', true);
  } finally {
    extractBtn.disabled = false;
  }
}

async function generateAudio() {
  const text = textInput.value.trim();
  if (!text) {
    setStatus('Indsæt eller hent tekst først.', true);
    return;
  }

  const provider = selectedProvider();
  ttsBtn.disabled = true;
  setStatus('Genererer lyd...');

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, provider })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.details || data?.error || 'TTS fejlede.');
    }

    const audioSrc = `data:${data.mimeType};base64,${data.audioBase64}`;
    audioPlayer.src = audioSrc;
    audioPlayer.load();

    downloadLink.href = audioSrc;
    downloadLink.hidden = false;
    downloadLink.download = data.mimeType.includes('mpeg')
      ? 'tekst-til-lyd.mp3'
      : 'tekst-til-lyd.wav';

    setStatus(`Lyd klar (${data.provider} / ${data.model}).`);
  } catch (error) {
    setStatus(error.message || 'Fejl ved lydgenerering.', true);
  } finally {
    ttsBtn.disabled = false;
  }
}

extractBtn.addEventListener('click', extractTextFromUrl);
ttsBtn.addEventListener('click', generateAudio);

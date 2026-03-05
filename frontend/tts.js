// tts.js - Text-to-Speech module using Web Speech API

const TTS = (() => {
  let voices = { en: null, ja: null };
  let isSpeaking = false;
  let voicesLoaded = false;

  function init() {
    if (!('speechSynthesis' in window)) {
      console.warn('TTS not supported in this browser');
      return;
    }
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  function loadVoices() {
    const allVoices = speechSynthesis.getVoices();
    if (allVoices.length === 0) return;
    voicesLoaded = true;

    // English voice
    const enPreferred = ['Samantha', 'Karen', 'Google US English', 'Microsoft Zira'];
    for (const name of enPreferred) {
      const found = allVoices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
      if (found) { voices.en = found; break; }
    }
    if (!voices.en) {
      voices.en = allVoices.find(v => v.lang.startsWith('en-US')) ||
                  allVoices.find(v => v.lang.startsWith('en')) || null;
    }

    // Japanese voice
    const jaPreferred = ['Kyoko', 'O-Ren', 'Google 日本語', 'Microsoft Haruka'];
    for (const name of jaPreferred) {
      const found = allVoices.find(v => v.name.includes(name) && v.lang.startsWith('ja'));
      if (found) { voices.ja = found; break; }
    }
    if (!voices.ja) {
      voices.ja = allVoices.find(v => v.lang.startsWith('ja')) || null;
    }
  }

  function speak(text, rate = 0.9, lang = null) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();

    // Auto-detect language if not specified
    if (!lang) {
      lang = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text) ? 'ja' : 'en';
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ja' ? 'ja-JP' : 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const voice = lang === 'ja' ? voices.ja : voices.en;
    if (voice) utterance.voice = voice;

    utterance.onstart = () => { isSpeaking = true; };
    utterance.onend = () => { isSpeaking = false; };
    utterance.onerror = () => { isSpeaking = false; };

    speechSynthesis.speak(utterance);
  }

  function speakSlow(text, lang = null) {
    speak(text, 0.6, lang);
  }

  function stop() {
    speechSynthesis.cancel();
    isSpeaking = false;
  }

  return { init, speak, speakSlow, stop, get isSpeaking() { return isSpeaking; } };
})();

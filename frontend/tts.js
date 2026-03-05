// tts.js - Text-to-Speech module using Web Speech API

const TTS = (() => {
  let voices = { en: null, ja: null, zh: null, es: null, fr: null };
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

    // Chinese voice
    const zhPreferred = ['Ting-Ting', 'Google 普通话', 'Microsoft Huihui'];
    for (const name of zhPreferred) {
      const found = allVoices.find(v => v.name.includes(name) && v.lang.startsWith('zh'));
      if (found) { voices.zh = found; break; }
    }
    if (!voices.zh) {
      voices.zh = allVoices.find(v => v.lang.startsWith('zh-CN')) ||
                  allVoices.find(v => v.lang.startsWith('zh')) || null;
    }

    // Spanish voice
    const esPreferred = ['Monica', 'Paulina', 'Google español', 'Microsoft Helena'];
    for (const name of esPreferred) {
      const found = allVoices.find(v => v.name.includes(name) && v.lang.startsWith('es'));
      if (found) { voices.es = found; break; }
    }
    if (!voices.es) {
      voices.es = allVoices.find(v => v.lang.startsWith('es-ES')) ||
                  allVoices.find(v => v.lang.startsWith('es')) || null;
    }

    // French voice
    const frPreferred = ['Thomas', 'Amelie', 'Google français', 'Microsoft Hortense'];
    for (const name of frPreferred) {
      const found = allVoices.find(v => v.name.includes(name) && v.lang.startsWith('fr'));
      if (found) { voices.fr = found; break; }
    }
    if (!voices.fr) {
      voices.fr = allVoices.find(v => v.lang.startsWith('fr-FR')) ||
                  allVoices.find(v => v.lang.startsWith('fr')) || null;
    }
  }

  function speak(text, rate = 0.9, lang = null) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();

    // Auto-detect language if not specified
    if (!lang) {
      if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) lang = 'ja';
      else if (/[\u4e00-\u9fff]/.test(text)) lang = 'zh';
      else if (/[áéíóúñ¿¡ü]/i.test(text)) lang = 'es';
      else if (/[àâçéèêëïîôùûüÿœæ]/i.test(text)) lang = 'fr';
      else lang = 'en';
    }

    const langMap = { ja: 'ja-JP', zh: 'zh-CN', es: 'es-ES', fr: 'fr-FR', en: 'en-US' };
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMap[lang] || 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const voice = voices[lang] || voices.en;
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

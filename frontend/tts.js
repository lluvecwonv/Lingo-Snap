// tts.js - Text-to-Speech module using Web Speech API

const TTS = (() => {
  let preferredVoice = null;
  let isSpeaking = false;

  function init() {
    if (!('speechSynthesis' in window)) {
      console.warn('TTS not supported in this browser');
      return;
    }
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  function loadVoices() {
    const voices = speechSynthesis.getVoices();
    // Prefer high-quality en-US voices
    const preferred = ['Samantha', 'Karen', 'Google US English', 'Microsoft Zira'];
    for (const name of preferred) {
      const found = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
      if (found) { preferredVoice = found; return; }
    }
    // Fallback: any en-US voice
    preferredVoice = voices.find(v => v.lang.startsWith('en-US')) ||
                     voices.find(v => v.lang.startsWith('en')) || null;
  }

  function speak(text, rate = 0.9) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => { isSpeaking = true; };
    utterance.onend = () => { isSpeaking = false; };
    utterance.onerror = () => { isSpeaking = false; };

    speechSynthesis.speak(utterance);
  }

  function speakSlow(text) {
    speak(text, 0.6);
  }

  function stop() {
    speechSynthesis.cancel();
    isSpeaking = false;
  }

  return { init, speak, speakSlow, stop, get isSpeaking() { return isSpeaking; } };
})();

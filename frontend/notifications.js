// notifications.js - Popup notification module (all contents random)

const Notifications = (() => {
  let timerId = null;
  let intervalMs = 5 * 60 * 1000; // default 5 minutes
  let enabled = true;
  let soundEnabled = true;

  // Shared AudioContext — created once on first user gesture to avoid autoplay blocking
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function warmUpAudio() {
    getAudioContext();
  }

  // "띠링" chime using Web Audio API (no file needed)
  function playChime() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = 'sine';
      o1.frequency.value = 880;
      g1.gain.setValueAtTime(0.3, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o1.connect(g1).connect(ctx.destination);
      o1.start(ctx.currentTime);
      o1.stop(ctx.currentTime + 0.3);

      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.value = 1175;
      g2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      o2.connect(g2).connect(ctx.destination);
      o2.start(ctx.currentTime + 0.15);
      o2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('[Notif] Sound error:', e);
    }
  }

  function init() {
    enabled = localStorage.getItem('notif_enabled') !== 'false';
    soundEnabled = localStorage.getItem('notif_sound') !== 'false';
    const savedInterval = localStorage.getItem('notif_interval');
    if (savedInterval) intervalMs = parseInt(savedInterval);
    if (enabled) scheduleNext();

    // Warm up AudioContext on first user interaction
    const warmUp = () => {
      warmUpAudio();
      document.removeEventListener('click', warmUp);
      document.removeEventListener('touchstart', warmUp);
      document.removeEventListener('keydown', warmUp);
    };
    document.addEventListener('click', warmUp, { once: true });
    document.addEventListener('touchstart', warmUp, { once: true });
    document.addEventListener('keydown', warmUp, { once: true });

    window.addEventListener('storage', (e) => {
      if (e.key === 'notif_last_time') {
        console.log('[Notif] Another tab fired, rescheduling');
        scheduleNext();
      }
      if (e.key === 'notif_enabled') {
        enabled = e.newValue !== 'false';
        if (enabled) scheduleNext();
        else if (timerId) { clearTimeout(timerId); timerId = null; }
      }
      if (e.key === 'notif_interval') {
        intervalMs = parseInt(e.newValue);
        scheduleNext();
      }
      if (e.key === 'notif_sound') {
        soundEnabled = e.newValue !== 'false';
      }
    });
  }

  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('[Notif] This browser does not support notifications');
      return;
    }
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      console.log('[Notif] Permission result:', result);
    }
    console.log('[Notif] Current permission:', Notification.permission);
  }

  function scheduleNext() {
    if (timerId) clearTimeout(timerId);
    if (!enabled) return;
    const lastTime = parseInt(localStorage.getItem('notif_last_time') || '0');
    const elapsed = Date.now() - lastTime;
    const jitter = Math.random() * 2000;
    const delay = Math.max(0, intervalMs - elapsed) + jitter;
    console.log(`[Notif] Next notification in ${Math.round(delay / 1000)}s`);
    timerId = setTimeout(() => {
      showNotification();
      scheduleNext();
    }, delay);
  }

  async function showNotification() {
    const lastTime = parseInt(localStorage.getItem('notif_last_time') || '0');
    const elapsed = Date.now() - lastTime;
    if (elapsed < intervalMs * 0.8) {
      console.log(`[Notif] Another tab already fired ${Math.round(elapsed / 1000)}s ago, skipping`);
      return;
    }
    localStorage.setItem('notif_last_time', Date.now().toString());

    let expr = null;
    try { expr = await API.get('/expressions/random'); } catch {}
    if (!expr) {
      const cid = typeof App !== 'undefined' && App.getContentId ? App.getContentId() : null;
      if (cid) {
        try { expr = await API.get(`/contents/${cid}/expressions/random`); } catch {}
      }
    }
    if (!expr) { console.log('[Notif] No expression found, skipping'); return; }

    console.log('[Notif] Showing:', expr.expression);
    playChime();

    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(expr.expression, {
        body: expr.korean_meaning,
        tag: 'lingo-snap-' + Date.now(),
        requireInteraction: true
      });
      notif.onclick = () => { window.focus(); showFlashcardPopup(expr); };
    } else {
      console.warn('[Notif] Permission not granted:',
        'Notification' in window ? Notification.permission : 'not supported');
    }

    if (document.visibilityState === 'visible') {
      showFlashcardPopup(expr);
    }
  }

  function showFlashcardPopup(expr) {
    const popup = document.getElementById('flashcard-popup');
    if (!popup) return;

    document.getElementById('flash-expression').textContent = expr.expression;

    // Wire up the speaker button to TTS
    const speakBtn = popup.querySelector('.flash-speak');
    if (speakBtn && typeof TTS !== 'undefined') {
      const newBtn = speakBtn.cloneNode(true);
      speakBtn.parentNode.replaceChild(newBtn, speakBtn);
      newBtn.addEventListener('click', () => { TTS.speak(expr.expression); });
    }

    const src = document.getElementById('flash-source');
    if (src) {
      const parts = [];
      if (expr.content_title) parts.push(expr.content_title);
      if (expr.season) parts.push(`S${expr.season}`);
      if (expr.episode) parts.push(`E${expr.episode}`);
      src.textContent = parts.join(' ');
    }

    const answer = document.getElementById('flash-answer');
    answer.innerHTML = `
      <p class="flash-meaning">${expr.korean_meaning}</p>
      <div class="flash-explanation">${(expr.korean_explanation || '').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>')}</div>
    `;
    answer.classList.add('hidden');
    document.getElementById('flash-reveal-btn').classList.remove('hidden');

    popup.classList.add('show');
    setTimeout(() => closeFlashcard(), 60000);
  }

  function revealAnswer() {
    document.getElementById('flash-answer').classList.remove('hidden');
    document.getElementById('flash-reveal-btn').classList.add('hidden');
  }

  function closeFlashcard() {
    const popup = document.getElementById('flashcard-popup');
    if (popup) popup.classList.remove('show');
  }

  function setInterval_(ms) {
    intervalMs = ms;
    localStorage.setItem('notif_interval', ms.toString());
    console.log(`[Notif] Interval changed to ${ms / 1000}s`);
    scheduleNext();
  }

  function toggle(on) {
    enabled = on;
    localStorage.setItem('notif_enabled', on.toString());
    if (on) { requestPermission(); scheduleNext(); }
    else if (timerId) { clearTimeout(timerId); timerId = null; }
  }

  function triggerNow() { showNotification(); }

  function toggleSound(on) {
    soundEnabled = on;
    localStorage.setItem('notif_sound', on.toString());
  }

  return { init, requestPermission, revealAnswer, closeFlashcard, setInterval: setInterval_, toggle, toggleSound, triggerNow, get enabled() { return enabled; }, get soundEnabled() { return soundEnabled; } };
})();

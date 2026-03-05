// notifications.js - Popup notification module (all contents random)

const Notifications = (() => {
  let timerId = null;
  let intervalMs = 5 * 60 * 1000; // default 5 minutes
  let enabled = true;
  let soundEnabled = true;

  // "띠링" chime using Web Audio API (no file needed)
  function playChime() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // First tone
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = 'sine';
      o1.frequency.value = 880;  // A5
      g1.gain.setValueAtTime(0.3, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o1.connect(g1).connect(ctx.destination);
      o1.start(ctx.currentTime);
      o1.stop(ctx.currentTime + 0.3);

      // Second tone (higher, slight delay)
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.value = 1175; // D6
      g2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      o2.connect(g2).connect(ctx.destination);
      o2.start(ctx.currentTime + 0.15);
      o2.stop(ctx.currentTime + 0.5);

      setTimeout(() => ctx.close(), 1000);
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

    // Listen for localStorage changes from other tabs to stay in sync
    window.addEventListener('storage', (e) => {
      if (e.key === 'notif_last_time') {
        // Another tab just fired — reschedule from that timestamp
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
    // Add small random jitter (0-2s) so tabs don't all wake at exactly the same time
    const jitter = Math.random() * 2000;
    const delay = Math.max(0, intervalMs - elapsed) + jitter;

    console.log(`[Notif] Next notification in ${Math.round(delay / 1000)}s`);

    timerId = setTimeout(() => {
      showNotification();
      scheduleNext();
    }, delay);
  }

  async function showNotification() {
    // Cross-tab dedup: re-check lastTime right before firing
    const lastTime = parseInt(localStorage.getItem('notif_last_time') || '0');
    const elapsed = Date.now() - lastTime;
    // If another tab already fired within this interval, skip
    if (elapsed < intervalMs * 0.8) {
      console.log(`[Notif] Another tab already fired ${Math.round(elapsed / 1000)}s ago, skipping`);
      return;
    }

    // Claim this slot immediately (before async API call) to block other tabs
    localStorage.setItem('notif_last_time', Date.now().toString());

    let expr = null;

    // Try global random endpoint (all contents)
    try {
      expr = await API.get('/expressions/random');
    } catch {}

    // Fallback: try current content if on expressions page
    if (!expr) {
      const cid = typeof App !== 'undefined' && App.getContentId ? App.getContentId() : null;
      if (cid) {
        try { expr = await API.get(`/contents/${cid}/expressions/random`); } catch {}
      }
    }

    if (!expr) {
      console.log('[Notif] No expression found, skipping');
      return;
    }

    console.log('[Notif] Showing:', expr.expression);

    // Play chime sound
    playChime();

    // Always show macOS system notification (works even in another app)
    if ('Notification' in window && Notification.permission === 'granted') {
      // Use unique tag each time so macOS shows a NEW popup every time
      const notif = new Notification(expr.expression, {
        body: expr.korean_meaning,
        tag: 'lingo-snap-' + Date.now(),
        requireInteraction: true
      });
      notif.onclick = () => {
        window.focus();
        showFlashcardPopup(expr);
      };
    } else {
      console.warn('[Notif] Permission not granted:',
        'Notification' in window ? Notification.permission : 'not supported');
    }

    // Also show in-page flashcard popup if tab is visible
    if (document.visibilityState === 'visible') {
      showFlashcardPopup(expr);
    }
  }

  function showFlashcardPopup(expr) {
    const popup = document.getElementById('flashcard-popup');
    if (!popup) return;

    document.getElementById('flash-expression').textContent = expr.expression;

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

  function triggerNow() {
    showNotification();
  }

  function toggleSound(on) {
    soundEnabled = on;
    localStorage.setItem('notif_sound', on.toString());
  }

  return { init, requestPermission, revealAnswer, closeFlashcard, setInterval: setInterval_, toggle, toggleSound, triggerNow, get enabled() { return enabled; }, get soundEnabled() { return soundEnabled; } };
})();

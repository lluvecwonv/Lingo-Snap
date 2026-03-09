#!/bin/bash
# Netflix Theme 적용 스크립트
# 사용법: bash apply-netflix-theme.sh

cd "$(dirname "$0")"

echo "🎬 Netflix 테마 적용 중..."

# 1. seasons.html 덮어쓰기
cat > frontend/seasons.html << 'SEASONS_EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lingo Snap - Season 선택</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <meta property="og:title" content="Lingo Snap">
  <meta property="og:description" content="Season별 표현 학습">
  <meta property="og:image" content="/static/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/style.css">
</head>
<body class="nf-body">
  <header class="nf-header">
    <div class="nf-header-inner">
      <a href="/contents" class="nf-back" aria-label="콘텐츠 목록으로 돌아가기">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </a>
      <h1 class="nf-logo" id="season-content-title">Season 선택</h1>
    </div>
  </header>

  <main class="nf-main">
    <section class="nf-hero">
      <div class="nf-hero-overlay"></div>
      <div class="nf-hero-content">
        <span class="nf-badge">SEASON SELECT</span>
        <h2 id="season-hero-title" class="nf-hero-title">먼저 시즌을 골라줘</h2>
        <p class="nf-hero-sub">시즌을 고른 다음 에피소드까지 선택하면 표현을 바로 추가할 수 있어.</p>
      </div>
    </section>

    <section class="nf-quick">
      <form id="custom-season-form" class="nf-quick-form">
        <label for="custom-season-input">새 시즌 바로 열기</label>
        <div class="nf-quick-row">
          <input id="custom-season-input" type="number" min="1" max="99" placeholder="시즌 번호 입력" required>
          <button type="submit" class="nf-btn-red">열기</button>
        </div>
      </form>
    </section>

    <section class="nf-section">
      <div class="nf-section-head">
        <h3>시즌 목록</h3>
        <p id="season-summary" class="nf-summary"></p>
      </div>
      <div id="season-grid" class="nf-grid"></div>
      <p id="season-empty" class="nf-empty hidden">아직 저장된 시즌이 없어. 위에서 시즌 번호를 입력해서 바로 시작하면 돼.</p>
    </section>
  </main>

  <script src="/static/api.js"></script>
  <script>
    const params = new URLSearchParams(window.location.search);
    const contentId = params.get('content_id');
    const seasonalPlatforms = ['netflix', 'youtube'];

    async function init() {
      if (!contentId) {
        window.location.href = '/contents';
        return;
      }
      try {
        const user = await API.get('/me');
        if (!user) return;
        const contents = await API.get('/contents');
        const content = (contents || []).find(item => String(item.id) === String(contentId));
        if (!content) { window.location.href = '/contents'; return; }
        if (!seasonalPlatforms.includes(content.platform)) {
          window.location.href = `/expressions?content_id=${contentId}`;
          return;
        }
        document.getElementById('season-content-title').textContent = content.title;
        document.getElementById('season-hero-title').textContent = `${content.title}`;
        document.title = `${content.title} - Season 선택`;
        if (content.thumbnail_url) {
          document.querySelector('.nf-hero').style.backgroundImage = `url(${content.thumbnail_url})`;
        }
        const seasons = await API.get(`/contents/${contentId}/seasons`);
        renderSeasons(seasons || []);
      } catch { window.location.href = '/login'; }
    }

    function renderSeasons(seasons) {
      const grid = document.getElementById('season-grid');
      const empty = document.getElementById('season-empty');
      const summary = document.getElementById('season-summary');
      if (!seasons.length) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        summary.textContent = '기존에 저장된 시즌 없음';
        return;
      }
      empty.classList.add('hidden');
      const totalExpressions = seasons.reduce((sum, s) => sum + s.expression_count, 0);
      summary.textContent = `${seasons.length}개 시즌 · ${totalExpressions}개 표현`;
      grid.innerHTML = seasons.map(s => `
        <button class="nf-card" onclick="openSeason(${s.season})">
          <div class="nf-card-num">S${s.season}</div>
          <div class="nf-card-info">
            <span class="nf-card-label">Season ${s.season}</span>
            <span class="nf-card-meta">${s.episode_count} episodes · ${s.expression_count} expressions</span>
          </div>
          <svg class="nf-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      `).join('');
    }

    function openSeason(season) {
      window.location.href = `/episodes?content_id=${contentId}&season=${season}`;
    }

    document.getElementById('custom-season-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const season = parseInt(document.getElementById('custom-season-input').value, 10);
      if (!season || season < 1) return;
      openSeason(season);
    });

    init();
  </script>
</body>
</html>
SEASONS_EOF

echo "✅ seasons.html 완료"

# 2. episodes.html 덮어쓰기
cat > frontend/episodes.html << 'EPISODES_EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lingo Snap - Episode 선택</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <meta property="og:title" content="Lingo Snap">
  <meta property="og:description" content="Episode별 표현 학습">
  <meta property="og:image" content="/static/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/style.css">
</head>
<body class="nf-body">
  <header class="nf-header">
    <div class="nf-header-inner">
      <a id="episodes-back-link" href="/seasons" class="nf-back" aria-label="시즌 선택으로 돌아가기">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </a>
      <h1 class="nf-logo" id="episode-content-title">Episode 선택</h1>
    </div>
  </header>

  <main class="nf-main">
    <section class="nf-hero nf-hero-sm">
      <div class="nf-hero-overlay"></div>
      <div class="nf-hero-content">
        <span class="nf-badge">EPISODE SELECT</span>
        <h2 id="episode-hero-title" class="nf-hero-title">에피소드를 골라줘</h2>
        <p id="episode-subtitle" class="nf-hero-sub">에피소드를 선택하면 표현을 바로 추가할 수 있어.</p>
      </div>
    </section>

    <section class="nf-quick">
      <form id="custom-episode-form" class="nf-quick-form">
        <label for="custom-episode-input">새 에피소드 바로 열기</label>
        <div class="nf-quick-row">
          <input id="custom-episode-input" type="number" min="1" max="999" placeholder="에피소드 번호 입력" required>
          <button type="submit" class="nf-btn-red">열기</button>
        </div>
      </form>
    </section>

    <section class="nf-section">
      <div class="nf-section-head">
        <h3>에피소드 목록</h3>
        <p id="episode-summary" class="nf-summary"></p>
      </div>
      <div id="episode-grid" class="nf-grid"></div>
      <p id="episode-empty" class="nf-empty hidden">아직 저장된 에피소드가 없어. 위에서 번호를 넣고 바로 시작하면 돼.</p>
    </section>
  </main>

  <script src="/static/api.js"></script>
  <script>
    const params = new URLSearchParams(window.location.search);
    const contentId = params.get('content_id');
    const season = parseInt(params.get('season') || '', 10);
    const seasonalPlatforms = ['netflix', 'youtube'];

    async function init() {
      if (!contentId || !season) { window.location.href = '/contents'; return; }
      try {
        const user = await API.get('/me');
        if (!user) return;
        const contents = await API.get('/contents');
        const content = (contents || []).find(item => String(item.id) === String(contentId));
        if (!content) { window.location.href = '/contents'; return; }
        if (!seasonalPlatforms.includes(content.platform)) {
          window.location.href = `/expressions?content_id=${contentId}`;
          return;
        }
        document.getElementById('episodes-back-link').href = `/seasons?content_id=${contentId}`;
        document.getElementById('episode-content-title').textContent = `${content.title} · S${season}`;
        document.getElementById('episode-hero-title').textContent = `${content.title}`;
        document.getElementById('episode-subtitle').textContent = `Season ${season}에서 학습할 에피소드를 선택해.`;
        document.title = `${content.title} - Season ${season} Episode 선택`;
        if (content.thumbnail_url) {
          document.querySelector('.nf-hero').style.backgroundImage = `url(${content.thumbnail_url})`;
        }
        const episodes = await API.get(`/contents/${contentId}/seasons/${season}/episodes`);
        renderEpisodes(episodes || []);
      } catch { window.location.href = '/login'; }
    }

    function renderEpisodes(episodes) {
      const grid = document.getElementById('episode-grid');
      const empty = document.getElementById('episode-empty');
      const summary = document.getElementById('episode-summary');
      if (!episodes.length) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        summary.textContent = `Season ${season}에 저장된 에피소드 없음`;
        return;
      }
      empty.classList.add('hidden');
      const totalExpressions = episodes.reduce((sum, ep) => sum + ep.expression_count, 0);
      summary.textContent = `${episodes.length}개 에피소드 · ${totalExpressions}개 표현`;
      grid.innerHTML = episodes.map(ep => `
        <button class="nf-card" onclick="openEpisode(${ep.episode})">
          <div class="nf-card-num">E${ep.episode}</div>
          <div class="nf-card-info">
            <span class="nf-card-label">Episode ${ep.episode}</span>
            <span class="nf-card-meta">${ep.expression_count} expressions</span>
          </div>
          <svg class="nf-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      `).join('');
    }

    function openEpisode(episode) {
      window.location.href = `/expressions?content_id=${contentId}&season=${season}&episode=${episode}`;
    }

    document.getElementById('custom-episode-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const episode = parseInt(document.getElementById('custom-episode-input').value, 10);
      if (!episode || episode < 1) return;
      openEpisode(episode);
    });

    init();
  </script>
</body>
</html>
EPISODES_EOF

echo "✅ episodes.html 완료"

# 3. notifications.js 덮어쓰기
cat > frontend/notifications.js << 'NOTIF_EOF'
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
NOTIF_EOF

echo "✅ notifications.js 완료"

# 4. style.css 에 Netflix 테마 추가 (기존 내용 끝에)
# 먼저 이미 추가됐는지 확인
if grep -q "nf-body" frontend/style.css; then
  echo "⏭️  style.css에 Netflix 테마 이미 존재 — 스킵"
else
  cat >> frontend/style.css << 'CSS_EOF'

/* ============================================
   Netflix-Style Dark Theme (Seasons/Episodes)
   ============================================ */

.nf-body {
  font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #141414;
  color: #e5e5e5;
  line-height: 1.65;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.nf-header {
  background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%);
  padding: 16px 24px;
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
}

.nf-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
}

.nf-back {
  color: #fff;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}
.nf-back:hover { transform: scale(1.15); }

.nf-logo {
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.3px;
}

.nf-hero {
  position: relative;
  min-height: 340px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 0 24px 40px;
  overflow: hidden;
}
.nf-hero-sm { min-height: 280px; }

.nf-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #141414 0%, rgba(20,20,20,0.7) 40%, rgba(20,20,20,0.3) 100%);
}

.nf-hero-content {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.nf-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #E50914;
  background: rgba(229,9,20,0.15);
  padding: 4px 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.nf-hero-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
  line-height: 1.2;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
}

.nf-hero-sub {
  color: #aaa;
  font-size: 0.95rem;
  margin: 0;
  max-width: 500px;
}

.nf-main { padding-bottom: 64px; }

.nf-quick {
  max-width: 1100px;
  margin: -20px auto 0;
  padding: 0 24px;
  position: relative;
  z-index: 2;
}

.nf-quick-form {
  background: #1f1f1f;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px 24px;
}

.nf-quick-form label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #999;
  margin-bottom: 10px;
}

.nf-quick-row { display: flex; gap: 12px; }

.nf-quick-row input {
  flex: 1;
  padding: 12px 16px;
  background: #2b2b2b;
  border: 1.5px solid #444;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #fff;
  transition: all 0.2s;
}
.nf-quick-row input::placeholder { color: #666; }
.nf-quick-row input:focus {
  outline: none;
  border-color: #E50914;
  box-shadow: 0 0 0 3px rgba(229,9,20,0.2);
}

.nf-btn-red {
  padding: 12px 28px;
  background: #E50914;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.nf-btn-red:hover { background: #f40612; transform: scale(1.02); }

.nf-section {
  max-width: 1100px;
  margin: 32px auto 0;
  padding: 0 24px;
}

.nf-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.nf-section-head h3 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.nf-summary { color: #777; font-size: 0.85rem; margin: 0; }

.nf-grid { display: flex; flex-direction: column; gap: 8px; }

.nf-card {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px 20px;
  background: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  text-align: left;
  color: #e5e5e5;
}
.nf-card:hover {
  background: #2a2a2a;
  border-color: #444;
  transform: translateX(4px);
}

.nf-card-num {
  font-size: 1.6rem;
  font-weight: 800;
  color: #E50914;
  min-width: 56px;
  text-align: center;
  line-height: 1;
}

.nf-card-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.nf-card-label { font-size: 0.95rem; font-weight: 600; color: #fff; }
.nf-card-meta { font-size: 0.8rem; color: #777; }

.nf-card-arrow { color: #555; flex-shrink: 0; transition: all 0.2s; }
.nf-card:hover .nf-card-arrow { color: #E50914; transform: translateX(3px); }

.nf-empty {
  text-align: center;
  padding: 48px 20px;
  color: #555;
  font-size: 0.92rem;
}

@media (max-width: 640px) {
  .nf-header { padding: 12px 16px; }
  .nf-hero { min-height: 260px; padding: 0 16px 32px; }
  .nf-hero-sm { min-height: 220px; }
  .nf-hero-title { font-size: 1.6rem; }
  .nf-quick { padding: 0 16px; margin-top: -16px; }
  .nf-quick-form { padding: 16px; }
  .nf-quick-row { flex-direction: column; }
  .nf-section { padding: 0 16px; }
  .nf-card { padding: 14px 16px; gap: 12px; }
  .nf-card-num { font-size: 1.3rem; min-width: 44px; }
}
CSS_EOF
  echo "✅ style.css Netflix 테마 추가 완료"
fi

echo ""
echo "🎬 모든 파일 적용 완료!"
echo ""
echo "이제 아래 명령어로 git push 하세요:"
echo "  git add -A"
echo "  git commit -m 'feat: Netflix dark theme + fix flashcard TTS'"
echo "  git push"

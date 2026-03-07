// app.js - Core application logic (API-based)

const App = (() => {
  let contentId = null;
  let contentTitle = '';
  let contentPlatform = '';  // netflix, youtube, book, paper, dictionary, other
  let contentLanguage = 'english';  // english / japanese
  let selectedSeason = null;
  let expressions = [];
  let editingId = null;
  let exprViewMode = localStorage.getItem('expr_view_mode') || 'card';

  // Platforms that have season/episode
  const HAS_SEASON = ['netflix', 'youtube'];

  function hasSeason() {
    return HAS_SEASON.includes(contentPlatform);
  }

  // ─── Init ───
  async function init() {
    const params = new URLSearchParams(window.location.search);
    contentId = params.get('content_id');
    selectedSeason = parseInt(params.get('season') || '', 10) || null;
    if (!contentId) { window.location.href = '/contents'; return; }

    TTS.init();
    const ready = await loadContentInfo();
    if (ready === false) return;
    await loadExpressions();
    bindEvents();
    Notifications.init();
    Notifications.requestPermission();
  }

  // ─── Load content info (title + platform) ───
  async function loadContentInfo() {
    try {
      const contents = await API.get('/contents');
      const c = (contents || []).find(c => c.id == contentId);
      if (c) {
        contentTitle = c.title;
        contentPlatform = c.platform || '';
        contentLanguage = c.language || 'english';
        if (hasSeason() && !selectedSeason) {
          window.location.href = `/seasons?content_id=${contentId}`;
          return false;
        }
        document.getElementById('content-title-display').textContent = c.title;
        const seasonBadge = document.getElementById('season-context-badge');
        if (seasonBadge) {
          if (hasSeason() && selectedSeason) {
            seasonBadge.textContent = `Season ${selectedSeason}`;
            seasonBadge.classList.remove('hidden');
          } else {
            seasonBadge.classList.add('hidden');
          }
        }
        const backLink = document.getElementById('back-link');
        if (backLink && hasSeason()) backLink.href = `/seasons?content_id=${contentId}`;
        document.title = `${c.title} - Lingo Snap`;
      }
    } catch {}

    // Show/hide season-related UI based on platform
    applyPlatformUI();
    return true;
  }

  function applyPlatformUI() {
    const showSeason = hasSeason();
    const seasonLocked = showSeason && selectedSeason;

    // Filter dropdowns
    document.getElementById('filter-season').style.display = showSeason && !seasonLocked ? '' : 'none';
    document.getElementById('filter-episode').style.display = showSeason ? '' : 'none';

    // Form fields (season/episode row)
    const seasonRow = document.getElementById('form-season-row');
    if (seasonRow) seasonRow.style.display = showSeason && !seasonLocked ? '' : 'none';

    const seasonHint = document.getElementById('selected-season-note');
    if (seasonHint) {
      if (seasonLocked) {
        seasonHint.textContent = `현재 Season ${selectedSeason}에 저장됩니다.`;
        seasonHint.classList.remove('hidden');
      } else {
        seasonHint.classList.add('hidden');
      }
    }

    // Scene note (only for video content)
    const sceneLabel = document.getElementById('form-scene-wrap');
    if (sceneLabel) sceneLabel.style.display = showSeason ? '' : 'none';
  }

  // ─── Data Loading ───
  async function loadExpressions() {
    const search = document.getElementById('search-input').value.trim();
    const season = document.getElementById('filter-season').value;
    const episode = document.getElementById('filter-episode').value;
    const difficulty = document.getElementById('filter-difficulty').value;

    let query = `/contents/${contentId}/expressions?`;
    if (search) query += `search=${encodeURIComponent(search)}&`;
    if (selectedSeason && hasSeason()) query += `season=${selectedSeason}&`;
    if (season && hasSeason()) query += `season=${season}&`;
    if (episode && hasSeason()) query += `episode=${episode}&`;
    if (difficulty) query += `difficulty=${difficulty}&`;

    try {
      expressions = await API.get(query) || [];
    } catch (e) {
      expressions = [];
    }

    document.getElementById('loading').classList.add('hidden');
    renderCards();
    updateStats();
    if (hasSeason()) populateFilters();
  }

  function getAllExpressions() {
    return expressions;
  }

  // ─── Populate Filter Dropdowns ───
  function populateFilters() {
    const seasons = [...new Set(expressions.map(e => e.season))].sort((a, b) => a - b);
    const episodes = [...new Set(expressions.map(e => e.episode))].sort((a, b) => a - b);

    const seasonSel = document.getElementById('filter-season');
    const curSeason = seasonSel.value;
    seasonSel.innerHTML = '<option value="">All seasons</option>';
    seasons.forEach(s => {
      seasonSel.innerHTML += `<option value="${s}" ${s == curSeason ? 'selected' : ''}>Season ${s}</option>`;
    });

    const epSel = document.getElementById('filter-episode');
    const curEp = epSel.value;
    epSel.innerHTML = '<option value="">All episodes</option>';
    episodes.forEach(e => {
      epSel.innerHTML += `<option value="${e}" ${e == curEp ? 'selected' : ''}>Episode ${e}</option>`;
    });
  }

  // ─── Render Cards ───
  function renderCards() {
    const grid = document.getElementById('cards-grid');
    const noResults = document.getElementById('no-results');
    const query = document.getElementById('search-input').value.toLowerCase().trim();

    if (expressions.length === 0) {
      grid.innerHTML = '';
      noResults.classList.remove('hidden');
      return;
    }

    noResults.classList.add('hidden');

    // Apply view mode class
    grid.classList.toggle('cards-grid', exprViewMode === 'card');
    grid.classList.toggle('expr-list', exprViewMode === 'list');

    if (exprViewMode === 'list') {
      renderListView(grid, query);
      return;
    }

    if (hasSeason()) {
      const groups = {};
      expressions.forEach(expr => {
        const key = selectedSeason ? `${expr.episode}` : `${expr.season}-${expr.episode}`;
        if (!groups[key]) {
          groups[key] = selectedSeason
            ? { episode: expr.episode, items: [] }
            : { season: expr.season, episode: expr.episode, items: [] };
        }
        groups[key].items.push(expr);
      });

      const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (selectedSeason) return Number(a) - Number(b);
        const [sa, ea] = a.split('-').map(Number);
        const [sb, eb] = b.split('-').map(Number);
        return sa - sb || ea - eb;
      });

      grid.innerHTML = sortedKeys.map(key => {
        const group = groups[key];
        const header = selectedSeason
          ? `<div class="group-header">Episode ${group.episode}</div>`
          : `<div class="group-header">Season ${group.season} - Episode ${group.episode}</div>`;
        const cards = group.items.map(expr => renderSingleCard(expr, query)).join('');
        return header + cards;
      }).join('');
    } else {
      grid.innerHTML = expressions.map(expr => renderSingleCard(expr, query)).join('');
    }
  }

  function renderListView(grid, query) {
    const diffLabel = { beginner: '초급', intermediate: '중급', advanced: '고급' };
    const diffClass = { beginner: 'diff-beginner', intermediate: 'diff-intermediate', advanced: 'diff-advanced' };

    const header = `<div class="list-header">
      <span class="list-col-expr">표현</span>
      <span class="list-col-meaning">뜻</span>
      <span class="list-col-diff">난이도</span>
      <span class="list-col-actions"></span>
    </div>`;

    const rows = expressions.map(expr => {
      const displayExpr = query ? highlight(expr.expression, query) : escapeHtml(expr.expression);
      const displayMeaning = query ? highlight(expr.korean_meaning, query) : escapeHtml(expr.korean_meaning);
      const diff = diffLabel[expr.difficulty] || '';
      const dc = diffClass[expr.difficulty] || '';

      return `<div class="list-row" data-id="${expr.id}">
        <span class="list-col-expr">
          <button class="tts-btn-mini" onclick="event.stopPropagation(); TTS.speak('${escapeSingleQuote(expr.expression)}')" title="듣기">🔊</button>
          ${displayExpr}
        </span>
        <span class="list-col-meaning">${displayMeaning}</span>
        <span class="list-col-diff"><span class="diff-badge ${dc}">${diff}</span></span>
        <span class="list-col-actions">
          <button class="list-action-btn" onclick="event.stopPropagation(); App.editExpression(${expr.id})" title="수정">✏️</button>
          <button class="list-action-btn delete" onclick="event.stopPropagation(); App.deleteExpression(${expr.id})" title="삭제">🗑</button>
        </span>
      </div>`;
    }).join('');

    grid.innerHTML = header + rows;

    // Click row to expand detail
    grid.querySelectorAll('.list-row').forEach(row => {
      row.addEventListener('click', () => {
        row.classList.toggle('expanded');
        const id = parseInt(row.dataset.id);
        if (row.classList.contains('expanded') && !row.querySelector('.list-detail')) {
          const expr = expressions.find(e => e.id === id);
          if (!expr) return;
          const detail = document.createElement('div');
          detail.className = 'list-detail';
          let html = '';
          if (hasSeason()) {
            html += `<p class="list-detail-meta">S${expr.season} · E${expr.episode}</p>`;
          }
          if (expr.korean_explanation) html += `<p class="list-detail-explanation">${escapeHtml(expr.korean_explanation).replace(/\n/g, '<br>')}</p>`;
          const tags = (expr.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
          if (tags) html += `<div class="card-tags">${tags}</div>`;
          detail.innerHTML = html;
          row.appendChild(detail);
        }
      });
    });
  }

  function renderSingleCard(expr, query) {
    const displayExpr = query ? highlight(expr.expression, query) : escapeHtml(expr.expression);
    const displayMeaning = query ? highlight(expr.korean_meaning, query) : escapeHtml(expr.korean_meaning);
    const diffLabel = { beginner: '초급', intermediate: '중급', advanced: '고급' }[expr.difficulty] || '';

    const usageHtml = (expr.usage_examples || []).map(u => `
      <div class="usage-item">
        <div class="usage-en">
          ${escapeHtml(u.english)}
          <button class="tts-btn" onclick="TTS.speak('${escapeSingleQuote(u.english)}')" title="듣기">🔊</button>
        </div>
        <div class="usage-ko">KOR: ${escapeHtml(u.korean)}</div>
      </div>
    `).join('');

    const tagsHtml = (expr.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

    const hasDetail = expr.detail_explanation && expr.detail_explanation.trim();

    return `
      <div class="card" data-id="${expr.id}">
        <div class="card-source">
          <span class="card-difficulty">${diffLabel}</span>
        </div>
        <div class="card-body">
          <div class="card-expression">
            <span>"${displayExpr}"</span>
            <span class="tts-btns">
              <button class="tts-btn" onclick="TTS.speak('${escapeSingleQuote(expr.expression)}')" title="듣기">🔊</button>
              <button class="tts-btn slow" onclick="TTS.speakSlow('${escapeSingleQuote(expr.expression)}')" title="천천히 듣기">🐢</button>
            </span>
          </div>
          <p class="card-meaning">${displayMeaning}</p>
          <div class="card-explanation">${escapeHtml(expr.korean_explanation || '').replace(/\n/g, '<br>')}</div>
          ${hasDetail ? `
            <button class="card-detail-toggle" onclick="App.toggleSection(this, 'details')">자세히 보기 [open]</button>
            <div class="card-detail">${escapeHtml(expr.detail_explanation).replace(/\n/g, '<br>')}</div>
          ` : ''}
          ${usageHtml ? `
            <button class="card-usage-toggle" onclick="App.toggleSection(this, 'examples')">응용 표현 [open]</button>
            <div class="card-usage-list">${usageHtml}</div>
          ` : ''}
          <div class="card-tags">${tagsHtml}</div>
        </div>
        <div class="card-actions">
          <button class="card-action-btn" onclick="App.editExpression(${expr.id})">✏️ 수정</button>
          <button class="card-action-btn delete" onclick="App.deleteExpression(${expr.id})">🗑 삭제</button>
        </div>
      </div>
    `;
  }

  // ─── Stats ───
  function updateStats() {
    document.getElementById('stats-total').textContent = `${expressions.length}개`;
    document.getElementById('footer-count').textContent = `${expressions.length}개 표현 로드됨`;
  }

  // ─── Event Bindings ───
  function bindEvents() {
    let debounceTimer;
    document.getElementById('search-input').addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadExpressions, 300);
    });

    ['filter-season', 'filter-episode', 'filter-difficulty'].forEach(id => {
      document.getElementById(id).addEventListener('change', loadExpressions);
    });

    // View mode toggle
    document.querySelectorAll('.expr-view-btn').forEach(btn => {
      if (btn.dataset.view === exprViewMode) btn.classList.add('active');
      else btn.classList.remove('active');
      btn.addEventListener('click', () => {
        exprViewMode = btn.dataset.view;
        localStorage.setItem('expr_view_mode', exprViewMode);
        document.querySelectorAll('.expr-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCards();
      });
    });

    document.getElementById('add-btn').addEventListener('click', () => openModal());
    document.getElementById('add-word-btn').addEventListener('click', () => openWordModal());
    document.getElementById('add-structure-btn').addEventListener('click', () => openStructureModal());
    document.getElementById('expression-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('word-form').addEventListener('submit', handleWordSubmit);
    document.getElementById('structure-form').addEventListener('submit', handleStructureSubmit);
    document.getElementById('review-now-btn').addEventListener('click', () => Notifications.triggerNow());
    document.getElementById('notif-toggle-btn').addEventListener('click', () => {
      document.getElementById('notif-modal').classList.remove('hidden');
    });
    document.getElementById('notif-enabled-check').addEventListener('change', (e) => {
      Notifications.toggle(e.target.checked);
    });
    document.getElementById('notif-interval-select').addEventListener('change', (e) => {
      Notifications.setInterval(parseInt(e.target.value));
    });
    document.getElementById('notif-sound-check').addEventListener('change', (e) => {
      Notifications.toggleSound(e.target.checked);
    });
    // Sync sound setting
    if (localStorage.getItem('notif_sound') === 'false') {
      document.getElementById('notif-sound-check').checked = false;
    }
    document.getElementById('export-btn').addEventListener('click', exportJSON);

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });
  }

  // ─── GPT Generate ───
  async function generateWithGPT() {
    const expression = document.getElementById('form-expression').value.trim();
    if (!expression) { alert('영어 표현을 먼저 입력해주세요'); return; }

    const btn = document.getElementById('gpt-generate-btn');
    const loading = document.getElementById('gpt-loading');
    btn.disabled = true;
    btn.textContent = '생성 중...';
    loading.classList.remove('hidden');

    try {
      const result = await API.post('/generate', { expression, platform: contentPlatform, language: contentLanguage });
      if (!result) return;

      document.getElementById('form-meaning').value = result.korean_meaning || '';
      document.getElementById('form-explanation').value = result.korean_explanation || '';
      document.getElementById('form-detail').value = result.detail_explanation || '';
      document.getElementById('form-tags').value = (result.tags || []).join(', ');
      document.getElementById('form-difficulty').value = result.difficulty || 'intermediate';

      // Fill usage examples
      document.getElementById('usage-examples-list').innerHTML = '';
      (result.usage_examples || []).forEach(u => addUsageRow(u.english, u.korean));
    } catch (e) {
      alert('GPT 생성 오류: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'GPT 자동 생성';
      loading.classList.add('hidden');
    }
  }

  // ─── Modal Open/Close ───
  function openModal(id = null) {
    editingId = id;
    const form = document.getElementById('expression-form');
    form.reset();
    document.getElementById('usage-examples-list').innerHTML = '';
    document.getElementById('modal-title').textContent = id ? '표현 수정' : '새 표현 추가';

    // Show/hide season fields in modal
    applyPlatformUI();

    if (id) {
      const expr = expressions.find(e => e.id === id);
      if (expr) {
        document.getElementById('form-expression').value = expr.expression;
        document.getElementById('form-meaning').value = expr.korean_meaning;
        document.getElementById('form-explanation').value = expr.korean_explanation || '';
        document.getElementById('form-detail').value = expr.detail_explanation || '';
        if (hasSeason()) {
          document.getElementById('form-season').value = expr.season;
          document.getElementById('form-episode').value = expr.episode;
        }
        document.getElementById('form-difficulty').value = expr.difficulty;
        document.getElementById('form-scene').value = expr.scene_note || '';
        document.getElementById('form-tags').value = (expr.tags || []).join(', ');
        (expr.usage_examples || []).forEach(u => addUsageRow(u.english, u.korean));
      }
    } else {
      addUsageRow();
    }

    document.getElementById('add-modal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('add-modal').classList.add('hidden');
    editingId = null;
  }

  // ─── Usage Example Rows ───
  function addUsageRow(en = '', ko = '') {
    const list = document.getElementById('usage-examples-list');
    const row = document.createElement('div');
    row.className = 'usage-row';
    row.innerHTML = `
      <input type="text" placeholder="English" value="${escapeAttr(en)}">
      <input type="text" placeholder="한국어" value="${escapeAttr(ko)}">
      <button type="button" class="usage-row-remove" onclick="this.parentElement.remove()">×</button>
    `;
    list.appendChild(row);
  }

  // ─── Form Submit ───
  async function handleFormSubmit(e) {
    e.preventDefault();

    const expression = document.getElementById('form-expression').value.trim();
    const meaning = document.getElementById('form-meaning').value.trim();
    if (!expression || !meaning) return;

    const usageRows = document.querySelectorAll('#usage-examples-list .usage-row');
    const usageExamples = [];
    usageRows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const en = inputs[0].value.trim();
      const ko = inputs[1].value.trim();
      if (en && ko) usageExamples.push({ english: en, korean: ko });
    });

    const tags = document.getElementById('form-tags').value
      .split(',').map(t => t.trim()).filter(Boolean);

    const data = {
      expression,
      korean_meaning: meaning,
      korean_explanation: document.getElementById('form-explanation').value.trim(),
      detail_explanation: document.getElementById('form-detail').value.trim(),
      usage_examples: usageExamples,
      season: hasSeason() ? (selectedSeason || parseInt(document.getElementById('form-season').value) || 1) : 1,
      episode: hasSeason() ? (parseInt(document.getElementById('form-episode').value) || 1) : 1,
      scene_note: document.getElementById('form-scene').value.trim(),
      tags,
      difficulty: document.getElementById('form-difficulty').value,
    };

    try {
      if (editingId) {
        await API.put(`/contents/${contentId}/expressions/${editingId}`, data);
      } else {
        await API.post(`/contents/${contentId}/expressions`, data);
      }
      closeModal();
      await loadExpressions();
    } catch (e) {
      alert('저장 오류: ' + e.message);
    }
  }

  // ─── Edit & Delete ───
  function editExpression(id) {
    openModal(id);
  }

  async function deleteExpression(id) {
    if (!confirm('이 표현을 삭제하시겠습니까?')) return;
    try {
      await API.del(`/contents/${contentId}/expressions/${id}`);
      await loadExpressions();
    } catch (e) {
      alert('삭제 오류: ' + e.message);
    }
  }

  // ─── Quick Word Add ───
  function openWordModal() {
    document.getElementById('word-form').reset();
    document.getElementById('word-usage-list').innerHTML = '';
    document.getElementById('word-modal').classList.remove('hidden');
  }

  function closeWordModal() {
    document.getElementById('word-modal').classList.add('hidden');
  }

  function addWordUsageRow(en = '', ko = '') {
    const list = document.getElementById('word-usage-list');
    const row = document.createElement('div');
    row.className = 'usage-row';
    row.innerHTML = `
      <input type="text" placeholder="English" value="${escapeAttr(en)}">
      <input type="text" placeholder="한국어" value="${escapeAttr(ko)}">
      <button type="button" class="usage-row-remove" onclick="this.parentElement.remove()">×</button>
    `;
    list.appendChild(row);
  }

  async function generateWord() {
    const word = document.getElementById('word-expression').value.trim();
    if (!word) { alert('단어를 먼저 입력해주세요'); return; }

    const btn = document.querySelector('#word-modal .btn.btn-primary.btn-sm');
    const loading = document.getElementById('word-gpt-loading');
    btn.disabled = true;
    btn.textContent = '생성 중...';
    loading.classList.remove('hidden');

    try {
      const result = await API.post('/generate', { expression: word, platform: contentPlatform, language: contentLanguage });
      if (!result) return;
      document.getElementById('word-meaning').value = result.korean_meaning || '';
      document.getElementById('word-explanation').value = result.korean_explanation || '';

      document.getElementById('word-usage-list').innerHTML = '';
      (result.usage_examples || []).forEach(u => addWordUsageRow(u.english, u.korean));
    } catch (e) {
      alert('GPT 오류: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'GPT 자동 생성';
      loading.classList.add('hidden');
    }
  }

  async function handleWordSubmit(e) {
    e.preventDefault();
    const expression = document.getElementById('word-expression').value.trim();
    const meaning = document.getElementById('word-meaning').value.trim();
    if (!expression || !meaning) return;

    const usageRows = document.querySelectorAll('#word-usage-list .usage-row');
    const usageExamples = [];
    usageRows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const en = inputs[0].value.trim();
      const ko = inputs[1].value.trim();
      if (en && ko) usageExamples.push({ english: en, korean: ko });
    });

    const data = {
      expression,
      korean_meaning: meaning,
      korean_explanation: document.getElementById('word-explanation').value.trim(),
      usage_examples: usageExamples,
      season: selectedSeason || 1,
      episode: 1,
      difficulty: 'beginner',
    };

    try {
      await API.post(`/contents/${contentId}/expressions`, data);
      closeWordModal();
      await loadExpressions();
    } catch (e) {
      alert('저장 오류: ' + e.message);
    }
  }

  // ─── Structure (구문) Add ───
  function openStructureModal() {
    document.getElementById('structure-form').reset();
    document.getElementById('structure-usage-list').innerHTML = '';
    document.getElementById('structure-modal').classList.remove('hidden');
  }

  function closeStructureModal() {
    document.getElementById('structure-modal').classList.add('hidden');
  }

  function addStructureUsageRow(en = '', ko = '') {
    const list = document.getElementById('structure-usage-list');
    const row = document.createElement('div');
    row.className = 'usage-row';
    row.innerHTML = `
      <input type="text" placeholder="English" value="${escapeAttr(en)}">
      <input type="text" placeholder="한국어" value="${escapeAttr(ko)}">
      <button type="button" class="usage-row-remove" onclick="this.parentElement.remove()">×</button>
    `;
    list.appendChild(row);
  }

  async function generateStructure() {
    const sentence = document.getElementById('structure-sentence').value.trim();
    if (!sentence) { alert('영어 문장을 먼저 입력해주세요'); return; }

    const btn = document.getElementById('structure-generate-btn');
    const loading = document.getElementById('structure-gpt-loading');
    btn.disabled = true;
    btn.textContent = '분석 중...';
    loading.classList.remove('hidden');

    try {
      const result = await API.post('/generate-structure', { expression: sentence, platform: contentPlatform, language: contentLanguage });
      if (!result) return;

      document.getElementById('structure-expression').value = result.expression || '';
      document.getElementById('structure-meaning').value = result.korean_meaning || '';
      document.getElementById('structure-explanation').value = result.korean_explanation || '';
      document.getElementById('structure-detail').value = result.detail_explanation || '';
      document.getElementById('structure-tags').value = (result.tags || []).join(', ');
      document.getElementById('structure-difficulty').value = result.difficulty || 'intermediate';

      document.getElementById('structure-usage-list').innerHTML = '';
      (result.usage_examples || []).forEach(u => addStructureUsageRow(u.english, u.korean));
    } catch (e) {
      alert('GPT 오류: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '구문 패턴 추출';
      loading.classList.add('hidden');
    }
  }

  async function handleStructureSubmit(e) {
    e.preventDefault();
    const expression = document.getElementById('structure-expression').value.trim();
    const meaning = document.getElementById('structure-meaning').value.trim();
    if (!expression || !meaning) return;

    const usageRows = document.querySelectorAll('#structure-usage-list .usage-row');
    const usageExamples = [];
    usageRows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const en = inputs[0].value.trim();
      const ko = inputs[1].value.trim();
      if (en && ko) usageExamples.push({ english: en, korean: ko });
    });

    const tags = document.getElementById('structure-tags').value
      .split(',').map(t => t.trim()).filter(Boolean);

    const data = {
      expression,
      korean_meaning: meaning,
      korean_explanation: document.getElementById('structure-explanation').value.trim(),
      detail_explanation: document.getElementById('structure-detail').value.trim(),
      usage_examples: usageExamples,
      season: selectedSeason || 1,
      episode: 1,
      tags,
      difficulty: document.getElementById('structure-difficulty').value,
    };

    try {
      await API.post(`/contents/${contentId}/expressions`, data);
      closeStructureModal();
      await loadExpressions();
    } catch (e) {
      alert('저장 오류: ' + e.message);
    }
  }

  // ─── Export JSON ───
  function exportJSON() {
    const allData = { expressions };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${contentTitle || 'expressions'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ─── Helpers ───
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function escapeSingleQuote(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function toggleSection(button, label) {
    const section = button.nextElementSibling;
    section.classList.toggle('open');
    const isOpen = section.classList.contains('open');
    const labels = {
      details: ['자세히 보기', '자세히 닫기'],
      examples: ['응용 표현', '응용 표현 닫기'],
    };
    const [closedLabel, openLabel] = labels[label] || ['열기', '닫기'];
    button.textContent = isOpen ? `${openLabel} [close]` : `${closedLabel} [open]`;
  }

  function getContentId() { return contentId; }

  return {
    init, getAllExpressions, getContentId, closeModal, addUsageRow,
    editExpression, deleteExpression, exportJSON, generateWithGPT,
    closeWordModal, generateWord, addWordUsageRow,
    closeStructureModal, generateStructure, addStructureUsageRow,
    toggleSection
  };
})();

document.addEventListener('DOMContentLoaded', App.init);

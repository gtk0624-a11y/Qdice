/* =====================================================================
   HTML 슬라이드 엔진 v1 — 교사 화면: 발표 + 편집 + 수업 방 (play.js)
   © 김정환 · M.A.D.T (Moral And Digital Teacher)
   ① 상태  ② 시작  ③ 화면 그리기·이동  ④ 실시간 위젯(질문 월·투표·학습지·유튜브·반응)
   ⑤ 수업 방·교사 패널·모둠 뽑기  ⑥ 편집(선택·이동·크기·글·요소 추가)  ⑦ 저장·되돌리기  ⑧ 시작 연결
   ===================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), h = SL.h, esc = SL.esc, P = SL.P;

  /* ---------- ① 상태 ---------- */
  let deck = null, idx = 0, rev = 0, mode = 'view', sel = null, blank = false, dirty = false;
  let room = null;                       // { code, groups }  수업 방이 열려 있으면 값이 있음
  let roomUsers = {}, roomMeta = null;
  let wrap, stage, tab = 'run', panelOpen = false, showRx = true, saveTimer = null, editingText = null;
  const subsRoom = [], subsScene = [], timers = [];
  const wallData = {}, pollData = {}, wsData = {}, rxData = { rx: {}, und: {} };
  const hist = { u: [], r: [] };
  const clip = { el: null };

  const db = () => SL.db;
  const sc = () => deck.scenes[idx];
  const visible = i => mode === 'edit' || !deck.scenes[i].hidden;
  const nextVis = (i, d) => { let j = i + d; while (j >= 0 && j < deck.scenes.length && !visible(j)) j += d; return (j >= 0 && j < deck.scenes.length) ? j : -1; };

  /* ---------- ② 시작 ---------- */
  async function boot() {
    wrap = $('wrap');
    const ref = (SL.qs.get('deck') || '').split(':');
    if (ref.length < 2) { location.replace('../index.html' + location.search.replace(/deck=[^&]*&?/, '')); return; }
    await SL.initBackend();
    try { deck = await SL.loadDeck(ref[0], ref.slice(1).join(':')); } catch (e) { console.error(e); }
    if (!deck || !deck.scenes.length) { $('loading').innerHTML = '<div>슬라이드를 찾을 수 없습니다. <a style="color:#cbb8ff" href="../index.html">서랍으로 돌아가기</a></div>'; return; }
    $('loading').remove();
    stage = SL.makeStage(deck); wrap.appendChild(stage); SL.addWatermark(wrap);
    idx = Math.min(Math.max(parseInt(SL.qs.get('s') || '1', 10) - 1, 0), deck.scenes.length - 1);
    // 수업 방 이어 하기
    const rc = SL.qs.get('room') || sessionStorage.getItem('sl_room_' + deck.k + deck.id);
    if (rc) { const m = await db().get(P.room(rc) + '/meta'); if (m && !m.closed) { room = { code: rc, groups: m.groups || 6 }; subscribeRoom(); } }
    bindUI(); render(); layout();
    window.addEventListener('resize', layout);
    if (SL.qs.get('edit') === '1') enterEdit();
    window.addEventListener('beforeunload', e => { if (dirty && deck.k === 'u') { e.preventDefault(); e.returnValue = ''; } });
  }
  function layout() {
    if (!stage) return;
    const edit = mode === 'edit';
    SL.fit(wrap, stage, deck, { l: edit ? 176 : 0, t: edit ? 46 : 0, b: 0 });
    if (edit) drawSel();
  }

  /* ---------- ③ 화면 그리기·이동 ---------- */
  function render(keepSel) {
    if (!keepSel && mode === 'edit' && !stage.querySelector('.el[data-id="' + sel + '"]')) sel = null;
    clearSceneSubs();
    stage.classList.toggle('edit', mode === 'edit');
    SL.renderScene(stage, deck, idx, { mode, rev: mode === 'edit' ? 0 : rev, room: room && room.code });
    layout();
    if (mode === 'view') { mountLive(); }
    else { drawSel(); renderProps(); renderStrip(); }
    renderBars(); renderPanel();
    history.replaceState(null, '', location.pathname + '?' + [...[...SL.qs.entries()].filter(([k]) => k !== 's' && k !== 'edit').map(([k, v]) => k + '=' + encodeURIComponent(v)), 's=' + (idx + 1)].join('&'));
    publish();
  }
  function applyReveal() {
    stage.querySelectorAll('.rv').forEach(n => {
      const e = sc().els.find(x => x.id === n.dataset.id); n.classList.toggle('on', !!e && rev >= e.reveal);
    });
    renderBars(); publish();
  }
  function goScene(i, r) {
    if (i < 0 || i >= deck.scenes.length) return;
    idx = i; rev = r || 0; sel = null; blank = false; render();
  }
  function next() {
    if (mode !== 'view') return;
    const m = SL.revealMax(sc());
    if (rev < m) { rev++; applyReveal(); return; }
    const j = nextVis(idx, 1); if (j >= 0) goScene(j); else SL.toast('마지막 장면입니다.');
  }
  function prev() {
    if (mode !== 'view') return;
    if (rev > 0) { rev--; applyReveal(); return; }
    const j = nextVis(idx, -1); if (j >= 0) goScene(j, SL.revealMax(deck.scenes[j]));
  }
  function setBlank(v) {
    blank = v; let c = wrap.querySelector('.cover');
    if (blank && !c) { c = h('div', 'cover', `<img src="ggumsong.png" alt=""><div>잠시 쉬어갑니다</div>`); wrap.appendChild(c); c.onclick = () => setBlank(false); }
    if (!blank && c) c.remove();
    renderBars(); publish();
  }
  function showGrid() {
    let g = wrap.querySelector('.grid'); if (g) { g.remove(); return; }
    g = h('div', 'grid'); wrap.appendChild(g);
    deck.scenes.forEach((s, i) => {
      if (!visible(i)) return;
      const c = h('div'); const t = h('div', 'th' + (i === idx ? ' cur' : '')); t.appendChild(thumb(i)); t.insertAdjacentHTML('beforeend', `<span class="n">${i + 1}</span>`);
      c.appendChild(t); c.insertAdjacentHTML('beforeend', `<div class="cap">${esc(s.title || '')}</div>`);
      c.onclick = () => { g.remove(); goScene(i); }; g.appendChild(c);
    });
    const x = h('button', 'btn', '닫기 ✕'); x.style.cssText = 'position:fixed;top:12px;right:14px;z-index:90'; x.onclick = () => g.remove(); g.appendChild(x);
  }
  function thumb(i, w) {
    const s = SL.makeStage(deck, 'thumb'); w = w || 190;
    s.style.width = w + 'px'; s.style.height = (w * (deck.H || 540) / (deck.W || 960)) + 'px'; s.style.setProperty('--pt', (w / (deck.W || 960)) + 'px');
    SL.renderScene(s, deck, i, { mode: 'thumb', rev: 99, room: room && room.code }); return s;
  }
  function renderBars() {
    const top = $('top'), bot = $('bot'), n = deck.scenes.length, edit = mode === 'edit';
    $('prog').style.width = ((idx + 1) / n * 100) + '%';
    if (!edit) {
      top.innerHTML = `<button class="btn sm" data-a="home">← 서랍</button><span style="font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:46vw">${esc(deck.title)}</span><span class="sp"></span><span class="sceneno">${idx + 1} / ${n}</span><button class="btn sm" data-a="edit">✏️ 편집</button><button class="btn sm ${panelOpen ? 'on' : ''}" data-a="panel">🎛 교사 패널</button><button class="btn sm" data-a="grid">☰ 목차</button><button class="btn sm" data-a="full">⛶</button>`;
      const rm = SL.revealMax(sc());
      bot.innerHTML = `<button class="btn" data-a="prev">◀ 이전</button><button class="btn pri" data-a="next" style="min-width:120px">${rev < rm ? '답 보기 ' + (rev + 1) + '/' + rm : '다음 ▶'}</button><button class="btn ${blank ? 'on' : ''}" data-a="blank">⬛ 가리기</button>` +
        (room ? `<button class="btn on" data-a="qr">📱 방 ${esc(room.code)}</button>` : `<button class="btn" data-a="start">🚀 수업 시작</button>`);
    } else {
      top.innerHTML = `<button class="btn sm" data-a="view">▶ 발표 보기</button><button class="btn sm" data-a="addscene">＋ 장면</button><button class="btn sm" data-a="addel">＋ 요소</button><button class="btn sm" data-a="undo">↶</button><button class="btn sm" data-a="redo">↷</button><span class="sp"></span><span id="savest" class="sceneno">${dirty ? '저장 안 됨' : '저장됨'}</span><button class="btn sm pri" data-a="save">💾 저장</button><button class="btn sm" data-a="saveas">📄 다른 이름으로</button>`;
      bot.innerHTML = '';
    }
    top.classList.add('show'); setTimeout(() => top.classList.remove('show'), 2600);
  }
  function bindUI() {
    const act = a => ({
      home: () => { if (dirty && !confirm('저장하지 않은 변경이 있습니다. 나갈까요?')) return; dirty = false; location.href = SL.root + 'index.html' + (SL.space !== 'default' ? '?space=' + SL.space : ''); },
      edit: enterEdit, view: exitEdit, panel: togglePanel, grid: showGrid, full: toggleFull,
      prev, next, blank: () => setBlank(!blank), start: startRoom, qr: showJoinQR,
      addscene: addSceneMenu, addel: addElMenu, undo, redo, save: () => save(false), saveas: () => save(true)
    }[a] || (() => { }))();
    [$('top'), $('bot')].forEach(b => b.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (t) { e.stopPropagation(); act(t.dataset.a); } }));
    $('fab').onclick = () => { ['top', 'bot'].forEach(i => $(i).classList.toggle('show')); };
    // 무대 누르기/밀기
    let sx = 0, sy = 0, moved = false;
    wrap.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; moved = false; });
    wrap.addEventListener('pointerup', e => {
      if (mode !== 'view' || blank) return;
      if (e.target.closest('.w,.qr-box,button,input,textarea,a,.bar,.panel,.grid,.modal,.cover')) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { dx < 0 ? next() : prev(); return; }
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
      const r = stage.getBoundingClientRect(); const fx = (e.clientX - r.left) / r.width;
      if (e.clientY > r.bottom - 6 || e.clientY < r.top + 4) return;
      fx < .22 ? prev() : next();
    });
    document.addEventListener('keydown', onKey);
    document.addEventListener('paste', onPaste);
    wrap.addEventListener('dragover', e => { if (mode === 'edit') e.preventDefault(); });
    wrap.addEventListener('drop', e => { if (mode !== 'edit') return; e.preventDefault(); [...(e.dataTransfer.files || [])].filter(f => /^image\//.test(f.type)).forEach(addImageFile); });
    stage.addEventListener('pointerdown', onStageDown);
    stage.addEventListener('dblclick', onStageDbl);
    wrap.addEventListener('mousemove', () => { $('top').classList.add('show'); $('bot').classList.add('show'); clearTimeout(bindUI.t); bindUI.t = setTimeout(() => { $('top').classList.remove('show'); $('bot').classList.remove('show'); }, 2500); });
  }
  function onKey(e) {
    if (e.target.closest && e.target.closest('input,textarea,[contenteditable=true],select')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (document.querySelector('.modal')) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (mode === 'view') {
      if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
      else if (k === 'Home') goScene(0); else if (k === 'End') goScene(deck.scenes.length - 1);
      else if (k === 'f' || k === 'F') toggleFull(); else if (k === 'b' || k === 'B') setBlank(!blank);
      else if (k === 'g' || k === 'G') showGrid(); else if (k === 'p' || k === 'P') togglePanel(); else if (k === 'e' || k === 'E') enterEdit();
      else if (k === 'Escape') { const g = wrap.querySelector('.grid'); if (g) g.remove(); else if (blank) setBlank(false); else if (panelOpen) togglePanel(); }
    } else {
      if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); save(false); }
      else if (ctrl && k.toLowerCase() === 'd') { e.preventDefault(); dupEl(); }
      else if (ctrl && k.toLowerCase() === 'c') { const el = selEl(); if (el) clip.el = SL.clone(el); }
      else if (ctrl && k.toLowerCase() === 'v' && clip.el) { e.preventDefault(); pasteEl(); }
      else if ((k === 'Delete' || k === 'Backspace') && sel) { e.preventDefault(); delEl(); }
      else if (k.startsWith('Arrow') && sel) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; commit(el => { if (k === 'ArrowLeft') el.x -= d; if (k === 'ArrowRight') el.x += d; if (k === 'ArrowUp') el.y -= d; if (k === 'ArrowDown') el.y += d; }, true); }
      else if (k === 'Escape') { sel = null; render(); }
    }
  }
  function toggleFull() { const d = document; if (!d.fullscreenElement) (d.documentElement.requestFullscreen || (() => { })).call(d.documentElement); else d.exitFullscreen(); }

  /* ---------- ④ 실시간 위젯 ---------- */
  function sub(path, cb) { const u = db().on(path, cb); subsScene.push(u); }
  function clearSceneSubs() { subsScene.splice(0).forEach(u => u && u()); timers.splice(0).forEach(clearInterval); }
  const live = (el) => `${P.room(room.code)}/live/${sc().id}/${el.id}`;
  function mountLive() {
    const s = sc();
    stage.querySelectorAll('[data-w]').forEach(node => {
      const el = s.els.find(e => e.id === node.dataset.id); if (!el) return;
      if (el.t === 'yt') return mountYT(node, el);
      if (el.t === 'qr') return;
      if (!room) { node.classList.add('ph'); node.querySelector('.wb').innerHTML = '수업을 시작하면<br>학생 참여가 여기에 모입니다<br><small>(아래 🚀 수업 시작)</small>'; return; }
      if (el.t === 'wall') mountWall(node, el); else if (el.t === 'poll') mountPoll(node, el); else if (el.t === 'ws') mountWS(node, el);
    });
    if (room) subReactions(s);
  }
  function mountWall(node, el) {
    const g = node.querySelector('.wall-g'), cnt = node.querySelector('.cnt'), seen = new Set();
    sub(live(el) + '/items', v => {
      v = v || {}; wallData[el.id] = v;
      const list = Object.keys(v).map(k => Object.assign({ k }, v[k])).filter(o => el.approve === false || o.ok).sort((a, b) => a.ts - b.ts);
      g.innerHTML = '';
      list.forEach(o => { const n = h('div', 'note'); n.textContent = o.t; const sm = h('small'); sm.textContent = o.n || ''; n.appendChild(sm); if (seen.has(o.k)) n.style.animation = 'none'; seen.add(o.k); g.appendChild(n); });
      cnt.textContent = list.length + '개'; cnt.classList.toggle('hide', !list.length);
      if (!list.length) { g.innerHTML = '<div style="color:#8a8399;font-size:calc(var(--pt)*14);padding:calc(var(--pt)*8)">' + (Object.keys(v).length ? '선생님이 공개하면 여기에 나타납니다 ✨' : '학생이 보낸 생각이 여기에 나타납니다') + '</div>'; g.style.display = 'block'; } else g.style.display = '';
      renderPanel();
    });
  }
  function mountPoll(node, el) {
    const wb = node.querySelector('.wb'), cnt = node.querySelector('.cnt');
    let votes = {}, rv = false;
    const draw = () => {
      const opts = el.opts || [], tally = opts.map(() => 0); Object.values(votes).forEach(i => { if (tally[i] != null) tally[i]++; });
      const total = tally.reduce((a, b) => a + b, 0);
      pollData[el.id] = { tally, total, rv }; cnt.textContent = total + '명'; cnt.classList.toggle('hide', !total);
      if (el.delay !== false && !rv) {
        wb.innerHTML = `<div class="pwait">투표 중… <b>${total}</b>명 참여<br><button class="btn pri" data-reveal="1" style="background:#6A4BC4;color:#fff;border:0;border-radius:999px;padding:calc(var(--pt)*8) calc(var(--pt)*22);font-size:calc(var(--pt)*16);font-weight:800;margin-top:calc(var(--pt)*10)">결과 공개 ▶</button></div>`;
        wb.querySelector('[data-reveal]').onclick = () => revealPoll(el);
      } else {
        const mx = Math.max(...tally, 0);
        wb.innerHTML = opts.map((o, i) => { const pc = total ? Math.round(tally[i] / total * 100) : 0; return `<div class="pbar ${tally[i] === mx && mx > 0 ? 'win' : ''}"><div class="lb">${esc(o)}</div><div class="tr"><div class="fi" data-w="${pc}">${tally[i] ? tally[i] + '명 · ' + pc + '%' : ''}</div></div></div>`; }).join('');
        requestAnimationFrame(() => requestAnimationFrame(() => wb.querySelectorAll('.fi').forEach(f => f.style.width = Math.max(+f.dataset.w, 0) + '%')));
      }
      renderPanel();
    };
    sub(live(el) + '/votes', v => { votes = v || {}; draw(); });
    sub(live(el) + '/rv', v => { rv = !!v; draw(); });
  }
  async function revealPoll(el, hideAgain) {
    if (hideAgain) { await db().set(live(el) + '/rv', null); return; }
    for (let n = 3; n >= 1; n--) { const c = h('div', 'count', String(n)); wrap.appendChild(c); await SL.sleep(750); c.remove(); }
    await db().set(live(el) + '/rv', true);
  }
  function wsGroups() { return Math.max(room.groups || 6, 1); }
  function mountWS(node, el) {
    const wb = node.querySelector('.wb'), cnt = node.querySelector('.cnt');
    sub(live(el) + '/ws', v => {
      v = v || {}; wsData[el.id] = v; const keys = new Set(); for (let i = 1; i <= wsGroups(); i++) keys.add('g' + i); Object.keys(v).forEach(k => keys.add(k));
      const flds = el.fields || []; let done = 0;
      wb.innerHTML = '<div class="ws-g"></div>'; const g = wb.firstChild;
      [...keys].sort((a, b) => +a.slice(1) - +b.slice(1)).forEach(k => {
        const d = v[k] || {}, f = d.f || {}; const filled = flds.filter(x => f[x.id] && f[x.id].t && f[x.id].t.trim()).length; const strokes = Object.keys(d.s || {}).length;
        const full = flds.length ? filled === flds.length : strokes > 0; if (full) done++;
        const t = h('div', 'ws-t' + (full ? ' done' : '')); t.innerHTML = `<h4><span>${k.slice(1)}모둠</span><span>${flds.length ? filled + '/' + flds.length : ''}${strokes ? ' ✏️' : ''}</span></h4><p></p>`;
        t.querySelector('p').textContent = flds.map(x => (f[x.id] && f[x.id].t) || '').filter(Boolean).join(' / ') || '아직 작성 전';
        t.onclick = () => openWSDetail(el, k); g.appendChild(t);
      });
      cnt.textContent = done + '/' + keys.size + ' 완료'; cnt.classList.remove('hide'); renderPanel();
    });
  }
  function drawStrokes(cv, strokes) {
    const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.lineCap = 'round'; c.lineJoin = 'round';
    Object.keys(strokes || {}).sort().forEach(k => {
      const s = strokes[k]; const pts = String(s.p || '').split(' ').map(q => q.split(',').map(Number)).filter(q => q.length === 2 && !isNaN(q[0]));
      if (!pts.length) return; c.strokeStyle = s.c || '#2B2350'; c.lineWidth = (s.w || 3) * cv.width / 1000; c.beginPath();
      pts.forEach((q, i) => { const x = q[0] / 1000 * cv.width, y = q[1] / 1000 * cv.width; i ? c.lineTo(x, y) : c.moveTo(x, y); });
      if (pts.length === 1) c.lineTo(pts[0][0] / 1000 * cv.width + .1, pts[0][1] / 1000 * cv.width); c.stroke();
    });
  }
  function openWSDetail(el, gk) {
    const m = h('div', 'modal'), b = h('div', 'box'); b.style.maxWidth = 'min(900px,96vw)'; m.appendChild(b);
    const d = (wsData[el.id] || {})[gk] || {}, f = d.f || {};
    b.innerHTML = `<h2>📝 ${gk.slice(1)}모둠 — ${esc(el.title || '모둠 학습지')}</h2>` + (el.bg ? `<img src="${esc(el.bg)}" style="max-width:100%;border-radius:10px;border:1px solid #ddd;margin-bottom:8px">` : '') +
      (el.fields || []).map(x => `<div style="margin:8px 0"><div style="font-weight:800;color:#6A4BC4">${esc(x.label)}</div><div style="white-space:pre-wrap;background:#F7F5FC;border-radius:10px;padding:10px 12px;font-size:20px;line-height:1.45;min-height:44px">${esc((f[x.id] && f[x.id].t) || '')}</div></div>`).join('') +
      (el.draw ? `<canvas width="1000" height="560" style="width:100%;background:#fff;border:1.5px solid #dcd5f0;border-radius:10px;margin-top:8px"></canvas>` : '') +
      `<div class="row"><button class="btn pri" id="xx">닫기</button></div>`;
    document.body.appendChild(m); b.querySelector('#xx').onclick = () => m.remove(); m.onclick = e => { if (e.target === m) m.remove(); };
    const cv = b.querySelector('canvas'); if (cv) drawStrokes(cv, d.s);
    const un = db().on(live(el) + '/ws/' + gk, v => { if (!document.body.contains(m)) { un && un(); return; } if (cv && v) drawStrokes(cv, v.s); });
  }
  async function mountYT(node, el) {
    const id = SL.ytId(el.url); if (!id) return;
    const box = node.querySelector('#ytp'); if (!box) return;
    const fallback = msg => { node.innerHTML = `<div class="yt-ph"><div>${esc(msg)}</div><a class="btn pri" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${id}&t=${el.start || 0}s" style="text-decoration:none">▶ 유튜브에서 열기</a></div>`; };
    try {
      const YT = await SL.ytAPI();
      const vars = { rel: 0, modestbranding: 1, playsinline: 1, start: el.start || 0 }; if (el.end) vars.end = el.end;
      const pa = (el.pauseAt || []).slice().sort((a, b) => a.t - b.t); const fired = new Set();
      let player = new YT.Player(box, {
        videoId: id, playerVars: vars,
        events: {
          onError: () => fallback('이 영상은 슬라이드 안에서 재생할 수 없습니다(퍼가기 제한).'),
          onReady: () => {
            if (!pa.length) return;
            const tm = setInterval(() => {
              try {
                if (player.getPlayerState() !== 1) return; const t = player.getCurrentTime();
                pa.forEach((p, i) => { if (t < p.t - 1.5) fired.delete(i); });
                const i = pa.findIndex((p, j) => !fired.has(j) && t >= p.t && t < p.t + 3);
                if (i >= 0) { fired.add(i); player.pauseVideo(); showPauseCard(node, pa[i], () => { player.playVideo(); }); }
              } catch (e) { }
            }, 300); timers.push(tm);
          }
        }
      });
    } catch (e) { fallback('유튜브에 연결할 수 없습니다.'); }
  }
  function showPauseCard(node, p, resume) {
    const c = h('div', 'cover'); c.style.position = 'absolute'; c.style.background = '#14102bee'; c.style.zIndex = 5; c.style.textAlign = 'center'; c.style.padding = '5%';
    c.innerHTML = `<div style="font-size:calc(var(--pt)*14);color:#bba8ff">⏸ 영상 멈춤 ${SL.fmtT(p.t)}</div><div style="font-size:calc(var(--pt)*30);font-weight:800;line-height:1.4">${esc(p.msg || '잠깐! 생각해 봅시다.')}</div><button class="btn pri" style="font-size:calc(var(--pt)*18)">▶ 이어서 재생</button>`;
    c.querySelector('button').onclick = () => { c.remove(); resume(); }; node.appendChild(c);
  }
  function subReactions(s) {
    const base = P.room(room.code); let first = true, lastTs = 0;
    sub(base + '/rx/' + s.id, v => {
      v = v || {}; rxData.rx = v; let mx = lastTs;
      Object.values(v).forEach(o => { if (!first && o.ts > lastTs) floatEmoji(o.e); mx = Math.max(mx, o.ts || 0); });
      lastTs = mx; first = false; drawRxBar(); renderPanel();
    });
    sub(base + '/und/' + s.id, v => { rxData.und = v || {}; renderPanel(); });
  }
  function drawRxBar() {
    let b = stage.querySelector('.rxbar'); const t = {}; Object.values(rxData.rx).forEach(o => t[o.e] = (t[o.e] || 0) + 1);
    const keys = Object.keys(t); if (!showRx || !keys.length) { if (b) b.remove(); return; }
    if (!b) { b = h('div', 'rxbar'); stage.appendChild(b); } b.innerHTML = keys.map(k => `<span>${k} ${t[k]}</span>`).join('');
  }
  function floatEmoji(e) {
    if (!stage || mode !== 'view') return; const f = h('div', 'floaty', esc(e)); f.style.left = (8 + Math.random() * 82) + '%'; stage.appendChild(f); setTimeout(() => f.remove(), 3000);
  }

  /* ---------- ⑤ 수업 방·교사 패널·모둠 뽑기 ---------- */
  async function startRoom() {
    if (!(await SL.askPin())) return;
    let code, tries = 0; do { code = String(Math.floor(1000 + Math.random() * 9000)); tries++; } while (tries < 8 && await db().get(P.room(code) + '/meta'));
    const groups = +(SL.lsGet('sl_groups') || 6);
    await db().set(P.room(code) + '/meta', { deck: { k: deck.k, id: deck.id, space: SL.space, title: deck.title }, created: Date.now(), groups });
    room = { code, groups }; sessionStorage.setItem('sl_room_' + deck.k + deck.id, code);
    subscribeRoom(); render(); showJoinQR();
  }
  function subscribeRoom() {
    subsRoom.splice(0).forEach(u => u && u());
    subsRoom.push(db().on(P.room(room.code) + '/users', v => { roomUsers = v || {}; renderPanel(); }));
    subsRoom.push(db().on(P.room(room.code) + '/meta', v => { roomMeta = v; if (v && v.groups) room.groups = v.groups; }));
  }
  async function endRoom() {
    if (!(await SL.dialog({ title: '수업을 끝낼까요?', body: '학생 화면은 "수업이 끝났어요"로 바뀝니다. (학생 글·투표·학습지 기록은 남아 있습니다)', ok: '수업 끝내기' }))) return;
    await db().update(P.room(room.code) + '/meta', { closed: true });
    sessionStorage.removeItem('sl_room_' + deck.k + deck.id); subsRoom.splice(0).forEach(u => u && u()); room = null; roomUsers = {}; render();
  }
  async function eraseRoom() {
    if (!(await SL.dialog({ title: '이 방의 기록을 지울까요?', body: '학생 글·투표·모둠 학습지가 모두 삭제됩니다. 되돌릴 수 없습니다.', ok: '지우기' }))) return;
    await db().remove(P.room(room.code) + '/live'); await db().remove(P.room(room.code) + '/rx'); await db().remove(P.room(room.code) + '/und'); SL.toast('기록을 지웠습니다.');
  }
  function showJoinQR() {
    const url = SL.joinURL(room.code);
    const m = h('div', 'modal'), b = h('div', 'box'); b.style.textAlign = 'center'; m.appendChild(b);
    b.innerHTML = `<h2>📱 학생 입장</h2><img alt="QR" style="width:min(70vw,360px);image-rendering:pixelated" src="${SL.qrData(url)}"><div class="big-code" style="font-size:54px;font-weight:900;letter-spacing:8px;color:#6A4BC4">${esc(room.code)}</div><div style="word-break:break-all;color:#6E6890;font-size:13px;margin-top:6px">${esc(url)}</div><div class="row" style="justify-content:center"><button class="btn" id="cp">🔗 주소 복사</button><button class="btn pri" id="cl">닫기</button></div>`;
    document.body.appendChild(m); b.querySelector('#cl').onclick = () => m.remove(); m.onclick = e => { if (e.target === m) m.remove(); };
    b.querySelector('#cp').onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => SL.toast('주소를 복사했습니다.')).catch(() => SL.toast('복사할 수 없어요. 주소를 길게 눌러 복사하세요.')); };
  }
  function publish() { if (!room || !deck) return; db().set(P.room(room.code) + '/state', { sc: sc().id, rev, blank, ts: Date.now() }); }
  async function togglePanel() {
    if (!panelOpen && !(await SL.askPin())) return;
    panelOpen = !panelOpen; $('panel').classList.toggle('open', panelOpen); renderPanel(); renderBars();
  }
  function renderPanel() {
    const p = $('panel'); if (!panelOpen || !deck) return;
    const keep = p.querySelector('.pc') ? p.querySelector('.pc').scrollTop : 0;
    p.innerHTML = `<div class="tabs"><button data-t="run" class="${tab === 'run' ? 'on' : ''}">🎬 진행</button><button data-t="ppl" class="${tab === 'ppl' ? 'on' : ''}">👥 학생·모둠 ${Object.keys(roomUsers).length || ''}</button><button data-t="x" style="flex:none;width:48px">✕</button></div><div class="pc">${tab === 'run' ? panelRun() : panelPpl()}</div>`;
    p.querySelector('.pc').scrollTop = keep;
  }
  function panelRun() {
    const s = sc(); let o = '';
    if (!room) o += `<div class="card">수업을 시작하면 학생이 <b>QR</b>로 들어와 <b>질문·투표·모둠 학습지·반응</b>에 참여합니다.</div><button class="btn pri" data-a="start" style="width:100%;padding:12px">🚀 수업 시작 (방 만들기)</button>`;
    else o += `<div class="big-code">${esc(room.code)}</div><div class="row" style="justify-content:center"><button class="btn" data-a="qr">📱 QR 크게</button><button class="btn bad" data-a="end">⏹ 수업 끝내기</button></div>`;
    o += `<div class="row"><button class="btn ${blank ? 'pri' : ''}" data-a="blank">⬛ 화면 가리기</button><button class="btn ${showRx ? 'pri' : ''}" data-a="rxtoggle">반응 표시</button></div>`;
    if (s.notes) o += `<h3>📌 이 장면 메모</h3><div class="card" style="white-space:pre-wrap">${esc(s.notes)}</div>`;
    if (room) {
      const und = { 1: 0, 2: 0, 3: 0 }; Object.values(rxData.und).forEach(v => und[v] != null && und[v]++);
      const tot = und[1] + und[2] + und[3];
      o += `<h3>🙂 이해도 (이 장면)</h3><div class="card">😀 알겠어요 <b>${und[1]}</b> · 😐 반쯤 <b>${und[2]}</b> · 🤔 모르겠어요 <b>${und[3]}</b>${tot ? `<div class="mute">총 ${tot}명 응답</div>` : ''}</div>`;
      s.els.filter(e => ['wall', 'poll', 'ws'].includes(e.t)).forEach(e => {
        if (e.t === 'wall') {
          const items = Object.keys(wallData[e.id] || {}).map(k => Object.assign({ k }, wallData[e.id][k])).sort((a, b) => a.ts - b.ts);
          const pend = items.filter(i => !i.ok);
          o += `<h3>💬 ${esc(e.q || '질문 월')}</h3>`;
          if (e.approve !== false) {
            o += `<div class="row"><span class="tag">승인 대기 ${pend.length}</span>${pend.length ? `<button class="btn pri" data-a="okall" data-e="${e.id}">모두 공개</button>` : ''}</div>`;
            pend.forEach(i => { o += `<div class="card">${esc(i.t)}<div class="mute">${esc(i.n || '')}</div><div class="row"><button class="btn pri" data-a="ok" data-e="${e.id}" data-k="${i.k}">공개</button><button class="btn bad" data-a="rm" data-e="${e.id}" data-k="${i.k}">삭제</button></div></div>`; });
          }
          const okl = items.filter(i => i.ok); if (okl.length) o += `<div class="mute">공개 중 ${okl.length}개</div>` + okl.map(i => `<div class="card" style="padding:6px 10px">${esc(i.t)} <button class="btn sm bad" data-a="hide" data-e="${e.id}" data-k="${i.k}" style="float:right">숨김</button></div>`).join('');
        } else if (e.t === 'poll') {
          const d = pollData[e.id] || { total: 0, rv: false };
          o += `<h3>📊 ${esc(e.q || '투표')}</h3><div class="card">${d.total}명 투표 · ${d.rv || e.delay === false ? '결과 공개 중' : '결과 비공개'}</div><div class="row">${e.delay === false ? '' : (d.rv ? `<button class="btn" data-a="pollhide" data-e="${e.id}">결과 다시 가리기</button>` : `<button class="btn pri" data-a="pollrv" data-e="${e.id}">결과 공개 ▶</button>`)}<button class="btn bad" data-a="pollclr" data-e="${e.id}">투표 초기화</button></div>`;
        } else if (e.t === 'ws') {
          o += `<h3>📝 ${esc(e.title || '모둠 학습지')}</h3><div class="mute">화면의 모둠 칸을 누르면 크게 볼 수 있습니다.</div>`;
        }
      });
      o += `<div class="row" style="margin-top:14px"><button class="btn bad" data-a="erase">🗑 이 방의 기록 지우기</button></div>`;
    }
    return o;
  }
  function panelPpl() {
    if (!room) return '<div class="card">수업을 시작하면 접속한 학생이 여기에 보입니다.</div>';
    const us = Object.keys(roomUsers).map(k => Object.assign({ k }, roomUsers[k])).sort((a, b) => (a.no || 999) - (b.no || 999) || (a.n || '').localeCompare(b.n || ''));
    let o = `<h3>🎲 모둠 뽑기</h3><div class="row"><input id="gn" type="number" min="1" max="12" value="${room.groups}" style="width:70px"> 모둠 <button class="btn pri" data-a="draw">🎲 뽑기 (접속한 학생 ${us.length}명)</button></div><div class="mute">학생이 직접 고른 모둠도 다시 섞입니다. 아래에서 한 명씩 고칠 수 있어요.</div><h3>👥 접속한 학생 ${us.length}명</h3>`;
    if (!us.length) o += '<div class="card">아직 아무도 들어오지 않았어요. QR을 보여 주세요.</div>';
    us.forEach(u => {
      o += `<div class="row card" style="padding:6px 10px;justify-content:space-between"><span>${u.no ? u.no + '번 ' : ''}<b>${esc(u.n || '')}</b></span><span><select data-a="setg" data-u="${u.k}"><option value="">모둠 없음</option>${Array.from({ length: room.groups }, (_, i) => `<option value="${i + 1}" ${+u.g === i + 1 ? 'selected' : ''}>${i + 1}모둠</option>`).join('')}</select> <button class="btn sm bad" data-a="kick" data-u="${u.k}">✕</button></span></div>`;
    });
    return o;
  }
  async function drawGroups() {
    const n = Math.min(12, Math.max(1, +($('gn') || {}).value || room.groups)); const us = Object.keys(roomUsers);
    if (!us.length) { SL.toast('접속한 학생이 없습니다.'); return; }
    SL.lsSet('sl_groups', n); room.groups = n; await db().update(P.room(room.code) + '/meta', { groups: n });
    const arr = us.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
    const gs = Array.from({ length: n }, () => []); arr.forEach((u, i) => gs[i % n].push(u));
    const ov = h('div', 'shuffle', `<img src="ggumsong.png" alt=""><div style="font-size:30px;font-weight:800">모둠을 뽑는 중…</div>`); document.body.appendChild(ov);
    await SL.sleep(2200);
    ov.innerHTML = `<div style="font-size:26px;font-weight:800">🎉 모둠이 정해졌어요!</div><div class="gcards"></div><button class="btn pri" style="font-size:18px" id="shx">닫기</button>`;
    const box = ov.querySelector('.gcards');
    for (let i = 0; i < n; i++) { const c = h('div', 'gcard', `<h4>${i + 1}모둠</h4><div>${gs[i].map(u => esc((roomUsers[u].no ? roomUsers[u].no + ' ' : '') + roomUsers[u].n)).join('<br>') || '—'}</div>`); box.appendChild(c); await SL.sleep(650); }
    ov.querySelector('#shx').onclick = () => ov.remove();
    const upd = {}; gs.forEach((g, i) => g.forEach(u => upd[u + '/g'] = i + 1)); await db().update(P.room(room.code) + '/users', upd);
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest('#panel [data-t],#panel [data-a]'); if (!t) return;
    if (t.dataset.t) { if (t.dataset.t === 'x') return togglePanel(); tab = t.dataset.t; return renderPanel(); }
    const a = t.dataset.a, k = t.dataset.k, el = t.dataset.e && sc().els.find(x => x.id === t.dataset.e), base = el && room ? live(el) : '';
    if (a === 'start') startRoom(); else if (a === 'qr') showJoinQR(); else if (a === 'end') endRoom(); else if (a === 'erase') eraseRoom();
    else if (a === 'blank') setBlank(!blank); else if (a === 'rxtoggle') { showRx = !showRx; drawRxBar(); renderPanel(); }
    else if (a === 'ok') db().update(base + '/items/' + k, { ok: true });
    else if (a === 'hide') db().update(base + '/items/' + k, { ok: false });
    else if (a === 'rm') db().remove(base + '/items/' + k);
    else if (a === 'okall') { const v = wallData[el.id] || {}; const u = {}; Object.keys(v).forEach(i => { if (!v[i].ok) u[i + '/ok'] = true; }); db().update(base + '/items', u); }
    else if (a === 'pollrv') revealPoll(el); else if (a === 'pollhide') revealPoll(el, true);
    else if (a === 'pollclr') { if (await SL.dialog({ title: '투표를 초기화할까요?', ok: '초기화' })) { db().remove(base + '/votes'); db().remove(base + '/rv'); } }
    else if (a === 'draw') drawGroups(); else if (a === 'kick') db().remove(P.room(room.code) + '/users/' + t.dataset.u);
  });
  document.addEventListener('change', e => { const t = e.target.closest('#panel [data-a=setg]'); if (t && room) db().update(P.room(room.code) + '/users/' + t.dataset.u, { g: t.value ? +t.value : null }); });

  /* ---------- ⑥ 편집 ---------- */
  const selEl = () => sel && sc().els.find(e => e.id === sel);
  async function enterEdit() {
    if (!(await SL.askPin())) return;
    mode = 'edit'; sel = null; blank = false; setBlankClear(); $('strip').classList.remove('hide'); if (panelOpen) togglePanel();
    wrap.style.left = '0'; render();
    if (deck.k === 'b') SL.toast('기본 제공 틀입니다. 💾 저장하면 "내 슬라이드"로 복사됩니다.', 4200);
  }
  function setBlankClear() { const c = wrap.querySelector('.cover'); if (c) c.remove(); }
  function exitEdit() { mode = 'view'; sel = null; $('strip').classList.add('hide'); $('props').classList.add('hide'); stage.style.margin = ''; rev = 0; render(); if (dirty && deck.k === 'u') save(false, true); }
  function snapshot() { return JSON.stringify({ scenes: deck.scenes, title: deck.title, idx }); }
  function pushHist() { hist.u.push(snapshot()); if (hist.u.length > 40) hist.u.shift(); hist.r = []; }
  function restore(s) { const o = JSON.parse(s); deck.scenes = o.scenes; deck.title = o.title; idx = Math.min(o.idx, deck.scenes.length - 1); sel = null; markDirty(); render(); }
  function undo() { if (!hist.u.length) return; hist.r.push(snapshot()); restore(hist.u.pop()); }
  function redo() { if (!hist.r.length) return; hist.u.push(snapshot()); restore(hist.r.pop()); }
  function markDirty() { dirty = true; const s = $('savest'); if (s) s.textContent = '저장 안 됨'; clearTimeout(saveTimer); if (deck.k === 'u') saveTimer = setTimeout(() => save(false, true), 3500); }
  /* 요소 하나를 고치는 공통 길목: 되돌리기 저장 → 고치기 → 다시 그리기 */
  function commit(fn, keepSel) { const el = selEl(); if (!el) return; pushHist(); fn(el); markDirty(); render(true); }
  function commitScene(fn) { pushHist(); fn(sc()); markDirty(); render(); }

  function drawSel() {
    stage.querySelectorAll('.hdl').forEach(n => n.remove());
    stage.querySelectorAll('.el.sel').forEach(n => n.classList.remove('sel'));
    const el = selEl(); if (!el) return; const n = stage.querySelector('.el[data-id="' + el.id + '"]'); if (!n) return; n.classList.add('sel');
    const W = deck.W || 960, H = deck.H || 540; if (editingText) return;
    [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]].forEach(([k, fx, fy]) => {
      const d = h('div', 'hdl'); d.dataset.h = k; d.style.cursor = k + '-resize';
      d.style.left = `calc(${(el.x + el.w * fx) / W * 100}% - ${5.5}px)`; d.style.top = `calc(${(el.y + el.h * fy) / H * 100}% - ${5.5}px)`; stage.appendChild(d);
    });
  }
  function pxToPt() { return (deck.W || 960) / stage.clientWidth; }
  function onStageDown(e) {
    if (mode !== 'edit' || editingText) return;
    const hd = e.target.closest('.hdl'), nd = e.target.closest('.el');
    if (hd) return startResize(e, hd.dataset.h);
    if (!nd) { if (sel) { sel = null; drawSel(); renderProps(); } return; }
    if (sel !== nd.dataset.id) { sel = nd.dataset.id; drawSel(); renderProps(); }
    startDrag(e);
  }
  function startDrag(e) {
    const el = selEl(); if (!el) return; e.preventDefault(); const k = pxToPt(), x0 = e.clientX, y0 = e.clientY, ox = el.x, oy = el.y; let moved = false;
    const n = stage.querySelector('.el[data-id="' + el.id + '"]'), W = deck.W || 960, H = deck.H || 540;
    const mv = ev => {
      const dx = (ev.clientX - x0) * k, dy = (ev.clientY - y0) * k; if (!moved && Math.hypot(dx, dy) < 2) return;
      if (!moved) { pushHist(); moved = true; }
      el.x = Math.round((ox + dx) * 10) / 10; el.y = Math.round((oy + dy) * 10) / 10;
      // 가운데·가장자리 붙이기
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2; if (Math.abs(cx - W / 2) < 4) el.x = W / 2 - el.w / 2; if (Math.abs(cy - H / 2) < 4) el.y = H / 2 - el.h / 2;
      n.style.left = el.x / W * 100 + '%'; n.style.top = el.y / H * 100 + '%'; drawSel();
    };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (moved) { markDirty(); renderProps(); } };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  }
  function startResize(e, hd) {
    const el = selEl(); if (!el) return; e.preventDefault(); e.stopPropagation(); const k = pxToPt(), x0 = e.clientX, y0 = e.clientY, o = { x: el.x, y: el.y, w: el.w, h: el.h }, W = deck.W || 960, H = deck.H || 540;
    const n = stage.querySelector('.el[data-id="' + el.id + '"]'); const keep = el.t === 'img' && hd.length === 2; const ar = o.w / o.h; pushHist(); let moved = false;
    const mv = ev => {
      moved = true; const dx = (ev.clientX - x0) * k, dy = (ev.clientY - y0) * k; let { x, y, w, h: hh } = o;
      if (hd.includes('e')) w = o.w + dx; if (hd.includes('s')) hh = o.h + dy; if (hd.includes('w')) { w = o.w - dx; x = o.x + dx; } if (hd.includes('n')) { hh = o.h - dy; y = o.y + dy; }
      if (keep) { hh = w / ar; if (hd.includes('n')) y = o.y + o.h - hh; }
      if (w < 12) { w = 12; x = hd.includes('w') ? o.x + o.w - 12 : x; } if (hh < 12) { hh = 12; y = hd.includes('n') ? o.y + o.h - 12 : y; }
      Object.assign(el, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: Math.round(w * 10) / 10, h: Math.round(hh * 10) / 10 });
      n.style.left = el.x / W * 100 + '%'; n.style.top = el.y / H * 100 + '%'; n.style.width = el.w / W * 100 + '%'; n.style.height = el.h / H * 100 + '%'; drawSel();
    };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (moved) { markDirty(); renderProps(); } else hist.u.pop(); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  }
  function onStageDbl(e) {
    if (mode !== 'edit') return; const nd = e.target.closest('.el'); if (!nd) return;
    const el = sc().els.find(x => x.id === nd.dataset.id); if (!el) return; sel = el.id;
    if (el.t === 'shape' && (el.tx || true)) return editText(el, nd);
    if (['yt', 'wall', 'poll', 'ws', 'qr'].includes(el.t)) widgetSettings(el);
    if (el.t === 'img') replaceImage(el);
  }
  function editText(el, nd) {
    if (!el.tx) { pushHist(); el.tx = { anchor: 'm', ins: [4, 4, 4, 4], paras: [{ algn: 'c', lh: null, aft: 0, bullet: false, marL: 0, indent: 0, runs: [{ t: '텍스트', sz: 20, c: '2B2350' }] }] }; render(true); nd = stage.querySelector('.el[data-id="' + el.id + '"]'); }
    const tx = nd.querySelector('.tx'); editingText = el.id; stage.querySelectorAll('.hdl').forEach(n => n.remove());
    tx.contentEditable = 'true'; tx.focus(); const r = document.createRange(); r.selectNodeContents(tx); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const done = () => {
      tx.removeEventListener('blur', done); editingText = null; tx.contentEditable = 'false';
      const old = el.tx.paras; const lines = tx.innerText.replace(/ /g, ' ').replace(/\n$/, '').split('\n');
      const np = lines.map((l, i) => { const o = old[Math.min(i, old.length - 1)]; const t = (o.bullet ? l.replace(/^•\s?/, '') : l); return Object.assign({}, o, { runs: [Object.assign({}, o.runs[0] || { sz: 20 }, { t })] }); });
      if (JSON.stringify(np.map(p => p.runs[0].t)) !== JSON.stringify(old.map(p => p.runs.map(r => r.t).join('')))) { pushHist(); el.tx.paras = np; markDirty(); }
      render(true);
    };
    tx.addEventListener('blur', done);
  }
  /* 속성 바 */
  function renderProps() {
    const pr = $('props'); if (mode !== 'edit') { pr.classList.add('hide'); return; } pr.classList.remove('hide');
    const el = selEl(); let o = '';
    if (!el) {
      const s = sc(); o = `<span class="lbl">장면</span><label class="btnl">배경색 <input type="color" id="pBg" value="#${s.bg || 'FFFFFF'}"></label><button data-p="notes">📌 메모</button><button data-p="hid">${s.hidden ? '👁 숨김 해제' : '🙈 발표 때 건너뛰기'}</button><button data-p="dupsc">⧉ 장면 복제</button><button data-p="title">✎ 이름: ${esc(s.title || '(없음)')}</button><span class="lbl">제목 클릭: 슬라이드 이름</span>`;
    } else {
      const first = el.tx && el.tx.paras[0] && el.tx.paras[0].runs[0] || {}; const isTx = el.t === 'shape';
      if (isTx) o += `<button data-p="fs-">A−</button><input type="number" id="pFs" value="${Math.round(first.sz || 20)}" min="6" max="200"><button data-p="fs+">A+</button><button data-p="b" style="font-weight:900">B</button><label class="btnl">글자 <input type="color" id="pC" value="#${first.c || '2B2350'}"></label><label class="btnl">채움 <input type="color" id="pF" value="#${el.fill || 'FFFFFF'}"></label><button data-p="nofill">채움 없음</button><button data-p="al">≡ 정렬</button><span class="sep"></span>`;
      if (el.t === 'img') o += `<button data-p="rimg">🖼 사진 바꾸기</button><span class="sep"></span>`;
      if (['yt', 'wall', 'poll', 'ws', 'qr'].includes(el.t)) o += `<button data-p="set">⚙ 설정</button><span class="sep"></span>`;
      o += `<span class="lbl">클릭 순서</span><input type="number" id="pRv" min="0" max="20" value="${el.reveal || 0}" title="0 = 처음부터 보임. 1,2,3… = 클릭할 때마다 차례로 나타남"><span class="sep"></span><button data-p="front">⤒ 앞으로</button><button data-p="back">⤓ 뒤로</button><button data-p="dup">⧉</button><button data-p="del" style="color:#d8566b">🗑</button>`;
    }
    pr.innerHTML = o;
  }
  $('props').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return; const p = b.dataset.p, el = selEl();
    if (p === 'notes') return editNotes(); if (p === 'hid') return commitScene(s => s.hidden = !s.hidden); if (p === 'dupsc') return dupScene(); if (p === 'title') return renameScene();
    if (!el) return;
    if (p === 'fs+' || p === 'fs-') return commit(x => scaleFont(x, p === 'fs+' ? 1.1 : 1 / 1.1));
    if (p === 'b') return commit(x => { const on = !(x.tx && x.tx.paras[0].runs[0].b); eachRun(x, r => r.b = on ? 1 : 0); });
    if (p === 'nofill') return commit(x => { delete x.fill; delete x.fa; });
    if (p === 'al') return commit(x => { const cur = x.tx.paras[0].algn, nx = { l: 'c', c: 'r', r: 'l' }[cur || 'l']; x.tx.paras.forEach(q => q.algn = nx); });
    if (p === 'front') return commit(x => { const a = sc().els; a.splice(a.indexOf(x), 1); a.push(x); });
    if (p === 'back') return commit(x => { const a = sc().els; a.splice(a.indexOf(x), 1); a.unshift(x); });
    if (p === 'dup') return dupEl(); if (p === 'del') return delEl(); if (p === 'rimg') return replaceImage(el); if (p === 'set') return widgetSettings(el);
  });
  $('props').addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'pBg') return commitScene(s => s.bg = t.value.slice(1).toUpperCase());
    if (t.id === 'pFs') return commit(x => { const f = (+t.value || 20) / (x.tx.paras[0].runs[0].sz || 20); scaleFont(x, f); });
    if (t.id === 'pC') return commit(x => eachRun(x, r => r.c = t.value.slice(1).toUpperCase()));
    if (t.id === 'pF') return commit(x => { x.fill = t.value.slice(1).toUpperCase(); delete x.fa; if (!x.geom) x.geom = 'rect'; });
    if (t.id === 'pRv') return commit(x => { const v = Math.max(0, Math.min(20, +t.value | 0)); if (v) x.reveal = v; else delete x.reveal; });
  });
  const eachRun = (el, f) => { if (el.tx) el.tx.paras.forEach(p => p.runs.forEach(f)); };
  const scaleFont = (el, f) => eachRun(el, r => { r.sz = Math.max(6, Math.min(200, Math.round((r.sz || 20) * f * 10) / 10)); });
  function dupEl() { const el = selEl(); if (!el) return; pushHist(); const c = SL.clone(el); c.id = SL.rid('e'); c.x += 14; c.y += 14; sc().els.push(c); sel = c.id; markDirty(); render(true); }
  function pasteEl() { pushHist(); const c = SL.clone(clip.el); c.id = SL.rid('e'); c.x += 14; c.y += 14; sc().els.push(c); sel = c.id; markDirty(); render(true); }
  function delEl() { const el = selEl(); if (!el) return; pushHist(); sc().els.splice(sc().els.indexOf(el), 1); sel = null; markDirty(); render(); }
  async function editNotes() { const v = await SL.dialog({ title: '📌 이 장면 메모 (발표 때 교사 패널에만 보임)', area: 1, value: sc().notes || '', ok: '저장' }); if (v != null) commitScene(s => s.notes = v); }
  async function renameScene() { const v = await SL.dialog({ title: '장면 이름', input: 1, value: sc().title || '', ok: '저장' }); if (v != null) commitScene(s => s.title = v.slice(0, 40)); }
  function dupScene() { pushHist(); const c = SL.clone(sc()); c.id = SL.rid('s'); c.els.forEach(e => e.id = SL.rid('e')); deck.scenes.splice(idx + 1, 0, c); idx++; markDirty(); render(); }
  /* 요소·장면 추가 메뉴 */
  function menuAt(btnSel, items) {
    document.querySelectorAll('.menu').forEach(m => m.remove()); const b = document.querySelector(btnSel); const r = b.getBoundingClientRect();
    const m = h('div', 'menu'); m.style.left = Math.min(r.left, innerWidth - 210) + 'px'; m.style.top = (r.bottom + 4) + 'px';
    items.forEach(([t, f]) => { const x = h('button', '', t); x.onclick = () => { m.remove(); f(); }; m.appendChild(x); }); document.body.appendChild(m);
    setTimeout(() => document.addEventListener('pointerdown', function c(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', c); } }), 0);
  }
  function addSceneMenu() {
    const L = () => SL.tpl.lesson('').scenes;
    menuAt('[data-a=addscene]', [['⬜ 빈 장면', () => insScene(SL.mkScene('F7F5FC', [], '새 장면'))], ['📄 내용 장면 (제목+글)', () => insScene(SL.tpl.blank('').scenes[1])], ['🌑 제목(표지) 장면', () => insScene(SL.tpl.blank('제목').scenes[0])], ['💬 질문 월 장면', () => insScene(L()[2])], ['▶ 영상 장면', () => insScene(L()[3])], ['📝 모둠 학습지 장면', () => insScene(L()[4])], ['📊 투표 장면', () => insScene(L()[5])]]);
  }
  function insScene(s) { pushHist(); deck.scenes.splice(idx + 1, 0, s); idx++; sel = null; markDirty(); render(); }
  function addElMenu() {
    menuAt('[data-a=addel]', [['🔤 글상자', () => addEl(SL.mkText(240, 200, 480, 80, '텍스트를 입력하세요', { sz: 28, anchor: 'm' }))], ['⬛ 도형(사각형)', () => addEl(SL.mkRect(300, 180, 360, 180, { r: 16 }))], ['🖼 사진', () => pickImage(addImageFile)], ['▶ 유튜브 영상', () => { const e = SL.mkYT(130, 90, 700, 380, ''); addEl(e); widgetSettings(e); }], ['📱 입장 QR', () => addEl(SL.mkQR(380, 160, 200, 250))], ['💬 질문 월', () => addEl(SL.mkWall(60, 140, 840, 340, '생각을 써 봅시다'))], ['📊 투표', () => addEl(SL.mkPoll(100, 130, 760, 350, '여러분의 생각은?', ['찬성', '반대']))], ['📝 모둠 학습지', () => { const e = SL.mkWS(60, 140, 840, 340); addEl(e); widgetSettings(e); }]]);
  }
  function addEl(e) { pushHist(); sc().els.push(e); sel = e.id; markDirty(); render(true); }
  function pickImage(cb) { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true; i.onchange = () => [...i.files].forEach(cb); i.click(); }
  function readImage(file, maxSide) {
    return new Promise((ok, no) => {
      const fr = new FileReader(); fr.onload = () => {
        const im = new Image(); im.onload = () => {
          const k = Math.min(1, maxSide / Math.max(im.width, im.height)); const w = Math.round(im.width * k), hh = Math.round(im.height * k);
          const cv = document.createElement('canvas'); cv.width = w; cv.height = hh; const c = cv.getContext('2d'); c.drawImage(im, 0, 0, w, hh);
          let d = cv.toDataURL('image/webp', .82); if (!d.startsWith('data:image/webp')) { c.fillStyle = '#fff'; c.globalCompositeOperation = 'destination-over'; c.fillRect(0, 0, w, hh); d = cv.toDataURL('image/jpeg', .82); }
          ok({ src: d, w: im.width, h: im.height });
        }; im.onerror = no; im.src = fr.result;
      }; fr.onerror = no; fr.readAsDataURL(file);
    });
  }
  async function addImageFile(file) {
    try {
      const r = await readImage(file, 1400); const W = deck.W || 960, H = deck.H || 540; const k = Math.min(W * .6 / r.w, H * .7 / r.h);
      const w = Math.round(r.w * k), hh = Math.round(r.h * k); addEl(SL.mkImg(Math.round((W - w) / 2), Math.round((H - hh) / 2), w, hh, r.src));
    } catch (e) { SL.toast('사진을 불러올 수 없습니다.'); }
  }
  function replaceImage(el) { pickImage(async f => { const r = await readImage(f, 1400); pushHist(); el.src = r.src; el.h = Math.round(el.w * r.h / r.w); markDirty(); render(true); }); }
  function onPaste(e) { if (mode !== 'edit' || editingText) return; const it = [...(e.clipboardData && e.clipboardData.items || [])].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); addImageFile(it.getAsFile()); } else if (clip.el && !(e.target.closest && e.target.closest('input,textarea'))) { } }
  /* 위젯 설정 대화상자 */
  function formDialog(title, fields) {
    return new Promise(res => {
      const m = h('div', 'modal'), b = h('div', 'box'); m.appendChild(b);
      b.innerHTML = `<h2>${esc(title)}</h2>` + fields.map((f, i) => `<div style="margin-top:10px"><div style="font-weight:800;font-size:14px;margin-bottom:4px">${esc(f.label)}${f.hint ? `<span style="font-weight:400;color:#6E6890"> — ${esc(f.hint)}</span>` : ''}</div>` +
        (f.type === 'area' ? `<textarea data-i="${i}" rows="${f.rows || 4}">${esc(f.v || '')}</textarea>` : f.type === 'check' ? `<label><input type="checkbox" data-i="${i}" ${f.v ? 'checked' : ''} style="width:auto"> ${esc(f.text || '')}</label>` : f.type === 'file' ? `<input type="file" accept="image/*" data-i="${i}">${f.v ? '<div class="mute" style="font-size:13px;color:#6E6890">현재 사진이 있습니다. 새 사진을 고르면 바뀝니다.</div>' : ''}` : `<input type="text" data-i="${i}" value="${esc(f.v || '')}">`) + `</div>`).join('') +
        `<div class="row"><button class="btn" id="fc">취소</button><button class="btn pri" id="fo">확인</button></div>`;
      document.body.appendChild(m);
      b.querySelector('#fc').onclick = () => { m.remove(); res(null); };
      b.querySelector('#fo').onclick = async () => { const out = {}; for (const [i, f] of fields.entries()) { const n = b.querySelector(`[data-i="${i}"]`); out[f.k] = f.type === 'check' ? n.checked : f.type === 'file' ? (n.files[0] ? await readImage(n.files[0], 1400) : null) : n.value; } m.remove(); res(out); };
    });
  }
  async function widgetSettings(el) {
    let r;
    if (el.t === 'yt') {
      r = await formDialog('▶ 유튜브 영상', [{ k: 'url', label: '유튜브 주소', hint: '주소를 붙여 넣으세요', v: el.url }, { k: 'start', label: '시작 시각', hint: '예: 1:20 (비우면 처음부터)', v: el.start ? SL.fmtT(el.start) : '' }, { k: 'end', label: '끝 시각', hint: '예: 3:05 (비우면 끝까지)', v: el.end ? SL.fmtT(el.end) : '' }, { k: 'pa', label: '자동 멈춤 + 질문', hint: '한 줄에 하나: 시각 | 질문', type: 'area', rows: 3, v: (el.pauseAt || []).map(p => SL.fmtT(p.t) + ' | ' + (p.msg || '')).join('\n') }]);
      if (!r) return; if (r.url && !SL.ytId(r.url)) { SL.toast('유튜브 주소를 알아볼 수 없습니다.'); return; }
      commit(x => { x.url = r.url.trim(); x.start = SL.parseT(r.start); x.end = SL.parseT(r.end); x.pauseAt = r.pa.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [t, ...m] = l.split('|'); return { t: SL.parseT(t), msg: m.join('|').trim() }; }); });
    } else if (el.t === 'wall') {
      r = await formDialog('💬 질문 월', [{ k: 'q', label: '질문(제목)', v: el.q }, { k: 'ap', label: '공개 방식', type: 'check', text: '교사가 승인한 글만 화면에 공개', v: el.approve !== false }]);
      if (r) commit(x => { x.q = r.q; x.approve = r.ap; });
    } else if (el.t === 'poll') {
      r = await formDialog('📊 투표', [{ k: 'q', label: '질문', v: el.q }, { k: 'o', label: '선택지', hint: '한 줄에 하나', type: 'area', rows: 4, v: (el.opts || []).join('\n') }, { k: 'd', label: '결과 공개', type: 'check', text: '교사가 "결과 공개"를 누를 때까지 숨기기(3·2·1 연출)', v: el.delay !== false }]);
      if (r) commit(x => { x.q = r.q; x.opts = r.o.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8); if (x.opts.length < 2) x.opts = ['찬성', '반대']; x.delay = r.d; });
    } else if (el.t === 'ws') {
      r = await formDialog('📝 모둠 학습지', [{ k: 't', label: '학습지 제목', v: el.title }, { k: 'f', label: '입력칸', hint: '한 줄에 하나(칸 이름)', type: 'area', rows: 4, v: (el.fields || []).map(f => f.label).join('\n') }, { k: 'd', label: '손글씨', type: 'check', text: '손글씨 칸(펜으로 쓰기·그리기)도 함께 넣기', v: !!el.draw }, { k: 'b', label: '참고 학습지 사진', hint: '선택 — 학생 화면 위쪽에 보임', type: 'file', v: el.bg }]);
      if (r) commit(x => { x.title = r.t; const old = x.fields || []; x.fields = r.f.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 10).map((l, i) => ({ id: (old[i] && old[i].id) || SL.rid('f'), label: l })); x.draw = r.d; if (r.b) x.bg = r.b.src; });
    } else if (el.t === 'qr') {
      r = await formDialog('📱 입장 QR', [{ k: 'l', label: 'QR 아래 문구', v: el.label }]); if (r) commit(x => x.label = r.l);
    }
  }
  /* 왼쪽 장면 목록 */
  function renderStrip() {
    const st = $('strip'); st.innerHTML = '';
    deck.scenes.forEach((s, i) => {
      const t = h('div', 'th' + (i === idx ? ' cur' : '')); t.appendChild(thumb(i, 148)); t.insertAdjacentHTML('beforeend', `<span class="n">${i + 1}</span>${s.hidden ? '<span class="hid">건너뜀</span>' : ''}`);
      t.onclick = () => { idx = i; sel = null; render(); }; st.appendChild(t); if (i === idx) setTimeout(() => t.scrollIntoView({ block: 'nearest' }), 0);
    });
    st.insertAdjacentHTML('beforeend', `<div class="tools"><button data-s="up" title="위로">▲</button><button data-s="down" title="아래로">▼</button><button data-s="dup" title="복제">⧉</button><button data-s="del" title="삭제">🗑</button></div>`);
  }
  $('strip').addEventListener('click', async e => {
    const b = e.target.closest('[data-s]'); if (!b) return; const a = b.dataset.s;
    if (a === 'up' && idx > 0) { pushHist(); const [s] = deck.scenes.splice(idx, 1); deck.scenes.splice(--idx, 0, s); markDirty(); render(); }
    else if (a === 'down' && idx < deck.scenes.length - 1) { pushHist(); const [s] = deck.scenes.splice(idx, 1); deck.scenes.splice(++idx, 0, s); markDirty(); render(); }
    else if (a === 'dup') dupScene();
    else if (a === 'del') { if (deck.scenes.length < 2) return SL.toast('장면이 하나는 있어야 합니다.'); if (!(await SL.dialog({ title: '이 장면을 삭제할까요?', body: '(↶ 되돌리기로 복구할 수 있습니다)', ok: '삭제' }))) return; pushHist(); deck.scenes.splice(idx, 1); idx = Math.min(idx, deck.scenes.length - 1); markDirty(); render(); }
  });
  $('top').addEventListener('click', async e => {
    if (mode === 'edit' && e.target.closest('span[style*="font-weight:800"]')) { }
  });

  /* ---------- ⑦ 저장 ---------- */
  async function save(asNew, quiet) {
    if (!(await SL.askPin())) return;
    try {
      if (asNew || deck.k === 'b') {
        const v = await SL.dialog({ title: '📄 다른 이름으로 저장', body: deck.k === 'b' ? '기본 틀은 그대로 두고, 내 슬라이드로 복사해 저장합니다.' : '', input: 1, value: deck.title + (asNew ? ' (복사)' : ''), ok: '저장' });
        if (v == null || !v.trim()) return;
        const base = deck.base; deck.id = SL.rid('d'); deck.title = v.trim().slice(0, 60); deck.k = 'u';
        const saved = await SL.saveDeck(Object.assign({}, deck, { base }), SL.space); deck.scenes = saved.scenes; delete deck.base;
        const u = new URL(location.href); u.searchParams.set('deck', 'u:' + deck.id); u.searchParams.delete('room'); history.replaceState(null, '', u); SL.qs.set('deck', 'u:' + deck.id);
        if (room) { room = null; subsRoom.splice(0).forEach(x => x && x()); }
        SL.toast('내 슬라이드로 저장했습니다 ✓'); dirty = false; render(); return;
      }
      deck.thumb = null; await SL.saveDeck(deck, SL.space); dirty = false;
      const s = $('savest'); if (s) s.textContent = '저장됨 ' + new Date().toTimeString().slice(0, 5); if (!quiet) SL.toast('저장했습니다 ✓');
    } catch (e) { console.error(e); SL.toast('⚠️ 저장 실패: ' + e.message, 4000); }
  }

  /* ---------- ⑧ 시작 ---------- */
  boot();
})();

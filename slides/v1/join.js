/* =====================================================================
   HTML 슬라이드 엔진 v1 — 학생 화면 (join.js)
   © 김정환 · M.A.D.T (Moral And Digital Teacher)
   ① 시작  ② 입장(닉네임·번호·모둠)  ③ 장면 따라가기  ④ 질문 월·투표·모둠 학습지  ⑤ 반응·이해도
   개인정보: 이름 대신 닉네임(·번호)만 받습니다. 학생 데이터는 rooms/SLROOM/<방번호> 아래에만 저장됩니다.
   ===================================================================== */
(function () {
  'use strict';
  const $app = document.getElementById('app'), h = SL.h, esc = SL.esc, P = SL.P;
  const uid = SL.uid();
  let code = (SL.qs.get('room') || '').trim(), meta = null, deck = null, user = null, state = null, groupsN = 6;
  let un = [], sceneUn = [], lastScene = '', viewOpen = true;
  const mem = { poll: {}, wall: {}, ws: {} };

  const db = () => SL.db;
  const profKey = () => 'sl_prof_' + code;

  async function boot() {
    await SL.initBackend();
    if (!code) return askCode();
    meta = await db().get(P.room(code) + '/meta');
    if (!meta) return askCode('방 ' + code + '을(를) 찾을 수 없어요. 번호를 다시 확인해 주세요.');
    if (meta.closed) return end();
    groupsN = meta.groups || 6;
    const sp = (meta.deck && meta.deck.space) || SL.space; SL.space = sp;
    try { deck = await SL.loadDeck(meta.deck.k, meta.deck.id, sp); } catch (e) { console.error(e); }
    if (!deck) return msg('슬라이드를 불러올 수 없어요', '선생님께 알려 주세요.');
    const prof = SL.lsGet(profKey());
    if (prof && prof.n) { user = prof; await register(); run(); } else joinForm();
  }
  function msg(t, s) { $app.innerHTML = `<div class="center"><img src="ggumsong.png" alt=""><h2>${esc(t)}</h2><p>${esc(s || '')}</p></div>`; }
  function end() { msg('수업이 끝났어요', '오늘도 수고했어요! 🎉'); }
  function askCode(err) {
    $app.innerHTML = `<div class="center"><img src="ggumsong.png" alt=""><h2>수업 참여</h2>${err ? `<p style="color:#d8566b">${esc(err)}</p>` : '<p>선생님 화면의 방 번호를 입력하세요.</p>'}<div style="max-width:260px;margin:0 auto"><input id="rc" type="number" inputmode="numeric" placeholder="방 번호 4자리" style="text-align:center;font-size:26px"><button class="pbtn" id="go">들어가기</button></div></div>`;
    $app.querySelector('#go').onclick = () => { const v = $app.querySelector('#rc').value.trim(); if (v) { code = v; boot(); } };
  }
  async function register() {
    await db().update(P.room(code) + '/users/' + uid, { n: user.n, no: user.no || null, g: user.g || null, ts: Date.now() });
  }
  function joinForm() {
    const prev = SL.lsGet(profKey()) || {};
    $app.innerHTML = `<div style="padding:18px;overflow:auto"><div class="center" style="padding:6px"><img src="ggumsong.png" alt="" style="width:86px"><h2 style="margin:6px 0">${esc(meta.deck.title || '수업')}</h2><span class="tag">방 ${esc(code)}</span></div>
      <div class="card"><h3>내 이름(닉네임)</h3><input type="text" id="nn" maxlength="10" placeholder="예: 꿈송이" value="${esc(prev.n || '')}"><div style="height:10px"></div><h3>번호 <span style="font-weight:400;color:#6E6890">(선택)</span></h3><input type="number" id="no" inputmode="numeric" min="1" max="60" placeholder="예: 7" value="${prev.no || ''}"><div style="height:10px"></div><h3>모둠</h3><select id="gg"><option value="">아직 몰라요 (선생님이 정해 줘요)</option>${Array.from({ length: groupsN }, (_, i) => `<option value="${i + 1}" ${+prev.g === i + 1 ? 'selected' : ''}>${i + 1}모둠</option>`).join('')}</select><button class="pbtn" id="ok">들어가기</button></div>
      <p style="text-align:center;color:#6E6890;font-size:13px">실명 대신 닉네임을 써도 돼요.</p></div>`;
    $app.querySelector('#ok').onclick = async () => {
      const n = $app.querySelector('#nn').value.trim(); if (!n) { SL.toast('이름(닉네임)을 입력해 주세요.'); return; }
      user = { n, no: +$app.querySelector('#no').value || null, g: +$app.querySelector('#gg').value || null };
      SL.lsSet(profKey(), user); await register(); run();
    };
  }

  /* ---------- ③ 장면 따라가기 ---------- */
  function run() {
    $app.innerHTML = `<header><img src="ggumsong.png" alt=""><span id="me"></span><span class="sp"></span><button id="edit">내 정보</button></header><main id="main"></main><div class="rx" id="rx"></div>`;
    $app.querySelector('#edit').onclick = joinForm;
    drawMe(); drawRx();
    un.push(db().on(P.room(code) + '/state', s => { state = s; scene(); }));
    un.push(db().on(P.room(code) + '/meta', m => { if (m && m.closed) end(); if (m && m.groups) groupsN = m.groups; }));
    un.push(db().on(P.room(code) + '/users/' + uid, u => {            // 선생님이 모둠을 바꿔 주면 따라감
      if (!u) { if (user) register(); return; }
      if (u.g !== (user.g || null)) { user.g = u.g || null; SL.lsSet(profKey(), user); drawMe(); scene(true); }
    }));
  }
  function drawMe() { const m = $app.querySelector('#me'); if (m) m.textContent = (user.no ? user.no + '번 ' : '') + user.n + (user.g ? ' · ' + user.g + '모둠' : ''); }
  function clearScene() { sceneUn.splice(0).forEach(u => u && u()); }
  function scene(force) {
    const main = $app.querySelector('#main'); if (!main || !state) return;
    const idx = deck.scenes.findIndex(s => s.id === state.sc);
    if (idx < 0) { main.innerHTML = '<div class="center"><p>선생님이 슬라이드를 준비하고 있어요…</p></div>'; return; }
    const s = deck.scenes[idx];
    const tk = state.tool && state.tool.sc === s.id ? state.tool : null, key = s.id + (tk ? '|' + tk.id : '');
    if (!force && key === lastScene) { const st = main.querySelector('.stage'); if (st) { updateView(st, idx); } return; }
    lastScene = key; clearScene(); main.innerHTML = '';
    // 선생님 화면 따라 보기 (정답은 선생님이 열 때만 나타남)
    const vw = h('div', 'view' + (viewOpen ? '' : ' hide')); vw.style.maxHeight = '40vh'; main.appendChild(vw);
    const st = SL.makeStage(deck, 'thumb'); vw.appendChild(st); st.style.background = '#' + (s.bg || 'fff'); updateView(st, idx);
    const tg = h('div', '', `<button class="tl-b" style="border:0;background:none;color:#6A4BC4;font-weight:700;font-size:14px;padding:2px 0 8px">${viewOpen ? '▲ 슬라이드 접기' : '▼ 슬라이드 보기'}</button>`); main.appendChild(tg);
    tg.firstChild.onclick = () => { viewOpen = !viewOpen; vw.classList.toggle('hide', !viewOpen); tg.firstChild.textContent = viewOpen ? '▲ 슬라이드 접기' : '▼ 슬라이드 보기'; fitView(st); };
    fitView(st); new ResizeObserver(() => fitView(st)).observe(main);
    const act = [...s.els, ...(tk ? [tk] : [])].filter(e => ['wall', 'poll', 'ws', 'cloud', 'site'].includes(e.t));
    if (!act.length) main.appendChild(h('div', 'card center', `<div class="big">👀 선생님 화면을 함께 봐요</div><div style="color:#6E6890;margin-top:6px">${esc(s.title || '')}</div><div style="color:#6E6890;margin-top:10px;font-size:14px">궁금하면 아래 반응·이해도 버튼을 눌러 보세요.</div>`));
    act.forEach(e => { const c = h('div', 'card'); main.appendChild(c); if (e.t === 'wall') wall(c, s, e); else if (e.t === 'poll') poll(c, s, e); else if (e.t === 'cloud') cloud(c, s, e); else if (e.t === 'site') site(c, e); else ws(c, s, e); });
    drawRx();
  }
  function updateView(st, idx) { SL.renderScene(st, deck, idx, { mode: 'thumb', rev: state.rev || 0 }); st.style.background = '#' + (deck.scenes[idx].bg || 'fff'); fitView(st); }
  function fitView(st) {
    const main = $app.querySelector('#main'); if (!main) return; const w = Math.min(main.clientWidth - 24, (innerHeight * .4) * 16 / 9);
    st.style.width = w + 'px'; st.style.height = (w * 9 / 16) + 'px'; st.style.setProperty('--pt', (w / 960) + 'px');
  }
  const path = (s, e) => `${P.room(code)}/live/${s.id}/${e.id}`;
  const sub = (p, cb) => sceneUn.push(db().on(p, cb));

  /* ---------- ④ 질문 월·투표·모둠 학습지 ---------- */
  function shrink(file) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', .72)); }; im.onerror = () => res(''); im.src = r.result; }; r.onerror = () => res(''); r.readAsDataURL(file); });
  }
  function wall(c, s, e) {
    const cols = (e.cols || []).filter(Boolean); let col = 0, img = '';
    const board = cols.length || e.photo || e.likes;
    c.innerHTML = `<h2>${board ? '📌' : '💬'} ${esc(e.q || '생각을 써 봅시다')}</h2>` +
      (cols.length ? '<div id="cols" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div>' : '') +
      '<textarea id="t" rows="3" maxlength="200" placeholder="여기에 생각을 써 주세요 (200자까지)"></textarea>' +
      (e.photo ? '<label class="pbtn" style="display:block;text-align:center;background:#ECE7FA;color:#6A4BC4">📷 사진 넣기<input id="f" type="file" accept="image/*" hidden></label><img id="pv" style="display:none;max-width:100%;border-radius:12px;margin-top:8px">' : '') +
      '<button class="pbtn" id="send">보내기</button><div id="mine"></div>' + (e.likes ? '<h3 style="margin:14px 0 4px;color:#6A4BC4">친구들의 카드 · 마음에 들면 ❤️</h3><div id="all"></div>' : '');
    const ta = c.querySelector('#t'), btn = c.querySelector('#send'), box = c.querySelector('#mine'), all = c.querySelector('#all'), chips = c.querySelector('#cols'); let items = {};
    const drawCols = () => { if (!chips) return; chips.innerHTML = ''; cols.forEach((n, i) => { const b = h('button', '', esc(n)); b.style.cssText = 'border:2px solid #6A4BC4;border-radius:999px;padding:7px 14px;font-weight:800;font-size:15px;background:' + (i === col ? '#6A4BC4' : '#fff') + ';color:' + (i === col ? '#fff' : '#6A4BC4'); b.onclick = () => { col = i; drawCols(); }; chips.appendChild(b); }); };
    drawCols();
    const fi = c.querySelector('#f'); if (fi) fi.onchange = async () => { const f = fi.files[0]; if (!f) return; img = await shrink(f); const pv = c.querySelector('#pv'); if (img) { pv.src = img; pv.style.display = 'block'; } else SL.toast('사진을 읽을 수 없어요.'); };
    const draw = () => {
      const my = Object.keys(items).map(k => Object.assign({ k }, items[k])).filter(i => i.u === uid).sort((a, b) => a.ts - b.ts);
      box.innerHTML = my.map(i => `<div class="mine ${i.ok ? 'ok' : ''}"><span>${i.img ? '🖼 ' : ''}${esc(i.t || '')}</span><small>${i.ok ? '화면에 공개됨 ✓' : (e.approve === false ? '보냄 ✓' : '선생님 확인 중…')}</small></div>`).join('');
      btn.disabled = my.length >= 3; btn.textContent = my.length >= 3 ? '더 보낼 수 없어요 (3개까지)' : '보내기';
      if (all) {
        const oth = Object.keys(items).map(k => Object.assign({ k }, items[k])).filter(i => i.u !== uid && (e.approve === false || i.ok)).sort((a, b) => a.ts - b.ts);
        all.innerHTML = oth.map(i => { const n = Object.keys(i.lk || {}).length, me = i.lk && i.lk[uid]; return `<div class="mine" style="display:block">${i.img ? `<img src="${i.img}" style="width:100%;border-radius:10px;margin-bottom:6px">` : ''}<div>${esc(i.t || '')}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px"><small>${esc(i.n || '')}</small><button data-k="${i.k}" style="border:0;border-radius:999px;padding:6px 12px;font-weight:800;background:${me ? '#F4705A' : '#ECE7FA'};color:${me ? '#fff' : '#6A4BC4'}">❤️ ${n}</button></div></div>`; }).join('') || '<div style="color:#8a8399;font-size:14px">아직 카드가 없어요.</div>';
        all.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k, me = items[k] && items[k].lk && items[k].lk[uid]; const p = path(s, e) + '/items/' + k + '/lk/' + uid; me ? db().remove(p) : db().set(p, true); });
      }
    };
    sub(path(s, e) + '/items', v => { items = v || {}; draw(); });
    btn.onclick = async () => {
      const t = ta.value.trim(); if (!t && !img) { SL.toast('내용이나 사진을 넣어 주세요.'); return; }
      btn.disabled = true; await db().set(path(s, e) + '/items/' + SL.rid('i'), { u: uid, n: user.n, t, c: col, img, ts: Date.now(), ok: e.approve === false });
      ta.value = ''; img = ''; const pv = c.querySelector('#pv'); if (pv) pv.style.display = 'none'; if (fi) fi.value = ''; SL.toast('보냈어요! ✨');
    };
  }
  function cloud(c, s, e) {
    const max = Math.min(5, Math.max(1, e.max || 3));
    c.innerHTML = `<h2>☁️ ${esc(e.q || '떠오르는 단어를 써 보세요')}</h2><input type="text" id="w" maxlength="20" placeholder="단어나 짧은 말 (20자까지)" autocomplete="off"><button class="pbtn" id="send">보내기</button><div id="mine"></div>`;
    const inp = c.querySelector('#w'), btn = c.querySelector('#send'), box = c.querySelector('#mine'); let items = {};
    const draw = () => {
      const my = Object.keys(items).map(k => Object.assign({ k }, items[k])).filter(i => i.u === uid).sort((a, b) => a.ts - b.ts);
      box.innerHTML = my.map(i => `<div class="mine ok"><span>${esc(i.t)}</span><small>✓</small></div>`).join('');
      btn.disabled = my.length >= max; btn.textContent = my.length >= max ? `다 보냈어요 (${max}개까지)` : `보내기 (${my.length}/${max})`;
    };
    sub(path(s, e) + '/items', v => { items = v || {}; draw(); });
    const send = async () => { const t = inp.value.trim(); if (!t || btn.disabled) return; btn.disabled = true; await db().set(path(s, e) + '/items/' + SL.rid('i'), { u: uid, n: user.n, t, ts: Date.now(), ok: true }); inp.value = ''; inp.focus(); };
    btn.onclick = send; inp.onkeydown = ev => { if (ev.key === 'Enter') send(); };
  }
  function site(c, e) {
    const u = SL.safeUrl(e.url);
    c.innerHTML = `<h2>🌐 ${esc(e.title || '외부 사이트')}</h2>` + (u ? `<a class="pbtn" href="${esc(u)}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none">열기 ↗</a>` : '<div>주소가 없어요.</div>');
  }
  function poll(c, s, e) {
    c.innerHTML = `<h2>📊 ${esc(e.q || '투표')}</h2><div id="o"></div><div id="res"></div>`;
    const o = c.querySelector('#o'), res = c.querySelector('#res'); let votes = {}, rv = false;
    const draw = () => {
      const mine = votes[uid]; const tally = (e.opts || []).map(() => 0); Object.values(votes).forEach(i => { if (tally[i] != null) tally[i]++; }); const total = tally.reduce((a, b) => a + b, 0);
      const show = e.delay === false || rv;
      o.innerHTML = (e.opts || []).map((t, i) => `<button class="opt ${mine === i ? 'on' : ''}" data-i="${i}">${esc(t)}${show && total ? `<span style="float:right">${tally[i]}명 · ${Math.round(tally[i] / total * 100)}%</span>` : ''}</button>`).join('');
      res.innerHTML = show ? '' : `<div style="color:#6E6890;text-align:center;font-size:14px">${mine != null ? '투표했어요 ✓ (바꿔도 돼요) · 결과는 선생님이 공개해요' : '하나를 골라 주세요'}</div>`;
      o.querySelectorAll('.opt').forEach(b => b.onclick = () => db().set(path(s, e) + '/votes/' + uid, +b.dataset.i));
    };
    sub(path(s, e) + '/votes', v => { votes = v || {}; draw(); });
    sub(path(s, e) + '/rv', v => { rv = !!v; draw(); });
  }
  function ws(c, s, e) {
    const g = user.g;
    c.innerHTML = `<h2>📝 ${esc(e.title || '모둠 학습지')}${g ? ` <span class="tag">${g}모둠</span>` : ''}</h2>`;
    if (!g) {
      c.insertAdjacentHTML('beforeend', `<p>우리 모둠을 골라 주세요.</p><select id="pg"><option value="">모둠 선택</option>${Array.from({ length: groupsN }, (_, i) => `<option value="${i + 1}">${i + 1}모둠</option>`).join('')}</select>`);
      c.querySelector('#pg').onchange = async ev => { if (!ev.target.value) return; user.g = +ev.target.value; SL.lsSet(profKey(), user); await register(); drawMe(); scene(true); };
      return;
    }
    const base = path(s, e) + '/ws/g' + g;
    if (e.bg) c.insertAdjacentHTML('beforeend', `<img src="${esc(e.bg)}" style="width:100%;border-radius:12px;border:1.5px solid var(--line);margin-bottom:8px" alt="">`);
    c.insertAdjacentHTML('beforeend', `<div style="color:#6E6890;font-size:13px;margin-bottom:4px">같은 모둠 친구와 함께 쓰는 학습지예요. 쓰면 바로 모두에게 보여요.</div>`);
    const taMap = {}, timers = {};
    (e.fields || []).forEach(f => {
      c.insertAdjacentHTML('beforeend', `<div class="fl">${esc(f.label)}</div>`); const ta = h('textarea'); ta.rows = 3; ta.placeholder = '여기에 써 주세요'; c.appendChild(ta); taMap[f.id] = ta;
      const by = h('div', '', ''); by.style.cssText = 'font-size:12px;color:#8a8399;min-height:16px'; c.appendChild(by); ta._by = by;
      ta.addEventListener('input', () => { clearTimeout(timers[f.id]); timers[f.id] = setTimeout(() => db().set(base + '/f/' + f.id, { t: ta.value, by: user.n, ts: Date.now() }), 450); });
    });
    sub(base + '/f', v => { v = v || {}; (e.fields || []).forEach(f => { const ta = taMap[f.id], d = v[f.id]; if (!d) return; if (document.activeElement !== ta && ta.value !== d.t) ta.value = d.t; ta._by.textContent = d.by ? '마지막으로 쓴 친구: ' + d.by : ''; }); });
    if (e.draw) pad(c, base, g);
  }
  /* 손글씨 칸: 획 하나가 끝날 때마다 모둠 전체에 공유 */
  function pad(c, base, g) {
    c.insertAdjacentHTML('beforeend', `<div class="fl">✏️ 손글씨·그림</div><div class="tl"><button class="dot on" data-c="#2B2350" style="background:#2B2350"></button><button class="dot" data-c="#d8566b" style="background:#d8566b"></button><button class="dot" data-c="#2f7de1" style="background:#2f7de1"></button><button class="dot" data-c="#2FB594" style="background:#2FB594"></button><button data-w="3" class="on">가늘게</button><button data-w="8">굵게</button><button id="undo">↶ 내 마지막 획</button><button id="clr">내 글씨 지우기</button></div><div class="pad"><canvas width="1000" height="560"></canvas></div>`);
    const cv = c.querySelector('canvas'), ctx = cv.getContext('2d'), tl = c.querySelector('.tl'); let color = '#2B2350', width = 3, strokes = {}, cur = null;
    const redraw = () => {
      ctx.clearRect(0, 0, 1000, 560); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const all = Object.keys(strokes).sort().map(k => strokes[k]); if (cur) all.push(cur);
      all.forEach(s => { const pts = String(s.p || '').split(' ').map(q => q.split(',').map(Number)).filter(q => q.length === 2 && !isNaN(q[0])); if (!pts.length) return; ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); if (pts.length === 1) ctx.lineTo(pts[0][0] + .1, pts[0][1]); ctx.stroke(); });
    };
    sub(base + '/s', v => { strokes = v || {}; redraw(); });
    tl.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { color = b.dataset.c; tl.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); });
    tl.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { width = +b.dataset.w; tl.querySelectorAll('[data-w]').forEach(x => x.classList.toggle('on', x === b)); });
    const pos = ev => { const r = cv.getBoundingClientRect(); return [Math.round((ev.clientX - r.left) / r.width * 1000), Math.round((ev.clientY - r.top) / r.height * 560)]; };
    cv.addEventListener('pointerdown', ev => { ev.preventDefault(); cv.setPointerCapture(ev.pointerId); const q = pos(ev); cur = { u: uid, c: color, w: width, p: q.join(',') }; redraw(); });
    cv.addEventListener('pointermove', ev => { if (!cur) return; const q = pos(ev); cur.p += ' ' + q.join(','); redraw(); });
    const fin = async () => { if (!cur) return; const s = cur; cur = null; if (s.p.length > 8000) s.p = s.p.slice(0, 8000); const key = String(Date.now()).padStart(14, '0') + '_' + uid.slice(-4); strokes[key] = s; redraw(); await db().set(base + '/s/' + key, s); };
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
    c.querySelector('#undo').onclick = async () => { const mine = Object.keys(strokes).filter(k => strokes[k].u === uid).sort(); if (mine.length) await db().remove(base + '/s/' + mine[mine.length - 1]); };
    c.querySelector('#clr').onclick = async () => { const mine = Object.keys(strokes).filter(k => strokes[k].u === uid); for (const k of mine) await db().remove(base + '/s/' + k); };
  }

  /* ---------- ⑤ 반응·이해도 ---------- */
  let lastTap = 0, myRx = null, myUnd = null, rxScene = '';
  function drawRx() {
    const rx = $app.querySelector('#rx'); if (!rx) return;
    const E = ['👍', '❤️', '😲', '🤔', '😢'];
    rx.innerHTML = `<div class="r">${E.map(e => `<button data-e="${e}" class="${myRx === e ? 'on' : ''}">${e}</button>`).join('')}</div><div class="r u"><button data-u="1" class="${myUnd === 1 ? 'on' : ''}">😀 알겠어요</button><button data-u="2" class="${myUnd === 2 ? 'on' : ''}">😐 반쯤</button><button data-u="3" class="${myUnd === 3 ? 'on' : ''}">🤔 모르겠어요</button></div>`;
    if (rxScene !== (state && state.sc)) { rxScene = state ? state.sc : ''; myRx = null; myUnd = null; rx.querySelectorAll('.on').forEach(b => b.classList.remove('on')); }
    rx.onclick = e => {
      const b = e.target.closest('button'); if (!b || !state) return; const now = Date.now(); if (now - lastTap < 500) return; lastTap = now;
      if (b.dataset.e) { myRx = b.dataset.e; db().set(`${P.room(code)}/rx/${state.sc}/${uid}`, { e: myRx, ts: now, n: user.n }); drawRx(); }
      else { myUnd = +b.dataset.u; db().set(`${P.room(code)}/und/${state.sc}/${uid}`, myUnd); drawRx(); }
    };
  }
  boot();
})();

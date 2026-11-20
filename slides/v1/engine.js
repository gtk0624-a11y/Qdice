/* =====================================================================
   HTML 슬라이드 엔진 v1 — 공용 엔진 (engine.js)
   © 김정환 · M.A.D.T (Moral And Digital Teacher)
   ① 설정  ② 공통 도구  ③ 저장소(Firebase/체험모드)  ④ 슬라이드 목록·저장
   ⑤ 화면 그리기(무대·요소·위젯 껍데기)  ⑥ QR·유튜브  ⑦ 요소 만들기·틀(템플릿)
   교사 화면은 play.js, 학생 화면은 join.js, 서랍은 ../index.html 에 있습니다.
   ===================================================================== */
(function () {
  'use strict';
  const SL = window.SL = { VERSION: 'v1' };

  /* ---------- ① 설정 ---------- */
  // 국가 만들기·딜시·한 번뿐인 인생과 같은 Firebase 프로젝트를 씁니다 (새로 설정할 것 없음)
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAPJAMUITr6w0H63Ze1L1eViCsuq3zXlbE",
    authDomain: "nation-game-cf684.firebaseapp.com",
    databaseURL: "https://nation-game-cf684-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "nation-game-cf684",
    storageBucket: "nation-game-cf684.firebasestorage.app",
    messagingSenderId: "947361689624",
    appId: "1:947361689624:web:9f09cd27fbd2334ae0136d"
  };
  SL.PIN = '0624';                      // 교사 화면 비밀번호(편집·저장·수업 시작)
  SL.CREDIT = '© 김정환 · M.A.D.T (Moral And Digital Teacher) · HTML 슬라이드';
  SL.FONT = '"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

  /* ---------- ② 공통 도구 ---------- */
  const qs = SL.qs = new URLSearchParams(location.search);
  SL.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SL.clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  SL.lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  SL.lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  SL.rid = (p) => (p || 'x') + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  SL.uid = () => { let u = SL.lsGet('sl_uid'); if (!u) { u = SL.rid('u'); SL.lsSet('sl_uid', u); } return u; };
  SL.cleanSpace = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'default';
  SL.space = SL.cleanSpace(qs.get('space'));
  SL.h = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };
  SL.toast = (msg, ms) => {
    const t = SL.h('div', 'toast'); t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 2600);
  };
  SL.sleep = ms => new Promise(r => setTimeout(r, ms));
  /* 간단한 확인·입력 대화상자 (브라우저 기본 팝업은 태블릿에서 막힐 수 있어 직접 만듦) */
  SL.dialog = ({ title, body, ok = '확인', cancel = '취소', input, area, value = '', placeholder = '' }) => new Promise(res => {
    const m = SL.h('div', 'modal'); const b = SL.h('div', 'box'); m.appendChild(b);
    b.innerHTML = `<h2>${SL.esc(title || '')}</h2>${body ? `<div style="line-height:1.5">${body}</div>` : ''}` +
      (input ? `<div style="margin-top:10px"><input id="dlgI" type="${input === 'password' ? 'password' : 'text'}" inputmode="${input === 'password' ? 'numeric' : 'text'}" value="${SL.esc(value)}" placeholder="${SL.esc(placeholder)}"></div>` : '') +
      (area ? `<div style="margin-top:10px"><textarea id="dlgI" rows="5" placeholder="${SL.esc(placeholder)}">${SL.esc(value)}</textarea></div>` : '') +
      `<div class="row">${cancel ? `<button class="btn" id="dlgC">${SL.esc(cancel)}</button>` : ''}<button class="btn pri" id="dlgO">${SL.esc(ok)}</button></div>`;
    document.body.appendChild(m);
    const inp = b.querySelector('#dlgI'); if (inp) setTimeout(() => { inp.focus(); inp.select && inp.select(); }, 30);
    const done = v => { m.remove(); res(v); };
    b.querySelector('#dlgO').onclick = () => done(inp ? inp.value : true);
    const c = b.querySelector('#dlgC'); if (c) c.onclick = () => done(input || area ? null : false);
    if (inp) inp.onkeydown = e => { if (e.key === 'Enter' && !area) done(inp.value); if (e.key === 'Escape') done(null); };
  });
  SL.askPin = async () => {
    if (sessionStorage.getItem('sl_pin_ok') === '1') return true;
    const v = await SL.dialog({ title: '🔒 교사 비밀번호', body: '편집·저장·수업 시작은 교사만 할 수 있습니다.', input: 'password', placeholder: '비밀번호' });
    if (v === SL.PIN) { sessionStorage.setItem('sl_pin_ok', '1'); return true; }
    if (v != null) SL.toast('비밀번호가 맞지 않습니다.');
    return false;
  };

  /* ---------- ③ 저장소 (Firebase 실시간 DB, 연결 안 되면 체험 모드) ---------- */
  SL.DBMODE = 'demo'; SL.db = null;
  SL.initBackend = async function () {
    if (SL.db) return SL.db;
    if (qs.get('demo') !== '1' && FIREBASE_CONFIG.databaseURL) {
      try {
        const A = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
        const D = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const db = D.getDatabase(A.initializeApp(FIREBASE_CONFIG, 'slides'));
        SL.db = {
          set: (p, v) => D.set(D.ref(db, p), SL.clone(v)),
          update: (p, v) => D.update(D.ref(db, p), SL.clone(v)),
          remove: p => D.remove(D.ref(db, p)),
          get: p => D.get(D.ref(db, p)).then(s => s.val()),
          on: (p, cb) => { const un = D.onValue(D.ref(db, p), s => cb(s.val()), err => SL.toast('⚠️ 데이터베이스 연결 오류: ' + err.message)); return un; }
        };
        SL.DBMODE = 'live'; return SL.db;
      } catch (e) { console.error(e); SL.toast('⚠️ 인터넷 연결 실패 → 체험 모드(이 기기에서만 저장)'); }
    }
    // 체험 모드: 이 브라우저 안에서만 저장(같은 브라우저의 다른 탭과는 실시간으로 이어짐)
    const KEY = 'sl_demo_db', bc = ('BroadcastChannel' in window) ? new BroadcastChannel('slides') : null, L = [];
    const read = () => SL.lsGet(KEY) || {}, parts = p => p.split('/').filter(Boolean);
    const getAt = (t, p) => parts(p).reduce((o, k) => o == null ? undefined : o[k], t);
    const setAt = (t, p, v) => { const ks = parts(p); let o = t; for (let i = 0; i < ks.length - 1; i++) { if (typeof o[ks[i]] !== 'object' || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; } const last = ks[ks.length - 1]; if (v == null) delete o[last]; else o[last] = SL.clone(v); };
    const fire = () => { const t = read(); L.forEach(l => l.cb(SL.clone(getAt(t, l.p)) ?? null)); };
    const write = t => { if (!SL.lsSet(KEY, t)) SL.toast('⚠️ 이 기기의 저장 공간이 가득 찼습니다.'); fire(); bc && bc.postMessage(1); };
    if (bc) bc.onmessage = fire; window.addEventListener('storage', e => { if (e.key === KEY) fire(); });
    SL.db = {
      set: async (p, v) => { const t = read(); setAt(t, p, v); write(t); },
      update: async (p, v) => { const t = read(); Object.keys(v).forEach(k => setAt(t, p + '/' + k, v[k])); write(t); },
      remove: async p => { const t = read(); setAt(t, p, null); write(t); },
      get: async p => SL.clone(getAt(read(), p)) ?? null,
      on: (p, cb) => { const l = { p, cb }; L.push(l); setTimeout(() => cb(SL.clone(getAt(read(), p)) ?? null), 0); return () => { const i = L.indexOf(l); if (i >= 0) L.splice(i, 1); }; }
    };
    return SL.db;
  };
  SL.P = {
    deck: (s, id) => `rooms/SLDECK/${s}/${id}`,
    idx: s => `rooms/SLIDX/${s}`,
    room: c => `rooms/SLROOM/${c}`
  };

  /* ---------- ④ 슬라이드 목록·불러오기·저장 ---------- */
  // 기본 제공 슬라이드는 ../decks/<id>/deck.json (읽기 전용 틀). 내 슬라이드는 DB(rooms/SLDECK)에 저장.
  SL.listDecks = async function (space) {
    space = space || SL.space; await SL.initBackend();
    let builtin = []; try { builtin = await (await fetch(SL.root + 'decks/index.json', { cache: 'no-cache' })).json(); } catch (e) { }
    builtin = builtin.map(d => Object.assign({ k: 'b' }, d));
    const idx = (await SL.db.get(SL.P.idx(space))) || {};
    const mine = Object.keys(idx).map(id => Object.assign({ k: 'u', id }, idx[id]));
    mine.sort((a, b) => (b.updated || 0) - (a.updated || 0));
    return { builtin, mine };
  };
  // 이 파일(engine.js)이 있는 폴더의 한 단계 위(= slides/)를 기준으로 합니다.
  (function () {
    const s = document.currentScript; const u = new URL(s ? s.src : location.href);
    SL.v1 = u.href.replace(/[^/]*$/, '');                       // .../slides/v1/
    SL.root = SL.v1.replace(/v1\/$/, '');                       // .../slides/
  })();
  SL.loadDeck = async function (k, id, space) {
    space = space || SL.space; await SL.initBackend();
    let d = null;
    if (k === 'b') {
      d = await (await fetch(SL.root + 'decks/' + id + '/deck.json', { cache: 'no-cache' })).json();
      d.base = SL.root + 'decks/' + id + '/';
    } else { d = await SL.db.get(SL.P.deck(space, id)); }
    if (!d) return null;
    d.k = k; d.id = d.id || id; d.scenes = d.scenes || [];
    d.scenes.forEach(s => { s.els = s.els || []; });
    return d;
  };
  SL.saveDeck = async function (deck, space) {
    space = space || SL.space; await SL.initBackend();
    const d = SL.clone(deck); delete d.k; delete d.base;
    d.updated = Date.now();
    // 기본 틀의 이미지 경로는 절대 주소로 바꿔 두어, 복사본에서도 그대로 보이게 함
    d.scenes.forEach(s => s.els.forEach(e => { if (e.t === 'img' && e.src && !/^(data:|https?:|blob:)/.test(e.src)) e.src = new URL((deck.base || SL.root) + e.src, location.href).href; if (e.t === 'ws' && e.bg && !/^(data:|https?:|blob:)/.test(e.bg)) e.bg = new URL((deck.base || SL.root) + e.bg, location.href).href; }));
    const size = JSON.stringify(d).length;
    if (size > 9.5e6) throw new Error('슬라이드가 너무 큽니다(사진을 줄여 주세요).');
    await SL.db.set(SL.P.deck(space, d.id), d);
    await SL.db.update(SL.P.idx(space), { [d.id]: { title: d.title, n: d.scenes.length, updated: d.updated, thumb: d.thumb || null } });
    return d;
  };
  SL.deleteDeck = async function (id, space) {
    space = space || SL.space; await SL.initBackend();
    await SL.db.remove(SL.P.deck(space, id)); await SL.db.remove(SL.P.idx(space) + '/' + id);
  };

  /* ---------- ⑤ 화면 그리기 ---------- */
  const px = n => `calc(var(--pt)*${n})`;
  const rgba = (hex, a) => { const n = parseInt(hex, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  SL.revealMax = sc => sc.els.reduce((m, e) => Math.max(m, e.reveal || 0), 0);
  SL.isInteractive = e => ['wall', 'poll', 'ws'].includes(e.t);

  /* 무대 크기 맞추기: 화면에 16:9 가 꽉 차게, 글자 크기 단위(--pt)를 같이 맞춤 */
  SL.fit = function (wrap, stage, deck, inset) {
    const W = deck.W || 960, H = deck.H || 540; inset = inset || {};
    const aw = wrap.clientWidth - (inset.l || 0) - (inset.r || 0), ah = wrap.clientHeight - (inset.t || 0) - (inset.b || 0);
    let w = aw, h = aw * H / W; if (h > ah) { h = ah; w = ah * W / H; }
    w = Math.max(40, Math.floor(w)); h = Math.max(24, Math.floor(h));
    stage.style.width = w + 'px'; stage.style.height = h + 'px'; stage.style.setProperty('--pt', (w / W) + 'px');
    if (inset.l || inset.t || inset.r || inset.b) { stage.style.marginLeft = ((inset.l || 0) - (inset.r || 0)) + 'px'; stage.style.marginTop = ((inset.t || 0) - (inset.b || 0)) + 'px'; }
  };
  SL.makeStage = function (deck, cls) { const s = SL.h('div', 'stage' + (cls ? ' ' + cls : '')); s.style.aspectRatio = (deck.W || 960) + '/' + (deck.H || 540); return s; };

  function txDOM(tx, edit) {
    const d = SL.h('div', 'tx');
    d.style.justifyContent = { m: 'center', t: 'flex-start', b: 'flex-end' }[tx.anchor || 't'];
    const i = tx.ins || [0, 0, 0, 0];
    d.style.padding = `${px(i[1])} ${px(i[2])} ${px(i[3])} ${px(i[0])}`;
    d.style.height = '100%';
    (tx.paras || []).forEach(pa => {
      const p = SL.h('div', 'p' + (pa.bullet ? ' b' : ''));
      p.style.textAlign = { l: 'left', c: 'center', r: 'right' }[pa.algn || 'l'];
      p.style.lineHeight = String((pa.lh || 1) * 1.28);
      if (pa.aft) p.style.marginBottom = px(pa.aft);
      if (pa.bullet) { p.style.setProperty('--mar', pa.marL || 14); p.style.setProperty('--ind', -(pa.marL || 14)); }
      (pa.runs || []).forEach(r => {
        const sp = document.createElement('span'); sp.textContent = r.t;
        if (r.sz) sp.style.fontSize = px(r.sz);
        if (r.b) sp.style.fontWeight = '700';
        if (r.i) sp.style.fontStyle = 'italic';
        if (r.c) sp.style.color = '#' + r.c;
        p.appendChild(sp);
      });
      if (pa.bullet) p.insertBefore(document.createTextNode('• '), p.firstChild);
      if (!(pa.runs || []).length || !p.textContent) p.innerHTML += '&nbsp;';
      d.appendChild(p);
    });
    return d;
  }
  SL.txDOM = txDOM;

  /* 요소 하나를 화면 조각(DOM)으로 만듭니다.
     ctx: { deck, mode:'view'|'edit'|'thumb', rev:(보여줄 정답 개수), room:(방 코드) } */
  SL.elDOM = function (el, ctx) {
    const W = ctx.deck.W || 960, H = ctx.deck.H || 540;
    const d = SL.h('div', 'el ' + (el.t || 'shape'));
    d.dataset.id = el.id; d.dataset.t = el.t;
    d.style.left = (el.x / W * 100) + '%'; d.style.top = (el.y / H * 100) + '%';
    d.style.width = (el.w / W * 100) + '%'; d.style.height = (el.h / H * 100) + '%';
    if (el.t === 'shape') {
      if (el.fill) d.style.background = el.fa != null ? rgba(el.fill, el.fa) : '#' + el.fill;
      if (el.ln) { d.style.border = `${px(el.ln.w || 1)} ${el.ln.dash ? 'dashed' : 'solid'} #${el.ln.c}`; }
      if (el.geom === 'ellipse') d.style.borderRadius = '50%';
      else if (el.geom === 'roundRect') d.style.borderRadius = px(el.r || 8);
      if (el.sh) d.style.boxShadow = `0 ${px(el.sh.dist || 2)} ${px(el.sh.blur || 6)} ${rgba(el.sh.c, el.sh.a)}`;
      if (el.tx) d.appendChild(txDOM(el.tx));
    } else if (el.t === 'img') {
      const img = document.createElement('img'); img.draggable = false; img.alt = '';
      const base = ctx.deck.base || '';
      img.src = /^(data:|https?:|blob:)/.test(el.src || '') ? el.src : base + (el.src || '');
      d.appendChild(img);
    } else { SL.widgetShell(d, el, ctx); }
    if (el.reveal) {
      d.classList.add('rv'); if ((ctx.rev || 0) >= el.reveal) d.classList.add('on');
      if (ctx.mode === 'edit') { const b = SL.h('div', 'rvbadge', '클릭 ' + el.reveal); d.appendChild(b); }
    }
    return d;
  };

  /* 위젯 껍데기: 모양만 그립니다. 실제 내용(학생 글·투표 결과 등)은 play.js 가 채웁니다. */
  SL.widgetShell = function (d, el, ctx) {
    d.dataset.w = el.t; const live = ctx.mode === 'view';
    if (el.t === 'wall') {
      d.classList.add('w');
      d.innerHTML = `<div class="wh">💬 <span class="ttl">${SL.esc(el.q || '질문 월')}</span><span class="sp"></span><span class="cnt hide"></span></div><div class="wb"><div class="wall-g"></div></div>`;
      if (!live) { d.classList.add('ph'); d.querySelector('.wb').innerHTML = '학생이 보낸 생각이<br>여기에 카드로 올라옵니다'; }
    } else if (el.t === 'poll') {
      d.classList.add('w');
      d.innerHTML = `<div class="wh">📊 <span class="ttl">${SL.esc(el.q || '투표')}</span><span class="sp"></span><span class="cnt hide"></span></div><div class="wb"></div>`;
      if (!live) { d.classList.add('ph'); d.querySelector('.wb').innerHTML = (el.opts || []).map(o => SL.esc(o)).join(' · ') + '<br>투표 결과가 막대로 나타납니다'; }
    } else if (el.t === 'ws') {
      d.classList.add('w');
      d.innerHTML = `<div class="wh">📝 <span class="ttl">${SL.esc(el.title || '모둠 학습지')}</span><span class="sp"></span><span class="cnt hide"></span></div><div class="wb"></div>`;
      if (!live) { d.classList.add('ph'); d.querySelector('.wb').innerHTML = '모둠별로 작성한 학습지가<br>여기에 모아 보입니다<br><small>(칸 ' + ((el.fields || []).length) + '개' + (el.draw ? ' · 손글씨 있음' : '') + ')</small>'; }
    } else if (el.t === 'yt') {
      d.classList.add('w', 'yt-box'); d.style.borderRadius = px(10); d.style.border = '0';
      const id = SL.ytId(el.url);
      if (!id) d.innerHTML = `<div class="yt-ph"><div style="font-size:${px(40)}">▶</div>유튜브 주소를 붙여 넣으세요<br><small>(편집 → 이 상자를 눌러 주소 입력)</small></div>`;
      else if (!live) d.innerHTML = `<div class="yt-ph" style="background:url(https://i.ytimg.com/vi/${id}/hqdefault.jpg) center/cover"><div style="background:#000a;border-radius:999px;padding:${px(10)} ${px(22)};font-size:${px(26)}">▶ 유튜브 ${SL.fmtT(el.start || 0)}${el.end ? '~' + SL.fmtT(el.end) : ''}</div></div>`;
      else d.innerHTML = '<div id="ytp"></div>';
    } else if (el.t === 'qr') {
      d.classList.add('qr-box'); d.style.background = '#fff';
      const url = ctx.room ? SL.joinURL(ctx.room) : '';
      if (url) d.innerHTML = `<img alt="QR" src="${SL.qrData(url)}"><div class="qc">${SL.esc(el.label || '여기로 들어오세요')}</div><div class="qs">방 번호 <b>${SL.esc(ctx.room)}</b></div>`;
      else d.innerHTML = `<div style="font-size:${px(34)}">📱</div><div class="qc">${SL.esc(el.label || '여기로 들어오세요')}</div><div class="qs">수업을 시작하면 QR이 나타납니다</div>`;
    }
  };

  /* 한 장면을 무대에 그립니다 */
  SL.renderScene = function (stage, deck, idx, ctx) {
    ctx = Object.assign({ deck, mode: 'view', rev: 0 }, ctx || {});
    const sc = deck.scenes[idx]; stage.innerHTML = '';
    stage.dataset.scene = sc ? sc.id : '';
    stage.style.background = '#' + ((sc && sc.bg) || 'FFFFFF');
    if (!sc) return;
    sc.els.forEach(e => stage.appendChild(SL.elDOM(e, ctx)));
  };
  SL.sceneHasLive = sc => sc.els.some(SL.isInteractive);

  /* ---------- ⑥ QR·유튜브 ---------- */
  SL.joinURL = function (code) {
    return location.origin + location.pathname.replace(/[^/]*$/, '') + 'join.html?room=' + encodeURIComponent(code) + (SL.space !== 'default' ? '&space=' + SL.space : '') + (qs.get('demo') === '1' ? '&demo=1' : '');
  };
  SL.qrData = function (text) {
    try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createDataURL(8, 2); } catch (e) { console.error(e); return ''; }
  };
  SL.ytId = function (u) {
    if (!u) return '';
    u = String(u).trim(); if (/^[\w-]{11}$/.test(u)) return u;
    const m = u.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/); return m ? m[1] : '';
  };
  SL.fmtT = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  SL.parseT = v => { if (typeof v === 'number') return v; v = String(v || '').trim(); if (!v) return 0; if (/^\d+$/.test(v)) return +v; const p = v.split(':').map(Number); if (p.some(isNaN)) return 0; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0); };
  let ytReady = null;
  SL.ytAPI = function () {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytReady) return ytReady;
    ytReady = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(window.YT); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => rej(new Error('yt')); document.head.appendChild(s);
      setTimeout(() => rej(new Error('yt timeout')), 12000);
    });
    return ytReady;
  };

  /* ---------- ⑦ 요소 만들기·틀(템플릿) ---------- */
  const P = { ink: '2B2350', acc: '6A4BC4', chip: 'ECE7FA', bg: 'F7F5FC', mute: '6E6890', mint: '2FB594', white: 'FFFFFF', dark: '2B2350' };
  SL.P_COLORS = P;
  const T = SL.mkText = (x, y, w, h, text, o) => {
    o = o || {}; const lines = String(text).split('\n');
    return {
      id: SL.rid('e'), t: 'shape', geom: 'rect', x, y, w, h,
      tx: { anchor: o.anchor || 't', ins: o.ins || [0, 0, 0, 0], paras: lines.map(l => ({ algn: o.algn || 'l', lh: o.lh || null, aft: o.aft || 0, bullet: !!o.bullet, marL: o.bullet ? 14 : 0, indent: o.bullet ? -14 : 0, runs: [{ t: l, sz: o.sz || 20, b: o.b ? 1 : 0, c: o.c || P.ink }] })) }
    };
  };
  const R = SL.mkRect = (x, y, w, h, o) => {
    o = o || {}; const e = { id: SL.rid('e'), t: 'shape', geom: o.geom || (o.r ? 'roundRect' : 'rect'), x, y, w, h, fill: o.fill || P.chip };
    if (o.r) e.r = o.r; if (o.fa != null) e.fa = o.fa; if (o.ln) e.ln = { c: o.ln, w: o.lw || 1.5, dash: null };
    if (o.sh) e.sh = { c: '4B3A8C', a: .12, blur: 8, dist: 2 };
    return e;
  };
  SL.mkImg = (x, y, w, h, src) => ({ id: SL.rid('e'), t: 'img', x, y, w, h, src });
  SL.mkYT = (x, y, w, h, url) => ({ id: SL.rid('e'), t: 'yt', x, y, w, h, url: url || '', start: 0, end: 0, pauseAt: [] });
  SL.mkQR = (x, y, w, h) => ({ id: SL.rid('e'), t: 'qr', x, y, w, h, label: '여기로 들어오세요' });
  SL.mkWall = (x, y, w, h, q) => ({ id: SL.rid('e'), t: 'wall', x, y, w, h, q: q || '생각을 써 봅시다', approve: true });
  SL.mkPoll = (x, y, w, h, q, opts) => ({ id: SL.rid('e'), t: 'poll', x, y, w, h, q: q || '여러분의 생각은?', opts: opts || ['찬성', '반대'], delay: true });
  SL.mkWS = (x, y, w, h, title, fields) => ({ id: SL.rid('e'), t: 'ws', x, y, w, h, title: title || '모둠 학습지', fields: fields || [{ id: SL.rid('f'), label: '우리 모둠의 생각' }], draw: false, bg: '' });
  SL.mkScene = (bg, els, title) => ({ id: SL.rid('s'), bg: bg || P.bg, notes: '', title: title || '', els: els || [] });
  const chip = (txt) => [R(48, 28, 150, 28, { fill: P.chip, r: 14 }), T(48, 28, 150, 28, txt, { sz: 12, b: 1, c: P.acc, algn: 'c', anchor: 'm' })];
  const cover = (title, sub) => SL.mkScene(P.dark, [
    R(600, 70, 440, 440, { fill: '3A2F6B', geom: 'ellipse' }),
    T(60, 96, 560, 30, sub || '', { sz: 16, b: 1, c: P.mint, anchor: 'm' }),
    T(60, 140, 640, 200, title, { sz: 44, b: 1, c: 'FFFFFF', anchor: 'm', lh: 1.1 })
  ], '표지');
  SL.tpl = {
    blank: t => ({ v: 1, id: SL.rid('d'), title: t || '새 슬라이드', W: 960, H: 540, theme: 'lavender', scenes: [cover(t || '새 슬라이드', '여기에 부제'), SL.mkScene(P.bg, [...chip('내용'), T(48, 72, 860, 50, '제목을 입력하세요', { sz: 28, b: 1 }), T(48, 140, 860, 320, '내용을 입력하세요', { sz: 20, lh: 1.3 })], '내용')] }),
    lesson: t => ({
      v: 1, id: SL.rid('d'), title: t || '새 수업', W: 960, H: 540, theme: 'lavender', scenes: [
        cover(t || '수업 제목', '단원 · 차시'),
        SL.mkScene(P.bg, [...chip('학습 목표'), T(48, 72, 860, 50, '오늘의 학습 목표', { sz: 28, b: 1 }), T(48, 150, 860, 260, '학습 목표를 입력하세요\n두 번째 목표를 입력하세요', { sz: 24, lh: 1.4, bullet: 1, aft: 10 }), R(720, 330, 190, 170, { fill: P.chip, geom: 'ellipse' }), SL.mkQR(730, 340, 170, 170)], '학습 목표'),
        SL.mkScene(P.bg, [...chip('생각 열기'), T(48, 72, 860, 50, '이 장면을 보고 어떤 생각이 드나요?', { sz: 28, b: 1 }), SL.mkWall(48, 150, 864, 340, '생각을 써 봅시다')], '질문 월'),
        SL.mkScene(P.bg, [...chip('영상 보기'), T(48, 72, 860, 50, '영상을 보고 물음에 답해 보자', { sz: 28, b: 1 }), SL.mkYT(120, 136, 720, 380, '')], '영상'),
        SL.mkScene(P.bg, [...chip('모둠 활동'), T(48, 72, 860, 50, '모둠이 함께 정리해 보자', { sz: 28, b: 1 }), SL.mkWS(48, 140, 864, 360, '모둠 학습지', [{ id: SL.rid('f'), label: '우리 모둠의 생각' }, { id: SL.rid('f'), label: '그렇게 생각한 까닭' }])], '모둠 학습지'),
        SL.mkScene(P.bg, [...chip('스스로 점검'), T(48, 72, 860, 50, '오늘 배운 내용 투표', { sz: 28, b: 1 }), SL.mkPoll(48, 140, 864, 340, '오늘 내용이 이해되었나요?', ['완전히 이해했어요', '조금 헷갈려요', '잘 모르겠어요'])], '투표'),
        SL.mkScene(P.dark, [T(60, 150, 840, 80, '오늘의 한 줄 정리', { sz: 36, b: 1, c: 'FFFFFF', anchor: 'm' }), SL.mkWall(60, 250, 840, 250, '오늘 배운 것을 한 줄로')], '마무리')
      ]
    }),
    meeting: t => ({
      v: 1, id: SL.rid('d'), title: t || '새 회의·연수', W: 960, H: 540, theme: 'lavender', scenes: [
        cover(t || '회의·연수 제목', '날짜 · 발표자'),
        SL.mkScene(P.bg, [...chip('안건'), T(48, 72, 860, 50, '오늘의 안건', { sz: 28, b: 1 }), T(48, 150, 640, 300, '첫째 안건\n둘째 안건\n셋째 안건', { sz: 26, lh: 1.5, bullet: 1, aft: 12 }), SL.mkQR(730, 150, 180, 220)], '안건'),
        SL.mkScene(P.bg, [...chip('의견 모으기'), T(48, 72, 860, 50, '선생님들의 의견을 들려주세요', { sz: 28, b: 1 }), SL.mkWall(48, 140, 864, 360, '의견·질문')], '의견'),
        SL.mkScene(P.bg, [...chip('결정'), T(48, 72, 860, 50, '결정 투표', { sz: 28, b: 1 }), SL.mkPoll(48, 140, 864, 340, '이 안에 동의하십니까?', ['동의', '조건부 동의', '반대'])], '결정 투표'),
        SL.mkScene(P.dark, [T(60, 200, 840, 100, '감사합니다', { sz: 48, b: 1, c: 'FFFFFF', anchor: 'm', algn: 'c' })], '마무리')
      ]
    }),
    event: t => ({
      v: 1, id: SL.rid('d'), title: t || '새 발표', W: 960, H: 540, theme: 'lavender', scenes: [
        cover(t || '발표 제목', '발표자 · 날짜'),
        SL.mkScene(P.bg, [...chip('성과'), T(48, 72, 860, 50, '핵심 성과', { sz: 28, b: 1 }),
          R(48, 150, 270, 200, { fill: 'FFFFFF', r: 16, sh: 1 }), T(48, 170, 270, 90, '00', { sz: 60, b: 1, c: P.acc, algn: 'c', anchor: 'm' }), T(48, 270, 270, 60, '지표 이름', { sz: 18, algn: 'c', c: P.mute }),
          R(345, 150, 270, 200, { fill: 'FFFFFF', r: 16, sh: 1 }), T(345, 170, 270, 90, '00', { sz: 60, b: 1, c: P.acc, algn: 'c', anchor: 'm' }), T(345, 270, 270, 60, '지표 이름', { sz: 18, algn: 'c', c: P.mute }),
          R(642, 150, 270, 200, { fill: 'FFFFFF', r: 16, sh: 1 }), T(642, 170, 270, 90, '00', { sz: 60, b: 1, c: P.acc, algn: 'c', anchor: 'm' }), T(642, 270, 270, 60, '지표 이름', { sz: 18, algn: 'c', c: P.mute })], '성과'),
        SL.mkScene(P.bg, [...chip('사례'), T(48, 72, 860, 50, '사례를 소개합니다', { sz: 28, b: 1 }), R(48, 140, 420, 330, { fill: 'FFFFFF', r: 16, sh: 1 }), T(500, 140, 410, 330, '사진을 끌어다 놓거나 붙여넣기(Ctrl+V) 하세요\n\n설명을 입력하세요', { sz: 20, lh: 1.4 })], '사례'),
        SL.mkScene(P.bg, [...chip('질문'), T(48, 72, 860, 50, '질문과 의견', { sz: 28, b: 1 }), SL.mkWall(48, 140, 620, 360, '질문·의견'), SL.mkQR(700, 140, 212, 260)], '질문'),
        SL.mkScene(P.dark, [T(60, 200, 840, 100, '감사합니다', { sz: 48, b: 1, c: 'FFFFFF', anchor: 'm', algn: 'c' })], '마무리')
      ]
    })
  };
  SL.tplNames = { blank: '빈 슬라이드', lesson: '수업 차시형', meeting: '회의·연수형', event: '행사·성과 발표형' };

  /* 화면 맨 아래 저작권 표시(다른 교사가 바꿀 수 없음) */
  SL.addWatermark = host => { const w = SL.h('div', 'watermark'); w.textContent = SL.CREDIT; host.appendChild(w); return w; };
})();

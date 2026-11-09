/* =====================================================================
   딜시(딜레마 시뮬레이션) — 공통 + 게임 엔진 + 학생 화면 (app.js)
   © 김정환 · M.A.D.T (Moral And Digital Teacher)
   ① 설정  ② 공통 도구  ③ 저장소  ④ 내용 합치기  ⑤ 자동 판정
   ⑥ 게임 엔진  ⑦ 학생 화면  ⑧ 피드백  ⑨ 시작
   교사 화면은 teacher.js 에 있습니다.
   ===================================================================== */

/* ---------- ① 설정 ---------- */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAPJAMUITr6w0H63Ze1L1eViCsuq3zXlbE",
  authDomain: "nation-game-cf684.firebaseapp.com",
  databaseURL: "https://nation-game-cf684-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nation-game-cf684",
  storageBucket: "nation-game-cf684.firebasestorage.app",
  messagingSenderId: "947361689624",
  appId: "1:947361689624:web:9f09cd27fbd2334ae0136d"
};
const TEACHER_PIN = '0624';
const TITLE = '딜시';
const SUBTITLE = '딜레마 시뮬레이션';
const P_CONTENT = 'rooms/DSCONTENT/default';   // 교사 설정(사상가·판정·긴장감·단원) — 모든 반 공통
const P_FB = 'rooms/DSFEEDBACK';                // 피드백 보내기
const roomPath = c => 'rooms/DS_' + c;          // 반마다: meta, students, score

/* ---------- ② 공통 도구 ---------- */
const qs = new URLSearchParams(location.search);
const MODE = qs.get('mode') === 'teacher' ? 'teacher' : 'student';
let ROOM = (qs.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const app = document.getElementById('app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
const nz = s => String(s || '').replace(/\s+/g, '');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
function toast(m, ms) { document.querySelectorAll('.toast').forEach(x => x.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), ms || 2800); }
function newCode(n) { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < (n || 5); i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
let DEV = lsGet('dilsi_dev'); if (!DEV) { DEV = 'd' + Date.now().toString(36) + newCode(4); lsSet('dilsi_dev', DEV); }
function fmtTime(t) { if (!t) return '-'; const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
async function copyText(txt, msg) {
  try { await navigator.clipboard.writeText(txt); toast(msg || '📋 복사했어요.'); return; } catch (e) { }
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast(msg || '📋 복사했어요.'); } catch (e) { toast('복사가 안 돼요. 글을 길게 눌러 직접 복사해 주세요.'); }
  ta.remove();
}
function downloadText(name, txt, mime) {
  try { const blob = new Blob(['﻿' + txt], { type: (mime || 'text/plain') + ';charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('💾 저장했어요. (카카오톡 안에서는 안 될 수 있어요 → 복사하기)'); }
  catch (e) { toast('저장이 안 돼요. 복사하기를 써 주세요.'); }
}
const csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
function compressImage(file, maxW, maxBytes) {
  return new Promise((ok, no) => {
    const fr = new FileReader(); fr.onload = () => {
      const im = new Image(); im.onload = () => {
        const s = Math.min(im.width, im.height); const sx = (im.width - s) / 2, sy = (im.height - s) / 2;   // 정사각형으로 가운데 자르기
        const w = Math.min(maxW || 256, s); const cv = document.createElement('canvas'); cv.width = w; cv.height = w;
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, w); cx.drawImage(im, sx, sy, s, s, 0, 0, w, w);
        let q = 0.85, d = cv.toDataURL('image/jpeg', q); while (d.length * 0.75 > (maxBytes || 60000) && q > 0.35) { q -= 0.1; d = cv.toDataURL('image/jpeg', q); } ok(d);
      }; im.onerror = no; im.src = fr.result;
    }; fr.onerror = no; fr.readAsDataURL(file);
  });
}

/* ---------- ③ 저장소 (Firebase 실시간 DB, 연결 안 되면 체험 모드) ---------- */
let DBMODE = 'demo', backend = null;
async function initBackend() {
  if (qs.get('demo') !== '1' && FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL) {
    try {
      const A = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const D = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      const db = D.getDatabase(A.initializeApp(FIREBASE_CONFIG));
      backend = {
        set: (p, v) => D.set(D.ref(db, p), clone(v)), update: (p, v) => D.update(D.ref(db, p), clone(v)), remove: p => D.remove(D.ref(db, p)),
        get: p => D.get(D.ref(db, p)).then(s => s.val()), on: (p, cb) => D.onValue(D.ref(db, p), s => cb(s.val()), err => toast('⚠️ 데이터베이스 연결 오류: ' + err.message))
      };
      DBMODE = 'live'; return;
    } catch (e) { console.error(e); toast('⚠️ 인터넷 연결 실패 → 체험 모드(이 기기에서만 저장)'); }
  }
  const KEY = 'dilsi_demo_db', bc = ('BroadcastChannel' in window) ? new BroadcastChannel('dilsi') : null, L = [];
  const read = () => lsGet(KEY) || {}, parts = p => p.split('/').filter(Boolean);
  const getAt = (t, p) => parts(p).reduce((o, k) => o == null ? undefined : o[k], t);
  const setAt = (t, p, v) => { const ks = parts(p); let o = t; for (let i = 0; i < ks.length - 1; i++) { if (typeof o[ks[i]] !== 'object' || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; } const last = ks[ks.length - 1]; if (v == null) delete o[last]; else o[last] = clone(v); };
  const fire = () => { const t = read(); L.forEach(l => l.cb(clone(getAt(t, l.p)) ?? null)); };
  const write = t => { lsSet(KEY, t); fire(); bc && bc.postMessage(1); };
  if (bc) bc.onmessage = fire; window.addEventListener('storage', e => { if (e.key === KEY) fire(); });
  backend = {
    set: async (p, v) => { const t = read(); setAt(t, p, v); write(t); }, update: async (p, v) => { const t = read(); Object.keys(v).forEach(k => setAt(t, p + '/' + k, v[k])); write(t); },
    remove: async p => { const t = read(); setAt(t, p, null); write(t); }, get: async p => clone(getAt(read(), p)) ?? null, on: (p, cb) => { L.push({ p, cb }); setTimeout(() => cb(clone(getAt(read(), p)) ?? null), 0); }
  };
}

/* ---------- ④ 내용 합치기: content.js + 교사 설정(CONTENT) ---------- */
let CONTENT = {};                      // rooms/DSCONTENT/default
const UNITS = window.UNITS || [];
const BELIEFS = window.BELIEFS || [];
const BK = BELIEFS.map(b => b.k);
const THIRD = { name: '제3의 길', school: '나의 해결책', hz: '我', col: '#c8962d', kw: [], b: {}, intro: '어느 책사도 따르지 않고, 군주가 직접 세운 해결책' };
function TH(id) { if (id === 'third') return Object.assign({ id }, THIRD); const b = (window.THINKERS || {})[id] || { name: id, kw: [], b: {}, hz: '?', col: '#888' }; return Object.assign({ id }, b, ((CONTENT.th || {})[id]) || {}); }
function JUDGE() { return Object.assign({}, window.JUDGE0, CONTENT.judge || {}); }
function TN(key) { const k = window.TENSION[key] ? key : 'normal'; return Object.assign({ key: k }, window.TENSION[k], ((CONTENT.tn || {})[k]) || {}); }
const unitById = id => UNITS.find(u => u.id === id);
const unitOn = id => !((CONTENT.off || {})[id]);
const reviewed = id => !!((CONTENT.reviewed || {})[id]);
/* 사상가 그림: 교사가 올린 이미지가 있으면 그것, 없으면 코드로 그린 기본 그림 */
const IMG = {}, IMGREQ = {};
function avatar(id, size) {
  const t = TH(id); size = size || 56;
  if ((CONTENT.thImg || {})[id]) {
    if (IMG[id]) return `<img class="av" src="${IMG[id]}" alt="${esc(t.name)}" style="width:${size}px;height:${size}px">`;
    if (!IMGREQ[id] && backend) { IMGREQ[id] = 1; backend.get(P_CONTENT + '/img/' + id).then(v => { if (v && v.d) { IMG[id] = v.d; safeRender(); } }).catch(() => { }); }
  }
  const c = t.col || '#7b2d26';
  return `<svg class="av" width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="${esc(t.name)}">
    <rect x="0" y="0" width="100" height="100" rx="22" fill="${c}"/>
    <rect x="0" y="62" width="100" height="38" fill="rgba(0,0,0,.18)"/>
    <path d="M14 100 Q16 66 50 64 Q84 66 86 100 Z" fill="#f3ead8"/>
    <path d="M40 66 L50 82 L60 66 Z" fill="${c}" opacity=".85"/>
    <circle cx="50" cy="40" r="19" fill="#f6dcc0"/>
    <path d="M31 36 Q50 12 69 36 Q64 24 50 22 Q36 24 31 36Z" fill="#2b2b2b"/>
    <circle cx="50" cy="16" r="6" fill="#2b2b2b"/>
    <circle cx="43" cy="42" r="1.8" fill="#333"/><circle cx="57" cy="42" r="1.8" fill="#333"/>
    <path d="M45 50 Q50 53 55 50" stroke="#a0522d" stroke-width="1.6" fill="none"/>
    <rect x="66" y="66" width="28" height="28" rx="5" fill="#b22222"/>
    <text x="80" y="87" text-anchor="middle" font-size="19" font-weight="900" fill="#fff" font-family="serif">${esc(t.hz || '?')}</text>
  </svg>`;
}
/* 장면 그림 (코드로 그림, 배경 이미지를 교사가 올리면 그것을 씀) */
function sceneArtCode(bg) {
  const P = {
    famine: { sky1: '#f7d58b', sky2: '#f2b766', sun: '#fff1c1', m1: '#c9935a', m2: '#a8743f', ground: '#8b5e34' },
    chaos: { sky1: '#5b4b75', sky2: '#a86a7d', sun: '#f6c7a8', m1: '#3f3557', m2: '#2c2540', ground: '#211b30' },
    war: { sky1: '#2a1a1a', sky2: '#7a2e1f', sun: '#ff8a5c', m1: '#3b2420', m2: '#271614', ground: '#140c0b' },
    open: { sky1: '#cfe3e8', sky2: '#f1e4c8', sun: '#fff8e1', m1: '#8fa9a3', m2: '#6c8a83', ground: '#4f6b64' }
  }[bg] || null;
  const p = P || { sky1: '#cfe3e8', sky2: '#f1e4c8', sun: '#fff8e1', m1: '#8fa9a3', m2: '#6c8a83', ground: '#4f6b64' };
  const crack = bg === 'famine' ? `<path d="M80 150 L110 138 L130 146 L160 134" stroke="#5d3b1c" stroke-width="2" fill="none"/><path d="M420 150 L450 140 L470 148" stroke="#5d3b1c" stroke-width="2" fill="none"/>` : '';
  const fire = bg === 'war' ? `<circle cx="470" cy="104" r="16" fill="#ff6b3d" opacity=".55"/><circle cx="150" cy="112" r="12" fill="#ff6b3d" opacity=".45"/>` : '';
  return `<div class="art"><svg viewBox="0 0 600 160" preserveAspectRatio="xMidYMid slice">
    <rect width="600" height="160" fill="${p.sky1}"/><rect y="60" width="600" height="100" fill="${p.sky2}"/>
    <circle cx="${bg === 'war' ? 470 : 480}" cy="48" r="26" fill="${p.sun}" opacity=".9"/>
    <polygon points="0,120 70,60 140,110 210,50 300,115 380,62 460,112 540,58 600,100 600,160 0,160" fill="${p.m1}"/>
    <polygon points="0,135 90,95 170,128 260,90 350,132 430,96 520,130 600,104 600,160 0,160" fill="${p.m2}"/>
    <g fill="${p.ground}"><rect x="210" y="104" width="180" height="56"/><rect x="200" y="96" width="14" height="12"/><rect x="222" y="96" width="14" height="12"/><rect x="244" y="96" width="14" height="12"/><rect x="342" y="96" width="14" height="12"/><rect x="364" y="96" width="14" height="12"/><rect x="386" y="96" width="14" height="12"/>
    <polygon points="268,104 300,78 332,104"/><rect x="286" y="126" width="28" height="34" fill="${p.sky2}" opacity=".35"/></g>
    <rect y="148" width="600" height="12" fill="${p.ground}"/>${crack}${fire}
  </svg></div>`;
}

/* ---------- ⑤ 자동 판정 ---------- */
/* 개념어 찾기: 2글자 이상은 띄어쓰기 무시하고 포함 여부, 1글자(인·예·법·도…)는 낱말로 따로 쓰였을 때만 인정 */
const JOSA = '(?:은|는|이|가|을|를|과|와|의|에|에서|으로|로|도|만|이다|입니다|이며|이고|이라|라는|란|\\(|\\)|\\]|,|\\.|·|\\s|$)';
const KW_EXCL = { '예': ['예를 들', '예를들', '예로 들', '예컨대', '예시', '예외'], '도': ['도가', '도와', '도움'] };   // 1글자 개념어가 다른 뜻으로 쓰인 흔한 표현
function kwHits(text, words) {
  const raw = String(text || ''), flat = nz(raw), out = [];
  (words || []).forEach(w => {
    if (!w) return; const ww = nz(w);
    if (ww.length >= 2) { if (flat.includes(ww)) out.push(w); return; }
    let src = raw; (KW_EXCL[ww] || []).forEach(x => { src = src.split(x).join(' '); });
    const re = new RegExp('(?:^|[\\s"\'“‘(\\[,.·])' + ww.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + JOSA);
    if (re.test(src)) out.push(w);
  });
  return [...new Set(out)];
}
const mkHits = (text, list) => (list || []).filter(m => nz(text).includes(nz(m)));
/* 한 줄 논증 판정 — ① 분량 ② 개념어 ③ 근거 표지어 ④ 상황·증거
   ④가 없으면(지금 상황과 상관없는 말) 무조건 ⚠️흔들림. 나머지 3개 모두 = 🏆, 2개 = ✅, 그 이하 = ⚠️
   제3의 길: 개념어가 서로 다른 사상가 2명 이상에게서 나와야 함, 분량 +15자 */
const LINE_THIRD_PLUS = 15;
function judgeLine(text, thId, U, sc, st) {
  const J = JUDGE(), len = nz(text).length, mk = mkHits(text, J.markers);
  const ctx = mkHits(text, sc.sit || []);
  const ev = (sc.evidence || []).filter(e => (st.opened || []).includes(e.id) && mkHits(text, e.key || []).length).map(e => e.id);
  let kw, kwOk, thUsed = [];
  if (thId === 'third') {
    const ids = U.thinkers; kw = [];
    ids.forEach(id => { const h = kwHits(text, TH(id).kw); if (h.length) { thUsed.push(id); kw.push(...h); } });
    kw = [...new Set(kw)]; kwOk = thUsed.length >= 2;
  } else { kw = kwHits(text, TH(thId).kw); kwOk = kw.length >= J.lineKw; if (kw.length) thUsed = [thId]; }
  const lenOk = len >= J.lineMin + (thId === 'third' ? LINE_THIRD_PLUS : 0), ctxOk = ctx.length > 0 || ev.length > 0;
  const c = [lenOk, kwOk, mk.length > 0, ctxOk], n = c.slice(0, 3).filter(Boolean).length;
  const level = !ctxOk ? 'c' : n === 3 ? 'a' : n === 2 ? 'b' : 'c';
  const opt = thId === 'third' ? sc.third : (sc.options.find(o => o.th === thId) || {});
  const cost = mkHits(text, opt.cost || []);
  const weak = !ctxOk ? 'ctx' : !kwOk ? 'kw' : !mk.length ? 'why' : !cost.length ? 'cost' : 'base';
  return { len, kw, mk, ctx, ev, cost, c, level, weak, thUsed };
}
const LV = { a: { t: '🏆 대성공', cls: 'a', d: '논증이 완벽했습니다. 해결책이 온전히 힘을 냅니다!' }, b: { t: '✅ 성공', cls: 'b', d: '해결책이 실행됩니다.' }, c: { t: '⚠️ 흔들림', cls: 'c', d: '논증이 약해 해결책이 절반만 힘을 냅니다.' }, x: { t: '⏰ 결단하지 못함', cls: 'c', d: '' } };
const WEAK = {
  ctx: { t: '상황', d: '지금 운나라의 상황(또는 열어 본 증거)과 연결해서 답하세요.', rb: '그 말씀이 지금 이 상황과 무슨 관계입니까? 눈앞의 문제는 어디 갔습니까?' },
  kw: { t: '개념', d: '사상가의 개념어를 넣어, 그 사상에서 나온 해결책임을 밝히세요.' },
  why: { t: '근거', d: '"왜냐하면·따라서·그래서"로 이유를 설명하세요.' },
  cost: { t: '대가', d: '이 해결책 때문에 생길 손해·반발을 어떻게 감당할지 쓰세요.' },
  base: { t: '반대 사상', d: '반대 사상가의 비판에 "그러나…"로 맞서고, 개념어로 답하세요.' }
};
const COST_ANSWER = ['감수', '대신', '대비', '보완', '책임', '줄이', '막', '나누'];
function allUnitKw(U) { const a = []; (U.thinkers || []).forEach(id => a.push(...(TH(id).kw || []))); return a; }
function judgeRebut(text, U, weak, sc, st) {
  const J = JUDGE(), len = nz(text).length, mk = mkHits(text, J.markers), kw = kwHits(text, allUnitKw(U));
  if (!weak) return { len, mk, kw, ok: len >= J.rebutMin && (mk.length > 0 || kw.length > 0) };
  const opt = st.adopt === 'third' ? sc.third : (sc.options.find(o => o.th === st.adopt) || {});
  const own = st.adopt === 'third' ? kw : kwHits(text, TH(st.adopt).kw);
  const need = {
    ctx: mkHits(text, sc.sit || []).length > 0 || (sc.evidence || []).some(e => (st.opened || []).includes(e.id) && mkHits(text, e.key || []).length),
    kw: own.length > 0,
    why: mk.length > 0,
    cost: mkHits(text, (opt.cost || []).concat(COST_ANSWER)).length > 0,
    base: mk.length > 0 && (kw.length > 0 || mkHits(text, J.counter).length > 0)
  }[weak];
  return { len, mk, kw, ok: len >= J.rebutMin && !!need };
}
/* 포트폴리오 기준 4가지 (자동 확인) */
function critOf(run, U) {
  const J = JUDGE(), v = (run && run.verdict) || {}, t = v.text || '';
  const elimNames = ((run && run.elim) || []).map(id => TH(id).name);
  return {
    sub: !!v.submittedAt,
    len: nz(t).length >= J.verdictMin,
    kw: kwHits(t, allUnitKw(U)).length >= 1,
    ctr: mkHits(t, J.counter).length > 0 || elimNames.some(n => t.includes(n))
  };
}
const CRIT = [['sub', '제출'], ['len', '분량'], ['kw', '개념어'], ['ctr', '반론']];

/* ---------- ⑥ 게임 엔진 ---------- */
let META = {}, metaLoaded = false, renderPending = false, S = null, MYSCORE = null, CLASS = null;
function render() { if (MODE === 'teacher') renderTeacher(); else renderStudent(); }
function safeRender() {
  const a = document.activeElement;
  if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox' && a.type !== 'radio' && a.type !== 'file') || a.tagName === 'SELECT')) { renderPending = true; return; }
  render();
}
document.addEventListener('focusout', () => { setTimeout(() => { if (renderPending) { renderPending = false; safeRender(); } }, 150); });
const footH = () => `<div class="foot">© 김정환 · M.A.D.T (Moral And Digital Teacher) · ${TITLE} ${SUBTITLE}${DBMODE === 'demo' ? ' · 체험 모드(이 기기에만 저장)' : ''}</div>`;

const sKey = () => 'dilsi_S_' + ROOM + '_' + (S ? S.sid : '');
let saveTimer = null;
function saveS(now) {
  if (!S) return; S.updatedAt = Date.now(); lsSet(sKey(), S);
  clearTimeout(saveTimer);
  const go = () => backend.set(roomPath(ROOM) + '/students/' + S.sid, S).catch(e => toast('⚠️ 저장 실패: ' + e.message));
  if (now) go(); else saveTimer = setTimeout(go, 900);
}
function newStudent(num, name) {
  const b = {}; BK.forEach(k => b[k] = 0);
  return { ver: 1, sid: 's' + num, num: +num, name: name || '', dev: DEV, joinedAt: Date.now(), beliefs: b, dex: {}, runs: {}, pin: {} };
}
function curUnit() { const U = unitById(META.unit); return (U && U.ready) ? U : null; }
function curRun() { const U = curUnit(); return U && S && S.runs ? S.runs[U.id] : null; }
const tension = () => TN(META.tension);

function newRun(U) {
  const T = tension(), g = {}; Object.entries(U.gauges).forEach(([k, d]) => g[k] = d.start);
  const bd = {}; BK.forEach(k => bd[k] = 0);
  return { unit: U.id, startedAt: Date.now(), tn: T.key, g, flags: {}, elim: [], adopt: {}, sc: 0, step: 'story', scenes: {}, rescueLeft: T.rescue, hintLeft: T.hint, hintUsed: false, rescued: 0, fallen: false, bd, paste: 0, pasteChars: 0, verdict: { text: '', log: [], paste: 0, pasteChars: 0 } };
}
function gaugeKeys(U) { return Object.keys(U.gauges); }
function lifeKey(U) { return Object.keys(U.gauges).find(k => U.gauges[k].life) || Object.keys(U.gauges)[0]; }
/* 효과 적용 → 실제 바뀐 양을 돌려줌 */
function applyFx(run, U, fx, opt) {
  opt = opt || {}; const T = TN(run.tn), d = {};
  Object.entries(fx || {}).forEach(([k, v]) => {
    if (!(k in run.g) || !v) return;
    let x = v < 0 ? v * (T.loss || 1) * (opt.neg || 1) : v * (opt.pos == null ? 1 : opt.pos);
    x = Math.round(x); const b = run.g[k]; run.g[k] = clamp(b + x, 0, 100); d[k] = run.g[k] - b;
  });
  return d;
}
function fxHTML(U, d) { return Object.entries(d || {}).filter(([k, v]) => v).map(([k, v]) => `<span class="chg ${v > 0 ? 'p' : 'm'}">${U.gauges[k].e}${U.gauges[k].n} ${v > 0 ? '+' : ''}${v}</span>`).join('') || '<span class="muted small">변화 없음</span>'; }
function addBeliefs(run, thId, mult) { Object.entries(TH(thId).b || {}).forEach(([k, v]) => { if (!(k in S.beliefs)) S.beliefs[k] = 0; S.beliefs[k] += v * mult; run.bd[k] = (run.bd[k] || 0) + v * mult; }); }
function dexMeet(id) { if (!S.dex[id]) S.dex[id] = { met: Date.now(), used: 0, mastered: false }; }
function cond(run, c) {
  if (!c) return true; const all = Object.values(run.adopt || {});
  if (c.flag && !run.flags[c.flag]) return false;
  if (c.elim && !run.elim.includes(c.elim)) return false;
  if (c.adopt && !all.includes(c.adopt)) return false;
  if (c.fallen != null && !!run.fallen !== !!c.fallen) return false;
  if (c.gMin && Object.entries(c.gMin).some(([k, v]) => (run.g[k] || 0) < v)) return false;
  if (c.gMax && Object.entries(c.gMax).some(([k, v]) => (run.g[k] || 0) > v)) return false;
  return true;
}
function endingOf(run, U, score, reveal) {
  let e = (U.endings || []).find(x => cond(run, x.if)) || { e: '🏯', t: '끝', d: '' };
  const H = U.hidden;
  const byScore = score && score.hl != null && +score.hl >= +(META.hiddenTh || 80), byThird = (run.thirdOk || 0) >= 2;
  if (H && reveal && !run.fallen && !run.hintUsed && (byScore || byThird)
    && H.words.some(w => nz((run.verdict || {}).text).includes(nz(w)))) e = Object.assign({ hidden: true }, H);
  return e;
}
/* 민심(생명 게이지)이 0이 되면: 구제 카드 → 폐위 */
function checkLife(run, U, nextStep) {
  const lk = lifeKey(U);
  if (run.g[lk] > 0) { run.step = nextStep; return; }
  run.rescueReturn = nextStep; run.step = 'rescue';
}
function sceneOf(U, run) { return U.scenes[run.sc]; }
function scState(run, sc) { if (!run.scenes[sc.id]) run.scenes[sc.id] = { opened: [] }; return run.scenes[sc.id]; }
function duelPair(sc, run) { const p = ((sc.duel || {}).pairs || []).find(([a, b]) => !run.elim.includes(a) && !run.elim.includes(b)); return p || sc.options.map(o => o.th).filter(t => !run.elim.includes(t)).slice(0, 2); }
function choosable(sc, run) { return sc.mode === 'duel' ? duelPair(sc, run) : sc.options.map(o => o.th).filter(t => !run.elim.includes(t)); }
function peekN(run, sc) { const T = TN(run.tn); return sc.urgent ? Math.min(T.peek, sc.urgent.peek) : T.peek; }
function timerSec(sc) { const T = TN(META.tension); if (sc.urgent) return T.timer > 0 ? Math.min(T.timer, sc.urgent.timer) : Math.round(sc.urgent.timer * 1.5); return T.timer; }
function gateOK(i) { const g = META.gate == null ? 99 : +META.gate; return i + 1 <= g; }   // i: 0부터 (장면 번호-1), 판결문은 scenes.length

/* 장면에 들어갈 때 한 번: 씨앗(지난 선택의 대가) + 무작위 사건 */
function enterScene(run, U) {
  const sc = sceneOf(U, run), st = scState(run, sc); if (st.entered) return;
  st.entered = Date.now(); st.seeds = [];
  if (run.sc > 0 && U.decay) st.decay = applyFx(run, U, U.decay.fx);
  (sc.seeds || []).forEach((s, i) => { if (cond(run, s.if)) { const d = applyFx(run, U, s.fx); st.seeds.push({ i, d }); } });
  const T = TN(run.tn);
  if (U.events && U.events.length && Math.random() < T.ev) {
    const pool = U.events.filter(e => Math.random() < T.evBad ? !e.good : e.good);
    const ev = pick(pool.length ? pool : U.events), i = U.events.indexOf(ev);
    st.event = { i, d: applyFx(run, U, ev.fx) };
  }
}

/* ---------- 학생 행동 (버튼) ---------- */
const A = {};
window.A = A;
A.tab = t => { STAB = t; render(); };
let STAB = 'game';
A.join = async () => {
  const num = (document.getElementById('jnum').value || '').replace(/\D/g, '').slice(0, 6);
  const name = META.askName ? (document.getElementById('jname').value || '').trim().slice(0, 10) : '';
  if (!num) return toast('번호를 입력하세요.');
  if (META.askName && !name) return toast('이름을 입력하세요.');
  const sid = 's' + num; let rec = lsGet('dilsi_S_' + ROOM + '_' + sid);
  const remote = await backend.get(roomPath(ROOM) + '/students/' + sid).catch(() => null);
  if (remote && (!rec || (remote.updatedAt || 0) > (rec.updatedAt || 0))) {
    if (remote.dev && remote.dev !== DEV && !confirm(num + '번 기록이 이미 있어요. 다른 기기에서 하던 것을 이어서 할까요?\n(내 번호가 아니면 [취소]를 누르세요)')) return;
    rec = remote;
  }
  S = rec || newStudent(num, name); if (name) S.name = name; S.dev = DEV;
  ['beliefs', 'dex', 'runs', 'pin'].forEach(k => { if (!S[k] || typeof S[k] !== 'object') S[k] = {}; });
  BK.forEach(k => { if (S.beliefs[k] == null) S.beliefs[k] = 0; });
  lsSet('dilsi_me_' + ROOM, S.sid); saveS(true); listenScore(); render();
};
A.logout = () => { if (!confirm('이 기기에서 나갈까요? (기록은 서버에 남아 있어요)')) return; lsDel('dilsi_me_' + ROOM); S = null; render(); };
A.start = () => {
  const U = curUnit(); if (!U || META.status !== 'play') return;
  if (S.runs[U.id] && !confirm('이미 한 기록이 있어요. 처음부터 다시 할까요?')) return;
  S.runs[U.id] = newRun(U); const run = S.runs[U.id]; enterScene(run, U); checkLife(run, U, 'story'); saveS(true); render(); window.scrollTo(0, 0);
};
A.toEvidence = () => { const run = curRun(); run.step = 'evidence'; saveS(); render(); };
A.peek = id => {
  const run = curRun(), U = curUnit(), sc = sceneOf(U, run), st = scState(run, sc);
  if (st.opened.includes(id)) return; if (st.opened.length >= peekN(run, sc)) return toast('더 열 시간이 없습니다!');
  st.opened.push(id); LASTFLIP = id; snd('flip'); saveS(); render();
};
A.toCouncil = () => { const run = curRun(), U = curUnit(); sceneOf(U, run).options.forEach(o => dexMeet(o.th)); run.step = 'council'; saveS(); render(); };
let SEL = null;
A.sel = th => { SEL = th; render(); };
A.adopt = () => {
  const run = curRun(), U = curUnit(), sc = sceneOf(U, run), st = scState(run, sc);
  if (!SEL) return toast('하나를 고르세요.');
  if (SEL !== 'third' && !choosable(sc, run).includes(SEL)) return toast('고를 수 없는 책사입니다.');
  st.adopt = SEL; run.adopt[sc.id] = SEL; SEL = null; run.step = 'write'; run.gv = clone(run.g);   // 결과는 장면 끝에 공개
  const sec = timerSec(sc); if (sec > 0) { st.deadline = Date.now() + sec * 1000; st.timerTotal = sec; }
  saveS(true); render(); window.scrollTo(0, 0);
};
A.hint = () => {
  const run = curRun(); if (run.hintLeft <= 0) return toast('힌트 카드가 없습니다.');
  if (!confirm('힌트 카드를 쓰면 숨겨진 엔딩을 볼 수 없게 됩니다. 쓸까요?')) return;
  run.hintLeft--; run.hintUsed = true; const st = scState(run, sceneOf(curUnit(), run)); st.hint = true; saveS(); render();
};
A.draft = (field, el) => {
  const run = curRun(); if (!run) return; const U = curUnit();
  if (field === 'verdict') {
    run.verdict.text = el.value; const now = Date.now(), lg = run.verdict.log;
    if (!run.verdict.startedAt) run.verdict.startedAt = now;
    if (!lg.length || now - lg[lg.length - 1].t > 30000) { lg.push({ t: now, len: nz(el.value).length }); if (lg.length > 80) lg.splice(1, 1); }
    const c = document.getElementById('vcnt'); if (c) c.innerHTML = verdictLive(run, U);
  } else { const st = scState(run, sceneOf(U, run)); st['d_' + field] = el.value; const c = document.getElementById('cnt_' + field); if (c) c.textContent = nz(el.value).length + '자'; if (field === 'line') updateLamps(); }
  S.updatedAt = Date.now(); lsSet(sKey(), S); clearTimeout(saveTimer); saveTimer = setTimeout(() => saveS(true), 2500);
};
A.paste = (field, ev) => {
  const run = curRun(); if (!run) return; let n = 0; try { n = (ev.clipboardData.getData('text') || '').length; } catch (e) { }
  if (field === 'verdict') { run.verdict.paste = (run.verdict.paste || 0) + 1; run.verdict.pasteChars = (run.verdict.pasteChars || 0) + n; }
  run.paste = (run.paste || 0) + 1; run.pasteChars = (run.pasteChars || 0) + n; saveS();
};
A.submitLine = timeout => {
  const run = curRun(), U = curUnit(); if (!run || run.step !== 'write') return;
  const sc = sceneOf(U, run), st = scState(run, sc), el = document.getElementById('f_line');
  const text = (el ? el.value : st.d_line || '').trim(); const third = st.adopt === 'third';
  const opt = third ? sc.third : sc.options.find(o => o.th === st.adopt);
  if (!timeout && nz(text).length < 5) return toast('한 줄 논증을 써 주세요.');
  st.line = text; st.timedOut = !!timeout; st.lineAt = Date.now();
  const add = (d, x) => Object.entries(x).forEach(([k, v]) => d[k] = (d[k] || 0) + v);
  if (timeout && nz(text).length < 10) {          // 시간 안에 결단하지 못함
    st.level = 'x'; st.chk = null; st.fxd = applyFx(run, U, { [lifeKey(U)]: -15 });
  } else {
    const j = judgeLine(text, st.adopt, U, sc, st);
    st.chk = { len: j.len, kw: j.kw, mk: j.mk, ctx: j.ctx, ev: j.ev, cost: j.cost, c: j.c }; st.level = j.level; st.weak = j.weak; st.thUsed = j.thUsed;
    const d = third ? applyFx(run, U, opt.fx[j.level]) : applyFx(run, U, opt.fx, { pos: j.level === 'c' ? 0.5 : 1 });
    if (j.level === 'a') add(d, applyFx(run, U, { [lifeKey(U)]: 3 }));
    if (j.level === 'c') add(d, applyFx(run, U, { [lifeKey(U)]: -5 }));
    st.fxd = d;
    st.evFx = {}; j.ev.forEach(id => { const e = sc.evidence.find(x => x.id === id); if (e && e.bonus) add(st.evFx, applyFx(run, U, e.bonus)); });   // 증거 인용 보너스
    if (!third || j.level !== 'c') (opt.flags || []).forEach(f => run.flags[f] = 1);
    if (third && j.level === 'a') run.thirdOk = (run.thirdOk || 0) + 1;
    const users = third ? j.thUsed : [st.adopt];
    users.forEach(id => { addBeliefs(run, id, j.level === 'a' ? 2 : 1); dexMeet(id); S.dex[id].used++; if (j.level === 'a') S.dex[id].mastered = true; });
  }
  st.tries = 0; checkLife(run, U, st.level === 'x' ? 'result' : 'rebut'); saveS(true); render(); window.scrollTo(0, 0);
};
A.submitRebut = skip => {
  const run = curRun(), U = curUnit(), sc = sceneOf(U, run), st = scState(run, sc), T = TN(run.tn);
  const el = document.getElementById('f_rebut'); const text = (el ? el.value : '').trim();
  if (skip) { st.rebutOk = false; st.rebut = ''; st.rebutFx = applyFx(run, U, { [lifeKey(U)]: -6 }); checkLife(run, U, 'result'); saveS(true); render(); return; }
  if (nz(text).length < 5) return toast('재반박을 써 주세요.');
  const j = judgeRebut(text, U, st.weak || 'base', sc, st); st.tries = (st.tries || 0) + 1; st.rebut = text; st.rebutChk = { len: j.len, mk: j.mk, kw: j.kw };
  if (j.ok) { st.rebutOk = true; st.rebutFx = applyFx(run, U, { [lifeKey(U)]: 3 }); (st.adopt === 'third' ? (st.thUsed || []) : [st.adopt]).forEach(id => addBeliefs(run, id, 1)); run.step = 'result'; }
  else if (st.tries < T.rebut) { const W = WEAK[st.weak || 'base']; toast('🧓 "그것으로는 저를 설득할 수 없습니다." — 노린 약점은 [' + W.t + ']입니다. ' + W.d + ' (' + JUDGE().rebutMin + '자 이상, 남은 기회 ' + (T.rebut - st.tries) + '번)', 5500); saveS(); render(); return; }
  else { st.rebutOk = false; st.rebutFx = applyFx(run, U, { [lifeKey(U)]: -6 }); }
  checkLife(run, U, 'result'); saveS(true); render(); window.scrollTo(0, 0);
};
A.afterResult = () => {
  const run = curRun(), U = curUnit(), sc = sceneOf(U, run), st = scState(run, sc);
  const cands = sc.options.map(o => o.th).filter(t => t !== st.adopt && !run.elim.includes(t));
  if (sc.elim && cands.length && st.level !== 'x') { run.step = 'elim'; }
  else if (sc.twist) { run.step = 'twist'; applyTwist(run, U, sc); return checkLife(run, U, 'twist'), saveS(true), render(); }
  else { nextScene(run, U); }
  saveS(true); render(); window.scrollTo(0, 0);
};
A.elim = th => {
  const run = curRun(), U = curUnit(), sc = sceneOf(U, run), st = scState(run, sc);
  if (!confirm(TH(th).name + '을(를) 떨어뜨릴까요? 떨어진 책사는 다시 돌아오지 않습니다.')) return;
  st.elim = th; run.elim.push(th);
  if (sc.twist) { run.step = 'twist'; applyTwist(run, U, sc); checkLife(run, U, 'twist'); } else nextScene(run, U);
  saveS(true); render(); window.scrollTo(0, 0);
};
function applyTwist(run, U, sc) {
  const st = scState(run, sc); if (st.twist) return; st.twist = [];
  (sc.twist.rules || []).forEach((r, i) => { if (cond(run, r.if)) st.twist.push({ i, d: applyFx(run, U, r.fx) }); });
}
A.afterTwist = () => { const run = curRun(), U = curUnit(); nextScene(run, U); saveS(true); render(); window.scrollTo(0, 0); };
function nextScene(run, U) {
  if (run.sc + 1 < U.scenes.length) { run.sc++; run.step = 'story'; enterScene(run, U); checkLife(run, U, 'story'); }
  else run.step = 'pick';
}
A.rescue = () => {
  const run = curRun(), U = curUnit(), el = document.getElementById('f_rescue'), text = (el ? el.value : '').trim();
  const j = judgeRebut(text, U);
  if (nz(text).length < 40 || !j.mk.length) return toast('40자 이상, "왜냐하면·그러나" 같은 근거를 넣어 호소문을 써 주세요.');
  run.rescueLeft--; run.rescued++; run.rescueLog = (run.rescueLog || []).concat([{ t: Date.now(), text }]);
  run.g[lifeKey(U)] = 15; run.step = run.rescueReturn || 'story'; delete run.rescueReturn; saveS(true); toast('❤️ 백성들이 한 번 더 기회를 주었습니다.'); render();
};
A.fall = () => {
  const run = curRun(), U = curUnit(), T = TN(run.tn);
  if (!T.fall) { run.g[lifeKey(U)] = 10; run.step = run.rescueReturn || 'story'; delete run.rescueReturn; toast('순한 맛: 백성들이 마지막 기회를 줍니다.'); }
  else { run.fallen = true; run.step = 'verdict'; delete run.rescueReturn; }
  saveS(true); render(); window.scrollTo(0, 0);
};
A.pickChief = th => { const run = curRun(); run.chief = th; run.step = 'verdict'; saveS(true); render(); window.scrollTo(0, 0); };
A.submitVerdict = () => {
  const run = curRun(), U = curUnit(), J = JUDGE(), el = document.getElementById('f_verdict');
  if (el) run.verdict.text = el.value; const len = nz(run.verdict.text).length;
  if (len < 30) return toast('판결문을 써 주세요.');
  if (len < J.verdictMin && !confirm('아직 ' + len + '자예요. (기준 ' + J.verdictMin + '자) 그래도 제출할까요?')) return;
  run.verdict.submittedAt = Date.now(); run.verdict.len = len; run.verdict.log.push({ t: Date.now(), len });
  run.step = 'done'; run.doneAt = Date.now(); const e = endingOf(run, U, null, false); run.endingId = e.id || '';
  saveS(true); render(); window.scrollTo(0, 0);
};
A.copyVerdict = () => { const run = curRun(); copyText((run.verdict || {}).text || '', '📋 복사했어요. 하이러닝 답안 칸에 붙여 넣으세요.'); };
A.pin = uid => { S.pin[uid] = !S.pin[uid]; saveS(); render(); };
A.loadDist = async () => { const run = curRun(), U = curUnit(); const sc = run && U ? sceneOf(U, run) : null; const d = await backend.get(roomPath(ROOM) + '/students').catch(() => null); CLASS = { for: sc ? sc.id : '', data: d || {} }; render(); };

/* 제한 시간 (화면 글자만 바꿈 → 쓰던 글이 지워지지 않음) */
let tickT = null;
function startTick() {
  clearInterval(tickT);
  tickT = setInterval(() => {
    const run = curRun(); if (!run || run.step !== 'write') return; const U = curUnit(); const st = scState(run, sceneOf(U, run));
    if (!st.deadline) return;
    if (META.status === 'pause') { st.deadline += 1000; return; }   // 일시정지 동안 시간 멈춤
    const left = Math.ceil((st.deadline - Date.now()) / 1000), el = document.getElementById('tmr');
    if (el) el.textContent = Math.max(0, Math.floor(left / 60)) + ':' + String(Math.max(0, left % 60)).padStart(2, '0');
    const rc = document.getElementById('ringc'); if (rc) { const C = 2 * Math.PI * 26, tot = st.timerTotal || 1; rc.setAttribute('stroke-dashoffset', C * (1 - Math.max(0, left) / tot)); if (left <= 15) rc.setAttribute('stroke', '#c92a2a'); }
    if (left > 0 && left <= 15) snd('heart');
    if (left <= 0) { clearInterval(tickT); toast('⏰ 시간이 다 되었습니다!'); A.submitLine(true); }
  }, 1000);
}

/* ---------- ⑦ 학생 화면 ---------- */
function gaugesH(U, run) {
  const hide = ['write', 'rebut'].includes(run.step) && run.gv;   // 결정 직후에는 숫자를 숨김 → 장면 끝에 공개
  const G = hide ? run.gv : run.g;
  return `<div class="gauges">${gaugeKeys(U).map(k => { const d = U.gauges[k], v = G[k]; const c = v < 25 ? 'lo' : v < 50 ? 'mid' : 'hi';
    return `<div class="gg ${d.life ? 'life' : ''} ${d.life && v <= 20 ? 'danger' : ''}"><div class="h"><span>${d.e} ${esc(d.n)}${d.life ? ' <span class="small" style="color:var(--main)">생명</span>' : ''}</span><span>${hide ? v + ' → ❔' : (run.step === 'result' && run.gv && run.gv[k] !== v ? `<span data-from="${run.gv[k]}" data-to="${v}">${run.gv[k]}</span>` : v)}</span></div><div class="gbar"><i class="${c}" style="width:${v}%"></i></div></div>`; }).join('')}</div>`;
}
function stepsH(U, run) {
  const names = U.scenes.map((s, i) => `장면${i + 1}`).concat(['판결문']);
  const cur = ['pick', 'verdict', 'done'].includes(run.step) ? U.scenes.length : run.sc;
  return `<div class="steps">${names.map((n, i) => `<span class="${i < cur ? 'done' : i === cur ? 'on' : ''}">${n}</span>`).join('')}</div>`;
}
function cardsH(run) { return `<span class="pill gold">❤️‍🩹 구제 카드 ${run.rescueLeft}</span><span class="pill jade">💡 힌트 카드 ${run.hintLeft}</span><span class="pill">${esc(TN(run.tn).n)}</span>`; }
function headH() {
  return `<div class="top"><h1><span class="logo">딜</span>${TITLE}<small>${SUBTITLE}${ROOM ? ' · 방 ' + esc(ROOM) : ''}</small></h1>
    ${S ? `<span class="pill main">${S.num}번${S.name ? ' ' + esc(S.name) : ''}</span>
    <div class="tabs" style="margin:0"><button class="tab ${STAB === 'game' ? 'on' : ''}" onclick="A.tab('game')">🎮 게임</button><button class="tab ${STAB === 'rec' ? 'on' : ''}" onclick="A.tab('rec')">📚 내 기록</button></div>` : ''}</div>`;
}
function renderStudent() {
  if (!ROOM) {
    app.innerHTML = `<div class="wrap">${headH()}<div class="card"><h2>방 코드를 입력하세요</h2><p class="muted">선생님이 알려 준 코드 또는 QR로 들어옵니다.</p>
      <input id="rcode" class="inp" placeholder="예: AB3K7" maxlength="8" style="text-transform:uppercase;font-size:22px;letter-spacing:3px">
      <button class="btn full" style="margin-top:10px" onclick="location.search='?room='+encodeURIComponent(document.getElementById('rcode').value.trim().toUpperCase())">입장</button></div>
      <div class="card"><a href="?mode=teacher">👩‍🏫 교사 화면</a></div>${footH()}</div>`; return;
  }
  if (!metaLoaded) { app.innerHTML = `<div class="wrap">${headH()}<div class="card">불러오는 중…</div></div>`; return; }
  if (!META || !META.created) { app.innerHTML = `<div class="wrap">${headH()}<div class="card"><h2>방을 찾을 수 없어요</h2><p>코드 <b>${esc(ROOM)}</b>를 다시 확인해 주세요.</p><button class="btn ghost" onclick="location.search=''">다른 코드 입력</button></div>${footH()}</div>`; return; }
  if (!S) {
    app.innerHTML = `<div class="wrap">${headH()}<div class="card"><h2>${esc(META.name || '')} 입장</h2>
      <label class="lb">번호</label><input id="jnum" class="inp" inputmode="numeric" placeholder="예: 7 또는 20307" maxlength="6">
      ${META.askName ? `<label class="lb">이름</label><input id="jname" class="inp" maxlength="10">` : `<p class="muted small">이름은 받지 않아요. 번호만 입력합니다.</p>`}
      <button class="btn full big" style="margin-top:12px" onclick="A.join()">들어가기</button>
      <p class="muted small" style="margin-top:10px">⚠️ 글에 실명이나 실제 개인 사연은 쓰지 마세요. 글은 수업이 끝나면 지워집니다.</p></div>${footH()}</div>`; return;
  }
  const body = STAB === 'rec' ? recordsH() : gameH();
  const run = curRun(), U0 = curUnit(), sc0 = run && U0 && run.sc < U0.scenes.length ? sceneOf(U0, run) : null;
  const urg = STAB === 'game' && sc0 && sc0.urgent && ['evidence', 'council', 'write'].includes(run.step) && fxLv() !== 'off';
  app.innerHTML = `<div class="wrap ${urg ? 'urgent' : ''} fx-${fxLv()}">${headH()}${META.status === 'pause' ? '<div class="banner">⏸ 선생님이 잠시 멈췄어요. 화면을 보세요.</div>' : ''}${body}${footH()}</div>${fbButton()}`;
  if (run && run.step === 'write') { startTick(); updateLamps(); } else clearInterval(tickT);
  postRender(run, U0, sc0, urg);
}

/* 그린 뒤 한 번: 숫자 올라가기, 흔들림, 효과음 (장면마다 한 번만) */
const ONCE = {};
function once(k) { if (ONCE[k]) return false; ONCE[k] = 1; return true; }
function postRender(run, U, sc, urg) {
  if (!run || !U || STAB !== 'game') return;
  const key = U.id + '_' + (sc ? sc.id : 'end') + '_' + run.startedAt;
  if (urg && once('urg' + key)) snd('alarm');
  if (run.step === 'rebut' && once('stamp' + key)) snd('stamp');
  if (run.step === 'result' && sc) {
    animateNums(); const st = scState(run, sc), tot = sceneTotal(st), life = tot[lifeKey(U)] || 0;
    if (once('res' + key)) { snd(life < 0 ? 'bad' : 'good'); if (life <= -10 && fxLv() === 'full') { document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 700); } }
  }
}
function gameH() {
  const U = curUnit();
  if (!U) return `<div class="card"><h2>⏳ 선생님이 단원을 고르는 중이에요</h2><p class="muted">잠시 기다려 주세요.</p></div>`;
  const run = S.runs[U.id];
  if (!run) return introH(U);
  if (META.status === 'end' && !['verdict', 'done'].includes(run.step)) return `<div class="card"><h2>🔒 수업이 끝났어요</h2><p class="muted">다음 시간에 이어서 해요.</p></div>`;
  const busy = META.status === 'pause';
  let h = stepsH(U, run) + gaugesH(U, run) + `<div class="row" style="margin-bottom:6px">${cardsH(run)}</div>`;
  const sc = run.sc < U.scenes.length ? sceneOf(U, run) : null;
  const sceneGateBlocked = sc && ['story', 'evidence'].includes(run.step) && !gateOK(run.sc);
  const verdictGateBlocked = ['pick', 'verdict'].includes(run.step) && !gateOK(U.scenes.length);
  if (sceneGateBlocked || verdictGateBlocked) return h + `<div class="card"><h2>🚪 선생님이 다음 장면을 열 때까지 기다려요</h2><p class="muted">반 친구들과 함께 진행합니다. 지금까지의 선택을 떠올려 보세요.</p></div>`;
  if (busy && !['done'].includes(run.step)) return h + `<div class="card"><h2>⏸ 잠시 멈춤</h2><p class="muted">선생님 말씀을 들어요.</p></div>`;
  switch (run.step) {
    case 'story': return h + storyH(U, run, sc);
    case 'evidence': return h + evidenceH(U, run, sc);
    case 'council': return h + councilH(U, run, sc);
    case 'write': return h + writeH(U, run, sc);
    case 'rebut': return h + rebutH(U, run, sc);
    case 'result': return h + resultH(U, run, sc);
    case 'elim': return h + elimH(U, run, sc);
    case 'twist': return h + twistH(U, run, sc);
    case 'rescue': return h + rescueH(U, run);
    case 'pick': return h + pickH(U, run);
    case 'verdict': return h + verdictH(U, run);
    case 'done': return doneH(U, run);
  }
  return h;
}
function introH(U) {
  const play = META.status === 'play', life = esc(U.gauges[lifeKey(U)].n);
  return `${sceneArt('open', U.id + '_open')}<div class="card"><div class="muted small">${esc(U.subject)} · ${esc(U.area)} · ${esc(U.genre)}</div><h2 style="font-size:24px">${esc(U.title)}</h2>
    <p><b>나의 역할:</b> ${esc(U.role)}</p>
    <div class="stage">${U.opening.map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="rival"><div class="ic">${U.rival.e}</div><div><b>${esc(U.rival.name)}</b><br><span class="small">${esc(U.rival.desc)} 당신의 글을 읽고, <b>가장 약한 곳</b>을 찔러 올 것입니다.</span></div></div>
    <h3>규칙 — 당신이 쓴 글이 나라의 운명을 바꿉니다</h3>
    <ul class="small" style="margin:0;padding-left:20px">
      <li><b>증거 카드</b>는 몇 장만 열 수 있습니다. 연 증거의 내용을 글에 <b>인용</b>하면 보너스가 붙습니다.</li>
      <li>책사의 해결책을 채택하거나, <b>✍️ 제3의 길</b>(두 사상가의 개념을 섞은 나만의 해결책)을 직접 쓸 수 있습니다. 제3의 길은 성공하면 크게, 실패하면 크게 흔들립니다.</li>
      <li><b>한 줄 논증</b>은 ① 분량 ② 사상가 개념어 ③ 근거(왜냐하면·따라서…) ④ <b>지금 상황과 연결</b>으로 판정됩니다. 상황과 상관없는 말은 개념어를 써도 흔들립니다.</li>
      <li>${esc(U.rival.name)}은(는) 당신 글에서 <b>빠진 것</b>(개념·근거·대가·반대 사상)을 노려 반박합니다. 그 약점을 메우는 재반박을 쓰세요.</li>
      <li>결과 숫자는 <b>장면이 끝날 때</b> 한꺼번에 공개됩니다. 떨어뜨린 책사, 내린 결정은 나중에 돌아옵니다.</li>
      <li>${life}이 0이 되면 위험합니다. 마지막에는 <b>판결문</b>을 씁니다.</li>
    </ul>
    <div style="margin-top:14px">${play ? `<button class="btn full big" onclick="A.start()">▶ 시작하기</button>` : `<div class="note">⏳ 선생님이 시작하면 버튼이 열립니다.</div>`}</div></div>`;
}
let STORYI = {}, LASTFLIP = null;
A.more = id => { STORYI[id] = (STORYI[id] || 1) + 1; render(); };
A.allStory = id => { STORYI[id] = 999; render(); };
function storyH(U, run, sc) {
  const st = scState(run, sc), n = fxLv() === 'off' ? 999 : (STORYI[sc.id] || 1), all = n >= sc.story.length;
  const seeds = (st.seeds || []).map(s => `<div class="seed">${esc(sc.seeds[s.i].text)}<br>${fxHTML(U, s.d)}</div>`).join('');
  const ev = st.event ? U.events[st.event.i] : null;
  return `${sceneArt(sc.bg, U.id + '_' + sc.id)}<div class="stage" ${all ? '' : `onclick="A.more('${sc.id}')" style="cursor:pointer"`}><div class="ttl">장면 ${run.sc + 1} · ${esc(sc.title)}${sc.mode === 'duel' ? ' <span class="pill gold">⚔️ 맞대결</span>' : ''}${sc.urgent ? ' <span class="pill bad">🚨 긴급</span>' : ''}</div>
    ${sc.story.slice(0, n).map((p, i) => `<p class="${i === Math.min(n, sc.story.length) - 1 && !all && fxLv() === 'full' ? 'typein' : ''}">${esc(p)}</p>`).join('')}
    ${all ? '' : `<div class="row" style="margin-top:8px"><button class="btn" onclick="event.stopPropagation();A.more('${sc.id}')">▶ 계속</button><span class="sp"></span><button class="btn ghost sm" onclick="event.stopPropagation();A.allStory('${sc.id}')">모두 보기</button></div>`}</div>
    ${all ? `${st.decay ? `<div class="event">${esc(U.decay.text)}<br>${fxHTML(U, st.decay)}</div>` : ''}${seeds}${ev ? `<div class="event ${ev.good ? 'good' : ''}">🎲 돌발 사건: ${esc(ev.t)}<br>${fxHTML(U, st.event.d)}</div>` : ''}
    ${worldArt(U, run.g)}
    <button class="btn full big" style="margin-top:12px" onclick="A.toEvidence()">🔍 증거 살펴보기</button>` : ''}`;
}
function evBody(run, e) { return e.alt && cond(run, e.alt.if) ? e.alt.body : e.body; }
function evidenceH(U, run, sc) {
  const st = scState(run, sc), P = peekN(run, sc), left = P - st.opened.length;
  return `<div class="card"><h2>🔍 증거 카드</h2><p class="muted">${sc.urgent ? '🚨 긴급 상황! ' : '시간이 없습니다. '}<b>${P}장</b>만 열 수 있습니다. (남은 기회 ${Math.max(0, left)}장) — 연 증거를 글에 인용하면 보너스!</p>
    <div class="evs">${sc.evidence.map(e => st.opened.includes(e.id)
      ? `<div class="evc ${LASTFLIP === e.id && fxLv() !== 'off' ? 'flip' : ''}"><b>${esc(e.t)}</b>${esc(evBody(run, e))}</div>`
      : `<button class="evc back ${left <= 0 ? 'lock' : ''}" ${left <= 0 ? 'disabled' : ''} onclick="A.peek('${e.id}')"><div style="font-size:30px">❓</div>${left <= 0 ? '열 수 없음' : '눌러서 열기'}</button>`).join('')}</div>
    <button class="btn full big" style="margin-top:12px" onclick="A.toCouncil()">${sc.mode === 'duel' ? '⚔️ 맞대결 보기' : '🏯 책사 회의 시작'}</button></div>`;
}
function thirdCard(sc) {
  return `<button class="thc ${SEL === 'third' ? 'sel' : ''}" style="border-style:dashed;border-color:var(--gold)" onclick="A.sel('third')">${avatar('third', 64)}<div><span class="nm">✍️ 제3의 길</span><span class="sc">나의 해결책</span>
    <div class="pl">어느 책사도 따르지 않고, <b>두 사상가의 개념을 섞어</b> 직접 해결책을 씁니다. <span class="pill gold">고위험·고보상</span></div><div class="small muted">${esc(sc.third.hintPair || '')}</div></div></button>`;
}
function councilH(U, run, sc) {
  const btn = `<button class="btn full big" style="margin-top:8px" ${SEL ? '' : 'disabled'} onclick="A.adopt()">📜 ${SEL === 'third' ? '제3의 길로 간다' : '이 해결책 채택'} (되돌릴 수 없음)</button>`;
  if (sc.mode === 'duel') {
    const [a, b] = duelPair(sc, run), oa = sc.options.find(o => o.th === a), ob = sc.options.find(o => o.th === b), anim = fxLv() !== 'off';
    const bub = (id, side, txt, d) => `<div class="bub ${side} ${anim ? 'pop' : ''}" style="animation-delay:${anim ? d : 0}s"><b>${esc(TH(id).name)}</b> ${esc(txt)}</div>`;
    return `<div class="card"><h2>⚔️ 맞대결</h2>
      <div class="vs"><div class="side">${avatar(a, 92)}<b>${esc(TH(a).name)}</b><span class="muted small">${esc(TH(a).school)}</span></div><div class="vsb ${anim ? 'pulse' : ''}">VS</div><div class="side">${avatar(b, 92)}<b>${esc(TH(b).name)}</b><span class="muted small">${esc(TH(b).school)}</span></div></div>
      <div class="bubbles"><div class="rnd">1라운드 — 주장</div>${bub(a, 'l', oa.duel.claim, 0.2)}${bub(b, 'r', ob.duel.claim, 1.0)}
      <div class="rnd">2라운드 — 공격</div>${bub(a, 'l', oa.duel.vs[b] || '', 1.8)}${bub(b, 'r', ob.duel.vs[a] || '', 2.6)}</div>
      <h3>⚖️ 판정 — 누구의 손을 들어줄 것인가</h3>
      ${[[a, oa], [b, ob]].map(([id, o]) => `<button class="thc ${SEL === id ? 'sel' : ''}" onclick="A.sel('${id}')">${avatar(id, 56)}<div><span class="nm">${esc(TH(id).name)}의 승리</span><div class="pl small">채택: "${esc(o.plan)}"</div></div></button>`).join('')}
      ${thirdCard(sc)}${btn}</div>`;
  }
  return `<div class="card"><h2>🏯 책사 회의 — ${esc(sc.title)}</h2><p class="muted">한 명의 해결책을 채택하거나 제3의 길을 고르세요. <b>되돌릴 수 없습니다.</b>${sc.urgent ? ' 🚨 고르면 바로 시간이 흐릅니다.' : ''}</p>
    ${sc.options.map(o => { const t = TH(o.th), out = run.elim.includes(o.th);
      return `<button class="thc ${SEL === o.th ? 'sel' : ''}" ${out ? 'disabled' : ''} onclick="A.sel('${o.th}')">${avatar(o.th, 64)}<div><span class="nm">${esc(t.name)}</span><span class="sc">${esc(t.school)}${(U.ext || []).includes(o.th) ? ' · 확장 인물' : ''}</span>
      ${out ? `<div class="pl"><b>❌ 오디션에서 떨어졌습니다.</b> 이 자리는 비어 있습니다.</div>` : `<div class="pl">"${esc(o.plan)}"</div>`}</div></button>`; }).join('')}
    ${thirdCard(sc)}${btn}</div>`;
}
function writeH(U, run, sc) {
  const st = scState(run, sc), third = st.adopt === 'third', t = TH(st.adopt), J = JUDGE();
  const opt = third ? null : sc.options.find(o => o.th === st.adopt);
  const opened = (sc.evidence || []).filter(e => st.opened.includes(e.id));
  const kwNames = third ? sc.options.map(o => o.th) : [st.adopt];
  const showL = TN(run.tn).key !== 'spicy';
  const ring = st.deadline ? (() => { const l = Math.max(0, Math.ceil((st.deadline - Date.now()) / 1000)), tot = st.timerTotal || l || 1, C = 2 * Math.PI * 26;
    return `<div class="ring"><svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="26" stroke="#eee" stroke-width="7" fill="none"/><circle id="ringc" cx="32" cy="32" r="26" stroke="${l <= 15 ? '#c92a2a' : '#7b2d26'}" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - l / tot)}" transform="rotate(-90 32 32)"/></svg><span id="tmr">${Math.floor(l / 60)}:${String(l % 60).padStart(2, '0')}</span></div>`; })() : '';
  return `<div class="card"><div class="row"><h2 style="flex:1;margin:0">✍️ ${sc.mode === 'duel' && !third ? '판정문' : third ? '나의 해결책' : '한 줄 논증'}</h2>${ring}</div>
    ${third ? `<div class="thc sel" style="cursor:default">${avatar('third', 56)}<div><span class="nm">✍️ 제3의 길</span><div class="pl">무엇을 할지, 왜 그것이 옳은지 쓰세요. <b>서로 다른 두 사상가의 개념어</b>를 함께 써야 성공합니다.</div><div class="small muted">${esc(sc.third.hintPair || '')}</div></div></div>`
      : `<div class="thc sel" style="cursor:default">${avatar(st.adopt, 56)}<div><span class="nm">${sc.mode === 'duel' ? esc(t.name) + '의 승리로 판정' : esc(t.name) + '의 해결책을 채택'}</span><div class="pl">"${esc(opt.plan)}"</div></div></div>`}
    <p>${sc.mode === 'duel' && !third ? '왜 이 책사가 이겼는지, 상대의 공격은 왜 틀렸는지' : '왜 이 해결책이 옳은지'} <b>군주로서</b> 밝히세요.</p>
    <div class="lampbar">${showL ? `<div class="lamps"><span id="lamp0">📏 분량 ${J.lineMin + (third ? LINE_THIRD_PLUS : 0)}자</span><span id="lamp1">🔑 ${third ? '두 사상가 개념' : '개념어'}</span><span id="lamp2">🔗 근거</span><span id="lamp3">📍 상황·증거</span></div>` : `<span class="muted small">🌶️🌶️🌶️ 매운 맛: 설득력 등불이 꺼져 있습니다. 스스로 판단하세요.</span>`}<span class="sp"></span><div class="rivmini" title="${esc(U.rival.name)}">${showL ? `<span id="rivface">${rivalFace('calm', 52)}</span>` : rivalFace('calm', 52)}<div class="small muted">${esc(U.rival.name)}</div></div></div>
    <div id="glossbox" class="gloss" ${showL ? '' : 'style="display:none"'}></div>
    ${opened.length ? `<details ${fxLv() === 'off' ? '' : 'open'}><summary class="small"><b>📎 내가 연 증거 (인용하면 보너스)</b></summary>${opened.map(e => `<div class="small evref" id="evr_${e.id}"><b>${esc(e.t)}</b> ${esc(evBody(run, e))}</div>`).join('')}</details>` : ''}
    ${st.hint ? `<div class="note">💡 개념어 — ${kwNames.map(id => `<b>${esc(TH(id).name)}</b>: ${esc((TH(id).kw || []).join(', '))}`).join(' / ')}</div>` : ''}
    <textarea id="f_line" class="inp" placeholder="예) 나는 ○○을 택한다. 왜냐하면 지금 ○○ 상황에서 …" oninput="A.draft('line',this)" onpaste="A.paste('line',event)">${esc(st.d_line || '')}</textarea>
    <div class="cnt" id="cnt_line">${nz(st.d_line).length}자</div>
    <div class="row" style="margin-top:8px">${!st.hint && run.hintLeft > 0 ? `<button class="btn ghost" onclick="A.hint()">💡 힌트 카드 쓰기</button>` : ''}<span class="sp"></span><button class="btn big" onclick="A.submitLine(false)">결단하기 ⚔️</button></div></div>`;
}
/* 쓰는 동안 등불·표정·개념 뜻풀이가 바뀜 */
let LASTGLOSS = '';
function glossOf(word, ids) { for (const id of ids) { const g = TH(id).gl || {}; const k = Object.keys(g).find(x => nz(x) === nz(word) || nz(word).includes(nz(x))); if (k) return [TH(id).name, k, g[k]]; } return null; }
function updateLamps() {
  const run = curRun(), U = curUnit(); if (!run || run.step !== 'write') return; const sc = sceneOf(U, run), st = scState(run, sc);
  const el = document.getElementById('f_line'); if (!el) return; const text = el.value;
  const j = judgeLine(text, st.adopt, U, sc, st);
  j.c.forEach((v, i) => { const l = document.getElementById('lamp' + i); if (l) l.className = v ? 'on' : ''; });
  const f = document.getElementById('rivface');
  if (f) { const n = j.c.filter(Boolean).length, mood = !nz(text).length ? 'calm' : n === 4 ? 'alarm' : j.c[1] && j.c[2] ? 'frown' : nz(text).length > 15 ? 'sneer' : 'calm'; if (f.dataset.m !== mood) { f.dataset.m = mood; f.innerHTML = rivalFace(mood, 52); } }
  (sc.evidence || []).forEach(e => { const r = document.getElementById('evr_' + e.id); if (r) r.classList.toggle('used', j.ev.includes(e.id)); });
  const ids = st.adopt === 'third' ? U.thinkers : [st.adopt].concat(U.thinkers);
  const last = j.kw[j.kw.length - 1]; const gb = document.getElementById('glossbox');
  if (gb && last && last !== LASTGLOSS) { const g = glossOf(last, ids); if (g) { LASTGLOSS = last; gb.innerHTML = `💡 <b>${esc(g[1])}</b> (${esc(g[0])}) — ${esc(g[2])}`; gb.classList.remove('show'); void gb.offsetWidth; gb.classList.add('show'); } }
}
function chkH(chk, J) {
  if (!chk) return '';
  const c = chk.c;
  return `<div class="chk"><span class="${c[0] ? 'y' : 'n'}">📏 ${chk.len}자</span><span class="${c[1] ? 'y' : 'n'}">🔑 개념어 ${chk.kw.length ? esc(chk.kw.join(', ')) : '없음'}</span><span class="${c[2] ? 'y' : 'n'}">🔗 근거 ${chk.mk.length ? esc(chk.mk.join(', ')) : '없음'}</span><span class="${c[3] ? 'y' : 'n'}">📍 상황 ${(chk.ctx || []).length ? esc(chk.ctx.slice(0, 3).join(', ')) : '없음'}${(chk.ev || []).length ? ' · 📎증거 인용 ' + chk.ev.length : ''}</span></div>`;
}
function rebutText(sc, st) {
  const o = st.adopt === 'third' ? sc.third : sc.options.find(x => x.th === st.adopt);
  const w = st.weak || 'base';
  return (o.rb && o.rb[w]) || (w === 'ctx' ? WEAK.ctx.rb : (o.rb && o.rb.base) || o.rebut || '');
}
const WEAKMOOD = { ctx: 'sneer', kw: 'sneer', why: 'frown', cost: 'frown', base: 'alarm' };
function rebutH(U, run, sc) {
  const st = scState(run, sc), L = LV[st.level], T = TN(run.tn), J = JUDGE(), W = WEAK[st.weak || 'base'];
  return `<div class="card" style="text-align:center">${stampH(st.level)}<p class="muted">${L.d}</p>${chkH(st.chk, J)}
    <p class="small">📜 나라에 어떤 일이 일어났는지는 <b>장면이 끝날 때</b> 공개됩니다.</p></div>
    <div class="rival"><div class="ic">${rivalFace(WEAKMOOD[st.weak || 'base'], 64)}</div><div><b>${esc(U.rival.name)}의 반박</b> <span class="pill bad">🎯 노린 약점: ${W.t}</span><br>"${esc(rebutText(sc, st))}"</div></div>
    <div class="card"><h2>🛡️ 재반박</h2><p class="muted"><b>${W.d}</b> (${J.rebutMin}자 이상 · 기회 ${T.rebut - (st.tries || 0)}번)</p>
    <textarea id="f_rebut" class="inp" placeholder="그러나 … 왜냐하면 …" oninput="A.draft('rebut',this)" onpaste="A.paste('rebut',event)">${esc(st.d_rebut || '')}</textarea>
    <div class="cnt" id="cnt_rebut">${nz(st.d_rebut).length}자</div>
    <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="if(confirm('반박하지 않으면 ${esc(U.gauges[lifeKey(U)].n)}이 떨어집니다. 넘어갈까요?'))A.submitRebut(true)">말없이 넘어가기</button><span class="sp"></span><button class="btn big" onclick="A.submitRebut(false)">재반박하기 🛡️</button></div></div>`;
}
function distH(U, run, sc) {
  if (!TN(run.tn).dist) return '';
  if (!CLASS || CLASS.for !== sc.id) return `<div class="card"><button class="btn line full" onclick="A.loadDist()">📊 우리 반은 어떤 길을 택했을까? (보기)</button></div>`;
  const cnt = {}; let n = 0; Object.values(CLASS.data || {}).forEach(s => { const r = s && s.runs && s.runs[U.id]; const a = r && r.adopt && r.adopt[sc.id]; if (a) { cnt[a] = (cnt[a] || 0) + 1; n++; } });
  const mine = run.adopt[sc.id]; const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const ids = sc.options.map(o => o.th).concat(['third']);
  return `<div class="card"><h3 style="margin-top:0">📊 우리 반의 선택 (지금까지 ${n}명)</h3><div class="dist">${ids.map(id => `<div class="b ${id === mine ? 'me' : ''}"><div class="l">${esc(TH(id).name)}${id === mine ? ' (나)' : ''}</div><div class="g"><i style="width:${n ? Math.round((cnt[id] || 0) / n * 100) : 0}%"></i></div><div class="n">${cnt[id] || 0}</div></div>`).join('')}</div>
    ${top && mine && top[0] !== mine ? `<div class="note">⚡ 당신은 반 다수(${esc(TH(top[0]).name)})와 <b>다른 길</b>을 택했습니다. 판결문에서 그 이유를 밝혀 보세요.</div>` : ''}
    <button class="btn sm ghost" onclick="A.loadDist()">새로고침</button></div>`;
}
function sceneTotal(st) { const tot = {}; [st.fxd, st.evFx, st.rebutFx].forEach(d => Object.entries(d || {}).forEach(([k, v]) => tot[k] = (tot[k] || 0) + v)); return tot; }
function resultH(U, run, sc) {
  const st = scState(run, sc);
  if (st.level === 'x') return `<div class="card" style="text-align:center">${stampH('x')}<p>군주가 망설이는 사이 백성은 실망했습니다. 해결책은 실행되지 않았습니다.</p></div>${worldArt(U, run.g, st.fxd)}<button class="btn full big" onclick="A.afterResult()">다음 ▶</button>`;
  const L = LV[st.level], third = st.adopt === 'third', o = third ? sc.third : sc.options.find(x => x.th === st.adopt);
  const story = (o.after || {})[st.level] || '', tot = sceneTotal(st);
  const users = third ? (st.thUsed || []) : [st.adopt];
  const bel = {}; users.forEach(id => Object.entries(TH(id).b || {}).forEach(([k, v]) => bel[k] = (bel[k] || 0) + v * (st.level === 'a' ? 2 : 1) + (st.rebutOk ? v : 0)));
  const missed = (sc.evidence || []).filter(e => !(st.opened || []).includes(e.id));
  const ids = third ? sc.options.map(x => x.th) : [st.adopt].concat(sc.options.map(x => x.th).filter(x => x !== st.adopt));
  const gl = []; (st.chk ? st.chk.kw : []).forEach(w => { const g = glossOf(w, ids); if (g && !gl.some(x => x[1] === g[1])) gl.push(g); });
  ids.slice(0, 2).forEach(id => { const g = TH(id).gl || {}; Object.keys(g).slice(0, 2).forEach(k => { if (!gl.some(x => x[1] === k)) gl.push([TH(id).name, k, g[k]]); }); });
  return `<div class="card"><h2>📜 장면 ${run.sc + 1} — 그 뒤 운나라에서는</h2>
    <p><b>${third ? '✍️ 제3의 길' : esc(TH(st.adopt).name)}</b> — <span class="lvl ${L.cls}" style="font-size:18px">${L.t}</span>${third && st.level === 'a' ? ' <span class="pill gold">✨ 아무도 생각 못 한 길</span>' : ''}</p>
    <div class="stage"><p>${esc(story)}</p><div class="row" style="align-items:center">${rivalFace(st.rebutOk ? 'nod' : 'sneer', 44)}<span>${st.rebutOk ? `🛡️ ${esc(U.rival.name)}이(가) 당신의 재반박에 고개를 끄덕였다.` : `💢 ${esc(U.rival.name)}의 반박에 답하지 못하자 신하들이 술렁였다.`}</span></div></div>
    <h3>📊 결과 공개</h3>${worldArt(U, run.g, tot)}
    <div class="small">해결책 ${fxHTML(U, st.fxd)}</div>
    ${Object.keys(st.evFx || {}).length ? `<div class="small">📎 증거 인용 보너스 ${fxHTML(U, st.evFx)}</div>` : ''}
    <div class="small">재반박 ${fxHTML(U, st.rebutFx)}</div>
    <div style="margin-top:6px"><b>합계</b> ${fxHTML(U, tot)}</div>
    <p class="small muted">신념 지표 변화: ${Object.entries(bel).map(([k, v]) => k + ' +' + v).join(', ') || '없음'}</p></div>
    ${missed.length ? `<div class="card"><h3 style="margin-top:0">🔒 열지 못한 증거</h3><p class="muted small">이 카드를 봤다면 판단이 달라졌을까요?</p>${missed.map(e => `<div class="small evref"><b>${esc(e.t)}</b> ${esc(evBody(run, e))}</div>`).join('')}</div>` : ''}
    ${gl.length ? `<div class="card"><h3 style="margin-top:0">📚 이 장면의 개념</h3><table class="sumtbl">${gl.slice(0, 5).map(g => `<tr><td>${esc(g[1])}</td><td>${esc(g[2])} <span class="muted small">(${esc(g[0])})</span></td></tr>`).join('')}</table></div>` : ''}
    ${distH(U, run, sc)}
    <button class="btn full big" onclick="A.afterResult()">다음 ▶</button>`;
}
function elimH(U, run, sc) {
  const st = scState(run, sc), cands = sc.options.map(o => o.th).filter(t => t !== st.adopt && !run.elim.includes(t));
  return `<div class="card"><h2>🔥 탈락자 지명</h2><p>이번 회의에서 채택하지 않은 책사 중 <b>한 명을 떨어뜨려야</b> 합니다. 떨어진 책사는 다시 돌아오지 않습니다.</p>
    ${cands.map(th => { const t = TH(th); return `<button class="thc" onclick="A.elim('${th}')">${avatar(th, 56)}<div><span class="nm">${esc(t.name)}</span><span class="sc">${esc(t.school)}</span><div class="pl small">${esc(t.intro)}</div></div></button>`; }).join('')}
    <p class="muted small">💭 누구를 떨어뜨리느냐에 따라 앞으로의 장면이 달라질 수 있습니다.</p></div>`;
}
function twistH(U, run, sc) {
  const st = scState(run, sc), tw = sc.twist;
  return `${sceneArt(sc.bg, U.id + '_' + sc.id)}<div class="card" style="border:2px solid var(--main)"><h2>${esc(tw.title)}</h2><p style="font-size:18px">${esc(tw.intro)}</p>
    ${(st.twist || []).map(x => `<div class="seed">${esc(tw.rules[x.i].text)}<br>${fxHTML(U, x.d)}</div>`).join('') || '<p class="muted">운나라는 숨을 죽이고 버텼다.</p>'}
    <button class="btn full big" style="margin-top:10px" onclick="A.afterTwist()">결말을 향해 ▶</button></div>`;
}
function rescueH(U, run) {
  const lk = lifeKey(U), T = TN(run.tn);
  if (run.rescueLeft > 0) return `<div class="card" style="border:2px solid var(--bad)"><h2>🚨 ${esc(U.gauges[lk].n)}이 무너졌습니다!</h2>
    <p>백성들이 궁 앞에 모였습니다. <b>구제 카드</b>(남은 ${run.rescueLeft}장)를 써서 백성에게 호소문을 쓰면 한 번 더 기회를 얻습니다.</p>
    <p class="muted small">40자 이상, "왜냐하면·그러나" 같은 근거를 넣어 무엇을 잘못했고 어떻게 바로잡을지 쓰세요.</p>
    <textarea id="f_rescue" class="inp" placeholder="백성들이여, …"></textarea><button class="btn full big" style="margin-top:8px" onclick="A.rescue()">❤️‍🩹 호소문 발표</button></div>`;
  return `<div class="card" style="border:2px solid var(--bad)"><h2>🥀 ${esc(U.gauges[lk].n)}을 모두 잃었습니다</h2><p>${T.fall ? '구제 카드도 남지 않았습니다. 당신은 왕위에서 쫓겨납니다. 대신 <b>회고록</b>을 써서 무엇이 잘못되었는지 돌아보세요.' : '순한 맛: 백성들이 마지막 기회를 줍니다.'}</p>
    <button class="btn full big ${T.fall ? 'bad' : ''}" onclick="A.fall()">${T.fall ? '회고록 쓰러 가기' : '계속하기'}</button></div>`;
}
function pickH(U, run) {
  let c = [...new Set(Object.values(run.adopt))].filter(t => t !== 'third' && !run.elim.includes(t));
  if (!c.length) c = U.thinkers.filter(t => !run.elim.includes(t));
  return `<div class="card"><h2>👑 ${esc(U.final.title)}</h2><p>${esc(U.final.pickPrompt)}</p>
    ${c.map(th => { const t = TH(th); return `<button class="thc" onclick="A.pickChief('${th}')">${avatar(th, 64)}<div><span class="nm">${esc(t.name)}</span><span class="sc">${esc(t.school)}</span><div class="pl small">${esc(t.intro)}</div></div></button>`; }).join('')}
    <p class="muted small">떨어진 책사: ${run.elim.map(id => esc(TH(id).name)).join(', ') || '없음'}</p></div>`;
}
function verdictLive(run, U) {
  const J = JUDGE(), t = run.verdict.text || '', len = nz(t).length;
  const ck = run.fallen ? kwHits(t, allUnitKw(U)) : kwHits(t, TH(run.chief).kw); const c = critOf(run, U);
  return `<span class="pill ${len >= J.verdictMin ? 'ok' : ''}">📏 ${len} / ${J.verdictMin}자</span><span class="pill ${ck.length >= J.verdictKw ? 'ok' : ''}">🔑 ${run.fallen ? '' : esc(TH(run.chief).name) + ' '}개념어 ${ck.length}/${J.verdictKw}${ck.length ? ' (' + esc(ck.join(', ')) + ')' : ''}</span><span class="pill ${c.ctr ? 'ok' : ''}">⚔️ 반론 ${c.ctr ? '있음' : '없음'}</span>`;
}
/* 연대기 두루마리: 지금까지의 선택과 글을 모아 판결문 근거로 */
function chronicleH(U, run) {
  const rows = [];
  U.scenes.forEach((sc, i) => {
    const st = run.scenes[sc.id]; if (!st || !st.entered) return;
    const it = [];
    if (st.event) it.push('🎲 ' + U.events[st.event.i].t);
    (st.seeds || []).forEach(s => it.push(sc.seeds[s.i].text));
    if (st.adopt) it.push(`<b>⚖️ ${st.adopt === 'third' ? '제3의 길' : esc(TH(st.adopt).name) + ' 채택'}</b> ${st.level && LV[st.level] ? '— ' + LV[st.level].t : ''}`);
    if (st.line) it.push('🗣️ 나: "' + esc(st.line) + '"');
    if (st.adopt && st.level && st.level !== 'x') it.push('🧓 ' + esc(U.rival.name) + ': "' + esc(rebutText(sc, st)) + '"');
    if (st.rebut) it.push('🛡️ 재반박(' + (st.rebutOk ? '성공' : '실패') + '): "' + esc(st.rebut) + '"');
    if (st.adopt) { const o = st.adopt === 'third' ? sc.third : sc.options.find(x => x.th === st.adopt); if (o && o.after && o.after[st.level]) it.push('📜 ' + esc(o.after[st.level])); }
    if (st.elim) it.push('🔥 탈락: ' + esc(TH(st.elim).name));
    (st.twist || []).forEach(x => it.push('⚡ ' + esc(sc.twist.rules[x.i].text)));
    rows.push(`<div class="chron"><div class="ch">장면 ${i + 1} · ${esc(sc.title)}</div>${it.map(x => `<div>${x.startsWith('<b>') || x.startsWith('🎲') || x.startsWith('🌱') ? x : x}</div>`).join('')}</div>`);
  });
  return `<aside class="paper"><div class="ptitle">📜 운나라 연대기</div><p class="small muted" style="margin:0 0 6px">판결문의 근거로 끌어다 쓰세요.</p>${rows.join('') || '<p class="muted small">기록이 없습니다.</p>'}</aside>`;
}
function verdictH(U, run) {
  const F = run.fallen ? U.final.fallen : U.final, R = F.rafts || U.final.rafts, J = JUDGE();
  return `<div class="vgrid"><div class="card" style="margin-top:0"><h2>📜 ${esc(F.title)}</h2>
    ${run.fallen ? '' : `<div class="thc sel" style="cursor:default">${avatar(run.chief, 56)}<div><span class="nm">재상: ${esc(TH(run.chief).name)}</span><div class="small muted">떨어진 책사: ${run.elim.map(id => esc(TH(id).name)).join(', ') || '없음'}</div></div></div>`}
    <table class="rafts"><tr><th>R</th><td><b>역할</b> ${esc(R.R)}</td></tr><tr><th>A</th><td><b>독자</b> ${esc(R.A)}</td></tr><tr><th>F</th><td><b>형식</b> ${esc(R.F)}</td></tr><tr><th>T</th><td><b>주제</b> ${esc(R.T)}</td></tr><tr><th>S</th><td><b>목적</b> ${esc(R.S)}</td></tr></table>
    <h3>꼭 넣을 것</h3><ol class="small" style="margin:0;padding-left:20px">${F.needs.map(n => `<li>${esc(n)}</li>`).join('')}</ol>
    <textarea id="f_verdict" class="inp tall" style="margin-top:10px" placeholder="${esc(R.F)}를 쓰세요. 옆의 연대기를 근거로 쓰면 좋습니다." oninput="A.draft('verdict',this)" onpaste="A.paste('verdict',event)">${esc(run.verdict.text || '')}</textarea>
    <div class="row" id="vcnt" style="margin-top:6px">${verdictLive(run, U)}</div>
    <p class="muted small">✏️ 자동 저장됩니다. 다른 곳에서 붙여 넣은 글은 기록이 남습니다. AI가 쓴 글을 그대로 내면 안 됩니다.</p>
    <button class="btn full big" onclick="A.submitVerdict()">📤 판결문 제출</button></div>${chronicleH(U, run)}</div>`;
}
function doneH(U, run) {
  const rv = !!META.reveal, J = JUDGE(), c = critOf(run, U);
  const sc = MYSCORE || {}; const e = endingOf(run, U, sc, rv);
  const sum = (U.summary || []).map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('');
  return `<div class="card" style="text-align:center"><h2>📤 판결문을 제출했습니다</h2>
    ${rv ? '' : `<p style="font-size:18px">⚖️ <b>판결 발표는 다음 시간에!</b><br><span class="muted">선생님이 판결문을 읽고 결과를 공개하면, 운명이 정해집니다.</span></p>`}
    <div class="row" style="justify-content:center">${CRIT.map(([k, n]) => `<span class="pill ${c[k] ? 'ok' : 'bad'}">${c[k] ? '✓' : '✗'} ${n}</span>`).join('')}</div>
    <div class="row" style="justify-content:center;margin-top:8px"><button class="btn line sm" onclick="A.copyVerdict()">📋 판결문 복사 (하이러닝용)</button></div></div>
    ${rv ? `<div class="card ending ${e.hidden ? 'hidden' : ''}"><div class="e">${e.e}</div>${e.hidden ? '<div class="pill gold">✨ 숨겨진 엔딩</div>' : ''}<div class="t">${esc(e.t)}</div><p>${esc(e.d)}</p>
      ${sc.hl != null ? `<p><b>판결문 점수:</b> ${esc(sc.hl)}점</p>` : ''}${sc.memo ? `<div class="note" style="text-align:left">💬 선생님: ${esc(sc.memo)}</div>` : ''}
      ${!e.hidden && U.hidden ? `<p class="muted small">숨겨진 엔딩이 하나 더 있습니다… (힌트: 판결문 점수, 그리고 "${esc(U.hidden.t)}")</p>` : ''}</div>` : ''}
    ${worldArt(U, run.g)}${gaugesH(U, run)}
    <div class="card"><h3 style="margin-top:0">📚 핵심 개념 정리</h3><table class="sumtbl">${sum}</table></div>
    <div class="card"><h3 style="margin-top:0">🧭 이번 단원에서 바뀐 나의 신념</h3>${BELIEFS.map(b => `<span class="pill ${(run.bd[b.k] || 0) > 0 ? 'main' : ''}">${b.e} ${b.k} +${run.bd[b.k] || 0}</span>`).join('')}</div>`;
}
function recordsH() {
  const mx = Math.max(10, ...BK.map(k => S.beliefs[k] || 0));
  const allT = Object.keys(window.THINKERS || {});
  const runs = Object.entries(S.runs || {}).filter(([id, r]) => r && r.verdict && r.verdict.submittedAt);
  return `<div class="card"><h2>🧭 나의 신념 지표</h2><p class="muted small">단원을 넘어 계속 쌓입니다. 어떤 사상가의 해결책을 택하고 잘 논증했는지에 따라 오릅니다.</p>
    <div class="dist">${BELIEFS.map(b => `<div class="b"><div class="l">${b.e} ${b.k}</div><div class="g"><i style="width:${Math.round((S.beliefs[b.k] || 0) / mx * 100)}%;background:var(--main)"></i></div><div class="n">${S.beliefs[b.k] || 0}</div></div>`).join('')}</div>
    <p class="small muted">${BELIEFS.map(b => b.k + ': ' + b.d).join(' · ')}</p></div>
    <div class="card"><h2>📖 사상가 도감 <span class="muted small">${Object.keys(S.dex).length} / ${allT.length}</span></h2>
    <div class="dex">${allT.map(id => { const d = S.dex[id], t = TH(id); return `<div class="d ${d ? '' : 'no'}">${avatar(id, 64)}<b>${d ? esc(t.name) : '???'}</b><div class="muted">${d ? esc(t.school) : '아직 만나지 않음'}</div>${d ? `<div>${d.mastered ? '🏆 완전 발동' : d.used ? '📜 채택 ' + d.used + '회' : '👀 만남'}</div>` : ''}</div>`; }).join('')}</div></div>
    <div class="card"><h2>🗂️ 나의 판결문 (포트폴리오)</h2>${runs.length ? runs.map(([id, r]) => { const U = unitById(id), c = critOf(r, U);
      return `<div style="border-top:1px solid var(--line);padding-top:10px;margin-top:10px"><div class="row"><b style="flex:1">${esc(U ? U.title : id)}</b><button class="btn sm ${S.pin[id] ? 'gold' : 'line'}" onclick="A.pin('${id}')">${S.pin[id] ? '⭐ 대표작' : '☆ 대표작으로'}</button></div>
      <div class="row">${CRIT.map(([k, n]) => `<span class="pill ${c[k] ? 'ok' : 'bad'}">${c[k] ? '✓' : '✗'} ${n}</span>`).join('')}<span class="muted small">${fmtTime(r.verdict.submittedAt)}</span></div>
      <details><summary class="small">글 보기</summary><div class="wbox">${esc(r.verdict.text)}</div></details></div>`; }).join('') : '<p class="muted">아직 제출한 판결문이 없습니다.</p>'}</div>
    <div class="row"><button class="btn ghost sm" onclick="A.logout()">이 기기에서 나가기</button></div>`;
}

/* ---------- ⑧ 피드백 보내기 (시범 운영용) ---------- */
function fbButton() { return `<button class="fbbtn" onclick="openFB()">💬 피드백</button>`; }
function openFB() {
  const where = MODE === 'teacher' ? '교사:' + (typeof TTAB !== 'undefined' ? TTAB : '') : '학생:' + (curRun() ? curRun().step : STAB);
  const d = document.createElement('div'); d.className = 'ovl'; d.id = 'fbovl';
  d.innerHTML = `<div class="box"><h2>💬 피드백 보내기</h2><p class="muted small">불편한 점, 오류, 좋았던 점을 적어 주세요. 지금 화면(${esc(where)})이 같이 기록됩니다.</p>
    <textarea id="fbtext" class="inp" placeholder="예) 장면 2 재반박이 너무 어려워요 / 버튼이 안 눌려요"></textarea>
    <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="document.getElementById('fbovl').remove()">닫기</button><span class="sp"></span><button class="btn" onclick="sendFB('${esc(where)}')">보내기</button></div></div>`;
  document.body.appendChild(d);
}
async function sendFB(where) {
  const t = (document.getElementById('fbtext').value || '').trim(); if (!t) return toast('내용을 적어 주세요.');
  const id = Date.now().toString(36) + newCode(3);
  await backend.set(P_FB + '/' + id, { t: Date.now(), room: ROOM || '', who: MODE === 'teacher' ? '교사' : (S ? S.num + '번' : '학생'), where, text: t.slice(0, 1000) }).catch(e => toast('전송 실패: ' + e.message));
  document.getElementById('fbovl').remove(); toast('💬 고맙습니다! 전달했어요.');
}

/* ---------- ⑨ 시작 ---------- */
function listenScore() { if (S && MODE === 'student') backend.on(roomPath(ROOM) + '/score/' + S.sid, v => { MYSCORE = v; safeRender(); }); }
async function boot() {
  app.innerHTML = `<div class="wrap"><div class="card">불러오는 중…</div></div>`;
  await initBackend();
  backend.on(P_CONTENT, v => { CONTENT = v || {}; safeRender(); });
  if (MODE === 'teacher') return bootTeacher();
  if (!ROOM) { metaLoaded = true; return render(); }
  backend.on(roomPath(ROOM) + '/meta', v => { META = v || {}; metaLoaded = true; safeRender(); });
  const me = lsGet('dilsi_me_' + ROOM);
  if (me) { S = lsGet('dilsi_S_' + ROOM + '_' + me); if (S) { const remote = await backend.get(roomPath(ROOM) + '/students/' + me).catch(() => null); if (remote === null && DBMODE === 'live' && S.joinedAt) { /* 선생님이 지운 기록 */ lsDel('dilsi_S_' + ROOM + '_' + me); lsDel('dilsi_me_' + ROOM); S = null; } else if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) S = remote; } if (S) listenScore(); }
  if (S) backend.on(roomPath(ROOM) + '/students/' + S.sid, v => { if (v === null && S && DBMODE === 'live') { lsDel('dilsi_S_' + ROOM + '_' + S.sid); lsDel('dilsi_me_' + ROOM); S = null; toast('선생님이 기록을 초기화했어요. 다시 들어오세요.'); safeRender(); } });
  render();
}

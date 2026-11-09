/* =====================================================================
   딜시 — 화면 연출 (fx.js)
   © 김정환 · M.A.D.T (Moral And Digital Teacher)
   사상가 그림(학파별 복장) · 공손연 표정 · 운나라 그림 · 판정 도장 · 효과음 · 배경 이미지
   모두 코드로 그립니다(외부 이미지 없음). app.js 다음에 불러옵니다.
   연출 강도: 반마다 META.fx = 'full'(전체) / 'lite'(간단히) / 'off'(끔)
   효과음:   반마다 META.sound = true/false (기본 꺼짐)
   ===================================================================== */
const fxLv = () => (META && META.fx) || 'full';

/* ---------- 효과음 (Web Audio, 파일 없음) ---------- */
let AC = null;
function snd(type) {
  if (!META || !META.sound || fxLv() === 'off') return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
    const P = { stamp: ['square', 90, 40, 0.25, 0.18], good: ['sine', 520, 880, 0.3, 0.12], bad: ['sawtooth', 220, 90, 0.4, 0.12], alarm: ['square', 880, 660, 0.35, 0.08], heart: ['sine', 70, 50, 0.15, 0.25], flip: ['triangle', 600, 900, 0.08, 0.06] }[type] || ['sine', 440, 440, 0.1, 0.1];
    o.type = P[0]; o.frequency.setValueAtTime(P[1], t); o.frequency.exponentialRampToValueAtTime(Math.max(30, P[2]), t + P[3]);
    g.gain.setValueAtTime(P[4], t); g.gain.exponentialRampToValueAtTime(0.0001, t + P[3]); o.start(t); o.stop(t + P[3] + 0.02);
  } catch (e) { }
}

/* ---------- 사상가 그림: 학파마다 복장이 다름 ---------- */
function avatar(id, size) {
  const t = TH(id); size = size || 56;
  if ((CONTENT.thImg || {})[id]) {
    if (IMG[id]) return `<img class="av" src="${IMG[id]}" alt="${esc(t.name)}" style="width:${size}px;height:${size}px">`;
    if (!IMGREQ[id] && backend) { IMGREQ[id] = 1; backend.get(P_CONTENT + '/img/' + id).then(v => { if (v && v.d) { IMG[id] = v.d; safeRender(); } }).catch(() => { }); }
  }
  const c = t.col || '#7b2d26', sc = t.school || '';
  const kind = id === 'third' ? 'me' : /유가|성리학|실학/.test(sc) ? (/성리학|실학/.test(sc) ? 'gat' : 'ru') : /도가/.test(sc) ? 'dao' : /묵가/.test(sc) ? 'mo' : /법가/.test(sc) ? 'fa' : /불교/.test(sc) ? 'bud' : /그리스|헬레니즘/.test(sc) ? 'greek' : 'modern';
  const robe = { ru: '#f3ead8', gat: '#f5f1e6', dao: '#dfeee2', mo: '#a47551', fa: '#2f3542', bud: '#e8892b', greek: '#f8f8f4', modern: '#3d4a5c', me: '#fff4d6' }[kind];
  const face = `<circle cx="50" cy="44" r="17" fill="#f6dcc0"/><circle cx="44" cy="45" r="1.8" fill="#333"/><circle cx="56" cy="45" r="1.8" fill="#333"/><path d="M45 52 Q50 55 55 52" stroke="#a0522d" stroke-width="1.6" fill="none"/>`;
  const top = {
    ru: `<rect x="34" y="18" width="32" height="14" rx="2" fill="#1f1f1f"/><rect x="31" y="29" width="38" height="5" rx="2" fill="#1f1f1f"/>`,
    gat: `<ellipse cx="50" cy="30" rx="27" ry="5" fill="#1f1f1f" opacity=".9"/><rect x="40" y="16" width="20" height="14" rx="4" fill="#1f1f1f" opacity=".9"/>`,
    dao: `<path d="M33 40 Q50 18 67 40 Q62 28 50 27 Q38 28 33 40Z" fill="#555"/><circle cx="50" cy="20" r="6" fill="#555"/><rect x="47" y="12" width="6" height="3" fill="#8b5a2b"/><path d="M41 54 Q50 76 59 54 Q50 60 41 54Z" fill="#eee"/>`,
    mo: `<path d="M33 40 Q50 22 67 40 Q62 30 50 29 Q38 30 33 40Z" fill="#2b2b2b"/><rect x="32" y="33" width="36" height="5" fill="#b22222"/>`,
    fa: `<rect x="36" y="12" width="28" height="20" rx="3" fill="#111"/><rect x="22" y="20" width="16" height="4" rx="2" fill="#111"/><rect x="62" y="20" width="16" height="4" rx="2" fill="#111"/>`,
    bud: `<circle cx="50" cy="40" r="17.5" fill="#f2d2b0"/>`,
    greek: `<path d="M33 40 Q50 20 67 40 Q60 30 50 30 Q40 30 33 40Z" fill="#6b4f2a"/><path d="M32 34 Q50 24 68 34" stroke="#3a7d44" stroke-width="4" fill="none" stroke-dasharray="4 3"/><path d="M42 55 Q50 66 58 55 Q50 59 42 55Z" fill="#6b4f2a"/>`,
    modern: `<path d="M33 40 Q50 20 67 40 Q63 30 50 29 Q37 30 33 40Z" fill="#2b2b2b"/>`,
    me: `<path d="M33 40 Q50 20 67 40 Q63 30 50 29 Q37 30 33 40Z" fill="#2b2b2b"/><path d="M70 22 L84 8 L88 12 L74 26 Z" fill="#7b2d26"/>`
  }[kind];
  const body = kind === 'mo' ? `<path d="M18 100 Q20 70 50 68 Q80 70 82 100 Z" fill="${robe}"/><path d="M30 80 L70 80" stroke="#6b4a2b" stroke-width="3"/>`
    : kind === 'modern' ? `<path d="M16 100 Q18 68 50 66 Q82 68 84 100 Z" fill="${robe}"/><path d="M44 68 L50 84 L56 68 Z" fill="#fff"/><path d="M49 72 L51 72 L52 90 L48 90Z" fill="#b22222"/>`
    : `<path d="M14 100 Q16 66 50 64 Q84 66 86 100 Z" fill="${robe}"/><path d="M38 66 L50 86 L62 66" stroke="${c}" stroke-width="5" fill="none"/>`;
  return `<svg class="av" width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="${esc(t.name)}">
    <rect x="0" y="0" width="100" height="100" rx="22" fill="${c}"/><rect x="0" y="66" width="100" height="34" fill="rgba(0,0,0,.15)"/>
    ${body}${face}${top}
    <rect x="68" y="68" width="27" height="27" rx="5" fill="#b22222"/><text x="81.5" y="88" text-anchor="middle" font-size="18" font-weight="900" fill="#fff" font-family="serif">${esc(t.hz || '?')}</text></svg>`;
}

/* ---------- 맞수(공손연) 표정: calm / sneer / frown / alarm / nod ---------- */
function rivalFace(mood, size) {
  size = size || 64;
  const brow = { calm: 'M36 38 L46 38 M54 38 L64 38', sneer: 'M36 36 L46 39 M54 33 L64 37', frown: 'M36 35 L46 40 M54 40 L64 35', alarm: 'M36 33 L46 31 M54 31 L64 33', nod: 'M36 38 L46 38 M54 38 L64 38' }[mood] || '';
  const eyes = mood === 'nod' ? '<path d="M38 44 Q42 47 46 44 M54 44 Q58 47 62 44" stroke="#333" stroke-width="2" fill="none"/>' : mood === 'alarm' ? '<circle cx="42" cy="44" r="3" fill="#333"/><circle cx="58" cy="44" r="3" fill="#333"/>' : '<circle cx="42" cy="44" r="2" fill="#333"/><circle cx="58" cy="44" r="2" fill="#333"/>';
  const mouth = { calm: 'M44 58 L56 58', sneer: 'M43 58 Q52 56 58 53', frown: 'M44 60 Q50 55 56 60', alarm: 'M47 57 Q50 64 53 57 Q50 55 47 57Z', nod: 'M44 56 Q50 61 56 56' }[mood] || 'M44 58 L56 58';
  return `<svg class="rf" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#3a3f4b"/>
    <path d="M12 100 Q16 70 50 68 Q84 70 88 100Z" fill="#5c4b3b"/><circle cx="50" cy="45" r="20" fill="#f1d3b3"/>
    <path d="M30 40 Q32 22 50 22 Q68 22 70 40 Q66 30 50 30 Q34 30 30 40Z" fill="#ddd"/>
    <path d="${brow}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>${eyes}
    <path d="M36 60 Q50 92 64 60 Q58 66 50 66 Q42 66 36 60Z" fill="#f5f5f5"/><path d="${mouth}" stroke="#7a3b2e" stroke-width="2.4" fill="${mood === 'alarm' ? '#7a3b2e' : 'none'}" stroke-linecap="round"/></svg>`;
}

/* ---------- 운나라 그림: 성벽(군사) · 창고(국고) · 백성(민심) ---------- */
function worldArt(U, G, D) {
  if (!U.world) return '';
  D = D || {};
  const key = r => Object.keys(U.world).find(k => U.world[k] === r);
  const kw = key('wall'), ks = key('store'), kp = key('people');
  const gw = G[kw] || 0, gs = G[ks] || 0, gp = G[kp] || 0;
  const cracks = gw < 15 ? 4 : gw < 30 ? 3 : gw < 45 ? 2 : gw < 60 ? 1 : 0;
  const crackPath = ['M70 78 L78 92 L72 104', 'M140 74 L132 90 L140 106', 'M110 80 L118 96', 'M175 78 L168 98 L176 110'].slice(0, cracks).map(d => `<path d="${d}" stroke="#2b2b2b" stroke-width="2.5" fill="none"/>`).join('');
  const gap = gw < 15 ? '<rect x="96" y="70" width="34" height="46" fill="#cfe3e8"/>' : '';
  const sacks = Math.round(gs / 10); let sk = '';
  for (let i = 0; i < sacks; i++) { const x = 286 + (i % 5) * 18, y = 106 - Math.floor(i / 5) * 13; sk += `<ellipse cx="${x}" cy="${y}" rx="8" ry="6" fill="#d9b26f" stroke="#8b6a32"/>`; }
  const ppl = Math.round(gp / 8); let pp = '';
  for (let i = 0; i < 12; i++) {
    const x = 410 + (i % 6) * 28, y = 92 + Math.floor(i / 6) * 22, on = i < ppl;
    pp += on ? `<g><circle cx="${x}" cy="${y - 10}" r="5" fill="#f1d3b3"/><rect x="${x - 5}" y="${y - 5}" width="10" height="13" rx="3" fill="${gp < 30 ? '#8a8a8a' : '#c0392b'}"/></g>`
      : `<g opacity=".25"><circle cx="${x + 8}" cy="${y - 10}" r="5" fill="#999"/><rect x="${x + 3}" y="${y - 5}" width="10" height="13" rx="3" fill="#999"/><rect x="${x + 12}" y="${y - 8}" width="7" height="7" fill="#7a5c3a"/></g>`;
  }
  const lab = (x, k) => `<text x="${x}" y="150" text-anchor="middle" font-size="13" font-weight="800" fill="#1d2433">${esc(U.gauges[k].e + ' ' + U.gauges[k].n)} ${G[k]}${D[k] ? ` <tspan fill="${D[k] > 0 ? '#2b8a3e' : '#c92a2a'}">(${D[k] > 0 ? '+' : ''}${D[k]})</tspan>` : ''}</text>`;
  return `<div class="world ${fxLv() === 'full' && Object.values(D).some(v => v <= -10) ? 'hurt' : ''}"><svg viewBox="0 0 600 160">
    <rect width="600" height="160" fill="#eef4f2"/><rect y="116" width="600" height="44" fill="#d8cfbd"/>
    <g><rect x="30" y="70" width="190" height="46" fill="#9c8f7c"/>${[30, 62, 94, 126, 158, 190].map(x => `<rect x="${x}" y="60" width="18" height="12" fill="#9c8f7c"/>`).join('')}<rect x="104" y="88" width="22" height="28" fill="#5b4a36"/>${crackPath}${gap}</g>
    <g><rect x="270" y="64" width="100" height="52" fill="#b98a55"/><polygon points="262,66 320,40 378,66" fill="#7b2d26"/>${sk}</g>
    <g>${pp}</g>
    ${lab(125, kw)}${lab(320, ks)}${lab(490, kp)}
  </svg></div>`;
}

/* ---------- 판정 도장 ---------- */
const STAMP = { a: ['大成功', 'a'], b: ['成功', 'b'], c: ['動搖', 'c'], x: ['無斷', 'c'] };
function stampH(level) { const s = STAMP[level] || STAMP.c; return `<div class="stampwrap"><div class="stamp ${s[1]} ${fxLv() === 'off' ? 'still' : ''}">${s[0]}</div></div>`; }

/* ---------- 장면 배경 (교사가 올린 이미지가 있으면 그것) ---------- */
const BG = {}, BGREQ = {};

function sceneArt(bg, key) {
  if (key && (CONTENT.bgImg || {})[key]) {
    if (BG[key]) return `<div class="art"><img src="${BG[key]}" alt="" style="width:100%;height:auto;display:block;max-height:260px;object-fit:cover"></div>`;
    if (!BGREQ[key] && backend) { BGREQ[key] = 1; getImg('bg', key).then(v => { if (v && v.d) { BG[key] = v.d; safeRender(); } }).catch(() => { }); }
  }
  return sceneArtCode(bg);
}

/* ---------- 결과 화면 숫자 올라가기 ---------- */
function animateNums() {
  if (fxLv() === 'off') return;
  document.querySelectorAll('[data-to]').forEach(el => {
    const a = +el.dataset.from, b = +el.dataset.to; if (a === b) return; const t0 = performance.now(), dur = fxLv() === 'full' ? 900 : 300;
    const step = n => { const p = Math.min(1, (n - t0) / dur); el.textContent = Math.round(a + (b - a) * p); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

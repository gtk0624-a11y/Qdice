/* 펜 메모(폰·태블릿 손글씨) · 끌어서 순서 바꾸기 · 유튜브/유튜브 뮤직 미니 플레이어
   - 펜 메모: 이미지는 이 기기(IDB 'penm')에만 저장됩니다(클라우드 동기화 제외 → 개인정보 안전).
   - 끌어서 순서 바꾸기: 위쪽 메뉴·오늘 게시판 줄·순서 바꾸기 창에서 마우스/손가락/펜으로 끌면 됩니다. */

/* ================= 펜 메모 ================= */
let pnList = null;
const pnLoad = async () => { if (!pnList) { try { pnList = (await idb.get('penm')) || []; } catch (e) { pnList = []; } } return pnList; };
const pnSave = () => idb.set('penm', pnList || []);
const pnThumbs = sc => (pnList || []).filter(x => x.sc === sc).map(x => `<span class="pnt"><img src="${x.img}" alt="손글씨 메모" data-act="penEdit" data-id="${x.id}" loading="lazy"><button type="button" class="x" data-act="penDel" data-id="${x.id}" aria-label="손글씨 메모 지우기">✕</button></span>`).join('');
const penBar = sc => `<div class="penbox" data-sc="${sc}"><button type="button" class="btn sm" data-act="penNew" data-sc="${sc}">✍️ 펜으로 쓰기</button><span class="mu">폰·태블릿은 손가락이나 펜으로, 컴퓨터는 마우스로 쓸 수 있어요</span><span class="penth">${pnThumbs(sc)}</span></div>`;
function pnRefresh() { document.querySelectorAll('.penbox').forEach(b => { const t = b.querySelector('.penth'); if (t) t.innerHTML = pnThumbs(b.dataset.sc); }); }
const _pmpn = pageMemo;
pageMemo = function (page) { const h = _pmpn(page); return h ? h.replace(/<\/details>\s*$/, penBar('p:' + page) + '</details>') : h; };
const _rpn1 = TF.render; TF.render = function () { const v = _rpn1.apply(this, arguments); pnLoad().then(pnRefresh); return v; };

function pnOpen(sc, id) {
  const cur = id && (pnList || []).find(x => x.id === id), cols = ['#222222', '#d32f2f', '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a'];
  const d = document.createElement('dialog'); d.className = 'dlg pndlg';
  d.innerHTML = `<form method="dialog"><h3>✍️ 펜으로 메모</h3>
  <div class="pnbar">${cols.map((c, i) => `<button type="button" class="pnc ${i === 0 ? 'on' : ''}" data-pc="${c}" style="background:${c}" aria-label="펜 색 ${i + 1}"></button>`).join('')}
  <label class="mu">굵기 <input type="range" min="1" max="14" value="3" id="pnw"></label>
  <button type="button" class="btn sm" data-pt="pen">✏️ 펜</button><button type="button" class="btn sm" data-pt="era">🧽 지우개</button><button type="button" class="btn sm" data-pt="undo">↩ 되돌리기</button><button type="button" class="btn sm" data-pt="clr">🗑 모두 지우기</button></div>
  <canvas class="pncv" aria-label="손글씨 메모 칸"></canvas><p class="mu">펜(스타일러스)을 쓰면 손바닥이 닿아도 번지지 않아요. 저장하면 메모 아래에 작은 그림으로 남고, 누르면 다시 고칠 수 있어요.</p>
  <div class="btns"><button value="ok" class="pri">저장</button><button value="cancel" formnovalidate>취소</button></div></form>`;
  document.body.appendChild(d); d.showModal();
  const cv = d.querySelector('canvas'), W = Math.min(innerWidth - 56, 760), H = innerWidth < 600 ? 360 : 420, dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round';
  const PAPER = '#fffef2', clear = () => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAPER; g.fillRect(0, 0, cv.width, cv.height); g.restore(); };
  clear();
  if (cur) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, W, H); im.src = cur.img; }
  let col = cols[0], era = false, penSeen = false, drawing = false, last = null; const hist = [];
  const snap = () => { try { hist.push(g.getImageData(0, 0, cv.width, cv.height)); if (hist.length > 25) hist.shift(); } catch (e) { } };
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure }; };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'pen') penSeen = true; if (e.pointerType === 'touch' && penSeen) return; /* 펜을 쓰는 중이면 손바닥(터치)은 무시 */
    e.preventDefault(); snap(); drawing = true; last = pt(e); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    g.fillStyle = era ? PAPER : col; g.beginPath(); g.arc(last.x, last.y, Math.max(.8, (+d.querySelector('#pnw').value * (era ? 4 : 1)) / 2), 0, 7); g.fill();
  });
  cv.addEventListener('pointermove', e => {
    if (!drawing) return; if (e.pointerType === 'touch' && penSeen) return; e.preventDefault();
    const base = +d.querySelector('#pnw').value * (era ? 4 : 1);
    (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(ev => {
      const q = pt(ev), mid = { x: (last.x + q.x) / 2, y: (last.y + q.y) / 2 };
      g.strokeStyle = era ? PAPER : col; g.lineWidth = Math.max(.8, e.pointerType === 'pen' && q.p > 0 ? base * (.4 + q.p * 1.2) : base);
      g.beginPath(); g.moveTo(last.x, last.y); g.quadraticCurveTo(last.x, last.y, mid.x, mid.y); g.stroke(); last = q;
    });
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cv.addEventListener(t, () => { drawing = false; }));
  d.addEventListener('click', e => {
    const c = e.target.closest('[data-pc]'), t = e.target.closest('[data-pt]');
    if (c) { col = c.dataset.pc; era = false; d.querySelectorAll('.pnc').forEach(x => x.classList.toggle('on', x === c)); }
    if (t) { const k = t.dataset.pt; if (k === 'pen') era = false; else if (k === 'era') era = true; else if (k === 'undo') { const h = hist.pop(); if (h) g.putImageData(h, 0, 0); } else if (k === 'clr') { snap(); clear(); } }
  });
  d.addEventListener('close', async () => {
    if (d.returnValue === 'ok') {
      await pnLoad(); const img = cv.toDataURL('image/png');
      if (cur) cur.img = img; else pnList.push({ id: uid(), sc, at: Date.now(), img });
      await pnSave(); pnRefresh(); toast('손글씨 메모를 저장했습니다.');
    }
    d.remove();
  });
}
Object.assign(A, {
  async penNew(el) { await pnLoad(); pnOpen(el.dataset.sc); },
  async penEdit(el) { await pnLoad(); const x = pnList.find(n => n.id === el.dataset.id); if (x) pnOpen(x.sc, x.id); },
  async penDel(el) { await pnLoad(); sure('이 손글씨 메모를 지울까요?', async () => { pnList = pnList.filter(n => n.id !== el.dataset.id); await pnSave(); pnRefresh(); toast('지웠습니다.'); }); }
});

/* ================= 끌어서 순서 바꾸기 ================= */
let drJust = 0;
const drBlock = ev => ev.preventDefault();
document.addEventListener('click', e => { if (Date.now() - drJust < 400 || (e.target.closest && e.target.closest('.drg'))) { e.preventDefault(); e.stopPropagation(); } }, true);
document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('nav.nav, .ordr, details.row')) e.preventDefault(); }, true);
function drBegin(item, e, o) {
  const sx = e.clientX, sy = e.clientY, par = item.parentNode, touchHold = e.pointerType === 'touch' && o.hold; let on = false, timer = null;
  const act = () => { on = true; item.classList.add('drgng'); document.body.classList.add('drgbody'); document.addEventListener('touchmove', drBlock, { passive: false }); if (navigator.vibrate) { try { navigator.vibrate(15); } catch (x) { } } };
  const mv = ev => {
    if (ev.pointerId !== e.pointerId) return;
    if (!on) { const dist = Math.hypot(ev.clientX - sx, ev.clientY - sy); if (touchHold) { if (dist > 8) end(true); return; } if (dist < 6) return; act(); }
    ev.preventDefault();
    const over = [...par.children].find(c => { if (c === item || !c.matches(o.sel)) return false; const q = c.getBoundingClientRect(); return (o.axis === 'y' || (ev.clientX >= q.left && ev.clientX <= q.right)) && (o.axis === 'x' || (ev.clientY >= q.top && ev.clientY <= q.bottom)); });
    if (!over) return;
    const r = over.getBoundingClientRect(); let after = o.axis === 'x' ? ev.clientX > r.left + r.width / 2 : ev.clientY > r.top + r.height / 2;
    if (o.fixedLast && over.matches(o.fixedLast) && after) after = false; /* 설정 메뉴는 항상 맨 끝 */
    par.insertBefore(item, after ? over.nextSibling : over);
  };
  const up = ev => { if (ev.pointerId === e.pointerId) end(false); };
  const cancel = ev => { if (ev.pointerId === e.pointerId) end(!on); };
  function end(abort) {
    clearTimeout(timer); document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel); document.removeEventListener('touchmove', drBlock);
    if (on) { item.classList.remove('drgng'); document.body.classList.remove('drgbody'); drJust = Date.now(); if (!abort) o.done(par); }
  }
  document.addEventListener('pointermove', mv, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancel);
  if (touchHold) timer = setTimeout(act, o.hold);
}
function drMerge(kind, keys) {
  const l = ordList(kind), pos = l.map((k, i) => keys.includes(k) ? i : -1).filter(i => i >= 0), nl = l.slice(), ks = keys.filter(k => l.includes(k));
  pos.forEach((p, i) => { nl[p] = ks[i]; }); S.order = S.order || {}; S.order[kind] = nl; save(true);
}
document.addEventListener('pointerdown', e => {
  if (e.button > 0 || !e.target.closest) return;
  const nav = e.target.closest('nav.nav a[href^="#/"]'), h = e.target.closest('.drg'), ordr = h && h.closest('.ordr');
  if (ordr) { drBegin(ordr, e, { sel: '.ordr', axis: 'y', hold: 0, done: par => { const kind = ordr.dataset.ok.split('|')[0]; drMerge(kind, [...par.querySelectorAll('.ordr')].filter(x => x.dataset.ok.startsWith(kind + '|')).map(x => x.dataset.ok.split('|')[1])); } }); return; }
  if (h && h.closest('details.row')) { const row = h.closest('details.row'); drBegin(row, e, { sel: 'details.row', axis: 'y', hold: 0, done: par => drMerge('rows', [...par.children].filter(x => x.matches && x.matches('details.row')).map(x => x.dataset.k)) }); return; }
  if (nav && nav.getAttribute('href') !== '#/set') drBegin(nav, e, { sel: 'a[href^="#/"]', axis: 'x', hold: 350, fixedLast: 'a[href="#/set"]', done: par => drMerge('nav', [...par.querySelectorAll('a[href^="#/"]')].map(a => a.getAttribute('href').slice(2)).filter(k => k !== 'set')) });
}, true);
/* 오늘 게시판 줄 머리에 끌기 손잡이(⠿) 붙이기 */
const _rowpn = row;
row = function () { const h = _rowpn.apply(this, arguments); return h ? h.replace('<summary>', '<summary><span class="drg" title="끌어서 순서 바꾸기" aria-label="끌어서 순서 바꾸기">⠿</span>') : h; };
/* 「화면 순서 바꾸기」 창: 줄마다 끌기 손잡이 */
const _ordPick = A.ordPick;
A.ordPick = function () {
  _ordPick.apply(this, arguments);
  const d = [...document.querySelectorAll('dialog.dlg')].pop(); if (!d) return;
  const dec = () => { d.querySelectorAll('.ordr').forEach(r => { if (r.dataset.ok) return; const b = r.querySelector('[data-ord]'); if (!b) return; const [kind, k] = b.dataset.ord.split('|'); r.dataset.ok = kind + '|' + k; r.insertAdjacentHTML('afterbegin', '<span class="drg" title="끌어서 옮기기">⠿</span>'); }); };
  dec(); new MutationObserver(dec).observe(d.querySelector('.ordbox'), { childList: true });
  const p = d.querySelector('.mu'); if (p) p.textContent = '⠿ 손잡이를 끌거나 ▲▼를 누르면 바로 저장됩니다. 설정 메뉴는 항상 맨 끝에 있습니다. 위 버튼으로 한 번에 맞출 수도 있습니다.';
};

/* ================= 유튜브 · 유튜브 뮤직 ================= */
const ytGet = () => { try { return JSON.parse(localStorage.getItem('tf.yt') || '{}'); } catch (e) { return {}; } };
const ytPut = o => { try { localStorage.setItem('tf.yt', JSON.stringify(o)); } catch (e) { } };
function ytEmbed(u) {
  u = String(u || '').trim(); const list = (u.match(/[?&]list=([\w-]+)/) || [])[1], vid = (u.match(/(?:[?&]v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || [])[1];
  if (vid && list) return `https://www.youtube-nocookie.com/embed/${vid}?list=${list}&autoplay=1&playsinline=1`;
  if (list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&autoplay=1&playsinline=1`;
  if (vid) return `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&playsinline=1`;
  return '';
}
function ytFavs() { const f = ytGet().fav || []; return f.length ? f.map((x, i) => `<span class="ytf"><button type="button" class="btn sm" data-act="ytPlayFav" data-i="${i}">▶ ${esc(x.n)}</button><button type="button" class="x" data-act="ytFavDel" data-i="${i}" aria-label="즐겨찾기 지우기">✕</button></span>`).join('') : '<span class="mu">즐겨찾기가 비어 있어요. 링크를 재생한 뒤 ★ 저장을 누르세요.</span>'; }
function ytDraw() {
  const on = S.setup && S.profile.ytBtn !== false; let fab = document.getElementById('ytfab'), pan = document.getElementById('ytpan');
  if (!on) { if (fab) fab.remove(); if (pan) pan.remove(); return; }
  if (!fab) { fab = document.createElement('button'); fab.id = 'ytfab'; fab.type = 'button'; fab.dataset.act = 'ytTog'; fab.setAttribute('aria-label', '유튜브·유튜브 뮤직 열기'); fab.textContent = '🎵'; document.body.appendChild(fab); }
  if (!pan) {
    pan = document.createElement('div'); pan.id = 'ytpan'; pan.hidden = true;
    pan.innerHTML = `<div class="yth"><b>🎵 유튜브 · 유튜브 뮤직</b><button type="button" class="x" data-act="ytTog" aria-label="닫기(음악은 계속 나와요)">✕</button></div>
    <div class="ytlk"><a class="btn sm" href="https://www.youtube.com/" target="_blank" rel="noopener">▶ 유튜브 열기</a><a class="btn sm" href="https://music.youtube.com/" target="_blank" rel="noopener">🎧 유튜브 뮤직 열기</a></div>
    <form data-form="ytgo" class="ytfm"><input name="u" placeholder="유튜브·유튜브 뮤직 링크 붙여넣기 (영상·재생목록)" aria-label="유튜브 링크"><button class="btn sm pri">▶ 여기서 재생</button></form>
    <form data-form="ytsr" class="ytfm"><input name="q" placeholder="검색어 (예: 잔잔한 피아노)" aria-label="검색어"><button class="btn sm" name="w" value="y">유튜브 검색</button><button class="btn sm" name="w" value="m">뮤직 검색</button></form>
    <div id="ytfr"></div><div class="ytact"><button type="button" class="btn sm" data-act="ytFav">★ 저장</button><button type="button" class="btn sm" data-act="ytStop">⏹ 정지</button></div><div class="ytfv" id="ytfv">${ytFavs()}</div>
    <p class="mu">유튜브 뮤직 자체는 사이트 정책상 이 안에 넣을 수 없어 새 창으로 열립니다. 뮤직 링크를 붙여넣으면 이 안에서도 재생돼요. 닫기(✕)를 눌러도 음악은 계속 나옵니다.</p>`;
    document.body.appendChild(pan);
  }
}
Object.assign(A, {
  ytTog() { ytDraw(); const p = document.getElementById('ytpan'); if (p) p.hidden = !p.hidden; },
  ytStop() { const f = document.getElementById('ytfr'); if (f) f.innerHTML = ''; const o = ytGet(); delete o.cur; ytPut(o); },
  ytFav() { const o0 = ytGet(); if (!o0.cur) return toast('먼저 링크를 재생해 주세요.'); ask('즐겨찾기 이름', [{ k: 'n', label: '이름', val: '내 음악', req: 1 }], v => { const o = ytGet(), n = (v.n || '').trim(); if (!n) return; o.fav = (o.fav || []).concat([{ n, u: o.cur }]).slice(-12); ytPut(o); const e = document.getElementById('ytfv'); if (e) e.innerHTML = ytFavs(); toast('저장했습니다.'); }); },
  ytPlayFav(el) { const f = (ytGet().fav || [])[+el.dataset.i]; if (f) ytPlay(f.u); },
  ytFavDel(el) { const o = ytGet(); (o.fav = o.fav || []).splice(+el.dataset.i, 1); ytPut(o); document.getElementById('ytfv').innerHTML = ytFavs(); }
});
function ytPlay(u) {
  const src = ytEmbed(u); if (!src) return toast('영상이나 재생목록 링크가 아니에요. 유튜브에서 주소를 복사해 붙여넣어 주세요.');
  const f = document.getElementById('ytfr'); f.innerHTML = `<iframe src="${src}" title="유튜브 플레이어" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  const o = ytGet(); o.cur = u; ytPut(o);
}
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('form[data-form="ytgo"],form[data-form="ytsr"]'); if (!f) return; e.preventDefault(); e.stopPropagation();
  const v = new FormData(f);
  if (f.dataset.form === 'ytgo') ytPlay(v.get('u'));
  else { const q = encodeURIComponent((v.get('q') || '').trim()), w = (e.submitter && e.submitter.value) || 'y'; if (!q) return; window.open(w === 'm' ? 'https://music.youtube.com/search?q=' + q : 'https://www.youtube.com/results?search_query=' + q, '_blank', 'noopener'); }
}, true);
const ytCard = () => `<div class="dset"><label class="chk"><input type="checkbox" data-dset="ytBtn" ${S.profile.ytBtn !== false ? 'checked' : ''}> <b>🎵 유튜브·유튜브 뮤직 버튼</b> — 화면 왼쪽 아래 🎵 버튼으로 링크를 붙여넣어 바로 재생하고, 유튜브/뮤직을 새 창으로 열 수 있어요. (선택)</label></div>
  `;
const _dcpn = decoCard;
decoCard = function () { const h = _dcpn(); return h.replace('<div class="dset"><b>💻 컴퓨터 켜면', ytCard() + '<div class="dset"><b>💻 컴퓨터 켜면'); };
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.dset === 'ytBtn') setTimeout(ytDraw, 0); });
const _rpn2 = TF.render; TF.render = function () { const v = _rpn2.apply(this, arguments); ytDraw(); return v; };
if (S.setup) ytDraw();

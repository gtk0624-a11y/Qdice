/* 포스트잇: 중요한 일정을 화면 가장자리에 포스트잇 모양으로 붙여 두고, 화면을 가리면 내리기(접기·모두 내리기). 관리는 오늘 화면의 「오늘 메모」 안에서 합니다. */
const PST_COL = { 노랑: '#fff176', 분홍: '#ffb3c7', 하늘: '#a7d8ff', 초록: '#b9f0b1', 주황: '#ffcc80' };
const pstList = () => (S.postits = Array.isArray(S.postits) ? S.postits : []);
const pstDown = () => !!S.profile.pstDown;
function pstDday(x) { if (!x.date) return ''; const n = dd(x.date); return n === 0 ? '오늘' : n > 0 ? 'D-' + n : 'D+' + (-n); }
function pstSorted() { return pstList().filter(x => !x.done).sort((a, b) => (a.date || '9').localeCompare(b.date || '9')); }
function pstDraw() {
  let L = document.getElementById('pstLayer'); if (!S.setup) { if (L) L.remove(); return; }
  if (!L) { L = document.createElement('div'); L.id = 'pstLayer'; document.body.appendChild(L); }
  const N = pstSorted(), down = pstDown(); L.className = down ? 'down' : '';
  if (!N.length) { L.innerHTML = ''; return; }
  let slot = 0;
  L.innerHTML = `<button class="pst-tray" data-act="pstToggle" aria-label="${down ? '포스트잇 올리기' : '포스트잇 모두 내리기'}" aria-expanded="${!down}">📌 ${N.length}${down ? ' ▲ 올리기' : ' ▼ 내리기'}</button>` + (down ? '' : N.map(x => {
    const late = x.date && dd(x.date) < 0, pos = x.x != null ? `left:${x.x}px;top:${x.y}px;` : `right:12px;top:${190 + slot++ * (x.min ? 34 : 100)}px;`;
    return `<div class="pst ${x.min ? 'min' : ''} ${late ? 'late' : ''}" data-id="${x.id}" style="${pos}background:${PST_COL[x.color] || PST_COL['노랑']};--rot:${((x.id.charCodeAt(x.id.length - 1) % 5) - 2)}deg"><div class="ph" title="끌어서 옮길 수 있어요"><b>${x.date ? esc(md(x.date)) + ' · ' + pstDday(x) : '메모'}</b><span><button data-act="pstMin" data-id="${x.id}" aria-label="${x.min ? '펼치기' : '접기'}">${x.min ? '▢' : '–'}</button><button data-act="pstDone" data-id="${x.id}" aria-label="완료(내리기)">✓</button></span></div>${x.min ? '' : `<div class="pt">${esc(x.text)}</div>`}</div>`;
  }).join(''));
}
function pstManage() {
  const all = pstList(), ev = allEvents().filter(e => e.date >= today() && !e.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 25);
  return `<div class="pstm"><b>📌 포스트잇</b> <span class="mu">중요한 일정을 화면에 바로 붙여 두세요. 가리면 [내리기]를 누르면 됩니다.</span>
  <form class="inl" data-form="pstAdd"><input name="text" placeholder="붙일 내용 (예: 4교시 후 학폭위 자료 제출)" required aria-label="포스트잇 내용"><input type="date" name="date" aria-label="날짜(선택)"><select name="color" aria-label="색">${Object.keys(PST_COL).map(c => `<option>${c}</option>`).join('')}</select><button class="btn pri">붙이기</button></form>
  ${ev.length ? `<form class="inl" data-form="pstFromEv"><select name="ev" aria-label="일정에서 고르기">${ev.map((e, i) => `<option value="${i}">${md(e.date)} · ${esc(e.t)} (${esc(e.kind)})</option>`).join('')}</select><button class="btn">일정에서 포스트잇 만들기</button></form>` : ''}
  <div class="tools"><button class="btn sm" data-act="pstToggle">${pstDown() ? '⬆ 포스트잇 올리기' : '⬇ 포스트잇 모두 내리기'}</button>${all.some(x => x.done) ? '<button class="btn sm" data-act="pstClear">완료한 것 비우기</button>' : ''}</div>
  ${all.map(x => `<p class="fbl ${x.done ? 'dn' : ''}"><span class="pst-dot" style="background:${PST_COL[x.color] || PST_COL['노랑']}"></span>${x.date ? esc(md(x.date)) + ' ' + pstDday(x) + ' · ' : ''}${esc(x.text)} ${x.done ? '<button class="x" data-act="pstUndo" data-id="' + x.id + '">다시 붙이기</button>' : ''}<button class="x" data-act="pstDel" data-id="${x.id}">삭제</button></p>`).join('')}</div>`;
}
const _pmemo0 = pageMemo;
pageMemo = function (page) { const h = _pmemo0(page); if (page !== 'today') return h; return h.replace('<small>', '<span class="pstbadge">📌 포스트잇 기능 있어요</span> <small>').replace(/<\/details>\s*$/, pstManage() + '</details>').replace('<details class="pmemo" ', pstList().length ? '<details class="pmemo" open ' : '<details class="pmemo" '); };
const pstId = () => uid();
Object.assign(A, {
  pstToggle() { S.profile.pstDown = !pstDown(); save(); pstDraw(); const b = document.querySelector('.pstm [data-act=pstToggle]'); if (b) b.textContent = pstDown() ? '⬆ 포스트잇 올리기' : '⬇ 포스트잇 모두 내리기'; },
  pstMin(el) { const x = pstList().find(n => n.id === el.dataset.id); if (x) { x.min = !x.min; save(); pstDraw(); } },
  pstDone(el) { const x = pstList().find(n => n.id === el.dataset.id); if (x) { x.done = true; commit(); toast('포스트잇을 내렸습니다. (오늘 메모 안에서 다시 붙일 수 있어요)'); } },
  pstUndo(el) { const x = pstList().find(n => n.id === el.dataset.id); if (x) { x.done = false; S.profile.pstDown = false; commit(); } },
  pstDel(el) { S.postits = pstList().filter(n => n.id !== el.dataset.id); commit(); },
  pstClear() { S.postits = pstList().filter(n => !n.done); commit(); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('form[data-form]'); if (!f) return; const k = f.dataset.form;
  if (k === 'pstAdd') { e.preventDefault(); const o = Object.fromEntries(new FormData(f)); pstList().push({ id: pstId(), text: o.text.trim(), date: o.date || '', color: o.color, done: false }); S.profile.pstDown = false; commit(); }
  else if (k === 'pstFromEv') { e.preventDefault(); const ev = allEvents().filter(x => x.date >= today() && !x.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 25)[+new FormData(f).get('ev')]; if (ev) { pstList().push({ id: pstId(), text: ev.t, date: ev.date, color: '노랑', done: false }); S.profile.pstDown = false; commit(); toast('포스트잇으로 붙였습니다.'); } }
}, true);
/* 끌어서 옮기기 */
let _pd = null;
document.addEventListener('pointerdown', e => { const h = e.target.closest && e.target.closest('.pst .ph'); if (!h || e.target.closest('button')) return; const n = h.closest('.pst'), r = n.getBoundingClientRect(); _pd = { n, dx: e.clientX - r.left, dy: e.clientY - r.top }; n.setPointerCapture && n.setPointerCapture(e.pointerId); n.style.right = 'auto'; n.style.left = r.left + 'px'; n.style.top = r.top + 'px'; e.preventDefault(); });
document.addEventListener('pointermove', e => { if (!_pd) return; const w = _pd.n.offsetWidth, hh = _pd.n.offsetHeight; _pd.n.style.left = Math.max(0, Math.min(innerWidth - w, e.clientX - _pd.dx)) + 'px'; _pd.n.style.top = Math.max(0, Math.min(innerHeight - hh, e.clientY - _pd.dy)) + 'px'; });
document.addEventListener('pointerup', () => { if (!_pd) return; const x = pstList().find(n => n.id === _pd.n.dataset.id); if (x) { x.x = parseInt(_pd.n.style.left); x.y = parseInt(_pd.n.style.top); save(true); } _pd = null; });
const _r1 = TF.render; TF.render = function () { const v = _r1.apply(this, arguments); pstDraw(); return v; };
if (S.setup) pstDraw();

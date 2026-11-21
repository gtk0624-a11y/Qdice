/* 날짜 화면: 캘린더(또는 작은 달력)에서 날짜를 누르면 그 날의 페이지가 떠서 일정·할 일·업무 입력, 메모, 스티커 꾸미기, 사진 올리기를 한곳에서 합니다.
   (아래쪽 기존 칸은 그대로 둡니다.) 사진 원본은 이 기기 IDB 'dimg:<id>'에, 목록만 S.dayImg 에 저장됩니다. */
S.dayImg = S.dayImg || {};
const DIMG = {};
let DP = null;
const dpWeek = ds => DOW[new Date(ds + 'T00:00:00').getDay()];
const dpShift = (ds, n) => { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function dpList(ds) {
  const ev = allEvents().filter(e => e.date === ds);
  return ev.map(e => e.id ? `<div class="td ${e.done ? 'dn' : ''}"><button class="ck" data-act="tog" data-id="${e.id}" aria-pressed="${!!e.done}" aria-label="완료 표시"></button><span class="tl">${esc(e.t)}</span><span class="mu">${esc(e.kind)}</span><button class="x" data-act="dpPst" data-id="${e.id}" aria-label="포스트잇으로 붙이기" title="포스트잇으로 붙이기">📌</button>${xbtn('delItem', e.id)}</div>` : `<div class="td"><span class="ck off"></span><span class="tl">${esc(e.t)}</span><span class="mu">${esc(e.kind)}</span></div>`).join('') || '<p class="mu">이 날은 비어 있습니다. 위에서 바로 추가하세요.</p>';
}
function dpStk(ds) { const L = (S.stk || {})[ds] || []; return `<div class="dpsk">${L.map((s, i) => `<span class="sk big">${stkHtml(s)}<button class="x" data-act="stkDayDel" data-d="${ds}" data-i="${i}" aria-label="스티커 떼기">✕</button></span>`).join('') || '<span class="mu">아직 붙인 스티커가 없습니다.</span>'}</div>`; }
async function dpImgs(ds) {
  const L = (S.dayImg || {})[ds] || [], box = document.getElementById('dpImg'); if (!box) return;
  for (const m of L) if (!DIMG[m.id]) { try { DIMG[m.id] = await idb.get('dimg:' + m.id); } catch (e) { } }
  if (!document.getElementById('dpImg')) return;
  box.innerHTML = L.map(m => `<span class="dpim"><img src="${DIMG[m.id] || ''}" alt="${esc(m.name || '사진')}" data-dpbig="${m.id}"><button class="x" data-act="dpImgDel" data-d="${ds}" data-id="${m.id}" aria-label="사진 지우기">✕</button></span>`).join('') || '<span class="mu">아직 올린 사진이 없습니다.</span>';
}
function dpDraw(full) {
  const d = document.getElementById('daypg'); if (!d || !DP) return; const ds = DP;
  if (full) {
    d.innerHTML = `<div class="dph"><button class="btn sm" data-act="dpMove" data-n="-1" aria-label="전날">‹</button><b>${md(ds)} (${dpWeek(ds)})${ds === today() ? ' · 오늘' : ''}</b><button class="btn sm" data-act="dpMove" data-n="1" aria-label="다음날">›</button><button class="btn sm dpclose" data-act="dpClose" aria-label="닫기">✕ 닫기</button></div>
    <form class="dpf"><input name="title" placeholder="일정·할 일·업무 (예: 7교시 도박예방교육) Enter" required aria-label="내용"><input type="time" name="time" aria-label="시각(선택)"><select name="kind" aria-label="종류" data-cus="kind" data-work="1">${cusKindOpts(true, 'event')}</select><select name="per" aria-label="교시(선택)"><option value="">교시 없음</option>${[1,2,3,4,5,6,7].map(n => `<option value="${n}">${n}교시</option>`).join('')}</select><label class="chk dppst"><input type="checkbox" name="pst"> 📌 포스트잇으로도 붙이기 <span class="mu">(화면 오른쪽에 쪽지로 떠요 · 선택)</span></label><button class="btn pri">추가</button></form>
    <div id="dpList"></div>
    <label class="dmemo">📝 메모<textarea data-dmemo="${ds}" rows="4" placeholder="이 날 기억할 것·준비물·회의 내용 (쓰면 바로 저장됩니다)">${esc((S.dayMemo || {})[ds] || '')}</textarea></label><button class="btn sm" data-act="memoPick">🎨 메모 디자인</button>${typeof penBar === 'function' ? penBar('d:' + ds) : ''}
    <h4 class="dph4">📷 사진</h4><div id="dpStk"></div><div class="tools"><label class="btn sm file">📸 바로 찍기<input type="file" id="dpCam" accept="image/*" capture="environment" hidden></label><label class="btn sm file">🖼 사진·이미지 올리기<input type="file" id="dpUp" accept="image/*" multiple hidden></label></div><p class="mu dpsc">📷 손글씨 사진으로 일정 추가</p><div class="tools"><label class="btn sm file">📸 바로 찍기<input type="file" id="scCam" accept="image/*" capture="environment" hidden></label><label class="btn sm file">🖼 앨범에서 고르기<input type="file" id="scUp" accept="image/*" hidden></label></div><div id="dpImg" class="dpimg"></div><p class="mu">사진은 이 기기에만 저장되고 클라우드 동기화에는 들어가지 않습니다.</p>`;
  }
  d.querySelector('#dpList').innerHTML = dpList(ds); d.querySelector('#dpStk').innerHTML = dpStk(ds); dpImgs(ds);
}
function dayOpen(ds) {
  DP = ds; UI.day = ds; let d = document.getElementById('daypg');
  if (!d) { d = document.createElement('dialog'); d.id = 'daypg'; d.className = 'dlg daypg'; document.body.appendChild(d); d.addEventListener('close', () => { DP = null; d.remove(); render(); }); d.addEventListener('click', e => { const im = e.target.closest('[data-dpbig]'); if (im) { const w = window.open(); if (w) { w.document.write(`<img src="${DIMG[im.dataset.dpbig]}" style="max-width:100%">`); w.document.close(); } } }); }
  dpDraw(true); if (!d.open) d.showModal();
}
Object.assign(A, {
  dpPst(el) { const it = S.items.find(x => x.id === el.dataset.id); if (!it) return; pstList().push({ id: pstId(), text: it.title, date: it.date, color: '노랑', done: false }); S.profile.pstDown = false; commit(); toast('포스트잇으로 붙였습니다.'); },
  dpClose() { const d = document.getElementById('daypg'); if (d) d.close(); },
  dpMove(el) { dayOpen(dpShift(DP, +el.dataset.n)); },
  dpImgDel(el) { sure('이 사진을 지울까요?', async () => { const l = S.dayImg[el.dataset.d] || []; S.dayImg[el.dataset.d] = l.filter(m => m.id !== el.dataset.id); if (!S.dayImg[el.dataset.d].length) delete S.dayImg[el.dataset.d]; delete DIMG[el.dataset.id]; await idb.del('dimg:' + el.dataset.id); commit(); }); }
});
/* 바깥(어두운 배경) 누르면 닫기 — 노션처럼 */
document.addEventListener('click', e => { const d = e.target; if (d && d.tagName === 'DIALOG' && d.classList.contains('daypg')) { const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); } });
const _calDay0 = A.calDay; A.calDay = function (el) { _calDay0(el); dayOpen(el.dataset.d); };
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('form.dpf'); if (!f) return; e.preventDefault();
  const o = Object.fromEntries(new FormData(f)); let title = o.title.trim(); if (!title) return;
  const mk = cusMk(o.kind, title, o.per); if (o.time) mk.title = o.time + ' ' + mk.title;
  S.items.push({ id: uid(), date: DP, done: false, ...mk }); if (o.pst) { pstList().push({ id: pstId(), text: mk.title, date: DP, color: '노랑', done: false }); S.profile.pstDown = false; }
  commit(); toast('캘린더' + (S.items[S.items.length - 1].per || cusPers(S.items[S.items.length - 1]).length ? '·시간표' : '') + '에 반영했습니다.'); const i = document.querySelector('#daypg [name=title]'); if (i) { i.value = ''; i.focus(); }
}, true);
document.addEventListener('change', async e => {
  const t = e.target; if (t.id !== 'dpUp' && t.id !== 'dpCam') return; const ds = DP, files = [...t.files]; t.value = '';
  for (const f of files) {
    try { const url = await new Promise((res, rej) => { const im = new Image(), u = URL.createObjectURL(f); im.onload = () => { const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.8)); }; im.onerror = () => rej(); im.src = u; });
      const id = uid(); await idb.set('dimg:' + id, url); DIMG[id] = url; (S.dayImg[ds] = S.dayImg[ds] || []).push({ id, name: f.name }); } catch (er) { toast('「' + f.name + '」 사진을 읽지 못했습니다.'); }
  }
  save(); if (DP === ds) { dpDraw(false); } render(); toast('사진을 올렸습니다.');
}, true);
/* 렌더 후: 열려 있는 날짜 화면 새로고침, 달력 칸에 작은 표시(스티커 최대 2개·사진·메모) */
function cellMarks() {
  document.querySelectorAll('.cd[data-d]').forEach(c => { const ds = c.dataset.d, sk = '', im = (S.dayImg || {})[ds]; c.querySelector('.cdk')?.remove(); if (sk || im) { const s = document.createElement('span'); s.className = 'cdk'; s.innerHTML = sk + (im ? '<span class="sk">🖼</span>' : ''); c.appendChild(s); } });
}
const _r3 = TF.render; TF.render = function () { const v = _r3.apply(this, arguments); cellMarks(); if (DP && document.getElementById('daypg')) dpDraw(false); return v; };

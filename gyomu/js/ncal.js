/* 노션식 캘린더(v126): 월~일 달력 칸 안에 카드(제목·완료·구분·메모), 카드를 누르면 가운데 창에서 바로 수정, 「다가오는 내 업무」 보기.
   기존 calView 를 대체합니다(학사일정 가져오기·날짜 메모·기록 이동은 그대로). 일정에 memo 칸이 새로 생깁니다. */
const NC_COL = k => (typeof CAL_KINDS !== 'undefined' && CAL_KINDS[k]) || '#e8e4dc';
function ncKindVal(i) { return i.tag && cusKinds().some(k => k.n === i.tag) ? 'c:' + i.tag : (i.cat === 'todo' ? 'todo' : 'event'); }
function ncKindSel(i) {
  const base = [['event', '일정'], ['todo', '할 일']].concat(cusKinds().map(k => ['c:' + k.n, k.n])), cur = ncKindVal(i);
  return base.map(([v, n]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(n)}</option>`).join('');
}
function ncCard(e) {
  const it = e.id ? S.items.find(x => x.id === e.id) : null, memo = it && it.memo ? String(it.memo).split('\n')[0] : '';
  const ck = it ? `<button class="ncck ${e.done ? 'on' : ''}" data-act="tog" data-id="${it.id}" aria-pressed="${!!e.done}" aria-label="완료 표시"></button>` : '';
  const pin = `<button class="ncpin" data-act="ncPin" ${e.note ? `data-note="${e.note}"` : it ? `data-id="${it.id}"` : `data-t="${esc(e.t)}" data-d="${e.date}"`} title="포스트잇으로 붙이기" aria-label="포스트잇으로 붙이기">📌</button>`;
  const att = e.note ? `data-act="ncOpen" data-note="${e.note}"` : it ? `data-act="ncOpen" data-id="${it.id}"` : `data-act="ncOpen" data-d="${e.date}"`;
  return `<div class="ncard ${e.done ? 'dn' : ''}" ${att} role="button" tabindex="0"><div class="nct"><b>${esc(e.t)}</b>${pin}</div>${it ? `<div class="ncdn">${ck}<span>완료</span></div>` : ''}<div class="ncm"><i style="background:${NC_COL(e.kind)}">${esc(e.kind)}</i>${memo ? `<span>${esc(memo)}</span>` : ''}</div></div>`;
}
function ncMonth() {
  const [Y, M] = UI.cal.split('-').map(Number), first = new Date(Y, M - 1, 1), n = new Date(Y, M, 0).getDate(), ev = allEvents(), by = {};
  ev.forEach(e => (by[e.date] = by[e.date] || []).push(e));
  const v = UI.calv || 'm', tabs = `<div class="nctabs"><button class="${v === 'm' ? 'on' : ''}" data-act="ncView" data-v="m">📅 월간 캘린더</button><button class="${v === 'up' ? 'on' : ''}" data-act="ncView" data-v="up">⏳ 다가오는 내 업무</button><span class="grow"></span><button class="btn pri sm" data-act="ncNew">＋ 새로 만들기</button></div>`;
  if (v === 'up') return `${UI.view === 'cal' || location.hash.includes('cal') ? '<div class="bh"><h2>캘린더</h2></div>' : ''}${tabs}${ncUpcoming()}`;
  let cells = '';
  const off = (first.getDay() + 6) % 7;
  for (let i = 0; i < off; i++) cells += '<div class="ncc e"></div>';
  for (let d = 1; d <= n; d++) {
    const ds = `${Y}-${pad(M)}-${pad(d)}`, e = by[ds] || [], wd = new Date(Y, M - 1, d).getDay();
    cells += `<div class="ncc ${ds === today() ? 'tdy' : ''} ${ds === UI.day ? 'sel' : ''} ${wd === 0 ? 'su' : wd === 6 ? 'sa' : ''}" data-act="calDay" data-d="${ds}"><div class="ncn"><span class="n">${d}</span>${(S.dayMemo || {})[ds] ? '<span title="날짜 메모">📝</span>' : ''}<button class="ncplus" data-act="ncAdd" data-d="${ds}" aria-label="${M}월 ${d}일에 추가">＋</button></div>${e.map(ncCard).join('')}</div>`;
  }
  const tail = (7 - ((off + n) % 7)) % 7; for (let i = 0; i < tail; i++) cells += '<div class="ncc e"></div>';
  const day = by[UI.day] || [];
  const list = day.map(e => e.note ? `<div class="td"><span class="ck off"></span><a class="tl" href="#/note/${e.note}" data-act="noteGo" data-id="${e.note}">${esc(e.t)}</a><span class="mu">기록 · 누르면 이동</span><button class="btn sm" data-act="ncPin" data-note="${e.note}">📌</button></div>` : e.id ? `<div class="td ${e.done ? 'dn' : ''}"><button class="ck" data-act="tog" data-id="${e.id}" aria-pressed="${!!e.done}" aria-label="완료 표시"></button><a class="tl" data-act="ncOpen" data-id="${e.id}" href="#">${esc(e.t)}</a><span class="mu">${e.kind}</span><button class="btn sm" data-act="ncPin" data-id="${e.id}">📌</button>${xbtn('delItem', e.id)}</div>` : `<div class="td"><span class="ck off"></span><span class="tl">${esc(e.t)}</span><span class="mu">${e.kind}</span></div>`).join('') || '<p class="mu">이 날은 비어 있습니다.</p>';
  return `<div class="bh"><h2>캘린더</h2><span class="mu">카드를 누르면 가운데 창에서 바로 고칩니다. 칸에 마우스를 올리면 ＋ 가 나옵니다.</span></div>${tabs}
  <div class="calh"><button class="btn sm" data-act="calMove" data-d="-1" aria-label="이전 달">‹</button><b class="calt">${Y}년 ${M}월</b><button class="btn sm" data-act="calMove" data-d="1" aria-label="다음 달">›</button><button class="btn sm" data-act="calMove" data-d="0">오늘</button></div>
  <div class="ncw">${['월', '화', '수', '목', '금', '토', '일'].map(d => `<span>${d}</span>`).join('')}</div><div class="ncg">${cells}</div>
  <h3 class="h3 ncdl">${md(UI.day)} (${DOW[new Date(UI.day + 'T00:00:00').getDay()]})</h3><div class="ncdl">${list}</div>
  ${typeof dayMemoBox === 'function' ? dayMemoBox(UI.day) : ''}
  ${ncNotes(UI.day)}
  <form class="inl" data-form="evt"><input name="title" placeholder="일정·할 일 추가" required aria-label="내용"><select name="cat" aria-label="종류" data-cus="kind">${cusKindOpts(false, 'event')}</select><button class="btn">추가</button></form>
  `;
}
function calView() {
  return ncMonth() + (UI.calv === 'up' ? '' : `${typeof calAgenda === 'function' ? calAgenda(allEvents()) : ''}
  <div class="tools"><button class="btn pri" data-act="schedNeis">🏫 나이스에서 학사일정 전부 가져오기</button><label class="btn file">학사일정 파일 올리기<input type="file" id="schedUp" accept=".txt,.csv,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" hidden></label><button class="btn" data-act="schedPaste">학사일정 붙여넣기</button></div><p class="mu">학사일정(PDF·엑셀·텍스트, 또는 나이스·홈페이지에서 복사한 글)을 넣으면 날짜와 행사를 찾아 캘린더에 한꺼번에 넣어 드립니다.</p>`);
}
function ncNotes(ds) {
  const N = (S.notes || []).filter(n => n.date === ds);
  return `<div class="ncnotes"><b>📝 ${md(ds)} 기록</b>${N.map(n => `<a class="chp" href="#/note/${n.id}" data-act="noteGo" data-id="${n.id}">${esc(n.title || '제목 없음')} <small>${esc(n.kind || '')}</small></a>`).join('') || '<span class="mu"> 이 날 쓴 기록이 없습니다.</span>'}<button class="btn sm" data-act="ncNoteNew" data-d="${ds}">＋ 이 날 기록 쓰기</button></div>`;
}
function ncUpcoming() {
  const t = today(), its = S.items.filter(i => i.date && !i.done && !i.rep).sort((a, b) => a.date.localeCompare(b.date));
  const late = its.filter(i => i.date < t && i.cat === 'todo'), soon = its.filter(i => i.date >= t);
  const row = i => `<div class="ncrow" data-act="ncOpen" data-id="${i.id}" role="button" tabindex="0"><button class="ncck" data-act="tog" data-id="${i.id}" aria-label="완료 표시"></button><b>${esc(i.title)}</b><i style="background:${NC_COL(i.tag || (i.cat === 'todo' ? '할 일' : '일정'))}">${esc(i.tag || (i.cat === 'todo' ? '할 일' : '일정'))}</i><span class="mu">${i.memo ? esc(String(i.memo).split('\n')[0]) : ''}</span><span class="ncd">${md(i.date)} ${DOW[new Date(i.date + 'T00:00:00').getDay()]}${i.date >= t ? ' · ' + ddText(dd(i.date)) : ''}</span></div>`;
  let out = '';
  if (late.length) out += `<h3 class="h3">⚠️ 기한이 지난 할 일</h3>${late.map(row).join('')}`;
  out += `<h3 class="h3">다가오는 일정·할 일</h3>${soon.map(row).join('') || '<p class="mu">다가오는 일정이 없습니다. 위의 「새로 만들기」를 눌러 보세요.</p>'}`;
  return out;
}
/* 가운데 창(노션의 페이지 미리보기) */
let NCP = null;
function ncPeek(id, isNew) {
  const i = S.items.find(x => x.id === id); if (!i) return;
  NCP = { id, isNew: !!isNew }; let d = document.getElementById('ncpeek');
  if (!d) { d = document.createElement('dialog'); d.id = 'ncpeek'; d.className = 'dlg ncpeek'; document.body.appendChild(d); d.addEventListener('close', ncClosed); d.addEventListener('change', ncSave); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
  d.innerHTML = `<div class="ncph"><input name="title" class="nctitle" value="${esc(i.title)}" placeholder="제목 없음" aria-label="제목"><button class="btn sm" data-ncclose="1" aria-label="닫기">✕</button></div>
  <div class="ncprop"><label>구분</label><select name="kind">${ncKindSel(i)}</select></div>
  <div class="ncprop"><label>날짜</label><span><input type="date" name="date" value="${esc(i.date || '')}"> ~ <input type="date" name="end" value="${esc(i.end || '')}" aria-label="끝 날짜"></span></div>
  <div class="ncprop"><label>완료</label><input type="checkbox" name="done" ${i.done ? 'checked' : ''} aria-label="완료"></div>
  <div class="ncprop top"><label>메모</label><textarea name="memo" rows="5" placeholder="메모를 적으세요">${esc(i.memo || '')}</textarea></div>
  <div class="btns"><button class="btn" data-act="ncPin" data-id="${i.id}">📌 포스트잇으로 붙이기</button><button class="btn" data-ncdel="1">🗑 삭제</button><button class="btn pri" data-ncclose="1">닫기</button></div>`;
  d.onclick = e => { if (e.target === d) d.close(); if (e.target.closest('[data-ncclose]')) d.close(); if (e.target.closest('[data-ncdel]')) sure('이 일정을 삭제할까요?', () => { NCP = null; S.items = S.items.filter(x => x.id !== id); d.close(); commit(); }); };
  if (!d.open) d.showModal(); if (isNew) { const t = d.querySelector('.nctitle'); t && t.focus(); }
}
function ncSave(e) {
  if (!NCP) return; const i = S.items.find(x => x.id === NCP.id), t = e.target; if (!i || !t.name) return;
  if (t.name === 'title') i.title = t.value.trim(); else if (t.name === 'memo') { if (t.value.trim()) i.memo = t.value; else delete i.memo; }
  else if (t.name === 'date') { if (t.value) { i.date = t.value; if (i.end && i.end < i.date) delete i.end; } }
  else if (t.name === 'end') { if (t.value && t.value > i.date) i.end = t.value; else delete i.end; }
  else if (t.name === 'done') i.done = t.checked;
  else if (t.name === 'kind') { const o = cusMk(t.value, ''); i.cat = o.cat; if (o.tag) i.tag = o.tag; else delete i.tag; }
  commit();
}
function ncClosed() {
  const d = document.getElementById('ncpeek'); if (d) d.remove();
  if (NCP) { const i = S.items.find(x => x.id === NCP.id); if (i && !i.title) { S.items = S.items.filter(x => x !== i); } }
  NCP = null; commit();
}
Object.assign(A, {
  ncPin(el, e) {
    e && e.stopPropagation(); let text, date;
    if (el.dataset.note) { const n = (S.notes || []).find(x => x.id === el.dataset.note); if (!n) return; text = '📝 ' + (n.title || '제목 없음'); date = n.date; }
    else if (el.dataset.id) { const i = S.items.find(x => x.id === el.dataset.id); if (!i) return; text = i.title; date = i.date; }
    else { text = el.dataset.t; date = el.dataset.d; }
    if (!text) { toast('제목을 먼저 적어 주세요.'); return; }
    pstList().push({ id: pstId(), text, date, color: '노랑', done: false }); S.profile.pstDown = false; commit(); toast('포스트잇으로 붙였습니다.');
  },
  ncNoteNew(el) { const n = { id: uid(), title: '', date: el.dataset.d || today(), kind: '회의', body: '', decisions: '', followups: '', lock: false }; S.notes.push(n); save(); location.hash = '#/note/' + n.id; },
  ncView(el) { UI.calv = el.dataset.v; render(); },
  ncAdd(el, e) { e && e.stopPropagation(); ncMake(el.dataset.d); },
  ncNew() { ncMake(UI.day || today()); },
  ncOpen(el) {
    if (el.dataset.note) { location.hash = '#/note/' + el.dataset.note; return; }
    if (el.dataset.id) { const i = S.items.find(x => x.id === el.dataset.id); if (i) return ncPeek(i.id); }
    if (el.dataset.d) dayOpen(el.dataset.d);
  }
});
function ncMake(ds) { const i = { id: uid(), title: '', cat: 'event', date: ds, done: false }; S.items.push(i); UI.day = ds; ncPeek(i.id, true); }
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.ncard,.ncrow')) { e.preventDefault(); e.target.click(); } });

/* 오늘 화면 = 캘린더 중심. 기존 게시판 줄들은 달력 밑 「업무들」 토글로 */
(function () {
  const _today = todayView, MARK = '<div class="bh"><h2>오늘의 게시판</h2>';
  todayView = function () {
    const h = _today(), k = h.indexOf(MARK), top = k >= 0 ? h.slice(0, k) : '', rest = k >= 0 ? h.slice(k) : h;
    return `${top}<details class="ncwork nccal" ${UI.nccal === false ? '' : 'open'}><summary>📅 캘린더 <small>일정 · 메모 · 기록</small></summary>${ncMonth()}</details><details class="ncwork" ${UI.ncwork ? 'open' : ''}><summary>🗂 업무들 <small>게시판 줄 · 연수 · 예산 · 평가 등</small></summary>${rest}</details>`;
  };
  document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('ncwork')) { if (e.target.classList.contains('nccal')) UI.nccal = e.target.open; else UI.ncwork = e.target.open; } }, true);
})();

/* 토요휴업일은 캘린더·기한 목록에서 모두 뺍니다 */
(function () { const _ae = allEvents; allEvents = function () { return _ae().filter(e => !/토요\s*휴업/.test(e.t || '')); }; })();

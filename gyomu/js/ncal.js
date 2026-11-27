/* 노션식 캘린더(v126): 월~일 달력 칸 안에 카드(제목·완료·구분·메모), 카드를 누르면 가운데 창에서 바로 수정, 「다가오는 내 업무」 보기.
   기존 calView 를 대체합니다(학사일정 가져오기·날짜 메모·기록 이동은 그대로). 일정에 memo 칸이 새로 생깁니다. */
const NC_BASE = { '업무': ['#d3e5ef', 'todo'], '수업': ['#dbeddb', 'event'], '개인': ['#f5e0e9', 'event'], '기타': ['#e3e2e0', 'event'] };
const NC_PAL = ['#fdecc8', '#e8deee', '#ffe2dd', '#d3f0e7', '#dde7f7', '#f1e7d0'];
const NC_COL = k => (NC_BASE[k] && NC_BASE[k][0]) || (typeof CAL_KINDS !== 'undefined' && CAL_KINDS[k]) || NC_PAL[[...String(k || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % NC_PAL.length];
function ncSeed() { const L = cusL(); if (L.kindSeed) return; L.kindSeed = 1; L.kind = L.kind || []; Object.keys(NC_BASE).forEach(n => { if (!L.kind.some(k => k.n === n)) L.kind.push({ n, b: NC_BASE[n][1] }); }); }
function ncKindSel(i) {
  ncSeed(); const names = cusKinds().map(k => k.n); if (i.tag && !names.includes(i.tag)) names.push(i.tag);
  return (i.tag ? '' : '<option value="" selected>미지정</option>') + names.map(n => `<option value="${esc(n)}" ${n === i.tag ? 'selected' : ''}>${esc(n)}</option>`).join('') + '<option value="_new">＋ 직접 입력…</option>';
}
function ncUrls(t) { return (String(t || '').match(/(?:https?:\/\/|www\.)[^\s<>"'）)]+/g) || []).map(u => u.replace(/[.,;]+$/, '')); }
function ncLinks(t) { const U = ncUrls(t); return U.length ? U.map(u => { const h = /^www\./.test(u) ? 'https://' + u : u; let lab = u; try { lab = new URL(h).hostname.replace(/^www\./, ''); } catch (e) { } return `<a class="nclk" href="${esc(h)}" target="_blank" rel="noopener noreferrer" title="${esc(u)}">🔗 ${esc(lab)}</a>`; }).join('') : ''; }
function ncDelBtn(e, cls) { return `<button class="${cls}" data-act="ncDel" ${e.note ? `data-note="${e.note}"` : e.id ? `data-id="${e.id}"` : ''} data-k="${esc(e.date + '|' + e.t)}" data-kind="${esc(e.kind || '')}" title="캘린더에서 삭제" aria-label="삭제">🗑</button>`; }
function ncCard(e) {
  const it = e.id ? S.items.find(x => x.id === e.id) : null, memo = it && it.memo ? String(it.memo).split('\n')[0] : '';
  const ck = it ? `<button class="ncck ${e.done ? 'on' : ''}" data-act="tog" data-id="${it.id}" aria-pressed="${!!e.done}" aria-label="완료 표시"></button>` : '';
  const pin = `<button class="ncpin" data-act="ncPin" ${e.note ? `data-note="${e.note}"` : it ? `data-id="${it.id}"` : `data-t="${esc(e.t)}" data-d="${e.date}"`} title="포스트잇으로 붙이기" aria-label="포스트잇으로 붙이기">📌</button>`;
  const att = e.note ? `data-act="ncOpen" data-note="${e.note}"` : it ? `data-act="ncOpen" data-id="${it.id}"` : `data-act="ncOpen" data-d="${e.date}"`;
  return `<div class="ncard ${e.done ? 'dn' : ''}" ${att} role="button" tabindex="0"><div class="nct"><b>${esc(e.t || memo.replace(/(?:https?:\/\/|www\.)\S+/g, '').trim() || '제목 없음')}</b>${pin}${ncDelBtn(e, 'ncpin ncx')}</div>${it ? `<div class="ncdn">${ck}<span>완료</span></div>` : ''}<div class="ncm"><i style="background:${NC_COL(e.kind)}">${esc(e.kind)}</i>${memo ? `<span>${esc(memo.replace(/(?:https?:\/\/|www\.)\S+/g, '').trim())}</span>` : ''}${it && it.memo ? ncLinks(it.memo) : ''}</div></div>`;
}
function ncMonth() {
  ncSeed();
  const [Y, M] = UI.cal.split('-').map(Number), first = new Date(Y, M - 1, 1), n = new Date(Y, M, 0).getDate(), ev = allEvents(), by = {};
  ev.forEach(e => (by[e.date] = by[e.date] || []).push(e));
  const v = UI.calv || ((S.profile.lay || {}).v) || 'm', tabs = `<div class="nctabs"><button class="${v === 'm' ? 'on' : ''}" data-act="ncView" data-v="m">📅 월간 캘린더</button><button class="${v === 'w' ? 'on' : ''}" data-act="ncView" data-v="w">🗓 주간</button><button class="${v === 'up' ? 'on' : ''}" data-act="ncView" data-v="up">⏳ 다가오는 내 업무</button><span class="grow"></span><button class="btn sm" data-act="lyOpen">🧩 구조</button><button class="btn sm" data-act="tfTools">🧰 도구</button><button class="btn pri sm" data-act="ncNew">＋ 새로 만들기</button></div>`;
  if (v === 'w' && typeof ncWeek === 'function') return `${UI.view === 'cal' || location.hash.includes('cal') ? '<div class="bh"><h2>캘린더</h2></div>' : ''}${tabs}${ncWeek()}`;
  if (v === 'up') return `${UI.view === 'cal' || location.hash.includes('cal') ? '<div class="bh"><h2>캘린더</h2></div>' : ''}${tabs}${ncUpcoming()}`;
  let cells = '';
  const ws = typeof tfWs === 'function' ? tfWs() : 1, off = (first.getDay() - ws + 7) % 7;
  for (let i = 0; i < off; i++) cells += '<div class="ncc e"></div>';
  for (let d = 1; d <= n; d++) {
    const ds = `${Y}-${pad(M)}-${pad(d)}`, e = by[ds] || [], wd = new Date(Y, M - 1, d).getDay();
    cells += `<div class="ncc ${ds === today() ? 'tdy' : ''} ${ds === UI.day ? 'sel' : ''} ${wd === 0 ? 'su' : wd === 6 ? 'sa' : ''}" data-act="calDay" data-d="${ds}"><div class="ncn"><span class="n">${d}</span>${(S.dayMemo || {})[ds] ? '<span title="날짜 메모">📝</span>' : ''}${UI.ncclip ? `<button class="ncplus ncpaste" data-act="ncPaste" data-d="${ds}" title="복사한 일정 붙여넣기">📋</button>` : ''}<button class="ncplus" data-act="ncAdd" data-d="${ds}" aria-label="${M}월 ${d}일에 추가">＋</button></div>${e.map(ncCard).join('')}</div>`;
  }
  const tail = (7 - ((off + n) % 7)) % 7; for (let i = 0; i < tail; i++) cells += '<div class="ncc e"></div>';
  const day = by[UI.day] || [];
  const list = day.map(e => e.note ? `<div class="td"><span class="ck off"></span><a class="tl" href="#/note/${e.note}" data-act="noteGo" data-id="${e.note}">${esc(e.t)}</a><span class="mu">기록 · 누르면 이동</span><button class="btn sm" data-act="ncPin" data-note="${e.note}">📌</button>${ncDelBtn(e, 'btn sm')}</div>` : e.id ? `<div class="td ${e.done ? 'dn' : ''}"><button class="ck" data-act="tog" data-id="${e.id}" aria-pressed="${!!e.done}" aria-label="완료 표시"></button><a class="tl" data-act="ncOpen" data-id="${e.id}" href="#">${esc(e.t)}</a><span class="mu">${e.kind}</span><button class="btn sm" data-act="ncPin" data-id="${e.id}">📌</button>${xbtn('delItem', e.id)}</div>` : `<div class="td"><span class="ck off"></span><span class="tl">${esc(e.t)}</span><span class="mu">${e.kind}</span>${ncDelBtn(e, 'btn sm')}</div>`).join('') || '<p class="mu">이 날은 비어 있습니다.</p>';
  return `<div class="bh"><h2>캘린더</h2><span class="mu">카드를 누르면 가운데 창에서 바로 고칩니다. 칸에 마우스를 올리면 ＋ 가 나옵니다.</span></div>${tabs}
  <div class="calh"><button class="btn sm" data-act="calMove" data-d="-1" aria-label="이전 달">‹</button><b class="calt">${Y}년 ${M}월</b><button class="btn sm" data-act="calMove" data-d="1" aria-label="다음 달">›</button><button class="btn sm" data-act="calMove" data-d="0">오늘</button></div>
  <div class="ncw">${(ws ? ['월', '화', '수', '목', '금', '토', '일'] : ['일', '월', '화', '수', '목', '금', '토']).map(d => `<span>${d}</span>`).join('')}</div><div class="ncg">${cells}</div>
  <h3 class="h3 ncdl">${md(UI.day)} (${DOW[new Date(UI.day + 'T00:00:00').getDay()]})</h3><div class="ncdl">${list}</div>
  <details class="ncsub ncdm" ${UI.ncdm === false ? '' : 'open'}><summary>📝 ${md(UI.day)} 메모</summary>${typeof dayMemoBox === 'function' ? dayMemoBox(UI.day) : ''}<div class="nclinks" id="ncdmlinks">${ncLinks((S.dayMemo || {})[UI.day])}</div></details>
  ${ncNotes(UI.day)}
  <form class="inl" data-form="evt"><input name="title" placeholder="일정·할 일 추가" required aria-label="내용"><select name="cat" aria-label="종류" data-cus="kind">${cusKindOpts(false, 'event')}</select><button class="btn">추가</button></form>
  `;
}
function calView() {
  return ncMonth() + (UI.calv === 'up' ? '' : `${typeof calAgenda === 'function' ? calAgenda(allEvents()) : ''}
  <div class="tools"><button class="btn pri" data-act="schedNeis">🏫 나이스에서 학사일정 전부 가져오기</button><label class="btn file">학사일정 파일 올리기<input type="file" id="schedUp" accept=".txt,.csv,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" hidden></label><button class="btn" data-act="schedPaste">학사일정 붙여넣기</button>${Object.keys(S.evHide || {}).length ? '<button class="btn" data-act="ncUnhide">숨긴 항목 되살리기</button>' : ''}</div><p class="mu">학사일정(PDF·엑셀·텍스트, 또는 나이스·홈페이지에서 복사한 글)을 넣으면 날짜와 행사를 찾아 캘린더에 한꺼번에 넣어 드립니다.</p>`);
}
function ncNotes(ds) {
  const N = (S.notes || []).filter(n => n.date === ds);
  return `<details class="ncsub ncdn" ${UI.ncdn === false ? '' : 'open'}><summary>📝 ${md(ds)} 기록 <small>${N.length}건</small></summary><div class="ncnotes">${N.map(n => `<a class="chp" href="#/note/${n.id}" data-act="noteGo" data-id="${n.id}">${esc(n.title || '제목 없음')} <small>${esc(n.kind || '')}</small></a><button class="btn sm" data-act="ncNoteDel" data-id="${n.id}" aria-label="기록 삭제">🗑</button>`).join('') || '<span class="mu"> 이 날 쓴 기록이 없습니다.</span>'}<button class="btn sm" data-act="ncNoteNew" data-d="${ds}">＋ 이 날 기록 쓰기</button>${UI.ncclip ? `<button class="btn sm" data-act="ncPaste" data-d="${ds}">📋 복사한 일정 붙여넣기 (${esc(UI.ncclip.title)})</button>` : ''}</div></details>`;
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
function ncFit(t) { if (!t) return; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
function ncPeek(id, isNew) {
  const i = S.items.find(x => x.id === id); if (!i) return;
  NCP = { id, isNew: !!isNew }; let d = document.getElementById('ncpeek');
  if (!d) { d = document.createElement('dialog'); d.id = 'ncpeek'; d.className = 'dlg ncpeek'; document.body.appendChild(d); d.addEventListener('close', ncClosed); d.addEventListener('change', ncSave); d.addEventListener('input', e => { if (e.target.classList.contains('nctitle')) ncFit(e.target); if (e.target.name === 'memo') { const b = d.querySelector('.nclinks'); if (b) b.innerHTML = ncLinks(e.target.value) || '<span class="mu">메모에 주소(https://…)를 쓰면 여기에 바로가기가 생깁니다.</span>'; } }); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
  d.innerHTML = `<div class="ncph"><textarea name="title" class="nctitle" rows="1" placeholder="제목 없음" aria-label="제목">${esc(i.title)}</textarea><button class="btn sm" data-ncclose="1" aria-label="닫기">✕</button></div>
  <div class="ncprop"><label>구분</label><select name="kind">${ncKindSel(i)}</select></div>
  <div class="ncprop"><label>날짜</label><span><input type="date" name="date" value="${esc(i.date || '')}"> ~ <input type="date" name="end" value="${esc(i.end || '')}" aria-label="끝 날짜"></span></div>
  <div class="ncprop"><label>완료</label><input type="checkbox" name="done" ${i.done ? 'checked' : ''} aria-label="완료"></div>
  <div class="ncprop top"><label>메모</label><textarea name="memo" rows="5" placeholder="메모를 적으세요 (주소를 쓰면 아래에 바로가기가 생깁니다)">${esc(i.memo || '')}</textarea></div>
  <div class="ncprop"><label>링크</label><div class="nclinks">${ncLinks(i.memo) || '<span class="mu">메모에 주소(https://…)를 쓰면 여기에 바로가기가 생깁니다.</span>'}</div></div>
  <div class="ncrep"><button class="btn sm" data-act="ncCopy" data-id="${i.id}">📋 복사</button><span>매주 반복 복사: <input type="number" name="rep" min="1" max="40" value="4" style="width:52px"> 주</span><button class="btn sm" data-act="ncRepeat" data-id="${i.id}">🔁 반복 만들기</button></div>
  <div class="btns"><button class="btn" data-act="ncPin" data-id="${i.id}">📌 포스트잇으로 붙이기</button><button class="btn" data-ncdel="1">🗑 삭제</button><button class="btn" data-ncclose="1">닫기</button><button class="btn pri" data-act="ncSaveClose">💾 저장</button></div>`;
  d.onclick = e => { if (e.target === d) d.close(); if (e.target.closest('[data-ncclose]')) d.close(); if (e.target.closest('[data-ncdel]')) sure('이 일정을 삭제할까요?', () => { NCP = null; S.items = S.items.filter(x => x.id !== id); d.close(); commit(); }); };
  if (!d.open) d.showModal(); ncFit(d.querySelector('.nctitle')); if (isNew) { const t = d.querySelector('.nctitle'); t && t.focus(); }
}
function ncFlush(d) {
  if (!NCP) return; const i = S.items.find(x => x.id === NCP.id); if (!i) return; const v = n => { const e = d.querySelector(`[name=${n}]`); return e ? e : null; };
  const t = v('title'), m = v('memo'), dt = v('date'), en = v('end'), dn = v('done');
  if (t) i.title = t.value.trim(); if (m) { if (m.value.trim()) i.memo = m.value; else delete i.memo; }
  if (dt && dt.value) { i.date = dt.value; } if (en) { if (en.value && en.value > i.date) i.end = en.value; else delete i.end; } if (dn) i.done = dn.checked;
}
function ncSave(e) {
  if (!NCP) return; const i = S.items.find(x => x.id === NCP.id), t = e.target; if (!i || !t.name) return;
  if (t.name === 'title') i.title = t.value.trim(); else if (t.name === 'memo') { if (t.value.trim()) { i.memo = t.value; if (!i.title) i.title = t.value.trim().split('\n')[0].slice(0, 60); } else delete i.memo; }
  else if (t.name === 'date') { if (t.value) { i.date = t.value; if (i.end && i.end < i.date) delete i.end; } }
  else if (t.name === 'end') { if (t.value && t.value > i.date) i.end = t.value; else delete i.end; }
  else if (t.name === 'done') i.done = t.checked;
  else if (t.name === 'kind') {
    if (t.value === '_new') { const id = i.id; ask('구분 직접 입력', [{ k: 'n', label: '새 구분 이름 (예: 시험감독, 회의, 연수)', req: 1 }], o => { const n = o.n.trim(), it = S.items.find(x => x.id === id); if (!n || !it) return; ncSeed(); if (!cusKinds().some(k => k.n === n)) cusKinds().push({ n, b: 'event' }); it.tag = n; commit(); ncPeek(id); }); ncPeek(i.id); return; }
    if (!t.value) delete i.tag; else { i.tag = t.value; const k = cusKinds().find(x => x.n === t.value); if (k && k.b) i.cat = k.b; }
  }
  commit();
}
function ncClosed() {
  const d = document.getElementById('ncpeek'); if (d) { try { ncFlush(d); } catch (e) { } d.remove(); }
  if (NCP) { const i = S.items.find(x => x.id === NCP.id); if (i && !i.title) { const m = String(i.memo || '').trim(); if (m) i.title = m.split('\n')[0].slice(0, 60); else S.items = S.items.filter(x => x !== i); } }
  NCP = null; commit();
}
Object.assign(A, {
  ncPin(el, e) {
    e && e.stopPropagation(); let text, date, ref = {};
    if (el.dataset.note) { const n = (S.notes || []).find(x => x.id === el.dataset.note); if (!n) return; text = '📝 ' + (n.title || '제목 없음'); date = n.date; ref = { note: n.id }; }
    else if (el.dataset.id) { const i = S.items.find(x => x.id === el.dataset.id); if (!i) return; text = i.title; date = i.date; ref = { item: i.id }; }
    else { text = el.dataset.t; date = el.dataset.d; }
    if (!text) { toast('제목을 먼저 적어 주세요.'); return; }
    pstList().push(Object.assign({ id: pstId(), text, date, color: '노랑', done: false }, ref)); S.profile.pstDown = false; commit(); toast('포스트잇으로 붙였습니다.');
  },
  ncNoteNew(el) { const n = { id: uid(), title: '', date: el.dataset.d || today(), kind: '회의', body: '', decisions: '', followups: '', lock: false }; S.notes.push(n); save(); location.hash = '#/note/' + n.id; },
  ncCopy(el) { const i = S.items.find(x => x.id === el.dataset.id); if (!i) return; UI.ncclip = { title: i.title, cat: i.cat, tag: i.tag, memo: i.memo, span: i.end && i.date ? Math.round((new Date(i.end + 'T00:00:00') - new Date(i.date + 'T00:00:00')) / 864e5) : 0 }; toast('복사했습니다. 달력 날짜 칸의 📋 를 누르면 붙습니다.'); render(); },
  ncPaste(el, e) { e && e.stopPropagation(); const c = UI.ncclip; if (!c) return; ncClone(c, el.dataset.d); commit(); toast(md(el.dataset.d) + ' 에 붙였습니다.'); },
  ncRepeat(el) {
    const i = S.items.find(x => x.id === el.dataset.id), d = document.getElementById('ncpeek'), n = Math.max(1, Math.min(40, +(d.querySelector('[name=rep]') || {}).value || 0)); if (!i || !i.date) return;
    const c = { title: i.title, cat: i.cat, tag: i.tag, memo: i.memo, span: i.end ? Math.round((new Date(i.end + 'T00:00:00') - new Date(i.date + 'T00:00:00')) / 864e5) : 0 };
    for (let k = 1; k <= n; k++) { const dt = new Date(i.date + 'T00:00:00'); dt.setDate(dt.getDate() + 7 * k); ncClone(c, ymd(dt)); }
    commit(); toast(`매주 ${n}번 복사했습니다.`);
  },
  ncNoteDel(el) { const n = (S.notes || []).find(x => x.id === el.dataset.id); if (!n) return; sure(`기록 「${n.title || '제목 없음'}」을 삭제할까요?`, () => { S.notes = S.notes.filter(x => x !== n); commit(); }); },
  ncNoteSave() { try { save(true); } catch (e) { save(); } toast('저장했습니다.'); },
  ncDel(el, e) {
    e && e.stopPropagation(); const d = el.dataset, nm = (el.closest('.ncard,.td') || {}).innerText || '';
    if (d.note) return sure('이 기록을 삭제할까요? (되살릴 수 없습니다)', () => { S.notes = S.notes.filter(n => n.id !== d.note); commit(); toast('삭제했습니다.'); });
    if (d.id) return sure('이 일정을 삭제할까요? (반복 일정이면 반복 전체가 지워집니다)', () => { S.items = S.items.filter(i => i.id !== d.id); commit(); toast('삭제했습니다.'); });
    const [dt, ...tt] = String(d.k).split('|'), title = tt.join('|');
    if (d.kind === '디데이') return sure('이 디데이를 삭제할까요?', () => { S.dday = (S.dday || []).filter(x => !(x.date === dt && x.title === title)); commit(); toast('삭제했습니다.'); });
    sure('이 항목을 캘린더에서 지울까요? (평가·예산·연수 등 원래 자료는 그대로 두고 캘린더에서만 숨깁니다)', () => { (S.evHide = S.evHide || {})[d.k] = 1; commit(); toast('캘린더에서 숨겼습니다. 아래 「숨긴 항목 되살리기」로 복구할 수 있습니다.'); });
  },
  ncUnhide() { S.evHide = {}; commit(); toast('숨긴 항목을 모두 되살렸습니다.'); },
  ncSaveClose() { const d = document.getElementById('ncpeek'); if (!d) return; ncFlush(d); commit(); toast('저장했습니다.'); d.close(); },
  ncView(el) { UI.calv = el.dataset.v; render(); },
  ncAdd(el, e) { e && e.stopPropagation(); ncMake(el.dataset.d); },
  ncNew() { ncMake(UI.day || today()); },
  ncOpen(el, e) {
    if (e && e.target && e.target.closest && e.target.closest('a[href]')) return;
    if (el.dataset.note) { location.hash = '#/note/' + el.dataset.note; return; }
    if (el.dataset.id) { const i = S.items.find(x => x.id === el.dataset.id); if (i) return ncPeek(i.id); }
    if (el.dataset.d) dayOpen(el.dataset.d);
  }
});
function ncClone(c, ds) { const i = { id: uid(), title: c.title, cat: c.cat || 'event', date: ds, done: false }; if (c.tag) i.tag = c.tag; if (c.memo) i.memo = c.memo; if (c.span > 0) { const e = new Date(ds + 'T00:00:00'); e.setDate(e.getDate() + c.span); i.end = ymd(e); } S.items.push(i); return i; }
function ncSoon() {
  const L = upcoming(7); return `<details class="ncsoon ncwork" ${UI.ncsoon === false ? '' : 'open'}><summary>⏰ 이번 주 기한 <small>${L.length}건</small></summary>${L.length ? L.map(e => `<div class="ncs" ${e.note ? `data-act="ncOpen" data-note="${e.note}"` : e.id ? `data-act="ncOpen" data-id="${e.id}"` : `data-act="ncOpen" data-d="${e.date}"`} role="button" tabindex="0"><b class="ddb ${dd(e.date) <= 1 ? 'cute d' + dd(e.date) : ''}">${ddText(dd(e.date))}</b><span>${md(e.date)} ${DOW[new Date(e.date + 'T00:00:00').getDay()]}</span><span class="tl">${esc(e.t)}</span></div>`).join('') : '<span class="mu"> 이번 주 기한이 없습니다.</span>'}</details>`;
}
function ncMake(ds) { const i = { id: uid(), title: '', cat: 'event', date: ds, done: false }; S.items.push(i); UI.day = ds; ncPeek(i.id, true); }
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.ncard,.ncrow')) { e.preventDefault(); e.target.click(); } });

/* 오늘 화면 = 캘린더 중심. 기존 게시판 줄들은 달력 밑 「업무들」 토글로 */
(function () {
  const _today = todayView, MARK = '<div class="bh"><h2>오늘의 게시판</h2>';
  todayView = function () {
    const h = _today(), k = h.indexOf(MARK); let top = k >= 0 ? h.slice(0, k) : '', sb = ''; top = top.replace(/<details class="sbanner"[\s\S]*?<\/details>/, m => { sb = m; return ''; }); 
    const rest = (k >= 0 ? h.slice(k) : h).replace(/<p class="soon">[\s\S]*?<\/p>/, '');
    if (!sb && typeof schoolBanner === 'function') { const hs = S.hide && S.hide.sb; try { if (S.hide) S.hide.sb = false; sb = schoolBanner() || ''; } catch (e) { sb = ''; } finally { if (S.hide && hs) S.hide.sb = hs; } }
    const P = { dw: (typeof drawerHtml === 'function' ? drawerHtml() : ''), brief: typeof tfBrief === 'function' ? tfBrief() : '', cal: `<details class="ncwork nccal" ${(UI.nccal === undefined ? lyDef('cal') : UI.nccal) ? 'open' : ''}><summary>${esc(lyName('cal', '📅 캘린더'))} <small>일정 · 메모 · 기록</small></summary>${ncMonth()}</details>`, soon: ncSoon(), work: `<details class="ncwork" ${(UI.ncwork === undefined ? lyDef('work', false) : UI.ncwork) ? 'open' : ''}><summary>${esc(lyName('work', '🗂 업무들'))} <small>게시판 줄 · 연수 · 예산 · 평가 등</small></summary>${rest}</details>`, sb: sb ? `<div class="ncsb">${sb}</div>` : '' };
    return top + (typeof lyOrder === 'function' ? lyOrder(P) : P.brief + P.cal + P.soon + P.work + P.sb);
  };
  document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('ncsub')) { if (e.target.classList.contains('ncdm')) UI.ncdm = e.target.open; else UI.ncdn = e.target.open; return; } if (e.target.classList && e.target.classList.contains('ncwork')) { if (e.target.classList.contains('nccal')) UI.nccal = e.target.open; else if (e.target.classList.contains('ncsoon')) UI.ncsoon = e.target.open; else UI.ncwork = e.target.open; } }, true);
})();

/* 토요휴업일은 캘린더·기한 목록에서 모두 뺍니다 */
(function () { const _ae = allEvents; allEvents = function () { return _ae().filter(e => !/토요\s*휴업/.test(e.t || '') && !((S.evHide || {})[e.date + '|' + e.t])); }; })();

/* 포스트잇을 누르면 원래 기록·일정으로(끌어 옮길 때는 이동하지 않음) */
function pstGo(x) {
  let nid = x.note, iid = x.item; const tx = String(x.text || '').replace(/^📝\s*/, '');
  if (!nid && !iid) { const n = (S.notes || []).find(n => (n.title || '제목 없음') === tx && (!x.date || n.date === x.date)) || (/^📝/.test(x.text || '') ? (S.notes || []).find(n => n.title === tx) : null); if (n) nid = n.id; else { const i = S.items.find(i => i.title === tx && (!x.date || i.date === x.date)); if (i) iid = i.id; } }
  if (nid) { location.hash = '#/note/' + nid; return; }
  const i = iid ? S.items.find(z => z.id === iid) : null, ds = (i && i.date) || x.date;
  if (!i && !ds) { toast('연결된 기록·일정이 없는 포스트잇입니다.'); return; }
  if (ds) { UI.cal = ds.slice(0, 7); UI.day = ds; } UI.nccal = true;
  if (location.hash !== '#/today' && location.hash !== '' && location.hash !== '#/') location.hash = '#/today'; else render();
  if (i) setTimeout(() => ncPeek(i.id), 200);
}
let _pg = null;
document.addEventListener('pointerdown', e => { const n = e.target.closest && e.target.closest('.pst'); _pg = n && !e.target.closest('button') ? { id: n.dataset.id, x: e.clientX, y: e.clientY } : null; }, true);
document.addEventListener('pointerup', e => {
  if (!_pg) return; const g = _pg; _pg = null;
  if (Math.abs(e.clientX - g.x) > 6 || Math.abs(e.clientY - g.y) > 6) return;
  const x = pstList().find(n => n.id === g.id); if (x) pstGo(x);
}, true);

/* 시계를 머리말 오른쪽(날짜·학교·선생님 칸) 안으로 */
function clkDock() {
  const el = document.getElementById('tfclock'), box = document.querySelector('.mast2');
  document.body.classList.toggle('clk-docked', !!(el && box));
  if (el && box && el.parentNode !== box) box.insertBefore(el, box.firstChild);
}
(function () {
  const _r = render; render = function () { const c = document.getElementById('tfclock'); if (c && c.parentNode !== document.body) document.body.appendChild(c); const r = _r.apply(this, arguments); clkDock(); return r; };
  const _c = clkDraw; clkDraw = function () { const r = _c.apply(this, arguments); clkDock(); return r; };
  setTimeout(() => { clkDraw(); }, 400); setInterval(clkDock, 1500);
})();

/* 날짜 메모에 주소를 쓰면 바로가기 갱신 */
document.addEventListener('input', e => { const t = e.target; if (!t.dataset || !t.dataset.dmemo) return; const b = document.getElementById('ncdmlinks'); if (b) b.innerHTML = ncLinks(t.value); });
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('a.nclk')) e.stopPropagation(); }, true);

/* 기록 화면 맨 위에 눈에 띄는 삭제 단추 */
(function () {
  const _nv = notesView;
  notesView = function (id) { const h = _nv.apply(this, arguments); if (!id || !(S.notes || []).some(n => n.id === id)) return h; return `<div class="ncnd"><span class="nclinks" id="ncpagelinks"></span><button class="btn pri ncsavebtn" data-act="ncNoteSave">💾 저장</button><button class="btn ncdelbtn" data-act="noteDel" data-id="${id}">🗑 이 기록 삭제</button></div>` + h; };
})();

document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('nctitle')) { e.preventDefault(); e.target.blur(); } });

/* 글 안의 주소를 누르면 바로 새 창으로 (모든 메모·기록 칸) */
function ncUrlAt(el) {
  if (!el || el.selectionStart == null || el.selectionStart !== el.selectionEnd) return null; const v = el.value, c = el.selectionStart, re = /(?:https?:\/\/|www\.)[^\s<>"'）)]+/g; let m;
  while ((m = re.exec(v))) { const a = m.index, b = a + m[0].replace(/[.,;]+$/, '').length; if (c >= a && c <= b) return v.slice(a, b); }
  return null;
}
document.addEventListener('click', e => {
  const t = e.target; if (!t || t.tagName !== 'TEXTAREA' || t.closest('#ncpeek') && t.name === 'title') return;
  const u = ncUrlAt(t); if (!u) return; window.open(/^www\./.test(u) ? 'https://' + u : u, '_blank', 'noopener'); toast('링크를 열었습니다. (글자를 고치려면 방향키로 옮겨 주세요)');
});
function ncPageLinks() { const b = document.getElementById('ncpagelinks'); if (!b) return; const h = ncLinks([...document.querySelectorAll('#app textarea')].map(x => x.value).join('\n')); if (b.innerHTML !== h) b.innerHTML = h; }
document.addEventListener('input', e => { if (e.target && e.target.tagName === 'TEXTAREA') ncPageLinks(); });
(function () { const _r2 = render; render = function () { const r = _r2.apply(this, arguments); ncPageLinks(); return r; }; })();
setInterval(ncPageLinks, 2000);

/* 카드를 마우스(또는 꾹 눌러서 손가락)로 끌어 다른 날짜 칸으로 옮기기 */
(function () {
  let g = null, ghost = null, hot = null, moved = false, tm = null;
  const days = d => Math.round(new Date(d + 'T00:00:00') / 864e5);
  const shift = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return ymd(x); };
  const cellAt = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.closest ? e.closest('.ncc[data-d]') : null; };
  const clear = () => { if (hot) hot.classList.remove('ncdrop'); hot = null; if (ghost) ghost.remove(); ghost = null; document.body.classList.remove('ncdragging'); };
  const begin = (e) => { moved = true; const r = g.card.getBoundingClientRect(); ghost = g.card.cloneNode(true); ghost.className += ' ncghost'; ghost.style.width = r.width + 'px'; ghost.style.left = e.clientX + 6 + 'px'; ghost.style.top = e.clientY + 6 + 'px'; document.body.appendChild(ghost); document.body.classList.add('ncdragging'); g.card.classList.add('ncsrc'); };
  document.addEventListener('pointerdown', e => {
    const c = e.target.closest && e.target.closest('.ncard'); if (!c || e.target.closest('button,a,input') || (e.button && e.button !== 0)) return;
    if (!c.dataset.id && !c.dataset.note) return; const from = c.closest('.ncc'); if (!from) return;
    g = { card: c, from: from.dataset.d, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', on: false }; moved = false;
    if (g.touch) tm = setTimeout(() => { if (g) { g.on = true; begin(e); if (navigator.vibrate) navigator.vibrate(15); } }, 380);
  });
  document.addEventListener('pointermove', e => {
    if (!g) return;
    if (!g.on) { if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return; if (g.touch) { clearTimeout(tm); g = null; return; } g.on = true; begin(e); }
    e.preventDefault(); if (e.clientY > innerHeight - 70) window.scrollBy(0, 18); else if (e.clientY < 70) window.scrollBy(0, -18); ghost.style.left = e.clientX + 6 + 'px'; ghost.style.top = e.clientY + 6 + 'px';
    const c = cellAt(e.clientX, e.clientY); if (c !== hot) { if (hot) hot.classList.remove('ncdrop'); hot = c; if (hot) hot.classList.add('ncdrop'); }
  }, { passive: false });
  const end = e => {
    clearTimeout(tm); if (!g) return; const s = g; g = null;
    if (!s.on) return; const c = cellAt(e.clientX, e.clientY); clear(); s.card.classList.remove('ncsrc');
    if (!c || c.dataset.d === s.from) return;
    const to = c.dataset.d, delta = days(to) - days(s.from);
    if (s.card.dataset.note) { const n = (S.notes || []).find(x => x.id === s.card.dataset.note); if (n) { n.date = to; commit(); toast(`기록을 ${md(to)}로 옮겼습니다.`); } return; }
    const it = S.items.find(x => x.id === s.card.dataset.id); if (!it) return;
    if (it.rep) { toast('반복 일정은 카드를 눌러 날짜를 바꿔 주세요.'); return; }
    it.date = shift(it.date, delta); if (it.end) it.end = shift(it.end, delta); commit(); toast(`${md(to)}로 옮겼습니다.`);
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', e => { if (g && g.on) { clear(); g.card.classList.remove('ncsrc'); } g = null; clearTimeout(tm); });
  document.addEventListener('click', e => { if (moved) { moved = false; if (e.target.closest && e.target.closest('.ncard')) { e.stopPropagation(); e.preventDefault(); } } }, true);
})();

/* 글칸 안의 주소에 파란 밑줄(글칸 위에 같은 글자를 투명하게 겹쳐 주소만 칠함) */
(function () {
  const MIR = new Map(), URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'）)]+/g;
  const has = v => { URL_RE.lastIndex = 0; return URL_RE.test(v || ''); };
  function html(v) {
    let out = '', last = 0, m; URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(v))) { const u = m[0].replace(/[.,;]+$/, ''); out += esc(v.slice(last, m.index)) + '<u>' + esc(u) + '</u>'; last = m.index + u.length; URL_RE.lastIndex = last; }
    return out + esc(v.slice(last)) + '\n';
  }
  function sync(t) {
    let mir = MIR.get(t);
    if (!t.isConnected || !t.offsetParent && getComputedStyle(t).position !== 'fixed' || !has(t.value)) { if (mir) { mir.remove(); MIR.delete(t); } return; }
    const host = t.closest('dialog') || document.body;
    if (!mir) { mir = document.createElement('div'); mir.className = 'ncmir'; MIR.set(t, mir); }
    if (mir.parentNode !== host) host.appendChild(mir);
    const cs = getComputedStyle(t), r = t.getBoundingClientRect();
    ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent', 'tabSize', 'whiteSpace', 'overflowWrap', 'wordBreak', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'textAlign'].forEach(k => { mir.style[k] = cs[k]; });
    if (cs.whiteSpace === 'nowrap' || cs.whiteSpace === 'normal') mir.style.whiteSpace = 'pre-wrap';
    mir.style.left = r.left + t.clientLeft + 'px'; mir.style.top = r.top + t.clientTop + 'px'; mir.style.width = t.clientWidth + 'px'; mir.style.height = t.clientHeight + 'px';
    const h = html(t.value); if (mir.dataset.h !== h) { mir.innerHTML = h; mir.dataset.h = h; }
    mir.scrollTop = t.scrollTop; mir.scrollLeft = t.scrollLeft;
    const vis = r.bottom > 0 && r.top < innerHeight && r.width > 0; mir.style.display = vis ? 'block' : 'none';
  }
  function all() { document.querySelectorAll('textarea').forEach(sync); MIR.forEach((m, t) => { if (!t.isConnected) { m.remove(); MIR.delete(t); } }); }
  document.addEventListener('input', e => { if (e.target.tagName === 'TEXTAREA') sync(e.target); });
  document.addEventListener('scroll', e => { if (e.target && e.target.tagName === 'TEXTAREA') sync(e.target); else all(); }, true);
  window.addEventListener('resize', all); document.addEventListener('toggle', () => setTimeout(all, 0), true);
  setInterval(() => { if (!document.hidden && document.querySelector('textarea')) all(); }, 1000);
})();

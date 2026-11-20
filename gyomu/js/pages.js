'use strict';
/* ===== 업무파탈 pages.js : 내 페이지 (노션처럼 직접 만드는 블록 페이지) =====
   app.js 뒤에 불러옵니다. 블록 종류: 글·큰제목·작은제목·목록·체크·토글·인용·표·링크·구분선 */
const BT = [['p', '글'], ['h1', '큰 제목'], ['h2', '작은 제목'], ['bullet', '목록'], ['todo', '체크'], ['toggle', '토글'], ['quote', '인용'], ['table', '표'], ['link', '링크'], ['divider', '구분선']];
const newBlock = (t, x) => ({ id: uid(), t, x: x || '', y: '', u: '', done: false, open: false, rows: t === 'table' ? [['', '', ''], ['', '', '']] : undefined });
const TEMPLATES = {
  '빈 페이지': () => [newBlock('p')],
  '회의·연수 메모': () => [newBlock('h2', '안건'), newBlock('bullet'), newBlock('h2', '결정'), newBlock('bullet'), newBlock('h2', '후속 조치'), newBlock('todo')],
  '수업 계획': () => [newBlock('h2', '성취기준'), newBlock('p'), newBlock('h2', '활동 흐름'), newBlock('bullet'), newBlock('h2', '준비물'), newBlock('todo'), newBlock('h2', '평가'), newBlock('p')],
  '업무 체크리스트': () => [newBlock('todo'), newBlock('todo'), newBlock('todo')],
  '표(명단·일정)': () => [newBlock('table')]
};
let PF = null; // 다시 그린 뒤 커서를 둘 블록
const curPage = () => find('pages', (location.hash.split('/')[2] || ''));
const blk = id => { const pg = curPage(); return pg && pg.blocks.find(b => b.id === id); };

function pageTree(parent, depth, cur) {
  return S.pages.filter(p => (p.parent || '') === parent).map(p => `<a href="#/page/${p.id}" class="${p.id === cur ? 'on' : ''}" style="padding-left:${depth * 14}px"><b>${esc(p.title || '제목 없음')}${p.pin ? ' ·고정' : ''}</b></a>` + pageTree(p.id, depth + 1, cur)).join('');
}
function blockHtml(b) {
  const id = b.id;
  const ctl = `<span class="bctl"><button class="x" data-act="bUp" data-b="${id}" aria-label="위로 옮기기">↑</button><button class="x" data-act="bDown" data-b="${id}" aria-label="아래로 옮기기">↓</button><select data-btype="${id}" aria-label="블록 종류">${BT.map(([k, v]) => `<option value="${k}" ${k === b.t ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="x" data-act="bDel" data-b="${id}" aria-label="블록 삭제">삭제</button></span>`;
  const ta = (f, ph) => `<textarea class="bta" rows="1" data-bf="${f}" data-b="${id}" placeholder="${ph}" aria-label="${ph}">${esc(b[f])}</textarea>`;
  let body;
  switch (b.t) {
    case 'h1': body = `<input class="bh1" data-bf="x" data-b="${id}" value="${esc(b.x)}" placeholder="큰 제목" aria-label="큰 제목">`; break;
    case 'h2': body = `<input class="bh2" data-bf="x" data-b="${id}" value="${esc(b.x)}" placeholder="작은 제목" aria-label="작은 제목">`; break;
    case 'bullet': body = `<span class="dot">•</span>${ta('x', '목록')}`; break;
    case 'todo': body = `<button class="ck" data-act="bTodo" data-b="${id}" aria-pressed="${!!b.done}" aria-label="완료 표시"></button>${ta('x', '할 일')}`; break;
    case 'toggle': body = `<details data-tg="${id}" ${b.open ? 'open' : ''}><summary><input class="bh2" data-bf="x" data-b="${id}" value="${esc(b.x)}" placeholder="토글 제목 (눌러서 펼치기)" aria-label="토글 제목"></summary>${ta('y', '펼쳐질 내용')}</details>`; break;
    case 'quote': body = ta('x', '인용·강조할 말'); break;
    case 'divider': body = '<hr>'; break;
    case 'link': body = `<input data-bf="x" data-b="${id}" value="${esc(b.x)}" placeholder="이름" aria-label="링크 이름"><input data-bf="u" data-b="${id}" value="${esc(b.u)}" placeholder="https://…" aria-label="링크 주소">${b.u ? `<a class="btn sm" href="${esc(/^https?:/.test(b.u) ? b.u : 'https://' + b.u)}" target="_blank" rel="noopener">열기</a>` : ''}`; break;
    case 'table': body = `<div class="tw"><table class="tbl pt"><tbody>${(b.rows || []).map((r, ri) => `<tr>${r.map((c, ci) => `<td><input data-bc="${id}" data-r="${ri}" data-c="${ci}" value="${esc(c)}" aria-label="${ri + 1}행 ${ci + 1}열"></td>`).join('')}</tr>`).join('')}</tbody></table><div><button class="x" data-act="tbl" data-op="addRow" data-b="${id}">+ 행</button><button class="x" data-act="tbl" data-op="addCol" data-b="${id}">+ 열</button><button class="x" data-act="tbl" data-op="delRow" data-b="${id}">− 행</button><button class="x" data-act="tbl" data-op="delCol" data-b="${id}">− 열</button></div></div>`; break;
    default: body = ta('x', '글을 쓰세요. 엔터를 누르면 다음 블록이 생깁니다.');
  }
  return `<div class="blk blk-${b.t}">${body}${ctl}</div>`;
}
function pagesView(id) {
  const pg = id && find('pages', id);
  const aside = `<aside class="nlist"><button class="btn" data-act="pageNew">+ 새 페이지</button>${pageTree('', 0, id) || '<p class="mu">페이지가 없습니다.</p>'}</aside>`;
  if (!pg) return `<div class="bh"><h2>내 페이지</h2><span class="mu">노션처럼 내가 만드는 페이지입니다. 글·체크·표·토글을 자유롭게 쌓으세요.</span></div><div class="nwrap pw">${aside}<div class="ned"><p>왼쪽에서 페이지를 고르거나 새로 만드세요.</p><div class="tools">${Object.keys(TEMPLATES).map(k => `<button class="btn" data-act="pageTpl" data-t="${esc(k)}">${esc(k)}로 시작</button>`).join('')}</div></div></div>`;
  return `<div class="bh"><h2>내 페이지</h2><span class="mu">입력하면 자동 저장됩니다. 꿈송이가 이 페이지도 찾아 줍니다.</span></div><div class="nwrap pw">${aside}
  <div class="ned"><input class="ptitle" data-pg="title" value="${esc(pg.title)}" placeholder="제목 없는 페이지" aria-label="페이지 제목">
  <div class="tools"><button class="btn sm" data-act="pageSub">+ 하위 페이지</button><button class="btn sm" data-act="pagePin">${pg.pin ? '오늘 게시판 고정 풀기' : '오늘 게시판에 고정'}</button><button class="btn sm" data-act="pageExport">내보내기(워드)</button><label class="chk"><input type="checkbox" data-pg="lock" ${pg.lock ? 'checked' : ''}> 이 기기에만 보관</label><button class="x" data-act="pageDel">페이지 삭제</button></div>
  <div class="blocks">${(pg.blocks || []).map(blockHtml).join('')}</div>
  <div class="addb"><span class="mu">블록 추가</span>${BT.map(([k, v]) => `<button class="chip" data-act="bAddT" data-t="${k}">${v}</button>`).join('')}</div></div></div>`;
}
function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
function mountPage() {
  $$('.bta').forEach(autosize);
  if (PF) { const el = $(`[data-b="${PF}"][data-bf="x"]`); if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) { } } PF = null; }
}
function pageDescendants(id) { return S.pages.filter(p => p.parent === id).flatMap(p => [p.id, ...pageDescendants(p.id)]); }
function makePage(title, tpl, parent) { const p = { id: uid(), title, parent: parent || '', blocks: (TEMPLATES[tpl] || TEMPLATES['빈 페이지'])(), pin: false, lock: false }; S.pages.push(p); save(); location.hash = '#/page/' + p.id; return p; }

Object.assign(A, {
  pageNew() { ask('새 페이지', [{ k: 'title', label: '제목', req: 1 }, { k: 'tpl', label: '틀', type: 'select', opts: Object.keys(TEMPLATES) }], o => makePage(o.title, o.tpl)); },
  pageTpl(el) { makePage(el.dataset.t, el.dataset.t); },
  pageSub() { const pg = curPage(); ask('하위 페이지', [{ k: 'title', label: '제목', req: 1 }, { k: 'tpl', label: '틀', type: 'select', opts: Object.keys(TEMPLATES) }], o => makePage(o.title, o.tpl, pg.id)); },
  pagePin() { const pg = curPage(); pg.pin = !pg.pin; commit(); toast(pg.pin ? '오늘 게시판에 고정했습니다.' : '고정을 풀었습니다.'); },
  pageDel() { const pg = curPage(); sure('이 페이지와 하위 페이지를 지울까요?', () => { const ids = [pg.id, ...pageDescendants(pg.id)]; S.pages = S.pages.filter(p => !ids.includes(p.id)); save(); location.hash = '#/pages'; }); },
  pageExport() {
    const pg = curPage();
    const h = (pg.blocks || []).map(b => ({ h1: `<h1>${esc(b.x)}</h1>`, h2: `<h2>${esc(b.x)}</h2>`, bullet: `<ul><li>${esc(b.x)}</li></ul>`, todo: `<p>${b.done ? '☑' : '☐'} ${esc(b.x)}</p>`, toggle: `<p><b>${esc(b.x)}</b><br>${esc(b.y)}</p>`, quote: `<blockquote>${esc(b.x)}</blockquote>`, divider: '<hr>', link: `<p><a href="${esc(b.u)}">${esc(b.x || b.u)}</a></p>`, table: `<table border="1" cellpadding="4">${(b.rows || []).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>` }[b.t] || `<p>${esc(b.x).replace(/\n/g, '<br>')}</p>`)).join('');
    download((pg.title || '페이지') + '.doc', `<html><meta charset="utf-8"><body><h1>${esc(pg.title)}</h1>${h}</body></html>`, 'application/msword');
  },
  bAddT(el) { const pg = curPage(), b = newBlock(el.dataset.t); pg.blocks.push(b); PF = b.id; commit(); },
  bDel(el) { const pg = curPage(); pg.blocks = pg.blocks.filter(b => b.id !== el.dataset.b); if (!pg.blocks.length) pg.blocks.push(newBlock('p')); commit(); },
  bUp(el) { const a = curPage().blocks, i = a.findIndex(b => b.id === el.dataset.b); if (i > 0) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; commit(); } },
  bDown(el) { const a = curPage().blocks, i = a.findIndex(b => b.id === el.dataset.b); if (i >= 0 && i < a.length - 1) { [a[i + 1], a[i]] = [a[i], a[i + 1]]; commit(); } },
  bTodo(el) { const pg = find('pages', el.dataset.p) || curPage(), b = pg && pg.blocks.find(x => x.id === el.dataset.b); if (b) { b.done = !b.done; commit(); } },
  tbl(el) { const b = blk(el.dataset.b), r = b.rows, op = el.dataset.op; if (op === 'addRow') r.push(r[0].map(() => '')); else if (op === 'addCol') r.forEach(x => x.push('')); else if (op === 'delRow' && r.length > 1) r.pop(); else if (op === 'delCol' && r[0].length > 1) r.forEach(x => x.pop()); commit(); }
});

const onPage = () => /^#\/page\//.test(location.hash);
let pt;
document.addEventListener('input', e => {
  const t = e.target; if (!onPage()) return; const pg = curPage(); if (!pg) return;
  if (t.dataset.pg === 'title') pg.title = t.value;
  else if (t.dataset.bf) { const b = blk(t.dataset.b); if (!b) return; b[t.dataset.bf] = t.value; if (t.classList.contains('bta')) autosize(t); }
  else if (t.dataset.bc) { const b = blk(t.dataset.bc); if (!b) return; b.rows[+t.dataset.r][+t.dataset.c] = t.value; }
  else return;
  save(true); clearTimeout(pt);
  pt = setTimeout(() => { save(); if (t.dataset.pg === 'title') { const a = $('.nlist a.on b'); if (a) a.textContent = pg.title || '제목 없음'; } }, 800);
});
document.addEventListener('change', e => {
  const t = e.target; if (!onPage()) return; const pg = curPage(); if (!pg) return;
  if (t.dataset.btype) { const b = blk(t.dataset.btype); b.t = t.value; if (b.t === 'table' && !b.rows) b.rows = [['', '', ''], ['', '', '']]; commit(); }
  else if (t.dataset.pg === 'lock') { pg.lock = t.checked; commit(); }
});
document.addEventListener('keydown', e => {
  const t = e.target; if (!t.dataset || t.dataset.bf !== 'x' || !onPage()) return;
  const pg = curPage(), b = blk(t.dataset.b); if (!pg || !b) return; const i = pg.blocks.indexOf(b);
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && b.t !== 'quote' && b.t !== 'link') {
    e.preventDefault();
    if ((b.t === 'bullet' || b.t === 'todo') && !b.x.trim()) { b.t = 'p'; PF = b.id; commit(); return; }
    const nb = newBlock(b.t === 'bullet' || b.t === 'todo' ? b.t : 'p'); pg.blocks.splice(i + 1, 0, nb); PF = nb.id; commit();
  } else if (e.key === 'Backspace' && !t.value && i > 0 && b.t !== 'toggle') {
    e.preventDefault(); const prev = pg.blocks[i - 1]; pg.blocks.splice(i, 1); PF = prev.id; commit();
  }
});
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.tg) { const b = blk(d.dataset.tg); if (b) { b.open = d.open; save(true); } } }, true);

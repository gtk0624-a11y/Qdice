/* 서랍: 자주 가는 사이트 모음 (검색·즐겨찾기·분류·넣기/고치기/빼기·백업). 주소만 저장하며 비밀번호는 저장하지 않습니다. */
let DWTAB = '전체';
const dwCats = () => [...new Set(S.links.map(l => l.cat).filter(Boolean))];
const dwUrl = u => { u = (u || '').trim(); if (/^(javascript|data):/i.test(u)) return ''; return /^https?:\/\//i.test(u) ? u : 'https://' + u; };
function dwList() {
  let L = S.links.slice();
  if (DWTAB === '즐겨찾기') L = L.filter(l => l.fav);
  else if (DWTAB === '최근') L = L.filter(l => l.last).sort((a, b) => b.last - a.last).slice(0, 8);
  else if (DWTAB !== '전체') L = L.filter(l => (l.cat || '') === DWTAB);
  if (DWTAB !== '최근') L.sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
  return L;
}
let DWEDIT = false;
const dwHost = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
const DW_COL = { '수업': '#2563eb', '업무': '#059669', '개인': '#ea580c', '기타': '#6b7280' };
const dwColor = c => DW_COL[c] || ['#7c3aed', '#db2777', '#0891b2', '#ca8a04', '#4f46e5'][[...String(c)].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 5];
function dwRow(l) {
  const c = l.cat || '기타', ic = [...String(l.name || '?')][0];
  return `<li class="dwr" data-q="${esc((l.name + ' ' + l.url + ' ' + c).toLowerCase())}"><button class="dwst ${l.fav ? 'on' : ''}" data-act="dwFav" data-id="${l.id}" aria-label="즐겨찾기">${l.fav ? '★' : '☆'}</button><a data-dwgo="${l.id}" href="${esc(l.url)}" target="_blank" rel="noopener"><i class="dwic" style="background:${dwColor(c)}">${esc(ic)}</i><span class="dwtx"><b>${esc(l.name)}</b><small>${esc(dwHost(l.url))}</small></span></a>${DWEDIT ? `<button class="x" data-act="dwEdit" data-id="${l.id}" aria-label="고치기">✎</button><button class="x" data-act="dwDel" data-id="${l.id}" aria-label="빼기">✕</button>` : ''}</li>`;
}
function drawerHtml() {
  if (!Array.isArray(S.links)) S.links = []; S.links = S.links.filter(l => l && typeof l === 'object');
  const L = S.links, favs = L.filter(l => l.fav), recent = L.filter(l => l.last).sort((a, b) => b.last - a.last).slice(0, 4);
  const cats = [...new Set(L.map(l => l.cat || '기타'))].sort((a, b) => { const o = ['수업', '업무', '개인', '기타'], ia = o.indexOf(a), ib = o.indexOf(b); return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib); });
  const groups = cats.map(c => { const g = L.filter(l => (l.cat || '기타') === c); return `<details class="dwg" open><summary><i style="background:${dwColor(c)}"></i><b>${esc(c)}</b><em>${g.length}</em></summary><ul class="dwl">${g.map(dwRow).join('')}</ul></details>`; }).join('');
  return `<section class="drawer dw"><div class="dwf"><b>서랍</b>${favs.map(l => `<a data-dwgo="${l.id}" href="${esc(l.url)}" target="_blank" rel="noopener">★ ${esc(l.name)}</a>`).join('') || '<span class="mu">자주 가는 사이트를 넣고 ☆를 누르면 여기에 바로 보입니다</span>'}</div>
<details class="dwd" data-k="dw" ${OPEN.has('dw') ? 'open' : ''}><summary>사이트 찾기 · 서랍 열기 (${L.length}개)<i class="chev"></i></summary><div class="dwb dwv2">
<div class="dwbar"><input type="search" class="dws" data-dsearch placeholder="🔍 이름으로 찾기"><button class="btn sm pri" data-act="add_links">+ 추가</button><button class="btn sm ${DWEDIT ? 'pri' : ''}" data-act="dwEditMode">${DWEDIT ? '✔ 편집 끝' : '✎ 편집'}</button></div>
${recent.length ? `<div class="dwrc"><span>🕘 최근</span>${recent.map(l => `<a data-dwgo="${l.id}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a>`).join('')}</div>` : ''}
${favs.length ? `<details class="dwg dwfav" open><summary><i style="background:#f59e0b"></i><b>⭐ 즐겨찾기</b><em>${favs.length}</em></summary><ul class="dwl">${favs.map(dwRow).join('')}</ul></details>` : ''}
${groups || '<p class="mu">서랍이 비어 있습니다. 「+ 추가」로 자주 가는 사이트의 주소를 넣어 보세요.</p>'}
<div class="tools"><button class="btn sm" data-act="dwSave">백업 저장</button><label class="btn sm">백업 불러오기<input type="file" accept=".json,application/json" id="dwUp" hidden></label></div>
<p class="mu">주소만 저장합니다(아이디·비밀번호 저장 안 함). 평소 업무포털에 로그인하는 같은 브라우저에서 열어야 로그인이 이어집니다. 다른 컴퓨터로 옮길 때는 백업 저장 → 백업 불러오기를 쓰세요.</p></div></details></section>`;
}
const dwFind = id => S.links.find(l => l.id === id);
const dwFields = l => [{ k: 'name', label: '이름', val: l.name, req: 1 }, { k: 'url', label: '주소(https://…)', val: l.url, req: 1 }, { k: 'cat', label: '분류(선택) 예: 업무, 수업, 개인', val: l.cat || '', ph: dwCats().join(', ') }];
Object.assign(A, {
  add_links() { ask('서랍에 사이트 넣기', dwFields({}), o => { const u = dwUrl(o.url); if (!u) return toast('이 주소는 넣을 수 없습니다.'); S.links.push({ id: uid(), name: o.name.trim(), url: u, cat: (o.cat || '').trim(), fav: false }); OPEN.add('dw'); localStorage.setItem('tf.open', JSON.stringify([...OPEN])); commit(); }); },
  dwEdit(el) { const l = dwFind(el.dataset.id); if (!l) return; ask('사이트 고치기', dwFields(l), o => { const u = dwUrl(o.url); if (!u) return toast('이 주소는 넣을 수 없습니다.'); Object.assign(l, { name: o.name.trim(), url: u, cat: (o.cat || '').trim() }); commit(); }); },
  dwDel(el) { const l = dwFind(el.dataset.id); if (!l) return; sure(`「${l.name}」을(를) 서랍에서 뺄까요?`, () => { S.links = S.links.filter(x => x.id !== l.id); commit(); }); },
  dwFav(el) { const l = dwFind(el.dataset.id); if (!l) return; l.fav = !l.fav; commit(); },
  dwTab(el) { DWTAB = el.dataset.t; render(); },
  dwEditMode() { DWEDIT = !DWEDIT; OPEN.add('dw'); render(); },
  dwSave() { download('업무파탈_서랍_' + today() + '.json', JSON.stringify(S.links.map(({ name, url, cat, fav }) => ({ name, url, cat, fav })), null, 1), 'application/json'); toast('서랍 목록을 파일로 저장했습니다.'); },
  manageLinks() { }
});
document.addEventListener('input', e => {
  if (!e.target.matches('[data-dsearch]')) return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.dwl li[data-q]').forEach(li => { li.hidden = !!q && !li.dataset.q.includes(q); });
  document.querySelectorAll('.dwg').forEach(g => { g.hidden = !!q && ![...g.querySelectorAll('li[data-q]')].some(li => !li.hidden); if (q) g.open = true; });
});
document.addEventListener('click', e => {
  const a = e.target.closest('[data-dwgo]'); if (!a) return;
  const l = dwFind(a.dataset.dwgo); if (l) { l.last = Date.now(); save(true); }
});
document.addEventListener('change', async e => {
  if (e.target.id !== 'dwUp') return;
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const arr = JSON.parse(await f.text()); if (!Array.isArray(arr)) throw 0;
    let n = 0;
    arr.forEach(o => { const u = dwUrl(o && o.url); if (!u || !o.name || S.links.some(l => l.url === u)) return; S.links.push({ id: uid(), name: String(o.name), url: u, cat: String(o.cat || ''), fav: !!o.fav }); n++; });
    toast(n + '개를 불러왔습니다.'); commit();
  } catch (er) { toast('백업 파일을 읽지 못했습니다.'); }
});

/* ---- 연수 사이트 모음 (연수 줄 안에 표시) ---- */
function trSites() { if (!Array.isArray(S.trSites)) S.trSites = []; return S.trSites; }
function trUrl(u) { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) { if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''; u = 'https://' + u; } return u; }
function trSitesHtml() {
  const L = trSites();
  return `<div class="trsites"><h4>연수 사이트 <span class="mu">(자주 가는 연수 사이트를 직접 넣어 두고, 눌러서 바로 여세요)</span></h4><div class="trchips">${L.length ? '' : '<span class="mu">아직 없습니다. 아래 버튼으로 추가하세요.</span>'}${L.map(x => `<span class="trchip"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)} ↗</a><button class="x" data-act="trSiteEdit" data-id="${x.id}" aria-label="${esc(x.name)} 수정">✎</button><button class="x" data-act="trSiteDel" data-id="${x.id}" aria-label="${esc(x.name)} 삭제">✕</button></span>`).join('')}</div><button class="btn sm" data-act="trSiteAdd">+ 연수 사이트 추가</button></div>`;
}
const trSiteForm = (x, done) => ask(x ? '연수 사이트 고치기' : '연수 사이트 추가', [{ k: 'name', label: '이름 (예: 경기도교육연수원)', val: x ? x.name : '', req: 1 }, { k: 'url', label: '주소 (https://…)', val: x ? x.url : '' }], o => {
  const url = trUrl(o.url); if (!o.name.trim() || !url) { toast('이름과 올바른 주소(https://…)를 넣어 주세요.'); return; }
  done(o.name.trim(), url); commit();
}, '저장');
A.trSiteAdd = () => trSiteForm(null, (name, url) => trSites().push({ id: uid(), name, url }));
A.trSiteEdit = el => { const x = trSites().find(v => v.id === el.dataset.id); if (x) trSiteForm(x, (name, url) => { x.name = name; x.url = url; }); };
A.trSiteDel = el => { const x = trSites().find(v => v.id === el.dataset.id); if (x) sure('「' + x.name + '」를 목록에서 뺄까요?', () => { S.trSites = trSites().filter(v => v !== x); commit(); }); };

/* v180: 위쪽 메뉴의 「🗄 서랍」 버튼 — 화면 맨 아래까지 내려가지 않고 서랍을 바로 연다 */
Object.assign(A, { dwJump() {
  let d = document.getElementById('dwdlg'); if (d) d.remove();
  d = document.createElement('dialog'); d.id = 'dwdlg'; d.className = 'dlg';
  let h = ''; try { h = drawerHtml(); } catch (e) { h = '<p class="mu">서랍을 불러오지 못했습니다: ' + esc(e.message) + '</p>'; }
  d.innerHTML = '<form method="dialog"><h3>🗄 서랍</h3>' + h.replace('<details class="dwd"', '<details class="dwd" open') + '<div class="btns"><button value="x" class="pri">닫기</button></div></form>';
  document.body.appendChild(d); d.addEventListener('close', () => d.remove()); d.showModal();
} });

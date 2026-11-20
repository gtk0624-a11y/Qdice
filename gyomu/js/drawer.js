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
function drawerHtml() {
  const L = S.links, favs = L.filter(l => l.fav);
  const tabs = ['전체', '즐겨찾기', '최근', ...dwCats()];
  const items = dwList().map(l => `<li data-q="${esc((l.name + ' ' + l.url + ' ' + (l.cat || '')).toLowerCase())}"><button class="dwst ${l.fav ? 'on' : ''}" data-act="dwFav" data-id="${l.id}" aria-label="즐겨찾기">${l.fav ? '★' : '☆'}</button><a data-dwgo="${l.id}" href="${esc(l.url)}" target="_blank" rel="noopener"><b>${esc(l.name)}</b>${l.cat ? `<small>${esc(l.cat)}</small>` : ''}</a><button class="x" data-act="dwEdit" data-id="${l.id}" aria-label="고치기">✎</button><button class="x" data-act="dwDel" data-id="${l.id}" aria-label="빼기">✕</button></li>`).join('');
  return `<section class="drawer dw"><div class="dwf"><b>서랍</b>${favs.map(l => `<a data-dwgo="${l.id}" href="${esc(l.url)}" target="_blank" rel="noopener">★ ${esc(l.name)}</a>`).join('') || '<span class="mu">자주 가는 사이트를 넣고 ☆를 누르면 여기에 바로 보입니다</span>'}</div>
<details class="dwd" data-k="dw" ${OPEN.has('dw') ? 'open' : ''}><summary>서랍 열기 (${L.length}개)<i class="chev"></i></summary><div class="dwb">
<div class="tools"><input type="search" class="dws" data-dsearch placeholder="사이트 검색 (이름·주소·분류)"><button class="btn sm pri" data-act="add_links">+ 사이트 넣기</button><button class="btn sm" data-act="dwSave">백업 저장</button><label class="btn sm">백업 불러오기<input type="file" accept=".json,application/json" id="dwUp" hidden></label></div>
<div class="dwt">${tabs.map(t => `<button class="${t === DWTAB ? 'on' : ''}" data-act="dwTab" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
<ul class="dwl">${items || '<li class="mu">이 분류에 사이트가 없습니다.</li>'}</ul>
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
  dwSave() { download('업무파탈_서랍_' + today() + '.json', JSON.stringify(S.links.map(({ name, url, cat, fav }) => ({ name, url, cat, fav })), null, 1), 'application/json'); toast('서랍 목록을 파일로 저장했습니다.'); },
  manageLinks() { }
});
document.addEventListener('input', e => {
  if (!e.target.matches('[data-dsearch]')) return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.dwl li[data-q]').forEach(li => { li.hidden = !!q && !li.dataset.q.includes(q); });
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

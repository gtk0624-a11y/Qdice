/* 업무 강화 묶음: ① 나이스 학사일정 통째로 가져오기 ② (이어서) 내 업무 카드 · 파일 읽기 미리보기 */

/* ---------- ① 나이스 학사일정 → 캘린더 ---------- */
async function neisGet2(name, q, size) {
  const key = (S.profile.neisKey || '').trim(), u = new URL('https://open.neis.go.kr/hub/' + name);
  u.searchParams.set('Type', 'json'); u.searchParams.set('pIndex', 1); u.searchParams.set('pSize', size); if (key) u.searchParams.set('KEY', key);
  Object.keys(q).forEach(k => u.searchParams.set(k, q[k]));
  const c = new AbortController(), t = setTimeout(() => c.abort(), 9000);
  try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); if (j.RESULT && j.RESULT.CODE === 'INFO-200') return []; if (j.RESULT && j.RESULT.CODE !== 'INFO-000') throw new Error(j.RESULT.MESSAGE || j.RESULT.CODE); return (j[name] && j[name][1] && j[name][1].row) || []; } finally { clearTimeout(t); }
}
const nDay = (d, n) => { const x = new Date(d.getTime() + n * 864e5); return x; };
async function neisSchedLive(sc, sy, onProg) {
  const key = (S.profile.neisKey || '').trim(), size = key ? 1000 : 5, step = key ? 92 : 3, out = [], base = { ATPT_OFCDC_SC_CODE: sc.atpt, SD_SCHUL_CODE: sc.code };
  const start = new Date(sy, 2, 1), end = new Date(sy + 1, 2, 0), wins = []; for (let d = start; d <= end; d = nDay(d, step)) wins.push([d, new Date(Math.min(nDay(d, step - 1).getTime(), end.getTime()))]);
  let done = 0, fail = 0;
  const one = async (a, b) => {
    let rows; try { rows = await neisGet2('SchoolSchedule', Object.assign({ AA_FROM_YMD: ymd8(a), AA_TO_YMD: ymd8(b) }, base), size); } catch (e) { fail++; return; }
    if (rows.length >= size && b > a) { /* 한도에 걸렸으면 하루씩 다시 */ for (let d = a; d <= b; d = nDay(d, 1)) { try { rows = rows.concat(await neisGet2('SchoolSchedule', Object.assign({ AA_FROM_YMD: ymd8(d), AA_TO_YMD: ymd8(d) }, base), size)); } catch (e) { fail++; } } }
    out.push(...rows);
  };
  const q = wins.slice(); const worker = async () => { while (q.length) { const w = q.shift(); await one(w[0], w[1]); done++; if (onProg) onProg(done, wins.length); } };
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  if (fail > wins.length / 2) throw new Error('나이스 연결 실패');
  const seen = new Set(), ev = []; out.forEach(r => { const k = r.AA_YMD + '|' + r.EVENT_NM; if (seen.has(k)) return; seen.add(k); ev.push({ d: r.AA_YMD, n: String(r.EVENT_NM || '').trim(), c: String(r.EVENT_CNTNT || '').trim(), h: r.SBTR_DD_SC_NM || '' }); });
  return ev;
}
function schedApply(ev) { /* 같은 행사가 이어지는 날짜는 기간 하나로 합쳐 넣음 */
  const by = {}; ev.forEach(e => { if (e.n) (by[e.n] = by[e.n] || []).push(e); });
  const items = [];
  Object.keys(by).forEach(n => {
    const L = by[n].sort((a, b) => a.d.localeCompare(b.d)); let cur = null;
    L.forEach(e => { const d = iso8(e.d); if (cur && Math.round((new Date(d) - new Date(cur.last)) / 864e5) <= 1) { cur.last = d; } else { if (cur) items.push(cur); cur = { n, first: d, last: d, c: e.c, h: e.h }; } }); if (cur) items.push(cur);
  });
  S.items = S.items.filter(i => i.nid !== 'neis');
  items.forEach(x => S.items.push({ id: uid(), title: x.n + (x.h && /휴업/.test(x.h) ? ' (휴업일)' : ''), date: x.first, end: x.last > x.first ? x.last : '', cat: 'event', src: '학사', nid: 'neis', memo: x.c && x.c !== x.n ? x.c : '', done: false }));
  S.schedAt = Date.now(); commit(); return items.length;
}
async function schedNeis(silent) {
  if (window.TF_DEMO) { if (!silent) toast('체험판에서는 나이스에 연결하지 않습니다.'); return 0; }
  const sy = schoolYearNow(); let sc = SCH.school;
  if (!sc) { try { await schoolLoad(true); } catch (e) { } sc = SCH.school; }
  if (!sc) { if (!silent) toast('먼저 설정에서 학교 이름을 넣어 주세요. (예: 곡선중학교)'); return 0; }
  let ev = null, how = '';
  try { if (!silent) toast('나이스에서 학사일정을 받는 중… (1분 안팎)'); ev = await neisSchedLive(sc, sy, (a, b) => { if (!silent && a % 20 === 0) toast(`받는 중 ${a}/${b}`); }); how = '나이스 직접'; if (!ev.length) ev = null; } catch (e) { ev = null; }
  if (!ev) { try { const r = await fetch(NEIS_JSON, { cache: 'no-store' }), j = await r.json(); if (j.schedule && j.schedule.length) { ev = j.schedule; how = '매일 새벽 자료'; } } catch (e) { } }
  if (!ev || !ev.length) { if (!silent) toast('학사일정을 받지 못했습니다. 학교 이름을 확인하거나, 아래 [학사일정 파일 올리기]를 써 주세요.'); return 0; }
  const n = schedApply(ev); if (!silent) toast(`학사일정 ${n}건을 캘린더에 넣었습니다 (${how}).`); return n;
}
A.schedNeis = () => schedNeis(false);
setTimeout(() => { try { if (S.setup && S.profile.school && Date.now() - (S.schedAt || 0) > 24 * 3600 * 1000) schedNeis(true); } catch (e) { } }, 4000);

/* ---------- 되돌리기: 큰 변화(여러 건 추가·삭제) 직전 상태를 자동으로 보관 ---------- */
const SNAPK = ['items', 'wk', 'duties', 'mine', 'docLog', 'contacts', 'training', 'dayMemo', 'notes', 'yp'];
let SNAPS = [], _prevJ = '', _prevSig = null;
idb.get('snaps').then(v => { SNAPS = v || []; }).catch(() => { });
const snapPick = () => { const o = {}; SNAPK.forEach(k => { if (S[k] !== undefined) o[k] = S[k]; }); return o; };
const snapSig = o => SNAPK.map(k => { const v = o[k]; return Array.isArray(v) ? v.length : v && Array.isArray(v.cards) ? v.cards.length : v && Array.isArray(v.rows) ? v.rows.length : v && typeof v === 'object' ? Object.keys(v).length : 0; });
function snapInit() { try { _prevJ = JSON.stringify(snapPick()); _prevSig = snapSig(snapPick()); } catch (e) { } }
function snapPush(label, j) { SNAPS.unshift({ t: Date.now(), label, j }); SNAPS = SNAPS.slice(0, 12); idb.set('snaps', SNAPS).catch(() => { }); }
{ const _c = commit; commit = function () {
  try {
    const cur = snapPick(), sig = snapSig(cur);
    if (_prevSig) { const d = sig.map((v, i) => v - _prevSig[i]), big = d.some((v, i) => v >= 3 || (v < 0 && ['items', 'wk', 'duties', 'mine', 'contacts'].includes(SNAPK[i])));
      if (big) { const lab = d.map((v, i) => v ? ({ items: '일정', wk: '업무카드', duties: '업무분장', mine: '내 업무', docLog: '공문', contacts: '연락망', training: '연수', dayMemo: '메모', notes: '기록', yp: '교육표' }[SNAPK[i]]) + (v > 0 ? ' +' : ' ') + v : '').filter(Boolean).join(', '); if (!SNAPS[0] || SNAPS[0].j !== _prevJ) snapPush(lab || '변경', _prevJ); } }
    _prevJ = JSON.stringify(cur); _prevSig = sig;
  } catch (e) { }
  return _c.apply(this, arguments);
}; }
setTimeout(snapInit, 600);
function undoBtn() { return `<button class="btn sm" data-act="undoPick">↩ 되돌리기${SNAPS.length ? ' (' + SNAPS.length + ')' : ''}</button>`; }
A.undoPick = () => {
  let d = document.getElementById('undodlg'); if (d) d.remove(); d = document.createElement('dialog'); d.id = 'undodlg'; d.className = 'dlg'; document.body.appendChild(d);
  const tm = t => { const x = new Date(t); return `${x.getMonth() + 1}/${x.getDate()} ${pad(x.getHours())}:${pad(x.getMinutes())}`; };
  d.innerHTML = `<h3>↩ 되돌리기</h3><p class="mu">여러 건을 넣거나 지우기 직전의 상태를 자동으로 보관해 둡니다(최근 12개). 고르면 그때로 돌아가며, 지금 상태도 하나 보관되어 다시 돌아올 수 있습니다. 시간표·예산·수업 기록은 건드리지 않습니다.</p>${SNAPS.length ? SNAPS.map((s, i) => `<div class="cmr"><span>${tm(s.t)} 이전 상태 <small class="mu">(${esc(s.label)})</small></span><button class="btn sm" data-undo="${i}">이 상태로 되돌리기</button></div>`).join('') : '<p class="mu">아직 보관된 상태가 없습니다.</p>'}<div class="tools"><button class="btn" id="undox">닫기</button></div>`;
  d.addEventListener('click', e => { const b = e.target.closest('[data-undo]'); if (e.target.id === 'undox' || e.target === d) { d.close(); d.remove(); return; } if (!b) return; const s = SNAPS[+b.dataset.undo]; if (!s) return; snapPush('되돌리기 직전', JSON.stringify(snapPick())); const o = JSON.parse(s.j); Object.keys(o).forEach(k => { S[k] = o[k]; }); d.close(); d.remove(); _prevJ = ''; _prevSig = null; save(); render(); snapInit(); toast('이전 상태로 되돌렸습니다.'); });
  d.showModal();
};


/* hwpx·docx 본문(XML) → 글자. 표는 한 줄에 한 행, 칸은 ' | '로 나눔 */
function xmlDocText(str) {
  const doc = new DOMParser().parseFromString(str, 'application/xml'); if (doc.getElementsByTagName('parsererror').length) throw new Error('xml');
  const norm = s => s.replace(/\s+/g, ' ').trim();
  function para(p, st) { for (const c of p.childNodes) { if (c.nodeType !== 1) continue; const l = c.localName; if (l === 't') st.t += c.textContent; else if (l === 'tab' || l === 'lineBreak' || l === 'br') st.t += ' '; else if (l === 'tbl') st.tb.push(c); else para(c, st); } }
  function walk(n, out) { for (const c of n.childNodes) { if (c.nodeType !== 1) continue; const l = c.localName; if (l === 'tbl') out.push(table(c)); else if (l === 'p') { const st = { t: '', tb: [] }; para(c, st); if (norm(st.t)) out.push(norm(st.t)); st.tb.forEach(t => out.push(table(t))); } else walk(c, out); } }
  function cellText(tc) { const out = []; walk(tc, out); return norm(out.join(' ')); }
  function table(tbl) { const rows = []; (function find(n) { for (const c of n.childNodes) { if (c.nodeType !== 1) continue; if (c.localName === 'tr') { const cells = []; for (const x of c.childNodes) if (x.nodeType === 1 && x.localName === 'tc') cells.push(cellText(x)); rows.push(cells.join(' | ')); } else if (c.localName !== 'tc') find(c); } })(tbl); return rows.join('\n'); }
  const out = []; walk(doc.documentElement, out); return out.join('\n');
}

/* ---------- 한글 파일 읽기 보강: 확장자가 아니라 파일 머리(매직)로 종류 판별 ---------- */
{ const _rf = readFile; readFile = async function (f) {
  const n = f.name.toLowerCase();
  if (/\.(hwp|hwpx)$/.test(n)) {
    const h = new Uint8Array(await f.slice(0, 8).arrayBuffer()), ole = h[0] === 0xD0 && h[1] === 0xCF, zip = h[0] === 0x50 && h[1] === 0x4B;
    const base = f.name.replace(/\.(hwpx?)$/i, '');
    if (zip && !/\.hwpx$/.test(n)) return readFile(new File([f], base + '.hwpx'));
    if (ole && !/\.hwp$/.test(n)) return readFile(new File([f], base + '.hwp'));
    if (!ole && !zip) { const tx = await f.text(); if (/<HWPML|<\?xml/i.test(tx.slice(0, 400))) { const t = tx.replace(/<\/(P|ROW)>/gi, '\n').replace(/<\/CELL>/gi, ' | ').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); if (t.trim()) return t; } throw new Error('한글 파일 형식을 알아보지 못했습니다. 한글에서 [다른 이름으로 저장]으로 hwpx나 PDF로 저장해 올려 주세요.'); }
    if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저는 한글 압축을 풀지 못합니다. 크롬·엣지 최신 버전에서 열어 주세요.');
  }
  if (/\.(hwpx|docx)$/.test(n)) { /* 표를 줄(행)·칸 단위로 정확히 풀어 읽기 — 한 칸 한 줄로 흩어지던 문제 수정 */
    try {
      const z = zipIndex(await f.arrayBuffer()), isH = /\.hwpx$/.test(n);
      const names = isH ? Object.keys(z.out).filter(k => /^Contents\/section\d+\.xml$/i.test(k)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/))) : (z.out['word/document.xml'] ? ['word/document.xml'] : []);
      if (!names.length) throw new Error('본문을 찾지 못했습니다');
      let out = ''; for (const nm of names) out += xmlDocText(new TextDecoder().decode(await zipRead(z, nm))) + '\n\f';
      if (out.replace(/[\s\f|]/g, '')) return out;
    } catch (e) { if (/암호|본문/.test(e.message)) throw e; }
  }
  if (/\.doc$/.test(n)) throw new Error('옛날 워드(.doc)는 읽지 못합니다. 워드에서 .docx나 PDF로 저장해 올려 주세요.');
  return _rf(f);
}; }

/* ---------- 업무분장표 읽기(표 구조·병합 칸·내 이름 정확히 맞추기) ---------- */
const WK_TITLE = /(부장|교사|교감|교장|선생님|선생|샘|주무관|실무사|실무원|담임|님|수석|보직|행정|주무)$/;
const wkCellsOf = l => (/\s\|\s|^\||\|$|\t/.test(l) ? l.split(/\s*\|\s*|\t/) : l.split(',')).map(s => s.replace(/^"|"$/g, '').replace(/\s+/g, ' ').trim());
const wkTokens = s => String(s || '').replace(/\([^)]*\)/g, ' ').split(/[,、·\/\n\s]+/).map(t => t.replace(WK_TITLE, '').trim()).filter(t => /^[가-힣]{2,4}$/.test(t));
const wkIsName = s => { const t = wkTokens(s); return t.length >= 1 && String(s).length <= 24; };
const wkSplitWork = w => [...new Set(String(w || '').replace(/\s+(?=[○●ㆍ•▪■◦▶▷◆◇※]\s?)/g, '\n').replace(/\s+(?=\d{1,2}\s*[.)]\s)/g, '\n').split(/\n|;|ㆍ/).map(s => s.replace(/^[\-\d.)\s○●•▪■◦▶▷◆◇※·]+/, '').trim()).filter(s => s.length > 1))];
function wkParse(text, me) {
  const rows = String(text || '').split(/\n|\f/).map(l => l.trim()).filter(Boolean).map(wkCellsOf).filter(c => c.filter(Boolean).length >= 2);
  if (!rows.length) return [];
  let hi = -1, nameI = -1, workI = -1, deptI = -1;
  for (let i = 0; i < Math.min(rows.length, 12); i++) { const c = rows[i]; const w = c.findIndex(x => /업무|사무|분장/.test(x)), n = c.findIndex(x => /^(성\s*명|이\s*름|담당자?|담당\s*교사|교\s*사|담당)$/.test(x.replace(/\s/g, '')) || /성명|이름/.test(x)); if (w >= 0 && n >= 0 && w !== n && c.join('').length < 80) { hi = i; workI = w; nameI = n; deptI = c.findIndex((x, k) => k !== w && k !== n && /(부서|^부$|영역|구분|담당부)/.test(x)); break; } }
  let hl = 0;
  if (hi >= 0) hl = rows[hi].length;
  else { /* 머리글이 없으면: 오른쪽에서부터 '이름처럼 생긴 칸'이 많은 열을 이름 열로, 가장 긴 글이 많은 열을 업무 열로 */
    const L = Math.max(...rows.slice(0, 40).map(r => r.length)); hl = L; const body = rows.filter(r => r.length === L);
    if (body.length >= 2) { let best = -1, bs = 0; for (let k = L - 1; k >= 0; k--) { const sc = body.filter(r => wkIsName(r[k])).length / body.length; if (sc > bs + 0.05 && sc >= 0.5) { bs = sc; best = k; } if (sc >= 0.8) { best = k; break; } } nameI = best;
      let bl = 0; for (let k = 0; k < L; k++) { if (k === nameI) continue; const av = body.reduce((a, r) => a + (r[k] || '').length, 0) / body.length; if (av > bl) { bl = av; workI = k; } } deptI = -1; for (let k = 0; k < L; k++) if (k !== nameI && k !== workI) { deptI = k; break; } }
  }
  if (nameI < 0 || workI < 0) return [];
  const out = []; let dept = '';
  rows.forEach((c, ri) => {
    if (ri === hi) return; const off = hl - nameI, offW = hl - workI, offD = deptI >= 0 ? hl - deptI : 0, len = c.length;
    const ni = len - off, wi = len - offW, di = deptI >= 0 ? len - offD : -1;
    if (ni < 0 || wi < 0 || ni >= len || wi >= len) return; const nameC = c[ni] || '', work = c[wi] || ''; if (!work || !nameC || /^(성명|이름|업무)/.test(nameC)) return;
    if (di >= 0 && di < len && c[di] && di !== ni && di !== wi) dept = c[di];
    if (!wkIsName(nameC) && !(me && wkTokens(nameC).length)) return;
    const toks = wkTokens(nameC), mine = !!me && toks.some(t => t === me);
    out.push({ dept, work, who: toks.join(', ') || nameC, mine });
  });
  return out;
}
/* 단서 해석: 부서 이름·사람 이름·전부/모두 */
function wkClueSel(clue, rows, me) {
  const sel = new Set(), why = []; clue = String(clue || '').trim(); if (!clue) return { sel, why };
  const depts = [...new Set(rows.map(r => r.dept).filter(Boolean))], tok = (clue.match(/[가-힣]{2,}/g) || []);
  const norm = s => s.replace(/(부장|부서|부|과|팀|실|선생님들?|샘들?|들)$/, '');
  depts.forEach(d => { const nd = norm(d); if (nd.length >= 2 && (clue.includes(d) || clue.includes(nd) || tok.some(t => norm(t).length >= 2 && (nd.includes(norm(t)) || norm(t).includes(nd))))) { rows.forEach((r, i) => { if (r.dept === d) sel.add(i); }); why.push(d); } });
  const people = [...new Set(rows.flatMap(r => wkTokens(r.who)))]; people.forEach(p => { if (p !== me && clue.includes(p)) { rows.forEach((r, i) => { if (wkTokens(r.who).includes(p)) sel.add(i); }); why.push(p + ' 샘'); } });
  if (!sel.size && /전부|모두|전체|다\s*만/.test(clue)) rows.forEach((r, i) => sel.add(i));
  return { sel, why };
}

/* ---------- 내 업무 (업무 배너): 업무분장표 이름대로 업무 카드 ---------- */
const wkD = () => {
  const w = S.wk = S.wk || { cards: [], trash: [] }; w.cards = w.cards || []; w.trash = w.trash || [];
  if (Array.isArray(S.mine) && S.mine.length) S.mine.splice(0).forEach(m => w.cards.push({ id: m.id, title: m.title, dept: m.cat === '기타' ? '' : (m.cat || ''), who: '', me: true, memo: m.memo || '', due: '', done: !!m.done, steps: [], src: '이전 내 업무' }));
  return w;
};
const wkMe = () => (S.profile.name || '').trim();
const wkTab = () => UI.wkTab || 'me';
function wkCard(c) {
  const dl = c.due ? dd(c.due) : null, steps = c.steps || [], sd = steps.filter(s => s.d).length;
  return `<div class="wkc ${c.done ? 'dn' : ''} ${c.me ? '' : 'oth'}" data-id="${c.id}">
  <div class="wkh"><button class="ck" data-act="wkTog" data-id="${c.id}" aria-pressed="${!!c.done}" aria-label="완료 표시"></button><b class="wkt">${esc(c.title)}</b></div>
  <div class="wkm">${c.dept ? `<span class="chp k-학사">${esc(c.dept)}</span>` : ''}${c.me ? '<span class="chp k-일정">내 업무</span>' : (c.who ? `<span class="chp k-평가">👤 ${esc(c.who)}</span>` : '')}${c.due ? `<span class="chp k-할">${md(c.due)} ${dl === null ? '' : ddText(dl)}</span>` : ''}${steps.length ? `<span class="mu">${sd}/${steps.length}</span>` : ''}</div>
  ${steps.map((s, i) => `<div class="wks ${s.d ? 'dn' : ''}"><input type="checkbox" data-wkstep="${c.id}|${i}" ${s.d ? 'checked' : ''} aria-label="단계 완료"><span>${esc(s.t)}</span><button class="x" data-act="wkStepDel" data-id="${c.id}" data-i="${i}" aria-label="단계 삭제">✕</button></div>`).join('')}
  <textarea data-wkmemo="${c.id}" rows="2" placeholder="메모·진행 상황·관련 공문 번호" aria-label="${esc(c.title)} 메모">${esc(c.memo || '')}</textarea>
  <div class="wkb"><button class="btn sm" data-act="wkStep" data-id="${c.id}">+ 할 일</button><button class="btn sm" data-act="wkEdit" data-id="${c.id}">✎ 수정</button><button class="btn sm" data-act="wkDel" data-id="${c.id}">삭제</button></div></div>`;
}
function workView() {
  const W = wkD(), me = wkMe(), tab = wkTab(), C = W.cards;
  const depts = [...new Set(C.filter(c => !c.me).map(c => c.dept || '기타'))];
  const tabs = [['me', `내 업무 ${C.filter(c => c.me).length}`], ['all', `전체 ${C.length}`], ...depts.map(d => ['d:' + d, `${d} ${C.filter(c => !c.me && (c.dept || '기타') === d).length}`])];
  let L = tab === 'me' ? C.filter(c => c.me) : tab === 'all' ? C : C.filter(c => !c.me && (c.dept || '기타') === tab.slice(2));
  const g = {}; L.forEach(c => (g[c.dept || '기타'] = g[c.dept || '기타'] || []).push(c));
  const body = Object.keys(g).map(d => `<h4 class="dlh">${esc(d)} <small class="mu">${g[d].length}건</small></h4><div class="wkg">${g[d].map(wkCard).join('')}</div>`).join('');
  return `<div class="bh"><h2>내 업무</h2><span class="mu">업무분장표의 이름 그대로 카드를 만듭니다. 파일을 올리고 「단서」(예: 학생인권부 샘들 카드도)를 적으면 그대로 반영합니다.</span></div>
  <div class="tools"><label class="btn pri file">📂 업무분장표 올리기<input type="file" id="wkUp" accept=".hwp,.hwpx,.docx,.xlsx,.xls,.csv,.txt,.pdf" hidden></label><button class="btn" data-act="wkPaste">📋 표 붙여넣기</button><button class="btn" data-act="wkClue">🧭 단서로 카드 만들기</button><button class="btn" data-act="wkAdd">+ 카드 직접 추가</button>${undoBtn()}</div>
  ${me ? '' : '<p class="hot">설정에서 내 이름을 먼저 넣어 주세요. 이름이 있어야 내 업무를 가려냅니다.</p>'}
  <div class="cmtabs">${tabs.map(([k, v]) => `<button class="cmtab ${tab === k ? 'on' : ''}" data-act="wkTabSet" data-k="${esc(k)}">${esc(v)}</button>`).join('')}</div>
  ${body || `<p class="mu">${C.length ? '이 분류에는 카드가 없습니다.' : '아직 카드가 없습니다. [📂 업무분장표 올리기]로 파일(한글·엑셀·워드·PDF)을 올리거나, 표를 복사해 [📋 표 붙여넣기] 하세요.'}</p>`}
  ${W.trash.length ? `<details class="dlold"><summary>🗑 지운 카드 ${W.trash.length}건 (되돌릴 수 있음)</summary>${W.trash.slice(0, 30).map((c, i) => `<div class="cmr"><span>${esc(c.title)} <small class="mu">${esc(c.dept || '')}</small></span><button class="btn sm" data-act="wkRestore" data-i="${i}">되살리기</button></div>`).join('')}</details>` : ''}`;
}
function wkEvents() { return wkD().cards.filter(c => c.due).map(c => ({ date: c.due, t: `[업무] ${c.title}`, kind: '할 일', done: !!c.done })); }
/* 읽은 결과 확인 → 카드 만들기 */
function wkReview(rows, me, clue, raw, fname) {
  const cs = wkClueSel(clue, rows, me), nMine = rows.filter(r => r.mine).length;
  const mineIdx = rows.map((r, i) => r.mine ? i : -1).filter(i => i >= 0), others = rows.map((r, i) => r.mine ? -1 : i).filter(i => i >= 0);
  const byD = {}; others.forEach(i => (byD[rows[i].dept || '기타'] = byD[rows[i].dept || '기타'] || []).push(i));
  const rowH = i => `<label class="cmr chk"><input type="checkbox" data-wr="${i}" ${(rows[i].mine || cs.sel.has(i)) ? 'checked' : ''}> <span><b>${esc(rows[i].work.slice(0, 90))}</b> <small class="mu">${esc(rows[i].who)}</small></span></label>`;
  let d = document.getElementById('wkrev'); if (d) d.remove(); d = document.createElement('dialog'); d.id = 'wkrev'; d.className = 'dlg wide'; document.body.appendChild(d);
  d.innerHTML = `<h3>업무분장표를 이렇게 읽었어요</h3><p class="mu">「${esc(fname || '붙여넣은 표')}」에서 표 ${rows.length}줄. <b>'${esc(me)}'</b> 이름 정확히 일치: ${nMine}줄${clue ? ` · 단서「${esc(clue)}」→ ${cs.why.length ? esc(cs.why.join(', ')) + ' 선택' : '맞는 부서·이름을 못 찾음'}` : ''}. 체크한 줄만 카드로 만듭니다. 안 맞으면 취소하고 이름·단서를 고쳐 다시 하세요.</p>
  <h4 class="dlh">내 업무 (${nMine}줄)</h4>${mineIdx.map(rowH).join('') || '<p class="mu">이름이 정확히 같은 줄이 없습니다. 아래 다른 선생님 줄에서 직접 체크하거나, 이름 표기(직함 포함 여부)를 확인하세요.</p>'}
  ${Object.keys(byD).map(dp => `<details ${byD[dp].some(i => cs.sel.has(i)) ? 'open' : ''}><summary><b>${esc(dp)}</b> <small class="mu">${byD[dp].length}줄 · 다른 선생님</small> <button type="button" class="btn sm" data-wrall="${esc(dp)}">이 부서 전체 체크</button></summary>${byD[dp].map(rowH).join('')}</details>`).join('')}
  <details><summary class="mu">📄 읽은 글자 미리보기 (${raw ? raw.length : 0}자)</summary><pre class="wkraw">${esc(String(raw || '').slice(0, 1500))}</pre></details>
  <div class="tools"><button class="btn pri" id="wrok">체크한 줄로 카드 만들기</button><button class="btn" id="wrx">취소</button></div>`;
  d.addEventListener('click', e => {
    const t = e.target; if (t === d || t.id === 'wrx') { d.close(); d.remove(); return; }
    if (t.dataset && t.dataset.wrall) { e.preventDefault(); d.querySelectorAll('details').forEach(dt => { if (dt.querySelector('summary b') && dt.querySelector('summary b').textContent === t.dataset.wrall) dt.querySelectorAll('[data-wr]').forEach(x => x.checked = true); }); return; }
    if (t.id === 'wrok') {
      const W = wkD(), sel = [...d.querySelectorAll('[data-wr]')].filter(x => x.checked).map(x => +x.dataset.wr); let n = 0;
      /* 분장표 전체 줄은 꿈송이 검색용으로 따로 보관 */
      S.duties = (S.duties || []).filter(x => x.who !== '예시'); const key = x => [x.dept, x.work, x.who].join('|'), have = new Set(S.duties.map(key));
      rows.forEach(r => { if (!have.has(key(r))) { S.duties.push({ id: uid(), dept: r.dept, work: r.work, who: r.who, mine: r.mine }); have.add(key(r)); } });
      const hv = new Set(W.cards.map(c => [c.dept, c.title, c.who, c.me].join('|')));
      sel.forEach(i => { const r = rows[i]; wkSplitWork(r.work).forEach(t0 => { const c = { id: uid(), title: t0, dept: r.dept || '', who: r.mine ? '' : r.who, me: !!r.mine, memo: '', due: '', done: false, steps: [], src: fname || '붙여넣기' }, k = [c.dept, c.title, c.who, c.me].join('|'); if (!hv.has(k)) { W.cards.push(c); hv.add(k); n++; } }); });
      d.close(); d.remove(); commit(); toast(n ? `업무 카드 ${n}장을 만들었습니다. 잘못되면 ↩ 되돌리기를 누르세요.` : '새로 만들 카드가 없습니다(이미 있거나 체크가 없음).');
    }
  });
  d.showModal();
}
function wkStart(text, fname, preClue) {
  const me0 = wkMe();
  ask('업무분장표 읽기', [{ k: 'n', label: '내 이름 (분장표에 적힌 그대로)', val: me0, req: 1 }, { k: 'clue', label: '단서 (선택) — 예: "학생인권부 샘들 카드도 만들어" "김철수 샘 업무도"', val: preClue || '', ph: '예: 내가 학생인권부장이라 학생인권부 선생님들 카드도' }], v => {
    const me = v.n.trim(); if (me !== me0) { S.profile.name = me; save(true); }
    let rows = wkParse(text, me); if (!rows.length && typeof dutyParse === 'function') rows = dutyParse(text, me).map(r => ({ dept: r.dept, work: r.work, who: r.who, mine: r.mine }));
    if (!rows.length) { const d = document.createElement('dialog'); d.className = 'dlg'; document.body.appendChild(d); d.innerHTML = `<h3>표를 찾지 못했습니다</h3><p class="mu">파일에서 ${String(text || '').length}자를 읽었지만 업무분장표 모양(부서·업무·이름 칸)을 찾지 못했습니다. 표만 복사해 [📋 표 붙여넣기]를 쓰거나, 한글에서 PDF·엑셀로 저장해 올려 보세요. Claude 키를 넣은 뒤에는 [🤖 AI로 읽기]가 켜집니다.</p><pre class="wkraw">${esc(String(text || '').slice(0, 1200))}</pre><div class="tools"><button class="btn" id="wnx">닫기</button></div>`; d.addEventListener('click', e => { if (e.target === d || e.target.id === 'wnx') { d.close(); d.remove(); } }); d.showModal(); return; }
    wkReview(rows, me, (v.clue || '').trim(), text, fname);
  }, '읽기');
}
Object.assign(A, {
  wkTabSet(el) { UI.wkTab = el.dataset.k; render(); },
  wkTog(el) { const c = wkD().cards.find(x => x.id === el.dataset.id); if (c) { c.done = !c.done; commit(); } },
  wkAdd() { ask('업무 카드 추가', [{ k: 'title', label: '업무 이름 (분장표에 적힌 그대로)', req: 1 }, { k: 'dept', label: '부서·영역' }, { k: 'who', label: '담당자 (내 업무면 비워 두세요)' }, { k: 'due', label: '기한(선택)', type: 'date' }], o => { wkD().cards.push({ id: uid(), title: o.title.trim(), dept: (o.dept || '').trim(), who: (o.who || '').trim(), me: !(o.who || '').trim(), memo: '', due: o.due || '', done: false, steps: [] }); commit(); }, '추가'); },
  wkEdit(el) { const c = wkD().cards.find(x => x.id === el.dataset.id); if (!c) return; ask('카드 고치기', [{ k: 'title', label: '업무 이름', val: c.title, req: 1 }, { k: 'dept', label: '부서·영역', val: c.dept || '' }, { k: 'who', label: '담당자 (내 업무면 비움)', val: c.who || '' }, { k: 'due', label: '기한', type: 'date', val: c.due || '' }], o => { c.title = o.title.trim(); c.dept = (o.dept || '').trim(); c.who = (o.who || '').trim(); c.me = !c.who; c.due = o.due || ''; commit(); }, '저장'); },
  wkStep(el) { const c = wkD().cards.find(x => x.id === el.dataset.id); if (!c) return; ask('할 일(단계) 추가', [{ k: 't', label: `「${c.title}」 안에서 할 일`, req: 1 }], o => { (c.steps = c.steps || []).push({ t: o.t.trim(), d: false }); commit(); }, '추가'); },
  wkStepDel(el) { const c = wkD().cards.find(x => x.id === el.dataset.id); if (c && c.steps) { c.steps.splice(+el.dataset.i, 1); commit(); } },
  wkDel(el) { const W = wkD(), c = W.cards.find(x => x.id === el.dataset.id); if (!c) return; sure(`「${c.title}」 카드를 지울까요? (아래 🗑 지운 카드에서 되살릴 수 있습니다)`, () => { W.cards = W.cards.filter(x => x !== c); W.trash.unshift(c); W.trash = W.trash.slice(0, 60); commit(); }); },
  wkRestore(el) { const W = wkD(), c = W.trash[+el.dataset.i]; if (!c) return; W.trash.splice(+el.dataset.i, 1); W.cards.push(c); commit(); toast('되살렸습니다.'); },
  wkPaste() { ask('업무분장표 붙여넣기', [{ k: 'text', label: '한글·엑셀의 업무분장표 표를 복사해서 붙여 넣으세요', type: 'textarea', rows: 10, req: 1 }], o => wkStart(o.text, '붙여넣은 표'), '다음'); },
  wkClue() {
    const rows = (S.duties || []).filter(x => x.who !== '예시').map(r => ({ dept: r.dept, work: r.work, who: r.who, mine: !!r.mine }));
    if (!rows.length) { toast('먼저 업무분장표를 올리거나 붙여넣어 주세요.'); return; }
    ask('단서로 카드 만들기', [{ k: 'clue', label: '예: "학생인권부 샘들 업무카드도 만들어" · "김철수 샘 업무" · "전부"', req: 1 }], o => wkReview(rows, wkMe(), o.clue.trim(), `저장된 업무분장 ${rows.length}줄`, '저장된 분장표'), '찾기');
  }
});
document.addEventListener('change', async e => {
  const t = e.target; if (!t) return;
  if (t.id === 'wkUp') { const f = t.files[0]; t.value = ''; if (!f) return; try { toast('분장표 읽는 중…'); wkStart(await readFile(f), f.name); } catch (er) { toast(er.message || '파일을 읽지 못했습니다'); } return; }
  if (t.dataset && t.dataset.wkstep) { const [id, i] = t.dataset.wkstep.split('|'), c = wkD().cards.find(x => x.id === id); if (c && c.steps[+i]) { c.steps[+i].d = t.checked; commit(); } }
}, true);
let _wkT; document.addEventListener('input', e => { const t = e.target; if (!t.dataset || !t.dataset.wkmemo) return; const c = wkD().cards.find(x => x.id === t.dataset.wkmemo); if (!c) return; c.memo = t.value; clearTimeout(_wkT); _wkT = setTimeout(() => save(true), 600); });
/* 오늘 화면 「내 업무」 줄은 새 메뉴로 안내 */
mineBody = function () {
  const W = wkD(), L = W.cards.filter(c => c.me && !c.done).slice(0, 6);
  return `${L.map(c => `<div class="mi"><span class="tl">${esc(c.title)}</span> <span class="mu">${esc(c.dept || '')}${c.due ? ' · ' + md(c.due) + ' ' + ddText(dd(c.due)) : ''}</span></div>`).join('') || '<p class="mu">아직 없습니다. 「내 업무」 메뉴에서 업무분장표를 올리면 카드가 만들어집니다.</p>'}<div class="tools"><a class="btn pri sm" href="#/work">내 업무 카드 열기 ▶</a></div>`;
};
mineRow = function () { const W = wkD(), n = W.cards.filter(c => c.me).length, left = W.cards.filter(c => c.me && !c.done).length; return row('r11', '학교', '내 업무', n ? `${n}건 · 남은 ${left}건 · ${esc((W.cards.find(c => c.me && !c.done) || W.cards.find(c => c.me)).title)}` : '업무분장표를 올리면 업무 카드를 만들어 줍니다', '', mineBody()); };
/* 꿈송이 검색 */
{ const _b = buildChunks; buildChunks = function () { const out = _b.apply(this, arguments); wkD().cards.forEach(c => out.push({ type: 'mine', src: `업무 카드 · ${c.dept || '기타'}${c.me ? ' · 내 업무' : ' · ' + (c.who || '')}`, text: `${c.title} ${c.dept || ''} 담당 ${c.me ? S.profile.name : c.who} ${c.due ? '기한 ' + c.due : ''} ${c.done ? '완료' : '진행 중'} ${c.memo || ''} ${(c.steps || []).map(s => s.t).join(' ')}`, ref: '#/work' })); return out; }; }
/* 메뉴 · 뒤로가기 */
const backBtn = page => (page && page !== 'today') ? `<button class="btn sm backbtn" data-act="goBack">← 뒤로</button>` : '';
A.goBack = () => { if (history.length > 1) history.back(); else location.hash = '#/today'; };
if (typeof ORD_NAV !== 'undefined' && !ORD_NAV.some(x => x[0] === 'work')) ORD_NAV.push(['work', '내 업무']);

/* ---------- 캘린더 강화: 빠른 입력 · 반복 일정 · 주간 수첩 보기 ---------- */
const DOWK = '일월화수목금토';
function repDates(i) {
  const out = [], s = new Date(i.date + 'T00:00:00'), end = new Date(s.getFullYear() + 1, s.getMonth(), s.getDate()), lim = new Date(); lim.setFullYear(lim.getFullYear() + 1);
  const stop = i.until ? new Date(i.until + 'T00:00:00') : (end > lim ? lim : end);
  if (i.rep === 'w') for (let d = new Date(s); d <= stop; d.setDate(d.getDate() + 7)) out.push(ymd(d));
  else if (i.rep === 'm') for (let k = 0; k < 14; k++) { const d = new Date(s.getFullYear(), s.getMonth() + k, s.getDate()); if (d.getDate() === s.getDate() && d <= stop) out.push(ymd(d)); }
  return out;
}
function qaParse(raw) {
  let t = String(raw || '').trim(); if (!t) return null; const now = new Date(), base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const addD = n => { const d = new Date(base); d.setDate(d.getDate() + n); return d; }, nextDow = (dw, wk) => { const d = new Date(base); let diff = (dw - d.getDay() + 7) % 7; if (wk === '다음') diff = ((dw - d.getDay() + 7) % 7) + (((dw - d.getDay() + 7) % 7) === 0 ? 7 : 0) + (d.getDay() <= dw || true ? 0 : 0); if (wk === '다음') { const mon = new Date(base); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) + 7); const t2 = new Date(mon); t2.setDate(mon.getDate() + ((dw + 6) % 7)); return t2; } if (wk === '이번') { const mon = new Date(base); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); const t2 = new Date(mon); t2.setDate(mon.getDate() + ((dw + 6) % 7)); return t2; } d.setDate(d.getDate() + diff); return d; };
  let rep = '', date = null, m;
  if ((m = t.match(/^매주\s*([월화수목금토일])(?:요일)?\s*/))) { rep = 'w'; date = nextDow(DOWK.indexOf(m[1])); t = t.slice(m[0].length); }
  else if ((m = t.match(/^매월\s*(\d{1,2})\s*일\s*/))) { rep = 'm'; const d = new Date(base.getFullYear(), base.getMonth(), +m[1]); if (d < base) d.setMonth(d.getMonth() + 1); date = d; t = t.slice(m[0].length); }
  if (!date) {
    if ((m = t.match(/(20\d\d)[-./](\d{1,2})[-./](\d{1,2})/))) { date = new Date(+m[1], m[2] - 1, +m[3]); t = t.replace(m[0], ' '); }
    else if ((m = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일?/)) || (m = t.match(/(?<![\d:])(\d{1,2})\s*[\/.]\s*(\d{1,2})(?![\d:])/))) { let y = base.getFullYear(), d = new Date(y, m[1] - 1, +m[2]); if (d < addD(-30)) d = new Date(y + 1, m[1] - 1, +m[2]); date = d; t = t.replace(m[0], ' '); }
    else if ((m = t.match(/(다음\s*주|이번\s*주|담주)?\s*([월화수목금토일])요일/))) { date = nextDow(DOWK.indexOf(m[2]), m[1] ? (/다음|담/.test(m[1]) ? '다음' : '이번') : ''); t = t.replace(m[0], ' '); }
    else if ((m = t.match(/오늘|내일|모레|글피/))) { date = addD({ 오늘: 0, 내일: 1, 모레: 2, 글피: 3 }[m[0]]); t = t.replace(m[0], ' '); }
  }
  let time = ''; if ((m = t.match(/(오전|오후)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?/)) || (m = t.match(/(오전|오후)?\s*(\d{1,2}):(\d{2})/))) { let h = +m[2]; if (m[1] === '오후' && h < 12) h += 12; else if (!m[1] && h >= 1 && h <= 6 && /시/.test(m[0])) h += 12; time = `${pad(h)}:${pad(+m[3] || 0)}`; t = t.replace(m[0], ' '); }
  const title = t.replace(/\s+/g, ' ').replace(/^[\s,.:]+|[\s,.:]+$/g, '').replace(/!+$/, '').trim(); if (!title) return null;
  const todo = /!\s*$/.test(String(raw).trim()) || /(제출|마감|까지|해야|신청|입력|회신|보고)/.test(title);
  return { title, date: ymd(date || base), time, cat: todo ? 'todo' : 'event', rep };
}
function qaBar() {
  return `<div class="qabar"><input id="qaIn" placeholder="빠른 입력: 내일 3시 교직원회의 · 12/5 성적처리 마감 · 매주 월요일 교과협의회" aria-label="빠른 일정 입력"><button class="btn pri sm" data-act="qaGo">추가</button><button class="btn sm ${UI.calMode === 'week' ? 'pri' : ''}" data-act="calMode" data-m="${UI.calMode === 'week' ? 'month' : 'week'}">${UI.calMode === 'week' ? '🗓 월 보기' : '📒 주간 수첩 보기'}</button>${undoBtn()}</div>`;
}
const wkStartOf = d => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
function calWeek() {
  const st = wkStartOf(UI.calWk || UI.day || today()), ev = allEvents(), days = [];
  for (let k = 0; k < 7; k++) { const d = new Date(st); d.setDate(st.getDate() + k); days.push(ymd(d)); }
  const end = new Date(st); end.setDate(st.getDate() + 6);
  const card = ds => { const e = ev.filter(x => x.date === ds), isT = ds === today(), dw = new Date(ds + 'T00:00:00').getDay();
    return `<div class="wkd ${isT ? 'tdy' : ''} ${dw === 0 ? 'sun' : dw === 6 ? 'sat' : ''}"><b class="wkdh">${DOW[dw]} ${md(ds)}${isT ? ' · 오늘' : ''}</b>
    ${e.map(x => x.id && !x.rep ? `<div class="td ${x.done ? 'dn' : ''}"><button class="ck" data-act="tog" data-id="${x.id}" aria-pressed="${!!x.done}" aria-label="완료 표시"></button><span class="tl">${esc(x.t)}</span><small class="chp ${kcls(x.kind)}">${x.kind}</small></div>` : `<div class="td"><span class="ck off"></span><span class="tl">${esc(x.t)}</span><small class="chp ${kcls(x.kind)}">${x.kind}</small></div>`).join('') || '<p class="mu wkmt">—</p>'}
    <input class="wkadd" data-wkadd="${ds}" placeholder="+ 일정·할 일 (Enter)" aria-label="${md(ds)} 추가">
    <textarea data-dmemo="${ds}" rows="3" placeholder="📝 이 날 메모" aria-label="${md(ds)} 메모">${esc((S.dayMemo || {})[ds] || '')}</textarea></div>`; };
  return `<div class="bh"><h2>캘린더 · 주간 수첩</h2><span class="mu">한 주를 펼쳐 놓고 바로 쓰는 수첩 보기입니다. 일정은 칸에 쓰고 Enter, 메모는 쓰면 바로 저장됩니다.</span></div>${qaBar()}
  <div class="calh"><button class="btn sm" data-act="wkMove" data-n="-7" aria-label="지난주">‹ 지난주</button><b class="calt">${md(days[0])} ~ ${md(ymd(end))}</b><button class="btn sm" data-act="wkMove" data-n="7" aria-label="다음주">다음주 ›</button><button class="btn sm" data-act="wkMove" data-n="0">이번 주</button></div>
  <div class="wkdg">${days.map(card).join('')}</div>${typeof calLegend === 'function' ? calLegend() : ''}`;
}
{ const _cv = calView; calView = function () { if (UI.calMode === 'week') return calWeek(); return qaBar() + _cv.apply(this, arguments); }; }
Object.assign(A, {
  calMode(el) { UI.calMode = el.dataset.m; if (el.dataset.m === 'week') UI.calWk = UI.day || today(); render(); },
  wkMove(el) { const n = +el.dataset.n; if (!n) UI.calWk = today(); else { const s = wkStartOf(UI.calWk || today()); s.setDate(s.getDate() + n); UI.calWk = ymd(s); } render(); },
  qaGo() {
    const i = document.getElementById('qaIn'); if (!i) return; const r = qaParse(i.value); if (!r) { toast('내용을 알아듣지 못했습니다. 예) 내일 3시 교직원회의'); return; }
    const it = { id: uid(), title: (r.time ? r.time + ' ' : '') + r.title, date: r.date, cat: r.cat, done: false }; if (r.rep) it.rep = r.rep; S.items.push(it); UI.day = r.date; commit(); toast(`${md(r.date)}에 넣었습니다${r.rep ? ' (반복)' : ''}: ${r.title}`);
  }
});
document.addEventListener('keydown', e => {
  const t = e.target; if (e.key !== 'Enter' || e.isComposing || !t) return;
  if (t.id === 'qaIn') { e.preventDefault(); A.qaGo(); }
  else if (t.dataset && t.dataset.wkadd) { e.preventDefault(); const r = qaParse(t.value); if (!r) return; const ds = t.dataset.wkadd; const it = { id: uid(), title: (r.time ? r.time + ' ' : '') + r.title, date: ds, cat: r.cat, done: false }; if (r.rep) it.rep = r.rep; S.items.push(it); commit(); }
});

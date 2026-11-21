/* 선생님 시간표 · 나와 공강이 같은 선생님 · 수업 교환 가능 교사 · 바뀐 시간표 미리보기 · 학년별 색 · 주간(세로)/하루(가로) 시간표
   자료: 컴시간 전체 시간표(깃허브 data 가지의 comcigan.json). 컴시간에는 이름이 두 글자("김정")뿐이라 과목·겹침으로 같은 이름의 선생님을 나눕니다. */
const GCOL0 = { 1: '#d9f2e0', 2: '#dbe8ff', 3: '#ffe2d1' };
const gcol = g => ((S.profile.gcol || {})[g]) || GCOL0[g] || '#f1f1f1';
const gradeOf = txt => { const m = String(txt || '').match(/^\s*(\d)\s*-\s*\d/); return m ? +m[1] : 0; };
const cellBg = txt => { const g = gradeOf(txt); return g ? `background:${gcol(g)}` : ''; };
let CMC = (() => { try { return JSON.parse(localStorage.getItem('tf.comci.all') || 'null'); } catch (e) { return null; } })(), PEOPLE = [], _cmcBusy = false;
const NONCORE = /^(자율|스동|동아리|창체|진로|봉사|CA|학급|자습|보충|조회|종례)/;
const cmcP = () => Math.max(7, ...(CMC && CMC.lessons.length ? CMC.lessons.map(l => l.p) : [7]));
function cmcBuild() {
  PEOPLE = []; if (!CMC) return;
  const by = {}; CMC.lessons.forEach(l => { if (l.t) (by[l.t] = by[l.t] || []).push(l); });
  const mk = (t, s, L, amb) => ({ id: t + '|' + s, t, s, amb, name: t + (s ? `(${s})` : ''), cells: Object.fromEntries(L.map(l => [l.d + '-' + l.p, l])) });
  Object.keys(by).forEach(t => {
    const L = by[t], cnt = {}; L.forEach(l => cnt[l.s] = (cnt[l.s] || 0) + 1);
    const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0], big = Object.keys(cnt).filter(s => !NONCORE.test(s) && cnt[s] >= 4);
    let split = false; for (let i = 0; i < big.length && !split; i++) for (let j = i + 1; j < big.length; j++) { const A = new Set(L.filter(l => l.s === big[i]).map(l => l.d + '-' + l.p)); if (L.filter(l => l.s === big[j]).some(l => A.has(l.d + '-' + l.p))) { split = true; break; } }
    if (!split) PEOPLE.push(mk(t, main, L, false));
    else { const rest = L.filter(l => !big.includes(l.s)); big.forEach(s => PEOPLE.push(mk(t, s, L.filter(l => l.s === s).concat(rest), rest.length > 0))); }
  });
  PEOPLE.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}
/* 체험판: 가상의 학교·선생님으로 같은 기능을 체험하게 합니다(실제 학교 자료는 쓰지 않음) */
function cmcDemo() {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const TS = [['예시', '도덕', 2], ['이국', '국어', 4], ['박수', '수학', 4], ['최영', '영어', 3], ['정과', '과학', 3], ['한사', '사회', 3], ['오체', '체육', 3], ['유음', '음악', 1], ['강미', '미술', 1], ['서역', '역사', 2]];
  const cls = []; for (let g = 1; g <= 2; g++) for (let c = 1; c <= 3; c++) cls.push([g, c]);
  const busyT = new Set(), busyC = new Set(), L = [];
  cls.forEach(([g, c]) => TS.forEach(([t, s, h]) => { let n = 0, tries = 0; while (n < h && tries++ < 400) { const d = 1 + Math.floor(rnd() * 5), p = 1 + Math.floor(rnd() * 6), kt = t + d + p, kc = g + '-' + c + d + p; if (busyT.has(kt) || busyC.has(kc)) continue; busyT.add(kt); busyC.add(kc); L.push({ g, c, d, p, t, s }); n++; } }));
  CMC = { at: Date.now(), updated: new Date().toISOString(), lessons: L, classTime: [] }; cmcBuild();
  const me = PEOPLE.find(p => p.t === '예시'); if (me && !S.profile.demoTT) { S.timetable = {}; Object.keys(me.cells).forEach(k => { const l = me.cells[k]; S.timetable[k] = `${l.g}-${l.c} ${l.s}`; }); S.profile.demoTT = 1; }
}
async function cmcLoad(force) {
  if (window.TF_DEMO) { if (!CMC || !PEOPLE.length) cmcDemo(); return CMC; }
  if (_cmcBusy) return CMC; if (CMC && !force && Date.now() - (CMC.at || 0) < 6 * 3600 * 1000) { if (!PEOPLE.length) cmcBuild(); return CMC; }
  _cmcBusy = true;
  try { const r = await fetch(COMCI_URL, { cache: 'no-store' }); if (!r.ok) throw 0; const j = await r.json(); CMC = { at: Date.now(), updated: j.updated, lessons: j.lessons || [], classTime: j.classTime || [] }; try { localStorage.setItem('tf.comci.all', JSON.stringify(CMC)); } catch (e) { } } catch (e) { } finally { _cmcBusy = false; }
  cmcBuild(); return CMC;
}
function tchMe() {
  const nm = (S.profile.name || '').trim(), k2 = window.TF_DEMO ? '예시' : nm.slice(0, 2), c = PEOPLE.filter(p => p.t === k2 || p.t === nm); if (!c.length) return null; if (c.length === 1) return c[0];
  const w = (S.profile.comciSub || S.profile.subject || '').trim(); return c.find(p => w && (p.s.includes(w) || w.includes(p.s))) || null;
}
/* ----- 표(세로: 교시가 아래로, 요일이 가로) ----- */
function gridTable(get, o = {}) {
  const P = o.P || 7, now = new Date(), dow = now.getDay(), mn = now.getHours() * 60 + now.getMinutes(), PL = typeof clkPeriods === 'function' ? clkPeriods() : [];
  const ended = (d, p) => { if (!o.live || dow === 0 || dow === 6) return false; if (d < dow) return true; if (d > dow) return false; const x = PL.find(y => y.p === p); return !!(x && mn >= x.e); };
  let h = `<div class="ctw"><table class="tbl wk"><thead><tr><th></th>${[1, 2, 3, 4, 5].map(d => `<th class="${o.live && dow === d ? 'tdy' : ''}">${DOW[d]}</th>`).join('')}</tr></thead><tbody>`;
  for (let p = 1; p <= P; p++) {
    if (p > 6 && ![1, 2, 3, 4, 5].some(d => get(d, p))) continue;
    h += `<tr><th>${p}</th>` + [1, 2, 3, 4, 5].map(d => { const c = get(d, p), mk = (o.mark || {})[d + '-' + p]; if (!c) return `<td class="${mk ? 'mk-' + mk.k : ''}" ${mk && mk.t ? `title="${esc(mk.t)}"` : ''}>${mk ? esc(mk.l || '') : ''}</td>`; return `<td class="${ended(d, p) ? 'dn' : ''} ${mk ? 'mk-' + mk.k : ''}" style="${cellBg(c.txt)}">${esc(c.txt)}${ended(d, p) ? '<i class="okc">✓</i>' : ''}${mk && mk.l ? `<small>${esc(mk.l)}</small>` : ''}</td>`; }).join('') + '</tr>';
  }
  return h + '</tbody></table></div>';
}
const myGet = (d, p) => { const v = S.timetable[d + '-' + p]; return v ? { txt: v } : null; };
function wkGrid() { return `<details class="wkd" open><summary><b>이번 주 시간표</b> <span class="mu">(세로 · 오늘 칸 표시 · 끝난 수업 ✓)</span></summary>${gridTable(myGet, { live: true })}</details>`; }
const pGet = p => (d, q) => { const l = p.cells[d + '-' + q]; return l ? { txt: `${l.g}-${l.c} ${l.s}` } : null; };
const slotName = k => { const [d, p] = k.split('-'); return DOW[d] + p; };
/* ----- 분석 ----- */
function commonFree(me, B, P) { const out = []; for (let d = 1; d <= 5; d++) for (let p = 1; p <= P; p++) if (!me.cells[d + '-' + p] && !B.cells[d + '-' + p]) out.push(d + '-' + p); return out; }
function swapCands(me, k1, onlySame) {
  const L1 = me.cells[k1]; if (!L1) return { sw: [], cover: [] }; const P = cmcP(), sw = [], cover = [];
  PEOPLE.forEach(B => { if (B === me) return;
    if (!B.cells[k1]) cover.push(B);
    Object.keys(B.cells).forEach(k2 => { const L2 = B.cells[k2]; if (k2 === k1 || L2.g !== L1.g || L2.c !== L1.c || NONCORE.test(L2.s)) return; if (me.cells[k2] || B.cells[k1]) return; if (onlySame && B.s !== me.s) return; sw.push({ B, k2, L2, same: k2.split('-')[0] === k1.split('-')[0] }); });
  });
  sw.sort((a, b) => (b.same - a.same) || a.k2.localeCompare(b.k2)); cover.sort((a, b) => (b.s === me.s) - (a.s === me.s));
  return { sw, cover };
}
const T = () => (UI.tch = UI.tch || { q: '', sel: '', slot: '', pick: null, free: false });
function tchHtml() {
  if (window.TF_DEMO && (!CMC || !PEOPLE.length)) cmcDemo();
  if (!CMC) { cmcLoad().then(() => { if (/^#\/class/.test(location.hash)) render(); }); return `<h3 class="h3">③ 선생님 시간표 · 공강 · 수업 교환</h3><p class="mu">컴시간 전체 시간표를 불러오는 중입니다…</p>`; }
  if (!PEOPLE.length) cmcBuild();
  const t = T(), me = tchMe(), P = cmcP(), q = norm(t.q), match = q ? PEOPLE.filter(p => norm(p.name + p.t).includes(q)) : [], sel = PEOPLE.find(p => p.id === t.sel) || (match.length === 1 ? match[0] : null);
  let h = `<h3 class="h3">③ 선생님 시간표 · 공강 · 수업 교환</h3><p class="mu">${window.TF_DEMO ? '<b>체험용 가상 시간표</b>입니다(실제 학교 자료가 아님). ' : ''}컴시간 자료(${esc((CMC.updated || '').slice(0, 10))} 기준, 이름이 두 글자라 같은 이름은 과목으로 구분)로 찾습니다. ${me ? `나는 <b>${esc(me.name)}</b>로 인식했어요.` : '<b>설정의 이름·교과로 내 시간표를 찾지 못했습니다.</b> (이름 확인 필요)'} <button class="x" data-act="tchReload">컴시간 새로고침</button></p>`;
  h += `<div class="tbox"><b>🔎 선생님 시간표 보기</b><div class="row2c"><input class="srch" data-tq placeholder="선생님 이름 (예: 김병)" value="${esc(t.q)}" list="tchList" aria-label="선생님 이름"><datalist id="tchList">${PEOPLE.map(p => `<option value="${esc(p.name)}">`).join('')}</datalist></div>${match.length > 1 ? `<div class="clg2">${match.map(p => `<button class="chp ${sel && sel.id === p.id ? 'on' : ''}" data-act="tchSel" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>` : ''}${q && !match.length ? '<p class="mu">찾는 선생님이 없습니다.</p>' : ''}${sel ? `<p><b>${esc(sel.name)}</b> 선생님 시간표 <span class="mu">(${Object.keys(sel.cells).length}시간${sel.amb ? ' · 이름이 같은 분이 있어 자율·동아리 칸은 같이 표시됩니다' : ''})</span></p>${gridTable(pGet(sel), { P })}` : ''}</div>`;
  if (me) {
    const fr = PEOPLE.filter(b => b !== me).map(b => ({ b, c: commonFree(me, b, P) })).filter(x => x.c.length).sort((a, b) => b.c.length - a.c.length).slice(0, 12), myFree = [];
    for (let d = 1; d <= 5; d++) for (let p = 1; p <= P; p++) if (!me.cells[d + '-' + p]) myFree.push(d + '-' + p);
    h += `<div class="tbox"><b>☕ 나와 공강이 같은 선생님</b> <span class="mu">내 공강 ${myFree.length}칸 중 함께 비는 칸이 많은 순</span><div id="tchFree">${fr.map(x => `<p class="fbl"><b>${esc(x.b.name)}</b> ${x.c.length}칸 <span class="mu">${x.c.map(slotName).join(' ')}</span> <button class="x" data-act="tchSel" data-id="${esc(x.b.id)}" data-go="1">시간표</button></p>`).join('') || '<p class="mu">겹치는 공강이 없습니다.</p>'}</div></div>`;
    const mine = Object.keys(me.cells).filter(k => !NONCORE.test(me.cells[k].s)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    h += `<div class="tbox"><b>🔁 수업 바꿀 수 있는 선생님</b> <span class="mu">내 수업 하나를 고르면, 같은 반의 다른 교과 시간과 맞바꿀 수 있는 분(교환)과 그 시간에 비어 있는 분(대강)을 찾습니다.</span>
    <div class="row2c"><select data-tslot aria-label="바꾸고 싶은 내 수업"><option value="">(바꾸고 싶은 내 수업 고르기)</option>${mine.map(k => `<option value="${k}" ${t.slot === k ? 'selected' : ''}>${slotName(k)}교시 · ${me.cells[k].g}-${me.cells[k].c} ${esc(me.cells[k].s)}</option>`).join('')}</select><label class="chk"><input type="checkbox" data-tsame ${t.same ? 'checked' : ''}> 같은 교과 선생님만</label></div>`;
    if (t.slot && me.cells[t.slot]) {
      const { sw, cover } = swapCands(me, t.slot, t.same), L1 = me.cells[t.slot];
      h += `<p><b>맞교환 가능</b> <span class="mu">(${sw.length}건 · 같은 반 ${L1.g}-${L1.c}의 다른 시간과 바꾸기)</span></p>${sw.slice(0, 20).map((x, i) => `<p class="fbl ${t.pick === i ? 'pk' : ''}">${slotName(t.slot)} <b>${esc(L1.s)}</b> ↔ <b>${esc(x.B.name)}</b> ${slotName(x.k2)} ${esc(x.L2.s)}${x.same ? ' <span class="chp k-일정">같은 요일</span>' : ''} <button class="x" data-act="tchPick" data-i="${i}">바뀐 시간표 보기</button></p>`).join('') || '<p class="mu">맞바꿀 수 있는 수업이 없습니다.</p>'}
      <p><b>그 시간에 비어 있는 선생님(대강·보강)</b> <span class="mu">${slotName(t.slot)}교시 · ${cover.length}명</span></p><div class="clg2">${cover.map(b => `<button class="chp ${t.pick === 'c' + b.id ? 'on' : ''}" data-act="tchCover" data-id="${esc(b.id)}">${esc(b.name)}</button>`).join('') || '<span class="mu">없습니다</span>'}</div>`;
      if (typeof t.pick === 'number' && sw[t.pick]) {
        const x = sw[t.pick], k1 = t.slot, k2 = x.k2, L2 = x.L2, myA = {}, bA = {};
        const myGetN = (d, p) => { const k = d + '-' + p; if (k === k1) return null; if (k === k2) return { txt: `${L1.g}-${L1.c} ${L1.s}` }; const l = me.cells[k]; return l ? { txt: `${l.g}-${l.c} ${l.s}` } : null; };
        const bGetN = (d, p) => { const k = d + '-' + p; if (k === k2) return null; if (k === k1) return { txt: `${L2.g}-${L2.c} ${L2.s}` }; const l = x.B.cells[k]; return l ? { txt: `${l.g}-${l.c} ${l.s}` } : null; };
        const m1 = { [k1]: { k: 'old', l: '비움' }, [k2]: { k: 'new', l: '← ' + slotName(k1) } }, m2 = { [k2]: { k: 'old', l: '비움' }, [k1]: { k: 'new', l: '← ' + slotName(k2) } };
        const msg = `[수업 교환] ${L1.g}-${L1.c} ${slotName(k1)}교시(${me.name}) ↔ ${slotName(k2)}교시(${x.B.name}) 교환 요청드립니다.`;
        h += `<div class="swp"><b>바뀐 시간표 미리보기</b> <span class="mu">초록=옮겨 온 수업, 빨강=비게 되는 칸</span><div class="swg"><div><p><b>나(${esc(me.name)})</b></p>${gridTable(myGetN, { P, mark: m1 })}</div><div><p><b>${esc(x.B.name)}</b></p>${gridTable(bGetN, { P, mark: m2 })}</div></div><p class="mu">${L1.g}학년 ${L1.c}반: ${slotName(k1)}교시 ${esc(L1.s)} → ${esc(L2.s)}, ${slotName(k2)}교시 ${esc(L2.s)} → ${esc(L1.s)}</p><button class="btn sm" data-act="tchCopy" data-m="${esc(msg)}">📋 교환 요청 문구 복사</button></div>`;
      } else if (typeof t.pick === 'string' && t.pick[0] === 'c') {
        const b = PEOPLE.find(p => 'c' + p.id === t.pick); if (b) h += `<div class="swp"><b>${esc(b.name)}</b> 선생님 시간표 <span class="mu">(${slotName(t.slot)}교시가 비어 있음)</span>${gridTable(pGet(b), { P, mark: { [t.slot]: { k: 'new', l: '대강 가능' } } })}</div>`;
      }
    }
    h += '</div>';
  }
  return h;
}
Object.assign(A, {
  tchSel(el) { T().sel = el.dataset.id; if (el.dataset.go) { const p = PEOPLE.find(x => x.id === el.dataset.id); T().q = p ? p.name : ''; } render(); },
  tchReload() { toast('컴시간 자료를 새로 받는 중…'); cmcLoad(true).then(() => { render(); toast('새로 받았습니다.'); }); },
  tchPick(el) { T().pick = +el.dataset.i; render(); },
  tchCover(el) { T().pick = 'c' + el.dataset.id; render(); },
  tchCopy(el) { (navigator.clipboard ? navigator.clipboard.writeText(el.dataset.m) : Promise.reject()).then(() => toast('복사했습니다. 메신저에 붙여 넣으세요.')).catch(() => toast('복사하지 못했습니다.')); },
  gcolReset() { delete S.profile.gcol; commit(); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.dataset) return;
  if (t.dataset.tslot !== undefined) { T().slot = t.value; T().pick = null; render(); }
  else if (t.dataset.tsame !== undefined) { T().same = t.checked; T().pick = null; render(); }
  else if (t.dataset.gcol) { S.profile.gcol = S.profile.gcol || {}; S.profile.gcol[t.dataset.gcol] = t.value; commit(); }
}, true);
let _tqT; document.addEventListener('input', e => {
  const t = e.target; if (t.dataset && t.dataset.tq !== undefined) { T().q = t.value; T().sel = ''; clearTimeout(_tqT); _tqT = setTimeout(() => { const p = t.selectionStart; render(); const n = document.querySelector('[data-tq]'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (er) { } } }, 350); }
  else if (t.dataset && t.dataset.tt) { const td = t.closest('td'); if (td) td.style.background = gradeOf(t.value) ? gcol(gradeOf(t.value)) : ''; }
});
/* 수업 화면: 학년별 색 + 선생님 시간표 구역 덧붙이기, 시간표 입력칸 색칠 */
const _cv2 = classView;
classView = function () {
  let h = _cv2(); const gc = `<div class="gcrow"><b>학년별 색</b> ${[1, 2, 3].map(g => `<label>${g}학년 <input type="color" data-gcol="${g}" value="${gcol(g)}"></label>`).join('')}<button class="x" data-act="gcolReset">처음 색으로</button></div>`;
  const i = h.indexOf('<table class="tbl tt"'); if (i >= 0) h = h.slice(0, i) + gc + h.slice(i);
  const j = h.indexOf('<h3 class="h3">이 화면의 자료'); const sec = tchHtml(); return j >= 0 ? h.slice(0, j) + sec + h.slice(j) : h + sec;
};
function ttColor() { document.querySelectorAll('input[data-tt]').forEach(i => { const td = i.closest('td'); if (td) td.style.background = gradeOf(i.value) ? gcol(gradeOf(i.value)) : ''; }); }
const _r2 = TF.render; TF.render = function () { const v = _r2.apply(this, arguments); ttColor(); return v; };
setTimeout(() => { if (S.setup) cmcLoad(); }, window.TF_DEMO ? 300 : 3000);

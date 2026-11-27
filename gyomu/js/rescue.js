/* 자료 복구 + 합치기 도구(v166). pwsync.js보다 먼저 불러옵니다.
   ① 시작하자마자 이 기기에 남은 보관본(연동 직전 전체 내용 · 되돌리기 보관 12개)을 별도 보관함(rescue)으로 옮겨 안전하게 지킵니다. 연동이 그 위에 덮어쓰지 못합니다.
   ② 「🛟 자료 복구」: 보관본 목록(자료 수 표시) → 합쳐서 가져오기(추천) / 그 시점으로 되돌리기 / 파일로 저장. 복구 직전 현재 내용도 먼저 보관합니다.
   ③ rsMerge(): 모든 항목을 id 기준으로 합집합 합치기 — 연동의 합치기도 같은 함수를 씁니다. */
window.TF_SYNC_HOLD = true;
const RS_K = 'rescue', RS_SKIP = { updatedAt: 1, setup: 1, profile: 1 };
const rsObj = x => x && typeof x === 'object' && !Array.isArray(x);
function tfWeight(o) {
  let n = 0; if (!rsObj(o)) return 0;
  Object.keys(o).forEach(k => { if (RS_SKIP[k]) return; const v = o[k]; if (Array.isArray(v)) { n += v.length; v.slice(0, 400).forEach(x => { if (rsObj(x)) Object.keys(x).forEach(y => { if (Array.isArray(x[y])) n += x[y].length; }); }); } else if (rsObj(v)) { Object.keys(v).forEach(y => { const w = v[y]; n += Array.isArray(w) ? w.length + 1 : 1; }); } });
  return n;
}
function rsMerge(cur, old) { /* cur에 없는 것을 old에서 채웁니다(같은 id는 cur 기준) */
  if (!rsObj(cur) || !rsObj(old)) return cur;
  Object.keys(old).forEach(k => {
    const a = cur[k], b = old[k]; if (b === undefined) return;
    if (a === undefined || a === null) { cur[k] = b; return; }
    if (a === '' && typeof b === 'string' && b !== '') { cur[k] = b; return; }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (!a.length) { cur[k] = b; return; }
      if (b.length && b.every(rsObj)) { const ids = new Set(a.filter(x => rsObj(x) && x.id != null).map(x => x.id)), sg = new Set(a.filter(x => rsObj(x) && x.id == null).map(x => JSON.stringify(x))); b.forEach(x => { if (x.id != null ? !ids.has(x.id) : !sg.has(JSON.stringify(x))) a.push(x); }); }
      else if (b.length && a.every(x => typeof x !== 'object')) b.forEach(x => { if (!a.includes(x)) a.push(x); });
      return;
    }
    if (rsObj(a) && rsObj(b)) rsMerge(a, b);
  });
  return cur;
}
let RS = [], rsReady;
const rsSig = j => { let h = 5381; for (let i = 0; i < j.length; i += 37) h = ((h << 5) + h + j.charCodeAt(i)) | 0; return j.length + ':' + h; };
function rsAdd(e) {
  try { const o = JSON.parse(e.j), w = tfWeight(o); if (w < 4) return; e.w = w; e.sig = rsSig(e.j); if (RS.some(x => x.sig === e.sig)) return; RS.push(e); rsTrim(); idb.set(RS_K, RS).catch(() => { }); } catch (x) { }
}
function rsTrim() {
  RS.sort((a, b) => b.t - a.t); const best = RS.reduce((m, x) => (x.w > (m ? m.w : -1) && x.full ? x : m), null), keep = [], nf = { full: 0, part: 0 };
  RS.forEach(x => { const k = x.full ? 'full' : 'part'; if (x === best || (nf[k] < (x.full ? 10 : 30))) { keep.push(x); nf[k]++; } }); RS = keep;
}
rsReady = (async () => {
  try {
    const [rs, pre, sn] = await Promise.all([idb.get(RS_K).catch(() => null), idb.get('prelink').catch(() => null), idb.get('snaps').catch(() => null)]);
    RS = Array.isArray(rs) ? rs : [];
    if (pre && pre.s) rsAdd({ t: pre.t || Date.now(), label: '연동 직전의 이 기기 전체 내용', j: pre.s, full: true });
    (sn || []).forEach(s => s && s.j && rsAdd({ t: s.t, label: '자동 보관 · ' + (s.label || ''), j: s.j, full: false }));
  } catch (e) { } finally { window.TF_SYNC_HOLD = false; setTimeout(() => { try { render(); } catch (e) { } }, 600); }
})();
{ const _set = idb.set.bind(idb); idb.set = function (k, v) { if (k === 'prelink' && v && v.s) { try { rsAdd({ t: v.t || Date.now(), label: '다른 기기와 맞추기 직전의 이 기기 전체 내용', j: v.s, full: true }); } catch (e) { } } return _set(k, v); }; }
/* 20분마다·큰 변화 때 전체 내용을 자동 보관(하루 최대 6개) */
setInterval(() => { try { if (!S.setup || document.hidden) return; const j = JSON.stringify(S), last = RS.filter(x => x.full).sort((a, b) => b.t - a.t)[0]; if (last && Date.now() - last.t < 4 * 3600e3) return; rsAdd({ t: Date.now(), label: '자동 전체 보관', j, full: true }); } catch (e) { } }, 20 * 60e3);

const rsTm = t => { const x = new Date(t); return `${x.getMonth() + 1}/${x.getDate()} ${pad(x.getHours())}:${pad(x.getMinutes())}`; };
function rsCounts(o) { const c = (k, n) => { const v = o[k]; const m = Array.isArray(v) ? v.length : v && Array.isArray(v.cards) ? v.cards.length : v && typeof v === 'object' ? Object.keys(v).length : 0; return m ? `${n} ${m}` : ''; }; return [c('items', '일정'), c('notes', '기록'), c('wk', '업무카드'), c('pages', '페이지'), c('mine', '내 업무'), c('budget', '예산'), c('docLog', '공문'), c('contacts', '연락망'), c('dayMemo', '날짜메모'), c('training', '연수')].filter(Boolean).join(' · ') || '내용 적음'; }
function rsKeepLock(o) { const keep = (S.notes || []).filter(n => n.lock), keepP = (S.pages || []).filter(n => n.lock); if (o.notes) o.notes = (o.notes || []).filter(n => !n.lock).concat(keep); if (o.pages) o.pages = (o.pages || []).filter(n => !n.lock).concat(keepP); }
function rsRestore(o, mode, label) {
  rsAdd({ t: Date.now(), label: '복구 직전의 현재 내용', j: JSON.stringify(S), full: true });
  if (mode === 'merge') { const cur = S; rsMerge(cur, JSON.parse(JSON.stringify(o))); }
  else { rsKeepLock(o); Object.keys(o).forEach(k => { S[k] = o[k]; }); }
  S.updatedAt = Date.now(); save(true); try { render(); } catch (e) { } toast(mode === 'merge' ? '보관본과 합쳤습니다.' : '그 시점으로 되돌렸습니다. (복구 직전 내용도 보관되어 있습니다)');
}
async function rsDlg() {
  await rsReady; let d = document.getElementById('rsdlg'); if (!d) { d = document.createElement('dialog'); d.id = 'rsdlg'; d.className = 'dlg tfdlg'; document.body.appendChild(d); d.addEventListener('click', rsClick); }
  const cw = tfWeight(S), L = RS.slice().sort((a, b) => b.t - a.t), pw = typeof window.tfPwBackups === 'function' && window.TF_PW_ON && window.TF_PW_ON();
  d.innerHTML = `<h3>🛟 자료 복구</h3><p class="mu">이 기기에 자동으로 남아 있던 이전 내용입니다. <b>「합쳐서 가져오기」</b>는 지금 내용을 그대로 두고, 보관본에만 있는 일정·기록·카드·예산 등을 더합니다(가장 안전). 「그 시점으로 되돌리기」는 그때 모습으로 바꿉니다. 어느 쪽이든 복구 직전 내용도 먼저 보관합니다.</p>
  <p class="mu">현재 이 기기의 자료: <b>${esc(rsCounts(S))}</b></p>
  ${L.length ? L.map((x, i) => { let o; try { o = JSON.parse(x.j); } catch (e) { o = {}; } return `<div class="rsr ${x.w > cw * 1.3 + 5 ? 'more' : ''}"><div><b>${rsTm(x.t)}</b> · ${esc(x.label)}${x.w > cw * 1.3 + 5 ? ' <span class="rsb">현재보다 자료가 많음</span>' : ''}${x.full ? '' : ' <small class="mu">(일부 항목만)</small>'}<br><small class="mu">${esc(rsCounts(o))}</small></div><div class="tfm2"><button class="btn sm pri" data-rs="merge" data-i="${i}">🔀 합쳐서 가져오기</button><button class="btn sm" data-rs="replace" data-i="${i}">⏪ 그 시점으로</button><button class="btn sm" data-rs="save" data-i="${i}">💾 파일</button></div></div>`; }).join('') : '<p>이 기기에는 복구할 보관본이 없습니다.</p>'}
  ${pw ? '<div class="tfm"><button class="btn" data-rs="bak">☁ 연동 저장소의 최근 7일 백업 보기</button></div>' : ''}
  <div class="tfm"><label class="btn file">📂 백업 파일(.json)에서 합쳐서 가져오기<input type="file" accept=".json,application/json" data-rs="file" hidden></label></div><div class="btns"><button class="btn pri" data-rs="close">닫기</button></div>`;
  if (!d.open) d.showModal(); window.__rsList = L;
}
let RSBAK = [];
async function rsClick(e) {
  const b = e.target.closest('[data-rs]'); const d = document.getElementById('rsdlg'); if (!b) { if (e.target === d) d.close(); return; } const a = b.dataset.rs, i = +b.dataset.i;
  if (a === 'close') return d.close(); if (a === 'file') return;
  const pickO = () => { if (b.dataset.bak) return RSBAK[+b.dataset.bak] && RSBAK[+b.dataset.bak].o; const x = (window.__rsList || [])[i]; return x && JSON.parse(x.j); };
  if (a === 'bak') { toast('저장소 백업을 가져오는 중…'); try { RSBAK = await window.tfPwBackups(); } catch (x) { return toast('가져오지 못했습니다: ' + x.message); } const ls = RSBAK.map((x, k) => `<div class="rsr"><div><b>${rsTm(x.u)}</b> · 연동 저장소 백업<br><small class="mu">${esc(rsCounts(x.o))}</small></div><div class="tfm2"><button class="btn sm pri" data-rs="merge" data-bak="${k}">🔀 합쳐서 가져오기</button><button class="btn sm" data-rs="replace" data-bak="${k}">⏪ 그 시점으로</button></div></div>`).join(''); d.insertAdjacentHTML('beforeend', `<h4>☁ 저장소 백업</h4>${ls || '<p class="mu">아직 저장소 백업이 없습니다(연동 후 하루에 한 번 만들어집니다).</p>'}`); return; }
  if (a === 'save') { const o = pickO(); if (o) tfDl('업무파탈_보관본_' + rsTm(Date.now()).replace(/[\/: ]/g, '') + '.json', JSON.stringify({ S: o }), 'application/json'); return; }
  if (a === 'merge' || a === 'replace') { const o = pickO(); if (!o) return; const go = () => { rsRestore(o, a); d.close(); }; if (a === 'replace') sure('그 시점의 모습으로 바꿀까요? 지금 내용은 먼저 보관됩니다. 연동을 켜 두셨다면 다른 기기에도 퍼집니다.', go); else go(); }
}
document.addEventListener('change', async e => { const t = e.target; if (!(t && t.matches && t.matches('[data-rs=file]')) || !t.files[0]) return; try { const j = JSON.parse(await t.files[0].text()), o = j.S || j; if (!rsObj(o)) throw 0; sure(`파일 속 자료(${rsCounts(o)})를 지금 내용에 합칠까요? 지금 내용은 먼저 보관됩니다.`, () => { rsRestore(o, 'merge'); document.getElementById('rsdlg').close(); }); } catch (x) { toast('백업 파일을 읽지 못했습니다.'); } });
/* 오늘 화면 알림 줄: 보관본이 현재보다 많을 때 */
function rsHint() {
  const cw = tfWeight(S), best = RS.reduce((m, x) => (x.w > (m ? m.w : -1) ? x : m), null); if (!best || best.w <= cw * 1.3 + 5) return ''; if (localStorage.getItem('tf.rsHide') === best.sig) return '';
  let o = {}; try { o = JSON.parse(best.j); } catch (e) { }
  return `<div class="rshint"><b>🛟 이 기기에 현재보다 자료가 많은 보관본이 있습니다</b><br><small>${rsTm(best.t)} · ${esc(rsCounts(o))}</small><div class="tfm2"><button class="btn sm pri" data-act="rsOpen">복구 화면 열기</button><button class="btn sm" data-act="rsHide">괜찮아요</button></div></div>`;
}
{ const _tv = todayView; todayView = function () { const h = _tv.apply(this, arguments), M = '<details class="ncwork nccal"'; if (typeof h === 'string' && h.includes(M)) { const t = rsHint(); if (t) return h.replace(M, t + M); } return h; }; }
Object.assign(A, { rsOpen: rsDlg, rsHide() { const best = RS.reduce((m, x) => (x.w > (m ? m.w : -1) ? x : m), null); if (best) localStorage.setItem('tf.rsHide', best.sig); render(); } });
{ const _s = setView; setView = function () { const h = _s.apply(this, arguments), m = '<h3 class="h3">백업</h3>'; return h.includes(m) ? h.replace(m, '<h3 class="h3">🛟 자료 복구</h3><p class="mu">연동하다가, 또는 실수로 자료가 줄었을 때 이 기기에 남은 이전 내용을 되살립니다. 연동 저장소의 최근 7일 백업도 여기서 봅니다.</p><div class="tools"><button class="btn pri" data-act="rsOpen">자료 복구 열기</button></div>' + m) : h; }; }

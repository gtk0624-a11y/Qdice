/* 사용자 목록 만들기(드롭다운 「＋ 직접 추가…」) + 캘린더↔시간표 연동(일정 제목의 「7교시」를 시간표 그 칸에 표시) */
const cusL = () => ((S.profile = S.profile || {}).lists = S.profile.lists || {});
const cusKinds = () => cusL().kind || [];
const cusStr = k => cusL()[k] || [];
function cusKindOpts(work, sel) {
  const base = [['event', '일정'], ['todo', '할 일']].concat(work ? [['work', '업무']] : []), cu = cusKinds().map(k => ['c:' + k.n, k.n]);
  return base.concat(cu).map(([v, n]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(n)}</option>`).join('') + '<option value="_new">＋ 직접 추가…</option>' + (cu.length ? '<option value="_edit">✎ 내 목록 관리…</option>' : '');
}
function cusMk(v, title, per) {
  let t = String(title || '').trim(), o = { cat: 'event' };
  if (v === 'todo') o.cat = 'todo'; else if (v === 'work') { o.cat = 'todo'; t = '[업무] ' + t; }
  else if (String(v).startsWith('c:')) { const k = cusKinds().find(x => 'c:' + x.n === v); if (k) { o.cat = k.b; o.tag = k.n; } }
  o.title = t; const p = per ? +per : 0; if (p) o.per = p; return o;
}
/* 교시: item.per(숫자) 또는 제목의 "7교시", "3~4교시" */
function cusPers(i) {
  if (i.per) return [+i.per]; const t = String(i.title || ''); let m = t.match(/([1-9])\s*[~\-–]\s*([1-9])\s*교시/) || t.match(/(?<![\d/])([1-9])\s+([1-9])\s*교시/);
  if (m && +m[2] > +m[1]) { const a = +m[1], b = +m[2], r = []; for (let k = Math.min(a, b); k <= Math.max(a, b); k++) r.push(k); return r; }
  m = t.match(/([1-9])\s*교시(?!\s*(후|전|까지|이후|이전|종료))/); return m ? [+m[1]] : [];
}
function cusSlot(ds, p) {
  const L = (S.items || []).filter(i => i.date && i.src !== '학사' && (i.date === ds || (i.end && i.date <= ds && ds <= i.end)) && cusPers(i).includes(p));
  return L.map(i => `<span class="slev ${i.done ? 'dn' : ''}" title="${esc(i.title)}">📌 ${esc(String(i.title).replace(/^\[업무\]\s*/, '').replace(/[1-9]\s*([~\-–]\s*[1-9]\s*)?교시\s*/g, '').trim() || i.title)}</span>`).join('');
}
const cusHas = (ds, p) => !!(S.items || []).some(i => i.date && i.src !== '학사' && (i.date === ds || (i.end && i.date <= ds && ds <= i.end)) && cusPers(i).includes(p));
/* 문자열 목록(자료 종류 등): 이미 있는 select 에 내 항목 + 직접 추가 붙이기 */
const CUS_STR = { '#upk': 'upk', '#arcKind': 'arc' };
function cusPost() {
  Object.keys(CUS_STR).forEach(sel => { const el = document.querySelector(sel); if (!el || el.dataset.cus) return; el.dataset.cus = 'str:' + CUS_STR[sel]; el.dataset.base = JSON.stringify([...el.options].map(o => o.text)); cusFill(el); });
}
function cusFill(el, pick) {
  const [t, key] = el.dataset.cus.split(':');
  if (t === 'str') { const b = JSON.parse(el.dataset.base || '[]'), cu = cusStr(key), cur = pick || el.value; el.innerHTML = b.concat(cu).map(n => `<option>${esc(n)}</option>`).join('') + '<option value="_new">＋ 직접 추가…</option>' + (cu.length ? '<option value="_edit">✎ 내 목록 관리…</option>' : ''); el.value = [...b, ...cu].includes(cur) ? cur : b[0]; }
  else { el.innerHTML = cusKindOpts(el.dataset.work === '1', pick || (el.dataset.prev || 'event')); }
}
function cusRefreshAll(pick) { document.querySelectorAll('select[data-cus]').forEach(el => cusFill(el, pick)); }
document.addEventListener('change', e => {
  const el = e.target; if (!el.matches || !el.matches('select[data-cus]')) return;
  if (el.value !== '_new' && el.value !== '_edit') { el.dataset.prev = el.value; return; }
  const [t, key] = el.dataset.cus.split(':'), v = el.value; el.value = el.dataset.prev || el.options[0].value;
  if (v === '_edit') return cusManage(t, key);
  if (t === 'kind') ask('내 종류 만들기', [{ k: 'n', label: '이름 (예: 상담, 학부모, 출장)', req: 1 }, { k: 'b', label: '성격', type: 'select', opts: ['일정', '할 일'], val: '일정' }], o => {
    const n = o.n.trim(); if (!n) return; if (!cusKinds().some(k => k.n === n) && !['일정', '할 일', '업무'].includes(n)) { cusL().kind = cusKinds().concat([{ n, b: o.b === '할 일' ? 'todo' : 'event' }]); save(); }
    cusRefreshAll('c:' + n); document.querySelectorAll('select[data-cus^="kind"]').forEach(s => { if (s === el) { s.value = 'c:' + n; s.dataset.prev = s.value; } }); toast('「' + n + '」 종류를 만들었습니다.');
  }, '만들기');
  else ask('내 항목 추가', [{ k: 'n', label: '이름', req: 1 }], o => { const n = o.n.trim(); if (!n) return; const L = cusStr(key); if (!L.includes(n)) { cusL()[key] = L.concat([n]); save(); } cusRefreshAll(); el.value = n; el.dataset.prev = n; }, '추가');
}, true);
function cusManage(t, key) {
  const d = document.createElement('dialog'); d.className = 'dlg cusm'; document.body.appendChild(d);
  const draw = () => { const L = t === 'kind' ? cusKinds().map(k => k.n + ' (' + (k.b === 'todo' ? '할 일' : '일정') + ')') : cusStr(key); d.innerHTML = '<h3>내 목록 관리</h3>' + (L.map((n, i) => `<div class="cusr"><span>${esc(n)}</span><button class="btn sm" data-cusdel="${i}">삭제</button></div>`).join('') || '<p class="mu">만든 항목이 없습니다.</p>') + '<div class="btns"><button class="btn pri" id="cusok">닫기</button></div><p class="mu">삭제해도 이미 만든 일정·자료의 이름표는 그대로 남습니다.</p>'; };
  d.addEventListener('click', e => { if (e.target.id === 'cusok') d.close(); const b = e.target.closest('[data-cusdel]'); if (b) { const i = +b.dataset.cusdel; if (t === 'kind') cusL().kind = cusKinds().filter((_, j) => j !== i); else cusL()[key] = cusStr(key).filter((_, j) => j !== i); save(); draw(); cusRefreshAll(); } });
  d.addEventListener('close', () => d.remove()); draw(); d.showModal();
}
const _r5 = TF.render; TF.render = function () { const v = _r5.apply(this, arguments); cusPost(); return v; };

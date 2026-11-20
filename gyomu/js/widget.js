/* widget.js — 업무파탈 위젯(보기 전용). 본 앱과 같은 브라우저 저장소(localStorage)를 읽기만 합니다.
   본 앱에서 자료를 고치면 storage 신호로 바로 따라 바뀝니다. 위젯에서는 자료를 쓰지 않습니다(본 앱 자료를 덮어쓰지 않으려고). */
const wSpent = l => (l.spends || []).reduce((a, s) => a + (+s.amt || 0), 0);
const wBadge = n => n === 0 ? 'D-Day' : n > 0 ? 'D-' + n : 'D+' + (-n);
function wEvents() {
  const e = [];
  (S.items || []).forEach(i => { if (i.date) e.push({ date: i.date, t: i.title, kind: i.cat === 'todo' ? '할 일' : '일정', done: !!i.done, todo: i.cat === 'todo' }); });
  (S.assess || []).forEach(a => { if (a.due) e.push({ date: a.due, t: a.title, kind: '평가', done: (a.step || 0) >= 5 }); });
  (S.budget || []).forEach(p => (p.lines || []).forEach(l => { if (l.deadline && (l.alloc - wSpent(l)) > 0) e.push({ date: l.deadline, t: `${p.name} ${l.item} 집행`, kind: '예산', done: false }); }));
  (S.training || []).forEach(t => { if (t.due) e.push({ date: t.due, t: t.title, kind: '연수', done: !!t.done }); });
  (S.dday || []).forEach(x => { if (x.date) e.push({ date: x.date, t: x.title, kind: '디데이', done: false }); });
  return e;
}
function wRender() {
  try { S = Object.assign(DEF(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  const w = document.getElementById('w'), now = new Date(), D = ['일', '월', '화', '수', '목', '금', '토'];
  if (!S.setup) { w.innerHTML = '<div class="top"><h1>업무파탈</h1><a href="index.html">열기</a></div><p class="empty">본 화면에서 먼저 시작해 주세요. 자료가 같은 브라우저에 있어야 위젯에 나옵니다.</p>'; return; }
  const N = (() => { const n = parseInt((S.profile || {}).alarmDays, 10); return n === -1 ? -1 : (n >= 0 && n <= 14 ? n : 2); })();
  const ev = wEvents().filter(x => dd(x.date) !== null), seen = new Set();
  const dds = (S.dday || []).map(x => ({ ...x, n: dd(x.date) })).filter(x => x.n !== null && x.n >= 0).sort((a, b) => a.n - b.n).slice(0, 6);
  const near = N < 0 ? [] : ev.filter(x => !x.done && x.kind !== '일정' && dd(x.date) >= 0 && dd(x.date) <= N).filter(x => { const k = x.kind + x.t + x.date; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.date.localeCompare(b.date));
  const nearKey = new Set(near.map(x => x.t + '|' + x.date)), t = today(), todos = (S.items || []).filter(i => i.cat === 'todo' && !i.done && i.date && i.date <= t && !nearKey.has(i.title + '|' + i.date)).sort((a, b) => a.date.localeCompare(b.date));
  const week = ev.filter(x => !x.done && dd(x.date) > Math.max(N, -1) && dd(x.date) <= 7 && x.kind !== '디데이').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const li = (x, hot) => `<div class="li"><span class="b ${hot ? 'hot' : ''}">${wBadge(dd(x.date))}</span><span class="t">${esc(x.t)}</span><span class="dt">${md(x.date)}</span></div>`;
  w.innerHTML = `<div class="top"><h1>업무파탈</h1><span class="d">${now.getMonth() + 1}월 ${now.getDate()}일 (${D[now.getDay()]})</span><a href="index.html" target="_blank" rel="noopener">열기 ↗</a></div>
  ${dds.length ? `<h2>디데이</h2><div class="chips">${dds.map(x => `<span class="chip ${x.n <= 1 ? 'hot' : ''}"><b>${wBadge(x.n)}</b>${esc(x.title)}</span>`).join('')}</div>` : ''}
  <h2>기한 임박${N >= 0 ? `<small>${N === 0 ? '오늘' : N + '일 안'}</small>` : '<small>알림 꺼짐</small>'}</h2>
  ${near.length ? near.map(x => li(x, dd(x.date) <= 1)).join('') : '<div class="empty">임박한 기한이 없습니다.</div>'}
  <h2>오늘 할 일${todos.length ? `<small>${todos.length}건</small>` : ''}</h2>
  ${todos.length ? todos.slice(0, 8).map(x => `<div class="li td"><span class="b ${x.date < t ? 'hot' : ''}">${x.date < t ? '지남' : '오늘'}</span><span class="t">${esc(x.title)}</span><span class="dt">${md(x.date)}</span></div>`).join('') : '<div class="empty">남은 할 일이 없습니다.</div>'}
  ${week.length ? `<h2>이번 주 기한</h2>${week.map(x => li(x, false)).join('')}` : ''}
  <p class="foot">보기 전용 · 본 화면에서 고치면 바로 따라 바뀝니다 · © 김정환 · M.A.D.T</p>`;
}
window.addEventListener('storage', e => { if (!e.key || e.key === KEY) wRender(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) wRender(); });
setInterval(wRender, 60 * 1000);
try { if (isStandaloneW()) window.resizeTo(380, 580); } catch (e) { }
function isStandaloneW() { try { return matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; } }
wRender();

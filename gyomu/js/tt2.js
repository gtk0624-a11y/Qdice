/* 컴시간 시간표 변경 감시: 앱을 열 때·다시 돌아올 때·오늘 화면을 볼 때(최소 5분 간격) 자동으로 다시 가져와 달라진 칸을 알려 줍니다.
   적용은 자동, 알림 배너에서 [되돌리기] 가능. 컴시간 쪽 자료는 GitHub Actions 가 갱신한 시점까지만 반영됩니다. */
let ttwLast = 0;
function ttwDiff(a, b) {
  const out = [], td = new Date().getDay(), tm = (td + 1) % 7; a = a || {}; b = b || {};
  [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().forEach(k => { if ((a[k] || '') === (b[k] || '')) return; const [d, p] = k.split('-').map(Number); out.push({ d, p, from: a[k] || '', to: b[k] || '', tag: d === td ? '오늘' : d === tm ? '내일' : '' }); });
  return out;
}
function ttwApply(G, silent, j) {
  const old = S.timetable || {}, same = JSON.stringify(G) === JSON.stringify(old), had = Object.keys(old).some(k => old[k]);
  S.profile.comci = Date.now();
  if (same) { save(); if (!silent) toast('이미 최신 시간표입니다.'); return; }
  const df = ttwDiff(old, G); S.timetable = G;
  if (had && df.length) { S.profile.ttChg = { t: Date.now(), prev: old, list: df, seen: false }; try { if (window.Notification && Notification.permission === 'granted') new Notification('업무파탈 · 시간표가 바뀌었습니다', { body: df.slice(0, 3).map(x => `${x.tag ? x.tag + ' ' : ''}${DOW[x.d]}${x.p}교시 ${x.from || '공강'} → ${x.to || '공강'}`).join('\n') }); } catch (e) { } }
  commit(); if (!silent) toast(`컴시간 시간표 ${Object.keys(G).length}칸을 가져왔습니다. (${((j && j.updated) || '').slice(0, 10)} 기준)`);
}
function ttwWatch(force) {
  if (!S.setup || window.TF_DEMO) return; const nm = (S.profile.name || '').trim(); if (nm.length < 2) return;
  if (!force && Date.now() - ttwLast < 5 * 60 * 1000) return; ttwLast = Date.now(); comciSync(true);
}
function ttwBanner() {
  let b = document.getElementById('ttalert'), c = S.profile && S.profile.ttChg; if (!c || c.seen) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'ttalert'; b.setAttribute('role', 'alert'); document.body.appendChild(b); }
  const hot = c.list.filter(x => x.tag), L = (hot.length ? hot : c.list).slice(0, 6);
  b.innerHTML = `<b>🔔 시간표가 바뀌었습니다${hot.length ? ' (' + (hot.some(x => x.tag === '오늘') ? '오늘' : '내일') + ' 포함)' : ''}</b><ul>${L.map(x => `<li>${x.tag ? `<em>${x.tag}</em> ` : ''}${DOW[x.d]}요일 ${x.p}교시: ${esc(x.from || '공강')} → <b>${esc(x.to || '공강')}</b></li>`).join('')}${c.list.length > L.length ? `<li class="mu">…외 ${c.list.length - L.length}칸</li>` : ''}</ul><div class="tools"><button class="btn pri sm" data-act="ttwOk">확인</button><button class="btn sm" data-act="ttwUndo">되돌리기</button>${window.Notification && Notification.permission === 'default' ? '<button class="btn sm" data-act="ttwPerm">🔔 폰·PC 알림도 받기</button>' : ''}</div>`;
}
Object.assign(A, {
  ttwOk() { if (S.profile.ttChg) S.profile.ttChg.seen = true; commit(); },
  ttwUndo() { const c = S.profile.ttChg; if (!c) return; S.timetable = c.prev; c.seen = true; commit(); toast('이전 시간표로 되돌렸습니다.'); },
  ttwPerm() { try { Notification.requestPermission().then(() => ttwBanner()); } catch (e) { } }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ttwWatch(); });
window.addEventListener('focus', () => ttwWatch());
setTimeout(() => ttwWatch(true), 2000);
const _r6 = TF.render; TF.render = function () { const v = _r6.apply(this, arguments); ttwBanner(); if (typeof UI !== 'undefined' && document.querySelector('.strip')) ttwWatch(); return v; };
/* 체험판: 변경 알림이 어떻게 뜨는지 한 번 보여 줍니다 */
setTimeout(() => { if (!window.TF_DEMO || sessionStorage.getItem('ttwdemo')) return; sessionStorage.setItem('ttwdemo', '1'); const k = Object.keys(S.timetable || {}).filter(x => S.timetable[x]).sort()[0]; if (!k) return; const old = { ...S.timetable }; S.timetable = { ...old, [k]: '3-2 체육(변경)' }; S.profile.ttChg = { t: Date.now(), prev: old, list: ttwDiff(old, S.timetable).map(x => ({ ...x, tag: x.tag || '내일' })), seen: false }; commit(); }, 7000);

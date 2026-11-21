/* dday.js — ① 디데이(직접 추가)  ② 기한 알림: 기한이 N일(기본 2일) 안으로 다가오면 화면 아래 얇은 막대로 알려 줌
   - 알림 대상: 할 일 · 수행평가 성적입력 기한 · 예산 집행 기한 · 연수 기한 · 내 디데이 (끝낸 것은 제외)
   - 서버가 없는 앱이라 "앱을 열어 둔 동안"만 알려 줍니다(브라우저 알림을 켜면 열 때 한 번 더 알림). */
function ddList() { return (S.dday = S.dday || []); }
const ALARM_KINDS = ['할 일', '평가', '예산', '연수', '디데이'];
const alarmOff = () => parseInt((S.profile || {}).alarmDays, 10) === -1;
const alarmDays = () => { const n = parseInt((S.profile || {}).alarmDays, 10); return n >= 0 && n <= 14 ? n : 2; };
const ddBadge = n => n === 0 ? 'D-Day' : n > 0 ? 'D-' + n : 'D+' + (-n);

/* 알림에 올릴 항목: 오늘부터 N일 안의 기한 */
function alarmItems() {
  const N = alarmDays(), seen = new Set(), out = [];
  allEvents().forEach(e => {
    if (e.done || !ALARM_KINDS.includes(e.kind)) return;
    const n = dd(e.date); if (n === null || n < 0 || n > N) return;
    const k = (e.id || '') + '|' + e.t + '|' + e.date; if (seen.has(k)) return; seen.add(k);
    out.push({ t: String(e.t).replace(/ \((수행평가|연수)\)$/, ''), date: e.date, n, kind: e.kind });
  });
  return out.sort((a, b) => a.n - b.n || a.t.localeCompare(b.t));
}

/* ---- 화면 아래 알림 막대 ---- */
const ALK = 'tf.alarm', ALN = 'tf.alarmNote';
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
function renderAlarm() {
  let bar = document.getElementById('alarmbar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'alarmbar'; bar.setAttribute('role', 'status'); bar.setAttribute('aria-live', 'polite'); document.body.appendChild(bar); }
  const items = (S.setup && !alarmOff()) ? alarmItems() : [];
  const sig = items.map(i => i.date + i.t).join('|'), st = lsGet(ALK);
  if (!items.length || (st.day === today() && st.sig === sig)) { bar.hidden = true; document.body.classList.remove('hasalarm'); return; }
  const open = bar.dataset.open === '1', f = items[0];
  bar.hidden = false; document.body.classList.add('hasalarm');
  bar.innerHTML = open
    ? `<div class="al-h"><b>⏰ 기한이 다가옵니다</b><span class="mu">${alarmDays() === 0 ? '오늘' : alarmDays() + '일 안'} · ${items.length}건</span><button class="al-x" data-act="alToggle" aria-label="접기">접기</button></div>
       <div class="al-l">${items.slice(0, 8).map(i => `<div class="al-i"><span class="al-b ${i.n <= 1 ? 'hot' : ''}">${ddBadge(i.n)}</span><span class="al-t">${esc(i.t)}</span><span class="al-d">${md(i.date)}</span></div>`).join('')}${items.length > 8 ? `<div class="mu">외 ${items.length - 8}건</div>` : ''}</div>
       <div class="al-f"><button class="btn sm" data-act="alClose">오늘은 그만 보기</button><button class="btn sm" data-act="ddAlarm">알림 설정</button></div>`
    : `<button class="al-main" data-act="alToggle" aria-label="기한 알림 펼치기"><span class="al-ic">⏰</span><span class="al-b ${f.n <= 1 ? 'hot' : ''}">${ddBadge(f.n)}</span><span class="al-t">${esc(f.t)}</span>${items.length > 1 ? `<span class="al-more">외 ${items.length - 1}건</span>` : ''}<i class="al-chev"></i></button><button class="al-x" data-act="alClose" aria-label="오늘은 그만 보기">×</button>`;
  ddNotify(items, sig);
}
/* 브라우저 알림(허용했을 때만, 같은 내용은 하루 한 번) */
function ddNotify(items, sig) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = lsGet(ALN); if (n.day === today() && n.sig === sig) return; lsSet(ALN, { day: today(), sig });
    const body = items.slice(0, 4).map(i => `${ddBadge(i.n)} ${i.t}`).join('\n') + (items.length > 4 ? `\n외 ${items.length - 4}건` : '');
    const opt = { body, icon: 'icons/icon-192.png', tag: 'tf-alarm' };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification('업무파탈 · 기한 알림', opt)).catch(() => new Notification('업무파탈 · 기한 알림', opt));
    else new Notification('업무파탈 · 기한 알림', opt);
  } catch (e) { }
}

/* ---- 오늘 화면: 위쪽 디데이 칩 + 관리용 줄(r13) ---- */
function ddayStrip() {
  const L = ddList().map(x => ({ ...x, n: dd(x.date) })).filter(x => x.n !== null && x.n >= 0).sort((a, b) => a.n - b.n).slice(0, 4);
  if (!L.length) return '';
  return `<div class="ddstrip" aria-label="디데이">${L.map(x => `<span class="ddc ${x.n <= 1 ? 'hot' : ''}"><b>${ddBadge(x.n)}</b>${esc(x.title)}</span>`).join('')}</div>`;
}
function ddayRow() {
  const L = ddList().slice().sort((a, b) => a.date.localeCompare(b.date)), nx = L.find(x => dd(x.date) >= 0);
  const perm = ('Notification' in window) ? Notification.permission : 'none', N = alarmDays();
  const st = nx ? `${esc(nx.title)} <b>${ddBadge(dd(nx.date))}</b>` : '기다리는 날을 추가해 보세요';
  const body = (L.length ? L.map(x => `<div class="td"><span class="ddn ${dd(x.date) < 0 ? 'past' : ''}">${ddBadge(dd(x.date))}</span><span class="tl">${esc(x.title)}</span><span class="mu">${md(x.date)}</span>${xbtn('ddDel', x.id)}</div>`).join('') : '<p class="mu">수능·시험·행사처럼 기다리는 날을 추가하면 오늘 화면 위쪽에 작게 보입니다.</p>')
    + `<div class="tools"><button class="btn sm pri" data-act="ddAdd">+ 디데이 추가</button><button class="btn sm" data-act="ddAlarm">알림 설정 (${alarmOff() ? '꺼짐' : N === 0 ? '당일만' : N + '일 전부터'})</button>${perm === 'default' ? '<button class="btn sm" data-act="ddPerm">브라우저 알림 켜기</button>' : ''}</div>`
    + `<p class="mu">할 일·수행평가·예산·연수 기한이 ${N}일 안으로 다가오면 화면 아래에 작은 막대로 알려 드립니다.${perm === 'granted' ? ' 브라우저 알림도 함께 받습니다.' : ''} 앱을 열어 둔 동안 알려 주며, 닫아 둔 동안에는 보낼 수 없습니다.</p>`;
  return row('r13', '일정', '디데이·기한 알림', st, '', body);
}

Object.assign(A, {
  ddAdd() { ask('디데이 추가', [{ k: 'title', label: '이름 (예: 수능, 기말고사, 체육대회)', req: 1 }, { k: 'date', label: '날짜', type: 'date', req: 1 }], o => { ddList().push({ id: uid(), title: o.title.trim(), date: o.date }); OPEN.add('r13'); try { localStorage.setItem('tf.open', JSON.stringify([...OPEN])); } catch (e) { } commit(); toast('디데이를 추가했습니다.'); }); },
  ddDel(el) { S.dday = ddList().filter(x => x.id !== el.dataset.id); commit(); },
  ddAlarm() { ask('기한 알림 설정', [{ k: 'n', label: '기한 며칠 전부터 알릴까요? (0=당일만, 최대 14, 끄려면 -1)', type: 'number', val: alarmOff() ? -1 : alarmDays() }], o => { const n = parseInt(o.n, 10); S.profile.alarmDays = isNaN(n) ? 2 : Math.max(-1, Math.min(14, n)); lsSet(ALK, {}); commit(); toast(alarmOff() ? '기한 알림을 껐습니다.' : '기한 ' + alarmDays() + '일 전부터 화면 아래에 알려 드립니다.'); }); },
  ddPerm() { if (!('Notification' in window)) return toast('이 브라우저는 알림을 지원하지 않습니다.'); Notification.requestPermission().then(p => { toast(p === 'granted' ? '브라우저 알림을 켰습니다.' : '알림이 허용되지 않았습니다.'); lsSet(ALN, {}); commit(); }); },
  alToggle() { const b = document.getElementById('alarmbar'); if (b) { b.dataset.open = b.dataset.open === '1' ? '0' : '1'; renderAlarm(); } },
  alClose() { lsSet(ALK, { day: today(), sig: alarmItems().map(i => i.date + i.t).join('|') }); renderAlarm(); }
});
BOARD_ROWS.push(['r13', '디데이·기한 알림']);

/* 화면을 다시 그릴 때마다 알림 막대도 다시 계산 (날짜가 바뀌면 5분 안에 갱신) */
(() => { const r = TF.render; TF.render = function () { const v = r.apply(this, arguments); renderAlarm(); return v; }; })();
setInterval(renderAlarm, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAlarm(); });
window.addEventListener('hashchange', () => setTimeout(renderAlarm, 50));
setTimeout(renderAlarm, 300);

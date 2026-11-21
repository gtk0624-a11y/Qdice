/* 화면 순서 바꾸기: 오늘 게시판의 줄 순서 + 위쪽 메뉴 순서. 사람마다 중요한 것이 다르므로 직접 정합니다. */
const ORD_ROWS = [['r1', '일과'], ['r2', '할 일'], ['r3', '공문'], ['r4', '수업'], ['r5', '평가'], ['r6', '예산'], ['r7', '연수'], ['r8', '기록'], ['r9', '업무 분장표'], ['r11', '내 업무'], ['r12', '급식'], ['r10', '교내 연락망'], ['r13', '디데이·기한 알림']];
const ORD_NAV = [['today', '오늘'], ['cal', '캘린더'], ['class', '수업'], ['eval', '평가'], ['budget', '예산'], ['notes', '기록'], ['pages', '페이지'], ['lib', '자료·연락'], ['files', '자료 아카이브']];
const ORD_PRESETS = {
  '업무 중심': { rows: ['r3', 'r2', 'r9', 'r11', 'r1', 'r6', 'r7', 'r5', 'r4', 'r8', 'r12', 'r10'], nav: ['today', 'cal', 'budget', 'notes', 'lib', 'class', 'pages'] },
  '예산 중심': { rows: ['r6', 'r3', 'r2', 'r7', 'r1', 'r11', 'r5', 'r4', 'r8', 'r9', 'r12', 'r10'], nav: ['budget', 'today', 'cal', 'notes', 'lib', 'class', 'pages'] },
  '일정 중심': { rows: ['r1', 'r2', 'r5', 'r3', 'r7', 'r6', 'r4', 'r11', 'r8', 'r12', 'r9', 'r10'], nav: ['cal', 'today', 'class', 'budget', 'notes', 'pages', 'lib'] },
  '수업 중심': { rows: ['r1', 'r4', 'r5', 'r2', 'r8', 'r3', 'r6', 'r7', 'r11', 'r12', 'r9', 'r10'], nav: ['class', 'today', 'cal', 'notes', 'pages', 'budget', 'lib'] }
};
function ordList(kind) {
  const all = (kind === 'rows' ? ORD_ROWS : ORD_NAV).map(x => x[0]), cur = ((S.order || {})[kind] || []).filter(k => all.includes(k));
  return [...cur, ...all.filter(k => !cur.includes(k))];
}
function orderRows(rows) {
  const o = ordList('rows'), key = h => { const m = /data-k="([^"]+)"/.exec(h || ''); return m ? m[1] : ''; };
  return rows.map((h, i) => ({ h, i, p: o.indexOf(key(h)) })).filter(x => x.h).sort((a, b) => ((a.p < 0 ? 999 : a.p) - (b.p < 0 ? 999 : b.p)) || a.i - b.i).map(x => x.h);
}
function navOrder(L) {
  const o = ordList('nav'), by = Object.fromEntries(L);
  return [...o.filter(k => by[k]).map(k => [k, by[k]]), ...L.filter(([k]) => k === 'set' || !o.includes(k))];
}
A.ordPick = () => {
  const d = document.createElement('dialog'); d.className = 'dlg'; d.style.maxWidth = '620px'; d.style.width = '96vw';
  const lab = (kind, k) => (kind === 'rows' ? ORD_ROWS : ORD_NAV).find(x => x[0] === k)[1];
  const draw = () => {
    const part = kind => `<h4 class="dlh">${kind === 'rows' ? '오늘 게시판 줄 순서' : '위쪽 메뉴 순서'}</h4>${ordList(kind).map((k, i, a) => `<div class="ordr"><span>${i + 1}. ${esc(lab(kind, k))}</span><button type="button" class="btn sm" data-ord="${kind}|${k}|-1" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" class="btn sm" data-ord="${kind}|${k}|1" ${i === a.length - 1 ? 'disabled' : ''}>▼</button></div>`).join('')}`;
    d.querySelector('.ordbox').innerHTML = `<div class="tools">${Object.keys(ORD_PRESETS).map(n => `<button type="button" class="btn sm" data-ordset="${n}">${n}</button>`).join('')}<button type="button" class="btn sm" data-ordset="처음">처음 순서</button></div>${part('rows')}${part('nav')}`;
  };
  d.innerHTML = '<form method="dialog"><h3>화면 순서 바꾸기</h3><p class="mu">▲▼로 옮기면 바로 저장됩니다. 설정 메뉴는 항상 맨 끝에 있습니다. 위 버튼으로 한 번에 맞출 수도 있습니다.</p><div class="ordbox"></div><div class="btns"><button value="ok" class="pri">닫기</button></div></form>';
  document.body.appendChild(d); draw();
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-ord]'), s = e.target.closest('[data-ordset]');
    if (b) {
      const [kind, k, dir] = b.dataset.ord.split('|'), l = ordList(kind), i = l.indexOf(k), j = i + (+dir);
      if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; S.order = S.order || {}; S.order[kind] = l; save(true); draw();
    } else if (s) {
      const n = s.dataset.ordset; S.order = n === '처음' ? {} : { rows: ORD_PRESETS[n].rows.slice(), nav: ORD_PRESETS[n].nav.slice() }; save(true); draw();
    }
  });
  d.addEventListener('close', () => { d.remove(); render(); });
  d.showModal();
};

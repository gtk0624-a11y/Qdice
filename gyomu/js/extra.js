/* extra.js — ① 페이지별 메모  ② 공문 처리 기록(무슨 공문을 어떻게 처리했는지) */
const PMEMO = [['today', '오늘'], ['cal', '캘린더'], ['class', '수업'], ['eval', '평가'], ['files', '자료 아카이브'], ['budget', '예산'], ['notes', '기록'], ['pages', '페이지'], ['lib', '자료·연락'], ['set', '설정']];
function pageMemo(page) {
  const hit = PMEMO.find(x => x[0] === page); if (!hit) return '';
  const v = (S.pmemo || {})[page] || '';
  return `<details class="pmemo" ${v ? 'open' : ''}><summary>📝 ${esc(hit[1])} 메모 <small>${v ? v.length + '자' : '이 페이지에서 잊지 말 것을 적어 두세요'}</small></summary><textarea data-pmemo="${page}" rows="4" placeholder="${esc(hit[1])} 페이지 메모 (쓰면 바로 저장됩니다)">${esc(v)}</textarea><button class="btn sm" data-act="memoPick">🎨 메모 디자인</button></details>`;
}
let _pmt;
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.pmemo) return;
  S.pmemo = S.pmemo || {}; S.pmemo[t.dataset.pmemo] = t.value; clearTimeout(_pmt); _pmt = setTimeout(() => save(true), 600);
  const s = t.closest('details').querySelector('small'); if (s) s.textContent = t.value ? t.value.length + '자' : '이 페이지에서 잊지 말 것을 적어 두세요';
});

/* 공문 기록: 개수(접수·처리)는 기록을 더하고 빼면 같이 맞춰집니다 */
function docAdj(date, k, d) { const x = S.docs[date] = S.docs[date] || { recv: 0, done: 0 }; x[k] = Math.max(0, (x[k] || 0) + d); }
function docLogBody() {
  const L = S.docLog || [], td = today();
  const one = x => `<div class="mi dl ${x.done ? 'dn' : ''}"><input type="checkbox" data-dl="done" data-id="${x.id}" ${x.done ? 'checked' : ''} aria-label="처리 완료"><input class="mt" data-dl="title" data-id="${x.id}" value="${esc(x.title)}" placeholder="공문 제목·문서번호" aria-label="공문 제목"><input class="mn" data-dl="note" data-id="${x.id}" value="${esc(x.note || '')}" placeholder="어떻게 처리했는지 (예: 회신 완료 · 결재 올림)" aria-label="처리 내용"><button class="x" data-act="dlDel" data-id="${x.id}">삭제</button></div>`;
  const today_ = L.filter(x => x.date === td), old = L.filter(x => x.date !== td).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);
  const g = {}; old.forEach(x => (g[x.date] = g[x.date] || []).push(x));
  return `<h4 class="dlh">오늘 공문 기록 <small>${today_.filter(x => x.done).length}/${today_.length} 처리</small></h4>${today_.map(one).join('') || '<p class="mu">아직 없습니다. [+ 공문 기록]으로 받은 공문과 처리 내용을 남겨 두세요.</p>'}<div class="tools"><button class="btn sm" data-act="dlAdd">+ 공문 기록</button></div>` +
    (old.length ? `<details class="dlold"><summary>지난 공문 기록 ${old.length}건 보기</summary>${Object.keys(g).map(d => `<b class="mgc">${d}</b>${g[d].map(one).join('')}`).join('')}</details>` : '');
}
Object.assign(A, {
  dlAdd() {
    ask('공문 기록', [{ k: 'title', label: '공문 제목·문서번호', req: 1, ph: '예: 학생인권교육 계획 제출(교무부-1234)' }, { k: 'note', label: '처리 내용 (나중에 써도 됩니다)', type: 'textarea', rows: 3 }, { k: 'st', label: '상태', type: 'select', opts: ['처리 완료', '아직 처리 안 함'] }], o => {
      S.docLog = S.docLog || []; const done = o.st === '처리 완료', d = today();
      S.docLog.push({ id: uid(), date: d, title: o.title.trim(), note: (o.note || '').trim(), done }); docAdj(d, 'recv', 1); if (done) docAdj(d, 'done', 1); OPEN.add('r3'); commit();
    });
  },
  dlDel(el) { const x = (S.docLog || []).find(v => v.id === el.dataset.id); if (!x) return; sure('이 공문 기록을 지울까요? (접수·처리 개수도 함께 줄어듭니다)', () => { docAdj(x.date, 'recv', -1); if (x.done) docAdj(x.date, 'done', -1); S.docLog = S.docLog.filter(v => v !== x); commit(); }); }
});
document.addEventListener('change', e => {
  const t = e.target, k = t.dataset && t.dataset.dl; if (!k) return;
  const x = (S.docLog || []).find(v => v.id === t.dataset.id); if (!x) return;
  if (k === 'done') { x.done = t.checked; docAdj(x.date, 'done', t.checked ? 1 : -1); commit(); }
  else { x[k] = t.value.trim(); if (k === 'title' && !x.title) x.title = '(제목 없음)'; save(true); toast('저장했습니다.'); }
});

/* 캘린더 날짜별 메모 */
function dayMemoBox(ds) {
  const v = (S.dayMemo || {})[ds] || '';
  return `<div class="dmemo"><label>📝 ${md(ds)} 메모<textarea data-dmemo="${ds}" rows="3" placeholder="이 날 기억할 것·준비물·회의 내용 (쓰면 바로 저장됩니다)">${esc(v)}</textarea><button class="btn sm" data-act="memoPick">🎨 메모 디자인</button></label></div>`;
}
let _dmt;
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.dmemo) return;
  S.dayMemo = S.dayMemo || {}; if (t.value.trim()) S.dayMemo[t.dataset.dmemo] = t.value; else delete S.dayMemo[t.dataset.dmemo];
  clearTimeout(_dmt); _dmt = setTimeout(() => { save(true); const c = document.querySelector(`.cd[data-d="${t.dataset.dmemo}"] .n`); if (c) c.textContent = c.textContent.replace(' 📝', '') + (S.dayMemo[t.dataset.dmemo] ? ' 📝' : ''); }, 500);
});

/* 게시판에 보일 줄 고르기: 체크하면 보이고, 빼면 숨겨집니다 (바로 반영) */
const BOARD_ROWS = [['sb', '🏫 학교 배너 (홈페이지·급식)'], ['r1', '일과'], ['r2', '할 일'], ['r3', '공문'], ['r4', '수업 진도'], ['r5', '수행평가'], ['r6', '예산'], ['r7', '연수'], ['r8', '기록'], ['r9', '업무 분장표'], ['r11', '내 업무'], ['r12', '급식'], ['r10', '교내 연락망']];
Object.assign(A, {
  rowPick() {
    const d = document.createElement('dialog'); d.className = 'dlg';
    d.innerHTML = `<form method="dialog"><h3>게시판에 보일 줄 고르기</h3><p class="mu">체크한 줄만 오늘 화면에 나옵니다. 누르면 바로 바뀝니다.</p><div class="hides">${BOARD_ROWS.map(([k, v]) => `<label class="chk"><input type="checkbox" data-hide="${k}" ${S.hide[k] ? '' : 'checked'}> ${v}</label>`).join('')}</div><div class="btns"><button value="ok" class="pri">닫기</button></div></form>`;
    document.body.appendChild(d); d.addEventListener('close', () => d.remove()); d.showModal();
  }
});
/* 게시판 줄을 펼치거나 접은 상태를 기억합니다 (고치거나 체크해도 줄이 다시 닫히지 않게) */
document.addEventListener('toggle', e => {
  const d = e.target; if (!d || !d.dataset || !d.dataset.k || !/^(r\d+|sb|dw|s\d+)$/.test(d.dataset.k)) return;
  if (d.open) OPEN.add(d.dataset.k); else OPEN.delete(d.dataset.k);
  try { localStorage.setItem('tf.open', JSON.stringify([...OPEN])); } catch (er) { }
}, true);
/* 설정 화면: 각 구역을 접고 펼 수 있게 (공간 확보). 열고 닫은 상태는 기억 */
function setFold() {
  if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'set') return;
  document.querySelectorAll('main h3.h3').forEach((h, i) => {
    if (h.closest('details.sec')) return;
    const par = h.parentNode, d = document.createElement('details'), k = 's' + i;
    d.className = 'sec'; d.dataset.k = k; if (OPEN.has(k)) d.open = true;
    const sm = document.createElement('summary'); par.insertBefore(d, h); sm.appendChild(h); d.appendChild(sm);
    const chev = document.createElement('i'); chev.className = 'chev'; sm.appendChild(chev);
    while (d.nextSibling && !(d.nextSibling.nodeType === 1 && d.nextSibling.matches && d.nextSibling.matches('h3.h3'))) d.appendChild(d.nextSibling);
  });
}
{ const _r = render; render = function () { _r.apply(this, arguments); setFold(); }; if (typeof TF !== 'undefined') TF.render = render; }

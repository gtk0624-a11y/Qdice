/* 캘린더 강화(색 구분·범례·월 업무 목록·마우스 올리면 일정 창) + 챗봇 창 끌어 옮기기 + 연락망 표 */
const CAL_KINDS = { '일정': '#d6e8ff', '할 일': '#fff2b8', '학사': '#e6dcff', '평가': '#ffd9e0', '예산': '#cfeee3', '연수': '#ffe3c7', '디데이': '#ffb4ab' };
function calLegend() { return `<div class="clg">${Object.entries(CAL_KINDS).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}</div>`; }
function calAgenda(ev) {
  const [Y, M] = UI.cal.split('-').map(Number), pre = `${Y}-${pad(M)}-`, by = {};
  ev.filter(e => e.date.startsWith(pre) && !e.span).forEach(e => (by[e.date] = by[e.date] || []).push(e));
  const days = Object.keys(by).sort();
  const seenSpan = new Set(), spans = ev.filter(e => e.span && e.date.startsWith(pre) && !seenSpan.has(e.id) && seenSpan.add(e.id));
  const rows = days.map(d => `<div class="ag"><b class="${d === today() ? 'tdy' : ''}">${md(d)} <small>${DOW[new Date(d + 'T00:00:00').getDay()]}</small></b><div>${by[d].map(e => `<span class="chp ${kcls(e.kind)} ${e.done ? 'dn' : ''}" data-act="calDay" data-d="${d}">${esc(e.t)}</span>`).join('')}</div></div>`).join('');
  const sp = spans.map(e => `<span class="chp ${kcls(e.kind)}" data-act="calDay" data-d="${e.date}">${esc(e.t)}</span>`).join('');
  return `<h3 class="h3">${M}월 업무·일정 한눈에</h3>${rows || sp ? rows + (sp ? `<div class="ag"><b>기간</b><div>${sp}</div></div>` : '') : '<p class="mu">이 달은 비어 있습니다. 메신저를 붙여넣거나 아래에서 추가하세요.</p>'}`;
}
/* 날짜에 마우스를 올리면 일정 창, 떼면 사라짐 */
(function () {
  let pop = null;
  const hide = () => { if (pop) { pop.remove(); pop = null; } };
  document.addEventListener('mouseover', e => {
    const b = e.target.closest('.mc[data-d],.cd[data-d]'); if (!b) return;
    const d = b.dataset.d, ev = allEvents().filter(x => x.date === d), memo = (S.dayMemo || {})[d];
    if (!ev.length && !memo) return hide();
    hide(); pop = document.createElement('div'); pop.className = 'calpop';
    pop.innerHTML = `<b>${md(d)} (${DOW[new Date(d + 'T00:00:00').getDay()]})</b>${ev.map(x => `<p class="${x.done ? 'dn' : ''}"><i style="background:${CAL_KINDS[x.kind] || '#eee'}"></i>${esc(x.t)} <small>${x.kind}</small></p>`).join('')}${memo ? `<p class="mm">📝 ${esc(String(memo).slice(0, 80))}</p>` : ''}`;
    document.body.appendChild(pop);
    const r = b.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px';
    pop.style.top = (r.bottom + h + 10 > innerHeight ? Math.max(6, r.top - h - 8) : r.bottom + 8) + 'px';
  });
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('.mc[data-d],.cd[data-d]') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.mc[data-d],.cd[data-d]'))) hide(); });
  document.addEventListener('click', hide, true); window.addEventListener('scroll', hide, { passive: true });
})();
/* 챗봇 창 끌어서 옮기기(컴퓨터). 위치는 기억합니다. */
(function () {
  const KEY = 'tf.chatpos'; let drag = null;
  const place = () => { const p = document.getElementById('chatpan'); if (!p || innerWidth <= 560) { if (p) { p.style.left = p.style.top = p.style.right = p.style.bottom = ''; } return; } try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v) { p.style.left = Math.max(0, Math.min(innerWidth - 120, v.x)) + 'px'; p.style.top = Math.max(0, Math.min(innerHeight - 60, v.y)) + 'px'; p.style.right = 'auto'; p.style.bottom = 'auto'; } } catch (er) { } };
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest('#chatpan .ch-h'); if (!h || e.target.closest('button') || innerWidth <= 560) return;
    const p = document.getElementById('chatpan'), r = p.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; h.setPointerCapture && h.setPointerCapture(e.pointerId); e.preventDefault();
  });
  document.addEventListener('pointermove', e => { if (!drag) return; const p = document.getElementById('chatpan'); p.style.left = Math.max(0, Math.min(innerWidth - 120, e.clientX - drag.dx)) + 'px'; p.style.top = Math.max(0, Math.min(innerHeight - 60, e.clientY - drag.dy)) + 'px'; p.style.right = 'auto'; p.style.bottom = 'auto'; });
  document.addEventListener('pointerup', () => { if (!drag) return; drag = null; const p = document.getElementById('chatpan'), r = p.getBoundingClientRect(); try { localStorage.setItem(KEY, JSON.stringify({ x: r.left, y: r.top })); } catch (er) { } });
  const o = window.renderChat; window.renderChat = function () { const r = o.apply(this, arguments); place(); return r; };
})();
/* 교내 연락망 표 : 부서별 묶음 · 전화 걸기 링크 */
function contactTable(C) {
  if (!C.length) return '<p class="mu">연락망이 없습니다. 아래에서 표 파일로 한 번에 넣거나 한 줄씩 추가하세요.</p>';
  const g = {}; C.forEach(c => (g[c.dept || '(부서 없음)'] = g[c.dept || '(부서 없음)'] || []).push(c));
  const tel = s => /\d/.test(s || '') ? `<a href="tel:${esc(String(s).replace(/[^\d+]/g, ''))}">${esc(s)}</a>` : esc(s || '');
  return `<div class="ctw"><table class="tbl ctb"><thead><tr><th>부서</th><th>이름</th><th>내선</th><th>전화</th><th></th></tr></thead><tbody>${Object.keys(g).sort((a, b) => a.localeCompare(b, 'ko')).map(dp => `<tr class="dg"><th colspan="5">${esc(dp)} <span class="mu">${g[dp].length}명</span></th></tr>` + g[dp].map(c => `<tr><td class="dpn">${esc(c.dept)}</td><td><b>${esc(c.name)}</b>${c.memo ? `<br><small class="mu">📞 ${esc(c.memo)}</small>` : ''}</td><td>${tel(c.ext)}</td><td>${tel(c.phone)}</td><td class="act"><button class="x" data-act="edit_contacts" data-id="${c.id}">수정</button>${xbtn('del_contacts', c.id)}</td></tr>`).join('')).join('')}</tbody></table></div>`;
}

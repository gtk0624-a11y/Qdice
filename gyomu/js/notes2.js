/* 기록: 회의 이름 목록(추가 가능) · 회의별 보기 · 제목에서 회의 자동 분류(선택) */
const MEET0 = ['교직원회의', '부장회의', '학년협의회', '교과협의회', '수업탐구공동체', '연수', '학교운영위원회', '기타'];
const meetList = () => { S.meetings = (Array.isArray(S.meetings) && S.meetings.length) ? S.meetings : [...MEET0]; return S.meetings; };
const guessMeet = n => { const t = norm((n.title || '') + ' ' + (n.body || '').slice(0, 80)); return meetList().find(m => m !== '기타' && t.includes(norm(m).replace(/회의$/, ''))) || ''; };
const _notesView0 = notesView;
notesView = function (id) {
  let h = _notesView0(id); UI.nv = UI.nv || 'date';
  const n = S.notes.find(x => x.id === id), M = meetList(), auto = !!S.profile.autoMeet;
  const item = x => `<a href="#/note/${x.id}" class="${x.id === id ? 'on' : ''}"><b>${esc(x.title || '제목 없음')}</b><span class="mu">${md(x.date)}${UI.nv === 'date' ? ' · ' + esc(x.meeting || x.kind || '') : ''}${x.lock ? ' · 잠금' : ''}</span></a>`;
  let body;
  if (UI.nv === 'meet') {
    const g = {}; [...S.notes].sort((a, b) => b.date.localeCompare(a.date)).forEach(x => (g[x.meeting || '(회의 미지정)'] = g[x.meeting || '(회의 미지정)'] || []).push(x));
    body = Object.keys(g).sort((a, b) => (M.indexOf(a) < 0 ? 99 : M.indexOf(a)) - (M.indexOf(b) < 0 ? 99 : M.indexOf(b))).map(k => `<details class="mtg" ${OPEN.has('mt' + k) || (n && (n.meeting || '(회의 미지정)') === k) ? 'open' : ''} data-open="mt${esc(k)}"><summary><b>${esc(k)}</b> <span class="mu">${g[k].length}건</span></summary>${g[k].map(item).join('')}</details>`).join('') || '<p class="mu">노트가 없습니다.</p>';
  } else body = [...S.notes].sort((a, b) => b.date.localeCompare(a.date)).map(item).join('') || '<p class="mu">노트가 없습니다.</p>';
  const aside = `<aside class="nlist"><button class="btn" data-act="noteNew">+ 새 노트</button><div class="seg"><button class="chp ${UI.nv === 'date' ? 'on' : ''}" data-act="nvSet" data-v="date">날짜순</button><button class="chp ${UI.nv === 'meet' ? 'on' : ''}" data-act="nvSet" data-v="meet">회의별</button></div><label class="chk sm"><input type="checkbox" data-meetauto ${auto ? 'checked' : ''}> 제목 보고 회의 자동 분류</label><button class="x" data-act="meetEdit">회의 이름 관리</button>${body}</aside>`;
  const a = h.indexOf('<aside class="nlist">'), b = h.indexOf('</aside>', a); if (a >= 0 && b > a) h = h.slice(0, a) + aside + h.slice(b + 8);
  if (n) { const s = h.indexOf('<select data-note="kind"'), e = h.indexOf('</select>', s); if (s >= 0) h = h.slice(0, s) + `<select data-meetsel aria-label="회의 이름"><option value="">(회의 선택)</option>${M.map(m => `<option ${m === n.meeting ? 'selected' : ''}>${esc(m)}</option>`).join('')}<option value="__add">＋ 새 회의 이름 추가…</option>` + h.slice(e); }
  return h;
};
Object.assign(A, {
  nvSet(el) { UI.nv = el.dataset.v; render(); },
  meetEdit() { ask('회의 이름 관리 (줄마다 하나)', [{ k: 'l', label: '회의 이름 목록', type: 'textarea', rows: 10, val: meetList().join('\n') }], o => { const L = [...new Set(o.l.split('\n').map(s => s.trim()).filter(Boolean))]; S.meetings = L.length ? L : [...MEET0]; commit(); }); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.meetsel !== undefined) { const n = find('notes', location.hash.split('/')[2]); if (!n) return; if (t.value === '__add') { t.value = n.meeting || ''; ask('새 회의 이름', [{ k: 'name', label: '회의 이름 (예: 3학년 학년회의)', req: 1 }], o => { const m = o.name.trim(); if (!meetList().includes(m)) S.meetings.push(m); n.meeting = m; n.kind = '회의'; commit(); }); } else { n.meeting = t.value; n.kind = t.value ? '회의' : n.kind; commit(); } }
  else if (t.dataset && t.dataset.meetauto !== undefined) { S.profile.autoMeet = t.checked; if (t.checked) { let c = 0; S.notes.forEach(x => { if (!x.meeting) { const g = guessMeet(x); if (g) { x.meeting = g; c++; } } }); toast(c ? c + '개 노트를 회의별로 분류했습니다.' : '자동 분류를 켰습니다. 제목에 회의 이름이 들어가면 분류돼요.'); } commit(); }
}, true);
document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.note === 'title' && S.profile.autoMeet) { const n = find('notes', location.hash.split('/')[2]); if (n && !n.meeting) { const g = guessMeet(n); if (g) { n.meeting = g; const s = document.querySelector('[data-meetsel]'); if (s) s.value = g; save(true); } } } });
meetList();

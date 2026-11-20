'use strict';
/* ===== 업무파탈 app.js : 화면 · 동작 =====
   읽는 순서: 맨 위 공통 계산 → 화면(오늘/캘린더/수업·평가/예산/기록/자료·연락/설정) → 동작(A) → 폼(FM) → 꿈송이 → 시작 */
const ASSESS_STEPS = ['계획', '안내', '수행', '채점', '입력', '확정'];
const UI = { cal: today().slice(0, 7), day: today(), q: '' };
const OPEN = new Set(JSON.parse(localStorage.getItem('tf.open') || '["r1","r2"]'));

/* ---------- 공통 계산 ---------- */
function btot() { let a = 0, s = 0; S.budget.forEach(p => { a += projAlloc(p); s += projSpent(p); }); return { a, s, b: a - s }; }
function allEvents() {
  const e = [];
  S.items.forEach(i => {
    if (!i.date) return; const kind = i.cat === 'todo' ? '할 일' : (i.src === '학사' ? '학사' : '일정');
    if (i.end && i.end > i.date) { const a = new Date(i.date + 'T00:00:00'), b = new Date(i.end + 'T00:00:00'); for (let k = 0, d = new Date(a); d <= b && k < 70; k++, d.setDate(d.getDate() + 1)) e.push({ date: ymd(d), t: `${i.title} (${md(i.date)}~${md(i.end)})`, kind, id: i.id, done: i.done, span: true }); }
    else e.push({ date: i.date, t: i.title, kind, id: i.id, done: i.done });
  });
  S.assess.forEach(a => { if (a.due) e.push({ date: a.due, t: a.title + ' (수행평가)', kind: '평가', done: (a.step || 0) >= 5 }); });
  S.budget.forEach(p => p.lines.forEach(l => { if (l.deadline && (l.alloc - spentOf(l)) > 0) e.push({ date: l.deadline, t: `${p.name} ${l.item} 집행 (잔액 ${won(l.alloc - spentOf(l))}원)`, kind: '예산', done: false }); }));
  S.training.forEach(t => { if (t.due) e.push({ date: t.due, t: t.title + ' (연수)', kind: '연수', done: !!t.done }); });
  return e;
}
function upcoming(n) { const seen = new Set(); return allEvents().filter(e => !e.done && dd(e.date) !== null && dd(e.date) >= 0 && dd(e.date) <= n).sort((a, b) => a.date.localeCompare(b.date)).filter(e => { if (!e.span) return true; if (seen.has(e.id)) return false; seen.add(e.id); return true; }); }
function periodInfo() {
  const p = S.profile, [h, m] = p.start.split(':').map(Number), now = new Date(), mins = now.getHours() * 60 + now.getMinutes(), st = h * 60 + m;
  let cur = 0, next = 0;
  if (p.bell && p.bell.length) { p.bell.forEach(x => { if (mins >= x.s && mins < x.e) cur = x.p; else if (mins < x.s && !next) next = x.p; }); return { dow: now.getDay(), cur, next }; }
  for (let i = 1; i <= 7; i++) { const a = st + (i - 1) * (+p.classMin + +p.breakMin), b = a + +p.classMin; if (mins >= a && mins < b) cur = i; else if (mins < a && !next) next = i; }
  return { dow: now.getDay(), cur, next };
}
const tt = (d, p) => S.timetable[d + '-' + p] || '';
const lessonPct = l => (+l.total ? Math.round(+l.done / +l.total * 100) : 0);

/* ---------- 목록 설정 (추가·수정 대화상자 공통) ---------- */
const CFG = {
  duties: { t: '업무 분장', f: i => [{ k: 'dept', label: '부서', val: i.dept, req: 1 }, { k: 'work', label: '업무', val: i.work, req: 1 }, { k: 'who', label: '담당자', val: i.who }, { k: 'mine', label: '내 업무인가요?', type: 'select', opts: ['아니오', '예'], val: i.mine ? '예' : '아니오' }], from: o => ({ dept: o.dept, work: o.work, who: o.who, mine: o.mine === '예' }) },
  contacts: { t: '연락처', f: i => [{ k: 'dept', label: '부서', val: i.dept }, { k: 'name', label: '이름', val: i.name, req: 1 }, { k: 'ext', label: '내선', val: i.ext }, { k: 'phone', label: '전화(선택)', val: i.phone }], from: o => ({ dept: o.dept, name: o.name, ext: o.ext, phone: o.phone }) },
  training: { t: '연수', f: i => [{ k: 'title', label: '연수 이름', val: i.title, req: 1 }, { k: 'type', label: '종류', type: 'select', opts: ['필수', '개발'], val: i.type || '필수' }, { k: 'hours', label: '시간', type: 'number', val: i.hours ?? 1 }, { k: 'due', label: '기한(선택)', type: 'date', val: i.due }, { k: 'done', label: '이수 여부', type: 'select', opts: ['미이수', '이수'], val: i.done ? '이수' : '미이수' }, { k: 'certNo', label: '이수번호 (다 들은 뒤 입력)', val: i.certNo }, { k: 'doneDate', label: '이수일', type: 'date', val: i.doneDate }], from: o => ({ title: o.title, type: o.type, hours: +o.hours || 0, due: o.due, done: o.done === '이수', certNo: (o.certNo || '').trim(), doneDate: o.doneDate }) },
  assess: { t: '수행평가', f: i => [{ k: 'title', label: '평가 이름', val: i.title, req: 1 }, { k: 'grade', label: '학년(예: 2학년)', val: i.grade }, { k: 'due', label: '성적 입력 기한', type: 'date', val: i.due }, { k: 'step', label: '진행 단계', type: 'select', opts: ASSESS_STEPS, val: ASSESS_STEPS[i.step || 0] }], from: o => ({ title: o.title, grade: o.grade, due: o.due, step: ASSESS_STEPS.indexOf(o.step) }) },
  lessons: { t: '수업 진도', f: i => [{ k: 'cls', label: '반', type: 'select', opts: S.profile.classes, val: i.cls }, { k: 'unit', label: '단원', val: i.unit, req: 1 }, { k: 'done', label: '나간 차시', type: 'number', val: i.done ?? 0 }, { k: 'total', label: '전체 차시', type: 'number', val: i.total ?? 10 }], from: o => ({ cls: o.cls, unit: o.unit, done: +o.done || 0, total: +o.total || 0 }) },
  links: { t: '서랍 사이트', f: i => [{ k: 'name', label: '이름', val: i.name, req: 1 }, { k: 'url', label: '주소(https://…)', val: i.url, req: 1 }], from: o => ({ name: o.name, url: /^https?:\/\//.test(o.url) ? o.url : 'https://' + o.url }) }
};

/* ---------- 화면 조각 ---------- */
function row(key, cat, title, status, due, body) {
  if (S.hide[key]) return '';
  return `<details class="row" data-k="${key}" ${OPEN.has(key) ? 'open' : ''}><summary><span class="cat">${cat}</span><span class="ttl">${title}</span><span class="st">${status}</span><span class="due">${due || ''}</span><i class="chev"></i></summary><div class="rb">${body}</div></details>`;
}
const bar = (p, hot) => `<div class="bar"><i style="width:${Math.min(100, p)}%" class="${hot ? 'hot' : ''}"></i></div>`;
const xbtn = (act, id, l) => `<button class="x" data-act="${act}" data-id="${id}" aria-label="${l || '삭제'}">${l || '삭제'}</button>`;

function masthead() {
  const n = new Date(), M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], D = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const p = S.profile;
  return `<header class="mast"><div class="mast1"><img class="logo" src="${LOGO || DEFLOGO}" alt="도디쌤 이미지"><h1 data-act="editTitle" title="눌러서 제목 고치기">${esc(titleOf())}</h1><span class="fr" data-act="editTitle">${esc(p.sub || 'Travail Fatal')}</span><button class="x" data-act="editTitle" aria-label="제목 고치기">✎</button></div><div class="mast2"><div class="dt">${D[n.getDay()]} · ${n.getDate()} ${M[n.getMonth()]} ${n.getFullYear()}</div><div>${esc([p.school, p.name && p.name + ' 선생님'].filter(Boolean).join(' · '))}</div></div></header>`;
}
function nav(page) {
  const L = [['today', '오늘'], ['cal', '캘린더'], ['class', '수업·평가'], ['budget', '예산'], ['notes', '기록'], ['pages', '페이지'], ['lib', '자료·연락'], ['set', '설정']];
  return `<nav class="nav" aria-label="메뉴">${L.map(([k, v]) => `<a href="#/${k}" ${page === k || (k === 'notes' && page === 'note') || (k === 'pages' && page === 'page') ? 'aria-current="page"' : ''}>${v}</a>`).join('')}</nav>`;
}
function footer() {
  return `${drawerHtml()}<footer class="cp">© 김정환 · M.A.D.T (Moral And Digital Teacher)</footer>`;
}

/* ---------- 오늘 ---------- */
function miniCal() {
  const [Y, M] = UI.cal.split('-').map(Number), first = new Date(Y, M - 1, 1), n = new Date(Y, M, 0).getDate(), by = {};
  allEvents().forEach(e => (by[e.date] = by[e.date] || []).push(e));
  let cells = ''; for (let i = 0; i < first.getDay(); i++) cells += '<span class="mc e"></span>';
  for (let d = 1; d <= n; d++) { const ds = `${Y}-${pad(M)}-${pad(d)}`, c = (by[ds] || []).length, w = new Date(Y, M - 1, d).getDay(); cells += `<button class="mc ${ds === today() ? 'tdy' : ''} ${ds === UI.day ? 'sel' : ''} ${w === 0 ? 'sun' : ''}" data-act="calDay" data-d="${ds}" aria-label="${M}월 ${d}일"><span>${d}</span>${dayStk(ds, 2) ? `<b class="sks">${dayStk(ds, 2)}</b>` : ''}${c ? `<i>${'●'.repeat(Math.min(c, 3))}</i>` : ''}</button>`; }
  const day = by[UI.day] || [];
  return `<section class="mcal"><div class="calh"><button class="btn sm" data-act="calMove" data-d="-1" aria-label="이전 달">‹</button><b class="calt">${Y}년 ${M}월</b><button class="btn sm" data-act="calMove" data-d="1" aria-label="다음 달">›</button><button class="btn sm" data-act="calMove" data-d="0">오늘</button></div><div class="calw">${DOW.map(d => `<span>${d}</span>`).join('')}</div><div class="mgrid">${cells}</div><div class="mday"><b>${md(UI.day)} (${DOW[new Date(UI.day + 'T00:00:00').getDay()]})</b>${day.length ? day.map(e => `<p class="${e.done ? 'dn' : ''}">· ${esc(e.t)} <span class="mu">${e.kind || ''}</span></p>`).join('') : '<p class="mu">이 날 일정이 없습니다.</p>'}<div class="mdst">${((S.stk || {})[UI.day] || []).map((s, i) => `<button class="stk" data-act="stkDayDel" data-d="${UI.day}" data-i="${i}" aria-label="스티커 떼기">${stkHtml(s)}</button>`).join('')}</div><button class="btn sm" data-act="stkDay">🎀 스티커 붙이기</button> <a href="#/cal" class="btn sm">일정 추가·학사일정 올리기</a></div></section>`;
}
function todayView() {
  const t = today(), P = periodInfo(), rows = [];
  /* 일과 */
  {
    const has = Object.keys(S.timetable).some(k => S.timetable[k]);
    let st = '시간표가 비어 있습니다 → 수업·평가에서 "컴시간에서 가져오기"', due = '';
    if (has) {
      if (P.dow === 0 || P.dow === 6) st = '주말입니다';
      else if (P.cur) { st = `${P.cur}교시 ${esc(tt(P.dow, P.cur) || '공강')} 진행 중`; due = P.cur < 7 ? '다음 ' + (P.cur + 1) + '교시' : ''; }
      else if (P.next) { st = `다음 ${P.next}교시 ${esc(tt(P.dow, P.next) || '공강')}`; due = ''; }
      else st = '오늘 수업이 모두 끝났습니다';
    }
    let b = '<div class="strip">' + [1, 2, 3, 4, 5, 6, 7].map(p => `<div class="pc ${P.cur === p ? 'now' : ''}"><b>${p}</b>${esc(tt(P.dow, p) || '—')}</div>`).join('') + '</div>';
    b += '<p class="mu">시간표는 컴시간알리미를 보고 한 번만 입력해 두면 매일 자동으로 보입니다.</p>';
    rows.push(row('r1', '오늘', '일과', st, due, b));
  }
  /* 할 일 */
  {
    const list = S.items.filter(i => i.cat === 'todo' && (i.date === t || (!i.done && (!i.date || i.date < t))));
    const dn = list.filter(i => i.done).length;
    const b = list.map(i => `<div class="td ${i.done ? 'dn' : ''}"><button class="ck" data-act="tog" data-id="${i.id}" aria-pressed="${!!i.done}" aria-label="완료 표시"></button><span class="tl">${esc(i.title)}</span>${i.date && i.date < t ? `<span class="late">${ddText(dd(i.date))}</span>` : ''}<span class="stamp">완료</span>${xbtn('delItem', i.id)}</div>`).join('') +
      `<form class="inl" data-form="todo"><input name="title" placeholder="할 일 추가" required aria-label="할 일"><input type="date" name="date" value="${t}" aria-label="날짜"><button class="btn">추가</button></form>`;
    rows.push(row('r2', '오늘', '할 일', `<b class="num">${dn}</b> / ${list.length} 완료`, '오늘', b));
  }
  /* 공문 */
  {
    const d = S.docs[t] || { recv: 0, done: 0 };
    const st = `접수 ${d.recv} · 처리 ${d.done} · ${d.recv - d.done > 0 ? `<span class="hot">남음 ${d.recv - d.done}</span>` : '남음 0'}`;
    const step = (k, l) => `<div class="stp"><span>${l}</span><button class="btn sm" data-act="docs" data-k="${k}" data-d="-1" aria-label="${l} 줄이기">−</button><b class="num">${d[k]}</b><button class="btn sm" data-act="docs" data-k="${k}" data-d="1" aria-label="${l} 늘리기">+</button></div>`;
    rows.push(row('r3', '업무', '공문', st, '오늘', step('recv', '오늘 받은 공문') + step('done', '처리한 공문') + (typeof docLogBody === 'function' ? docLogBody() : '')));
  }
  /* 수업 진도 */
  {
    const L = S.lessons, avg = L.length ? Math.round(L.reduce((a, l) => a + lessonPct(l), 0) / L.length) : 0;
    const slow = L.filter(l => lessonPct(l) < avg - 5);
    const st = L.length ? `${L.length}개 반 평균 ${avg}%${slow.length ? ` · <span class="hot">${slow.map(l => l.cls).join('·')} 느림</span>` : ''}` : '반별 진도를 입력해 보세요';
    const b = L.map(l => `<div class="ls"><span class="lc">${esc(l.cls)}</span><span class="lu">${esc(l.unit)}</span>${bar(lessonPct(l), lessonPct(l) < avg - 5)}<span class="num">${l.done}/${l.total}</span><button class="btn sm" data-act="lessonStep" data-id="${l.id}" data-d="-1" aria-label="한 차시 줄이기">−</button><button class="btn sm" data-act="lessonStep" data-id="${l.id}" data-d="1" aria-label="한 차시 나감">+1차시</button></div>`).join('') + `<button class="btn sm" data-act="add_lessons">+ 진도 추가</button>`;
    rows.push(row('r4', '수업', '수업 진도', st, '', b));
  }
  /* 평가 */
  {
    const A = [...S.assess].sort((a, b) => (a.due || '9').localeCompare(b.due || '9')), nx = A.find(a => (a.step || 0) < 5);
    const st = nx ? `${esc(nx.title)} · <b>${ASSESS_STEPS[nx.step || 0]}</b> 단계` : (A.length ? '모든 평가가 확정되었습니다' : '수행평가를 등록해 보세요');
    const b = A.map(a => `<div class="as"><div class="ah"><b>${esc(a.title)}</b> <span class="mu">${esc(a.grade || '')} ${a.due ? '· 입력기한 ' + md(a.due) + ' ' + ddText(dd(a.due)) : ''}</span> <button class="x" data-act="edit_assess" data-id="${a.id}">수정</button>${xbtn('del_assess', a.id)}</div><div class="steps">${ASSESS_STEPS.map((s, i) => `<button class="stp1 ${i === (a.step || 0) ? 'on' : ''} ${i < (a.step || 0) ? 'past' : ''}" data-act="assessStep" data-id="${a.id}" data-s="${i}">${s}</button>`).join('')}</div></div>`).join('') + `<button class="btn sm" data-act="add_assess">+ 수행평가 추가</button>`;
    rows.push(row('r5', '평가', '수행평가', st, nx && nx.due ? md(nx.due) + ' ' + ddText(dd(nx.due)) : '', b));
  }
  /* 예산 */
  {
    const T = btot(), dl = [];
    S.budget.forEach(p => p.lines.forEach(l => { if (l.deadline && l.alloc - spentOf(l) > 0) dl.push(l.deadline); })); dl.sort();
    const st = S.budget.length ? `잔액 <b class="num">${won(T.b)}</b>원 · 집행 ${T.a ? Math.round(T.s / T.a * 100) : 0}%` : '예산 항목을 만들어 보세요';
    const b = S.budget.map(p => `<div class="bp"><b>${esc(p.name)}</b> <span class="mu">총액 ${won(projAlloc(p))} · 집행 ${won(projSpent(p))} · 잔액 ${won(projAlloc(p) - projSpent(p))}원</span></div>`).join('') + '<a class="btn sm" href="#/budget">예산 장부 열기</a>';
    rows.push(row('r6', '업무', '예산', st, dl[0] ? md(dl[0]) + ' ' + ddText(dd(dl[0])) : '', b));
  }
  /* 연수 */
  {
    const req = S.training.filter(x => x.type === '필수'), rd = req.filter(x => x.done).length;
    const dev = S.training.filter(x => x.type === '개발' && x.done).reduce((a, x) => a + (+x.hours || 0), 0);
    const left = S.training.filter(x => !x.done && x.due).sort((a, b) => a.due.localeCompare(b.due))[0];
    const noNo = S.training.filter(x => x.done && !x.certNo).length;
    const b = S.training.map(x => `<div class="tr ${x.done ? 'dn' : ''}"><button class="ck" data-act="trToggle" data-id="${x.id}" aria-pressed="${!!x.done}" aria-label="이수 표시"></button><span class="tl">${esc(x.title)}<br><span class="mu">${x.type} ${x.hours}시간 ${x.due ? '· 기한 ' + md(x.due) : ''}${x.done && x.doneDate ? ' · 이수일 ' + md(x.doneDate) : ''}</span></span>${x.done ? `<input class="cert" data-cert="${x.id}" value="${esc(x.certNo || '')}" placeholder="이수번호 입력" aria-label="${esc(x.title)} 이수번호">` : '<span class="mu">다 들으면 이수번호 입력</span>'}<button class="x" data-act="edit_training" data-id="${x.id}">수정</button>${xbtn('del_training', x.id)}</div>`).join('') + `<button class="btn sm" data-act="add_training">+ 연수 추가</button>`;
    rows.push(row('r7', '연수', '연수 이수', `필수 ${rd}/${req.length} · 개발 ${dev}/${S.profile.devTarget}시간${noNo ? ` · <span class="hot">이수번호 미입력 ${noNo}</span>` : ''}`, left ? md(left.due) + ' ' + ddText(dd(left.due)) : '', b));
  }
  /* 기록 */
  {
    const N = [...S.notes].sort((a, b) => b.date.localeCompare(a.date)), n = N[0];
    const cnt = s => String(s || '').split('\n').filter(x => x.trim()).length;
    const st = n ? `${esc(n.title)} · 결정 ${cnt(n.decisions)}건 · <span class="hot">후속 ${cnt(n.followups)}건</span>` : '회의·연수 노트를 써 보세요';
    const b = N.slice(0, 5).map(x => `<div class="nl"><a href="#/note/${x.id}">${md(x.date)} ${esc(x.title)}</a><span class="mu">${esc(x.kind)}</span></div>`).join('') + '<a class="btn sm" href="#/notes">기록 전체</a>';
    rows.push(row('r8', '기록', '회의·연수 노트', st, n ? md(n.date) : '', b));
  }
  /* 업무 분장 / 연락망 */
  {
    const mine = S.duties.filter(d => d.mine);
    rows.push(row('r9', '학교', '업무 분장표', S.duties.length ? `내 업무 ${mine.length}건${mine[0] ? ' · ' + esc(mine[0].work) : ''}` : '업무 분장표를 올려 보세요', '', mine.map(d => `<div class="nl"><span>${esc(d.dept)} · ${esc(d.work)}</span></div>`).join('') + '<a class="btn sm" href="#/lib">분장표 열기</a>'));
    rows.push(typeof mineRow === 'function' ? mineRow() : '');
    rows.push(typeof mealRow === 'function' ? mealRow() : '');
    rows.push(row('r10', '학교', '교내 연락망', S.contacts.length ? `교직원 ${S.contacts.length}명 · 이름·부서·내선 검색` : '연락망을 올려 보세요', '', '<a class="btn sm" href="#/lib">연락망 열기</a>'));
  }
  S.pages.filter(p => p.pin).forEach(p => {
    const todos = (p.blocks || []).filter(b => b.t === 'todo'), dn = todos.filter(b => b.done).length, first = (p.blocks || []).find(b => b.x && b.t !== 'todo');
    const st = todos.length ? `${dn} / ${todos.length} 완료` + (first ? ' · ' + esc(first.x.slice(0, 30)) : '') : (first ? esc(first.x.slice(0, 50)) : '내용 없음');
    rows.push(row('pg' + p.id, '페이지', esc(p.title || '제목 없음'), st, '', todos.map(b => `<div class="td ${b.done ? 'dn' : ''}"><button class="ck" data-act="bTodo" data-p="${p.id}" data-b="${b.id}" aria-pressed="${!!b.done}" aria-label="완료 표시"></button><span class="tl">${esc(b.x)}</span><span class="stamp">완료</span></div>`).join('') + `<a class="btn sm" href="#/page/${p.id}">페이지 열기</a>`));
  });
  const up = upcoming(7);
  return `${typeof schoolBanner === 'function' ? schoolBanner() : ''}<div class="bh"><h2>오늘의 게시판</h2><span class="mu">줄을 누르면 펼쳐집니다.</span><button class="btn sm" data-act="rowPick">☑ 보일 줄 고르기</button></div>
  <div class="spread"><div class="pgL">${miniCal()}${up.length ? `<p class="soon"><b>이번 주 기한</b><br>${up.slice(0, 6).map(e => `${md(e.date)} ${esc(e.t)}`).join('<br>')}</p>` : ''}</div>
  <div class="pgR"><div class="cols"><span>분류</span><span>제목</span><span>현황</span><span class="r">기한</span><span></span></div>${rows.join('')}</div></div>`;
}

/* ---------- 캘린더 ---------- */
function calView() {
  const [Y, M] = UI.cal.split('-').map(Number), first = new Date(Y, M - 1, 1), n = new Date(Y, M, 0).getDate(), ev = allEvents(), by = {};
  ev.forEach(e => (by[e.date] = by[e.date] || []).push(e));
  let cells = '';
  for (let i = 0; i < first.getDay(); i++) cells += '<span class="cd e"></span>';
  for (let d = 1; d <= n; d++) {
    const ds = `${Y}-${pad(M)}-${pad(d)}`, e = by[ds] || [];
    cells += `<button class="cd ${ds === today() ? 'tdy' : ''} ${ds === UI.day ? 'sel' : ''}" data-act="calDay" data-d="${ds}"><span class="n">${d}${(S.dayMemo || {})[ds] ? ' 📝' : ''}</span>${e.slice(0, 2).map(x => `<small class="${x.done ? 'dn' : ''}">${esc(x.t)}</small>`).join('')}${e.length > 2 ? `<small class="mu">+${e.length - 2}</small>` : ''}</button>`;
  }
  const day = (by[UI.day] || []);
  const list = day.map(e => e.id ? `<div class="td ${e.done ? 'dn' : ''}"><button class="ck" data-act="tog" data-id="${e.id}" aria-pressed="${!!e.done}" aria-label="완료 표시"></button><span class="tl">${esc(e.t)}</span><span class="mu">${e.kind}</span>${xbtn('delItem', e.id)}</div>` : `<div class="td"><span class="ck off"></span><span class="tl">${esc(e.t)}</span><span class="mu">${e.kind}</span></div>`).join('') || '<p class="mu">이 날은 비어 있습니다.</p>';
  return `<div class="bh"><h2>캘린더</h2><span class="mu">평가·예산·연수 기한이 자동으로 모입니다.</span></div>
  <div class="calh"><button class="btn sm" data-act="calMove" data-d="-1" aria-label="이전 달">‹</button><b class="calt">${Y}년 ${M}월</b><button class="btn sm" data-act="calMove" data-d="1" aria-label="다음 달">›</button><button class="btn sm" data-act="calMove" data-d="0">오늘</button></div>
  <div class="calw">${DOW.map(d => `<span>${d}</span>`).join('')}</div><div class="cal">${cells}</div>
  <div class="tools"><label class="btn file">학사일정 파일 올리기<input type="file" id="schedUp" accept=".txt,.csv,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" hidden></label><button class="btn" data-act="schedPaste">학사일정 붙여넣기</button></div><p class="mu">학사일정(PDF·엑셀·텍스트, 또는 나이스·홈페이지에서 복사한 글)을 넣으면 날짜와 행사를 찾아 캘린더에 한꺼번에 넣어 드립니다. 「3/2 입학식」「7.21~8.20 여름방학」 같은 줄을 알아봅니다.</p>
  <h3 class="h3">${md(UI.day)} (${DOW[new Date(UI.day + 'T00:00:00').getDay()]})</h3>${list}
  ${typeof dayMemoBox === 'function' ? dayMemoBox(UI.day) : ''}
  <form class="inl" data-form="evt"><input name="title" placeholder="일정·할 일 추가" required aria-label="내용"><select name="cat" aria-label="종류"><option value="event">일정</option><option value="todo">할 일</option></select><button class="btn">추가</button></form>`;
}

/* ---------- 수업·평가·시간표 ---------- */
function classView() {
  let t = '<table class="tbl tt"><thead><tr><th></th>' + [1, 2, 3, 4, 5].map(d => `<th>${DOW[d]}</th>`).join('') + '</tr></thead><tbody>';
  for (let p = 1; p <= 7; p++) { t += `<tr><th>${p}</th>` + [1, 2, 3, 4, 5].map(d => `<td><input data-tt="${d}-${p}" value="${esc(tt(d, p))}" aria-label="${DOW[d]} ${p}교시"></td>`).join('') + '</tr>'; }
  t += '</tbody></table>';
  return `<div class="bh"><h2>수업·평가</h2><span class="mu">시간표 · 진도 · 수행평가를 한곳에서 고칩니다.</span></div>
  <h3 class="h3">시간표 · 일과표</h3><div class="tools"><button class="btn pri" data-act="comci">컴시간알리미에서 자동으로 가져오기</button><label class="btn file">시간표 파일 올리기<input type="file" id="ttUp" accept=".hwp,.hwpx,.docx,.xlsx,.xls,.csv,.txt,.pdf" hidden></label><button class="btn" data-act="ttPaste">시간표 붙여넣기</button><label class="btn file">일과표 파일 올리기<input type="file" id="bellUp" accept=".hwp,.hwpx,.docx,.xlsx,.xls,.csv,.txt,.pdf" hidden></label><button class="btn" data-act="bellPaste">일과표 붙여넣기</button></div><p class="mu">컴시간 연동은 설정한 내 이름(예: 김정*)으로 선생님 수업만 골라 자동으로 채웁니다. 한글·엑셀·PDF 파일을 올리거나 표를 복사해 붙여도 알아서 칸을 채웁니다. 고칠 때는 아래 칸에 직접 적으세요. 빈칸은 공강입니다.</p>${S.profile.bell && S.profile.bell.length ? `<p class="mu">적용된 일과표: ${S.profile.bell.map(x => `${x.p}교시 ${hm(x.s)}~${hm(x.e)}`).join(' · ')}</p>` : ''}${t}
  <h3 class="h3">수업 진도</h3>${S.lessons.map(l => `<div class="ls"><span class="lc">${esc(l.cls)}</span><span class="lu">${esc(l.unit)}</span>${bar(lessonPct(l))}<span class="num">${l.done}/${l.total}</span><button class="x" data-act="edit_lessons" data-id="${l.id}">수정</button>${xbtn('del_lessons', l.id)}</div>`).join('')}<button class="btn sm" data-act="add_lessons">+ 진도 추가</button><button class="btn sm" data-act="lessonAll">반 6개 한 번에 만들기</button>
  <h3 class="h3">수행평가</h3>${[...S.assess].map(a => `<div class="as"><div class="ah"><b>${esc(a.title)}</b> <span class="mu">${esc(a.grade || '')} ${a.due ? '· 입력기한 ' + md(a.due) : ''}</span> <button class="x" data-act="edit_assess" data-id="${a.id}">수정</button>${xbtn('del_assess', a.id)}</div><div class="steps">${ASSESS_STEPS.map((s, i) => `<button class="stp1 ${i === (a.step || 0) ? 'on' : ''} ${i < (a.step || 0) ? 'past' : ''}" data-act="assessStep" data-id="${a.id}" data-s="${i}">${s}</button>`).join('')}</div></div>`).join('')}<button class="btn sm" data-act="add_assess">+ 수행평가 추가</button>`;
}

/* ---------- 예산 장부 ---------- */
function budgetView() {
  const T = btot();
  const projs = S.budget.map(p => {
    const pa = projAlloc(p), ps = projSpent(p), bl = pa - ps, pr = pa ? Math.round(ps / pa * 1000) / 10 : 0;
    let run = 0;
    const rows = [...(p.spends || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(s => { run += +s.amt || 0; return `<tr><td>${md(s.date)}</td><td>${esc(s.desc)}</td><td class="r">${won(s.amt)}</td><td class="r">${won(run)}</td><td class="r ${pa - run < 0 ? 'hot' : ''}">${won(pa - run)}</td><td class="act"><button class="x" data-act="pspendDel" data-p="${p.id}" data-id="${s.id}">삭제</button></td></tr>`; }).join('');
    const lines = p.lines.length ? `<table class="tbl bt"><thead><tr><th>목·항목</th><th class="r">배정</th><th class="r">집행</th><th class="r">잔액</th><th class="r">집행률</th><th>기한</th><th></th></tr></thead><tbody>
    ${p.lines.map(l => { const sp = spentOf(l), b2 = l.alloc - sp, late = l.deadline && b2 > 0 && dd(l.deadline) < 0; return `<tr><td>${esc(l.item)}</td><td class="r">${won(l.alloc)}</td><td class="r">${won(sp)}</td><td class="r ${b2 < 0 ? 'hot' : ''}">${won(b2)}</td><td class="r">${l.alloc ? Math.round(sp / l.alloc * 100) : 0}%</td><td class="${late ? 'hot' : ''}">${l.deadline ? md(l.deadline) + ' ' + ddText(dd(l.deadline)) : ''}</td><td class="act"><button class="x" data-act="spendAdd" data-p="${p.id}" data-id="${l.id}">지출</button><button class="x" data-act="lineEdit" data-p="${p.id}" data-id="${l.id}">수정</button><button class="x" data-act="lineDel" data-p="${p.id}" data-id="${l.id}">삭제</button></td></tr>${(l.spends || []).map(s => `<tr class="sp"><td colspan="2">└ ${md(s.date)} ${esc(s.desc)}</td><td class="r">${won(s.amt)}</td><td colspan="3"></td><td class="act"><button class="x" data-act="spendDel" data-p="${p.id}" data-l="${l.id}" data-id="${s.id}">삭제</button></td></tr>`).join('')}`; }).join('')}</tbody></table>` : '';
    return `<section class="bk"><div class="bkh"><h3 class="h3">${esc(p.name)}</h3><button class="x" data-act="projRename" data-id="${p.id}">이름</button>${xbtn('projDel', p.id)}</div>
    <div class="sum"><label class="tot1"><span>총액(원)</span><input type="number" min="0" inputmode="numeric" data-ptotal="${p.id}" value="${p.total || (p.lines.length ? pa : '')}" placeholder="총액 입력" aria-label="총액"></label><div><span>집행 합계</span><b class="num">${won(ps)}</b></div><div><span>잔액</span><b class="num ${bl < 0 ? 'hot' : 'hot2'}">${won(bl)}</b></div><div><span>집행률</span><b class="num">${pr}%</b></div></div>${bar(pr, pr > 100)}
    <form class="inl" data-form="pspend" data-p="${p.id}"><input type="date" name="date" value="${today()}" aria-label="날짜"><input name="desc" placeholder="사용 내용 (선택)" aria-label="사용 내용"><input name="amt" type="number" min="0" inputmode="numeric" placeholder="사용 금액(원)" required aria-label="사용 금액"><button class="btn pri">사용 금액 넣기</button></form>
    ${rows ? `<table class="tbl"><thead><tr><th>날짜</th><th>내용</th><th class="r">사용액</th><th class="r">누적 집행</th><th class="r">잔액</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="mu">사용한 금액을 하나씩 넣으면 집행률과 잔액이 바로 계산됩니다.</p>'}
    <details class="doc"><summary>목·항목별로 나누어 관리하기 (선택) ${p.lines.length ? '· ' + p.lines.length + '개' : ''}</summary>${lines}<button class="btn sm" data-act="lineAdd" data-p="${p.id}">+ 목·항목</button><p class="mu">목별 배정액을 넣으면 위 총액 대신 목별 배정의 합이 총액이 됩니다(총액 칸이 비어 있을 때).</p></details></section>`;
  }).join('');
  return `<div class="bh"><h2>예산 장부</h2><span class="mu">총액을 넣고 쓴 돈을 하나씩 넣으면 집행률·잔액이 저절로 나옵니다.</span></div>
  <div class="sum"><div><span>전체 총액</span><b class="num">${won(T.a)}</b></div><div><span>전체 집행</span><b class="num">${won(T.s)}</b></div><div><span>전체 잔액</span><b class="num hot2">${won(T.b)}</b></div><div><span>집행률</span><b class="num">${T.a ? Math.round(T.s / T.a * 1000) / 10 : 0}%</b></div></div>
  <div class="tools"><button class="btn" data-act="projAdd">+ 사업(부서) 만들기</button><label class="btn file">계획서 올려 예산 뽑기<input type="file" id="planUp" accept=".txt,.csv,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" hidden></label><button class="btn" data-act="budgetCsv">엑셀(CSV)로 내보내기</button></div>
  <p class="mu">계획서(PDF·엑셀·텍스트)를 올리면 항목·금액·기한 후보를 찾아 보여 드립니다. 확인하고 체크한 것만 장부에 들어갑니다. 한글(hwp) 파일은 PDF로 저장해서 올려 주세요.</p>${projs || '<p class="mu">아직 사업이 없습니다. “사업 만들기”를 눌러 시작하세요.</p>'}`;
}

/* ---------- 기록(노트 + 태블릿 필기) ---------- */
function notesView(id) {
  const N = [...S.notes].sort((a, b) => b.date.localeCompare(a.date)), n = S.notes.find(x => x.id === id);
  const list = `<aside class="nlist"><button class="btn" data-act="noteNew">+ 새 노트</button>${N.map(x => `<a href="#/note/${x.id}" class="${x.id === id ? 'on' : ''}"><b>${esc(x.title || '제목 없음')}</b><span class="mu">${md(x.date)} · ${esc(x.kind)}${x.lock ? ' · 잠금' : ''}</span></a>`).join('') || '<p class="mu">노트가 없습니다.</p>'}</aside>`;
  if (!n) return `<div class="bh"><h2>기록</h2><span class="mu">회의·연수 내용을 적고, 결정과 할 일을 뽑아 둡니다. 태블릿은 펜으로 필기하세요.</span></div><div class="nwrap">${list}<div class="ned"><p class="mu">왼쪽에서 노트를 고르거나 새로 만드세요.</p></div></div>`;
  return `<div class="bh"><h2>기록</h2><span class="mu">입력하면 자동 저장됩니다.</span></div><div class="nwrap">${list}
  <div class="ned"><div class="nh"><input data-note="title" value="${esc(n.title)}" placeholder="제목 (예: 11월 교직원회의)" aria-label="제목"><input data-note="date" type="date" value="${n.date}" aria-label="날짜"><select data-note="kind" aria-label="종류">${['회의', '연수', '수업협의', '기타'].map(k => `<option ${k === n.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
  <div class="tabs"><button class="tab on" data-act="tab" data-t="type">글쓰기</button><button class="tab" data-act="tab" data-t="ink">손글씨(태블릿)</button></div>
  <textarea data-note="body" id="nbody" rows="14" placeholder="회의·연수 내용을 적으세요. 줄바꿈으로 단락을 나눕니다." aria-label="본문">${esc(n.body)}</textarea>
  <div id="inkbox" hidden><div class="inkbar"><button class="btn sm" data-ink="pen">펜</button><button class="btn sm" data-ink="red">붉은 펜</button><button class="btn sm" data-ink="erase">지우개</button><button class="btn sm" data-ink="thin">가늘게</button><button class="btn sm" data-ink="thick">굵게</button><button class="btn sm" data-ink="undo">되돌리기</button><button class="btn sm" data-ink="clear">모두 지우기</button><button class="btn sm" data-ink="png">그림 저장</button></div><canvas id="ink" aria-label="필기 영역"></canvas><p class="mu">펜을 쓰면 손바닥 터치는 무시합니다. 손글씨 그림은 이 기기에만 저장됩니다.</p></div></div>
  <aside class="npan"><h3 class="h3">정리</h3><label>결정한 일<textarea data-note="decisions" rows="5" placeholder="한 줄에 하나씩">${esc(n.decisions)}</textarea></label><label>후속 조치(내가 할 일)<textarea data-note="followups" rows="5" placeholder="한 줄에 하나씩">${esc(n.followups)}</textarea></label>
  <form class="inl" data-form="toTodo" data-id="${n.id}"><input type="date" name="date" value="${today()}" aria-label="기한"><button class="btn pri">후속 조치를 할 일로 보내기</button></form>
  ${linksHtml('note', n)}<label class="chk"><input type="checkbox" data-note="lock" ${n.lock ? 'checked' : ''}> 이 기기에만 보관 (클라우드 동기화·챗봇 AI 전송 제외, 학생 이름이 있을 때)</label>
  <button class="btn" data-act="noteExport" data-id="${n.id}">내보내기(워드)</button><button class="x" data-act="noteDel" data-id="${n.id}">노트 삭제</button></aside></div>`;
}

/* ---------- 자료·업무분장·연락망 ---------- */
function libView() {
  const q = norm(UI.q);
  const C = S.contacts.filter(c => !q || norm(c.dept + c.name + c.ext + c.phone).includes(q));
  return `<div class="bh"><h2>자료·연락</h2><span class="mu">여기에 올린 모든 내용은 꿈송이가 찾아 줍니다.</span></div>
  ${typeof mineBody === 'function' ? '<h3 class="h3">내 업무</h3>' + mineBody() : ''}<h3 class="h3">업무 분장표</h3><table class="tbl"><thead><tr><th>부서</th><th>업무</th><th>담당</th><th></th></tr></thead><tbody>${S.duties.map(d => `<tr class="${d.mine ? 'mine' : ''}"><td>${esc(d.dept)}</td><td>${esc(d.work)}</td><td>${esc(d.who)}${d.mine ? ' <b class="hot">나</b>' : ''}</td><td class="act"><button class="x" data-act="edit_duties" data-id="${d.id}">수정</button>${xbtn('del_duties', d.id)}</td></tr>`).join('')}</tbody></table>
  <div class="tools"><button class="btn sm" data-act="add_duties">+ 한 줄 추가</button><label class="btn sm file">표 파일로 한 번에 넣기<input type="file" data-import="duties" accept=".csv,.xlsx,.xls,.txt,.hwp,.hwpx,.docx" hidden></label></div><p class="mu">표 파일은 열 순서가 부서 · 업무 · 담당자입니다. 첫 줄 제목은 알아서 건너뜁니다.</p>
  <h3 class="h3">교내 연락망</h3><input class="srch" id="cq" placeholder="이름·부서·내선 검색" value="${esc(UI.q)}" aria-label="연락망 검색"><table class="tbl"><thead><tr><th>부서</th><th>이름</th><th>내선</th><th>전화</th><th></th></tr></thead><tbody>${C.map(c => `<tr><td>${esc(c.dept)}</td><td>${esc(c.name)}</td><td>${esc(c.ext)}</td><td>${esc(c.phone)}</td><td class="act"><button class="x" data-act="edit_contacts" data-id="${c.id}">수정</button>${xbtn('del_contacts', c.id)}</td></tr>`).join('')}</tbody></table>
  <div class="tools"><button class="btn sm" data-act="add_contacts">+ 한 줄 추가</button><label class="btn sm file">표 파일로 한 번에 넣기<input type="file" data-import="contacts" accept=".csv,.xlsx,.xls,.txt,.hwp,.hwpx,.docx" hidden></label></div><p class="mu">열 순서: 부서 · 이름 · 내선 · 전화. 개인 전화번호는 이 기기·내 계정에만 저장됩니다.</p>
  <h3 class="h3">자료실 (계획서·회의록·규정·교육과정)</h3><div class="tools"><select id="upk" aria-label="자료 종류"><option>계획서</option><option>회의록</option><option>규정</option><option>교육과정</option><option>기타</option></select><label class="btn file">파일 올리기<input type="file" id="docUp" accept=".txt,.csv,.md,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" multiple hidden></label></div><p class="mu">한글(hwp·hwpx)·워드·PDF·엑셀·텍스트를 읽어 글자를 뽑아 저장합니다(원본 파일은 저장하지 않음). 아래 목록에서 펼치면 제목·표·목록이 보기 편하게 정리되어 나옵니다.</p>
  ${LIB.map(d => `<details class="doc"><summary><b>${esc(d.name)}</b> <span class="mu">${esc(d.kind)} · ${d.text.length.toLocaleString()}자 · ${d.added}</span></summary><div class="rd">${readable(d.text.slice(0, 60000))}</div><button class="btn sm" data-act="docBudget" data-id="${d.id}">예산 후보 뽑기</button><button class="x" data-act="docDel" data-id="${d.id}">삭제</button></details>`).join('') || '<p class="mu">아직 올린 자료가 없습니다.</p>'}`;
}

/* ---------- 설정 ---------- */
function archView(id) {
  const a = ARCH.find(x => x.id === id);
  if (!a) return `<div class="bh"><h2>지난 학년도</h2></div><p class="mu">보관함이 비어 있습니다. 설정에서 지난 학년도 백업 파일을 넣어 주세요.</p>`;
  const g = archGroups(a), keys = Object.keys(g);
  return `<div class="bh"><h2>${esc(a.label)} <span class="mu">(읽기 전용)</span></h2></div><p class="mu">지금 데이터와 섞이지 않는 보관본입니다. 꿈송이에게 "${esc(a.label)} 예산 뭐였지"처럼 물어도 찾아 줍니다.</p>` + (keys.length ? keys.map(k => `<details class="tg"><summary>${esc(k)} <span class="mu">${g[k].length}건</span></summary><div class="tgb">${g[k].map(t => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('')}</div></details>`).join('') : '<p class="mu">내용이 없습니다.</p>');
}
function setView() {
  const p = S.profile, sy = TF.sync.info, rowsT = [['r1', '일과'], ['r2', '할 일'], ['r3', '공문'], ['r4', '수업 진도'], ['r5', '수행평가'], ['r6', '예산'], ['r7', '연수'], ['r8', '기록'], ['r9', '업무 분장표'], ['r10', '교내 연락망'], ['r11', '내 업무'], ['r12', '급식'], ['sb', '학교 배너']];
  return `<div class="bh"><h2>설정</h2></div>
  <form data-form="profile" class="fm"><h3 class="h3">내 정보</h3><label>이름<input name="name" value="${esc(p.name)}"></label><label>학교<input name="school" value="${esc(p.school)}"></label><label>교과<input name="subject" value="${esc(p.subject)}"></label><label>담당 반 (쉼표로)<input name="classes" value="${esc(p.classes.join(', '))}"></label><label>1교시 시작<input name="start" type="time" value="${p.start}"></label><label>수업 시간(분)<input name="classMin" type="number" value="${p.classMin}"></label><label>쉬는 시간(분)<input name="breakMin" type="number" value="${p.breakMin}"></label><label>개발 연수 목표(시간)<input name="devTarget" type="number" value="${p.devTarget}"></label><button class="btn pri">저장</button></form>
  <h3 class="h3">오늘 게시판에 보일 줄</h3><div class="hides">${rowsT.map(([k, v]) => `<label class="chk"><input type="checkbox" data-hide="${k}" ${S.hide[k] ? '' : 'checked'}> ${v}</label>`).join('')}</div>
  <h3 class="h3">꿈송이</h3><div class="tools"><div class="mas"><img src="${mas()}" alt="꿈송이"></div><label class="btn file">챗봇 꿈송이 그림 바꾸기<input type="file" id="masUp" accept="image/*" hidden></label>${MASCOT ? '<button class="btn" data-act="masDel">기본 꿈송이로</button>' : ''}</div>
  <form data-form="claude" class="fm"><label>Claude 열쇠(선택) — 넣으면 꿈송이가 찾은 자료를 문장으로 다듬어 답합니다<input name="key" type="password" value="${esc(localStorage.getItem('tf.claudeKey') || '')}" placeholder="sk-ant-…" autocomplete="off"></label><p class="mu">열쇠는 이 기기에만 저장됩니다. 켜면 "질문 + 찾은 자료 조각"이 Anthropic 서버로 전송됩니다(잠금 노트는 제외). 학생 이름이 든 자료는 올리지 마세요.</p><button class="btn">저장</button></form>
  <h3 class="h3">여러 기기 동기화</h3><p>${esc(sy.msg)}</p>${sy.on ? (sy.user ? '<button class="btn" data-act="logout">로그아웃</button>' : '<button class="btn pri" data-act="login">구글로 로그인</button>') : '<p class="mu">설정 방법은 안내 문서(STRUCTURE.md)의 “동기화 켜기”를 보세요.</p>'}
  <h3 class="h3">백업</h3><div class="tools"><button class="btn" data-act="backup">백업 파일 받기</button><label class="btn file">백업 파일 불러오기<input type="file" id="restore" accept=".json" hidden></label><button class="btn" data-act="sample">예시 데이터 채우기</button><button class="btn" data-act="reset">모두 지우고 처음부터</button></div><h3 class="h3">기기 연동 (컴 · 폰 · 태블릿)</h3><p class="mu">연동 암호를 정하고 모든 기기에 똑같이 넣으면, 한 곳에서 고친 내용이 다른 기기에도 나타납니다. 내용은 암호로 잠겨서 올라가므로 서버에서는 읽을 수 없습니다. 암호를 잊으면 복구할 수 없으니 꼭 적어 두세요.</p><p><b id="cloudst">${esc(CLOUD.info.msg)}</b></p><div class="tools">${CLOUD.pass ? '<button class="btn pri" data-act="cloudNow">지금 맞추기</button><button class="btn" data-act="cloudOff">이 기기 연동 끄기</button>' : '<button class="btn pri" data-act="cloudOn">기기 연동 켜기</button>'}</div><h3 class="h3">글씨체 고르기 (50가지 · 모두 무료 글꼴)</h3>${[['bfont', '본문 글씨체', S.profile.bfont], ['hfont', '제목 글씨체', S.profile.hfont]].map(([k, t, cur]) => `<details class="fnt" data-fonts="1"><summary>${t} <span class="mu">현재: ${esc(cur || '기본')}</span></summary><div class="fgrid"><button class="fb ${cur ? '' : 'on'}" data-act="${k}" data-n="">기본(디자인 따라감)</button>${FONTS50.map(f => `<button class="fb ${cur === f[0] ? 'on' : ''}" data-act="${k}" data-n="${esc(f[0])}" style="font-family:${fontCss(f)}">${esc(f[0])}<small>가나다 ABC 123</small></button>`).join('')}</div></details>`).join('')}<h3 class="h3">디자인 틀 고르기 (50가지 · 메뉴 위치·종이·줄 모양이 바뀝니다)</h3><div class="thm frm">${FRAMES.map(f => `<button class="th" data-act="frame" data-id="${f[0]}" aria-pressed="${frameOf()[0] === f[0]}">${frameThumb(f[2])}<b>${f[0]}. ${f[1]}</b></button>`).join('')}</div><h3 class="h3">색 고르기 (30가지)</h3><div class="thm">${THEMES.map(t => `<button class="th" data-act="theme" data-id="${t[0]}" aria-pressed="${(S.profile.theme || 'classic') === t[0]}"><span class="sw"><i style="background:${t[3]}"></i><i style="background:${t[5]}"></i><i style="background:${t[7]}"></i><i style="background:${t[6]}"></i></span><b>${t[1]}</b><small>${t[2]}</small></button>`).join('')}</div><h3 class="h3">제목 · 도디쌤 이미지 · 워터마크</h3><div class="tools"><img class="logo" src="${LOGO || DEFLOGO}" alt="도디쌤 이미지"><label class="btn file">도디쌤 이미지 올리기<input type="file" id="logoUp" accept="image/*" hidden></label>${LOGO ? '<button class="btn" data-act="logoDel">기본 그림으로</button>' : ''}<button class="btn" data-act="editTitle">제목 고치기</button><button class="btn" data-act="wmToggle">워터마크 ${S.profile.wm === false ? '켜기' : '끄기'}</button><button class="btn" data-act="wmEdit">워터마크 글자</button></div><h3 class="h3">지난 학년도 보관함</h3><p class="mu">지난해 백업 파일을 넣어 두면 지금 데이터를 건드리지 않고 읽기만 할 수 있고, 꿈송이도 함께 찾아 줍니다.</p><div class="tools"><label class="btn file">지난 학년도 백업 넣기<input type="file" id="archUp" accept=".json" hidden></label>${ARCH.map(a => `<a class="btn" href="#/arch/${a.id}">${esc(a.label)} 보기</a><button class="btn" data-act="archDel" data-id="${a.id}">삭제</button>`).join('')}</div><h3 class="h3">새 학년도</h3><p class="mu">학년도가 바뀌면 이 버튼을 누르세요. 자동으로 백업 파일을 받은 뒤, 시간표·일정·진도·평가·예산·연수·공문·업무분장·연락망을 비웁니다. 내 정보, 메모, 내 페이지, 서랍, 자료실은 그대로 남습니다.</p><div class="tools"><button class="btn pri" data-act="newYear">새 학년도 시작하기</button></div><p class="mu">브라우저 기록을 지우면 이 기기의 데이터가 사라질 수 있으니 가끔 백업 파일을 받아 두세요.</p>`;
}
function welcome() {
  return `<div class="wel"><h1>업무파탈</h1><div class="fr">Travail Fatal</div><p>나만의 디지털 교무수첩입니다. 몇 가지만 적으면 바로 시작합니다. 모든 내용은 나중에 설정에서 고칠 수 있습니다.</p>
  <form data-form="welcome" class="fm"><label>이름<input name="name" required></label><label>학교<input name="school"></label><label>교과<input name="subject"></label><label>담당 반 (쉼표로 구분)<input name="classes" value="1-1, 1-2, 1-3, 2-1, 2-2, 2-3"></label><button class="btn pri">빈 수첩으로 시작</button></form>
  <button class="btn" data-act="sample">예시 데이터로 먼저 둘러보기</button><footer class="cp">© 김정환 · M.A.D.T (Moral And Digital Teacher)</footer></div>`;
}

/* ---------- 화면 그리기 ---------- */
function render() {
  const app = $('#app'), y = window.scrollY;
  if (!S.setup) { app.innerHTML = welcome(); $('#chatbox').hidden = true; return; }
  $('#chatbox').hidden = false;
  const [, page = 'today', arg] = (location.hash || '#/today').split('/');
  const body = { today: todayView, cal: calView, class: classView, budget: budgetView, notes: () => notesView(), note: () => notesView(arg), pages: () => pagesView(), page: () => pagesView(arg), lib: libView, set: setView, arch: () => archView(arg) }[page] || todayView;
  app.innerHTML = masthead() + nav(page) + `<main>${body()}${typeof pageMemo === 'function' ? pageMemo(page) : ''}</main>` + footer();
  if (page === 'note') mountNote(arg);
  if (page === 'page') mountPage();
  window.scrollTo(0, y);
  renderChatFab(); applyBrand();
}
TF.render = render;
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });

/* ---------- 손글씨 ---------- */
function mountNote(id) {
  const n = S.notes.find(x => x.id === id); if (!n) return;
  const cv = $('#ink'); if (!cv) return;
  cv.width = 1400; cv.height = 900; const ctx = cv.getContext('2d'); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  idb.get('ink:' + id).then(u => { if (u) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0); im.src = u; } });
  const T = { color: '#1B1613', w: 3, erase: false }, hist = []; let drawing = false, last = null, sawPen = false, t;
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
  const persist = () => { clearTimeout(t); t = setTimeout(() => idb.set('ink:' + id, cv.toDataURL('image/png')), 500); };
  cv.addEventListener('pointerdown', e => { if (e.pointerType === 'pen') sawPen = true; if (sawPen && e.pointerType === 'touch') return; e.preventDefault(); cv.setPointerCapture(e.pointerId); hist.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (hist.length > 8) hist.shift(); drawing = true; last = pt(e); });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); ctx.globalCompositeOperation = T.erase ? 'destination-out' : 'source-over'; ctx.strokeStyle = T.color; ctx.lineWidth = T.erase ? 22 : T.w * (e.pointerType === 'pen' && e.pressure ? .5 + e.pressure : 1); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
  const end = () => { if (drawing) { drawing = false; persist(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  $('#inkbox').addEventListener('click', e => {
    const b = e.target.closest('[data-ink]'); if (!b) return; const k = b.dataset.ink;
    if (k === 'pen') { T.color = '#1B1613'; T.erase = false; } else if (k === 'red') { T.color = '#6E1423'; T.erase = false; } else if (k === 'erase') T.erase = true; else if (k === 'thin') T.w = 2; else if (k === 'thick') T.w = 6;
    else if (k === 'undo') { const h = hist.pop(); if (h) { ctx.globalCompositeOperation = 'source-over'; ctx.putImageData(h, 0, 0); persist(); } }
    else if (k === 'clear') sure('필기를 모두 지울까요?', () => { hist.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.clearRect(0, 0, cv.width, cv.height); persist(); });
    else if (k === 'png') { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = (n.title || '필기') + '.png'; a.click(); }
  });
}

/* ---------- 동작(A) : 버튼의 data-act 이름과 같은 함수 ---------- */
const find = (list, id) => S[list].find(x => x.id === id);
const A = {
  tog(el) { const i = find('items', el.dataset.id); if (i) { i.done = !i.done; commit(); } },
  delItem(el) { S.items = S.items.filter(x => x.id !== el.dataset.id); commit(); },
  docs(el) { const d = S.docs[today()] = S.docs[today()] || { recv: 0, done: 0 }; d[el.dataset.k] = Math.max(0, d[el.dataset.k] + +el.dataset.d); commit(); },
  lessonStep(el) { const l = find('lessons', el.dataset.id); if (l) { l.done = Math.max(0, Math.min(+l.total, +l.done + +el.dataset.d)); commit(); } },
  lessonAll() { S.profile.classes.forEach(c => { if (!S.lessons.some(l => l.cls === c)) S.lessons.push({ id: uid(), cls: c, unit: '1단원', done: 0, total: 10 }); }); commit(); },
  assessStep(el) { const a = find('assess', el.dataset.id); if (a) { a.step = +el.dataset.s; commit(); } },
  trToggle(el) { const x = find('training', el.dataset.id); if (x) { x.done = !x.done; x.doneDate = x.done ? today() : ''; commit(); if (x.done) toast('이수 처리했습니다. 이수번호를 입력해 주세요.'); } },
  calDay(el) { UI.day = el.dataset.d; render(); },
  calMove(el) { const d = +el.dataset.d; if (!d) { UI.cal = today().slice(0, 7); UI.day = today(); } else { const [Y, M] = UI.cal.split('-').map(Number), n = new Date(Y, M - 1 + d, 1); UI.cal = `${n.getFullYear()}-${pad(n.getMonth() + 1)}`; } render(); },
  /* 예산 */
  projAdd() { ask('사업(부서) 만들기', [{ k: 'name', label: '이름 (예: 학생인권부 사업)', req: 1 }, { k: 'total', label: '총액(원) — 나중에 넣어도 됩니다', type: 'number' }], o => { S.budget.push({ id: uid(), name: o.name, total: +o.total || 0, lines: [], spends: [] }); commit(); }); },
  pspendDel(el) { const p = find('budget', el.dataset.p); p.spends = p.spends.filter(s => s.id !== el.dataset.id); commit(); },
  projRename(el) { const p = find('budget', el.dataset.id); ask('이름 바꾸기', [{ k: 'name', label: '이름', val: p.name, req: 1 }], o => { p.name = o.name; commit(); }); },
  projDel(el) { sure('이 사업과 안의 항목을 모두 지울까요?', () => { S.budget = S.budget.filter(p => p.id !== el.dataset.id); commit(); }); },
  lineAdd(el) { const p = find('budget', el.dataset.p); ask('목·항목 추가', [{ k: 'item', label: '목·항목 (예: 일반수용비)', req: 1 }, { k: 'alloc', label: '배정액(원)', type: 'number', val: 0 }, { k: 'deadline', label: '집행 기한(선택)', type: 'date' }], o => { p.lines.push({ id: uid(), item: o.item, alloc: +o.alloc || 0, deadline: o.deadline, spends: [] }); commit(); }); },
  lineEdit(el) { const p = find('budget', el.dataset.p), l = p.lines.find(x => x.id === el.dataset.id); ask('항목 수정', [{ k: 'item', label: '목·항목', val: l.item, req: 1 }, { k: 'alloc', label: '배정액(원)', type: 'number', val: l.alloc }, { k: 'deadline', label: '집행 기한', type: 'date', val: l.deadline }], o => { Object.assign(l, { item: o.item, alloc: +o.alloc || 0, deadline: o.deadline }); commit(); }); },
  lineDel(el) { const p = find('budget', el.dataset.p); sure('이 항목을 지울까요?', () => { p.lines = p.lines.filter(x => x.id !== el.dataset.id); commit(); }); },
  spendAdd(el) { const p = find('budget', el.dataset.p), l = p.lines.find(x => x.id === el.dataset.id); ask('지출 기록', [{ k: 'date', label: '날짜', type: 'date', val: today() }, { k: 'desc', label: '내용', req: 1 }, { k: 'amt', label: '금액(원)', type: 'number', req: 1 }], o => { l.spends = l.spends || []; l.spends.push({ id: uid(), date: o.date, desc: o.desc, amt: +o.amt || 0 }); commit(); }); },
  spendDel(el) { const l = find('budget', el.dataset.p).lines.find(x => x.id === el.dataset.l); l.spends = l.spends.filter(s => s.id !== el.dataset.id); commit(); },
  budgetCsv() { const r = [['사업', '목·항목', '배정', '집행', '잔액', '집행기한']]; S.budget.forEach(p => { r.push([p.name, '(총액·사용내역)', projAlloc(p), projSpent(p), projAlloc(p) - projSpent(p), '']); (p.spends || []).forEach(x => r.push(['', x.date + ' ' + x.desc, '', x.amt, '', ''])); p.lines.forEach(l => r.push([p.name, l.item, l.alloc, spentOf(l), l.alloc - spentOf(l), l.deadline || ''])); }); download('예산장부.csv', '﻿' + r.map(x => x.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n'), 'text/csv;charset=utf-8'); },
  docBudget(el) { const d = LIB.find(x => x.id === el.dataset.id); if (d) budgetDialog(d.text); },
  /* 기록 */
  noteNew() { const n = { id: uid(), title: '', date: today(), kind: '회의', body: '', decisions: '', followups: '', lock: false }; S.notes.push(n); save(); location.hash = '#/note/' + n.id; },
  noteDel(el) { sure('이 노트를 지울까요?', () => { S.notes = S.notes.filter(n => n.id !== el.dataset.id); idb.del('ink:' + el.dataset.id); save(); location.hash = '#/notes'; }); },
  noteExport(el) { const n = find('notes', el.dataset.id); download((n.title || '노트') + '.doc', `<html><meta charset="utf-8"><body><h2>${esc(n.title)}</h2><p>${n.date} · ${esc(n.kind)}</p><pre style="font-family:inherit;white-space:pre-wrap">${esc(n.body)}</pre><h3>결정</h3><pre>${esc(n.decisions)}</pre><h3>후속 조치</h3><pre>${esc(n.followups)}</pre></body></html>`, 'application/msword'); },
  tab(el) { $$('.tab').forEach(b => b.classList.toggle('on', b === el)); const ink = el.dataset.t === 'ink'; $('#nbody').hidden = ink; $('#inkbox').hidden = !ink; },
  /* 자료 */
  docDel(el) { sure('이 자료를 지울까요?', () => { LIB = LIB.filter(d => d.id !== el.dataset.id); saveLib(); render(); }); },
  manageLinks() { ask('뺄 사이트', [{ k: 'id', label: '고르세요', type: 'select', opts: S.links.map(l => l.name) }], o => { S.links = S.links.filter(l => l.name !== o.id); commit(); }, '빼기'); },
  /* 설정 */
  schedPaste() { ask('학사일정 붙여넣기', [{ k: 'text', label: '학사일정 글 (한 줄에 날짜와 행사)', type: 'textarea', rows: 10, req: 1 }], o => scheduleDialog(o.text), '일정 찾기'); },
  masDel() { MASCOT = ''; idb.del('mascot'); render(); },
  login() { TF.sync.login(); }, logout() { TF.sync.logout(); },
  archDel(el) { sure('이 보관본을 지울까요?', async () => { ARCH = ARCH.filter(x => x.id !== el.dataset.id); await saveArch(); render(); toast('지웠습니다.'); }); },
  editTitle() { ask('제목 고치기', [{ k: 'title', label: '제목', val: titleOf() }, { k: 'sub', label: '작은 글씨(부제)', val: S.profile.sub || 'Travail Fatal' }], o => { S.profile.title = (o.title || '').trim() || '업무파탈'; S.profile.sub = (o.sub || '').trim(); commit(); toast('제목을 바꿨습니다.'); }, '저장'); },
  bfont(el) { S.profile.bfont = el.dataset.n || ''; commit(); },
  hfont(el) { S.profile.hfont = el.dataset.n || ''; commit(); },
  frame(el) { S.profile.frame = el.dataset.id; commit(); },
  theme(el) { S.profile.theme = el.dataset.id; commit(); },
  wmToggle() { S.profile.wm = S.profile.wm === false; commit(); },
  wmEdit() { ask('워터마크 글자', [{ k: 't', label: '비우면 "제목 · 이름"이 자동으로 들어갑니다', val: S.profile.wmText || '' }], o => { S.profile.wmText = (o.t || '').trim(); commit(); }, '저장'); },
  logoDel() { LOGO = ''; idb.set('logo', ''); render(); },
  newYear() { sure('새 학년도를 시작할까요? 먼저 백업 파일을 받고, 시간표·일정·진도·평가·예산·연수·공문·업무분장·연락망을 비웁니다. 메모·페이지·서랍·자료실은 남습니다.', () => { A.backup(); ['timetable'].forEach(k => S[k] = {}); ['items', 'lessons', 'assess', 'budget', 'training', 'duties', 'mine', 'contacts', 'docLog'].forEach(k => S[k] = []); S.docs = {}; commit(); toast('새 학년도로 비웠습니다. 학교·교과를 확인하고 학사일정을 올려 주세요.'); }); },
  backup() { download('업무파탈_백업_' + today() + '.json', JSON.stringify({ S, LIB }), 'application/json'); },
  sample() { sampleData(); },
  reset() { sure('이 기기의 모든 데이터를 지우고 처음부터 시작할까요? (되돌릴 수 없습니다)', async () => { localStorage.removeItem(KEY); await idb.del('lib'); await idb.del('mascot'); location.hash = ''; location.reload(); }); }
};
/* 목록 추가·수정·삭제를 한 번에 처리: add_duties, edit_duties, del_duties … */
Object.keys(CFG).forEach(k => {
  A['add_' + k] = () => ask(CFG[k].t + ' 추가', CFG[k].f({}), o => { S[k].push({ id: uid(), ...CFG[k].from(o) }); commit(); });
  A['edit_' + k] = el => { const i = find(k, el.dataset.id); ask(CFG[k].t + ' 수정', CFG[k].f(i), o => { Object.assign(i, CFG[k].from(o)); commit(); }); };
  A['del_' + k] = el => sure('지울까요?', () => { S[k] = S[k].filter(x => x.id !== el.dataset.id); commit(); });
});
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && A[el.dataset.act]) { e.preventDefault(); A[el.dataset.act](el, e); } });

/* ---------- 폼(FM) ---------- */
const FM = {
  todo(f) { const o = Object.fromEntries(new FormData(f)); S.items.push({ id: uid(), title: o.title, date: o.date || today(), cat: 'todo', done: false }); commit(); },
  pspend(f) { const o = Object.fromEntries(new FormData(f)), p = find('budget', f.dataset.p); const amt = +o.amt; if (!(amt > 0)) return toast('사용 금액을 입력해 주세요.'); (p.spends = p.spends || []).push({ id: uid(), date: o.date || today(), desc: o.desc || '사용', amt }); commit(); },
  evt(f) { const o = Object.fromEntries(new FormData(f)); S.items.push({ id: uid(), title: o.title, date: UI.day, cat: o.cat, done: false }); commit(); },
  toTodo(f) {
    const n = find('notes', f.dataset.id), d = new FormData(f).get('date') || today(); const lines = String(n.followups || '').split('\n').map(s => s.replace(/^[-•·*\d.)\s]+/, '').trim()).filter(Boolean);
    if (!lines.length) return toast('후속 조치를 한 줄에 하나씩 적어 주세요.');
    lines.forEach(t => { if (!S.items.some(i => i.title === t && i.date === d)) S.items.push({ id: uid(), title: t, date: d, cat: 'todo', done: false }); });
    commit(); toast(`할 일 ${lines.length}건을 보냈습니다.`);
  },
  profile(f) { const o = Object.fromEntries(new FormData(f)); Object.assign(S.profile, { name: o.name, school: o.school, subject: o.subject, classes: o.classes.split(',').map(s => s.trim()).filter(Boolean), start: o.start || '09:00', classMin: +o.classMin || 45, breakMin: +o.breakMin || 10, devTarget: +o.devTarget || 30 }); commit(); toast('저장했습니다.'); },
  claude(f) { const k = new FormData(f).get('key').trim(); k ? localStorage.setItem('tf.claudeKey', k) : localStorage.removeItem('tf.claudeKey'); toast(k ? 'Claude 열쇠를 저장했습니다.' : '열쇠를 지웠습니다.'); },
  welcome(f) { const o = Object.fromEntries(new FormData(f)); Object.assign(S.profile, { name: o.name, school: o.school, subject: o.subject, classes: o.classes.split(',').map(s => s.trim()).filter(Boolean) }); S.setup = true; location.hash = '#/today'; commit(); }
};
document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (f && FM[f.dataset.form]) { e.preventDefault(); FM[f.dataset.form](f); } });

/* 직접 입력칸(시간표·노트·보이기 설정)은 저장만 하고 화면은 다시 그리지 않음 */
let nt; document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.tt) { S.timetable[t.dataset.tt] = t.value.trim(); save(true); clearTimeout(nt); nt = setTimeout(() => save(), 800); }
  else if (t.dataset.note) { const id = location.hash.split('/')[2], n = find('notes', id); if (n) { n[t.dataset.note] = t.type === 'checkbox' ? t.checked : t.value; save(true); clearTimeout(nt); nt = setTimeout(() => { save(); if (t.dataset.note === 'title') { const a = $(`.nlist a[href="#/note/${id}"] b`); if (a) a.textContent = n.title || '제목 없음'; } }, 800); } }
  else if (t.id === 'cq') { UI.q = t.value; const pos = t.selectionStart; render(); const c = $('#cq'); c.focus(); c.setSelectionRange(pos, pos); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.cert) { const x = find('training', t.dataset.cert); x.certNo = t.value.trim(); commit(); toast('이수번호를 저장했습니다.'); }
  else if (t.dataset.ptotal) { const p = find('budget', t.dataset.ptotal); p.total = Math.max(0, +t.value || 0); commit(); }
  else if (t.dataset.hide) { S.hide[t.dataset.hide] = !t.checked; commit(); }
  else if (t.dataset.note === 'kind' || t.dataset.note === 'date' || t.dataset.note === 'lock') { const n = find('notes', location.hash.split('/')[2]); if (n) { n[t.dataset.note] = t.type === 'checkbox' ? t.checked : t.value; commit(); } }
  else if (t.id === 'docUp') { const kind = $('#upk').value; for (const f of t.files) { try { toast(f.name + ' 읽는 중…'); const text = await readFile(f); LIB.push({ id: uid(), name: f.name, kind, text, added: today() }); } catch (er) { toast(er.message); } } await saveLib(); toast('올렸습니다. 꿈송이가 이제 이 자료도 찾습니다.'); render(); }
  else if (t.id === 'schedUp') { const f = t.files[0]; if (!f) return; try { toast('학사일정 읽는 중…'); scheduleDialog(await readFile(f)); } catch (er) { toast(er.message); } }
  else if (t.id === 'planUp') { const f = t.files[0]; if (!f) return; try { toast('계획서 읽는 중…'); const text = await readFile(f); LIB.push({ id: uid(), name: f.name, kind: '계획서', text, added: today() }); await saveLib(); budgetDialog(text); } catch (er) { toast(er.message); } }
  else if (t.dataset.import) {
    const f = t.files[0]; if (!f) return; try {
      const text = await readFile(f), key = t.dataset.import, rows = text.split(/\n/).map(l => l.split(/\s\|\s|\t|,/).map(s => s.trim().replace(/^"|"$/g, ''))).filter(r => r.some(Boolean));
      if (rows.length && /부서|이름|업무|담당|성명/.test(rows[0].join(''))) rows.shift();
      rows.forEach(r => S[key].push(key === 'duties' ? { id: uid(), dept: r[0] || '', work: r[1] || '', who: r[2] || '', mine: false } : { id: uid(), dept: r[0] || '', name: r[1] || '', ext: r[2] || '', phone: r[3] || '' }));
      commit(); toast(rows.length + '줄을 넣었습니다.');
    } catch (er) { toast(er.message); }
  }
  else if (t.id === 'masUp') { const f = t.files[0]; if (!f) return; const im = new Image(); im.onload = async () => { const c = document.createElement('canvas'), s = 256 / Math.max(im.width, im.height, 256) * (im.width > 256 || im.height > 256 ? 1 : 1); const r = Math.min(1, 256 / Math.max(im.width, im.height)); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); MASCOT = c.toDataURL('image/png'); await idb.set('mascot', MASCOT); render(); }; im.src = URL.createObjectURL(f); }
  else if (t.id === 'logoUp') { const f = t.files[0]; if (!f) return; const im = new Image(); im.onload = async () => { const r = Math.min(1, 256 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); LOGO = c.toDataURL('image/png'); await idb.set('logo', LOGO); render(); toast('도디쌤 이미지를 바꿨습니다.'); }; im.onerror = () => toast('이미지를 읽지 못했습니다.'); im.src = URL.createObjectURL(f); t.value = ''; }
  else if (t.id === 'archUp') { const f = t.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (!j.S) throw 0; const yr = (j.S.updatedAt ? new Date(j.S.updatedAt) : new Date()), sy0 = yr.getMonth() + 1 >= 3 ? yr.getFullYear() : yr.getFullYear() - 1; ask('보관함 이름', [{ k: 'n', label: '이름', val: sy0 + '학년도' }], async v => { ARCH.push({ id: uid(), label: (v.n || sy0 + '학년도').trim(), at: today(), S: j.S, LIB: j.LIB || [] }); await saveArch(); render(); toast('보관함에 넣었습니다. 지금 데이터는 그대로입니다.'); }, '넣기'); } catch (er) { toast('백업 파일이 아닙니다.'); } t.value = ''; }
  else if (t.id === 'restore') { const f = t.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (!j.S) throw 0; sure('백업으로 덮어쓸까요? 지금 내용은 사라집니다.', async () => { S = Object.assign(DEF(), j.S); LIB = j.LIB || []; await saveLib(); commit(); toast('불러왔습니다.'); }); } catch (er) { toast('백업 파일이 아닙니다.'); } }
});

/* 계획서 → 예산 후보 확인 창 */
function budgetDialog(text) {
  const c = extractBudget(text);
  if (!c.length) return toast('금액이 있는 줄을 찾지 못했습니다. 예산 장부에 직접 넣어 주세요.');
  const d = document.createElement('dialog'); d.className = 'dlg wide';
  d.innerHTML = `<form method="dialog"><h3>계획서에서 찾은 예산 후보 ${c.length}건</h3><p class="mu">맞는 것만 체크하고 넣을 사업을 고르세요. 금액·기한은 넣은 뒤 장부에서 고칠 수 있습니다.</p>
  <label>넣을 사업<select name="proj">${S.budget.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}<option value="_new">+ 새 사업 만들기</option></select></label><label>새 사업 이름(새로 만들 때)<input name="newname" placeholder="예: 학생인권부 사업"></label>
  <table class="tbl"><tbody>${c.map((x, i) => `<tr><td><input type="checkbox" name="c${i}" checked aria-label="포함"></td><td>${esc(x.item)}</td><td class="r">${won(x.alloc)}원</td><td>${x.deadline || ''}</td></tr>`).join('')}</tbody></table>
  <div class="btns"><button value="ok" class="pri">체크한 항목 넣기</button><button value="cancel" formnovalidate>취소</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => {
    if (d.returnValue === 'ok') {
      const fd = new FormData(d.querySelector('form')); let p = S.budget.find(x => x.id === fd.get('proj'));
      if (!p) { p = { id: uid(), name: fd.get('newname') || '새 사업', total: 0, lines: [], spends: [] }; S.budget.push(p); }
      let n = 0; c.forEach((x, i) => { if (fd.get('c' + i)) { p.lines.push({ id: uid(), item: x.item, alloc: x.alloc, deadline: x.deadline, spends: [] }); n++; } });
      commit(); toast(n + '건을 넣었습니다.'); if (location.hash !== '#/budget') location.hash = '#/budget';
    }
    d.remove();
  });
  d.showModal();
}

/* 학사일정 → 캘린더 확인 창 */
function scheduleDialog(text) {
  const sy = schoolYearNow(), c = extractSchedule(text, sy);
  if (!c.length) return toast('날짜가 있는 줄을 찾지 못했습니다. 「3/2 입학식」 모양으로 한 줄씩 적어 보세요.');
  c.forEach(x => { x.dup = S.items.some(i => i.date === x.date && i.title === x.title); x.on = !x.dup; });
  const d = document.createElement('dialog'); d.className = 'dlg wide';
  d.innerHTML = `<form method="dialog"><h3>학사일정 ${c.length}건을 찾았습니다</h3><p class="mu">${sy}학년도(${sy}.3~${sy + 1}.2) 기준으로 연도를 짐작했습니다. 맞는 것만 체크하고, 날짜·이름은 바로 고칠 수 있습니다. 이미 있는 일정은 체크가 꺼져 있습니다.</p>
  <table class="tbl"><thead><tr><th></th><th>시작</th><th>끝(선택)</th><th>행사</th></tr></thead><tbody>${c.map((x, i) => `<tr><td><input type="checkbox" name="c${i}" ${x.on ? 'checked' : ''} aria-label="넣기"></td><td><input type="date" name="d${i}" value="${x.date}"></td><td><input type="date" name="e${i}" value="${x.end}"></td><td><input name="t${i}" value="${esc(x.title)}">${x.dup ? '<span class="mu"> 이미 있음</span>' : ''}</td></tr>`).join('')}</tbody></table>
  <div class="btns"><button value="ok" class="pri">체크한 일정 캘린더에 넣기</button><button value="cancel" formnovalidate>취소</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => {
    if (d.returnValue === 'ok') {
      const fd = new FormData(d.querySelector('form')); let n = 0;
      c.forEach((x, i) => { if (!fd.get('c' + i)) return; const date = fd.get('d' + i), title = String(fd.get('t' + i) || '').trim(); if (!date || !title) return; const end = fd.get('e' + i); if (S.items.some(k => k.date === date && k.title === title)) return; S.items.push({ id: uid(), title, date, end: end && end > date ? end : '', cat: 'event', src: '학사', done: false }); n++; });
      if (n) { const ds = c.filter((x, i) => fd.get('c' + i)).map(x => x.date.slice(0, 7)); UI.cal = ds.includes(today().slice(0, 7)) ? today().slice(0, 7) : (ds[0] || UI.cal); location.hash = '#/cal'; } commit(); toast(n + '건을 캘린더에 넣었습니다.');
    }
    d.remove();
  });
  d.showModal();
}

/* ---------- 꿈송이 챗봇 ---------- */
const CH = [{ role: 'bot', blocks: [], text: '안녕하세요, 꿈송이입니다. 올려 두신 계획서·예산·회의록·업무 분장·연락망·규정 안에서 찾아 드립니다. 말이 대충이어도 괜찮아요.' }];
let chatOpen = false, busy = false;
function openChat() { if (chatOpen) return; chatOpen = true; try { history.pushState({ tfChat: 1 }, '', location.href); } catch (e) { } renderChat(); setTimeout(() => { const q = $('#chq'); q && q.focus(); }, 50); }
function closeChat(viaLink) { if (!chatOpen) return; chatOpen = false; renderChat(); if (!viaLink && history.state && history.state.tfChat) history.back(); }
window.addEventListener('popstate', e => { if (chatOpen) { chatOpen = false; renderChat(); } else if (e.state && e.state.tfChat) history.back(); });
function renderChatFab() {
  const b = $('#chatfab'); b.innerHTML = `<img src="${mas()}" alt="꿈송이">`;
  if (!$('#chatbub')) { const u = document.createElement('button'); u.id = 'chatbub'; u.textContent = '무엇이든 물어보세요!'; u.addEventListener('click', () => $('#chatfab').click()); b.parentNode.insertBefore(u, b); }
}
function renderChat() {
  const p = $('#chatpan'); p.hidden = !chatOpen; if (!chatOpen) return;
  p.style.setProperty('--mas', `url("${mas()}")`);
  p.innerHTML = `<div class="ch-h"><span class="ch-face"><img src="${mas()}" alt=""></span><div><b>꿈송이 · 업무파탈 줍줍</b><span>수첩 안의 모든 기록에서 찾아요</span></div><button class="x" data-chat="close" aria-label="닫기">닫기</button></div>
  <div class="ch-b" id="chlog">${CH.length ? '' : `<div class="hello"><img src="${mas()}" alt="꿈송이"><div class="bb"><b>안녕하세요, 꿈송이예요!</b><br>회의록·계획서·예산·일정·연락망·연수 이수번호까지, 이 수첩에 적은 건 뭐든 물어보세요. 말을 대충 해도 찾아 드려요.</div></div>`}${CH.map((m, mi) => m.role === 'me' ? `<div class="me">${esc(m.text)}</div>` : `<div class="bot">${m.text ? `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>` : ''}${(m.blocks || []).map((b, i) => `<div class="hit"><span class="no">${i + 1}</span><div><div>${b.html || snippet(b.text, m.q || '')}</div><div class="src">출처: ${esc(b.src)} ${b.ref ? `<a href="${esc(b.ref)}" ${/^http/.test(b.ref) ? 'target="_blank" rel="noopener"' : 'data-chat="go"'}>원문 열기</a>` : ''}</div></div></div>`).join('')}${m.blocks && m.blocks.length || m.text.length > 60 ? `<div class="ch-act"><button class="x" data-chat="copy" data-i="${mi}">복사</button><button class="x" data-chat="export" data-i="${mi}">문서로 내보내기</button><button class="x" data-chat="print" data-i="${mi}">인쇄·PDF</button></div>` : ''}</div>`).join('')}${busy ? '<div class="bot"><p class="mu">찾는 중…</p></div>' : ''}</div>
  <div class="ch-q">${['내 담당 업무', '예산 잔액', '이번 주 마감', '연수 이수 현황'].map(s => `<button class="chip" data-chat="ask" data-q="${s}">${s}</button>`).join('')}</div>
  <form class="ch-f" data-chatform><label class="sr" for="chq">질문</label><input id="chq" autocomplete="off" placeholder="예: 저번 회의에서 체육관 돈 누가 알아본다고 했지" ><button class="btn pri">묻기</button></form>`;
  const l = $('#chlog'); l.scrollTop = l.scrollHeight;
}
async function ask1(q) {
  q = q.trim(); if (!q || busy) return;
  CH.push({ role: 'me', text: q }); busy = true; renderChat();
  const dir = direct(q), hits = search(q), blocks = [...dir.map(d => ({ src: d.src, text: d.text, ref: d.ref })), ...hits.map(h => ({ src: h.c.src, text: h.c.text, ref: h.c.ref }))];
  let text = '';
  if (localStorage.getItem('tf.claudeKey')) { try { const h2 = search(q, true); if (h2.length) text = '꿈송이 정리\n' + await askClaude(q, h2); } catch (e) { text = '(문장 정리는 실패해서 찾은 원문만 보여 드립니다: ' + e.message + ')'; } }
  if (!blocks.length && !text) text = '올려 주신 자료에서 찾지 못했습니다. 자료가 아직 안 올라갔거나 표현이 달랐을 수 있어요. 다른 말로 한 번 더 물어봐 주세요.';
  busy = false; CH.push({ role: 'bot', q, blocks, text }); renderChat();
}
function plain(m) { return [m.text, ...(m.blocks || []).map((b, i) => `${i + 1}. ${b.text}\n   출처: ${b.src}`)].filter(Boolean).join('\n'); }
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-chat]'); if (!b) return; const k = b.dataset.chat;
  if (k === 'close') { closeChat(); }
  else if (k === 'ask') ask1(b.dataset.q);
  else if (k === 'go') { closeChat(true); }
  else if (k === 'copy') { try { await navigator.clipboard.writeText(plain(CH[+b.dataset.i])); toast('복사했습니다.'); } catch (er) { toast('복사하지 못했습니다.'); } }
  else if (k === 'print') { const m = CH[+b.dataset.i], html = `<html><meta charset="utf-8"><title>꿈송이가 찾은 내용</title><body style="font-family:sans-serif;line-height:1.7"><h2>꿈송이가 찾은 내용</h2><p>질문: ${esc(m.q || '')} · ${today()}</p>${m.text ? `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>` : ''}${(m.blocks || []).map((x, i) => `<p>${i + 1}. ${esc(x.text).replace(/\n/g, '<br>')}<br><small>출처: ${esc(x.src)}</small></p>`).join('')}</body></html>`; const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f); f.contentDocument.write(html); f.contentDocument.close(); setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (er) { toast('인쇄 창을 열지 못했습니다. 문서로 내보내기를 써 주세요.'); } setTimeout(() => f.remove(), 3000); }, 300); }
  else if (k === 'export') { const m = CH[+b.dataset.i]; download('꿈송이_찾은내용_' + today() + '.doc', `<html><meta charset="utf-8"><body><h2>꿈송이가 찾은 내용</h2><p>질문: ${esc(m.q || '')}</p>${m.text ? `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>` : ''}${(m.blocks || []).map((x, i) => `<p>${i + 1}. ${esc(x.text)}<br><small>출처: ${esc(x.src)}</small></p>`).join('')}</body></html>`, 'application/msword'); }
});
document.addEventListener('submit', e => { if (e.target.matches('[data-chatform]')) { e.preventDefault(); const i = $('#chq'), v = i.value; i.value = ''; ask1(v); } });

/* ---------- 예시 데이터 ---------- */
function sampleData() {
  const t = today(), add = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  Object.assign(S, DEF(), { setup: true });
  S.profile.name = '예시'; S.profile.school = '○○중학교'; S.profile.subject = '도덕';
  for (let d = 1; d <= 5; d++) { const row = ['', '', '2-1 도덕', '1-3 도덕', '', '2-2 도덕', '업무']; row.forEach((v, i) => { S.timetable[d + '-' + (i + 1)] = v; }); }
  S.items = [{ id: uid(), title: '2-1 수행평가 채점표 출력', date: t, cat: 'todo', done: true }, { id: uid(), title: '1-3 진도 보충 계획', date: t, cat: 'todo', done: false }, { id: uid(), title: '예산 품의 올리기', date: add(3), cat: 'todo', done: false }, { id: uid(), title: '학년말 교육과정 평가 자료 제출', date: add(10), cat: 'event', done: false }];
  S.lessons = [['1-1', 72], ['1-2', 72], ['1-3', 64], ['2-1', 80], ['2-2', 80], ['2-3', 76]].map(([c, p]) => ({ id: uid(), cls: c, unit: '2단원', done: Math.round(p / 10), total: 10 }));
  S.assess = [{ id: uid(), title: '질문 만들기 수행평가', grade: '2학년', due: add(5), step: 3 }];
  S.budget = [{ id: uid(), name: '학생인권부 사업', total: 0, spends: [], lines: [{ id: uid(), item: '일반수용비', alloc: 1500000, deadline: add(24), spends: [{ id: uid(), date: add(-9), desc: '인권 교육 자료 인쇄', amt: 720000 }] }, { id: uid(), item: '행사운영비', alloc: 1000000, deadline: add(29), spends: [{ id: uid(), date: add(-4), desc: '캠페인 물품', amt: 580000 }] }] }];
  S.training = [{ id: uid(), title: '정보보안 연수', type: '필수', hours: 2, due: add(9), done: false }, { id: uid(), title: '학생 인권 연수', type: '필수', hours: 2, done: true, doneDate: add(-6), certNo: '2026-인권-0382' }, { id: uid(), title: 'AI 활용 수업 연수', type: '개발', hours: 15, done: true, doneDate: add(-20), certNo: '' }];
  S.notes = [{ id: uid(), title: '11월 교직원회의', date: t, kind: '회의', body: '체육관 대관 비용은 행정실에서 확인해 알려주기로 함.\n학년말 평가 자료는 다음 달 5일까지 제출.', decisions: '평가 자료 12/5까지 제출\n행사운영비는 행정실 확인 후 집행', followups: '평가 자료 정리\n행정실에 체육관 비용 문의', lock: false }];
  S.duties = [{ id: uid(), dept: '학생인권부', work: '학생 인권 교육·폰프리 운영', who: '예시', mine: true }, { id: uid(), dept: '교무부', work: '학사 일정·시간표', who: '김○○', mine: false }, { id: uid(), dept: '행정실', work: '예산 집행·계약·체육관 대관', who: '이○○ 주무관', mine: false }];
  S.contacts = [{ id: uid(), dept: '교무실', name: '김○○ 교사', ext: '201', phone: '' }, { id: uid(), dept: '행정실', name: '이○○ 주무관', ext: '105', phone: '' }];
  S.pages = [{ id: uid(), title: '수업 아이디어 메모', parent: '', pin: true, lock: false, blocks: [newBlock('h2', '이번 주 해 볼 것'), newBlock('todo', '질문 카드 인쇄'), newBlock('todo', '모둠 노트 점검'), newBlock('p', '인권 단원은 질문 릴레이로 시작한다.')] }];
  S.links = [{ id: uid(), name: 'K-에듀파인', url: 'https://klef.goe.go.kr' }, { id: uid(), name: '나이스', url: 'https://neis.go.kr' }];
  LIB = [{ id: uid(), name: '예시_복무규정.txt', kind: '규정', added: t, text: '출장 복명서는 출장 종료 후 3일 이내에 제출한다.\n수행평가 결시는 사유서와 증빙을 제출하면 인정 결시로 처리한다.' }];
  saveLib(); location.hash = '#/today'; commit(); toast('예시 데이터를 채웠습니다. 꿈송이에게 "체육관 돈 누가 알아봐?"라고 물어 보세요.');
}

/* ---------- 시작 ---------- */
(async function () {
  await loadBig();
  const cb = document.createElement('div'); cb.id = 'chatbox'; cb.innerHTML = '<div id="chatpan" hidden></div><button id="chatfab" aria-label="꿈송이에게 물어보기"></button>'; document.body.appendChild(cb);
  $('#chatfab').addEventListener('click', () => { if (chatOpen) closeChat(); else openChat(); });
  render();
  TF.sync.start().catch(e => console.warn('동기화 시작 실패', e));
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
  setInterval(() => { if (!document.hidden && /today/.test(location.hash || '#/today') && !document.querySelector('dialog[open]') && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) render(); }, 60000);
})();

document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.fonts && d.open) FONTS50.forEach(loadFont); }, true);

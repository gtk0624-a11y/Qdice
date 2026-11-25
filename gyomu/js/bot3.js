/* 꿈송이 비서 강화(v162): 캘린더 중심 도구(메모·구분·기간·매주 반복·수정·옮기기·삭제 제안), 오늘 브리핑·밀린 일·빈 날 찾기, 디데이,
   누르면 바로 묻는 빠른 질문 버튼. 모든 쓰기는 「제안 카드 → 적용」을 눌러야 반영됩니다(삭제 포함). bot2.js 다음에 불러옵니다. */
const B3_DATE = { type: 'string', description: 'YYYY-MM-DD' };
const B3_KIND = { type: 'string', description: '구분: 업무/수업/개인/기타 또는 직접 이름(예: 시험감독, 회의, 연수)' };
B2_READ.push(
  { name: 'daily_brief', description: '오늘 브리핑 재료를 한 번에 모은다: 오늘 일정, 밀린(기한 지난 미완료) 할 일, 앞으로 7일, 디데이, 기한 임박 내 업무 카드. "오늘 뭐 해야 해?", "이번 주 정리" 류에는 먼저 이것을 부른다.', input_schema: { type: 'object', properties: { date: B3_DATE } } },
  { name: 'get_items', description: '캘린더에 직접 넣은 일정·할 일을 메모·구분·기간·완료 여부까지 자세히 본다(제목 일부·기간으로 거름). 수정·삭제할 대상을 확인할 때 쓴다.', input_schema: { type: 'object', properties: { text: { type: 'string' }, from: B3_DATE, to: B3_DATE, open_only: { type: 'boolean' } } } },
  { name: 'free_days', description: '기간 안에서 일정·할 일이 하나도 없는 날(주말 제외)을 찾는다. "언제 비어?", "시험 준비 시간 어디 잡지?" 류.', input_schema: { type: 'object', properties: { from: B3_DATE, to: B3_DATE }, required: ['from', 'to'] } },
  { name: 'get_dday', description: '등록된 디데이 목록과 남은 날', input_schema: { type: 'object', properties: {} } }
);
Object.assign(B2_LBL, { daily_brief: '오늘 브리핑', get_items: '캘린더 항목', free_days: '빈 날', get_dday: '디데이' });
B2_WRITE.push(
  { name: 'add_cal_item', description: '캘린더에 일정/할 일을 추가한다. 메모·구분·기간(end)·매주 반복(repeat_weeks)까지 한 번에. 긴 공문·메신저 글에서 일정이 여럿이면 항목마다 따로 부른다.', input_schema: { type: 'object', properties: { title: { type: 'string' }, date: B3_DATE, end: B3_DATE, type: { type: 'string', enum: ['event', 'todo'] }, kind: B3_KIND, memo: { type: 'string', description: '장소·시간·준비물·링크 등' }, repeat_weeks: { type: 'integer', description: '같은 항목을 매주 몇 번 더 복사할지(0~40)' } }, required: ['title', 'date'] } },
  { name: 'edit_cal_item', description: '캘린더 항목을 고친다: 제목·날짜(옮기기)·기간·구분·메모 덧붙이기·완료. 제목 일부(필요하면 on_date)로 하나를 특정한다.', input_schema: { type: 'object', properties: { title_contains: { type: 'string' }, on_date: B3_DATE, new_title: { type: 'string' }, new_date: B3_DATE, new_end: B3_DATE, new_kind: B3_KIND, new_memo: { type: 'string', description: '메모를 이 내용으로 바꿈' }, append_memo: { type: 'string' }, done: { type: 'boolean' } }, required: ['title_contains'] } },
  { name: 'delete_cal_item', description: '캘린더 항목 삭제를 제안한다(사용자가 [적용]을 눌러야 지워짐). 제목 일부(필요하면 on_date)로 하나를 특정한다.', input_schema: { type: 'object', properties: { title_contains: { type: 'string' }, on_date: B3_DATE }, required: ['title_contains'] } },
  { name: 'add_dday', description: '디데이를 추가한다', input_schema: { type: 'object', properties: { title: { type: 'string' }, date: B3_DATE }, required: ['title', 'date'] } }
);
const b3Ok = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const b3Days = d => Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
const b3Dd = d => { const n = b3Days(d); return n === 0 ? 'D-Day' : n > 0 ? 'D-' + n : 'D+' + (-n); };
const b3Find = i => S.items.filter(x => agN(x.title).includes(agN(i.title_contains)) && (!b3Ok(i.on_date) || x.date === i.on_date));
const b3Row = x => ({ 제목: x.title, 날짜: x.date, 끝: x.end || '', 종류: x.cat === 'todo' ? '할 일' : '일정', 구분: x.tag || '', 완료: !!x.done, 메모: b2Cut(x.memo || '', 300) });
const _b3Run = b2Run;
b2Run = function (name, i) {
  switch (name) {
    case 'daily_brief': {
      const d = b3Ok(i.date) ? i.date : today(), ev = allEvents(), end7 = new Date(d + 'T00:00:00'); end7.setDate(end7.getDate() + 7); const e7 = ymd(end7);
      const f = e => `${e.date} ${e.t}${e.kind ? ' [' + e.kind + ']' : ''}${e.done ? ' (완료)' : ''}`;
      return {
        기준일: d, 오늘: ev.filter(e => e.date === d).map(f), 밀린할일: S.items.filter(x => x.cat === 'todo' && !x.done && x.date && x.date < d).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 20).map(x => `${x.date} ${x.title}`),
        앞으로7일: ev.filter(e => e.date > d && e.date <= e7).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 40).map(f),
        디데이: (S.dday || []).filter(x => x.date && b3Days(x.date) >= -1).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).map(x => `${x.title} ${b3Dd(x.date)} (${x.date})`),
        기한임박업무카드: (typeof wkD === 'function' ? wkD().cards : []).filter(c => c.me && !c.done && c.due && c.due <= e7).slice(0, 15).map(c => `${c.due} ${c.title}`)
      };
    }
    case 'get_items': { let L = S.items.slice(); if (i.text) L = L.filter(x => agN(x.title + (x.memo || '')).includes(agN(i.text))); if (b3Ok(i.from)) L = L.filter(x => (x.end || x.date) >= i.from); if (b3Ok(i.to)) L = L.filter(x => x.date <= i.to); if (i.open_only) L = L.filter(x => !x.done); L.sort((a, b) => (a.date || '').localeCompare(b.date || '')); return { 건수: L.length, 목록: L.slice(0, 60).map(b3Row) }; }
    case 'free_days': { const ev = allEvents(), busy = new Set(); ev.forEach(e => busy.add(e.date)); S.items.forEach(x => { if (x.end && x.end > x.date) for (let d = new Date(x.date + 'T00:00:00'), k = 0; ymd(d) <= x.end && k < 70; d.setDate(d.getDate() + 1), k++) busy.add(ymd(d)); }); const out = []; for (let d = new Date(i.from + 'T00:00:00'), k = 0; ymd(d) <= i.to && k < 120; d.setDate(d.getDate() + 1), k++) { const s = ymd(d), w = d.getDay(); if (w && w < 6 && !busy.has(s)) out.push(s + ' (' + '일월화수목금토'[w] + ')'); } return { 빈날수: out.length, 빈날: out.slice(0, 40) }; }
    case 'get_dday': return (S.dday || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(x => `${x.title} ${x.date} ${b3Dd(x.date)}`);
  }
  return _b3Run(name, i);
};
const _b3Plan = agPlan, _b3Do = agDo;
agPlan = function (a) {
  const i = a.input || {}, r = { ok: true, txt: '' }, bad = m => { r.ok = false; r.txt = m; return r; };
  switch (a.name) {
    case 'add_cal_item': { const n = Math.max(0, Math.min(40, +i.repeat_weeks || 0)); r.txt = `${i.type === 'todo' ? '할 일' : '일정'} 추가: ${i.title} (${agDate(i.date)}${b3Ok(i.end) && i.end > agDate(i.date) ? '~' + i.end : ''})${i.kind ? ' · ' + i.kind : ''}${i.memo ? ' · 메모 있음' : ''}${n ? ' · 매주 ' + n + '번 더 복사' : ''}`; return r; }
    case 'edit_cal_item': { const m = b3Find(i); if (m.length !== 1) return bad(`항목 수정: 「${i.title_contains}」에 맞는 항목을 ${m.length ? m.length + '개라 하나로 정할 수 없습니다(날짜를 함께 말해 주세요)' : '찾지 못했습니다'}`); a._t = m[0]; const c = []; if (i.new_title) c.push('제목 → ' + i.new_title); if (b3Ok(i.new_date)) c.push(`날짜 ${m[0].date} → ${i.new_date}`); if (b3Ok(i.new_end)) c.push('기간 끝 → ' + i.new_end); if (i.new_kind) c.push('구분 → ' + i.new_kind); if (i.new_memo != null) c.push('메모 바꿈'); if (i.append_memo) c.push('메모 덧붙임'); if (i.done != null) c.push(i.done ? '완료 처리' : '완료 취소'); r.txt = `항목 수정: ${m[0].title} (${m[0].date}) — ${c.join(' · ') || '바뀌는 내용 없음'}`; if (!c.length) r.ok = false; return r; }
    case 'delete_cal_item': { const m = b3Find(i); if (m.length !== 1) return bad(`삭제: 「${i.title_contains}」에 맞는 항목을 ${m.length ? m.length + '개라 하나로 정할 수 없습니다(날짜를 함께 말해 주세요)' : '찾지 못했습니다'}`); a._t = m[0]; r.txt = `🗑 삭제: ${m[0].title} (${m[0].date}) — 적용하면 지워집니다`; return r; }
    case 'add_dday': if (!b3Ok(i.date)) return bad('디데이: 날짜를 알 수 없습니다'); r.txt = `디데이 추가: ${i.title} ${i.date} (${b3Dd(i.date)})`; return r;
  }
  return _b3Plan(a);
};
agDo = function (a) {
  const i = a.input || {};
  switch (a.name) {
    case 'add_cal_item': {
      const date = agDate(i.date), it = { id: uid(), title: i.title, date, cat: i.type === 'todo' ? 'todo' : 'event', done: false };
      if (b3Ok(i.end) && i.end > date) it.end = i.end; if (i.memo) it.memo = i.memo;
      if (i.kind) { try { ncSeed(); if (!cusKinds().some(k => k.n === i.kind)) cusKinds().push({ n: i.kind, b: 'event' }); } catch (e) { } it.tag = i.kind; }
      S.items.push(it); const n = Math.max(0, Math.min(40, +i.repeat_weeks || 0));
      for (let k = 1; k <= n; k++) { const dt = new Date(date + 'T00:00:00'); dt.setDate(dt.getDate() + 7 * k); ncClone({ title: it.title, cat: it.cat, tag: it.tag, memo: it.memo, span: it.end ? Math.round((new Date(it.end + 'T00:00:00') - new Date(date + 'T00:00:00')) / 864e5) : 0 }, ymd(dt)); }
      return;
    }
    case 'edit_cal_item': {
      const t = a._t; if (!t) return; if (i.new_title) t.title = i.new_title;
      if (b3Ok(i.new_date)) { const span = t.end ? Math.round((new Date(t.end + 'T00:00:00') - new Date(t.date + 'T00:00:00')) / 864e5) : 0; t.date = i.new_date; if (span > 0 && !b3Ok(i.new_end)) { const e = new Date(t.date + 'T00:00:00'); e.setDate(e.getDate() + span); t.end = ymd(e); } }
      if (b3Ok(i.new_end)) { if (i.new_end > t.date) t.end = i.new_end; else delete t.end; }
      if (i.new_kind) { try { ncSeed(); if (!cusKinds().some(k => k.n === i.new_kind)) cusKinds().push({ n: i.new_kind, b: 'event' }); } catch (e) { } t.tag = i.new_kind; }
      if (i.new_memo != null) { if (i.new_memo) t.memo = i.new_memo; else delete t.memo; }
      if (i.append_memo) t.memo = (t.memo ? t.memo + '\n' : '') + i.append_memo;
      if (i.done != null) t.done = !!i.done; return;
    }
    case 'delete_cal_item': if (a._t) S.items = S.items.filter(x => x !== a._t); return;
    case 'add_dday': (S.dday = S.dday || []).push({ id: uid(), title: i.title, date: i.date }); return;
  }
  return _b3Do(a);
};
const _b3Ctx = agContext;
agContext = function () {
  const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
  const od = S.items.filter(x => x.cat === 'todo' && !x.done && x.date && x.date < today()).length;
  const dd = (S.dday || []).filter(x => x.date && b3Days(x.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map(x => `${x.title} ${b3Dd(x.date)}`).join(', ');
  return _b3Ctx.apply(this, arguments) + `\n[지금] ${hm} · 밀린 할 일 ${od}건${dd ? ' · 디데이 ' + dd : ''}`;
};
/* 빠른 질문 버튼 */
const B3_QUICK = [['☀️ 오늘 브리핑', '오늘 브리핑 해줘. 오늘 할 일, 밀린 일, 앞으로 일주일, 디데이를 우선순위 순으로 짧게 정리하고 제일 먼저 할 일 하나를 콕 집어줘.'], ['📅 이번 주 정리', '이번 주(월~금) 일정과 기한을 요일별로 표로 정리해줘.'], ['⏰ 밀린 일', '기한이 지났는데 안 끝낸 할 일을 보여주고, 오늘·내일·이번 주로 나눠 옮기는 계획을 제안해줘.'], ['🕳 빈 날 찾기', '앞으로 3주 중 일정이 없는 평일을 알려줘.']];
const _b3Kb = chatKeyBar;
chatKeyBar = function () {
  const h = _b3Kb.apply(this, arguments);
  if (!agKey() || window.__keyEdit) return h;
  return h + `<div class="b3q">${B3_QUICK.map(([l], k) => `<button type="button" class="btn sm" data-b3q="${k}">${l}</button>`).join('')}</div>`;
};
document.addEventListener('click', e => { const b = e.target.closest('[data-b3q]'); if (!b) return; e.preventDefault(); ask1(B3_QUICK[+b.dataset.b3q][1]); });

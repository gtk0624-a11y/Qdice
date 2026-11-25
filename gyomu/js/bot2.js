/* 꿈송이 2 — 규정줍줍 + 사이트를 돌아다니는 비서.
   ① 규정줍줍: 올려 둔 자료(규정·지침·계획서)에서 해당 조항을 찾아 파일 이름과 함께 보여 준다(키 없이도 동작, 키가 있으면 문장으로 정리).
   ② 비서 모드: Claude 키가 있으면 질문마다 "도구"를 스스로 골라 수첩 전체(캘린더·내 업무 카드·예산·연수표·메모·자료실)를 읽고,
      필요하면 일정·카드·표를 고치는 "제안"을 만든다. 고치는 일은 [적용]을 눌러야만 반영되고, 반영 뒤 되돌리기가 된다. */
const B2_MODEL = () => localStorage.getItem('tf.botModel') || 'claude-haiku-5-5';
const B2_NAVS = ['#/today', '#/cal', '#/work', '#/yp', '#/budget', '#/lib', '#/class', '#/eval', '#/cm', '#/set'];
const b2Cut = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…(이하 생략)' : s; };

/* ---- 규정줍줍: 자료실 문서에서 조항 찾기 ---- */
function b2Chunks() {
  if (b2Chunks._k === (LIB || []).length + ':' + (LIB || []).reduce((n, d) => n + (d.text || '').length, 0)) return b2Chunks._v;
  const out = [], CH_ = /^제\s*\d+\s*장/, AR_ = /^(제\s*\d+\s*조(?:\s*의\s*\d+)?\s*(?:[(（][^)）]{1,30}[)）])?)/;
  (LIB || []).forEach(d => {
    const lines = String(d.text || '').split(/\n+/).map(x => x.trim()).filter(Boolean); let buf = '', head = '', chap = '', n = 0;
    const flush = () => { if (buf) out.push({ file: d.name, kind: d.kind || '', text: buf, head, chap, n: ++n }); buf = ''; };
    lines.forEach(l => {
      if (CH_.test(l) && l.length < 50) { flush(); chap = l; head = ''; return; }
      const m = l.match(AR_);
      if (m) { flush(); head = m[1].replace(/\s+/g, ''); }
      else if (buf && buf.length + l.length > (head ? 900 : 600)) flush();
      buf += (buf ? '\n' : '') + l;
    }); flush();
  });
  b2Chunks._k = (LIB || []).length + ':' + (LIB || []).reduce((n, d) => n + (d.text || '').length, 0); b2Chunks._v = out; return out;
}
const b2Words = q => [...new Set(String(q).split(/[\s,?.!]+/).map(w => w.replace(/(해줘|알려줘|뭐야|인가요|인지|있나요|되나요|할까요|은|는|이|가|을|를|에|의|도|로|으로|이나|나|좀)$/, '')).filter(w => w.length >= 2))];
function b2Rules(q, limit) {
  const ch = b2Chunks(); if (!ch.length) return [];
  const qg = new Set(); grams(q).forEach(g => qg.add(g));
  const qn = norm(q); if (typeof SYN !== 'undefined') Object.keys(SYN).forEach(k => { if (qn.includes(k)) SYN[k].forEach(w => grams(w).forEach(g => qg.add(g))); });
  if (!qg.size) return [];
  const kws = b2Words(q).map(norm).filter(w => w.length >= 2), need = Math.min(2, qg.size);
  const df = new Map(); const ns = ch.map(c => norm(c.file + c.head + c.text)), hs = ch.map(c => norm(c.head + c.chap + c.file));
  qg.forEach(g => df.set(g, ns.filter(n => n.includes(g)).length));
  const res = ch.map((c, i) => {
    let s = 0, h = 0; qg.forEach(g => { if (ns[i].includes(g)) { h++; const w = Math.log(1 + ch.length / (1 + df.get(g))); s += w; if (hs[i].includes(g)) s += w * 0.8; } });
    kws.forEach(k => { if (ns[i].includes(k)) s += 2.5; });
    if (c.kind === '규정') s *= 1.5; return { c, s, h };
  }).filter(r => r.h >= need && r.s > 0).sort((a, b) => b.s - a.s);
  if (res.length) { const top = res[0].s; return res.filter(r => r.s >= top * .45).slice(0, limit || 5).map(r => r.c); }
  return [];
}
function b2Mark(text, q) {
  let t = esc(text); const ws = b2Words(q);
  ws.forEach(w => { try { t = t.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), m => `<mark>${m}</mark>`); } catch (e) { } });
  return t.replace(/\n/g, '<br>');
}
function b2Key(c, q) {
  const ws = b2Words(q).map(norm), sents = c.text.split(/(?<=[.다음임함됨])\s+|\n/).map(x => x.trim()).filter(x => x.length > 6);
  const sc = sents.map(x => ({ x, s: ws.reduce((n, w) => n + (norm(x).includes(w) ? 1 : 0), 0) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s);
  return sc.length ? sc.slice(0, 2).map(r => r.x).join(' ') : '';
}
const b2RuleIntent = q => /규정|지침|조항|근거|기준|복무|출장|결시|학칙|규칙|며칠|언제까지|가능한가|되나요|해도 되|해야 하|안 되|인정/.test(q);
function b2RuleBlocks(q) {
  const r = b2Rules(q, 4); if (!r.length) return [];
  const key = b2Key(r[0], q), lab = c => `규정줍줍 · ${c.file}${c.head ? ' · ' + c.head : ''}${c.chap ? ' (' + c.chap.slice(0, 20) + ')' : ''}`;
  const out = r.map(c => ({ src: lab(c), html: b2Mark(c.text, q), text: c.text, ref: '#/lib' }));
  if (key) out.unshift({ src: `📌 핵심 · ${r[0].head || r[0].file}`, html: b2Mark(key, q), text: key, ref: '#/lib' });
  return out;
}

/* ---- 도구: 읽기(바로 실행) ---- */
const B2_READ = [
  { name: 'search_site', description: '수첩 전체(일정·할 일·메모·회의록·내 업무·예산·연수·공문·연락망·시간표·자료실)에서 낱말로 찾기. 무엇이 어디 있는지 모를 때 먼저 쓴다.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'find_rule', description: '규정줍줍: 올려 둔 규정·지침·계획서 문서에서 조항·문단을 찾는다. 규정·기한·절차·가능 여부를 묻는 질문에는 반드시 먼저 호출한다. 결과의 파일 이름을 근거로 밝힌다.', input_schema: { type: 'object', properties: { query: { type: 'string', description: '핵심 낱말 위주(예: 출장 복명서 제출 기한)' } }, required: ['query'] } },
  { name: 'list_library', description: '자료실에 올라 있는 문서 목록(이름·종류·글자 수)', input_schema: { type: 'object', properties: {} } },
  { name: 'read_library', description: '자료실 문서 한 개의 본문을 읽는다(한 번에 6000자). 긴 문서는 offset으로 이어 읽는다.', input_schema: { type: 'object', properties: { name_contains: { type: 'string' }, offset: { type: 'integer' } }, required: ['name_contains'] } },
  { name: 'get_calendar', description: '기간 안의 모든 일정·할 일·기한(학사일정·반복·연수표·업무 카드 기한 포함)', input_schema: { type: 'object', properties: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['from', 'to'] } },
  { name: 'get_day', description: '하루의 일정·메모·급식 등을 모아 본다', input_schema: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } },
  { name: 'list_work_cards', description: '내 업무(업무분장표) 카드 목록. 각 카드의 담당자·기한·완료·단계·메모', input_schema: { type: 'object', properties: { scope: { type: 'string', enum: ['me', 'all'] }, open_only: { type: 'boolean' }, text: { type: 'string', description: '제목·부서에 포함된 낱말' } } } },
  { name: 'get_budget', description: '예산 사업·항목별 배정·집행·잔액·기한', input_schema: { type: 'object', properties: {} } },
  { name: 'list_training', description: '연간 교육·훈련표(학기×대상 날짜)와 내 연수 이수 현황', input_schema: { type: 'object', properties: {} } },
  { name: 'get_worklog', description: '업무일지 기간 조회(직접 적은 일지·하루 마무리·감상·성찰 포함)', input_schema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] } },
  { name: 'list_notes', description: '회의·연수 노트 목록 또는 제목 일부로 본문 읽기', input_schema: { type: 'object', properties: { title_contains: { type: 'string' } } } }
];
const B2_WRITE = [
  { name: 'add_wk_card', description: '내 업무 메뉴에 업무 카드 추가(업무분장표 이름대로)', input_schema: { type: 'object', properties: { title: { type: 'string' }, dept: { type: 'string' }, who: { type: 'string', description: '담당자 이름(내 업무면 비움)' }, due: { type: 'string' }, memo: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } } }, required: ['title'] } },
  { name: 'update_wk_card', description: '업무 카드의 완료·기한·메모·단계 수정(제목 일부로 찾음)', input_schema: { type: 'object', properties: { title_contains: { type: 'string' }, done: { type: 'boolean' }, due: { type: 'string' }, memo_append: { type: 'string' }, add_step: { type: 'string' } }, required: ['title_contains'] } },
  { name: 'set_training_date', description: '연간 교육·훈련표 한 칸에 날짜(와 인원) 넣기', input_schema: { type: 'object', properties: { name_contains: { type: 'string' }, col: { type: 'string', enum: ['1t', '1s', '1p', '1x', '2t', '2s', '2p', '2x'], description: '1/2=학기, t=교직원 s=학생 p=학부모 x=기타·훈련' }, date: { type: 'string' }, count: { type: 'integer' } }, required: ['name_contains', 'col', 'date'] } },
  { name: 'add_worklog', description: '업무일지에 한 줄 기록', input_schema: { type: 'object', properties: { text: { type: 'string' }, date: { type: 'string' }, category: { type: 'string', enum: ['업무', '수업', '학생지도', '회의', '공문', '성찰·감상', '기타'] } }, required: ['text'] } },
  { name: 'add_day_memo', description: '캘린더 하루 메모에 한 줄 덧붙이기', input_schema: { type: 'object', properties: { date: { type: 'string' }, text: { type: 'string' } }, required: ['date', 'text'] } }
];
const B2_NAV = { name: 'go_to', description: '사용자가 바로 이동할 수 있는 화면 링크를 답 아래에 붙인다. hash는 ' + B2_NAVS.join(', ') + ' 중 하나', input_schema: { type: 'object', properties: { hash: { type: 'string' }, label: { type: 'string' } }, required: ['hash', 'label'] } };

function b2Run(name, i) {
  switch (name) {
    case 'search_site': return search(i.query || '', true).slice(0, 8).map(h => ({ 출처: h.c.src, 내용: b2Cut(h.c.text, 400), 링크: h.c.ref }));
    case 'find_rule': { const r = b2Rules(i.query || '', 6); return r.length ? r.map(c => ({ 파일: c.file, 조항: c.head || '', 종류: c.kind, 문단: b2Cut(c.text, 700) })) : { 결과: '자료실에서 관련 조항을 찾지 못했습니다', 자료수: (LIB || []).length }; }
    case 'list_library': return (LIB || []).map(d => ({ 이름: d.name, 종류: d.kind || '', 글자수: (d.text || '').length, 올린날: d.added || '' }));
    case 'read_library': { const d = (LIB || []).find(x => agN(x.name).includes(agN(i.name_contains))); if (!d) return { 오류: '그 이름의 문서가 없습니다' }; const o = +i.offset || 0; return { 이름: d.name, 전체글자: (d.text || '').length, offset: o, 본문: (d.text || '').slice(o, o + 6000) }; }
    case 'get_calendar': { const a = i.from || today(), b = i.to || a; const ev = allEvents().filter(e => e.date >= a && e.date <= b).sort((x, y) => x.date.localeCompare(y.date)); return { 건수: ev.length, 목록: ev.slice(0, 120).map(e => `${e.date} ${e.t}${e.kind ? ' [' + e.kind + ']' : ''}${e.done ? ' (완료)' : ''}`) }; }
    case 'get_day': { const d = i.date || today(); const ev = allEvents().filter(e => e.date === d).map(e => e.t + (e.done ? '(완료)' : '')); let meal = ''; try { if (typeof mealFor === 'function') meal = mealFor(d).map(x => `${x.kind}: ${x.dishes.map(cleanDish).join(', ')}`).join(' / '); } catch (e) { } return { 날짜: d, 일정: ev, 메모: (S.dayMemo || {})[d] || '', 급식: meal }; }
    case 'list_work_cards': { const w = wkD(); let L = w.cards; if (i.scope !== 'all') L = L.filter(c => c.me); if (i.open_only) L = L.filter(c => !c.done); if (i.text) L = L.filter(c => agN(c.title + c.dept).includes(agN(i.text))); return { 건수: L.length, 카드: L.slice(0, 60).map(c => ({ 제목: c.title, 부서: c.dept, 담당: c.me ? '나' : c.who, 기한: c.due || '', 완료: !!c.done, 단계: (c.steps || []).map(s => (s.d ? '✔' : '□') + s.t), 메모: b2Cut(c.memo, 200) })) }; }
    case 'get_budget': return S.budget.map(p => ({ 사업: p.name, 항목: p.lines.map(l => ({ 이름: l.item, 배정: +l.alloc || 0, 집행: spentOf(l), 잔액: (+l.alloc || 0) - spentOf(l), 기한: l.deadline || '' })) }));
    case 'list_training': { const yp = S.yp || { rows: [] }; return { 연간표: (yp.rows || []).map(r => ({ 이름: r.name, 기준: r.rule, 날짜: Object.keys(r.cells || {}).filter(k => r.cells[k] && r.cells[k].d).map(k => `${k}:${r.cells[k].d}${r.cells[k].ok ? '(완료)' : ''}`) })), 내연수: (S.training || []).map(t => `${t.title} ${t.type} ${t.hours}h ${t.done ? '이수 ' + (t.certNo || '') : '미이수'}`) }; }
    case 'get_worklog': { const a = i.from || today(), b = i.to || a; return { 일지: (S.wlog || []).filter(x => x.d >= a && x.d <= b).map(x => `${x.d} [${x.cat}] ${x.t}${x.m ? ' ' + x.m + '분' : ''}`), 마무리: Object.keys(S.wlogDay || {}).filter(d => d >= a && d <= b).map(d => ({ 날짜: d, ...S.wlogDay[d] })) }; }
    case 'list_notes': { const t = i.title_contains; if (!t) return S.notes.map(n => `${n.date} ${n.kind} ${n.title}`).slice(-40); return S.notes.filter(n => !n.lock && agN(n.title).includes(agN(t))).slice(0, 3).map(n => ({ 제목: n.title, 날짜: n.date, 본문: b2Cut(n.body, 2500), 결정: n.decisions, 후속: n.followups })); }
  }
  return { 오류: '알 수 없는 도구' };
}

/* ---- 도구: 쓰기(제안 카드) — agPlan/agDo 확장 ---- */
const _b2Plan = agPlan, _b2Do = agDo;
agPlan = function (a) {
  const i = a.input || {}, r = { ok: true, txt: '' }, bad = m => { r.ok = false; r.txt = m; return r; };
  switch (a.name) {
    case 'add_wk_card': r.txt = `업무 카드 추가: ${i.title}${i.dept ? ' (' + i.dept + ')' : ''}${i.who ? ' · 담당 ' + i.who : ''}${i.due ? ' · 기한 ' + i.due : ''}${(i.steps || []).length ? ' · 할 일 ' + i.steps.length + '개' : ''}`; return r;
    case 'update_wk_card': { const m = wkD().cards.filter(c => agN(c.title).includes(agN(i.title_contains))); if (m.length !== 1) return bad(`업무 카드 수정: 「${i.title_contains}」에 맞는 카드를 ${m.length ? '하나로 정할 수 없습니다' : '찾지 못했습니다'}`); a._c = m[0]; r.txt = `업무 카드 수정: ${m[0].title}` + (i.done != null ? (i.done ? ' · 완료 처리' : ' · 완료 해제') : '') + (i.due ? ' · 기한 ' + i.due : '') + (i.memo_append ? ' · 메모 추가' : '') + (i.add_step ? ' · 할 일 「' + i.add_step + '」 추가' : ''); return r; }
    case 'set_training_date': { const rows = ((S.yp || {}).rows || []).filter(x => agN(x.name).includes(agN(i.name_contains))); if (rows.length !== 1) return bad(`연수표: 「${i.name_contains}」 줄을 ${rows.length ? '하나로 정할 수 없습니다' : '찾지 못했습니다'}`); if (!/^[12][tspx]$/.test(i.col || '')) return bad('연수표: 칸 위치를 알 수 없습니다'); a._r = rows[0]; r.txt = `연수표: ${rows[0].name} · ${i.col[0]}학기 ${({ t: '교직원', s: '학생', p: '학부모', x: '기타·훈련' })[i.col[1]]} → ${agDate(i.date)}${i.count ? ' · ' + i.count + '명' : ''}`; return r; }
    case 'add_worklog': r.txt = `업무일지 기록: ${b2Cut(i.text, 60)} (${agDate(i.date)})`; return r;
    case 'add_day_memo': r.txt = `${agDate(i.date)} 메모 추가: ${b2Cut(i.text, 60)}`; return r;
  }
  return _b2Plan(a);
};
agDo = function (a) {
  const i = a.input || {};
  switch (a.name) {
    case 'add_wk_card': { const me = (S.profile.name || '').trim(); wkD().cards.push({ id: uid(), title: i.title, dept: i.dept || '', who: i.who || '', me: !i.who || (!!me && i.who.trim() === me), memo: i.memo || '', due: /^\d{4}-\d{2}-\d{2}$/.test(i.due || '') ? i.due : '', done: false, steps: (i.steps || []).map(t => ({ t, d: false })), src: '꿈송이' }); return; }
    case 'update_wk_card': { const c = a._c; if (i.done != null) c.done = !!i.done; if (/^\d{4}-\d{2}-\d{2}$/.test(i.due || '')) c.due = i.due; if (i.memo_append) c.memo = (c.memo ? c.memo + '\n' : '') + i.memo_append; if (i.add_step) (c.steps = c.steps || []).push({ t: i.add_step, d: false }); return; }
    case 'set_training_date': { const r = a._r; r.cells = r.cells || {}; const c = r.cells[i.col] = r.cells[i.col] || {}; c.d = agDate(i.date); if (i.count) c.n = i.count; return; }
    case 'add_worklog': (S.wlog = S.wlog || []).push({ id: uid(), d: agDate(i.date), t: i.text, cat: i.category || '업무', m: 0, card: '' }); return;
    case 'add_day_memo': { S.dayMemo = S.dayMemo || {}; const d = agDate(i.date); S.dayMemo[d] = (S.dayMemo[d] ? S.dayMemo[d] + '\n' : '') + i.text; return; }
  }
  return _b2Do(a);
};

/* ---- 비서 루프 ---- */
const B2_SYS = `당신은 교사 업무수첩 「업무파탈」 안의 비서 꿈송이입니다. 늘 존댓말로 짧고 정확하게 답합니다.
- 수첩과 상관없는 잡담·안부·고민 이야기·아이디어 브레인스토밍·글 다듬기도 편하게 받아 주세요. 이럴 땐 도구 없이 친구 같은 따뜻한 말투(존댓말)로 짧게 대화하고, 필요하면 되물어 주세요. 수첩 내용이 필요한 질문일 때만 도구를 쓰세요.
- 수첩에 대한 질문에 답하려면 먼저 도구로 수첩을 직접 확인하세요. 추측하거나 기억으로 지어내지 마세요. 필요하면 도구를 여러 번, 여러 개 연달아 부르세요.
- 규정·지침·학칙·조항을 묻는 질문은 당신의 영역이 아닙니다. "규정은 위쪽 📜 규정줍줍 탭에서 찾아 드려요"라고만 안내하세요. 문서에 없으면 "올려 주신 자료에서는 찾지 못했습니다"라고 말하고 일반 상식으로 단정하지 마세요. 조항 원문은 짧게 인용합니다.
- 일정·할 일·업무 카드·예산·연수표를 넣거나 고치라는 요청은 쓰기 도구로 "제안"하세요. 제안은 사용자가 [적용]을 눌러야 반영됩니다. 날짜는 YYYY-MM-DD로, "내일·다음 주 금요일"은 오늘 날짜 기준으로 계산하세요. 삭제도 delete_cal_item으로 "제안"만 하며 사용자가 [적용]을 눌러야 지워집니다.
- 정리·요약·비교를 부탁받으면 읽은 내용을 표나 목록으로 깔끔하게 정리하세요. 어느 화면에서 볼 수 있는지 go_to로 링크를 붙이세요.
- 요청이 일정 등록·수정이면 add_cal_item/edit_cal_item을 우선 쓰세요(메모·구분·기간·매주 반복까지 지원). 일정을 옮기라면 먼저 get_items로 대상을 확인하고 edit_cal_item(new_date)으로 제안합니다.
- 공문·메신저 글을 길게 붙여 주면 안에 든 일정·기한·준비물을 모두 뽑아 항목마다 add_cal_item을 한꺼번에 부르세요. 연도가 없으면 오늘 기준 가장 가까운 미래로 보고, 장소·시간·준비물은 memo에 넣으세요.
- "오늘 뭐 해?", "이번 주 정리", "뭐부터 할까" 같은 말에는 daily_brief로 확인한 뒤 우선순위를 매겨 답하고, 가장 먼저 할 일 하나를 짚어 주세요. 밀린 일이 있으면 옮길 날짜까지 제안하세요.
- 답은 먼저 결론 한 줄, 그다음 필요한 만큼만 목록·표로. 불필요한 인사·반복은 줄이세요.
- 행사·업무 준비를 통째로 부탁하면("곡선제 준비 계획 짜줘") plan_project로 행사일 기준 단계별 할 일을 한 번에 제안하세요.
- 화면 모양을 바꿔 달라는 말("캘린더를 맨 위로", "업무들 숨겨", "메뉴 이름 바꿔", "일요일부터 시작", "구분에 회의 추가")은 set_layout·set_menu·set_calendar·edit_kind로, 인수인계서·회고·기록 모으기는 make_report로 본문을 만들어 정리해 보여 주세요. 가져오기·내보내기·알림·행사 템플릿 창은 open_tool로 열어 줍니다. 주간·월간 보기는 show_calendar_view입니다.
- 정보가 모호하면 도구 호출 전에 한 가지만 되물으세요. 학생·교직원의 실명 명단은 이 수첩에 없으며 만들지도 않습니다.`;
async function b2Call(body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': agKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await agErr(r));
  return r.json();
}
const B2_LBL = { search_site: '사이트 검색', find_rule: '규정 찾기', list_library: '자료실', read_library: '자료 읽기', get_calendar: '캘린더', get_day: '하루 보기', list_work_cards: '내 업무 카드', get_budget: '예산', list_training: '연수표', list_notes: '회의·연수 노트', get_worklog: '업무일지' };
async function b2Loop(q) {
  const hist = CH.slice(-9, -1).filter(m => m.text).map(m => (m.role === 'me' ? '사용자: ' : '꿈송이: ') + b2Cut(m.text, 300)).join('\n');
  const msgs = [{ role: 'user', content: agContext() + (hist ? '\n\n[앞선 대화]\n' + hist : '') + '\n\n[요청]\n' + q }];
  const tools = [...B2_READ.filter(x => x.name !== 'find_rule'), ...AG_TOOLS, ...B2_WRITE, B2_NAV], acts = [], links = [], seen = [];
  let text = '';
  for (let n = 0; n < 12; n++) {
    const j = await b2Call({ model: B2_MODEL(), max_tokens: 3000, system: B2_SYS, tools, messages: msgs });
    msgs.push({ role: 'assistant', content: j.content });
    const t = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim(); if (t) text = t;
    const uses = (j.content || []).filter(c => c.type === 'tool_use');
    if (j.stop_reason !== 'tool_use' || !uses.length) break;
    const res = uses.map(u => {
      let out;
      try {
        if (B2_READ.some(x => x.name === u.name)) { out = JSON.stringify(b2Run(u.name, u.input || {})); const l = B2_LBL[u.name] + (u.name === 'find_rule' || u.name === 'search_site' ? '(' + (u.input.query || '') + ')' : ''); if (!seen.includes(l)) seen.push(l); }
        else if (u.name === 'go_to') { if (B2_NAVS.includes(u.input.hash)) links.push({ src: '바로가기', html: esc(u.input.label || u.input.hash), text: u.input.label || '', ref: u.input.hash }); out = '링크를 붙였습니다'; }
        else { acts.push({ name: u.name, input: u.input || {} }); out = '제안 목록에 담았습니다. 사용자가 [적용]을 눌러야 반영됩니다. 같은 제안을 다시 부르지 마세요.'; }
      } catch (e) { out = '도구 오류: ' + e.message; }
      return { type: 'tool_result', tool_use_id: u.id, content: b2Cut(out, 9000) };
    });
    msgs.push({ role: 'user', content: res });
  }
  if (!text && !acts.length) return false;
  acts.forEach(a => { a.plan = agPlan(a); });
  const rb = [];
  const m = { role: 'bot', q, text: (text || '이렇게 처리하려고 합니다.') + (seen.length ? '\n\n🔎 확인한 곳: ' + seen.join(' · ') : ''), blocks: [...rb, ...links] };
  if (acts.length) { m.act = acts; m.applied = false; }
  CH.push(m); return true;
}

/* ---- 챗봇 입구 교체: 키 있으면 비서 루프, 없으면 규정줍줍 + 기존 찾기 ---- */
ask1 = async function (q) {
  q = q.trim(); if (!q || busy) return;
  CH.push({ role: 'me', text: q }); busy = true; renderChat();
  if (agKey()) { let ok = false; try { ok = await b2Loop(q); } catch (e) { CH.push({ role: 'bot', text: '비서 기능을 쓰지 못했습니다(' + e.message + '). 대신 수첩에서 직접 찾아 드릴게요.', blocks: [] }); } if (ok) { busy = false; renderChat(); return; } }
  const rb = [];
  const dir = direct(q), hits = search(q), seenT = new Set(rb.map(b => b.text));
  const blocks = [...rb, ...dir.map(d => ({ src: d.src, text: d.text, ref: d.ref })), ...hits.filter(h => !seenT.has(h.c.text)).map(h => ({ src: h.c.src, text: h.c.text, ref: h.c.ref }))];
  const text = blocks.length ? '' : '올려 주신 자료에서 찾지 못했습니다. 규정·지침 파일은 [자료실]에 올려 두면 조항 단위로 찾아 드립니다. 다른 말로 한 번 더 물어봐 주세요.';
  busy = false; CH.push({ role: 'bot', q, blocks, text }); renderChat();
};

/* ---- 챗봇 안에서 모델 고르기 ---- */
const B2_MODELS = [['claude-haiku-5-5', '빠르고 저렴 · 기본 (Haiku)'], ['claude-sonnet-5-5', '균형 (Sonnet)'], ['claude-opus-5-5', '가장 똑똑함·비쌈 (Opus)']];
const _b2Kb = chatKeyBar;
chatKeyBar = function () {
  const h = _b2Kb.apply(this, arguments);
  if (!agKey() || window.__keyEdit) return h;
  return h + `<div class="ckb on"><span>🧠 모델</span><select data-b2model aria-label="비서 모델">${B2_MODELS.map(([v, l]) => `<option value="${v}" ${B2_MODEL() === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
};
document.addEventListener('change', e => { if (e.target.matches('[data-b2model]')) { localStorage.setItem('tf.botModel', e.target.value); toast('모델을 바꿨습니다: ' + e.target.selectedOptions[0].textContent); } });

/* ---- 챗봇에서 바로 규정 올리기(📎) → 규정줍줍이 찾는 자료실에 '규정'으로 저장 ---- */
document.addEventListener('change', async e => {
  if (e.target.id !== 'chatUp') return; const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return;
  try { await ingestFiles(fs, { kind: '규정', from: 'lib', noAsk: true }); toast('규정으로 올렸습니다. 이제 바로 물어보세요.'); } catch (er) { toast('올리지 못했습니다: ' + (er.message || er)); }
}, true);

/* 꿈송이 비서 확장(v165): 화면 구조·메뉴·캘린더 옵션·구분 목록을 말로 바꾸기, 보고서(인수인계서·회고·기록 모음) 만들기, 도구 창 열기, 캘린더 보기 전환.
   쓰기 도구는 모두 「제안 카드 → 적용」을 눌러야 반영됩니다. */
const B4_BLK = { brief: '브리핑 카드', cal: '캘린더', soon: '이번 주 기한', work: '업무들', sb: '곡선중 카드' };
const B4_KEYS = Object.keys(B4_BLK), B4_MK = LY_MENU.map(x => x[0]);
B2_READ.push({ name: 'make_report', description: '보고서 본문을 만든다. type: handover(인수인계서), retro(연말 회고), records(낱말·기간으로 기록 모으기). 만든 본문을 답에 정리해 보여 주거나 다듬어 준다.', input_schema: { type: 'object', properties: { type: { type: 'string', enum: ['handover', 'retro', 'records'] }, query: { type: 'string', description: 'records일 때 찾을 낱말' }, from: { type: 'string' }, to: { type: 'string' } }, required: ['type'] } });
B2_LBL.make_report = '보고서';
B2_WRITE.push(
  { name: 'set_layout', description: '오늘 화면의 칸을 바꾼다. block: brief(브리핑 카드)/cal(캘린더)/soon(이번 주 기한)/work(업무들)/sb(곡선중 카드). action: up(위로)/down(아래로)/hide/show/rename(name 필요)/open_default(처음 펼침)/close_default(처음 접힘).', input_schema: { type: 'object', properties: { block: { type: 'string', enum: B4_KEYS }, action: { type: 'string', enum: ['up', 'down', 'hide', 'show', 'rename', 'open_default', 'close_default'] }, name: { type: 'string' } }, required: ['block', 'action'] } },
  { name: 'set_menu', description: '위쪽 메뉴 이름을 바꾸거나(menu_key+name, 비우면 원래대로) 앱을 열 때 처음 보일 화면(start_key)을 정한다. 키: ' + B4_MK.join(', '), input_schema: { type: 'object', properties: { menu_key: { type: 'string', enum: B4_MK }, name: { type: 'string' }, start_key: { type: 'string', enum: B4_MK } } } },
  { name: 'set_calendar', description: '캘린더 옵션: week_start(monday/sunday), default_view(month/week/upcoming).', input_schema: { type: 'object', properties: { week_start: { type: 'string', enum: ['monday', 'sunday'] }, default_view: { type: 'string', enum: ['month', 'week', 'upcoming'] } } } },
  { name: 'edit_kind', description: '일정 구분 목록(업무/수업/개인/기타…)을 고친다. action: add / rename(name→new_name, 기존 일정의 구분도 함께 바뀜) / delete.', input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['add', 'rename', 'delete'] }, name: { type: 'string' }, new_name: { type: 'string' } }, required: ['action', 'name'] } },
  { name: 'open_tool', description: '도구 창을 열어 준다(사용자가 [적용]을 누르면 열림). tool: templates(행사 템플릿)/import(가져오기)/export(내보내기)/notifications(알림 설정)/layout(화면 구조 편집)/handover/retro/records. 알림은 브라우저 허가 창이 필요해 이 방법으로만 켤 수 있다.', input_schema: { type: 'object', properties: { tool: { type: 'string', enum: ['templates', 'import', 'export', 'notifications', 'layout', 'handover', 'retro', 'records'] } }, required: ['tool'] } },
  { name: 'show_calendar_view', description: '캘린더 보기를 월간/주간/다가오는 업무로 바꾸고 캘린더 화면으로 이동', input_schema: { type: 'object', properties: { view: { type: 'string', enum: ['month', 'week', 'upcoming'] }, date: { type: 'string', description: 'YYYY-MM-DD, 그 날짜가 있는 달·주로 이동' } }, required: ['view'] } }
);
const _b4Run = b2Run;
b2Run = function (name, i) {
  if (name === 'make_report') { const a = tfOk(i.from) ? i.from : tfSchoolStart(), b = tfOk(i.to) ? i.to : today(); const t = i.type === 'handover' ? tfHandText() : i.type === 'retro' ? tfRetroText(a, b) : tfRecText(i.query, a, b); return { 본문: b2Cut(t, 8000) }; }
  return _b4Run(name, i);
};
const B4_TOOL = { templates: () => tfTplDlg(), import: () => tfImpDlg(), export: () => tfExpDlg(), notifications: () => tfNotifDlg(), layout: () => lyDlg(), handover: () => tfRepDlg('hand'), retro: () => tfRepDlg('retro'), records: () => tfRepDlg('rec') };
const B4_TN = { templates: '행사 템플릿', import: '가져오기', export: '내보내기', notifications: '알림 설정', layout: '화면 구조 편집', handover: '인수인계서', retro: '연말 회고', records: '기록 모아보기' };
const _b4Plan = agPlan, _b4Do = agDo, B4_VN = { month: '월간', week: '주간', upcoming: '다가오는 내 업무' };
agPlan = function (a) {
  const i = a.input || {}, r = { ok: true, txt: '' }, bad = m => { r.ok = false; r.txt = m; return r; };
  switch (a.name) {
    case 'set_layout': { if (!B4_BLK[i.block]) return bad('칸 이름을 알 수 없습니다'); if (i.action === 'rename' && !(i.name || '').trim()) return bad('바꿀 이름이 없습니다'); r.txt = `오늘 화면 「${B4_BLK[i.block]}」 칸: ` + ({ up: '위로 한 칸', down: '아래로 한 칸', hide: '숨기기', show: '다시 보이기', rename: `이름 → ${i.name}`, open_default: '처음부터 펼침', close_default: '처음엔 접힘' }[i.action] || i.action); return r; }
    case 'set_menu': { const c = []; if (i.menu_key && B4_MK.includes(i.menu_key)) c.push(`메뉴 「${LY_MENU.find(x => x[0] === i.menu_key)[1]}」 이름 → ${i.name ? i.name : '(원래대로)'}`); if (i.start_key && B4_MK.includes(i.start_key)) c.push(`시작 화면 → ${LY_MENU.find(x => x[0] === i.start_key)[1]}`); if (!c.length) return bad('바꿀 메뉴가 없습니다'); r.txt = c.join(' · '); return r; }
    case 'set_calendar': { const c = []; if (i.week_start) c.push('한 주 시작 → ' + (i.week_start === 'sunday' ? '일요일' : '월요일')); if (i.default_view) c.push('처음 보기 → ' + B4_VN[i.default_view]); if (!c.length) return bad('바꿀 옵션이 없습니다'); r.txt = '캘린더: ' + c.join(' · '); return r; }
    case 'edit_kind': { const ks = (ncSeed(), cusKinds()), ex = ks.find(k => k.n === i.name); if (i.action === 'add') { if (ex) return bad(`구분 「${i.name}」은 이미 있습니다`); r.txt = `구분 추가: ${i.name}`; } else { if (!ex) return bad(`구분 「${i.name}」을 찾지 못했습니다`); if (i.action === 'rename') { if (!(i.new_name || '').trim()) return bad('새 이름이 없습니다'); r.txt = `구분 이름 변경: ${i.name} → ${i.new_name} (이미 넣은 일정도 같이 바뀜)`; } else r.txt = `구분 삭제: ${i.name} (기존 일정의 구분 글자는 남음)`; } return r; }
    case 'open_tool': if (!B4_TOOL[i.tool]) return bad('열 수 없는 도구입니다'); r.txt = `「${B4_TN[i.tool]}」 창 열기`; return r;
    case 'show_calendar_view': if (!B4_VN[i.view]) return bad('보기 이름을 알 수 없습니다'); r.txt = `캘린더를 ${B4_VN[i.view]} 보기로 이동${tfOk(i.date) ? ' (' + i.date + ')' : ''}`; return r;
  }
  return _b4Plan(a);
};
agDo = function (a) {
  const i = a.input || {}, L = lyD();
  switch (a.name) {
    case 'set_layout': {
      const all = LY_BLOCKS.map(b => b[0]), ord = [...(L.blocks || []).filter(k => all.includes(k)), ...all.filter(k => !(L.blocks || []).includes(k))], k = i.block, x = ord.indexOf(k);
      if (i.action === 'up' && x > 0) { [ord[x], ord[x - 1]] = [ord[x - 1], ord[x]]; L.blocks = ord; } else if (i.action === 'down' && x < ord.length - 1) { [ord[x], ord[x + 1]] = [ord[x + 1], ord[x]]; L.blocks = ord; }
      else if (i.action === 'hide') (L.hide = L.hide || {})[k] = true; else if (i.action === 'show') { if (L.hide) delete L.hide[k]; }
      else if (i.action === 'rename') (L.name = L.name || {})[k] = i.name.trim();
      else if (i.action === 'open_default' || i.action === 'close_default') { (L.open = L.open || {})[k] = i.action === 'open_default'; UI[{ cal: 'nccal', soon: 'ncsoon', work: 'ncwork' }[k]] = undefined; }
      return;
    }
    case 'set_menu': { if (i.menu_key && B4_MK.includes(i.menu_key)) { L.nav = L.nav || {}; if ((i.name || '').trim()) L.nav[i.menu_key] = i.name.trim(); else delete L.nav[i.menu_key]; } if (i.start_key && B4_MK.includes(i.start_key)) L.start = i.start_key; return; }
    case 'set_calendar': { if (i.week_start) { L.ws = i.week_start === 'sunday' ? 0 : 1; UI.wk = undefined; } if (i.default_view) { L.v = { month: 'm', week: 'w', upcoming: 'up' }[i.default_view]; UI.calv = L.v; } return; }
    case 'edit_kind': { const ks = (ncSeed(), cusKinds()); if (i.action === 'add') ks.push({ n: i.name, b: 'event' }); else { const k = ks.find(z => z.n === i.name); if (!k) return; if (i.action === 'rename') { S.items.forEach(x => { if (x.tag === i.name) x.tag = i.new_name.trim(); }); k.n = i.new_name.trim(); } else ks.splice(ks.indexOf(k), 1); } return; }
    case 'open_tool': setTimeout(B4_TOOL[i.tool], 250); return;
    case 'show_calendar_view': { UI.calv = { month: 'm', week: 'w', upcoming: 'up' }[i.view]; if (tfOk(i.date)) { UI.cal = i.date.slice(0, 7); UI.day = i.date; UI.wk = tfMon(i.date); } UI.nccal = true; location.hash = '#/cal'; return; }
  }
  return _b4Do(a);
};

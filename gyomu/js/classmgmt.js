'use strict';
/* ===== 업무파탈 classmgmt.js : 학급 관리 (담임·교과 교사 선택형)
   - 학생 정보는 이 기기의 IndexedDB('cmdata')에만 저장. S(localStorage)·클라우드 동기화·일반 백업에는 들어가지 않음.
   - 메뉴 이름·기능 이름·구분 항목·안내문 틀은 모두 고칠 수 있고, 기능은 켜고 끌 수 있으며 내 기능도 만들 수 있음. ===== */
const CMK = 'cmdata';
let CM = null, cmReady = false, cmUnl = false, cmT = 0;
const cmNew = () => ({ classes: [], att: {}, logs: {}, grid: {}, duty: [], ev: [], mood: {}, pick: {}, list: {}, pin: '', fired: {} });
CM = cmNew();
const cmCfg = () => { const c = (S.cm = S.cm || {}); if (c.title === undefined) Object.assign(c, { on: true, title: '학급 관리', mods: ['att', 'prof', 'coll', 'duty', 'cns', 'spec', 'ev', 'bday', 'tpl'], names: {}, lab: {}, tags: {}, custom: [], links: [], tpl: null, cur: '', mod: 'roster', fixOn: 1 }); if (!c.fixOn) { c.on = true; c.fixOn = 1; } return c; };
const cmSave = () => { if (!cmReady) return; clearTimeout(cmT); cmT = setTimeout(() => idb.set(CMK, CM), 250); };
const cmDo = () => { cmSave(); TF.render && TF.render(); };
const cmLocked = () => !!CM.pin && !cmUnl;
const cmQ = id => document.getElementById(id);
const cmCopyTxt = t => { try { navigator.clipboard.writeText(t); toast('복사했습니다.'); } catch (e) { toast('복사하지 못했습니다.'); } };

/* ---------- 기능 목록 (이름·내용은 사용자가 고칠 수 있음) ---------- */
const CM_MODS = [
  { id: 'att', i: '🗓', n: '출결', t: 'att', g: '담임', d: '결석·지각·조퇴·결과, 사유, 서류 제출, 월별 집계' },
  { id: 'prof', i: '🧑', n: '학생 한 장 요약', t: 'prof', g: '담임', d: '학생을 고르면 출결·상담·특이사항·칭찬이 한 화면에 모여요' },
  { id: 'coll', i: '📥', n: '제출·수합 현황', t: 'grid', g: '공통', d: '동의서·신청서·과제 제출 여부를 번호 칩으로 체크, 미제출자 번호 복사' },
  { id: 'duty', i: '🧹', n: '1인 1역·청소 당번', t: 'duty', g: '담임', d: '역할·구역별 담당, 요일·날짜 지정, 순환, 알림' },
  { id: 'cns', i: '💬', n: '상담', t: 'log', g: '담임', d: '날짜·유형·내용·후속 조치(후속 날짜는 오늘 화면에 알려줘요)', tags: ['학생', '학부모', '진로', '학업', '교우', '기타'] },
  { id: 'spec', i: '📌', n: '특이사항', t: 'log', g: '담임', d: '학생별 특이사항·유의점', tags: ['건강', '가정', '교우', '학습', '생활', '기타'] },
  { id: 'praise', i: '🌟', n: '칭찬·지도 기록', t: 'log', g: '담임', d: '칭찬과 지도 내용을 날짜별로', tags: ['칭찬', '지도', '격려'] },
  { id: 'par', i: '📞', n: '학부모 연락 기록', t: 'log', g: '담임', d: '연락한 날짜·방법·내용·회신 여부', tags: ['전화', '문자', '면담', '메신저'] },
  { id: 'mtg', i: '🗣', n: '학급 회의 기록', t: 'list', g: '담임', d: '안건·결정·담당자 (체크하면 완료)' },
  { id: 'goal', i: '🎯', n: '학급 목표·칭찬 스티커', t: 'list', g: '담임', d: '목표를 적고 달성하면 체크' },
  { id: 'bday', i: '🎂', n: '생일', t: 'bday', g: '담임', d: '명렬의 생일 칸으로 곧 다가오는 생일 안내' },
  { id: 'tel', i: '☎️', n: '비상 연락 카드', t: 'tel', g: '담임', d: '명렬의 보호자 연락처를 모아 보고 길게 눌러 복사' },
  { id: 'tpl', i: '📝', n: '안내문 틀', t: 'tpl', g: '담임', d: '문자·알림 문구 틀에 이름만 바꿔 복사' },
  { id: 'ev', i: '📅', n: '행사 (학급·학년)', t: 'ev', g: '공통', d: '행사 일정 — 한글·엑셀·PDF 파일을 끌어다 놓으면 날짜를 찾아 줘요' },
  { id: 'mood', i: '⭐', n: '수업 태도 칩', t: 'mood', g: '교과', d: '수업 직후 참여⭐·주의⚠를 한 번에 표시' },
  { id: 'perf', i: '📊', n: '수행평가 진행판', t: 'grid', g: '교과', d: '반×학생 제출·채점 상태 한눈에', lab: ['미제출', '제출', '채점 완료'] },
  { id: 'pick', i: '🎲', n: '수업 중 호명 뽑기', t: 'pick', g: '교과', d: '공정하게 호명, 이미 뽑힌 학생은 제외' },
  { id: 'obs', i: '🔍', n: '관찰 기록 (생기부 근거)', t: 'log', g: '공통', d: '교과 세특·행발 근거 한 줄 기록', tags: ['참여', '탐구', '협력', '성장', '기타'] },
  { id: 'absent', i: '🩹', n: '결시·보충 관리', t: 'log', g: '교과', d: '시험 결시자·보충 일정', tags: ['결시', '보충', '완료'] },
  { id: 'intv', i: '🪑', n: '학생 면담 메모', t: 'log', g: '교과', d: '교과 시간 면담 기록', tags: ['면담', '진로', '학습', '기타'] },
  { id: 'qna', i: '📨', n: '학부모 문의 메모', t: 'log', g: '교과', d: '교과 관련 문의와 회신 여부', tags: ['문의', '회신 필요', '회신 완료'] }
];
const CM_SETS = { '담임': ['att', 'prof', 'coll', 'duty', 'cns', 'spec', 'ev', 'bday', 'tpl'], '교과': ['mood', 'perf', 'pick', 'coll', 'ev', 'obs'], '둘 다': ['att', 'prof', 'coll', 'duty', 'cns', 'spec', 'ev', 'mood', 'perf', 'pick', 'obs'] };
const CM_TPL = [{ n: '상담 안내', t: '{이름} 학부모님 안녕하세요. 담임교사입니다. {이름} 학생 관련하여 상담드리고 싶어 연락드립니다. 편하신 시간을 알려 주시면 맞추겠습니다.' }, { n: '서류 제출 안내', t: '{이름} 학생의 결석 관련 서류(증빙)가 아직 제출되지 않았습니다. 확인 후 제출 부탁드립니다.' }, { n: '체험학습 안내', t: '{이름} 학생 체험학습 신청서와 보고서 제출 기한을 안내드립니다.' }];
const cmAll = () => CM_MODS.concat((cmCfg().custom || []).map(c => ({ id: c.id, i: '⭐', n: c.n, t: c.t, g: '내 기능', d: '내가 만든 기능', tags: c.tags, custom: 1 })));
const cmMod = id => cmAll().find(m => m.id === id);
const cmOn = id => cmCfg().mods.includes(id);
const cmName = m => cmCfg().names[m.id] || m.n;
const cmLab = m => (cmCfg().lab[m.id]) || (m.t === 'att' ? ['출석', '결석', '지각', '조퇴', '결과'] : m.t === 'mood' ? ['', '⭐ 참여', '⚠ 주의'] : m.lab || (m.id === 'perf' ? ['미제출', '제출', '채점 완료'] : ['미완료', '완료']));
const cmTags = m => cmCfg().tags[m.id] || m.tags || ['기록'];
const cmOnMods = () => cmAll().filter(m => cmOn(m.id));

/* ---------- 반·학생 ---------- */
const cmCl = () => { const c = cmCfg(); return CM.classes.find(x => x.id === c.cur) || CM.classes[0] || null; };
const cmStus = c => (c ? c.stu.slice().sort((a, b) => (+a.no || 0) - (+b.no || 0)) : []);
const cmSn = (c, id) => { const s = c && c.stu.find(x => x.id === id); return s ? `${s.no}번 ${s.name}` : '(삭제된 학생)'; };
const cmOpts = (c, sel, all) => (all ? `<option value="">${all}</option>` : '') + cmStus(c).map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${s.no}번 ${esc(s.name)}</option>`).join('');
const cmBd = s => { const v = String((s && s.bd) || '').replace(/\D/g, ''); if (v.length === 8) return { m: +v.slice(4, 6), d: +v.slice(6) }; if (v.length === 4) return { m: +v.slice(0, 2), d: +v.slice(2) }; return null; };
const cmDow = '일월화수목금토';

/* ---------- 불러오기 ---------- */
cmInit();
idb.get(CMK).then(v => { CM = Object.assign(cmNew(), v || {}); cmReady = true; if (DEMO) cmSeed(); cmInit(); cmRefresh(); });
function cmRefresh() { if (/^#\/(cm|today)?$/.test(location.hash || '#/today') || !location.hash) TF.render && TF.render(); }
function cmInit() { if (cmCfg().on && typeof ORD_NAV !== 'undefined' && !ORD_NAV.some(x => x[0] === 'cm')) ORD_NAV.push(['cm', cmCfg().title]); }
function cmSeed() {
  const c = cmCfg(); if (CM.classes.length || c.seeded) return; c.seeded = 1; c.on = true; c.mods = CM_SETS['둘 다'].concat(['bday', 'tpl']);
  const nm = ['가온', '나래', '다온', '라온', '마루', '바다', '사랑', '아름', '자람', '하늘']; const cl = { id: uid(), name: '체험반', stu: nm.map((n, i) => ({ id: uid(), no: i + 1, name: n + '(예시)', bd: '', tel: '', memo: '' })) };
  CM.classes.push(cl); c.cur = cl.id; const t = today(); CM.att[cl.id] = { [t]: { [cl.stu[2].id]: { s: 2, r: '병원 진료', d: false } } };
  CM.logs.cns = [{ id: uid(), cls: cl.id, stu: cl.stu[0].id, date: t, tag: '학생', text: '진로 고민 상담 (체험판 예시)', fu: t, fd: false }]; cmSave(); save(true);
}

/* ---------- 메뉴 연결 ---------- */
const _cmDc = decoCard;
decoCard = function () { const h = _cmDc(); return h.replace('<div class="dset"><b>💻 컴퓨터 켜면', cmSet() + '<div class="dset"><b>💻 컴퓨터 켜면'); };
function cmSet() {
  const c = cmCfg();
  return `<div class="dset"><label class="chk"><input type="checkbox" data-act="cmOn" ${c.on ? 'checked' : ''}> <b>🏫 ${esc(c.title)} 메뉴</b> — 담임·교과 교사용 학급 도구 (선택). 켜면 위쪽 메뉴에 나타납니다.</label><p class="mu">🔒 학생 정보는 <b>이 기기에만</b> 저장되며 서버·클라우드로 전송되지 않습니다.</p></div>`;
}

/* ===================== 화면 ===================== */
function cmView() {
  const c = cmCfg();
  if (!c.on) return `<div class="bh"><h2>${esc(c.title)}</h2></div><p class="mu">설정에서 「${esc(c.title)} 메뉴」를 켜면 사용할 수 있어요.</p><div class="tools"><button class="btn pri" data-act="cmOn">지금 켜기</button></div>`;
  if (!cmReady) return `<div class="bh"><h2>${esc(c.title)}</h2></div><p class="mu">불러오는 중…</p>`;
  const lock = `<div class="cmlock">🔒 <b>이 기기에만 저장됩니다.</b> 학생 정보는 서버·클라우드로 전송되지 않고, 일반 백업·동기화에도 들어가지 않습니다. 분실에 대비해 기기 화면 잠금을 꼭 설정하세요.</div>`;
  if (cmLocked()) return `<div class="bh"><h2>${esc(c.title)}</h2></div>${lock}<div class="cmpin"><input id="cmpin" type="password" inputmode="numeric" placeholder="암호(PIN)" aria-label="암호"> <button class="btn pri" data-act="cmUnlock">열기</button></div>`;
  const mods = cmOnMods(), cur = c.mod || 'roster', cl = cmCl();
  const tab = (k, l) => `<button class="cmtab ${cur === k ? 'on' : ''}" data-act="cmTab" data-k="${k}">${l}</button>`;
  const tabs = tab('roster', '🧑 명렬') + mods.map(m => tab(m.id, `${m.i} ${esc(cmName(m))}`)).join('') + tab('links', '🔗 연동 사이트') + tab('mods', '➕ 기능 켜기') + tab('sec', '🔒 보안·백업');
  const needCls = !['links', 'mods', 'sec', 'ev', 'tpl'].includes(cur);
  const chips = CM.classes.length ? `<div class="cmcls">${CM.classes.map(x => `<button class="cmchip ${cl && x.id === cl.id ? 'on' : ''}" data-act="cmCls" data-id="${x.id}">${esc(x.name)}</button>`).join('')}<button class="cmchip" data-act="cmClsAdd">＋ 반</button></div>` : '';
  let body = '';
  try {
    if (cur === 'roster') body = cmRoster(cl); else if (cur === 'links') body = cmLinks(cl); else if (cur === 'mods') body = cmMods(); else if (cur === 'sec') body = cmSec();
    else { const m = cmMod(cur); if (!m || !cmOn(cur)) body = '<p class="mu">이 기능은 꺼져 있어요. 「➕ 기능 켜기」에서 켜 주세요.</p>'; else if (needCls && !cl) body = '<p class="mu">먼저 「🧑 명렬」에서 반과 학생을 넣어 주세요.</p>'; else body = cmBody(m, cl); }
  } catch (e) { body = '<p class="mu">화면을 그리지 못했습니다: ' + esc(e.message) + '</p>'; }
  return `<div class="bh"><h2>${esc(c.title)} <button class="btn sm" data-act="cmTitle" aria-label="메뉴 이름 고치기">✏️</button></h2></div>${lock}<div class="cmtabs" role="tablist">${tabs}</div>${needCls || cur === 'roster' ? chips : ''}<div class="cmbody">${body}</div>`;
}
function cmBody(m, cl) {
  const head = `<div class="cmmh"><b>${m.i} ${esc(cmName(m))}</b><button class="btn sm" data-act="cmModEdit" data-id="${m.id}">⚙️ 이름·항목 고치기</button></div><p class="mu">${esc(m.d)}</p>`;
  const f = { att: cmAtt, prof: cmProf, grid: cmGrid, duty: cmDuty, log: cmLog, list: cmList, bday: cmBday, tel: cmTel, tpl: cmTpl, ev: cmEv, mood: cmMood, pick: cmPick }[m.t];
  return head + f(m, cl);
}
Object.assign(A, {
  cmOn(el) { const c = cmCfg(); if (!c.on && !c.mods.length) { c.on = true; cmInit(); save(true); return ask('어떤 용도로 쓰세요?', [{ k: 'r', label: '기본 기능 세트(나중에 마음대로 켜고 끌 수 있어요)', type: 'select', opts: ['담임', '교과', '둘 다'], val: '담임' }], o => { c.mods = CM_SETS[o.r].slice(); cmInit(); save(true); location.hash = '#/cm'; commit(); }, '시작'); } c.on = !c.on; if (c.on) cmInit(); commit(); },
  cmTitle() { const c = cmCfg(); ask('메뉴 이름', [{ k: 'n', label: '이름 (예: 우리 반, 담임 수첩)', val: c.title, req: 1 }], o => { c.title = o.n.trim() || c.title; const x = typeof ORD_NAV !== 'undefined' && ORD_NAV.find(y => y[0] === 'cm'); if (x) x[1] = c.title; commit(); }); },
  cmTab(el) { cmCfg().mod = el.dataset.k; save(true); TF.render(); },
  cmCls(el) { cmCfg().cur = el.dataset.id; save(true); TF.render(); },
  cmClsAdd() { ask('반 추가', [{ k: 'n', label: '반 이름 (예: 2-3 또는 3반)', req: 1 }], o => { const x = { id: uid(), name: o.n.trim(), stu: [] }; CM.classes.push(x); cmCfg().cur = x.id; save(true); cmDo(); }); },
  cmClsRen() { const x = cmCl(); if (x) ask('반 이름', [{ k: 'n', label: '이름', val: x.name, req: 1 }], o => { x.name = o.n.trim() || x.name; cmDo(); }); },
  cmClsDel() { const x = cmCl(); if (x) sure('「' + x.name + '」 반과 이 반의 모든 학급 기록을 지울까요? (되돌릴 수 없습니다)', () => { CM.classes = CM.classes.filter(y => y.id !== x.id); delete CM.att[x.id]; delete CM.mood[x.id]; delete CM.pick[x.id]; Object.keys(CM.logs).forEach(k => { CM.logs[k] = CM.logs[k].filter(e => e.cls !== x.id); }); Object.keys(CM.grid).forEach(k => delete CM.grid[k][x.id]); Object.keys(CM.list).forEach(k => { CM.list[k] = CM.list[k].filter(e => e.cls !== x.id); }); CM.duty = CM.duty.filter(e => e.cls !== x.id); cmCfg().cur = ''; save(true); cmDo(); }); },
  cmCopy(el) { cmCopyTxt(el.dataset.t); }
});

/* ---------- 명렬 (엑셀) ---------- */
function cmRoster(cl) {
  const drop = `<div class="cmdrop" data-cmdrop="roster">📥 <b>엑셀 명렬 파일을 여기에 끌어다 놓으세요</b> (또는 아래 버튼) — 시트 하나가 한 반이 됩니다</div>
  <div class="tools"><button class="btn sm" data-act="cmTpl">📄 엑셀 양식 내려받기</button><label class="btn sm file">📂 엑셀·CSV 올리기<input type="file" accept=".xlsx,.xls,.csv,.txt" data-cmi="rosterfile"></label><button class="btn sm" data-act="cmPaste">📋 붙여넣기로 넣기</button><button class="btn sm" data-act="cmClsAdd">＋ 반 만들기</button></div>`;
  if (!cl) return drop + '<p class="mu">아직 반이 없어요. 양식을 내려받아 학생 이름을 채워 올리거나, 반을 직접 만들어 한 명씩 넣을 수 있어요. (열: 번호 · 이름 · 생일 · 보호자 연락처 · 메모)</p>';
  const S2 = cmStus(cl);
  return `${drop}<div class="tools"><button class="btn sm" data-act="cmStuAdd">＋ 학생 한 명</button><button class="btn sm" data-act="cmClsRen">✏️ 반 이름</button><button class="btn sm" data-act="cmClsDel">🗑 이 반 삭제</button></div>
  <p class="mu">${esc(cl.name)} · ${S2.length}명</p>
  ${S2.map(s => `<div class="cmr"><b>${s.no}번 ${esc(s.name)}</b><span class="mu">${esc([s.bd ? '🎂' + s.bd : '', s.tel, s.memo].filter(Boolean).join(' · '))}</span><span><button class="btn sm" data-act="cmStuEdit" data-id="${s.id}">✏️</button><button class="btn sm" data-act="cmStuDel" data-id="${s.id}">🗑</button></span></div>`).join('') || '<p class="mu">학생이 없어요.</p>'}`;
}
const cmStuFields = s => [{ k: 'no', label: '번호', type: 'number', val: s ? s.no : '', req: 1 }, { k: 'name', label: '이름', val: s ? s.name : '', req: 1 }, { k: 'bd', label: '생일 (예: 03-15 또는 2012-03-15, 선택)', val: s ? s.bd : '' }, { k: 'tel', label: '보호자 연락처 (선택)', val: s ? s.tel : '' }, { k: 'memo', label: '메모 (선택)', val: s ? s.memo : '' }];
Object.assign(A, {
  cmStuAdd() { const cl = cmCl(); if (!cl) return; const next = Math.max(0, ...cl.stu.map(s => +s.no || 0)) + 1; const f = cmStuFields(); f[0].val = next; ask('학생 추가', f, o => { cl.stu.push({ id: uid(), no: +o.no, name: o.name.trim(), bd: o.bd, tel: o.tel, memo: o.memo }); cmDo(); }); },
  cmStuEdit(el) { const cl = cmCl(), s = cl && cl.stu.find(x => x.id === el.dataset.id); if (s) ask('학생 고치기', cmStuFields(s), o => { Object.assign(s, { no: +o.no, name: o.name.trim(), bd: o.bd, tel: o.tel, memo: o.memo }); cmDo(); }); },
  cmStuDel(el) { const cl = cmCl(), s = cl && cl.stu.find(x => x.id === el.dataset.id); if (s) sure(s.name + ' 학생을 명렬에서 지울까요? (이미 쓴 기록은 「삭제된 학생」으로 남습니다)', () => { cl.stu = cl.stu.filter(x => x.id !== s.id); cmDo(); }); },
  async cmTpl() {
    try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); } catch (e) { return toast('엑셀 도구를 불러오지 못했습니다.'); }
    const wb = XLSX.utils.book_new(), names = (S.profile.classes && S.profile.classes.length ? S.profile.classes : ['1반']).map(String);
    names.forEach((n, i) => { const ws = XLSX.utils.aoa_to_sheet([['번호', '이름', '생일(월-일)', '보호자 연락처', '메모'], ...(i === 0 ? [[1, '홍길동(예시 — 지우고 쓰세요)', '03-15', '010-0000-0000', '']] : [])]); ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 24 }]; XLSX.utils.book_append_sheet(wb, ws, n.replace(/[\\\/?*\[\]:]/g, '-').slice(0, 30)); });
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'application/octet-stream' })); a.download = '학급_명렬_양식.xlsx'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('양식을 내려받았어요. 시트 이름이 반 이름이 됩니다. 필요 없는 시트는 지우세요.');
  },
  cmPaste() { ask('붙여넣기로 명렬 넣기', [{ k: 't', label: '엑셀에서 복사해 붙이세요 (한 줄에 한 명: 번호 이름 [생일] [연락처] [메모])', type: 'textarea', rows: 10 }], o => cmRosterRows(cmCl() ? cmCl().name : '새 반', o.t.split(/\r?\n/).map(l => l.split(/\t|,| {2,}/).map(x => x.trim()))), '넣기'); }
});
function cmParseRows(rows) {
  rows = rows.filter(r => r && r.some(x => String(x ?? '').trim())); if (!rows.length) return [];
  let hi = rows.findIndex(r => r.some(x => /이름|성명/.test(String(x)))), idx = { no: 0, name: 1, bd: 2, tel: 3, memo: 4 };
  if (hi >= 0) { const h = rows[hi].map(x => String(x ?? '')); const f = re => h.findIndex(x => re.test(x)); idx = { no: f(/번호|번$/), name: f(/이름|성명/), bd: f(/생일|생년/), tel: f(/연락|전화|휴대/), memo: f(/메모|비고/) }; rows = rows.slice(hi + 1); }
  else if (isNaN(+rows[0][0]) && rows[0].length && /[가-힣]/.test(String(rows[0][0]))) idx = { no: -1, name: 0, bd: 1, tel: 2, memo: 3 };
  const g = (r, k) => (idx[k] >= 0 && r[idx[k]] != null ? String(r[idx[k]]).trim() : '');
  return rows.map((r, i) => ({ id: uid(), no: +g(r, 'no') || i + 1, name: g(r, 'name'), bd: g(r, 'bd'), tel: g(r, 'tel'), memo: g(r, 'memo') })).filter(s => s.name);
}
function cmRosterRows(name, rows, asNew) {
  const st = cmParseRows(rows); if (!st.length) return toast('학생 이름을 찾지 못했어요. 열 이름(번호·이름)을 확인해 주세요.');
  let cl = asNew ? null : CM.classes.find(x => x.name === name) || (cmCl() && cmCl().name === name ? cmCl() : null);
  if (!cl) { cl = { id: uid(), name, stu: [] }; CM.classes.push(cl); }
  const had = cl.stu.length, put = mode => { if (mode === '덧붙이기') cl.stu.push(...st); else cl.stu = st; cmCfg().cur = cl.id; cmCfg().mod = 'roster'; save(true); cmDo(); toast(`「${cl.name}」 ${st.length}명을 넣었습니다.`); };
  if (had) ask(`「${cl.name}」에는 이미 ${had}명이 있어요`, [{ k: 'm', label: '어떻게 넣을까요?', type: 'select', opts: ['덮어쓰기', '덧붙이기'], val: '덮어쓰기' }], o => put(o.m), '넣기'); else put('덮어쓰기');
}
async function cmImportFile(f) {
  try {
    toast('명렬 읽는 중…'); await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    if (wb.SheetNames.length > 1) { let n = 0; wb.SheetNames.forEach(sn => { const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' }), st = cmParseRows(rows); if (!st.length) return; let cl = CM.classes.find(x => x.name === sn); if (!cl) { cl = { id: uid(), name: sn, stu: [] }; CM.classes.push(cl); } cl.stu = st; n++; if (!cmCfg().cur) cmCfg().cur = cl.id; }); cmCfg().mod = 'roster'; save(true); cmDo(); toast(n ? `${n}개 반을 넣었습니다. (같은 이름의 반은 덮어썼어요)` : '학생 이름을 찾지 못했어요.'); }
    else cmRosterRows(cmCl() ? cmCl().name : f.name.replace(/\.[^.]+$/, ''), XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }));
  } catch (e) { toast('명렬을 읽지 못했습니다: ' + (e.message || e)); }
}

/* ---------- 출결 ---------- */
UI.cmDate = UI.cmDate || '';
const cmAtd = () => UI.cmDate || today();
function cmAtt(m, cl) {
  const dt = cmAtd(), L = cmLab(m), rec = ((CM.att[cl.id] || {})[dt]) || {}, S2 = cmStus(cl), cnt = L.map(() => 0);
  S2.forEach(s => { const r = rec[s.id]; if (r && r.s > 0) cnt[r.s]++; });
  const sum = L.map((l, i) => (i && cnt[i] ? `${esc(l)} ${cnt[i]}` : '')).filter(Boolean).join(' · ') || '모두 출석';
  const late = [], tl = today();
  Object.keys(CM.att[cl.id] || {}).forEach(d => Object.keys(CM.att[cl.id][d]).forEach(id => { const r = CM.att[cl.id][d][id]; if (r && r.s > 0 && !r.d && dd(d) <= -3 && cl.stu.some(x => x.id === id)) late.push(`${md(d)} ${cmSn(cl, id)}`); }));
  return `${late.length ? `<div class="hpw">📎 서류 미제출(3일 경과): ${late.slice(0, 8).map(esc).join(' / ')}${late.length > 8 ? ' 외 ' + (late.length - 8) + '건' : ''}</div>` : ''}
  <div class="tools"><input type="date" value="${dt}" data-cmi="attd" aria-label="날짜"><button class="btn sm" data-act="cmAttAll">✅ 나머지 모두 출석 확정</button><button class="btn sm" data-act="cmAttSum">📊 월별 집계</button></div>
  <p class="mu"><b>${dt === tl ? '오늘' : md(dt)}</b> · ${sum}</p>
  ${S2.map(s => { const r = rec[s.id] || { s: 0, r: '', d: false }; return `<div class="cmr ${r.s ? 'cmx' : ''}"><b>${s.no}번 ${esc(s.name)}</b><select data-cmi="atts|${s.id}" aria-label="${esc(s.name)} 출결">${L.map((l, i) => `<option value="${i}" ${r.s === i ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${r.s ? `<input data-cmi="attr|${s.id}" placeholder="사유" value="${esc(r.r || '')}"><label class="chk"><input type="checkbox" data-cmi="attc|${s.id}" ${r.d ? 'checked' : ''}> 서류</label>` : ''}</div>`; }).join('')}`;
}
function cmAttRec(cl, id) { const a = (CM.att[cl.id] = CM.att[cl.id] || {}), d = (a[cmAtd()] = a[cmAtd()] || {}); return (d[id] = d[id] || { s: 0, r: '', d: false }); }
A.cmAttAll = () => { const cl = cmCl(); cmStus(cl).forEach(s => cmAttRec(cl, s.id)); cmDo(); toast('나머지는 모두 출석으로 확정했습니다.'); };
A.cmAttSum = () => {
  const cl = cmCl(), m = cmMod('att'), L = cmLab(m); let mon = today().slice(0, 7);
  const table = () => { const S2 = cmStus(cl), rows = S2.map(s => { const c = L.map(() => 0); Object.keys(CM.att[cl.id] || {}).filter(d => d.startsWith(mon)).forEach(d => { const r = CM.att[cl.id][d][s.id]; if (r && r.s > 0) c[r.s]++; }); return { s, c }; }); return rows; };
  hpDlg('📊 월별 출결 집계', () => { const rows = table(); return `<div class="tools"><input type="month" id="cmmon" value="${mon}"><button type="button" class="btn sm" data-hp="go">보기</button><button type="button" class="btn sm" data-hp="cp">📋 표 복사(엑셀에 붙여넣기)</button></div><div style="overflow-x:auto"><table class="cmtb"><tr><th>번호</th><th>이름</th>${L.slice(1).map(l => `<th>${esc(l)}</th>`).join('')}</tr>${rows.map(r => `<tr><td>${r.s.no}</td><td>${esc(r.s.name)}</td>${r.c.slice(1).map(x => `<td>${x || ''}</td>`).join('')}</tr>`).join('')}</table></div>`; },
    (a, b, paint, d) => { if (a[0] === 'go') { mon = d.querySelector('#cmmon').value || mon; paint(); } if (a[0] === 'cp') cmCopyTxt(['번호\t이름\t' + L.slice(1).join('\t'), ...table().map(r => `${r.s.no}\t${r.s.name}\t${r.c.slice(1).join('\t')}`)].join('\n')); });
};

/* ---------- 학생 한 장 요약 ---------- */
UI.cmSt = UI.cmSt || {};
function cmProfData(cl, id) {
  const s = cl.stu.find(x => x.id === id), out = { s, lines: [] }; if (!s) return out;
  const m = cmMod('att'), L = cmLab(m), c = L.map(() => 0); Object.keys(CM.att[cl.id] || {}).forEach(d => { const r = CM.att[cl.id][d][id]; if (r && r.s > 0) c[r.s]++; });
  out.att = L.map((l, i) => (i && c[i] ? `${l} ${c[i]}` : '')).filter(Boolean).join(' · ') || '결석·지각 기록 없음';
  const ml = CM.mood[cl.id] || {}, mm = cmLab(cmMod('mood')), mc = mm.map(() => 0); Object.keys(ml).forEach(d => { const v = (ml[d] || {})[id]; if (v > 0) mc[v]++; });
  out.mood = mm.map((l, i) => (i && mc[i] ? `${l} ${mc[i]}` : '')).filter(Boolean).join(' · ');
  cmAll().filter(x => x.t === 'log' && cmOn(x.id)).forEach(x => (CM.logs[x.id] || []).filter(e => e.cls === cl.id && e.stu === id).forEach(e => out.lines.push({ d: e.date, t: `[${cmName(x)}${e.tag ? '·' + e.tag : ''}] ${e.text}` })));
  out.lines.sort((a, b) => b.d.localeCompare(a.d)); out.todo = [];
  cmAll().filter(x => x.t === 'grid' && cmOn(x.id)).forEach(x => ((CM.grid[x.id] || {})[cl.id] || []).forEach(it => { if (!(it.st || {})[id]) out.todo.push(`${cmName(x)}: ${it.name}`); }));
  return out;
}
function cmProf(m, cl) {
  const S2 = cmStus(cl), id = UI.cmSt[cl.id] || (S2[0] && S2[0].id) || '', p = cmProfData(cl, id), s = p.s;
  if (!s) return '<p class="mu">학생을 고르세요.</p>';
  return `<div class="tools"><select data-cmi="profsel" aria-label="학생">${cmOpts(cl, id)}</select></div>
  <div class="cmcard"><h3>${s.no}번 ${esc(s.name)}</h3><p>${s.bd ? '🎂 ' + esc(s.bd) + ' · ' : ''}${esc(s.memo || '')}</p><p>🗓 ${esc(p.att)}</p>${p.mood ? `<p>⭐ ${esc(p.mood)}</p>` : ''}${p.todo.length ? `<p class="hot">📥 미완료: ${p.todo.map(esc).join(' / ')}</p>` : ''}</div>
  <h4 class="dlh">기록 ${p.lines.length}건</h4>${p.lines.slice(0, 40).map(l => `<div class="cmr"><span class="mu">${md(l.d)}</span><span>${esc(l.t)}</span></div>`).join('') || '<p class="mu">쌓인 기록이 없어요.</p>'}
  <div class="tools"><button class="btn sm" data-act="cmCopy" data-t="${esc(`${s.no}번 ${s.name}\n출결: ${p.att}\n` + p.lines.map(l => `${l.d} ${l.t}`).join('\n'))}">📋 요약 복사</button></div>`;
}

/* ---------- 기록(상담·특이사항 등) ---------- */
function cmLog(m, cl) {
  const L = (CM.logs[m.id] || []).filter(e => e.cls === cl.id), f = UI.cmSt['f' + m.id] || '', list = L.filter(e => !f || e.stu === f).sort((a, b) => b.date.localeCompare(a.date) || 0), tg = cmTags(m);
  return `<div class="cmcard"><div class="cmf"><select id="cmL-s" aria-label="학생">${cmOpts(cl, '', '(반 전체·해당 없음)')}</select><input type="date" id="cmL-d" value="${today()}"><select id="cmL-t">${tg.map(t => `<option>${esc(t)}</option>`).join('')}</select></div><textarea id="cmL-x" rows="3" placeholder="내용" aria-label="내용"></textarea><div class="cmf"><label class="chk">후속 날짜 <input type="date" id="cmL-f"></label><button class="btn pri" data-act="cmLogAdd" data-m="${m.id}">＋ 기록 추가</button></div></div>
  <div class="tools"><select data-cmi="logf|${m.id}" aria-label="학생 걸러 보기">${cmOpts(cl, f, '전체 보기')}</select><button class="btn sm" data-act="cmLogCsv" data-m="${m.id}">📄 CSV로 내려받기</button></div>
  ${list.map(e => `<div class="cmr cmlg"><div><span class="mu">${md(e.date)}</span> <b>${e.stu ? esc(cmSn(cl, e.stu)) : '반 전체'}</b> <span class="cmtag">${esc(e.tag || '')}</span>${e.fu ? ` <span class="${e.fd ? 'mu' : 'hot'}">후속 ${md(e.fu)}${e.fd ? ' ✔' : ''}</span>` : ''}<div>${esc(e.text).replace(/\n/g, '<br>')}</div></div><span>${e.fu ? `<button class="btn sm" data-act="cmLogFu" data-m="${m.id}" data-id="${e.id}">${e.fd ? '↩' : '✔ 후속 완료'}</button>` : ''}<button class="btn sm" data-act="cmLogEdit" data-m="${m.id}" data-id="${e.id}">✏️</button><button class="btn sm" data-act="cmLogDel" data-m="${m.id}" data-id="${e.id}">🗑</button></span></div>`).join('') || '<p class="mu">기록이 없어요.</p>'}`;
}
Object.assign(A, {
  cmLogAdd(el) { const m = cmMod(el.dataset.m), cl = cmCl(), tx = cmQ('cmL-x').value.trim(); if (!tx) return toast('내용을 적어 주세요.'); (CM.logs[m.id] = CM.logs[m.id] || []).push({ id: uid(), cls: cl.id, stu: cmQ('cmL-s').value, date: cmQ('cmL-d').value || today(), tag: cmQ('cmL-t').value, text: tx, fu: cmQ('cmL-f').value, fd: false }); cmDo(); },
  cmLogEdit(el) { const m = cmMod(el.dataset.m), e = (CM.logs[m.id] || []).find(x => x.id === el.dataset.id); if (e) ask('기록 고치기', [{ k: 'date', label: '날짜', type: 'date', val: e.date }, { k: 'tag', label: '구분', type: 'select', opts: [...new Set([...cmTags(m), e.tag])], val: e.tag }, { k: 'text', label: '내용', type: 'textarea', val: e.text }, { k: 'fu', label: '후속 날짜(없으면 비움)', type: 'date', val: e.fu }], o => { Object.assign(e, { date: o.date, tag: o.tag, text: o.text, fu: o.fu }); cmDo(); }); },
  cmLogDel(el) { sure('이 기록을 지울까요?', () => { CM.logs[el.dataset.m] = CM.logs[el.dataset.m].filter(x => x.id !== el.dataset.id); cmDo(); }); },
  cmLogFu(el) { const e = CM.logs[el.dataset.m].find(x => x.id === el.dataset.id); if (e) { e.fd = !e.fd; cmDo(); } },
  cmLogCsv(el) { const m = cmMod(el.dataset.m), cl = cmCl(), q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"'; download(`${cmName(m)}_${cl.name}.csv`, '﻿날짜,학생,구분,내용,후속\n' + (CM.logs[m.id] || []).filter(e => e.cls === cl.id).map(e => [e.date, e.stu ? cmSn(cl, e.stu) : '반 전체', e.tag, e.text, e.fu].map(q).join(',')).join('\n'), 'text/csv;charset=utf-8'); }
});

/* ---------- 목록(회의·목표) ---------- */
function cmList(m, cl) {
  const L = (CM.list[m.id] || []).filter(e => e.cls === cl.id).sort((a, b) => (a.done - b.done) || b.date.localeCompare(a.date));
  return `<div class="cmf"><input id="cmI-t" placeholder="내용 (Enter로 추가)" aria-label="내용"><input type="date" id="cmI-d" value="${today()}"><button class="btn pri" data-act="cmListAdd" data-m="${m.id}">＋ 추가</button></div>
  ${L.map(e => `<div class="cmr"><label class="chk"><input type="checkbox" data-cmi="lst|${m.id}|${e.id}" ${e.done ? 'checked' : ''}> <span class="${e.done ? 'mu' : ''}">${md(e.date)} ${esc(e.text)}</span></label><span><button class="btn sm" data-act="cmListEdit" data-m="${m.id}" data-id="${e.id}">✏️</button><button class="btn sm" data-act="cmListDel" data-m="${m.id}" data-id="${e.id}">🗑</button></span></div>`).join('') || '<p class="mu">비어 있어요.</p>'}`;
}
Object.assign(A, {
  cmListAdd(el) { const t = cmQ('cmI-t').value.trim(); if (!t) return; (CM.list[el.dataset.m] = CM.list[el.dataset.m] || []).push({ id: uid(), cls: cmCl().id, date: cmQ('cmI-d').value || today(), text: t, done: false }); cmDo(); },
  cmListEdit(el) { const e = CM.list[el.dataset.m].find(x => x.id === el.dataset.id); if (e) ask('고치기', [{ k: 't', label: '내용', val: e.text, req: 1 }, { k: 'd', label: '날짜', type: 'date', val: e.date }], o => { e.text = o.t; e.date = o.d || e.date; cmDo(); }); },
  cmListDel(el) { CM.list[el.dataset.m] = CM.list[el.dataset.m].filter(x => x.id !== el.dataset.id); cmDo(); }
});

/* ---------- 제출·수합 / 수행평가 (번호 칩) ---------- */
UI.cmItem = UI.cmItem || {};
function cmGrid(m, cl) {
  const items = ((CM.grid[m.id] || {})[cl.id]) || [], L = cmLab(m), sel = items.find(i => i.id === UI.cmItem[m.id + cl.id]) || items[0], S2 = cmStus(cl);
  const done = it => S2.filter(s => (it.st || {})[s.id] >= L.length - 1).length;
  return `<div class="tools"><button class="btn sm pri" data-act="cmGridAdd" data-m="${m.id}">＋ 새 항목 (예: 체험학습 동의서)</button></div>
  <div class="cmcls">${items.map(i => `<button class="cmchip ${sel && sel.id === i.id ? 'on' : ''}" data-act="cmGridSel" data-m="${m.id}" data-id="${i.id}">${esc(i.name)} ${done(i)}/${S2.length}</button>`).join('') || '<span class="mu">항목이 없어요.</span>'}</div>
  ${sel ? `<p class="mu">${sel.due ? '마감 ' + md(sel.due) + (dd(sel.due) >= 0 ? ' (D-' + dd(sel.due) + ')' : ' (지남)') + ' · ' : ''}칩을 누르면 상태가 바뀝니다: ${L.map(esc).join(' → ')}</p>
  <div class="cmgrid">${S2.map(s => { const v = (sel.st || {})[s.id] || 0; return `<button class="cmst s${Math.min(v, 2)}" data-act="cmGridTog" data-m="${m.id}" data-id="${sel.id}" data-s="${s.id}" title="${esc(L[v])}"><b>${s.no}</b> ${esc(s.name)}<i>${esc(L[v])}</i></button>`; }).join('')}</div>
  <div class="tools"><button class="btn sm" data-act="cmGridCopy" data-m="${m.id}" data-id="${sel.id}">📋 미완료 번호 복사</button><button class="btn sm" data-act="cmGridAll" data-m="${m.id}" data-id="${sel.id}">모두 완료로</button><button class="btn sm" data-act="cmGridEdit" data-m="${m.id}" data-id="${sel.id}">✏️ 항목 고치기</button><button class="btn sm" data-act="cmGridDel" data-m="${m.id}" data-id="${sel.id}">🗑 항목 삭제</button></div>` : ''}`;
}
const cmGi = el => { const cl = cmCl(); return { cl, a: ((CM.grid[el.dataset.m] = CM.grid[el.dataset.m] || {})[cl.id] = (CM.grid[el.dataset.m][cl.id] || [])) }; };
Object.assign(A, {
  cmGridAdd(el) { const { cl, a } = cmGi(el); ask('새 항목', [{ k: 'n', label: '이름', req: 1 }, { k: 'd', label: '마감일(선택)', type: 'date' }], o => { const it = { id: uid(), name: o.n.trim(), due: o.d, st: {} }; a.push(it); UI.cmItem[el.dataset.m + cl.id] = it.id; cmDo(); }); },
  cmGridSel(el) { UI.cmItem[el.dataset.m + cmCl().id] = el.dataset.id; TF.render(); },
  cmGridTog(el) { const { a } = cmGi(el), it = a.find(x => x.id === el.dataset.id), L = cmLab(cmMod(el.dataset.m)); it.st = it.st || {}; it.st[el.dataset.s] = ((it.st[el.dataset.s] || 0) + 1) % L.length; cmDo(); },
  cmGridAll(el) { const { cl, a } = cmGi(el), it = a.find(x => x.id === el.dataset.id), L = cmLab(cmMod(el.dataset.m)); it.st = it.st || {}; cl.stu.forEach(s => { it.st[s.id] = L.length - 1; }); cmDo(); },
  cmGridCopy(el) { const { cl, a } = cmGi(el), it = a.find(x => x.id === el.dataset.id), L = cmLab(cmMod(el.dataset.m)), no = cmStus(cl).filter(s => (it.st || {})[s.id] !== L.length - 1); cmCopyTxt(`${it.name} 미완료(${no.length}명): ` + no.map(s => s.no + '번 ' + s.name).join(', ')); },
  cmGridEdit(el) { const { a } = cmGi(el), it = a.find(x => x.id === el.dataset.id); ask('항목 고치기', [{ k: 'n', label: '이름', val: it.name, req: 1 }, { k: 'd', label: '마감일', type: 'date', val: it.due }], o => { it.name = o.n; it.due = o.d; cmDo(); }); },
  cmGridDel(el) { const { cl } = cmGi(el); sure('이 항목을 지울까요?', () => { CM.grid[el.dataset.m][cl.id] = CM.grid[el.dataset.m][cl.id].filter(x => x.id !== el.dataset.id); cmDo(); }); }
});

/* ---------- 1인 1역 · 청소 당번 (요일·날짜 지정, 순환, 알림) ---------- */
const cmWd = s => [...new Set([...String(s || '')].filter(c => cmDow.includes(c)).map(c => cmDow.indexOf(c)))];
const cmDates = s => String(s || '').split(/[,\s;]+/).map(x => x.trim()).filter(Boolean).map(x => { let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(x); if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`; m = /^(\d{1,2})[\/.](\d{1,2})$/.exec(x); if (m) return `${new Date().getFullYear()}-${pad(m[1])}-${pad(m[2])}`; return ''; }).filter(Boolean);
function cmDutyTeam(d, cl) {
  const T = (d.teams || []).filter(t => t.length); if (!T.length) return [];
  let i = d.off || 0; if (d.rot === '매주') i += Math.floor(Math.max(0, -dd(d.base || today())) / 7);
  return T[((i % T.length) + T.length) % T.length];
}
const cmDutyToday = d => { const dow = new Date().getDay(); return cmWd(d.wd).includes(dow) || cmDates(d.dates).includes(today()); };
const cmDutyTxt = d => [cmWd(d.wd).length ? '매주 ' + cmWd(d.wd).map(i => cmDow[i]).join('') : '', cmDates(d.dates).length ? cmDates(d.dates).map(md).join(', ') : '', d.time ? d.time + (d.alarm ? ' 🔔' : '') : ''].filter(Boolean).join(' · ') || '상시';
function cmDuty(m, cl) {
  const L = CM.duty.filter(d => d.cls === cl.id), nm = ids => ids.map(id => cmSn(cl, id)).join(', ') || '(담당 없음)';
  const card = d => { const cur = cmDutyTeam(d, cl), multi = (d.teams || []).filter(t => t.length).length > 1; return `<div class="cmcard ${cmDutyToday(d) ? 'cmhot' : ''}"><b>${d.kind === 'clean' ? '🧹' : '🎓'} ${esc(d.name)}</b> <span class="mu">${esc(cmDutyTxt(d))}</span><p>${multi ? '이번 담당: ' : '담당: '}<b>${esc(nm(cur))}</b></p>${multi ? `<p class="mu">순환(${esc(d.rot || '직접')}): ${(d.teams || []).filter(t => t.length).map(t => esc(nm(t))).join(' → ')}</p>` : ''}<div class="tools">${multi && d.rot !== '매주' ? `<button class="btn sm" data-act="cmDutyNext" data-id="${d.id}">▶ 다음 순환</button>` : ''}<button class="btn sm" data-act="cmDutyEdit" data-id="${d.id}">✏️</button><button class="btn sm" data-act="cmDutyDel" data-id="${d.id}">🗑</button></div></div>`; };
  return `<div class="tools"><button class="btn sm pri" data-act="cmDutyEdit" data-k="role">＋ 1인 1역</button><button class="btn sm pri" data-act="cmDutyEdit" data-k="clean">＋ 청소 구역·당번</button><button class="btn sm" data-act="cmNotif">🔔 알림 허용하기</button></div><p class="mu">알림은 이 앱(탭)이 열려 있을 때 정해 둔 시간에 울리고, 오늘 화면에도 표시돼요.</p>
  <h4 class="dlh">1인 1역</h4>${L.filter(d => d.kind !== 'clean').map(card).join('') || '<p class="mu">없음</p>'}<h4 class="dlh">청소 당번</h4>${L.filter(d => d.kind === 'clean').map(card).join('') || '<p class="mu">없음</p>'}`;
}
const cmNoToIds = (cl, txt) => String(txt || '').split(/\r?\n/).map(l => (l.match(/\d+/g) || []).map(n => { const s = cl.stu.find(x => +x.no === +n); return s && s.id; }).filter(Boolean)).filter(t => t.length);
Object.assign(A, {
  cmDutyEdit(el) {
    const cl = cmCl(), d = el.dataset.id ? CM.duty.find(x => x.id === el.dataset.id) : null, kind = d ? d.kind : el.dataset.k;
    const noOf = ids => ids.map(id => (cl.stu.find(s => s.id === id) || {}).no).filter(Boolean).join(', ');
    ask(d ? '고치기' : (kind === 'clean' ? '청소 구역·당번' : '1인 1역'), [{ k: 'name', label: kind === 'clean' ? '구역 이름 (예: 복도, 칠판)' : '역할 이름 (예: 칠판 지우기)', val: d ? d.name : '', req: 1 },
    { k: 'teams', label: '담당 번호 — 쉼표로 (예: 1, 2, 3). 순환하려면 팀마다 줄을 나누세요', type: 'textarea', rows: 4, val: d ? (d.teams || []).map(noOf).join('\n') : '' },
    { k: 'wd', label: '요일 (예: 월수금) — 없으면 비움', val: d ? d.wd : '' }, { k: 'dates', label: '날짜 지정 (예: 2026-12-03, 12/10) — 없으면 비움', val: d ? d.dates : '' },
    { k: 'time', label: '알림 시간 (예: 15:30)', val: d ? d.time : '' }, { k: 'alarm', label: '알림', type: 'select', opts: ['끔', '켬'], val: d && d.alarm ? '켬' : '끔' }, { k: 'rot', label: '순환 (팀이 여러 개일 때)', type: 'select', opts: ['직접', '매주'], val: d ? d.rot : '직접' }],
      o => { const x = d || { id: uid(), cls: cl.id, kind, base: today(), off: 0 }; Object.assign(x, { name: o.name.trim(), teams: cmNoToIds(cl, o.teams), wd: o.wd, dates: o.dates, time: o.time.trim(), alarm: o.alarm === '켬', rot: o.rot }); if (!d) CM.duty.push(x); cmDo(); });
  },
  cmDutyDel(el) { sure('지울까요?', () => { CM.duty = CM.duty.filter(x => x.id !== el.dataset.id); cmDo(); }); },
  cmDutyNext(el) { const d = CM.duty.find(x => x.id === el.dataset.id); d.off = (d.off || 0) + 1; cmDo(); },
  cmNotif() { if (!('Notification' in window)) return toast('이 브라우저는 알림을 지원하지 않습니다. 오늘 화면 표시는 그대로 됩니다.'); Notification.requestPermission().then(r => toast(r === 'granted' ? '알림을 허용했습니다.' : '허용되지 않았어요. 오늘 화면 표시는 그대로 됩니다.')); }
});
setInterval(() => {
  if (!cmReady || !cmCfg().on || cmLocked() || !cmOn('duty')) return; const n = new Date(), hm = pad(n.getHours()) + ':' + pad(n.getMinutes()), t = today();
  CM.duty.filter(d => d.alarm && d.time === hm && cmDutyToday(d) && !CM.fired[d.id + t]).forEach(d => { CM.fired[d.id + t] = 1; cmSave(); const cl = CM.classes.find(c => c.id === d.cls), who = cmDutyTeam(d, cl).map(id => cmSn(cl, id)).join(', '); const msg = `${d.name}: ${who || '담당 없음'}`; toast('🔔 ' + msg); try { if ('Notification' in window && Notification.permission === 'granted') new Notification('업무파탈 · 당번 알림', { body: msg }); } catch (e) { } });
}, 20000);

/* ---------- 생일 · 연락 카드 · 안내문 틀 ---------- */
function cmBday(m, cl) {
  const n = new Date(), L = []; CM.classes.forEach(c => c.stu.forEach(s => { const b = cmBd(s); if (!b) return; let d = new Date(n.getFullYear(), b.m - 1, b.d); if (d < new Date(n.getFullYear(), n.getMonth(), n.getDate())) d = new Date(n.getFullYear() + 1, b.m - 1, b.d); L.push({ c, s, d, k: Math.round((d - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5) }); }));
  L.sort((a, b) => a.k - b.k); return L.slice(0, 20).map(x => `<div class="cmr"><b>${esc(x.s.name)}</b><span class="mu">${esc(x.c.name)} · ${x.d.getMonth() + 1}/${x.d.getDate()}</span><span class="${x.k <= 7 ? 'hot' : 'mu'}">${x.k ? 'D-' + x.k : '오늘!'}</span></div>`).join('') || '<p class="mu">명렬에 생일(월-일)을 넣으면 여기에 나와요.</p>';
}
function cmTel(m, cl) { return cmStus(cl).map(s => `<div class="cmr"><b>${s.no}번 ${esc(s.name)}</b><span>${esc(s.tel || '-')}</span>${s.tel ? `<button class="btn sm" data-act="cmCopy" data-t="${esc(s.tel)}">복사</button>` : ''}</div>`).join(''); }
const cmTpls = () => { const c = cmCfg(); if (!c.tpl) c.tpl = CM_TPL.map(t => ({ id: uid(), n: t.n, t: t.t })); return c.tpl; };
function cmTpl(m, cl) {
  const T = cmTpls(), id = UI.cmSt.tp || '';
  return `<div class="tools"><select data-cmi="tpst" aria-label="학생">${cl ? cmOpts(cl, id, '(이름 칸 비워 두기)') : ''}</select><button class="btn sm pri" data-act="cmTplAdd">＋ 새 틀</button></div><p class="mu">{이름} {번호} {반} 자리가 학생 정보로 바뀌어 복사돼요.</p>
  ${T.map(t => `<div class="cmcard"><b>${esc(t.n)}</b><p>${esc(t.t)}</p><div class="tools"><button class="btn sm pri" data-act="cmTplCopy" data-id="${t.id}">📋 복사</button><button class="btn sm" data-act="cmTplEdit" data-id="${t.id}">✏️</button><button class="btn sm" data-act="cmTplDel" data-id="${t.id}">🗑</button></div></div>`).join('')}`;
}
Object.assign(A, {
  cmTplAdd() { ask('새 틀', [{ k: 'n', label: '이름', req: 1 }, { k: 't', label: '내용', type: 'textarea', rows: 6 }], o => { cmTpls().push({ id: uid(), n: o.n, t: o.t }); save(true); TF.render(); }); },
  cmTplEdit(el) { const t = cmTpls().find(x => x.id === el.dataset.id); ask('고치기', [{ k: 'n', label: '이름', val: t.n, req: 1 }, { k: 't', label: '내용', type: 'textarea', rows: 6, val: t.t }], o => { t.n = o.n; t.t = o.t; save(true); TF.render(); }); },
  cmTplDel(el) { sure('지울까요?', () => { cmCfg().tpl = cmTpls().filter(x => x.id !== el.dataset.id); save(true); TF.render(); }); },
  cmTplCopy(el) { const t = cmTpls().find(x => x.id === el.dataset.id), cl = cmCl(), s = cl && cl.stu.find(x => x.id === UI.cmSt.tp); cmCopyTxt(t.t.replace(/\{이름\}/g, s ? s.name : '○○○').replace(/\{번호\}/g, s ? s.no : '').replace(/\{반\}/g, cl ? cl.name : '')); }
});

/* ---------- 행사 (학급·학년) — 한글·엑셀·PDF 끌어다 놓기 ---------- */
const cmYear = m => { const n = new Date(), sy = n.getMonth() >= 2 ? n.getFullYear() : n.getFullYear() - 1; return m >= 3 ? sy : sy + 1; };
function cmEvParse(text) {
  const out = []; let pend = null; const D = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y || cmYear(m)}-${pad(m)}-${pad(d)}` : '');
  String(text).split(/\r?\n|\f/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).forEach(l => {
    let date = '', end = '', rest = l, m;
    if ((m = /(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?(?:\s*\([^)]*\))?(?:\s*[~∼～-]\s*(?:(\d{4})\s*[-./년]\s*)?(?:(\d{1,2})\s*[-./월]\s*)?(\d{1,2})\s*일?)?/.exec(l))) { date = D(m[1], +m[2], +m[3]); if (m[6]) end = D(m[4] || m[1], +(m[5] || m[2]), +m[6]); rest = l.replace(m[0], ' '); }
    else if ((m = /(\d{1,2})\s*월\s*(\d{1,2})\s*일?(?:\s*\([^)]*\))?(?:\s*[~∼～-]\s*(?:(\d{1,2})\s*월\s*)?(\d{1,2})\s*일?)?/.exec(l)) || (m = /(?<![\d.])(\d{1,2})\s*[./]\s*(\d{1,2})(?:\s*\([^)]*\))?(?:\s*[~∼～-]\s*(?:(\d{1,2})\s*[./]\s*)?(\d{1,2}))?(?![\d.])/.exec(l))) { date = D(0, +m[1], +m[2]); if (m[4]) end = D(0, +(m[3] || m[1]), +m[4]); rest = l.replace(m[0], ' '); }
    rest = rest.replace(/^[\s|·\-–:,)(\]\[]+|[\s|·\-–:,)(\]\[]+$/g, '').replace(/\s*\|\s*/g, ' ').trim();
    if (date) { if (rest.length >= 2) { out.push({ date, end: end && end >= date ? end : '', title: rest.slice(0, 80) }); pend = null; } else pend = { date, end }; }
    else if (pend && rest.length >= 2 && rest.length < 80) { out.push({ date: pend.date, end: pend.end, title: rest }); pend = null; }
  });
  return out;
}
function cmEv(m) {
  const L = CM.ev.slice().sort((a, b) => a.date.localeCompare(b.date)), up = L.filter(e => (e.end || e.date) >= today()), past = L.filter(e => (e.end || e.date) < today());
  const row = e => `<div class="cmr"><span><b>${md(e.date)}${e.end ? '~' + md(e.end) : ''}</b> ${esc(e.title)} <span class="cmtag">${esc(e.scope || '')}</span>${e.note ? `<span class="mu"> ${esc(e.note)}</span>` : ''}</span><span><button class="btn sm" data-act="cmEvEdit" data-id="${e.id}">✏️</button><button class="btn sm" data-act="cmEvDel" data-id="${e.id}">🗑</button></span></div>`;
  return `<div class="cmdrop" data-cmdrop="ev">📥 <b>학년 행사 안내문(한글·엑셀·PDF·텍스트)을 끌어다 놓으세요</b> — 날짜가 있는 줄을 찾아 골라 넣게 해 드려요</div>
  <div class="tools"><button class="btn sm pri" data-act="cmEvEdit">＋ 행사 직접 추가</button><label class="btn sm file">📂 파일 선택<input type="file" accept=".hwp,.hwpx,.xlsx,.xls,.pdf,.txt,.csv,.docx" data-cmi="evfile"></label><button class="btn sm" data-act="cmEvPaste">📋 붙여넣기</button></div>
  <h4 class="dlh">다가오는 행사</h4>${up.map(row).join('') || '<p class="mu">없음</p>'}${past.length ? `<details><summary class="mu">지난 행사 ${past.length}건</summary>${past.map(row).join('')}</details>` : ''}`;
}
async function cmEvFile(f) { try { toast(f.name + ' 읽는 중…'); cmEvCand(await readFile(f), f.name); } catch (e) { toast(e.message || '읽지 못했습니다.'); } }
function cmEvCand(text, src) {
  const C = cmEvParse(text); if (!C.length) return toast('날짜가 있는 행사 줄을 찾지 못했어요. 붙여넣기로 넣어 보세요.');
  const on = C.map(() => true); let scope = '학년', cal = true;
  hpDlg('📅 찾은 행사 ' + C.length + '건', () => `<p class="mu">${esc(src || '')} — 넣을 행사를 고르세요. 제목·날짜는 넣은 뒤 ✏️로 고칠 수 있어요.</p><div class="tools"><select id="cmsc" aria-label="범위">${['학급', '학년', '학교'].map(x => `<option ${x === scope ? 'selected' : ''}>${x}</option>`).join('')}</select><label class="chk"><input type="checkbox" id="cmcal" ${cal ? 'checked' : ''}> 캘린더에도 넣기</label><button type="button" class="btn pri sm" data-hp="ok">선택한 행사 넣기</button></div>${C.map((c, i) => `<label class="cmr chk"><input type="checkbox" data-hp="ck|${i}" ${on[i] ? 'checked' : ''}> <span><b>${md(c.date)}${c.end ? '~' + md(c.end) : ''}</b> ${esc(c.title)}</span></label>`).join('')}`,
    (a, b, paint, d) => { if (a[0] === 'ck') { on[+a[1]] = b.checked; return; } if (a[0] === 'ok') { scope = d.querySelector('#cmsc').value; cal = d.querySelector('#cmcal').checked; let n = 0; C.forEach((c, i) => { if (!on[i]) return; const e = { id: uid(), date: c.date, end: c.end, title: c.title, scope, note: '' }; if (cal) { const it = { id: uid(), title: c.title, date: c.date, cat: 'event', done: false }; if (c.end) it.end = c.end; S.items.push(it); e.sid = it.id; } CM.ev.push(e); n++; }); save(true); cmSave(); d.close(); toast(n + '건을 넣었습니다.'); } });
}
Object.assign(A, {
  cmEvPaste() { ask('행사 안내문 붙여넣기', [{ k: 't', label: '날짜가 들어 있는 내용을 붙이세요', type: 'textarea', rows: 10 }], o => cmEvCand(o.t, '붙여넣은 내용'), '찾기'); },
  cmEvEdit(el) { const e = el.dataset.id ? CM.ev.find(x => x.id === el.dataset.id) : null; ask(e ? '행사 고치기' : '행사 추가', [{ k: 'title', label: '행사 이름', val: e ? e.title : '', req: 1 }, { k: 'date', label: '시작 날짜', type: 'date', val: e ? e.date : today(), req: 1 }, { k: 'end', label: '끝 날짜(하루면 비움)', type: 'date', val: e ? e.end : '' }, { k: 'scope', label: '범위', type: 'select', opts: ['학급', '학년', '학교'], val: e ? e.scope : '학급' }, { k: 'note', label: '메모', val: e ? e.note : '' }], o => { const x = e || { id: uid() }; Object.assign(x, { title: o.title.trim(), date: o.date, end: o.end && o.end >= o.date ? o.end : '', scope: o.scope, note: o.note }); if (!e) CM.ev.push(x); else { const it = x.sid && S.items.find(i => i.id === x.sid); if (it) { it.title = x.title; it.date = x.date; it.end = x.end; save(true); } } cmDo(); }); },
  cmEvDel(el) { sure('이 행사를 지울까요? (캘린더에 넣은 것도 함께 지웁니다)', () => { const e = CM.ev.find(x => x.id === el.dataset.id); if (e && e.sid) { S.items = S.items.filter(i => i.id !== e.sid); save(true); } CM.ev = CM.ev.filter(x => x.id !== el.dataset.id); cmDo(); }); }
});

/* ---------- 수업 태도 칩 · 호명 뽑기 ---------- */
function cmMood(m, cl) {
  const dt = UI.cmMd || today(), L = cmLab(m), rec = ((CM.mood[cl.id] || {})[dt]) || {};
  return `<div class="tools"><input type="date" value="${dt}" data-cmi="moodd" aria-label="날짜"></div><p class="mu">이름 칩을 누르면 ${L.slice(1).map(esc).join(' → ')} 순으로 바뀝니다.</p><div class="cmgrid">${cmStus(cl).map(s => { const v = rec[s.id] || 0; return `<button class="cmst s${v}" data-act="cmMoodTog" data-s="${s.id}"><b>${s.no}</b> ${esc(s.name)}<i>${esc(L[v] || '')}</i></button>`; }).join('')}</div>`;
}
A.cmMoodTog = el => { const cl = cmCl(), dt = UI.cmMd || today(), L = cmLab(cmMod('mood')), r = ((CM.mood[cl.id] = CM.mood[cl.id] || {})[dt] = (CM.mood[cl.id][dt] || {})); r[el.dataset.s] = ((r[el.dataset.s] || 0) + 1) % L.length; cmDo(); };
function cmPick(m, cl) {
  const picked = CM.pick[cl.id] || [], left = cmStus(cl).filter(s => !picked.includes(s.id));
  return `<div class="cmbig" id="cmbig">${esc(UI.cmPk || '🎲')}</div><div class="tools"><select data-cmi="pickn" aria-label="인원">${[1, 2, 3, 4, 5].map(n => `<option ${UI.cmPn == n ? 'selected' : ''} value="${n}">${n}명</option>`).join('')}</select><label class="chk"><input type="checkbox" data-cmi="pickex" ${UI.cmPe === false ? '' : 'checked'}> 오늘 결석자 제외</label><button class="btn pri" data-act="cmPick">🎲 뽑기</button><button class="btn sm" data-act="cmPickReset">처음부터 다시</button></div><p class="mu">남은 ${left.length}명 / 이미 뽑힌 ${picked.length}명 ${picked.length ? '· ' + picked.map(id => esc((cl.stu.find(s => s.id === id) || {}).name || '')).join(', ') : ''}</p>`;
}
Object.assign(A, {
  cmPick() { const cl = cmCl(), n = +(UI.cmPn || 1), picked = (CM.pick[cl.id] = CM.pick[cl.id] || []), ab = UI.cmPe === false ? [] : Object.entries(((CM.att[cl.id] || {})[today()]) || {}).filter(([, r]) => r.s === 1 || r.s === 4).map(([id]) => id); let pool = cmStus(cl).filter(s => !picked.includes(s.id) && !ab.includes(s.id)); if (!pool.length) return toast('모두 뽑았어요. 「처음부터 다시」를 눌러 주세요.'); const take = []; for (let i = 0; i < n && pool.length; i++) { const k = Math.floor(Math.random() * pool.length); take.push(pool[k]); pool.splice(k, 1); } const all = cmStus(cl), big = cmQ('cmbig'); let t = 0; const iv = setInterval(() => { if (big) big.textContent = all[Math.floor(Math.random() * all.length)].name; if (++t > 9) { clearInterval(iv); take.forEach(s => picked.push(s.id)); UI.cmPk = take.map(s => `${s.no}번 ${s.name}`).join('  '); cmDo(); } }, 70); },
  cmPickReset() { CM.pick[cmCl().id] = []; UI.cmPk = ''; cmDo(); }
});

/* ---------- 기능 켜기 · 내 기능 · 항목 고치기 ---------- */
function cmMods() {
  const grp = ['담임', '교과', '공통', '내 기능'], all = cmAll();
  return `<p class="mu">필요한 기능만 골라 쓰세요. 끄면 숨겨질 뿐 기록은 그대로 남아요.</p><div class="tools">${Object.keys(CM_SETS).map(k => `<button class="btn sm" data-act="cmSetMods" data-k="${k}">${k} 기본 세트로</button>`).join('')}<button class="btn sm pri" data-act="cmModNew">＋ 내 기능 만들기</button></div>
  ${grp.map(g => { const L = all.filter(m => m.g === g); return L.length ? `<h4 class="dlh">${g}</h4>${L.map(m => `<label class="cmr chk"><input type="checkbox" data-act="cmModTog" data-id="${m.id}" ${cmOn(m.id) ? 'checked' : ''}> <span>${m.i} <b>${esc(cmName(m))}</b><br><span class="mu">${esc(m.d)}</span></span></label>`).join('')}` : ''; }).join('')}`;
}
Object.assign(A, {
  cmModTog(el) { const c = cmCfg(); c.mods = c.mods.includes(el.dataset.id) ? c.mods.filter(x => x !== el.dataset.id) : c.mods.concat(el.dataset.id); save(true); TF.render(); },
  cmSetMods(el) { cmCfg().mods = CM_SETS[el.dataset.k].slice(); save(true); TF.render(); },
  cmModNew() { ask('내 기능 만들기', [{ k: 'n', label: '이름 (예: 급식 알레르기 확인, 독서 기록)', req: 1 }, { k: 't', label: '종류', type: 'select', opts: ['학생별 기록', '제출·체크 현황', '자유 목록'], val: '학생별 기록' }, { k: 'tags', label: '학생별 기록의 구분 항목 (쉼표로, 선택)', ph: '예: 좋음, 보통, 주의' }], o => { const c = cmCfg(), x = { id: 'c_' + uid(), n: o.n.trim(), t: { '학생별 기록': 'log', '제출·체크 현황': 'grid', '자유 목록': 'list' }[o.t], tags: o.tags.split(',').map(s => s.trim()).filter(Boolean) }; if (!x.tags.length) delete x.tags; c.custom.push(x); c.mods.push(x.id); c.mod = x.id; save(true); TF.render(); }); },
  cmModEdit(el) {
    const m = cmMod(el.dataset.id), c = cmCfg(), f = [{ k: 'n', label: '기능 이름', val: cmName(m), req: 1 }];
    if (m.t === 'log') f.push({ k: 'tags', label: '구분 항목 (쉼표로)', val: cmTags(m).join(', ') });
    if (m.t === 'att' || m.t === 'mood' || m.t === 'grid') f.push({ k: 'lab', label: (m.t === 'grid' ? '상태 단계 (쉼표로, 마지막이 완료)' : '표시 이름 (쉼표로, 순서대로)'), val: cmLab(m).join(', ') });
    ask('고치기', f, o => { c.names[m.id] = o.n.trim() || m.n; if (o.tags != null) { c.tags[m.id] = o.tags.split(',').map(s => s.trim()).filter(Boolean); if (m.custom) { const x = c.custom.find(y => y.id === m.id); if (x) x.tags = c.tags[m.id]; } } if (o.lab != null) { const l = o.lab.split(',').map(s => s.trim()); if (l.length >= 2) c.lab[m.id] = l; } save(true); TF.render(); }, '저장');
    if (m.custom) setTimeout(() => { const d = document.querySelector('dialog.dlg:last-of-type .btns'); if (d && !d.querySelector('[data-cmdelmod]')) { const b = document.createElement('button'); b.type = 'button'; b.dataset.cmdelmod = m.id; b.textContent = '이 기능 삭제'; b.onclick = () => { const dl = b.closest('dialog'); dl.close('cancel'); sure('「' + cmName(m) + '」 기능과 기록을 삭제할까요?', () => { c.custom = c.custom.filter(y => y.id !== m.id); c.mods = c.mods.filter(y => y !== m.id); delete CM.logs[m.id]; delete CM.grid[m.id]; delete CM.list[m.id]; c.mod = 'mods'; save(true); cmDo(); }); }; d.appendChild(b); } }, 30);
  }
});

/* ---------- 연동 사이트 ---------- */
const CM_PRE = [['꿈송이 모둠 뽑기', 'https://gtk0624-a11y.github.io/sportslog/modum/'], ['자리바꾸기 (주소 직접 입력)', ''], ['딜레마 시뮬레이션(딜시)', 'https://gtk0624-a11y.github.io/Qdice/dilsi/'], ['한 번뿐인 인생', 'https://gtk0624-a11y.github.io/Qdice/onelife/'], ['도디쌤의 생기발랄', 'https://gtk0624-a11y.github.io/Qdice/saenggibu/'], ['운동로그', 'https://gtk0624-a11y.github.io/badminton/']];
function cmLinks(cl) {
  const L = cmCfg().links;
  return `<p class="mu">자주 쓰는 사이트를 등록해 두고 바로 열어요. 「명단 가져가기」는 이 반 명렬(번호·이름)을 복사하거나 엑셀로 내려받아 다른 사이트에 붙여 넣을 수 있게 해 줘요. (다른 사이트가 파일·붙여넣기를 받는 방식이어야 합니다)</p>
  <div class="tools">${CM_PRE.map((p, i) => `<button class="cmchip" data-act="cmLinkPre" data-i="${i}">＋ ${esc(p[0])}</button>`).join('')}<button class="btn sm pri" data-act="cmLinkEdit">＋ 주소 직접 추가</button></div>
  ${L.map(l => `<div class="cmcard"><b>${esc(l.n)}</b> <span class="mu">${esc(l.u)}</span><div class="tools"><button class="btn sm pri" data-act="cmLinkOpen" data-id="${l.id}">열기</button>${cl ? `<button class="btn sm" data-act="cmLinkCopy" data-id="${l.id}">📋 명단 복사 후 열기</button><button class="btn sm" data-act="cmLinkXls">📥 명단 엑셀</button>` : ''}<button class="btn sm" data-act="cmLinkEdit" data-id="${l.id}">✏️</button><button class="btn sm" data-act="cmLinkDel" data-id="${l.id}">🗑</button></div></div>`).join('') || '<p class="mu">등록한 사이트가 없어요.</p>'}`;
}
const cmRosterTxt = cl => cmStus(cl).map(s => s.no + '\t' + s.name).join('\n');
Object.assign(A, {
  cmLinkPre(el) { const p = CM_PRE[+el.dataset.i]; if (p[1]) { cmCfg().links.push({ id: uid(), n: p[0], u: p[1] }); save(true); TF.render(); } else A.cmLinkEdit({ dataset: { pre: p[0] } }); },
  cmLinkEdit(el) { const l = el.dataset && el.dataset.id ? cmCfg().links.find(x => x.id === el.dataset.id) : null; ask(l ? '고치기' : '사이트 추가', [{ k: 'n', label: '이름', val: l ? l.n : (el.dataset && el.dataset.pre) || '', req: 1 }, { k: 'u', label: '주소 (https://…)', val: l ? l.u : '', req: 1 }], o => { const u = /^https?:\/\//.test(o.u.trim()) ? o.u.trim() : 'https://' + o.u.trim(); if (l) { l.n = o.n; l.u = u; } else cmCfg().links.push({ id: uid(), n: o.n.trim(), u }); save(true); TF.render(); }); },
  cmLinkDel(el) { cmCfg().links = cmCfg().links.filter(x => x.id !== el.dataset.id); save(true); TF.render(); },
  cmLinkOpen(el) { const l = cmCfg().links.find(x => x.id === el.dataset.id); if (l) extOpen(l.u); },
  cmLinkCopy(el) { const l = cmCfg().links.find(x => x.id === el.dataset.id), cl = cmCl(); try { navigator.clipboard.writeText(cmRosterTxt(cl)); } catch (e) { } toast('「' + cl.name + '」 명단(번호·이름)을 복사했어요. 열린 사이트에 붙여 넣으세요.'); if (l) extOpen(l.u); },
  async cmLinkXls() { const cl = cmCl(); try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); } catch (e) { return toast('엑셀 도구를 불러오지 못했습니다.'); } const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['번호', '이름'], ...cmStus(cl).map(s => [s.no, s.name])]), '명단'); const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out])); a.download = cl.name + '_명단.xlsx'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
});

/* ---------- 보안 · 백업 ---------- */
function cmSec() {
  return `<div class="cmcard"><h4>🔒 이 기기에만 저장</h4><p>학생 정보(명렬·출결·상담·특이사항 등)는 <b>이 브라우저의 저장소에만</b> 있고 서버로 가지 않아요. 클라우드 동기화·일반 백업에도 포함되지 않아요. 다른 기기(폰↔PC)에는 자동으로 옮겨지지 않으니 아래 「암호 백업」으로 옮기세요.</p><p class="mu">브라우저 데이터를 지우거나 기기를 잃어버리면 복구할 수 없어요. 기기 화면 잠금을 꼭 걸고, 가끔 암호 백업을 받아 두세요.</p></div>
  <div class="cmcard"><h4>🔑 앱 암호(PIN)</h4><p>${CM.pin ? '암호가 설정되어 있어요.' : '설정하면 이 메뉴를 열 때마다 암호를 물어요.'}</p><div class="tools"><button class="btn sm pri" data-act="cmPin">${CM.pin ? '암호 바꾸기·끄기' : '암호 설정'}</button>${CM.pin ? '<button class="btn sm" data-act="cmLock">지금 잠그기</button>' : ''}</div></div>
  <div class="cmcard"><h4>💾 암호 백업·가져오기</h4><div class="tools"><button class="btn sm pri" data-act="cmExp">암호 걸어 내려받기</button><label class="btn sm file">백업 파일 불러오기<input type="file" accept=".tfcm" data-cmi="impfile"></label></div></div>
  <div class="cmcard"><h4>🗑 모두 지우기</h4><div class="tools"><button class="btn sm" data-act="cmWipe">이 기기의 학급 관리 데이터 모두 지우기</button></div></div>`;
}
const cmHash = async p => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tfcm|' + p)))].map(b => b.toString(16).padStart(2, '0')).join('');
const cmKey = async (p, salt) => { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(p), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); };
const cmB64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), cmUn64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
Object.assign(A, {
  async cmUnlock() { const v = (cmQ('cmpin') || {}).value || ''; if (await cmHash(v) === CM.pin) { cmUnl = true; TF.render(); } else toast('암호가 맞지 않아요.'); },
  cmLock() { cmUnl = false; TF.render(); },
  cmPin() { ask('앱 암호 설정', [{ k: 'p', label: '새 암호 (비우면 암호 끄기). 잊으면 복구할 수 없어요', type: 'password' }], async o => { CM.pin = o.p ? await cmHash(o.p) : ''; cmUnl = true; cmDo(); toast(o.p ? '암호를 설정했어요.' : '암호를 껐어요.'); }); },
  cmExp() { ask('암호 백업', [{ k: 'p', label: '백업 암호 (잊으면 열 수 없어요)', type: 'password', req: 1 }], async o => { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await cmKey(o.p, salt), data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(CM))); download('학급관리_암호백업_' + today() + '.tfcm', JSON.stringify({ v: 1, salt: cmB64(salt), iv: cmB64(iv), data: cmB64(data) }), 'application/octet-stream'); toast('암호 백업 파일을 내려받았어요.'); }, '내려받기'); },
  cmWipe() { sure('이 기기의 학급 관리 데이터(학생 명렬·기록 전부)를 지울까요? 되돌릴 수 없어요.', () => { CM = cmNew(); cmReady = true; cmUnl = true; idb.set(CMK, CM); cmCfg().cur = ''; save(true); TF.render(); }); }
});
async function cmImpFile(f) {
  const j = JSON.parse(await f.text());
  ask('백업 암호', [{ k: 'p', label: '백업 암호', type: 'password', req: 1 }], async o => { try { const key = await cmKey(o.p, cmUn64(j.salt)), pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: cmUn64(j.iv) }, key, cmUn64(j.data)); const d = JSON.parse(new TextDecoder().decode(pt)); sure('이 기기의 학급 관리 데이터를 백업 내용으로 바꿀까요?', () => { CM = Object.assign(cmNew(), d); cmUnl = true; cmReady = true; idb.set(CMK, CM); TF.render(); toast('불러왔어요.'); }); } catch (e) { toast('암호가 틀렸거나 파일이 손상되었어요.'); } }, '열기');
}

/* ---------- 입력·끌어놓기 ---------- */
document.addEventListener('change', e => {
  const t = e.target, k = t.dataset && t.dataset.cmi; if (!k) return; const a = k.split('|'), cl = cmCl();
  if (a[0] === 'rosterfile' || a[0] === 'evfile' || a[0] === 'impfile') { const f = t.files[0]; t.value = ''; if (f) (a[0] === 'rosterfile' ? cmImportFile(f) : a[0] === 'evfile' ? cmEvFile(f) : cmImpFile(f)); return; }
  if (!cmReady || !cl) return;
  if (a[0] === 'attd') { UI.cmDate = t.value; TF.render(); }
  else if (a[0] === 'atts') { const r = cmAttRec(cl, a[1]); r.s = +t.value; if (!r.s) { r.r = ''; r.d = false; } cmDo(); }
  else if (a[0] === 'attr') { cmAttRec(cl, a[1]).r = t.value; cmSave(); }
  else if (a[0] === 'attc') { cmAttRec(cl, a[1]).d = t.checked; cmDo(); }
  else if (a[0] === 'profsel') { UI.cmSt[cl.id] = t.value; TF.render(); }
  else if (a[0] === 'logf') { UI.cmSt['f' + a[1]] = t.value; TF.render(); }
  else if (a[0] === 'tpst') { UI.cmSt.tp = t.value; }
  else if (a[0] === 'moodd') { UI.cmMd = t.value; TF.render(); }
  else if (a[0] === 'pickn') UI.cmPn = +t.value; else if (a[0] === 'pickex') UI.cmPe = t.checked;
  else if (a[0] === 'lst') { const x = (CM.list[a[1]] || []).find(y => y.id === a[2]); if (x) { x.done = t.checked; cmDo(); } }
});
document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.cmi && t.dataset.cmi.startsWith('attr|') && cmCl()) { cmAttRec(cmCl(), t.dataset.cmi.split('|')[1]).r = t.value; cmSave(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'cmI-t') { e.preventDefault(); const b = document.querySelector('[data-act="cmListAdd"]'); if (b) b.click(); } if (e.key === 'Enter' && e.target.id === 'cmpin') A.cmUnlock(); });
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => {
  const z = e.target.closest && e.target.closest('[data-cmdrop]'); if (!z) return; e.preventDefault(); e.stopPropagation();
  if (ev === 'dragenter' || ev === 'dragover') z.classList.add('over'); else z.classList.remove('over');
  if (ev === 'drop') { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) (z.dataset.cmdrop === 'roster' ? cmImportFile(f) : cmEvFile(f)); }
}, true));

/* ---------- 오늘 화면 알림 카드 ---------- */
function cmAlerts() {
  const out = []; if (!cmReady || !cmCfg().on || cmLocked()) return out; const t = today();
  CM.classes.forEach(cl => {
    if (cmOn('duty')) CM.duty.filter(d => d.cls === cl.id && cmDutyToday(d)).forEach(d => out.push(`🧹 ${cl.name} ${d.name}: ${cmDutyTeam(d, cl).map(id => cmSn(cl, id)).join(', ') || '담당 없음'}${d.time ? ' (' + d.time + ')' : ''}`));
    if (cmOn('att')) { let n = 0; Object.keys(CM.att[cl.id] || {}).forEach(d => Object.keys(CM.att[cl.id][d]).forEach(id => { const r = CM.att[cl.id][d][id]; if (r && r.s > 0 && !r.d && dd(d) <= -3 && cl.stu.some(x => x.id === id)) n++; })); if (n) out.push(`📎 ${cl.name} 결석 서류 미제출 ${n}건`); }
    if (cmOn('coll') || cmOn('perf')) cmAll().filter(x => x.t === 'grid' && cmOn(x.id)).forEach(m => ((CM.grid[m.id] || {})[cl.id] || []).forEach(it => { if (!it.due) return; const k = dd(it.due), L = cmLab(m), n = cl.stu.filter(s => (it.st || {})[s.id] !== L.length - 1).length; if (n && k <= 2) out.push(`📥 ${cl.name} ${it.name} ${k < 0 ? '마감 지남' : k === 0 ? '오늘 마감' : 'D-' + k} · 미완료 ${n}명`); }));
  });
  cmAll().filter(x => x.t === 'log' && cmOn(x.id)).forEach(m => (CM.logs[m.id] || []).forEach(e => { if (e.fu && !e.fd && e.fu <= t) { const cl = CM.classes.find(c => c.id === e.cls); if (cl) out.push(`💬 ${cmName(m)} 후속 ${md(e.fu)}: ${e.stu ? cmSn(cl, e.stu) : cl.name} — ${e.text.slice(0, 24)}`); } }));
  if (cmOn('bday')) CM.classes.forEach(cl => cl.stu.forEach(s => { const b = cmBd(s), n = new Date(); if (b) { const k = Math.round((new Date(n.getFullYear(), b.m - 1, b.d) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); if (k >= 0 && k <= 3) out.push(`🎂 ${cl.name} ${s.name} 생일 ${k ? 'D-' + k : '오늘'}`); } }));
  if (cmOn('ev')) CM.ev.forEach(e => { const k = dd(e.date); if (k >= 0 && k <= 1) out.push(`📅 ${k ? '내일' : '오늘'} 행사: ${e.title}`); });
  return out;
}
const cmInject = () => {
  const main = document.querySelector('#app main'); if (!main || !S.setup) return; const ex = main.querySelector('.cmtoday'), isT = /^#\/(today)?$/.test(location.hash) || !location.hash;
  const L = isT ? cmAlerts() : []; if (ex) ex.remove(); if (!isT || !cmCfg().on || (S.navHide || []).includes('cm')) return;
  const d = document.createElement('div'); d.className = 'hpcard cmtoday'; d.innerHTML = `<b>🏫 ${esc(cmCfg().title)}</b> <a class="btn sm pri" href="#/cm">열기 ▶</a>${L.length ? '' : '<span class="mu"> 출결·상담·당번·행사 (오늘 알림 없음)</span>'}${L.slice(0, 8).map(x => `<div class="cmr">${esc(x)}</div>`).join('')}${L.length > 8 ? `<p class="mu">외 ${L.length - 8}건</p>` : ''}`;
  const a = main.querySelector('.hpcard') || main.querySelector('.cheer'); if (a) a.after(d); else main.prepend(d);
};
const _cmR = TF.render; TF.render = function () { const v = _cmR.apply(this, arguments); cmInject(); return v; };
(function () { const app = document.getElementById('app'); if (!app) return; let t = 0; new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { cmInject(); } catch (e) { } }, 0); }).observe(app, { childList: true }); })();

/* ---------- 꿈송이 챗봇 검색: 학급 관리 내용도 찾아 줍니다 (학생 정보는 외부 AI에는 보내지 않음) ---------- */
const _cmBc = buildChunks;
buildChunks = function () {
  const out = _cmBc.apply(this, arguments);
  { const q = (src, text, ref) => out.push({ type: 'class', src, text, ref: ref || '#/class' });
    (S.lessonLog || []).forEach(l => q('수업 기록 · ' + l.date, `${l.date} ${l.cls || ''} ${l.p ? l.p + '교시' : ''} 진도 ${l.prog || ''} 반응 ${l.react || ''} 다음 ${l.next || ''}`));
    (S.chkLists || []).forEach(l => q('나만의 점검표 · ' + l.name, `${l.name}: ` + l.items.map(i => i.t + (i.done ? '(완료)' : '(미완료)')).join(', '), '#/'));
    Object.keys(S.cellLinks || {}).forEach(k => (S.cellLinks[k] || []).forEach(x => q('수업 자료 연결', `${k} ${x.n} ${x.u}`)));
    const ek = typeof S.endList === 'object' && S.endList; if (ek) (Array.isArray(ek) ? ek : []).forEach(g => q('학기말 점검표 · ' + g.g, `${g.g}: ` + (g.items || []).join(', '), '#/'));
    Object.keys(S.weekRv || {}).forEach(k => { const w = S.weekRv[k]; if (w && (w.good || w.next)) q('한 주 돌아보기 · ' + k, `${k} 좋았던 일 ${w.good || ''} 다음 주 다짐 ${w.next || ''}`, '#/'); });
  }
  if (!cmReady || !cmCfg().on || cmLocked()) return out;
  const add = (src, text) => out.push({ type: 'class', src: '학급 관리 · ' + src, text, ref: '#/cm', priv: true });
  CM.classes.forEach(cl => {
    cmStus(cl).forEach(s => add('명렬', `${cl.name} ${s.no}번 ${s.name}${s.bd ? ' 생일 ' + s.bd : ''}${s.tel ? ' 연락처 ' + s.tel : ''}${s.memo ? ' ' + s.memo : ''}`));
    const L = cmLab(cmMod('att'));
    Object.keys(CM.att[cl.id] || {}).forEach(d => Object.keys(CM.att[cl.id][d]).forEach(id => { const r = CM.att[cl.id][d][id]; if (r && r.s > 0 && cl.stu.some(x => x.id === id)) add('출결', `${d} ${cl.name} ${cmSn(cl, id)} ${L[r.s]}${r.r ? ' 사유 ' + r.r : ''} 서류 ${r.d ? '제출' : '미제출'}`); }));
    cmAll().filter(x => x.t === 'grid').forEach(m => ((CM.grid[m.id] || {})[cl.id] || []).forEach(it => { const l = cmLab(m), no = cl.stu.filter(s => (it.st || {})[s.id] !== l.length - 1); add(cmName(m), `${cl.name} ${it.name}${it.due ? ' 마감 ' + it.due : ''} 미완료 ${no.length}명: ${no.map(s => s.no + '번 ' + s.name).join(', ')}`); }));
  });
  cmAll().filter(x => x.t === 'log').forEach(m => (CM.logs[m.id] || []).forEach(e => { const cl = CM.classes.find(c => c.id === e.cls); if (cl) add(cmName(m), `${e.date} ${cl.name} ${e.stu ? cmSn(cl, e.stu) : '반 전체'} ${e.tag || ''} ${e.text}${e.fu ? ' 후속 ' + e.fu : ''}`); }));
  cmAll().filter(x => x.t === 'list').forEach(m => (CM.list[m.id] || []).forEach(e => add(cmName(m), `${e.date} ${e.text}${e.done ? ' (완료)' : ''}`)));
  CM.duty.forEach(d => { const cl = CM.classes.find(c => c.id === d.cls); if (cl) add(d.kind === 'clean' ? '청소 당번' : '1인 1역', `${cl.name} ${d.name} ${cmDutyTxt(d)} 이번 담당 ${cmDutyTeam(d, cl).map(id => cmSn(cl, id)).join(', ')}`); });
  CM.ev.forEach(e => add('행사', `${e.date}${e.end ? '~' + e.end : ''} ${e.title} (${e.scope || ''}) ${e.note || ''}`));
  cmTpls().forEach(t => add('안내문 틀', t.n + ': ' + t.t));
  return out;
};

/* 화면 맨 아래에 버전 표시 — 옛 화면을 보고 있는지 바로 알 수 있게 */
const TF_VER = 'v180', _cmFt = footer;
footer = function () { return _cmFt.apply(this, arguments).replace('</footer>', ` · <span class="mu">버전 ${TF_VER} (학급 관리 포함)</span></footer>`); };

/* 새 버전 알림: 옛 화면이 남아 있으면 한 번 눌러 새로 받게 함 */
(function () {
  if (DEMO || !/^https?:/.test(location.protocol)) return;
  setTimeout(() => fetch('sw.js', { cache: 'no-store' }).then(r => r.text()).then(t => { const m = /VERSION = 'tf-(v\d+)'/.exec(t); if (m && m[1] !== TF_VER && +m[1].slice(1) > +TF_VER.slice(1)) { const b = document.createElement('div'); b.className = 'cmlock'; b.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:90;text-align:center'; b.innerHTML = '🔄 새 버전(' + m[1] + ')이 있어요. <button class="btn sm pri" id="cmnew">지금 새로 받기</button>'; document.body.appendChild(b); b.querySelector('#cmnew').onclick = async () => { try { (await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister()); (await caches.keys()).forEach(k => caches.delete(k)); } catch (e) { } location.reload(); }; } }).catch(() => { }), 3000);
})();

/* 어떤 화면 틀에서도 보이는 떠 있는 「학급 관리」 버튼 */
function cmFab() {
  let b = document.getElementById('cmfab'); const show = S.setup && cmCfg().on && !(S.navHide || []).includes('cm') && !/^#\/cm/.test(location.hash);
  if (!show) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('a'); b.id = 'cmfab'; b.className = 'cmfab'; b.href = '#/cm'; document.body.appendChild(b); }
  b.innerHTML = '🏫<span>' + esc(cmCfg().title || '학급 관리') + '</span>';
}
const _cmF2 = TF.render; TF.render = function () { const v = _cmF2.apply(this, arguments); try { cmFab(); } catch (e) { } return v; };
window.addEventListener('hashchange', () => { try { cmFab(); } catch (e) { } });
setTimeout(() => { try { cmFab(); } catch (e) { } }, 300);

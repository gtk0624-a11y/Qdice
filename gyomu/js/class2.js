/* 수업(시간표·일과표·교수학습 운영표/진도) 페이지 + 평가(정기고사·수행평가·평가계획서·루브릭) 페이지 */
const _classView0 = classView;
['exams', 'plans', 'rubrics'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; }); if (!S.prog || typeof S.prog !== 'object') S.prog = {};
const crud = k => { A['add_' + k] = () => ask(CFG[k].t + ' 추가', CFG[k].f({}), o => { S[k] = S[k] || []; S[k].push({ id: uid(), ...CFG[k].from(o) }); commit(); }); A['edit_' + k] = el => { const i = find(k, el.dataset.id); ask(CFG[k].t + ' 수정', CFG[k].f(i), o => { Object.assign(i, CFG[k].from(o)); commit(); }); }; A['del_' + k] = el => sure('지울까요?', () => { S[k] = S[k].filter(x => x.id !== el.dataset.id); commit(); }); };
CFG.exams = { t: '정기고사(지필)', f: i => [{ k: 'title', label: '시험 이름 (예: 1학기 중간고사 도덕)', val: i.title, req: 1 }, { k: 'grade', label: '학년', val: i.grade, ph: '예: 2학년' }, { k: 'date', label: '시험 날짜', type: 'date', val: i.date }, { k: 'range', label: '출제 범위', val: i.range, ph: '예: Ⅰ단원~Ⅱ단원 2' }, { k: 'ratio', label: '학기 성적 반영 비율(%)', type: 'number', val: i.ratio ?? '' }, { k: 'memo', label: '메모(문항 수·유형 등)', val: i.memo }], from: o => ({ title: o.title, grade: o.grade, date: o.date, range: o.range, ratio: o.ratio === '' ? '' : +o.ratio, memo: o.memo }) };
CFG.assess = { t: '수행평가', f: i => [{ k: 'title', label: '평가 이름', val: i.title, req: 1 }, { k: 'grade', label: '학년(예: 2학년)', val: i.grade }, { k: 'area', label: '평가 요소·성취기준', val: i.area, ph: '예: [9도01-03] 질문 만들기' }, { k: 'when', label: '시행 날짜', type: 'date', val: i.when }, { k: 'due', label: '성적 입력 기한', type: 'date', val: i.due }, { k: 'ratio', label: '학기 성적 반영 비율(%)', type: 'number', val: i.ratio ?? '' }, { k: 'rubricId', label: '연결할 루브릭', type: 'select', opts: ['(없음)', ...(S.rubrics || []).map(r => r.title)], val: ((S.rubrics || []).find(r => r.id === i.rubricId) || {}).title || '(없음)' }, { k: 'step', label: '진행 단계', type: 'select', opts: ASSESS_STEPS, val: ASSESS_STEPS[i.step || 0] }], from: o => ({ title: o.title, grade: o.grade, area: o.area, when: o.when, due: o.due, ratio: o.ratio === '' ? '' : +o.ratio, rubricId: ((S.rubrics || []).find(r => r.title === o.rubricId) || {}).id || '', step: ASSESS_STEPS.indexOf(o.step) }) };
['exams', 'assess'].forEach(crud);
/* ===== 수업 페이지 ===== */
function parsePlan(text, mode) {
  const lines = String(text).split(/[\n\f]/).map(s => s.replace(/[·․‥…\.]{3,}/g, ' ').trim()).filter(Boolean), rows = []; let unit = '';
  const roman = /^([Ⅰ-Ⅻ]+|[IVX]+)\s*[.\)．\s]\s*(.+)$/;
  for (const raw of lines) {
    if (raw.length > 120) continue;
    const cols = raw.split(/\s*\|\s*|\t| {2,}/).map(s => s.trim()).filter(Boolean);
    const rm = raw.match(roman); if (rm && !/차시/.test(raw)) { unit = rm[2].replace(/\s*\d{1,3}$/, '').trim(); continue; }
    if (mode === 'toc') { const m = raw.match(/^(?:\d+[.\)]\s*)?(.+?)\s+(\d{1,3})$/); if (m && m[1].length >= 2 && m[1].length < 50) rows.push({ id: uid(), n: rows.length + 1, unit, topic: m[1].replace(/^\d+[.\)]\s*/, '').trim() }); continue; }
    let n = 0, topic = '', u = unit;
    const m1 = raw.match(/^(\d{1,3})\s*차시\s*[:.\-]?\s*(.*)$/) || raw.match(/(?:^|\s)(\d{1,3})\s*차시\s*[:.\-]?\s*(.+)$/);
    if (m1 && m1[2]) { n = +m1[1]; topic = m1[2]; }
    else { const ni = cols.findIndex(c => /^\d{1,3}(?:차시)?$/.test(c)); if (ni >= 0 && cols.length >= 2) { n = parseInt(cols[ni]); const rest = cols.filter((c, i) => i !== ni && !/^\d{1,3}(?:[./~\-]\d{1,2})*$/.test(c)); topic = rest.sort((a, b) => b.length - a.length)[0] || ''; if (rest.length >= 2) { const first = cols.slice(0, ni).find(c => c.length > 1 && !/^\d/.test(c)); if (first) u = first; } } }
    if (n && topic && n < 400) rows.push({ id: uid(), n, unit: u, topic: topic.replace(/\s+/g, ' ').slice(0, 80) });
  }
  const seen = new Set(); return rows.filter(r => !seen.has(r.n) && seen.add(r.n)).sort((a, b) => a.n - b.n);
}
function planFromText(text, name, mode) {
  const modes = mode ? [mode] : ['table', 'toc'];
  let rows = []; for (const m of modes) { rows = parsePlan(text, m); if (rows.length >= 2) break; }
  if (rows.length < 2) return toast('차시표로 읽을 내용을 찾지 못했습니다. 「1차시 학습주제」처럼 줄마다 적거나, 표(엑셀)로 올려 보세요.');
  ask(`${rows.length}개 차시를 찾았습니다 — 이름·학년을 확인하세요`, [{ k: 'name', label: '운영표 이름', val: String(name || '교수학습 운영표').replace(/\.[a-z0-9]+$/i, ''), req: 1 }, { k: 'grade', label: '학년(숫자 하나, 예: 2)', val: (String(name).match(/([1-6])\s*학년/) || [])[1] || '' }], o => {
    const pl = { id: uid(), name: o.name, grade: (o.grade || '').trim(), rows }; S.plans.push(pl);
    (S.profile.classes || []).forEach(c => { if ((!pl.grade || c.startsWith(pl.grade + '-')) && !S.prog[c]) S.prog[c] = { planId: pl.id, upto: 0 }; });
    syncProg(); OPEN.add('plan' + pl.id); commit(); toast(`운영표를 만들었습니다. 수업이 끝나면 반 옆 [+1차시]만 누르세요.`);
  });
}
function planOf(c) { const pg = S.prog[c]; return pg && S.plans.find(p => p.id === pg.planId); }
function syncProg() { S.lessons = S.lessons.filter(l => !String(l.id).startsWith('pg-')); (S.profile.classes || []).forEach(c => { const pg = S.prog[c], pl = planOf(c); if (!pl) return; const r = pl.rows.find(x => x.n === (pg.upto || 1)) || pl.rows[0]; S.lessons.push({ id: 'pg-' + c, cls: c, unit: (r && (r.unit || r.topic)) || pl.name, done: pg.upto || 0, total: pl.rows.length }); }); }
function progHtml() {
  const cl = S.profile.classes || [];
  if (!S.plans.length) return `<div class="note2">아직 운영표가 없습니다. <b>교수학습 운영표(한글·엑셀·PDF)</b>나 <b>교과서 목차(PDF)</b>를 올리면 차시표가 만들어지고, 반별 진도는 [+1차시] 한 번으로 올라갑니다.</div>`;
  return `<div class="prg">${cl.map(c => { const pg = S.prog[c] || {}, pl = planOf(c), tot = pl ? pl.rows.length : 0, up = pg.upto || 0, nx = pl && pl.rows.find(r => r.n > up);
    return `<div class="prow"><b class="lc">${esc(c)}</b><select data-prog="${esc(c)}" aria-label="${esc(c)} 운영표"><option value="">(운영표 고르기)</option>${S.plans.map(p => `<option value="${p.id}" ${pg.planId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>${pl ? `${bar(tot ? Math.round(up / tot * 100) : 0)}<span class="num">${up}/${tot}</span><span class="nxt">${nx ? '다음 ' + nx.n + '차시: ' + esc(nx.topic) : '모두 나갔어요 🎉'}</span><button class="btn sm pri" data-act="progPlus" data-c="${esc(c)}" data-d="1">+1차시</button><button class="btn sm" data-act="progPlus" data-c="${esc(c)}" data-d="-1">−1</button>` : ''}</div>`; }).join('')}</div>`;
}
function planTables() { return S.plans.map(p => `<details class="row2 pln" ${OPEN.has('plan' + p.id) ? 'open' : ''} data-open="plan${p.id}"><summary><b>${esc(p.name)}</b> <span class="mu">${p.grade ? p.grade + '학년 · ' : ''}${p.rows.length}차시</span></summary><table class="tbl"><thead><tr><th>차시</th><th>단원</th><th>학습 주제</th><th>나간 반</th><th></th></tr></thead><tbody>${p.rows.map(r => { const got = (S.profile.classes || []).filter(c => (S.prog[c] || {}).planId === p.id && (S.prog[c].upto || 0) >= r.n); return `<tr class="${got.length ? 'gone' : ''}"><td>${r.n}</td><td>${esc(r.unit)}</td><td>${esc(r.topic)}</td><td>${got.map(c => `<span class="chp k-일정">${esc(c)}</span>`).join('')}</td><td><button class="x" data-act="planHere" data-p="${p.id}" data-n="${r.n}">여기까지</button></td></tr>`; }).join('')}</tbody></table><div class="tools"><button class="btn sm" data-act="planAddRow" data-p="${p.id}">+ 차시 추가</button><button class="btn sm" data-act="planRename" data-p="${p.id}">이름 고치기</button><button class="x" data-act="planDel" data-p="${p.id}">운영표 지우기</button></div></details>`).join(''); }
classView = function () {
  const old = _classView0(), a = old.indexOf('<h3 class="h3">시간표'), b = old.indexOf('<h3 class="h3">수업 진도');
  const tt = a >= 0 && b > a ? old.slice(a, b).replace(/<h3 class="h3">시간표 · 일과표<\/h3>/, '<h3 class="h3">① 시간표 · 일과표 <span class="mu">(내가 수업하는 시간)</span></h3><div class="note2"><b>무엇을 하는 곳인가요?</b> 아래 표는 <b>내 주간 시간표</b>입니다. 칸을 눌러 「2-1 도덕」처럼 직접 적거나, 컴시간알리미·파일·붙여넣기로 한 번에 넣을 수 있어요. 여기 적은 내용은 <b>오늘 화면의 "일과"</b>, <b>시계의 "지금은 몇 교시"</b>, 꿈송이 검색에 쓰입니다. 비워 둔 칸은 업무 시간으로 봅니다. <b>일과표</b>는 교시별 시작·끝 시각(종 시각)이며, 파일·붙여넣기로 넣으면 쉬는 시간·점심시간까지 반영됩니다.</div>') : '';
  const lessonsOld = S.lessons.filter(l => !String(l.id).startsWith('pg-'));
  return `<div class="bh"><h2>수업</h2><span class="mu">시간표 · 일과표 · 교수학습 운영표(진도)를 한곳에서 관리합니다.</span></div>
  <div class="steps2"><b>처음이라면 이 순서로</b><ol><li>시간표를 넣는다 (컴시간 자동 / 직접 입력)</li><li>일과표(종 시각)를 넣는다 → 시계가 "지금은 3교시"를 알려 줘요</li><li>교수학습 운영표나 교과서 목차(PDF)를 올린다 → 차시표가 만들어져요</li><li>수업 후 반 옆 [+1차시]만 누른다</li></ol></div>
  ${tt}
  <h3 class="h3">② 교수학습 운영표 · 수업 진도</h3><p class="mu">진도를 일일이 숫자로 고치지 않아도 됩니다. 운영표(차시가 적힌 표)나 교과서 <b>목차 PDF</b>를 넣으면 차시표가 만들어지고, 수업이 끝나면 [+1차시]만 누르세요. 표의 [여기까지]로 반을 골라 한 번에 지정할 수도 있어요.</p>
  <div class="tools"><label class="btn pri file">운영표 올리기(한글·엑셀·PDF)<input type="file" data-planup="table" accept=".txt,.csv,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" hidden></label><label class="btn file">교과서 목차(PDF)로 만들기<input type="file" data-planup="toc" accept=".txt,.pdf,.hwp,.hwpx,.docx,.xlsx,.xls" hidden></label><button class="btn" data-act="planPaste">차시 붙여넣기</button></div>
  ${progHtml()}${planTables()}
  ${lessonsOld.length ? `<details class="row2"><summary><b>예전 방식 진도(단원별 숫자 입력)</b> <span class="mu">${lessonsOld.length}건</span></summary>${lessonsOld.map(l => `<div class="ls"><span class="lc">${esc(l.cls)}</span><span class="lu">${esc(l.unit)}</span>${bar(lessonPct(l))}<span class="num">${l.done}/${l.total}</span><button class="x" data-act="edit_lessons" data-id="${l.id}">수정</button>${xbtn('del_lessons', l.id)}</div>`).join('')}</details>` : ''}
  <div class="tools"><button class="btn sm" data-act="add_lessons">+ 단원별 진도 직접 추가</button><button class="btn sm" data-act="lessonAll">반 한 번에 만들기</button></div>
  <p class="mu">수행평가·정기고사·루브릭은 <a href="#/eval">평가</a> 화면으로 옮겼습니다.</p>${typeof fileBox === 'function' ? fileBox('class', '운영표') : ''}`;
};
Object.assign(A, {
  progPlus(el) { const c = el.dataset.c, pl = planOf(c); if (!pl) return; const pg = S.prog[c]; pg.upto = Math.max(0, Math.min(pl.rows.length, (pg.upto || 0) + +el.dataset.d)); syncProg(); commit(); },
  planHere(el) { const p = S.plans.find(x => x.id === el.dataset.p), n = +el.dataset.n, cl = S.profile.classes || []; const d = document.createElement('dialog'); d.className = 'dlg'; d.innerHTML = `<form method="dialog"><h3>${n}차시까지 나간 반</h3><p class="mu">체크한 반의 진도가 ${n}차시로 지정됩니다.</p><div class="rfl">${cl.map(c => `<label class="chk"><input type="checkbox" name="${esc(c)}" ${((S.prog[c] || {}).planId === p.id || !(S.prog[c])) ? 'checked' : ''}> ${esc(c)}</label>`).join('')}</div><div class="btns"><button value="ok" class="pri">지정</button><button value="cancel">취소</button></div></form>`; document.body.appendChild(d); d.addEventListener('close', () => { if (d.returnValue === 'ok') { new FormData(d.querySelector('form')).forEach((v, c) => { S.prog[c] = { planId: p.id, upto: n }; }); syncProg(); commit(); } d.remove(); }); d.showModal(); },
  planPaste() { ask('차시 붙여넣기', [{ k: 'name', label: '운영표 이름', val: '교수학습 운영표' }, { k: 'text', label: '「1차시 학습주제」처럼 줄마다 (표를 복사해 붙여도 됩니다)', type: 'textarea', rows: 10, req: 1 }], o => planFromText(o.text, o.name)); },
  planAddRow(el) { const p = S.plans.find(x => x.id === el.dataset.p); ask('차시 추가', [{ k: 'n', label: '차시 번호', type: 'number', val: p.rows.length + 1 }, { k: 'unit', label: '단원', val: (p.rows[p.rows.length - 1] || {}).unit }, { k: 'topic', label: '학습 주제', req: 1 }], o => { p.rows.push({ id: uid(), n: +o.n, unit: o.unit, topic: o.topic }); p.rows.sort((a, b) => a.n - b.n); syncProg(); commit(); }); },
  planRename(el) { const p = S.plans.find(x => x.id === el.dataset.p); ask('이름 고치기', [{ k: 'name', label: '운영표 이름', val: p.name, req: 1 }], o => { p.name = o.name; syncProg(); commit(); }); },
  planDel(el) { sure('이 운영표를 지울까요? (반별 진도 연결도 풀립니다)', () => { const id = el.dataset.p; S.plans = S.plans.filter(x => x.id !== id); Object.keys(S.prog).forEach(c => { if (S.prog[c].planId === id) delete S.prog[c]; }); syncProg(); commit(); }); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset && t.dataset.planup) { const f = t.files[0]; if (!f) return; const mode = t.dataset.planup; t.value = ''; const added = await ingestFiles([f], { from: 'class', kind: mode === 'toc' ? '교육과정' : '운영표', noAsk: true }); const d = added[0]; if (d && d.text) planFromText(d.text, d.name, mode === 'toc' ? 'toc' : null); else toast('글자를 읽지 못했습니다. 원본은 아카이브에 보관했어요. 붙여넣기를 써 보세요.'); }
  else if (t.dataset && t.dataset.prog !== undefined) { const c = t.dataset.prog; if (t.value) S.prog[c] = { planId: t.value, upto: (S.prog[c] || {}).upto || 0 }; else delete S.prog[c]; syncProg(); commit(); }
}, true);
/* ===== 평가 페이지 ===== */
const RUB_PRESETS = { '수행평가 기본(3수준)': { levels: ['상', '중', '하'], pts: [5, 3, 1], crit: ['내용의 정확성', '적용·창의성', '표현·태도'] }, '서·논술형(4수준)': { levels: ['매우 우수', '우수', '보통', '노력 요함'], pts: [4, 3, 2, 1], crit: ['주장의 명확성', '근거의 타당성', '논리적 구성', '표현의 정확성'] }, '모둠 활동(3수준)': { levels: ['상', '중', '하'], pts: [5, 3, 1], crit: ['과제 이해', '협력·참여', '결과물 완성도'] } };
function rubTotal(r) { return r.crit.reduce((a, c) => a + Math.max(0, ...r.pts.map(x => +x || 0)), 0); }
function rubHtml(r) { return `<details class="row2 rub" ${OPEN.has('rub' + r.id) ? 'open' : ''} data-open="rub${r.id}"><summary><b>${esc(r.title)}</b> <span class="mu">기준 ${r.crit.length}개 · 만점 ${rubTotal(r)}점</span></summary><div class="ctw"><table class="tbl rubt"><thead><tr><th>평가 기준</th>${r.levels.map((l, li) => `<th>${esc(l)}<br><input class="pt" type="number" data-rub="${r.id}" data-k="pt" data-li="${li}" value="${r.pts[li]}" aria-label="${esc(l)} 점수">점</th>`).join('')}<th></th></tr></thead><tbody>${r.crit.map((c, ci) => `<tr><td><input data-rub="${r.id}" data-k="name" data-ci="${ci}" value="${esc(c.name)}" aria-label="평가 기준"></td>${r.levels.map((l, li) => `<td><textarea rows="3" data-rub="${r.id}" data-k="desc" data-ci="${ci}" data-li="${li}" aria-label="${esc(c.name)} ${esc(l)} 수준">${esc(c.desc[li] || '')}</textarea></td>`).join('')}<td><button class="x" data-act="rubRowDel" data-r="${r.id}" data-ci="${ci}">✕</button></td></tr>`).join('')}</tbody></table></div><div class="tools"><button class="btn sm" data-act="rubRowAdd" data-r="${r.id}">+ 평가 기준 추가</button><button class="btn sm" data-act="rubCopy" data-r="${r.id}">표 복사(한글·엑셀에 붙여넣기)</button><button class="btn sm" data-act="rubCsv" data-r="${r.id}">엑셀(CSV) 받기</button><button class="btn sm" data-act="rubPrint" data-r="${r.id}">인쇄</button><button class="x" data-act="rubDel" data-r="${r.id}">루브릭 지우기</button></div></details>`; }
function evalView() {
  const ex = [...(S.exams || [])].sort((a, b) => (a.date || '9').localeCompare(b.date || '9')), as = S.assess, tot = ex.reduce((a, x) => a + (+x.ratio || 0), 0) + as.reduce((a, x) => a + (+x.ratio || 0), 0);
  const sum = [...ex.map(x => ({ d: x.date, t: x.title, k: '정기고사', r: x.ratio })), ...as.map(x => ({ d: x.when || x.due, t: x.title, k: '수행평가', r: x.ratio }))].sort((a, b) => (a.d || '9').localeCompare(b.d || '9'));
  return `<div class="bh"><h2>평가</h2><span class="mu">정기고사 · 수행평가 · 평가계획서 · 루브릭을 한곳에서 관리합니다.</span></div>
  <div class="steps2"><b>이 화면에서 하는 일</b><ol><li><b>평가계획서</b>를 올려 보관한다 (한글·PDF·워드)</li><li><b>정기고사</b>와 <b>수행평가</b>를 등록한다 (날짜·비율·성취기준) → 캘린더에 자동으로 나와요</li><li><b>루브릭</b>을 만들어 수행평가에 연결한다</li><li>수행평가는 계획→안내→수행→채점→입력→확정 단계를 눌러 표시한다</li></ol></div>
  <h3 class="h3">평가 한눈에 <span class="mu">반영 비율 합계 ${tot}% ${tot && tot !== 100 ? '<b class="hot">(100%가 아니면 확인하세요)</b>' : ''}</span></h3>
  ${sum.length ? `<div class="ctw"><table class="tbl"><thead><tr><th>날짜</th><th>종류</th><th>이름</th><th>비율</th></tr></thead><tbody>${sum.map(s => `<tr><td>${s.d ? md(s.d) : '미정'}</td><td>${s.k}</td><td>${esc(s.t)}</td><td>${s.r === '' || s.r == null ? '-' : s.r + '%'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mu">등록된 평가가 없습니다. 아래에서 추가하세요.</p>'}
  <h3 class="h3">정기고사 (지필평가)</h3>${ex.map(x => `<div class="as"><div class="ah"><b>${esc(x.title)}</b> <span class="mu">${esc(x.grade || '')} ${x.date ? '· ' + md(x.date) + ' (' + DOW[new Date(x.date + 'T00:00:00').getDay()] + ')' : ''} ${x.ratio !== '' && x.ratio != null ? '· 반영 ' + x.ratio + '%' : ''}${x.range ? ' · 범위 ' + esc(x.range) : ''}${x.memo ? ' · ' + esc(x.memo) : ''}</span> <button class="x" data-act="edit_exams" data-id="${x.id}">수정</button>${xbtn('del_exams', x.id)}</div></div>`).join('')}<div class="addrow"><button class="btn sm" data-act="add_exams">+ 정기고사 추가</button></div>
  <h3 class="h3">수행평가</h3>${as.map(a => { const ru = (S.rubrics || []).find(r => r.id === a.rubricId); return `<div class="as"><div class="ah"><b>${esc(a.title)}</b> <span class="mu">${esc(a.grade || '')}${a.when ? ' · 시행 ' + md(a.when) : ''}${a.due ? ' · 입력기한 ' + md(a.due) : ''}${a.ratio !== '' && a.ratio != null ? ' · 반영 ' + a.ratio + '%' : ''}</span> <button class="x" data-act="edit_assess" data-id="${a.id}">수정</button>${xbtn('del_assess', a.id)}</div>${a.area ? `<p class="mu">평가 요소: ${esc(a.area)}</p>` : ''}${ru ? `<p class="mu">루브릭: <a href="#rub${ru.id}" data-act="rubOpen" data-r="${ru.id}">${esc(ru.title)}</a></p>` : ''}<div class="steps">${ASSESS_STEPS.map((s, i) => `<button class="stp1 ${i === (a.step || 0) ? 'on' : ''} ${i < (a.step || 0) ? 'past' : ''}" data-act="assessStep" data-id="${a.id}" data-s="${i}">${s}</button>`).join('')}</div></div>`; }).join('')}<div class="addrow"><button class="btn sm" data-act="add_assess">+ 수행평가 추가</button></div>
  <h3 class="h3">평가계획서</h3><p class="mu">올린 평가계획서는 자료 아카이브에 원본과 함께 보관되고, 꿈송이가 내용을 찾아 줍니다. 올리면 일정·할 일로 반영할지 물어봅니다.</p>${LIB.filter(d => d.kind === '평가계획서').map(d => `<p class="fbl">📄 <b>${esc(d.name)}</b> <span class="mu">${d.added}</span> <button class="x" data-act="docOpen" data-id="${d.id}">원본 열기</button> ${d.text ? `<button class="x" data-act="docBig" data-id="${d.id}">크게 보기</button>` : ''}</p>`).join('') || '<p class="mu">아직 올린 평가계획서가 없습니다.</p>'}
  <div class="tools"><label class="btn pri file">📎 평가계획서 올리기<input type="file" data-fbup="eval" data-fk="평가계획서" accept=".txt,.csv,.md,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" multiple hidden></label></div>
  <h3 class="h3">루브릭 만들기</h3><p class="mu">평가 기준 × 수준 표를 만들고 점수와 설명을 채웁니다. 입력하면 자동 저장되고, 한글·엑셀에 붙여넣거나 인쇄할 수 있어요.</p>${(S.rubrics || []).map(rubHtml).join('')}<div class="tools"><button class="btn pri" data-act="rubNew">+ 새 루브릭 만들기</button></div>
  ${typeof fileBox === 'function' ? fileBox('eval', '평가계획서') : ''}`;
}
const rubOf = id => S.rubrics.find(r => r.id === id);
const rubTsv = r => ['평가 기준\t' + r.levels.map((l, i) => `${l}(${r.pts[i]}점)`).join('\t'), ...r.crit.map(c => c.name + '\t' + r.levels.map((l, i) => String(c.desc[i] || '').replace(/[\t\n]+/g, ' ')).join('\t'))].join('\n');
Object.assign(A, {
  rubNew() {
    ask('새 루브릭', [{ k: 'title', label: '루브릭 이름 (예: 2학년 질문 만들기 수행평가)', req: 1 }, { k: 'preset', label: '시작 틀', type: 'select', opts: Object.keys(RUB_PRESETS) }], o => { const p = RUB_PRESETS[o.preset]; const r = { id: uid(), title: o.title, levels: [...p.levels], pts: [...p.pts], crit: p.crit.map(n => ({ name: n, desc: p.levels.map(() => '') })) }; S.rubrics.push(r); OPEN.add('rub' + r.id); commit(); toast('루브릭 틀을 만들었습니다. 칸에 수준별 설명을 적으세요.'); });
  },
  rubRowAdd(el) { const r = rubOf(el.dataset.r); r.crit.push({ name: '새 평가 기준', desc: r.levels.map(() => '') }); OPEN.add('rub' + r.id); commit(); },
  rubRowDel(el) { const r = rubOf(el.dataset.r); r.crit.splice(+el.dataset.ci, 1); OPEN.add('rub' + r.id); commit(); },
  rubDel(el) { sure('이 루브릭을 지울까요?', () => { S.rubrics = S.rubrics.filter(r => r.id !== el.dataset.r); S.assess.forEach(a => { if (a.rubricId === el.dataset.r) a.rubricId = ''; }); commit(); }); },
  rubCopy(el) { const r = rubOf(el.dataset.r); (navigator.clipboard ? navigator.clipboard.writeText(rubTsv(r)) : Promise.reject()).then(() => toast('복사했습니다. 한글·엑셀에서 붙여넣으세요.')).catch(() => toast('복사하지 못했습니다. CSV 받기를 써 주세요.')); },
  rubCsv(el) { const r = rubOf(el.dataset.r); download(r.title + '_루브릭.csv', '﻿' + rubTsv(r).split('\n').map(l => l.split('\t').map(c => '"' + c.replace(/"/g, '""') + '"').join(',')).join('\r\n'), 'text/csv'); },
  rubPrint(el) { const r = rubOf(el.dataset.r), w = window.open('', '_blank'); if (!w) return toast('팝업이 막혀 있습니다. 허용해 주세요.'); w.document.write(`<title>${esc(r.title)}</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:8px;vertical-align:top;font-size:13px}th{background:#eee}</style><h2>${esc(r.title)} 평가 루브릭</h2><table><tr><th>평가 기준</th>${r.levels.map((l, i) => `<th>${esc(l)} (${r.pts[i]}점)</th>`).join('')}</tr>${r.crit.map(c => `<tr><td><b>${esc(c.name)}</b></td>${r.levels.map((l, i) => `<td>${esc(c.desc[i] || '')}</td>`).join('')}</tr>`).join('')}</table><script>setTimeout(()=>print(),300)<\/script>`); w.document.close(); },
  rubOpen(el) { OPEN.add('rub' + el.dataset.r); render(); setTimeout(() => { const n = document.querySelector('[data-open="rub' + el.dataset.r + '"]'); n && n.scrollIntoView({ block: 'center' }); }, 50); }
});
document.addEventListener('input', e => {
  const t = e.target, id = t.dataset && t.dataset.rub; if (!id) return; const r = rubOf(id); if (!r) return;
  if (t.dataset.k === 'name') r.crit[+t.dataset.ci].name = t.value; else if (t.dataset.k === 'desc') r.crit[+t.dataset.ci].desc[+t.dataset.li] = t.value; else if (t.dataset.k === 'pt') r.pts[+t.dataset.li] = +t.value || 0;
  save(true);
});
/* 캘린더 연동: 정기고사 날짜·수행평가 시행일 */
const _allEvents0 = allEvents;
allEvents = function () { const e = _allEvents0(); (S.exams || []).forEach(x => { if (x.date) e.push({ date: x.date, t: x.title + (x.range ? ' (' + x.range + ')' : ''), kind: '평가', done: false }); }); S.assess.forEach(a => { if (a.when) e.push({ date: a.when, t: a.title + ' 시행', kind: '평가', done: (a.step || 0) >= 3 }); }); return e; };
syncProg();

/* ---- 일과표(종 시각)·급식 시간 직접 수정 ---- */
function bellEditor() {
  const base = (S.profile.bell && S.profile.bell.length) ? S.profile.bell.map(x => ({ p: x.p, s: x.s, e: x.e })).sort((a, b) => a.p - b.p) : _clkP0().map(x => ({ ...x })), L = _clkL0(base), ov = bellOvs();
  return `<details class="row2" open><summary><b>일과표(종 시각) · 급식 시간 직접 고치기</b> <span class="mu">파일 없이 여기서 바로 수정</span></summary>
  <p class="mu">시각 칸을 누르고 바꾸면 바로 저장되고, 시계의 "지금은 몇 교시"와 오늘 화면에 반영됩니다.</p>
  <table class="tbl"><thead><tr><th>교시</th><th>시작</th><th>끝</th><th></th></tr></thead><tbody>${base.map(x => `<tr><td>${x.p}교시</td><td><input type="time" data-bellp="${x.p}" data-w="s" value="${clkHM(x.s)}"></td><td><input type="time" data-bellp="${x.p}" data-w="e" value="${clkHM(x.e)}"></td><td><button class="x" data-act="bellDelP" data-p="${x.p}">삭제</button></td></tr>`).join('')}
  <tr><td><b>급식</b></td><td><input type="time" data-belll="s" value="${clkHM(L[0])}"></td><td><input type="time" data-belll="e" value="${clkHM(L[1])}"></td><td></td></tr></tbody></table>
  <div class="tools"><button class="btn sm" data-act="bellAddP">+ 교시 추가</button><button class="btn sm" data-act="bellReset">기본값으로 되돌리기</button></div>
  ${ov.length ? `<p class="mu"><b>행사 일과(그날만 적용)</b></p>${ov.map(o => `<div class="ls"><span class="lu">${esc(o.label || '행사 일과')} · ${md(o.from)}${o.to > o.from ? '~' + md(o.to) : ''} · ${o.bell.map(x => x.p + '교시 ' + clkHM(x.s) + '~' + clkHM(x.e)).join(', ')}${o.lunch ? ' · 급식 ' + clkHM(o.lunch[0]) + '~' + clkHM(o.lunch[1]) : ''}</span><button class="x" data-act="bellOvDel" data-id="${o.id}">삭제</button></div>`).join('')}` : ''}
  </details>`;
}
const _classView1 = classView;
classView = function () { const h = _classView1(), i = h.indexOf('<h3 class="h3">② 교수학습'); return i < 0 ? h : h.slice(0, i) + bellEditor() + h.slice(i); };
function bellSaveFrom(root) {
  const rows = {}; root.querySelectorAll('[data-bellp]').forEach(i => { const p = +i.dataset.bellp, v = clkParse(i.value); (rows[p] = rows[p] || { p })[i.dataset.w] = v; });
  const L = Object.values(rows).filter(x => x.s != null && x.e != null && x.e > x.s).sort((a, b) => a.p - b.p);
  if (L.length < 1) return toast('시작·끝 시각을 확인해 주세요(끝이 시작보다 늦어야 합니다).');
  const dur = L.map(x => x.e - x.s), gaps = L.slice(1).map((x, i) => x.s - L[i].e).filter(g => g >= 0 && g <= 20);
  S.profile.bell = L; S.profile.start = clkHM(L[0].s); S.profile.classMin = modeOf(dur); if (gaps.length) S.profile.breakMin = modeOf(gaps);
  const a = root.querySelector('[data-belll="s"]'), b = root.querySelector('[data-belll="e"]');
  if (a && b && clkParse(a.value) != null && clkParse(b.value) != null && clkParse(b.value) > clkParse(a.value)) { S.profile.lunchS = a.value; S.profile.lunchE = b.value; }
  commit(); toast('일과표를 저장했습니다.');
}
document.addEventListener('change', e => { const t = e.target; if (t.dataset && (t.dataset.bellp || t.dataset.belll)) bellSaveFrom(t.closest('table') || document); });
Object.assign(A, {
  bellAddP() { const L = (S.profile.bell && S.profile.bell.length) ? S.profile.bell.slice() : _clkP0().map(x => ({ ...x })); const last = L[L.length - 1] || { p: 0, e: 8 * 60 + 50 }, len = +S.profile.classMin || 45; L.push({ p: last.p + 1, s: last.e + (+S.profile.breakMin || 10), e: last.e + (+S.profile.breakMin || 10) + len }); S.profile.bell = L; commit(); },
  bellDelP(el) { const L = _clkP0().filter(x => x.p !== +el.dataset.p); if (!L.length) return toast('교시가 하나는 있어야 합니다.'); S.profile.bell = L; commit(); },
  bellReset() { sure('일과표를 기본값(9시 시작·45분 수업·10분 쉬는 시간)으로 되돌릴까요?', () => { S.profile.bell = []; S.profile.lunchS = ''; S.profile.lunchE = ''; commit(); }); },
  bellOvDel(el) { S.profile.bellOv = bellOvs().filter(o => o.id !== el.dataset.id); commit(); }
});

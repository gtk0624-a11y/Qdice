/* 총괄(v82): 여러 업무를 한꺼번에 돌보는 화면. 탭 7개 — 총괄판 · 연간 사이클 · 월 점검 · 안건 · 사안 대장 · 요청 · 돌아보기, 그리고 「인수인계 한 권」.
   저장: S.cycle{월:[{id,t,done:{학년도:true}}]} · S.agenda[] · S.cases[] · S.reqs[] · S.retro[].
   사안 대장은 이름 없이 번호·단계·기한만 받으며, 챗봇 검색·인수인계 문서에 메모를 내보내지 않습니다. */
const HUB_TABS = [['board', '총괄판'], ['cycle', '연간'], ['check', '월 점검'], ['agenda', '안건'], ['case', '사안 대장'], ['req', '요청'], ['retro', '돌아보기']];
const CS_ST = ['접수', '사실확인', '보호조치', '심의', '통보', '종결'], AG_KIND = ['부서 회의', '학운위', '위원회', '기타'], HUB_M = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2];
const hubSY = () => (typeof schoolYearNow === 'function' ? schoolYearNow() : new Date().getFullYear());
const hubOpenCases = () => (S.cases || []).filter(c => c.stage !== '종결');
const hubOpenReqs = () => (S.reqs || []).filter(r => !r.done);
const hubOpenAg = () => (S.agenda || []).filter(a => !a.done);
const hubOpenDl = () => (S.docLog || []).filter(x => typeof dlSt === 'function' ? dlSt(x) !== '완료' : !x.done);
const NAME_SKIP = ['해당', '관련', '피해', '가해', '신고', '재학', '전체', '모든', '일부', '본인', '담임', '타교', '남자', '여자', '같은', '다른', '그', '이'];
const hasName = t => { const re = /([가-힣]{2,4})\s?(학생|선생님|선생|교사|학부모|어머니|아버지)(?![가-힣])/g; let m; while ((m = re.exec(t))) if (!NAME_SKIP.some(k => m[1].endsWith(k))) return true; return false; };

function hubBoard() {
  const C = wkD().cards.map(wkN).filter(c => c.me !== false), open = C.filter(c => !c.done), by = WK_ST.map((s, i) => [s, open.filter(c => (c.stage || 0) === i)]);
  const soon = open.filter(c => c.due && dd(c.due) !== null && dd(c.due) <= 7).sort((a, b) => a.due.localeCompare(b.due)), st = wkStalled().filter(c => c.me !== false);
  const kp = [['진행 업무', open.length], ['7일 내 기한', soon.length], ['멈춘 업무', st.length], ['진행 공문', hubOpenDl().length], ['진행 사안', hubOpenCases().length], ['미결 안건', hubOpenAg().length], ['회신 대기', hubOpenReqs().length]];
  return `<div class="hubkp">${kp.map(k => `<div class="${k[1] && ['7일 내 기한', '멈춘 업무'].includes(k[0]) ? 'hot' : ''}"><b class="num">${k[1]}</b><span>${k[0]}</span></div>`).join('')}</div>
  ${soon.length ? `<h4 class="dlh">⏰ 기한이 가까운 업무</h4>${soon.map(c => `<div class="cmal">${ddText(dd(c.due))} <b>${esc(c.title)}</b></div>`).join('')}` : ''}
  ${st.length ? `<h4 class="dlh">🐌 14일 넘게 손 안 댄 업무</h4>${st.slice(0, 8).map(c => `<div class="cmal">${esc(c.title)} <small class="mu">${wkDaysAgo(c.sd || c.cd)}일째</small></div>`).join('')}` : ''}
  <h4 class="dlh">단계별 업무</h4><div class="hubcols">${by.filter(x => x[0] !== '완료').map(([s, L]) => `<div class="hubcol"><b>${s} <span class="mu">${L.length}</span></b>${L.slice(0, 8).map(c => `<div>${esc(c.title)}${c.due ? ` <small class="mu">${md(c.due)}</small>` : ''}</div>`).join('') || '<small class="mu">-</small>'}${L.length > 8 ? `<small class="mu">외 ${L.length - 8}건</small>` : ''}</div>`).join('')}</div>
  <p class="mu">업무 카드는 「내 업무」에서 단계를 바꾸면 여기에 바로 반영됩니다.</p>`;
}
function hubCycle() {
  const sy = hubSY(), cm = new Date().getMonth() + 1, cy = S.cycle || {};
  return `<p class="mu">달마다 되풀이되는 부서 업무를 적어 두고 올해 한 것을 체크합니다(${sy}학년도). 해가 바뀌면 체크만 새로 시작됩니다.</p>` + HUB_M.map(m => { const L = cy[m] || [], dn = L.filter(x => (x.done || {})[sy]).length;
    return `<details class="doc" ${m === cm || m === cm % 12 + 1 ? 'open' : ''}><summary><b>${m}월</b> <span class="mu">${L.length ? `${dn}/${L.length}` : ''}${m === cm ? ' · 이번 달' : ''}</span></summary>${L.map(x => `<div class="hubrow"><button class="x" data-act="cyTog" data-m="${m}" data-id="${x.id}">${(x.done || {})[sy] ? '☑' : '☐'}</button><span class="${(x.done || {})[sy] ? 'mu' : ''}">${esc(x.t)}</span><button class="x" data-act="cyDel" data-m="${m}" data-id="${x.id}">✕</button></div>`).join('')}<button class="btn sm" data-act="cyAdd" data-m="${m}">+ ${m}월 업무</button></details>`; }).join('');
}
function hubCheck() {
  const n = new Date(), nm = new Date(n.getFullYear(), n.getMonth() + 1, 1), key = ymd(nm).slice(0, 7), ev = allEvents().filter(e => e.date.startsWith(key) && e.kind !== '학사' && !e.done);
  const rows = []; const ok = (b, t) => rows.push(`<div class="cmal">${b ? '✅' : '⚠'} ${t}</div>`);
  const dl = hubOpenDl().length, un = typeof bdUnused === 'function' ? bdUnused() : null, miss = typeof bdAll === 'function' ? bdAll().filter(x => bdMiss(x.s).length).length : 0, wm = wkD().cards.filter(c => !c.done && c.me !== false && typeof wkMiss === 'function' && wkMiss(c).length).length, st = wkStalled().length;
  ok(!dl, dl ? `진행 중인 공문 ${dl}건` : '진행 중인 공문 없음'); ok(!st, st ? `멈춘 업무 ${st}건` : '멈춘 업무 없음'); ok(!un, un ? `예산 마감 ${un.left}일 전 · 안 쓴 돈 ${won(un.sum)}원` : '예산 불용 위험 없음'); ok(!miss, miss ? `예산 서류 미비 ${miss}건` : '예산 서류 이상 없음'); ok(!wm, wm ? `업무 카드 필요 문서 미비 ${wm}건` : '업무 카드 문서 이상 없음');
  ok(!hubOpenCases().length, hubOpenCases().length ? `진행 중인 사안 ${hubOpenCases().length}건` : '진행 중인 사안 없음'); ok(!hubOpenReqs().length, hubOpenReqs().length ? `회신 못 받은 요청 ${hubOpenReqs().length}건` : '회신 대기 없음'); ok(!hubOpenAg().length, hubOpenAg().length ? `결정 안 난 안건 ${hubOpenAg().length}건` : '미결 안건 없음');
  return `<p class="mu">한 달에 한 번 이 화면만 훑으면 놓친 것이 없는지 알 수 있습니다.</p>${rows.join('')}<h4 class="dlh">다음 달(${nm.getMonth() + 1}월) 일정 ${ev.length}건</h4>${ev.slice(0, 12).map(e => `<div class="cmal">${md(e.date)} ${esc(e.t)} <small class="mu">${esc(e.kind)}</small></div>`).join('') || '<p class="mu">학사 일정을 뺀 일정이 없습니다.</p>'}${ev.length > 12 ? `<p class="mu">외 ${ev.length - 12}건은 캘린더에서 확인하세요.</p>` : ''}`;
}
function hubAgenda() {
  const L = [...(S.agenda || [])].sort((a, b) => (b.d || '').localeCompare(a.d || ''));
  return `<p class="mu">회의에서 나온 안건과 결정 사항을 모으고, 결정된 일은 업무 카드로 보냅니다.</p><div class="tools"><button class="btn pri" data-act="agAddHub">+ 안건 기록</button></div>${L.map(a => `<div class="bdx ${a.done ? '' : 'warn'}"><div class="bdx1"><b>${md(a.d)}</b> <span class="chp">${esc(a.kind)}</span> ${esc(a.title)}</div>${a.decision ? `<p class="rqp"><b>결정</b> ${esc(a.decision)}</p>` : ''}<div class="tools"><button class="btn sm" data-act="agTog" data-id="${a.id}">${a.done ? '↩ 미결로' : '✔ 결정 완료'}</button>${a.card ? '<span class="mu">업무 카드로 보냄</span>' : `<button class="btn sm" data-act="agCard" data-id="${a.id}">📌 업무 카드로</button>`}<button class="x" data-act="agDel" data-id="${a.id}">✕</button></div></div>`).join('') || '<p class="mu">아직 기록이 없습니다.</p>'}`;
}
function hubCase() {
  const L = [...(S.cases || [])].sort((a, b) => (a.stage === '종결') - (b.stage === '종결') || (a.due || '9').localeCompare(b.due || '9'));
  return `<p class="mu">🔒 사안은 <b>이름 없이 번호로만</b> 관리합니다. 메모에도 학생·교사 이름을 적지 마세요(이 기기에만 저장되고 챗봇·인수인계 문서에는 메모가 나가지 않습니다). 기한은 관련 법령·학교 규정으로 직접 확인해 넣으세요.</p><div class="tools"><button class="btn pri" data-act="csAdd">+ 사안 접수</button></div>${L.map(c => `<div class="bdx ${c.stage === '종결' ? '' : 'warn'}"><div class="bdx1"><b>${esc(c.no)}</b> 접수 ${md(c.recv)} ${c.due && c.stage !== '종결' ? `· 기한 ${md(c.due)} ${ddText(dd(c.due))}` : ''}</div><div class="bdx2"><select data-csst="${c.id}" aria-label="사안 단계">${CS_ST.map(s => `<option ${c.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>${c.memo ? `<p class="rqp">${esc(c.memo)}</p>` : ''}<div class="tools"><button class="btn sm" data-act="csEdit" data-id="${c.id}">수정</button><button class="x" data-act="csDel" data-id="${c.id}">✕</button></div></div>`).join('') || '<p class="mu">진행 중인 사안이 없습니다.</p>'}`;
}
function hubReq() {
  const L = [...(S.reqs || [])].sort((a, b) => !!a.done - !!b.done || (a.due || '9').localeCompare(b.due || '9'));
  return `<p class="mu">다른 부서·담당에게 부탁한 일을 적어 두고, 회신이 오면 체크합니다. 사람 이름 대신 부서나 담당 업무로 적어도 충분합니다.</p><div class="tools"><button class="btn pri" data-act="rqHubAdd">+ 요청 적기</button></div>${L.map(r => `<div class="hubrow"><button class="x" data-act="rqHubTog" data-id="${r.id}">${r.done ? '☑' : '☐'}</button><span class="${r.done ? 'mu' : ''}"><b>${esc(r.to)}</b> · ${esc(r.what)} ${r.due && !r.done ? `<small class="${dd(r.due) < 0 ? 'hot' : 'mu'}">${md(r.due)} ${ddText(dd(r.due))}</small>` : ''}</span><button class="x" data-act="rqHubDel" data-id="${r.id}">✕</button></div>`).join('') || '<p class="mu">회신을 기다리는 요청이 없습니다.</p>'}`;
}
function hubRetro() {
  const L = [...(S.retro || [])].sort((a, b) => (b.y || 0) - (a.y || 0));
  return `<p class="mu">업무가 끝나면 한 줄씩 남기세요. 「내년에 바꿀 점」은 내년 같은 업무를 시작할 때 그대로 참고됩니다.</p><div class="tools"><button class="btn pri" data-act="rtAdd">+ 돌아보기 쓰기</button></div>${L.map(r => `<div class="bdx"><div class="bdx1"><b>${esc(r.title)}</b> <small class="mu">${r.y}학년도</small></div>${[['👍 잘된 점', r.good], ['😓 막힌 점', r.hard], ['🔧 내년에 바꿀 점', r.next]].filter(x => x[1]).map(x => `<p class="rqp"><b>${x[0]}</b> ${esc(x[1])}</p>`).join('')}<div class="tools"><button class="btn sm" data-act="rtEdit" data-id="${r.id}">수정</button><button class="x" data-act="rtDel" data-id="${r.id}">✕</button></div></div>`).join('') || '<p class="mu">아직 기록이 없습니다.</p>'}`;
}
function hubView() {
  const t = UI.hubTab || 'board', body = { board: hubBoard, cycle: hubCycle, check: hubCheck, agenda: hubAgenda, case: hubCase, req: hubReq, retro: hubRetro }[t]();
  return `<div class="bh"><h2>업무 총괄</h2><span class="mu">여러 업무를 한눈에 보고 빠뜨리지 않게 돕습니다.</span></div><div class="tools"><button class="btn" data-act="hubHand">📘 인수인계 한 권 받기</button></div>
  <div class="bdchips hubtabs">${HUB_TABS.map(([k, v]) => `<button class="x ${t === k ? 'on' : ''}" data-act="hubTab" data-k="${k}">${v}</button>`).join('')}</div>${body}`;
}
const hubAsk = (title, fields, ok, label) => ask(title, fields, o => { UI.hubTab = UI.hubTab || 'board'; ok(o); }, label);
Object.assign(A, {
  hubTab(el) { UI.hubTab = el.dataset.k; render(); },
  cyAdd(el) { const m = +el.dataset.m; ask(`${m}월 부서 업무`, [{ k: 't', label: '업무 (예: 인권 교육 계획 수립)', req: 1 }], o => { S.cycle = S.cycle || {}; (S.cycle[m] = S.cycle[m] || []).push({ id: uid(), t: o.t.trim(), done: {} }); commit(); }); },
  cyTog(el) { const x = ((S.cycle || {})[el.dataset.m] || []).find(v => v.id === el.dataset.id); if (x) { x.done = x.done || {}; const sy = hubSY(); x.done[sy] = !x.done[sy]; commit(); } },
  cyDel(el) { const m = el.dataset.m; if (S.cycle && S.cycle[m]) { S.cycle[m] = S.cycle[m].filter(v => v.id !== el.dataset.id); commit(); } },
  agAddHub() { hubAsk('안건 기록', [{ k: 'd', label: '날짜', type: 'date', val: today() }, { k: 'kind', label: '회의 종류', type: 'select', opts: AG_KIND }, { k: 'title', label: '안건', req: 1 }, { k: 'decision', label: '결정 사항 (아직이면 비워 두세요)', type: 'textarea', rows: 3 }], o => { (S.agenda = S.agenda || []).push({ id: uid(), d: o.d, kind: o.kind, title: o.title.trim(), decision: (o.decision || '').trim(), done: !!(o.decision || '').trim() }); commit(); }); },
  agTog(el) { const a = (S.agenda || []).find(x => x.id === el.dataset.id); if (a) { a.done = !a.done; commit(); } },
  agDel(el) { S.agenda = (S.agenda || []).filter(x => x.id !== el.dataset.id); commit(); },
  agCard(el) { const a = (S.agenda || []).find(x => x.id === el.dataset.id); if (!a) return; wkD().cards.push(wkN({ id: uid(), title: a.title, dept: '', who: '', me: true, memo: `${a.kind} ${a.d} 결정: ${a.decision || '(미정)'}`, due: '', done: false, steps: [], src: '안건' })); a.card = 1; commit(); toast('업무 카드로 보냈습니다(내 업무에서 확인).'); },
  csAdd() { csForm({}); },
  csEdit(el) { const c = (S.cases || []).find(x => x.id === el.dataset.id); if (c) csForm(c); },
  csDel(el) { sure('이 사안 기록을 지울까요?', () => { S.cases = (S.cases || []).filter(x => x.id !== el.dataset.id); commit(); }); },
  rqHubAdd() { hubAsk('요청 적기', [{ k: 'to', label: '요청한 곳 (부서·담당 업무)', req: 1, ph: '예: 교무부' }, { k: 'what', label: '부탁한 내용', req: 1 }, { k: 'due', label: '회신 받을 날', type: 'date' }], o => { (S.reqs = S.reqs || []).push({ id: uid(), to: o.to.trim(), what: o.what.trim(), due: o.due || '', done: false }); commit(); }); },
  rqHubTog(el) { const r = (S.reqs || []).find(x => x.id === el.dataset.id); if (r) { r.done = !r.done; commit(); } },
  rqHubDel(el) { S.reqs = (S.reqs || []).filter(x => x.id !== el.dataset.id); commit(); },
  rtAdd() { rtForm({ y: hubSY() }); },
  rtEdit(el) { const r = (S.retro || []).find(x => x.id === el.dataset.id); if (r) rtForm(r); },
  rtDel(el) { sure('이 기록을 지울까요?', () => { S.retro = (S.retro || []).filter(x => x.id !== el.dataset.id); commit(); }); },
  hubHand() {
    const sy = hubSY(), cards = wkD().cards.map(wkN).filter(c => c.me !== false), tb = (h, r) => `<table border=1 cellspacing=0 cellpadding=4 style="border-collapse:collapse"><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${r.map(x => `<tr>${x.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
    const cyc = HUB_M.map(m => ((S.cycle || {})[m] || []).length ? `<h4>${m}월</h4><ul>${S.cycle[m].map(x => `<li>${esc(x.t)}</li>`).join('')}</ul>` : '').join('');
    const html = `<html><head><meta charset="utf-8"></head><body style="font-family:'맑은 고딕';line-height:1.6"><h1>업무 인수인계 한 권</h1><p>작성일 ${today()} · ${esc(S.profile.name || '')} ${esc(S.profile.school || '')}</p>
<h2>1. 연간 업무 사이클</h2>${cyc || '<p>(기록 없음)</p>'}
<h2>2. 진행 중인 업무</h2>${cards.filter(c => !c.done).map(c => `<h4>${esc(c.title)}</h4><p>단계: ${WK_ST[c.stage || 0]}${c.due ? ' · 기한 ' + c.due : ''}</p>${c.memo ? `<p>${esc(c.memo).replace(/\n/g, '<br>')}</p>` : ''}${(c.steps || []).length ? `<ul>${c.steps.map(s => `<li>${s.d ? '☑' : '☐'} ${esc(s.t)}</li>`).join('')}</ul>` : ''}`).join('') || '<p>(없음)</p>'}
<h2>3. 내 업무 뼈대</h2>${(S.skel || []).length ? S.skel.map(s => `<h4>${esc(s.name)}</h4><p>${esc(s.memo || '')}</p><ul>${s.steps.map(x => `<li>${x.off > 0 ? '+' : ''}${x.off}일 ${esc(x.t)}</li>`).join('')}</ul>`).join('') : '<p>(없음)</p>'}
<h2>4. 예산</h2>${S.budget.length ? tb(['사업', '배정', '집행', '잔액', '비고'], S.budget.map(p => [esc(p.name), won(projAlloc(p)), won(projSpent(p)), won(projAlloc(p) - projSpent(p)), esc(p.note || '')])) : '<p>(없음)</p>'}
${typeof bdVendors === 'function' && bdVendors().length ? `<h4>거래 업체</h4>${tb(['업체', '거래', '합계', '연락처'], bdVendors().map(v => [esc(v.n), v.c + '건', won(v.sum), esc(((S.vendors || {})[v.n] || {}).tel || '')]))}` : ''}
<h2>5. 사안 대장 (번호·단계만)</h2>${(S.cases || []).length ? tb(['번호', '접수일', '단계', '기한'], S.cases.map(c => [esc(c.no), c.recv || '', c.stage, c.due || ''])) : '<p>(없음)</p>'}
<h2>6. 회신 대기 요청</h2>${hubOpenReqs().length ? `<ul>${hubOpenReqs().map(r => `<li>${esc(r.to)} · ${esc(r.what)} ${r.due || ''}</li>`).join('')}</ul>` : '<p>(없음)</p>'}
<h2>7. 돌아보기 (내년에 바꿀 점)</h2>${(S.retro || []).length ? S.retro.map(r => `<h4>${esc(r.title)} (${r.y})</h4><p>잘된 점: ${esc(r.good || '')}<br>막힌 점: ${esc(r.hard || '')}<br>내년에 바꿀 점: ${esc(r.next || '')}</p>`).join('') : '<p>(없음)</p>'}
<p style="color:#888">※ 업무파탈에서 자동으로 만든 문서입니다. 개인정보가 없는지 확인한 뒤 전달하세요.</p></body></html>`;
    download('인수인계한권_' + today() + '.doc', html, 'application/msword'); toast('인수인계 문서를 내려받았습니다.');
  }
});
function csForm(c) {
  const yy = String(new Date().getFullYear()).slice(2), nx = 'S-' + yy + '-' + String((S.cases || []).length + 1).padStart(3, '0');
  ask(c.id ? '사안 수정' : '사안 접수', [{ k: 'no', label: '사안 번호 (이름 대신 번호)', val: c.no || nx, req: 1 }, { k: 'recv', label: '접수일', type: 'date', val: c.recv || today() }, { k: 'due', label: '처리 기한 (법령·규정 확인 후)', type: 'date', val: c.due || '' }, { k: 'memo', label: '메모 (이름·연락처 금지)', type: 'textarea', rows: 3, val: c.memo || '' }], o => {
    const v = { no: o.no.trim(), recv: o.recv, due: o.due || '', memo: (o.memo || '').trim() }, save1 = () => { if (c.id) Object.assign(c, v); else (S.cases = S.cases || []).push(Object.assign({ id: uid(), stage: '접수' }, v)); commit(); };
    if (hasName(v.memo + ' ' + v.no)) sure('메모에 사람 이름이 들어 있는 것 같습니다. 번호로만 적는 것이 안전합니다. 그래도 저장할까요?', save1); else save1();
  }, '저장');
}
function rtForm(r) { ask(r.id ? '돌아보기 수정' : '돌아보기 쓰기', [{ k: 'title', label: '업무 이름', val: r.title || '', req: 1 }, { k: 'y', label: '학년도', type: 'number', val: r.y || hubSY() }, { k: 'good', label: '👍 잘된 점', type: 'textarea', rows: 2, val: r.good || '' }, { k: 'hard', label: '😓 막힌 점', type: 'textarea', rows: 2, val: r.hard || '' }, { k: 'next', label: '🔧 내년에 바꿀 점', type: 'textarea', rows: 2, val: r.next || '' }], o => { const v = { title: o.title.trim(), y: +o.y || hubSY(), good: o.good.trim(), hard: o.hard.trim(), next: o.next.trim() }; if (r.id) Object.assign(r, v); else (S.retro = S.retro || []).push(Object.assign({ id: uid() }, v)); commit(); }, '저장'); }
document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.csst) { const c = (S.cases || []).find(x => x.id === t.dataset.csst); if (c) { c.stage = t.value; commit(); } } });
/* 내 업무 뼈대를 시작할 때 같은 업무의 지난 돌아보기를 알려 줍니다 */
{ const _u = A.skUse; if (_u) A.skUse = function () { const r = (S.retro || []).filter(x => x.next); if (r.length) toast('지난 돌아보기 중 「내년에 바꿀 점」 ' + r.length + '건이 총괄 → 돌아보기에 있습니다.'); return _u.apply(this, arguments); }; }
if (typeof ORD_NAV !== 'undefined' && !ORD_NAV.some(x => x[0] === 'hub')) ORD_NAV.push(['hub', '총괄']);
if (typeof ARCH_PAGES !== 'undefined') ARCH_PAGES.hub = '업무 총괄';
if (typeof PAGE_KIND !== 'undefined') PAGE_KIND.hub = '';

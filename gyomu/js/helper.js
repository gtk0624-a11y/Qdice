/* 오늘 도우미: 퇴근 전 3분 정리 · 수업 후 한 줄 기록 · 반별 진도 점검 · 공강 활용 · 한 주 돌아보기 ·
   수업 자료 연결 · 회의 노트 틀 · 학기말 점검표 · 공문 기한 · 차시 아이디어(AI) · 학생 메모(이 기기 전용) · 운동 체크
   데이터: S.lessonLog[] · S.cellLink{} · S.endCk{} · S.endCustom[] · S.workout{} · S.weekRv{}  /  IDB 'stum'(학생 메모: 개인정보라 동기화 제외) */
const hpDay = n => { const x = new Date(); x.setDate(x.getDate() + (n || 0)); return ymd(x); };
const hpNextSchool = () => { for (let n = 1; ; n++) { const x = new Date(); x.setDate(x.getDate() + n); if (x.getDay() % 6) return { n, x, ds: ymd(x) }; } };
const hpDd = s => { const n = dd(s); return n === 0 ? '오늘' : n > 0 ? 'D-' + n : 'D+' + (-n); };
const hpClsOf = v => ((String(v || '').match(/^\s*(\d+\s*-\s*\d+)/) || [])[1] || String(v || '').split(/\s+/)[0] || '').replace(/\s/g, '');
const hpDate = ds => { const x = new Date(ds + 'T00:00:00'); return (x.getMonth() + 1) + '/' + x.getDate() + '(' + DOW[x.getDay()] + ')'; };
const hpLogs = () => (S.lessonLog = S.lessonLog || []);

function hpDlg(title, draw, handle, onClose) {
  const d = document.createElement('dialog'); d.className = 'dlg hpdlg'; d.style.maxWidth = '760px'; d.style.width = '96vw';
  d.innerHTML = `<form method="dialog"><h3>${title}</h3><div class="hpbody"></div><div class="btns"><button value="ok" class="pri">닫기</button></div></form>`;
  document.body.appendChild(d);
  const body = d.querySelector('.hpbody'), paint = () => { body.innerHTML = draw(d); };
  d._paint = paint; paint();
  d.addEventListener('click', e => { const b = e.target.closest('[data-hp]'); if (!b) return; if (b.type !== 'checkbox') e.preventDefault(); handle(b.dataset.hp.split('|'), b, paint, d); });
  d.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.hpmemo) { S.dayMemo = S.dayMemo || {}; if (t.value.trim()) S.dayMemo[t.dataset.hpmemo] = t.value; else delete S.dayMemo[t.dataset.hpmemo]; save(true); }
    if (t.dataset.hpwk) { S.weekRv = S.weekRv || {}; const k = t.dataset.hpk; (S.weekRv[k] = S.weekRv[k] || {})[t.dataset.hpwk] = t.value; save(true); }
  });
  d.addEventListener('close', () => { if (onClose) onClose(d); d.remove(); TF.render && TF.render(); });
  d.showModal(); return d;
}

/* ---------- 오늘 도우미 카드 ---------- */
function hpFreeHints() {
  const n = new Date(), dow = n.getDay(); if (dow === 0 || dow === 6) return '';
  const mins = n.getHours() * 60 + n.getMinutes(), P = typeof clkPeriods === 'function' ? clkPeriods() : [];
  const free = P.filter(x => x.p <= 7 && !tt(dow, x.p) && x.e > mins);
  const todo = S.items.filter(i => i.cat === 'todo' && !i.done && i.date && dd(i.date) <= 3).sort((a, b) => a.date.localeCompare(b.date));
  if (!free.length || !todo.length) return '';
  return free.slice(0, 3).map((f, i) => todo[i] ? `<div>🕐 <b>${f.p}교시 공강</b>(${clkHM(f.s)}~${clkHM(f.e)}) → ${esc(todo[i].title)} <span class="mu">(${hpDd(todo[i].date)})</span></div>` : '').join('');
}
function hpProgWarn() {
  const last = {}; hpLogs().slice().sort((a, b) => a.date.localeCompare(b.date) || (a.at || 0) - (b.at || 0)).forEach(l => { if (l.cls && l.prog) last[l.cls] = l; });
  const gr = {}; Object.keys(last).forEach(c => { const g = (c.match(/^(\d+)-/) || [])[1]; if (g) (gr[g] = gr[g] || []).push(c); });
  const norm = s => String(s).replace(/[\s.,·\-~]/g, ''), out = [];
  Object.keys(gr).forEach(g => { const cs = gr[g]; if (cs.length < 2) return; if (new Set(cs.map(c => norm(last[c].prog))).size > 1) out.push({ g, cs, last }); });
  return out;
}
function hpCard() {
  const dow = new Date().getDay(), hot = dow === 5 || dow === 0, w = hpProgWarn(), fr = hpFreeHints();
  const warn = w.length ? `<div class="hpw">⚠️ ${w.map(x => x.g + '학년 ' + x.cs.map(c => c + '반 「' + esc(x.last[c].prog) + '」').join(' / ')).join(' · ')} — 같은 학년인데 진도가 달라요. <button type="button" class="btn sm" data-act="hpProg">자세히</button></div>` : '';
  return `<details class="hpcard" ${S.profile.hpOpen === true ? 'open' : ''}><summary>🧰 오늘 도우미 <small>퇴근 전 정리 · 수업 후 기록 · 한 주 돌아보기 …</small></summary>
  ${fr || warn ? `<div class="hpin">${fr}${warn}</div>` : ''}
  <div class="tools"><button class="btn pri sm" data-act="hpEnd">🌇 퇴근 전 3분 정리</button><button class="btn sm" data-act="hpLog">📝 수업 후 한 줄 기록</button><button class="btn sm ${hot ? 'pri' : ''}" data-act="hpWeek">🗓 한 주 돌아보기${hot ? ' ✨' : ''}</button><button class="btn sm" data-act="hpProg">📊 반별 진도 점검</button></div>
  <div class="tools"><button class="btn sm pri" data-act="hpNow">▶ 지금 수업 자료 열기</button><button class="btn sm" data-act="hpLink">🔗 수업 자료 연결</button><button class="btn sm" data-act="hpIdea">💡 차시 아이디어 카드</button><button class="btn sm" data-act="hpDoc">📮 공문 기한 모아보기</button><button class="btn sm" data-act="hpMeet">📋 회의 노트 틀</button><button class="btn sm" data-act="hpChkOpen">✅ 나만의 점검표</button><button class="btn sm" data-act="hpTerm">🎓 학기말 점검표</button><button class="btn sm" data-act="hpStu">🔒 학생 메모(이 기기만)</button></div></details>`;
}
const hpInject = () => {
  const h = location.hash, main = document.querySelector('#app main'); if (!main || !S.setup) return;
  const isToday = /^#\/(today)?$/.test(h) || h === '#/' || h === '', on = S.profile.helperOn !== false, ex = main.querySelector('.hpcard');
  if (isToday && on) { if (ex) ex.remove(); const c = document.createElement('div'); c.className = 'hpwrap'; c.innerHTML = hpCard(); const ch = main.querySelector('.cheer'); if (ch) ch.after(c.firstElementChild); else main.prepend(c.firstElementChild); }
  else if (ex) ex.remove();
};
const _rhp1 = TF.render; TF.render = function () { const v = _rhp1.apply(this, arguments); hpInject(); return v; };
document.addEventListener('toggle', e => { const t = e.target; if (t && t.classList && t.classList.contains('hpcard')) { S.profile.hpOpen = t.open; save(true); } }, true);


/* ---------- ① 퇴근 전 3분 정리 ---------- */
function hpEnd() {
  const nx = hpNextSchool();
  hpDlg('🌇 퇴근 전 3분 정리', () => {
    const late = S.items.filter(i => i.cat === 'todo' && !i.done && i.date && i.date <= today()).sort((a, b) => a.date.localeCompare(b.date));
    const cls = [1, 2, 3, 4, 5, 6, 7].map(p => [p, tt(nx.x.getDay(), p)]).filter(x => x[1]);
    return `<h4 class="dlh">1. 오늘 못 끝낸 일 <span class="mu">(${late.length}건)</span></h4>${late.length ? late.map(i => `<div class="hpr"><span>${esc(i.title)} <span class="mu">${hpDd(i.date)}</span></span><span><button type="button" class="btn sm" data-hp="done|${i.id}">✔ 끝냈어요</button><button type="button" class="btn sm" data-hp="mv|${i.id}">➡ ${hpDate(nx.ds)}로</button></span></div>`).join('') + `<div class="tools"><button type="button" class="btn sm pri" data-hp="mvall">남은 일 모두 ${hpDate(nx.ds)}로 넘기기</button></div>` : '<p class="mu">남은 일이 없어요. 깔끔합니다 🎉</p>'}
    <h4 class="dlh">2. ${hpDate(nx.ds)} 수업</h4>${cls.length ? `<p>${cls.map(x => `<b>${x[0]}교시</b> ${esc(x[1])}${cellLinkHtml(nx.x.getDay(), x[0])}`).join(' · ')}</p>` : '<p class="mu">그날 수업이 없거나 시간표가 비어 있어요.</p>'}
    <h4 class="dlh">3. ${hpDate(nx.ds)} 준비물 · 할 말 <span class="mu">(쓰면 그날 메모에 바로 저장)</span></h4><textarea rows="3" data-hpmemo="${nx.ds}" placeholder="프린트 20부, 모둠 카드, 회의 자료…" style="width:100%;box-sizing:border-box">${esc((S.dayMemo || {})[nx.ds] || '')}</textarea>
    <p class="mu" style="margin-top:8px">이제 오늘 일은 교실에 두고 가세요. 수고하셨습니다.</p>`;
  }, (a, b, paint) => {
    const nd = nx.ds;
    if (a[0] === 'done') { const i = S.items.find(x => x.id === a[1]); if (i) i.done = true; }
    if (a[0] === 'mv') { const i = S.items.find(x => x.id === a[1]); if (i) i.date = nd; }
    if (a[0] === 'mvall') S.items.filter(i => i.cat === 'todo' && !i.done && i.date && i.date <= today()).forEach(i => { i.date = nd; });
    save(); paint();
  });
}

/* ---------- ② 수업 후 한 줄 기록 · ③ 반별 진도 점검 ---------- */
function hpLog() {
  const dow = new Date().getDay(), cl = [1, 2, 3, 4, 5, 6, 7].filter(p => tt(dow, p)).map(p => p + '교시 · ' + tt(dow, p));
  ask('📝 수업 후 한 줄 기록', [{ k: 'sel', label: '어느 수업?', type: 'select', opts: cl.length ? cl : ['(오늘 시간표 수업 없음)'] }, { k: 'cls', label: '반 직접 입력 (비우면 위 수업의 반)', ph: '예: 2-1' }, { k: 'prog', label: '진도 (어디까지 했나요)', ph: '예: 3단원 2차시 — 정의의 원칙', req: 1 }, { k: 'react', label: '아이들 반응·특이사항', type: 'textarea', rows: 3 }, { k: 'next', label: '다음 시간에 할 것', ph: '예: 모둠 발표 이어서' }], o => {
    const m = /^(\d)교시 · (.*)$/.exec(o.sel || ''), cls = (o.cls || '').trim() || (m ? hpClsOf(m[2]) : '');
    hpLogs().push({ id: uid(), date: today(), at: Date.now(), p: m ? +m[1] : 0, cls, prog: o.prog.trim(), react: (o.react || '').trim(), next: (o.next || '').trim() });
    commit(); toast('기록했습니다. [수업 및 시간표] 화면 맨 아래 「수업 기록」에 쌓이고 반별 진도 점검에 반영돼요.');
    const w = hpProgWarn().filter(x => x.cs.includes(cls)); if (w.length) setTimeout(() => toast('⚠️ ' + w[0].g + '학년 반들의 진도가 서로 달라요. [반별 진도 점검]에서 확인하세요.'), 1800);
  }, '기록하기');
}
function hpProg() {
  hpDlg('📊 반별 진도 점검', () => {
    const logs = hpLogs().slice().sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0)), last = {};
    logs.slice().reverse().forEach(l => { if (l.cls) last[l.cls] = l; });
    const w = hpProgWarn();
    return `${w.length ? w.map(x => `<div class="hpw">⚠️ <b>${x.g}학년</b> ${x.cs.map(c => `${c}반 「${esc(x.last[c].prog)}」(${hpDate(x.last[c].date)})`).join(' ↔ ')}<br><span class="mu">같은 학년인데 진도 표현이 달라요. 의도한 차이면 무시하세요.</span></div>`).join('') : '<p class="mu">지금은 어긋난 곳이 없어요. (같은 학년 반이 2개 이상 기록돼야 비교합니다)</p>'}
    <h4 class="dlh">반별 가장 최근 진도</h4>${Object.keys(last).length ? `<table class="tbl"><tr><th>반</th><th>날짜</th><th>진도</th><th>다음에</th></tr>${Object.keys(last).sort().map(c => `<tr><td>${esc(c)}</td><td>${hpDate(last[c].date)}</td><td>${esc(last[c].prog)}</td><td>${esc(last[c].next || '')}</td></tr>`).join('')}</table>` : '<p class="mu">아직 기록이 없어요. [수업 후 한 줄 기록]으로 시작하세요.</p>'}
    <h4 class="dlh">최근 기록 <span class="mu">(${logs.length}건)</span></h4>${logs.slice(0, 20).map(l => `<div class="hpr"><span><b>${hpDate(l.date)}</b> ${l.p ? l.p + '교시 ' : ''}${esc(l.cls)} — ${esc(l.prog)}${l.react ? `<br><span class="mu">반응: ${esc(l.react)}</span>` : ''}</span><button type="button" class="btn sm" data-hp="ldel|${l.id}">삭제</button></div>`).join('')}`;
  }, (a, b, paint) => { if (a[0] === 'ldel') { S.lessonLog = hpLogs().filter(l => l.id !== a[1]); save(); paint(); } });
}

/* ---------- ④ 한 주 돌아보기 ---------- */
function hpWeek() {
  let off = 0;
  const range = () => { const m = new Date(); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7) + off * 7); const e = new Date(m); e.setDate(e.getDate() + 6); return { s: ymd(m), e: ymd(e), m }; };
  hpDlg('🗓 한 주 돌아보기', () => {
    const r = range(), inR = i => i.date && i.date >= r.s && i.date <= r.e, its = S.items.filter(inR), done = its.filter(i => i.done), open = its.filter(i => !i.done && i.date <= today());
    const logs = hpLogs().filter(l => l.date >= r.s && l.date <= r.e).sort((a, b) => a.date.localeCompare(b.date)), wk = Object.keys(S.workout || {}).filter(k => k >= r.s && k <= r.e && S.workout[k]).length;
    const n1 = new Date(r.e + 'T00:00:00'); n1.setDate(n1.getDate() + 1); const a1 = ymd(n1), n7 = new Date(n1); n7.setDate(n7.getDate() + 6); const a7 = ymd(n7);
    const nextI = S.items.filter(i => i.date && i.date >= a1 && i.date <= a7 && !i.done).sort((a, b) => a.date.localeCompare(b.date));
    const rv = (S.weekRv || {})[r.s] || {};
    return `<div class="tools"><button type="button" class="btn sm" data-hp="wk|-1">◀ 지난주</button><b>${hpDate(r.s)} ~ ${hpDate(r.e)}${off === 0 ? ' · 이번 주' : ''}</b><button type="button" class="btn sm" data-hp="wk|1">다음주 ▶</button>${off ? '<button type="button" class="btn sm" data-hp="wk|0">이번 주로</button>' : ''}</div>
    <div class="hpsum"><span>✅ 끝낸 일 <b>${done.length}</b></span><span>⏳ 남은 일 <b>${open.length}</b></span><span>📝 수업 기록 <b>${logs.length}</b></span><span>🏃 운동 <b>${wk}일</b></span></div>
    <h4 class="dlh">✅ 이번 주에 끝낸 일</h4>${done.length ? '<ul>' + done.slice(0, 15).map(i => `<li>${esc(i.title)} <span class="mu">${hpDate(i.date)}</span></li>`).join('') + '</ul>' : '<p class="mu">체크한 일이 없어요.</p>'}
    <h4 class="dlh">⏳ 아직 못 끝낸 일</h4>${open.length ? open.map(i => `<div class="hpr"><span>${esc(i.title)} <span class="mu">${hpDate(i.date)}</span></span><span><button type="button" class="btn sm" data-hp="wdone|${i.id}">✔ 끝냈어요</button><button type="button" class="btn sm" data-hp="wnext|${i.id}">➡ 다음 주 월요일로</button></span></div>`).join('') : '<p class="mu">남은 일이 없어요 👏</p>'}
    <h4 class="dlh">📝 수업 기록</h4>${logs.length ? '<ul>' + logs.map(l => `<li>${hpDate(l.date)} ${esc(l.cls)} — ${esc(l.prog)}</li>`).join('') + '</ul>' : '<p class="mu">이번 주 수업 기록이 없어요.</p>'}
    <h4 class="dlh">📅 다음 주 예정</h4>${nextI.length ? '<ul>' + nextI.slice(0, 10).map(i => `<li>${hpDate(i.date)} ${esc(i.title)} <span class="mu">${hpDd(i.date)}</span></li>`).join('') + '</ul>' : '<p class="mu">다음 주 일정이 비어 있어요.</p>'}
    <h4 class="dlh">💛 이번 주 좋았던 일</h4><textarea rows="2" data-hpwk="good" data-hpk="${r.s}" style="width:100%;box-sizing:border-box" placeholder="아이 한 명의 말, 잘 풀린 수업, 나에게 고마운 일…">${esc(rv.good || '')}</textarea>
    <h4 class="dlh">🌱 다음 주 다짐 한 줄</h4><textarea rows="2" data-hpwk="next" data-hpk="${r.s}" style="width:100%;box-sizing:border-box">${esc(rv.next || '')}</textarea>`;
  }, (a, b, paint) => {
    if (a[0] === 'wk') { off = a[1] === '0' ? 0 : off + (+a[1]); paint(); return; }
    const i = S.items.find(x => x.id === a[1]); if (!i) return;
    if (a[0] === 'wdone') i.done = true;
    if (a[0] === 'wnext') { const m = range().m; m.setDate(m.getDate() + 7); i.date = ymd(m); }
    save(); paint();
  });
}

/* ---------- 운동 체크 ---------- */
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.hpw) A.hpWork(e.target); });
A.hpWork = el => { S.workout = S.workout || {}; if (el.checked) S.workout[today()] = true; else delete S.workout[today()]; save(true); toast(el.checked ? '운동 기록! 멋져요 💪' : '해제했어요.'); };

/* ---------- 수업 자료 연결: 시간표 칸마다 HTML 슬라이드·딜시·여러 프로그램·학습지·영상을 여러 개 걸어 두고 바로 엽니다 ---------- */
const HP_KIND = { '슬라이드': '🖥', '프로그램': '🎮', '학습지': '📄', '영상': '▶️', '링크': '🔗' };
const HP_PRE = [['딜레마 시뮬(딜시)', 'https://gtk0624-a11y.github.io/Qdice/dilsi/', '프로그램'], ['한 번뿐인 인생', 'https://gtk0624-a11y.github.io/Qdice/onelife/', '프로그램']];
const hpKindOf = u => /presentation|canva\.com|slides|\.pptx?(\?|$)|슬라이드/i.test(u) ? '슬라이드' : /youtu\.?be/i.test(u) ? '영상' : /docs\.google\.com\/(document|forms)|\.hwpx?(\?|$)|\.pdf(\?|$)|학습지/i.test(u) ? '학습지' : /github\.io|netlify|vercel|\.html?(\?|$)/i.test(u) ? '프로그램' : '링크';
const hpCL = () => { const o = (S.cellLinks = S.cellLinks || {}); if (S.cellLink) { Object.keys(S.cellLink).forEach(k => { (o[k] = o[k] || []).push({ id: uid(), n: '수업 자료', u: S.cellLink[k], k: hpKindOf(S.cellLink[k]) }); }); delete S.cellLink; save(true); } return o; };
const hpPre = () => HP_PRE.map(x => ({ n: x[0], u: x[1], k: x[2] })).concat((S.links || []).filter(l => l.url && !HP_PRE.some(x => x[1] === l.url)).slice(0, 14).map(l => ({ n: l.name || l.url, u: l.url, k: hpKindOf(l.url) })));
const cellLinkHtml = (d, p) => { const L = hpCL()[d + '-' + p] || []; if (!L.length) return ''; return ' <span class="hpcls">' + L.slice(0, 3).map(l => `<span class="cl" role="button" tabindex="0" data-act="hpOpenL" data-id="${l.id}" title="${esc(l.n)} 열기">${HP_KIND[l.k] || '🔗'}</span>`).join('') + (L.length > 3 ? `<span class="mu">+${L.length - 3}</span>` : '') + '</span>'; };
async function hpOpenLink(l) {
  if (String(l.u).startsWith('idb:')) { const f = await idb.get('cl:' + l.u.slice(4)); if (!f) return toast('올려 둔 파일을 찾지 못했어요. 다시 올려 주세요.'); const url = URL.createObjectURL(f); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 180000); }
  else extOpen(l.u);
}
const hpFindL = id => { const o = hpCL(); for (const k of Object.keys(o)) { const l = o[k].find(x => x.id === id); if (l) return l; } return null; };
A.hpOpenL = el => { const l = hpFindL(el.dataset.id); if (l) hpOpenLink(l); };
function hpNowCell() {
  const n = new Date(), dow = n.getDay(), mins = n.getHours() * 60 + n.getMinutes(), P = typeof clkPeriods === 'function' ? clkPeriods() : [];
  const cur = P.find(x => mins >= x.s && mins < x.e) || P.find(x => x.s > mins && tt(dow, x.p)); return cur && dow % 6 ? dow + '-' + cur.p : null;
}
function hpNow() {
  const k = hpNowCell(), L = k ? (hpCL()[k] || []) : [];
  if (!L.length) { toast(k ? '이 시간 칸에 연결된 자료가 없어요. 지금 연결해 보세요.' : '지금은 수업 시간이 아니에요. 연결할 칸을 골라 주세요.'); return hpLink(k); }
  hpDlg('▶ 지금 수업 자료 — ' + DOW[k.split('-')[0]] + '요일 ' + k.split('-')[1] + '교시 ' + esc(tt(...k.split('-'))), () => L.map(l => `<div class="hpr"><span style="font-size:17px">${HP_KIND[l.k] || '🔗'} <b>${esc(l.n)}</b> <span class="mu">${esc(l.k)}</span></span><button type="button" class="btn pri" data-hp="open|${l.id}">▶ 열기</button></div>`).join(''), (a) => { if (a[0] === 'open') { const l = hpFindL(a[1]); if (l) hpOpenLink(l); } });
}
function hpLink(sel) {
  const o = hpCL(), cells = []; for (let d = 1; d <= 5; d++) for (let p = 1; p <= 7; p++) if (tt(d, p)) cells.push(d + '-' + p);
  let cur = sel && cells.includes(sel) ? sel : (hpNowCell() && cells.includes(hpNowCell()) ? hpNowCell() : cells[0]);
  const d0 = hpDlg('🔗 수업 자료 연결', () => {
    if (!cells.length) return '<p class="mu">시간표가 비어 있어요. 먼저 [수업 및 시간표]에서 시간표를 넣어 주세요.</p>';
    const grid = '<div class="hplg"><span></span>' + [1, 2, 3, 4, 5].map(d => `<b>${DOW[d]}</b>`).join('') + [1, 2, 3, 4, 5, 6, 7].map(p => `<b>${p}</b>` + [1, 2, 3, 4, 5].map(d => { const v = tt(d, p), k = d + '-' + p, n = (o[k] || []).length; return v ? `<button type="button" class="hpcell ${k === cur ? 'on' : ''}" data-hp="cell|${k}"><span>${esc(v)}</span>${n ? `<i>${n}</i>` : ''}</button>` : '<span class="hpcell no">·</span>'; }).join('')).join('') + '</div>';
    const L = o[cur] || [], [cd, cp] = cur.split('-'), pre = hpPre();
    return `<p class="mu">① 칸을 누르고 ② 자료를 고르거나 붙여넣으면 오늘 시간표 그 칸에 아이콘이 생겨요. 수업 직전엔 [▶ 지금 수업 자료 열기] 한 번이면 됩니다.</p>${grid}
    <h4 class="dlh">${DOW[cd]}요일 ${cp}교시 · ${esc(tt(cd, cp))} <span class="mu">(${L.length}개 연결됨)</span></h4>
    ${L.map(l => `<div class="hpr"><span>${HP_KIND[l.k] || '🔗'} <b>${esc(l.n)}</b> <span class="mu">${esc(l.k)}${String(l.u).startsWith('idb:') ? ' · 올려 둔 파일' : ''}</span></span><span><button type="button" class="btn sm" data-hp="open|${l.id}">▶ 열기</button><button type="button" class="btn sm" data-hp="ledit|${l.id}">✏️</button><button type="button" class="btn sm" data-hp="ldel|${l.id}">🗑</button></span></div>`).join('') || '<p class="mu">아직 연결된 자료가 없어요.</p>'}
    <h4 class="dlh">＋ 자료 더하기</h4>
    <p class="mu" style="margin:2px 0">내가 만든 프로그램·서랍 사이트 (눌러서 바로 연결)</p><div class="hppre">${pre.map((x, i) => `<button type="button" class="chp" data-hp="pre|${i}">${HP_KIND[x.k] || '🔗'} ${esc(x.n)}</button>`).join('')}</div>
    <div class="hpf"><input id="hpn" placeholder="이름 (예: 정의 단원 슬라이드)" aria-label="자료 이름"><input id="hpu" placeholder="주소 붙여넣기 (구글 슬라이드·캔바·HTML 슬라이드·딜시 등)" aria-label="자료 주소"></div>
    <div class="hpf"><label class="chk"><input type="checkbox" id="hpall" checked> 같은 수업(${esc(tt(cd, cp))})의 다른 시간에도 함께 연결</label><button type="button" class="btn sm pri" data-hp="add">＋ 연결하기</button><button type="button" class="btn sm" data-hp="file">📎 내 HTML 슬라이드 파일 올려 연결</button><input type="file" id="hpf" accept=".html,.htm" hidden></div>
    <p class="mu">HTML 파일은 이 기기 안에 저장되고 인터넷 없이도 열려요. (다른 기기에서는 파일을 다시 올려야 합니다)</p>`;
  }, (a, b, paint, d) => {
    if (a[0] === 'cell') { cur = a[1]; paint(); return; }
    const addTo = (link, all) => { const keys = all ? cells.filter(k => tt(...k.split('-')) === tt(...cur.split('-'))) : [cur]; keys.forEach(k => { (o[k] = o[k] || []).push({ id: uid(), n: link.n, u: link.u, k: link.k }); }); save(); toast('연결했습니다' + (keys.length > 1 ? ' (같은 수업 ' + keys.length + '칸)' : '') + '.'); paint(); };
    if (a[0] === 'pre') { const x = hpPre()[+a[1]]; if (x) addTo(x, d.querySelector('#hpall').checked); }
    if (a[0] === 'add') { let u = (d.querySelector('#hpu').value || '').trim(); if (!u) return toast('주소를 붙여넣어 주세요.'); if (!/^https?:\/\//i.test(u)) u = 'https://' + u; addTo({ n: (d.querySelector('#hpn').value || '').trim() || '수업 자료', u, k: hpKindOf(u) }, d.querySelector('#hpall').checked); }
    if (a[0] === 'file') d.querySelector('#hpf').click();
    if (a[0] === 'open') { const l = hpFindL(a[1]); if (l) hpOpenLink(l); }
    if (a[0] === 'ldel') { (o[cur] = (o[cur] || []).filter(l => l.id !== a[1])); save(); paint(); }
    if (a[0] === 'ledit') { const l = (o[cur] || []).find(x => x.id === a[1]); if (l) ask('연결 고치기', [{ k: 'n', label: '이름', val: l.n, req: 1 }, { k: 'u', label: '주소', val: String(l.u).startsWith('idb:') ? '(올려 둔 파일 — 주소는 못 고쳐요)' : l.u }, { k: 'k', label: '종류', type: 'select', opts: Object.keys(HP_KIND), val: l.k }], v => { l.n = v.n.trim() || l.n; if (!String(l.u).startsWith('idb:') && v.u.trim()) l.u = /^https?:\/\//i.test(v.u.trim()) ? v.u.trim() : 'https://' + v.u.trim(); l.k = v.k; save(); paint(); }); }
  });
  if (d0) d0.addEventListener('change', async e => {
    if (e.target.id !== 'hpf' || !e.target.files[0]) return; const f = e.target.files[0], id = uid();
    if (f.size > 25 * 1048576) return toast('25MB보다 큰 파일은 연결할 수 없어요.');
    await idb.set('cl:' + id, f); const keys = d0.querySelector('#hpall').checked ? cells.filter(k => tt(...k.split('-')) === tt(...cur.split('-'))) : [cur];
    keys.forEach(k => { (o[k] = o[k] || []).push({ id: uid(), n: f.name.replace(/\.html?$/i, ''), u: 'idb:' + id, k: '슬라이드' }); }); save(); toast('파일을 올려 연결했습니다.'); d0._paint();
  });
}

/* ---------- 공문 기한 모아보기 ---------- */
function hpDoc() {
  hpDlg('📮 공문 기한 모아보기', () => {
    const re = /공문|회신|제출|보고|신청|조사|마감|기한/, L = S.items.filter(i => i.date && !i.done && (re.test(i.title) || re.test(i.tag || ''))).sort((a, b) => a.date.localeCompare(b.date));
    return L.length ? `<p class="mu">제목에 회신·제출·보고·신청·조사 같은 말이 들어간, 아직 안 끝난 일정/할 일입니다. 경기도 메신저를 붙여넣어 만든 것도 모두 들어와요.</p>` + L.map(i => `<div class="hpr"><span><b class="${dd(i.date) < 0 ? 'hot' : ''}">${hpDd(i.date)}</b> ${hpDate(i.date)} · ${esc(i.title)}</span><button type="button" class="btn sm" data-hp="ddone|${i.id}">✔ 처리함</button></div>`).join('') : '<p class="mu">기한이 있는 공문 일정이 없어요. 📨 메신저 붙여넣기로 공문 내용을 넣으면 여기에 모입니다.</p>';
  }, (a, b, paint) => { if (a[0] === 'ddone') { const i = S.items.find(x => x.id === a[1]); if (i) { i.done = true; save(); paint(); } } });
}

/* ---------- 회의 노트 틀 ---------- */
const HP_MEET = {
  '부서 회의': '■ 안건\n1. \n2. \n\n■ 논의\n- \n\n■ 결정 사항·후속 조치\n- ',
  '수업탐구공동체(수탐공)': '■ 이번 모임 주제\n\n■ 수업 나눔(질문·관찰)\n- \n\n■ 다음 모임까지 해 볼 것\n- ',
  '교직원 회의': '■ 전달 사항\n1. \n2. \n\n■ 우리 부서 관련\n- \n\n■ 회신·제출 기한\n- ',
  '연수 전달': '■ 연수명·일시·강사\n\n■ 핵심 내용 3가지\n1. \n2. \n3. \n\n■ 우리 학교/수업에 적용할 점\n- '
};
function hpMeet() {
  ask('📋 회의 노트 틀', [{ k: 'tpl', label: '어떤 회의인가요?', type: 'select', opts: Object.keys(HP_MEET) }], o => {
    const n = { id: uid(), title: o.tpl + ' ' + md(today()), date: today(), kind: '회의', body: HP_MEET[o.tpl], decisions: '1. (결정) — 담당: \n2. (결정) — 담당: ', followups: '- [ ] 담당: / 기한: ', lock: false };
    S.notes.push(n); save(); location.hash = '#/note/' + n.id;
  }, '노트 만들기');
}

/* ---------- 학기말 점검표 (모두 고치고·지우고·더할 수 있음) ---------- */
const HP_TERM = [['평가', [['t1', '수행평가 점수 입력·확인'], ['t2', '평가 근거 자료 보관(학생 결과물·채점표)'], ['t3', '성적 산출 및 이의신청 안내']]], ['생기부', [['t4', '교과 세부능력 및 특기사항 입력'], ['t5', '바이트·맞춤법 점검, 생기발랄로 확인'], ['t6', '창체·행특 담당 부분 확인']]], ['수업', [['t7', '진도 마무리·남은 차시 정리'], ['t8', '학습지·슬라이드 정리 및 백업'], ['t9', '다음 학기 수업 개선점 메모']]], ['업무', [['t10', '예산 집행 정산·증빙 확인'], ['t11', '필수연수 이수 확인'], ['t12', '미처리 공문·회신 확인'], ['t13', '업무 인수인계 자료 정리']]], ['나', [['t14', '업무파탈 백업 파일 받기'], ['t15', '나에게 선물 하나 (쉬는 날 정하기)']]]];
const hpEndSeed = () => HP_TERM.flatMap(g => g[1].map(x => ({ id: x[0], g: g[0], t: x[1] }))).concat((S.endCustom || []).map(x => ({ id: x.id, g: '내가 추가한 것', t: x.t })));
const hpEndList = () => (S.endList = S.endList || hpEndSeed());
function hpTerm() {
  hpDlg('✅ 학기말 점검표', () => {
    const L = hpEndList(), ck = S.endCk || {}, groups = [...new Set(L.map(x => x.g))];
    return `<p class="mu">${L.filter(x => ck[x.id]).length} / ${L.length} 완료 · 모든 항목을 ✏️고치고 🗑지우고 ＋더할 수 있어요. 바로 저장됩니다.</p>
    ${groups.map(g => `<h4 class="dlh">${esc(g)} <button type="button" class="btn sm" data-hp="grn|${esc(g)}">✏️ 분류 이름</button><button type="button" class="btn sm" data-hp="gdel|${esc(g)}">🗑 분류 삭제</button><button type="button" class="btn sm" data-hp="iadd|${esc(g)}">＋ 항목</button></h4>${L.filter(x => x.g === g).map(x => `<div class="hpr"><label class="chk hpck"><input type="checkbox" data-hp="ck|${x.id}" ${ck[x.id] ? 'checked' : ''}> <span>${esc(x.t)}</span></label><span><button type="button" class="btn sm" data-hp="iedit|${x.id}">✏️</button><button type="button" class="btn sm" data-hp="idel|${x.id}">🗑</button></span></div>`).join('')}`).join('')}
    <div class="tools"><button type="button" class="btn sm pri" data-hp="gadd">＋ 새 분류 만들기</button><button type="button" class="btn sm" data-hp="reset">처음 목록으로 되돌리기</button></div>`;
  }, (a, b, paint) => {
    const L = hpEndList();
    if (a[0] === 'ck') { S.endCk = S.endCk || {}; S.endCk[a[1]] = b.checked; save(true); return; }
    if (a[0] === 'iedit') { const x = L.find(i => i.id === a[1]); if (x) ask('항목 고치기', [{ k: 't', label: '내용', val: x.t, req: 1 }], o => { x.t = o.t.trim() || x.t; save(); paint(); }); }
    if (a[0] === 'idel') { S.endList = L.filter(i => i.id !== a[1]); save(); paint(); }
    if (a[0] === 'iadd') ask('항목 더하기 — ' + a[1], [{ k: 't', label: '점검할 것', req: 1 }], o => { L.push({ id: 'c' + uid(), g: a[1], t: o.t.trim() }); save(); paint(); });
    if (a[0] === 'gadd') ask('새 분류 만들기', [{ k: 'g', label: '분류 이름 (예: 학급, 행사)', req: 1 }, { k: 't', label: '첫 항목', req: 1 }], o => { L.push({ id: 'c' + uid(), g: o.g.trim(), t: o.t.trim() }); save(); paint(); });
    if (a[0] === 'grn') ask('분류 이름 고치기', [{ k: 'g', label: '이름', val: a[1], req: 1 }], o => { const n = o.g.trim(); if (n) L.forEach(x => { if (x.g === a[1]) x.g = n; }); save(); paint(); });
    if (a[0] === 'gdel') sure('「' + a[1] + '」 분류와 그 안의 항목을 모두 지울까요?', () => { S.endList = L.filter(x => x.g !== a[1]); save(); paint(); });
    if (a[0] === 'reset') sure('처음 목록으로 되돌릴까요? (내가 고친 내용은 사라지고, 체크는 유지됩니다)', () => { delete S.endList; S.endCustom = []; save(); paint(); });
  });
}

/* ---------- 차시 아이디어 카드 (Claude 열쇠가 있으면 AI, 없으면 기본 틀) ---------- */
const HP_FRAMES = [['질문 사냥', '모둠이 주제에서 궁금한 질문을 5개씩 만들고, 가장 토론할 만한 질문 1개를 골라 칠판에 붙입니다. 반 전체가 질문을 분류한 뒤 한 질문을 골라 토론합니다.'], ['입장 뒤집기', '찬성·반대 입장을 제비뽑기로 정해 상대 입장에서 주장을 씁니다. 역할을 바꿔 다시 말해 보며 놓친 관점을 찾습니다.'], ['딜레마 카드 투표', '사례 카드 3장을 읽고 발 위치로 입장을 표시합니다. 이유를 들은 뒤 마음이 바뀐 사람은 이동하고 그 이유를 말합니다.'], ['신문 한 면 만들기', '주제에 맞는 사건을 기사·사설·인터뷰로 나누어 모둠이 한 면을 만듭니다. 갤러리 워크로 서로의 면을 읽고 질문 스티커를 붙입니다.'], ['한 문장 정리 릴레이', '배운 내용을 한 문장으로 쓰고 옆 모둠에 넘겨 더 정확하게 고칩니다. 마지막에 가장 좋아진 문장을 뽑아 공유합니다.']];
function hpIdea() {
  ask('💡 차시 아이디어 카드', [{ k: 'top', label: '단원·주제', ph: '예: 정의의 원칙 / 과학기술과 윤리', req: 1 }, { k: 'gr', label: '학년', type: 'select', opts: ['중1', '중2', '중3', '고1', '고2'] }, { k: 'ex', label: '꼭 넣고 싶은 것 (선택)', ph: '예: 모둠 활동, 태블릿 사용, 15분 이내 활동' }], async o => {
    const key = typeof agKey === 'function' ? agKey() : '', box = { txt: '' };
    const d = hpDlg('💡 차시 아이디어 카드', () => `<p><b>${esc(o.gr)} · ${esc(o.top)}</b></p><div class="hpidea" style="white-space:pre-wrap">${esc(box.txt || '아이디어를 만드는 중…')}</div><div class="tools"><button type="button" class="btn sm pri" data-hp="isave">📋 기록 노트로 저장</button></div>${key ? '' : '<p class="mu">Claude 열쇠를 넣지 않아 기본 틀로 보여 드렸어요. 꿈송이 창에서 열쇠를 넣으면 주제에 맞춰 AI가 새로 만들어 줍니다.</p>'}`, (a, b, paint) => {
      if (a[0] === 'isave') { const n = { id: uid(), title: '[수업 아이디어] ' + o.top, date: today(), kind: '회의', body: box.txt, decisions: '', followups: '', lock: false }; S.notes.push(n); save(); toast('기록에 저장했습니다.'); }
    });
    const upd = () => { const p = d.querySelector('.hpidea'); if (p) p.textContent = box.txt; };
    if (!key) { box.txt = HP_FRAMES.map((f, i) => `${i + 1}. ${f[0]} — 「${o.top}」\n   ${f[1]}`).join('\n\n'); upd(); return; }
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 1800, system: '당신은 한국 중·고등학교 도덕·윤리 수업 설계를 돕는 동료 교사입니다. 질문 중심 수업(학생이 질문을 만들고 탐구) 관점에서 구체적이고 바로 쓸 수 있는 차시 활동 아이디어를 제시합니다. 이모지·마크다운 표 없이 평범한 글로 씁니다.', messages: [{ role: 'user', content: `${o.gr} ${o.top} 단원의 1차시(45~50분) 수업 활동 아이디어 5가지를 서로 다른 방식으로 제안해 주세요. 각각 ① 활동 이름 ② 진행 3~4단계(시간 배분 포함) ③ 준비물 ④ 평가·관찰 포인트를 쓰세요.${o.ex ? ' 꼭 반영할 것: ' + o.ex : ''}` }] }) });
      if (!r.ok) throw new Error(r.status === 401 ? '열쇠가 올바르지 않아요' : r.status === 402 || r.status === 400 ? '잔액(크레딧)이 부족할 수 있어요' : '응답 오류 ' + r.status);
      const j = await r.json(); box.txt = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim() || '결과가 비어 있어요.'; upd();
    } catch (e) { box.txt = '(AI를 쓰지 못했습니다: ' + e.message + ')\n\n' + HP_FRAMES.map((f, i) => `${i + 1}. ${f[0]} — 「${o.top}」\n   ${f[1]}`).join('\n\n'); upd(); }
  }, '아이디어 받기');
}

/* ---------- 학생 메모 (이 기기에만 저장 · 클라우드 동기화 제외) ---------- */
async function hpStu() {
  let M = (await idb.get('stum')) || {};
  const cls = [...new Set([1, 2, 3, 4, 5].flatMap(d => [1, 2, 3, 4, 5, 6, 7].map(p => hpClsOf(tt(d, p)))).filter(c => /^\d+-\d+$/.test(c)))].sort();
  hpDlg('🔒 학생 메모 (이 기기에만 저장)', () => `<p class="mu">출결·특이사항처럼 학생 정보가 들어갈 수 있어서 <b>클라우드 동기화에서 빼고 이 기기에만</b> 저장합니다. 백업 파일에도 들어가지 않으니, 기기를 바꾸면 따로 옮겨야 해요.</p>
    ${(cls.length ? cls : ['(시간표에서 반을 찾지 못했어요)']).map(c => `<label>${esc(c)}반<textarea rows="3" data-stu="${esc(c)}" style="width:100%;box-sizing:border-box">${esc(M[c] || '')}</textarea></label>`).join('')}`, () => { }, async () => { await idb.set('stum', M); });
  setTimeout(() => { const d = [...document.querySelectorAll('dialog.hpdlg')].pop(); if (d) d.addEventListener('input', e => { if (e.target.dataset.stu !== undefined) { M[e.target.dataset.stu] = e.target.value; idb.set('stum', M); } }); }, 0);
}

Object.assign(A, { hpNow, hpEnd, hpLog, hpWeek, hpProg, hpLink, hpDoc, hpMeet, hpTerm, hpIdea, hpStu });
/* 설정: 도우미 카드 보이기 */
const hpSet = () => `<div class="dset"><label class="chk"><input type="checkbox" data-dset="helperOn" ${S.profile.helperOn !== false ? 'checked' : ''}> <b>🧰 오늘 도우미 카드</b> — 오늘 화면 위쪽의 퇴근 전 정리·수업 후 기록·한 주 돌아보기 등 모음 (선택)</label></div>
  `;
const _dchp = decoCard;
decoCard = function () { const h = _dchp(); return h.replace('<div class="dset"><b>💻 컴퓨터 켜면', hpSet() + '<div class="dset"><b>💻 컴퓨터 켜면'); };
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.dset === 'helperOn') setTimeout(() => TF.render && TF.render(), 0); });

/* ---------- 「수업 및 시간표」 화면 맨 아래: 수업 기록 모음 (고치기·지우기·내려받기) ---------- */
function hpLogHtml() {
  const L = hpLogs().slice().sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0));
  return `<h3 class="h3" id="hplogs">📝 수업 기록 <span class="mu">(수업 후 한 줄 기록이 여기에 쌓입니다 · 이 기기에 저장 · 백업 파일에 포함)</span></h3><div class="tools"><button class="btn sm pri" data-act="hpLog">＋ 새 기록</button><button class="btn sm" data-act="hpProg">📊 반별 진도 점검</button>${L.length ? '<button class="btn sm" data-act="hpLogCsv">⬇ 엑셀(CSV)로 내려받기</button>' : ''}</div>
  ${L.length ? L.slice(0, 30).map(l => `<div class="hpr"><span><b>${hpDate(l.date)}</b> ${l.p ? l.p + '교시 ' : ''}${esc(l.cls)} — ${esc(l.prog)}${l.react ? `<br><span class="mu">반응: ${esc(l.react)}</span>` : ''}${l.next ? `<br><span class="mu">다음: ${esc(l.next)}</span>` : ''}</span><span><button class="btn sm" data-act="hpLogEdit" data-id="${l.id}">✏️ 고치기</button><button class="btn sm" data-act="hpLogDel" data-id="${l.id}">🗑</button></span></div>`).join('') + (L.length > 30 ? `<p class="mu">최근 30건만 보입니다. 전체는 CSV로 내려받으세요. (${L.length}건)</p>` : '') : '<p class="mu">아직 기록이 없어요. 오늘 화면 [🧰 오늘 도우미] → [📝 수업 후 한 줄 기록]으로 시작하세요.</p>'}`;
}
const _cvhp = classView; classView = function () { const h = _cvhp.apply(this, arguments); return h + hpLogHtml(); };
Object.assign(A, {
  hpLogEdit(el) {
    const l = hpLogs().find(x => x.id === el.dataset.id); if (!l) return;
    ask('수업 기록 고치기', [{ k: 'date', label: '날짜', type: 'date', val: l.date }, { k: 'cls', label: '반', val: l.cls }, { k: 'prog', label: '진도', val: l.prog, req: 1 }, { k: 'react', label: '반응·특이사항', type: 'textarea', rows: 3, val: l.react }, { k: 'next', label: '다음 시간에 할 것', val: l.next }], o => { l.date = o.date || l.date; l.cls = (o.cls || '').trim(); l.prog = o.prog.trim(); l.react = (o.react || '').trim(); l.next = (o.next || '').trim(); commit(); toast('고쳤습니다.'); });
  },
  hpLogDel(el) { sure('이 수업 기록을 지울까요?', () => { S.lessonLog = hpLogs().filter(x => x.id !== el.dataset.id); commit(); }); },
  hpLogCsv() { const q = v => '"' + String(v || '').replace(/"/g, '""') + '"'; download('수업기록_' + today() + '.csv', '\ufeff날짜,교시,반,진도,반응·특이사항,다음 시간\n' + hpLogs().slice().sort((a, b) => a.date.localeCompare(b.date)).map(l => [l.date, l.p || '', l.cls, l.prog, l.react, l.next].map(q).join(',')).join('\n'), 'text/csv'); }
});

/* ---------- 나만의 점검 체크리스트 (여러 개 만들기 · 항목 고치기/지우기 · 매일 자동 새로 시작 선택) ---------- */
const HP_CHK_TPL = {
  '학기초 준비': ['시간표·반 명단 확인', '교과 진도표 짜기', '수행평가 계획 확인', '학습 준비물 구입·정리', '학급 규칙·안내문 준비'],
  '수업 준비(차시 전)': ['학습지 출력', '슬라이드·프로그램 열어 보기', '태블릿·기자재 점검', '모둠 자리·역할 정하기', '평가 기록지 준비'],
  '수행평가 채점 끝내기': ['제출물 모두 모았는지 확인', '루브릭 기준 다시 읽기', '채점 및 점수 입력', '이의신청 안내', '근거 자료 보관'],
  '출장·연수 가기 전': ['수업 대체·자습 자료 준비', '공문 결재 확인', '교통·시간 확인', '다녀와서 전달 연수 일정 잡기'],
  '행사 준비': ['계획서·공문 확인', '예산 확인', '역할 분담', '안내 메시지 보내기', '끝난 뒤 정산·결과 정리'],
  '나의 하루 루틴': ['아침 일정 확인', '수업 후 한 줄 기록', '공문 처리 확인', '운동', '퇴근 전 3분 정리']
};
const hpChk = () => (S.chkLists = S.chkLists || []);
function hpChkDaily() { const t = today(); hpChk().forEach(l => { if (l.daily && l.day !== t) { l.items.forEach(i => { i.done = false; }); l.day = t; } }); }
function hpChkOpen(sel) {
  let cur = sel || null; hpChkDaily();
  hpDlg('✅ 나만의 점검표', () => {
    const L = hpChk(), l = cur && L.find(x => x.id === cur);
    if (!l) return `<p class="mu">내가 필요한 점검표를 마음대로 만들 수 있어요. 항목은 언제든 고치고 지우고 더할 수 있습니다. 「매일 새로 시작」을 켜면 날마다 체크가 비워져 루틴으로 쓰기 좋아요.</p>
      ${L.map(x => { const n = x.items.filter(i => i.done).length, pc = x.items.length ? Math.round(n / x.items.length * 100) : 0; return `<button type="button" class="hpcl" data-hp="open|${x.id}"><b>${esc(x.name)}</b>${x.daily ? ' <span class="mu">🔁 매일</span>' : ''}<span class="mu">${n} / ${x.items.length}</span><span class="hpbar"><i style="width:${pc}%"></i></span></button>`; }).join('') || '<p class="mu">아직 점검표가 없어요. 아래에서 만들어 보세요.</p>'}
      <h4 class="dlh">＋ 새 점검표</h4><div class="tools"><button type="button" class="btn sm pri" data-hp="new">빈 점검표 만들기</button></div>
      <p class="mu" style="margin:4px 0">또는 추천 틀로 시작 (만든 뒤 마음대로 고치세요)</p><div class="hppre">${Object.keys(HP_CHK_TPL).map(k => `<button type="button" class="chp" data-hp="tpl|${esc(k)}">${esc(k)}</button>`).join('')}</div>`;
    return `<div class="tools"><button type="button" class="btn sm" data-hp="back">◀ 목록</button><button type="button" class="btn sm" data-hp="ren">✏️ 이름</button><button type="button" class="btn sm" data-hp="daily">${l.daily ? '🔁 매일 새로 시작: 켜짐' : '🔁 매일 새로 시작: 꺼짐'}</button><button type="button" class="btn sm" data-hp="clr">체크 모두 해제</button><button type="button" class="btn sm" data-hp="ldel">🗑 점검표 삭제</button></div>
      <h4 class="dlh">${esc(l.name)} <span class="mu">${l.items.filter(i => i.done).length} / ${l.items.length}</span></h4>
      ${l.items.map((i, k) => `<div class="hpr"><label class="chk hpck"><input type="checkbox" data-hp="ck|${i.id}" ${i.done ? 'checked' : ''}> <span>${esc(i.t)}</span></label><span><button type="button" class="btn sm" data-hp="up|${i.id}" ${k === 0 ? 'disabled' : ''}>▲</button><button type="button" class="btn sm" data-hp="dn|${i.id}" ${k === l.items.length - 1 ? 'disabled' : ''}>▼</button><button type="button" class="btn sm" data-hp="ed|${i.id}">✏️</button><button type="button" class="btn sm" data-hp="del|${i.id}">🗑</button></span></div>`).join('') || '<p class="mu">항목이 없어요. 아래에 적어 더하세요.</p>'}
      <div class="hpf"><input id="hpci" placeholder="점검할 것 한 줄 (Enter로 바로 더하기)" aria-label="새 항목"><button type="button" class="btn sm pri" data-hp="add">＋ 더하기</button></div>`;
  }, (a, b, paint, d) => {
    const L = hpChk(), l = cur && L.find(x => x.id === cur);
    if (a[0] === 'open') { cur = a[1]; paint(); return; } if (a[0] === 'back') { cur = null; paint(); return; }
    if (a[0] === 'new') return ask('새 점검표', [{ k: 'n', label: '이름', ph: '예: 수업 전 확인', req: 1 }], o => { const x = { id: uid(), name: o.n.trim(), items: [], daily: false }; L.push(x); cur = x.id; save(); paint(); });
    if (a[0] === 'tpl') { const x = { id: uid(), name: a[1], items: HP_CHK_TPL[a[1]].map(t => ({ id: uid(), t, done: false })), daily: /루틴/.test(a[1]) }; if (x.daily) x.day = today(); L.push(x); cur = x.id; save(); paint(); return; }
    if (!l) return;
    if (a[0] === 'ck') { const i = l.items.find(x => x.id === a[1]); if (i) { i.done = b.checked; save(true); const h = d.querySelector('.dlh .mu'); if (h) h.textContent = l.items.filter(x => x.done).length + ' / ' + l.items.length; } return; }
    if (a[0] === 'add') { const inp = d.querySelector('#hpci'), t = (inp.value || '').trim(); if (!t) return; l.items.push({ id: uid(), t, done: false }); save(); paint(); const n = d.querySelector('#hpci'); if (n) n.focus(); return; }
    if (a[0] === 'ed') { const i = l.items.find(x => x.id === a[1]); if (i) ask('항목 고치기', [{ k: 't', label: '내용', val: i.t, req: 1 }], o => { i.t = o.t.trim() || i.t; save(); paint(); }); return; }
    if (a[0] === 'del') { l.items = l.items.filter(x => x.id !== a[1]); save(); paint(); return; }
    if (a[0] === 'up' || a[0] === 'dn') { const k = l.items.findIndex(x => x.id === a[1]), j = k + (a[0] === 'up' ? -1 : 1); if (j >= 0 && j < l.items.length) { [l.items[k], l.items[j]] = [l.items[j], l.items[k]]; save(); paint(); } return; }
    if (a[0] === 'ren') return ask('점검표 이름', [{ k: 'n', label: '이름', val: l.name, req: 1 }], o => { l.name = o.n.trim() || l.name; save(); paint(); });
    if (a[0] === 'daily') { l.daily = !l.daily; l.day = today(); save(); paint(); return; }
    if (a[0] === 'clr') { l.items.forEach(i => { i.done = false; }); save(); paint(); return; }
    if (a[0] === 'ldel') return sure('「' + l.name + '」 점검표를 지울까요?', () => { S.chkLists = L.filter(x => x.id !== l.id); cur = null; save(); paint(); });
  });
  const dd0 = [...document.querySelectorAll('dialog.hpdlg')].pop(); if (dd0) dd0.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'hpci') { e.preventDefault(); const b = dd0.querySelector('[data-hp=add]'); if (b) b.click(); } });
}
A.hpChkOpen = () => hpChkOpen();

/* ---------- 모든 창: 옆 빈 화면(어두운 바깥)을 누르면 닫힘 ---------- */
let hpDown = null;
document.addEventListener('pointerdown', e => { hpDown = e.target; }, true);
document.addEventListener('click', e => {
  const d = e.target; if (!d || d.tagName !== 'DIALOG' || hpDown !== d || d.dataset.noclose) return;
  const r = d.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
  d.close();
}, true);

/* 위쪽 메뉴 고르기: 오늘·설정은 항상 보이고 나머지는 보일 것만 고릅니다 */
A.navPick = () => {
  hpDlg('☰ 위쪽 메뉴 고르기', () => {
    const hid = S.navHide || [], L = ordList('nav').filter(k => k !== 'today' && k !== 'set'), lab = k => (ORD_NAV.find(x => x[0] === k) || [0, k])[1];
    return `<p class="mu">체크한 메뉴만 위쪽에 보입니다. <b>오늘</b>과 <b>설정</b>은 항상 보여요. 숨긴 메뉴도 여기서 「열기」로 갈 수 있어요.</p>
    <div class="hpr"><span><b>오늘</b> <span class="mu">(항상)</span></span><span></span></div>${L.map(k => `<div class="hpr"><label class="chk hpck"><input type="checkbox" data-hp="nv|${k}" ${hid.includes(k) ? '' : 'checked'}> <span>${esc(lab(k))}</span></label><button type="button" class="btn sm" data-hp="go|${k}">열기</button></div>`).join('')}
    <div class="hpr"><span><b>설정</b> <span class="mu">(항상)</span></span><span></span></div>
    <div class="tools"><button type="button" class="btn sm" data-hp="all">모두 보이기</button><button type="button" class="btn sm" data-hp="few">꼭 필요한 것만 (오늘·캘린더·수업 및 시간표·학급 관리)</button></div>`;
  }, (a, b, paint, d) => {
    S.navHide = S.navHide || [];
    if (a[0] === 'nv') { S.navHide = b.checked ? S.navHide.filter(x => x !== a[1]) : [...new Set([...S.navHide, a[1]])]; save(true); return; }
    if (a[0] === 'go') { d.close(); location.hash = '#/' + a[1]; return; }
    if (a[0] === 'all') S.navHide = [];
    if (a[0] === 'few') S.navHide = ordList('nav').filter(k => !['today', 'set', 'cal', 'class', 'cm'].includes(k));
    save(true); paint();
  });
};

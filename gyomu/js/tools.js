/* 도구 모음(v163): 🗓 주간 보기 · ☀️ 아침 브리핑 카드 · 📋 행사 템플릿 · 📥 가져오기(노션 CSV·.ics) · 📤 내보내기(.ics·CSV)
   · 🔔 알림 · 📑 기록 모아보기 · 📘 인수인계서 · 🎓 연말 회고 · 📷 사진·PDF로 일정 뽑기 · 🎤 말로 입력 · AI 비서 plan_project 도구.
   모든 도구는 이 기기 안에서 계산합니다. 「AI로 다듬기」「사진·PDF 읽기」만 Claude 키로 외부 서버를 부릅니다. */
const tfAdd = (ds, n) => { const x = new Date(ds + 'T00:00:00'); x.setDate(x.getDate() + n); return ymd(x); };
const tfDow = ds => '일월화수목금토'[new Date(ds + 'T00:00:00').getDay()];
const tfMd = ds => { const [, m, d] = ds.split('-'); return +m + '/' + +d; };
const tfOk = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const tfWs = () => (((S.profile || {}).lay || {}).ws === 0 ? 0 : 1);
const tfMon = ds => { const x = new Date(ds + 'T00:00:00'); x.setDate(x.getDate() - ((x.getDay() - tfWs() + 7) % 7)); return ymd(x); };
function tfTag(n) { try { ncSeed(); if (n && !cusKinds().some(k => k.n === n)) cusKinds().push({ n, b: 'event' }); } catch (e) { } return n; }

/* ===== 🗓 주간 보기 ===== */
function ncWeek() {
  UI.wk = UI.wk || tfMon(today()); const mon = UI.wk, ev = allEvents(), by = {}; ev.forEach(e => (by[e.date] = by[e.date] || []).push(e));
  let cols = ''; for (let k = 0; k < 7; k++) {
    const ds = tfAdd(mon, k), e = by[ds] || [], wd = new Date(ds + 'T00:00:00').getDay();
    cols += `<div class="nwd ${ds === today() ? 'tdy' : ''} ${wd === 0 ? 'su' : wd === 6 ? 'sa' : ''}"><div class="nwh"><b>${tfMd(ds)}</b> (${tfDow(ds)})<button class="ncplus" data-act="ncAdd" data-d="${ds}" aria-label="${tfMd(ds)}에 추가">＋</button></div>${e.map(ncCard).join('') || '<p class="mu nwe">일정 없음</p>'}</div>`;
  }
  return `<div class="nwnav"><button class="btn sm" data-act="tfWk" data-n="-7">◀ 지난 주</button><button class="btn sm" data-act="tfWk" data-n="0">이번 주</button><button class="btn sm" data-act="tfWk" data-n="7">다음 주 ▶</button><b>${tfMd(mon)} ~ ${tfMd(tfAdd(mon, 6))}</b></div><div class="nwk">${cols}</div>`;
}

/* ===== ☀️ 아침 브리핑 카드 (오늘 화면) ===== */
function tfBrief() {
  const t = today(); if (localStorage.getItem('tf.briefHide') === t) return '';
  const ev = allEvents().filter(e => e.date === t), od = S.items.filter(x => x.cat === 'todo' && !x.done && x.date && x.date < t).sort((a, b) => a.date.localeCompare(b.date)), tm = tfAdd(t, 1), nx = allEvents().filter(e => e.date === tm);
  const dd = (S.dday || []).filter(x => tfOk(x.date)).map(x => ({ ...x, n: Math.round((new Date(x.date + 'T00:00:00') - new Date(t + 'T00:00:00')) / 864e5) })).filter(x => x.n >= 0 && x.n <= 14).sort((a, b) => a.n - b.n);
  if (!ev.length && !od.length && !dd.length && !nx.length) return '';
  const li = (a, f) => a.slice(0, 5).map(f).join('') + (a.length > 5 ? `<li class="mu">…외 ${a.length - 5}건</li>` : '');
  return `<div class="tfbrief"><div class="tfbh"><b>☀️ 오늘 브리핑</b><span class="grow"></span><button class="btn sm" data-act="tfTools">🧰 도구</button><button class="btn sm" data-act="tfBfHide" aria-label="오늘은 그만 보기">✕</button></div>
  ${ev.length ? `<h4>오늘 ${ev.length}건</h4><ul>${li(ev, e => `<li>${esc(e.t)}${e.done ? ' ✔' : ''}</li>`)}</ul>` : '<p class="mu">오늘 등록된 일정은 없습니다.</p>'}
  ${od.length ? `<h4>⏰ 밀린 할 일 ${od.length}건</h4><ul>${li(od, x => `<li>${tfMd(x.date)} ${esc(x.title)}</li>`)}</ul><button class="btn sm" data-act="tfBfMove">밀린 일 모두 오늘로 옮기기</button>` : ''}
  ${nx.length ? `<h4>내일 ${nx.length}건</h4><ul>${li(nx, e => `<li>${esc(e.t)}</li>`)}</ul>` : ''}
  ${dd.length ? `<h4>디데이</h4><ul>${dd.slice(0, 4).map(x => `<li>${esc(x.title)} <b>${x.n ? 'D-' + x.n : 'D-Day'}</b></li>`).join('')}</ul>` : ''}</div>`;
}


/* ===== 대화상자 틀 ===== */
function tfDlg(html) {
  let d = document.getElementById('tfdlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'tfdlg'; d.className = 'dlg tfdlg'; document.body.appendChild(d); d.addEventListener('click', tfClick); d.addEventListener('change', tfChange); d.addEventListener('input', tfChange); d.addEventListener('close', () => { try { commit(); } catch (e) { } }); }
  d.innerHTML = html; if (!d.open) d.showModal(); return d;
}
const tfVal = n => { const e = document.querySelector('#tfdlg [name=' + n + ']'); return e ? (e.type === 'checkbox' ? e.checked : e.value) : ''; };
function tfMenu() {
  tfDlg(`<h3>🧰 도구</h3><div class="tfm">
  <button class="btn" data-tf="lay">🧩 화면 구조 편집<small>칸 순서·이름·메뉴·캘린더 옵션·구분 목록</small></button>
  <button class="btn" data-tf="tpl">📋 행사 템플릿<small>곡선제·수행평가·시험 등 D-30 준비표 한 번에</small></button>
  <button class="btn" data-tf="rec">📑 기록 모아보기<small>낱말·기간으로 일정·메모·회의록 모으기</small></button>
  <button class="btn" data-tf="hand">📘 인수인계서<small>업무·일정·예산을 문서로</small></button>
  <button class="btn" data-tf="retro">🎓 연말 회고<small>올해 한 일 월별 정리</small></button>
  <button class="btn" data-tf="imp">📥 가져오기<small>노션 CSV · 구글/네이버/아이폰 .ics</small></button>
  <button class="btn" data-tf="exp">📤 내보내기<small>.ics(다른 캘린더로) · CSV(엑셀)</small></button>
  <button class="btn" data-tf="notif">🔔 알림<small>매일 아침 오늘 일정 알림</small></button>
  <button class="btn" data-tf="file">📷 사진·PDF로 일정 뽑기<small>공문·시간표 → 제안 카드</small></button></div><div class="btns"><button class="btn" data-tf="close">닫기</button></div>`);
}
const tfBack = '<button class="btn sm" data-tf="menu">◀ 도구 목록</button> ';

/* ===== 📋 행사 템플릿 ===== */
const TF_TPL = {
  '곡선제(학교 축제) 준비': [[-60, '기본 계획 수립·학년 협의'], [-45, '부스·프로그램 신청 안내'], [-30, '예산 품의·시설 사용 협의'], [-21, '프로그램 확정·안내장 배포'], [-14, '리허설·역할 분담 확인'], [-7, '물품 구입·최종 점검'], [-3, '시설 세팅·안전 점검'], [0, '행사 당일'], [1, '정산·결과 보고']],
  '수행평가 운영': [[-21, '평가 계획 안내(성취기준·루브릭)'], [-14, '수행평가지·루브릭 확정'], [-7, '학생 안내·학습지 인쇄'], [0, '수행평가 실시'], [3, '채점·결과 입력'], [7, '이의신청 확인·결과 확정']],
  '지필평가 출제·운영': [[-35, '출제 계획·이원목적분류표 작성'], [-21, '문항 초안 작성'], [-14, '검토·수정'], [-10, '원안 제출·인쇄 의뢰'], [-3, '인쇄물 수령·보안 점검'], [0, '시험 실시'], [3, '채점·정답 확정'], [7, '성적 처리·이의신청 확인']],
  '학부모 상담 주간': [[-14, '상담 안내문 발송'], [-10, '상담 신청 취합'], [-7, '시간표 확정·개별 안내'], [-1, '상담 자료 준비'], [0, '상담 시작'], [3, '상담 기록 정리']],
  '체험학습·현장학습': [[-45, '계획서 작성·결재'], [-30, '장소 답사·업체 선정'], [-21, '가정통신문 발송'], [-14, '참가 동의서 수합'], [-7, '안전교육·인솔 계획'], [-1, '최종 점검'], [0, '체험학습 실시'], [3, '결과 보고·정산']],
  '학교 행사 일반': [[-30, '계획 수립·결재'], [-21, '예산·장소 확인'], [-14, '안내문·신청 수합'], [-7, '물품·역할 최종 점검'], [-1, '사전 점검'], [0, '행사 당일'], [2, '정산·결과 보고']],
  '교육·연수 운영(교권·인권 등)': [[-30, '연수 계획 수립·강사 섭외'], [-21, '예산 품의·장소 확정'], [-14, '안내 공문·참석 신청'], [-7, '자료 준비·인쇄'], [-1, '장소·장비 점검'], [0, '연수 실시'], [2, '이수 확인·결과 보고']],
  '동아리 발표·전시': [[-28, '발표 방식 안내·팀 구성'], [-21, '준비 점검 1차'], [-14, '준비 점검 2차·장소 신청'], [-7, '리허설'], [-1, '장소 세팅'], [0, '발표·전시'], [3, '평가·생기부 기록 정리']]
};
function tfTplSteps() {
  const t = TF_TPL[tfVal('tpl')] || [], due = tfVal('due'), wk = tfVal('wk'); if (!tfOk(due)) return [];
  return t.map(([o, s]) => { let d = tfAdd(due, o); if (wk && o !== 0) { const w = new Date(d + 'T00:00:00').getDay(); if (w === 6) d = tfAdd(d, o < 0 ? -1 : 2); else if (w === 0) d = tfAdd(d, o < 0 ? -2 : 1); } return { d, s, o }; });
}
function tfTplDlg() {
  tfDlg(`<h3>📋 행사 템플릿</h3><p class="mu">행사 날짜(D-Day)를 정하면 준비 할 일이 날짜별로 캘린더에 한 번에 들어갑니다.</p>
  <label class="dpl">템플릿<select name="tpl">${Object.keys(TF_TPL).map(k => `<option>${esc(k)}</option>`).join('')}</select></label>
  <label class="dpl">이름(캘린더에 붙는 제목)<input name="nm" placeholder="예: 제16회 곡선제"></label>
  <label class="dpl">행사 날짜<input type="date" name="due" value="${tfAdd(today(), 30)}"></label>
  <label><input type="checkbox" name="wk" checked> 주말에 걸리면 평일로 옮기기</label><div id="tfprev"></div>
  <div class="btns">${tfBack}<button class="btn pri" data-tf="tplgo">캘린더에 넣기</button></div>`); tfTplPrev();
}
function tfTplPrev() { const p = document.getElementById('tfprev'); if (!p) return; const L = tfTplSteps(); p.innerHTML = L.length ? '<ul class="tfl">' + L.map(x => `<li>${tfMd(x.d)} (${tfDow(x.d)}) · ${esc(x.s)}</li>`).join('') + '</ul>' : '<p class="mu">날짜를 고르세요.</p>'; }
function tfTplGo() {
  const L = tfTplSteps(), nm = (tfVal('nm') || tfVal('tpl')).trim(); if (!L.length) return toast('행사 날짜를 고르세요.'); tfTag('업무');
  L.forEach(x => S.items.push({ id: uid(), title: `${nm} · ${x.s}`, date: x.d, cat: x.o === 0 ? 'event' : 'todo', tag: '업무', done: false }));
  UI.cal = tfVal('due').slice(0, 7); UI.day = tfVal('due'); document.getElementById('tfdlg').close(); commit(); toast(`${L.length}건을 캘린더에 넣었습니다.`);
}

/* ===== 📥 가져오기 / 📤 내보내기 ===== */
function tfPD(s) {
  s = String(s || '').trim(); if (!s) return null;
  const one = x => { let m = x.match(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`; m = x.match(/([A-Z][a-z]+\.? \d{1,2}, \d{4})/); if (m) { const d = new Date(m[1]); if (!isNaN(d)) return ymd(d); } return ''; };
  const p = s.split(/\s*(?:→|->|~|–|—|\s-\s)\s*/), a = one(p[0]); if (!a) return null; const b = p[1] ? one(p[1]) : ''; return { date: a, end: b && b > a ? b : '' };
}
function tfCsv(t) { const rows = []; let r = [], c = '', q = false; t = t.replace(/^\uFEFF/, ''); for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; if (r.some(x => x.trim())) rows.push(r); r = []; } else c += ch; } r.push(c); if (r.some(x => x.trim())) rows.push(r); return rows; }
function tfParseCsv(t) {
  const rows = tfCsv(t); if (rows.length < 2) return []; const h = rows[0].map(x => x.trim().toLowerCase());
  const f = re => h.findIndex(x => re.test(x)); let ti = f(/^(name|title|이름|제목|일정|summary)$/), di = f(/(date|날짜|기간|일자|when|시작)/), gi = f(/(tags?|구분|select|type|분류|category|종류)/), mi = f(/(memo|메모|설명|description|비고|내용)/), ci = f(/(done|완료|status|상태|checkbox)/); if (ti < 0) ti = 0;
  if (di < 0) di = rows[1].findIndex(x => tfPD(x)); const out = [];
  rows.slice(1).forEach(r => { const title = (r[ti] || '').trim(), dt = tfPD(r[di]); if (!title || !dt) return; const it = { title, date: dt.date, end: dt.end, tag: gi >= 0 ? (r[gi] || '').split(',')[0].trim() : '', memo: mi >= 0 ? (r[mi] || '').trim() : '', done: ci >= 0 && /^(yes|true|done|완료|✓|checked|끝)$/i.test((r[ci] || '').trim()) }; out.push(it); });
  return out;
}
function tfIcsD(v, params) { const m = String(v).match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/); if (!m) return null; if (m[4] && m[7]) { const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0)); return { d: ymd(d), t: pad(d.getHours()) + ':' + pad(d.getMinutes()) }; } return { d: `${m[1]}-${m[2]}-${m[3]}`, t: m[4] ? `${m[4]}:${m[5]}` : '', allday: !m[4] }; }
function tfParseIcs(t) {
  const lines = t.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n'), out = []; let cur = null;
  const un = s => String(s || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\');
  lines.forEach(l => { if (/^BEGIN:VEVENT/i.test(l)) cur = {}; else if (/^END:VEVENT/i.test(l)) { if (cur && cur.title && cur.s) { const it = { title: un(cur.title), date: cur.s.d, end: '', tag: '', memo: [cur.s.t ? cur.s.t + ' 시작' : '', cur.loc ? '장소: ' + un(cur.loc) : '', cur.desc ? un(cur.desc) : ''].filter(Boolean).join('\n'), done: false }; if (cur.e) { let e = cur.e.d; if (cur.e.allday) e = tfAdd(e, -1); if (e > it.date) it.end = e; } out.push(it); } cur = null; } else if (cur) { const i = l.indexOf(':'); if (i < 0) return; const k = l.slice(0, i).split(';')[0].toUpperCase(), v = l.slice(i + 1); if (k === 'SUMMARY') cur.title = v; else if (k === 'DTSTART') cur.s = tfIcsD(v); else if (k === 'DTEND') cur.e = tfIcsD(v); else if (k === 'DESCRIPTION') cur.desc = v; else if (k === 'LOCATION') cur.loc = v; } });
  return out;
}
let TFIMP = [];
function tfImpDlg() { TFIMP = []; tfDlg(`<h3>📥 가져오기</h3><p class="mu">노션에서 내보낸 <b>CSV</b>, 구글·네이버·아이폰 캘린더의 <b>.ics</b> 파일을 올리면 일정으로 가져옵니다. 이미 있는 같은 제목·같은 날은 건너뜁니다.</p>
  <p class="mu" style="font-size:12px">노션: 캘린더(데이터베이스) 우측 상단 ⋯ → 내보내기 → 형식 「Markdown & CSV」. 구글: 설정 → 가져오기/내보내기 → 내보내기(zip 안의 .ics).</p>
  <label class="btn pri file">📂 파일 고르기<input type="file" id="tfImpF" accept=".csv,.ics,.txt,text/csv,text/calendar" hidden></label><div id="tfimpv"></div><div class="btns">${tfBack}</div>`); }
function tfImpShow() {
  const v = document.getElementById('tfimpv'); if (!v) return; const ex = new Set(S.items.map(x => x.title + '|' + x.date)), n = TFIMP.filter(x => !ex.has(x.title + '|' + x.date));
  v.innerHTML = `<p><b>${TFIMP.length}건</b>을 찾았고, 새로 들어갈 것은 <b>${n.length}건</b>입니다.</p><ul class="tfl">${n.slice(0, 12).map(x => `<li>${x.date}${x.end ? '~' + tfMd(x.end) : ''} · ${esc(x.title)}${x.tag ? ' [' + esc(x.tag) + ']' : ''}</li>`).join('')}${n.length > 12 ? `<li class="mu">…외 ${n.length - 12}건</li>` : ''}</ul>${n.length ? '<button class="btn pri" data-tf="impgo">가져오기</button>' : ''}`;
}
function tfImpGo() { const ex = new Set(S.items.map(x => x.title + '|' + x.date)); let k = 0; TFIMP.forEach(x => { if (ex.has(x.title + '|' + x.date)) return; const it = { id: uid(), title: x.title, date: x.date, cat: 'event', done: !!x.done }; if (x.end) it.end = x.end; if (x.memo) it.memo = x.memo; if (x.tag) it.tag = tfTag(x.tag); S.items.push(it); k++; }); document.getElementById('tfdlg').close(); commit(); toast(`${k}건을 가져왔습니다.`); }
const tfIcsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
const tfDl = (name, text, mime) => { const b = new Blob([text], { type: mime }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
function tfExpDlg() { tfDlg(`<h3>📤 내보내기</h3><p class="mu">구글·네이버·아이폰 캘린더에서 「가져오기」로 올리면 같이 보입니다(한 번 옮기는 방식이며, 자동으로 계속 맞춰지지는 않습니다).</p>
  <label><input type="checkbox" name="all"> 학사일정·연수표 등 자동으로 뜨는 일정도 포함(기본은 내가 직접 넣은 것만)</label>
  <div class="tfm"><button class="btn pri" data-tf="ics">📅 .ics 파일 받기</button><button class="btn" data-tf="csv">📊 CSV(엑셀) 받기</button></div><div class="btns">${tfBack}</div>`); }
function tfExpRows() { if (tfVal('all')) return allEvents().map(e => ({ title: e.t, date: e.date, end: '', tag: e.kind || '', memo: '', done: !!e.done })); return S.items.filter(x => x.date).map(x => ({ title: x.title, date: x.date, end: x.end || '', tag: x.tag || (x.cat === 'todo' ? '할 일' : '일정'), memo: x.memo || '', done: !!x.done })); }
function tfIcs() {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Travail Fatal//KO', 'CALSCALE:GREGORIAN'], st = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  tfExpRows().forEach((x, k) => { const e = tfAdd(x.end && x.end > x.date ? x.end : x.date, 1); L.push('BEGIN:VEVENT', `UID:tf-${x.date}-${k}-${x.title.length}@travailfatal`, `DTSTAMP:${st}`, `DTSTART;VALUE=DATE:${x.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${e.replace(/-/g, '')}`, `SUMMARY:${tfIcsEsc((x.done ? '✔ ' : '') + x.title)}`, ...(x.memo ? [`DESCRIPTION:${tfIcsEsc(x.memo)}`] : []), 'END:VEVENT'); });
  L.push('END:VCALENDAR'); tfDl('업무파탈_일정.ics', L.join('\r\n'), 'text/calendar'); toast('.ics 파일을 만들었습니다.');
}
function tfCsvOut() { const q = s => '"' + String(s || '').replace(/"/g, '""') + '"'; const t = '\uFEFF' + ['제목,날짜,끝,구분,메모,완료'].concat(tfExpRows().map(x => [x.title, x.date, x.end, x.tag, x.memo, x.done ? '완료' : ''].map(q).join(','))).join('\r\n'); tfDl('업무파탈_일정.csv', t, 'text/csv'); toast('CSV 파일을 만들었습니다.'); }

/* ===== 🔔 알림 ===== */
const tfNOn = () => localStorage.getItem('tf.notif') === '1' && 'Notification' in window && Notification.permission === 'granted';
async function tfNotifyNow(force) {
  const t = today(), ev = allEvents(), a = ev.filter(e => e.date === t), b = ev.filter(e => e.date === tfAdd(t, 1)), od = S.items.filter(x => x.cat === 'todo' && !x.done && x.date && x.date < t).length;
  const dd = (S.dday || []).filter(x => x.date === t || x.date === tfAdd(t, 1)).map(x => x.title + (x.date === t ? ' D-Day' : ' D-1')); const lines = [];
  if (a.length) lines.push(`오늘 ${a.length}건: ` + a.slice(0, 3).map(e => e.t).join(', ')); if (b.length) lines.push(`내일 ${b.length}건`); if (od) lines.push(`밀린 할 일 ${od}건`); if (dd.length) lines.push(dd.join(', '));
  if (!lines.length) { if (!force) return; lines.push('오늘 등록된 일정이 없습니다.'); }
  const o = { body: lines.join('\n'), icon: 'icons/icon-192.png', tag: 'tf-brief' };
  try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg && reg.showNotification) return reg.showNotification('☀️ 업무파탈 오늘 브리핑', o); } catch (e) { }
  new Notification('☀️ 업무파탈 오늘 브리핑', o);
}
function tfTick() { if (!tfNOn()) return; const n = new Date(), h = +(localStorage.getItem('tf.notifHour') || 8); if (n.getHours() >= h && localStorage.getItem('tf.notifDay') !== today()) { localStorage.setItem('tf.notifDay', today()); tfNotifyNow(); } }
setInterval(tfTick, 60000); setTimeout(tfTick, 4000);
function tfNotifDlg() {
  const sup = 'Notification' in window, on = tfNOn(), h = localStorage.getItem('tf.notifHour') || '8';
  tfDlg(`<h3>🔔 알림</h3>${sup ? `<p>상태: <b>${on ? '켜짐' : '꺼짐'}</b>${Notification.permission === 'denied' ? ' (브라우저에서 알림이 차단되어 있습니다. 주소창 자물쇠 → 알림 허용)' : ''}</p>
  <label class="dpl">알림 시각<select name="nh">${[6, 7, 8, 9, 10].map(x => `<option value="${x}" ${String(x) === h ? 'selected' : ''}>오전 ${x}시</option>`).join('')}</select></label>
  <div class="tfm">${on ? '<button class="btn" data-tf="noff">끄기</button>' : '<button class="btn pri" data-tf="non">켜기</button>'}<button class="btn" data-tf="ntest">지금 시험 알림</button></div>
  <p class="mu" style="font-size:12px">알림은 업무파탈이 열려 있거나(폰이면 앱을 설치해 백그라운드에 둔 상태) 그날 처음 열 때 뜹니다. 앱을 완전히 닫아 둔 상태에서 울리는 푸시는 아닙니다.</p>` : '<p>이 브라우저는 알림을 지원하지 않습니다.</p>'}<div class="btns">${tfBack}</div>`);
}

/* ===== 📑 기록 모아보기 · 📘 인수인계서 · 🎓 연말 회고 ===== */
let TFR = { out: '', ai: '' };
const tfSchoolStart = () => { const n = new Date(); return `${n.getMonth() < 2 ? n.getFullYear() - 1 : n.getFullYear()}-03-01`; };
function tfRecText(q, a, b) {
  q = (q || '').trim().toLowerCase(); const hit = s => !q || String(s || '').toLowerCase().includes(q), rows = [];
  S.items.forEach(x => { if (x.date && x.date >= a && x.date <= b && hit([x.title, x.memo, x.tag].join(' '))) rows.push([x.date, `${tfMd(x.date)} [${x.tag || (x.cat === 'todo' ? '할 일' : '일정')}] ${x.title}${x.done ? ' ✔' : ''}${x.memo ? '\n    ' + x.memo.replace(/\n/g, '\n    ') : ''}`]); });
  (S.notes || []).forEach(n => { if (!n.lock && n.date && n.date >= a && n.date <= b && hit([n.title, n.body, n.decisions, n.followups].join(' '))) rows.push([n.date, `${tfMd(n.date)} 📝 ${n.title}${n.body ? '\n    ' + String(n.body).slice(0, 500).replace(/\n/g, '\n    ') : ''}${n.decisions ? '\n    결정: ' + String(n.decisions).replace(/\n/g, ' / ') : ''}${n.followups ? '\n    후속: ' + String(n.followups).replace(/\n/g, ' / ') : ''}`]); });
  Object.keys(S.dayMemo || {}).forEach(d => { if (d >= a && d <= b && hit(S.dayMemo[d])) rows.push([d, `${tfMd(d)} 🗒 ${String(S.dayMemo[d]).replace(/\n/g, ' / ')}`]); });
  rows.sort((x, y) => x[0].localeCompare(y[0])); return rows.length ? `[${a} ~ ${b}${q ? ' · "' + q + '"' : ''}] ${rows.length}건\n\n` + rows.map(r => r[1]).join('\n') : '조건에 맞는 기록이 없습니다.';
}
function tfHandText() {
  const t = today(), L = [`# 업무 인수인계서`, `작성일: ${t}  ·  작성자: ${S.profile.name || ''}`, ''];
  const mine = S.mine || []; L.push('## 1. 맡은 업무'); if (mine.length) { const g = {}; mine.forEach(m => (g[m.cat || '기타'] = g[m.cat || '기타'] || []).push(m)); Object.keys(g).forEach(k => { L.push(`### ${k}`); g[k].forEach(m => L.push(`- ${m.title}${m.done ? ' (완료)' : ''}${m.memo ? ' — ' + String(m.memo).replace(/\n/g, ' / ') : ''}`)); }); } else L.push('- (등록된 내 업무 없음)');
  let cards = []; try { cards = wkD().cards.filter(c => c.me); } catch (e) { } if (cards.length) { L.push('', '## 2. 업무 카드'); cards.forEach(c => L.push(`- ${c.title}${c.dept ? ' (' + c.dept + ')' : ''}${c.due ? ' · 기한 ' + c.due : ''}${c.done ? ' · 완료' : ''}${c.memo ? ' — ' + String(c.memo).replace(/\n/g, ' / ') : ''}`)); }
  L.push('', '## 3. 연중 일정 흐름'); const its = S.items.filter(x => x.date && (x.tag === '업무' || x.tag === '연수' || x.cat === 'event')).sort((a, b) => a.date.localeCompare(b.date)), mm = {}; its.forEach(x => (mm[x.date.slice(0, 7)] = mm[x.date.slice(0, 7)] || []).push(x)); Object.keys(mm).forEach(k => { L.push(`### ${+k.slice(5)}월`); mm[k].forEach(x => L.push(`- ${tfMd(x.date)} ${x.title}${x.memo ? ' — ' + x.memo.split('\n')[0] : ''}`)); }); if (!its.length) L.push('- (등록된 일정 없음)');
  const nt = (S.notes || []).filter(n => !n.lock && (n.decisions || n.followups)); if (nt.length) { L.push('', '## 4. 회의·연수 결정과 후속'); nt.forEach(n => { L.push(`- ${n.date || ''} ${n.title}`); if (n.decisions) L.push('  - 결정: ' + String(n.decisions).replace(/\n/g, ' / ')); if (n.followups) L.push('  - 후속: ' + String(n.followups).replace(/\n/g, ' / ')); }); }
  if ((S.budget || []).length) { L.push('', '## 5. 예산 현황'); S.budget.forEach(p => { L.push(`### ${p.name}`); p.lines.forEach(l => { const sp = typeof spentOf === 'function' ? spentOf(l) : 0; L.push(`- ${l.item}: 배정 ${(+l.alloc || 0).toLocaleString()}원 · 집행 ${sp.toLocaleString()}원 · 잔액 ${((+l.alloc || 0) - sp).toLocaleString()}원${l.deadline ? ' · 기한 ' + l.deadline : ''}`); }); }); }
  const open = S.items.filter(x => x.cat === 'todo' && !x.done).sort((a, b) => (a.date || '').localeCompare(b.date || '')); L.push('', '## 6. 아직 끝나지 않은 일'); if (open.length) open.forEach(x => L.push(`- ${x.date || ''} ${x.title}`)); else L.push('- 없음');
  L.push('', '## 7. 인계 시 참고(직접 채워 주세요)', '- 관련 부서·담당자 연락처:', '- 자주 생기는 문제와 대처:', '- 꼭 기억할 기한·규정:'); return L.join('\n');
}
function tfRetroText(a, b) {
  const it = S.items.filter(x => x.date && x.date >= a && x.date <= b), done = it.filter(x => x.done), L = [`# 업무 회고 (${a} ~ ${b})`, ''];
  L.push(`- 등록한 일정·할 일 ${it.length}건, 그중 완료 ${done.length}건(${it.length ? Math.round(done.length / it.length * 100) : 0}%)`); const nt = (S.notes || []).filter(n => n.date && n.date >= a && n.date <= b); L.push(`- 회의·연수·기록 ${nt.length}건`);
  let wc = []; try { wc = wkD().cards.filter(c => c.me); } catch (e) { } if (wc.length) L.push(`- 업무 카드 ${wc.length}개 중 완료 ${wc.filter(c => c.done).length}개`);
  const tg = {}; it.forEach(x => { const k = x.tag || (x.cat === 'todo' ? '할 일' : '일정'); tg[k] = (tg[k] || 0) + 1; }); L.push('- 구분별: ' + (Object.keys(tg).sort((x, y) => tg[y] - tg[x]).map(k => `${k} ${tg[k]}`).join(', ') || '없음'));
  L.push('', '## 월별 한 일'); const mm = {}; it.forEach(x => (mm[x.date.slice(0, 7)] = mm[x.date.slice(0, 7)] || []).push(x)); Object.keys(mm).sort().forEach(k => { const d = mm[k].filter(x => x.done); L.push(`### ${+k.slice(5)}월 (등록 ${mm[k].length} · 완료 ${d.length})`); d.slice(0, 25).forEach(x => L.push(`- ${tfMd(x.date)} ${x.title}`)); if (d.length > 25) L.push(`- …외 ${d.length - 25}건`); });
  const nd = it.filter(x => !x.done && x.cat === 'todo'); if (nd.length) { L.push('', '## 끝내지 못한 할 일'); nd.slice(0, 20).forEach(x => L.push(`- ${tfMd(x.date)} ${x.title}`)); } L.push('', '## 한 줄 성찰(직접 적어 주세요)', '- 올해 가장 잘한 일:', '- 아쉬웠던 점:', '- 내년에 바꿀 점:'); return L.join('\n');
}
function tfRepDlg(tab) {
  const t0 = tfSchoolStart(), td = today(); TFR.tab = tab; TFR.ai = '';
  const head = tab === 'rec' ? `<h3>📑 기록 모아보기</h3><p class="mu">낱말(예: 1-3, 인권, 상담)과 기간으로 일정·메모·회의록을 한 번에 모읍니다. <b>학생 실명은 넣지 않는 것을 권합니다.</b></p><label class="dpl">찾을 낱말(비우면 전체)<input name="q"></label><div class="tfrow"><label class="dpl">부터<input type="date" name="a" value="${t0}"></label><label class="dpl">까지<input type="date" name="b" value="${td}"></label></div>` : tab === 'retro' ? `<h3>🎓 연말 회고</h3><div class="tfrow"><label class="dpl">부터<input type="date" name="a" value="${t0}"></label><label class="dpl">까지<input type="date" name="b" value="${td}"></label></div>` : '<h3>📘 인수인계서</h3><p class="mu">내 업무·일정·예산·결정사항을 문서 하나로 모읍니다. 마지막 칸은 직접 채워 주세요.</p>';
  tfDlg(`${head}<textarea id="tfout" rows="12" class="tfout" spellcheck="false"></textarea>
  <div class="tfm"><button class="btn" data-tf="copy">📋 복사</button><button class="btn" data-tf="save">💾 파일로 저장</button>${agKey() ? '<button class="btn pri" data-tf="ai">🤖 AI로 다듬기</button>' : '<span class="mu">AI 다듬기는 꿈송이 창에 Claude 키를 넣으면 켜집니다.</span>'}</div><div class="btns">${tfBack}</div>`); tfRepRefresh();
}
function tfRepRefresh() { const o = document.getElementById('tfout'); if (!o) return; const a = tfVal('a') || tfSchoolStart(), b = tfVal('b') || today(); o.value = TFR.tab === 'rec' ? tfRecText(tfVal('q'), a, b) : TFR.tab === 'retro' ? tfRetroText(a, b) : tfHandText(); }
async function tfAIRun() {
  const o = document.getElementById('tfout'); if (!o || !o.value.trim()) return; const ask = { rec: '아래 기록을 주제별로 묶어 핵심만 간결하게 정리해 주세요.', hand: '아래 인수인계서 초안을 읽기 좋고 빠짐없이 다듬어 주세요. 비어 있는 참고 칸은 그대로 두세요.', retro: '아래 자료로 교사 본인의 업무 회고 글(성과·아쉬움·내년 계획)을 자연스러운 존댓말 문장으로 써 주세요. 자료에 없는 사실은 쓰지 마세요.' }[TFR.tab];
  toast('Claude가 정리하는 중입니다…'); try { const j = await b2Call({ model: B2_MODEL(), max_tokens: 3000, system: '당신은 한국 중학교 교사의 업무 정리를 돕는 비서입니다. 주어진 자료만 사용하고 지어내지 마세요. 학생·교직원의 실명이 보이면 ○○로 바꾸세요. 존댓말로, 군더더기 없이 쓰세요.', messages: [{ role: 'user', content: ask + '\n\n' + o.value.slice(0, 14000) }] }); const t = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim(); if (!t) throw new Error('빈 답'); o.value = t; toast('다듬었습니다. 마음에 안 들면 닫았다가 다시 열어 처음 상태로 돌릴 수 있습니다.'); } catch (e) { toast('AI 정리 실패: ' + e.message); }
}

/* ===== 📷 사진·PDF → 일정 제안 / 🎤 말로 입력 ===== */
async function tfFileRun(file) {
  if (!agKey()) { toast('이 기능은 꿈송이 창에 Claude 키를 넣어야 켜집니다.'); return; }
  CH.push({ role: 'me', text: '📎 ' + file.name }); renderChat();
  try {
    let content;
    if (/^image\//.test(file.type)) content = [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await scImg(file) } }];
    else if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) { if (file.size > 8e6) throw new Error('PDF가 8MB보다 큽니다'); const d = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('파일을 읽지 못했습니다')); r.readAsDataURL(file); }); content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: d } }]; }
    else content = [{ type: 'text', text: (await file.text()).slice(0, 14000) }];
    content.push({ type: 'text', text: `오늘은 ${today()}입니다. 위 자료에서 교사가 챙겨야 할 일정·기한·제출·준비물을 모두 찾아 항목마다 add_cal_item을 부르세요(연도가 없으면 오늘 기준 가장 가까운 미래). 장소·시간·준비물은 memo에 넣고, 마감이 있는 제출은 type을 todo로 하세요.` });
    const tool = B2_WRITE.find(x => x.name === 'add_cal_item'), j = await b2Call({ model: B2_MODEL(), max_tokens: 3000, tools: [tool], tool_choice: { type: 'any' }, system: '교사 업무수첩 비서입니다. 자료에 실제로 있는 내용만 뽑고 지어내지 마세요.', messages: [{ role: 'user', content }] });
    const acts = (j.content || []).filter(c => c.type === 'tool_use').map(c => ({ name: c.name, input: c.input })); if (!acts.length) throw new Error('일정을 찾지 못했습니다');
    acts.forEach(a => { a.plan = agPlan(a); }); CH.push({ role: 'bot', text: `「${file.name}」에서 ${acts.length}건을 찾았습니다. 확인하고 적용을 눌러 주세요.`, blocks: [], act: acts, applied: false });
  } catch (e) { CH.push({ role: 'bot', text: '자료를 읽지 못했습니다(' + e.message + ').', blocks: [] }); }
  renderChat();
}
function tfVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return toast('이 브라우저는 음성 입력을 지원하지 않습니다(크롬·삼성 인터넷에서 됩니다).');
  const r = new SR(); r.lang = 'ko-KR'; r.interimResults = false; toast('🎤 말씀하세요…'); r.onresult = e => { const t = e.results[0][0].transcript; if (t) ask1(t); }; r.onerror = e => toast('음성 입력 오류: ' + (e.error || '')); try { r.start(); } catch (e) { }
}

/* ===== AI 비서 도구: 행사·업무 통째로 계획 ===== */
B2_WRITE.push({ name: 'plan_project', description: '행사·업무 준비를 통째로 계획한다. 행사 날짜(due)를 기준으로 준비 단계를 날짜별 할 일로 만든다. "곡선제 준비 계획 짜줘", "수행평가 일정 잡아줘" 류. 템플릿 이름(곡선제, 수행평가, 지필평가, 학부모 상담, 체험학습, 학교 행사, 연수, 동아리)에 맞으면 그 단계를 참고하되 상황에 맞게 조정한다.', input_schema: { type: 'object', properties: { name: { type: 'string' }, due: { type: 'string', description: 'YYYY-MM-DD 행사 날짜' }, tasks: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, memo: { type: 'string' } }, required: ['title', 'date'] } } }, required: ['name', 'due', 'tasks'] } });
const _t4Plan = agPlan, _t4Do = agDo;
agPlan = function (a) { const i = a.input || {}; if (a.name === 'plan_project') { const L = (i.tasks || []).filter(t => tfOk(t.date)); if (!L.length || !tfOk(i.due)) return { ok: false, txt: '계획: 날짜가 올바른 단계가 없습니다' }; return { ok: true, txt: `📋 ${i.name} 준비 ${L.length}단계 + 행사일(${i.due}) · ${L.slice().sort((x, y) => x.date.localeCompare(y.date)).slice(0, 3).map(t => tfMd(t.date) + ' ' + t.title).join(' / ')}${L.length > 3 ? ' …' : ''}` }; } return _t4Plan(a); };
agDo = function (a) { const i = a.input || {}; if (a.name === 'plan_project') { tfTag('업무'); (i.tasks || []).filter(t => tfOk(t.date)).forEach(t => S.items.push({ id: uid(), title: `${i.name} · ${t.title}`, date: t.date, cat: 'todo', tag: '업무', done: false, ...(t.memo ? { memo: t.memo } : {}) })); S.items.push({ id: uid(), title: i.name, date: i.due, cat: 'event', tag: '업무', done: false }); return; } return _t4Do(a); };

/* ===== 이벤트 연결 ===== */
function tfChange(e) { const t = e.target; if (!t) return; if (t.name === 'tpl' || t.name === 'due' || t.name === 'wk') tfTplPrev(); else if (['q', 'a', 'b'].includes(t.name) && e.type === 'change') tfRepRefresh(); else if (t.id === 'tfImpF' && t.files[0]) { const f = t.files[0]; f.text().then(x => { TFIMP = /\.ics$/i.test(f.name) || /BEGIN:VCALENDAR/i.test(x) ? tfParseIcs(x) : tfParseCsv(x); tfImpShow(); }).catch(() => toast('파일을 읽지 못했습니다.')); } else if (t.name === 'nh') localStorage.setItem('tf.notifHour', t.value); }
function tfClick(e) {
  const b = e.target.closest('[data-tf]'); if (!b) { if (e.target.id === 'tfdlg') e.target.close(); return; }
  const d = document.getElementById('tfdlg'), k = b.dataset.tf;
  const M = { lay: () => { d.close(); lyDlg(); }, close: () => d.close(), menu: tfMenu, tpl: tfTplDlg, tplgo: tfTplGo, rec: () => tfRepDlg('rec'), hand: () => tfRepDlg('hand'), retro: () => tfRepDlg('retro'), imp: tfImpDlg, impgo: tfImpGo, exp: tfExpDlg, ics: tfIcs, csv: tfCsvOut, notif: tfNotifDlg,
    copy: () => { const o = document.getElementById('tfout'); if (o) { o.select(); try { navigator.clipboard.writeText(o.value); } catch (x) { document.execCommand('copy'); } toast('복사했습니다.'); } },
    save: () => { const o = document.getElementById('tfout'); if (o) tfDl({ rec: '기록_모음', hand: '인수인계서', retro: '업무_회고' }[TFR.tab] + '.md', o.value, 'text/markdown'); },
    ai: () => sure('이 내용을 Claude(외부 서버)로 보내 다듬을까요? 학생 실명이 없는지 확인해 주세요.', tfAIRun),
    non: async () => { if (!('Notification' in window)) return; const p = await Notification.requestPermission(); if (p === 'granted') { localStorage.setItem('tf.notif', '1'); localStorage.removeItem('tf.notifDay'); toast('알림을 켰습니다.'); } tfNotifDlg(); },
    noff: () => { localStorage.setItem('tf.notif', '0'); tfNotifDlg(); }, ntest: () => { if (!('Notification' in window) || Notification.permission !== 'granted') return toast('먼저 「켜기」로 알림을 허용해 주세요.'); tfNotifyNow(true); },
    file: () => { d.close(); tfFileInput().click(); } };
  if (M[k]) { e.preventDefault(); M[k](); }
}
function tfFileInput() { let f = document.getElementById('tfFile'); if (!f) { f = document.createElement('input'); f.type = 'file'; f.id = 'tfFile'; f.accept = 'image/*,application/pdf,.pdf,.txt'; f.hidden = true; f.addEventListener('change', () => { const x = f.files[0]; f.value = ''; if (x) tfFileRun(x); }); document.body.appendChild(f); } return f; }
Object.assign(A, { tfWk(el) { UI.wk = +el.dataset.n === 0 ? tfMon(today()) : tfAdd(UI.wk || tfMon(today()), +el.dataset.n); render(); }, tfTools: tfMenu, tfBfHide() { localStorage.setItem('tf.briefHide', today()); render(); }, tfBfMove() { sure('밀린 할 일을 모두 오늘로 옮길까요?', () => { S.items.forEach(x => { if (x.cat === 'todo' && !x.done && x.date && x.date < today()) x.date = today(); }); commit(); toast('오늘로 옮겼습니다.'); }); } });
/* 꿈송이 창 빠른 도구 줄 */
const _t4Kb = chatKeyBar;
chatKeyBar = function () { return _t4Kb.apply(this, arguments) + `<div class="b3q"><button type="button" class="btn sm" data-tfq="file">📷 사진·PDF로 일정</button><button type="button" class="btn sm" data-tfq="mic">🎤 말로 입력</button><button type="button" class="btn sm" data-tfq="tpl">📋 행사 템플릿</button><button type="button" class="btn sm" data-tfq="tools">🧰 도구</button></div>`; };
document.addEventListener('click', e => { const b = e.target.closest('[data-tfq]'); if (!b) return; e.preventDefault(); ({ file: () => tfFileInput().click(), mic: tfVoice, tpl: tfTplDlg, tools: tfMenu })[b.dataset.tfq](); });

/* =====================================================================
   딜시 — 교사 화면 (teacher.js)
   © 김정환 · M.A.D.T (Moral And Digital Teacher)
   탭: 🎛️ 진행 · 📊 현황판 · 📝 판결문·점수 · 🗂️ 포트폴리오 · 🔎 관찰 기록 · 📈 시범 지표 · 💬 피드백 · ⚙️ 설정
   ===================================================================== */
let TTAB = 'run', STU = {}, SCORES = {}, FB = null, TAUTH = false, roomListening = null, SETSUB = 'th';
const T = {};
window.T = T;
const studentList = () => Object.values(STU || {}).filter(s => s && s.sid).sort((a, b) => a.num - b.num);
const tRooms = () => lsGet('dilsi_trooms') || [];

function bootTeacher() {
  TAUTH = sessionStorage.getItem('dilsi_t') === '1';
  if (TAUTH && ROOM) listenRoom();
  render();
}
function listenRoom() {
  if (roomListening === ROOM) return; roomListening = ROOM;
  backend.on(roomPath(ROOM), v => { const d = v || {}; META = d.meta || {}; STU = d.students || {}; SCORES = d.score || {}; metaLoaded = true; safeRender(); });
}
T.login = () => { if ((document.getElementById('tpin').value || '') !== TEACHER_PIN) return toast('비밀번호가 틀렸어요.'); sessionStorage.setItem('dilsi_t', '1'); TAUTH = true; if (ROOM) listenRoom(); render(); };
T.create = async () => {
  const name = (document.getElementById('rname').value || '').trim() || '새 반'; const code = newCode(5);
  const firstUnit = (UNITS.find(u => u.ready && unitOn(u.id)) || UNITS[0]).id;
  await backend.set(roomPath(code) + '/meta', { name, unit: firstUnit, tension: 'normal', status: 'wait', reveal: false, askName: false, gate: 99, hiddenTh: 80, pfPts: 10, mode: 'solo', created: Date.now() });
  const L = tRooms().filter(r => r.code !== code); L.unshift({ code, name, t: Date.now() }); lsSet('dilsi_trooms', L.slice(0, 30));
  T.open(code);
};
T.open = code => { code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!code) return; history.replaceState(null, '', '?mode=teacher&room=' + code); ROOM = code; roomListening = null; metaLoaded = false; listenRoom(); render(); };
T.forget = code => { lsSet('dilsi_trooms', tRooms().filter(r => r.code !== code)); render(); };
T.rooms = () => { history.replaceState(null, '', '?mode=teacher'); ROOM = ''; render(); };
T.tab = t => { TTAB = t; if (t === 'fb' && FB === null) { FB = {}; backend.on(P_FB, v => { FB = v || {}; safeRender(); }); } render(); };
T.meta = (k, v) => backend.update(roomPath(ROOM) + '/meta', { [k]: v }).catch(e => toast('저장 실패: ' + e.message));
T.status = s => { T.meta('status', s); toast({ play: '▶ 시작했어요', pause: '⏸ 학생 화면을 멈췄어요', end: '⏹ 수업을 마쳤어요', wait: '대기 상태' }[s]); };
T.reset = sid => { const s = STU[sid]; if (!confirm((s ? s.num + '번' : sid) + ' 학생 기록을 모두 지울까요? (되돌릴 수 없음)')) return; backend.remove(roomPath(ROOM) + '/students/' + sid); backend.remove(roomPath(ROOM) + '/score/' + sid); toast('지웠어요.'); };
T.resetRun = sid => { const s = STU[sid], u = META.unit; if (!s || !s.runs || !s.runs[u]) return; if (!confirm(s.num + '번 학생의 이번 단원 기록만 지우고 처음부터 하게 할까요?')) return; backend.remove(roomPath(ROOM) + '/students/' + sid + '/runs/' + u); toast('이번 단원만 초기화했어요. 학생이 새로고침하면 처음부터 시작해요.'); };
T.score = (sid, el) => { const v = el.value.trim(); backend.update(roomPath(ROOM) + '/score/' + sid, { hl: v === '' ? null : +v }); };
T.memo = (sid, el) => backend.update(roomPath(ROOM) + '/score/' + sid, { memo: el.value.slice(0, 300) });
T.conf = (sid, k) => { const cur = ((SCORES[sid] || {}).conf || {})[k]; const nx = cur === undefined || cur === null ? true : cur === true ? false : null; backend.update(roomPath(ROOM) + '/score/' + sid + '/conf', { [k]: nx }); };
T.copy = sid => { const s = STU[sid], r = s && s.runs && s.runs[META.unit]; copyText((r && r.verdict && r.verdict.text) || ''); };

function runOf(s) { return s && s.runs ? s.runs[META.unit] : null; }
function stepName(run, U) {
  if (!run) return '시작 전';
  const m = { story: '이야기', evidence: '증거', council: '회의', write: '논증 중', rebut: '재반박', result: '결과', elim: '탈락 지명', twist: '반전', rescue: '🚨 위기', pick: '재상 선택', verdict: '판결문 작성', done: '✅ 제출' };
  return (['pick', 'verdict', 'done'].includes(run.step) ? '' : '장면' + (run.sc + 1) + ' ') + (m[run.step] || run.step);
}
function critFinal(s, U) { const r = runOf(s), a = critOf(r, U), o = ((SCORES[s.sid] || {}).conf) || {}; const f = {}; CRIT.forEach(([k]) => f[k] = (o[k] === true || o[k] === false) ? o[k] : a[k]); return { a, o, f }; }
function pfScore(f) { const P = +(META.pfPts || 10); if (!f.sub) return 0; const n = CRIT.filter(([k]) => f[k]).length; return n >= 4 ? P : n >= 2 ? Math.round(P / 2 * 10) / 10 : Math.round(P / 4 * 10) / 10; }

/* ---------- 화면 ---------- */
function renderTeacher() {
  if (!TAUTH) { app.innerHTML = `<div class="wrap"><div class="top"><h1>${brandLogo()}${brandTitle()} 교사 화면</h1></div>${coversH()}<div class="card"><h2>🔐 교사 비밀번호</h2><input id="tpin" type="password" class="inp" inputmode="numeric" onkeydown="if(event.key==='Enter')T.login()"><button class="btn full" style="margin-top:10px" onclick="T.login()">들어가기</button></div>${footH()}</div>`; return; }
  if (!ROOM) {
    app.innerHTML = `<div class="wrap"><div class="top"><h1>${brandLogo()}${brandTitle()} 교사 화면<small>${brandSub()}</small></h1></div>
    ${coversH()}<div class="card"><h2>➕ 새 반 만들기</h2><input id="rname" class="inp" placeholder="예: 3학년 2반 윤리와 사상"><button class="btn full" style="margin-top:8px" onclick="T.create()">방 만들기</button></div>
    <div class="card"><h2>📂 내 반</h2>${tRooms().length ? tRooms().map(r => `<div class="row" style="border-top:1px solid var(--line);padding:8px 0"><b style="flex:1">${esc(r.name)} <span class="pill main">${esc(r.code)}</span></b><button class="btn sm" onclick="T.open('${r.code}')">열기</button><button class="btn sm ghost" onclick="T.forget('${r.code}')">목록에서 빼기</button></div>`).join('') : '<p class="muted">아직 없어요.</p>'}
      <div class="row" style="margin-top:10px"><input id="ocode" class="inp" style="flex:1" placeholder="다른 기기에서 만든 방 코드"><button class="btn line" onclick="T.open(document.getElementById('ocode').value)">코드로 열기</button></div></div>
    <div class="card"><button class="btn ghost" onclick="TTAB='set';ROOM='__SET__';render()">⚙️ 공통 설정만 열기</button></div>${footH()}</div>${fbButton()}`; return;
  }
  if (ROOM === '__SET__') { app.innerHTML = `<div class="twrap"><div class="top"><h1>${brandLogo()}⚙️ 공통 설정</h1><button class="btn ghost sm" onclick="T.rooms()">← 반 목록</button></div>${settingsH()}${footH()}</div>`; return; }
  if (!metaLoaded) { app.innerHTML = `<div class="wrap"><div class="card">불러오는 중…</div></div>`; return; }
  if (!META.created) { app.innerHTML = `<div class="wrap"><div class="card"><h2>방 ${esc(ROOM)}을(를) 찾을 수 없어요</h2><button class="btn ghost" onclick="T.rooms()">← 반 목록</button></div></div>`; return; }
  const U = unitById(META.unit) || UNITS[0], L = studentList();
  const tabs = [['run', '🎛️ 진행'], ['big', '📺 큰 화면'], ['board', '📊 현황판'], ['verdict', '📝 판결문·점수'], ['pf', '🗂️ 포트폴리오'], ['obs', '🔎 관찰 기록'], ['kpi', '📈 시범 지표'], ['fb', '💬 피드백'], ['set', '⚙️ 설정']];
  let body = '';
  try {
    body = TTAB === 'run' ? guideH() + runTabH(U, L) : TTAB === 'big' ? bigH(U, L) : TTAB === 'board' ? boardH(U, L) : TTAB === 'verdict' ? verdictTabH(U, L) : TTAB === 'pf' ? pfH(U, L) : TTAB === 'obs' ? obsH(U, L) : TTAB === 'kpi' ? kpiH(U, L) : TTAB === 'fb' ? fbH() : settingsH();
  } catch (e) { console.error(e); body = `<div class="banner">화면 오류: ${esc(e.message)}</div>`; }
  app.innerHTML = `<div class="twrap"><div class="top"><h1>${brandLogo()}${esc(META.name)} <small>${brandTitle()} · 방 ${esc(ROOM)} · ${esc(U.title)} · ${esc(TN(META.tension).n)}</small></h1>
    <span class="pill ${META.status === 'play' ? 'ok' : META.status === 'pause' ? 'gold' : ''}">${{ play: '▶ 진행 중', pause: '⏸ 멈춤', end: '⏹ 끝', wait: '대기' }[META.status] || '대기'}</span>${META.reveal ? '<span class="pill main">📣 결과 공개 중</span>' : ''}
    <button class="btn ghost sm" onclick="T.rooms()">← 반 목록</button></div>
    <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${TTAB === k ? 'on' : ''}" onclick="T.tab('${k}')">${n}</button>`).join('')}</div>${body}${footH()}</div>${fbButton()}`;
  if (TTAB === 'run' || TTAB === 'big') drawQR();
}
function studentURL() { return location.origin + location.pathname + '?room=' + ROOM; }
function drawQR() { const el = document.getElementById('qrbox'); if (!el || !window.QRCode) return; el.innerHTML = ''; new QRCode(el, { text: studentURL(), width: +(el.dataset.s || 180), height: +(el.dataset.s || 180) }); }
function stdOf(U) { const o = (CONTENT.std || {})[U.id]; if (o) return o.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf('|'); return i > 0 ? { code: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { code: '', text: l }; }); return U.standards || []; }

function runTabH(U, L) {
  const subj = [...new Set(UNITS.map(u => u.subject))];
  const done = L.filter(s => { const r = runOf(s); return r && r.step === 'done'; }).length, started = L.filter(s => runOf(s)).length;
  return `<div class="grid2"><div class="card"><h2>📲 학생 입장</h2><div class="bigcode">${esc(ROOM)}</div><div class="qr" id="qrbox"></div>
      <div class="row"><input class="inp" style="flex:1;font-size:13px" readonly value="${esc(studentURL())}"><button class="btn sm" onclick="copyText('${esc(studentURL())}')">링크 복사</button></div>
      <p class="muted small">접속 ${L.length}명 · 시작 ${started}명 · 제출 ${done}명 ${DBMODE === 'demo' ? '<br><b style="color:var(--bad)">⚠️ 체험 모드: 이 기기 안에서만 연동됩니다.</b>' : ''}</p></div>
    <div class="card"><h2>🎛️ 수업 진행</h2>
      <div class="row"><button class="btn ok" onclick="T.status('play')">▶ 시작</button><button class="btn gold" onclick="T.status('pause')">⏸ 일시정지</button><button class="btn bad" onclick="T.status('end')">⏹ 수업 끝</button></div>
      <label class="lb">🚪 진도 잠금 (반 전체 속도 맞추기)</label>
      <select class="inp" onchange="T.meta('gate',+this.value)">${[...U.scenes.map((s, i) => [i + 1, '장면 ' + (i + 1) + '까지만 열기']), [U.scenes.length + 1 || 99, '판결문까지 열기'], [99, '잠금 없음 (각자 속도)']].map(([v, n]) => `<option value="${v}" ${+META.gate === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="lb">📣 결과 공개</label>
      <div class="row"><button class="btn ${META.reveal ? 'ghost' : 'jade'}" onclick="T.meta('reveal',${!META.reveal})">${META.reveal ? '공개 취소' : '📣 엔딩·점수 공개'}</button><span class="muted small">판결문 점수를 넣은 뒤 누르세요. 숨겨진 엔딩 기준</span><input class="inp" style="width:80px" type="number" value="${esc(META.hiddenTh || 80)}" onchange="T.meta('hiddenTh',+this.value)"><span class="muted small">점 이상</span></div>
    </div></div>
    <div class="card"><h2>🎯 이 단원의 성취기준 — ${esc(U.title)}</h2>${stdOf(U).map(x => `<p class="small" style="margin:4px 0"><b>[${esc(x.code)}]</b> ${esc(x.text)}</p>`).join('') || '<p class="muted small">입력된 성취기준이 없습니다. ⚙️ 설정 → 단원 관리에서 넣으세요.</p>'}${U.extNote ? `<div class="note small">${esc(U.extNote)}</div>` : ''}</div>
    <div class="card"><h2>📚 단원 고르기</h2><p class="muted small">완성된 단원만 고를 수 있어요. 단원을 바꿔도 학생의 다른 단원 기록은 남아 있습니다.</p>
      ${subj.map(sj => `<h3>${esc(sj)}</h3><div class="row">${UNITS.filter(u => u.subject === sj).map(u => { const on = u.ready && unitOn(u.id);
        return `<button class="btn sm ${META.unit === u.id ? '' : 'line'}" ${on ? '' : 'disabled'} onclick="T.meta('unit','${u.id}')" title="${esc(u.logline)}">${esc(u.title)}${u.ready ? (reviewed(u.id) ? '' : ' · 미검수') : ' · 준비 중'}${u.sensitive ? ' ⚠️' : ''}</button>`; }).join('')}</div>`).join('')}
      <p class="muted small">⚠️ = 민감한 주제(생명·사형 등). 수업 전에 학생 상황을 살펴 주세요.</p></div>
    <div class="grid2"><div class="card"><h2>🌶️ 긴장감 강도</h2>${['mild', 'normal', 'spicy'].map(k => { const t = TN(k); return `<label class="row" style="margin:6px 0;cursor:pointer"><input type="radio" name="tn" ${META.tension === k ? 'checked' : ''} onchange="T.meta('tension','${k}')"><b>${esc(t.n)}</b><span class="muted small">제한 시간 ${t.timer ? t.timer + '초' : '없음'} · 증거 ${t.peek}장 · 구제 ${t.rescue} · 힌트 ${t.hint}${t.fall ? ' · 폐위 있음' : ''}</span></label>`; }).join('')}
      <p class="muted small">구제·힌트 카드 수는 학생이 [시작]을 누를 때 정해집니다. 세부 값은 ⚙️ 설정에서 바꿉니다.</p></div>
    <div class="card"><h2>👥 진행 방식</h2>
      <label class="row" style="cursor:pointer"><input type="radio" checked> <b>개인</b> <span class="muted small">각자 태블릿으로</span></label>
      <label class="row muted"><input type="radio" disabled> 모둠 <span class="pill">2단계에서 열림</span></label>
      <label class="row muted"><input type="radio" disabled> 학급 전체 <span class="pill">2단계에서 열림</span></label>
      <label class="row" style="margin-top:10px;cursor:pointer"><input type="checkbox" ${META.askName ? 'checked' : ''} onchange="T.meta('askName',this.checked)"> 이름도 받기 <span class="muted small">(끄면 번호만 받음 — 시범 운영은 끄기 권장)</span></label>
      <label class="row" style="margin-top:8px;cursor:pointer"><input type="checkbox" ${META.rank !== false ? 'checked' : ''} onchange="T.meta('rank',this.checked)"> 🏆 반 순위 보이기 <span class="muted small">(학생 화면엔 상위 5명과 자기 순위만, 번호로 표시)</span></label>
      <label class="lb">🎬 연출 강도</label>
      <select class="inp" style="width:auto" onchange="T.meta('fx',this.value)">${[['full', '전체 (도장·흔들림·대사창·등장 효과)'], ['lite', '간단히 (흔들림·타이핑 없음)'], ['off', '끔 (저사양 태블릿용)']].map(([v, n]) => `<option value="${v}" ${(META.fx || 'full') === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="row" style="margin-top:8px;cursor:pointer"><input type="checkbox" ${META.sound ? 'checked' : ''} onchange="T.meta('sound',this.checked)"> 🔊 효과음 <span class="muted small">(도장·경고·심장 박동 — 교실에서는 끄기 권장)</span></label>
      <label class="lb">포트폴리오 만점(판결문 1편당)</label><input class="inp" style="width:100px" type="number" value="${esc(META.pfPts || 10)}" onchange="T.meta('pfPts',+this.value)">
    </div></div>`;
}
function bigH(U, L) {
  const R = L.map(s => runOf(s)).filter(Boolean), done = R.filter(r => r.verdict && r.verdict.submittedAt).length;
  const stepCnt = U.scenes.map((s, i) => R.filter(r => r.sc === i && !['pick', 'verdict', 'done'].includes(r.step)).length);
  const vCnt = R.filter(r => ['pick', 'verdict'].includes(r.step)).length;
  const dist = U.scenes.map((sc, i) => { const c = {}; let n = 0; R.forEach(r => { const a = r.adopt[sc.id]; if (a) { c[a] = (c[a] || 0) + 1; n++; } });
    const ids = sc.options.map(o => o.th).concat(['third']);
    return `<div style="margin:10px 0"><b>장면 ${i + 1} · ${esc(sc.title)}</b> <span class="muted small">(${n}명)</span><div class="dist">${ids.map(id => `<div class="b"><div class="l">${esc(TH(id).name)}</div><div class="g"><i style="width:${n ? Math.round((c[id] || 0) / n * 100) : 0}%"></i></div><div class="n">${c[id] || 0}</div></div>`).join('')}</div></div>`; }).join('');
  const mosaic = META.reveal ? `<h2>🏁 엔딩</h2><div class="mosaic">${L.map(s => { const r = runOf(s); if (!r || !r.verdict || !r.verdict.submittedAt) return ''; const e = endingOf(r, U, SCORES[s.sid] || null, true); return `<div style="${e.hidden ? 'outline:3px solid #ffd43b' : ''}"><b>${e.e}</b>${s.num}번<br>${esc(e.t)}</div>`; }).join('')}</div>` : '<p class="muted">📣 결과를 공개하면 여기에 반 전체 엔딩이 모입니다.</p>';
  return `<div class="bigscr"><div class="row"><div><div class="muted small" style="color:#aab">방 코드</div><div class="bigcode">${esc(ROOM)}</div></div><div class="qr" id="qrbox" data-s="120" style="border-radius:12px"></div><span class="sp"></span>
    <button class="btn gold" onclick="document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{})">⛶ 전체 화면</button></div>
    <div class="kpi" style="margin-top:12px"><div><b>${L.length}</b>접속</div>${stepCnt.map((n, i) => `<div><b>${n}</b>장면 ${i + 1}</div>`).join('')}<div><b>${vCnt}</b>판결문 작성</div><div><b>${done}</b>제출</div></div>
    ${META.rank !== false ? `<h2 style="margin-top:16px">🏆 순위</h2><div class="dist">${rankList(STU, U).slice(0, 10).map((x, i) => `<div class="b"><div class="l">${i + 1}위 · ${x.num}번</div><div class="g"><i style="width:${Math.min(100, x.sc / 3)}%"></i></div><div class="n">${x.r.fallen ? '🥀' : x.sc}</div></div>`).join('') || '<p class="muted">아직 없어요.</p>'}</div>` : ''}
    <h2 style="margin-top:16px">⚖️ 우리 반의 선택</h2>${dist}${mosaic}</div>`;
}
/* 진행 순서·수업 흐름 안내 (펼쳐 보기) */
function guideH() {
  return `<details class="card guide" style="margin-bottom:10px"><summary><b>📘 진행 순서 · 수업 흐름 한눈에 보기</b> <span class="small muted">(눌러서 펼치기)</span></summary>
  <h3>⏱️ 수업 흐름 (50분 1차시 기준)</h3>
  <table class="sumtbl">
    <tr><td>0~5분</td><td><b>입장</b> — 큰 화면에 QR·방 코드 → 학생은 번호로 입장 → [▶ 시작]</td></tr>
    <tr><td>5~15분</td><td><b>장면 1</b> 책사 회의 — 증거 열기 → 해결책 채택(또는 제3의 길) → 한 줄 논증 → 확신도 → 공손연과 공방 → 결과 → 탈락자 지명</td></tr>
    <tr><td>15~25분</td><td><b>장면 2</b> 맞대결 — 두 책사의 토론을 보고 판정</td></tr>
    <tr><td>25~33분</td><td><b>장면 3</b> 긴급 결단 — 짧은 제한 시간 → 반전</td></tr>
    <tr><td>33~48분</td><td><b>판결문</b> — 재상 선택 → RAFTS 교서 쓰기(연대기를 근거로) → 제출</td></tr>
    <tr><td>48~50분</td><td><b>마무리</b> — 📺 큰 화면 순위, 반 선택 분포 짧게 이야기</td></tr>
  </table>
  <p class="small muted">판결문을 다 못 쓰면 숙제나 다음 시간 첫 10분으로 넘겨도 됩니다(자동 저장).</p>
  <h3>🎛️ 선생님 진행 순서</h3>
  <ol class="small" style="padding-left:20px;line-height:1.8">
    <li><b>수업 전</b>: ⚙️ 설정 → 📖 수업 자료에 수업 노트·힌트·<b>학습지 열쇠</b>를 넣고, 태블릿 한 대로 먼저 접속해 보기</li>
    <li><b>🎛️ 진행</b>: 반 만들기 → 단원 → 긴장감(순한·보통·매운 맛) → 순위·연출·효과음 켜기/끄기 → [▶ 시작]</li>
    <li><b>📺 큰 화면</b>을 프로젝터로 띄움 (QR·진행 인원·반 선택 분포·순위)</li>
    <li>속도 차이가 크면 <b>🚪 진도 잠금</b>으로 "장면 1까지만" 열기, 필요하면 [⏸ 일시정지]</li>
    <li><b>📊 현황판</b>: 빨간 줄(민심 20 이하·폐위)과 붙여넣기 횟수 확인, [보기]로 한 학생 글 전체 확인</li>
    <li><b>수업 후</b>: 📝 판결문·점수 → [💾 전체 TXT] → 하이러닝 채점 → 점수 입력</li>
    <li><b>다음 시간</b>: 🎛️ 진행 → [📣 엔딩·점수 공개] → 학생 화면에 엔딩이 열림</li>
    <li><b>평가</b>: 🗂️ 포트폴리오(제출·분량·개념어·반론 4기준, 느슨한 절대평가), 🔎 관찰 기록은 세특 참고용</li>
  </ol>
  <h3>🎮 학생이 알아야 할 것 (시작 전 1분 안내)</h3>
  <ul class="small" style="padding-left:20px;line-height:1.8">
    <li>한 줄 논증 = <b>사상가 개념어 + 왜냐하면 + 지금 상황</b>. 상황이 빠지면 무조건 흔들림</li>
    <li>막히면 📖 수업 노트 → 🧭 방향 → 🔍 개념 → ✍️ 문장 틀 순서로 힌트 (문장 틀을 베끼면 인정 안 됨)</li>
    <li>🔑 학습지 열쇠를 맞히면 힌트 카드 +1 — <b>수업을 잘 들은 사람이 유리</b></li>
    <li>쓰는 도중 📯 급보가 오면 글에 반영해야 함 · 확신도는 신중하게 · 사람들이 죽거나 떠날 수 있음</li>
    <li>점수(순위)는 게임용이고, <b>성적은 판결문</b>으로만 매김</li>
  </ul>
  </details>`;
}
function boardH(U, L) {
  if (!L.length) return `<div class="card muted">아직 들어온 학생이 없어요.</div>`;
  const gk = gaugeKeys(U), lk = lifeKey(U);
  return `<div class="card"><div class="row"><h2 style="flex:1;margin:0">📊 실시간 현황판 — ${esc(U.title)}</h2><span class="muted small">빨간 줄 = ${esc(U.gauges[lk].n)} 20 이하 / 폐위</span></div>
  <div class="scroll" style="margin-top:8px"><table class="st"><tr><th>번호</th><th>이름</th><th>진행</th>${gk.map(k => `<th>${U.gauges[k].e}${esc(U.gauges[k].n)}</th>`).join('')}${U.scenes.map((s, i) => `<th>장면${i + 1}</th>`).join('')}<th>탈락</th><th>패나라 진군</th><th>공손연 마음</th><th>힌트 단계<br><span class="small muted">장면1·2·3</span></th><th>학습지 열쇠</th><th>재상</th><th>판결문</th><th>붙여넣기</th><th>카드 사용</th><th></th></tr>
  ${L.map(s => { const r = runOf(s); if (!r) return `<tr><td>${s.num}</td><td>${esc(s.name)}</td><td>시작 전</td><td colspan="${gk.length + U.scenes.length + 10}"></td><td><button class="btn sm ghost" onclick="T.reset('${s.sid}')">삭제</button></td></tr>`;
    const warn = r.fallen || (r.g[lk] <= 20 && r.step !== 'done');
    return `<tr class="${warn ? 'warn' : ''}"><td>${s.num}</td><td>${esc(s.name)}</td><td>${r.fallen ? '🥀 폐위 · ' : ''}${esc(stepName(r, U))}</td>${gk.map(k => `<td>${r.g[k]}</td>`).join('')}
      ${U.scenes.map(sc => { const st = r.scenes[sc.id] || {}; const lv = { a: '대성공', b: '성공', c: '흔들림', x: '시간 초과' }[st.level] || ''; const rb = st.rebutOk === true ? '공방 이김' : st.rebutOk === false ? '공방 밀림' : ''; return `<td>${st.adopt ? `<b>${st.adopt === 'third' ? '제3의 길' : esc(TH(st.adopt).name)}</b><div class="small">${[lv, rb].filter(Boolean).join(' · ')}</div>` : '-'}</td>`; }).join('')}
      <td>${r.elim.map(id => esc(TH(id).name)).join(',') || '-'}</td><td>${r.march || 0}%${(r.march || 0) >= 80 ? ' <b style="color:var(--bad)">위험</b>' : ''}</td><td>${(r.rival || 0) >= 2 ? '감복' : (r.rival || 0) <= -2 ? '<b style="color:var(--bad)">적대</b>' : '흔들림'} (${(r.rival || 0) > 0 ? '+' : ''}${r.rival || 0})</td><td>${U.scenes.map(sc => (r.scenes[sc.id] || {}).hl || 0).join('·')}</td><td>${U.scenes.filter(sc => (r.scenes[sc.id] || {}).keyOk).length}/${U.scenes.length} 풂</td><td>${r.chief ? esc(TH(r.chief).name) : '-'}</td>
      <td>${nz(r.verdict.text).length}자${r.verdict.submittedAt ? ' ✅' : ''}</td><td>${r.paste ? `<b style="color:var(--bad)">${r.paste}회</b>` : '0'}</td>
      <td class="small">${[r.hintUsed ? '문장 틀 씀' : '', r.rescued ? '구제 ' + r.rescued + '회' : ''].filter(Boolean).join('<br>') || '-'}</td>
      <td><button class="btn sm line" onclick="T.view('${s.sid}')">보기</button> <button class="btn sm ghost" onclick="T.resetRun('${s.sid}')">단원 초기화</button></td></tr>`; }).join('')}
  </table></div><p class="muted small">힌트 단계: 0 = 안 봄, 1 = 방향 질문, 2 = 개념 짚기, 3 = 문장 틀(숨겨진 엔딩 불가) · 공손연 마음: +2 이상 감복, -2 이하 적대(배신 반전)</p></div>`;
}
T.view = sid => {
  const s = STU[sid], U = unitById(META.unit), r = runOf(s); if (!s || !r) return;
  const d = document.createElement('div'); d.className = 'ovl'; d.onclick = e => { if (e.target === d) d.remove(); };
  d.innerHTML = `<div class="box"><div class="row"><h2 style="flex:1">${s.num}번 ${esc(s.name)} — ${esc(U.title)}</h2><button class="btn ghost sm" onclick="this.closest('.ovl').remove()">닫기</button></div>
    ${U.scenes.map((sc, i) => { const st = r.scenes[sc.id] || {}; if (!st.adopt) return ''; return `<h3>장면${i + 1} ${esc(sc.title)} — ${esc(TH(st.adopt).name)} ${st.level ? LV[st.level] ? LV[st.level].t : '⏰ 시간 초과' : ''}</h3>
      <div class="small muted">연 증거: ${(st.opened || []).length}장 ${st.elim ? '· 탈락: ' + esc(TH(st.elim).name) : ''}</div><div class="wbox">${esc(st.line || '(없음)')}</div>${st.rebut ? `<div class="small" style="margin-top:4px">↳ 재반박(${st.rebutOk ? '성공' : '실패'}, ${st.tries || 0}회): ${esc(st.rebut)}</div>` : ''}`; }).join('')}
    <h3>판결문 ${r.chief ? '(재상: ' + esc(TH(r.chief).name) + ')' : ''} ${r.fallen ? '— 폐위 회고록' : ''}</h3><div class="wbox">${esc(r.verdict.text || '(아직 없음)')}</div>
    <p class="small muted">시작 ${fmtTime(r.startedAt)} · 제출 ${fmtTime(r.verdict.submittedAt)} · 붙여넣기 ${r.verdict.paste || 0}회(${r.verdict.pasteChars || 0}자) · 작성 기록 ${(r.verdict.log || []).map(x => x.len).join('→')}</p></div>`;
  document.body.appendChild(d);
};
function verdictTabH(U, L) {
  const subs = L.filter(s => { const r = runOf(s); return r && r.verdict && nz(r.verdict.text).length; });
  return `<div class="card"><div class="row"><h2 style="flex:1;margin:0">📝 판결문 모아보기 · 하이러닝 점수</h2>
    <button class="btn sm" onclick="T.dlTxt()">💾 전체 TXT</button><button class="btn sm line" onclick="T.dlCsv()">💾 CSV(엑셀)</button><button class="btn sm ghost" onclick="T.copyAll()">📋 전체 복사</button></div>
    <p class="muted small">① 판결문을 내려받아 하이러닝에 올려 채점 → ② 아래 칸에 점수를 넣고 → ③ 🎛️ 진행에서 [📣 엔딩·점수 공개]. 하이러닝 점수는 참고용이며 최종 판단은 선생님이 합니다.</p></div>
    ${subs.length ? subs.map(s => { const r = runOf(s), sc = SCORES[s.sid] || {}, kw = kwHits(r.verdict.text, r.fallen ? allUnitKw(U) : TH(r.chief).kw);
      return `<div class="card"><div class="row"><b style="flex:1">${s.num}번 ${esc(s.name)} ${r.verdict.submittedAt ? '<span class="pill ok">제출</span>' : '<span class="pill">작성 중</span>'} ${r.fallen ? '<span class="pill bad">폐위 회고록</span>' : r.chief ? '<span class="pill main">재상 ' + esc(TH(r.chief).name) + '</span>' : ''}</b>
        <span class="small muted">${nz(r.verdict.text).length}자 · 개념어 ${kw.length}(${esc(kw.join(', '))}) · 붙여넣기 ${r.verdict.paste || 0}회</span><button class="btn sm ghost" onclick="T.copy('${s.sid}')">복사</button></div>
        <div class="wbox" style="margin-top:6px;max-height:220px;overflow:auto">${esc(r.verdict.text)}</div>
        <div class="row" style="margin-top:6px"><span class="small"><b>판결문 점수</b></span><input class="inp" style="width:90px" type="number" value="${sc.hl == null ? '' : esc(sc.hl)}" onchange="T.score('${s.sid}',this)"><input class="inp" style="flex:1" placeholder="학생에게 보일 한마디 (선택)" value="${esc(sc.memo || '')}" onchange="T.memo('${s.sid}',this)"></div></div>`; }).join('') : '<div class="card muted">아직 판결문이 없어요.</div>'}`;
}
function vRows() { const U = unitById(META.unit); return studentList().map(s => ({ s, r: runOf(s), U })).filter(x => x.r && x.r.verdict && nz(x.r.verdict.text).length); }
T.dlTxt = () => { const U = unitById(META.unit); const txt = vRows().map(({ s, r }) => `■ ${s.num}번${s.name ? ' ' + s.name : ''} (${r.fallen ? '폐위 회고록' : '재상: ' + TH(r.chief).name})\n${r.verdict.text}\n`).join('\n'); downloadText(`딜시_${META.name}_${U.title}_판결문.txt`, txt); };
T.copyAll = () => copyText(vRows().map(({ s, r }) => `■ ${s.num}번${s.name ? ' ' + s.name : ''}\n${r.verdict.text}\n`).join('\n'));
T.dlCsv = () => { const U = unitById(META.unit); const head = ['번호', '이름', '재상', '폐위', '글자수', '개념어', '붙여넣기', '제출시각', '판결문점수', '판결문'];
  const rows = vRows().map(({ s, r }) => { const sc = SCORES[s.sid] || {}; return [s.num, s.name, r.chief ? TH(r.chief).name : '', r.fallen ? 'O' : '', nz(r.verdict.text).length, kwHits(r.verdict.text, allUnitKw(U)).join(' '), r.verdict.paste || 0, fmtTime(r.verdict.submittedAt), sc.hl == null ? '' : sc.hl, r.verdict.text]; });
  downloadText(`딜시_${META.name}_${U.title}_판결문.csv`, [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv'); };

function pfH(U, L) {
  const P = +(META.pfPts || 10);
  return `<div class="card"><div class="row"><h2 style="flex:1;margin:0">🗂️ 포트폴리오 집계 — ${esc(U.title)}</h2><button class="btn sm" onclick="T.dlPf()">💾 CSV(엑셀)</button></div>
    <p class="muted small">기준 4개(제출·분량·개념어·반론)는 자동 확인입니다. 칸을 누르면 <b>선생님 판단</b>으로 바뀝니다(✓→✗→자동). 점수: 4개 ${P}점 · 2~3개 ${P / 2}점 · 제출만 ${P / 4}점 · 미제출 0점 (만점은 🎛️ 진행에서 변경)</p>
    <div class="scroll"><table class="st"><tr><th>번호</th><th>이름</th>${CRIT.map(([k, n]) => `<th>${n}</th>`).join('')}<th>충족</th><th>점수</th></tr>
    ${L.map(s => { const { a, o, f } = critFinal(s, U), n = CRIT.filter(([k]) => f[k]).length;
      return `<tr><td>${s.num}</td><td>${esc(s.name)}</td>${CRIT.map(([k]) => { const ov = o[k] === true || o[k] === false; return `<td class="toggle ${f[k] ? 'on' : 'off'} ${ov ? 'ovr' : ''}" onclick="T.conf('${s.sid}','${k}')" title="${ov ? '선생님 판단 (자동: ' + (a[k] ? '✓' : '✗') + ')' : '자동 확인'}">${f[k] ? '✓' : '✗'}${ov ? '*' : ''}</td>`; }).join('')}<td>${f.sub ? n : 0}</td><td><b>${pfScore(f)}</b></td></tr>`; }).join('')}
    </table></div><p class="muted small">* = 선생님이 직접 바꾼 칸. 분량 기준 ${JUDGE().verdictMin}자, 반론 = "그러나·하지만·반면…" 같은 말 또는 떨어뜨린 책사 이름이 있는지.</p></div>`;
}
T.dlPf = () => { const U = unitById(META.unit); const rows = studentList().map(s => { const { f } = critFinal(s, U); return [s.num, s.name, ...CRIT.map(([k]) => f[k] ? 'O' : 'X'), pfScore(f)]; });
  downloadText(`딜시_${META.name}_${U.title}_포트폴리오.csv`, [['번호', '이름', ...CRIT.map(c => c[1]), '점수'], ...rows].map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv'); };

function obsText(s, U) {
  const r = runOf(s); if (!r) return '아직 시작하지 않음';
  const parts = U.scenes.map((sc, i) => { const st = r.scenes[sc.id] || {}; if (!st.adopt) return null; return `장면${i + 1}(${sc.title}): ${TH(st.adopt).name} 채택${st.level ? '·' + (LV[st.level] ? LV[st.level].t.replace(/^\S+\s/, '') : '시간 초과') : ''}${st.rebutOk === true ? '·재반박 성공' : st.rebutOk === false ? '·재반박 실패' : ''}${st.elim ? '·' + TH(st.elim).name + ' 탈락' : ''}`; }).filter(Boolean);
  const kws = []; U.scenes.forEach(sc => { const st = r.scenes[sc.id] || {}; if (st.chk) kws.push(...st.chk.kw); }); kws.push(...kwHits((r.verdict || {}).text, allUnitKw(U)));
  const bd = Object.entries(r.bd || {}).filter(([k, v]) => v).map(([k, v]) => k + '+' + v).join(', ');
  const rallyN = U.scenes.reduce((a, sc) => { const st = r.scenes[sc.id] || {}; (st.rally || []).forEach(x => { a[0]++; if (x.ok) a[1]++; }); return a; }, [0, 0]);
  const hints = U.scenes.map((sc, i) => { const st = r.scenes[sc.id] || {}; return `장면${i + 1} 힌트 ${st.hl || 0}단계${st.keyOk ? '·열쇠 풂' : ''}${st.bet ? '·확신도 ' + st.bet : ''}${st.alarmShown ? (st.alarmOk ? '·급보 대응' : '·급보 무시') : ''}`; }).join(' / ');
  return [`경로: ${parts.join(' → ') || '-'}`, `공손연과의 공방: ${rallyN[0]}번 중 ${rallyN[1]}번 막음 · 수업 자료 활용: ${hints}`, `최종 재상: ${r.chief ? TH(r.chief).name : r.fallen ? '(폐위)' : '-'}`, `사용한 개념어: ${[...new Set(kws)].join(', ') || '-'}`, `신념 변화: ${bd || '-'}`, `판결문: ${nz((r.verdict || {}).text).length}자, 붙여넣기 ${(r.verdict || {}).paste || 0}회, 구제 카드 ${r.rescued || 0}회, 힌트 ${r.hintUsed ? '사용' : '안 씀'}`].join('\n');
}
function obsH(U, L) {
  return `<div class="card"><h2>🔎 관찰 기록 요약 — ${esc(U.title)}</h2><p class="muted small">세특을 쓰실 때 참고할 <b>근거 자료</b>입니다. 문장은 선생님이 직접 관찰한 내용으로 쓰셔야 합니다. (자동 문장 생성 기능은 일부러 넣지 않았습니다.)</p>
    <button class="btn sm line" onclick="copyText(studentList().map(s=>s.num+'번 '+(s.name||'')+'\\n'+obsText(s,unitById(META.unit))).join('\\n\\n'))">📋 전체 복사</button></div>
    ${L.map(s => `<div class="card"><div class="row"><b style="flex:1">${s.num}번 ${esc(s.name)}</b><button class="btn sm ghost" onclick="copyText(obsText(STU['${s.sid}'],unitById(META.unit)))">복사</button></div><div class="wbox small">${esc(obsText(s, U))}</div></div>`).join('') || '<div class="card muted">아직 학생이 없어요.</div>'}`;
}
function kpiH(U, L) {
  const R = L.map(s => runOf(s)).filter(Boolean), done = R.filter(r => r.verdict.submittedAt);
  const sc = []; R.forEach(r => U.scenes.forEach(s => { const st = r.scenes[s.id]; if (st && st.level) sc.push(st); }));
  const kwRate = sc.length ? Math.round(sc.filter(st => st.chk && st.chk.kw.length).length / sc.length * 100) : 0;
  const rb = sc.filter(st => st.rebutOk === true || st.rebutOk === false), rbRate = rb.length ? Math.round(rb.filter(st => st.rebutOk).length / rb.length * 100) : 0;
  const avgLen = done.length ? Math.round(done.reduce((a, r) => a + nz(r.verdict.text).length, 0) / done.length) : 0;
  const mins = done.map(r => (r.verdict.submittedAt - r.startedAt) / 60000).filter(x => x > 0 && x < 600), avgMin = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0;
  const lv = { a: 0, b: 0, c: 0, x: 0 }; sc.forEach(st => lv[st.level] = (lv[st.level] || 0) + 1);
  const endC = {}; done.forEach(r => { const e = endingOf(r, U, SCORES[Object.keys(STU).find(k => STU[k] && runOf(STU[k]) === r)] || null, !!META.reveal); endC[e.t] = (endC[e.t] || 0) + 1; });
  const dist = U.scenes.map((s, i) => { const c = {}; R.forEach(r => { const a = r.adopt[s.id]; if (a) c[a] = (c[a] || 0) + 1; }); return `<div class="small"><b>장면${i + 1}</b> ${Object.entries(c).map(([k, v]) => esc(TH(k).name) + ' ' + v).join(' · ') || '-'}</div>`; }).join('');
  const el = {}; R.forEach(r => r.elim.forEach(t => el[t] = (el[t] || 0) + 1));
  return `<div class="card"><h2>📈 시범 지표 — ${esc(U.title)}</h2><p class="muted small">재미·학습 효과·서논술 능력을 확인하기 위한 수치입니다. 수업연구대회·수업나눔 근거 자료로 쓸 수 있습니다.</p>
    <div class="kpi"><div><b>${L.length}</b>접속</div><div><b>${R.length ? Math.round(done.length / R.length * 100) : 0}%</b>완주율 (${done.length}/${R.length})</div><div><b>${avgMin}분</b>평균 소요 시간</div><div><b>${kwRate}%</b>한 줄 논증 개념어 사용</div><div><b>${rbRate}%</b>재반박 성공</div><div><b>${avgLen}자</b>평균 판결문 길이</div></div></div>
    <div class="grid2"><div class="card"><h3 style="margin-top:0">한 줄 논증 판정</h3><p>🏆 대성공 ${lv.a} · ✅ 성공 ${lv.b} · ⚠️ 흔들림 ${lv.c} · ⏰ 시간 초과 ${lv.x}</p><h3>채택 분포</h3>${dist}<h3>탈락 분포</h3><p class="small">${Object.entries(el).map(([k, v]) => esc(TH(k).name) + ' ' + v).join(' · ') || '-'}</p></div>
    <div class="card"><h3 style="margin-top:0">엔딩 분포 ${META.reveal ? '' : '<span class="muted small">(공개 전 — 숨겨진 엔딩 제외)</span>'}</h3>${Object.entries(endC).map(([k, v]) => `<div>${esc(k)}: <b>${v}</b></div>`).join('') || '-'}
    <h3>참고</h3><p class="small muted">같은 학생의 판결문 점수 변화(첫 단원 → 세 번째 단원)는 단원을 여러 개 진행한 뒤 📝 판결문·점수 CSV를 모아 비교하세요.</p></div></div>`;
}
function fbH() {
  const list = Object.entries(FB || {}).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
  return `<div class="card"><div class="row"><h2 style="flex:1;margin:0">💬 피드백 (${list.length})</h2><button class="btn sm line" onclick="T.dlFb()">💾 CSV</button></div><p class="muted small">모든 반과 시범 운영 선생님들이 보낸 의견이 모입니다.</p>
    ${list.map(([id, f]) => `<div style="border-top:1px solid var(--line);padding:8px 0"><div class="small muted">${fmtTime(f.t)} · 방 ${esc(f.room || '-')} · ${esc(f.who)} · ${esc(f.where)}</div><div class="row"><div style="flex:1">${esc(f.text)}</div><button class="btn sm ghost" onclick="if(confirm('지울까요?'))backend.remove(P_FB+'/${id}')">지우기</button></div></div>`).join('') || '<p class="muted">아직 없어요.</p>'}</div>`;
}
T.dlFb = () => { const rows = Object.values(FB || {}).map(f => [fmtTime(f.t), f.room, f.who, f.where, f.text]); downloadText('딜시_피드백.csv', [['시각', '방', '보낸 사람', '화면', '내용'], ...rows].map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv'); };

/* ---------- ⚙️ 설정 (모든 반 공통: rooms/DSCONTENT/default) ---------- */
function settingsH() {
  const subs = [['brand', '🏷️ 이름·로고'], ['th', '① 사상가·도감'], ['lesson', '📖 수업 자료'], ['judge', '③ 논술·판정 기준'], ['tn', '⑨ 긴장감'], ['unit', '단원 관리'], ['rec', '⑦ 학생 기록']];
  const b = SETSUB === 'brand' ? setBrandH() : SETSUB === 'th' ? setThH() : SETSUB === 'lesson' ? setLessonH() : SETSUB === 'judge' ? setJudgeH() : SETSUB === 'tn' ? setTnH() : SETSUB === 'unit' ? setUnitH() : setRecH();
  return `<div class="note">⚙️ 여기서 바꾼 내용은 <b>모든 반에 함께</b> 적용되고, content.js 파일보다 우선합니다.</div>
    <div class="tabs">${subs.map(([k, n]) => `<button class="tab ${SETSUB === k ? 'on' : ''}" onclick="SETSUB='${k}';render()">${n}</button>`).join('')}</div><div class="ed">${b}</div>`;
}
function setThH() {
  const U = unitById(META.unit) || UNITS[0]; const ids = Object.keys(window.THINKERS || {}); const first = (U.thinkers || []);
  const order = [...first, ...ids.filter(i => !first.includes(i))];
  return `<p class="muted small">사상가 이미지(정사각형으로 잘려 작게 저장), 이름·소개·대사, <b>자동 판정용 개념어</b>, 그리고 학생 <b>도감</b>에 나오는 인간관·핵심 주장·개념 뜻풀이·비판을 고칩니다. 교과서에 맞게 고친 뒤 저장하세요. 현대 사상가는 사진 대신 일러스트·캐릭터를 쓰세요(저작권).</p>
    ${order.map(id => { const t = TH(id), base = window.THINKERS[id]; return `<fieldset><legend>${esc(t.name)} <span class="muted small">${esc(t.school)}${first.includes(id) ? ' · 이번 단원' : ''}</span></legend>
      <div class="row" style="align-items:flex-start">${avatar(id, 88)}<div style="flex:1;min-width:240px">
        <div class="row"><label class="btn sm line" style="cursor:pointer">🖼️ 이미지 올리기<input type="file" accept="image/*" style="display:none" onchange="T.img('${id}',this)"></label>${(CONTENT.thImg || {})[id] ? `<button class="btn sm ghost" onclick="T.imgReset('${id}')">기본 그림으로</button>` : ''}</div>
        <label class="lb">이름</label><input class="inp" id="tn_${id}" value="${esc(t.name)}">
        <label class="lb">한 줄 소개</label><input class="inp" id="ti_${id}" value="${esc(t.intro)}">
        <label class="lb">대표 말</label><input class="inp" id="tq_${id}" value="${esc(t.quote || '')}">
        <label class="lb">개념어 (자동 판정용, 쉼표로 구분)</label><input class="inp" id="tk_${id}" value="${esc((t.kw || []).join(', '))}">
        <label class="lb">🧠 인간관 (도감)</label><textarea class="inp" style="min-height:60px" id="tv_${id}">${esc(t.view || '')}</textarea>
        <label class="lb">📌 핵심 주장 (도감, 한 줄에 하나)</label><textarea class="inp" style="min-height:90px" id="tc_${id}">${esc((Array.isArray(t.claim) ? t.claim : (t.claim ? [t.claim] : [])).join('\n'))}</textarea>
        <label class="lb">🔑 개념 뜻풀이 (도감·쓰기 화면, 한 줄에 "개념|뜻")</label><textarea class="inp" style="min-height:90px" id="tg_${id}">${esc(Object.entries(t.gl || {}).map(([k, v]) => k + '|' + v).join('\n'))}</textarea>
        <label class="lb">⚔️ 이런 비판도 있다 (도감)</label><textarea class="inp" style="min-height:50px" id="tx_${id}">${esc(t.crit || '')}</textarea>
        <div class="row" style="margin-top:8px"><button class="btn sm" onclick="T.saveTh('${id}')">저장</button>${(CONTENT.th || {})[id] ? `<button class="btn sm ghost" onclick="T.resetTh('${id}')">파일 기본값으로</button>` : ''}<span class="muted small">기본 개념어: ${esc((base.kw || []).join(', '))}</span></div>
      </div></div></fieldset>`; }).join('')}`;
}
T.saveTh = id => { const g = k => document.getElementById(k + '_' + id).value.trim(); const gl = {}; g('tg').split('\n').forEach(l => { const i = l.indexOf('|'); if (i > 0) gl[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  const v = { name: g('tn'), intro: g('ti'), quote: g('tq'), kw: g('tk').split(/[,，]/).map(x => x.trim()).filter(Boolean), view: g('tv'), claim: g('tc').split('\n').map(x => x.trim()).filter(Boolean), gl, crit: g('tx') };
  backend.set(P_CONTENT + '/th/' + id, v).then(() => toast('💾 저장했어요.')); };
T.resetTh = id => { if (confirm('이 사상가를 content.js 기본값으로 되돌릴까요?')) backend.remove(P_CONTENT + '/th/' + id); };
T.img = async (id, inp) => { const f = inp.files && inp.files[0]; if (!f) return; try { const d = await compressImage(f, 256, 60000); IMG[id] = d; await backend.set(P_CONTENT + '/img/' + id, { d }); await backend.set(P_CONTENT + '/thImg/' + id, true); toast('🖼️ 올렸어요.'); } catch (e) { toast('이미지를 읽을 수 없어요.'); } };
T.imgReset = id => { delete IMG[id]; backend.remove(P_CONTENT + '/img/' + id); backend.remove(P_CONTENT + '/thImg/' + id); };
/* ---------- 📖 수업 자료 (장면별 수업 노트 · 힌트 3단계 · 학습지 열쇠) ---------- */
function setLessonH() {
  return `<p class="muted small">장면마다 학생이 쓰는 화면에 <b>📖 수업 노트</b>, <b>💡 힌트 3단계</b>, <b>🔑 학습지 열쇠</b>가 나옵니다. 비워 두면 그 기능은 보이지 않습니다. 교과서 본문을 그대로 넣지 말고 선생님이 요약한 내용을 넣어 주세요(방 코드를 아는 사람은 읽을 수 있음).</p>
  ${UNITS.filter(u => u.ready).map(u => u.scenes.map((sc, i) => { const L = lessonOf(u, sc), key = u.id + '_' + sc.id, img = (CONTENT.limgOn || {})[key];
    return `<fieldset><legend>${esc(u.title)} · 장면${i + 1} ${esc(sc.title)}</legend>
    <label class="lb">📖 수업 노트 (개념 정리·판서 요약)</label><textarea id="ln_${key}" class="inp" style="min-height:110px">${esc(L.note || '')}</textarea>
    <div class="row" style="margin-top:6px"><label class="btn sm line" style="cursor:pointer">🖼️ 학습지·판서 사진 올리기<input type="file" accept="image/*" style="display:none" onchange="T.limg('${key}',this)"></label>${img ? `<span class="pill ok">사진 있음</span><button class="btn sm ghost" onclick="T.limgReset('${key}')">사진 지우기</button>` : ''}</div>
    <label class="lb">📎 자료 링크 (한글·PDF 학습지는 구글 드라이브 링크로)</label><input id="ll_${key}" class="inp" value="${esc(L.link || '')}" placeholder="https://drive.google.com/...">
    <label class="lb">💡 1단계 — 방향 질문 (공짜)</label><input id="lh1_${key}" class="inp" value="${esc((L.hints || [])[0] || '')}">
    <label class="lb">💡 2단계 — 개념 짚기 (민심 -2, 열쇠를 풀면 공짜)</label><input id="lh2_${key}" class="inp" value="${esc((L.hints || [])[1] || '')}">
    <label class="lb">💡 3단계 — 문장 틀 (힌트 카드, 숨겨진 엔딩 불가, 그대로 베끼면 인정 안 됨. 빈칸은 ____)</label><input id="lh3_${key}" class="inp" value="${esc((L.hints || [])[2] || '')}">
    <label class="lb">🔑 학습지 열쇠 문제 (맞히면 힌트 카드 +1, 2단계 공짜)</label><input id="lkq_${key}" class="inp" value="${esc((L.key || {}).q || '')}" placeholder="예: 학습지 2번 빈칸 — 일정한 생업을 뜻하는 말은?">
    <label class="lb">정답 (쉼표로 여러 개)</label><input id="lka_${key}" class="inp" value="${esc(((L.key || {}).a || []).join(', '))}">
    <div class="row" style="margin-top:8px"><button class="btn sm" onclick="T.saveLesson('${u.id}','${sc.id}')">저장</button><button class="btn sm ghost" onclick="if(confirm('이 장면 수업 자료를 파일 기본값으로 되돌릴까요?'))backend.remove(P_CONTENT+'/lesson/${u.id}/${sc.id}')">파일 기본값으로</button></div></fieldset>`; }).join('')).join('')}`;
}
T.saveLesson = (uid, sid) => { const k = uid + '_' + sid, g = p => document.getElementById(p + '_' + k).value.trim();
  backend.set(P_CONTENT + '/lesson/' + uid + '/' + sid, { note: g('ln'), link: g('ll'), hints: [g('lh1'), g('lh2'), g('lh3')], key: { q: g('lkq'), a: g('lka').split(/[,，]/).map(x => x.trim()).filter(Boolean) } }).then(() => toast('💾 저장했어요.')); };
T.limg = async (key, inp) => { const f = inp.files && inp.files[0]; if (!f) return; try { const d = await compressWide(f); LIMG[key] = d; await backend.set(P_IMG + '/limg/' + key, { d }); backend.remove(P_CONTENT + '/limg/' + key); await backend.set(P_CONTENT + '/limgOn/' + key, true); toast('🖼️ 올렸어요.'); } catch (e) { toast('이미지를 읽을 수 없어요.'); } };
T.limgReset = key => { delete LIMG[key]; backend.remove(P_IMG + '/limg/' + key); backend.remove(P_CONTENT + '/limg/' + key); backend.remove(P_CONTENT + '/limgOn/' + key); };

function setJudgeH() {
  const J = JUDGE(), F = [['lineMin', '한 줄 논증 최소 글자'], ['lineKw', '한 줄 논증 개념어 수'], ['rebutMin', '재반박 최소 글자'], ['verdictMin', '판결문 최소 글자'], ['verdictKw', '판결문 개념어 수']];
  return `<fieldset><legend>숫자 기준</legend><div class="vals">${F.map(([k, n]) => `<label>${n}<input type="number" id="j_${k}" value="${J[k]}"></label>`).join('')}</div></fieldset>
    <fieldset><legend>근거 표지어 (한 줄 논증·재반박 판정)</legend><input class="inp" id="j_markers" value="${esc(J.markers.join(', '))}"></fieldset>
    <fieldset><legend>반론 표지어 (포트폴리오 '반론' 판정)</legend><input class="inp" id="j_counter" value="${esc(J.counter.join(', '))}"></fieldset>
    <div class="row"><button class="btn" onclick="T.saveJudge()">저장</button><button class="btn ghost" onclick="if(confirm('기본값으로?'))backend.remove(P_CONTENT+'/judge')">기본값으로</button></div>
    <p class="muted small">한 줄 논증 판정: ① 글자 수 ② 채택한 사상가의 개념어 ③ 근거 표지어 — 3개 모두 = 🏆 대성공, 2개 = ✅ 성공, 1개 이하 = ⚠️ 흔들림. 1글자 개념어(인·예·법·도)는 낱말로 따로 쓰였을 때만 인정합니다.</p>`;
}
T.saveJudge = () => { const n = k => +document.getElementById('j_' + k).value || 0, l = k => document.getElementById('j_' + k).value.split(/[,，]/).map(x => x.trim()).filter(Boolean);
  backend.set(P_CONTENT + '/judge', { lineMin: n('lineMin'), lineKw: n('lineKw'), rebutMin: n('rebutMin'), verdictMin: n('verdictMin'), verdictKw: n('verdictKw'), markers: l('markers'), counter: l('counter') }).then(() => toast('💾 저장했어요.')); };
function setTnH() {
  const F = [['timer', '제한 시간(초, 0=끔)'], ['peek', '증거 카드 수'], ['ev', '돌발 사건 확률(0~1)'], ['evBad', '나쁜 사건 비율(0~1)'], ['loss', '손실 배수'], ['rebut', '재반박 기회'], ['rescue', '구제 카드'], ['hint', '힌트 카드']];
  return ['mild', 'normal', 'spicy'].map(k => { const t = TN(k); return `<fieldset><legend>${esc(t.n)}</legend><div class="vals">${F.map(([f, n]) => `<label>${n}<input type="number" step="any" id="tn_${k}_${f}" value="${t[f]}"></label>`).join('')}
      <label>반 분포 공개<select id="tn_${k}_dist"><option value="1" ${t.dist ? 'selected' : ''}>공개</option><option value="0" ${t.dist ? '' : 'selected'}>숨김</option></select></label>
      <label>민심 0이면 폐위<select id="tn_${k}_fall"><option value="1" ${t.fall ? 'selected' : ''}>폐위</option><option value="0" ${t.fall ? '' : 'selected'}>계속</option></select></label></div>
      <div class="row" style="margin-top:6px"><button class="btn sm" onclick="T.saveTn('${k}')">저장</button><button class="btn sm ghost" onclick="backend.remove(P_CONTENT+'/tn/${k}')">기본값으로</button></div></fieldset>`; }).join('');
}
T.saveTn = k => { const g = f => document.getElementById('tn_' + k + '_' + f).value; const v = { n: TN(k).n };
  ['timer', 'peek', 'ev', 'evBad', 'loss', 'rebut', 'rescue', 'hint'].forEach(f => v[f] = +g(f) || 0); v.dist = g('dist') === '1'; v.fall = g('fall') === '1';
  backend.set(P_CONTENT + '/tn/' + k, v).then(() => toast('💾 저장했어요.')); };
T.bg = async (key, inp) => { const f = inp.files && inp.files[0]; if (!f) return; try { const d = await compressWide(f); BG[key] = d; await backend.set(P_IMG + '/bg/' + key, { d }); backend.remove(P_CONTENT + '/bg/' + key); await backend.set(P_CONTENT + '/bgImg/' + key, true); toast('🖼️ 배경을 올렸어요.'); } catch (e) { toast('이미지를 읽을 수 없어요.'); } };
T.bgReset = key => { delete BG[key]; backend.remove(P_IMG + '/bg/' + key); backend.remove(P_CONTENT + '/bg/' + key); backend.remove(P_CONTENT + '/bgImg/' + key); };
T.saveStd = id => backend.set(P_CONTENT + '/std/' + id, document.getElementById('std_' + id).value.trim() || null).then(() => toast('💾 저장했어요.'));
/* 📚 교사 첫 화면 교과서 표지 (교사 화면에만 보임, rooms/DSIMG/default/cover) */
const COVERS = [['ethics', '윤리와 사상'], ['modern', '현대사회와 윤리']], COVER = {}, COVERREQ = {};
function coverImg(k) { if ((CONTENT.coverOn || {})[k] && !COVER[k] && !COVERREQ[k]) { COVERREQ[k] = 1; getImg('cover', k).then(v => { if (v && v.d) { COVER[k] = v.d; render(); } }).catch(() => { }); } return COVER[k] || ''; }
const COVER_FILE = { ethics: 'img/cover_ethics.jpg', modern: 'img/cover_modern.jpg' };   // 기본 표지(사이트 파일) — 설정에서 올리면 그 그림이 우선
function coversH() {
  const on = COVERS;
  return `<div class="covers">${on.map(([k, n]) => { const d = ((CONTENT.coverOn || {})[k] && coverImg(k)) || COVER_FILE[k]; return `<div class="cov">${d ? `<img src="${d}" alt="${esc(n)}">` : '<div class="muted small" style="padding:40px 0">불러오는 중…</div>'}<b>${esc(n)}</b></div>`; }).join('')}</div>`;
}
T.cover = async (k, inp) => { const f = inp.files && inp.files[0]; if (!f) return; try { const d = await compressWide(f); COVER[k] = d; await backend.set(P_IMG + '/cover/' + k, { d }); await backend.set(P_CONTENT + '/coverOn/' + k, true); toast('📚 표지를 올렸어요.'); } catch (e) { toast('그림을 읽지 못했어요.'); } };
T.coverReset = k => { delete COVER[k]; backend.remove(P_IMG + '/cover/' + k); backend.remove(P_CONTENT + '/coverOn/' + k); };
/* 🏷️ 이름·로고 */
function setBrandH() {
  const b = BR();
  return `<fieldset><legend>🏷️ 화면 위쪽 이름·로고</legend>
    <div class="row" style="align-items:center;gap:12px"><div style="font-size:20px;font-weight:800">${brandLogo()}${brandTitle()} <small class="muted" style="font-size:13px">${brandSub()}</small></div><span class="muted small">← 지금 모습</span></div>
    <label class="lb">이름 (예: 도디쌤의 딜시 수업)</label><input id="br_title" class="inp" value="${esc(b.title || '')}" placeholder="${esc(TITLE)}">
    <label class="lb">작은 설명 (예: Dilemma Simulation · 딜레마 시뮬레이션 수업)</label><input id="br_sub" class="inp" value="${esc(b.sub || '')}" placeholder="${esc(SUBTITLE)}">
    <label class="lb">로고 그림 (도디쌤 이미지 등, 정사각형으로 잘라 작게 저장)</label>
    <div class="row"><label class="btn sm line" style="cursor:pointer">🖼️ 그림 올리기<input type="file" accept="image/*" style="display:none" onchange="T.brandLogo(this)"></label>${b.logo ? `<button class="btn sm ghost" onclick="T.brandLogoReset()">그림 지우기</button>` : ''}</div>
    <label class="row" style="margin-top:10px;gap:6px;align-items:center"><input type="checkbox" id="br_all" ${b.all ? 'checked' : ''}> 학생 화면에도 같은 이름·로고 보이기</label>
    <div class="row" style="margin-top:10px"><button class="btn sm" onclick="T.saveBrand()">저장</button><button class="btn sm ghost" onclick="T.brandReset()">처음 이름(딜시)으로</button></div>
    <p class="muted small">저장하면 모든 반 교사 화면에 바로 적용됩니다. 체크하면 학생 화면 위쪽에도 보입니다.</p></fieldset>
  <fieldset><legend>📚 교사 첫 화면 교과서 표지</legend>
    <div class="row">${COVERS.map(([k, n]) => { const on = (CONTENT.coverOn || {})[k], d = (on && coverImg(k)) || COVER_FILE[k]; return `<div style="border:1px solid var(--line);border-radius:10px;padding:8px;min-width:180px;text-align:center"><b class="small">${esc(n)}</b><div style="margin:6px 0">${d ? `<img src="${d}" style="max-height:120px;border-radius:6px">` : '<span class="muted small">없음</span>'}</div><label class="btn sm line" style="cursor:pointer">🖼️ 올리기<input type="file" accept="image/*" style="display:none" onchange="T.cover('${k}',this)"></label>${on ? ` <button class="btn sm ghost" onclick="T.coverReset('${k}')">지우기</button>` : ''}</div>`; }).join('')}</div>
    <p class="muted small">교사 비밀번호 화면과 반 목록 화면에 보입니다(학생 화면에는 안 나옴). 기본 표지가 들어 있고, 다른 그림을 올리면 그 그림으로 바뀝니다. [지우기]를 누르면 기본 표지로 돌아갑니다.</p></fieldset>`;
}
T.saveBrand = () => { const g = id => document.getElementById(id); const v = Object.assign({}, BR(), { title: g('br_title').value.trim(), sub: g('br_sub').value.trim(), all: g('br_all').checked });
  backend.set(P_CONTENT + '/brand', v).then(() => { toast('💾 저장했어요.'); setDocTitle(); }); };
T.brandLogo = async inp => { const f = inp.files && inp.files[0]; if (!f) return; try { const d = await compressSquare(f, 160); await backend.set(P_CONTENT + '/brand', Object.assign({}, BR(), { logo: d })); toast('🖼️ 로고를 올렸어요.'); } catch (e) { toast('그림을 읽지 못했어요. 다른 그림으로 해 보세요.'); } };
T.brandLogoReset = () => { const v = Object.assign({}, BR()); delete v.logo; backend.set(P_CONTENT + '/brand', v); };
T.brandReset = () => { if (confirm('이름·설명·로고를 처음(딜시)으로 되돌릴까요?')) backend.remove(P_CONTENT + '/brand'); };
function compressSquare(file, size) {   // 로고: 정사각형 가운데 자르기, 약 15KB
  return new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(im.width, im.height), cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, size, size); c.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, size, size); ok(cv.toDataURL('image/jpeg', 0.85)); }; im.onerror = no; im.src = fr.result; }; fr.onerror = no; fr.readAsDataURL(file); });
}
function compressWide(file) {   // 배경: 가로 900px 이하, 약 120KB 이하
  return new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const w = Math.min(900, im.width), h = Math.round(im.height * w / im.width), cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(im, 0, 0, w, h); let q = .8, d = cv.toDataURL('image/jpeg', q); while (d.length * .75 > 120000 && q > .3) { q -= .1; d = cv.toDataURL('image/jpeg', q); } ok(d); }; im.onerror = no; im.src = fr.result; }; fr.onerror = no; fr.readAsDataURL(file); });
}
function setUnitBgH() {
  return UNITS.filter(u => u.ready).map(u => `<fieldset><legend>${esc(u.title)} — 장면 배경 · 성취기준</legend>
    <div class="row">${[['open', '시작 화면']].concat(u.scenes.map((s, i) => [s.id, '장면' + (i + 1) + ' ' + s.title])).map(([sid, n]) => { const key = u.id + '_' + sid, on = (CONTENT.bgImg || {})[key];
      return `<div style="border:1px solid var(--line);border-radius:10px;padding:8px;min-width:180px"><b class="small">${esc(n)}</b><br><label class="btn sm line" style="cursor:pointer;margin-top:4px">🖼️ 올리기<input type="file" accept="image/*" style="display:none" onchange="T.bg('${key}',this)"></label>${on ? ` <button class="btn sm ghost" onclick="T.bgReset('${key}')">기본 그림으로</button> <span class="pill ok">올림</span>` : ''}</div>`; }).join('')}</div>
    <p class="muted small">Canva 등으로 만든 가로형 그림(16:9 권장)을 올리면 코드 그림 대신 보입니다. 자동으로 작게 줄여 저장합니다.</p>
    <label class="lb">성취기준 (한 줄에 하나, "번호|내용")</label><textarea id="std_${u.id}" class="inp" style="min-height:90px">${esc(((CONTENT.std || {})[u.id]) || (u.standards || []).map(x => x.code + '|' + x.text).join('\n'))}</textarea>
    <div class="row" style="margin-top:6px"><button class="btn sm" onclick="T.saveStd('${u.id}')">저장</button><button class="btn sm ghost" onclick="backend.remove(P_CONTENT+'/std/${u.id}')">파일 기본값으로</button></div></fieldset>`).join('');
}
function setUnitH() {
  return setUnitBgH() + `<p class="muted small">끈 단원은 단원 고르기에서 보이지 않습니다. 사상가 대사·개념어를 교과서와 대조한 뒤 [검수 완료]를 눌러 주세요(검수 전에는 '미검수' 표시).</p>
    <div class="scroll"><table class="st"><tr><th>과목</th><th>단원</th><th>장르</th><th>상태</th><th>사용</th><th>검수</th></tr>
    ${UNITS.map(u => `<tr><td>${esc(u.subject)}</td><td class="l"><b>${esc(u.title)}</b>${u.sensitive ? ' ⚠️' : ''}<div class="small muted">${esc(u.area)} · ${esc(u.logline)}</div></td><td>${esc(u.genre)}</td><td>${u.ready ? '<span class="pill ok">완성</span>' : '<span class="pill">준비 중</span>'}</td>
      <td><button class="btn sm ${unitOn(u.id) ? 'ok' : 'ghost'}" onclick="backend.set(P_CONTENT+'/off/${u.id}',${unitOn(u.id) ? 'true' : 'null'})">${unitOn(u.id) ? '켜짐' : '꺼짐'}</button></td>
      <td>${u.ready ? `<button class="btn sm ${reviewed(u.id) ? 'jade' : 'line'}" onclick="backend.set(P_CONTENT+'/reviewed/${u.id}',${reviewed(u.id) ? 'null' : 'true'})">${reviewed(u.id) ? '✓ 검수 완료' : '검수 완료로'}</button>` : '-'}</td></tr>`).join('')}</table></div>`;
}
function setRecH() {
  return `<fieldset><legend>이 반 학생 기록 삭제 (개인정보)</legend><p class="small">시범 운영·학기가 끝나면 학생 기록(글 포함)을 지워 주세요. 지우기 전에 📝 판결문·점수와 🗂️ 포트폴리오에서 CSV를 내려받아 두세요.</p>
    ${ROOM && ROOM !== '__SET__' ? `<button class="btn bad" onclick="T.wipe()">🗑️ ${esc(META.name || ROOM)} 학생 기록 모두 삭제</button>` : '<p class="muted">반을 연 상태에서 쓸 수 있어요.</p>'}</fieldset>
    <fieldset><legend>이름 받기</legend><p class="small">🎛️ 진행 탭의 [이름도 받기]에서 반마다 정합니다. 시범 운영은 번호만 받는 것을 권합니다.</p></fieldset>`;
}
T.wipe = () => { if (!confirm('이 반 학생 기록과 점수를 모두 지웁니다. 되돌릴 수 없어요. 계속할까요?')) return; if (prompt('확인을 위해 방 코드(' + ROOM + ')를 입력하세요.') !== ROOM) return toast('코드가 달라 취소했어요.');
  backend.remove(roomPath(ROOM) + '/students'); backend.remove(roomPath(ROOM) + '/score'); toast('🗑️ 지웠어요.'); };

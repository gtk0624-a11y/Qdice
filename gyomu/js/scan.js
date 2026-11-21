/* 종이에 손으로 쓴 메모·수첩 사진 → 일정/할 일/업무 인식 (Claude 비전, 본인 키 필요). 확인 창에서 고친 뒤 추가. */
let SC = null;
const scImg = f => new Promise((res, rej) => { const im = new Image(), u = URL.createObjectURL(f); im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.85).split(',')[1]); }; im.onerror = () => rej(new Error('사진을 읽지 못했습니다')); im.src = u; });
const SC_TOOL = [{ name: 'save_items', description: '사진 속 손글씨에서 읽은 항목들', input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD, 모르면 빈 문자열' }, time: { type: 'string', description: 'HH:MM, 없으면 빈 문자열' }, period: { type: 'integer', description: '몇 교시인지(1~9), 없으면 0' }, kind: { type: 'string', enum: ['event', 'todo', 'work'], description: 'event=일정(행사·회의·약속), todo=마감 있는 할 일, work=내 업무' } }, required: ['title', 'kind'] } } }, required: ['items'] } }];
async function scanRun(file) {
  const dlg = scDlg(); dlg.innerHTML = '<p class="mu">✍️ 손글씨를 읽는 중입니다… (몇 초 걸립니다)</p>';
  let items;
  if (window.TF_DEMO) { await new Promise(r => setTimeout(r, 900)); const t = new Date(); const d = n => { const x = new Date(t); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }; items = [{ title: '교직원 회의', date: d(2), time: '16:00', kind: 'event' }, { title: '도박예방교육', date: d(3), time: '', kind: 'event', period: 7 }, { title: '학년말 평가 자료 제출', date: d(7), time: '', kind: 'todo' }, { title: '학생 인권 실태조사 점검', date: '', time: '', kind: 'work' }]; dlg.dataset.demo = '1'; }
  else {
    if (!agKey()) { dlg.innerHTML = '<h3>📷 손글씨 사진 인식</h3><p>이 기능은 <b>본인 Claude 키</b>가 있어야 켜집니다. 오른쪽 아래 꿈송이를 눌러 열린 창 맨 위 <b>🔑 키 입력칸</b>에 붙여넣으면 바로 쓸 수 있고, 키는 이 기기에만 저장됩니다. 비용은 사진 한 장에 1원 안팎입니다.</p><p class="mu">키가 없어도 날짜 화면에서 직접 입력하는 것은 그대로 됩니다.</p><button class="btn" id="scx">닫기</button>'; return; }
    try {
      const b64 = await scImg(file);
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': agKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 1500, tools: SC_TOOL, tool_choice: { type: 'tool', name: 'save_items' }, system: `교사가 종이에 손으로 쓴 메모·수첩·포스트잇 사진입니다. 글씨를 읽어 일정(event)·할 일(todo)·업무(work)로 나눠 save_items로 반환하세요. 오늘은 ${today()}입니다. "내일·다음 주 화" 등은 오늘 기준으로 YYYY-MM-DD 계산, 연도가 없으면 가까운 미래로. 날짜가 없으면 빈 문자열. 읽기 어려운 글자는 추측해 쓰되 지어내지 마세요. 학생 실명이 보이면 제목에서 빼세요.`, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: '이 종이에서 일정·할 일·업무를 뽑아 주세요.' }] }] }) });
      if (!r.ok) throw new Error(r.status === 401 ? '키가 올바르지 않습니다' : r.status === 400 || r.status === 402 ? '잔액(크레딧)이 부족할 수 있습니다' : '응답 오류 ' + r.status);
      const j = await r.json(); items = ((j.content || []).find(c => c.type === 'tool_use') || { input: {} }).input.items || [];
    } catch (e) { dlg.innerHTML = `<p>인식하지 못했습니다(${esc(e.message)}). 사진을 더 밝고 가깝게 다시 찍어 보세요.</p><button class="btn" id="scx">닫기</button>`; return; }
  }
  SC = items.map(x => ({ ...x, on: true })); scShow();
}
function scDlg() { let d = document.getElementById('scdlg'); if (!d) { d = document.createElement('dialog'); d.id = 'scdlg'; d.className = 'dlg daypg'; document.body.appendChild(d); d.addEventListener('close', () => d.remove()); d.addEventListener('click', e => { if (e.target.id === 'scx') d.close(); if (e.target.id === 'scok') scApply(d); }); d.addEventListener('input', e => { const i = e.target.dataset.sc; if (i == null) return; const it = SC[+i], f = e.target.dataset.f; if (f === 'on') it.on = e.target.checked; else it[f] = e.target.value; }); } if (!d.open) d.showModal(); return d; }
function scShow() {
  const d = scDlg();
  if (!SC.length) { d.innerHTML = '<p>읽어 낸 항목이 없습니다. 글씨가 크게 나오도록 다시 찍어 보세요.</p><button class="btn" id="scx">닫기</button>'; return; }
  d.innerHTML = `<h3>📷 이렇게 읽었어요</h3><p class="mu">틀린 곳은 고친 뒤 추가하세요. 체크를 끄면 빠집니다.${d.dataset.demo ? ' (체험판 예시 결과)' : ''}</p>` + SC.map((x, i) => `<div class="scr"><input type="checkbox" data-sc="${i}" data-f="on" ${x.on ? 'checked' : ''} aria-label="추가"><select data-sc="${i}" data-f="kind" data-cus="kind" data-work="1">${cusKindOpts(true, x.kind)}</select><select data-sc="${i}" data-f="period" aria-label="교시"><option value="">교시 없음</option>${[1,2,3,4,5,6,7].map(n => `<option value="${n}" ${+x.period === n ? 'selected' : ''}>${n}교시</option>`).join('')}</select><input type="date" data-sc="${i}" data-f="date" value="${esc(x.date || '')}"><input type="time" data-sc="${i}" data-f="time" value="${esc(x.time || '')}"><input data-sc="${i}" data-f="title" value="${esc(x.title)}"></div>`).join('') + '<div class="tools"><button class="btn pri" id="scok">✅ 선택한 것 추가</button><button class="btn" id="scx">취소</button></div>';
}
function scApply(d) {
  let n = 0; SC.filter(x => x.on && x.title.trim()).forEach(x => {
    const mk = cusMk(x.kind, x.title, x.period); if (x.time) mk.title = x.time + ' ' + mk.title;
    S.items.push({ id: uid(), date: x.date || today(), done: false, ...mk }); n++;
  });
  commit(); d.close(); toast(n + '건을 캘린더에 반영했습니다.');
}
document.addEventListener('change', e => { if (e.target.id !== 'scUp' && e.target.id !== 'scCam') return; const f = e.target.files[0]; e.target.value = ''; if (f) scanRun(f); }, true);
const scPickHtml = '<label class="btn pri file">📸 바로 찍기<input type="file" id="scCam" accept="image/*" capture="environment" hidden></label><label class="btn file">🖼 앨범에서 고르기<input type="file" id="scUp" accept="image/*" hidden></label>';
function scBtn() {
  if (document.getElementById('scfab')) return; const b = document.createElement('button'); b.id = 'scfab'; b.className = 'scfab'; b.type = 'button'; b.title = '손글씨 사진으로 일정·업무 추가'; b.innerHTML = '📷<span>손글씨 추가</span>'; b.addEventListener('click', () => { const d = document.createElement('dialog'); d.className = 'dlg cusm'; d.innerHTML = '<h3>📷 손글씨 사진으로 추가</h3><p class="mu">종이 수첩·포스트잇을 찍거나, 이미 찍어 둔 사진을 고르세요.</p><div class="tools">' + scPickHtml + '</div><div class="btns"><button class="btn" id="scpx">닫기</button></div>'; document.body.appendChild(d); d.addEventListener('change', () => setTimeout(() => d.close(), 50)); d.addEventListener('click', e => { if (e.target.id === 'scpx') d.close(); }); d.addEventListener('close', () => setTimeout(() => d.remove(), 100)); d.showModal(); }); document.body.appendChild(b);
}
const _r4 = TF.render; TF.render = function () { const v = _r4.apply(this, arguments); scBtn(); return v; };

/* 공문 사진 → 오늘 「공문」 처리 기록으로 등록 (본인 Claude 키 필요, 체험판은 예시) */
const DOC_TOOL = [{ name: 'save_doc', description: '사진 속 공문 내용', input_schema: { type: 'object', properties: { title: { type: 'string', description: '공문 제목(문서번호가 보이면 함께)' }, sender: { type: 'string', description: '발신 부서·기관' }, due: { type: 'string', description: '회신·제출·신청 기한 YYYY-MM-DD, 없으면 빈 문자열' }, event_date: { type: 'string', description: '행사·연수·회의 일시 YYYY-MM-DD, 없으면 빈 문자열' }, action: { type: 'string', description: '내가 해야 할 일 한 줄(제출·회신·참석·전달 등)' }, kind: { type: 'string', enum: ['회신·제출', '연수·교육', '행사', '전달·참고', '기타'] } }, required: ['title', 'kind'] } }];
let DOCP = null;
async function docPhotoRun(file) {
  const dlg = scDlg(); dlg.innerHTML = '<p class="mu">📄 공문을 읽는 중입니다… (몇 초 걸립니다)</p>'; let r;
  if (window.TF_DEMO) { await new Promise(x => setTimeout(x, 800)); const t = new Date(); t.setDate(t.getDate() + 5); r = { title: '2027학년도 학교폭력 예방교육 계획 제출(생활인권부-1234)', sender: '경기도교육청', due: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`, event_date: '', action: '학교 계획서 작성 후 에듀파인으로 제출', kind: '회신·제출' }; dlg.dataset.demo = '1'; }
  else {
    if (!agKey()) { dlg.innerHTML = '<h3>📄 공문 사진 읽기</h3><p>이 기능은 <b>본인 Claude 키</b>가 있어야 켜집니다. 오른쪽 아래 꿈송이를 눌러 열린 창 맨 위 <b>🔑 키 입력칸</b>에 붙여넣으세요. 키 없이 쓰려면 아래 [직접 적기]를 누르세요.</p><div class="tools"><button class="btn pri" id="docMan">직접 적기</button><button class="btn" id="scx">닫기</button></div>'; return; }
    try {
      const b64 = await scImg(file);
      const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': agKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 1200, tools: DOC_TOOL, tool_choice: { type: 'tool', name: 'save_doc' }, system: `학교에 온 공문(또는 그 화면·출력물)을 찍은 사진입니다. 제목, 발신, 회신·제출 기한, 행사·연수 일시, 내가 해야 할 일을 save_doc으로 반환하세요. 오늘은 ${today()}입니다. 연도가 없으면 가까운 미래로 YYYY-MM-DD 계산. 없는 정보는 빈 문자열이고 지어내지 마세요. 학생·학부모 실명, 연락처, 주민번호는 절대 옮기지 마세요.`, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: '이 공문의 핵심을 뽑아 주세요.' }] }] }) });
      if (!res.ok) throw new Error(res.status === 401 ? '키가 올바르지 않습니다' : res.status === 400 || res.status === 402 ? '잔액(크레딧)이 부족할 수 있습니다' : '응답 오류 ' + res.status);
      const j = await res.json(); r = ((j.content || []).find(c => c.type === 'tool_use') || { input: null }).input; if (!r) throw new Error('내용을 읽지 못했습니다');
    } catch (e) { dlg.innerHTML = `<p>읽지 못했습니다(${esc(e.message)}). 공문이 화면에 크게, 밝게 나오도록 다시 찍어 보세요.</p><div class="tools"><button class="btn pri" id="docMan">직접 적기</button><button class="btn" id="scx">닫기</button></div>`; DOCP = { file }; return; }
  }
  DOCP = { ...r, file }; docPhotoShow();
}
function docPhotoShow() {
  const d = scDlg(), r = DOCP || {}, due = r.due || '';
  d.innerHTML = `<h3>📄 이렇게 읽었어요</h3><p class="mu">틀린 곳은 고친 뒤 [공문 처리에 올리기]를 누르세요.${d.dataset.demo ? ' (체험판 예시 결과)' : ''}</p>
  <label class="dpl">공문 제목<input id="dpT" value="${esc(r.title || '')}"></label><label class="dpl">발신<input id="dpS" value="${esc(r.sender || '')}"></label><label class="dpl">내가 할 일<input id="dpA" value="${esc(r.action || '')}"></label>
  <label class="dpl">회신·제출 기한<input id="dpD" type="date" value="${esc(due)}"></label><label class="dpl">행사·연수 일시<input id="dpE" type="date" value="${esc(r.event_date || '')}"></label>
  <label class="dpk"><input type="checkbox" id="dpC" checked> 기한·일시를 캘린더에 넣기</label><label class="dpk"><input type="checkbox" id="dpK" ${r.file ? 'checked' : ''}> 공문 사진을 자료 아카이브에 보관</label>
  <div class="tools"><button class="btn pri" id="dpOk">공문 처리에 올리기</button><button class="btn" id="scx">닫기</button></div>`;
}
async function docPhotoApply() {
  const v = id => (document.getElementById(id) || {}).value || '', t = v('dpT').trim(); if (!t) { toast('공문 제목을 적어 주세요.'); return; }
  const note = [v('dpS') && '발신 ' + v('dpS').trim(), v('dpA') && '할 일: ' + v('dpA').trim(), v('dpD') && '기한 ' + v('dpD'), v('dpE') && '일시 ' + v('dpE')].filter(Boolean).join(' · ');
  const td = today(); S.docLog = S.docLog || []; S.docLog.push({ id: uid(), date: td, title: t, note, done: false }); docAdj(td, 'recv', 1);
  if ((document.getElementById('dpC') || {}).checked) {
    if (v('dpD')) S.items.push({ id: uid(), date: v('dpD'), done: false, ...cusMk('todo', '[공문] ' + t + ' 제출·회신') });
    if (v('dpE')) S.items.push({ id: uid(), date: v('dpE'), done: false, ...cusMk('event', '[공문] ' + t) });
  }
  const f = DOCP && DOCP.file;
  if ((document.getElementById('dpK') || {}).checked && f && typeof keepFile === 'function') { try { const id = uid(); LIB.push({ id, name: '공문사진_' + td + '_' + t.slice(0, 20) + '.jpg', kind: '공문', text: t + ' ' + note, added: td, from: 'today', size: f.size || 0 }); await keepFile(id, f); await saveLib(); } catch (e) { } }
  OPEN.add('r3'); DOCP = null; const d = document.getElementById('scdlg'); if (d) d.close(); commit(); toast('오늘 공문 처리 목록에 올렸습니다.');
}
document.addEventListener('change', e => { if (e.target.id !== 'docCam' && e.target.id !== 'docUp') return; const f = e.target.files[0]; e.target.value = ''; if (f) docPhotoRun(f); }, true);
document.addEventListener('click', e => { const t = e.target; if (!t || !t.id) return; if (t.id === 'dpOk') docPhotoApply(); else if (t.id === 'docMan') { const d = document.getElementById('scdlg'); if (d) d.close(); A.dlAdd(); } }, true);
{ const _dlb = docLogBody; docLogBody = function () { return _dlb.apply(this, arguments) + '<div class="tools dpt"><label class="btn sm pri file">📸 공문 사진 찍기<input type="file" id="docCam" accept="image/*" capture="environment" hidden></label><label class="btn sm file">🖼 사진·캡처 고르기<input type="file" id="docUp" accept="image/*" hidden></label><span class="mu">찍으면 제목·기한·할 일을 읽어 위 목록에 올려 줍니다</span></div>'; }; }

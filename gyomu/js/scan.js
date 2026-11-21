/* 종이에 손으로 쓴 메모·수첩 사진 → 일정/할 일/업무 인식 (Claude 비전, 본인 키 필요). 확인 창에서 고친 뒤 추가. */
let SC = null;
const scImg = f => new Promise((res, rej) => { const im = new Image(), u = URL.createObjectURL(f); im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.85).split(',')[1]); }; im.onerror = () => rej(new Error('사진을 읽지 못했습니다')); im.src = u; });
const SC_TOOL = [{ name: 'save_items', description: '사진 속 손글씨에서 읽은 항목들', input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD, 모르면 빈 문자열' }, time: { type: 'string', description: 'HH:MM, 없으면 빈 문자열' }, kind: { type: 'string', enum: ['event', 'todo', 'work'], description: 'event=일정(행사·회의·약속), todo=마감 있는 할 일, work=내 업무' } }, required: ['title', 'kind'] } } }, required: ['items'] } }];
async function scanRun(file) {
  const dlg = scDlg(); dlg.innerHTML = '<p class="mu">✍️ 손글씨를 읽는 중입니다… (몇 초 걸립니다)</p>';
  let items;
  if (window.TF_DEMO) { await new Promise(r => setTimeout(r, 900)); const t = new Date(); const d = n => { const x = new Date(t); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }; items = [{ title: '교직원 회의', date: d(2), time: '16:00', kind: 'event' }, { title: '학년말 평가 자료 제출', date: d(7), time: '', kind: 'todo' }, { title: '학생 인권 실태조사 점검', date: '', time: '', kind: 'work' }]; dlg.dataset.demo = '1'; }
  else {
    if (!agKey()) { dlg.innerHTML = '<h3>📷 손글씨 사진 인식</h3><p>이 기능은 <b>본인 Claude 키</b>가 있어야 켜집니다. 설정 → AI 키에 넣으면 바로 쓸 수 있고, 키는 이 기기에만 저장됩니다.</p><p class="mu">키가 없어도 날짜 화면에서 직접 입력하는 것은 그대로 됩니다.</p><button class="btn" id="scx">닫기</button>'; return; }
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
  d.innerHTML = `<h3>📷 이렇게 읽었어요</h3><p class="mu">틀린 곳은 고친 뒤 추가하세요. 체크를 끄면 빠집니다.${d.dataset.demo ? ' (체험판 예시 결과)' : ''}</p>` + SC.map((x, i) => `<div class="scr"><input type="checkbox" data-sc="${i}" data-f="on" ${x.on ? 'checked' : ''} aria-label="추가"><select data-sc="${i}" data-f="kind"><option value="event"${x.kind === 'event' ? ' selected' : ''}>일정</option><option value="todo"${x.kind === 'todo' ? ' selected' : ''}>할 일</option><option value="work"${x.kind === 'work' ? ' selected' : ''}>업무</option></select><input type="date" data-sc="${i}" data-f="date" value="${esc(x.date || '')}"><input type="time" data-sc="${i}" data-f="time" value="${esc(x.time || '')}"><input data-sc="${i}" data-f="title" value="${esc(x.title)}"></div>`).join('') + '<div class="tools"><button class="btn pri" id="scok">✅ 선택한 것 추가</button><button class="btn" id="scx">취소</button></div>';
}
function scApply(d) {
  let n = 0; SC.filter(x => x.on && x.title.trim()).forEach(x => {
    let t = x.title.trim(); if (x.time) t = x.time + ' ' + t; if (x.kind === 'work') t = '[업무] ' + t;
    S.items.push({ id: uid(), title: t, date: x.date || today(), cat: x.kind === 'event' ? 'event' : 'todo', done: false }); n++;
  });
  commit(); d.close(); toast(n + '건을 캘린더에 반영했습니다.');
}
document.addEventListener('change', e => { if (e.target.id !== 'scUp') return; const f = e.target.files[0]; e.target.value = ''; if (f) scanRun(f); }, true);
function scBtn() {
  if (document.getElementById('scfab')) return; const l = document.createElement('label'); l.id = 'scfab'; l.className = 'scfab'; l.title = '손글씨 사진으로 일정·업무 추가'; l.innerHTML = '📷<span>손글씨 추가</span><input type="file" id="scUp" accept="image/*" capture="environment" hidden>'; document.body.appendChild(l);
}
const _r4 = TF.render; TF.render = function () { const v = _r4.apply(this, arguments); scBtn(); return v; };

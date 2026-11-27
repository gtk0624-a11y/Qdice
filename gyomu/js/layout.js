/* 화면 구조 편집(v164): 오늘 화면 칸(브리핑·캘린더·이번 주 기한·업무들·곡선중 카드)의 순서·숨김·이름·처음 펼침, 위쪽 메뉴 이름·시작 화면,
   캘린더 시작 요일·기본 보기, 일정 구분 목록(이름·순서·삭제·추가). 저장 위치: S.profile.lay (기기 연동에 함께 올라갑니다). */
const LY_BLOCKS = [['dw', '🗄 서랍(자주 가는 사이트)', true], ['brief', '☀️ 오늘 브리핑 카드', false], ['cal', '📅 캘린더', true], ['soon', '⏰ 이번 주 기한', true], ['work', '🗂 업무들', true], ['sb', '🏫 곡선중 카드(학교 소개·바로가기)', true]];
const LY_MENU = [['today', '오늘'], ['cal', '캘린더'], ['work', '내 업무'], ['hub', '총괄'], ['wlog', '업무일지'], ['class', '수업 및 시간표'], ['eval', '평가'], ['budget', '예산'], ['notes', '기록'], ['pages', '페이지'], ['lib', '자료·연락'], ['files', '자료 아카이브'], ['rule', '규정줍줍'], ['yp', '연간 교육·훈련'], ['set', '설정']];
const lyD = () => ((S.profile = S.profile || {}).lay = S.profile.lay || {});
const lyName = (k, d) => (lyD().name || {})[k] || d;
const lyDef = (k, d) => { const o = lyD().open || {}; return o[k] === undefined ? (d === undefined ? true : d) : !!o[k]; };
function lyOrder(P) {
  const L = lyD(), all = LY_BLOCKS.map(b => b[0]), ord = [...(L.blocks || []).includes('dw') ? [] : ['dw'], ...(L.blocks || []).filter(k => all.includes(k)), ...all.filter(k => k !== 'dw' && !(L.blocks || []).includes(k))], hide = L.hide || { sb: true };
  return ord.filter(k => !hide[k] && P[k]).map(k => {
    let h = P[k]; const nm = (L.name || {})[k];
    if (nm && (k === 'soon' || k === 'sb')) h = h.replace(/(<summary[^>]*>)([^<]*)/, (m, a) => a + esc(nm) + ' ');
    return h;
  }).join('');
}
/* 위쪽 메뉴 이름 바꾸기 */
(function () {
  const _nav = nav; nav = function () { let h = _nav.apply(this, arguments); const nm = lyD().nav || {}; Object.keys(nm).forEach(k => { if (nm[k]) h = h.replace(new RegExp('(<a href="#/' + k + '"[^>]*>)[^<]*(</a>)'), (m, a, b) => a + esc(nm[k]) + b); }); return h; };
  /* 시작 화면(그날 처음 열 때만) */
  setTimeout(() => { try { const st = lyD().start; if (st && st !== 'today' && !sessionStorage.getItem('tf.started') && (!location.hash || location.hash === '#/' || location.hash === '#/today')) location.hash = '#/' + st; sessionStorage.setItem('tf.started', '1'); } catch (e) { } }, 0);
})();

function lyDlg() {
  const L = lyD(), all = LY_BLOCKS.map(b => b[0]), ord = [...(L.blocks || []).filter(k => all.includes(k)), ...all.filter(k => !(L.blocks || []).includes(k))], hide = L.hide || {}, nm = L.name || {}, kinds = (typeof ncSeed === 'function' && (ncSeed(), cusKinds())) || [];
  let d = document.getElementById('lydlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'lydlg'; d.className = 'dlg tfdlg lydlg'; document.body.appendChild(d); d.addEventListener('click', lyClick); d.addEventListener('change', lyChange); }
  const blockRows = ord.map((k, i) => { const b = LY_BLOCKS.find(x => x[0] === k); return `<div class="lyr ${hide[k] ? 'off' : ''}"><span class="lyn">${esc(b[1])}</span><span class="lyb"><button class="btn sm" data-ly="up" data-k="${k}" ${i ? '' : 'disabled'} aria-label="위로">▲</button><button class="btn sm" data-ly="dn" data-k="${k}" ${i < ord.length - 1 ? '' : 'disabled'} aria-label="아래로">▼</button><button class="btn sm" data-ly="vis" data-k="${k}">${hide[k] ? '숨김 → 보이기' : '👁 보임'}</button></span>${k === 'brief' ? '' : `<input name="nm_${k}" value="${esc(nm[k] || '')}" placeholder="이름 바꾸기(예: ${esc(b[1].replace(/^\S+\s/, ''))})" aria-label="이름">`}${b[2] && k !== 'sb' && k !== 'soon' || k === 'soon' ? `<label class="lyo"><input type="checkbox" name="op_${k}" ${lyDef(k, k !== 'work') ? 'checked' : ''}> 처음엔 펼침</label>` : ''}</div>`; }).join('');
  const menuRows = LY_MENU.map(([k, v]) => `<label class="lym"><span>${esc(v)}</span><input name="mn_${k}" value="${esc((L.nav || {})[k] || '')}" placeholder="${esc(v)}"></label>`).join('');
  const kindRows = kinds.map((k, i) => `<div class="lyr"><input name="kn_${i}" value="${esc(k.n)}" aria-label="구분 이름"><span class="lyb"><button class="btn sm" data-ly="kup" data-i="${i}" ${i ? '' : 'disabled'}>▲</button><button class="btn sm" data-ly="kdn" data-i="${i}" ${i < kinds.length - 1 ? '' : 'disabled'}>▼</button><button class="btn sm" data-ly="kdel" data-i="${i}">삭제</button></span></div>`).join('');
  d.innerHTML = `<h3>🧩 화면 구조 편집</h3><p class="mu">바꾸는 즉시 저장되고 화면에 반영됩니다. 내 기기 연동을 켜 두셨다면 다른 기기에도 따라갑니다.</p>
  <h4>① 오늘 화면의 칸</h4><p class="mu" style="font-size:12px">▲▼로 순서를, 보임/숨김과 이름, 처음 열었을 때 펼쳐 둘지를 정합니다.</p>${blockRows}
  <h4>② 위쪽 메뉴 이름 · 시작 화면</h4><p class="mu" style="font-size:12px">이름을 비우면 원래 이름으로 돌아갑니다. 메뉴 순서·숨김은 위쪽 「☰ 메뉴 고르기」에서 바꿉니다.</p>
  <label class="dpl">앱을 열면 처음 보이는 화면<select name="start">${LY_MENU.filter(x => x[0] !== 'set').map(([k, v]) => `<option value="${k}" ${(L.start || 'today') === k ? 'selected' : ''}>${esc((L.nav || {})[k] || v)}</option>`).join('')}</select></label><div class="lymg">${menuRows}</div>
  <h4>③ 캘린더</h4><div class="tfrow"><label class="dpl">한 주의 시작<select name="ws"><option value="1" ${L.ws === 0 ? '' : 'selected'}>월요일</option><option value="0" ${L.ws === 0 ? 'selected' : ''}>일요일</option></select></label><label class="dpl">처음 보이는 모양<select name="cv"><option value="m" ${(L.v || 'm') === 'm' ? 'selected' : ''}>월간</option><option value="w" ${L.v === 'w' ? 'selected' : ''}>주간</option><option value="up" ${L.v === 'up' ? 'selected' : ''}>다가오는 내 업무</option></select></label></div>
  <h4>④ 일정 구분 목록</h4><p class="mu" style="font-size:12px">이름을 고치면 이미 넣은 일정의 구분도 같이 바뀝니다. 삭제해도 기존 일정의 구분 글자는 남습니다.</p>${kindRows}<div class="lyr"><input name="kn_new" placeholder="새 구분 이름 (예: 시험감독, 회의)"><span class="lyb"><button class="btn sm pri" data-ly="kadd">＋ 추가</button></span></div>
  <div class="btns"><button class="btn" data-ly="reset">처음 모양으로 되돌리기</button><button class="btn pri" data-ly="close">닫기</button></div>`;
  if (!d.open) d.showModal();
}
function lyChange(e) {
  const t = e.target, n = t.name || '', L = lyD(); if (!n) return; let redo = false;
  if (/^nm_/.test(n)) { (L.name = L.name || {})[n.slice(3)] = t.value.trim(); if (!t.value.trim()) delete L.name[n.slice(3)]; }
  else if (/^op_/.test(n)) { (L.open = L.open || {})[n.slice(3)] = t.checked; UI[{ cal: 'nccal', soon: 'ncsoon', work: 'ncwork' }[n.slice(3)]] = undefined; }
  else if (/^mn_/.test(n)) { (L.nav = L.nav || {})[n.slice(3)] = t.value.trim(); if (!t.value.trim()) delete L.nav[n.slice(3)]; redo = true; }
  else if (n === 'start') L.start = t.value;
  else if (n === 'ws') { L.ws = +t.value === 0 ? 0 : 1; UI.wk = undefined; }
  else if (n === 'cv') { L.v = t.value; UI.calv = undefined; }
  else if (/^kn_\d+$/.test(n)) { const i = +n.slice(3), ks = cusKinds(), nv = t.value.trim(); if (!ks[i]) return; if (!nv) { t.value = ks[i].n; return; } const old = ks[i].n; if (nv !== old) { S.items.forEach(x => { if (x.tag === old) x.tag = nv; }); ks[i].n = nv; } }
  else return;
  commit(); if (redo) lyDlg();
}
function lyClick(e) {
  const b = e.target.closest('[data-ly]'); if (!b) { if (e.target.id === 'lydlg') e.target.close(); return; }
  const L = lyD(), k = b.dataset.k, a = b.dataset.ly, all = LY_BLOCKS.map(x => x[0]), ord = [...(L.blocks || []).filter(x => all.includes(x)), ...all.filter(x => !(L.blocks || []).includes(x))];
  const mv = (arr, i, dlt) => { const j = i + dlt; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
  if (a === 'close') return document.getElementById('lydlg').close();
  if (a === 'up' || a === 'dn') { mv(ord, ord.indexOf(k), a === 'up' ? -1 : 1); L.blocks = ord; }
  else if (a === 'vis') { L.hide = L.hide || {}; L.hide[k] = !L.hide[k]; if (!L.hide[k]) delete L.hide[k]; }
  else if (a === 'kup' || a === 'kdn') mv(cusKinds(), +b.dataset.i, a === 'kup' ? -1 : 1);
  else if (a === 'kdel') { const ks = cusKinds(), i = +b.dataset.i; if (ks[i]) ks.splice(i, 1); }
  else if (a === 'kadd') { const v = (document.querySelector('#lydlg [name=kn_new]').value || '').trim(); if (!v) return toast('새 구분 이름을 적어 주세요.'); ncSeed(); if (cusKinds().some(x => x.n === v)) return toast('이미 있는 이름입니다.'); cusKinds().push({ n: v, b: 'event' }); }
  else if (a === 'reset') return sure('오늘 화면 칸·메뉴 이름·시작 화면·캘린더 옵션을 처음 모양으로 되돌릴까요? (구분 목록은 그대로 둡니다)', () => { S.profile.lay = {}; UI.nccal = UI.ncsoon = UI.ncwork = UI.calv = UI.wk = undefined; commit(); lyDlg(); toast('처음 모양으로 되돌렸습니다.'); });
  commit(); lyDlg();
}
Object.assign(A, { lyOpen: lyDlg });

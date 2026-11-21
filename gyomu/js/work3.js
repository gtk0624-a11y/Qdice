/* v77: 업무일지 · 카드 문서·유형·일정·팀·한 장 요약 · 카드 ✕ 즉시 삭제 · 캘린더 보강 · 올린 파일 모두 아카이브 · PDF 앱 안에서 열기 · 화면 자료 상자 접기 */

/* ---------- 공통: 되돌리기 바 ---------- */
function undoBar(msg, fn) {
  let b = document.getElementById('undobar2'); if (b) b.remove();
  b = document.createElement('div'); b.id = 'undobar2'; b.className = 'undobar'; b.innerHTML = `<span>${esc(msg)}</span><button type="button">↩ 되돌리기</button>`; document.body.appendChild(b);
  const t = setTimeout(() => b.remove(), 8000); b.querySelector('button').onclick = () => { clearTimeout(t); b.remove(); fn(); };
}

/* ---------- 올린 파일은 전부 자료 아카이브에 ---------- */
let _ingDepth = 0;
const _ing0 = ingestFiles; ingestFiles = async function () { _ingDepth++; try { return await _ing0.apply(this, arguments); } finally { _ingDepth--; } };
const _rf3 = readFile;
readFile = async function (f) {
  const t = await _rf3.apply(this, arguments);
  try {
    if (!_ingDepth && f && f.name && !/^image\//.test(f.type || '') && !LIB.some(d => d.name === f.name && (d.size || 0) === (f.size || 0))) {
      const id = uid(), page = typeof archPage === 'function' ? archPage() : 'lib';
      LIB.push({ id, name: f.name, kind: typeof guessKind === 'function' ? guessKind(f.name, page) : '기타', text: String(t || ''), added: today(), from: page, size: f.size || 0, readErr: '' });
      if (typeof keepFile === 'function') await keepFile(id, f); await saveLib(); toast('「' + f.name + '」을 자료 아카이브에도 보관했습니다.');
    }
  } catch (e) { }
  return t;
};
/* 화면마다 붙는 「이 화면의 자료」 상자는 접어 둔다 */
const _fb3 = fileBox;
fileBox = function (page, kind) { const n = LIB.filter(d => (d.from || 'lib') === page).length; return `<details class="pgfdet"><summary>📎 이 화면의 자료 ${n}개</summary>${_fb3(page, kind)}</details>`; };

/* ---------- PDF·그림은 앱 안에서 열기 (닫아도 파탈은 그대로) ---------- */
const _dOpen3 = A.docOpen;
A.docOpen = async function (el) {
  const doc = docOf(el.dataset.id); if (!doc) return;
  if (/\.pdf$/i.test(doc.name)) {
    const f = await idb.get('file:' + doc.id); if (!f) return _dOpen3.apply(this, arguments);
    const d = bigDlg(doc.name, '<div class="pdfv"><p class="mu">PDF 여는 중…</p></div>'), box = d.querySelector('.pdfv');
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      pdfjsLib.GlobalWorkerOptions.workerSrc = window.__pdfLocal ? new URL('lib/pdf.worker.min.js', document.baseURI).href : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise; box.innerHTML = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 60); i++) { if (!d.isConnected) break; const pg = await pdf.getPage(i), w = Math.min(box.clientWidth || 600, 900), v0 = pg.getViewport({ scale: 1 }), sc = w / v0.width, v = pg.getViewport({ scale: sc * (window.devicePixelRatio || 1) }), c = document.createElement('canvas'); c.width = v.width; c.height = v.height; c.style.width = '100%'; box.appendChild(c); await pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise; }
      if (pdf.numPages > 60) box.insertAdjacentHTML('beforeend', '<p class="mu">앞 60쪽까지만 보여 드립니다.</p>');
    } catch (e) { box.innerHTML = '<p class="mu">PDF를 열지 못했습니다: ' + esc(e.message || '') + '</p>'; }
    return;
  }
  if (/\.(png|jpe?g|gif|webp)$/i.test(doc.name)) { const f = await idb.get('file:' + doc.id); if (f) { const u = URL.createObjectURL(f), d = bigDlg(doc.name, `<img src="${u}" style="max-width:100%" alt="">`); d.addEventListener('close', () => URL.revokeObjectURL(u)); return; } }
  return _dOpen3.apply(this, arguments);
};

/* ---------- 업무 유형 · 필요한 문서 ---------- */
const WK_TYPES = {
  '행사': { steps: ['계획 수립', '계획서 품의', '공문 시행', '안내·신청 받기', '준비물·장소', '실시', '결과보고', '정산'], docs: ['계획서', '공문', '결과보고서'] },
  '연수': { steps: ['계획 수립', '강사 섭외', '계획서 품의', '안내 공문', '실시', '이수 처리', '결과보고'], docs: ['계획서', '안내문', '결과보고서'] },
  '조사': { steps: ['대상·기간 정리', '안내', '자료 수합', '집계', '제출'], docs: ['공문', '제출자료'] },
  '예산': { steps: ['계획', '품의', '구매·계약', '검수', '정산'], docs: ['품의서', '증빙'] },
  '일반': { steps: [], docs: [] }
};
const WK_DOCK = ['계획서', '공문', '품의서', '안내문', '결과보고서', '제출자료', '증빙', '기타'];
const wkDocs = c => (c.docs = c.docs || []);
const wkNeed = c => ((WK_TYPES[c.type] || WK_TYPES['일반']).docs || []);
const wkMiss = c => wkNeed(c).filter(k => !wkDocs(c).some(d => d.kind === k));
function wkApplyType(c, t) { c.type = t === '일반' ? '' : t; const T = WK_TYPES[t]; if (T && T.steps.length && !(c.steps || []).length) c.steps = T.steps.map(x => ({ t: x, d: false })); }
const bdOfLink = label => { const m = /^예산 (.+?) › (.+)$/.exec(label || ''); if (!m) return null; for (const p of S.budget) if (p.name === m[1]) for (const l of p.lines) if (l.item === m[2]) return { p, l, left: (+l.alloc || 0) - spentOf(l) }; return null; };

const _wk3Card = wkCard;
wkCard = function (c) {
  let h = _wk3Card(c); wkN(c); const need = wkNeed(c), miss = wkMiss(c), dl = c.due ? dd(c.due) : null;
  const ev = c.evt && S.items.find(i => i.id === c.evt), bl = (c.links || []).map(l => bdOfLink(l.label)).filter(Boolean);
  const top = `<div class="wkx2"><select data-wktype="${c.id}" aria-label="업무 유형">${['일반', '행사', '연수', '조사', '예산'].map(t => `<option ${((c.type || '일반') === t) ? 'selected' : ''}>${t}</option>`).join('')}</select>${need.length ? `<span class="chp ${miss.length && dl !== null && dl <= 7 ? 'hot' : ''}">📎 문서 ${need.length - miss.length}/${need.length}${miss.length ? ' · 빠진 것: ' + miss.join(', ') : ' ✔'}</span>` : ''}${ev ? `<span class="chp k-일정">📅 실시 ${md(ev.date)}</span>` : ''}${bl.map(b => `<span class="chp">💰 ${esc(b.l.item)} 잔액 ${won(b.left)}원</span>`).join('')}</div>`;
  const docs = `<div class="wkdocs">${wkDocs(c).map((d, i) => `<span class="chp"><button class="lnk" data-act="docOpen" data-id="${d.id}">📄 ${esc(d.name)}</button> <small class="mu">${esc(d.kind)}</small> <button class="x" data-act="wkDocDel" data-id="${c.id}" data-i="${i}" aria-label="문서 떼기">✕</button></span>`).join('')}<span class="wkup"><select data-wkdk="${c.id}" aria-label="문서 종류">${WK_DOCK.map(k => `<option ${miss[0] === k ? 'selected' : ''}>${k}</option>`).join('')}</select><label class="btn sm file">📎 문서 올리기<input type="file" data-wkdoc="${c.id}" multiple hidden></label></span></div>`;
  const team = c.team ? `<div class="wkteam">👥 ${esc(c.team).replace(/\n/g, ' · ')}</div>` : '';
  h = h.replace('<div class="wkm">', top + '<div class="wkm">').replace('<div class="wkh">', `<div class="wkh"><button class="wkxq" data-act="wkQuickDel" data-id="${c.id}" aria-label="카드 지우기" title="바로 지우기">✕</button>`);
  h = h.replace('<textarea data-wkmemo', docs + team + '<textarea data-wkmemo');
  h = h.replace('<button class="btn sm" data-act="wkEdit"', `<button class="btn sm" data-act="wkEvt" data-id="${c.id}">📅 일정 잡기</button><button class="btn sm" data-act="wkTeam" data-id="${c.id}">👥 함께하는 사람</button><button class="btn sm" data-act="wkOne" data-id="${c.id}">📄 한 장 요약</button><button class="btn sm" data-act="wkEdit"`);
  return h;
};
/* 카드·해마다 업무·부서 탭: ✕로 바로 지우기(되돌리기 바) */
const _wk3View = workView;
workView = function () {
  let h = _wk3View.apply(this, arguments);
  h = h.replace(/(<button class="cmtab[^"]*" data-act="wkTabSet" data-k="(d:[^"]*)">[^<]*<\/button>)/g, '$1<button class="tabx" data-act="wkDeptDel" data-k="$2" aria-label="이 부서 카드 모두 지우기">✕</button>');
  h = h.replace(/<button class="btn sm" data-act="wkTplDel" data-id="([^"]*)">삭제<\/button>/g, '<button class="btn sm" data-act="wkTplDel" data-id="$1">✕ 지우기</button>');
  return h;
};
Object.assign(A, {
  wkQuickDel(el) { const W = wkD(), c = W.cards.find(x => x.id === el.dataset.id); if (!c) return; const i = W.cards.indexOf(c); W.cards.splice(i, 1); W.trash.unshift(c); W.trash = W.trash.slice(0, 400); commit(); undoBar(`「${c.title}」 카드를 지웠습니다`, () => { const w = wkD(); w.trash = w.trash.filter(x => x.id !== c.id); w.cards.splice(Math.min(i, w.cards.length), 0, c); commit(); }); },
  wkDeptDel(el) { const name = String(el.dataset.k || '').slice(2), W = wkD(), L = W.cards.filter(c => !c.me && (c.dept || '기타') === name); if (!L.length) return; W.cards = W.cards.filter(c => !L.includes(c)); W.trash = L.concat(W.trash).slice(0, 400); UI.wkTab = 'me'; commit(); undoBar(`「${name}」 카드 ${L.length}장을 지웠습니다`, () => { const w = wkD(); w.trash = w.trash.filter(x => !L.includes(x)); w.cards = w.cards.concat(L); commit(); }); },
  wkTplDel(el) { const w = wkD(), T = wkTpl(), t = T.find(x => x.id === el.dataset.id); if (!t) return; w.tpl = T.filter(x => x !== t); commit(); undoBar(`「${t.title}」 해마다 업무를 지웠습니다`, () => { wkD().tpl.push(t); commit(); }); },
  wkDocDel(el) { const c = wkById(el.dataset.id); if (c) { wkDocs(c).splice(+el.dataset.i, 1); commit(); } },
  wkEvt(el) { const c = wkById(el.dataset.id); if (!c) return; const cur = c.evt && S.items.find(i => i.id === c.evt); ask('실시일을 캘린더에 올리기', [{ k: 'd', label: '실시(행사)일', type: 'date', val: (cur && cur.date) || c.due || '', req: 1 }, { k: 't', label: '캘린더에 보일 이름', val: (cur && cur.title) || c.title + ' 실시', req: 1 }], o => { if (cur) { cur.date = o.d; cur.title = o.t.trim(); } else { const it = { id: uid(), title: o.t.trim(), date: o.d, cat: 'event', done: false, wk: c.id }; S.items.push(it); c.evt = it.id; } c.sd = today(); commit(); toast('캘린더에 올렸습니다.'); }, '올리기'); },
  wkTeam(el) { const c = wkById(el.dataset.id); if (!c) return; ask('함께하는 사람', [{ k: 't', label: '한 줄에 한 명: 이름 · 역할 · 연락처 (행정실·업체 포함)', type: 'textarea', rows: 5, val: c.team || '' }], o => { c.team = (o.t || '').trim(); commit(); }, '저장'); },
  wkOne(el) {
    const c = wkById(el.dataset.id); if (!c) return; wkN(c); const ev = c.evt && S.items.find(i => i.id === c.evt), miss = wkMiss(c);
    const html = `<html><meta charset="utf-8"><body style="font-family:'맑은 고딕',sans-serif;line-height:1.6"><h2>${esc(c.title)}</h2><p>유형 ${esc(c.type || '일반')} · 부서 ${esc(c.dept || '')} · 담당 ${esc(c.me ? wkMe() : c.who || '')} · 기한 ${c.due || '미정'}${ev ? ' · 실시 ' + ev.date : ''} · 진행 ${WK_ST[c.stage]}</p>
<h3>할 일</h3>${(c.steps || []).length ? `<ul>${c.steps.map(s => `<li>${s.d ? '✔' : '□'} ${esc(s.t)}</li>`).join('')}</ul>` : '<p>없음</p>'}
<h3>문서</h3>${wkDocs(c).length ? `<ul>${wkDocs(c).map(d => `<li>[${esc(d.kind)}] ${esc(d.name)}</li>`).join('')}</ul>` : '<p>올린 문서 없음</p>'}${miss.length ? `<p>⚠ 아직 없는 문서: ${miss.join(', ')}</p>` : ''}
${c.team ? `<h3>함께하는 사람</h3><p>${esc(c.team).replace(/\n/g, '<br>')}</p>` : ''}${(c.links || []).length ? `<h3>관련 기록</h3><p>${c.links.map(l => esc(l.label)).join('<br>')}</p>` : ''}${c.memo ? `<h3>메모</h3><p>${esc(c.memo).replace(/\n/g, '<br>')}</p>` : ''}${(c.log || []).length ? `<h3>일지</h3>${c.log.map(l => `<div>${l.d} ${esc(l.t)}</div>`).join('')}` : ''}<p style="color:#888">업무파탈 · ${today()}</p></body></html>`;
    download(`업무_${c.title.slice(0, 20)}_${today()}.doc`, html, 'application/msword'); toast('한 장 요약(.doc)을 내려받았습니다.');
  },
  wkAdd() { ask('업무 카드 추가', [{ k: 'title', label: '업무 이름 (분장표에 적힌 그대로)', req: 1 }, { k: 'type', label: '업무 유형 (고르면 단계·필요한 문서가 자동으로 들어갑니다)', type: 'select', opts: ['일반', '행사', '연수', '조사', '예산'], val: '일반' }, { k: 'dept', label: '부서·영역' }, { k: 'who', label: '담당자 (내 업무면 비워 두세요)' }, { k: 'due', label: '기한(선택)', type: 'date' }], o => { const c = wkN({ id: uid(), title: o.title.trim(), dept: (o.dept || '').trim(), who: (o.who || '').trim(), me: !(o.who || '').trim() || (o.who || '').trim() === wkMe(), memo: '', due: o.due || '', done: false, steps: [], src: '직접' }); wkApplyType(c, o.type); wkD().cards.push(c); commit(); }, '추가'); }
});
document.addEventListener('change', async e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.wktype) { const c = wkById(t.dataset.wktype); if (c) { wkApplyType(c, t.value); c.sd = today(); commit(); } return; }
  if (t.dataset.wkdoc) {
    const c = wkById(t.dataset.wkdoc); if (!c || !t.files.length) return; const k = (document.querySelector(`[data-wkdk="${c.id}"]`) || {}).value || '기타', files = [...t.files]; t.value = '';
    const add = await ingestFiles(files, { from: 'work', kind: k === '기타' ? undefined : k, noAsk: true }); (add || []).forEach(d => wkDocs(c).push({ id: d.id, name: d.name, kind: k })); c.sd = today(); commit(); toast('카드에 문서를 붙였습니다. (자료 아카이브에도 보관됩니다)');
  }
});
/* 유형을 고른 템플릿도 유지 */
{ const _f = wkFromTpl; wkFromTpl = function (t) { const c = _f.apply(this, arguments); if (t.type) wkApplyType(c, t.type); return c; }; }

/* ---------- 캘린더: 종류 거르기 · 일정 몰림 경고 · 반복 일정 날짜별 완료 · 그 날 업무 카드 ---------- */
const _ae3 = allEvents;
allEvents = function () { const e = _ae3.apply(this, arguments), R = S.repDone || {}; e.forEach(x => { if (x.rep && x.id && R[x.id]) x.done = !!R[x.id][x.date]; }); return e; };
const _tog3 = A.tog;
A.tog = function (el) {
  const it = S.items.find(i => i.id === el.dataset.id);
  if (it && it.rep) { const d = /#\/cal/.test(location.hash) ? (UI.day || today()) : today(); S.repDone = S.repDone || {}; const r = S.repDone[it.id] = S.repDone[it.id] || {}; r[d] = !r[d]; commit(); return; }
  return _tog3.apply(this, arguments);
};
const _cv3 = calView;
calView = function () {
  const hide = UI.calHide || [], all = allEvents(), kinds = [...new Set(all.map(e => e.kind || '일정'))];
  let h;
  if (hide.length) { const _a = allEvents; allEvents = function () { return _a.apply(this, arguments).filter(e => !hide.includes(e.kind || '일정')); }; try { h = _cv3.apply(this, arguments); } finally { allEvents = _a; } } else h = _cv3.apply(this, arguments);
  const chips = `<div class="clg2 calkind">${kinds.map(k => `<button class="chip ${hide.includes(k) ? '' : 'on'}" data-act="calKind" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>`;
  const i = h.indexOf('<div class="calw">'); if (i >= 0) h = h.slice(0, i) + chips + h.slice(i);
  const by = {}; all.filter(e => !hide.includes(e.kind || '일정') && !/학사/.test(e.kind || '')).forEach(e => (by[e.date] = by[e.date] || []).push(e));
  Object.keys(by).forEach(d => { if (by[d].length >= 3) h = h.replace(`data-act="calDay" data-d="${d}"><span class="n">`, `data-act="calDay" data-d="${d}"><span class="n">⚠ `); });
  const day = UI.day || today(), n = (by[day] || []).length;
  if (n >= 3) h = h.replace(/(<h3 class="h3">[^<]*<\/h3>)/, `$1<p class="hot">⚠ 이 날은 일정·기한이 ${n}건 몰려 있습니다. 하나를 옮길 수 있는지 보세요.</p>`);
  const cards = wkD().cards.filter(c => c.me && !c.done && c.due === day);
  if (cards.length && /calw/.test(h)) h += `<h4 class="dlh">이 날 기한인 업무 카드</h4>${cards.map(c => `<div class="td"><span class="tl">${esc(c.title)}</span> <span class="mu">${esc(c.dept || '')} ${WK_ST[wkN(c).stage]}</span> <a class="btn sm" href="#/work">카드 ▶</a></div>`).join('')}`;
  return h;
};
A.calKind = el => { const k = el.dataset.k, h = UI.calHide = UI.calHide || []; const i = h.indexOf(k); if (i >= 0) h.splice(i, 1); else h.push(k); render(); };

/* ---------- 업무일지 ---------- */
const WL_CATS = ['업무', '수업', '학생지도', '회의', '공문', '성찰·감상', '기타'];
const wlD = () => (S.wlog = S.wlog || []);
const wlDay = d => { S.wlogDay = S.wlogDay || {}; return (S.wlogDay[d] = S.wlogDay[d] || {}); };
const wlRange = () => { const r = UI.wlR || 'week', t = today(); if (r === 'all') return ['0000-00-00', '9999-99-99']; if (r === 'month') return [t.slice(0, 7) + '-01', t.slice(0, 7) + '-31']; const x = wkStartOf(t), a = ymd(x); x.setDate(x.getDate() + 6); return [a, ymd(x)]; };
function wlAuto(d) {
  const o = []; S.items.filter(i => i.cat === 'todo' && i.done && i.date === d).forEach(i => o.push('✔ 할 일 완료: ' + i.title));
  wkD().cards.forEach(c => { wkN(c); if (c.done && c.sd === d) o.push('✔ 업무 완료: ' + c.title); (c.log || []).filter(l => l.d === d && !l.wl).forEach(l => o.push(`📒 ${c.title}: ${l.t}`)); });
  return o;
}
function wlogView() {
  const [a, b] = wlRange(), r = UI.wlR || 'week', cat = UI.wlC || '', E = wlD().filter(x => x.d >= a && x.d <= b && (!cat || x.cat === cat)), days = new Set(E.map(x => x.d));
  if (!cat) { for (let k = 0; k < 62; k++) { const x = new Date(today() + 'T00:00:00'); x.setDate(x.getDate() - k); const d = ymd(x); if (d >= a && d <= b && wlAuto(d).length) days.add(d); } }
  const D = [...days].sort().reverse(), open = wkD().cards.filter(c => !c.done), ty = new Date(today() + 'T00:00:00').getFullYear();
  const past = wlD().filter(x => x.d.slice(5) === today().slice(5) && +x.d.slice(0, 4) < ty).slice(0, 3);
  const mins = E.reduce((s, x) => s + (+x.m || 0), 0), byC = {}; E.forEach(x => byC[x.cat] = (byC[x.cat] || 0) + 1);
  return `<div class="bh"><h2>업무일지</h2><span class="mu">하루 한 줄씩 적으면 그날 끝낸 할 일·완료한 업무·카드 일지가 자동으로 같이 모입니다. 월말에 업무일지 문서로 뽑습니다.</span></div>
  <form class="wlf" data-wlform><input type="date" name="d" value="${today()}" aria-label="날짜"><select name="cat" aria-label="분류">${WL_CATS.map(c => `<option>${c}</option>`).join('')}</select><input name="t" placeholder="오늘 한 일 한 줄 (예: 폰프리 운영계획 초안 작성)" required aria-label="내용"><input name="m" type="number" min="0" inputmode="numeric" placeholder="분(선택)" aria-label="걸린 시간(분)"><select name="card" aria-label="관련 업무 카드"><option value="">관련 카드 없음</option>${open.map(c => `<option value="${c.id}">${esc(c.title.slice(0, 24))}</option>`).join('')}</select><button class="btn pri">기록</button></form>
  <div class="tools"><button class="chip ${r === 'week' ? 'on' : ''}" data-act="wlR" data-v="week">이번 주</button><button class="chip ${r === 'month' ? 'on' : ''}" data-act="wlR" data-v="month">이번 달</button><button class="chip ${r === 'all' ? 'on' : ''}" data-act="wlR" data-v="all">전체</button><span class="mu"> | </span><button class="chip ${cat ? '' : 'on'}" data-act="wlC" data-v="">모든 분류</button>${WL_CATS.map(c => `<button class="chip ${cat === c ? 'on' : ''}" data-act="wlC" data-v="${c}">${c}${byC[c] ? ' ' + byC[c] : ''}</button>`).join('')}<button class="btn sm" data-act="wlExport">📄 월간 업무일지 문서</button></div>
  <p class="mu">${E.length}건${mins ? ` · 기록한 시간 ${Math.floor(mins / 60)}시간 ${mins % 60}분` : ''}</p>
  ${past.length ? `<div class="hpcard"><b>📆 작년 오늘</b>${past.map(x => `<div class="cmal">${x.d} ${esc(x.t)} <small class="mu">${esc(x.cat)}</small></div>`).join('')}</div>` : ''}
  ${D.map(d => { const L = E.filter(x => x.d === d), au = cat ? [] : wlAuto(d), dy = wlDay(d); return `<section class="wld"><h3 class="h3">${md(d)} (${DOW[new Date(d + 'T00:00:00').getDay()]})</h3>${L.map(x => `<div class="wle"><span class="chp k-일정">${esc(x.cat)}</span> ${esc(x.t)}${x.m ? ` <small class="mu">${x.m}분</small>` : ''}${x.card && wkById(x.card) ? ` <small class="mu">· ${esc(wkById(x.card).title.slice(0, 20))}</small>` : ''}<button class="x" data-act="wlDel" data-id="${x.id}" aria-label="지우기">✕</button></div>`).join('')}${au.map(x => `<div class="wle auto">${esc(x)} <small class="mu">자동</small></div>`).join('')}
  <details class="wlc"><summary>🌙 하루 마무리 ${dy.done || dy.block || dy.next || dy.feel ? '✔' : ''}</summary><label>오늘 한 일<textarea rows="2" data-wlday="${d}|done">${esc(dy.done || '')}</textarea></label><label>막힌 것·어려웠던 점<textarea rows="2" data-wlday="${d}|block">${esc(dy.block || '')}</textarea></label><label>내일 첫 일<textarea rows="2" data-wlday="${d}|next">${esc(dy.next || '')}</textarea></label><label>💭 오늘의 감상·성찰 (느낀 점, 잘한 점, 다르게 해 볼 점)<textarea rows="3" data-wlday="${d}|feel">${esc(dy.feel || '')}</textarea></label></details></section>`; }).join('') || '<p class="mu">이 기간에 기록이 없습니다. 위 칸에 한 줄만 적어 보세요.</p>'}`;
}
Object.assign(A, {
  wlR(el) { UI.wlR = el.dataset.v; render(); }, wlC(el) { UI.wlC = el.dataset.v; render(); },
  wlDel(el) { const L = wlD(), i = L.findIndex(x => x.id === el.dataset.id); if (i < 0) return; const x = L[i], c = x.card && wkById(x.card), li = c ? (c.log || []).findIndex(l => l.wl === x.id) : -1, lg = li >= 0 ? c.log.splice(li, 1)[0] : null; L.splice(i, 1); commit(); undoBar('일지 한 줄을 지웠습니다', () => { wlD().push(x); if (lg && c) c.log.unshift(lg); commit(); }); },
  wlQuick() { ask('업무일지 한 줄', [{ k: 't', label: '오늘 한 일', req: 1 }, { k: 'cat', label: '분류', type: 'select', opts: WL_CATS, val: '업무' }], o => { wlD().push({ id: uid(), d: today(), t: o.t.trim(), cat: o.cat }); commit(); toast('업무일지에 적었습니다.'); }, '기록'); },
  wlExport() {
    const m = (UI.wlR === 'month' || UI.wlR === 'week' ? today() : today()).slice(0, 7), E = wlD().filter(x => x.d.slice(0, 7) === m).sort((a, b) => a.d.localeCompare(b.d)), byC = {}, tm = {}; E.forEach(x => { byC[x.cat] = (byC[x.cat] || 0) + 1; tm[x.cat] = (tm[x.cat] || 0) + (+x.m || 0); });
    const days = {}; E.forEach(x => (days[x.d] = days[x.d] || []).push(x)); for (let k = 0; k < 31; k++) { const d = `${m}-${pad(k + 1)}`; if (wlAuto(d).length) days[d] = days[d] || []; }
    const html = `<html><meta charset="utf-8"><body style="font-family:'맑은 고딕',sans-serif;line-height:1.6"><h2>${m.replace('-', '년 ')}월 업무일지</h2><p>${esc(S.profile.school || '')} ${esc(S.profile.name || '')}</p><p>분류별: ${Object.keys(byC).map(k => `${k} ${byC[k]}건${tm[k] ? '(' + tm[k] + '분)' : ''}`).join(' · ') || '기록 없음'}</p><table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%"><tr><th>날짜</th><th>분류</th><th>내용</th><th>시간</th></tr>${Object.keys(days).sort().map(d => { const L = days[d]; return L.map(x => `<tr><td>${md(d)}</td><td>${esc(x.cat)}</td><td>${esc(x.t)}</td><td>${x.m ? x.m + '분' : ''}</td></tr>`).join('') + wlAuto(d).map(x => `<tr><td>${md(d)}</td><td>자동</td><td>${esc(x)}</td><td></td></tr>`).join(''); }).join('')}</table>${Object.keys(S.wlogDay || {}).filter(d => d.slice(0, 7) === m && S.wlogDay[d].feel).sort().map(d => `<h4>${md(d)} 감상·성찰</h4><p>${esc(S.wlogDay[d].feel).replace(/\n/g, '<br>')}</p>`).join('') ? '<h3>감상·성찰</h3>' + Object.keys(S.wlogDay || {}).filter(d => d.slice(0, 7) === m && S.wlogDay[d].feel).sort().map(d => `<h4>${md(d)}</h4><p>${esc(S.wlogDay[d].feel).replace(/\n/g, '<br>')}</p>`).join('') : ''}</body></html>`;
    download(`업무일지_${m}.doc`, html, 'application/msword'); toast('월간 업무일지(.doc)를 내려받았습니다.');
  }
});
document.addEventListener('submit', e => {
  if (!e.target.matches('[data-wlform]')) return; e.preventDefault(); const o = Object.fromEntries(new FormData(e.target)), x = { id: uid(), d: o.d || today(), t: (o.t || '').trim(), cat: o.cat || '업무', m: +o.m || 0, card: o.card || '' }; if (!x.t) return;
  wlD().push(x); const c = x.card && wkById(x.card); if (c) { wkN(c).log.unshift({ d: x.d, t: x.t, wl: x.id }); c.sd = today(); } commit(); toast('업무일지에 적었습니다.');
});
document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.wlday) { const [d, k] = t.dataset.wlday.split('|'); wlDay(d)[k] = t.value; save(true); } });
/* 오늘 카드에 일지 단추 */
const wlInject = () => { const t = document.querySelector('.mttoday .tools'); if (t && !t.querySelector('[data-act=wlQuick]')) t.insertAdjacentHTML('afterbegin', '<button class="btn sm" data-act="wlQuick">✍ 업무일지</button>'); };
{ const _r = TF.render; TF.render = function () { const v = _r.apply(this, arguments); setTimeout(wlInject, 0); return v; }; const app = document.getElementById('app'); if (app) { let t = 0; new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { wlInject(); } catch (e) { } }, 20); }).observe(app, { childList: true }); } }
if (typeof ORD_NAV !== 'undefined' && !ORD_NAV.some(x => x[0] === 'wlog')) ORD_NAV.push(['wlog', '업무일지']);
if (typeof ARCH_PAGES !== 'undefined') ARCH_PAGES.wlog = '업무일지';
if (typeof PAGE_KIND !== 'undefined') PAGE_KIND.wlog = '';
const _wl3Bc = buildChunks;
buildChunks = function () { const out = _wl3Bc.apply(this, arguments); wlD().forEach(x => out.push({ type: 'note', src: '업무일지 · ' + x.d, text: `${x.d} 업무일지(${x.cat}): ${x.t}${x.m ? ' ' + x.m + '분' : ''}`, ref: '#/wlog' })); Object.keys(S.wlogDay || {}).forEach(d => { const v = S.wlogDay[d]; if (v.done || v.block || v.next || v.feel) out.push({ type: 'note', src: '하루 마무리 · ' + d, text: `${d} 마무리: ${v.done || ''} / 막힌 것 ${v.block || ''} / 내일 ${v.next || ''} / 감상·성찰 ${v.feel || ''}`, ref: '#/wlog' }); }); return out; };

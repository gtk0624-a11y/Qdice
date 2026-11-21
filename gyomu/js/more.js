/* 부서·메뉴 보강: 예산 점검(기한 경고·월별 집행·에듀파인 대조·결재 상태·사업 복제), 연수(신청 마감·소감·법정 의무연수·이수 내역 내보내기),
   기록(회의록 양식·후속 조치 모아보기), 연간 교육·훈련표 신호등, 오늘(꼭 할 일 3개·퇴근 전 점검·주간 돌아보기·오늘 주의). */
const mFind = id => { for (const p of S.budget) for (const l of p.lines) if (l.id === id) return [p, l]; return null; };
const mAddYear = d => /^\d{4}-/.test(d || '') ? (+d.slice(0, 4) + 1) + d.slice(4) : d;
const BD_ST = ['', '작성', '결재중', '결재완료', '지출완료'];

/* ---------- 예산 점검 패널 ---------- */
function bdPanel() {
  const L = []; S.budget.forEach(p => p.lines.forEach(l => L.push([p, l])));
  const warn = [];
  L.forEach(([p, l]) => { const sp = spentOf(l), left = (+l.alloc || 0) - sp; if (left < 0) warn.push(`<span class="hot">초과</span> ${esc(p.name)} › ${esc(l.item)} ${won(-left)}원 넘음`); else if (l.deadline && left > 0 && dd(l.deadline) !== null && dd(l.deadline) <= 14) warn.push(`${dd(l.deadline) < 0 ? '<span class="hot">기한 지남</span>' : ddText(dd(l.deadline))} ${esc(p.name)} › ${esc(l.item)} 잔액 ${won(left)}원`); });
  const byM = {}, add = s => { const k = (s.date || '').slice(0, 7); if (k) byM[k] = (byM[k] || 0) + (+s.amt || 0); };
  S.budget.forEach(p => { (p.spends || []).forEach(add); p.lines.forEach(l => (l.spends || []).forEach(add)); });
  const ms = Object.keys(byM).sort(), mx = Math.max(1, ...ms.map(k => byM[k])), T = btot(); let cum = 0;
  const chart = ms.length ? ms.map(k => { cum += byM[k]; return `<div class="bdm"><span>${+k.slice(5)}월</span><i style="width:${Math.round(byM[k] / mx * 100)}%"></i><b>${won(byM[k])}원</b><small class="mu">누적 ${T.a ? Math.round(cum / T.a * 100) : 0}%</small></div>`; }).join('') : '<p class="mu">지출을 넣으면 월별로 쌓여 보입니다.</p>';
  const edu = S.budget.map(p => { const led = projAlloc(p) - projSpent(p), v = p.edu, diff = v === '' || v == null ? null : (+v - led); return `<div class="bde"><b>${esc(p.name)}</b> 장부 잔액 ${won(led)}원 · 에듀파인 잔액 <input type="number" inputmode="numeric" data-bdedu="${p.id}" value="${v == null ? '' : v}" placeholder="숫자 입력" aria-label="${esc(p.name)} 에듀파인 잔액">${diff === null ? '' : diff === 0 ? ' <span class="ok">✔ 일치</span>' : ` <span class="hot">⚠ 차이 ${won(diff)}원</span>`}<button class="x" data-act="bdClone" data-id="${p.id}">다음 해로 복제</button></div>`; }).join('');
  const ap = L.length ? `<table class="tbl"><thead><tr><th>항목</th><th>품의번호</th><th>결재 상태</th></tr></thead><tbody>${L.map(([p, l]) => `<tr><td>${esc(p.name)} › ${esc(l.item)}</td><td><input data-bdno="${l.id}" value="${esc(l.no || '')}" placeholder="번호" aria-label="품의번호"></td><td><select data-bdst="${l.id}" aria-label="결재 상태">${BD_ST.map(s => `<option value="${s}" ${(l.st || '') === s ? 'selected' : ''}>${s || '—'}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>` : '<p class="mu">목·항목을 만들면 품의번호와 결재 상태를 적을 수 있습니다.</p>';
  return `<details class="doc bdpanel" ${warn.length ? 'open' : ''}><summary><b>🧭 예산 점검</b> <span class="mu">${warn.length ? `<span class="hot">주의 ${warn.length}건</span> · ` : ''}기한 경고 · 월별 집행 · 에듀파인 대조 · 결재 상태</span></summary>
  <h4 class="dlh">기한·초과 경고</h4>${warn.map(w => `<div class="cmal">${w}</div>`).join('') || '<p class="mu">14일 안에 기한이 오는 항목이나 초과한 항목이 없습니다.</p>'}
  <h4 class="dlh">월별 집행</h4>${chart}
  <h4 class="dlh">에듀파인 잔액 대조</h4><p class="mu">에듀파인에서 본 잔액을 넣으면 장부와의 차이를 알려 줍니다.</p>${edu || '<p class="mu">사업이 없습니다.</p>'}
  <h4 class="dlh">품의번호·결재 상태</h4>${ap}</details>`;
}
const _mBv = budgetView;
budgetView = function () { const h = _mBv.apply(this, arguments), i = h.indexOf('<section class="bk">'); if (!S.budget.length) return h; const p = bdPanel(); return i < 0 ? h + p : h.slice(0, i) + p + h.slice(i); };
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.bdedu) { const p = S.budget.find(x => x.id === t.dataset.bdedu); if (p) { p.edu = t.value === '' ? '' : +t.value; commit(); } }
  else if (t.dataset.bdno) { const f = mFind(t.dataset.bdno); if (f) { f[1].no = t.value.trim(); save(true); } }
  else if (t.dataset.bdst) { const f = mFind(t.dataset.bdst); if (f) { f[1].st = t.value; save(true); toast('결재 상태를 저장했습니다.'); } }
});
Object.assign(A, {
  bdClone(el) { const p = S.budget.find(x => x.id === el.dataset.id); if (!p) return; ask('다음 해 사업으로 복제', [{ k: 'n', label: '새 사업 이름', val: p.name.replace(/\d{4}/, y => +y + 1) + (/\d{4}/.test(p.name) ? '' : ' (다음 해)'), req: 1 }], o => { S.budget.push({ id: uid(), name: o.n.trim(), total: p.total || 0, spends: [], lines: p.lines.map(l => ({ id: uid(), item: l.item, alloc: l.alloc, deadline: mAddYear(l.deadline), spends: [] })) }); commit(); toast('항목과 배정액을 복사했습니다(지출은 비웁니다). 금액을 확인하세요.'); }, '복제'); }
});

/* ---------- 연수 ---------- */
const _mAe = allEvents;
allEvents = function () { const e = _mAe.apply(this, arguments); S.training.forEach(t => { if (t.apply && !t.done) e.push({ date: t.apply, t: t.title + ' (연수 신청 마감)', kind: '연수', done: false }); }); return e; };
Object.assign(A, {
  trNote(el) { const x = S.training.find(t => t.id === el.dataset.id); if (!x) return; ask(`「${x.title}」 신청 마감·소감`, [{ k: 'apply', label: '연수 신청 마감일 (캘린더에 뜹니다)', type: 'date', val: x.apply || '' }, { k: 'note', label: '한 줄 소감·수업에 적용할 점', type: 'textarea', rows: 3, val: x.note || '' }], o => { x.apply = o.apply || ''; x.note = (o.note || '').trim(); commit(); }, '저장'); },
  trLegal() { const names = (typeof YP_PRE !== 'undefined' ? YP_PRE : []).map(r => r[0]).filter(n => !/행사|축제/.test(n)); const have = S.training.map(t => t.title); let n = 0; names.forEach(nm => { if (have.some(h => h.includes(nm.slice(0, 4)))) return; S.training.push({ id: uid(), title: nm, type: '필수', hours: 1, due: '', done: false }); n++; }); commit(); toast(n ? `법정 의무 교육 ${n}건을 넣었습니다. 시간·기한은 학교 공문대로 고쳐 주세요.` : '이미 모두 들어 있습니다.'); },
  trReport() {
    const L = S.training.filter(t => t.done).sort((a, b) => (a.doneDate || '').localeCompare(b.doneDate || '')), tot = L.reduce((a, t) => a + (+t.hours || 0), 0), P = S.profile;
    const html = `<html><meta charset="utf-8"><body style="font-family:'맑은 고딕',sans-serif"><h2>연수 이수 내역</h2><p>${esc(P.school || '')} ${esc(P.name || '')} · 작성일 ${today()}</p><p>이수 합계 <b>${tot}시간</b> (필수 ${L.filter(t => t.type === '필수').reduce((a, t) => a + (+t.hours || 0), 0)}시간 · 개발 ${L.filter(t => t.type === '개발').reduce((a, t) => a + (+t.hours || 0), 0)}시간)${P.totTarget ? ` / 목표 ${P.totTarget}시간` : ''}</p><table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse"><tr><th>연수명</th><th>구분</th><th>시간</th><th>이수일</th><th>이수번호</th><th>소감·적용점</th></tr>${L.map(t => `<tr><td>${esc(t.title)}</td><td>${t.type}</td><td>${t.hours}</td><td>${t.doneDate || ''}</td><td>${esc(t.certNo || '')}</td><td>${esc(t.note || '')}</td></tr>`).join('')}</table></body></html>`;
    download('연수이수내역_' + today() + '.doc', html, 'application/msword'); toast('이수 내역(.doc)을 내려받았습니다.');
  }
});

/* ---------- 기록 ---------- */
const NOTE_TPL = () => `일시: ${today()}\n장소: \n참석: (인원 수만)\n\n■ 안건\n1. \n\n■ 논의 내용\n- \n\n■ 결정 사항\n- \n\n■ 후속 조치 (담당·기한)\n- `;
const _mNv = notesView;
notesView = function (id) {
  let h = _mNv.apply(this, arguments);
  h = h.replace('<button class="btn" data-act="noteNew">+ 새 노트</button>', '<button class="btn" data-act="noteNew">+ 새 노트</button><button class="btn sm" data-act="noteFollow">📌 후속 조치 모아보기</button>');
  if (id) h = h.replace('<button class="btn" data-act="noteExport"', `<button class="btn" data-act="noteTpl" data-id="${id}">📋 회의록 양식 넣기</button><button class="btn" data-act="noteExport"`);
  return h;
};
Object.assign(A, {
  noteTpl(el) { const n = S.notes.find(x => x.id === el.dataset.id); if (!n) return; n.body = n.body ? n.body + '\n\n' + NOTE_TPL() : NOTE_TPL(); commit(); },
  noteFollow() {
    const all = []; S.notes.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(n => String(n.followups || '').split('\n').map(x => x.trim()).filter(Boolean).forEach(l => all.push({ n, l })));
    let d = document.getElementById('nfol'); if (d) d.remove(); d = document.createElement('dialog'); d.id = 'nfol'; d.className = 'dlg wide'; document.body.appendChild(d);
    const draw = () => { const open = all.filter(x => !(x.n.fdone || {})[x.l]); d.innerHTML = `<h3>📌 후속 조치 모아보기</h3><p class="mu">모든 노트의 후속 조치 중 아직 안 끝낸 것 ${open.length}건 (끝낸 것 ${all.length - open.length}건은 숨깁니다).</p>${open.map((x, i) => `<label class="cmr chk"><input type="checkbox" data-nf="${all.indexOf(x)}"> <span>${esc(x.l)} <small class="mu">${md(x.n.date)} ${esc(x.n.title)}</small> <a href="#/note/${x.n.id}">노트 ▶</a></span></label>`).join('') || '<p class="mu">남은 후속 조치가 없습니다. 👍</p>'}<div class="tools"><button class="btn" id="nfx">닫기</button></div>`; d.querySelector('#nfx').onclick = () => d.close(); d.querySelectorAll('[data-nf]').forEach(c => c.onchange = () => { const x = all[+c.dataset.nf]; x.n.fdone = x.n.fdone || {}; x.n.fdone[x.l] = true; save(true); draw(); }); };
    draw(); d.showModal();
  }
});

/* ---------- 연간 교육·훈련표 신호등 ---------- */
function ypSig(r) {
  const v = Object.values(r.cells || {}).filter(c => c && c.d);
  if (!v.length) return '<span class="ypsig r" title="날짜를 아직 안 잡았습니다">●</span>';
  if (v.some(c => !c.ok && dd(c.d) !== null && dd(c.d) < 0)) return '<span class="ypsig o" title="날짜가 지났는데 실시 완료 표시가 없습니다">●</span>';
  return v.every(c => c.ok) ? '<span class="ypsig g" title="잡아 둔 날짜가 모두 실시 완료">●</span>' : '<span class="ypsig y" title="날짜는 잡았고 아직 실시 전입니다">●</span>';
}

/* ---------- 오늘 화면 ---------- */
const mtFocus = () => { const f = S.focus = S.focus && S.focus.d === today() ? S.focus : { d: today(), ids: [] }; return f; };
function mtWarn() {
  const o = [];
  S.budget.forEach(p => p.lines.forEach(l => { const left = (+l.alloc || 0) - spentOf(l); if (l.deadline && left > 0 && dd(l.deadline) !== null && dd(l.deadline) <= 7) o.push(`${dd(l.deadline) < 0 ? '<span class="hot">기한 지남</span>' : ddText(dd(l.deadline))} 예산 ${esc(l.item)} 잔액 ${won(left)}원`); }));
  S.training.forEach(t => { if (t.done) return; if (t.due && dd(t.due) !== null && dd(t.due) <= 7) o.push(`${ddText(dd(t.due))} 연수 ${esc(t.title)} 이수 기한`); if (t.apply && dd(t.apply) !== null && dd(t.apply) >= 0 && dd(t.apply) <= 7) o.push(`${ddText(dd(t.apply))} 연수 ${esc(t.title)} 신청 마감`); });
  return o.slice(0, 5);
}
const mtInject = () => {
  const main = document.querySelector('#app main'); if (!main || !S.setup) return; const ex = main.querySelector('.mttoday'), isT = /^#\/(today)?$/.test(location.hash) || !location.hash; if (ex) ex.remove(); if (!isT) return;
  const f = mtFocus(), L = f.ids.map(id => S.items.find(x => x.id === id)).filter(Boolean), warn = mtWarn(), dow = new Date().getDay(), wkend = dow === 0 || dow >= 5;
  const d = document.createElement('div'); d.className = 'hpcard mttoday';
  d.innerHTML = `<b>🎯 오늘 꼭 할 일</b> ${L.length < 3 ? '<button class="btn sm" data-act="fcPick">+ 고르기</button>' : ''}${L.map(x => `<div class="cmal"><input type="checkbox" data-act="fcTog" data-id="${x.id}" ${x.done ? 'checked' : ''} aria-label="완료"> <span class="${x.done ? 'dn' : ''}">${esc(x.title)}</span> <button class="x" data-act="fcDel" data-id="${x.id}" aria-label="빼기">✕</button></div>`).join('') || '<div class="mu">오늘 꼭 끝낼 일 3개만 골라 두세요. 나머지는 마음 편하게.</div>'}
  ${warn.length ? `<div class="mtw"><b>⚠ 오늘 주의</b>${warn.map(w => `<div class="cmal">${w}</div>`).join('')}</div>` : ''}
  <div class="tools"><button class="btn sm" data-act="eveCheck">🌙 퇴근 전 점검</button><button class="btn sm ${wkend ? 'pri' : ''}" data-act="weekRev">🗓 주간 돌아보기</button></div>`;
  const a = main.querySelector('.cheer') || main.querySelector('.hpcard'); if (a) a.after(d); else main.prepend(d);
};
const _mTR = TF.render; TF.render = function () { const v = _mTR.apply(this, arguments); mtInject(); return v; };
(function () { const app = document.getElementById('app'); if (!app) return; let t = 0; new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { mtInject(); } catch (e) { } }, 0); }).observe(app, { childList: true }); })();
const mtWeek = off => { const x = wkStartOf(today()); x.setDate(x.getDate() + off); const a = ymd(x); x.setDate(x.getDate() + 6); return [a, ymd(x)]; };
Object.assign(A, {
  fcTog(el) { const x = S.items.find(i => i.id === el.dataset.id); if (x) { x.done = !x.done; commit(); } },
  fcDel(el) { const f = mtFocus(); f.ids = f.ids.filter(i => i !== el.dataset.id); commit(); },
  fcPick() {
    const f = mtFocus(), C = S.items.filter(x => x.cat === 'todo' && !x.done && !f.ids.includes(x.id) && (!x.date || dd(x.date) === null || dd(x.date) <= 7)).sort((a, b) => (a.date || '9').localeCompare(b.date || '9')).slice(0, 40);
    if (!C.length) { toast('고를 할 일이 없습니다. 캘린더에서 할 일을 먼저 추가하세요.'); return; }
    let d = document.getElementById('fcd'); if (d) d.remove(); d = document.createElement('dialog'); d.id = 'fcd'; d.className = 'dlg wide'; document.body.appendChild(d);
    d.innerHTML = `<h3>오늘 꼭 할 일 고르기 (${3 - f.ids.length}개까지)</h3>${C.map(x => `<label class="cmr chk"><input type="checkbox" data-fc="${x.id}"> <span>${esc(x.title)} <small class="mu">${x.date ? md(x.date) : ''}</small></span></label>`).join('')}<div class="tools"><button class="btn pri" id="fcok">정하기</button><button class="btn" id="fcx">닫기</button></div>`;
    d.querySelector('#fcx').onclick = () => d.close();
    d.querySelector('#fcok').onclick = () => { const ids = [...d.querySelectorAll('[data-fc]:checked')].map(c => c.dataset.fc).slice(0, 3 - f.ids.length); f.ids = f.ids.concat(ids); d.close(); commit(); };
    d.showModal();
  },
  eveCheck() {
    const t = today(), L = S.items.filter(x => x.cat === 'todo' && !x.done && x.date && x.date <= t);
    if (!L.length) { toast('오늘까지 끝내지 못한 할 일이 없습니다. 퇴근하셔도 좋습니다. 🌙'); return; }
    const x = new Date(); x.setDate(x.getDate() + 1); const tm = ymd(x);
    sure(`오늘까지 못 끝낸 할 일 ${L.length}건을 내일(${md(tm)})로 넘길까요?\n${L.slice(0, 6).map(i => '· ' + i.title).join('\n')}`, () => { L.forEach(i => { i.date = tm; }); commit(); toast('내일로 넘겼습니다. [되돌리기]로 취소할 수 있어요.'); });
  },
  weekRev() {
    const [a, b] = mtWeek(0), [na, nb] = mtWeek(7), inR = (d, x, y) => d && d >= x && d <= y;
    const done = S.items.filter(i => i.cat === 'todo' && i.done && inR(i.date, a, b)), logs = []; wkD().cards.forEach(c => (c.log || []).forEach(l => { if (inR(l.d, a, b)) logs.push(`${md(l.d)} ${c.title}: ${l.t}`); }));
    const doneC = wkD().cards.filter(c => c.done && inR(c.sd, a, b)), nxt = allEvents().filter(e => !e.done && inR(e.date, na, nb)).sort((x, y) => x.date.localeCompare(y.date)).slice(0, 12), S2 = S.weekly = S.weekly || {};
    let d = document.getElementById('wkrv'); if (d) d.remove(); d = document.createElement('dialog'); d.id = 'wkrv'; d.className = 'dlg wide'; document.body.appendChild(d);
    d.innerHTML = `<h3>🗓 주간 돌아보기 <small class="mu">${md(a)}~${md(b)}</small></h3>
    <h4 class="dlh">이번 주에 끝낸 일</h4>${done.map(i => `<div>✔ ${esc(i.title)}</div>`).join('')}${doneC.map(c => `<div>✔ [업무] ${esc(c.title)}</div>`).join('') || (done.length ? '' : '<p class="mu">기록된 완료가 없습니다.</p>')}
    ${logs.length ? `<h4 class="dlh">업무 일지</h4>${logs.slice(0, 15).map(l => `<div>${esc(l)}</div>`).join('')}` : ''}
    <h4 class="dlh">다음 주 일정·기한</h4>${nxt.map(e => `<div>${md(e.date)} ${esc(e.t)} <small class="mu">${e.kind || ''}</small></div>`).join('') || '<p class="mu">없습니다.</p>'}
    <h4 class="dlh">이번 주 한 줄 소감</h4><textarea id="wrt" rows="3" style="width:100%" placeholder="잘한 점, 다음 주에 바꿀 점">${esc(S2[a] || '')}</textarea><div class="tools"><button class="btn pri" id="wrok">소감 저장</button><button class="btn" id="wrx">닫기</button></div>`;
    d.querySelector('#wrx').onclick = () => d.close(); d.querySelector('#wrok').onclick = () => { S2[a] = d.querySelector('#wrt').value.trim(); d.close(); commit(); toast('저장했습니다.'); }; d.showModal();
  }
});

/* ---------- 꿈송이 검색: 결재·소감·주간 소감 ---------- */
const _mBc = buildChunks;
buildChunks = function () {
  const out = _mBc.apply(this, arguments);
  S.budget.forEach(p => p.lines.forEach(l => { if (l.no || l.st) out.push({ type: 'budget', src: `예산 결재 · ${p.name} · ${l.item}`, text: `${p.name} ${l.item} 품의번호 ${l.no || '없음'} 결재 상태 ${l.st || '미입력'}`, ref: '#/budget' }); }));
  S.training.forEach(t => { if (t.note || t.apply) out.push({ type: 'training', src: '연수 · ' + t.title, text: `${t.title} ${t.apply ? '신청 마감 ' + t.apply : ''} ${t.note ? '소감: ' + t.note : ''}`, ref: '#/today' }); });
  Object.keys(S.weekly || {}).forEach(k => { if (S.weekly[k]) out.push({ type: 'note', src: '주간 소감 · ' + k, text: `${k} 주 소감: ${S.weekly[k]}`, ref: '#/' }); });
  return out;
};

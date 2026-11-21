/* 내 업무 카드 확장: 해마다 되풀이 · 연결 붙이기 · 월별 보기 · 인수인계서 · 진행 단계 · 배정판 · 기한 임박 알림 · 일지.
   카드 필드 추가: stage(0~5), cd(만든 날), sd(마지막 손댄 날), log[{d,t}], links[{label,ref}], tplId.  S.wk.tpl = 해마다 되풀이 업무 [{id,title,dept,who,me,memo,steps[],md:'MM-DD'}] */
const WK_ST = ['접수', '계획', '품의', '실행', '정산', '완료'];
const wkTpl = () => { const w = wkD(); w.tpl = w.tpl || []; return w.tpl; };
const wkN = c => { c.cd = c.cd || today(); c.log = c.log || []; c.links = c.links || []; if (c.stage == null) c.stage = c.done ? 5 : 0; return c; };
const wkDaysAgo = d => Math.round((new Date(today() + 'T00:00:00') - new Date(d + 'T00:00:00')) / 864e5);
const wkStalled = () => wkD().cards.map(wkN).filter(c => !c.done && wkDaysAgo(c.sd || c.cd) >= 14);
const wkById = id => wkD().cards.find(x => x.id === id);
const wkTplDue = t => { if (!t.md) return ''; const sy = schoolYearNow(), m = +t.md.slice(0, 2); return `${m >= 3 ? sy : sy + 1}-${t.md}`; };
const wkTplHas = t => wkD().cards.some(c => c.src === 'tpl:' + t.id + ':' + schoolYearNow());
function wkFromTpl(t) { return wkN({ id: uid(), title: t.title, dept: t.dept || '', who: t.who || '', me: t.me !== false, memo: t.memo || '', due: wkTplDue(t), done: false, steps: (t.steps || []).map(x => ({ t: x, d: false })), src: 'tpl:' + t.id + ':' + schoolYearNow(), tplId: t.id }); }

/* ---- 카드 한 장 ---- */
const _wk2Card = wkCard;
wkCard = function (c) {
  wkN(c); let h = _wk2Card(c);
  const idle = !c.done && wkDaysAgo(c.sd || c.cd) >= 14;
  const st = `<div class="wkx"><label class="wkst s${c.stage}">진행 <select data-wkstage="${c.id}" aria-label="진행 단계">${WK_ST.map((s, i) => `<option value="${i}" ${c.stage === i ? 'selected' : ''}>${s}</option>`).join('')}</select></label>${c.tplId ? '<span class="chp k-일정">↻ 해마다</span>' : ''}${idle ? `<span class="chp hot">${wkDaysAgo(c.sd || c.cd)}일째 멈춤</span>` : ''}</div>`;
  const lk = c.links.length ? `<div class="wkl">${c.links.map((l, i) => `<span class="chp"><a href="${esc(l.ref)}">🔗 ${esc(l.label)}</a> <button class="x" data-act="wkLinkDel" data-id="${c.id}" data-i="${i}" aria-label="연결 떼기">✕</button></span>`).join('')}</div>` : '';
  const lg = `<details class="wklg"><summary>📒 일지 ${c.log.length}건${c.log.length ? ' · 최근 ' + md(c.log[0].d) : ''}</summary>${c.log.slice(0, 30).map(x => `<p><small class="mu">${md(x.d)}</small> ${esc(x.t)}</p>`).join('') || '<p class="mu">「✍ 오늘 한 일」로 한 줄씩 쌓으면 업무 일지가 됩니다.</p>'}</details>`;
  h = h.replace('<textarea data-wkmemo', st + lk + lg + '<textarea data-wkmemo');
  h = h.replace('<button class="btn sm" data-act="wkEdit"', `<button class="btn sm" data-act="wkLog" data-id="${c.id}">✍ 오늘 한 일</button><button class="btn sm" data-act="wkLink" data-id="${c.id}">🔗 연결</button><button class="btn sm" data-act="wkTplSave" data-id="${c.id}">↻ 해마다</button><button class="btn sm" data-act="wkEdit"`);
  return h;
};

/* ---- 새 탭 4개 ---- */
function wkYr() {
  const T = wkTpl().slice().sort((a, b) => (a.md || '99').localeCompare(b.md || '99')), todoN = T.filter(t => !wkTplHas(t)).length, mineN = wkD().cards.filter(c => c.me && !c.tplId).length;
  return `<div class="tools"><button class="btn pri" data-act="wkTplAdd">+ 되풀이 업무 추가</button><button class="btn" data-act="wkTplAll" ${todoN ? '' : 'disabled'}>⚡ 올해 카드 한 번에 만들기 (${todoN}건)</button><button class="btn" data-act="wkTplFromCards" ${mineN ? '' : 'disabled'}>내 카드 ${mineN}장을 해마다 업무로 저장</button></div>
  <p class="mu">매년 되풀이되는 업무의 틀(단계·보통 하는 시기)을 저장해 두고, 새 학년도에 한 번에 카드로 만듭니다. 날짜는 올해 학년도(3월~다음해 2월)에 맞춰 자동으로 들어갑니다.</p>
  ${T.map(t => `<div class="wkc"><div class="wkh"><b class="wkt">${esc(t.title)}</b></div><div class="wkm">${t.dept ? `<span class="chp k-학사">${esc(t.dept)}</span>` : ''}<span class="chp k-할">${t.md ? '보통 ' + t.md.replace('-', '월 ') + '일' : '시기 미정'}</span>${(t.steps || []).length ? `<span class="mu">할 일 ${t.steps.length}개</span>` : ''}${wkTplHas(t) ? '<span class="chp k-일정">올해 카드 있음</span>' : ''}</div><div class="wkb"><button class="btn sm pri" data-act="wkTplUse" data-id="${t.id}" ${wkTplHas(t) ? 'disabled' : ''}>올해 카드 만들기</button><button class="btn sm" data-act="wkTplDel" data-id="${t.id}">삭제</button></div></div>`).join('') || '<p class="mu">아직 없습니다. 카드의 [↻ 해마다] 버튼으로 저장하거나 위 [+ 되풀이 업무 추가]를 누르세요.</p>'}`;
}
function wkMo() {
  const sy = schoolYearNow(), ms = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2], C = wkD().cards.map(wkN).filter(c => c.me), now = today().slice(0, 7);
  const none = C.filter(c => !c.due), tpls = wkTpl().filter(t => t.md && !wkTplHas(t));
  const col = m => {
    const y = m >= 3 ? sy : sy + 1, key = `${y}-${pad(m)}`, L = C.filter(c => (c.due || '').slice(0, 7) === key).sort((a, b) => a.due.localeCompare(b.due)), G = tpls.filter(t => +t.md.slice(0, 2) === m);
    return `<div class="wkmm ${key === now ? 'cur' : ''}"><h4>${m}월 <small class="mu">${y}</small></h4>${L.map(c => `<div class="wkmi ${c.done ? 'dn' : ''}"><b>${+c.due.slice(8)}일</b> ${esc(c.title)} <small class="mu">${WK_ST[c.stage]}</small></div>`).join('')}${G.map(t => `<div class="wkmi gh">↻ ${+t.md.slice(3)}일 ${esc(t.title)} <small class="mu">예정</small></div>`).join('')}${L.length + G.length ? '' : '<p class="mu">—</p>'}</div>`;
  };
  return `<p class="mu">내 업무 카드의 기한을 학년도(3월~2월) 순서로 펼쳤습니다. 점선은 해마다 업무인데 올해 카드가 아직 없는 것입니다.</p><div class="wkmo">${ms.map(col).join('')}</div>${none.length ? `<h4 class="dlh">기한 없는 카드 <small class="mu">${none.length}건</small></h4><div class="wkmo">${none.slice(0, 40).map(c => `<div class="wkmi ${c.done ? 'dn' : ''}">${esc(c.title)}</div>`).join('')}</div>` : ''}`;
}
function wkBd() {
  const me = wkMe() || '나', g = {}; wkD().cards.map(wkN).forEach(c => { const o = c.me ? [me] : (wkTokens(c.who).length ? wkTokens(c.who) : [c.who || '미정']); o.forEach(n => (g[n] = g[n] || []).push(c)); });
  const names = Object.keys(g).sort((a, b) => g[b].length - g[a].length), mx = Math.max(1, ...names.map(n => g[n].length));
  return `<p class="mu">업무분장표의 담당자 이름 기준으로 카드 수와 진행 상황을 봅니다. 학생 명단이 아니라 업무 담당자 이름만 씁니다.</p>${names.map(n => { const L = g[n], dn = L.filter(c => c.done).length, soon = L.filter(c => !c.done && c.due && dd(c.due) !== null && dd(c.due) <= 7).length; return `<details class="wkbd"><summary><b>${esc(n)}</b> <span class="mu">${L.length}건 · 완료 ${dn}${soon ? ` · <span class="hot">7일 내 ${soon}</span>` : ''}</span><span class="wkbar"><i style="width:${Math.round(L.length / mx * 100)}%"><u style="width:${L.length ? Math.round(dn / L.length * 100) : 0}%"></u></i></span></summary>${L.map(c => `<div class="wkmi ${c.done ? 'dn' : ''}">${esc(c.title)} <small class="mu">${esc(c.dept || '')} ${WK_ST[c.stage]}${c.due ? ' · ' + md(c.due) : ''}</small></div>`).join('')}</details>`; }).join('') || '<p class="mu">카드가 없습니다.</p>'}`;
}
function wkSt() { const L = wkStalled(); return `<p class="mu">완료되지 않았는데 14일 넘게 손대지 않은 카드입니다(단계 변경·일지·메모 쓰기로 다시 움직이면 빠집니다).</p><div class="wkg">${L.map(wkCard).join('') || '<p class="mu">멈춘 카드가 없습니다. 👍</p>'}</div>`; }

const _wk2View = workView;
workView = function () {
  const tab = UI.wkTab, SP = ['yr', 'mo', 'bd', 'st'], sp = SP.includes(tab); wkD().cards.forEach(wkN);
  UI.wkTab = sp ? 'me' : tab; let h; try { h = _wk2View.apply(this, arguments); } finally { UI.wkTab = tab; }
  const tb = [['yr', `↻ 해마다 ${wkTpl().length}`], ['mo', '📅 월별'], ['bd', '👥 배정판'], ['st', `⏳ 멈춘 카드 ${wkStalled().length}`]].map(([k, v]) => `<button class="cmtab ${tab === k ? 'on' : ''}" data-act="wkTabSet" data-k="${k}">${v}</button>`).join('');
  h = h.replace('data-act="wkWipe">🗑 분장표 통째로 지우기</button>', 'data-act="wkWipe">🗑 분장표 통째로 지우기</button><button class="btn" data-act="wkHand">📄 인수인계서</button>');
  const i = h.indexOf('<div class="cmtabs">'); if (i < 0) return h; const j = h.indexOf('</div>', i);
  let head = h.slice(0, j); if (sp) head = head.replace(/cmtab on/g, 'cmtab'); head += tb + '</div>';
  const rest = h.slice(j + 6); if (!sp) return head + rest;
  const trash = (rest.match(/<details class="dlold">[\s\S]*<\/details>/) || [''])[0];
  return head + ({ yr: wkYr, mo: wkMo, bd: wkBd, st: wkSt })[tab]() + trash;
};

/* ---- 동작 ---- */
function wkLinkCands() {
  const o = []; S.budget.forEach(p => p.lines.forEach(l => o.push({ label: `예산 ${p.name} › ${l.item}`, ref: '#/budget' })));
  S.notes.filter(n => !n.lock).slice(-60).reverse().forEach(n => o.push({ label: `노트 ${n.date} ${n.title}`, ref: '#/note/' + n.id }));
  ((S.yp || {}).rows || []).forEach(r => o.push({ label: `연수표 ${r.name}`, ref: '#/yp' }));
  (LIB || []).forEach(d => o.push({ label: `자료 ${d.name}`, ref: '#/lib' }));
  (S.docLog || []).slice(-40).reverse().forEach(x => o.push({ label: `공문 ${x.title}`, ref: '#/' }));
  return o;
}
Object.assign(A, {
  wkTog(el) { const c = wkById(el.dataset.id); if (!c) return; wkN(c); c.done = !c.done; c.stage = c.done ? 5 : (c.stage === 5 ? 3 : c.stage); c.sd = today(); commit(); },
  wkLog(el) { const c = wkById(el.dataset.id); if (!c) return; ask('오늘 한 일 (한 줄)', [{ k: 't', label: `「${c.title}」`, req: 1 }], o => { wkN(c).log.unshift({ d: today(), t: o.t.trim() }); c.sd = today(); commit(); toast('일지에 적었습니다.'); }, '적기'); },
  wkLinkDel(el) { const c = wkById(el.dataset.id); if (c && c.links) { c.links.splice(+el.dataset.i, 1); commit(); } },
  wkLink(el) {
    const c = wkById(el.dataset.id); if (!c) return; wkN(c); const L = wkLinkCands(); if (!L.length) { toast('연결할 예산·노트·연수표·자료가 아직 없습니다.'); return; }
    let d = document.getElementById('wklk'); if (d) d.remove(); d = document.createElement('dialog'); d.id = 'wklk'; d.className = 'dlg wide'; document.body.appendChild(d);
    d.innerHTML = `<h3>「${esc(c.title)}」에 연결</h3><p class="mu">관련 예산·회의 노트·연수표·자료·공문을 골라 붙이면 카드에서 바로 열립니다.</p><div class="wklist">${L.slice(0, 200).map((x, i) => `<label class="cmr chk"><input type="checkbox" data-lk="${i}" ${c.links.some(y => y.label === x.label) ? 'checked' : ''}> <span>${esc(x.label)}</span></label>`).join('')}</div><div class="tools"><button class="btn pri" id="lkok">붙이기</button><button class="btn" id="lkx">닫기</button></div>`;
    d.querySelector('#lkx').onclick = () => d.close();
    d.querySelector('#lkok').onclick = () => { c.links = L.slice(0, 200).filter((x, i) => d.querySelector(`[data-lk="${i}"]`).checked).map(x => ({ label: x.label, ref: x.ref })); c.sd = today(); d.close(); commit(); };
    d.showModal();
  },
  wkTplSave(el) { const c = wkById(el.dataset.id); if (!c) return; ask('해마다 되풀이 업무로 저장', [{ k: 'due', label: '보통 언제까지 하는 업무인가요? (날짜를 고르면 매년 같은 월·일로 카드가 만들어집니다)', type: 'date', val: c.due || '' }], o => { const t = { id: uid(), type: c.type || '', title: c.title, dept: c.dept || '', who: c.who || '', me: !!c.me, memo: '', steps: (c.steps || []).map(s => s.t), md: o.due ? o.due.slice(5) : '' }; const T = wkTpl(), k = T.findIndex(x => x.title === t.title); if (k >= 0) { t.id = T[k].id; T[k] = t; } else T.push(t); c.tplId = t.id; commit(); toast('해마다 업무에 저장했습니다. [↻ 해마다] 탭에서 다음 학년도에 한 번에 만들 수 있어요.'); }, '저장'); },
  wkTplAdd() { ask('되풀이 업무 추가', [{ k: 'title', label: '업무 이름', req: 1 }, { k: 'dept', label: '부서·영역' }, { k: 'due', label: '보통 하는 시기 (날짜 하나 고르면 월·일만 씁니다)', type: 'date' }, { k: 'steps', label: '할 일 단계 (한 줄에 하나)', type: 'textarea', rows: 4 }], o => { wkTpl().push({ id: uid(), title: o.title.trim(), dept: (o.dept || '').trim(), who: '', me: true, memo: '', steps: String(o.steps || '').split('\n').map(x => x.trim()).filter(Boolean), md: o.due ? o.due.slice(5) : '' }); commit(); }, '추가'); },
  wkTplUse(el) { const t = wkTpl().find(x => x.id === el.dataset.id); if (!t || wkTplHas(t)) return; wkD().cards.push(wkFromTpl(t)); commit(); toast('올해 카드를 만들었습니다.'); },
  wkTplAll() { const L = wkTpl().filter(t => !wkTplHas(t)); if (!L.length) return; L.forEach(t => wkD().cards.push(wkFromTpl(t))); commit(); toast(`올해 카드 ${L.length}장을 만들었습니다. [되돌리기]로 취소할 수 있어요.`); },
  wkTplDel(el) { sure('이 되풀이 업무를 지울까요? (이미 만든 카드는 그대로 둡니다)', () => { const w = wkD(); w.tpl = wkTpl().filter(x => x.id !== el.dataset.id); commit(); }); },
  wkTplFromCards() { const T = wkTpl(); let n = 0; wkD().cards.filter(c => c.me && !c.tplId).forEach(c => { if (T.some(t => t.title === c.title)) return; const t = { id: uid(), title: c.title, dept: c.dept || '', who: '', me: true, memo: '', steps: (c.steps || []).map(s => s.t), md: c.due ? c.due.slice(5) : '' }; T.push(t); c.tplId = t.id; n++; }); commit(); toast(`${n}건을 해마다 업무로 저장했습니다.`); },
  wkHand() {
    const me = wkMe(), C = wkD().cards.map(wkN).filter(c => c.me), g = {}; C.forEach(c => (g[c.dept || '기타'] = g[c.dept || '기타'] || []).push(c));
    const T = wkTpl().slice().sort((a, b) => (a.md || '99').localeCompare(b.md || '99'));
    const html = `<html><meta charset="utf-8"><body style="font-family:'맑은 고딕',sans-serif;line-height:1.6"><h1>업무 인수인계서</h1><p>작성일 ${today()} · 작성자 ${esc(me)} · ${esc(S.profile.school || '')}</p>
<h2>1. 해마다 되풀이되는 업무 시기</h2>${T.length ? `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse"><tr><th>시기</th><th>업무</th><th>부서</th><th>할 일</th></tr>${T.map(t => `<tr><td>${t.md ? t.md.replace('-', '월 ') + '일경' : '미정'}</td><td>${esc(t.title)}</td><td>${esc(t.dept || '')}</td><td>${esc((t.steps || []).join(' → '))}</td></tr>`).join('')}</table>` : '<p>저장된 되풀이 업무가 없습니다.</p>'}
<h2>2. 업무별 진행·메모</h2>${Object.keys(g).map(d => `<h3>${esc(d)}</h3>${g[d].map(c => `<h4>${esc(c.title)}</h4><p>진행: ${WK_ST[c.stage]}${c.due ? ' · 기한 ' + c.due : ''}${c.done ? ' · 완료' : ''}</p>${(c.steps || []).length ? `<ul>${c.steps.map(s => `<li>${s.d ? '✔' : '□'} ${esc(s.t)}</li>`).join('')}</ul>` : ''}${c.memo ? `<p>메모: ${esc(c.memo).replace(/\n/g, '<br>')}</p>` : ''}${c.links.length ? `<p>관련 기록: ${c.links.map(l => esc(l.label)).join(' / ')}</p>` : ''}${c.log.length ? `<p>최근 일지:<br>${c.log.slice(0, 5).map(x => `${x.d} ${esc(x.t)}`).join('<br>')}</p>` : ''}`).join('')}`).join('') || '<p>내 업무 카드가 없습니다.</p>'}
<p style="color:#888">※ 업무파탈에서 자동으로 만든 문서입니다. 내용을 확인한 뒤 전달하세요.</p></body></html>`;
    download('업무인수인계서_' + today() + '.doc', html, 'application/msword'); toast('인수인계서(.doc)를 내려받았습니다.');
  }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset || !t.dataset.wkstage) return; const c = wkById(t.dataset.wkstage); if (!c) return;
  c.stage = +t.value; c.done = c.stage === 5; c.sd = today(); commit();
});
document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.wkmemo) { const c = wkById(t.dataset.wkmemo); if (c) c.sd = today(); } });

/* ---- 오늘 화면: 업무 카드 기한 임박 ---- */
const wkInject = () => {
  const main = document.querySelector('#app main'); if (!main || !S.setup) return; const ex = main.querySelector('.wktoday'), isT = /^#\/(today)?$/.test(location.hash) || !location.hash; if (ex) ex.remove(); if (!isT || (S.navHide || []).includes('work')) return;
  const L = wkD().cards.filter(c => c.me && !c.done && c.due && dd(c.due) !== null && dd(c.due) <= 3).sort((a, b) => a.due.localeCompare(b.due)); if (!L.length) return;
  const d = document.createElement('div'); d.className = 'hpcard wktoday'; d.innerHTML = `<b>⏰ 업무 카드 기한 임박</b> <a class="btn sm" href="#/work">내 업무 ▶</a>${L.slice(0, 6).map(c => `<div class="cmal">${dd(c.due) < 0 ? '<span class="hot">기한 지남</span>' : ddText(dd(c.due))} · ${md(c.due)} ${esc(c.title)} <small class="mu">${WK_ST[wkN(c).stage]}</small> <button class="x" data-act="wkTog" data-id="${c.id}">완료</button></div>`).join('')}`;
  const a = main.querySelector('.yptoday') || main.querySelector('.cmtoday') || main.querySelector('.hpcard') || main.querySelector('.cheer'); if (a) a.after(d); else main.prepend(d);
};
const _wk2R = TF.render; TF.render = function () { const v = _wk2R.apply(this, arguments); wkInject(); return v; };
(function () { const app = document.getElementById('app'); if (!app) return; let t = 0; new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { wkInject(); } catch (e) { } }, 0); }).observe(app, { childList: true }); })();

/* ---- 꿈송이 검색: 일지·진행단계·해마다 업무 ---- */
const _wk2Bc = buildChunks;
buildChunks = function () {
  const out = _wk2Bc.apply(this, arguments);
  wkD().cards.map(wkN).forEach(c => { if (c.log.length) out.push({ type: 'duty', src: '업무 일지 · ' + c.title, text: `${c.title} 일지: ` + c.log.slice(0, 10).map(x => `${x.d} ${x.t}`).join(' / '), ref: '#/work' }); out.push({ type: 'duty', src: '업무 카드 진행 · ' + c.title, text: `${c.title} 진행 단계 ${WK_ST[c.stage]}${c.due ? ' 기한 ' + c.due : ''}${c.done ? ' 완료' : ''}`, ref: '#/work' }); });
  wkTpl().forEach(t => out.push({ type: 'duty', src: '해마다 되풀이 업무', text: `${t.title} 보통 ${t.md ? t.md.replace('-', '월 ') + '일' : '시기 미정'} ${t.dept || ''}`, ref: '#/work' }));
  return out;
};

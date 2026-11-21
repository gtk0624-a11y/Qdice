/* 자료 아카이브 · 어디서든 붙여넣기/끌어놓기(한글·엑셀·PDF·글) · 올린 문서를 일정·업무·예산에 반영할지 묻기 */
const ARCH_PAGES = { today: '오늘', cal: '캘린더', class: '수업', eval: '평가', budget: '예산', notes: '기록', lib: '자료·연락', files: '아카이브', pages: '페이지', set: '설정' };
const ARCH_KINDS = ['계획서', '평가계획서', '운영표', '회의록', '공문', '규정', '교육과정', '예산', '일정', '기타'];
const archPage = () => ((location.hash || '#/today').split('/')[1]) || 'today';
const archBusy = () => !!document.querySelector('dialog[open]');
function guessKind(name, page) {
  if (/평가계획|수행평가|루브릭/.test(name)) return '평가계획서'; if (/운영표|진도표|교수학습/.test(name)) return '운영표'; if (/회의/.test(name)) return '회의록';
  if (/예산|집행|품의/.test(name)) return '예산'; if (/학사|일정/.test(name)) return '일정'; if (/계획/.test(name)) return '계획서'; if (/규정|지침/.test(name)) return '규정'; if (/공문|협조|안내/.test(name)) return '공문';
  return { eval: '평가계획서', budget: '예산', notes: '회의록', cal: '일정', class: '운영표' }[page] || '기타';
}
/* 파일 올리기 한 곳으로: 읽기 → 자료 아카이브 저장(원본 포함) → 반영할지 묻기. 못 읽어도 원본은 보관한다. */
async function ingestFiles(files, opt = {}) {
  const page = opt.from || archPage(), added = [];
  for (const f of files) {
    const id = uid(); let text = '', err = '';
    try { toast(f.name + ' 읽는 중…'); text = await readFile(f); } catch (e) { err = e.message || '읽지 못했습니다'; }
    LIB.push({ id, name: f.name, kind: opt.kind || guessKind(f.name, page), text, added: today(), from: page, size: f.size || 0, readErr: err });
    if (typeof keepFile === 'function') await keepFile(id, f);
    added.push(LIB[LIB.length - 1]);
    if (err) toast('「' + f.name + '」: ' + err + ' — 원본은 아카이브에 보관했습니다.');
  }
  await saveLib();
  const ok = added.filter(d => d.text && d.text.trim());
  if (added.length && !ok.length) { toast('보관했습니다. (글자는 읽지 못해 꿈송이 검색에는 빠집니다)'); render(); return added; }
  if (ok.length) toast('자료 아카이브에 보관했습니다. 꿈송이가 이제 이 자료도 찾습니다.');
  render();
  if (!opt.noAsk && ok.length === 1) setTimeout(() => reflectDialog(ok[0].text, ok[0].name, ok[0].kind), 250);
  return added;
}
/* 문서에서 찾은 내용을 어디에 반영할지 묻는 창 */
function reflectDialog(text, name, kind) {
  const dates = typeof ibxParse === 'function' ? ibxParse(text) : [], money = (text.match(/\d[\d,]{3,}\s*원/g) || []).length;
  const sched = /학사\s*일정|\d{1,2}\s*[./]\s*\d{1,2}\s*[~\-～]\s*\d/.test(text), tt = /교시/.test(text) && /(월|화|수|목|금)/.test(text), plan = /차시/.test(text);
  const opts = [];
  if (dates.length) opts.push(['ibx', `📅 일정·할 일·내 업무로 (${dates.length}건 찾음)`]);
  if (money >= 2) opts.push(['bud', `💰 예산 장부로 (금액 ${money}곳)`]);
  if (sched) opts.push(['sch', '🗓 학사일정으로 한꺼번에']);
  if (tt) opts.push(['tt', '⏰ 시간표로']);
  if (plan || kind === '운영표') opts.push(['plan', '📘 수업 교수학습 운영표로']);
  if (!opts.length) return;
  const d = document.createElement('dialog'); d.className = 'dlg';
  d.innerHTML = `<form method="dialog"><h3>「${esc(name)}」에서 찾았어요</h3><p class="mu">자료 아카이브에는 이미 보관했습니다. 아래 중 반영하고 싶은 곳을 누르세요. 반영 전에 미리보기에서 한 번 더 확인합니다.</p><div class="rfl">${opts.map(([k, t]) => `<button type="button" class="btn" data-rf="${k}">${t}</button>`).join('')}</div><div class="dlb"><button value="cancel" class="btn">반영 안 함</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('click', e => { const b = e.target.closest('[data-rf]'); if (!b) return; const k = b.dataset.rf; d.close(); setTimeout(() => {
    if (k === 'ibx') ibxPreview(dates); else if (k === 'bud') budgetDialog(text); else if (k === 'sch') scheduleDialog(text); else if (k === 'tt') ttDialog(text); else if (k === 'plan' && typeof planFromText === 'function') planFromText(text, name);
  }, 60); });
  d.addEventListener('close', () => d.remove()); d.showModal();
}
/* 어디서든 붙여넣기(Ctrl+V) / 끌어놓기 */
const inEditable = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
document.addEventListener('paste', e => {
  const cd = e.clipboardData; if (!cd || archBusy() || !S.setup) return;
  if (cd.files && cd.files.length) { e.preventDefault(); ingestFiles([...cd.files]); return; }
  const text = cd.getData('text/plain') || ''; if (inEditable(e.target) || text.trim().length < 40) return;
  e.preventDefault();
  const d = document.createElement('dialog'); d.className = 'dlg';
  d.innerHTML = `<form method="dialog"><h3>붙여넣은 글을 어떻게 할까요?</h3><p class="mu">${esc(text.trim().slice(0, 120))}…</p><div class="rfl"><button type="button" class="btn pri" data-pt="ibx">📅 일정·할 일·업무로 정리</button><button type="button" class="btn" data-pt="save">🗂 자료 아카이브에 글로 보관</button></div><div class="dlb"><button value="cancel" class="btn">취소</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('click', ev => { const b = ev.target.closest('[data-pt]'); if (!b) return; d.close();
    setTimeout(() => { if (b.dataset.pt === 'ibx') { const c = ibxParse(text); if (c.length) ibxPreview(c); else toast('일정이나 업무로 읽을 내용을 찾지 못했습니다.'); } else { const id = uid(), nm = '붙여넣은 글 ' + today() + ' ' + new Date().toTimeString().slice(0, 5); LIB.push({ id, name: nm, kind: '기타', text, added: today(), from: archPage(), size: text.length }); saveLib(); toast('아카이브에 보관했습니다.'); render(); } }, 60); });
  d.addEventListener('close', () => d.remove()); d.showModal();
});
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); document.body.classList.add('dropping'); } }));
document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
document.addEventListener('drop', e => { document.body.classList.remove('dropping'); if (!e.dataTransfer || !e.dataTransfer.files.length || !S.setup) return; e.preventDefault(); ingestFiles([...e.dataTransfer.files]); });
/* 자료 아카이브 페이지 */
UI.fq = ''; UI.ff = '';
function fileRow(d) {
  const kb = d.size ? (d.size > 1048576 ? (d.size / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(d.size / 1024)) + 'KB') : '';
  return `<details class="doc arc"><summary><b>${esc(d.name)}</b> <span class="chp k-일정">${esc(d.kind)}</span> <span class="chp k-학사">${esc(ARCH_PAGES[d.from] || '자료·연락')}</span> <span class="mu">${d.added}${kb ? ' · ' + kb : ''}${d.text ? '' : ' · 글자 못 읽음(원본만 보관)'}</span></summary>
  ${d.readErr ? `<p class="mu">읽기 안내: ${esc(d.readErr)}</p>` : ''}${d.text ? `<div class="rd">${readable(d.text.slice(0, 20000))}</div>` : ''}<div class="tools"><button class="btn sm pri" data-act="docOpen" data-id="${d.id}">📂 원본 열기</button>${d.text ? `<button class="btn sm" data-act="docBig" data-id="${d.id}">🔍 크게 보기</button><button class="btn sm" data-act="arcReflect" data-id="${d.id}">📅 일정·업무·예산에 반영</button>` : ''}${/\.(xlsx?|csv)$/i.test(d.name) ? `<button class="btn sm" data-act="docSheet" data-id="${d.id}">📊 표로 보기</button>` : ''}<button class="x" data-act="docDel" data-id="${d.id}">삭제</button></div></details>`;
}
function filesView() {
  const q = norm(UI.fq), f = UI.ff, L = [...LIB].reverse().filter(d => (!f || (d.from || 'lib') === f) && (!q || norm(d.name + d.kind + (d.text || '').slice(0, 2000)).includes(q)));
  const cnt = {}; LIB.forEach(d => cnt[d.from || 'lib'] = (cnt[d.from || 'lib'] || 0) + 1);
  return `<div class="bh"><h2>자료 아카이브</h2><span class="mu">여기서 올리거나 어느 화면에서든 올린 모든 파일이 모입니다. 원본도 함께 보관됩니다.</span></div>
  <div class="drop"><b>📎 한글·엑셀·PDF·워드 파일을 여기에 올리세요</b><p class="mu">어느 화면에서든 파일을 끌어다 놓거나 Ctrl+V로 붙여넣어도 됩니다. 올리면 일정·업무·예산에 반영할지 물어봅니다.</p>
  <div class="tools"><select id="arcKind" aria-label="자료 종류">${ARCH_KINDS.map(k => `<option>${k}</option>`).join('')}</select><label class="btn pri file">파일 올리기<input type="file" id="arcUp" accept=".txt,.csv,.md,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" multiple hidden></label></div></div>
  <input class="srch" id="arcQ" placeholder="파일 이름·종류·내용 검색" value="${esc(UI.fq)}" aria-label="아카이브 검색">
  <div class="clg2"><button class="chp ${f ? '' : 'on'}" data-act="arcF" data-f="">전체 ${LIB.length}</button>${Object.keys(cnt).map(k => `<button class="chp ${f === k ? 'on' : ''}" data-act="arcF" data-f="${k}">${esc(ARCH_PAGES[k] || k)} ${cnt[k]}</button>`).join('')}</div>
  ${L.map(fileRow).join('') || '<p class="mu">보관된 자료가 없습니다.</p>'}`;
}
/* 각 페이지 맨 아래에 "이 페이지 자료" 상자(올린 파일은 아카이브에도 같이 보관) */
function fileBox(page, kind) {
  const L = LIB.filter(d => (d.from || 'lib') === page).slice(-6).reverse();
  return `<h3 class="h3">이 화면의 자료 <span class="mu">(자료 아카이브에도 함께 보관됩니다)</span></h3><div class="tools"><label class="btn file">📎 파일 올리기<input type="file" data-fbup="${page}" data-fk="${kind || ''}" accept=".txt,.csv,.md,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" multiple hidden></label><a class="btn sm" href="#/files">자료 아카이브 전체 보기</a></div>${L.map(d => `<p class="fbl">📄 <b>${esc(d.name)}</b> <span class="mu">${esc(d.kind)} · ${d.added}</span> <button class="x" data-act="docOpen" data-id="${d.id}">원본 열기</button></p>`).join('')}`;
}
Object.assign(A, {
  arcF(el) { UI.ff = el.dataset.f; render(); },
  arcReflect(el) { const d = LIB.find(x => x.id === el.dataset.id); if (d) reflectDialog(d.text, d.name, d.kind) || null; }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'arcUp') { await ingestFiles([...t.files], { kind: $('#arcKind').value, from: 'files' }); t.value = ''; }
  else if (t.dataset && t.dataset.fbup) { await ingestFiles([...t.files], { from: t.dataset.fbup, kind: t.dataset.fk || undefined }); t.value = ''; }
}, true);
document.addEventListener('input', e => { if (e.target.id === 'arcQ') { UI.fq = e.target.value; const p = e.target.selectionStart; render(); const n = $('#arcQ'); if (n) { n.focus(); n.setSelectionRange(p, p); } } });

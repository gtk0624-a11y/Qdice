/* 일과표 파일 올리기 · 행사로 바뀐 하루 일과 붙여넣기(그날만 적용, 끝나면 원래 일과표로 자동 복귀) */
const bellOvs = () => (S.profile.bellOv = Array.isArray(S.profile.bellOv) ? S.profile.bellOv : []);
function bellFind(text, min) {
  const t = String(text).replace(/\|/g, ' ').replace(/[ \t]+/g, ' '), re = /(\d)\s*교\s*시[\s:]*(\d{1,2})\s*[:시]\s*(\d{2})?\s*분?\s*[~\-–∼]\s*(\d{1,2})\s*[:시]\s*(\d{2})?/g, got = {};
  let m; while ((m = re.exec(t))) { const p = +m[1], s = +m[2] * 60 + (+m[3] || 0), e = +m[4] * 60 + (+m[5] || 0); if (p >= 1 && p <= 9 && e > s && e - s < 150 && s >= 6 * 60 && s < 19 * 60 && !got[p]) got[p] = { p, s, e }; }
  const L = Object.values(got).sort((a, b) => a.p - b.p); return L.length >= (min || 1) ? L : [];
}
function bellLunch(text) { const m = String(text).match(/(?:점심|중식|급식)[^\d\n]{0,12}(\d{1,2})\s*[:시]\s*(\d{2})?\s*분?\s*[~\-–∼]\s*(\d{1,2})\s*[:시]\s*(\d{2})?/); return m ? [+m[1] * 60 + (+m[2] || 0), +m[3] * 60 + (+m[4] || 0)] : null; }
function bellDates(text) {
  const y = new Date().getFullYear(), out = []; const re = /(\d{1,2})\s*(?:\/|\.|월)\s*(\d{1,2})\s*(?:일)?/g; let m;
  while ((m = re.exec(text))) { const mo = +m[1], d = +m[2]; if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) out.push(`${y}-${pad(mo)}-${pad(d)}`); }
  if (/내일/.test(text) && !out.length) { const n = new Date(); n.setDate(n.getDate() + 1); out.push(`${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`); }
  return out.sort();
}
const bellLabel = t => { const m = String(t).match(/([가-힣A-Za-z0-9 ]{2,14}?)(?:으로 인한|로 인한|으로|로|관련|에 따른|때문에)[^\n]{0,6}(?:일과|수업|시정|시간)/); return (m && m[1].trim()) || (String(t).match(/(체육대회|축제|현장체험학습|체험학습|수련회|졸업식|입학식|시험|평가|단축수업|행사)/) || [])[1] || '변경 일과'; };
/* 하루 일과 적용: 오늘이 포함된 행사 일과가 있으면 그것을, 없으면 기본 일과표 */
function bellToday() { const t = today(); return bellOvs().find(o => o.from <= t && t <= o.to) || null; }
const _clkP0 = clkPeriods, _clkL0 = clkLunch;
clkPeriods = function () { const o = bellToday(), base = _clkP0(); if (!o) return base; let L = o.drop ? [] : base.map(x => ({ ...x })); o.bell.forEach(x => { const i = L.findIndex(y => y.p === x.p); if (i >= 0) L[i] = { ...x }; else L.push({ ...x }); }); return L.sort((a, b) => a.s - b.s); };
clkLunch = function (P) { const o = bellToday(); return o && o.lunch ? o.lunch : _clkL0(P); };
periodInfo = function () { const now = new Date(), mins = now.getHours() * 60 + now.getMinutes(); let cur = 0, next = 0; clkPeriods().forEach(x => { if (mins >= x.s && mins < x.e) cur = x.p; else if (mins < x.s && !next) next = x.p; }); return { dow: now.getDay(), cur, next }; };
const _clkS0 = clkState;
clkState = function () { const s = _clkS0(), o = bellToday(); if (o) s.sub = '[' + (o.label || '행사 일과') + '] ' + s.sub; return s; };
function bellPrune() { const t = today(), L = bellOvs(), n = L.filter(o => o.to >= t); if (n.length !== L.length) { S.profile.bellOv = n; save(); } }
/* 붙여넣은/올린 글 하나로 처리: 행사 일과(그날만) 또는 기본 일과표(영구) */
function bellFlow(text, name) {
  const L = bellFind(text, 1); if (!L.length) return toast('「1교시 09:00~09:40」처럼 교시와 시각이 적힌 내용을 찾지 못했습니다.');
  const lunch = bellLunch(text), ds = bellDates(text), ev = /행사|체육대회|축제|체험|수련회|단축|변경|조정|임시|졸업|입학|시험|평가/.test(text) || ds.length > 0 || L.length < 4;
  const from = ds[0] || today(), to = ds[ds.length - 1] || from, drop = L.length >= 4;
  const d = document.createElement('dialog'); d.className = 'dlg';
  d.innerHTML = `<form method="dialog"><h3>${L.length}개 교시의 시각을 찾았습니다</h3><table class="tbl"><tbody>${L.map(x => `<tr><td>${x.p}교시</td><td>${clkHM(x.s)} ~ ${clkHM(x.e)}</td></tr>`).join('')}${lunch ? `<tr><td>급식</td><td>${clkHM(lunch[0])} ~ ${clkHM(lunch[1])}</td></tr>` : ''}</tbody></table>
  <fieldset class="bfs"><legend>어떻게 적용할까요?</legend>
  <label class="chk"><input type="radio" name="mode" value="ev" ${ev ? 'checked' : ''}> <b>행사 일과 — 그날만</b> (끝나면 원래 일과표로 자동 복귀)</label>
  <div class="row2c"><label>시작일 <input type="date" name="from" value="${from}"></label><label>끝나는 날 <input type="date" name="to" value="${to}"></label><label>이름 <input name="label" value="${esc(bellLabel(text))}" size="10"></label></div>
  <label class="chk"><input type="checkbox" name="drop" ${drop ? 'checked' : ''}> 적지 않은 교시는 없는 것으로 (끄면 그 교시는 원래 시각 유지)</label>
  <label class="chk"><input type="radio" name="mode" value="base" ${ev ? '' : 'checked'}> <b>기본 일과표 자체를 바꾸기</b> (계속 적용)</label></fieldset>
  <div class="btns"><button value="ok" class="pri">적용</button><button value="cancel">취소</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => { if (d.returnValue === 'ok') { const f = new FormData(d.querySelector('form')); if (f.get('mode') === 'base') { if (L.length >= 3) { applyBell(L); S.profile.lunchS = lunch ? clkHM(lunch[0]) : S.profile.lunchS; S.profile.lunchE = lunch ? clkHM(lunch[1]) : S.profile.lunchE; commit(); toast('기본 일과표를 바꿨습니다.'); } else toast('기본 일과표는 3교시 이상 시각이 있어야 바꿀 수 있어요. "행사 일과"로 적용해 보세요.'); }
    else { const fr = f.get('from') || today(), to2 = f.get('to') || fr; bellOvs().push({ id: uid(), from: fr, to: to2 < fr ? fr : to2, label: f.get('label') || '행사 일과', bell: L, lunch, drop: !!f.get('drop') }); S.profile.clock = true; commit(); clkDraw(); toast(`${md(fr)}${to2 > fr ? '~' + md(to2) : ''} 행사 일과를 적용했습니다. 끝나면 원래 일과표로 돌아옵니다.`); } } d.remove(); }); d.showModal();
}
Object.assign(A, {
  bellPaste() { ask('일과 변경 내용 붙여넣기', [{ k: 'text', label: '메신저·공문의 내용을 그대로 붙여 넣으세요 (예: 11/25 체육대회 1교시 09:00~09:40 …)', type: 'textarea', rows: 9, req: 1 }], o => bellFlow(o.text)); },
  bellOvDel(el) { S.profile.bellOv = bellOvs().filter(o => o.id !== el.dataset.id); commit(); clkDraw(); }
});
document.addEventListener('change', async e => {
  const t = e.target; if (!(t.dataset && t.dataset.bellup !== undefined)) return;
  const f = t.files[0]; t.value = ''; if (!f) return;
  const added = await ingestFiles([f], { from: 'set', kind: '일과표', noAsk: true }), dd = added[0];
  if (!dd || !dd.text) return toast('일과표 글자를 읽지 못했습니다. 원본은 아카이브에 보관했고, "붙여넣기"를 쓰면 됩니다.');
  const L = extractBell(dd.text) || [];
  if (L.length >= 3) { applyBell(L); const lu = bellLunch(dd.text); if (lu) { S.profile.lunchS = clkHM(lu[0]); S.profile.lunchE = clkHM(lu[1]); } S.profile.clock = true; commit(); clkDraw(); toast(`일과표 ${L.length}개 교시를 그대로 적용했습니다.`); } else bellFlow(dd.text, dd.name);
}, true);
bellPrune(); setInterval(bellPrune, 600000);
/* 설정의 시계 카드에 버튼·행사 목록 덧붙이기 */
const _decoCard0 = decoCard;
decoCard = function () {
  let h = _decoCard0(); const ov = bellOvs().slice().sort((a, b) => a.from.localeCompare(b.from));
  const box = `<div class="dset bellbox"><b>일과표 바꾸기</b><div class="row2c"><label class="btn sm pri file">📄 일과표 파일 올리기(한글·엑셀·PDF)<input type="file" data-bellup accept=".txt,.csv,.xlsx,.xls,.pdf,.hwp,.hwpx,.docx" hidden></label><button class="btn sm" data-act="bellPaste">🎪 행사로 일과가 바뀌었어요(붙여넣기)</button></div><p class="mu">파일을 올리면 기본 일과표가 그대로 바뀝니다. 행사 일과는 메시지를 붙여 넣으면 그날만 적용되고, 끝나면 자동으로 원래 일과표로 돌아옵니다.</p>${ov.map(o => `<p class="fbl">🎪 <b>${esc(o.label)}</b> ${md(o.from)}${o.to > o.from ? '~' + md(o.to) : ''} · ${o.bell.length}개 교시 <button class="x" data-act="bellOvDel" data-id="${o.id}">삭제</button></p>`).join('')}</div>`;
  return h.replace('<div class="dset"><label class="chk"><input type="checkbox" data-dset="deco.on"', box + '<div class="dset"><label class="chk"><input type="checkbox" data-dset="deco.on"');
};

/* 시계(교시·급식 알림) · 다꾸(사진 배경·꾸미기) · 격려 문구 500개 · 설정 카드 */
const CHEER = { length: 500 };   /* 하위 호환 */
const CHEER_KIND = { mix: '명언·격언·위로 섞어서', q: '명언만', g: '격언만', c: '위로의 글만' };
const cheerPick = (shift = 0) => {
  const d = new Date(), day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5), seed = (d.getFullYear() - 2020) * 366 + day;
  let k = S.profile.cheerKind || 'mix'; const sh = shift || 0;
  if (!CHEER_KIND[k]) k = 'mix';
  if (k === 'mix') k = ['q', 'g', 'c'][((seed + sh) % 3 + 3) % 3];
  const arr = k === 'q' ? QT_Q : k === 'g' ? QT_G : QT_C, n = arr.length;
  const i = ((Math.floor(seed / (S.profile.cheerKind === 'mix' || !S.profile.cheerKind ? 3 : 1)) * 7 + sh * 13 + 137) % n + n) % n;   /* 7과 500은 서로소 → 500일 동안 같은 글이 겹치지 않음 */
  const it = arr[i];
  return k === 'c' ? it : '「' + it[0] + '」 — ' + it[1];
};
let _cheerShift = 0;
/* ---------- 시계 ---------- */
function clkPeriods() { const p = S.profile; if (p.bell && p.bell.length) return p.bell.map(x => ({ p: x.p, s: x.s, e: x.e })).sort((a, b) => a.s - b.s); const [h, m] = (p.start || '09:00').split(':').map(Number), st = h * 60 + m, L = []; for (let i = 1; i <= 7; i++) { const a = st + (i - 1) * (+p.classMin + +p.breakMin); L.push({ p: i, s: a, e: a + +p.classMin }); } return L; }
const clkHM = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const clkParse = s => { const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
function clkLunch(P) { const p = S.profile, a = clkParse(p.lunchS), b = clkParse(p.lunchE); if (a != null && b != null) return [a, b]; let best = null; for (let i = 0; i + 1 < P.length; i++) { const g = P[i + 1].s - P[i].e; if (g >= 30 && (!best || g > best[1] - best[0])) best = [P[i].e, P[i + 1].s]; } return best || [12 * 60 + 40, 13 * 60 + 30]; }
function clkState() {
  const n = new Date(), mins = n.getHours() * 60 + n.getMinutes(), dow = n.getDay(), P = clkPeriods(), L = clkLunch(P);
  if (dow === 0 || dow === 6) return { big: '주말입니다', sub: '푹 쉬세요 🌿', cls: 'we' };
  if (mins >= L[0] && mins < L[1]) return { big: '급식시간입니다', sub: `${clkHM(L[0])}~${clkHM(L[1])} · 맛있게 드세요 🍚`, cls: 'lunch' };
  const cur = P.find(x => mins >= x.s && mins < x.e);
  if (cur) { const my = S.timetable[dow + '-' + cur.p]; return { big: `지금은 ${cur.p}교시입니다`, sub: `${clkHM(cur.s)}~${clkHM(cur.e)} · ${cur.e - mins}분 남음${my ? ' · 내 수업 ' + my : ' · 수업 없음(업무 시간)'}`, cls: my ? 'cls' : 'free' }; }
  const nx = P.find(x => x.s > mins);
  if (nx && mins >= P[0].s) { const prev = [...P].reverse().find(x => x.e <= mins), my = S.timetable[dow + '-' + nx.p]; return { big: '쉬는 시간입니다', sub: `${clkHM(nx.s)} ${nx.p}교시 시작(${nx.s - mins}분 뒤)${my ? ' · ' + my : ''}`, cls: 'brk' }; }
  if (nx) return { big: '수업 전입니다', sub: `${nx.p}교시는 ${clkHM(nx.s)}에 시작해요`, cls: 'pre' };
  return { big: '수업이 모두 끝났어요', sub: '오늘도 수고하셨습니다 🌙', cls: 'end' };
}
/* 퇴근 타이머(선택): 퇴근 시각 N분 전부터 시계에 남은 시간을 초 단위로 보여 줍니다 */
function clkOffTxt() {
  const p = S.profile; if (!p.offOn) return ''; const n = new Date(), dow = n.getDay(); if (dow === 0 || dow === 6) return '';
  const t = clkParse(p.offT || '16:40'); if (t == null) return ''; const win = +(p.offMin || 20), now = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds(), left = t * 60 - now;
  if (left <= win * 60 && left > 0) return '🏃 퇴근까지 ' + String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
  if (left <= 0 && left > -300) return '🎉 퇴근 시간입니다! 수고하셨어요';
  return '';
}
const clkOffHtml = () => { const t = clkOffTxt(); return t ? `<div class="co">${esc(t)}</div>` : ''; };
setInterval(() => { const e = document.querySelector('#tfclock .co'), t = clkOffTxt(); if (e && t) e.textContent = t; else if (!!e !== !!t) clkDraw(); }, 1000);
function clkDraw() {
  let el = document.getElementById('tfclock'); const on = S.setup && S.profile.clock !== false; document.body.classList.toggle('hasclk', !!on);
  if (!on) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'tfclock'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  const n = new Date(), st = clkState();
  el.className = 'clk-' + st.cls; const _h = `<div class="ct">${clkHM(n.getHours() * 60 + n.getMinutes())}</div><div class="cd2">${n.getMonth() + 1}월 ${n.getDate()}일 (${DOW[n.getDay()]})</div><div class="cb">${esc(st.big)}</div><div class="cs">${esc(st.sub)}</div>${clkOffHtml()}${S.profile.cheerClk ? `<div class="cc">💌 ${esc(cheerPick(_cheerShift))}</div>` : ''}`; if (el.__h !== _h) { el.__h = _h; el.innerHTML = _h; } document.body.classList.toggle('hascc', !!S.profile.cheerClk);
}
setInterval(clkDraw, 15000);
/* ---------- 다꾸 ---------- */
const WASHI = { pink: '분홍 빗금', yellow: '노랑 체크', sky: '하늘 물방울', mint: '민트 세로줄', purple: '보라 지그재그', kraft: '크라프트 종이', orange: '주황 점선', navy: '남색 가로줄' };
const DEC = () => { const d = (S.profile.deco = S.profile.deco || { on: false, dim: 70, blur: 2, washi: '', stick: false }); if (d.washi === true) d.washi = 'pink'; else if (!d.washi || !WASHI[d.washi]) d.washi = ''; return d; };
async function decoApply() {
  const d = DEC(), b = document.body; b.classList.toggle('deco-on', !!d.on); b.classList.toggle('deco-stick', !!(d.on && d.stick)); b.classList.toggle('deco-washi', !!d.washi); if (d.washi) b.dataset.wt = d.washi; else delete b.dataset.wt;
  let st = document.getElementById('decoCss'); if (!st) { st = document.createElement('style'); st.id = 'decoCss'; document.head.appendChild(st); }
  let url = ''; if (d.on) { try { url = (await idb.get('deco')) || ''; } catch (e) { } }
  st.textContent = d.on ? `:root{--decoA:${(+d.dim || 70) / 100}}${url ? `body.deco-on::before{background-image:url("${url}");filter:blur(${+d.blur || 0}px)}` : ''}` : '';
}
function decoPhoto(file) {
  return new Promise((res, rej) => { const im = new Image(), u = URL.createObjectURL(file); im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.75)); }; im.onerror = () => rej(new Error('사진을 읽지 못했습니다')); im.src = u; });
}
/* ---------- 설정 카드 · 오늘 격려 ---------- */
function decoCard() {
  const p = S.profile, d = DEC(), cm = p.cheer || 'off';
  return `<section class="decoset"><h3 class="h3">⏰ 시계 · 🎨 꾸미기 · 💌 격려 (선택)</h3>
  <div class="dset"><label class="chk"><input type="checkbox" data-dset="clock" ${p.clock !== false ? 'checked' : ''}> <b>시계 보이기</b> — 일과표 기준으로 "지금은 3교시입니다 / 급식시간입니다"를 알려 줘요. 컴퓨터는 화면 오른쪽, 폰·태블릿은 화면 위쪽에 맞춰 나옵니다.</label>
  <div class="row2c"><label>급식 시작 <input type="time" data-dset="lunchS" value="${esc(p.lunchS || '')}"></label><label>급식 끝 <input type="time" data-dset="lunchE" value="${esc(p.lunchE || '')}"></label><span class="mu">비워 두면 일과표에서 가장 긴 쉬는 시간을 급식으로 봅니다.</span></div></div>
  <div class="dset"><label class="chk"><input type="checkbox" data-dset="deco.on" ${d.on ? 'checked' : ''}> <b>꾸미기(다꾸) 켜기</b> — 우리 반 단체사진 같은 사진을 배경으로 깝니다. 글씨는 반투명 종이 위에 놓여서 사진 때문에 읽기 어렵지 않아요.</label>
  <div class="row2c"><label class="btn sm file">📷 배경 사진 고르기<input type="file" accept="image/*" data-decophoto hidden></label><button class="x" data-act="decoPhotoDel">사진 지우기</button></div>
  <div class="row2c"><label>글씨 보호막(종이 불투명도) <input type="range" min="55" max="100" step="5" data-dset="deco.dim" value="${d.dim}"> <b>${d.dim}%</b></label><label>사진 흐림 <input type="range" min="0" max="12" data-dset="deco.blur" value="${d.blur}"></label></div>
  <div class="row2c"><label class="chk"><input type="checkbox" data-dset="deco.stick" ${d.stick ? 'checked' : ''}> 모서리 스티커</label></div></div>
  <div class="dset"><b>🎀 마스킹테이프 제목</b> <span class="mu">(제목 뒤에 깔리는 띠 · 사진 꾸미기와 별개로 쓸 수 있어요)</span><div class="row2c"><select data-dset="deco.washi" aria-label="마스킹테이프 종류"><option value="" ${!d.washi ? 'selected' : ''}>사용 안 함</option>${Object.keys(WASHI).map(k => `<option value="${k}" ${d.washi === k ? 'selected' : ''}>${WASHI[k]}</option>`).join('')}</select><span class="wpv" data-wt="${d.washi || ''}">${d.washi ? '미리보기' : ''}</span></div></div>
  <div class="dset"><b>🏃 퇴근 타이머</b> <span class="mu">(선택 · 시계에 퇴근까지 남은 시간이 초 단위로 나옵니다 · 평일만)</span><div class="row2c"><label class="chk"><input type="checkbox" data-dset="offOn" ${p.offOn ? 'checked' : ''}> 퇴근 타이머 켜기</label><label>퇴근 시각 <input type="time" data-dset="offT" value="${esc(p.offT || '16:40')}"></label><label>몇 분 전부터 <select data-dset="offMin">${[10, 20, 30, 60].map(n => `<option value="${n}" ${(+p.offMin || 20) === n ? 'selected' : ''}>${n}분 전</option>`).join('')}</select></label></div></div>
  ${typeof bootCard === 'function' ? bootCard() : ''}
  <div class="dset"><b>오늘의 한마디</b> <span class="mu">(명언 500 · 격언 500 · 위로의 글 500 중 매일 하나씩, 출처 함께 표시)</span><div class="row2c"><select data-dset="cheer" aria-label="격려의 말 표시"><option value="off" ${cm === 'off' ? 'selected' : ''}>표시 안 함</option><option value="today" ${cm === 'today' ? 'selected' : ''}>오늘 화면 맨 위에 표시</option></select></div><div class="row2c"><select data-dset="cheerKind" aria-label="한마디 종류">${Object.keys(CHEER_KIND).map(k => `<option value="${k}" ${(p.cheerKind || 'mix') === k ? 'selected' : ''}>${CHEER_KIND[k]}</option>`).join('')}</select></div><div class="row2c"><label class="chk"><input type="checkbox" data-dset="cheerClk" ${p.cheerClk ? 'checked' : ''}> 시계에도 한마디 넣기 <span class="mu">(위 선택과 함께 둘 다 켤 수 있어요 · 시계 보이기가 켜져 있어야 보입니다)</span></label></div></div></section>`;
}
function decoInject() {
  const h = location.hash || '#/today', main = document.querySelector('#app main'); if (!main || !S.setup) return;
  if (/^#\/set/.test(h) && !main.querySelector('.decoset')) { const bh = main.querySelector('.bh'), w = document.createElement('div'); w.innerHTML = decoCard(); bh ? bh.after(w.firstChild) : main.prepend(w.firstChild); }
  if (/^#\/(today)?$/.test(h) || h === '#/' || h === '') { const on = (S.profile.cheer || 'off') === 'today', ex = main.querySelector('.cheer'); if (on && !ex) { const c = document.createElement('div'); c.className = 'cheer'; c.innerHTML = `<span>💌 ${esc(cheerPick(_cheerShift))}</span><button class="x" data-act="cheerNext" aria-label="다른 말">다른 말</button>`; main.prepend(c); } else if (!on && ex) ex.remove(); }
  if (/^#\/set/.test(h) && typeof setFold2 === 'function') { setFold(); setFold2(); }
}
new MutationObserver(() => { decoInject(); }).observe(document.getElementById('app'), { childList: true, subtree: true });
window.addEventListener('hashchange', () => setTimeout(decoInject, 30));
Object.assign(A, {
  cheerNext() { _cheerShift++; const c = document.querySelector('.cheer span'); if (c) c.textContent = '💌 ' + cheerPick(_cheerShift); clkDraw(); },
  decoPhotoDel() { idb.del('deco').then(() => { decoApply(); toast('배경 사진을 지웠습니다.'); }); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset && t.dataset.decophoto !== undefined) { const f = t.files[0]; t.value = ''; if (!f) return; try { await idb.set('deco', await decoPhoto(f)); DEC().on = true; save(); await decoApply(); toast('배경 사진을 적용했습니다. 글씨가 안 읽히면 "글씨 보호막"을 올려 보세요.'); render(); } catch (er) { toast(er.message); } return; }
  const k = t.dataset && t.dataset.dset; if (!k) return;
  const v = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value;
  if (k.startsWith('deco.')) DEC()[k.slice(5)] = v; else S.profile[k] = v;
  save(); if (k === 'cheer' || k === 'cheerKind') { const o = document.querySelector('#app main .cheer'); if (o) o.remove(); } if (k.startsWith('deco')) await decoApply(); if (k === 'deco.washi') { const pv = document.querySelector('.wpv'); if (pv) { pv.dataset.wt = v; pv.textContent = v ? '미리보기' : ''; } } clkDraw(); if (k === 'deco.dim') { const b = t.parentNode.querySelector('b'); if (b) b.textContent = v + '%'; } decoInject();
}, true);
document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.dset === 'deco.dim') { DEC().dim = +t.value; document.documentElement.style.setProperty('--decoA', t.value / 100); const b = t.parentNode.querySelector('b'); if (b) b.textContent = t.value + '%'; } });
if (S.setup) { decoApply(); clkDraw(); decoInject(); }
const _r0 = TF.render; TF.render = function () { const v = _r0.apply(this, arguments); clkDraw(); decoInject(); return v; };

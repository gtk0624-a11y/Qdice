/* 시계(교시·급식 알림) · 다꾸(사진 배경·꾸미기) · 격려 문구 500개 · 설정 카드 */
const CH_A = ['오늘도 교실 문을 여는 선생님의 발걸음이 누군가에게는 하루의 시작입니다.', '아이들은 선생님이 가르친 내용보다 선생님이 건넨 한마디를 더 오래 기억합니다.', '완벽한 수업이 아니어도 괜찮습니다. 준비한 마음은 아이들에게 전해집니다.', '쌓이는 업무 속에서도 수업을 놓지 않는 선생님이 학교의 중심입니다.', '오늘 해낸 작은 일들이 모여 한 학기가 됩니다.', '지치는 날이 있다는 건 그만큼 진심으로 일하고 있다는 뜻입니다.', '선생님이 웃으면 교실 온도가 1도쯤 올라갑니다.', '모든 아이를 다 바꿀 수는 없어도, 한 아이에게는 평생의 선생님이 될 수 있습니다.', '답이 보이지 않는 날에도 질문을 멈추지 않는 선생님이 멋집니다.', '지금 미뤄 둔 일은 내일의 선생님이 잘 해낼 겁니다.', '공문이 쏟아지는 날에도 수업 한 시간은 반드시 아이들의 것입니다.', '하루를 무사히 보낸 것만으로도 충분히 잘하고 있습니다.', '선생님의 한 줄 칭찬이 어떤 아이의 한 달을 바꿉니다.', '실수했다면 그 덕분에 다음 수업이 더 좋아질 차례입니다.', '쉬는 시간에 물 한 모금 마시는 것도 훌륭한 업무의 일부입니다.', '선생님의 노력은 지금 보이지 않아도 어딘가에서 싹트고 있습니다.', '아이들은 완벽한 어른이 아니라 진심인 어른을 믿습니다.', '오늘 힘들었다면 내일은 그 경험이 선생님의 노련함이 됩니다.', '바쁜 중에도 아이의 이름을 불러 주는 사람, 그게 선생님입니다.', '모든 일을 한 번에 끝내려 하지 않아도 됩니다. 한 줄씩 지워 가면 됩니다.', '수업이 마음 같지 않았던 날은 다음 수업의 아이디어가 태어나는 날입니다.', '선생님이 건네는 "괜찮아"가 누군가에게는 오늘 들은 유일한 위로일 수 있습니다.', '학교가 돌아가는 건 보이지 않는 곳에서 애쓰는 선생님들 덕분입니다.', '지금 하는 고민은 좋은 선생님이 되려는 사람만 하는 고민입니다.', '오늘의 한 걸음이 내일 아이들이 걸을 길을 만듭니다.', '서두르지 않아도 됩니다. 좋은 수업은 천천히 익습니다.', '오늘도 아이들 앞에 서는 용기를 낸 선생님, 정말 대단합니다.', '해야 할 일이 많다는 건 그만큼 믿고 맡기는 사람이라는 뜻입니다.', '선생님의 미소 한 번이 교실의 긴장을 풀어 줍니다.', '아무도 알아주지 않아도 선생님의 정성은 아이들 마음에 남습니다.', '오늘 배운 한 가지가 있다면 그것으로 성장한 하루입니다.', '체력도 실력입니다. 오늘은 조금 일찍 쉬어도 좋습니다.', '아이들의 "선생님!" 한마디에는 수많은 마음이 담겨 있습니다.', '마감이 겹쳐도 하나씩 풀면 반드시 끝이 납니다.', '선생님이 지켜 온 원칙은 아이들에게 말없는 수업이 됩니다.', '좋은 질문 하나를 던진 오늘 수업, 이미 성공입니다.', '잘 안 풀린 하루라도 선생님의 가치는 줄어들지 않습니다.', '회의가 길어진 날에도 아이들 얼굴을 떠올리면 힘이 납니다.', '한 번 더 설명해 주는 인내가 아이의 이해를 완성합니다.', '선생님이 아이들에게 주는 가장 큰 선물은 믿어 주는 눈빛입니다.', '오늘의 피곤함은 최선을 다했다는 증거입니다.', '변화는 느리지만 선생님의 수업은 분명히 아이들을 자라게 합니다.', '완성된 계획서보다 시작한 선생님이 먼저 이깁니다.', '선생님의 하루는 기록되지 않아도 아이들의 삶에 기록됩니다.', '오늘도 학교에 와 준 것만으로 아이들에게는 안심이 됩니다.', '어려운 학생 앞에서 포기하지 않는 마음이 가장 훌륭한 교육입니다.', '업무는 쌓여도 선생님의 열정은 닳지 않습니다.', '잠깐 창밖을 보는 여유도 좋은 수업을 위한 준비입니다.', '선생님이 배우는 자세를 보이면 아이들도 배우는 사람이 됩니다.', '지금까지 잘해 왔고, 앞으로도 잘할 선생님입니다.'];
const CH_B = ['오늘도 응원합니다.', '충분히 잘하고 계십니다.', '잠깐 숨 고르고 가셔도 괜찮습니다.', '선생님 덕분에 학교가 따뜻합니다.', '오늘의 수고, 꿈송이가 기억할게요.', '한 가지만 끝내도 오늘은 성공입니다.', '무리하지 말고 천천히 가요.', '선생님은 이미 좋은 선생님입니다.', '내일은 오늘보다 한결 가벼울 거예요.', '힘내세요, 꿈송이가 곁에 있어요!'];
const CHEER = []; CH_A.forEach(a => CH_B.forEach(b => CHEER.push(a + ' ' + b)));   /* 50 × 10 = 500 */
const cheerPick = (shift = 0) => { const d = new Date(), seed = d.getFullYear() * 400 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); return CHEER[((seed * 37 + shift * 101) % CHEER.length + CHEER.length) % CHEER.length]; };
let _cheerShift = 0;
/* ---------- 시계 ---------- */
function clkPeriods() { const p = S.profile; if (p.bell && p.bell.length) return p.bell.map(x => ({ p: x.p, s: x.s, e: x.e })).sort((a, b) => a.s - b.s); const [h, m] = (p.start || '09:00').split(':').map(Number), st = h * 60 + m, L = []; for (let i = 1; i <= 7; i++) { const a = st + (i - 1) * (+p.classMin + +p.breakMin); L.push({ p: i, s: a, e: a + +p.classMin }); } return L; }
const clkHM = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const clkParse = s => { const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
function clkLunch(P) { const p = S.profile, a = clkParse(p.lunchS), b = clkParse(p.lunchE); if (a != null && b != null) return [a, b]; let best = null; for (let i = 0; i + 1 < P.length; i++) { const g = P[i + 1].s - P[i].e; if (g >= 30 && (!best || g > best[1] - best[0])) best = [P[i].e, P[i + 1].s]; } return best || [12 * 60 + 30, 13 * 60 + 20]; }
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
function clkDraw() {
  let el = document.getElementById('tfclock'); const on = S.setup && S.profile.clock; document.body.classList.toggle('hasclk', !!on);
  if (!on) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'tfclock'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  const n = new Date(), st = clkState();
  el.className = 'clk-' + st.cls; el.innerHTML = `<div class="ct">${clkHM(n.getHours() * 60 + n.getMinutes())}</div><div class="cd2">${n.getMonth() + 1}월 ${n.getDate()}일 (${DOW[n.getDay()]})</div><div class="cb">${esc(st.big)}</div><div class="cs">${esc(st.sub)}</div>${S.profile.cheerClk ? `<div class="cc">💌 ${esc(cheerPick(_cheerShift))}</div>` : ''}`; document.body.classList.toggle('hascc', !!S.profile.cheerClk);
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
  <div class="dset"><label class="chk"><input type="checkbox" data-dset="clock" ${p.clock ? 'checked' : ''}> <b>시계 보이기</b> — 일과표 기준으로 "지금은 3교시입니다 / 급식시간입니다"를 알려 줘요. 컴퓨터는 화면 오른쪽, 폰·태블릿은 화면 위쪽에 맞춰 나옵니다.</label>
  <div class="row2c"><label>급식 시작 <input type="time" data-dset="lunchS" value="${esc(p.lunchS || '')}"></label><label>급식 끝 <input type="time" data-dset="lunchE" value="${esc(p.lunchE || '')}"></label><span class="mu">비워 두면 일과표에서 가장 긴 쉬는 시간을 급식으로 봅니다.</span></div></div>
  <div class="dset"><label class="chk"><input type="checkbox" data-dset="deco.on" ${d.on ? 'checked' : ''}> <b>꾸미기(다꾸) 켜기</b> — 우리 반 단체사진 같은 사진을 배경으로 깝니다. 글씨는 반투명 종이 위에 놓여서 사진 때문에 읽기 어렵지 않아요.</label>
  <div class="row2c"><label class="btn sm file">📷 배경 사진 고르기<input type="file" accept="image/*" data-decophoto hidden></label><button class="x" data-act="decoPhotoDel">사진 지우기</button></div>
  <div class="row2c"><label>글씨 보호막(종이 불투명도) <input type="range" min="55" max="100" step="5" data-dset="deco.dim" value="${d.dim}"> <b>${d.dim}%</b></label><label>사진 흐림 <input type="range" min="0" max="12" data-dset="deco.blur" value="${d.blur}"></label></div>
  <div class="row2c"><label class="chk"><input type="checkbox" data-dset="deco.stick" ${d.stick ? 'checked' : ''}> 모서리 스티커</label></div></div>
  <div class="dset"><b>🎀 마스킹테이프 제목</b> <span class="mu">(제목 뒤에 깔리는 띠 · 사진 꾸미기와 별개로 쓸 수 있어요)</span><div class="row2c"><select data-dset="deco.washi" aria-label="마스킹테이프 종류"><option value="" ${!d.washi ? 'selected' : ''}>사용 안 함</option>${Object.keys(WASHI).map(k => `<option value="${k}" ${d.washi === k ? 'selected' : ''}>${WASHI[k]}</option>`).join('')}</select><span class="wpv" data-wt="${d.washi || ''}">${d.washi ? '미리보기' : ''}</span></div></div>
  <div class="dset"><b>격려의 말</b> <span class="mu">(${CHEER.length}개 중 하루에 하나)</span><div class="row2c"><select data-dset="cheer" aria-label="격려의 말 표시"><option value="off" ${cm === 'off' ? 'selected' : ''}>표시 안 함</option><option value="today" ${cm === 'today' ? 'selected' : ''}>오늘 화면 맨 위에 표시</option></select></div><div class="row2c"><label class="chk"><input type="checkbox" data-dset="cheerClk" ${p.cheerClk ? 'checked' : ''}> 시계에도 격려의 말 넣기 <span class="mu">(위 선택과 함께 둘 다 켤 수 있어요 · 시계 보이기가 켜져 있어야 보입니다)</span></label></div></div></section>`;
}
function decoInject() {
  const h = location.hash || '#/today', main = document.querySelector('#app main'); if (!main || !S.setup) return;
  if (/^#\/set/.test(h) && !main.querySelector('.decoset')) { const bh = main.querySelector('.bh'), w = document.createElement('div'); w.innerHTML = decoCard(); bh ? bh.after(w.firstChild) : main.prepend(w.firstChild); }
  if (/^#\/(today)?$/.test(h) || h === '#/' || h === '') { const on = (S.profile.cheer || 'off') === 'today', ex = main.querySelector('.cheer'); if (on && !ex) { const c = document.createElement('div'); c.className = 'cheer'; c.innerHTML = `<span>💌 ${esc(cheerPick(_cheerShift))}</span><button class="x" data-act="cheerNext" aria-label="다른 말">다른 말</button>`; main.prepend(c); } else if (!on && ex) ex.remove(); }
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
  save(); if (k === 'cheer') { const o = document.querySelector('#app main .cheer'); if (o) o.remove(); } if (k.startsWith('deco')) await decoApply(); if (k === 'deco.washi') { const pv = document.querySelector('.wpv'); if (pv) { pv.dataset.wt = v; pv.textContent = v ? '미리보기' : ''; } } clkDraw(); if (k === 'deco.dim') { const b = t.parentNode.querySelector('b'); if (b) b.textContent = v + '%'; } decoInject();
}, true);
document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.dset === 'deco.dim') { DEC().dim = +t.value; document.documentElement.style.setProperty('--decoA', t.value / 100); const b = t.parentNode.querySelector('b'); if (b) b.textContent = t.value + '%'; } });
if (S.setup) { decoApply(); clkDraw(); decoInject(); }
const _r0 = TF.render; TF.render = function () { const v = _r0.apply(this, arguments); clkDraw(); decoInject(); return v; };

/* 다꾸 스티커: 테이프·라벨(직접 그림) + 이모지 1000개 이상 + 내가 올린 그림.
   붙이는 곳: 캘린더 날짜, 내 페이지 '스티커' 블록. */
let MYSTK = [];
idb.get('mystk').then(v => { MYSTK = v || []; }).catch(() => {});
const saveMy = () => idb.set('mystk', MYSTK);
const svgUri = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
const TAPEC = ['#F7B6C8', '#FBD38D', '#FFF08A', '#B7E4C7', '#A5D8F3', '#CBB8F0', '#F4C2A1', '#D9D9D9', '#FF9AA2', '#9AD1D4', '#E8B4F0', '#C7E36B'];
const LABELS = ['D-DAY', 'TODO', '중요!', '시험', '행사', '회의', '연수', '마감', 'OK', '♥', '공문', '수행평가', '예산', '칭찬', '오늘의 한마디', '휴일', '준비물', '제출', '확인', '메모'];
const MADE = [];
TAPEC.forEach((c, i) => MADE.push(['t:tp' + i, svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="34" viewBox="0 0 120 34"><path d="M3 2l4 3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4 3h110l-4-3 4-3-4-3 4-3-4-3 4-3-4-3 4-3-4-3 4-3z" fill="${c}" fill-opacity=".85" transform="scale(1,.9) translate(0,1)"/></svg>`)]));
LABELS.forEach((t, i) => { const c = TAPEC[(i * 5) % 12], big = t.length > 4; MADE.push(['t:lb' + i, svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${big ? 150 : 110}" height="44" viewBox="0 0 ${big ? 150 : 110} 44"><rect x="2" y="3" width="${big ? 146 : 106}" height="38" rx="${i % 2 ? 19 : 8}" fill="${c}" stroke="#4a3b32" stroke-width="2.5" ${i % 3 === 0 ? 'stroke-dasharray="6 4"' : ''}/><text x="${big ? 75 : 55}" y="29" text-anchor="middle" font-family="Malgun Gothic,Apple SD Gothic Neo,Noto Sans KR,sans-serif" font-size="20" font-weight="700" fill="#3a2a20">${t}</text></svg>`)]); });
['⭐', '🌟', '✨', '💖', '🌸', '🍀'].forEach((e, i) => MADE.push(['t:st' + i, svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="${TAPEC[(i * 2) % 12]}" stroke="#4a3b32" stroke-width="2.5" stroke-dasharray="3 4"/><text x="32" y="43" text-anchor="middle" font-size="30">${e}</text></svg>`)]));
const MADEMAP = Object.fromEntries(MADE);
let EMO = null;
function emojiGroups() {
  if (EMO) return EMO;
  const R = [['표정', [[0x1F600, 0x1F64F], [0x1F910, 0x1F92F], [0x1F970, 0x1F97F]]], ['자연·날씨', [[0x1F300, 0x1F335], [0x2600, 0x26FF]]], ['식물·음식', [[0x1F336, 0x1F37F], [0x1F950, 0x1F96F], [0x1F980, 0x1F9AF], [0x1FAD0, 0x1FADF]]], ['활동·행사', [[0x1F380, 0x1F3FA], [0x1F3FC - 0, 0x1F3FA]]], ['동물', [[0x1F400, 0x1F43F], [0x1F980, 0x1F9AF], [0x1F985, 0x1F9AE]]], ['사람·몸', [[0x1F440, 0x1F4AF], [0x1F9B0, 0x1F9BF], [0x1F9D0, 0x1F9FF]]], ['사무·학교', [[0x1F4B0, 0x1F4FF]]], ['기호', [[0x1F500, 0x1F5FF], [0x2700, 0x27BF], [0x2B00, 0x2BFF]]], ['탈것·장소', [[0x1F680, 0x1F6FF], [0x1F3E0, 0x1F3F0]]], ['더 많은 이모지', [[0x1F900, 0x1F94F], [0x1FA70, 0x1FAFF], [0x1F1E6 - 0, 0x1F1E5]]]];
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.font = '24px sans-serif'; cx.textBaseline = 'top';
  const sig = ch => { cx.clearRect(0, 0, 32, 32); cx.fillText(ch, 2, 2); const d = cx.getImageData(0, 0, 32, 32).data; let s = ''; for (let i = 0; i < d.length; i += 16) s += d[i + 3] ? (d[i] + d[i + 1] + d[i + 2] > 0 ? '1' : '0') : '.'; return s; };
  const tofu = sig(String.fromCodePoint(0x10FFFE)), seen = new Set();
  EMO = R.map(([n, rs]) => {
    const list = [];
    rs.forEach(([a, b]) => { for (let c = a; c <= b; c++) { if (c >= 0x1F3FB && c <= 0x1F3FF) continue; if (c >= 0x1F1E6 && c <= 0x1F1FF) continue; const ch = String.fromCodePoint(c) + (c < 0x2C00 ? '️' : ''); if (seen.has(c)) continue; if (sig(ch) === tofu) continue; seen.add(c); list.push(ch); } });
    return [n, list];
  }).filter(g => g[1].length);
  return EMO;
}
const stkHtml = s => !s ? '' : s.startsWith('u:') ? `<img src="${(MYSTK.find(x => x.id === s.slice(2)) || {}).data || ''}" alt="스티커">` : s.startsWith('t:') ? `<img src="${MADEMAP[s] || ''}" alt="스티커">` : `<span class="em">${esc(s)}</span>`;
const dayStk = (ds, max) => ((S.stk && S.stk[ds]) || []).slice(0, max || 3).map(s => `<span class="sk">${stkHtml(s)}</span>`).join('');
let STKT = null, STKTAB = '내 스티커';
function stkTarget(add) { if (!STKT) return; if (STKT.kind === 'day') { S.stk = S.stk || {}; (S.stk[STKT.date] = S.stk[STKT.date] || []).push(add); } else { const pg = S.pages.find(p => p.id === STKT.page), b = pg && pg.blocks.find(x => x.id === STKT.id); if (b) (b.stk = b.stk || []).push(add); } save(true); render(); toast('붙였습니다.'); const n = document.getElementById('stkn'); if (n) n.textContent = '붙인 뒤에도 계속 고를 수 있어요. 다 끝나면 닫기를 누르세요.'; }
function stkOpen(target) {
  STKT = target; let d = document.getElementById('stkdlg'); if (d) d.remove();
  d = document.createElement('dialog'); d.id = 'stkdlg'; d.className = 'dlg stkd'; document.body.appendChild(d);
  const draw = () => {
    const tabs = ['내 스티커', '테이프·라벨', ...emojiGroups().map(g => g[0])];
    let body = '';
    if (STKTAB === '내 스티커') body = `<label class="btn file">내 그림 올리기 (캔바 등에서 만든 PNG·JPG)<input type="file" id="stkUp" accept="image/*" multiple hidden></label><div class="stkg">${MYSTK.map(m => `<button class="sb" data-pick="u:${m.id}">${stkHtml('u:' + m.id)}</button><button class="x" data-rm="${m.id}">지우기</button>`).join('') || '<p class="mu">아직 없습니다. 캔바에서 스티커를 만들어 저장한 그림을 여기에 올리면 얼마든지 쓸 수 있습니다.</p>'}</div>`;
    else if (STKTAB === '테이프·라벨') body = `<div class="stkg">${MADE.map(m => `<button class="sb wide" data-pick="${m[0]}"><img src="${m[1]}" alt=""></button>`).join('')}</div>`;
    else { const g = emojiGroups().find(x => x[0] === STKTAB); body = `<div class="stkg">${(g ? g[1] : []).map(e => `<button class="sb em" data-pick="${e}">${e}</button>`).join('')}</div>`; }
    const total = emojiGroups().reduce((a, g) => a + g[1].length, 0) + MADE.length;
    d.innerHTML = `<div class="stkh"><b>스티커 붙이기 <span class="mu">(총 ${total}개 + 내가 올린 그림)</span></b><button class="btn sm" id="stkx">닫기</button></div><p class="mu" id="stkn">누르면 붙습니다.</p><div class="stkt">${tabs.map(t => `<button class="chip ${t === STKTAB ? 'on' : ''}" data-tab="${t}">${t}</button>`).join('')}</div>${body}`;
  };
  d.addEventListener('click', e => {
    const t = e.target.closest('button,label'); if (!t) return;
    if (t.id === 'stkx') { d.close(); d.remove(); }
    else if (t.dataset.tab) { STKTAB = t.dataset.tab; draw(); }
    else if (t.dataset.pick) stkTarget(t.dataset.pick);
    else if (t.dataset.rm) { MYSTK = MYSTK.filter(x => x.id !== t.dataset.rm); saveMy(); draw(); }
  });
  d.addEventListener('change', async e => {
    if (e.target.id !== 'stkUp') return;
    for (const f of e.target.files) { await new Promise(res => { const im = new Image(); im.onload = () => { const r = Math.min(1, 160 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); MYSTK.push({ id: uid(), data: c.toDataURL('image/png') }); res(); }; im.onerror = res; im.src = URL.createObjectURL(f); }); }
    await saveMy(); draw(); toast('내 스티커로 저장했습니다.');
  });
  draw(); d.showModal();
}
Object.assign(A, {
  stkPick(el) { stkOpen({ kind: 'block', page: curPage().id, id: el.dataset.b }); },
  stkDay() { stkOpen({ kind: 'day', date: UI.day }); },
  stkDel(el) { const pg = curPage(), b = pg.blocks.find(x => x.id === el.dataset.b); if (b && b.stk) { b.stk.splice(+el.dataset.i, 1); commit(); } },
  stkDayDel(el) { const l = (S.stk || {})[el.dataset.d]; if (l) { l.splice(+el.dataset.i, 1); if (!l.length) delete S.stk[el.dataset.d]; commit(); } }
});

/* school.js — 학교 홈페이지·급식·학교 정보 (나이스 교육정보 개방포털 자료)
   - 급식: 나이스(open.neis.go.kr) 공개 자료를 받아 옵니다. 먼저 이 기기에서 바로 받고(최신), 안 되면 깃허브가 매일 새벽 받아 둔 neis.json 을 씁니다.
   - 학교 홈페이지 주소는 나이스에 등록된 주소를 자동으로 쓰고, 설정에서 바꿀 수 있습니다.
   - 학생 개인별 학적·출결은 나이스 내부 정보라 공개 연동이 불가능합니다. 학급 수 같은 공개 정보만 보여 줍니다. */
const NEIS_JSON = window.TF_NEIS_URL || 'https://raw.githubusercontent.com/gtk0624-a11y/Qdice/data/neis.json';
const NEIS_REG = { 서울: 'B10', 부산: 'C10', 대구: 'D10', 인천: 'E10', 광주: 'F10', 대전: 'G10', 울산: 'H10', 세종: 'I10', 경기: 'J10', 강원: 'K10', 충북: 'M10', 충남: 'N10', 전북: 'P10', 전남: 'Q10', 경북: 'R10', 경남: 'S10', 제주: 'T10' };
let SCH = (() => { try { return JSON.parse(localStorage.getItem('tf.school') || 'null') || { school: null, classes: {}, meals: [], at: 0 }; } catch (e) { return { school: null, classes: {}, meals: [], at: 0 }; } })();
const ymd8 = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
const iso8 = s => s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);
const cleanDish = s => s.replace(/\s*\([\d.]+\)/g, '').replace(/([가-힣\)])k\b/g, '$1').replace(/^\(자율\)/, '').trim();
const homeUrl = () => { const u = ((S.profile && S.profile.home) || (SCH.school && SCH.school.home) || '').trim(); return u ? (/^https?:\/\//.test(u) ? u : 'https://' + u) : ''; };
function mealFor(ds) { return SCH.meals.filter(m => iso8(m.d) === ds); }

async function neisLive() {
  const key = (S.profile.neisKey || '').trim(), size = key ? 100 : 5;
  const get = async (name, q) => {
    const u = new URL('https://open.neis.go.kr/hub/' + name); u.searchParams.set('Type', 'json'); u.searchParams.set('pSize', size); if (key) u.searchParams.set('KEY', key);
    Object.keys(q).forEach(k => u.searchParams.set(k, q[k]));
    const c = new AbortController(), t = setTimeout(() => c.abort(), 7000);
    try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw 0; const j = await r.json(); return (j[name] && j[name][1] && j[name][1].row) || []; } finally { clearTimeout(t); }
  };
  const nm = (S.profile.school || '').trim(); if (nm.length < 3 || /○/.test(nm)) throw 0;
  let sc = SCH.school && SCH.school.name === nm ? SCH.school : null;
  if (!sc) {
    const q = { SCHUL_NM: nm }, rg = Object.keys(NEIS_REG).find(k => (S.profile.region || '').includes(k)); if (rg) q.ATPT_OFCDC_SC_CODE = NEIS_REG[rg];
    const f = await get('schoolInfo', q), s = f.find(x => x.SCHUL_NM === nm) || f[0]; if (!s) throw 0;
    sc = { name: s.SCHUL_NM, atpt: s.ATPT_OFCDC_SC_CODE, code: s.SD_SCHUL_CODE, kind: s.SCHUL_KND_SC_NM, addr: s.ORG_RDNMA, tel: s.ORG_TELNO, home: s.HMPG_ADRES };
  }
  const base = { ATPT_OFCDC_SC_CODE: sc.atpt, SD_SCHUL_CODE: sc.code }, now = new Date(), meals = [], seen = new Set();
  for (let off = -1; off <= 18; off += 4) {
    const rows = await get('mealServiceDietInfo', Object.assign({ MLSV_FROM_YMD: ymd8(new Date(now.getTime() + off * 864e5)), MLSV_TO_YMD: ymd8(new Date(now.getTime() + (off + 3) * 864e5)) }, base));
    rows.forEach(m => { const k = m.MLSV_YMD + m.MMEAL_SC_NM; if (seen.has(k)) return; seen.add(k); meals.push({ d: m.MLSV_YMD, kind: m.MMEAL_SC_NM, dishes: String(m.DDISH_NM || '').split(/<br\s*\/?>/i).map(x => x.trim()).filter(Boolean), kcal: m.CAL_INFO || '', origin: String(m.ORPLC_INFO || '').replace(/<br\s*\/?>/gi, ' / ') }); });
  }
  if (!meals.length) throw 0;
  return { school: sc, classes: SCH.classes || {}, meals, at: Date.now() };
}
async function neisFile() { const r = await fetch(NEIS_JSON, { cache: 'no-store' }); if (!r.ok) throw 0; const j = await r.json(); if (!j.meals) throw 0; return { school: j.school, classes: j.classes || {}, meals: j.meals, at: Date.now(), file: 1 }; }
async function schoolLoad(silent) {
  let got = null, how = '';
  try { got = await neisLive(); how = '나이스 직접'; } catch (e) { }
  if (!got) { try { got = await neisFile(); how = '매일 새벽 자료'; } catch (e) { } }
  if (!got) { if (!silent) toast('급식 자료를 받지 못했습니다. 인터넷을 확인하거나 설정에서 학교 이름을 확인해 주세요.'); return; }
  if (got.file === 1 && SCH.school && SCH.school.name === got.school.name) got.classes = Object.assign({}, SCH.classes, got.classes);
  SCH = got; try { localStorage.setItem('tf.school', JSON.stringify(SCH)); } catch (e) { }
  if (!silent) toast(`급식 ${got.meals.length}건을 받았습니다 (${how}).`);
  if (/^#\/(today|)$/.test(location.hash) || !location.hash) render();
}
setTimeout(() => { if (Date.now() - (SCH.at || 0) > 3 * 3600 * 1000) schoolLoad(true); }, 2200);

function mealRow() {
  const td = today(), m = mealFor(td), lunch = m.find(x => x.kind === '중식') || m[0], days = {};
  SCH.meals.filter(x => iso8(x.d) >= td).forEach(x => (days[x.d] = days[x.d] || []).push(x));
  const dw = ds => DOW[new Date(ds + 'T00:00:00').getDay()];
  const body = Object.keys(days).sort().slice(0, 8).map(k => `<div class="ml"><b>${md(iso8(k))}(${dw(iso8(k))})</b>${days[k].map(x => `<div>${days[k].length > 1 ? `<i>${esc(x.kind)}</i> ` : ''}${esc(x.dishes.map(cleanDish).join(' · '))}${x.kcal ? ` <small class="mu">${esc(x.kcal)}</small>` : ''}</div>`).join('')}</div>`).join('');
  const nxt = Object.keys(days).sort().find(k => iso8(k) > td);
  const st = lunch ? esc(lunch.dishes.map(cleanDish).slice(0, 4).join(' · ')) : SCH.meals.length ? `오늘은 급식이 없습니다${nxt ? ' · 다음 ' + md(iso8(nxt)) : ''}` : '급식 자료를 불러오는 중이거나 아직 없습니다';
  return row('r12', '학교', '급식', st, lunch && lunch.kcal ? esc(lunch.kcal.replace(' Kcal', 'kcal')) : '', (body || '<p class="mu">급식 정보가 없습니다. [급식 새로고침]을 눌러 보세요.</p>') + `<div class="tools"><button class="btn sm" data-act="mealNow">급식 새로고침</button></div><p class="mu">알레르기 번호: 1난류 2우유 3메밀 4땅콩 5대두 6밀 7고등어 8게 9새우 10돼지고기 11복숭아 12토마토 13아황산류 14호두 15닭고기 16쇠고기 17오징어 18조개류(굴·전복·홍합 포함) 19잣 · 출처: 나이스 교육정보 개방포털</p>`);
}
function schoolRow() {
  const sc = SCH.school, c = SCH.classes || {}, ks = Object.keys(c).sort(), h = homeUrl();
  const st = ks.length ? ks.map(g => `${g}학년 ${c[g]}학급`).join(' · ') : sc ? esc(sc.name) : '학교 정보를 불러오는 중';
  return row('r13', '학교', '학교 홈페이지·정보', st, '', `${h ? `<a class="btn pri" href="${esc(h)}" target="_blank" rel="noopener">학교 홈페이지 열기</a>` : '<p class="mu">홈페이지 주소가 아직 없습니다. 아래에서 넣어 주세요.</p>'}${sc ? `<p>${esc(sc.name)}${sc.kind ? ' · ' + esc(sc.kind) : ''}<br>${esc(sc.addr || '')}<br>${sc.tel ? '전화 ' + esc(sc.tel) : ''}</p>` : ''}<div class="tools"><button class="btn sm" data-act="schoolSet">홈페이지 주소·인증키 설정</button><button class="btn sm" data-act="mealNow">새로고침</button></div><p class="mu">학생 개인별 학적·출결은 나이스 내부 정보라 공개 연동이 되지 않습니다. 학급 수·학교 기본정보만 나이스에서 가져옵니다.</p>`);
}
function schoolChunks() {
  const out = [], sc = SCH.school;
  SCH.meals.forEach(m => out.push({ type: 'meal', src: `급식 · ${md(iso8(m.d))}`, text: `급식(${m.kind}) ${md(iso8(m.d))}(${DOW[new Date(iso8(m.d) + 'T00:00:00').getDay()]}): ${m.dishes.map(cleanDish).join(', ')} ${m.kcal || ''}`, ref: '#/' }));
  if (sc) out.push({ type: 'profile', src: '학교 정보', text: `${sc.name} ${sc.addr || ''} 전화 ${sc.tel || '-'} 홈페이지 ${homeUrl()} 학급: ${Object.keys(SCH.classes || {}).map(g => g + '학년 ' + SCH.classes[g] + '학급').join(', ')}`, ref: '#/' });
  return out;
}
Object.assign(A, {
  mealNow() { toast('받는 중…'); schoolLoad(false); },
  schoolSet() {
    ask('학교 홈페이지 · 급식 설정', [{ k: 'home', label: '학교 홈페이지 주소 (비우면 나이스에 등록된 주소를 씁니다)', val: S.profile.home || '', ph: 'https://…' }, { k: 'region', label: '교육청 지역 (급식 검색용 · 예: 경기, 서울)', val: S.profile.region || '' }, { k: 'key', label: '나이스 인증키 (선택 · open.neis.go.kr 에서 무료 발급 · 있으면 더 많이 받음)', val: S.profile.neisKey || '' }], o => {
      S.profile.home = (o.home || '').trim(); S.profile.region = (o.region || '').trim(); S.profile.neisKey = (o.key || '').trim(); SCH.school = null; commit(); schoolLoad(false);
    });
  }
});

if (typeof render === 'function' && S.setup) setTimeout(render, 0);

/* 학교 정보 배너 (오늘 화면 맨 위): 누르면 메뉴(홈페이지·일주일 급식·학교 정보)가 펼쳐집니다 */
function schoolBanner() {
  if (S.hide.sb) return '';
  const sc = SCH.school, c = SCH.classes || {}, ks = Object.keys(c).sort(), h = homeUrl(), td = today(), m = mealFor(td), lunch = m.find(x => x.kind === '중식') || m[0];
  const name = sc ? sc.name : (S.profile.school || '우리 학교');
  const cls = ks.length ? ks.map(g => `${g}학년 ${c[g]}학급`).join(' · ') : '';
  const brief = lunch ? `오늘 ${esc(lunch.kind)} · ${esc(lunch.dishes.map(cleanDish).slice(0, 3).join(' · '))}…` : SCH.meals.length ? '오늘은 급식이 없습니다' : '급식 불러오는 중…';
  const days = {}; SCH.meals.filter(x => iso8(x.d) >= td).forEach(x => (days[x.d] = days[x.d] || []).push(x));
  const week = Object.keys(days).sort().slice(0, 7).map(k => `<div class="ml"><b>${md(iso8(k))}(${DOW[new Date(iso8(k) + 'T00:00:00').getDay()]})</b>${days[k].map(x => `<div>${days[k].length > 1 ? `<i>${esc(x.kind)}</i> ` : ''}${esc(x.dishes.map(cleanDish).join(' · '))}${x.kcal ? ` <small class="mu">${esc(x.kcal.replace(' Kcal', 'kcal'))}</small>` : ''}</div>`).join('')}</div>`).join('');
  return `<details class="sbanner" data-k="sb" ${OPEN.has('sb') ? 'open' : ''}><summary><span class="sbn">🏫 ${esc(name)}</span><span class="sbm">${brief}</span><i class="chev"></i></summary><div class="sbb"><div class="tools">${h ? `<a class="btn pri" href="${esc(h)}" target="_blank" rel="noopener">학교 홈페이지 열기</a>` : ''}<button class="btn sm" data-act="schoolSet">홈페이지 주소·설정</button><button class="btn sm" data-act="mealNow">급식 새로고침</button></div>${cls ? `<p><b>학급</b> ${esc(cls)}</p>` : ''}${sc && (sc.addr || sc.tel) ? `<p class="mu">${esc(sc.addr || '')}${sc.tel ? ' · ☎ ' + esc(sc.tel) : ''}</p>` : ''}<h4 class="dlh">급식 (오늘부터)</h4>${week || '<p class="mu">급식 자료가 아직 없습니다. [급식 새로고침]을 눌러 보세요.</p>'}<p class="mu">알레르기 번호: 1난류 2우유 3메밀 4땅콩 5대두 6밀 7고등어 8게 9새우 10돼지고기 11복숭아 12토마토 13아황산류 14호두 15닭고기 16쇠고기 17오징어 18조개류 19잣 · 출처 나이스 교육정보 개방포털 · 학생 개인별 학적은 나이스 내부 정보라 연동되지 않습니다.</p></div></details>`;
}

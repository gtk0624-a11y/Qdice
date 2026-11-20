// 나이스 교육정보 개방포털(open.neis.go.kr)에서 학교 기본정보·학급 수·급식을 받아 neis.json 으로 저장합니다. (GitHub Actions 가 매일 새벽 실행)
// 학교는 comcigan-config.json 의 school/region 을 씁니다. (선택) 저장소 비밀값 NEIS_KEY 가 있으면 인증키로 조회합니다.
const fs = require('fs'), path = require('path');
const KEY = process.env.NEIS_KEY || '';
const REG = { 서울: 'B10', 부산: 'C10', 대구: 'D10', 인천: 'E10', 광주: 'F10', 대전: 'G10', 울산: 'H10', 세종: 'I10', 경기: 'J10', 강원: 'K10', 충북: 'M10', 충남: 'N10', 전북: 'P10', 전남: 'Q10', 경북: 'R10', 경남: 'S10', 제주: 'T10' };
const ymd = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
async function api(name, q) {
  const rows = [], seen = new Set(), size = KEY ? 100 : 5;
  for (let p = 1; p <= 40; p++) {
    const u = new URL('https://open.neis.go.kr/hub/' + name); u.searchParams.set('Type', 'json'); u.searchParams.set('pIndex', p); u.searchParams.set('pSize', size); if (KEY) u.searchParams.set('KEY', KEY);
    Object.keys(q).forEach(k => u.searchParams.set(k, q[k]));
    const r = await fetch(u); if (!r.ok) throw new Error(name + ' HTTP ' + r.status); const j = await r.json();
    if (j.RESULT && j.RESULT.CODE !== 'INFO-000') { if (j.RESULT.CODE === 'INFO-200') break; throw new Error(name + ' ' + j.RESULT.CODE + ' ' + j.RESULT.MESSAGE); }
    const blk = j[name]; if (!blk) break; const got = (blk[1] && blk[1].row) || []; let add = 0;
    got.forEach(x => { const k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); rows.push(x); add++; } });
    if (got.length < size || !add) break;   // 인증키가 없으면 쪽 번호가 무시되어 같은 5건만 옵니다 → 새 줄이 없으면 멈춤
  }
  return rows;
}
(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'comcigan-config.json'), 'utf8'));
  const q = { SCHUL_NM: cfg.school }; if (cfg.region && REG[cfg.region]) q.ATPT_OFCDC_SC_CODE = REG[cfg.region];
  const found = await api('schoolInfo', q); const s = found.find(x => x.SCHUL_NM === cfg.school) || found[0];
  if (!s) throw new Error('나이스에서 학교를 찾지 못했습니다: ' + cfg.school);
  const base = { ATPT_OFCDC_SC_CODE: s.ATPT_OFCDC_SC_CODE, SD_SCHUL_CODE: s.SD_SCHUL_CODE };
  const school = { name: s.SCHUL_NM, atpt: s.ATPT_OFCDC_SC_CODE, code: s.SD_SCHUL_CODE, kind: s.SCHUL_KND_SC_NM, addr: s.ORG_RDNMA, tel: s.ORG_TELNO, home: s.HMPG_ADRES };
  const now = new Date(), ay = now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1, classes = {};
  for (const g of [1, 2, 3]) { try { const cl = new Set((await api('classInfo', Object.assign({ AY: ay, GRADE: g }, base))).map(c => c.CLASS_NM)); if (cl.size) classes[g] = cl.size; } catch (e) { console.error('학급 정보 실패:', e.message); } }
  const meals = [];
  const push = m => { if (!meals.some(x => x.d === m.MLSV_YMD && x.kind === m.MMEAL_SC_NM)) meals.push({ d: m.MLSV_YMD, kind: m.MMEAL_SC_NM, dishes: String(m.DDISH_NM || '').split(/<br\s*\/?>/i).map(x => x.trim()).filter(Boolean), kcal: m.CAL_INFO || '', origin: String(m.ORPLC_INFO || '').replace(/<br\s*\/?>/gi, ' / '), nutri: String(m.NTR_INFO || '').replace(/<br\s*\/?>/gi, ' / ') }); };
  for (let off = -3; off <= 21; off += 4) {   // 인증키 없이도 되도록 4일씩 끊어 받습니다(한 번에 5건까지만 주기 때문)
    try { (await api('mealServiceDietInfo', Object.assign({ MLSV_FROM_YMD: ymd(new Date(now.getTime() + off * 864e5)), MLSV_TO_YMD: ymd(new Date(now.getTime() + (off + 3) * 864e5)) }, base))).forEach(push); } catch (e) { console.error('급식 실패:', e.message); }
  }
  meals.sort((a, b) => a.d.localeCompare(b.d) || a.kind.localeCompare(b.kind));
  fs.writeFileSync(process.argv[2] || 'neis.json', JSON.stringify({ updated: new Date().toISOString(), school, classes, meals }));
  console.log('저장 완료:', school.name, '학급', JSON.stringify(classes), '급식', meals.length + '건', meals[0] ? meals[0].d + ' ' + meals[0].dishes.slice(0, 3).join(',') : '');
})().catch(e => { console.error(e); process.exit(1); });

/* 업무 강화 묶음: ① 나이스 학사일정 통째로 가져오기 ② (이어서) 내 업무 카드 · 파일 읽기 미리보기 */

/* ---------- ① 나이스 학사일정 → 캘린더 ---------- */
async function neisGet2(name, q, size) {
  const key = (S.profile.neisKey || '').trim(), u = new URL('https://open.neis.go.kr/hub/' + name);
  u.searchParams.set('Type', 'json'); u.searchParams.set('pIndex', 1); u.searchParams.set('pSize', size); if (key) u.searchParams.set('KEY', key);
  Object.keys(q).forEach(k => u.searchParams.set(k, q[k]));
  const c = new AbortController(), t = setTimeout(() => c.abort(), 9000);
  try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); if (j.RESULT && j.RESULT.CODE === 'INFO-200') return []; if (j.RESULT && j.RESULT.CODE !== 'INFO-000') throw new Error(j.RESULT.MESSAGE || j.RESULT.CODE); return (j[name] && j[name][1] && j[name][1].row) || []; } finally { clearTimeout(t); }
}
const nDay = (d, n) => { const x = new Date(d.getTime() + n * 864e5); return x; };
async function neisSchedLive(sc, sy, onProg) {
  const key = (S.profile.neisKey || '').trim(), size = key ? 1000 : 5, step = key ? 92 : 3, out = [], base = { ATPT_OFCDC_SC_CODE: sc.atpt, SD_SCHUL_CODE: sc.code };
  const start = new Date(sy, 2, 1), end = new Date(sy + 1, 2, 0), wins = []; for (let d = start; d <= end; d = nDay(d, step)) wins.push([d, new Date(Math.min(nDay(d, step - 1).getTime(), end.getTime()))]);
  let done = 0, fail = 0;
  const one = async (a, b) => {
    let rows; try { rows = await neisGet2('SchoolSchedule', Object.assign({ AA_FROM_YMD: ymd8(a), AA_TO_YMD: ymd8(b) }, base), size); } catch (e) { fail++; return; }
    if (rows.length >= size && b > a) { /* 한도에 걸렸으면 하루씩 다시 */ for (let d = a; d <= b; d = nDay(d, 1)) { try { rows = rows.concat(await neisGet2('SchoolSchedule', Object.assign({ AA_FROM_YMD: ymd8(d), AA_TO_YMD: ymd8(d) }, base), size)); } catch (e) { fail++; } } }
    out.push(...rows);
  };
  const q = wins.slice(); const worker = async () => { while (q.length) { const w = q.shift(); await one(w[0], w[1]); done++; if (onProg) onProg(done, wins.length); } };
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  if (fail > wins.length / 2) throw new Error('나이스 연결 실패');
  const seen = new Set(), ev = []; out.forEach(r => { const k = r.AA_YMD + '|' + r.EVENT_NM; if (seen.has(k)) return; seen.add(k); ev.push({ d: r.AA_YMD, n: String(r.EVENT_NM || '').trim(), c: String(r.EVENT_CNTNT || '').trim(), h: r.SBTR_DD_SC_NM || '' }); });
  return ev;
}
function schedApply(ev) { /* 같은 행사가 이어지는 날짜는 기간 하나로 합쳐 넣음 */
  const by = {}; ev.forEach(e => { if (e.n) (by[e.n] = by[e.n] || []).push(e); });
  const items = [];
  Object.keys(by).forEach(n => {
    const L = by[n].sort((a, b) => a.d.localeCompare(b.d)); let cur = null;
    L.forEach(e => { const d = iso8(e.d); if (cur && Math.round((new Date(d) - new Date(cur.last)) / 864e5) <= 1) { cur.last = d; } else { if (cur) items.push(cur); cur = { n, first: d, last: d, c: e.c, h: e.h }; } }); if (cur) items.push(cur);
  });
  S.items = S.items.filter(i => i.nid !== 'neis');
  items.forEach(x => S.items.push({ id: uid(), title: x.n + (x.h && /휴업/.test(x.h) ? ' (휴업일)' : ''), date: x.first, end: x.last > x.first ? x.last : '', cat: 'event', src: '학사', nid: 'neis', memo: x.c && x.c !== x.n ? x.c : '', done: false }));
  S.schedAt = Date.now(); commit(); return items.length;
}
async function schedNeis(silent) {
  if (window.TF_DEMO) { if (!silent) toast('체험판에서는 나이스에 연결하지 않습니다.'); return 0; }
  const sy = schoolYearNow(); let sc = SCH.school;
  if (!sc) { try { await schoolLoad(true); } catch (e) { } sc = SCH.school; }
  if (!sc) { if (!silent) toast('먼저 설정에서 학교 이름을 넣어 주세요. (예: 곡선중학교)'); return 0; }
  let ev = null, how = '';
  try { if (!silent) toast('나이스에서 학사일정을 받는 중… (1분 안팎)'); ev = await neisSchedLive(sc, sy, (a, b) => { if (!silent && a % 20 === 0) toast(`받는 중 ${a}/${b}`); }); how = '나이스 직접'; if (!ev.length) ev = null; } catch (e) { ev = null; }
  if (!ev) { try { const r = await fetch(NEIS_JSON, { cache: 'no-store' }), j = await r.json(); if (j.schedule && j.schedule.length) { ev = j.schedule; how = '매일 새벽 자료'; } } catch (e) { } }
  if (!ev || !ev.length) { if (!silent) toast('학사일정을 받지 못했습니다. 학교 이름을 확인하거나, 아래 [학사일정 파일 올리기]를 써 주세요.'); return 0; }
  const n = schedApply(ev); if (!silent) toast(`학사일정 ${n}건을 캘린더에 넣었습니다 (${how}).`); return n;
}
A.schedNeis = () => schedNeis(false);
setTimeout(() => { try { if (S.setup && S.profile.school && Date.now() - (S.schedAt || 0) > 24 * 3600 * 1000) schedNeis(true); } catch (e) { } }, 4000);

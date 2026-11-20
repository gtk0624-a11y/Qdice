'use strict';
/* ===== 업무파탈 search.js : 꿈송이 검색(대충 말해도 찾기) · 계획서에서 예산 뽑기 ===== */

const spentOf = l => (l.spends || []).reduce((a, s) => a + (+s.amt || 0), 0);
const projSpent = p => spentOf(p) + p.lines.reduce((a, l) => a + spentOf(l), 0);
const projAlloc = p => (+p.total > 0 ? +p.total : p.lines.reduce((a, l) => a + (+l.alloc || 0), 0));

/* 1) 사이트에 들어간 모든 내용을 '조각'으로 만든다 */
function buildChunks() {
  const c = []; const add = (type, src, text, ref, priv) => c.push({ type, src, text, ref, priv });
  S.duties.forEach(d => add('duty', '업무 분장표 · ' + d.dept, `${d.dept} 업무: ${d.work} / 담당: ${d.who}`, '#/lib'));
  S.contacts.forEach(d => add('contact', '교내 연락망 · ' + d.dept, `${d.dept} ${d.name} 내선 ${d.ext || '-'} 전화 ${d.phone || '-'}`, '#/lib'));
  S.notes.forEach(n => {
    const head = `회의·연수 노트 · ${n.date} ${n.title}`;
    (n.links || []).forEach(k => { const r = resolve(k); if (r) add('note', head + ' · 연결', '연결: ' + r.label, '#/note/' + n.id, n.lock); });
    if (n.decisions) add('note', head + ' · 결정', n.decisions, '#/note/' + n.id, n.lock);
    if (n.followups) add('note', head + ' · 후속 조치', n.followups, '#/note/' + n.id, n.lock);
    String(n.body || '').split(/\n{1,}/).filter(x => x.trim()).forEach(p => add('note', head, p, '#/note/' + n.id, n.lock));
  });
  S.items.forEach(i => add('item', '일정·할 일', `${i.title} ${i.date ? '(' + i.date + ')' : ''} ${i.done ? '완료' : '미완료'}`, '#/cal'));
  S.budget.forEach(p => {
    add('budget', `예산 · ${p.name}`, `${p.name} 총액 ${won(projAlloc(p))}원 집행 ${won(projSpent(p))}원 잔액 ${won(projAlloc(p) - projSpent(p))}원 집행률 ${projAlloc(p) ? Math.round(projSpent(p) / projAlloc(p) * 100) : 0}%`, '#/budget');
    (p.spends || []).forEach(s => add('budget', `예산 · ${p.name} 사용내역`, `${s.date} ${s.desc} ${won(s.amt)}원 (${p.name})`, '#/budget'));
  });
  S.budget.forEach(p => p.lines.forEach(l => {
    const sp = spentOf(l);
    add('budget', `예산 · ${p.name} · ${l.item}`, `${p.name} ${l.item} 배정 ${won(l.alloc)}원 집행 ${won(sp)}원 잔액 ${won(l.alloc - sp)}원 집행기한 ${l.deadline || '없음'}`, '#/budget');
    (l.spends || []).forEach(s => add('budget', `예산 · ${p.name} · ${l.item} 지출`, `${s.date} ${s.desc} ${won(s.amt)}원 (${p.name} ${l.item})`, '#/budget'));
  }));
  S.assess.forEach(a => add('assess', '수행평가', `${a.title} ${a.grade || ''} 기한 ${a.due || '미정'} 단계 ${ASSESS_STEPS[a.step || 0]}`, '#/class'));
  S.training.forEach(t => add('training', '연수', `${t.title} ${t.type} ${t.hours}시간 ${t.done ? '이수' : '미이수'} 기한 ${t.due || '없음'}`, '#/today'));
  S.lessons.forEach(l => add('lesson', '수업 진도', `${l.cls} ${l.unit} ${l.done}/${l.total}차시`, '#/class'));
  S.pages.forEach(pg => {
    const lines = (pg.blocks || []).map(b => b.t === 'table' ? (b.rows || []).map(r => r.join(' | ')).join('\n') : b.t === 'todo' ? (b.done ? '[완료] ' : '[할 일] ') + b.x : b.t === 'toggle' ? b.x + ' ' + (b.y || '') : b.t === 'link' ? b.x + ' ' + (b.u || '') : b.t === 'ref' ? '연결: ' + ((resolve(b.u) || {}).label || '') : b.x || '').filter(x => String(x).trim());
    (pg.links || []).forEach(k => { const r = resolve(k); if (r) lines.push('연결: ' + r.label); });
    let buf = ''; const flush = () => { if (buf.trim()) add('page', '내 페이지 · ' + (pg.title || '제목 없음'), buf.trim(), '#/page/' + pg.id, pg.lock); buf = ''; };
    lines.forEach(l => { if ((buf + ' ' + l).length > 380) flush(); buf += (buf ? '\n' : '') + l; }); flush();
    if (!lines.length) add('page', '내 페이지', pg.title || '제목 없음', '#/page/' + pg.id, pg.lock);
  });
  S.links.forEach(l => add('link', '서랍', `${l.name} ${l.url}`, l.url));
  LIB.forEach(d => {
    const pages = d.text.split('\f');
    pages.forEach((pg, pi) => {
      const paras = pg.split(/\n+/).map(x => x.trim()).filter(Boolean);
      let buf = '';
      const flush = () => { if (buf.trim()) add('doc', `${d.kind} · ${d.name}${pages.length > 1 ? ' · ' + (pi + 1) + '쪽' : ''}`, buf.trim(), '#/lib'); buf = ''; };
      paras.forEach(p => { if ((buf + ' ' + p).length > 380) flush(); buf += (buf ? ' ' : '') + p; });
      flush();
    });
  });
  return c;
}

/* 2) 말투가 엉망이어도 찾도록: 글자 두 개씩 끊어 비교 + 비슷한 말 + 의도 파악 */
const SYN = {
  '돈': ['예산', '금액', '집행', '잔액'], '쓰는': ['집행', '사용'], '비용': ['예산', '집행'], '얼마': ['금액', '잔액'],
  '누가': ['담당', '업무'], '누구': ['담당', '업무'], '맡': ['담당'], '전화': ['내선', '연락'], '번호': ['내선', '전화'], '연락': ['내선', '전화'],
  '회의': ['회의록', '협의', '결정'], '언제': ['기한', '마감', '일정'], '까지': ['기한', '마감'], '마감': ['기한'], '숙제': ['할 일', '제출'],
  '체육관': ['강당', '체육'], '시험': ['평가', '지필', '수행'], '수행': ['평가'], '연수': ['이수', '시간'], '출장': ['복명', '여비'], '결시': ['미인정', '인정', '결석'],
  '진도': ['차시', '단원'], '평가': ['수행', '성적']
};
const STOP = new Set(['했더', '더라', '라고', '다고', '는지', '있나', '있어', '어디', '뭐였', '였더', '한테', '에서', '에게', '해줘', '알려', '려줘', '주세', '세요', '무엇', '어떻', '떻게', '입니', '니다', '이랑', '하는', '하고', '그거', '저번', '지난', '이번', '어떤', '였지', '했지', '였나', '한다', '된다', '있는', '없는', '알아']);
const norm = s => String(s).toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
function grams(s) { const n = norm(s), g = new Set(); for (let i = 0; i < n.length - 1; i++) { const b = n.slice(i, i + 2); if (!STOP.has(b)) g.add(b); } return g; }

function intent(q) {
  const t = new Set();
  if (/누가|누구|담당|맡|분장/.test(q)) { t.add('duty'); t.add('contact'); }
  if (/전화|번호|내선|연락/.test(q)) t.add('contact');
  if (/돈|예산|잔액|얼마|집행|비용|품의|결제/.test(q)) t.add('budget');
  if (/회의|결정|협의|말씀|얘기/.test(q)) t.add('note');
  if (/수행|평가|채점|시험/.test(q)) t.add('assess');
  if (/연수|이수/.test(q)) t.add('training');
  if (/진도|차시|단원/.test(q)) t.add('lesson');
  if (/규정|지침|복무|출장|결시|학칙|규칙/.test(q)) t.add('doc');
  return t;
}

function search(q, forLLM) {
  const all = buildChunks().filter(c => !(forLLM && c.priv));
  if (!all.length) return [];
  const qg = new Map();
  grams(q).forEach(g => qg.set(g, 1));
  const qn = norm(q);
  Object.keys(SYN).forEach(k => { if (qn.includes(k)) SYN[k].forEach(w => grams(w).forEach(g => { if (!qg.has(g)) qg.set(g, .6); })); });
  if (!qg.size) return [];
  const docs = all.map(c => ({ c, n: norm(c.src + c.text) }));
  const df = new Map(); qg.forEach((_, g) => df.set(g, docs.filter(d => d.n.includes(g)).length));
  const it = intent(q);
  let res = docs.map(d => {
    let s = 0, hit = 0;
    qg.forEach((w, g) => { if (d.n.includes(g)) { hit++; s += w * (Math.log(1 + docs.length / (1 + df.get(g)))); } });
    if (it.has(d.c.type)) s *= 1.6;
    return { c: d.c, s, hit };
  }).filter(r => r.hit >= 2 && r.s > 0).sort((a, b) => b.s - a.s);
  if (res.length) { const top = res[0].s; res = res.filter(r => r.s >= top * .35); }
  return res.slice(0, 5);
}

function snippet(text, q) {
  const gs = [...grams(q)];
  let pos = 0; for (const g of gs) { const i = norm(text).indexOf(g); if (i >= 0) { pos = i; break; } }
  let t = text.length > 200 ? text.slice(Math.max(0, pos - 40), pos + 160) + '…' : text;
  t = esc(t);
  return t;
}

/* 3) 바로 계산해서 답할 수 있는 질문(잔액, 마감, 내 업무) */
function direct(q) {
  const out = [];
  if (/잔액|남은\s*(돈|예산)|얼마\s*(남|썼)|예산\s*(현황|얼마)/.test(q)) {
    const t = btot();
    if (S.budget.length) out.push({ src: '예산 장부(계산)', text: `전체 배정 ${won(t.a)}원 · 집행 ${won(t.s)}원 · 잔액 ${won(t.b)}원 (집행 ${t.a ? Math.round(t.s / t.a * 100) : 0}%)`, ref: '#/budget' });
  }
  if (/마감|기한|급한|다가오|이번\s*주/.test(q)) {
    const ev = upcoming(14);
    if (ev.length) out.push({ src: '일정(계산)', text: '14일 안의 기한: ' + ev.slice(0, 6).map(e => `${md(e.date)} ${e.t}(${ddText(dd(e.date))})`).join(' / '), ref: '#/cal' });
  }
  if (/(내|제|나의).*(업무|담당)|내가\s*맡/.test(q)) {
    const m = S.duties.filter(d => d.mine);
    if (m.length) out.push({ src: '업무 분장표(내 업무)', text: m.map(d => `${d.dept}: ${d.work}`).join(' / '), ref: '#/lib' });
  }
  return out;
}

/* 4) 선택: Claude 키를 넣으면 찾은 조각만 보내서 문장으로 정리 */
async function askClaude(q, hits) {
  const key = localStorage.getItem('tf.claudeKey'); if (!key) return null;
  const ctx = hits.map((h, i) => `[${i + 1}] (${h.c.src}) ${h.c.text}`).join('\n');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 700, system: '당신은 학교 교사의 업무 비서 꿈송이입니다. 아래 [자료] 안에서만 존댓말로 짧게 답하고, 근거 번호를 [1]처럼 붙이세요. 자료에 없으면 없다고 말하세요. 질문이 맞춤법·말투가 엉망이어도 의도를 파악하세요.', messages: [{ role: 'user', content: `질문: ${q}\n\n[자료]\n${ctx}` }] })
  });
  if (!r.ok) throw new Error('Claude 응답 오류 ' + r.status);
  const j = await r.json(); return (j.content || []).map(x => x.text || '').join('');
}

/* 5) 계획서·공문 글에서 '항목+금액+기한' 후보 뽑기 */
function extractBudget(text) {
  const out = [];
  const dateRe = /(20\d\d)[.\-/]\s?(\d{1,2})[.\-/]\s?(\d{1,2})|(\d{1,2})\s?월\s?(\d{1,2})\s?일|(\d{1,2})\/(\d{1,2})/;
  const yr = new Date().getFullYear();
  text.split(/\n|\f/).forEach(line => {
    const m = line.match(/([가-힣A-Za-z·\s()]{2,30}?)[\s:：|·\-]*([\d]{1,3}(?:,\d{3})+|\d{4,})\s*원?/);
    if (!m) return;
    const amt = +m[2].replace(/,/g, ''); if (amt < 1000) return;
    if (/(전화|연락|우편|번호)/.test(m[1])) return;
    let item = m[1].replace(/\s+/g, ' ').trim(); if (item.length < 2) return;
    let dl = ''; const d = line.match(dateRe);
    if (d) { if (d[1]) dl = `${d[1]}-${pad(d[2])}-${pad(d[3])}`; else if (d[4]) dl = `${yr}-${pad(d[4])}-${pad(d[5])}`; else if (+d[6] <= 12 && +d[7] <= 31) dl = `${yr}-${pad(d[6])}-${pad(d[7])}`; }
    out.push({ item, alloc: amt, deadline: dl, on: true });
  });
  return out.slice(0, 40);
}

/* 6) 학사일정 글에서 '날짜(또는 기간) + 행사 이름' 뽑기 — 연도가 없으면 학년도(3월~다음해 2월)로 추정 */
function schoolYearNow() { const n = new Date(); return n.getMonth() + 1 >= 3 ? n.getFullYear() : n.getFullYear() - 1; }
function extractSchedule(text, sy) {
  const yr = m => (m >= 3 ? sy : sy + 1), out = [];
  const W = '\\s*(?:\\([월화수목금토일]\\))?';
  const re = new RegExp('(?:(20\\d\\d)\\s*[.\\-/년]\\s*)?(\\d{1,2})\\s*[.\\-/월]\\s*(\\d{1,2})\\s*일?' + W + '(?:\\s*[~∼～–\\-]\\s*(?:(20\\d\\d)\\s*[.\\-/년]\\s*)?(?:(\\d{1,2})\\s*[.\\-/월]\\s*)?(\\d{1,2})\\s*일?' + W + ')?', 'g');
  const clean = s => s.replace(/[|]+/g, ' ').replace(/^[\s:：,.\-–·•○▪■※*)\]]+/, '').replace(/[\s,;]+$/, '').replace(/\s+[월화수목금토일]$/, '').replace(/\s+/g, ' ').trim();
  text.split(/\n|\f/).forEach(line => {
    line = line.trim(); if (!line) return;
    const ms = [...line.matchAll(re)].filter(m => +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31);
    ms.forEach((m, i) => {
      const next = ms[i + 1], seg = line.slice(m.index + m[0].length, next ? next.index : line.length);
      let title = clean(seg); if (!title && i === 0) title = clean(line.slice(0, m.index));
      if (title.length < 2 || /^[\d\s.]+$/.test(title)) return;
      const sm = +m[2], sd = +m[3], sY = m[1] ? +m[1] : yr(sm);
      const date = `${sY}-${pad(sm)}-${pad(sd)}`; let end = '';
      if (m[6]) { const em = m[5] ? +m[5] : sm, ed = +m[6]; if (em >= 1 && em <= 12 && ed >= 1 && ed <= 31) { const eY = m[4] ? +m[4] : (m[5] ? yr(em) : sY); end = `${eY}-${pad(em)}-${pad(ed)}`; if (end <= date) end = ''; } }
      out.push({ on: true, date, end, title: title.slice(0, 60), dup: false });
    });
  });
  return out.slice(0, 200);
}

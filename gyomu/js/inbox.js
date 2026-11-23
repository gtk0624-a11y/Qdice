/* 경기도 메신저 붙여넣기 → 일정·할 일·내 업무로 정리해서 추가 */
const IBX = { kw: /(까지|마감|제출|기한|회신|신청|보고|입력|취합)/, ev: /(회의|연수|행사|협의회|평가|워크숍|설명회|간담회|공개수업|체육대회|시험|방문|점검|교육|조사기간|기간|실시|운영|개최|일시)/ };
function ibxYear(m) { const n = new Date(), y = n.getFullYear(); return (m < n.getMonth() + 1 - 6) ? y + 1 : y; }
function ibxDates(line) {
  const n = new Date(), td = n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate(), pad2 = x => String(x).padStart(2, '0');
  const ok = (y, mo, d) => { if (mo < 1 || mo > 12 || d < 1 || d > 31) return false; const t = new Date(y, mo - 1, d); return t.getMonth() === mo - 1 && t.getDate() === d; };
  const iso = (y, mo, d) => `${y}-${pad2(mo)}-${pad2(d)}`;
  const hasKw = /까지|부터|마감|제출|기한|일시|일정|기간|회신|신청|실시|개최|[~∼–]|\(\s*[월화수목금토일]\s*\)|[월화수목금토일]요일/.test(line);
  const WD = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
  const tok = [];
  const add = (m, date) => { if (date) tok.push({ date, raw: m[0], idx: m.index, end: m.index + m[0].length }); };
  let m;
  /* 1) 연도 있는 날짜: 2026.11.25 · 2026-11-25 · 2026/11/25 · 2026년 11월 25일 · 26.11.25 · 20261125 */
  const re1 = /(?<![\d.])(20\d\d|\d\d)\s*([.\-\/]|년\s*)\s*(\d{1,2})\s*([.\-\/]|월\s*)\s*(\d{1,2})\s*(?:일|\.)?(?!\d)/g;
  while ((m = re1.exec(line))) { let y = +m[1]; if (y < 100) { if (m[2].trim() !== '.' && !/년/.test(m[2])) continue; y += 2000; } if (ok(y, +m[3], +m[5])) add(m, iso(y, +m[3], +m[5])); }
  const re2 = /(?<!\d)(20\d\d)(\d\d)(\d\d)(?!\d)/g; while ((m = re2.exec(line))) if (ok(+m[1], +m[2], +m[3])) add(m, iso(+m[1], +m[2], +m[3]));
  /* 2) 월/일: 11월 25일 · 11월25일 · 11/25 · 11.25 · 11.25. · 11.25일(수) · 11-25 */
  const re3 = /(?<![\d.\-\/])(\d{1,2})\s*(월|\/|\.|-)\s*(\d{1,2})\s*(일|\.)?(?![\d])/g;
  while ((m = re3.exec(line))) {
    const mo = +m[1], d = +m[3], sep = m[2], tail = m[4] || '', after = line.slice(m.index + m[0].length), before = line.slice(Math.max(0, m.index - 1), m.index);
    if (!ok(2000, mo, d) && !(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) continue;
    if (/^\s*(반|학년|교시|번|명|호|조|차시|차|회|개|%|점|시간|분|원|배|kg|cm|mm|m\b)/.test(after)) continue;       /* 1-1반, 3.5점 같은 것 */
    if (/[A-Za-z]/.test(before)) continue;
    const strong = sep === '월' || sep === '/' || tail === '일' || /^\s*\(\s*[월화수목금토일]/.test(after) || /^\.\s*(?!\d)/.test(tail + after.charAt(0)) && tail === '.';
    if (!strong && !(hasKw && sep !== '-')) continue;                        /* 점·하이픈만 있는 숫자쌍은 날짜 단서가 있을 때만 */
    if (sep === '-' && !strong) continue;
    const y = ibxYear(mo); if (ok(y, mo, d)) add(m, iso(y, mo, d));
  }
  /* 3) 일만 있는 날짜: 25일(수) · ~27일 · ~26(목) — 앞 날짜의 달을 이어받고, 없으면 오늘 기준 가장 가까운 날 */
  const re4 = /(?<![\d.\/\-월])(\d{1,2})\s*(일|(?=\s*\(\s*[월화수목금토일]\s*\)))(?!\s*(간|째|동안|이내|전|후|이상|이하|\d))/g;
  while ((m = re4.exec(line))) {
    const d = +m[1]; if (d < 1 || d > 31) continue; const after = line.slice(m.index + m[0].length);
    if (!(/^\s*\(\s*[월화수목금토일]/.test(after) || (m[2] === '일' && hasKw))) continue;
    if (tok.some(t => m.index < t.end && m.index + m[0].length > t.idx)) continue;
    const prev = tok.filter(t => t.end <= m.index).sort((x, y) => y.end - x.end)[0]; let y, mo;
    if (prev && /[~∼–]\s*$/.test(line.slice(prev.end, m.index))) { y = +prev.date.slice(0, 4); mo = +prev.date.slice(5, 7); } else { y = n.getFullYear(); mo = n.getMonth() + 1; if (y * 10000 + mo * 100 + d < td - 7) { mo++; if (mo > 12) { mo = 1; y++; } } }
    if (ok(y, mo, d)) add(m, iso(y, mo, d));
  }
  /* 4) 말로 쓴 날: 오늘·내일·모레·이번 주 수요일·다음 주 금요일·차주 월요일 */
  const rel = (days, m) => { const t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + days); add(m, iso(t.getFullYear(), t.getMonth() + 1, t.getDate())); };
  const re5 = /(오늘|금일|내일|명일|모레|글피)(?![가-힣])/g; while ((m = re5.exec(line))) rel({ 오늘: 0, 금일: 0, 내일: 1, 명일: 1, 모레: 2, 글피: 3 }[m[1]], m);
  const re6 = /(이번\s*주|금주|다음\s*주|차주|담주|다다음\s*주)?\s*([월화수목금토일])요일/g;
  while ((m = re6.exec(line))) {
    const wd = WD[m[2]], base = n.getDay(); let diff;
    if (m[1]) { const w = /다다음/.test(m[1]) ? 2 : /다음|차주|담주/.test(m[1]) ? 1 : 0; diff = ((wd + 6) % 7) - ((base + 6) % 7) + 7 * w; }
    else { if (!hasKw && !IBX.ev.test(line)) continue; if (tok.length) continue; diff = (wd - base + 7) % 7; }
    rel(diff, m);
  }
  tok.sort((a, b) => a.idx - b.idx || (b.end - b.idx) - (a.end - a.idx));
  const out = []; tok.forEach(t => { if (!out.some(o => t.idx < o.idx + o.raw.length && t.end > o.idx)) out.push({ date: t.date, raw: t.raw, idx: t.idx }); });
  return out;
}
function ibxClean(s) { return s.replace(/^[\s\-•▶▷□■○●※*◦·ㅇ]+/, '').replace(/^\d{1,2}[.)]\s+(?=[^\d\s])/, '').replace(/\[[^\]]{0,20}\]/g, '').replace(/\s+/g, ' ').trim(); }
/* 잡말 줄(인사·연락처·붙임·주소)은 버리고, 날짜 줄에서 핵심 이름·시간·장소만 뽑는다 */
const IBX_DROP = /^(안녕하세요|안녕하십니까|감사합니다|고맙습니다|수고|바쁘신|문의|담당자?\s*[:：]|연락처|전화|☎|붙임|첨부|다운로드|https?:|www\.|※?\s*(참고|유의)|끝\.?$)|@[\w.-]+\.\w|\b0\d{1,2}-\d{3,4}-\d{4}\b/;
const IBX_LABEL = /^(일시|일정|기간|기한|마감|제출\s*기한|신청\s*기간|회신\s*기한|연수\s*일시|행사\s*일시|시간)\s*[:：]\s*/;
const IBX_PLACE = /^(장소|위치)\s*[:：]\s*(.+)$/;
const IBX_META = /^(발신|수신|보낸|받는|일시|시간|날짜|문서번호|시행|접수)\s*[:：]/;
function ibxTime(l) { const m = l.match(/(\d{1,2}):(\d{2})(?:\s*[~∼–]\s*(\d{1,2}):(\d{2}))?/); return m ? m[0].replace(/\s+/g, '') : ''; }
function ibxShort(t, n) { if (t.length <= n) return t; let c = t.slice(0, n); const i = c.lastIndexOf(' '); if (i > n * 0.5) c = c.slice(0, i); return c.replace(/[\s,.:;·\-(]+$/, '').replace(/(은|는|을|를|이|가|에|의|와|과|및)$/, '') + '…'; }
function ibxTitle(l, ds) {
  let t = l.replace(IBX_LABEL, ' ').replace(/(일시|일정|기간|기한|마감|제출\s*기한|신청\s*기간|회신\s*기한)\s*[:：]/g, ' ');
  ds.forEach(d => { t = t.replace(d.raw, ' '); });
  t = t.replace(/\d{1,2}:\d{2}(\s*[~∼–]\s*\d{1,2}:\d{2})?/g, ' ').replace(/\(\s*[월화수목금토일]\s*\)/g, ' ').replace(/[~∼–]/g, ' ').replace(/(까지|부터)/g, ' ')
    .replace(/(하시기\s*)?바랍니다\.?|바람\.?|요망\.?|협조\s*부탁드립니다\.?|제출하여\s*주시기|해\s*주시기|하여\s*주시기/g, ' ');
  t = ibxClean(t).replace(/^[:：\s,.·\-]+|[:：\s,.·\-]+$/g, '').replace(/\s+/g, ' ');
  if (t.split(' ').length > 2) t = t.replace(/\s+\S+(으로|로)$/, '');
  t = t.replace(/\s*(을|를)?\s*하는\s*날입니다\.?$/, '').replace(/(입니다|이에요|예요|입니다만)\.?$/, '').replace(/(은|는|을|를)$/, '');
  return t;
}
function ibxParse(text) {
  const raw = text.split(/\r?\n/).map(s => s.trim().replace(/^[\s\-•▶▷□■○●※*◦·ㅇ]+/, '').replace(/^(\d{1,2}[.)]|[①-⑩]|[가-하][.)])\s*(?=[^\d\s])/, '')).filter(Boolean), norm = l => { let x = l.replace(/^(안녕하세요|안녕하십니까)[^.!~\n]{0,40}[.!~]+\s*/, ''); if (!ibxDates(x).length) return x; const org = ((x.match(/(?:주관|주최)\s*[:：]\s*([^\s,;]+)/) || [])[1]) || ''; x = x.replace(/\s+(주관|주최|담당|대상|문의|비고|장소)\s*[:：].*$/, '').replace(/\s*\S*(파이팅|화이팅|감사합니다|즐거운|되십시|되세요)[^\n]*$/, '').replace(/\s*:\)\s*$/, '').trim(); return org ? x + ' ‹주관 ' + org + '›' : x; },
    lines = raw.map(norm).filter(Boolean).filter(l => !IBX_DROP.test(l));
  const head = lines.find(l => !IBX_META.test(l) && !ibxDates(l).length && l.length > 3) || '';
  const subject = /(요|니다|세요|까요|해\s*주[^\s]*)[.!~\s]*$/.test(head) ? '' : ibxClean(head).replace(/^\d{4}학년도\s*/, '').replace(/\s*(실시\s*)?(안내|알림|협조|요청|공문)\s*$/, '').slice(0, 30);
  const res = [], seen = new Set();
  const push = (date, title, kind, on) => { title = ibxShort(title, 46); const k = date + '|' + title; if (seen.has(k)) return; seen.add(k); res.push({ date, title, kind, on }); };
  lines.forEach((l0, i) => { let l = l0;
    if (l === head) return; const ds = ibxDates(l); if (!ds.length) return;
    const lab = (l.match(IBX_LABEL) || [])[1] || '', deadline = /(기한|마감)\s*[:：]|(기한|마감)\s*$/.test(l.replace(/(까지|부터).*$/, '')) || /기한|마감/.test(lab);
    const range = ds.length > 1 && /[~∼–]/.test(l.slice(ds[0].idx + ds[0].raw.length, ds[1].idx)) ? ds[1].date : '';
    const mo2 = l.match(/‹주관 ([^›]+)›/); if (mo2) l = l.replace(/\s*‹주관 [^›]+›/, '');
    let t = ibxTitle(l, ds);
    t = t.replace(/[월화수목금토일]요일/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/(\S{2,})\s+\1$/, '$1'); if (t && t.length <= 4 && subject) t = subject + ' ' + t;
    const fb = !t; if (fb) t = (subject || '일정') + (deadline ? ' 마감' : '');
    else { /* 날짜 줄 아래 이어지는 짧은 줄(행사 이름·주관)을 한 제목으로 묶는다 */
      const det = []; let org = mo2 ? mo2[1] : '';
      for (let j = i + 1; j < lines.length && j <= i + 5; j++) { const x = lines[j]; if (ibxDates(x).length) break; if (IBX_PLACE.test(x) || IBX_META.test(x) || /파이팅|화이팅|즐거운|하루|되십시|되세요|감사|수고|^[^가-힣A-Za-z0-9]+$|:\)/.test(x)) continue; const m = x.match(/^(주관|주최|주관부서)\s*[:：]\s*(.+)$/); if (m) { org = m[2].trim(); continue; } if (/^(담당|대상|비고|준비물)\s*[:：]/.test(x)) continue; if (x.length <= 30 && det.length < 1) det.push(ibxClean(x)); }
      if (det.length && !/마감/.test(t)) t += ' · ' + det[0]; if (org && org.length <= 12) t += ' (주관 ' + org + ')';
    }
    if (range) t += ` (~${+range.slice(5, 7)}/${+range.slice(8)})`;
    const tm = ibxTime(l) || ibxTime(lines[i + 1] || '') || ibxTime(lines[i + 2] || '');
    if (tm) t += ' ' + tm;
    let pl = ''; for (let j = i + 1; j <= i + 3 && j < lines.length; j++) { const m = lines[j].match(IBX_PLACE); if (m) { pl = m[2].replace(/\s*\(.*$/, '').trim(); break; } }
    const todo = deadline || (IBX.kw.test(l) && !/(회의|연수|행사|협의회|워크숍|설명회|간담회|공개수업|체육대회|방문|개최)/.test(l));
    if (todo && !/제출|입력|회신|마감|신청|보고|취합/.test(t)) t += ' 마감';
    if (pl && pl.length <= 14 && !todo) t += ' @' + pl;
    const narrative = !lab && !IBX.kw.test(l) && !IBX.ev.test(l) && l.length > 50;
    const d0 = ds.find(d => d.date >= today()) || ds[0], past = d0.date < today(), story = /^(지난|앞서|이전|기존)|안내드린|바와 같이|하였으나|위와 같이/.test(l);
    push(d0.date, t, todo ? 'todo' : 'event', !(narrative || past || story));
  });
  if (subject) push('', subject, 'mine', res.length === 0);
  return res;
}
/* Claude 키가 있으면 Claude가 일정·마감만 골라 정리한다(실패하면 위 규칙으로 처리) */
async function ibxAI(text) {
  const sys = `당신은 교사가 붙여넣은 학교 메신저·공문에서 "일정과 마감"만 뽑는 도우미입니다. 인사말·배경 설명·담당자·연락처·붙임·주소·URL은 모두 무시합니다. 오늘은 ${today()}입니다. 연도가 없으면 오늘 이후 가장 가까운 해로 봅니다.
JSON만 출력하세요(설명·코드블록 금지): {"subject":"이 글의 업무명 20자 이내","items":[{"date":"YYYY-MM-DD","end":"기간이면 종료일 아니면 빈 문자열","time":"HH:MM 또는 HH:MM~HH:MM 또는 빈 문자열","title":"핵심 명사구 12~25자, 조사·어미·문장체 없이(예: 교직원 정보보안 연수, 수행평가 점수 입력 마감)","kind":"event(그날 열리는 행사·회의·연수·기간) 또는 todo(그날까지 제출·입력·회신)","place":"장소 없으면 빈 문자열"}]}
날짜가 불분명한 것은 넣지 않습니다. 같은 일정은 한 번만 넣습니다.`;
  const j = await Promise.race([b2Call({ model: B2_MODEL(), max_tokens: 1500, system: sys, messages: [{ role: 'user', content: text.slice(0, 12000) }] }), new Promise((_, r) => setTimeout(() => r(new Error('시간 초과')), 45000))]);
  const raw = (j.content || []).map(c => c.text || '').join(''), m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error('읽지 못했습니다');
  const o = JSON.parse(m[0]), out = [], seen = new Set();
  (o.items || []).forEach(x => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date || '') || !x.title) return;
    let t = String(x.title).trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(x.end || '') && x.end !== x.date) t += ` (~${+x.end.slice(5, 7)}/${+x.end.slice(8)})`;
    if (x.time) t += ' ' + x.time; const todo = x.kind === 'todo'; if (x.place && !todo && String(x.place).length <= 14) t += ' @' + x.place;
    const k = x.date + '|' + t; if (seen.has(k)) return; seen.add(k); out.push({ date: x.date, title: t, kind: todo ? 'todo' : 'event', on: true });
  });
  if (o.subject) out.push({ date: '', title: String(o.subject).slice(0, 30), kind: 'mine', on: out.length === 0 });
  return out;
}
function ibxStart() {
  ask('경기도 메신저 내용 붙여넣기', [{ k: 'text', label: '메신저 내용을 통째로 붙여넣으세요(인사말·연락처가 섞여 있어도 일정만 골라냅니다)', type: 'textarea', rows: 10, req: 1 }], async o => {
    const txt = o.text || ''; let c = null;
    if (typeof agKey === 'function' && agKey()) { toast('꿈송이가 일정을 읽는 중입니다…'); try { c = await ibxAI(txt); } catch (e) { toast('AI가 읽지 못해 규칙으로 정리합니다(' + e.message + ')'); } }
    if (!c || !c.length) c = ibxParse(txt);
    if (!c.length) return toast('일정이나 업무로 읽을 내용을 찾지 못했습니다.');
    ibxPreview(c);
  }, '정리하기');
}
/* 미리보기 창(메신저·문서 모두 여기로): 체크한 것만 일정·할 일·내 업무로 들어가고 캘린더에 반영됩니다 */
function ibxPreview(c) {
  {
    const d = document.createElement('dialog'); d.className = 'dlg';
    d.innerHTML = `<form method="dialog"><h3>이렇게 정리했습니다</h3><p class="mu">체크한 것만 추가됩니다. 날짜·제목·종류는 여기서 고칠 수 있습니다.</p>${c.map((x, i) => `<div class="ibx"><label class="chk"><input type="checkbox" name="c${i}" ${x.on === false ? '' : 'checked'}> 추가</label><input type="date" name="d${i}" value="${x.date}"><input name="t${i}" value="${esc(x.title)}"><select name="k${i}">${[['event', '일정'], ['todo', '할 일'], ['mine', '내 업무']].map(([v, n]) => `<option value="${v}" ${x.kind === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('')}<div class="btns"><button value="ok" class="pri">추가</button><button value="cancel" formnovalidate>취소</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => {
      if (d.returnValue === 'ok') {
        const f = new FormData(d.querySelector('form')); let n = 0, first = '';
        c.forEach((x, i) => {
          if (!f.get('c' + i)) return; const t = (f.get('t' + i) || '').trim(), dt = f.get('d' + i) || '', k = f.get('k' + i); if (!t) return;
          if (k === 'mine') { S.mine.push({ id: uid(), cat: '메신저', title: t, memo: dt, done: false }); OPEN.add('r11'); if (dt) S.items.push({ id: uid(), title: '[업무] ' + t, date: dt, cat: 'todo', done: false }); } /* 날짜가 있는 내 업무는 캘린더에도 */
          else S.items.push({ id: uid(), title: t, date: dt || today(), cat: k, done: false });
          if (dt && (!first || dt < first)) first = dt;
          n++;
        });
        try { localStorage.setItem('tf.open', JSON.stringify([...OPEN])); } catch (e) { }
        if (first) { UI.cal = first.slice(0, 7); UI.day = first; location.hash = '#/cal'; } /* 추가한 첫 날짜의 캘린더로 이동 */
        commit(); toast(n + '건을 추가했습니다. 캘린더에도 반영됐어요.');
      }
      d.remove();
    });
    d.showModal();
  }
}
A.ibx = ibxStart;
document.addEventListener('click', e => {
  const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault();
  const t = document.getElementById(a.dataset.go); if (t) { setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); const sec = t.closest('details.sec'); if (sec) { sec.open = true; OPEN.add(sec.dataset.k); try { localStorage.setItem('tf.open', JSON.stringify([...OPEN])); } catch (er) { } } const f = sec && sec.querySelector('details.fnt'); if (f) f.open = true; }
});

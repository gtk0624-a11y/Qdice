/* 경기도 메신저 붙여넣기 → 일정·할 일·내 업무로 정리해서 추가 */
const IBX = { kw: /(까지|마감|제출|기한|회신|신청|보고|입력|취합)/, ev: /(회의|연수|행사|협의회|평가|워크숍|설명회|간담회|공개수업|체육대회|시험|방문|점검|교육|조사기간|기간|실시|운영|개최|일시)/ };
function ibxYear(m) { const n = new Date(), y = n.getFullYear(); return (m < n.getMonth() + 1 - 6) ? y + 1 : y; }
function ibxDates(line) {
  const out = []; let m;
  const re = /(?:(20\d\d)\s*[.\-\/년]\s*)?(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})\s*(?:일|\.)?(?!\d)/g;
  while ((m = re.exec(line))) {
    const mo = +m[2], d = +m[3]; if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    if (!m[1] && /\d\s*[.]\s*\d/.test(m[0]) && !/월|\//.test(m[0]) && /\d{2,}\.\d/.test(line.slice(Math.max(0, m.index - 1), m.index + m[0].length + 1))) continue;
    const y = m[1] ? +m[1] : ibxYear(mo);
    out.push({ date: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, raw: m[0], idx: m.index });
  }
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
  t = t.replace(/(은|는|을|를)$/, '');
  return t;
}
function ibxParse(text) {
  const raw = text.split(/\r?\n/).map(s => s.trim().replace(/^[\s\-•▶▷□■○●※*◦·ㅇ]+/, '').replace(/^(\d{1,2}[.)]|[①-⑩]|[가-하][.)])\s*(?=[^\d\s])/, '')).filter(Boolean), lines = raw.filter(l => !IBX_DROP.test(l));
  const head = lines.find(l => !IBX_META.test(l) && !ibxDates(l).length && l.length > 3) || '';
  const subject = ibxClean(head).replace(/^\d{4}학년도\s*/, '').replace(/\s*(실시\s*)?(안내|알림|협조|요청|공문)\s*$/, '').slice(0, 30);
  const res = [], seen = new Set();
  const push = (date, title, kind, on) => { title = ibxShort(title, 46); const k = date + '|' + title; if (seen.has(k)) return; seen.add(k); res.push({ date, title, kind, on }); };
  lines.forEach((l, i) => {
    if (l === head) return; const ds = ibxDates(l); if (!ds.length) return;
    const lab = (l.match(IBX_LABEL) || [])[1] || '', deadline = /(기한|마감)\s*[:：]|(기한|마감)\s*$/.test(l.replace(/(까지|부터).*$/, '')) || /기한|마감/.test(lab);
    const range = ds.length > 1 && /[~∼–]/.test(l.slice(ds[0].idx + ds[0].raw.length, ds[1].idx)) ? ds[1].date : '';
    let t = ibxTitle(l, ds);
    if (!t) t = (subject || '일정') + (deadline ? ' 마감' : '');
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

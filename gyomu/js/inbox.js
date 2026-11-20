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
function ibxClean(s) { return s.replace(/^[\s\-•▶▷□■○●※*◦·\d]+[.)]?\s*/, '').replace(/\[[^\]]{0,20}\]/g, '').replace(/\s+/g, ' ').trim(); }
function ibxParse(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const head = lines.find(l => !/^(발신|수신|보낸|받는|일시|시간|날짜)\s*[:：]/.test(l) && !ibxDates(l).length && l.length > 3) || '';
  const subject = ibxClean(head).replace(/^\d{4}학년도\s*/, '').replace(/\s*(실시\s*)?(안내|알림|협조|요청|공문)\s*$/, '').slice(0, 30);
  const res = [], seen = new Set();
  const push = (date, title, kind) => { title = title.slice(0, 70); const k = date + '|' + title; if (seen.has(k)) return; seen.add(k); res.push({ date, title, kind }); };
  const dated = lines.map(l => ({ l, ds: ibxDates(l) })).filter(x => x.ds.length && x.l !== head);
  dated.forEach(({ l, ds }) => {
    let t = ibxClean(l);
    const range = ds.length > 1 && /[~∼–]/.test(l.slice(ds[0].idx + ds[0].raw.length, ds[1].idx)) ? ds[1].date : '';
    ds.forEach(d => { t = t.replace(d.raw, ' '); });
    t = t.replace(/\(\s*[월화수목금토일]\s*\)/g, '').replace(/[~∼–]/g, ' ').replace(/(까지|부터)/g, ' ').replace(/(하시기\s*)?바랍니다\.?|바람\.?|요망\.?|협조\s*부탁드립니다\.?/g, ' ').replace(/\s+/g, ' ').trim().replace(/(은|는|을|를)$/, '').replace(/^[:：\s,.]+|[:：\s,.]+$/g, '');
    const tm = l.match(/(\d{1,2}):(\d{2})/);
    if (!t || t === tm?.[0]) t = '일정';
    if (subject && !t.includes(subject.slice(0, 4))) t = subject + ': ' + t;
    if (range) t += ` (~${+range.slice(5, 7)}/${+range.slice(8)})`;
    if (tm && !t.includes(tm[0])) t += ' ' + tm[0];
    const todo = IBX.kw.test(l) && !IBX.ev.test(l.replace(/(입력|제출)/g, ''));
    push(ds[0].date, t, todo ? 'todo' : 'event');
  });
  if (subject) { push('', subject, 'mine'); res[res.length - 1].on = res.length === 1; }
  return res;
}
function ibxStart() {
  ask('경기도 메신저 내용 붙여넣기', [{ k: 'text', label: '메신저 내용을 통째로 붙여넣으세요', type: 'textarea', rows: 10, req: 1 }], o => {
    const c = ibxParse(o.text || '');
    if (!c.length) return toast('일정이나 업무로 읽을 내용을 찾지 못했습니다.');
    const d = document.createElement('dialog'); d.className = 'dlg';
    d.innerHTML = `<form method="dialog"><h3>이렇게 정리했습니다</h3><p class="mu">체크한 것만 추가됩니다. 날짜·제목·종류는 여기서 고칠 수 있습니다.</p>${c.map((x, i) => `<div class="ibx"><label class="chk"><input type="checkbox" name="c${i}" ${x.on === false ? '' : 'checked'}> 추가</label><input type="date" name="d${i}" value="${x.date}"><input name="t${i}" value="${esc(x.title)}"><select name="k${i}">${[['event', '일정'], ['todo', '할 일'], ['mine', '내 업무']].map(([v, n]) => `<option value="${v}" ${x.kind === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('')}<div class="btns"><button value="ok" class="pri">추가</button><button value="cancel" formnovalidate>취소</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => {
      if (d.returnValue === 'ok') {
        const f = new FormData(d.querySelector('form')); let n = 0;
        c.forEach((x, i) => {
          if (!f.get('c' + i)) return; const t = (f.get('t' + i) || '').trim(), dt = f.get('d' + i) || '', k = f.get('k' + i); if (!t) return;
          if (k === 'mine') { S.mine.push({ id: uid(), cat: '메신저', title: t, memo: dt, done: false }); OPEN.add('r11'); }
          else S.items.push({ id: uid(), title: t, date: dt || today(), cat: k, done: false });
          n++;
        });
        try { localStorage.setItem('tf.open', JSON.stringify([...OPEN])); } catch (e) { }
        commit(); toast(n + '건을 추가했습니다.');
      }
      d.remove();
    });
    d.showModal();
  }, '정리하기');
}
A.ibx = ibxStart;
document.addEventListener('click', e => {
  const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault();
  const t = document.getElementById(a.dataset.go); if (t) { setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); const sec = t.closest('details.sec'); if (sec) { sec.open = true; OPEN.add(sec.dataset.k); try { localStorage.setItem('tf.open', JSON.stringify([...OPEN])); } catch (er) { } } const f = sec && sec.querySelector('details.fnt'); if (f) f.open = true; }
});

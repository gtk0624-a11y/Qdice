/* mine.js — 업무분장표 → "내 업무" 자동 분류 (접이식 줄 + 전부 편집 가능) */
const mineSplit = w => [...new Set(String(w || '').split(/[\n·•ㆍ;]|\s\/\s|,\s*/).map(s => s.replace(/^[\-\d.)\s]+/, '').trim()).filter(s => s.length > 1))];

function csvLine(l) { const o = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(cur.trim()); cur = ''; } else cur += ch; } o.push(cur.trim()); return o; }
/* 분장표 글자 → [{dept, work, who, mine}] (표는 ' | '·탭·쉼표로 나뉜 줄, 표 구조가 없으면 이름 줄 위의 두 줄을 업무로 봄) */
function dutyParse(text, name) {
  const out = []; let dept = '', prev = [];
  for (const line of String(text || '').split(/\n/)) {
    const l = line.replace(/\f/g, '').trim(); if (!l) continue;
    const raw = /\s\|\s|\t/.test(l) ? l.split(/\s\|\s|\t/).map(s => s.trim()) : csvLine(l), lead = raw.length > 2 && !raw[0];
    const cells = raw.map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
    if (cells.length >= 2) {
      if (/^(부서|구분|연번|번호)/.test(cells[0]) && /업무|담당/.test(l) && l.length < 80) continue;
      const ni = name ? cells.findIndex(x => x.includes(name)) : -1, wi = ni >= 0 ? ni : cells.length - 1;
      const who = cells[wi], rest = cells.filter((x, i) => i !== wi && !/^\d{1,3}$/.test(x));
      if (!rest.length) continue;
      let d = dept, work;
      if (rest.length >= 2 && !lead) { d = rest[0]; dept = d; work = rest.slice(1).sort((a, b) => b.length - a.length)[0]; } else work = rest.sort((a, b) => b.length - a.length)[0];
      out.push({ dept: d, work, who, mine: ni >= 0 });
      prev = [];
    } else {
      if (name && l.includes(name) && l.length < 30 && prev.length) out.push({ dept: prev[prev.length - 2] || '', work: prev[prev.length - 1], who: l, mine: true });
      else { prev.push(l); if (prev.length > 3) prev.shift(); }
    }
  }
  return out;
}

function mineBody() {
  const g = {}; S.mine.forEach(m => (g[m.cat || '기타'] = g[m.cat || '기타'] || []).push(m));
  const list = Object.keys(g).map(c => `<div class="mg"><b class="mgc">${esc(c)}</b>${g[c].map(m => `<div class="mi ${m.done ? 'dn' : ''}"><input type="checkbox" data-mine="done" data-id="${m.id}" ${m.done ? 'checked' : ''} aria-label="완료"><input class="mt" data-mine="title" data-id="${m.id}" value="${esc(m.title)}" aria-label="업무 내용"><input class="mc" data-mine="cat" data-id="${m.id}" value="${esc(m.cat)}" placeholder="분류" aria-label="분류"><input class="mm" data-mine="memo" data-id="${m.id}" value="${esc(m.memo || '')}" placeholder="메모·기한" aria-label="메모"><button class="x" data-act="mineDel" data-id="${m.id}">삭제</button></div>`).join('')}</div>`).join('');
  return (list || '<p class="mu">아직 없습니다. 업무분장표를 올리면 내 이름이 적힌 업무를 자동으로 모읍니다.</p>') +
    `<div class="tools"><label class="btn sm file">업무분장표 올려서 내 업무 찾기<input type="file" id="mineUp" accept=".hwp,.hwpx,.docx,.xlsx,.xls,.csv,.txt,.pdf" hidden></label><button class="btn sm" data-act="minePaste">표 붙여넣기</button><button class="btn sm" data-act="mineAdd">+ 업무 직접 추가</button></div>`;
}
function mineRow() {
  const n = S.mine.length, left = S.mine.filter(m => !m.done).length;
  return row('r11', '학교', '내 업무', n ? `${n}건 · 남은 ${left}건 · ${esc(S.mine[0].title)}` : '업무분장표를 올리면 내 업무를 모아 줍니다', '', mineBody());
}

function mineStart(text) {
  ask('분장표에서 내 업무 찾기', [{ k: 'n', label: '내 이름 (분장표에 적힌 그대로)', val: S.profile.name || '', req: 1 }], v => mineShow(dutyParse(text, v.n.trim()), v.n.trim()), '찾기');
}
function mineShow(rows, name) {
  if (!rows.length) { toast('분장표에서 표를 찾지 못했습니다. 표 부분만 복사해 [표 붙여넣기]를 써 보세요.'); return; }
  const items = []; rows.filter(r => r.mine).forEach(r => mineSplit(r.work).forEach(t => items.push({ cat: r.dept || '기타', title: t })));
  const d = document.createElement('dialog'); d.className = 'dlg';
  d.innerHTML = `<form method="dialog"><h3>내 업무 ${items.length}건을 찾았습니다</h3><p class="mu">'${esc(name)}' 이름이 있는 줄에서 뽑았습니다. 전체 분장표 ${rows.length}줄도 함께 저장해 꿈송이가 찾을 수 있게 합니다. 틀린 것은 체크를 빼거나 고치세요. 저장한 뒤에도 언제든 고칠 수 있습니다.</p>${items.length ? '' : '<p class="mu"><b>이름이 적힌 줄을 못 찾았습니다.</b> 이름을 확인해 다시 하거나, 저장 후 [+ 업무 직접 추가]를 쓰세요.</p>'}<div class="mpv">${items.map((it, i) => `<div class="mi"><input type="checkbox" data-i="${i}" checked aria-label="포함"><input class="mt" data-t="${i}" value="${esc(it.title)}"><small>${esc(it.cat)}</small></div>`).join('')}</div><div class="btns"><button value="ok" class="pri">저장</button><button value="cancel" formnovalidate>취소</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => {
    if (d.returnValue === 'ok') {
      const picked = items.map((it, i) => ({ cat: it.cat, title: (d.querySelector(`[data-t="${i}"]`).value || '').trim(), on: d.querySelector(`[data-i="${i}"]`).checked })).filter(x => x.on && x.title);
      S.duties = S.duties.filter(x => x.who !== '예시');
      const key = x => [x.dept, x.work, x.who].join('|'), have = new Set(S.duties.map(key));
      rows.forEach(r => { if (!have.has(key(r))) { S.duties.push({ id: uid(), dept: r.dept, work: r.work, who: r.who, mine: r.mine }); have.add(key(r)); } });
      const mk = new Set(S.mine.map(m => m.cat + '|' + m.title)); let add = 0;
      picked.forEach(x => { if (!mk.has(x.cat + '|' + x.title)) { S.mine.push({ id: uid(), cat: x.cat, title: x.title, memo: '', done: false }); mk.add(x.cat + '|' + x.title); add++; } });
      OPEN.add('r11'); try { localStorage.setItem('tf.open', JSON.stringify([...OPEN])); } catch (e) { }
      commit(); toast(`내 업무 ${add}건을 넣었습니다. 오늘 화면의 '내 업무' 줄을 펼쳐 보세요.`);
    }
    d.remove();
  });
  d.showModal();
}

Object.assign(A, {
  mineDel(el) { S.mine = S.mine.filter(m => m.id !== el.dataset.id); commit(); },
  mineAdd() { ask('내 업무 추가', [{ k: 'cat', label: '분류(부서·영역)', ph: '예: ○○부' }, { k: 'title', label: '업무 내용', req: 1 }, { k: 'memo', label: '메모·기한(선택)' }], o => { S.mine.push({ id: uid(), cat: (o.cat || '').trim() || '기타', title: o.title.trim(), memo: (o.memo || '').trim(), done: false }); OPEN.add('r11'); commit(); }); },
  minePaste() { ask('분장표 붙여넣기', [{ k: 'text', label: '한글·엑셀의 업무분장표 표를 복사해서 붙여 넣으세요', type: 'textarea', rows: 10, req: 1 }], o => mineStart(o.text), '다음'); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'mineUp') { const f = t.files[0]; if (!f) return; try { toast('분장표 읽는 중…'); const text = await readFile(f); t.value = ''; mineStart(text); } catch (er) { toast(er.message); } return; }
  const k = t.dataset && t.dataset.mine; if (!k) return;
  const m = S.mine.find(x => x.id === t.dataset.id); if (!m) return;
  if (k === 'done') { m.done = t.checked; commit(); }
  else if (k === 'cat') { m.cat = t.value.trim() || '기타'; commit(); }
  else { m[k] = t.value.trim(); if (k === 'title' && !m.title) { m.title = '(내용 없음)'; } save(true); toast('저장했습니다.'); }
});

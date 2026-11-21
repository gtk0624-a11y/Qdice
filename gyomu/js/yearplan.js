/* 연간 교육·훈련표 — 해마다 되풀이되는 연수·교육·훈련·행사를 한 표로 관리.
   줄 = 교육 이름(+법정 기준 메모), 칸 = 학기 × 대상(교직원·학생·학부모·기타/훈련). 틀은 해마다 그대로, 날짜만 새로 넣는다.
   데이터: S.yp = { year, rows:[{id,name,rule,cells:{'1t':{d,t,n,ok}}}], hist:{학년도:[...]} }  (참석은 '인원 숫자'만, 이름 명단은 넣지 않는다) */
const YP_COLS = [['1t', '1학기', '교직원'], ['1s', '1학기', '학생'], ['1p', '1학기', '학부모'], ['1x', '1학기', '기타·훈련'], ['2t', '2학기', '교직원'], ['2s', '2학기', '학생'], ['2p', '2학기', '학부모'], ['2x', '2학기', '기타·훈련']];
const YP_PRE = [
  ['학교폭력 예방교육', '교직원·학생·학부모 학기당 1회(연 2회)'], ['안전교육(소방·재난·교통·생활)', '교직원 3년 15시간 및 학교 연수 / 학생 안전교육'], ['소방·대피 훈련', '학기별 실시 여부 확인'], ['재난(지진·화재) 대피훈련', ''],
  ['인성교육', '교원 연 1시간 이상'], ['가정폭력 예방교육', '교원·학생·학부모 연 1시간'], ['아동학대 예방교육', '학생 6개월에 1회 이상'], ['교권보호 교육', '교원·학생·학부모 연 1회 이상'],
  ['생명존중·자살예방 교육', ''], ['양성평등·성희롱·성폭력 예방교육', ''], ['인권교육', '학생 학기당 2시간 / 학부모 연 2회'], ['도박예방교육', '학생·교직원·학부모 연 1시간(학부모는 가정통신문 가능)'],
  ['장애인식 개선·특수 의무연수', ''], ['개인정보보호·정보보안', ''], ['감염병 예방교육', ''], ['회복적 생활교육', ''], ['학교 행사(축제·체육대회 등)', '행사명은 줄 이름을 고쳐 쓰세요']
];
/* 도디쌤(곡선중) 2026학년도 노션 연수표 — 개인 예시, 버튼으로만 불러옴 */
const YP_MINE = "\"교육·훈련·행사\",\"법정 기준·메모\",\"1학기 교직원\",\"1학기 학생\",\"1학기 학부모\",\"1학기 기타·훈련\",\"2학기 교직원\",\"2학기 학생\",\"2학기 학부모\",\"2학기 기타·훈련\"\n\"학교폭력연수(연2회)\",\"교사·학생·학부모 학기당 1회\",\"3.10 (실시)\",\"3.26 (실시)\",\"3.19 (실시)\",\"\",\"\",\"9.7 (실시)\",\"\",\"\"\n\"안전연수(3년 15시간 및 학교연수)\",\"\",\"3.10 (실시)\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"\n\"인성연수\",\"교원 연 1시간 이상\",\"3.10 (실시)\",\"\",\"3.19 (실시)\",\"\",\"\",\"\",\"\",\"\"\n\"가정폭력연수\",\"교원·학생·학부모 연 1시간\",\"\",\"\",\"3.19 (실시)\",\"\",\"\",\"\",\"\",\"\"\n\"아동학대 예방교육\",\"학생 6개월에 1회 이상\",\"\",\"6.25 동영상시청 (실시)\",\"\",\"\",\"\",\"\",\"\",\"\"\n\"교권보호 교육\",\"교원·학생·학부모 연 1회 이상\",\"3.10 (실시)\",\"4.9 (실시)\",\"3.19 (실시)\",\"\",\"\",\"\",\"\",\"\"\n\"위기관리(자살예방)·생명존중\",\"\",\"\",\"4.17 (실시)\",\"\",\"\",\"\",\"\",\"\",\"\"\n\"양성평등\",\"\",\"\",\"\",\"3.19 (실시)\",\"\",\"\",\"\",\"\",\"\"\n\"긴급지원대상자 신고의무 관련 교육\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"\n\"회복적 생활교육\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"\n\"재난훈련\",\"\",\"\",\"5.13 5교시 (실시)\",\"\",\"\",\"\",\"\",\"\",\"\"\n\"인권교육\",\"학생 학기당 2시간, 학부모 연 2회 / 교직원: 7.3 교직원 회의\",\"\",\"\",\"3.19 (실시)\",\"\",\"\",\"\",\"\",\"\"\n\"도박예방교육\",\"학생·교직원·학부모 연 1시간 (학부모 가정통신문 가능)\",\"\",\"5.13 뮤지컬 6교시 (실시)\",\"\",\"\",\"\",\"\",\"\",\"\"\n\"소방 훈련\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"\n";
const ypSY = () => { const d = new Date(); return d.getMonth() >= 2 ? d.getFullYear() : d.getFullYear() - 1; };
const ypD = () => { const y = S.yp = S.yp || { year: ypSY(), rows: [], hist: {} }; y.rows = y.rows || []; y.hist = y.hist || {}; return y; };
const ypLab = k => { const c = YP_COLS.find(x => x[0] === k); return c ? c[1] + ' ' + c[2] : k; };
function ypParseDate(txt, sy) {
  txt = String(txt || ''); let m = txt.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/); const p = n => String(n).padStart(2, '0');
  if (m) return `${m[1]}-${p(m[2])}-${p(m[3])}`;
  m = txt.match(/(\d{1,2})\s*[.\/월-]\s*(\d{1,2})/); if (!m) return ''; const mo = +m[1], da = +m[2]; if (mo < 1 || mo > 12 || da < 1 || da > 31) return '';
  return `${mo >= 3 ? sy : sy + 1}-${p(mo)}-${p(da)}`;
}
function ypCellTxt(c) { if (!c) return ''; return (c.d ? md(c.d) : '') + (c.t ? (c.d ? ' ' : '') + esc(c.t) : '') + (c.n ? ` <small>(${+c.n}명)</small>` : ''); }
function ypItems() { /* 날짜가 있는 모든 칸 */
  const out = []; ypD().rows.forEach(r => Object.keys(r.cells || {}).forEach(k => { const c = r.cells[k]; if (c && c.d) out.push({ id: r.id + k, name: r.name, col: ypLab(k), d: c.d, t: c.t || '', ok: !!c.ok }); })); return out;
}
function ypEvents() { return ypItems().map(x => ({ date: x.d, t: `${x.name} (${x.col.replace('기타·훈련', '훈련')})`, kind: '연수', done: x.ok })); }
function ypAlerts() { return ypItems().filter(x => !x.ok && dd(x.d) !== null && dd(x.d) <= 14).sort((a, b) => a.d.localeCompare(b.d)); }
function ypView() {
  const Y = ypD(), sy = ypSY(), items = ypItems(), done = items.filter(x => x.ok).length, nxt = items.filter(x => !x.ok && dd(x.d) !== null && dd(x.d) >= 0).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 6);
  const late = items.filter(x => !x.ok && dd(x.d) !== null && dd(x.d) < 0).length;
  const roll = Y.year !== sy ? `<div class="ypbn">📅 이 표는 <b>${Y.year}학년도</b> 것입니다. 지금은 ${sy}학년도예요. <button class="btn sm pri" data-act="ypRoll">${sy}학년도로 넘기기</button> <span class="mu">줄(틀)은 그대로 두고 날짜·실시 표시만 비웁니다. 지난해 표는 보관됩니다.</span></div>` : '';
  const head = `<tr><th rowspan="2" class="ypn">교육·훈련·행사</th><th colspan="4" class="yph1">1학기</th><th colspan="4" class="yph2">2학기</th><th rowspan="2" class="ypx"></th></tr><tr>${YP_COLS.map(c => `<th class="yps">${c[2]}</th>`).join('')}</tr>`;
  const body = Y.rows.map(r => `<tr><th class="ypn">${typeof ypSig === 'function' ? ypSig(r) : ''}<b>${esc(r.name)}</b>${r.rule ? `<small>${esc(r.rule)}</small>` : ''}</th>${YP_COLS.map(c => { const v = (r.cells || {})[c[0]], over = v && v.d && !v.ok && dd(v.d) !== null && dd(v.d) < 0; return `<td><button class="ypc ${v ? (v.ok ? 'ok' : over ? 'late' : 'set') : ''}" data-act="ypCell" data-id="${r.id}" data-k="${c[0]}" aria-label="${esc(r.name)} ${c[1]} ${c[2]}">${v ? (v.ok ? '✔ ' : '') + ypCellTxt(v) || '·' : '＋'}</button></td>`; }).join('')}<td class="ypx"><button class="x" data-act="ypRowEdit" data-id="${r.id}">수정</button><button class="x" data-act="ypRowDel" data-id="${r.id}" aria-label="${esc(r.name)} 삭제">✕</button></td></tr>`).join('');
  return `<div class="bh"><h2>연간 교육·훈련</h2><span class="mu">매년 되풀이되는 연수·교육·훈련·행사를 한 표로. 칸을 누르면 예정일·실시 여부·참석 인원을 적습니다. 이름 명단은 넣지 않고 <b>인원수·증빙 파일</b>만 남깁니다.</span></div>${roll}
  <div class="hpcard ypsum"><b>${Y.year}학년도</b> · 날짜 있는 항목 ${items.length}건 · 실시 완료 ${done}건${late ? ` · <span class="hot">날짜 지남 ${late}건</span>` : ''}${nxt.length ? `<div class="ypnx">${nxt.map(x => `<span class="chp k-연수">${md(x.d)} ${esc(x.name)} <small>${esc(x.col)}</small> ${ddText(dd(x.d))}</span>`).join(' ')}</div>` : ''}</div>
  <div class="tools"><button class="btn sm pri" data-act="ypAdd">+ 줄 추가</button><button class="btn sm" data-act="ypPre">📋 법정·필수 교육 예시 줄 넣기</button><button class="btn sm" data-act="ypPaste">📥 붙여넣어 가져오기</button><label class="btn sm file">📂 엑셀·CSV 가져오기<input type="file" id="ypFile" accept=".csv,.tsv,.txt,.xlsx,.xls" hidden></label><button class="btn sm" data-act="ypMine">🏫 곡선중 2026 표 불러오기</button><button class="btn sm" data-act="ypCsv">⬇ 엑셀용 내려받기</button></div>
  ${Y.rows.length ? `<div class="ypwrap"><table class="yptb">${head}${body}</table></div>` : '<p class="mu">아직 줄이 없습니다. [📋 예시 줄 넣기]로 시작하거나, 노션·엑셀 표를 [📥 붙여넣어 가져오기] 하세요. 줄은 해마다 그대로 쓰고 날짜만 새로 넣으면 됩니다.</p>'}
  <p class="mu">💡 날짜를 넣으면 캘린더에 연수 색으로 나타나고, 14일 안으로 다가오면 오늘 화면에 알려 줍니다. 꿈송이에게 "안전교육 언제 했지?"라고 물어도 찾아 줍니다. 증빙 사진·문서는 아래 [파일 올리기]에 넣으세요.</p>`;
}
const ypCommit = () => commit();
Object.assign(A, {
  ypMine() { sure('도디쌤의 노션 연수표(2026학년도, 곡선중)를 불러옵니다. 같은 이름 줄은 칸만 덮어씁니다.', () => ypImportText(YP_MINE)); },
  ypCell(el) {
    const r = ypD().rows.find(x => x.id === el.dataset.id), k = el.dataset.k; if (!r) return; const c = (r.cells = r.cells || {})[k] || {};
    ask(`${r.name} · ${ypLab(k)}`, [{ k: 'd', label: '예정일(또는 실시일)', type: 'date', val: c.d || '' }, { k: 't', label: '메모 (예: 5교시, 강사, 방식)', val: c.t || '' }, { k: 'n', label: '참석 인원 (숫자만, 이름은 적지 않음)', type: 'number', val: c.n || '' }, { k: 'st', label: '상태', type: 'select', opts: ['예정', '실시 완료'], val: c.ok ? '실시 완료' : '예정' }], o => {
      const v = { d: o.d || '', t: (o.t || '').trim(), n: o.n ? +o.n : 0, ok: o.st === '실시 완료' };
      if (!v.d && !v.t && !v.n && !v.ok) delete r.cells[k]; else r.cells[k] = v; ypCommit();
    }, '저장');
  },
  ypAdd() { ask('줄 추가', [{ k: 'name', label: '교육·훈련·행사 이름', req: 1, ph: '예: 소방 훈련, 곡선제, 학부모 총회' }, { k: 'rule', label: '법정 기준·메모 (선택)', ph: '예: 학기당 1회' }], o => { ypD().rows.push({ id: uid(), name: o.name.trim(), rule: (o.rule || '').trim(), cells: {} }); ypCommit(); }, '추가'); },
  ypRowEdit(el) { const r = ypD().rows.find(x => x.id === el.dataset.id); if (!r) return; ask('줄 고치기', [{ k: 'name', label: '이름', val: r.name, req: 1 }, { k: 'rule', label: '법정 기준·메모', val: r.rule || '' }], o => { r.name = o.name.trim(); r.rule = (o.rule || '').trim(); ypCommit(); }, '저장'); },
  ypRowDel(el) { const r = ypD().rows.find(x => x.id === el.dataset.id); if (!r) return; sure(`「${r.name}」 줄을 지울까요? 적어 둔 날짜도 함께 사라집니다.`, () => { const Y = ypD(); Y.rows = Y.rows.filter(x => x !== r); ypCommit(); }); },
  ypPre() { const Y = ypD(), have = new Set(Y.rows.map(r => r.name)), add = YP_PRE.filter(p => !have.has(p[0])); if (!add.length) { toast('예시 줄이 이미 모두 있습니다.'); return; } sure(`예시 ${add.length}줄을 추가합니다. 기준(횟수·시간)은 참고용이니 해마다 받는 공문에 맞춰 고쳐 쓰세요.`, () => { add.forEach(p => Y.rows.push({ id: uid(), name: p[0], rule: p[1], cells: {} })); ypCommit(); toast('예시 줄을 넣었습니다. 칸을 눌러 날짜를 적으세요.'); }); },
  ypPaste() { ask('표 붙여넣기', [{ k: 'tx', label: '노션·엑셀·한글 표를 복사해 붙여넣으세요 (줄 이름, 기준, 칸 순서 / 날짜는 3.10, 3/10, 2026-03-10 모두 가능)', type: 'textarea', rows: 10, req: 1 }], o => ypImportText(o.tx), '가져오기'); },
  ypCsv() {
    const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"', Y = ypD(); const head = ['교육·훈련·행사', '법정 기준·메모', ...YP_COLS.map(c => c[1] + ' ' + c[2])];
    const rows = Y.rows.map(r => [r.name, r.rule || '', ...YP_COLS.map(c => { const v = (r.cells || {})[c[0]]; return v ? [v.d, v.t, v.n ? v.n + '명' : '', v.ok ? '(실시)' : ''].filter(Boolean).join(' ') : ''; })]);
    download(`연간교육훈련_${Y.year}.csv`, '﻿' + [head, ...rows].map(r => r.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8'); toast('엑셀로 열 수 있는 파일을 받았습니다.');
  },
  ypRoll() {
    const Y = ypD(), sy = ypSY(); sure(`${sy}학년도로 넘길까요? ${Y.year}학년도 표는 보관되고, 줄(틀)은 그대로 두고 날짜·실시 표시만 비웁니다.`, () => {
      Y.hist[Y.year] = JSON.parse(JSON.stringify(Y.rows)); Y.rows.forEach(r => { r.cells = {}; }); Y.year = sy; ypCommit(); toast(`${sy}학년도 표로 넘겼습니다. 날짜만 새로 넣으세요.`);
    });
  }
});
function ypSplit(line) { /* 탭이 있으면 탭, 아니면 쉼표(따옴표 처리) */
  if (line.includes('\t')) return line.split('\t').map(s => s.trim().replace(/^"([\s\S]*)"$/, '$1').replace(/""/g, '"'));
  const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out;
}
function ypImportRows(rows) {
  const Y = ypD(), sy = Y.year || ypSY(); let n = 0;
  rows.forEach(cols => {
    cols = cols.map(x => String(x == null ? '' : x).replace(/<br\s*\/?>/gi, '\n').trim()); if (!cols.length || !cols[0]) return;
    if (/^(업무\s*종류|교육·훈련|구분|교육명)/.test(cols[0]) || /^(교사|교직원|1학기|2학기)$/.test(cols[0])) return;
    const lines = cols[0].split('\n').map(s => s.trim()).filter(Boolean), name = lines[0]; if (!name) return;
    const wide = cols.length >= 10; /* 우리 내려받기 양식: 이름, 기준, 8칸 / 노션 양식: 이름, 필요연수, 6칸(교사·학생·학부모 × 2학기) */
    const rule = [lines.slice(1).join(' '), wide ? cols[1] : ''].filter(Boolean).join(' ').trim();
    const cells = {}, keys = wide ? YP_COLS.map(c => c[0]) : ['1t', '1s', '1p', '2t', '2s', '2p'], vals = cols.slice(2);
    keys.forEach((k, i) => { const tx = (vals[i] || '').trim(); if (!tx) return; const d = ypParseDate(tx, sy); let t = tx.replace(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/, '').replace(/(\d{1,2})\s*[.\/월-]\s*(\d{1,2})\s*일?\.?/, '').replace(/\(실시\)/, '').replace(/\s+/g, ' ').trim(); cells[k] = { d, t, n: 0, ok: /\(실시\)/.test(tx) }; });
    if (!wide && cols[1] && !rule.includes(cols[1])) { /* 필요연수 칸의 내용은 기준 메모로 */ }
    const ex = Y.rows.find(r => r.name === name); if (ex) { Object.assign(ex.cells, cells); if (rule && !ex.rule) ex.rule = rule; } else Y.rows.push({ id: uid(), name, rule: wide ? rule : [rule, cols[1]].filter(Boolean).join(' '), cells });
    n++;
  });
  ypCommit(); toast(n ? `${n}줄을 가져왔습니다. 칸 내용이 맞는지 눈으로 확인하세요.` : '가져올 줄을 찾지 못했습니다.'); return n;
}
function ypImportText(tx) { /* 따옴표 안의 줄바꿈은 한 칸으로 합침 */
  const lines = [], raw = String(tx || '').split(/\r?\n/); let buf = '';
  raw.forEach(l => { buf = buf ? buf + '<br>' + l : l; if ((buf.match(/"/g) || []).length % 2 === 0) { if (buf.trim()) lines.push(buf); buf = ''; } }); if (buf.trim()) lines.push(buf);
  return ypImportRows(lines.map(ypSplit));
}
document.addEventListener('change', async e => {
  if (!e.target || e.target.id !== 'ypFile') return; const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    if (/\.xlsx?$/i.test(f.name)) { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); ypImportRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })); }
    else ypImportText(await f.text());
  } catch (err) { toast('파일을 읽지 못했습니다: ' + (err.message || err)); }
}, true);

/* 오늘 화면 알림 카드 */
const ypInject = () => {
  const main = document.querySelector('#app main'); if (!main || !S.setup) return; const ex = main.querySelector('.yptoday'), isT = /^#\/(today)?$/.test(location.hash) || !location.hash; if (ex) ex.remove(); if (!isT || (S.navHide || []).includes('yp')) return;
  const L = ypAlerts(); if (!L.length) return;
  const d = document.createElement('div'); d.className = 'hpcard yptoday'; d.innerHTML = `<b>📚 교육·훈련 임박</b> <a class="btn sm" href="#/yp">표 열기 ▶</a>${L.slice(0, 6).map(x => `<div class="cmal">${dd(x.d) < 0 ? '<span class="hot">날짜 지남</span>' : ddText(dd(x.d))} · ${md(x.d)} ${esc(x.name)} <small class="mu">${esc(x.col)}</small> <button class="x" data-act="ypDone" data-id="${x.id}">실시 완료</button></div>`).join('')}`;
  const a = main.querySelector('.cmtoday') || main.querySelector('.hpcard') || main.querySelector('.cheer'); if (a) a.after(d); else main.prepend(d);
};
A.ypDone = el => { const id = el.dataset.id, k = id.slice(-2), rid = id.slice(0, -2), r = ypD().rows.find(x => x.id === rid); if (r && r.cells && r.cells[k]) { r.cells[k].ok = true; ypCommit(); toast('실시 완료로 표시했습니다. 참석 인원·증빙은 표에서 칸을 눌러 적으세요.'); } };
const _ypR = TF.render; TF.render = function () { const v = _ypR.apply(this, arguments); ypInject(); return v; };
(function () { const app = document.getElementById('app'); if (!app) return; let t = 0; new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { ypInject(); } catch (e) { } }, 0); }).observe(app, { childList: true }); })();

/* 꿈송이 검색 */
const _ypBc = buildChunks;
buildChunks = function () {
  const out = _ypBc.apply(this, arguments), Y = ypD();
  Y.rows.forEach(r => { const parts = YP_COLS.map(c => { const v = (r.cells || {})[c[0]]; return v ? `${ypLab(c[0])} ${v.d || ''} ${v.t || ''} ${v.n ? v.n + '명 참석' : ''} ${v.ok ? '실시 완료' : '아직 실시 전'}` : ''; }).filter(Boolean);
    out.push({ type: 'training', src: `${Y.year}학년도 교육·훈련표 · ${r.name}`, text: `${r.name} ${r.rule || ''} ${parts.join(' / ') || '날짜 아직 없음'}`, ref: '#/yp' }); });
  Object.keys(Y.hist).forEach(y => (Y.hist[y] || []).forEach(r => { const parts = YP_COLS.map(c => { const v = (r.cells || {})[c[0]]; return v ? `${ypLab(c[0])} ${v.d || ''} ${v.t || ''}` : ''; }).filter(Boolean); if (parts.length) out.push({ type: 'training', src: `${y}학년도 교육·훈련표(지난해) · ${r.name}`, text: `${r.name} ${parts.join(' / ')}`, ref: '#/yp' }); }));
  return out;
};
if (typeof ORD_NAV !== 'undefined' && !ORD_NAV.some(x => x[0] === 'yp')) ORD_NAV.push(['yp', '연간 교육·훈련']);

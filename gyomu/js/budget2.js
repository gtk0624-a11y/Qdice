/* 예산 보강(v80): 집행 흐름 단계·유형별 서류 체크리스트·견적 기준 안내·불용 경보·집행 속도·업체 수첩·행사일 역산 일정·결산 한 장.
   지출(spend)에 type(유형) stg(단계) vendor(업체) docs(체크한 서류[])를 덧붙여 저장합니다. 기존 데이터는 그대로 두고 빈 값은 '지출' 단계로 봅니다. */
const BD_FLOW = ['계획', '품의', '계약·구매', '검수', '지출', '정산'];
const BD_TYPES0 = { '물품 구입': ['견적서', '품의서', '검수조서', '거래명세서·영수증'], '강사료': ['강사 이력서', '통장 사본', '강의 확인서', '원천징수 서류'], '간식·다과': ['참석자 명단', '영수증', '활동 사진'], '인쇄·제작': ['견적서', '시안 확인', '검수조서', '거래명세서'], '대관·시설': ['견적서', '계약서', '사용 허가'] };
const bdTypes = () => (S.bdTypes && Object.keys(S.bdTypes).length ? S.bdTypes : BD_TYPES0);
const bdCfg = () => { const c = S.bdCfg || {}, y = new Date().getFullYear(); return { est: c.est == null || c.est === '' ? 2000000 : +c.est, end: c.end || (y + '-12-20') }; };
function bdAll() { const r = []; S.budget.forEach(p => { (p.spends || []).forEach(s => r.push({ p, l: null, s })); p.lines.forEach(l => (l.spends || []).forEach(s => r.push({ p, l, s }))); }); return r; }
const bdFindS = id => bdAll().find(x => x.s.id === id);
const bdStg = s => s.stg || '지출';
const bdMiss = s => (bdTypes()[s.type] || []).filter(d => !(s.docs || []).includes(d));
const bdWhere = x => esc(x.p.name) + (x.l ? ' › ' + esc(x.l.item) : '');
const bdWday = (d, dir) => { const x = new Date(d + 'T00:00:00'); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + dir); return ymd(x); };
const bdShift = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return ymd(x); };

/* 불용 경보: 마감일까지 21일 이하이면서 남은 돈이 있는 항목 */
function bdUnused() {
  const e = bdCfg().end, left = dd(e); if (left === null || left < 0 || left > 21) return null;
  const rows = []; S.budget.forEach(p => { if (p.lines.length) p.lines.forEach(l => { const r = (+l.alloc || 0) - spentOf(l); if (r > 0) rows.push({ n: p.name + ' › ' + l.item, r }); }); else { const r = projAlloc(p) - projSpent(p); if (r > 0) rows.push({ n: p.name, r }); } });
  if (!rows.length) return null; return { left, rows, sum: rows.reduce((a, b) => a + b.r, 0) };
}
/* 집행 속도: 3월 1일~마감일 중 지난 비율과 집행률 비교 */
function bdPace(p) {
  const pa = projAlloc(p); if (!pa) return null; const y = typeof schoolYearNow === 'function' ? schoolYearNow() : new Date().getFullYear(), st = new Date(y + '-03-01T00:00:00'), en = new Date(bdCfg().end + 'T00:00:00'), now = new Date(today() + 'T00:00:00');
  const fr = Math.max(0, Math.min(1, (now - st) / Math.max(1, en - st))), rate = projSpent(p) / pa, gap = fr - rate;
  return { fr: Math.round(fr * 100), rate: Math.round(rate * 100), ic: gap <= 0.15 ? '🟢' : gap <= 0.3 ? '🟡' : '🔴' };
}
function bdVendors() {
  const m = {}; bdAll().forEach(x => { const v = (x.s.vendor || '').trim(); if (!v) return; const o = m[v] = m[v] || { n: v, c: 0, sum: 0, last: '', what: '' }; o.c++; o.sum += +x.s.amt || 0; if ((x.s.date || '') >= o.last) { o.last = x.s.date || ''; o.what = x.s.desc || ''; } });
  return Object.values(m).sort((a, b) => b.last.localeCompare(a.last));
}

function bdPanel2() {
  const all = bdAll(), cfg = bdCfg(), un = bdUnused();
  const miss = all.filter(x => bdMiss(x.s).length), by = {}; BD_FLOW.forEach(k => by[k] = 0); all.forEach(x => { const k = bdStg(x.s); by[k] = (by[k] || 0) + 1; });
  const stuck = all.filter(x => ['계획', '품의', '계약·구매', '검수'].includes(bdStg(x.s))).length;
  const flt = UI.bdStg || '', onlyMiss = !!UI.bdMiss;
  let list = all.filter(x => (!flt || bdStg(x.s) === flt) && (!onlyMiss || bdMiss(x.s).length)).sort((a, b) => (b.s.date || '').localeCompare(a.s.date || '')).slice(0, 60);
  const vs = bdVendors(), vl = `<datalist id="bdvl">${vs.map(v => `<option value="${esc(v.n)}">`).join('')}</datalist>`;
  const chips = `<div class="bdchips"><button class="x ${!flt && !onlyMiss ? 'on' : ''}" data-act="bdFilter" data-k="">전체 ${all.length}</button>${BD_FLOW.map(k => `<button class="x ${flt === k ? 'on' : ''}" data-act="bdFilter" data-k="${k}">${k} ${by[k] || 0}</button>`).join('')}<button class="x ${onlyMiss ? 'on' : ''}" data-act="bdFilter" data-k="_miss">⚠ 서류 미비 ${miss.length}</button></div>`;
  const cards = list.map(x => { const s = x.s, docs = bdTypes()[s.type] || [], ms = bdMiss(s), est = (+s.amt || 0) > cfg.est && docs.includes('견적서') && !(s.docs || []).includes('견적서');
    return `<div class="bdx ${ms.length ? 'warn' : ''}"><div class="bdx1"><b>${md(s.date)}</b> ${esc(s.desc || '(내용 없음)')} <span class="num">${won(s.amt)}원</span> <small class="mu">${bdWhere(x)}</small></div>
    <div class="bdx2"><select data-bdtype="${s.id}" aria-label="지출 유형"><option value="">유형 선택</option>${Object.keys(bdTypes()).map(t => `<option ${s.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><select data-bdstg="${s.id}" aria-label="집행 단계">${BD_FLOW.map(k => `<option ${bdStg(s) === k ? 'selected' : ''}>${k}</option>`).join('')}</select><input data-bdven="${s.id}" list="bdvl" value="${esc(s.vendor || '')}" placeholder="업체" aria-label="업체"></div>
    ${docs.length ? `<div class="bdx3">${docs.map(d => `<label class="bdd"><input type="checkbox" data-bddoc="${s.id}" data-d="${esc(d)}" ${(s.docs || []).includes(d) ? 'checked' : ''}> ${esc(d)}</label>`).join('')}</div>` : ''}
    ${est ? `<div class="hot">💡 ${won(cfg.est)}원을 넘는 지출입니다. 견적서(여러 곳) 첨부 여부를 확인하세요.</div>` : ''}${ms.length ? `<div class="hot">⚠ 빠진 서류: ${ms.map(esc).join(', ')}</div>` : ''}</div>`; }).join('') || '<p class="mu">조건에 맞는 지출이 없습니다. 위 단계 칩을 바꿔 보세요.</p>';
  const pace = S.budget.map(p => { const o = bdPace(p); return o ? `<div class="cmal">${o.ic} <b>${esc(p.name)}</b> 집행 ${o.rate}% · 기간 경과 ${o.fr}%</div>` : ''; }).join('') || '<p class="mu">사업 총액을 넣으면 속도를 보여 줍니다.</p>';
  const ven = vs.length ? vs.map(v => { const t = (S.vendors || {})[v.n] || {}; return `<div class="bdv"><b>${esc(v.n)}</b> <span class="mu">${v.c}건 · ${won(v.sum)}원 · 최근 ${md(v.last)} ${esc(v.what)}</span><input data-bdtel="${esc(v.n)}" value="${esc(t.tel || '')}" placeholder="전화·담당자" aria-label="${esc(v.n)} 연락처"></div>`; }).join('') : '<p class="mu">지출에 업체를 적으면 여기에 모입니다. 다음 해 견적·발주 때 거래처와 단가를 다시 찾을 수 있습니다.</p>';
  return `<details class="doc bdpanel bdp2" ${UI.bdOpen || un || miss.length ? 'open' : ''}><summary><b>🧾 집행 서류·업체</b> <span class="mu">${stuck ? `진행 중 ${stuck}건 · ` : ''}${miss.length ? `<span class="hot">서류 미비 ${miss.length}건</span> · ` : ''}단계 · 서류 · 업체 · 속도</span></summary>
  ${un ? `<div class="cmal"><span class="hot">🧯 불용 주의</span> 마감(${md(cfg.end)})까지 ${un.left}일 남았는데 안 쓴 돈이 ${won(un.sum)}원입니다.<br><small>${un.rows.slice(0, 6).map(r => esc(r.n) + ' ' + won(r.r) + '원').join(' · ')}</small></div>` : ''}
  <div class="tools"><button class="btn sm" data-act="bdBack">🗓 행사일로 일정 만들기</button><button class="btn sm" data-act="bdTplEdit">⚙ 필요 서류 고치기</button><button class="btn sm" data-act="bdCfgEdit">⚙ 견적 기준·마감일</button><button class="btn sm" data-act="bdReport">🖨 결산 한 장</button></div>
  <h4 class="dlh">집행 속도 <small class="mu">(마감 ${md(cfg.end)} 기준)</small></h4>${pace}
  <h4 class="dlh">집행 단계별 지출</h4>${chips}${vl}${cards}
  <h4 class="dlh">업체 수첩</h4>${ven}</details>`;
}
{ const _b = budgetView; budgetView = function () { const h = _b.apply(this, arguments); if (!S.budget.length) return h; const i = h.indexOf('<section class="bk">'), p = bdPanel2(); return i < 0 ? h + p : h.slice(0, i) + p + h.slice(i); }; }
document.addEventListener('toggle', e => { const t = e.target; if (t && t.classList && t.classList.contains('bdp2')) UI.bdOpen = t.open; }, true);
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset) return; const d = t.dataset;
  const one = id => { const f = bdFindS(id); return f && f.s; };
  if (d.bdtype) { const s = one(d.bdtype); if (s) { s.type = t.value; UI.bdOpen = true; commit(); } }
  else if (d.bdstg) { const s = one(d.bdstg); if (s) { s.stg = t.value; UI.bdOpen = true; commit(); } }
  else if (d.bdven) { const s = one(d.bdven); if (s) { s.vendor = t.value.trim(); UI.bdOpen = true; commit(); } }
  else if (d.bddoc) { const s = one(d.bddoc); if (s) { const a = new Set(s.docs || []); t.checked ? a.add(d.d) : a.delete(d.d); s.docs = [...a]; UI.bdOpen = true; commit(); } }
  else if (d.bdtel) { S.vendors = S.vendors || {}; S.vendors[d.bdtel] = Object.assign(S.vendors[d.bdtel] || {}, { tel: t.value.trim() }); save(true); toast('연락처를 저장했습니다.'); }
});
Object.assign(A, {
  bdFilter(el) { const k = el.dataset.k; UI.bdOpen = true; if (k === '_miss') { UI.bdMiss = !UI.bdMiss; UI.bdStg = ''; } else { UI.bdStg = k; UI.bdMiss = false; } render(); },
  spendAdd(el) {
    const p = find('budget', el.dataset.p), l = p.lines.find(x => x.id === el.dataset.id), left = (+l.alloc || 0) - spentOf(l), est = bdCfg().est;
    ask(`지출 기록 · ${l.item} (잔액 ${won(left)}원)`, [{ k: 'date', label: '날짜', type: 'date', val: today() }, { k: 'desc', label: '내용', req: 1 }, { k: 'amt', label: '금액(원)', type: 'number', req: 1 }, { k: 'type', label: '지출 유형 (고르면 필요 서류를 안내합니다)', type: 'select', opts: ['(선택 안 함)', ...Object.keys(bdTypes())] }, { k: 'vendor', label: '업체 (선택)', ph: '예: ○○문구' }, { k: 'note', label: '비고 (품의번호·특이사항)' }], o => {
      const amt = +o.amt || 0, rec = () => {
        l.spends = l.spends || []; const s = { id: uid(), date: o.date, desc: o.desc, amt, note: (o.note || '').trim(), stg: '지출' }; if (o.type && o.type !== '(선택 안 함)') s.type = o.type; if ((o.vendor || '').trim()) s.vendor = o.vendor.trim(); l.spends.push(s); commit();
        const need = bdMiss(s); toast(need.length ? `기록했습니다. 필요 서류: ${need.join(', ')}` : amt > est && s.type ? `기록했습니다. ${won(est)}원 초과 지출이니 견적서를 확인하세요.` : '기록했습니다.');
      };
      if (amt > left) sure(`잔액 ${won(left)}원보다 ${won(amt - left)}원 많습니다. 그래도 기록할까요?`, rec); else rec();
    }, '기록');
  },
  bdBack() {
    ask('행사일로 예산 일정 만들기', [{ k: 'name', label: '행사·사업 이름', req: 1, ph: '예: 체육대회' }, { k: 'day', label: '행사일', type: 'date', val: today(), req: 1 }, { k: 'a', label: '품의는 며칠 전까지', type: 'number', val: 14 }, { k: 'b', label: '계약·구매는 며칠 전까지', type: 'number', val: 7 }, { k: 'c', label: '정산은 며칠 뒤까지', type: 'number', val: 7 }], o => {
      const D = o.day, mk = (t, date) => S.items.push({ id: uid(), title: `[예산] ${o.name} ${t}`, date, cat: 'event', tag: '예산', done: false });
      mk('품의 올리기', bdWday(bdShift(D, -(+o.a || 14)), -1)); mk('계약·구매 마무리', bdWday(bdShift(D, -(+o.b || 7)), -1)); mk('검수 준비', bdWday(bdShift(D, -1), -1)); mk('지출·정산 끝내기', bdWday(bdShift(D, +o.c || 7), 1)); commit(); toast('캘린더에 예산 일정 4개를 넣었습니다(주말은 평일로 옮겼습니다).');
    }, '만들기');
  },
  bdTplEdit() {
    const txt = Object.entries(bdTypes()).map(([k, v]) => k + ': ' + v.join(', ')).join('\n');
    ask('지출 유형별 필요 서류', [{ k: 't', label: '한 줄에 하나씩 「유형: 서류1, 서류2」 (우리 학교 기준으로 고치세요)', type: 'textarea', rows: 8, val: txt }], o => {
      const m = {}; String(o.t || '').split('\n').forEach(r => { const i = r.indexOf(':'); if (i < 1) return; const k = r.slice(0, i).trim(), v = r.slice(i + 1).split(',').map(x => x.trim()).filter(Boolean); if (k) m[k] = v; });
      S.bdTypes = Object.keys(m).length ? m : null; UI.bdOpen = true; commit();
    });
  },
  bdCfgEdit() { const c = bdCfg(); ask('견적 기준·예산 마감일', [{ k: 'est', label: '견적서를 챙겨야 하는 금액(원) — 우리 학교 기준으로 직접 정하세요', type: 'number', val: c.est }, { k: 'end', label: '예산 마감일 (불용 경보·집행 속도 기준)', type: 'date', val: c.end }], o => { S.bdCfg = { est: o.est === '' ? 2000000 : +o.est, end: o.end || '' }; UI.bdOpen = true; commit(); }); },
  bdReport() {
    const T = btot(), rows = S.budget.map(p => { const pa = projAlloc(p), ps = projSpent(p);
      const ls = p.lines.map(l => `<tr><td>${esc(l.item)}</td><td align=right>${won(l.alloc)}</td><td align=right>${won(spentOf(l))}</td><td align=right>${won((+l.alloc || 0) - spentOf(l))}</td><td>${esc(l.note || '')}</td></tr>`).join('');
      const sp = bdAll().filter(x => x.p === p).sort((a, b) => (a.s.date || '').localeCompare(b.s.date || '')).map(x => `<tr><td>${esc(x.s.date || '')}</td><td>${esc(x.s.desc || '')}${x.l ? ' (' + esc(x.l.item) + ')' : ''}</td><td align=right>${won(x.s.amt)}</td><td>${esc(x.s.vendor || '')}</td><td>${esc(x.s.type || '')}</td><td>${bdStg(x.s)}</td><td>${x.s.type ? (bdMiss(x.s).length ? '미비: ' + esc(bdMiss(x.s).join(', ')) : '구비') : ''}</td><td>${esc(x.s.note || '')}</td></tr>`).join('');
      return `<h3>${esc(p.name)} — 배정 ${won(pa)} · 집행 ${won(ps)} · 잔액 ${won(pa - ps)}원</h3>${p.note ? `<p>비고: ${esc(p.note)}</p>` : ''}${ls ? `<table border=1 cellspacing=0 cellpadding=4><tr><th>목·항목</th><th>배정</th><th>집행</th><th>잔액</th><th>비고</th></tr>${ls}</table>` : ''}${sp ? `<p></p><table border=1 cellspacing=0 cellpadding=4><tr><th>날짜</th><th>내용</th><th>금액</th><th>업체</th><th>유형</th><th>단계</th><th>서류</th><th>비고</th></tr>${sp}</table>` : ''}`; }).join('');
    download('예산결산_' + today() + '.doc', `<html><head><meta charset="utf-8"><style>body{font-family:'맑은 고딕';font-size:10pt}table{border-collapse:collapse}</style></head><body><h2>예산 결산 (${today()} 기준)</h2><p>전체 배정 ${won(T.a)}원 · 집행 ${won(T.s)}원 · 잔액 ${won(T.b)}원</p>${rows}</body></html>`, 'application/msword'); toast('결산 문서를 내려받았습니다. 한글·워드에서 열 수 있습니다.');
  }
});
{ const _w = mtWarn; mtWarn = function () { const o = _w.apply(this, arguments), u = bdUnused(); if (u) o.unshift(`🧯 예산 마감 ${u.left}일 전 · 안 쓴 돈 ${won(u.sum)}원`); const m = bdAll().filter(x => bdMiss(x.s).length).length; if (m) o.push(`예산 서류 미비 ${m}건`); return o.slice(0, 5); }; }
{ const _c = buildChunks; buildChunks = function () { const out = _c.apply(this, arguments);
  bdVendors().forEach(v => { const t = (S.vendors || {})[v.n] || {}; out.push({ type: 'budget', src: `예산 업체 · ${v.n}`, text: `업체 ${v.n}: ${v.c}건 거래, 합계 ${v.sum}원, 최근 ${v.last} ${v.what}${t.tel ? ', 연락처 ' + t.tel : ''}`, ref: '#/budget' }); });
  bdAll().forEach(x => { const s = x.s; if (s.type || s.vendor || (s.stg && s.stg !== '지출')) out.push({ type: 'budget', src: `예산 집행 · ${x.p.name}`, text: `${s.date} ${s.desc} ${s.amt}원 · 유형 ${s.type || '미지정'} · 단계 ${bdStg(s)} · 업체 ${s.vendor || '없음'} · ${bdMiss(s).length ? '빠진 서류 ' + bdMiss(s).join(', ') : '서류 이상 없음'}`, ref: '#/budget' }); });
  return out; }; }

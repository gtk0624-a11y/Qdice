/* 예산 요구서·사업계획서 쓰기(v81): 내년 사업별 요구서 초안(올해 사업 복사 또는 빈 틀) → 산출 근거 표 → 작년 자료(아카이브) 참고 → (키가 있으면) AI 초안 → 요구서·계획서 .doc 내려받기.
   저장: S.bdReq = [{id,name,y,items:[{id,item,price,qty,why,ref}],purpose,when,content,effect,refText}] — 단순하게 '세우고 쓰고 정리'만 합니다. */
const rqTot = r => (r.items || []).reduce((a, i) => a + (+i.price || 0) * (+i.qty || 1), 0);
const rqFind = id => (S.bdReq || []).find(r => r.id === id);
let rqBusy = false;

function bdPanel3() {
  const rs = S.bdReq || [];
  const cards = rs.map(r => { const t = rqTot(r), ref = (r.items || []).reduce((a, i) => a + (+i.ref || 0), 0);
    const rows = (r.items || []).map(i => { const a = (+i.price || 0) * (+i.qty || 1), d = i.ref ? a - i.ref : null; return `<tr><td>${esc(i.item)}${i.why ? `<br><small class="mu">${esc(i.why)}</small>` : ''}</td><td class="r">${won(i.price)} × ${+i.qty || 1}</td><td class="r"><b>${won(a)}</b></td><td class="r mu">${i.ref ? won(i.ref) : '-'}${d === null ? '' : `<br><small class="${d > 0 ? 'hot' : ''}">${d > 0 ? '+' : ''}${won(d)}</small>`}</td><td class="act"><button class="x" data-act="rqItem" data-r="${r.id}" data-i="${i.id}">수정</button><button class="x" data-act="rqItemDel" data-r="${r.id}" data-i="${i.id}">✕</button></td></tr>`; }).join('');
    const plan = [['목적', r.purpose], ['기간·대상', r.when], ['내용', r.content], ['기대효과', r.effect]].filter(x => x[1]).map(x => `<p class="rqp"><b>${x[0]}</b> ${esc(x[1])}</p>`).join('');
    return `<section class="bk rq"><div class="bkh"><h3 class="h3">${esc(r.name)} <small class="mu">${r.y}학년도 요구</small></h3>${xbtn('rqDel', r.id)}</div>
    <div class="sum"><div><span>요구 합계</span><b class="num">${won(t)}</b></div><div><span>올해 집행(참고)</span><b class="num">${ref ? won(ref) : '-'}</b></div><div><span>증감</span><b class="num ${ref && t > ref ? 'hot' : ''}">${ref ? (t - ref > 0 ? '+' : '') + won(t - ref) : '-'}</b></div></div>
    ${rows ? `<table class="tbl"><thead><tr><th>항목·산출 근거</th><th class="r">단가×수량</th><th class="r">요구액</th><th class="r">올해 집행</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="mu">항목을 추가하세요. 단가와 수량만 넣으면 금액이 계산됩니다.</p>'}
    ${plan}${r.refText ? `<details class="doc"><summary>📎 작년 참고 자료</summary><pre class="rqref">${esc(r.refText)}</pre></details>` : ''}
    <div class="tools"><button class="btn sm" data-act="rqItem" data-r="${r.id}">+ 항목</button><button class="btn sm" data-act="rqPlan" data-r="${r.id}">✍ 계획서 내용 쓰기</button><button class="btn sm" data-act="rqRef" data-r="${r.id}">📎 작년 자료 참고</button><button class="btn sm" data-act="rqAI" data-r="${r.id}">🤖 초안 써 주기</button><button class="btn sm" data-act="rqDoc" data-r="${r.id}" data-k="req">📄 요구서 받기</button><button class="btn sm" data-act="rqDoc" data-r="${r.id}" data-k="plan">📄 계획서 받기</button></div></section>`; }).join('');
  return `<details class="doc bdpanel bdp3" ${UI.rqOpen || rs.length ? 'open' : ''}><summary><b>📝 예산 요구서·계획서</b> <span class="mu">${rs.length ? rs.length + '건 작성 중' : '내년 예산 요구서와 사업계획서 초안'}</span></summary>
  <p class="mu">① 사업을 만들고 ② 항목과 산출 근거를 넣고 ③ 작년 자료를 참고해 계획서 내용을 쓴 뒤 ④ 문서로 받으면 끝입니다. 「🤖 초안」은 Claude 키가 있을 때만 쓰입니다.</p>
  <div class="tools"><button class="btn" data-act="rqNew">+ 요구서 만들기</button></div>${cards}</details>`;
}
{ const _b = budgetView; budgetView = function () { const h = _b.apply(this, arguments), p = bdPanel3(), i = h.indexOf('<section class="bk">'); if (!S.budget.length) { const j = h.indexOf('<p class="mu">아직 사업이 없습니다'); return j < 0 ? h + p : h.slice(0, j) + p + h.slice(j); } return i < 0 ? h + p : h.slice(0, i) + p + h.slice(i); }; }
document.addEventListener('toggle', e => { const t = e.target; if (t && t.classList && t.classList.contains('bdp3')) UI.rqOpen = t.open; }, true);

const rqFields = (v = {}) => [{ k: 'item', label: '항목 (예: 학생 인권 교육 자료 인쇄)', val: v.item || '', req: 1 }, { k: 'price', label: '단가(원)', type: 'number', val: v.price ?? '', req: 1 }, { k: 'qty', label: '수량', type: 'number', val: v.qty ?? 1 }, { k: 'why', label: '산출 근거 (예: 학생 450명 × 1부, 작년 단가 기준)', val: v.why || '' }];
async function rqCall(r) {
  const key = localStorage.getItem('tf.claudeKey'); if (!key) return null;
  const items = (r.items || []).map(i => `- ${i.item}: ${won(i.price)}원 × ${i.qty || 1} = ${won((+i.price || 0) * (+i.qty || 1))}원 ${i.why || ''}`).join('\n');
  const sys = '당신은 중학교 교사의 예산 요구서·사업계획서 작성을 돕는 비서입니다. 작년 참고 자료의 문체와 구성을 따르되 올해 항목표에 맞게, 과장 없이 존댓말 공문체(~함, ~할 예정임 등 학교 계획서 어투)로 쓰세요. 아래 형식을 정확히 지키세요.\n### 목적\n(1~2문장)\n### 기간·대상\n(1문장)\n### 내용\n(항목표를 반영한 3~5줄)\n### 기대효과\n(1~2문장)';
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: localStorage.getItem('tf.botModel') || 'claude-haiku-5-5', max_tokens: 900, system: sys, messages: [{ role: 'user', content: `사업명: ${r.name} (${r.y}학년도)\n[항목표]\n${items || '(없음)'}\n[작년 참고 자료]\n${(r.refText || '(없음)').slice(0, 5000)}` }] }) });
  if (!res.ok) throw new Error('Claude 응답 오류 ' + res.status);
  const j = await res.json(); return (j.content || []).map(x => x.text || '').join('');
}
function rqDocHtml(r, kind) {
  const t = rqTot(r), tb = `<table border=1 cellspacing=0 cellpadding=5 width=100%><tr><th>항목</th><th>산출 근거</th><th>단가</th><th>수량</th><th>금액</th></tr>${(r.items || []).map(i => `<tr><td>${esc(i.item)}</td><td>${esc(i.why || '')}</td><td align=right>${won(i.price)}</td><td align=right>${+i.qty || 1}</td><td align=right>${won((+i.price || 0) * (+i.qty || 1))}</td></tr>`).join('')}<tr><td colspan=4 align=center><b>합계</b></td><td align=right><b>${won(t)}</b></td></tr></table>`;
  const head = `<html><head><meta charset="utf-8"><style>body{font-family:'맑은 고딕';font-size:11pt}h2{text-align:center}th{background:#eee}</style></head><body>`;
  if (kind === 'req') return head + `<h2>${r.y}학년도 예산 요구서</h2><p>사업명: <b>${esc(r.name)}</b></p><p>요구액: <b>${won(t)}원</b></p>${tb}</body></html>`;
  const sec = (h, v) => `<h3>${h}</h3><p>${esc(v || '(내용을 입력하세요)').replace(/\n/g, '<br>')}</p>`;
  return head + `<h2>${r.y}학년도 ${esc(r.name)} 계획서</h2>${sec('1. 목적', r.purpose)}${sec('2. 기간·대상', r.when)}${sec('3. 내용', r.content)}<h3>4. 소요 예산</h3>${tb}${sec('5. 기대효과', r.effect)}</body></html>`;
}
Object.assign(A, {
  rqNew() {
    const yy = (typeof schoolYearNow === 'function' ? schoolYearNow() : new Date().getFullYear()) + 1;
    ask('요구서 만들기', [{ k: 'name', label: '사업 이름', req: 1, ph: '예: 체육대회 운영' }, { k: 'y', label: '대상 학년도', type: 'number', val: yy }, { k: 'from', label: '시작 방법', type: 'select', opts: ['빈 틀로 시작', ...S.budget.map(p => '올해 사업 복사: ' + p.name)] }], o => {
      const r = { id: uid(), name: o.name.trim(), y: +o.y || yy, items: [] }, p = S.budget.find(x => o.from === '올해 사업 복사: ' + x.name);
      if (p) { if (p.lines.length) r.items = p.lines.map(l => ({ id: uid(), item: l.item, price: +l.alloc || 0, qty: 1, why: '올해 배정 기준', ref: spentOf(l) })); else r.items = [{ id: uid(), item: p.name, price: projAlloc(p), qty: 1, why: '올해 배정 기준', ref: projSpent(p) }]; }
      (S.bdReq = S.bdReq || []).push(r); UI.rqOpen = true; commit(); toast(p ? '올해 항목을 복사했습니다. 단가·수량을 내년 기준으로 고치세요.' : '요구서를 만들었습니다. 항목을 추가하세요.');
    }, '만들기');
  },
  rqItem(el) { const r = rqFind(el.dataset.r); if (!r) return; const it = el.dataset.i ? r.items.find(x => x.id === el.dataset.i) : null; ask(it ? '항목 수정' : '항목 추가', rqFields(it || {}), o => { const v = { item: o.item.trim(), price: +o.price || 0, qty: +o.qty || 1, why: (o.why || '').trim() }; if (it) Object.assign(it, v); else r.items.push(Object.assign({ id: uid() }, v)); UI.rqOpen = true; commit(); }); },
  rqItemDel(el) { const r = rqFind(el.dataset.r); if (r) { r.items = r.items.filter(x => x.id !== el.dataset.i); UI.rqOpen = true; commit(); } },
  rqDel(el) { sure('이 요구서를 지울까요?', () => { S.bdReq = (S.bdReq || []).filter(x => x.id !== el.dataset.id); commit(); }); },
  rqPlan(el) { const r = rqFind(el.dataset.r); if (!r) return; ask('계획서 내용', [{ k: 'purpose', label: '목적', type: 'textarea', rows: 3, val: r.purpose || '' }, { k: 'when', label: '기간·대상', type: 'textarea', rows: 2, val: r.when || '' }, { k: 'content', label: '내용', type: 'textarea', rows: 5, val: r.content || '' }, { k: 'effect', label: '기대효과', type: 'textarea', rows: 3, val: r.effect || '' }], o => { Object.assign(r, { purpose: o.purpose.trim(), when: o.when.trim(), content: o.content.trim(), effect: o.effect.trim() }); UI.rqOpen = true; commit(); }); },
  rqRef(el) {
    const r = rqFind(el.dataset.r); if (!r) return; const docs = [...LIB].filter(d => d.text).sort((a, b) => (/예산|계획|요구/.test(b.name) ? 1 : 0) - (/예산|계획|요구/.test(a.name) ? 1 : 0));
    if (!docs.length) { toast('자료 아카이브에 글자를 읽은 파일이 없습니다. 작년 계획서·요구서를 먼저 올려 주세요.'); return; }
    ask('작년 자료 고르기', [{ k: 'd', label: '참고할 파일 (사업 이름과 비슷한 부분을 뽑습니다)', type: 'select', opts: docs.slice(0, 40).map(d => d.name) }], o => {
      const d = docs.find(x => x.name === o.d); if (!d) return; const key = (r.name.match(/[가-힣A-Za-z0-9]{2,}/) || [''])[0], i = key ? d.text.indexOf(key) : -1, s = Math.max(0, i - 150);
      r.refText = `[${d.name}]\n` + d.text.slice(s, s + 2500).trim(); UI.rqOpen = true; commit(); toast(i < 0 ? '사업 이름이 파일에 없어 앞부분을 가져왔습니다.' : '관련 부분을 참고 자료로 붙였습니다.');
    }, '붙이기');
  },
  async rqAI(el) {
    const r = rqFind(el.dataset.r); if (!r || rqBusy) return; if (!localStorage.getItem('tf.claudeKey')) { toast('Claude 키가 있어야 초안을 써 줍니다. 키 없이는 「✍ 계획서 내용 쓰기」로 직접 적어 주세요.'); return; }
    rqBusy = true; toast('초안을 쓰는 중입니다…'); try { const t = await rqCall(r), pick = h => { const m = new RegExp('###\\s*' + h + '\\s*\\n([\\s\\S]*?)(?=\\n###|$)').exec(t); return m ? m[1].trim() : ''; };
      const v = { purpose: pick('목적'), when: pick('기간·대상'), content: pick('내용'), effect: pick('기대효과') }; if (!v.purpose && !v.content) throw new Error('형식을 읽지 못했습니다'); Object.assign(r, v); UI.rqOpen = true; commit(); toast('초안을 넣었습니다. 읽어 보고 고쳐 주세요(되돌리기 가능).'); } catch (e) { toast('초안 실패: ' + e.message); } rqBusy = false;
  },
  rqDoc(el) { const r = rqFind(el.dataset.r); if (!r) return; download(`${r.name}_${el.dataset.k === 'req' ? '예산요구서' : '계획서'}_${r.y}.doc`, rqDocHtml(r, el.dataset.k), 'application/msword'); toast('문서를 내려받았습니다. 한글·워드에서 열어 다듬으세요.'); }
});
{ const _c = buildChunks; buildChunks = function () { const out = _c.apply(this, arguments); (S.bdReq || []).forEach(r => out.push({ type: 'budget', src: `예산 요구서 · ${r.name}`, text: `${r.y}학년도 ${r.name} 요구 합계 ${rqTot(r)}원: ${(r.items || []).map(i => i.item + ' ' + ((+i.price || 0) * (+i.qty || 1)) + '원').join(', ')} ${r.purpose || ''}`, ref: '#/budget' })); return out; }; }

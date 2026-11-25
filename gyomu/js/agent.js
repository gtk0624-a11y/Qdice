/* 꿈송이 비서 모드(자비스처럼): 말로 시키면 일정·할 일·업무·예산·회의기록을 정리해 넣는다.
   Claude 키가 있을 때만 켜지고, 바로 고치지 않고 "이렇게 하겠습니다" 카드를 보여 준 뒤 [적용]을 눌러야 반영된다. 삭제는 하지 않는다. */
const AG_VERB = /(추가|넣어|등록|수정|바꿔|변경|고쳐|집행|처리|완료|체크|기록해|적어|정리해|만들어|잡아|올려|배정|사용했|결제|지출)/;
const agKey = () => localStorage.getItem('tf.claudeKey') || '';
async function agErr(r) { let m = ''; try { const j = await r.json(); m = (j.error && j.error.message) || ''; } catch (e) { } const h = r.status === 401 ? '키가 올바르지 않습니다. console.anthropic.com에서 만든 sk-ant- 로 시작하는 API 키인지 확인해 주세요' : /credit|balance|billing/i.test(m) ? 'API 크레딧이 없습니다. claude.ai 유료 구독과는 별개라서, console.anthropic.com의 Billing에서 API 크레딧을 충전해야 합니다' : r.status === 403 ? '이 키로는 쓸 수 없습니다(권한)' : r.status === 404 ? '모델을 찾을 수 없습니다' : r.status === 429 ? '요청이 몰렸거나 한도를 넘었습니다' : '응답 오류 ' + r.status; return h + (m ? ' [' + m.slice(0, 140) + ']' : ''); }
async function agPing() { const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': agKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 8, messages: [{ role: 'user', content: '안녕' }] }) }); if (!r.ok) throw new Error(await agErr(r)); }
document.addEventListener('submit', e => { if (!e.target.matches || !e.target.matches('[data-chatkey],[data-form=claude]')) return; setTimeout(async () => { if (!agKey()) return; try { await agPing(); toast('✅ 키가 정상입니다. 꿈송이 비서를 쓸 수 있어요.'); } catch (x) { alert('키는 저장했지만 사용할 수 없습니다.\n\n' + x.message); } }, 300); });

const agN = s => String(s || '').replace(/\s+/g, '').toLowerCase();
const agWon = n => (+n || 0).toLocaleString() + '원';
const AG_TOOLS = [
  { name: 'add_event', description: '캘린더에 일정(event) 또는 할 일(todo)을 추가', input_schema: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, kind: { type: 'string', enum: ['event', 'todo'] } }, required: ['title', 'date', 'kind'] } },
  { name: 'complete_item', description: '이미 있는 할 일을 완료 처리 (제목 일부로 찾음)', input_schema: { type: 'object', properties: { title_contains: { type: 'string' } }, required: ['title_contains'] } },
  { name: 'add_mine', description: '내 업무 목록에 업무 추가', input_schema: { type: 'object', properties: { title: { type: 'string' }, category: { type: 'string', description: '부서·영역' }, memo: { type: 'string' } }, required: ['title'] } },
  { name: 'add_note', description: '회의·연수 기록 노트 추가', input_schema: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string' }, kind: { type: 'string', enum: ['회의', '연수', '기타'] }, body: { type: 'string' }, decisions: { type: 'string', description: '결정한 일, 줄바꿈으로 구분' }, followups: { type: 'string', description: '후속 조치, 줄바꿈으로 구분' } }, required: ['title'] } },
  { name: 'add_spend', description: '예산 항목에 지출(집행) 내역 추가', input_schema: { type: 'object', properties: { project: { type: 'string', description: '사업(부서) 이름 일부' }, line: { type: 'string', description: '목·항목 이름 일부' }, desc: { type: 'string' }, amount: { type: 'integer', description: '원 단위' }, date: { type: 'string' } }, required: ['line', 'desc', 'amount'] } },
  { name: 'add_budget_line', description: '사업에 목·항목(배정액)을 새로 추가', input_schema: { type: 'object', properties: { project: { type: 'string' }, item: { type: 'string' }, alloc: { type: 'integer' }, deadline: { type: 'string' } }, required: ['item', 'alloc'] } },
  { name: 'edit_budget_line', description: '기존 예산 항목의 배정액·집행기한·이름 수정', input_schema: { type: 'object', properties: { project: { type: 'string' }, line: { type: 'string', description: '기존 항목 이름 일부' }, alloc: { type: 'integer' }, deadline: { type: 'string' }, new_name: { type: 'string' } }, required: ['line'] } },
  { name: 'add_budget_project', description: '새 사업(부서) 예산 만들기', input_schema: { type: 'object', properties: { name: { type: 'string' }, total: { type: 'integer' } }, required: ['name'] } }
];
function agProj(name) {
  if (!S.budget.length) return null; const n = agN(name);
  return (n && S.budget.find(p => agN(p.name).includes(n) || n.includes(agN(p.name)))) || (S.budget.length === 1 ? S.budget[0] : null);
}
function agLine(a, create) {
  const n = agN(a.line), cand = a.project ? [agProj(a.project)].filter(Boolean) : S.budget, hit = [];
  cand.forEach(p => p.lines.forEach(l => { if (n && (agN(l.item).includes(n) || n.includes(agN(l.item)))) hit.push([p, l]); }));
  return hit.length === 1 ? hit[0] : hit.length > 1 ? 'many' : null;
}
const agDate = d => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : today());
/* 반영 전 점검: 사람이 읽는 설명과 가능 여부 */
function agPlan(a) {
  const i = a.input || {}, r = { ok: true, txt: '' };
  const bad = m => { r.ok = false; r.txt = m; return r; };
  switch (a.name) {
    case 'add_event': r.txt = `${i.kind === 'todo' ? '할 일' : '일정'} 추가: ${i.title} (${agDate(i.date)})`; break;
    case 'complete_item': { const m = S.items.filter(x => !x.done && x.cat === 'todo' && agN(x.title).includes(agN(i.title_contains))); if (m.length !== 1) return bad(`완료 처리: 「${i.title_contains}」에 맞는 할 일을 ${m.length ? '여러 개라 고를 수 없습니다' : '찾지 못했습니다'}`); a._t = m[0]; r.txt = `할 일 완료 처리: ${m[0].title}`; break; }
    case 'add_mine': r.txt = `내 업무 추가: ${i.title}${i.category ? ' (' + i.category + ')' : ''}`; break;
    case 'add_note': r.txt = `${i.kind || '회의'} 기록 추가: ${i.title}${i.decisions ? ' · 결정 ' + i.decisions.split('\n').filter(Boolean).length + '건' : ''}${i.followups ? ' · 후속 ' + i.followups.split('\n').filter(Boolean).length + '건' : ''}`; break;
    case 'add_spend': {
      const f = agLine(i); if (!f) return bad(`지출 기록: 「${i.line}」 항목을 예산에서 찾지 못했습니다(먼저 항목을 만들어야 합니다)`); if (f === 'many') return bad(`지출 기록: 「${i.line}」에 맞는 항목이 여러 개입니다. 사업 이름을 함께 말해 주세요`);
      a._f = f; const left = (+f[1].alloc || 0) - spentOf(f[1]), amt = +i.amount || 0;
      r.txt = `지출 기록: ${f[0].name} › ${f[1].item} — ${i.desc} ${agWon(amt)} (${agDate(i.date)}) · 처리 후 잔액 ${agWon(left - amt)}` + (left - amt < 0 ? ' ⚠️ 배정액을 넘습니다' : ''); break;
    }
    case 'add_budget_line': { const p = agProj(i.project); if (!p) return bad(`항목 추가: 사업 「${i.project || ''}」을 찾지 못했습니다`); a._p = p; r.txt = `예산 항목 추가: ${p.name} › ${i.item} 배정 ${agWon(i.alloc)}${i.deadline ? ' · 기한 ' + i.deadline : ''}`; break; }
    case 'edit_budget_line': { const f = agLine(i); if (!f || f === 'many') return bad(`항목 수정: 「${i.line}」 항목을 ${f ? '하나로 정할 수 없습니다' : '찾지 못했습니다'}`); a._f = f; r.txt = `예산 항목 수정: ${f[0].name} › ${f[1].item}` + (i.alloc != null ? ` · 배정 ${agWon(f[1].alloc)} → ${agWon(i.alloc)}` : '') + (i.deadline ? ` · 기한 ${i.deadline}` : '') + (i.new_name ? ` · 이름 → ${i.new_name}` : ''); break; }
    case 'add_budget_project': r.txt = `사업 만들기: ${i.name}${i.total ? ' (총액 ' + agWon(i.total) + ')' : ''}`; break;
    default: return bad('알 수 없는 작업');
  }
  return r;
}
function agDo(a) {
  const i = a.input || {};
  switch (a.name) {
    case 'add_event': S.items.push({ id: uid(), title: i.title, date: agDate(i.date), cat: i.kind === 'todo' ? 'todo' : 'event', done: false }); break;
    case 'complete_item': a._t.done = true; break;
    case 'add_mine': S.mine.push({ id: uid(), cat: i.category || '기타', title: i.title, memo: i.memo || '', done: false }); OPEN.add('r11'); break;
    case 'add_note': S.notes.push({ id: uid(), title: i.title, date: agDate(i.date), kind: i.kind || '회의', body: i.body || '', decisions: i.decisions || '', followups: i.followups || '', lock: false }); break;
    case 'add_spend': a._f[1].spends = a._f[1].spends || []; a._f[1].spends.push({ id: uid(), date: agDate(i.date), desc: i.desc, amt: +i.amount || 0 }); break;
    case 'add_budget_line': a._p.lines.push({ id: uid(), item: i.item, alloc: +i.alloc || 0, deadline: i.deadline || '', spends: [] }); break;
    case 'edit_budget_line': { const l = a._f[1]; if (i.alloc != null) l.alloc = +i.alloc || 0; if (i.deadline) l.deadline = i.deadline; if (i.new_name) l.item = i.new_name; break; }
    case 'add_budget_project': S.budget.push({ id: uid(), name: i.name, total: +i.total || 0, lines: [], spends: [] }); break;
  }
}
function agContext() {
  const d = new Date(), wd = '일월화수목금토'[d.getDay()];
  const bud = S.budget.map(p => ({ 사업: p.name, 항목: p.lines.map(l => ({ 이름: l.item, 배정: +l.alloc || 0, 집행: spentOf(l), 기한: l.deadline || '' })) }));
  const todo = S.items.filter(x => !x.done).sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 30).map(x => `${x.date} ${x.cat === 'todo' ? '[할일]' : '[일정]'} ${x.title}`);
  return `오늘은 ${today()} (${wd}요일). 교사: ${S.profile.name || ''}.\n[예산] ${JSON.stringify(bud)}\n[미완료 일정·할 일] ${todo.join(' | ')}\n[내 업무] ${S.mine.slice(0, 15).map(m => m.title).join(' | ')}`;
}
async function agentTry(q) {
  if (!agKey() || !(AG_VERB.test(q) || q.length >= 50)) return false; /* 시키는 말이 있거나, 메신저처럼 긴 글을 붙이면 정리 */
  let j;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': agKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 1200, tools: AG_TOOLS, tool_choice: { type: 'auto' }, system: '당신은 교사의 업무 비서 꿈송이입니다. 사용자가 일정·할 일·업무·예산·회의기록을 넣거나 고치라고 하면 알맞은 도구를 호출해 제안하세요(한 번에 여러 개 가능). 날짜는 YYYY-MM-DD, "내일·다음 주 금요일" 같은 말은 오늘 날짜 기준으로 계산하세요. 금액은 원 단위 정수입니다. 사업·항목 이름은 [예산]에 있는 이름을 쓰세요. 필요한 정보(금액·날짜·어느 항목인지)가 모호하면 도구를 호출하지 말고 존댓말로 짧게 되물으세요. 삭제는 하지 않습니다. 긴 공문·메신저 글이 붙으면 일정(event)·할 일(todo, 마감이 있는 것)·내 업무로 나눠 여러 도구를 한꺼번에 호출하세요. 단순 질문이면 도구 없이 "찾아보기" 안내만 하세요. 도구를 호출할 때 앞에 한 줄로 무엇을 하려는지 존댓말로 말하세요.', messages: [{ role: 'user', content: agContext() + '\n\n[요청]\n' + q }] })
    });
    if (!r.ok) throw new Error(await agErr(r));
    j = await r.json();
  } catch (e) { CH.push({ role: 'bot', text: '비서 기능을 쓰지 못했습니다(' + e.message + '). 대신 찾아서 보여 드릴게요.', blocks: [] }); return false; }
  const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  const acts = (j.content || []).filter(c => c.type === 'tool_use').map(c => ({ name: c.name, input: c.input }));
  if (!acts.length) { if (!text) return false; CH.push({ role: 'bot', text, blocks: [] }); return true; }
  acts.forEach(a => { a.plan = agPlan(a); });
  CH.push({ role: 'bot', text: text || '이렇게 처리하려고 합니다.', blocks: [], act: acts, applied: false });
  return true;
}
function agentCard(m, mi) {
  const lis = m.act.map(a => `<li class="${a.plan.ok ? '' : 'bad'}">${a.plan.ok ? '' : '❌ '}${esc(a.plan.txt)}</li>`).join('');
  const okN = m.act.filter(a => a.plan.ok).length;
  const foot = m.applied ? '<p class="agd">✅ 적용했습니다. 해당 화면에서 확인하세요.</p>' : m.cancelled ? '<p class="agd mu">취소했습니다.</p>' : (okN ? `<div class="ch-act"><button class="btn pri sm" data-ag="apply" data-i="${mi}">✅ 적용 (${okN}건)</button><button class="btn sm" data-ag="cancel" data-i="${mi}">취소</button></div>` : '<p class="mu">적용할 수 있는 작업이 없습니다. 말씀을 조금 더 구체적으로 해 주세요.</p>');
  return `<div class="agc"><b>꿈송이가 이렇게 처리할게요</b><ul>${lis}</ul>${foot}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ag]'); if (!b) return; const m = CH[+b.dataset.i]; if (!m || m.applied || m.cancelled) return;
  if (b.dataset.ag === 'cancel') { m.cancelled = true; renderChat(); return; }
  m.act.filter(a => a.plan.ok).forEach(agDo); m.applied = true; commit(); renderChat();
});

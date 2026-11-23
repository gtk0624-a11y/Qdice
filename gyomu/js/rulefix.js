/* 규정줍줍 — 도디쌤의 규정줍줍(gyujeong/)을 파탈 메뉴 안에 그대로 넣습니다. 같은 사이트 주소라 저장한 문서는 따로 올린 규정줍줍과도 함께 쓰입니다.
   AI 키: 파탈 챗봇에 넣은 Claude 키(tf.claudeKey)를 규정줍줍 키(gj.aiKey)로 자동 맞춰 줍니다. 키가 없으면 AI 없이 원문 검색만 합니다. */
function ruleView() {
  try { const k = localStorage.getItem('tf.claudeKey'); if (k) localStorage.setItem('gj.aiKey', k); } catch (e) { }
  const demo = !!window.TF_DEMO;
  return `<div class="ruleWrap"><p class="mu">규정·지침 PDF를 올리면 질문에 맞는 조항을 <b>원문 그대로·쪽수와 함께</b> 찾고, 원본 PDF 화면에 형광펜을 칠해 인쇄할 수 있습니다. Claude 키를 넣으면(챗봇 창에서) 문장으로도 정리합니다.${demo ? ' <b>체험판은 연습용이라 올린 문서가 이 브라우저에만 남습니다.</b>' : ''}</p><iframe class="ruleframe" src="gyujeong/index.html" title="규정줍줍" allow="clipboard-write"></iframe></div>`;
}

/* ---- 꿈송이 챗봇 안에 「📜 규정줍줍」 탭: 앞내용·뒷내용·원문 PDF·복사·저장까지 원본 규정줍줍 그대로 ----
   iframe 은 챗봇 창 밖(body)에 한 번만 만들어 두고 위치만 맞춥니다(다시 그리면 문서가 새로 불러와지므로). */
window.__chTab = window.__chTab || 'ai';
function ruleFrame() {
  let f = document.getElementById('ruleHold');
  if (!f) { f = document.createElement('iframe'); f.id = 'ruleHold'; f.title = '규정줍줍'; f.src = 'gyujeong/index.html'; f.style.cssText = 'position:fixed;display:none;border:0;background:#fff;z-index:31;border-radius:0 0 4px 4px'; try { const k = localStorage.getItem('tf.claudeKey'); if (k) localStorage.setItem('gj.aiKey', k); } catch (e) { } document.body.appendChild(f); }
  return f;
}
function ruleFit() {
  const f = ruleFrame(), p = document.getElementById('chatpan');
  if (!chatOpen || !p || p.hidden || window.__chTab !== 'rule') { f.style.display = 'none'; return; }
  const r = p.getBoundingClientRect(), top = p.querySelector('.ch-tabs') ? p.querySelector('.ch-tabs').getBoundingClientRect().bottom : r.top + 60;
  f.style.cssText += `;display:block;left:${r.left + 1}px;top:${top}px;width:${r.width - 2}px;height:${r.bottom - top - 1}px`;
}
const _ruleRC = renderChat;
renderChat = function () {
  _ruleRC.apply(this, arguments);
  const p = document.getElementById('chatpan'); if (!chatOpen || !p || p.hidden) { ruleFit(); return; }
  if (!p.querySelector('.ch-tabs')) { const h = p.querySelector('.ch-h'); if (h) h.insertAdjacentHTML('afterend', `<div class="ch-tabs"><button type="button" data-ctab="ai" class="${window.__chTab === 'ai' ? 'on' : ''}">💬 꿈송이 비서</button><button type="button" data-ctab="rule" class="${window.__chTab === 'rule' ? 'on' : ''}">📜 규정줍줍</button></div>`); }
  if (window.__chTab === 'rule') [...p.children].forEach(c => { if (!c.classList.contains('ch-h') && !c.classList.contains('ch-tabs')) c.remove(); });
  ruleFit();
};
addEventListener('resize', () => ruleFit());
document.addEventListener('click', e => { const b = e.target.closest('[data-ctab]'); if (!b) return; window.__chTab = b.dataset.ctab; if (window.__chTab === 'rule') ruleFrame(); renderChat(); });
const _ruleOpen = openChat; openChat = function () { ruleFrame(); return _ruleOpen.apply(this, arguments); };
/* 영역 나누기: 규정·지침·학칙·조항을 묻는 말은 꿈송이 비서가 아니라 📜 규정줍줍 탭이 맡는다(문서가 없으면 탭만 열어 PDF 넣기를 안내).
   일정·예산·업무·메모·자료실 질문과 시키는 일은 💬 꿈송이 비서가 맡는다. */
const RULE_Q = /규정|지침|조항|학칙|규칙|복무|출장|결시|길라잡이|인정\s?(결석|점|사유)|며칠|해도\s?되|안\s?되|가능한가|처리\s?절차|제\s?\d+\s?조/;
const _ruleAsk = ask1;
ask1 = async function (q) {
  q = String(q || '').trim();
  if (q && RULE_Q.test(q)) {
    window.__chTab = 'rule'; renderChat();
    try { const d = ruleFrame().contentDocument, n = d.getElementById('docCnt'), qi = d.getElementById('q'), fm = d.getElementById('ask'); if (n && +n.textContent > 0) { qi.value = q; fm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); } } catch (e) { }
    return;
  }
  return _ruleAsk.apply(this, arguments);
};

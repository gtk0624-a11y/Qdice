/* 규정줍줍 — 도디쌤의 규정줍줍(gyujeong/)을 파탈 메뉴 안에 그대로 넣습니다. 같은 사이트 주소라 저장한 문서는 따로 올린 규정줍줍과도 함께 쓰입니다.
   AI 키: 파탈 챗봇에 넣은 Claude 키(tf.claudeKey)를 규정줍줍 키(gj.aiKey)로 자동 맞춰 줍니다. 키가 없으면 AI 없이 원문 검색만 합니다. */
function ruleView() {
  try { const k = localStorage.getItem('tf.claudeKey'); if (k) localStorage.setItem('gj.aiKey', k); } catch (e) { }
  const demo = !!window.TF_DEMO;
  return `<div class="ruleWrap"><p class="mu">규정·지침 PDF를 올리면 질문에 맞는 조항을 <b>원문 그대로·쪽수와 함께</b> 찾고, 원본 PDF 화면에 형광펜을 칠해 인쇄할 수 있습니다. Claude 키를 넣으면(챗봇 창에서) 문장으로도 정리합니다.${demo ? ' <b>체험판은 연습용이라 올린 문서가 이 브라우저에만 남습니다.</b>' : ''}</p><iframe class="ruleframe" src="gyujeong/index.html" title="규정줍줍" allow="clipboard-write"></iframe></div>`;
}

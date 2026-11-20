/* 메모 디자인 100가지: 모양 10종 × 파스텔 10색. 페이지 메모·캘린더 날짜 메모·기록 본문에 적용됩니다. */
const MPAL = [['살구', '#FFE3D0', '#F4A77A'], ['분홍', '#FFDDE6', '#EE8FAE'], ['연보라', '#E8DEFA', '#AB93E0'], ['하늘', '#D9ECFB', '#7FB6E6'], ['민트', '#D8F3EA', '#6FC7A8'], ['레몬', '#FFF6C2', '#E3C943'], ['복숭아', '#FFD9D4', '#EC8B80'], ['라일락', '#F0DDF5', '#C08AD3'], ['연두', '#E6F4C9', '#9CC954'], ['크림', '#FBF1DC', '#CDB27C']];
const MSHP = ['포스트잇', '줄노트', '모눈종이', '점노트', '접힌 색종이', '테이프 메모', '구름 말풍선', '편지지', '이중 테두리', '형광펜 줄'];
const MSEL = ':is(.pmemo textarea,.dmemo textarea,#nbody)';
(function () {
  const base = 'color:#34302b;font-size:17px;line-height:28px;padding:12px 16px;transition:none;';
  const R = [
    'border:0;border-radius:3px;background:var(--mbg);box-shadow:0 8px 10px -6px rgba(0,0,0,.28),inset 0 18px 0 -8px var(--mac);',
    'border:0;border-left:3px double var(--mac);border-radius:4px;background:repeating-linear-gradient(transparent 0 27px,var(--mac) 27px 28px),var(--mbg);background-attachment:local;box-shadow:0 1px 4px rgba(0,0,0,.12);padding-left:22px;',
    'border:1.5px solid var(--mac);border-radius:4px;background:linear-gradient(var(--mac) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,var(--mac) 1px,transparent 1px) 0 0/24px 24px,var(--mbg);background-blend-mode:multiply;line-height:24px;',
    'border:0;border-radius:10px;background:radial-gradient(var(--mac) 1.6px,transparent 1.8px) 0 0/20px 20px,var(--mbg);box-shadow:0 2px 6px rgba(0,0,0,.12);line-height:28px;',
    'border:0;border-radius:6px 6px 6px 0;background:linear-gradient(225deg,var(--mac) 0 22px,transparent 22px),var(--mbg);box-shadow:3px 4px 0 var(--mac);',
    'border:0;border-top:16px solid var(--mac);border-radius:2px 2px 8px 8px;background:var(--mbg);box-shadow:0 4px 8px rgba(0,0,0,.16);',
    'border:3px dashed var(--mac);border-radius:26px;background:var(--mbg);padding:14px 20px;',
    'border:0;border-left:12px solid var(--mac);border-radius:2px 10px 10px 2px;background:repeating-linear-gradient(transparent 0 27px,rgba(0,0,0,.08) 27px 28px),var(--mbg);background-attachment:local;box-shadow:0 2px 6px rgba(0,0,0,.12);',
    'border:4px double var(--mac);border-radius:8px;background:var(--mbg);',
    'border:0;border-radius:8px;background:repeating-linear-gradient(transparent 0 14px,var(--mac) 14px 26px,transparent 26px 28px),var(--mbg);background-attachment:local;box-shadow:0 1px 4px rgba(0,0,0,.1);'
  ];
  let css = '';
  R.forEach((r, i) => { css += `html[data-msh="${i}"] ${MSEL},.msw[data-msh="${i}"]{${base}${r}width:100%;box-sizing:border-box;resize:vertical;outline:0}`; });
  css += '.msg{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:8px 0 14px}.msg button.msw{min-height:62px;padding:8px;font-size:13px;text-align:left;cursor:pointer;line-height:20px;border-radius:6px}.msg button.msw.on{outline:3px solid var(--ink)!important}.msr{font-weight:800;font-size:16px;margin:12px 0 2px}@media(max-width:700px){.msg{grid-template-columns:repeat(2,1fr)}}';
  const st = document.createElement('style'); st.id = 'memocss'; st.textContent = css; document.head.appendChild(st);
})();
const MEMO_DEF = 5; /* 기본: 포스트잇 · 레몬 (나중에 바꾸면 됩니다) */
const memoId = () => { const v = S && S.profile && S.profile.memo; return Number.isInteger(v) && v >= 0 && v < 100 ? v : MEMO_DEF; };
const memoName = () => { const v = memoId(); return MSHP[Math.floor(v / 10)] + ' · ' + MPAL[v % 10][0]; };
function memoApply() {
  const v = memoId(), r = document.documentElement;
  r.dataset.msh = String(Math.floor(v / 10)); r.style.setProperty('--mbg', MPAL[v % 10][1]); r.style.setProperty('--mac', MPAL[v % 10][2]);
}
A.memoPick = () => {
  const d = document.createElement('dialog'); d.className = 'dlg'; d.style.maxWidth = '860px'; d.style.width = '96vw';
  const cur = memoId();
  d.innerHTML = `<form method="dialog"><h3>메모 디자인 100가지</h3><p class="mu">누르면 바로 적용됩니다. 지금: ${esc(memoName())}</p>${MSHP.map((n, sh) => `<div class="msr">${sh + 1}. ${n}</div><div class="msg">${MPAL.map((c, ci) => { const id = sh * 10 + ci; return `<button type="button" class="msw ${id === cur ? 'on' : ''}" data-msh="${sh}" data-mpick="${id}" style="--mbg:${c[1]};--mac:${c[2]}">${c[0]}<br>메모 ✎</button>`; }).join('')}</div>`).join('')}<div class="btns"><button value="ok" class="pri">닫기</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-mpick]'); if (!b) return;
    S.profile.memo = +b.dataset.mpick; memoApply(); save(true);
    d.querySelectorAll('.msw.on').forEach(x => x.classList.remove('on')); b.classList.add('on');
    const p = d.querySelector('.mu'); if (p) p.textContent = '지금: ' + memoName();
  });
  d.addEventListener('close', () => { d.remove(); render(); });
  d.showModal();
};
{ const _r = render; render = function () { memoApply(); _r.apply(this, arguments); }; if (typeof TF !== 'undefined') TF.render = render; }

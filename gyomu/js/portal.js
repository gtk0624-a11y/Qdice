/* 교무포털 자료 담기 — 학교 안에서만 열리는 교무포털의 내용을 업무파탈 「자료 보관함」으로 가져옵니다.
   방식: ① 즐겨찾기 막대에 「📥 업무파탈에 담기」 버튼(북마클릿)을 만들어 두고 ② 학교에서 교무포털 화면을 연 채 그 버튼을 누르면
   ③ 그 화면(원하면 이어진 쪽까지)의 글·표·첨부 링크를 읽어 업무파탈 창으로 보내고 ④ 업무파탈에서 골라 담습니다.
   - 업무파탈 서버가 포털에 접속하는 것이 아니라, 선생님 브라우저에 이미 열린 화면을 읽는 것이라 학교망 밖에서 막혀도 상관없습니다.
   - 읽기만 합니다(로그아웃·삭제·저장 같은 이름의 링크는 따라가지 않음). 학생 정보가 있는 쪽은 담지 마세요. */
const ptApp = () => location.href.split('#')[0].replace(/[^\/]*$/, '');
function ptCode() {
  const f = function () {
    var APP = '__APP__';
    var clean = function (t) { return String(t || '').replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim(); };
    var bad = /logout|logoff|signout|로그아웃|delete|remove|삭제|withdraw|탈퇴|write|insert|save|update|submit|download|filedown|\.(pdf|hwpx?|xlsx?|docx?|pptx?|zip|png|jpe?g|gif)(\?|$)/i;
    var fileRe = /\.(pdf|hwpx?|xlsx?|docx?|pptx?|zip)(\?|$)|download|filedown/i;
    var files = [].slice.call(document.querySelectorAll('a[href]')).filter(function (a) { return /^https?:/i.test(a.href) && fileRe.test(a.href); }).map(function (a) { return '· ' + clean(a.innerText || a.title || '첨부') + ' — ' + a.href; });
    var pages = [{ title: document.title || '(제목 없음)', url: location.href, text: clean(document.body.innerText).slice(0, 60000) + (files.length ? '\n\n[첨부·자료 링크]\n' + files.slice(0, 60).join('\n') : '') }];
    var seen = {}, L = [];
    [].slice.call(document.querySelectorAll('a[href]')).map(function (a) { return { t: clean(a.innerText), h: a.href }; }).forEach(function (x) {
      if (!/^https?:/i.test(x.h) || x.h.indexOf(location.origin) !== 0) return; var k = x.h.split('#')[0]; if (k === location.href.split('#')[0] || seen[k] || bad.test(x.h + ' ' + x.t)) return; seen[k] = 1; L.push(x);
    });
    function copy(p) {
      var s = JSON.stringify(p);
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(s) : Promise.reject()).then(function () { alert('업무파탈로 바로 보내지 못해 내용을 복사해 두었습니다.\n업무파탈 설정의 [복사해서 붙여넣어 담기]에 붙여넣으세요.'); }).catch(function () { prompt('아래 내용을 모두 복사해 업무파탈에 붙여넣으세요', s.slice(0, 150000)); });
    }
    function send() {
      var payload = { type: 'tf-import', pages: pages, at: Date.now() }, w = window.open(APP + '#/portal', 'tfimport'), ok = 0, tries = 0;
      if (!w) { copy(payload); return; }
      var onm = function (e) { if (e.source === w && e.data && e.data.type === 'tf-ready') { ok = 1; window.removeEventListener('message', onm); clearInterval(iv); w.postMessage(payload, e.origin); } };
      window.addEventListener('message', onm);
      var iv = setInterval(function () { tries++; if (ok || tries > 16) { clearInterval(iv); if (!ok) copy(payload); return; } try { w.postMessage({ type: 'tf-ping' }, '*'); } catch (x) { } }, 500);
    }
    if (L.length && confirm('이 화면의 글을 담습니다.\n\n이어지는 같은 포털 안의 쪽 ' + Math.min(L.length, 30) + '개도 함께 담을까요?\n(읽기만 합니다. 로그아웃·삭제·저장 같은 링크는 건너뜁니다)\n\n[확인] 함께 담기   [취소] 지금 화면만')) {
      var i = 0, n = Math.min(L.length, 30);
      (function step() {
        if (i >= n) return send(); var x = L[i++];
        fetch(x.h, { credentials: 'include' }).then(function (r) { return r.text(); }).then(function (h) {
          var d = new DOMParser().parseFromString(h, 'text/html'); [].slice.call(d.querySelectorAll('script,style,noscript')).forEach(function (e) { e.remove(); });
          pages.push({ title: d.title || x.t || '쪽', url: x.h, text: clean(d.body ? d.body.textContent : '').slice(0, 40000) });
        }).catch(function () { }).then(step);
      })();
    } else send();
  };
  return 'javascript:' + encodeURIComponent('(' + f.toString().replace('__APP__', ptApp()) + ')()');
}

function ptReceive(pages) {
  pages = (Array.isArray(pages) ? pages : []).filter(p => p && typeof p.text === 'string' && p.text.trim()).slice(0, 45).map(p => ({ title: String(p.title || '쪽').slice(0, 120), url: String(p.url || '').slice(0, 500), text: p.text.slice(0, 70000) }));
  if (!pages.length) return toast('담을 내용이 없어요.');
  const d = document.createElement('dialog'); d.className = 'dlg'; d.style.maxWidth = '720px'; d.style.width = '96vw';
  d.innerHTML = `<form method="dialog"><h3>🏫 교무포털에서 가져온 ${pages.length}쪽</h3><p class="mu">체크한 쪽만 담깁니다. 학생 개인정보가 보이는 쪽은 체크를 빼 주세요. 담은 내용은 꿈송이가 자료를 찾을 때도 쓰입니다.</p>${pages.map((p, i) => `<label class="chk ptr"><input type="checkbox" name="p${i}" checked> <span><b>${esc(p.title)}</b> <span class="mu">${p.text.length.toLocaleString()}자</span><br><span class="mu">${esc(p.url.slice(0, 80))}</span></span></label>`).join('')}<div class="btns"><button value="save" class="pri">자료 보관함에 담기</button><button value="ibx">일정·할 일로 뽑아보기</button><button value="cancel" formnovalidate>취소</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('close', async () => {
    const rv = d.returnValue; let pick = [];
    if (rv === 'save' || rv === 'ibx') { const f = new FormData(d.querySelector('form')); pick = pages.filter((p, i) => f.get('p' + i)); }
    d.remove();
    if (!pick.length) return;
    if (rv === 'save') {
      pick.forEach(p => { const old = p.url ? LIB.findIndex(x => x.from === 'portal' && x.url === p.url) : -1; const it = { id: uid(), name: '[포털] ' + p.title, kind: '교무포털', text: (p.url ? '[출처] ' + p.url + '\n\n' : '') + p.text, added: today(), from: 'portal', url: p.url, size: p.text.length }; if (old >= 0) LIB[old] = it; else LIB.push(it); });
      await saveLib(); toast(pick.length + '쪽을 자료 보관함에 담았습니다. (자료 아카이브에서 볼 수 있어요)'); if (TF.render) TF.render();
    } else {
      const c = ibxParse(pick.map(p => p.text).join('\n\n')); if (c.length) ibxPreview(c); else toast('일정이나 업무로 읽을 내용을 찾지 못했습니다.');
    }
  });
  d.showModal();
}
window.addEventListener('message', e => {
  const m = e.data; if (!m || typeof m !== 'object' || !window.opener || e.source !== window.opener) return;
  if (m.type === 'tf-ping') { try { window.opener.postMessage({ type: 'tf-ready' }, '*'); } catch (x) { } }
  if (m.type === 'tf-import') ptReceive(m.pages);
});
if (window.opener && location.hash === '#/portal') { try { window.opener.postMessage({ type: 'tf-ready' }, '*'); } catch (e) { } }

Object.assign(A, {
  ptHelp() {
    const code = ptCode(), d = document.createElement('dialog'); d.className = 'dlg'; d.style.maxWidth = '720px'; d.style.width = '96vw';
    d.innerHTML = `<form method="dialog"><h3>📥 교무포털 자료 담기 — 사용법</h3>
    <p class="mu">교무포털은 학교 안에서만 열려서, 집에서는 업무파탈이 대신 열 수 없어요. 대신 <b>학교에서 포털을 열어 둔 화면을 업무파탈로 보내는 버튼</b>을 만들어 둡니다. 한 번만 만들면 됩니다.</p>
    <ol class="ptol"><li>크롬·엣지에서 키보드 <b>Ctrl + Shift + B</b> 를 눌러 <b>즐겨찾기 막대</b>를 보이게 합니다.</li>
    <li>아래 파란 버튼 <b>📥 업무파탈에 담기</b>를 마우스로 <b>끌어서</b> 즐겨찾기 막대에 놓습니다. <span class="mu">(여기서 누르면 아무 일도 안 일어나요)</span><br><a class="btn pri ptbm" href="${code}" onclick="alert('이 버튼은 누르는 용이 아니라, 끌어서 즐겨찾기 막대에 놓는 버튼이에요.');return false">📥 업무파탈에 담기</a></li>
    <li><b>학교에서</b> 교무포털을 열고 가져오고 싶은 메뉴(공지·연락처·업무분장 등) 화면으로 갑니다.</li>
    <li>즐겨찾기 막대의 <b>📥 업무파탈에 담기</b>를 누릅니다. 묻는 창이 뜨면 <b>[확인]</b>은 이어진 쪽까지 함께(최대 30쪽), <b>[취소]</b>는 지금 화면만 담습니다.</li>
    <li>업무파탈 창이 새로 열리면 담을 쪽을 체크하고 <b>[자료 보관함에 담기]</b>를 누릅니다. 일정·할 일로 뽑을 수도 있어요.</li></ol>
    <div class="tools"><button type="button" class="btn sm" data-act="ptCopy">끌기가 안 될 때: 코드 복사</button></div>
    <p class="mu">· 끌기가 안 되면: 즐겨찾기를 새로 추가 → 이름은 「업무파탈에 담기」, 주소 칸에 복사한 코드를 붙여넣기.<br>· 새 창이 안 열리면 주소창 오른쪽의 팝업 차단을 <b>허용</b>해 주세요.<br>· 포털이 이 방식을 막으면(보안 설정) 화면에서 <b>Ctrl+A → Ctrl+C</b> 로 복사한 뒤 설정의 <b>[복사해서 붙여넣어 담기]</b>를 쓰세요.<br>· 처음 한 번은 학교에서 시험해 보세요. 읽기만 하며 포털의 내용은 바꾸지 않습니다.</p>
    <div class="btns"><button value="ok" class="pri">닫기</button></div></form>`;
    document.body.appendChild(d); d.dataset.code = code; d.addEventListener('close', () => d.remove()); d.showModal();
  },
  ptCopy() {
    const d = document.querySelector('dialog[data-code]'); if (!d) return;
    (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(d.dataset.code) : Promise.reject()).then(() => toast('코드를 복사했습니다.')).catch(() => toast('복사가 막혔어요. 파란 버튼을 끌어서 쓰세요.'));
  },
  ptPaste() {
    ask('📋 복사해서 붙여넣어 담기', [{ k: 'title', label: '제목', ph: '예: 교무포털 공지 11월', req: 1 }, { k: 'text', label: '교무포털 화면에서 복사한 내용 (Ctrl+A → Ctrl+C → 여기에 Ctrl+V)', type: 'textarea', rows: 10, req: 1 }], o => ptReceive([{ title: o.title, url: '', text: o.text }]), '다음');
  },
  ptOpen() { const u = (S.profile.portalUrl || '').trim(); if (u && /^https?:\/\//i.test(u)) window.open(u, '_blank', 'noopener'); else A.ptHelp(); }
});

const ptCard = () => { const u = (S.profile.portalUrl || '').trim(), ok = /^https?:\/\//i.test(u); return `<div class="dset"><b>🏫 교무포털 자료 담기</b> <span class="mu">(학교 안에서만 열리는 교무포털의 내용을 업무파탈로 가져옵니다)</span>
  <div class="row2c"><label>교무포털 주소 <input type="url" data-dset="portalUrl" value="${esc(u)}" placeholder="학교에서 쓰는 포털 주소(선택)"></label>${ok ? `<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">포털 열기 ↗</a>` : ''}</div>
  <div class="tools"><button type="button" class="btn sm pri" data-act="ptHelp">📥 담기 버튼 만들기·사용법</button><button type="button" class="btn sm" data-act="ptPaste">📋 복사해서 붙여넣어 담기</button></div></div>
  `; };
const _dcpt = decoCard;
decoCard = function () { const h = _dcpt(); return h.replace('<div class="dset"><b>💻 컴퓨터 켜면', ptCard() + '<div class="dset"><b>💻 컴퓨터 켜면'); };
/* 오늘 도우미 카드에도 바로가기 */
const ptBtn = () => { const t = document.querySelector('.hpcard .tools:nth-of-type(2)') || document.querySelector('.hpcard .tools'); if (t && !t.querySelector('.ptbtn')) t.insertAdjacentHTML('beforeend', '<button class="btn sm ptbtn" data-act="ptOpen">🏫 교무포털 열기·자료 담기</button>'); };
const _rpt1 = TF.render; TF.render = function () { const v = _rpt1.apply(this, arguments); ptBtn(); return v; };
if (S.setup) { hpInject(); ptBtn(); pnLoad().then(pnRefresh); }
/* render()를 직접 부르는 곳(교시 탭·메모 디자인 닫기 등)에서도 오늘 도우미·한마디·펜 메모가 사라지지 않게, 화면이 다시 그려지면 한 번 더 붙입니다 */
(function () {
  const app = document.getElementById('app'); if (!app) return; let t = 0;
  new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; try { hpInject(); ptBtn(); decoInject(); pnLoad().then(pnRefresh); } catch (e) { } }, 0); }).observe(app, { childList: true });
})();

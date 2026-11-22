/* 화면 단순 보기: 소제목(h3) 구역·사용법 상자·오늘 화면의 큰 덩어리를 "접힌 토글"로 묶는다.
   기본은 모두 접힘. 선생님이 연 칸은 기억하고(tf.fold), 맨 위 [모두 펼치기/접기]로 한 번에 바꾼다. */
(function () {
  const K = 'tf.fold', KV = 'tf.foldv';
  let SET; try { SET = new Set(JSON.parse(localStorage.getItem(K) || '[]')); } catch (e) { SET = new Set(); }
  const keep = () => { try { localStorage.setItem(K, JSON.stringify([...SET].slice(-500))); } catch (e) { } };
  const SKIP = /^#\/(pages?|page\/)/;
  function wrap(nodes, title, key, cls) {
    const d = document.createElement('details'); d.className = 'afold ' + (cls || ''); d.dataset.fk = key; if (SET.has(key)) d.open = true;
    const s = document.createElement('summary'); s.innerHTML = title; d.appendChild(s);
    const b = document.createElement('div'); b.className = 'afb'; d.appendChild(b);
    nodes[0].parentNode.insertBefore(d, nodes[0]); nodes.forEach(n => b.appendChild(n)); return d;
  }
  function migrate() {
    try { if (!localStorage.getItem('tf.cmhide')) { localStorage.setItem('tf.cmhide', '1'); S.navHide = S.navHide || []; if (!S.navHide.includes('cm')) S.navHide.push('cm'); save(true); } } catch (e) { } /* 학급 관리는 선택해야 보임(메뉴 고르기) */
    try { if (localStorage.getItem(KV)) return; localStorage.setItem(KV, '1'); OPEN.clear(); localStorage.setItem('tf.open', '[]'); if (S.profile) { S.profile.hpOpen = false; save(true); } } catch (e) { }
  }
  /* 「오늘의 게시판」을 「오늘 꼭 할 일」 위로(다른 카드가 나중에 끼어들어도 다시 맞춤) */
  function placeBoard() {
    const main = document.querySelector('main'); if (!main) return; const d = main.querySelector(':scope > details.afold[data-fk*="게시판"]'), top = main.querySelector(':scope > .mttoday') || main.querySelector(':scope > .hpcard');
    if (d && top && !(d.compareDocumentPosition(top) & 4)) main.insertBefore(d, top);
  }
  function foldPass() {
    const main = document.querySelector('main'); if (!main || main.querySelector(':scope > .foldbar')) return;
    migrate();
    const hash = (location.hash || '#/today').replace(/\?.*$/, ''); if (SKIP.test(hash)) return;
    const today = /^#\/(today)?$/.test(hash) || hash === '#/'; let n = 0;
    const key = t => hash + '|' + String(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (today) {
      const kids = [...main.children], bh = kids.find(e => e.classList.contains('bh')), sp = kids.find(e => e.classList.contains('spread')), cm = kids.find(e => e.classList.contains('cmtoday'));
      if (bh && sp) { const d = wrap([bh, sp], '📋 오늘의 게시판 <small>일정·할 일·평가·예산·연수 한눈에</small>', key('게시판')); n++; placeBoard(); }
      if (cm && getComputedStyle(cm).display !== 'none') { wrap([cm], '🏫 학급 관리 <small>오늘 반 일정·상담 후속</small>', key('학급')); n++; }
    } else {
      const hs = [...main.children].filter(e => e.matches('h3.h3'));
      if (hs.length >= 2) hs.forEach(h => {
        const grp = []; let x = h.nextElementSibling;
        while (x && !x.matches('h3.h3, .pgfiles, .pgfdet, .foldbar')) { grp.push(x); x = x.nextElementSibling; }
        if (!grp.length) return;
        const d = wrap(grp, h.innerHTML, key(h.textContent)); h.remove(); n++;
      });
      [...main.children].filter(e => e.matches('.steps2, .note2')).forEach((e, i) => { wrap([e], '💡 사용법 <small>필요할 때만 펼치세요</small>', key('사용법' + i), 'help'); n++; });
    }
    if (today) { setTimeout(placeBoard, 60); setTimeout(placeBoard, 500); }
    if (n >= 2) {
      const bar = document.createElement('div'); bar.className = 'foldbar';
      bar.innerHTML = '<button type="button" class="btn sm" data-fold="open">▾ 모두 펼치기</button><button type="button" class="btn sm" data-fold="close">▸ 모두 접기</button>';
      const bk = main.querySelector(':scope > .backbtn'); if (bk) bk.after(bar); else main.prepend(bar);
    }
  }
  document.addEventListener('toggle', e => { const d = e.target; if (d && d.classList && d.classList.contains('afold')) { d.open ? SET.add(d.dataset.fk) : SET.delete(d.dataset.fk); keep(); } }, true);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-fold]');
    if (b) { const open = b.dataset.fold === 'open'; document.querySelectorAll('main details.afold').forEach(d => { d.open = open; }); return; }
    const g = e.target.closest('[data-go]'); if (g) { const t = document.getElementById(g.dataset.go), d = t && t.closest('details.afold'); if (d && !d.open) d.open = true; }
  }, true);
  const _r = TF.render; TF.render = function () { const v = _r.apply(this, arguments); try { foldPass(); } catch (e) { } return v; };
  { const _g = render; render = function () { const v = _g.apply(this, arguments); try { foldPass(); } catch (e) { } return v; }; }
  setTimeout(() => { try { foldPass(); } catch (e) { } }, 0);
})();

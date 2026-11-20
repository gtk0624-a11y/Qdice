'use strict';
/* ===== 업무파탈 sync.js : 선택 기능 · 구글 로그인으로 폰·태블릿·PC 동기화 =====
   firebase-config.js 에 내 파이어베이스 설정을 붙여 넣으면 켜지고, 비어 있으면 이 기기에만 저장됩니다.
   동기화 대상: 일정·예산·수업·평가·연수·업무분장·연락망·서랍·노트 글(잠금 노트와 손글씨 그림, 업로드 문서는 제외) */
(function () {
  const cfg = window.TF_FIREBASE;
  const info = { on: !!cfg, user: null, msg: cfg ? '로그인 전' : '꺼짐(이 기기에만 저장)' };
  let db, auth, unsub, timer, applying = false;
  const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

  function payload() {
    const c = JSON.parse(JSON.stringify(S));
    c.notes = (c.notes || []).filter(n => !n.lock);
    return JSON.stringify(c);
  }
  async function start() {
    if (!cfg) return;
    await loadScript(FB + 'firebase-app-compat.js'); await loadScript(FB + 'firebase-auth-compat.js'); await loadScript(FB + 'firebase-firestore-compat.js');
    firebase.initializeApp(cfg); auth = firebase.auth(); db = firebase.firestore();
    auth.onAuthStateChanged(u => {
      info.user = u; info.msg = u ? (u.email + ' 로그인됨') : '로그인 전';
      if (unsub) { unsub(); unsub = null; }
      if (u) unsub = db.collection('users').doc(u.uid).onSnapshot(snap => {
        if (!snap.exists) { push(true); return; }
        const d = snap.data(); if (!d || !d.state || (d.updatedAt || 0) <= (S.updatedAt || 0)) return;
        const remote = JSON.parse(d.state); const keep = (S.notes || []).filter(n => n.lock);
        applying = true; Object.assign(S, remote); S.notes = (remote.notes || []).concat(keep); S.updatedAt = d.updatedAt; applying = false;
        save(true); TF.render && TF.render(); toast('다른 기기의 최신 내용을 불러왔습니다.');
      }, e => { info.msg = '동기화 오류: ' + e.message; });
      TF.render && TF.render();
    });
  }
  function push(now) {
    if (!db || !info.user || applying) return;
    clearTimeout(timer);
    timer = setTimeout(() => db.collection('users').doc(info.user.uid).set({ state: payload(), updatedAt: S.updatedAt }).catch(e => { info.msg = '저장 오류: ' + e.message; }), now ? 0 : 1500);
  }
  async function login() { if (!auth) return toast('동기화가 꺼져 있습니다. firebase-config.js 를 확인하세요.'); try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); } catch (e) { toast('로그인 실패: ' + e.message); } }
  const logout = () => auth && auth.signOut();
  TF.sync = { info, push, login, logout, start };
})();

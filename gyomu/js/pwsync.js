/* 비밀번호 연동(v85): 구글 로그인 없이 「같은 비밀번호」를 넣은 기기끼리 폰·태블릿·PC가 같은 내용을 씁니다.
   내용은 이 기기에서 비밀번호로 암호화(AES-GCM)한 뒤 올라가므로 저장소에서는 읽을 수 없습니다. 비밀번호는 저장하지 않고 암호 열쇠 조각만 이 기기에 둡니다.
   저장소 주소(Firebase 실시간 DB)는 코드에 넣지 않고 localStorage 'tf.db'에 둡니다(링크 ?sync=이름 으로 한 번 넣음). 대상: 일정·예산·수업·업무 등 S 전체(잠금 노트·올린 문서 원본·AI 키 제외). */
(function () {
  const K_DB = 'tf.db', K_KEY = 'tf.pwk', K_MK = 'tf.pwm', enc = new TextEncoder(), dec = new TextDecoder();
  const st = { msg: '', busy: false }; let timer = 0, applying = false;
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const mk = () => get(K_MK, { base: 0, rseen: 0, h: null }), setMk = m => localStorage.setItem(K_MK, JSON.stringify(m));
  const dbUrl = () => (localStorage.getItem(K_DB) || '').replace(/\/+$/, ''), key = () => get(K_KEY, null), on = () => !!(dbUrl() && key());
  const b64 = u => { u = new Uint8Array(u); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)), hex = u => [...new Uint8Array(u)].map(x => x.toString(16).padStart(2, '0')).join('');
  async function derive(pw) { const m = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']), bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode('travail-fatal-sync-v1'), iterations: 200000, hash: 'SHA-256' }, m, 384)); return { id: hex(bits.slice(0, 16)), k: b64(bits.slice(16, 48)) }; }
  const aes = (k = key()) => crypto.subtle.importKey('raw', unb64(k.k), 'AES-GCM', false, ['encrypt', 'decrypt']);
  const url = (k = key()) => `${dbUrl()}/rooms/tfsync_${k.id}.json`;
  const hsh = () => { const t = payload().replace(/"updatedAt":\d+/, ''); let x = 5381; for (let i = 0; i < t.length; i++) x = ((x << 5) + x + t.charCodeAt(i)) | 0; return x; };
  const payload = () => { const c = JSON.parse(JSON.stringify(S)); c.notes = (c.notes || []).filter(n => !n.lock); c.pages = (c.pages || []).filter(n => !n.lock); return JSON.stringify(c); };
  async function seal() { const iv = crypto.getRandomValues(new Uint8Array(12)), d = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aes(), enc.encode(payload())); return { u: Date.now(), iv: b64(iv), d: b64(d) }; }
  async function open(r, k) { return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(r.iv) }, await aes(k), unb64(r.d)))); }
  async function remote(k) { const r = await fetch(url(k), { cache: 'no-store' }); if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? '저장소가 쓰기를 막았습니다(보안 규칙 확인)' : '저장소 응답 오류 ' + r.status); return r.json(); }
  async function push() { const body = await seal(), r = await fetch(url(), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? '저장소가 쓰기를 막았습니다(보안 규칙 확인)' : '올리기 실패 ' + r.status); setMk({ base: S.updatedAt || 0, rseen: body.u, h: hsh() }); }
  async function applyRemote(r, k) {
    const o = await open(r, k), keep = (S.notes || []).filter(n => n.lock), keepP = (S.pages || []).filter(n => n.lock); applying = true;
    if (typeof snapshot === 'function') try { snapshot(); } catch (e) { }
    Object.assign(S, o); S.notes = (o.notes || []).concat(keep); S.pages = (o.pages || []).concat(keepP); save(true); applying = false; setMk({ base: S.updatedAt || 0, rseen: r.u, h: hsh() }); TF.render && TF.render(); toast('다른 기기의 최신 내용을 불러왔습니다.');
  }
  async function tick(force) {
    if (!on() || st.busy || applying) return; st.busy = true;
    try {
      const r = await remote(), m = mk(), dirty = hsh() !== m.h, at = () => new Date().toLocaleTimeString('ko-KR');
      if (!r) { await push(); st.msg = '올렸습니다 ' + at(); }
      else if (r.u > m.rseen && !(dirty && (S.updatedAt || 0) > r.u)) { await applyRemote(r, key()); st.msg = '불러왔습니다 ' + at(); }
      else if (dirty || force) { await push(); st.msg = '올렸습니다 ' + at(); }
      else st.msg = '최신입니다 ' + at();
    } catch (e) { st.msg = '⚠ ' + e.message; }
    st.busy = false;
  }
  const _p = TF.sync && TF.sync.push; if (TF.sync) TF.sync.push = function () { if (_p) _p.apply(this, arguments); if (on()) { clearTimeout(timer); timer = setTimeout(() => tick(), 2000); } };
  setInterval(() => { if (!document.hidden) tick(); }, 20000); document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); }); window.addEventListener('online', () => tick()); setTimeout(() => tick(), 2500);
  Object.assign(A, {
    pwOn() {
      if (!dbUrl()) { toast('연동 주소가 아직 없습니다. 아래 「연동 주소 넣기」를 먼저 하세요.'); return; }
      ask('연동 비밀번호 정하기', [{ k: 'pw', label: '비밀번호 (8자 이상 · 폰과 PC에 똑같이 넣으세요. 잊으면 복구할 수 없습니다)', type: 'password', req: 1 }], async o => {
        if (o.pw.length < 8) { toast('8자 이상으로 정해 주세요.'); return; }
        try {
          const d = await derive(o.pw), r = await remote(d), turnOn = () => { localStorage.setItem(K_KEY, JSON.stringify(d)); setMk({ base: 0, rseen: 0, h: null }); };
          if (r) sure('이 비밀번호로 저장된 내용이 있습니다. 이 기기의 내용을 그것으로 바꿀까요? (되돌리기 가능. 취소하면 연동을 켜지 않습니다)', async () => { try { await open(r, d); turnOn(); await applyRemote(r, d); st.msg = '연동 켜짐 · 불러왔습니다'; } catch (e) { toast('불러오지 못했습니다: ' + e.message); } render(); });
          else sure('이 비밀번호로 저장된 내용이 없습니다. 새로 만들까요? (이미 다른 기기에서 연동했다면 그 비밀번호와 똑같은지 확인하세요. 다르면 따로따로 저장됩니다)', async () => { try { turnOn(); await push(); st.msg = '연동 켜짐 · 처음 올렸습니다'; toast('연동을 켰습니다. 폰에서도 같은 비밀번호를 넣으세요.'); } catch (e) { localStorage.removeItem(K_KEY); toast('연동 실패: ' + e.message); } render(); });
        } catch (e) { toast('연동 실패: ' + e.message); }
      }, '연동 켜기');
    },
    pwNow() { tick(true).then(() => { render(); toast(st.msg || '완료'); }); },
    pwOff() { sure('이 기기의 연동을 끌까요? (저장소의 내용은 그대로 남습니다)', () => { localStorage.removeItem(K_KEY); localStorage.removeItem(K_MK); st.msg = ''; render(); }); },
    pwUrl() { ask('연동 주소 넣기', [{ k: 'u', label: 'Firebase 실시간 DB 주소 (https://….firebasedatabase.app)', val: dbUrl(), req: 1 }], o => { if (!/^https:\/\/[\w.-]+\.(firebasedatabase\.app|firebaseio\.com)\/?$/.test(o.u.trim())) { toast('주소 형식이 아닙니다.'); return; } localStorage.setItem(K_DB, o.u.trim()); render(); }); },
    async pwTest() { const u = dbUrl(); if (!u) { toast('연동 주소를 먼저 넣으세요.'); return; } try { const r = await fetch(`${u}/rooms/tfsync__probe.json`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: Date.now() }) }); if (r.ok) { fetch(`${u}/rooms/tfsync__probe.json`, { method: "DELETE" }); toast('✅ 저장소에 쓸 수 있습니다.'); } else toast(`⚠ 저장소가 막았습니다(${r.status}). 저장소 쓰기 규칙을 확인해야 합니다.`); } catch (e) { toast('⚠ 저장소에 닿지 못했습니다: ' + e.message); } }
  });
  { const _s = setView; setView = function () {
    const h = _s.apply(this, arguments), mark = '<h3 class="h3">여러 기기 동기화</h3>'; if (h.indexOf(mark) < 0) return h; const k = key();
    return h.replace(mark, `<h3 class="h3">📱 비밀번호로 폰·PC 연동</h3><p class="mu">같은 비밀번호를 넣은 기기끼리 일정·예산·업무가 같아집니다(암호화되어 올라갑니다).</p><p>${!dbUrl() ? '연동 주소가 없습니다.' : !k ? '주소 준비됨 · 비밀번호를 정하면 켜집니다.' : '✅ 연동 켜짐'} ${esc(st.msg)}</p><div class="tools">${k ? '<button class="btn pri" data-act="pwNow">지금 동기화</button><button class="btn" data-act="pwOff">연동 끄기</button>' : '<button class="btn pri" data-act="pwOn">비밀번호 정하고 연동 켜기</button>'}<button class="btn sm" data-act="pwUrl">연동 주소 넣기</button><button class="btn sm" data-act="pwTest">연결 시험</button></div>${mark}`);
  }; }
  (async () => { try { const n = new URLSearchParams(location.search).get('sync'); if (!n || !/^[\w-]{3,40}$/.test(n)) return; const r = await fetch('kits/' + n + '.json', { cache: 'no-store' }); if (!r.ok) throw new Error('연동 정보를 찾지 못했습니다'); const j = await r.json(); if (j.tf !== 'sync' || !/^https:\/\//.test(j.db || '')) throw new Error('형식이 아닙니다'); localStorage.setItem(K_DB, j.db); history.replaceState(null, '', location.pathname + '#/set'); toast('연동 주소를 넣었습니다. 설정에서 비밀번호를 정하세요.'); location.hash = '#/set'; TF.render && TF.render(); } catch (e) { toast('연동 링크 실패: ' + e.message); } })();
})();

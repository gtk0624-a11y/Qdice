/* 기기 연동 (컴 · 폰 · 태블릿): 연동 암호 하나로 같은 수첩을 열어 줍니다.
   - 내용은 이 기기에서 암호로 잠근 뒤(AES-256) 서버에 올라갑니다. 서버에는 읽을 수 없는 글자만 남습니다.
   - 서버 주소는 선생님 파이어베이스 프로젝트의 실시간 데이터베이스입니다. 구글 로그인이 필요 없습니다.
   - 가장 나중에 고친 기기의 내용이 이깁니다. */
const CLOUD_URL = (window.TF_CLOUD_URL || 'https://nation-game-cf684-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, '');
const CLOUD = { pass: window.TF_DEMO ? '' : (localStorage.getItem('tf.cloudPass') || ''), info: { state: 'off', msg: '꺼져 있음', at: 0 }, busy: false, id: '', key: null };
const _enc = new TextEncoder(), _dec = new TextDecoder();
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function cloudKeys() {
  if (CLOUD.key && CLOUD.keyFor === CLOUD.pass) return;
  const km = await crypto.subtle.importKey('raw', _enc.encode(CLOUD.pass), 'PBKDF2', false, ['deriveKey']);
  CLOUD.key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: _enc.encode('travailfatal-key-v1'), iterations: 150000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const h = await crypto.subtle.digest('SHA-256', _enc.encode('travailfatal-id-v1:' + CLOUD.pass));
  CLOUD.id = Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32); CLOUD.keyFor = CLOUD.pass;
}
async function sealObj(o) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, CLOUD.key, _enc.encode(JSON.stringify(o)))); return b64(iv) + '.' + b64(ct); }
async function openObj(s) { const [a, b] = s.split('.'); return JSON.parse(_dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(a) }, CLOUD.key, unb64(b)))); }
const cloudSet = (state, msg) => { CLOUD.info = { state, msg, at: Date.now() }; const el = document.getElementById('cloudst'); if (el) el.textContent = msg; };
async function cloudGet(path) { const r = await fetch(`${CLOUD_URL}/tf/${CLOUD.id}${path}.json`, { cache: 'no-store' }); if (r.status === 401 || r.status === 403) throw new Error('perm'); if (!r.ok) throw new Error('net'); return r.json(); }
async function cloudMedia() {
  const ink = {}; for (const n of S.notes) { const v = await idb.get('ink:' + n.id); if (v) ink[n.id] = v; }
  return { mascot: MASCOT, logo: LOGO, mystk: typeof MYSTK !== 'undefined' ? MYSTK : [], ink };
}
async function cloudPush() {
  await cloudKeys();
  const body = JSON.stringify({ t: S.updatedAt, s: await sealObj(S), l: await sealObj(LIB), m: await sealObj(await cloudMedia()), a: await sealObj(ARCH) });
  const r = await fetch(`${CLOUD_URL}/tf/${CLOUD.id}.json`, { method: 'PUT', body });
  if (r.status === 401 || r.status === 403) throw new Error('perm'); if (!r.ok) throw new Error('net');
}
async function cloudPull(t) {
  await cloudKeys(); const d = await cloudGet('');
  let s, l, m, a; try { s = await openObj(d.s); l = await openObj(d.l); m = await openObj(d.m); a = d.a ? await openObj(d.a) : []; } catch (e) { throw new Error('pass'); }
  S = Object.assign(DEF(), s); S.updatedAt = d.t; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
  LIB = l || []; await saveLib(); ARCH = a || []; await saveArch();
  MASCOT = m.mascot || ''; await idb.set('mascot', MASCOT); LOGO = m.logo || ''; await idb.set('logo', LOGO);
  if (typeof MYSTK !== 'undefined') { MYSTK = m.mystk || []; await saveMy(); }
  for (const id of Object.keys(m.ink || {})) await idb.set('ink:' + id, m.ink[id]);
  render();
}
async function cloudTick(force) {
  if (!CLOUD.pass || CLOUD.busy || !navigator.onLine) return;
  const ae = document.activeElement; if (!force && ae && /INPUT|TEXTAREA/.test(ae.tagName) && ae.id !== 'cloudpass') { CLOUD.again = true; return; }
  CLOUD.busy = true;
  try {
    await cloudKeys(); cloudSet('run', '맞추는 중…');
    const r = await cloudGet('/t'), local = S.updatedAt || 0;
    if (r == null) { if (S.setup) await cloudPush(); }
    else if (r > local) await cloudPull();
    else if (local > r) await cloudPush();
    cloudSet('ok', '연결됨 · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ' 마지막 확인');
  } catch (e) {
    cloudSet('err', e.message === 'perm' ? '서버가 쓰기를 막고 있습니다 (파이어베이스 규칙 설정이 필요합니다)' : e.message === 'pass' ? '연동 암호가 달라서 내용을 열지 못했습니다' : '인터넷이 불안정합니다. 곧 다시 시도합니다');
  } finally { CLOUD.busy = false; }
}
let _ping; const cloudPing = () => { if (!CLOUD.pass) return; clearTimeout(_ping); _ping = setTimeout(() => cloudTick(), 2500); };
if (TF.sync) { const _p = TF.sync.push; TF.sync.push = function () { try { _p && _p.apply(this, arguments); } catch (e) { } cloudPing(); }; }
setInterval(() => cloudTick(), 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) cloudTick(); });
window.addEventListener('online', () => cloudTick());
window.addEventListener('focus', () => cloudTick());
if (CLOUD.pass) { cloudSet('run', '연결 중…'); setTimeout(() => cloudTick(true), 800); }
Object.assign(A, {
  cloudOn() {
    if (window.TF_DEMO) { toast('체험판에서는 기기 연동이 꺼져 있습니다. 내 수첩에서 켜 주세요.'); return; }
    ask('기기 연동 켜기', [{ k: 'p', label: '연동 암호 (8자 이상 · 컴·폰·태블릿에 똑같이 입력)', type: 'password' }], async o => {
      const p = (o.p || '').trim(); if (p.length < 8) return toast('암호를 8자 이상으로 입력해 주세요.');
      CLOUD.pass = p; CLOUD.key = null; await cloudKeys(); cloudSet('run', '확인 중…');
      try {
        const r = await cloudGet('/t'), hasLocal = S.setup && S.updatedAt;
        if (r == null) { await cloudPush(); }
        else if (!hasLocal) { await cloudPull(); }
        else {
          ask('이미 올라간 내용이 있습니다', [{ k: 'w', label: '어느 쪽을 쓸까요?', type: 'select', opts: ['클라우드 내용을 이 기기로 가져오기 (이 기기 내용은 백업 파일로 저장됩니다)', '이 기기 내용으로 클라우드를 덮어쓰기'] }], async v => {
            if (v.w.startsWith('클라우드')) { A.backup(); await cloudPull(); } else { await cloudPush(); }
            localStorage.setItem('tf.cloudPass', p); cloudSet('ok', '연결됨'); render();
          }, '확인'); return;
        }
        localStorage.setItem('tf.cloudPass', p); cloudSet('ok', '연결됨'); toast('기기 연동을 켰습니다.'); render();
      } catch (e) { CLOUD.pass = ''; cloudSet('err', e.message === 'perm' ? '서버가 쓰기를 막고 있습니다 (파이어베이스 규칙 설정이 필요합니다)' : e.message === 'pass' ? '연동 암호가 달라서 열지 못했습니다' : '서버에 닿지 못했습니다. 인터넷을 확인해 주세요.'); toast(CLOUD.info.msg); }
    }, '켜기');
  },
  cloudOff() { sure('이 기기의 기기 연동을 끌까요? (이 기기 내용과 서버 내용은 그대로 남습니다)', () => { CLOUD.pass = ''; localStorage.removeItem('tf.cloudPass'); cloudSet('off', '꺼져 있음'); render(); }); },
  cloudNow() { cloudTick(true).then(() => toast(CLOUD.info.msg)); }
});

'use strict';
/* ===== 업무파탈 core.js : 공통 도구 · 저장소 · 대화상자 ===== */
const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const won = n => Number(n || 0).toLocaleString('ko-KR');
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const dd = s => { if (!s) return null; const a = new Date(s + 'T00:00:00'), b = new Date(today() + 'T00:00:00'); return Math.round((a - b) / 864e5); };
const ddText = n => n === null ? '' : n === 0 ? '오늘' : n > 0 ? 'D-' + n : 'D+' + (-n);
const md = s => s ? (+s.slice(5, 7)) + '/' + (+s.slice(8, 10)) : '';
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/* ---- 큰 자료(필기 그림, 업로드 문서, 꿈송이 사진)는 IndexedDB, 막히면 메모리 ---- */
const mem = new Map();
const idb = {
  p: null,
  open() {
    if (this.p) return this.p;
    this.p = new Promise((res, rej) => {
      try {
        const r = indexedDB.open('travailfatal', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return this.p;
  },
  async get(k) {
    try { const db = await this.open(); return await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); }
    catch (e) { return mem.get(k); }
  },
  async set(k, v) {
    try { const db = await this.open(); await new Promise((res, rej) => { const q = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k); q.onsuccess = res; q.onerror = () => rej(q.error); }); }
    catch (e) { mem.set(k, v); }
  },
  async del(k) {
    try { const db = await this.open(); await new Promise(res => { const q = db.transaction('kv', 'readwrite').objectStore('kv').delete(k); q.onsuccess = res; q.onerror = res; }); }
    catch (e) { mem.delete(k); }
  }
};

/* ---- 상태 ---- */
const KEY = 'travailfatal.v1';
const DEF = () => ({
  v: 1, updatedAt: 0, setup: false,
  profile: { name: '', school: '', subject: '', classes: ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3'], start: '09:00', classMin: 45, breakMin: 10, devTarget: 30 },
  timetable: {}, items: [], lessons: [], assess: [], budget: [], training: [], notes: [], docs: {}, duties: [], contacts: [], links: [], pages: [], hide: {}
});
let S;
try { S = Object.assign(DEF(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = DEF(); }
S.profile = Object.assign(DEF().profile, S.profile);
let ARCH = [];
let LIB = []; // 업로드 문서 [{id,name,kind,text,added}]
let LOGO = ''; // 도디쌤 이미지(dataURL)
let MASCOT = ''; // 꿈송이 그림(dataURL)

const TF = { sync: null, render: null };
function save(quiet) {
  S.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('저장 공간이 부족합니다. 설정에서 백업 후 정리해 주세요.'); }
  if (TF.sync && !quiet) TF.sync.push();
}
function commit() { save(); TF.render && TF.render(); }
async function loadBig() {
  LIB = (await idb.get('lib')) || [];
  MASCOT = (await idb.get('mascot')) || '';
  LOGO = (await idb.get('logo')) || '';
  ARCH = (await idb.get('arch')) || [];
}
const DEFLOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#6E1423"/><circle cx="32" cy="26" r="11" fill="#F2EBDD"/><path d="M12 56c3-14 13-19 20-19s17 5 20 19z" fill="#F2EBDD"/></svg>');
const titleOf = () => (S.profile.title || '업무파탈').trim();
const wmUrl = () => { const t = (S.profile.wmText || (titleOf() + ' · ' + (S.profile.name || S.profile.school || ''))).replace(/[<>&]/g, ''); return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220"><text x="170" y="115" text-anchor="middle" transform="rotate(-24 170 110)" font-family="Noto Serif KR,serif" font-size="22" font-weight="700" fill="#1B1613" fill-opacity="0.07">${t}</text></svg>`) + '")'; };
function applyBrand() {
  document.title = titleOf() + ' · ' + (S.profile.sub || 'Travail Fatal');
  let w = document.getElementById('wm');
  if (!w) { w = document.createElement('div'); w.id = 'wm'; w.setAttribute('aria-hidden', 'true'); document.body.appendChild(w); }
  w.style.backgroundImage = S.profile.wm === false ? 'none' : wmUrl();
}
const saveLib = () => idb.set('lib', LIB);
const saveArch = () => idb.set('arch', ARCH);

/* ---- 알림 ---- */
let toastT;
function toast(msg) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.className = 'show'; clearTimeout(toastT); toastT = setTimeout(() => t.className = '', 3200);
}

/* ---- 대화상자: ask(제목, 입력칸들, 확인콜백, 확인버튼글자) ---- */
function ask(title, fields, ok, label) {
  const d = document.createElement('dialog'); d.className = 'dlg';
  const input = f => {
    const v = f.val ?? '';
    if (f.type === 'select') return `<select name="${f.k}">${f.opts.map(o => `<option ${String(o) === String(v) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    if (f.type === 'textarea') return `<textarea name="${f.k}" rows="${f.rows || 5}">${esc(v)}</textarea>`;
    return `<input name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.req ? 'required' : ''}>`;
  };
  d.innerHTML = `<form method="dialog"><h3>${esc(title)}</h3>${fields.map(f => `<label>${esc(f.label)}${input(f)}</label>`).join('')}<div class="btns"><button value="ok" class="pri">${esc(label || '저장')}</button><button value="cancel" formnovalidate>취소</button></div></form>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => {
    if (d.returnValue === 'ok') { const o = {}; new FormData(d.querySelector('form')).forEach((v, k) => o[k] = v); ok(o); }
    d.remove();
  });
  d.showModal();
  const first = d.querySelector('input,textarea,select'); if (first) first.focus();
}
const sure = (msg, ok) => ask(msg, [], ok, '확인');

/* ---- 파일 읽기: txt/csv/md/xlsx/pdf (xlsx·pdf는 필요할 때만 인터넷에서 내려받음) ---- */
const loaded = {};
function loadScript(url) {
  return loaded[url] || (loaded[url] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => rej(new Error('불러오기 실패: ' + url)); document.head.appendChild(s); }));
}
async function readFile(f) {
  const n = f.name.toLowerCase();
  if (/\.(txt|csv|md|json)$/.test(n)) return await f.text();
  if (/\.xlsx?$/.test(n)) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    return wb.SheetNames.map(s => '[' + s + ']\n' + XLSX.utils.sheet_to_csv(wb.Sheets[s], { FS: ' | ' })).join('\n');
  }
  if (/\.pdf$/.test(n)) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) { const pg = await pdf.getPage(i); const c = await pg.getTextContent(); out += c.items.map(x => x.str).join(' ') + '\n\f'; }
    return out;
  }
  throw new Error('이 파일 형식은 읽지 못합니다. 한글(hwp)·워드는 PDF로 저장해서 올려 주세요.');
}
function download(name, text, mime) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

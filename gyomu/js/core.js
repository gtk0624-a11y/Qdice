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
const DEFLOGO = 'data:image/jpeg;base64,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';
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

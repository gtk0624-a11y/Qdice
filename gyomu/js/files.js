/* 한글(hwp·hwpx)·워드(docx) 읽기, 일과표·시간표 자동 인식, 컴시간알리미 연동, 읽기 편한 문서 보기 */
async function inflateRaw(data) { const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); }
function zipIndex(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf); let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('압축 파일이 아닙니다.');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
  for (let i = 0; i < n; i++) { const method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true); out[new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl))] = { method, csz, off }; p += 46 + nl + el + cl; }
  return { out, u8, dv };
}
async function zipRead(z, name) { const e = z.out[name], nl = z.dv.getUint16(e.off + 26, true), el = z.dv.getUint16(e.off + 28, true), st = e.off + 30 + nl + el, d = z.u8.subarray(st, st + e.csz); return e.method === 0 ? d : inflateRaw(d); }
const xmlText = x => x.replace(/<\/(hp:p|w:p)>\s*<\/(hp:tc|w:tc)>/g, '</$2>').replace(/<\/(hp:tc|w:tc)>/g, ' | ').replace(/<\/(hp:tr|w:tr|hp:p|w:p)>/g, '\n').replace(/<(hp:tab|w:tab)\s*\/>/g, '\t').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
function hwpPara(b) { let s = ''; for (let i = 0; i + 1 < b.length;) { const c = b[i] | (b[i + 1] << 8); if (c < 32) { if ([1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23].includes(c)) { i += 16; continue; } if (c === 10 || c === 13) s += '\n'; else if (c === 9) s += '\t'; i += 2; continue; } s += String.fromCharCode(c); i += 2; } return s.replace(/\n+$/, '') + '\n'; }
function hwpRecords(u8) { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let p = 0, out = ''; while (p + 4 <= u8.length) { const h = dv.getUint32(p, true); p += 4; const tag = h & 0x3ff; let size = (h >>> 20) & 0xfff; if (size === 0xfff) { size = dv.getUint32(p, true); p += 4; } if (tag === 67) out += hwpPara(u8.subarray(p, p + size)); p += size; } return out; }
async function readHwp(buf) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  const cfb = XLSX.CFB.read(new Uint8Array(buf), { type: 'array' }), fh = XLSX.CFB.find(cfb, '/FileHeader');
  if (!fh) throw new Error('한글 파일 형식을 알아보지 못했습니다.');
  const flags = fh.content[36]; if (flags & 2) throw new Error('암호가 걸린 한글 파일입니다. 암호를 풀고 다시 올려 주세요.'); if (flags & 4) throw new Error('배포용 문서(복사 제한)라 읽지 못합니다. PDF로 저장해 올려 주세요.');
  let out = '';
  for (let i = 0; i < 60; i++) { const sec = XLSX.CFB.find(cfb, '/BodyText/Section' + i); if (!sec) break; let c = Uint8Array.from(sec.content); if (flags & 1) c = await inflateRaw(c); out += hwpRecords(c) + '\n\f'; }
  if (!out.trim()) throw new Error('한글 파일에서 글자를 찾지 못했습니다.');
  return out;
}
const _readFile0 = readFile;
readFile = async function (f) {
  const n = f.name.toLowerCase();
  if (/\.hwpx$/.test(n)) { const z = zipIndex(await f.arrayBuffer()); const names = Object.keys(z.out).filter(k => /^Contents\/section\d+\.xml$/i.test(k)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/))); if (!names.length) throw new Error('한글(hwpx) 안에서 본문을 찾지 못했습니다.'); let t = ''; for (const k of names) t += xmlText(new TextDecoder().decode(await zipRead(z, k))) + '\n\f'; return t; }
  if (/\.hwp$/.test(n)) return await readHwp(await f.arrayBuffer());
  if (/\.docx$/.test(n)) { const z = zipIndex(await f.arrayBuffer()); if (!z.out['word/document.xml']) throw new Error('워드 파일 본문을 찾지 못했습니다.'); return xmlText(new TextDecoder().decode(await zipRead(z, 'word/document.xml'))); }
  return _readFile0(f);
};

/* ---- 일과표(종 시각표) 인식 ---- */
const mm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; }, hm = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
function extractBell(text) {
  const t = text.replace(/\|/g, ' ').replace(/[ \t]+/g, ' '), re = /(\d)\s*(?:교시|교\s*시)?[\s\n:]*?(\d{1,2})\s*[:시]\s*(\d{2})\s*분?\s*[~\-–∼]\s*(\d{1,2})\s*[:시]\s*(\d{2})/g, got = {};
  let m; while ((m = re.exec(t))) { const p = +m[1], s = +m[2] * 60 + +m[3], e = +m[4] * 60 + +m[5]; if (p >= 1 && p <= 9 && e > s && e - s < 120 && s >= 7 * 60 && s < 18 * 60 && !got[p]) got[p] = { p, s, e }; }
  const L = Object.values(got).sort((a, b) => a.p - b.p); return L.length >= 3 ? L : [];
}
const modeOf = a => { const c = {}; a.forEach(x => c[x] = (c[x] || 0) + 1); return +Object.keys(c).sort((x, y) => c[y] - c[x])[0]; };
function applyBell(L) { const dur = L.map(x => x.e - x.s), gaps = L.slice(1).map((x, i) => x.s - L[i].e).filter(g => g >= 0 && g <= 20); S.profile.bell = L; S.profile.start = hm(L[0].s); S.profile.classMin = modeOf(dur); S.profile.breakMin = gaps.length ? modeOf(gaps) : S.profile.breakMin; commit(); }
function bellDialog(text) {
  const L = extractBell(text); if (!L.length) return toast('일과표(1교시 08:50~09:35 같은 시각)를 찾지 못했습니다. 아래 "붙여넣기"를 써 보세요.');
  const d = document.createElement('dialog'); d.className = 'dlg';
  d.innerHTML = `<form method="dialog"><h3>일과표를 찾았습니다</h3><table class="tbl"><tbody>${L.map(x => `<tr><td>${x.p}교시</td><td>${hm(x.s)} ~ ${hm(x.e)}</td></tr>`).join('')}</tbody></table><p class="mu">적용하면 오늘 화면의 "지금 몇 교시"가 이 시각표대로 움직입니다.</p><div class="btns"><button value="no">취소</button><button value="ok" class="pri">적용</button></div></form>`;
  document.body.appendChild(d); d.addEventListener('close', () => { if (d.returnValue === 'ok') { applyBell(L); toast('일과표를 적용했습니다.'); } d.remove(); }); d.showModal();
}

/* ---- 시간표(반 이름) 인식: 표를 복사해 붙이거나 파일로 올립니다 ---- */
function extractTT(text) {
  const got = {}; text.split(/\n/).forEach(l => { const c = l.split(/\t|\s\|\s|\s{2,}|\|/).map(s => s.trim()).filter((s, i, a) => s !== '' || i < a.length); const first = (c[0] || '').replace(/교시/, '').trim(); if (!/^[1-9]$/.test(first)) return; const cells = c.slice(1); cells.slice(0, 5).forEach((v, i) => { v = v.replace(/^-+$|^—+$/, '').trim(); if (v) got[(i + 1) + '-' + first] = v; }); });
  return got;
}
function ttDialog(text) {
  const G = extractTT(text), n = Object.keys(G).length; if (!n) return toast('시간표 표(교시 줄에 월~금 칸)를 찾지 못했습니다.');
  sure(`시간표 ${n}칸을 찾았습니다. 지금 시간표를 이 내용으로 바꿀까요?`, () => { S.timetable = G; commit(); toast('시간표를 넣었습니다.'); });
}

/* ---- 컴시간알리미 연동 (GitHub Actions 가 매일 새벽 받아 둔 자료를 읽습니다) ---- */
const COMCI_URL = window.TF_COMCI_URL || 'https://raw.githubusercontent.com/gtk0624-a11y/Qdice/data/comcigan.json';
async function comciSync(silent) {
  const nm = (S.profile.name || '').trim(); if (nm.length < 2) { if (!silent) toast('설정에서 내 이름을 먼저 넣어 주세요. (컴시간에는 이름이 "김정*"처럼 보입니다)'); return; }
  try {
    const r = await fetch(COMCI_URL, { cache: 'no-store' }); if (!r.ok) throw new Error('none'); const j = await r.json();
    const key = nm.slice(0, 2) + '*', G = {};
    (j.lessons || []).filter(l => l.t === key || l.t === nm).forEach(l => { const k = l.d + '-' + l.p; if (!G[k]) G[k] = `${l.g}-${l.c} ${l.s}`.trim(); });
    if (!Object.keys(G).length) { if (!silent) toast(`컴시간에서 "${key}" 선생님 수업을 찾지 못했습니다. 설정의 이름을 확인해 주세요.`); return; }
    const same = JSON.stringify(G) === JSON.stringify(S.timetable); S.timetable = G; S.profile.comci = Date.now();
    if (!same) { commit(); if (!silent) toast(`컴시간 시간표 ${Object.keys(G).length}칸을 가져왔습니다. (${(j.updated || '').slice(0, 10)} 기준)`); } else if (!silent) toast('이미 최신 시간표입니다.');
  } catch (e) { if (!silent) toast('컴시간 자료가 아직 없습니다. GitHub의 Actions 탭에서 "컴시간 시간표 가져오기"를 한 번 실행해 주세요. 그동안은 아래 "붙여넣기"로 넣을 수 있습니다.'); }
}
setTimeout(() => { if (S.profile.comci && Date.now() - S.profile.comci > 6 * 3600 * 1000) comciSync(true); }, 2500);

/* ---- 문서 읽기 편하게 보기 ---- */
function readable(text) {
  const esc2 = esc, H = /^(\d{1,2}\s*[.)]\s|[가-하]\s*[.)]\s|[ⅠⅡⅢⅣⅤⅥⅦ]+\s*[.)]?\s|[□■◆▣◇▶【\[])/, B = /^([○●ㆍ·•\-*※]\s*)/;
  let h = '', tb = [];
  const flush = () => { if (tb.length) { h += `<div class="tw"><table class="tbl">${tb.map(r => `<tr>${r.map(c => `<td>${esc2(c)}</td>`).join('')}</tr>`).join('')}</table></div>`; tb = []; } };
  text.split('\n').forEach(raw => {
    if (raw.includes('\f')) { flush(); h += '<hr class="pgb">'; raw = raw.replace(/\f/g, ''); }
    const l = raw.trim(); if (!l) return;
    if (l.includes(' | ') ) { tb.push(l.split(/\s\|\s/).map(s => s.trim()).filter((s, i, a) => s || i < a.length - 1)); return; }
    flush();
    if (H.test(l) && l.length < 60) h += `<h4>${esc2(l)}</h4>`; else if (B.test(l)) h += `<p class="bl">${esc2(l)}</p>`; else h += `<p>${esc2(l)}</p>`;
  }); flush(); return h;
}
Object.assign(A, { comci() { comciSync(false); }, ttPaste() { ask('시간표 붙여넣기', [{ k: 'text', label: '컴시간·한글·엑셀의 시간표 표를 복사해서 붙여 넣으세요', type: 'textarea', rows: 10, req: 1 }], o => ttDialog(o.text), '찾기'); }, bellPaste() { ask('일과표 붙여넣기', [{ k: 'text', label: '일과표(1교시 08:50~09:35 …)를 복사해서 붙여 넣으세요', type: 'textarea', rows: 10, req: 1 }], o => bellDialog(o.text), '찾기'); } });
document.addEventListener('change', async e => {
  const t = e.target; if (t.id !== 'bellUp' && t.id !== 'ttUp') return; const f = t.files[0]; if (!f) return;
  try { toast('읽는 중…'); const text = await readFile(f); if (t.id === 'bellUp') bellDialog(text); else ttDialog(text); } catch (er) { toast(er.message); } t.value = '';
});

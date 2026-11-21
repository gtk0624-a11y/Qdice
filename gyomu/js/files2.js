/* 파일 읽기 보강: ① 엑셀·PDF 읽기 도구를 앱 안(lib/)에서 먼저 불러옴(학교망에서 외부 서버가 막혀도 동작)
   ② 한글(hwp) 직접 읽기(외부 도구 없이) + 글자 깨짐 수정 ③ 읽지 못해도 원본은 반드시 보관 */
const LIB_MAP = {
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js': 'lib/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js': 'lib/pdf.min.js'
};
const _loadScript0 = loadScript;
loadScript = function (url) {
  const local = LIB_MAP[url]; if (!local) return _loadScript0(url);
  return _loadScript0(new URL(local, document.baseURI).href).then(() => { if (/pdf\.min/.test(local)) window.__pdfLocal = true; }).catch(() => _loadScript0(url));
};
/* --- 복합 문서(CFB) 읽기: 한글 hwp 5.x 는 이 형식 --- */
function cfbRead(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== 0xE011CFD0) throw new Error('한글(hwp) 파일 형식이 아닙니다. (hwpx나 다른 형식이면 확장자를 확인해 주세요)');
  const ss = 1 << dv.getUint16(30, true), ms = 1 << dv.getUint16(32, true), nFat = dv.getUint32(44, true), dirStart = dv.getUint32(48, true), cutoff = dv.getUint32(56, true), mfStart = dv.getUint32(60, true), nDifat = dv.getUint32(72, true);
  let difStart = dv.getUint32(68, true); const sec = i => 512 + i * ss, END = 0xFFFFFFFE;
  const fatSecs = []; for (let i = 0; i < 109; i++) { const v = dv.getUint32(76 + i * 4, true); if (v < 0xFFFFFFFA) fatSecs.push(v); }
  for (let k = 0; k < nDifat && difStart < 0xFFFFFFFA; k++) { const o = sec(difStart); for (let i = 0; i < ss / 4 - 1; i++) { const v = dv.getUint32(o + i * 4, true); if (v < 0xFFFFFFFA) fatSecs.push(v); } difStart = dv.getUint32(o + ss - 4, true); }
  const fat = []; fatSecs.slice(0, nFat || fatSecs.length).forEach(s => { const o = sec(s); for (let i = 0; i < ss / 4; i++) fat.push(dv.getUint32(o + i * 4, true)); });
  const chain = (st, tbl) => { const r = []; let c = st, g = 0; while (c < 0xFFFFFFFA && g++ < 1e6) { r.push(c); c = tbl[c]; if (c === undefined) break; } return r; };
  const readBig = (st, size) => { const ch = chain(st, fat), out = new Uint8Array(ch.length * ss); ch.forEach((c, i) => out.set(u8.subarray(sec(c), sec(c) + ss), i * ss)); return size == null ? out : out.subarray(0, size); };
  const dir = readBig(dirStart), ents = [], dd = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
  for (let i = 0; i < dir.length / 128; i++) { const o = i * 128, nl = dd.getUint16(o + 64, true); let name = ''; for (let j = 0; j < Math.max(0, nl / 2 - 1); j++) name += String.fromCharCode(dd.getUint16(o + j * 2, true)); ents.push({ name, type: dir[o + 66], left: dd.getInt32(o + 68, true), right: dd.getInt32(o + 72, true), child: dd.getInt32(o + 76, true), start: dd.getUint32(o + 116, true), size: dd.getUint32(o + 120, true) }); }
  const root = ents[0]; let miniStream = null, miniFat = null;
  const mini = () => { if (!miniStream) { miniStream = readBig(root.start, root.size); const mf = readBig(mfStart), mv = new DataView(mf.buffer, mf.byteOffset, mf.byteLength); miniFat = []; for (let i = 0; i < mf.length / 4; i++) miniFat.push(mv.getUint32(i * 4, true)); } };
  const stream = e => { if (e.size < cutoff) { mini(); const ch = chain(e.start, miniFat), out = new Uint8Array(ch.length * ms); ch.forEach((c, i) => out.set(miniStream.subarray(c * ms, c * ms + ms), i * ms)); return out.subarray(0, e.size); } return readBig(e.start, e.size); };
  const kids = e => { const r = [], st = []; let c = e.child; const walk = n => { if (n < 0 || n >= ents.length) return; walk(ents[n].left); r.push(n); walk(ents[n].right); }; walk(c); return r.map(i => ents[i]); };
  const find = path => { let cur = root; for (const part of path.split('/').filter(Boolean)) { const k = kids(cur).find(x => x.name === part); if (!k) return null; cur = k; } return cur; };
  return { find, stream, kids, root };
}
function hwpPara(b) {
  const EXT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]; let s = '';
  for (let i = 0; i + 1 < b.length;) {
    const c = b[i] | (b[i + 1] << 8);
    if (c < 32) { if (EXT.includes(c)) { if (c === 9) s += '\t'; i += 16; continue; } if (c === 10 || c === 13) s += '\n'; i += 2; continue; }
    s += String.fromCharCode(c); i += 2;
  }
  return s.replace(/\n+$/, '') + '\n';
}
readHwp = async function (buf) {
  const cf = cfbRead(new Uint8Array(buf)), fh = cf.find('/FileHeader');
  if (!fh) throw new Error('한글 파일 형식을 알아보지 못했습니다.');
  const flags = cf.stream(fh)[36];
  if (flags & 2) throw new Error('암호가 걸린 한글 파일입니다. 암호를 풀고 다시 올려 주세요.');
  if (flags & 4) throw new Error('배포용 문서(복사 제한)라 글자를 읽지 못합니다. 한글에서 PDF로 저장해 올려 주세요.');
  const body = cf.find('/BodyText'); if (!body) throw new Error('한글 파일에서 본문을 찾지 못했습니다.');
  const secs = cf.kids(body).filter(x => /^Section\d+$/.test(x.name)).sort((a, b) => parseInt(a.name.slice(7)) - parseInt(b.name.slice(7)));
  let out = '';
  for (const s of secs) { let c = Uint8Array.from(cf.stream(s)); if (flags & 1) c = await inflateRaw(c); out += hwpRecords(c) + '\n\f'; }
  if (!out.trim()) throw new Error('한글 파일에서 글자를 찾지 못했습니다. (그림·스캔 문서일 수 있어요)');
  return out;
};

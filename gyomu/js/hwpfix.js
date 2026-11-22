/* 한글(hwp) 읽기 보강: 브라우저 압축 해제(DecompressionStream)가 실패해도(오류 문구 "Failed to fetch")
   자체 압축 해제기(inflateJS)로 다시 풀고, 그래도 안 되면 SheetJS의 CFB 읽기로 한 번 더 시도한다. */
function inflateJS(src) {
  let pos = 0, bit = 0, out = new Uint8Array(Math.max(1024, src.length * 4)), op = 0;
  const grow = n => { if (op + n > out.length) { const t = new Uint8Array(Math.max(out.length * 2, op + n)); t.set(out.subarray(0, op)); out = t; } };
  const bits = n => { let v = 0; for (let i = 0; i < n; i++) { if (pos >= src.length) throw new Error('eof'); v |= ((src[pos] >> bit) & 1) << i; if (++bit === 8) { bit = 0; pos++; } } return v; };
  const mk = lens => { const count = new Uint16Array(16), offs = new Uint16Array(16), sym = new Uint16Array(lens.length); lens.forEach(l => count[l]++); count[0] = 0; for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1]; lens.forEach((l, i) => { if (l) sym[offs[l]++] = i; }); return { count, sym }; };
  const dec = h => { let code = 0, first = 0, index = 0; for (let len = 1; len < 16; len++) { code |= bits(1); const c = h.count[len]; if (code - c < first) return h.sym[index + (code - first)]; index += c; first += c; first <<= 1; code <<= 1; } throw new Error('bad code'); };
  const LB = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258], LE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DB = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577], DE = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const ORD = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  let FL = null, FD = null;
  try {
    let last;
    do {
      last = bits(1); const t = bits(2);
      if (t === 0) { if (bit) { bit = 0; pos++; } const len = src[pos] | (src[pos + 1] << 8); pos += 4; grow(len); out.set(src.subarray(pos, pos + len), op); op += len; pos += len; continue; }
      let lh, dh;
      if (t === 1) { if (!FL) { const l = []; for (let i = 0; i < 288; i++) l.push(i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8); FL = mk(l); FD = mk(new Array(30).fill(5)); } lh = FL; dh = FD; }
      else if (t === 2) {
        const nl = bits(5) + 257, nd = bits(5) + 1, nc = bits(4) + 4, cl = new Array(19).fill(0); for (let i = 0; i < nc; i++) cl[ORD[i]] = bits(3);
        const ch = mk(cl), lens = []; while (lens.length < nl + nd) { const s = dec(ch); if (s < 16) lens.push(s); else { let r, v = 0; if (s === 16) { v = lens[lens.length - 1]; r = 3 + bits(2); } else if (s === 17) r = 3 + bits(3); else r = 11 + bits(7); while (r--) lens.push(v); } }
        lh = mk(lens.slice(0, nl)); dh = mk(lens.slice(nl, nl + nd));
      } else throw new Error('bad block');
      for (; ;) { const s = dec(lh); if (s < 256) { grow(1); out[op++] = s; } else if (s === 256) break; else { const i = s - 257, len = LB[i] + bits(LE[i]), ds = dec(dh), dist = DB[ds] + bits(DE[ds]); grow(len); for (let k = 0; k < len; k++) { out[op] = out[op - dist]; op++; } } }
    } while (!last);
  } catch (e) { if (op < 16) throw e; } /* 끝이 잘린 파일이어도 읽은 데까지는 살린다 */
  return out.slice(0, op);
}
inflateRaw = async function (data) {
  try { const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); }
  catch (e) { return inflateJS(data); }
};
{ const _own = readHwp;
  readHwp = async function (buf) {
    try { return await _own(buf); }
    catch (e1) {
      if (/암호|배포용|형식이 아닙|그림·스캔/.test(e1.message)) throw e1;
      try { /* 2차: SheetJS 복합문서 읽기(앱 안 lib/) */
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        const cfb = XLSX.CFB.read(new Uint8Array(buf), { type: 'array' }), fh = XLSX.CFB.find(cfb, '/FileHeader'); if (!fh) throw e1;
        const flags = fh.content[36]; let out = '';
        for (let i = 0; i < 60; i++) { const sec = XLSX.CFB.find(cfb, '/BodyText/Section' + i); if (!sec) break; let c = Uint8Array.from(sec.content); if (flags & 1) c = await inflateRaw(c); out += hwpRecords(c) + '\n\f'; }
        if (out.trim()) return out;
      } catch (e2) { }
      throw new Error('한글 파일을 읽지 못했습니다(' + (e1.message === 'Failed to fetch' ? '압축 해제 오류' : e1.message) + '). 한글에서 [다른 이름으로 저장 → HWPX]나 PDF로 저장해 올리면 읽힙니다.');
    }
  };
}

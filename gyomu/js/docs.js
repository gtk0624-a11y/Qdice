/* 자료실: 올린 한글·엑셀 등 원본을 이 기기에 보관하고 바로 열기 / 엑셀은 앱 안에서 표로 보기 / 크게 보기 */
async function keepFile(id, f) { try { await idb.set('file:' + id, f); } catch (e) { } }
const docOf = id => LIB.find(d => d.id === id);
function bigDlg(title, html) {
  const d = document.createElement('dialog'); d.className = 'dlg docdlg';
  d.innerHTML = `<form method="dialog"><h3>${esc(title)}</h3><div class="docbig">${html}</div><div class="btns"><button value="ok" class="pri">닫기</button></div></form>`;
  document.body.appendChild(d); d.addEventListener('close', () => d.remove()); d.showModal(); return d;
}
Object.assign(A, {
  async docOpen(el) {
    const doc = docOf(el.dataset.id); if (!doc) return;
    const f = await idb.get('file:' + doc.id);
    if (!f) return toast('이 자료는 원본이 저장되기 전에 올린 것이라 원본이 없습니다. 다시 올리시면 원본도 저장됩니다. (지금은 [크게 보기]로 내용을 볼 수 있습니다)');
    const url = URL.createObjectURL(f);
    if (/\.pdf$/i.test(doc.name)) { window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000); return; }
    const a = document.createElement('a'); a.href = url; a.download = doc.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('내려받은 파일을 누르면 ' + (/\.hwpx?$/i.test(doc.name) ? '한글' : /\.xlsx?$/i.test(doc.name) ? '엑셀' : '해당 프로그램') + '에서 바로 열립니다. (브라우저 아래·위쪽 다운로드 표시를 누르세요)');
  },
  async docSheet(el) {
    const doc = docOf(el.dataset.id); if (!doc) return;
    const f = await idb.get('file:' + doc.id);
    if (!f) return toast('원본이 없어 표로 볼 수 없습니다. 다시 올리시면 됩니다. [크게 보기]에서 내용은 볼 수 있습니다.');
    try {
      toast('엑셀 여는 중…'); await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const tabs = wb.SheetNames.map((n, i) => `<button type="button" class="btn sm sht" data-sh="${i}">${esc(n)}</button>`).join('');
      const d = bigDlg(doc.name, `<div class="tools">${tabs}</div><div class="shw"></div>`);
      const show = i => { d.querySelector('.shw').innerHTML = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[i]], { editable: false }); d.querySelectorAll('.sht').forEach((b, j) => b.classList.toggle('pri', j === i)); };
      d.addEventListener('click', e => { const b = e.target.closest('[data-sh]'); if (b) show(+b.dataset.sh); }); show(0);
    } catch (er) { toast('엑셀을 열지 못했습니다: ' + er.message); }
  },
  docBig(el) { const doc = docOf(el.dataset.id); if (doc) bigDlg(doc.name, readable(doc.text.slice(0, 200000))); }
});

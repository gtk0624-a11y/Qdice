/**
 * 도디쌤 생기부 도우미 — 담당자 현황판 수신기 (구글 시트에 붙이는 코드)
 * 받는 것: 교사 이름, 학급, 항목, 숫자(전체/작성/완료/초과)뿐입니다.
 * 학생 이름과 생기부 내용은 받지 않습니다.
 * © 김정환 · M.A.D.T (Moral And Digital Teacher)
 */
var KEY = '여기에암호';   // ← 원하는 암호로 바꾸세요. 선생님들 프로그램의 "암호" 칸과 같아야 합니다.

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out('형식 오류'); }
  if (!d || d.key !== KEY) return out('암호 불일치');
  var teacher = clean(d.teacher);
  if (!teacher || !Array.isArray(d.rows)) return out('내용 없음');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('현황') || ss.insertSheet('현황');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (sh.getLastRow() === 0) {
      sh.appendRow(['교사', '학급', '항목', '학생 수', '작성', '완료', '초과', '작성률', '갱신 시각']);
      sh.setFrozenRows(1);
    }
    // 같은 교사가 전에 보낸 줄은 지우고 새로 적습니다.
    var vals = sh.getDataRange().getValues();
    for (var i = vals.length - 1; i >= 1; i--) {
      if (String(vals[i][0]) === teacher) sh.deleteRow(i + 1);
    }
    var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    var rows = d.rows.slice(0, 500).map(function (r) {
      var total = num(r.total), written = num(r.written);
      return [teacher, clean(r.cls), clean(r.item), total, written, num(r.done), num(r.over),
              total ? Math.round(written / total * 100) + '%' : '', now];
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
  } finally {
    lock.releaseLock();
  }
  return out('ok');
}

function doGet() { return out('생기부 현황 수신기가 작동 중입니다.'); }

function out(t) { return ContentService.createTextOutput(t); }
function num(v) { v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : 0; }
// 글자 정리: 길이 제한 + 수식으로 해석되는 첫 글자(= + - @) 막기
function clean(v) {
  v = String(v == null ? '' : v).slice(0, 40);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

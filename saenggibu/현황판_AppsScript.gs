/**
 * 도디쌤 생기부 도우미 — 담당자 시트 코드 (구글 시트에 붙이는 코드)
 *
 * 이 시트에는 탭이 두 개 생깁니다.
 *  ① 현황     : 선생님들이 보낸 입력 현황 숫자(교사·학급·영역·작성 수). 학생 이름·내용은 오지 않습니다.
 *               받는 교사를 자동으로 찾는 데에도 쓰입니다(어느 학급·영역을 누가 쓰는지).
 *  ② 수정요청 : 점검 → 수정 → 확인이 오가는 곳(생기부 메신저).
 *               - 담임·담당자가 프로그램에서 요청을 보내거나, 이 탭에 직접 적습니다.
 *               - 작성 교사 프로그램에 요청이 뜨고, 고친 뒤 "수정 완료"를 누르면 상태가 바뀌고 요청자에게 알림이 갑니다.
 *               - 요청자가 "확인"하면 끝, "재요청"하면 다시 작성 교사에게 갑니다.
 *
 * 이 탭에 직접 적을 때: 차수 · 요청자 · 학년 · 반 · 번호 · 이름 · 영역 · 수정 요청 내용
 * (ID·등록일은 비워 두면 자동, 받는 교사도 비워 두면 '현황' 탭을 보고 자동으로 채웁니다.)
 *
 * © 김정환 · M.A.D.T (Moral And Digital Teacher)
 */
var KEY = '여기에암호';   // ← 원하는 암호로 바꾸세요. 선생님들 프로그램의 "암호" 칸과 같아야 합니다.

var REQ_NAME = '수정요청';
var REQ_HEAD = ['ID', '등록일', '차수', '요청자', '받는 교사', '학년', '반', '번호', '이름', '영역',
                '수정 요청 내용', '상태', '수정 완료 시각', '교사 메모', '고친 내용', '확인 시각'];
// 칸 번호(1부터)
var C = { id: 1, date: 2, round: 3, from: 4, to: 5, g: 6, c: 7, n: 8, name: 9, area: 10,
          text: 11, status: 12, doneAt: 13, memo: 14, fixed: 15, confirmAt: 16 };
var STAT_NAME = '현황';
var STAT_HEAD = ['교사', '학급', '항목', '학생 수', '작성', '완료', '초과', '작성률', '갱신 시각'];

/** 처음 한 번 실행하면 두 탭을 만들어 줍니다(안 해도 첫 사용 때 자동으로 만들어짐). */
function setup() {
  reqSheet_();
  statSheet_();
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'list') {
    if (String(p.key) !== KEY) return json_({ ok: false, msg: '암호가 맞지 않습니다.' });
    var who = who_();
    return json_({ ok: true, now: fmt_(new Date()), who: who,
                   rows: listReqs_(clean_(p.teacher, 40), p.all === '1', who) });
  }
  return ContentService.createTextOutput('생기부 도우미 담당자 시트가 작동 중입니다.');
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_('형식 오류'); }
  if (!d || d.key !== KEY) return out_('암호 불일치');
  var teacher = clean_(d.teacher, 40);
  if (!teacher) return out_('교사 이름 없음');
  if (d.action === 'request') return out_(addReqs_(teacher, d.items));
  if (d.action === 'done' || d.action === 'confirm' || d.action === 'reopen') return out_(updReq_(teacher, d));
  return out_(saveStats_(teacher, d.rows));
}

// 프로그램을 안 쓰는 선생님이 시트에서 '상태'를 직접 바꾸면 시각을 자동으로 찍어 줍니다.
// (구글 시트의 기본 기능이라 따로 설정할 것 없음)
function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== REQ_NAME || e.range.getColumn() !== C.status || e.range.getRow() < 2) return;
  var v = String(e.range.getValue()).trim(), row = e.range.getRow();
  if (v === '수정 완료') {
    sh.getRange(row, C.doneAt, 1, 1).setValues([[new Date()]]);
    var memo = String(sh.getRange(row, C.memo, 1, 1).getValues()[0][0]);
    if (!memo) sh.getRange(row, C.memo, 1, 1).setValues([['(시트에서 직접 처리)']]);
  } else if (v === '확인') {
    sh.getRange(row, C.confirmAt, 1, 1).setValues([[new Date()]]);
  }
}

// ───── 수정 요청 ─────
function listReqs_(teacher, all, who) {
  var sh = reqSheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var out = [];
  try {
    var last = sh.getLastRow();
    if (last < 2) return out;
    var v = sh.getRange(2, 1, last - 1, REQ_HEAD.length).getValues();
    var changed = false;
    for (var i = 0; i < v.length; i++) {
      var r = v[i];
      if (!String(r[C.text - 1]).trim()) continue;                       // 요청 내용이 없는 줄은 건너뜀
      if (!String(r[C.id - 1]).trim()) { r[C.id - 1] = newId_(); changed = true; }
      if (!r[C.date - 1]) { r[C.date - 1] = new Date(); changed = true; }
      if (!String(r[C.to - 1]).trim()) {
        var t0 = findTeacher_(who, r[C.g - 1], r[C.c - 1], r[C.area - 1]);
        if (t0) { r[C.to - 1] = t0; changed = true; }
      }
      var to = String(r[C.to - 1]).trim(), from = String(r[C.from - 1]).trim();
      if (!all && to !== teacher && from !== teacher) continue;
      out.push({
        id: String(r[C.id - 1]), date: fmt_(r[C.date - 1]), round: String(r[C.round - 1]),
        from: from, to: to, g: r[C.g - 1], c: r[C.c - 1], n: r[C.n - 1],
        name: String(r[C.name - 1]), area: String(r[C.area - 1]), text: String(r[C.text - 1]),
        status: String(r[C.status - 1]), doneAt: fmt_(r[C.doneAt - 1]), memo: String(r[C.memo - 1]),
        confirmAt: fmt_(r[C.confirmAt - 1])
      });
    }
    if (changed) {
      sh.getRange(2, 1, v.length, C.to).setValues(v.map(function (r) { return r.slice(0, C.to); }));
    }
  } finally {
    lock.releaseLock();
  }
  return out;
}

function addReqs_(teacher, items) {
  if (!Array.isArray(items) || !items.length) return '내용 없음';
  var sh = reqSheet_();
  var who = who_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last = sh.getLastRow();
    var ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var rows = [];
    items.slice(0, 200).forEach(function (it) {
      var id = clean_(it.id, 20) || newId_();
      if (ids.indexOf(id) >= 0) return;                                  // 같은 요청을 두 번 보낸 경우
      var text = clean_(it.text, 1000);
      if (!text) return;
      var to = clean_(it.to, 40) || findTeacher_(who, it.g, it.c, it.area);
      rows.push([id, new Date(), clean_(it.round, 10), teacher, to, num_(it.g), num_(it.c), num_(it.n),
                 clean_(it.name, 20), clean_(it.area, 40), text, '요청', '', '', '', '']);
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, REQ_HEAD.length).setValues(rows);
    return 'ok ' + rows.length;
  } finally {
    lock.releaseLock();
  }
}

function updReq_(teacher, d) {
  var id = String(d.id || '').trim();
  if (!id) return 'ID 없음';
  var sh = reqSheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last = sh.getLastRow();
    if (last < 2) return '요청 없음';
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) !== id) continue;
      var row = i + 2;
      if (d.action === 'done') {
        var memo = clean_(d.memo, 300);
        sh.getRange(row, C.status, 1, 4).setValues([['수정 완료', new Date(),
          memo ? memo + ' (' + teacher + ')' : '(' + teacher + ')', clean_(d.fixed, 3000)]]);
      } else if (d.action === 'confirm') {
        sh.getRange(row, C.status, 1, 1).setValues([['확인']]);
        sh.getRange(row, C.confirmAt, 1, 1).setValues([[new Date()]]);
      } else if (d.action === 'reopen') {
        var old = String(sh.getRange(row, C.text, 1, 1).getValues()[0][0]);
        var add = clean_(d.text, 1000);
        var stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'MM-dd HH:mm');
        sh.getRange(row, C.text, 1, 3).setValues([[(old + '\n[재요청 ' + stamp + '] ' + add).slice(0, 3000), '재요청', '']]);
      }
      return 'ok';
    }
    return '해당 요청 없음';
  } finally {
    lock.releaseLock();
  }
}

// '현황' 탭에서 어느 학급·영역을 누가 쓰는지 읽기
function who_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STAT_NAME);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues()
    .filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) { return { teacher: String(r[0]), cls: String(r[1]), item: String(r[2]) }; });
}
function normArea_(s) { return String(s == null ? '' : s).replace(/[\s·:()]/g, ''); }
function findTeacher_(who, g, c, area) {
  var cls = num_(g) + '-' + num_(c), a = normArea_(area);
  if (!a) return '';
  var hit = {};
  who.forEach(function (w) {
    if (w.cls !== cls) return;
    var b = normArea_(w.item);
    if (b === a || (b && (b.indexOf(a) >= 0 || a.indexOf(b) >= 0))) hit[w.teacher] = 1;
  });
  var names = Object.keys(hit);
  return names.length === 1 ? names[0] : '';
}

function reqSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(REQ_NAME);
  if (!sh) {
    sh = ss.insertSheet(REQ_NAME);
    sh.appendRow(REQ_HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, REQ_HEAD.length).setFontWeight('bold').setBackground('#fdeec9');
    sh.setColumnWidth(C.text, 360);
    sh.setColumnWidth(C.fixed, 360);
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['요청', '수정 완료', '확인', '재요청'], true).setAllowInvalid(true).build();
    sh.getRange(2, C.status, 999, 1).setDataValidation(rule);
  }
  return sh;
}

// ───── 입력 현황 ─────
function saveStats_(teacher, rows) {
  if (!Array.isArray(rows)) return '내용 없음';
  var sh = statSheet_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // 같은 교사가 전에 보낸 줄은 지우고 새로 적습니다.
    var vals = sh.getDataRange().getValues();
    for (var i = vals.length - 1; i >= 1; i--) {
      if (String(vals[i][0]) === teacher) sh.deleteRow(i + 1);
    }
    var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    var data = rows.slice(0, 500).map(function (r) {
      var total = num_(r.total), written = num_(r.written);
      return [teacher, clean_(r.cls, 40), clean_(r.item, 40), total, written, num_(r.done), num_(r.over),
              total ? Math.round(written / total * 100) + '%' : '', now];
    });
    if (data.length) sh.getRange(sh.getLastRow() + 1, 1, data.length, STAT_HEAD.length).setValues(data);
  } finally {
    lock.releaseLock();
  }
  return 'ok';
}

function statSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(STAT_NAME);
  if (!sh) sh = ss.insertSheet(STAT_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(STAT_HEAD);
    sh.setFrozenRows(1);
  }
  return sh;
}

// ───── 도구 ─────
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function out_(t) { return ContentService.createTextOutput(t); }
function num_(v) { v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : 0; }
function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function fmt_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  }
  return String(v == null ? '' : v);
}
// 글자 정리: 길이 제한 + 수식으로 해석되는 첫 글자(= + - @) 막기
function clean_(v, n) {
  v = String(v == null ? '' : v).slice(0, n || 40);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

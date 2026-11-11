/**
 * 도디쌤 생기부 도우미 — 담당자 점검 시트 코드 (학교의 "생활기록부 점검" 구글 시트에 붙이는 코드)
 *
 * 학교에서 쓰던 점검 시트를 그대로 씁니다. 칸 이름을 찾아서 읽고 씁니다.
 *   점검일자 · 학번 · 이름 · 오류(확인) 분야 · 상세 분야 · 오류(확인) 내용 · 변경 후 ·
 *   담당교사 반영 날짜 · 담임 반영 확인 · 생기부 담당자 확인 · 비고
 * (이 칸들이 있는 탭을 자동으로 찾습니다. 없으면 '점검사항' 탭을 새로 만듭니다.)
 *
 * 흐름: 점검자가 줄을 적음 → 담당교사 프로그램에 뜸 → "반영 완료" = 담당교사 반영 날짜 칸에 날짜
 *       → 담임 프로그램에 알림 → "담임 확인" = 담임 반영 확인 칸에 날짜
 *       → 담당자 프로그램에 알림 → "담당자 확인" = 생기부 담당자 확인 칸에 날짜 (끝)
 *       비고에 '오류아님'이 있으면 끝난 것으로 봅니다.
 *
 * 맨 오른쪽에 숨긴 칸 2개(도우미ID, 요청자)를 더합니다. 지우지 마세요.
 * '현황' 탭: 선생님별 입력 현황(숫자만). '담당교사' 탭: 선생님별 담당 분야·담임 학급.
 *
 * © 김정환 · M.A.D.T (Moral And Digital Teacher)
 */
var KEY = '여기에암호';   // ← 원하는 암호로 바꾸세요. 학교 전용 링크에 함께 들어갑니다.

var STD_HEAD = ['점검일자', '학번', '이름', '오류(확인) 분야', '상세 분야', '오류(확인) 내용', '변경 후',
                '담당교사 반영 날짜', '담임 반영 확인', '생기부 담당자 확인', '비고'];
var STAT_NAME = '현황', STAT_HEAD = ['교사', '학급', '항목', '학생 수', '작성', '완료', '초과', '작성률', '갱신 시각'];
var DUTY_NAME = '담당교사', DUTY_HEAD = ['교사', '분야', '상세 분야', '담임 학급', '갱신 시각'];
var SEEN_NAME = '접속', SEEN_HEAD = ['교사', '마지막 접속', '처음 접속'];

function setup() { reqInfo_(); statSheet_(); dutySheet_(); }

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'list') {
    if (String(p.key) !== KEY) return json_({ ok: false, msg: '암호가 맞지 않습니다.' });
    var info = reqInfo_();
    if (p.teacher) touch_(clean_(p.teacher, 40));
    return json_({ ok: true, now: today_(), sheet: info.sh.getName(), rows: listReqs_(info),
                   meta: meta_(info), who: who_(), duties: duties_(), seen: seen_() });
  }
  return ContentService.createTextOutput('생기부 도우미 담당자 시트가 작동 중입니다.');
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_('형식 오류'); }
  if (!d || d.key !== KEY) return out_('암호 불일치');
  var teacher = clean_(d.teacher, 40);
  if (!teacher) return out_('교사 이름 없음');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (d.action === 'request') return out_(addReqs_(teacher, d.items));
    if (['done', 'hrok', 'adminok', 'reopen'].indexOf(d.action) >= 0) return out_(updReq_(teacher, d));
    if (d.action === 'purge') return out_(purge_(d.mode === 'all'));
    if (Array.isArray(d.duties)) saveDuties_(teacher, d.duties, d.homeroom);
    return out_(saveStats_(teacher, d.rows));
  } finally {
    lock.releaseLock();
  }
}

// ───── 점검 시트 찾기·칸 읽기 ─────
function norm_(s) { return String(s == null ? '' : s).replace(/\s+/g, ''); }
function findCols_(head) {
  var h = head.map(norm_), f = function (fn) { for (var i = 0; i < h.length; i++) if (fn(h[i])) return i; return -1; };
  return {
    date: f(function (x) { return x.indexOf('점검일자') >= 0; }),
    hak: f(function (x) { return x === '학번'; }),
    name: f(function (x) { return x === '이름' || x === '성명'; }),
    field: f(function (x) { return x.indexOf('분야') >= 0 && x.indexOf('상세') < 0; }),
    sub: f(function (x) { return x.indexOf('상세') >= 0; }),
    text: f(function (x) { return x.indexOf('내용') >= 0 && x.indexOf('오류') >= 0; }),
    after: f(function (x) { return x.indexOf('변경후') >= 0; }),
    done: f(function (x) { return x.indexOf('담당교사') >= 0; }),
    hr: f(function (x) { return x.indexOf('담임') >= 0; }),
    admin: f(function (x) { return x.indexOf('담당자') >= 0 && x.indexOf('확인') >= 0; }),
    memo: f(function (x) { return x === '비고'; }),
    id: f(function (x) { return x === '도우미ID'; }),
    from: f(function (x) { return x === '요청자'; }),
    trail: f(function (x) { return x === '반영기록'; })
  };
}
function reqInfo_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s], lc = sh.getLastColumn(), lr = Math.min(sh.getLastRow(), 5);
    if (lc < 5 || lr < 1) continue;
    var top = sh.getRange(1, 1, lr, lc).getValues();
    for (var r = 0; r < top.length; r++) {
      var c = findCols_(top[r]);
      if (c.hak >= 0 && c.text >= 0 && c.done >= 0) return addHelpers_(sh, r + 1, c);
    }
  }
  var nsh = ss.insertSheet('점검사항');
  nsh.appendRow(STD_HEAD);
  nsh.setFrozenRows(1);
  nsh.getRange(1, 1, 1, STD_HEAD.length).setFontWeight('bold').setBackground('#fdeec9');
  return addHelpers_(nsh, 1, findCols_(STD_HEAD));
}
function addHelpers_(sh, headRow, c) {
  if (c.id < 0 || c.from < 0) {
    var col = sh.getLastColumn() + 1;
    sh.getRange(headRow, col, 1, 2).setValues([['도우미ID', '요청자']]);
    try { sh.hideColumns(col, 2); } catch (e) {}
    c.id = col - 1; c.from = col;
  }
  // 누가·언제·무엇으로 반영했는지 쌓이는 칸(보이게 둠) — 분란 방지용 증빙
  if (c.trail < 0) {
    var tc = sh.getLastColumn() + 1;
    sh.getRange(headRow, tc, 1, 1).setValues([['반영 기록']]).setFontWeight('bold').setBackground('#fdeec9');
    try { sh.setColumnWidth(tc, 360); } catch (e) {}
    c.trail = tc - 1;
  }
  return { sh: sh, headRow: headRow, c: c, width: Math.max(sh.getLastColumn(), c.from + 1, c.trail + 1) };
}

function listReqs_(info) {
  var sh = info.sh, c = info.c, first = info.headRow + 1, last = sh.getLastRow(), out = [];
  if (last < first) return out;
  var v = sh.getRange(first, 1, last - first + 1, info.width).getValues(), changed = false;
  for (var i = 0; i < v.length; i++) {
    var r = v[i];
    if (!String(r[c.text]).trim() && !String(r[c.name]).trim()) continue;
    if (!String(r[c.id]).trim()) { r[c.id] = newId_(); changed = true; }
    out.push({
      id: String(r[c.id]), date: fmt_(r[c.date]), hak: String(r[c.hak]).trim(), name: String(r[c.name]).trim(),
      field: String(r[c.field]).trim(), sub: c.sub >= 0 ? String(r[c.sub]).trim() : '',
      text: String(r[c.text]), after: c.after >= 0 ? String(r[c.after]) : '',
      done: fmt_(r[c.done]), hr: c.hr >= 0 ? fmt_(r[c.hr]) : '', admin: c.admin >= 0 ? fmt_(r[c.admin]) : '',
      memo: c.memo >= 0 ? String(r[c.memo]) : '', from: String(r[c.from]).trim(),
      trail: c.trail >= 0 ? String(r[c.trail] || '') : ''
    });
  }
  if (changed) sh.getRange(first, c.id + 1, v.length, 1).setValues(v.map(function (r) { return [r[c.id]]; }));
  return out;
}

// 분야 목록(드롭다운에 있는 값 + 시트에 쓰인 값)
function meta_(info) {
  var sh = info.sh, c = info.c, fields = {}, subs = {};
  try {
    var dv = sh.getRange(info.headRow + 1, c.field + 1).getDataValidation();
    if (dv) { var cv = dv.getCriteriaValues(); if (cv && Array.isArray(cv[0])) cv[0].forEach(function (x) { if (String(x).trim()) fields[String(x).trim()] = 1; }); }
  } catch (e) {}
  var last = sh.getLastRow();
  if (last > info.headRow) {
    sh.getRange(info.headRow + 1, 1, last - info.headRow, info.width).getValues().forEach(function (r) {
      var f = String(r[c.field]).trim(), s = c.sub >= 0 ? String(r[c.sub]).trim() : '';
      if (f) { fields[f] = 1; if (s) { subs[f] = subs[f] || {}; subs[f][s] = 1; } }
    });
  }
  var sm = {}; Object.keys(subs).forEach(function (k) { sm[k] = Object.keys(subs[k]); });
  return { fields: Object.keys(fields), subs: sm };
}

function findRow_(info, id) {
  var first = info.headRow + 1, last = info.sh.getLastRow();
  if (last < first) return -1;
  var ids = info.sh.getRange(first, info.c.id + 1, last - first + 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return first + i;
  return -1;
}
function setCell_(info, row, col, val) { if (col >= 0) info.sh.getRange(row, col + 1, 1, 1).setValues([[val]]); }
function getCell_(info, row, col) { return col >= 0 ? info.sh.getRange(row, col + 1, 1, 1).getValues()[0][0] : ''; }

function addReqs_(teacher, items) {
  if (!Array.isArray(items) || !items.length) return '내용 없음';
  var info = reqInfo_(), c = info.c, rows = [];
  var last = info.sh.getLastRow(), first = info.headRow + 1;
  var ids = last >= first ? info.sh.getRange(first, c.id + 1, last - first + 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  items.slice(0, 300).forEach(function (it) {
    var id = clean_(it.id, 20) || newId_();
    if (ids.indexOf(id) >= 0 || !clean_(it.text, 10)) return;
    var r = []; for (var k = 0; k < info.width; k++) r.push('');
    r[c.date] = today_(); r[c.hak] = clean_(it.hak, 10); r[c.name] = clean_(it.name, 30);
    r[c.field] = clean_(it.field, 40); if (c.sub >= 0) r[c.sub] = clean_(it.sub, 40);
    r[c.text] = clean_(it.text, 1000); if (c.after >= 0) r[c.after] = clean_(it.after, 1000);
    if (c.memo >= 0) r[c.memo] = clean_(it.memo, 300);
    r[c.id] = id; r[c.from] = teacher;
    if (c.trail >= 0) r[c.trail] = '📝 요청 ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'M/d HH:mm') + ' ' + teacher;
    rows.push(r);
  });
  if (rows.length) {
    var start = Math.max(info.sh.getLastRow() + 1, first);
    if (c.hak >= 0) info.sh.getRange(start, c.hak + 1, rows.length, 1).setNumberFormat('@');
    info.sh.getRange(start, 1, rows.length, info.width).setValues(rows);
  }
  return 'ok ' + rows.length;
}

function updReq_(teacher, d) {
  var info = reqInfo_(), c = info.c, row = findRow_(info, String(d.id || ''));
  if (row < 0) return '해당 요청 없음';
  var memo = clean_(d.memo, 300), old = String(getCell_(info, row, c.memo) || '');
  var addMemo = function (t) { if (c.memo >= 0 && t) setCell_(info, row, c.memo, (old ? old + ' / ' : '') + t); };
  var stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'M/d HH:mm');
  var addTrail = function (t) { if (c.trail < 0) return; var o = String(getCell_(info, row, c.trail) || ''); setCell_(info, row, c.trail, clean_((o ? o + '\n' : '') + t, 2000)); };
  if (d.action === 'done') {
    setCell_(info, row, c.done, today_());
    if (memo) addMemo(memo + '(' + teacher + ')');
    var fx = clean_(d.fixed, 300);
    addTrail('✔ 반영 ' + stamp + ' ' + teacher + (d.neis ? ' · 나이스 저장 확인' : '') + (fx ? ' · 고친 문장: "' + fx + '"' : (d.nochange ? ' · (사이트 문장은 그대로, 나이스에서 고침)' : '')) + (memo ? ' · 메모: ' + memo : ''));
  } else if (d.action === 'hrok') {
    setCell_(info, row, c.hr, today_());
    addTrail('👀 담임 확인 ' + stamp + ' ' + teacher + ' · 나이스에서 반영 확인');
  } else if (d.action === 'adminok') {
    setCell_(info, row, c.admin, '✔ ' + today_());
    addTrail('🏁 담당자 확인 ' + stamp + ' ' + teacher);
  } else if (d.action === 'reopen') {
    setCell_(info, row, c.done, ''); setCell_(info, row, c.hr, '');
    addMemo('[재요청 ' + today_() + '] ' + clean_(d.text, 300) + '(' + teacher + ')');
    addTrail('↩ 재요청 ' + stamp + ' ' + teacher + ' · ' + clean_(d.text, 200));
  }
  return 'ok';
}

function purge_(all) {
  var info = reqInfo_(), c = info.c, first = info.headRow + 1, last = info.sh.getLastRow(), n = 0;
  if (last < first) return 'ok 0';
  var v = info.sh.getRange(first, 1, last - first + 1, info.width).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    var closed = String(v[i][c.admin]).trim() || /오류아님/.test(String(v[i][c.memo]));
    if (all || closed) { info.sh.deleteRow(first + i); n++; }
  }
  return 'ok ' + n;
}

// ───── 입력 현황 · 담당교사 ─────
function saveStats_(teacher, rows) {
  if (!Array.isArray(rows)) return 'ok';
  var sh = statSheet_();
  var vals = sh.getDataRange().getValues();
  for (var i = vals.length - 1; i >= 1; i--) if (String(vals[i][0]) === teacher) sh.deleteRow(i + 1);
  var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  var data = rows.slice(0, 500).map(function (r) {
    var total = num_(r.total), written = num_(r.written);
    return [teacher, clean_(r.cls, 40), clean_(r.item, 40), total, written, num_(r.done), num_(r.over),
            total ? Math.round(written / total * 100) + '%' : '', now];
  });
  if (data.length) { var r0 = sh.getLastRow() + 1; sh.getRange(r0, 2, data.length, 1).setNumberFormat('@'); sh.getRange(r0, 1, data.length, STAT_HEAD.length).setValues(data); }
  return 'ok';
}
function saveDuties_(teacher, duties, homeroom) {
  var sh = dutySheet_();
  var vals = sh.getDataRange().getValues();
  for (var i = vals.length - 1; i >= 1; i--) if (String(vals[i][0]) === teacher) sh.deleteRow(i + 1);
  var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  var data = duties.slice(0, 50).map(function (x) { return [teacher, clean_(x.field, 40), clean_(x.sub, 40), clean_(homeroom, 10), now]; });
  if (!data.length && homeroom) data.push([teacher, '', '', clean_(homeroom, 10), now]);
  if (data.length) { var r0 = sh.getLastRow() + 1; sh.getRange(r0, 4, data.length, 1).setNumberFormat('@'); sh.getRange(r0, 1, data.length, DUTY_HEAD.length).setValues(data); }
}
function who_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STAT_NAME);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) { return { teacher: String(r[0]), cls: cls_(r[1]), item: String(r[2]) }; });
}
function duties_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DUTY_NAME);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) { return { teacher: String(r[0]), field: String(r[1]), sub: String(r[2]), homeroom: cls_(r[3]), at: fmtAt_(r[4]) }; });
}
// 사이트에 들어온 선생님 기록(담당자가 누가 연결됐는지 봄). 같은 선생님은 3분에 한 번만 적음.
function touch_(teacher) {
  if (!teacher) return;
  var cache = CacheService.getScriptCache(), ck = 'seen_' + Utilities.base64EncodeWebSafe(teacher);
  if (cache.get(ck)) return;
  cache.put(ck, '1', 180);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var sh = headSheet_(SEEN_NAME, SEEN_HEAD), now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    var v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
    for (var i = 0; i < v.length; i++) if (String(v[i][0]) === teacher) { sh.getRange(i + 2, 2, 1, 1).setNumberFormat('@').setValue(now); return; }
    var r0 = sh.getLastRow() + 1; sh.getRange(r0, 1, 1, 3).setNumberFormat('@').setValues([[teacher, now, now]]);
  } finally { lock.releaseLock(); }
}
function seen_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SEEN_NAME);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues().filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) { return { teacher: r[0], last: r[1], first: r[2] }; });
}
function statSheet_() { return headSheet_(STAT_NAME, STAT_HEAD); }
function dutySheet_() { return headSheet_(DUTY_NAME, DUTY_HEAD); }
function headSheet_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) { sh.appendRow(head); sh.setFrozenRows(1); }
  return sh;
}

// ───── 도구 ─────
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function out_(t) { return ContentService.createTextOutput(t); }
function num_(v) { v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : 0; }
function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'M/ d'); }
// '1-1' 같은 학급이 시트에서 날짜(1월 1일)로 바뀐 경우 되돌림
function cls_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return (v.getMonth() + 1) + '-' + v.getDate();
  return String(v == null ? '' : v).trim();
}
function fmtAt_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  return String(v == null ? '' : v).trim();
}
function fmt_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return Utilities.formatDate(v, 'Asia/Seoul', 'M/ d');
  return String(v == null ? '' : v).trim();
}
// 길이 제한 + 수식으로 해석되는 첫 글자(= + - @) 막기
function clean_(v, n) {
  v = String(v == null ? '' : v).slice(0, n || 40);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

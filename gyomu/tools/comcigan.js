// 컴시간알리미 시간표를 내려받아 comcigan.json 으로 저장합니다. (GitHub Actions 가 매일 새벽 실행)
// 2026년 11월 컴시간 구조 변경에 맞춰 parse-comcigan(1.6+) 으로 바꿨습니다. 학교 이름은 comcigan-config.json 에서 바꿉니다.
const fs = require('fs');
const path = require('path');

(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'comcigan-config.json'), 'utf8'));
  const mod = await import('parse-comcigan'), Comcigan = mod.default;
  const found = await Comcigan.search(cfg.school);
  const school = found.find(s => s.name === cfg.school && (!cfg.region || s.region === cfg.region)) || found[0];
  if (!school) throw new Error('컴시간에서 학교를 찾지 못했습니다: ' + cfg.school);
  const comci = new Comcigan(school.code);
  const info = await comci.schoolInfo();
  const lessons = [];
  let shape = '';
  for (let g = 1; g <= info.classes.length; g++) {
    for (let c = 1; c <= (info.classes[g - 1] || 0); c++) {
      let res;
      try { res = await comci.timetable({ grade: g, classNum: c }); } catch (e) { console.error(`${g}-${c} 실패:`, e.message); continue; }
      const days = res.timetable || [];
      if (!shape) shape = `요일 ${days.length}칸, 첫 요일 items ${(days[0] && days[0].items || []).length}칸`;
      days.forEach((day, di) => (day.items || []).forEach((it, pi) => {
        if (it && (it.subject || it.teacher)) lessons.push({ g, c, d: di + 1, p: pi + 1, t: it.teacher || '', s: it.subject || '' });
      }));
    }
  }
  console.log('구조:', shape);
  if (!lessons.length) throw new Error('수업을 하나도 읽지 못했습니다(컴시간 구조가 또 바뀌었을 수 있습니다).');
  const classTime = (info.times || []).map(x => ({ n: x.number, start: x.start }));
  fs.writeFileSync(process.argv[2] || 'comcigan.json', JSON.stringify({ updated: new Date().toISOString(), school: school.name, classTime, lessons }));
  console.log('저장 완료:', school.name, lessons.length + '개 수업');
})().catch(e => { console.error(e); process.exit(1); });

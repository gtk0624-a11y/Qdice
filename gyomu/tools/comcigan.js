// 컴시간알리미 시간표를 내려받아 comcigan.json 으로 저장합니다. (GitHub Actions 가 매일 아침 실행)
// 학교 이름은 같은 폴더의 comcigan-config.json 에서 바꿉니다.
const fs = require('fs');
const path = require('path');
const Timetable = require('comcigan-parser');

(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'comcigan-config.json'), 'utf8'));
  const t = new Timetable();
  await t.init({ maxGrade: 3 });
  const found = await t.search(cfg.school);
  const school = found.find(s => s.name === cfg.school && (!cfg.region || s.region === cfg.region)) || found[0];
  if (!school) throw new Error('컴시간에서 학교를 찾지 못했습니다: ' + cfg.school);
  await t.setSchool(school.code);
  const all = await t.getTimetable();
  const lessons = [];
  Object.keys(all).forEach(g => Object.keys(all[g] || {}).forEach(c => (all[g][c] || []).forEach((day, di) => (day || []).forEach(l => {
    if (l && (l.subject || l.teacher)) lessons.push({ g: +g, c: +c, d: l.weekday || di + 1, p: l.classTime, t: l.teacher || '', s: l.subject || '' });
  }))));
  let classTime = [];
  try { classTime = await t.getClassTime(); } catch (e) { }
  fs.writeFileSync(process.argv[2] || 'comcigan.json', JSON.stringify({ updated: new Date().toISOString(), school: school.name, classTime, lessons }));
  console.log('저장 완료:', school.name, lessons.length + '개 수업');
})().catch(e => { console.error(e); process.exit(1); });

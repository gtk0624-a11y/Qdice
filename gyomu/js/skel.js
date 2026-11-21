/* 업무 뼈대(v81): 업무 종류별 「단계 + 기준일로부터 며칠 전·후 + 필요 서류」 틀. 기준일(행사일·접수일·시행일)만 넣으면 내 업무 카드와 캘린더 일정이 한 번에 만들어집니다.
   기본 제공은 어느 학교에서나 쓰는 범용 틀뿐이고, 내 전용 틀은 직접 만들거나 「뼈대 가져오기」(.json)로 넣습니다 → 코드에는 개인 업무가 들어 있지 않습니다.
   저장: S.skel = [{id,name,type,memo,docs[],steps:[{t,off}]}] */
const SK_BUILT = [
  { id: 'b-event', name: '학교 행사 운영', type: '행사', docs: ['계획서', '공문', '결과보고서'], memo: '행사일 기준', steps: [{ t: '계획 수립', off: -30 }, { t: '계획서 품의', off: -21 }, { t: '안내 공문·가정통신문', off: -14 }, { t: '준비물·장소 확정', off: -7 }, { t: '리허설·점검', off: -1 }, { t: '행사 실시', off: 0 }, { t: '결과보고', off: 3 }, { t: '정산', off: 7 }] },
  { id: 'b-train', name: '연수·특강 운영', type: '연수', docs: ['계획서', '안내문', '결과보고서'], memo: '실시일 기준', steps: [{ t: '강사 섭외', off: -30 }, { t: '계획서 품의', off: -21 }, { t: '안내 공문', off: -14 }, { t: '준비물·장소', off: -3 }, { t: '연수 실시', off: 0 }, { t: '이수 처리', off: 3 }, { t: '결과보고', off: 7 }] },
  { id: 'b-comm', name: '위원회·협의회 운영', type: '일반', docs: ['공문', '기타'], memo: '회의일 기준', steps: [{ t: '위원 구성·안내', off: -21 }, { t: '안건 정리', off: -7 }, { t: '회의 안내', off: -5 }, { t: '회의 개최', off: 0 }, { t: '회의록 작성', off: 2 }, { t: '결과 안내·반영', off: 7 }] },
  { id: 'b-rule', name: '규정(학칙·내규) 개정', type: '일반', docs: ['계획서', '공문', '기타'], memo: '시행일 기준. 절차와 심의 기관은 학교 규정에 맞게 고치세요.', steps: [{ t: '현행 규정 점검', off: -90 }, { t: '개정안 초안', off: -60 }, { t: '의견 수렴(학생·학부모·교사)', off: -45 }, { t: '의견 반영·수정', off: -30 }, { t: '위원회·운영위 심의', off: -14 }, { t: '공포·안내', off: 0 }, { t: '시행 후 점검', off: 30 }] },
  { id: 'b-case', name: '민원·사안 처리', type: '일반', docs: ['공문', '증빙'], memo: '접수일 기준. 기한은 관련 법령·학교 규정에 따라 직접 고치세요. 개인정보는 이름 대신 번호로만 적으세요.', steps: [{ t: '접수·기록', off: 0 }, { t: '사실 확인', off: 3 }, { t: '보호·조치', off: 5 }, { t: '심의 요청', off: 10 }, { t: '결과 통보', off: 14 }, { t: '종결·기록 정리', off: 21 }] },
  { id: 'b-survey', name: '설문·실태조사', type: '조사', docs: ['공문', '제출자료'], memo: '마감일 기준', steps: [{ t: '문항 설계', off: -21 }, { t: '안내·배포', off: -14 }, { t: '응답 독려', off: -5 }, { t: '마감·수합', off: 0 }, { t: '집계·분석', off: 3 }, { t: '결과 공유·제출', off: 7 }] },
  { id: 'b-budget', name: '예산 사업 운영', type: '예산', docs: ['품의서', '증빙'], memo: '집행일 기준', steps: [{ t: '계획·산출 근거', off: -30 }, { t: '품의', off: -21 }, { t: '구매·계약', off: -10 }, { t: '검수', off: -1 }, { t: '지출', off: 0 }, { t: '정산·서류 정리', off: 7 }] }
];
const skAll = () => [...(S.skel || []).map(x => Object.assign({ mine: 1 }, x)), ...SK_BUILT];
const skDay = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + (n < 0 ? -1 : 1)); return ymd(x); };
const skBar = () => `<div class="tools sk"><button class="btn pri" data-act="skUse">🦴 업무 뼈대로 시작</button><button class="btn" data-act="skNew">+ 내 뼈대 만들기</button>${(S.skel || []).length ? '<button class="btn" data-act="skEdit">✏ 내 뼈대 고치기</button>' : ''}<button class="btn" data-act="skExport">📤 내보내기</button><label class="btn file">📥 가져오기<input type="file" id="skUp" accept=".json" hidden></label></div>`;
{ const _w = workView; workView = function () { return skBar() + _w.apply(this, arguments); }; }
const skFields = (v = {}) => [{ k: 'name', label: '뼈대 이름', val: v.name || '', req: 1 }, { k: 'type', label: '기본 유형 (필요 서류 표시에 쓰입니다)', type: 'select', opts: ['일반', '행사', '연수', '조사', '예산'], val: v.type || '일반' }, { k: 'steps', label: '단계 — 한 줄에 「일수|단계」 (기준일 전은 -14, 후는 7, 당일 0)', type: 'textarea', rows: 8, val: (v.steps || []).map(s => s.off + '|' + s.t).join('\n') }, { k: 'memo', label: '메모 (기준일 설명·주의점)', val: v.memo || '' }];
const skParse = o => ({ name: o.name.trim(), type: o.type, memo: (o.memo || '').trim(), steps: String(o.steps || '').split('\n').map(r => { const i = r.indexOf('|'); if (i < 0) return null; const off = parseInt(r.slice(0, i), 10), t = r.slice(i + 1).trim(); return t && !isNaN(off) ? { t, off } : null; }).filter(Boolean).sort((a, b) => a.off - b.off) });
Object.assign(A, {
  skUse() {
    const all = skAll(); ask('업무 뼈대로 시작', [{ k: 'sk', label: '뼈대 고르기', type: 'select', opts: all.map(s => (s.mine ? '★ ' : '') + s.name), val: all[0].name }, { k: 'title', label: '업무 이름 (예: 2학기 체육대회)', req: 1 }, { k: 'day', label: '기준일 (행사일·접수일·시행일 등)', type: 'date', val: today(), req: 1 }, { k: 'cal', label: '단계별 일정을 캘린더에도 넣을까요?', type: 'select', opts: ['예', '아니오'], val: '예' }], o => {
      const sk = all.find(s => (s.mine ? '★ ' : '') + s.name === o.sk); if (!sk) return; const D = o.day, steps = sk.steps.map(s => ({ t: s.t, d: false, date: skDay(D, s.off) }));
      const c = wkN({ id: uid(), title: o.title.trim(), dept: '', who: '', me: true, memo: [sk.memo, sk.docs && sk.docs.length ? '필요 서류: ' + sk.docs.join(', ') : ''].filter(Boolean).join('\n'), due: steps.length ? steps[steps.length - 1].date : D, done: false, steps: steps.map(s => ({ t: `${s.t} · ${md(s.date)}`, d: false })), src: '뼈대' });
      wkApplyType(c, sk.type || '일반'); c.steps = steps.map(s => ({ t: `${s.t} · ${md(s.date)}`, d: false })); wkD().cards.push(c);
      if (o.cal === '예') steps.forEach(s => S.items.push({ id: uid(), title: `[${o.title.trim()}] ${s.t}`, date: s.date, cat: 'event', tag: '업무', done: false }));
      commit(); toast(`업무 카드와 단계 ${steps.length}개를 만들었습니다${o.cal === '예' ? '(캘린더 포함, 주말은 평일로 옮김)' : ''}.`);
    }, '만들기');
  },
  skNew() { ask('내 뼈대 만들기', skFields(), o => { const v = skParse(o); if (!v.steps.length) { toast('단계를 「일수|단계」 형식으로 한 줄 이상 적어 주세요.'); return; } (S.skel = S.skel || []).push(Object.assign({ id: uid(), docs: [] }, v)); commit(); toast('내 뼈대를 저장했습니다.'); }, '저장'); },
  skEdit() {
    const L = S.skel || []; if (!L.length) return; ask('내 뼈대 고르기', [{ k: 'n', label: '고칠 뼈대', type: 'select', opts: L.map(s => s.name) }], o => {
      const s = L.find(x => x.name === o.n); if (!s) return; ask('뼈대 고치기 (이름을 모두 지우면 삭제)', skFields(s).map(f => f.k === 'name' ? Object.assign(f, { req: 0 }) : f), p => { if (!p.name.trim()) { S.skel = L.filter(x => x !== s); commit(); toast('뼈대를 지웠습니다.'); return; } Object.assign(s, skParse(p)); commit(); });
    }, '고치기');
  },
  skExport() { download('업무뼈대_' + today() + '.json', JSON.stringify({ tf: 'skel', skel: skAll().filter(s => s.mine).map(({ mine, ...r }) => r) }, null, 1), 'application/json'); toast((S.skel || []).length ? '내 뼈대를 파일로 내려받았습니다. 다른 기기·동료에게 「가져오기」로 줄 수 있습니다.' : '아직 내 뼈대가 없어 빈 파일입니다.'); }
});
document.addEventListener('change', async e => {
  const t = e.target; if (!t || t.id !== 'skUp' || !t.files[0]) return;
  try { const j = JSON.parse(await t.files[0].text()), L = (j.skel || []).filter(s => s && s.name && Array.isArray(s.steps) && s.steps.every(x => x && x.t && !isNaN(+x.off))); if (!L.length) throw new Error('뼈대 형식이 아닙니다'); S.skel = S.skel || []; L.forEach(s => { if (!S.skel.some(x => x.name === s.name)) S.skel.push({ id: uid(), name: String(s.name), type: ['행사', '연수', '조사', '예산'].includes(s.type) ? s.type : '일반', memo: String(s.memo || ''), docs: (s.docs || []).map(String), steps: s.steps.map(x => ({ t: String(x.t), off: +x.off })) }); }); commit(); toast(`뼈대 ${L.length}개를 가져왔습니다(같은 이름은 건너뜀).`); } catch (err) { toast('가져오기 실패: ' + err.message); }
  t.value = '';
});

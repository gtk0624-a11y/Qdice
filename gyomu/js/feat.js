/* 기능 켜고 끄기 + 설정 꾸러미(v83): 이 앱은 기능이 많아서, 쓰는 것만 켜 두는 방식으로 만들었습니다.
   S.feat = {기능키: false} 이면 꺼짐(기본은 켜짐). 설정 꾸러미(.json)는 내 설정(뼈대·연간 업무·서류 목록·견적 기준·메뉴 순서/숨김·켜고 끈 기능)만 담고 개인 자료(학생·예산 금액·사안)는 담지 않습니다.
   다른 사람은 이 틀에서 자기 것으로 바꾸고, 필요하면 꾸러미를 서로 주고받습니다. */
const FEATS = [
  ['bdchk', '예산 점검 (기한 경고·월별 집행·에듀파인 대조·결재 상태)'], ['bddoc', '예산 집행 서류·업체·속도·불용 경보'], ['bdreq', '예산 요구서·계획서'],
  ['skel', '업무 뼈대 단추 (내 업무 화면)'], ['mttoday', '오늘 화면의 「꼭 할 일·주의」 카드'], ['yps', '연간 교육·훈련 신호등'],
  ['hub_cycle', '총괄 › 연간 사이클'], ['hub_check', '총괄 › 월 점검'], ['hub_agenda', '총괄 › 안건'], ['hub_case', '총괄 › 사안 대장'], ['hub_req', '총괄 › 요청'], ['hub_retro', '총괄 › 돌아보기']
];
const featOn = k => (S.feat || {})[k] !== false;
function featApply() { document.body.classList.toggle('nf-mttoday', !featOn('mttoday')); document.body.classList.toggle('nf-yps', !featOn('yps')); }
[['bdPanel', 'bdchk'], ['bdPanel2', 'bddoc'], ['bdPanel3', 'bdreq']].forEach(([fn, k]) => { const o = window[fn] || eval(fn); if (typeof o === 'function') { const w = function () { return featOn(k) ? o.apply(this, arguments) : ''; }; if (fn === 'bdPanel') bdPanel = w; else if (fn === 'bdPanel2') bdPanel2 = w; else bdPanel3 = w; } });
{ const _w = workView; workView = function () { const h = _w.apply(this, arguments); return featOn('skel') ? h : h.replace(/<div class="tools sk">[\s\S]*?<\/div>/, ''); }; }
{ const _s = setView; setView = function () {
  const h = _s.apply(this, arguments), mark = '<h3 class="h3">오늘 게시판에 보일 줄</h3>'; if (h.indexOf(mark) < 0) return h;
  return h.replace(mark, `<h3 class="h3">🧩 기능 켜고 끄기</h3><p class="mu">안 쓰는 기능은 꺼 두면 화면이 단순해집니다. 메뉴 전체를 숨기거나 순서를 바꾸는 것은 위쪽 「☰ 메뉴 고르기」·「↕ 화면 순서」에서 합니다.</p><div class="hides">${FEATS.map(([k, v]) => `<label class="chk"><input type="checkbox" data-feat="${k}" ${featOn(k) ? 'checked' : ''}> ${v}</label>`).join('')}</div><div class="tools"><button class="btn sm" data-act="featAll">전부 켜기</button><button class="btn sm" data-act="featCore">핵심만 켜기</button><button class="btn sm" data-act="kitExport">📤 설정 꾸러미 내보내기</button><label class="btn sm file">📥 설정 꾸러미 가져오기<input type="file" id="kitUp" accept=".json" hidden></label></div>${mark}`);
}; }
document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && t.dataset.feat) { S.feat = S.feat || {}; S.feat[t.dataset.feat] = t.checked; save(true); featApply(); render(); } });
const kitData = () => {
  const cy = {}; Object.keys(S.cycle || {}).forEach(m => { cy[m] = (S.cycle[m] || []).map(x => ({ t: x.t })); });
  return { tf: 'kit', v: 1, skel: (S.skel || []).map(({ id, ...r }) => r), cycle: cy, bdTypes: S.bdTypes || null, bdCfg: S.bdCfg || null, feat: S.feat || {}, navHide: S.navHide || [], hide: S.hide || {}, order: S.order || null, tpl: (typeof wkTpl === 'function' ? wkTpl() : []).map(({ id, ...r }) => r) };
};
Object.assign(A, {
  featAll() { S.feat = {}; save(true); featApply(); render(); toast('모든 기능을 켰습니다.'); },
  featCore() { S.feat = {}; FEATS.forEach(([k]) => { if (!['bdchk', 'mttoday'].includes(k)) S.feat[k] = false; }); save(true); featApply(); render(); toast('핵심 기능만 남겼습니다. 필요한 것은 하나씩 켜세요.'); },
  kitExport() { const d = kitData(); download('업무파탈_설정꾸러미_' + today() + '.json', JSON.stringify(d, null, 1), 'application/json'); toast(`내려받았습니다 (뼈대 ${d.skel.length}개 · 연간 업무 ${Object.values(d.cycle).reduce((a, b) => a + b.length, 0)}개 · 반복 업무 틀 ${d.tpl.length}개). 학생·금액·사안 같은 개인 자료는 들어 있지 않습니다.`); }
});
document.addEventListener('change', async e => {
  const t = e.target; if (!t || t.id !== 'kitUp' || !t.files[0]) return; let j;
  try { j = JSON.parse(await t.files[0].text()); if (j.tf !== 'kit') throw new Error('설정 꾸러미 파일이 아닙니다'); } catch (err) { toast('가져오기 실패: ' + err.message); t.value = ''; return; } t.value = '';
  const nS = (j.skel || []).length, nC = Object.values(j.cycle || {}).reduce((a, b) => a + b.length, 0), nT = (j.tpl || []).length;
  sure(`뼈대 ${nS}개 · 연간 업무 ${nC}개 · 반복 업무 틀 ${nT}개를 합치고, 켜고 끈 기능·메뉴 설정·서류 목록·견적 기준을 이 꾸러미 것으로 바꿉니다. 계속할까요? (되돌리기 가능)`, () => {
    (j.skel || []).forEach(s => { if (s && s.name && Array.isArray(s.steps) && !(S.skel = S.skel || []).some(x => x.name === s.name)) S.skel.push({ id: uid(), name: String(s.name), type: s.type || '일반', memo: String(s.memo || ''), docs: s.docs || [], steps: s.steps.map(x => ({ t: String(x.t), off: +x.off || 0 })) }); });
    S.cycle = S.cycle || {}; Object.keys(j.cycle || {}).forEach(m => (j.cycle[m] || []).forEach(x => { const L = (S.cycle[m] = S.cycle[m] || []); if (x && x.t && !L.some(v => v.t === x.t)) L.push({ id: uid(), t: String(x.t), done: {} }); }));
    if (j.bdTypes) S.bdTypes = j.bdTypes; if (j.bdCfg) S.bdCfg = j.bdCfg; if (j.feat) S.feat = j.feat; if (Array.isArray(j.navHide)) S.navHide = j.navHide; if (j.hide) S.hide = j.hide; if (j.order) S.order = j.order;
    if (typeof wkTpl === 'function') { const L = wkTpl(); (j.tpl || []).forEach(x => { if (x && x.title && !L.some(v => v.title === x.title)) L.push(Object.assign({ id: uid() }, x)); }); }
    featApply(); commit(); toast('설정 꾸러미를 적용했습니다.');
  });
});
featApply(); { const _r = TF.render; TF.render = function () { featApply(); return _r.apply(this, arguments); }; }

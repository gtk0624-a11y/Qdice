/* 컴퓨터를 켜면 업무파탈이 자동으로 열리게 하는 시작 파일(윈도우용) 만들기 — 선택 기능.
   웹 페이지는 부팅 때 스스로 켜질 수 없어서, 시작프로그램 폴더에 넣는 작은 파일(.bat)을 만들어 드립니다. */
function bootCard() {
  const p = S.profile, br = p.bootBr || 'msedge', wk = p.bootWk !== false, dl = p.bootDl == null ? 10 : +p.bootDl;
  return `<div class="dset"><b>💻 컴퓨터 켜면 자동으로 열기</b> <span class="mu">(선택 · 윈도우 컴퓨터용)</span>
  <div class="row2c"><label>열 브라우저 <select data-dset="bootBr" aria-label="브라우저"><option value="msedge" ${br === 'msedge' ? 'selected' : ''}>엣지(Edge)</option><option value="chrome" ${br === 'chrome' ? 'selected' : ''}>크롬(Chrome)</option></select></label>
  <label>켜진 뒤 <select data-dset="bootDl" aria-label="기다릴 시간">${[0, 10, 30, 60].map(n => `<option value="${n}" ${dl === n ? 'selected' : ''}>${n ? n + '초' : '바로'}</option>`).join('')}</select> 뒤에 열기</label>
  <label class="chk"><input type="checkbox" data-dset="bootWk" ${wk ? 'checked' : ''}> 평일(월~금)에만 열기</label></div>
  <div class="tools"><button class="btn sm" data-act="bootDl">⬇ 시작 파일 만들어 받기</button></div>
  <ol class="mu" style="margin:6px 0 0;padding-left:20px"><li>위 버튼으로 파일(<b>travail-fatal-start.bat</b>)을 받습니다.</li><li>키보드에서 <b>윈도우 키 + R</b> → <b>shell:startup</b> 입력 → Enter. 열린 폴더가 "시작프로그램" 폴더입니다.</li><li>받은 파일을 그 폴더에 <b>옮겨 넣으면 끝</b>. 다음 부팅부터 자동으로 열립니다.</li><li>끄고 싶으면 그 폴더에서 파일을 지우세요.</li></ol>
  <p class="mu">이 파일은 업무파탈 주소를 여는 명령 몇 줄이 전부입니다(메모장으로 열어 볼 수 있어요). 처음 열릴 때 윈도우가 경고를 띄우면 "추가 정보 → 실행"을 누르세요. 맥·폰은 지원하지 않습니다. 설치(앱으로 추가)해 두었다면 브라우저의 "로그인 시 자동 실행" 설정을 써도 됩니다.</p></div>`;
}
function bootMake() {
  const p = S.profile, br = p.bootBr === 'chrome' ? 'chrome' : 'msedge', wk = p.bootWk !== false, dl = p.bootDl == null ? 10 : +p.bootDl;
  const url = location.origin + location.pathname.replace(/\/[^\/]*\.html$/, '/').replace(/\/?$/, '/');
  const L = ['@echo off', 'chcp 65001 >nul', 'rem 업무파탈 자동 열기 (이 파일을 지우면 자동 실행이 꺼집니다)'];
  if (wk) L.push('for /f %%d in (\'powershell -nologo -noprofile -command "[int](Get-Date).DayOfWeek"\') do set DOWN=%%d', 'if "%DOWN%"=="0" exit /b', 'if "%DOWN%"=="6" exit /b');
  if (dl) L.push('timeout /t ' + dl + ' /nobreak >nul');
  L.push(`start "" ${br} --app=${url}`, 'exit /b');
  return L.join('\r\n') + '\r\n';
}
Object.assign(A, {
  bootDl() {
    if (window.TF_DEMO) return toast('체험판에서는 만들 수 없어요. 내 수첩(실제 주소)에서 받아 주세요.');
    const b = new Blob([bootMake()], { type: 'application/octet-stream' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'travail-fatal-start.bat'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('시작 파일을 받았습니다. 아래 순서대로 시작프로그램 폴더에 넣어 주세요.');
  }
});

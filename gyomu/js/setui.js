/* setui.js — 설정의 "작업표시줄에 고정 · 위젯" 안내 칸(app.js `.guide`) 위에 [앱으로 설치하기]·[위젯 열기] 버튼을 붙입니다.
   (설정 칸 접기는 extra.js `setFold()`가 맡습니다.) */
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
let _ip = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _ip = e; });
window.addEventListener('appinstalled', () => { _ip = null; toast('설치했습니다. 작업표시줄 아이콘을 오른쪽 클릭해 "작업 표시줄에 고정"을 누르세요.'); });
Object.assign(A, {
  pwaInstall() {
    if (isStandalone()) return toast('이미 앱으로 열려 있습니다.');
    if (!_ip) return toast('설치 창을 바로 띄울 수 없습니다. 크롬 ⋮ → 저장 및 공유 → 페이지를 앱으로 설치를 눌러 주세요.');
    _ip.prompt(); _ip.userChoice.finally(() => { _ip = null; });
  },
  widgetOpen() {
    const w = window.open('widget.html', 'tfwidget', `popup=yes,width=380,height=580,left=${Math.max(0, (screen.availWidth || 1200) - 410)},top=60`);
    if (!w) toast('팝업이 막혔습니다. 주소창 오른쪽의 팝업 차단을 풀어 주세요.');
  }
});
function installTools() {
  const g = document.querySelector('main .guide'); if (!g || g.querySelector('.itools')) return;
  const st = isStandalone(), d = document.createElement('div'); d.className = 'itools';
  d.innerHTML = `<div class="tools"><button class="btn pri" data-act="pwaInstall" ${st ? 'disabled' : ''}>${st ? '✅ 앱으로 열려 있습니다' : '앱으로 설치하기'}</button><button class="btn" data-act="widgetOpen">🧩 위젯 열기</button></div><p class="mu">🧩 위젯은 디데이·기한 임박·오늘 할 일만 작게 보여 주는 창입니다(보기 전용). 설치 후 작업표시줄 아이콘을 오른쪽 클릭하면 "위젯 열기"도 나옵니다. 항상 맨 위에 두려면 Windows PowerToys의 "Always On Top"(Win+Ctrl+T)을 쓰세요.</p>`;
  g.prepend(d);
}
new MutationObserver(installTools).observe(document.getElementById('app'), { childList: true, subtree: true });
/* 맨 마지막에 불러오는 파일이라, 여기서 한 번 더 그려 새 부품(디데이 칩·줄)이 처음 화면부터 빠짐없이 나오게 함 */
if (S.setup && TF.render) TF.render();

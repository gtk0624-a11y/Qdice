/* 도디쌤의 규정줍줍 - 서비스 워커
   하는 일: 인터넷이 될 때는 항상 새 파일을 받아 오고(그래서 깃허브에 올린 수정이 바로 반영됨),
            인터넷이 안 될 때만 지난번에 받아 둔 파일로 화면을 띄웁니다.
   넣은 PDF 내용은 여기서 다루지 않습니다(브라우저 안 저장소에만 있음). */
const CACHE='gyujeong-v8';
const SHELL=['./','index.html','manifest.webmanifest','dodi.jpg','ggumsong.png','icon-192.png','icon-512.png','lib/pdf.min.js','lib/pdf.worker.min.js'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET' || new URL(req.url).origin!==location.origin) return;
  e.respondWith(
    fetch(req).then(res=>{ if(res && res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}); } return res; })
      .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('index.html')))
  );
});

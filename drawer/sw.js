/* 도디쌤 서랍 - 서비스워커
   네트워크를 먼저 시도하고(항상 최신 목록), 인터넷이 안 될 때만 저장된 복사본을 보여줍니다. */
const CACHE = "dosam-drawer-v1";
const SHELL = ["./", "./index.html", "./apps.json", "./manifest.json", "./icon-32.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;           // 다른 사이트 요청은 건드리지 않음
  e.respondWith(
    fetch(req).then(res => {
      if(res && res.ok){
        const copy = res.clone();
        const key = url.pathname.endsWith("apps.json") ? "./apps.json" : req;   // 주소 뒤 ?t= 값 무시
        caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
      }
      return res;
    }).catch(() => {
      const key = url.pathname.endsWith("apps.json") ? "./apps.json" : req;
      return caches.match(key).then(r => r || caches.match("./index.html"));
    })
  );
});

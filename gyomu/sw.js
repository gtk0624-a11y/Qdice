/* 앱 껍데기를 저장해 두어 인터넷이 약해도 열리게 합니다. 파일을 고치면 VERSION 숫자를 올리세요. */
const VERSION = 'tf-v10';
const FILES = ['./', 'index.html', 'style.css', 'firebase-config.js', 'js/core.js', 'js/search.js', 'js/sync.js', 'js/app.js', 'js/pages.js', 'js/stickers.js', 'js/cloud.js', 'js/files.js', 'js/mine.js', 'js/extra.js', 'js/drawer.js', 'js/inbox.js', 'js/memo.js', 'js/school.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});

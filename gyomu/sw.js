/* 앱 껍데기를 저장해 두어 인터넷이 약해도 열리게 합니다. 파일을 고치면 VERSION 숫자를 올리세요. */
const VERSION = 'tf-v190';
const FILES = ['./', 'index.html', 'style.css', 'firebase-config.js', 'js/core.js', 'js/search.js', 'js/sync.js', 'js/app.js', 'js/pages.js', 'js/stickers.js', 'js/cloud.js', 'js/files.js', 'js/files2.js', 'js/hwpfix.js', 'js/mine.js', 'js/extra.js', 'js/drawer.js', 'js/inbox.js', 'js/cal2.js', 'js/agent.js', 'js/docs.js', 'js/order.js', 'js/memo.js', 'js/school.js', 'js/dday.js', 'js/arch.js', 'js/class2.js', 'js/notes2.js', 'js/quotes.js', 'js/deco.js', 'js/bell2.js', 'js/postit.js', 'js/teach.js', 'js/daypg.js', 'js/scan.js', 'js/cust.js', 'js/tt2.js', 'js/boot.js', 'js/pen.js', 'js/helper.js', 'js/portal.js', 'js/classmgmt.js', 'js/yearplan.js', 'js/work.js', 'js/work2.js', 'js/more.js', 'js/work3.js', 'js/budget2.js', 'js/budget3.js', 'js/skel.js', 'js/hub.js', 'js/feat.js', 'js/rescue.js', 'js/pwsync.js', 'js/bot2.js', 'js/bot3.js', 'js/tools.js', 'js/layout.js', 'js/bot4.js', 'js/setui.js', 'js/fold.js', 'js/rulefix.js', 'js/widget.js', 'widget.html', 'gyujeong/index.html', 'gyujeong/dodi.jpg', 'gyujeong/ggumsong.png', 'gyujeong/icon-192.png', 'gyujeong/lib/pdf.min.js', 'gyujeong/lib/pdf.worker.min.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});

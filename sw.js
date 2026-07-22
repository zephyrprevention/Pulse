// Change SW_VERSION a chaque mise a jour importante (v1 -> v2 -> v3...)
const SW_VERSION = 'pulse-v57';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // active la nouvelle version immediatement, sans attendre
  self.skipWaiting();
  e.waitUntil(caches.open(SW_VERSION).then(c => c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // le classement (Firebase) passe toujours par le reseau
  if (url.indexOf('firebasedatabase.app') !== -1) return;

  // Pour le HTML et le JS : "network first" -> on prend toujours la derniere version en ligne,
  // et on ne retombe sur le cache que si le reseau echoue (mode hors-ligne).
  if (e.request.mode === 'navigate' || url.indexOf('.html') !== -1) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(SW_VERSION).then(c => c.put(e.request, copy)).catch(()=>{});
          return resp;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Pour les icones / manifest : "cache first" (ca ne change presque jamais)
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(SW_VERSION).then(c => c.put(e.request, copy)).catch(()=>{});
      return resp;
    }))
  );
});

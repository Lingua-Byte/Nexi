/* RAIZ — funciona sem internet e se atualiza sozinho.
   __BUILD__ é trocado pelo código do commit a cada publicação (ver .github/workflows/deploy.yml),
   então todo deploy gera um service worker novo e o app instalado se atualiza. */
const BUILD = '__BUILD__';
const CACHE = 'raiz-' + BUILD;
const CORE = ['./', 'index.html', 'style.css', 'data.js', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('raiz-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'build') e.source && e.source.postMessage({ build: BUILD }); });

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const same = url.origin === location.origin;
  if (!same && !isFont) return;
  // Rede primeiro, sem cache HTTP (sempre a versão mais nova); cache só quando estiver offline.
  const net = same ? fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request);
  e.respondWith(
    net.then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});

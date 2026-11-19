// NEXI SFX Studio: cache para funcionar offline depois da primeira visita
const CACHE = 'nexi-sfx-v1';
const CORE = ['./sfx.html', './sfx.webmanifest', './sfx-icon-192.png', './sfx-icon-512.png', './sfx-icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // APIs (Anthropic, ElevenLabs) sempre pela rede
  if (/api\.(anthropic|elevenlabs)\./.test(url.hostname)) return;
  // página e arquivos do app: rede primeiro (pega atualizações), cache se offline
  if (url.origin === location.origin){
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('./sfx.html'))));
    return;
  }
  // bibliotecas de CDN (SDK da Claude): cache primeiro
  if (url.hostname === 'cdn.jsdelivr.net') e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
});

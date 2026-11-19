/* MindSprint — service worker : fonctionne hors connexion */
const CACHE = 'mindsprint-v5';
const CORE = ['./', 'index.html', 'styles.css', 'games.js', 'app.js', 'design.css', 'theme.css', 'scenes.js', 'tutos.js', 'fonts/outfit.woff2', 'fonts/nunito.woff2', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Polices auto-hébergées : cache d'abord (elles ne changent pas)
  if (url.origin === location.origin && url.pathname.endsWith('.woff2')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { const cp = n.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return n; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // Fichiers de l'app : réseau d'abord (mises à jour), cache si hors ligne
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
  }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});

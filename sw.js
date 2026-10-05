// sw.js — aplicația instalată pe telefon pornește și fără semnal.
// Pagina se ia întâi de pe internet (ca versiunile noi să ajungă imediat); fără semnal, din memoria telefonului.
// Cererile către server (Supabase) nu trec pe aici: lucrările le ține aplicația, separat.
const CACHE = 'ino-precalcul-v1';
const FISIERE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FISIERE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r).then((raspuns) => {
      if (raspuns && raspuns.ok) { const copie = raspuns.clone(); caches.open(CACHE).then((c) => c.put(r, copie)); }
      return raspuns;
    }).catch(() => caches.match(r).then((x) => x || (r.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

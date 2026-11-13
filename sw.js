// sw.js — aplicația instalată pe telefon pornește și fără semnal.
// Din v2.8.7 pagina se deschide imediat din memoria telefonului/calculatorului și se verifică în spate la internet.
// O versiune nouă se instalează în spate; aplicația arată atunci „Versiune nouă – Reîncarcă”.
// Cererile către server (Supabase) nu trec pe aici: lucrările le ține aplicația, separat.
const CACHE = 'ino-install-v2.9.4';
const FISIERE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FISIERE.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  const dinRetea = fetch(r, { cache: 'no-cache' }).then((raspuns) => {
    if (raspuns && raspuns.ok) { const copie = raspuns.clone(); caches.open(CACHE).then((c) => c.put(r, copie)); }
    return raspuns;
  });
  e.respondWith(
    // întâi din memorie (pornire imediată); fișierul se reîmprospătează în spate pentru deschiderea următoare
    // doar din memoria versiunii curente (o memorie veche, încă neștearsă, ar da pagina veche)
    caches.open(CACHE).then((c) => c.match(r, { ignoreSearch: r.mode === 'navigate' }).then((x) => {
      if (x) { e.waitUntil(dinRetea.catch(() => {})); return x; }
      return dinRetea.catch(() => c.match(r).then((y) => y || (r.mode === 'navigate' ? c.match('./index.html') : undefined)));
    }))
  );
});

// sw.js — aplicația instalată pe telefon pornește și fără semnal.
// Din v2.8.7 pagina se deschide imediat din memoria telefonului/calculatorului și se verifică în spate la internet.
// O versiune nouă se instalează în spate; aplicația arată atunci „Versiune nouă – Reîncarcă”.
// Cererile către server (Supabase) nu trec pe aici: lucrările le ține aplicația, separat.
const CACHE = 'ino-install-v2.9.6';
const FISIERE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
// v2.9.5: PDF.js (citirea contractelor) vine de pe cdnjs; se păstrează după prima aducere, într-o memorie separată
// care nu se șterge la versiunile noi ale aplicației, ca citirea să meargă și fără semnal.
const EXTERN = 'ino-extern-v1';
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FISIERE.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE && x !== EXTERN).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (r.url.startsWith(PDFJS)) {
    // PDF.js: din memorie dacă e; altfel de pe internet, apoi se păstrează (și răspunsul „opac” al unui script fără CORS)
    e.respondWith(caches.open(EXTERN).then((c) => c.match(r.url).then((x) => x || fetch(r).then((raspuns) => {
      if (raspuns && (raspuns.ok || raspuns.type === 'opaque')) c.put(r.url, raspuns.clone());
      return raspuns;
    }))));
    return;
  }
  if (new URL(r.url).origin !== self.location.origin) return;
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

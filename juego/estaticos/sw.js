// Service Worker del celular (sección 5.5): con 40 celulares en el mismo Wi-Fi, lo que más pesa es la
// descarga inicial. Los archivos con hash (/assets/) se guardan la primera vez y no se vuelven a
// pedir aunque el celular recargue; las páginas se piden a la red (para tomar un deploy nuevo) y,
// si no hay red, salen de la caché. El tiempo real (/socket.io/) y la API nunca pasan por acá.

const CACHE = 'drop-rush-v1';
const PAGINAS = ['/play/'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PAGINAS))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/socket.io/') || url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/assets/')) {
    // Con hash en el nombre: si está guardado, es exactamente el mismo archivo.
    e.respondWith(
      caches.match(request).then(
        (guardada) =>
          guardada ??
          fetch(request).then((r) => {
            if (r.ok) {
              const copia = r.clone();
              caches.open(CACHE).then((c) => c.put(request, copia));
            }
            return r;
          }),
      ),
    );
    return;
  }

  if (request.mode === 'navigate') {
    // La página: primero la red; sin red, la última guardada (sin el ?sala=, que es la misma página).
    e.respondWith(
      fetch(request)
        .then((r) => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copia));
          }
          return r;
        })
        .catch(() => caches.match(url.pathname).then((g) => g ?? caches.match('/play/'))),
    );
  }
});

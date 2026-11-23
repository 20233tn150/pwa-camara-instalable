
const CACHE_NAME = 'pwa-camara-cache-v3'; 

const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// INSTALACIÓN: guardamos en caché todos los archivos de la app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN: eliminamos cachés de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre !== CACHE_NAME)
            .map((nombre) => caches.delete(nombre))
        )
      )
      .then(() => self.clients.claim())
  );
});

// FETCH: Cache First -> primero responde la caché, si no existe va a la red
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((respuestaCache) => {
        if (respuestaCache) {
          return respuestaCache; // CACHE FIRST: sirve desde caché
        }
        return fetch(event.request) // fallback a red
          .then((respuestaRed) => {
            // Guardamos copia para futuras visitas (runtime cache)
            if (respuestaRed && respuestaRed.status === 200) {
              const copia = respuestaRed.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
            }
            return respuestaRed;
          })
          .catch(() => caches.match('./index.html')); // offline -> index en caché
      })
  );
});

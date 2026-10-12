// Service Worker para Arquitectura App Shell
const CACHE_NAME = 'nexus-app-shell-v2';

// Recursos esenciales que componen el App Shell estático
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 1. Fase de Instalación: Precacheo del App Shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando App Shell...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-almacenando en caché los componentes del App Shell');
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Fase de Activación: Limpieza de versiones obsoletas
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando versión y limpiando cachés previas...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché obsoleta:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia de Entrega: Cache-First con Network Fallback para App Shell
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Solicitudes dentro del mismo origen
  if (requestUrl.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Servido instantáneamente desde la caché del App Shell
          return cachedResponse;
        }

        // Si no está en caché, recurrir a la red y almacenar en caché dinámico
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Si falla la red y es navegación, entregar index.html (App Shell de respaldo)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});

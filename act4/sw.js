/**
 * ============================================================================
 * ACTIVIDAD 4: Service Worker - Cache API & Estrategia Estática (Cache-First)
 * ============================================================================
 * 
 * Este Service Worker implementa:
 * 1. Creación de memoria caché mediante Cache API en el evento 'install'.
 * 2. Almacenamiento determinista del App Shell (HTML, CSS, JS e imágenes base).
 * 3. Activación y purga de versiones obsoletas en el evento 'activate'.
 * 4. Intercepción del evento 'fetch' con la estrategia Cache-First (Cache Falling Back to Network).
 */

const CACHE_NAME = 'appshell-cache-v1.0.0';

// Lista exhaustiva de recursos estáticos que conforman el App Shell mínimo
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/badge-72.png',
  './img/app-logo.png',
  './img/cache-chip.png',
  './img/shell-banner.png'
];

/* ============================================================================
 * FASE 1: EVENTO 'INSTALL'
 * Creación de memoria caché y precacheo de recursos estáticos del App Shell
 * ============================================================================ */
self.addEventListener('install', (event) => {
  console.log('%c[SW ⚙️ INSTALL] Evento disparado. Inicializando Cache API...', 'color: #06b6d4; font-weight: bold;');

  // waitUntil prolonga la fase de instalación hasta que la promesa se resuelva
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`%c[SW 📦 CACHE OPEN] Memoria caché creada/abierta: "${CACHE_NAME}"`, 'color: #10b981; font-weight: bold;');
        console.log('[SW 📥 PRECACHE] Descargando y almacenando recursos del App Shell:', APP_SHELL_ASSETS);
        
        // cache.addAll descarga y almacena atómicamente todos los recursos
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        console.log('%c[SW ✅ APP SHELL LISTO] Todos los archivos estáticos fueron guardados en Cache Storage.', 'color: #10b981; font-weight: bold;');
        // skipWaiting fuerza la activación inmediata sin esperar a cerrar pestañas activas
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('%c[SW ❌ ERROR PRECACHE] Falló el almacenamiento de los recursos del App Shell:', 'color: #ef4444; font-weight: bold;', error);
      })
  );
});

/* ============================================================================
 * FASE 2: EVENTO 'ACTIVATE'
 * Mantenimiento, eliminación de cachés antiguas y control con clients.claim()
 * ============================================================================ */
self.addEventListener('activate', (event) => {
  console.log('%c[SW 🚀 ACTIVATE] Service Worker activado. Verificando integridad de cachés...', 'color: #8b5cf6; font-weight: bold;');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log(`%c[SW 🧹 PURGE] Eliminando versión de caché obsoleta: "${cache}"`, 'color: #f59e0b;');
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log('%c[SW 🛡️ CLAIM] Tomando control inmediato de todos los clientes abiertos.', 'color: #8b5cf6;');
        return self.clients.claim();
      })
  );
});

/* ============================================================================
 * FASE 3: EVENTO 'FETCH' - ESTRATEGIA CACHE-FIRST (Cache falling back to network)
 * 1. Intercepta la petición HTTP.
 * 2. Consulta primero la Cache API con caches.match().
 * 3. Si el recurso existe en caché (Cache HIT), lo devuelve de inmediato (<5ms).
 * 4. Si no existe (Cache MISS), recurre a la red mediante fetch().
 * 5. Si la red falla (Offline), proporciona un fallback seguro.
 * ============================================================================ */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo interceptamos peticiones HTTP/HTTPS con método GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar esquemas especiales (extensiones de navegador, etc.)
  if (!request.url.startsWith('http')) {
    return;
  }

  // Intercepción con estrategia Cache-First
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // ==========================================
          // CASO A: CACHE HIT (Recurso en memoria caché)
          // ==========================================
          console.log(`%c[SW ⚡ CACHE-FIRST HIT] Servido desde Cache API: ${request.url}`, 'color: #10b981;');
          
          // Clonamos la respuesta y agregamos un encabezado indicativo para diagnóstico
          const modifiedHeaders = new Headers(cachedResponse.headers);
          modifiedHeaders.set('X-Resource-Source', 'Cache-API-Storage');
          modifiedHeaders.set('X-Cache-Strategy', 'Cache-First');
          
          // Reconstruimos Response con el header custom
          return cachedResponse.blob().then((blob) => {
            return new Response(blob, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: modifiedHeaders
            });
          });
        }

        // ==========================================
        // CASO B: CACHE MISS (Recurso no presente en caché)
        // Se recurre a la red (Network Fallback)
        // ==========================================
        console.log(`%c[SW 🌐 CACHE-FIRST MISS] Recurriendo a la RED para: ${request.url}`, 'color: #f59e0b;');
        
        return fetch(request)
          .then((networkResponse) => {
            console.log(`%c[SW 📥 NETWORK SUCCESS] Recibido desde la red: ${request.url} (Status: ${networkResponse.status})`, 'color: #3b82f6;');
            return networkResponse;
          })
          .catch((networkError) => {
            console.warn(`%c[SW ⚠️ NETWORK FAILURE] Dispositivo Offline o servidor inalcanzable para: ${request.url}`, 'color: #ef4444;');
            
            // Fallback para navegación de páginas: si no hay red, servir la pantalla base del App Shell
            if (request.mode === 'navigate') {
              console.log('[SW 🔄 FALLBACK] Sirviendo App Shell index.html como respaldo offline.');
              return caches.match('./index.html');
            }

            // Fallback para imágenes: devolver el logo base en caché
            if (request.destination === 'image') {
              console.log('[SW 🖼️ FALLBACK] Sirviendo logo en caché como respaldo de imagen.');
              return caches.match('./img/app-logo.png');
            }

            // Si no hay fallback aplicable, lanzar el error
            throw networkError;
          });
      })
  );
});

/* ============================================================================
 * COMUNICACIÓN CLIENTE <-> SERVICE WORKER
 * Permite a la interfaz consultar datos, forzar actualización o limpiar caché
 * ============================================================================ */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { action } = event.data;

  if (action === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (action === 'GET_VERSION') {
    event.source.postMessage({
      type: 'VERSION_INFO',
      cacheName: CACHE_NAME,
      assetsCount: APP_SHELL_ASSETS.length
    });
  }
});

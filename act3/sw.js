/**
 * ============================================================================
 * Nexus Data - Service Worker Avanzado (Actividad 3)
 * ============================================================================
 * Implementa:
 * 1. Registro, instalación y activación limpia con control de ciclo de vida.
 * 2. Limpieza determinista de cachés obsoletas.
 * 3. Estrategias de caché diferenciadas:
 *    - Cache-First para recursos estáticos (App Shell, CSS, JS, Iconos).
 *    - Network-First con Cache Fallback para recursos dinámicos y API endpoints.
 * 4. Fallback estructurado en modo offline.
 */

const SW_VERSION = 'v3.0.0';
const STATIC_CACHE_NAME = `nexus-static-${SW_VERSION}`;
const DYNAMIC_CACHE_NAME = `nexus-dynamic-${SW_VERSION}`;

// Recursos estáticos inmutables del App Shell
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './db.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

/* ==========================================================================
   1. FASE DE INSTALACIÓN (Instalación limpia & skipWaiting)
   ========================================================================== */
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Instalando versión ${SW_VERSION}...`);
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Almacenando en caché estática los activos base');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Instalación finalizada. Forzando skipWaiting().');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[Service Worker] Error durante la fase de instalación:', err);
      })
  );
});

/* ==========================================================================
   2. FASE DE ACTIVACIÓN (Limpieza de cachés antiguas & clients.claim)
   ========================================================================== */
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Activando versión ${SW_VERSION}...`);
  const activeCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!activeCaches.includes(cacheName)) {
              console.log('[Service Worker] Eliminando caché obsoleta:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activación completada. Reclamando clientes con clients.claim().');
        return self.clients.claim();
      })
  );
});

/* ==========================================================================
   3. ESTRATEGIAS DE CACHÉ EN LA INTERCEPCIÓN FETCH
   ========================================================================== */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Excluir esquemas no soportados (ej. chrome-extension)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // --------------------------------------------------------------------------
  // A) ESTRATEGIA PARA RECURSOS DINÁMICOS & APIs: Network-First con Cache Fallback
  // --------------------------------------------------------------------------
  if (url.pathname.includes('/api/') || url.searchParams.has('dynamic')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // --------------------------------------------------------------------------
  // B) ESTRATEGIA PARA SOLICITUDES DE NAVEGACIÓN (Páginas HTML):
  //    Network-First con respaldo al index.html en caché
  // --------------------------------------------------------------------------
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Si no hay red, servir la App Shell almacenada
          return caches.match('./index.html');
        })
    );
    return;
  }

  // --------------------------------------------------------------------------
  // C) ESTRATEGIA PARA ACTIVOS ESTÁTICOS: Cache-First con Network Fallback
  //    (App Shell, hojas de estilo, scripts, fuentes, imágenes e iconos)
  // --------------------------------------------------------------------------
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Estrategia Cache-First:
 * Busca primero en caché estática/dinámica. Si existe, responde de inmediato (0ms).
 * Si no existe, descarga de la red y lo guarda en la caché dinámica.
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    console.warn('[Service Worker] Fallo en Cache-First para:', request.url);
    // Si es una imagen y falla, devolver un fallback o null
    return new Response('Recurso no disponible sin conexión', {
      status: 503,
      statusText: 'Service Unavailable (Offline)'
    });
  }
}

/**
 * Estrategia Network-First:
 * Intenta obtener la versión más fresca desde la red.
 * Si tiene éxito, actualiza la caché dinámica.
 * Si falla la red (offline), retorna la copia guardada previamente en caché.
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Red no disponible. Recurriendo a caché para recurso dinámico:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback JSON estructurado en caso de no haber ni red ni caché previa
    return new Response(JSON.stringify({
      status: 'offline',
      offlineFallback: true,
      message: 'Operando en modo sin conexión. Datos servidos por Service Worker Fallback.',
      timestamp: new Date().toISOString(),
      data: []
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Offline-Fallback': 'true'
      }
    });
  }
}

/* ==========================================================================
   4. CANAL DE COMUNICACIÓN (postMessage) PARA EL CLIENTE
   ========================================================================== */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.action === 'GET_SW_VERSION') {
    event.ports[0].postMessage({
      version: SW_VERSION,
      staticCache: STATIC_CACHE_NAME,
      dynamicCache: DYNAMIC_CACHE_NAME
    });
  }

  if (event.data.action === 'CLEAR_DYNAMIC_CACHE') {
    caches.delete(DYNAMIC_CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true, message: 'Caché dinámica eliminada' });
    });
  }
});

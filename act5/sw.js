/**
 * ============================================================================
 * ACTIVIDAD 5: Service Worker - Interceptor de Peticiones y Fallback Offline
 * ============================================================================
 * 
 * Este Service Worker implementa:
 * 1. Precacheo garantizado de la plantilla 'offline.html' y App Shell durante 'install'.
 * 2. Limpieza de versiones previas en 'activate'.
 * 3. Intercepción del evento 'fetch' con detección activa de fallos de red.
 * 4. Renderizado condicional de la plantilla HTML personalizada "Modo Sin Conexión"
 *    cuando la red falla y el recurso solicitado no existe en la memoria caché.
 * 5. Fallbacks diferenciados para imágenes y endpoints API/JSON.
 */

const CACHE_NAME = 'pwa-offline-fallback-v1.0.0';

// Lista de recursos estáticos críticos incluyendo la plantilla offline
const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/badge-72.png',
  './img/app-logo.png',
  './img/offline-art.png',
  './img/offline-placeholder.png'
];

/* ============================================================================
 * 1. EVENTO 'INSTALL': Creación de Caché y Precacheo de la Plantilla Offline
 * ============================================================================ */
self.addEventListener('install', (event) => {
  console.log('%c[SW ⚙️ INSTALL] Precargando App Shell y plantilla "offline.html"...', 'color: #f43f5e; font-weight: bold;');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`%c[SW 📦 CACHE OPEN] Almacén abierto: "${CACHE_NAME}"`, 'color: #10b981;');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('%c[SW ✅ READY] Plantilla offline.html y recursos base asegurados.', 'color: #10b981; font-weight: bold;');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('%c[SW ❌ ERROR PRECACHE]', 'color: #ef4444;', err);
      })
  );
});

/* ============================================================================
 * 2. EVENTO 'ACTIVATE': Limpieza de Cachés y Control Inmediato
 * ============================================================================ */
self.addEventListener('activate', (event) => {
  console.log('%c[SW 🚀 ACTIVATE] Service Worker activo.', 'color: #8b5cf6; font-weight: bold;');

  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log(`%c[SW 🧹 LIMPIEZA] Eliminando caché obsoleta: "${key}"`, 'color: #f59e0b;');
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/* ============================================================================
 * 3. EVENTO 'FETCH': Interceptor de Peticiones y Manejo de Estado Offline
 * ============================================================================ */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo interceptar peticiones GET vía HTTP/HTTPS
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  const isImage = request.destination === 'image';
  const isJson = request.headers.get('accept')?.includes('application/json') || url.pathname.startsWith('/api/');

  // --------------------------------------------------------------------------
  // CASO 1: NAVEGACIÓN DE PÁGINAS HTML (Network First con Fallback a offline.html)
  // --------------------------------------------------------------------------
  if (isNavigation) {
    event.respondWith(
      // Primero intentamos consultar la red para obtener la versión más reciente
      fetch(request)
        .then((networkResponse) => {
          console.log(`%c[SW 🌐 RED EXITOSA] Navegación servida desde red: ${url.pathname}`, 'color: #3b82f6;');
          return networkResponse;
        })
        .catch(async (networkError) => {
          console.warn(`%c[SW ⚠️ FALLO DE RED] No hay conexión a internet para navegar a: ${url.pathname}`, 'color: #f43f5e;');

          // 1. Revisamos si la página específica está guardada en la caché local
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            console.log(`%c[SW ⚡ CACHÉ ENCONTRADA] Sirviendo versión en caché de: ${url.pathname}`, 'color: #10b981;');
            return cachedPage;
          }

          // 2. Si no está en caché y la red falló: RENDERIZAR LA PLANTILLA PERSONALIZADA OFFLINE
          console.log('%c[SW 🚨 RENDERIZANDO FALLBACK] Sirviendo plantilla personalizada "offline.html"...', 'color: #f43f5e; font-weight: bold;');
          
          const offlineTemplate = await caches.match('./offline.html');
          if (offlineTemplate) {
            // Devolvemos la plantilla HTML personalizada con status 200 y encabezados de auditoría
            const headers = new Headers(offlineTemplate.headers);
            headers.set('Content-Type', 'text/html; charset=utf-8');
            headers.set('X-Service-Worker-Fallback', 'true');
            headers.set('X-Fallback-Reason', 'network-offline-and-resource-uncached');

            return new Response(await offlineTemplate.blob(), {
              status: 200,
              statusText: 'OK (Served Offline Fallback Template)',
              headers: headers
            });
          }

          // Respaldo de emergencia en caso extremo de fallo en lectura de caché
          return new Response(
            '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>Sin Conexión</h1><p>El Service Worker no pudo cargar la plantilla offline.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // --------------------------------------------------------------------------
  // CASO 2: SOLICITUD DE IMÁGENES (Fallback a placeholder offline)
  // --------------------------------------------------------------------------
  if (isImage) {
    event.respondWith(
      caches.match(request)
        .then((cachedImg) => {
          if (cachedImg) return cachedImg;
          
          return fetch(request).catch(() => {
            console.warn(`[SW 🖼️ FALLBACK IMAGEN] Imagen no disponible offline: ${url.pathname}`);
            return caches.match('./img/offline-placeholder.png');
          });
        })
    );
    return;
  }

  // --------------------------------------------------------------------------
  // CASO 3: ENDPOINTS DE API / DATOS JSON (Fallback estructurado JSON)
  // --------------------------------------------------------------------------
  if (isJson) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          console.warn(`[SW 📡 FALLBACK JSON] Servidor inalcanzable para API: ${url.pathname}`);
          const fallbackData = {
            error: 'OFFLINE_MODE',
            status: 503,
            message: 'La aplicación se encuentra sin conexión a internet. La petición fue interceptada por el Service Worker.',
            requestedEndpoint: url.pathname,
            offlineTimestamp: new Date().toISOString(),
            isServiceWorkerFallback: true
          };

          return new Response(JSON.stringify(fallbackData, null, 2), {
            status: 503,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'X-Service-Worker-Fallback': 'JSON-Offline-Interceptor'
            }
          });
        })
    );
    return;
  }

  // --------------------------------------------------------------------------
  // CASO 4: RECURSOS ESTÁTICOS (CSS, JS, FUENTES - Cache-First con fallback)
  // --------------------------------------------------------------------------
  event.respondWith(
    caches.match(request)
      .then((cachedAsset) => {
        if (cachedAsset) return cachedAsset;
        return fetch(request);
      })
  );
});

/* ============================================================================
 * 4. COMUNICACIÓN CLIENTE <-> SW
 * ============================================================================ */
self.addEventListener('message', (event) => {
  if (event.data?.action === 'GET_INFO') {
    event.source.postMessage({
      type: 'SW_INFO',
      cacheName: CACHE_NAME,
      cachedAssets: STATIC_ASSETS
    });
  }
});

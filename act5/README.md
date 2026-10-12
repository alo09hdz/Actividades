# Actividad 5: Interceptor de Peticiones y Manejo de Estado Offline

## 📋 Descripción del Proyecto
Este proyecto implementa un **Interceptor de Peticiones Avanzado** en el evento `fetch` de un **Service Worker** para Aplicaciones Web Progresivas (PWA), enfocado en la **detección de pérdida de conexión** y el **renderizado de una plantilla HTML personalizada de "Modo Sin Conexión"** (`offline.html`):

1. **Precacheo Garantizado en el evento `install`**: La plantilla de contingencia `offline.html` y todos sus recursos visuales (iconos, estilos, imágenes) se persisten en la **Cache API** desde la instalación, garantizando que estén disponibles al 100% cuando no exista red.
2. **Detección Activa de Fallos de Red en el evento `fetch`**: El Service Worker captura los rechazos de promesa (`catch`) producidos por la desconexión de red o caída del servidor.
3. **Renderizado de la Vista HTML Personalizada de 'Modo Sin Conexión'**: Cuando el usuario navega hacia una ruta que **no existe en la memoria caché** y la red falla, el Service Worker intercepta la solicitud y devuelve la plantilla personalizada `offline.html` con código HTTP 200, evitando la pantalla genérica de error del navegador.
4. **Respuestas Alternativas (Fallbacks) Diferenciadas**:
   - **Navegación de Páginas (HTML)** ➡️ Renderizado de `offline.html`.
   - **Imágenes no cacheadas** ➡️ Respuesta alternativa con placeholder offline (`img/offline-placeholder.png`).
   - **Peticiones de Datos / APIs (JSON)** ➡️ Respuesta JSON estructurada con status 503 y metadatos de contingencia.
5. **Reconexión Automática**: La plantilla `offline.html` incluye un detector reactivo del evento `window.addEventListener('online')` que actualiza la interfaz y recarga la página de forma automática una vez restaurado el internet.

---

## 🏗️ 1. Arquitectura del Interceptor y Flujo de Contingencia

```
                           +------------------------+
                           |  Petición de Usuario   |
                           | (ej. /secciones/notas) |
                           +------------------------+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                     SERVICE WORKER (sw.js - fetch)                          |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                        1. Intentar consultar la Red
                             fetch(event.request)
                                      ╱ ╲
                        [CONEXIÓN OK]╱   ╲[FALLO DE RED (Offline)]
                                    ╱     ╲
                                   ▼       ▼
                    +─────────────────+  2. ¿Recurso en memoria caché?
                    | Respuesta de Red|     caches.match(event.request)
                    |     (200 OK)    |                ╱ ╲
                    +─────────────────+  [EN CACHÉ]   ╱   ╲  [NO EN CACHÉ]
                                                     ╱     ╲
                                                    ▼       ▼
                                       +────────────────+  +─────────────────────────+
                                       | Servir versión |  |  🚨 RENDERIZAR FALLBACK |
                                       |   en caché     |  | Plantilla personalizada |
                                       +────────────────+  |      'offline.html'     |
                                                           +─────────────────────────+
```

---

## ⚙️ 2. Implementación Técnica en `sw.js`

### A. Precacheo Obligatorio de `offline.html` en `install`
Para que una página de respaldo funcione sin conexión, debe almacenarse en el almacenamiento local antes de que ocurra la desconexión:

```javascript
// sw.js
const CACHE_NAME = 'pwa-offline-fallback-v1.0.0';

const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',            // <-- Plantilla HTML personalizada
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});
```

---

### B. Interceptor en el Evento `fetch` con Detección de Desconexión
El Service Worker intercepta las solicitudes de navegación (`request.mode === 'navigate'`). Si la red falla y la página solicitada no está en caché, sirve `offline.html`:

```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  const isNavigation = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => networkResponse)
        .catch(async (error) => {
          // 1. Revisar si la página específica está guardada en la caché
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          // 2. Si no está en caché y la red falló: RENDERIZAR LA PLANTILLA OFFLINE
          console.warn('[SW] Red no disponible. Renderizando offline.html...');
          const offlineTemplate = await caches.match('./offline.html');
          
          return new Response(await offlineTemplate.blob(), {
            status: 200,
            statusText: 'OK (Served Offline Fallback Template)',
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'X-Service-Worker-Fallback': 'true'
            }
          });
        })
    );
    return;
  }

  // Fallbacks para imágenes y APIs
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).catch(() => caches.match('./img/offline-placeholder.png')))
    );
    return;
  }
});
```

---

## 🎨 3. Características de la Plantilla `offline.html`

La vista [offline.html](file:///c:/Users/LABTI-23/Documents/guillermo/act5/offline.html) incluye:

1. **Baliza Animada (Radar Pulse)**: Elemento visual que denota búsqueda de señal.
2. **Explicación Pedagógica**: Informa al usuario que el Service Worker capturó la petición y evitó la pantalla de error del navegador.
3. **Banner Reactivo de Reconexión**:
   ```javascript
   window.addEventListener('online', () => {
     banner.style.display = 'flex';
     setTimeout(() => window.location.reload(), 1800);
   });
   ```
4. **Ficha Técnica de Diagnóstico**: Muestra la ruta que se intentó cargar, la hora de la captura y el código HTTP de respuesta.
5. **Botones de Acción**: "Reintentar Conexión" y "Volver al Dashboard".

---

## 🧪 4. Guía de Pruebas con Google Chrome DevTools

### Paso 1: Iniciar el Servidor Local
Abre una terminal PowerShell y ejecuta:
```bash
cd c:\Users\LABTI-23\Documents\guillermo\act5
node server.js
```
El servidor arrancará en: 👉 **`http://localhost:3005/`**

### Paso 2: Verificar la Instalación en DevTools
1. Abre Google Chrome y navega a `http://localhost:3005/`.
2. Presiona <kbd>F12</kbd> para abrir DevTools.
3. En la pestaña **Application** ➡️ **Cache Storage** ➡️ **`pwa-offline-fallback-v1.0.0`**:
   - Confirma que `offline.html` está almacenado en la memoria local.

### Paso 3: Probar Navegación en Modo Online
1. En el Dashboard principal, en la sección **"Laboratorio de Navegación Real"**, haz clic en el botón de la Tarjeta 2: **"Navegar a Noticias"** (`./secciones/noticias.html`).
2. Comprobarás que la página carga normalmente desde la red con su banner verde indicando *"Servido desde la Red"*.

### Paso 4: Probar la Detección y Renderizado Offline
1. Regresa al Dashboard o mantente en DevTools.
2. Ve a la pestaña **Network** (Red) de DevTools.
3. En el selector de velocidad (por defecto `No throttling`), cámbialo a **`Offline`**.
4. Ahora haz clic en **"Navegar a Noticias"** o navega a cualquier ruta no cacheada como `http://localhost:3005/secciones/reporte.html`:
   - **¡Comportamiento Verificado!** En lugar del dinosaurio o error de red nativo, el Service Worker intercepta la solicitud y renderiza inmediatamente la **plantilla HTML personalizada de 'Modo Sin Conexión'** (`offline.html`) con estado **200 OK**.

### Paso 5: Probar la Reconexión Automática
1. Mientras observas la plantilla `offline.html`, regresa a la pestaña **Network** de DevTools y vuelve a seleccionar **`No throttling`** (Online).
2. Verás cómo aparece el banner verde: *"¡Conexión a internet reestablecida! Recargando..."* y la página se actualiza sola hacia el contenido real.

### Paso 6: Prueba en el Sandbox Integrado
1. En la página principal (`index.html`), usa la sección **"Sandbox del Interceptor Fetch"**.
2. Con la red en `Offline`, pulsa el botón **"Ejecutar Interceptor Fetch"**:
   - Verás el badge `🚨 FALLBACK OFFLINE RENDERIZADO`.
   - En el visor interactivo derecho se renderiza directamente la plantilla `offline.html`.

---

## 📁 5. Estructura de Archivos del Proyecto

```
act5/
├── icons/
│   ├── badge-72.png            # Icono monocromático 72x72
│   ├── icon-192.png            # Icono PWA con símbolo offline 192x192
│   └── icon-512.png            # Icono de alta densidad 512x512
├── img/
│   ├── app-logo.png            # Logotipo de la PWA
│   ├── offline-art.png         # Ilustración conceptual con radar y escudo
│   └── offline-placeholder.png # Imagen de fallback para peticiones gráficas
├── secciones/
│   ├── noticias.html           # Ruta dinámica remota (Online)
│   └── reporte.html            # Ruta dinámica remota (Online)
├── app.js                      # Lógica del cliente, monitor de red y sandbox
├── index.html                  # Dashboard principal de la Actividad 5
├── make_icons.ps1              # Generador gráfico de iconos (.NET System.Drawing)
├── manifest.json               # Web App Manifest estándar W3C
├── offline.html                # Plantilla HTML personalizada de "Modo Sin Conexión"
├── README.md                   # Documentación técnica completa
├── server.js                   # Servidor HTTP Node.js (Puerto 3005)
├── style.css                   # Sistema de diseño con tema offline y baliza animada
└── sw.js                       # Service Worker: Install, Fetch Interceptor y Fallback
```

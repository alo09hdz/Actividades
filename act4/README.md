# Actividad 4: Cache API y Estrategia de Caché Estática (Cache-First)

## 📋 Descripción del Proyecto
Este proyecto implementa la arquitectura de **Cache API** y la **Estrategia de Caché Estática (Cache-First)** para una **Aplicación Web Progresiva (PWA)** offline-first:

1. **Creación de memoria caché en el evento `install`**: Inicialización controlada mediante la Cache API de la W3C (`caches.open(CACHE_NAME)`).
2. **Almacenamiento de los recursos estáticos del App Shell**: Precarga atómica (`cache.addAll()`) de todos los archivos esenciales de la interfaz mínima (HTML, CSS, JS, manifiesto e imágenes base).
3. **Intercepción del evento `fetch` con Cache-First**: El Service Worker captura cada solicitud HTTP entrante y consulta primero la memoria caché local antes de realizar cualquier intento de conexión a la red externa.
4. **Laboratorio Interactivo de Auditoría y Benchmark**: Interfaz visual con explorador en tiempo real de Cache Storage, medidor de latencia comparativa (Cache HIT vs Network Fallback) y consola de telemetría.

---

## 🏗️ 1. Arquitectura del App Shell y la Cache API

El modelo **App Shell** (Caparazón de la Aplicación) consiste en aislar los componentes estructurales de la interfaz de usuario para que se descarguen una sola vez y se almacenen permanentemente en el almacenamiento local del navegador:

```
+-------------------------------------------------------------+
|                     PANTALLA DE USUARIO                     |
+-------------------------------------------------------------+
                              │
                    1. Petición HTTP (GET)
                              ▼
+─────────────────────────────────────────────────────────────+
|               SERVICE WORKER (sw.js - fetch)                |
+─────────────────────────────────────────────────────────────+
                              │
               2. ¿Existe en la memoria local?
                caches.match(event.request)
                             ╱ ╲
               [CACHE HIT]  ╱   ╲  [CACHE MISS]
                           ╱     ╲
                          ▼       ▼
+───────────────────────────+   +─────────────────────────────+
|    CACHE STORAGE (API)    |   |     RED EXTERNA / SERVER    |
|   (HTML, CSS, JS, PNG)    |   |      fetch(event.request)   |
|   ⚡ Latencia: 1 a 4 ms    |   |      🌐 Latencia: > 150 ms   |
+───────────────────────────+   +─────────────────────────────+
```

### Recursos que componen el App Shell:
| Recurso | Tipo MIME | Propósito en el App Shell |
| :--- | :--- | :--- |
| `index.html` | `text/html` | Estructura semántica base (Header, paneles, métricas y contenedores). |
| `style.css` | `text/css` | Sistema de diseño visual, glassmorphism, tokens de color y layout responsivo. |
| `app.js` | `application/javascript` | Registro del SW, monitor de Cache API, simulador de latencia y telemetría. |
| `manifest.json` | `application/manifest+json` | Metadatos de instalación de la PWA (nombre, colores, iconos). |
| `icons/icon-192.png` | `image/png` | Icono principal de la aplicación para el lanzador y pantalla de inicio. |
| `icons/icon-512.png` | `image/png` | Icono de alta densidad y Splash Screen nativa. |
| `icons/badge-72.png` | `image/png` | Icono monocromático para notificaciones y barra de estado. |
| `img/app-logo.png` | `image/png` | Emblema gráfico del encabezado persistente. |
| `img/cache-chip.png` | `image/png` | Distintivo visual del circuito de memoria caché. |
| `img/shell-banner.png` | `image/png` | Ilustración estática representativa de la infraestructura App Shell. |

---

## ⚙️ 2. Implementación en el Ciclo de Vida del Service Worker

### A. Creación de Caché y Precacheo en `install`
Durante el evento `install`, el Service Worker abre un espacio dedicado en la **Cache API** y descarga todos los recursos del App Shell de manera atómica:

```javascript
// sw.js
const CACHE_NAME = 'appshell-cache-v1.0.0';

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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caché creada:', CACHE_NAME);
        return cache.addAll(APP_SHELL_ASSETS); // Descarga y almacena en bloque
      })
      .then(() => self.skipWaiting()) // Activación inmediata sin esperar reinicio
  );
});
```

> **¿Por qué `cache.addAll()` es atómico?**
> Si tan solo uno de los archivos de la lista falla al descargarse (por ejemplo, un error 404), la promesa se rechaza por completo y el Service Worker aborta la instalación, evitando dejar una aplicación con recursos incompletos o corruptos.

---

### B. Mantenimiento y Purga en `activate`
Cuando una nueva versión del Service Worker se activa, el evento `activate` elimina las versiones viejas de caché para liberar almacenamiento:

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Purgando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma control inmediato de los clientes
  );
});
```

---

### C. Estrategia Cache-First en el Evento `fetch`
La estrategia **Cache-First (Cache Falling Back to Network)** prioriza la memoria local:

```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 1. CACHE HIT: Si el archivo está en caché, responder de inmediato (<5ms)
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. CACHE MISS: Si no está en caché, solicitar a la red
        return fetch(event.request)
          .catch((err) => {
            // Fallback de navegación si la red no está disponible (Offline)
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            if (event.request.destination === 'image') {
              return caches.match('./img/app-logo.png');
            }
            throw err;
          });
      })
  );
});
```

---

## 📊 3. Comparativa de Estrategias de Caché en PWA

| Estrategia | Flujo de Datos | Caso de Uso Ideal | Ventajas |
| :--- | :--- | :--- | :--- |
| **Cache-First** *(Implementada)* | Caché ➡️ Red (Solo si no está) | **App Shell**: HTML, CSS, JS, Fuentes, Iconos | Velocidad instantánea (< 5ms), disponibilidad offline total. |
| **Network-First** | Red ➡️ Caché (Si falla la red) | Datos dinámicos en tiempo real (APIs, feeds de noticias) | Garantiza datos frescos cuando hay conexión activa. |
| **Stale-While-Revalidate** | Caché de inmediato ➡️ Actualiza en segundo plano | Avatares de usuario, feeds sociales de lectura rápida | Respuesta inmediata con actualización transparente. |
| **Network-Only** | Red directa sin consultar caché | Pasarelas de pago, autenticación sensible, transacciones bancarias | Máxima seguridad e integridad transaccional. |

---

## 🧪 4. Guía de Pruebas con Google Chrome DevTools

### Paso 1: Levantar el Servidor Local
Abre una terminal PowerShell y ejecuta:
```bash
cd c:\Users\LABTI-23\Documents\guillermo\act4
node server.js
```
El servidor arrancará en: 👉 **`http://localhost:3004/`**

### Paso 2: Verificar el Service Worker
1. Abre Google Chrome y navega a `http://localhost:3004/`.
2. Presiona <kbd>F12</kbd> para abrir DevTools.
3. Ve a la pestaña **Application** ➡️ **Service Workers**:
   - Verifica que el estado sea **`# activated and is running`**.
   - Observa que el ámbito (Scope) sea `http://localhost:3004/`.

### Paso 3: Inspeccionar Cache Storage (Cache API)
1. En la pestaña **Application**, despliega el submenú **Storage** ➡️ **Cache Storage**.
2. Haz clic en **`appshell-cache-v1.0.0`**:
   - Observarás la lista completa de recursos precacheados en el evento `install`:
     - `http://localhost:3004/`
     - `http://localhost:3004/index.html`
     - `http://localhost:3004/style.css`
     - `http://localhost:3004/app.js`
     - `http://localhost:3004/manifest.json`
     - Iconos y recursos visuales (`icons/icon-192.png`, `img/shell-banner.png`, etc.).

### Paso 4: Comprobar la Intercepción en la Pestaña Network
1. En DevTools, cambia a la pestaña **Network** (Red).
2. Recarga la página (<kbd>F5</kbd>):
   - En la columna **Size** (Tamaño), verás que en lugar de un número de bytes descargados del servidor, indica **`(ServiceWorker)`**.
   - En la columna **Time** (Tiempo), constata que la latencia es de apenas **1 a 5 ms**.

### Paso 5: Probar el Modo Offline Real
1. En la pestaña **Network**, localiza el menú desplegable de simulación de velocidad (por defecto dice `No throttling`).
2. Cámbialo a **`Offline`**.
3. Realiza una recarga forzada con <kbd>Ctrl + F5</kbd>:
   - **Resultado:** La página carga inmediatamente sin mostrar el dinosaurio de "Sin conexión".
   - Todo el App Shell, las hojas de estilo y las imágenes continúan mostrándose intactos.

### Paso 6: Evaluar con el Simulador de Latencia Integrado
1. En la interfaz web de la aplicación, localiza la sección **"Laboratorio de Latencia y Verificación Cache-First"**.
2. Selecciona `style.css` y pulsa **"Ejecutar Solicitud HTTP con Benchmark"**:
   - Observa el badge: `⚡ CACHE HIT (Cache Storage)` con latencia de **~2 ms**.
3. Ahora selecciona el recurso `/api/simulated-network` y pulsa ejecutar:
   - Observa el badge: `🌐 NETWORK FALLBACK (Red Externa)` con latencia de **~250 ms**.
   - Esto demuestra la enorme ventaja competitiva de servir el App Shell con **Cache-First**.

---

## 📁 5. Estructura del Proyecto

```
act4/
├── icons/
│   ├── badge-72.png          # Icono monocromático 72x72
│   ├── icon-192.png          # Icono estándar PWA 192x192
│   └── icon-512.png          # Icono de alta densidad 512x512
├── img/
│   ├── app-logo.png          # Logotipo vectorial del App Shell
│   ├── cache-chip.png        # Gráfico conceptual de microchip
│   └── shell-banner.png      # Banner ilustrado del App Shell
├── app.js                    # Lógica del cliente, monitor de Cache API y simulador
├── index.html                # Estructura semántica base del App Shell
├── make_icons.ps1            # Script generador de iconos e imágenes (.NET System.Drawing)
├── manifest.json             # Web App Manifest estándar W3C
├── README.md                 # Documentación técnica completa
├── server.js                 # Servidor HTTP local Node.js (Puerto 3004)
├── style.css                 # Sistema de diseño con glassmorphism y dark mode
└── sw.js                     # Service Worker: Install, Cache API, Activate y Cache-First
```

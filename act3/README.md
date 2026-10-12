# Actividad 3: Service Worker, Estrategias de Caché y Persistencia con IndexedDB

## 📋 Descripción del Proyecto
Este proyecto implementa la lógica completa de **Service Worker** y **Almacenamiento Avanzado** para una **Aplicación Web Progresiva (PWA)** offline-first:
1. **Ciclo de vida determinista del Service Worker**: Registro, instalación limpia con `skipWaiting()`, activación con `clients.claim()` y eliminación automática de cachés antiguas.
2. **Estrategias de Caché Diferenciadas**:
   - **Cache-First**: Para recursos estáticos (App Shell, CSS, JS, Iconos).
   - **Network-First con Cache Fallback**: Para peticiones dinámicas y APIs (`/api/feed`).
3. **Persistencia asíncrona mediante IndexedDB**:
   - Almacenamiento no relacional estructurado (`NexusDataDB`).
   - Soporte total para lectura, inserción y borrado de datos en modo offline.
   - Cola de sincronización y reconciliación automática con el servidor (`POST /api/sync`).

---

## 🏗️ 1. Arquitectura de Almacenamiento en PWA

| Tecnología | Tipo de Datos | Estrategia | Casos de Uso |
| :--- | :--- | :--- | :--- |
| **Cache API (Cache Storage)** | Respuestas HTTP completas (`Request`/`Response`) | Cache-First / Network-First | App Shell (HTML, CSS, JS), fuentes, imágenes, respuestas JSON de API. |
| **IndexedDB** | Objetos JSON estructurados y tipados con índices | Transaccional asíncrona | Registros de usuario, tareas, datos de formularios, telemetría offline. |

---

## ⚙️ 2. Ciclo de Vida del Service Worker

El script [sw.js](file:///c:/Users/LABTI-23/Documents/guillermo/act3/sw.js) implementa las mejores prácticas del estándar W3C:

### A. Registro (`navigator.serviceWorker.register`)
- Se descarga e inicializa en un hilo en segundo plano independiente del DOM.

### B. Fase de Instalación (`install` event)
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('nexus-static-v3.0.0')
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()) // Fuerza la activación inmediata sin esperar a cerrar pestañas
  );
});
```

### C. Fase de Activación & Limpieza (`activate` event)
```javascript
self.addEventListener('activate', (event) => {
  const activeCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (!activeCaches.includes(key)) {
          return caches.delete(key); // Purga versiones obsoletas
        }
      })
    )).then(() => self.clients.claim()) // Toma control inmediato de todos los clientes abiertos
  );
});
```

---

## 🎯 3. Estrategias de Caché Diferenciadas

### 1. Cache-First (Recursos Estáticos)
- **Ruta:** Hojas de estilo (`style.css`), scripts (`app.js`, `db.js`), manifiesto e iconos.
- **Flujo:** Busca en la caché local. Si existe, responde inmediatamente (**< 15 ms**). Si no, consulta la red y lo cachea.

### 2. Network-First con Cache Fallback (Recursos Dinámicos)
- **Ruta:** Endpoints de API (`/api/feed`, peticiones con parámetro `dynamic`).
- **Flujo:** Intenta obtener los datos frescos de la red. Si la red responde (200), actualiza la caché dinámica. Si el dispositivo está **offline**, el Service Worker intercepta el fallo y devuelve la última versión guardada en caché o un JSON fallback estructurado.

---

## 🗄️ 4. Persistencia Asíncrona con IndexedDB

La capa [db.js](file:///c:/Users/LABTI-23/Documents/guillermo/act3/db.js) encapsula la API nativa de IndexedDB v2:

- **Nombre de la BD:** `NexusDataDB` (Versión 1)
- **Almacén de Objetos:** `records` (Clave primaria: `id`)
- **Índices Secundarios:**
  - `syncStatus`: Permite filtrar rápidamente entre registros `'synced'` y `'pending'`.
  - `category`: Agrupación por departamentos o módulos.
  - `createdAt`: Ordenación temporal descendente.
  - `priority`: Clasificación de negocio ('Alta', 'Media', 'Baja').

### Comportamiento Offline:
1. Si el usuario crea un registro sin conexión (o con la simulación offline activa), se guarda en IndexedDB con `syncStatus: "pending"`.
2. La interfaz de usuario se actualiza **inmediatamente sin error**, mostrando la etiqueta ámbar `⏳ Offline / Pendiente`.
3. Al recuperar la conexión a internet (`window.addEventListener('online')`), el sistema envía los registros pendientes a `POST /api/sync` y los actualiza a `syncStatus: "synced"`.

---

## 🧪 5. Guía de Pruebas con Chrome DevTools

### Paso 1: Iniciar el Servidor Local
```bash
cd c:\Users\LABTI-23\Documents\guillermo\act3
node server.js
```
Abre en Chrome: 👉 **`http://localhost:3002/`**

### Paso 2: Comprobar el Service Worker
1. Presiona <kbd>F12</kbd> -> Pestaña **Application**.
2. Haz clic en **Service Workers**:
   - Verifica que el Service Worker esté en estado **`# Activated and is running`**.
   - Observa que el ámbito sea `http://localhost:3002/`.

### Paso 3: Inspeccionar Cache Storage
1. En la pestaña **Application**, despliega **Storage > Cache Storage**:
   - Observa dos almacenes creados: `nexus-static-v3.0.0` y `nexus-dynamic-v3.0.0`.
   - Haz clic en `nexus-static-v3.0.0` para ver `index.html`, `style.css`, `app.js`, `db.js` e iconos.

### Paso 4: Inspeccionar IndexedDB
1. En la pestaña **Application**, despliega **Storage > IndexedDB > NexusDataDB > records**:
   - Observa los registros guardados en la tabla con sus columnas `id`, `title`, `syncStatus`, `category` y `createdAt`.

### Paso 5: Probar Modo Offline Real
1. En Chrome DevTools, ve a la pestaña **Network** (Red) y en el selector desplegable cambia `No throttling` a **`Offline`** (o pulsa el botón **"Simular Offline"** en el encabezado de la aplicación).
2. Recarga la página con <kbd>F5</kbd>:
   - La aplicación carga de inmediato desde el Service Worker.
   - Los datos en IndexedDB siguen visualizándose intactos.
   - Crea un nuevo registro: se guardará con la etiqueta ámbar **"Offline / Pendiente"**.
3. Vuelve a cambiar el selector de red a **`No throttling`** (Online):
   - La aplicación detecta la reconexión y sincroniza automáticamente los registros en espera con el servidor central.

# Actividad 2: Maquetado del App Shell y Splash Screen Nativa

## 📋 Descripción del Proyecto
Este proyecto implementa la arquitectura **App Shell** para una **Aplicación Web Progresiva (PWA)** de alto rendimiento, junto con la configuración y verificación de la **Splash Screen Nativa** generada por el motor Chromium/Android, y una suite de verificación interactiva mediante **Google Chrome DevTools**.

---

## 🏗️ 1. Arquitectura del App Shell (Interfaz Base Responsiva)

El modelo **App Shell** separa la infraestructura visual estática mínima necesaria para la interfaz de usuario del contenido dinámico:

### Componentes de la Interfaz Base:
1. **Header Estático (`<header class="app-header">`)**:
   - Logotipo de marca con icono vectorial de alta definición.
   - Migas de pan de navegación dinámica.
   - Píldora de estado de conexión (`Online` / `Offline`) en tiempo real.
   - Píldora indicadora de estado en caché (`Shell Cached`).
   - Botón de instalación nativa (`beforeinstallprompt`).
   - Botón de acceso directo a la simulación de Splash Screen.

2. **Menú de Navegación (`<aside>` y `<nav>`)**:
   - **Escritorio / Tablets Grandes**: Barra lateral (Sidebar) elegante con secciones agrupadas, badges de latencia (0ms), y tarjeta con especificaciones del manifiesto.
   - **Móvil / Pantallas Reducidas**:
     - Menú tipo Drawer desplegable mediante botón hamburguesa.
     - Barra de navegación inferior flotante (**Bottom Navigation Bar**) adaptada al área segura del dispositivo (`viewport-fit=cover`, `safe-area-inset-bottom`).

3. **Contenedor Principal (`<main class="app-main">`)**:
   - Marco estructural persistente que nunca se destruye ni parpadea (0 Cumulative Layout Shift).
   - Renderizado con **Skeleton Screens** (marcadores de posición con animación shimmer) mientras los datos dinámicos son cargados de forma asíncrona.

---

## 📱 2. Splash Screen Nativa en PWA

A diferencia de las pantallas de carga tradicionales creadas con HTML/CSS dentro de la página, la **Splash Screen Nativa** es dibujada directamente por el **Sistema Operativo (Android / Chromium)** antes de que el motor de renderizado web inicie la ejecución de JavaScript.

### Los 5 Requisitos Indispensables en `manifest.json`:
1. **`name` o `short_name`**: Define el texto que el sistema operativo imprime debajo del icono central.
2. **`background_color`**: Define el color hexadecimal que llena el lienzo completo de la pantalla (`#0a0f1d`).
3. **`theme_color`**: Tiñe la barra de estado del sistema (batería, reloj, notificaciones) para una apariencia integrada (`#6366f1`).
4. **`icons`**: Requiere al menos iconos PNG en resoluciones **192x192** y **512x512** (con propósito `any maskable`).
5. **`display`**: Debe ser `standalone` o `fullscreen` para que el navegador ejecute la app fuera de las pestañas tradicionales.

---

## 🛠️ 3. Verificador mediante Chrome DevTools (Guía Paso a Paso)

Para comprobar la activación y apariencia de la Splash Screen nativa simulando la instalación:

### Paso 1: Abrir DevTools
Presiona <kbd>F12</kbd> o <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> en Google Chrome o Microsoft Edge.

### Paso 2: Ir a la Pestaña "Application" (Aplicación)
En la barra de herramientas superior de DevTools, haz clic en la pestaña **Application**.

### Paso 3: Inspeccionar el Manifiesto y la Vista Previa de la Splash Screen
1. En el panel lateral izquierdo, selecciona **Application > Manifest**.
2. Desplázate hacia abajo hasta la sección **"Presentation"**:
   - Verifica que **Colors** muestre:
     - `Theme color`: `#6366f1`
     - `Background color`: `#0a0f1d`
3. Justo debajo de la sección de colores, Chrome DevTools renderiza automáticamente la **vista previa exacta de la Splash Screen Nativa** en un marco de teléfono móvil con el icono centrado y el nombre de la app.

### Paso 4: Simular la Instalación
1. En la parte superior derecha del panel Manifest, haz clic en el botón **"Install app"** o **"Add to homescreen"**.
2. Se abrirá el cuadro de diálogo nativo del sistema operativo confirmando la instalación.

### Paso 5: Comprobar Persistencia Offline del App Shell
1. En DevTools, ve a **Application > Service Workers**.
2. Marca la casilla de verificación **"Offline"**.
3. Recarga la página (<kbd>F5</kbd>): Observa cómo el App Shell (Header, Menú y Contenedor) carga de inmediato sin error de red.

---

## 🚀 4. Cómo Ejecutar Localmente

### Opción 1: Con Node.js
```bash
cd c:\Users\LABTI-23\Documents\guillermo\act2
node server.js
```
Abre en tu navegador:
👉 **http://localhost:3001/**

### Opción 2: Generar / Actualizar Iconos
Si deseas regenerar los iconos vectoriales:
```powershell
powershell -ExecutionPolicy Bypass -File make_icons.ps1
```

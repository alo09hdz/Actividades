/**
 * ============================================================================
 * ACTIVIDAD 4: Cliente Web - Explorador de Cache API & Banco de Pruebas
 * ============================================================================
 * Gestiona el ciclo de vida del Service Worker, la inspección en tiempo real de
 * la memoria Cache Storage y el simulador de latencia para la estrategia Cache-First.
 */

const CACHE_NAME = 'appshell-cache-v1.0.0';

// Estado global de la aplicación
const state = {
  swRegistration: null,
  isOnline: navigator.onLine,
  simulatedOffline: false,
  cachedEntries: [],
  benchmarkHistory: []
};

// ============================================================================
// 1. REGISTRO Y MONITOREO DEL SERVICE WORKER
// ============================================================================
async function initServiceWorker() {
  const swStatusBadge = document.getElementById('sw-status-badge');
  const swScopeText = document.getElementById('sw-scope-text');
  const swStateText = document.getElementById('sw-state-text');
  const swControllerText = document.getElementById('sw-controller-text');

  if (!('serviceWorker' in navigator)) {
    logToConsole('error', 'El navegador no soporta Service Workers.');
    if (swStatusBadge) {
      swStatusBadge.textContent = 'No soportado';
      swStatusBadge.className = 'badge badge-error';
    }
    return;
  }

  try {
    logToConsole('info', 'Registrando Service Worker en "./sw.js"...');
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    state.swRegistration = registration;

    logToConsole('success', `Service Worker registrado con éxito en scope: ${registration.scope}`);

    if (swScopeText) swScopeText.textContent = registration.scope;

    // Determinar estado actual
    const sw = registration.active || registration.installing || registration.waiting;
    if (sw) {
      updateSwStateDisplay(sw.state);
      sw.addEventListener('statechange', (e) => {
        updateSwStateDisplay(e.target.state);
      });
    }

    if (navigator.serviceWorker.controller) {
      if (swControllerText) swControllerText.textContent = 'Activo y controlando la página';
      if (swStatusBadge) {
        swStatusBadge.textContent = 'Activo / Controlador';
        swStatusBadge.className = 'badge badge-success';
      }
    } else {
      if (swControllerText) swControllerText.textContent = 'Pendiente de primer reclamo (recargar)';
      if (swStatusBadge) {
        swStatusBadge.textContent = 'Instalado / Esperando';
        swStatusBadge.className = 'badge badge-warning';
      }
    }

    // Escuchar si un nuevo SW toma el control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logToConsole('success', '¡Un nuevo Service Worker ha tomado el control de esta página!');
      if (swControllerText) swControllerText.textContent = 'Activo y controlando la página';
      if (swStatusBadge) {
        swStatusBadge.textContent = 'Activo / Controlador';
        swStatusBadge.className = 'badge badge-success';
      }
      loadCacheStorageContents();
    });

    // Cargar contenido de la caché tras el registro
    setTimeout(loadCacheStorageContents, 600);

  } catch (error) {
    logToConsole('error', `Fallo al registrar Service Worker: ${error.message}`);
    if (swStatusBadge) {
      swStatusBadge.textContent = 'Error';
      swStatusBadge.className = 'badge badge-error';
    }
  }
}

function updateSwStateDisplay(stateName) {
  const swStateText = document.getElementById('sw-state-text');
  if (swStateText) {
    swStateText.textContent = stateName.toUpperCase();
  }
  logToConsole('info', `Estado del Service Worker actualizado a: ${stateName}`);
}

// ============================================================================
// 2. INSPECCIÓN EN TIEMPO REAL DE LA CACHE API
// ============================================================================
async function loadCacheStorageContents() {
  const tableBody = document.getElementById('cache-entries-body');
  const cacheCountBadge = document.getElementById('cache-count-badge');
  const cacheSizeBadge = document.getElementById('cache-size-badge');
  const cacheNameDisplay = document.getElementById('cache-name-display');

  if (!('caches' in window)) {
    logToConsole('error', 'Cache API no soportada en este entorno.');
    return;
  }

  try {
    const hasCache = await caches.has(CACHE_NAME);
    if (cacheNameDisplay) cacheNameDisplay.textContent = CACHE_NAME;

    if (!hasCache) {
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="table-empty">
              <div class="empty-state">
                <span class="empty-icon">📂</span>
                <p>La caché <code>${CACHE_NAME}</code> aún no ha sido creada o está vacía.</p>
                <button class="btn btn-sm btn-primary" onclick="reinstallAppShell()">Precachear App Shell Ahora</button>
              </div>
            </td>
          </tr>
        `;
      }
      if (cacheCountBadge) cacheCountBadge.textContent = '0 recursos';
      if (cacheSizeBadge) cacheSizeBadge.textContent = '0 KB';
      return;
    }

    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    state.cachedEntries = requests;

    if (cacheCountBadge) {
      cacheCountBadge.textContent = `${requests.length} recursos`;
      cacheCountBadge.className = 'badge badge-cyan';
    }

    if (!tableBody) return;

    if (requests.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="table-empty">
            <div class="empty-state">
              <span class="empty-icon">📦</span>
              <p>Caché abierta pero sin recursos almacenados.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = '';
    let totalApproxBytes = 0;

    for (const req of requests) {
      const response = await cache.match(req);
      const url = new URL(req.url);
      const pathname = url.pathname.split('/').pop() || './ (Raíz)';
      
      const contentType = response ? response.headers.get('content-type') || 'desconocido' : 'desconocido';
      const status = response ? `${response.status} ${response.statusText || 'OK'}` : 'N/A';
      
      let sizeText = 'Estimado';
      if (response) {
        const cloned = response.clone();
        const blob = await cloned.blob();
        totalApproxBytes += blob.size;
        sizeText = `${(blob.size / 1024).toFixed(1)} KB`;
      }

      // Identificar categoría del App Shell
      let categoryBadge = 'badge-blue';
      let icon = '📄';
      if (pathname.endsWith('.html') || pathname.includes('Raíz')) {
        categoryBadge = 'badge-indigo';
        icon = '🌐';
      } else if (pathname.endsWith('.css')) {
        categoryBadge = 'badge-cyan';
        icon = '🎨';
      } else if (pathname.endsWith('.js')) {
        categoryBadge = 'badge-amber';
        icon = '⚡';
      } else if (pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.svg')) {
        categoryBadge = 'badge-emerald';
        icon = '🖼️';
      } else if (pathname.endsWith('.json')) {
        categoryBadge = 'badge-purple';
        icon = '📋';
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="resource-cell">
            <span class="res-icon">${icon}</span>
            <div class="res-meta">
              <strong class="res-name">${pathname}</strong>
              <small class="res-url">${url.pathname}</small>
            </div>
          </div>
        </td>
        <td><span class="badge ${categoryBadge}">App Shell</span></td>
        <td><span class="badge badge-success">${status}</span></td>
        <td><code class="code-size">${sizeText}</code></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-xs btn-outline" onclick="previewCachedResource('${req.url}')">
              👁️ Ver
            </button>
            <button class="btn btn-xs btn-primary" onclick="testBenchmarkResource('${req.url}')">
              ⚡ Cache-First
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    }

    if (cacheSizeBadge) {
      cacheSizeBadge.textContent = `${(totalApproxBytes / 1024).toFixed(1)} KB`;
    }

    logToConsole('success', `Cache API sincronizada: ${requests.length} recursos inspeccionados con éxito.`);

  } catch (err) {
    logToConsole('error', `Error al inspeccionar Cache Storage: ${err.message}`);
  }
}

// ============================================================================
// 3. LABORATORIO INTERACTIVO DE ESTRATEGIA CACHE-FIRST (BENCHMARK)
// ============================================================================
async function testBenchmarkResource(targetUrl) {
  const resultPanel = document.getElementById('benchmark-result');
  const latencyDisplay = document.getElementById('res-latency');
  const sourceDisplay = document.getElementById('res-source');
  const statusDisplay = document.getElementById('res-status');
  const urlDisplay = document.getElementById('res-tested-url');
  const barProgress = document.getElementById('benchmark-bar');

  if (!targetUrl) {
    targetUrl = document.getElementById('benchmark-select')?.value || './style.css';
  }

  logToConsole('info', `Iniciando petición Cache-First hacia: ${targetUrl}`);

  if (resultPanel) resultPanel.classList.add('loading');

  const startTime = performance.now();

  try {
    const response = await fetch(targetUrl, {
      cache: 'default' // Deja que el Service Worker maneje la petición
    });
    
    const endTime = performance.now();
    const durationMs = (endTime - startTime).toFixed(1);

    const sourceHeader = response.headers.get('X-Resource-Source');
    const isCacheHit = sourceHeader === 'Cache-API-Storage' || durationMs < 25;

    // Actualizar UI
    if (resultPanel) resultPanel.classList.remove('loading');
    if (urlDisplay) urlDisplay.textContent = targetUrl;
    if (latencyDisplay) {
      latencyDisplay.textContent = `${durationMs} ms`;
      latencyDisplay.className = isCacheHit ? 'metric-val hit' : 'metric-val miss';
    }
    if (statusDisplay) statusDisplay.textContent = `${response.status} ${response.statusText}`;

    if (sourceDisplay) {
      if (isCacheHit) {
        sourceDisplay.innerHTML = `<span class="badge badge-emerald">⚡ CACHE HIT (Cache Storage)</span>`;
      } else {
        sourceDisplay.innerHTML = `<span class="badge badge-amber">🌐 NETWORK FALLBACK (Red Externa)</span>`;
      }
    }

    if (barProgress) {
      // Normalizar barra: si es < 10ms es mínima, si es red sube
      const pct = Math.min(100, Math.max(5, durationMs * 0.5));
      barProgress.style.width = `${pct}%`;
      barProgress.className = isCacheHit ? 'progress-bar bg-emerald' : 'progress-bar bg-amber';
    }

    // Registrar en historial
    addBenchmarkToHistory({
      url: targetUrl,
      duration: durationMs,
      hit: isCacheHit,
      timestamp: new Date().toLocaleTimeString()
    });

    logToConsole(
      isCacheHit ? 'success' : 'warn',
      `[Cache-First] ${targetUrl} completado en ${durationMs}ms -> ${isCacheHit ? '⚡ CACHE HIT' : '🌐 NETWORK'}`
    );

  } catch (err) {
    const endTime = performance.now();
    const durationMs = (endTime - startTime).toFixed(1);

    if (resultPanel) resultPanel.classList.remove('loading');
    if (urlDisplay) urlDisplay.textContent = targetUrl;
    if (latencyDisplay) latencyDisplay.textContent = `${durationMs} ms (Fallo)`;
    if (sourceDisplay) {
      sourceDisplay.innerHTML = `<span class="badge badge-error">❌ ERROR / DISPOSITIVO OFFLINE</span>`;
    }
    logToConsole('error', `Petición fallida para ${targetUrl}: ${err.message}`);
  }
}

function addBenchmarkToHistory(item) {
  state.benchmarkHistory.unshift(item);
  if (state.benchmarkHistory.length > 5) state.benchmarkHistory.pop();

  const historyContainer = document.getElementById('benchmark-history-list');
  if (!historyContainer) return;

  historyContainer.innerHTML = state.benchmarkHistory.map(b => `
    <div class="history-item">
      <div class="hist-left">
        <span class="${b.hit ? 'hist-icon hit' : 'hist-icon miss'}">${b.hit ? '⚡' : '🌐'}</span>
        <span class="hist-url">${b.url.split('/').pop() || b.url}</span>
      </div>
      <div class="hist-right">
        <span class="hist-time">${b.timestamp}</span>
        <strong class="${b.hit ? 'hist-latency hit' : 'hist-latency miss'}">${b.duration} ms</strong>
      </div>
    </div>
  `).join('');
}

// ============================================================================
// 4. PREVISUALIZADOR DE RECURSOS EN CACHÉ
// ============================================================================
async function previewCachedResource(url) {
  const modal = document.getElementById('preview-modal');
  const modalTitle = document.getElementById('modal-res-title');
  const modalBody = document.getElementById('modal-res-body');

  if (!modal || !modalBody) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);

    if (!response) {
      alert('Recurso no encontrado en la caché.');
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    modalTitle.textContent = url.split('/').pop() || url;

    if (contentType.includes('image')) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      modalBody.innerHTML = `
        <div class="image-preview-wrapper">
          <img src="${objectUrl}" alt="Preview" class="preview-img">
          <div class="preview-meta">
            <p><strong>Tipo:</strong> ${contentType}</p>
            <p><strong>Tamaño:</strong> ${(blob.size / 1024).toFixed(2)} KB</p>
          </div>
        </div>
      `;
    } else {
      const text = await response.text();
      const snippet = text.length > 3000 ? text.substring(0, 3000) + '\n\n... [Contenido truncado para previsualización]' : text;
      modalBody.innerHTML = `
        <div class="code-preview-wrapper">
          <div class="code-header">
            <span>${contentType}</span>
            <span>${text.length} caracteres</span>
          </div>
          <pre><code>${escapeHtml(snippet)}</code></pre>
        </div>
      `;
    }

    modal.classList.add('active');
  } catch (err) {
    logToConsole('error', `Error al previsualizar recurso: ${err.message}`);
  }
}

function closePreviewModal() {
  const modal = document.getElementById('preview-modal');
  if (modal) modal.classList.remove('active');
}

function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    }[s];
  });
}

// ============================================================================
// 5. ACCIONES DE MANTENIMIENTO DE CACHÉ
// ============================================================================
async function clearCacheStorage() {
  if (!confirm('¿Deseas purgar y vaciar la memoria caché de la Cache API?')) return;

  try {
    const deleted = await caches.delete(CACHE_NAME);
    if (deleted) {
      logToConsole('warn', `Memoria caché "${CACHE_NAME}" eliminada correctamente.`);
      await loadCacheStorageContents();
      showToast('Cache eliminada con éxito', 'warning');
    } else {
      logToConsole('info', 'No había caché para eliminar.');
    }
  } catch (err) {
    logToConsole('error', `Error al limpiar caché: ${err.message}`);
  }
}

async function reinstallAppShell() {
  logToConsole('info', 'Reinstalando recursos del App Shell en Cache API...');
  try {
    const cache = await caches.open(CACHE_NAME);
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

    await cache.addAll(APP_SHELL_ASSETS);
    logToConsole('success', '¡App Shell precacheado exitosamente de forma manual!');
    await loadCacheStorageContents();
    showToast('App Shell almacenado en caché', 'success');
  } catch (err) {
    logToConsole('error', `Error al precachear App Shell: ${err.message}`);
    showToast('Error al precachear', 'error');
  }
}

async function unregisterServiceWorker() {
  if (!confirm('¿Deseas desregistrar el Service Worker?')) return;

  if (state.swRegistration) {
    await state.swRegistration.unregister();
    logToConsole('warn', 'Service Worker desregistrado. La página volverá al comportamiento de red nativo.');
    showToast('Service Worker desregistrado', 'warning');
    setTimeout(() => window.location.reload(), 1000);
  }
}

// ============================================================================
// 6. ESTADO DE RED (ONLINE / OFFLINE)
// ============================================================================
function initNetworkListeners() {
  const netBadge = document.getElementById('network-status-badge');

  function updateNetworkState() {
    state.isOnline = navigator.onLine;
    if (netBadge) {
      if (state.isOnline) {
        netBadge.textContent = 'En Línea';
        netBadge.className = 'badge badge-success';
        logToConsole('info', 'Conexión a internet reestablecida (Online).');
      } else {
        netBadge.textContent = 'Sin Conexión (Offline)';
        netBadge.className = 'badge badge-error';
        logToConsole('warn', 'Dispositivo desconectado (Offline). Operando en modo Cache-First.');
      }
    }
  }

  window.addEventListener('online', updateNetworkState);
  window.addEventListener('offline', updateNetworkState);
  updateNetworkState();
}

function toggleSimulatedOffline() {
  state.simulatedOffline = !state.simulatedOffline;
  const btn = document.getElementById('btn-sim-offline');
  const banner = document.getElementById('offline-simulation-banner');

  if (state.simulatedOffline) {
    btn.textContent = 'Restaurar Red Simulada';
    btn.className = 'btn btn-sm btn-error';
    if (banner) banner.style.display = 'flex';
    logToConsole('warn', 'Modo offline simulado activado. El App Shell continuará respondiendo desde Cache API.');
  } else {
    btn.textContent = 'Simular Modo Offline';
    btn.className = 'btn btn-sm btn-outline';
    if (banner) banner.style.display = 'none';
    logToConsole('info', 'Modo offline simulado desactivado.');
  }
}

// ============================================================================
// 7. CONSOLA DE REGISTROS Y TOASTS EN PANTALLA
// ============================================================================
function logToConsole(type, message) {
  const consoleOutput = document.getElementById('live-console-output');
  if (!consoleOutput) return;

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  
  let prefix = 'ℹ️';
  if (type === 'success') prefix = '✅';
  if (type === 'warn') prefix = '⚠️';
  if (type === 'error') prefix = '❌';

  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-icon">${prefix}</span> <span class="log-msg">${escapeHtml(message)}</span>`;
  consoleOutput.appendChild(entry);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsoleLog() {
  const consoleOutput = document.getElementById('live-console-output');
  if (consoleOutput) consoleOutput.innerHTML = '';
}

function showToast(text, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 20);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================================================
// INICIALIZACIÓN GENERAL AL CARGAR DOM
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initNetworkListeners();

  // Cerrar modal con tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreviewModal();
  });
});

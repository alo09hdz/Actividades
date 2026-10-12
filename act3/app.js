/**
 * ============================================================================
 * Nexus Data - Controlador Principal del App Shell, SW & IndexedDB
 * ============================================================================
 */

let isSimulatedOffline = false;
let currentFilter = 'all';
let deferredInstallPrompt = null;

document.addEventListener('DOMContentLoaded', async () => {
  initServiceWorker();
  initNavigation();
  initNetworkListeners();
  initOfflineSimulation();
  initCacheStrategyTester();
  initIndexedDBManager();
  initSyncQueueManager();
  initStorageInspector();
  initInstallPrompt();
});

/* ==========================================================================
   1. REGISTRO Y MONITOREO DEL SERVICE WORKER
   ========================================================================== */
let swRegistration = null;

function initServiceWorker() {
  const swStateText = document.getElementById('metric-sw-state');
  const swStatusPillText = document.getElementById('sw-status-text');
  const btnForceUpdate = document.getElementById('btn-force-sw-update');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          swRegistration = reg;
          console.log('[SW Controller] Service Worker registrado. Ámbito:', reg.scope);

          updateSWState(reg);

          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            console.log('[SW Controller] Nueva versión de Service Worker detectada (installing)');
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  showToast('Nueva versión del Service Worker instalada (skipWaiting activo)', 'info');
                }
              }
            });
          });
        })
        .catch((err) => {
          console.error('[SW Controller] Error al registrar Service Worker:', err);
          if (swStateText) swStateText.textContent = 'Error Registro';
        });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Controller] El cliente ahora está controlado por el nuevo Service Worker activo');
      showToast('Service Worker activado y controlando solicitudes (clients.claim)', 'success');
      if (swStateText) swStateText.textContent = 'Activo & Controlando';
    });
  }

  function updateSWState(reg) {
    let state = 'Inactivo';
    if (reg.active) state = 'Activo (Active)';
    else if (reg.installing) state = 'Instalando...';
    else if (reg.waiting) state = 'En espera (Waiting)';

    if (swStateText) swStateText.textContent = state;
    if (swStatusPillText) swStatusPillText.textContent = `SW v3.0.0 (${state.split(' ')[0]})`;
  }

  if (btnForceUpdate) {
    btnForceUpdate.addEventListener('click', async () => {
      if (swRegistration) {
        showToast('Buscando actualizaciones de Service Worker...', 'info');
        await swRegistration.update();
        showToast('Service Worker verificado y actualizado', 'success');
      }
    });
  }
}

/* ==========================================================================
   2. NAVEGACIÓN ENTRE VISTAS DEL APP SHELL
   ========================================================================== */
function initNavigation() {
  const navLinks = document.querySelectorAll('[data-view]');
  const viewSections = document.querySelectorAll('.view-section');
  const breadcrumbCurrent = document.getElementById('header-current-view');
  
  const btnToggleMenu = document.getElementById('btn-toggle-menu');
  const appSidebar = document.getElementById('app-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  const viewTitles = {
    'sw-lifecycle': 'Ciclo de Vida del Service Worker',
    'cache-strategies': 'Estrategias de Caché',
    'indexeddb-crud': 'Gestor de Datos IndexedDB',
    'sync-queue': 'Cola de Sincronización',
    'storage-inspector': 'Visor de Almacenamiento'
  };

  function switchView(viewId) {
    if (!viewId) return;

    viewSections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');

    navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewId) link.classList.add('active');
      else link.classList.remove('active');
    });

    if (breadcrumbCurrent && viewTitles[viewId]) {
      breadcrumbCurrent.textContent = viewTitles[viewId];
    }

    if (appSidebar && appSidebar.classList.contains('open')) {
      appSidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    }

    if (viewId === 'storage-inspector') {
      renderCacheBuckets();
    }
    if (viewId === 'sync-queue') {
      renderSyncQueueView();
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = link.getAttribute('data-view');
      switchView(viewId);
      window.location.hash = viewId;
    });
  });

  // Botones de llamada a la acción en Hero
  const btnGotoStrategies = document.getElementById('btn-goto-strategies');
  if (btnGotoStrategies) {
    btnGotoStrategies.addEventListener('click', () => switchView('cache-strategies'));
  }

  const btnGotoIndexedDB = document.getElementById('btn-goto-indexeddb');
  if (btnGotoIndexedDB) {
    btnGotoIndexedDB.addEventListener('click', () => switchView('indexeddb-crud'));
  }

  // Drawer Móvil
  if (btnToggleMenu) {
    btnToggleMenu.addEventListener('click', () => {
      appSidebar.classList.toggle('open');
      sidebarBackdrop.classList.toggle('active');
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      appSidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  const hash = window.location.hash.replace('#', '');
  if (hash && viewTitles[hash]) {
    switchView(hash);
  }
}

/* ==========================================================================
   3. GESTIÓN DE CONECTIVIDAD (ONLINE / OFFLINE) & SIMULADOR
   ========================================================================== */
function initNetworkListeners() {
  window.addEventListener('online', () => {
    if (!isSimulatedOffline) {
      handleOnlineState();
    }
  });

  window.addEventListener('offline', () => {
    handleOfflineState();
  });
}

function handleOnlineState() {
  const netDot = document.getElementById('net-indicator-dot');
  const netText = document.getElementById('net-status-text');
  const banner = document.getElementById('offline-banner');

  if (netDot) {
    netDot.classList.remove('offline');
    netDot.classList.add('online');
  }
  if (netText) netText.textContent = 'Online';
  if (banner) banner.classList.remove('active');

  showToast('Conexión reanudada: Sincronizando registros pendientes...', 'success');
  // Auto-sincronización con el servidor
  triggerBackgroundSync();
}

function handleOfflineState() {
  const netDot = document.getElementById('net-indicator-dot');
  const netText = document.getElementById('net-status-text');
  const banner = document.getElementById('offline-banner');

  if (netDot) {
    netDot.classList.remove('online');
    netDot.classList.add('offline');
  }
  if (netText) netText.textContent = 'Offline (IndexedDB)';
  if (banner) banner.classList.add('active');

  showToast('Modo sin conexión: IndexedDB y Caché asegurando persistencia', 'warning');
}

function initOfflineSimulation() {
  const btnSim = document.getElementById('btn-toggle-sim-offline');
  const btnText = document.getElementById('sim-offline-btn-text');

  if (btnSim) {
    btnSim.addEventListener('click', () => {
      isSimulatedOffline = !isSimulatedOffline;

      if (isSimulatedOffline) {
        btnSim.classList.add('active');
        if (btnText) btnText.textContent = 'Restaurar Online';
        handleOfflineState();
      } else {
        btnSim.classList.remove('active');
        if (btnText) btnText.textContent = 'Simular Offline';
        if (navigator.onLine) {
          handleOnlineState();
        }
      }
    });
  }
}

/* ==========================================================================
   4. COMPARADOR DE ESTRATEGIAS DE CACHÉ
   ========================================================================== */
function initCacheStrategyTester() {
  const btnTestCacheFirst = document.getElementById('btn-test-cache-first');
  const btnTestNetworkFirst = document.getElementById('btn-test-network-first');

  // Test A: Cache-First
  if (btnTestCacheFirst) {
    btnTestCacheFirst.addEventListener('click', async () => {
      const sourceEl = document.getElementById('cf-source');
      const timeEl = document.getElementById('cf-time');
      sourceEl.textContent = 'Consultando...';
      timeEl.textContent = '...';

      const startTime = performance.now();
      try {
        const response = await fetch('./style.css');
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        timeEl.textContent = `${duration} ms`;
        if (duration < 30) {
          sourceEl.innerHTML = '<span style="color:#34d399;">⚡ CACHE STORAGE (Cache-First)</span>';
        } else {
          sourceEl.innerHTML = '<span style="color:#60a5fa;">🌐 RED / CACHÉ ACTUALIZADA</span>';
        }
        showToast(`Cache-First verificado en ${duration}ms`, 'success');
      } catch (err) {
        sourceEl.textContent = 'Error en petición';
      }
    });
  }

  // Test B: Network-First
  if (btnTestNetworkFirst) {
    btnTestNetworkFirst.addEventListener('click', async () => {
      const sourceEl = document.getElementById('nf-source');
      const timeEl = document.getElementById('nf-time');
      const contentEl = document.getElementById('nf-content');

      sourceEl.textContent = 'Consultando endpoint dinámico...';
      timeEl.textContent = '...';
      contentEl.textContent = '...';

      const isOfflineNow = !navigator.onLine || isSimulatedOffline;
      const targetUrl = isOfflineNow 
        ? '/api/feed?dynamic=1&force_offline=1' 
        : `/api/feed?dynamic=1&t=${Date.now()}`;

      const startTime = performance.now();
      try {
        // Si estamos simulando offline, forzamos un fallo de red para ver el fallback del SW
        let response;
        if (isSimulatedOffline) {
          // Intentar un URL que active el catch o fallback del Service Worker
          response = await caches.match('/api/feed') || await fetch('/api/feed?dynamic=1');
        } else {
          response = await fetch(targetUrl);
        }

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        const data = await response.json();

        timeEl.textContent = `${duration} ms`;

        if (response.headers.get('X-Offline-Fallback') === 'true' || isOfflineNow || data.status === 'offline') {
          sourceEl.innerHTML = '<span style="color:#fbbf24;">💾 CACHE FALLBACK (Modo Offline)</span>';
          contentEl.textContent = `Timestamp: ${data.timestamp || 'Fallback'} | Status: ${data.status || 'offline'}`;
          showToast('Network-First: Red no disponible, servido desde Caché Fallback', 'warning');
        } else {
          sourceEl.innerHTML = '<span style="color:#34d399;">🌐 SERVIDOR EN VIVO (Network-First)</span>';
          contentEl.textContent = `Server Time: ${data.serverTime || new Date().toISOString()}`;
          showToast(`Network-First: Datos frescos de red recibidos (${duration}ms)`, 'success');
        }
      } catch (err) {
        sourceEl.innerHTML = '<span style="color:#f87171;">Fallo de red sin fallback previo</span>';
        contentEl.textContent = err.message;
      }
    });
  }
}

/* ==========================================================================
   5. GESTOR DE DATOS CON INDEXEDDB (CRUD COMPLETO)
   ========================================================================== */
async function initIndexedDBManager() {
  const formNewRecord = document.getElementById('form-new-record');
  const filterPills = document.querySelectorAll('.filter-pill');
  const btnSeedData = document.getElementById('btn-seed-data');

  // Inicializar DB y sembrar datos si está vacía
  await window.nexusDB.initDB();
  await window.nexusDB.seedInitialDataIfEmpty();
  await refreshRecordsView();

  // Envío del Formulario
  if (formNewRecord) {
    formNewRecord.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('record-title');
      const categorySelect = document.getElementById('record-category');
      const prioritySelect = document.getElementById('record-priority');
      const descInput = document.getElementById('record-desc');

      const isOffline = !navigator.onLine || isSimulatedOffline;

      const newRecord = {
        title: titleInput.value.trim(),
        category: categorySelect.value,
        priority: prioritySelect.value,
        description: descInput.value.trim(),
        syncStatus: isOffline ? 'pending' : 'synced'
      };

      try {
        await window.nexusDB.addItem(newRecord);
        formNewRecord.reset();
        await refreshRecordsView();
        
        if (isOffline) {
          showToast('Registro guardado en IndexedDB (Estado: Pendiente de sincronizar)', 'warning');
        } else {
          showToast('Registro guardado y sincronizado con éxito', 'success');
        }
      } catch (err) {
        console.error('Error al insertar en IndexedDB:', err);
        showToast('Error al persistir registro en IndexedDB', 'error');
      }
    });
  }

  // Filtros de categoría
  filterPills.forEach(pill => {
    pill.addEventListener('click', async () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      await refreshRecordsView();
    });
  });

  // Botón sembrar datos
  if (btnSeedData) {
    btnSeedData.addEventListener('click', async () => {
      await window.nexusDB.seedInitialDataIfEmpty();
      await refreshRecordsView();
      showToast('Registros demo sembrados en IndexedDB', 'success');
    });
  }
}

async function refreshRecordsView() {
  const container = document.getElementById('records-list-container');
  const counterText = document.getElementById('records-counter-text');
  const sidebarDbCount = document.getElementById('sidebar-db-count');
  const metricDbCount = document.getElementById('metric-db-count');
  const sidebarPendingBadge = document.getElementById('sidebar-pending-badge');

  if (!container) return;

  const items = await window.nexusDB.getAllItems(currentFilter);
  const metrics = await window.nexusDB.getMetrics();

  // Actualizar contadores
  if (counterText) counterText.textContent = `${items.length} registro(s) mostrados (Total: ${metrics.total})`;
  if (sidebarDbCount) sidebarDbCount.textContent = `${metrics.total} items`;
  if (metricDbCount) metricDbCount.textContent = `${metrics.total} Items`;
  if (sidebarPendingBadge) {
    sidebarPendingBadge.textContent = `${metrics.pendingCount} pend.`;
    sidebarPendingBadge.style.display = metrics.pendingCount > 0 ? 'inline-block' : 'none';
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px; color: var(--text-dim);">
        <p>No hay registros para la categoría seleccionada.</p>
        <p style="font-size: 0.8rem; margin-top: 6px;">Crea uno nuevo mediante el formulario lateral.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="record-card" data-id="${item.id}">
      <div class="record-header">
        <span class="record-title">${escapeHTML(item.title)}</span>
        <div class="record-badges">
          <span class="badge-category">${item.category}</span>
          <span class="badge-status ${item.syncStatus}">
            ${item.syncStatus === 'synced' ? '✓ Sincronizado' : '⏳ Offline / Pendiente'}
          </span>
        </div>
      </div>
      <p class="record-desc">${escapeHTML(item.description || 'Sin descripción detallada.')}</p>
      <div class="record-footer">
        <span>Creado: ${new Date(item.createdAt).toLocaleString()} | Prioridad: ${item.priority}</span>
        <button class="record-delete-btn" onclick="deleteRecord('${item.id}')">Eliminar</button>
      </div>
    </div>
  `).join('');
}

// Función global para eliminar registro
window.deleteRecord = async function(id) {
  if (confirm('¿Deseas eliminar este registro de IndexedDB?')) {
    await window.nexusDB.deleteItem(id);
    await refreshRecordsView();
    showToast('Registro eliminado de IndexedDB', 'info');
  }
};

/* ==========================================================================
   6. COLA DE SINCRONIZACIÓN (OFFLINE SYNC)
   ========================================================================== */
function initSyncQueueManager() {
  const btnSyncNow = document.getElementById('btn-sync-now');

  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', async () => {
      if (!navigator.onLine || isSimulatedOffline) {
        showToast('No es posible sincronizar: el dispositivo continúa sin conexión', 'warning');
        return;
      }
      await triggerBackgroundSync();
    });
  }
}

async function renderSyncQueueView() {
  const items = await window.nexusDB.getAllItems();
  const pending = items.filter(i => i.syncStatus === 'pending');

  const titleEl = document.getElementById('sync-banner-title');
  const descEl = document.getElementById('sync-banner-desc');
  const symbolEl = document.getElementById('sync-icon-symbol');
  const container = document.getElementById('pending-items-container');

  if (!titleEl || !container) return;

  if (pending.length === 0) {
    titleEl.textContent = '0 Elementos Pendientes';
    descEl.textContent = 'Todos los registros de IndexedDB están sincronizados con el servidor central.';
    symbolEl.textContent = '✅';
    container.innerHTML = '<p style="color:var(--text-dim); font-size:0.85rem; padding: 12px;">No hay transacciones encoladas.</p>';
  } else {
    titleEl.textContent = `${pending.length} Elemento(s) Pendientes de Sincronización`;
    descEl.textContent = 'Registros generados en modo desconectado listos para propagarse a la API.';
    symbolEl.textContent = '⏳';

    container.innerHTML = pending.map(item => `
      <div class="record-card" style="border-color: rgba(245, 158, 11, 0.4);">
        <div class="record-header">
          <strong style="color:#fbbf24;">${escapeHTML(item.title)}</strong>
          <span class="badge-status pending">Pendiente</span>
        </div>
        <p class="record-desc">${escapeHTML(item.description)}</p>
      </div>
    `).join('');
  }
}

async function triggerBackgroundSync() {
  const items = await window.nexusDB.getAllItems();
  const pending = items.filter(i => i.syncStatus === 'pending');

  if (pending.length === 0) {
    showToast('No hay registros pendientes de sincronizar', 'info');
    return;
  }

  showToast(`Sincronizando ${pending.length} registro(s) con el servidor...`, 'info');

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending)
    });

    if (response.ok) {
      await window.nexusDB.syncPendingItems();
      await refreshRecordsView();
      await renderSyncQueueView();
      showToast('¡Sincronización completada exitosamente!', 'success');
    } else {
      throw new Error('Servidor retornó error en sync');
    }
  } catch (err) {
    console.warn('[Sync] Fallo en la comunicación con /api/sync:', err);
    showToast('No se pudo contactar al servidor. Los datos permanecen seguros en IndexedDB.', 'warning');
  }
}

/* ==========================================================================
   7. INSPECTOR DE ALMACENAMIENTO (CACHE API & ESTIMATE)
   ========================================================================== */
function initStorageInspector() {
  const btnRefresh = document.getElementById('btn-refresh-cache-list');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      renderCacheBuckets();
      showToast('Listado de Cache Storage actualizado', 'info');
    });
  }

  // Estimar cuota de almacenamiento
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const fillBar = document.getElementById('storage-meter-fill');
      if (fillBar && quota) {
        const percent = Math.min(100, Math.max(8, Math.round((usage / quota) * 100)));
        fillBar.style.width = `${percent}%`;
      }
    });
  }
}

async function renderCacheBuckets() {
  const container = document.getElementById('cache-buckets-container');
  if (!container) return;

  if (!('caches' in window)) {
    container.innerHTML = '<p>Cache API no soportada en este entorno.</p>';
    return;
  }

  const keys = await caches.keys();
  if (keys.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim);">No hay cachés registradas actualmente.</p>';
    return;
  }

  const bucketCards = await Promise.all(keys.map(async (key) => {
    const cache = await caches.open(key);
    const requests = await cache.keys();
    return `
      <div class="cache-bucket-card">
        <span class="bucket-name">${key}</span>
        <span class="bucket-entries-count">${requests.length} recursos almacenados</span>
        <button class="btn btn-sm btn-secondary" onclick="purgeCacheKey('${key}')">
          Vaciar Esta Caché
        </button>
      </div>
    `;
  }));

  container.innerHTML = bucketCards.join('');
}

window.purgeCacheKey = async function(key) {
  if (confirm(`¿Deseas eliminar la caché '${key}'?`)) {
    await caches.delete(key);
    await renderCacheBuckets();
    showToast(`Caché '${key}' eliminada`, 'info');
  }
};

/* ==========================================================================
   8. PWA INSTALL PROMPT
   ========================================================================== */
function initInstallPrompt() {
  const btnInstall = document.getElementById('btn-install-pwa');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstall) btnInstall.style.display = 'inline-flex';
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(() => {
          deferredInstallPrompt = null;
        });
      } else {
        showToast('Para instalar: Usa el menú del navegador o Chrome DevTools > Application', 'info');
      }
    });
  }
}

/* ==========================================================================
   UTILIDADES
   ========================================================================== */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

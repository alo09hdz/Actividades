/**
 * ============================================================================
 * Nexus Shell - App Shell Controller & Native Splash Screen Simulator
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicialización de subsistemas
  initServiceWorker();
  initNavigation();
  initNetworkStatus();
  initInstallPrompt();
  initShellHighlighter();
  initDevToolsChecker();
  initSplashSimulator();
  initSkeletonFeed();
  loadManifestCode();
});

/* ==========================================================================
   1. REGISTRO Y MONITOREO DEL SERVICE WORKER
   ========================================================================== */
function initServiceWorker() {
  const swStatusLabel = document.getElementById('sw-status-label');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('[App Shell] Service Worker registrado con éxito. Ámbito:', registration.scope);
          if (swStatusLabel) {
            swStatusLabel.textContent = 'Activo & Precaching';
            swStatusLabel.style.color = '#34d399';
          }
        })
        .catch((error) => {
          console.warn('[App Shell] Fallo al registrar Service Worker:', error);
          if (swStatusLabel) {
            swStatusLabel.textContent = 'No registrado';
            swStatusLabel.style.color = '#f87171';
          }
        });
    });
  } else {
    if (swStatusLabel) {
      swStatusLabel.textContent = 'No soportado';
    }
  }
}

/* ==========================================================================
   2. NAVEGACIÓN Y ENRUTAMIENTO DEL APP SHELL
   ========================================================================== */
function initNavigation() {
  const navLinks = document.querySelectorAll('[data-view]');
  const viewSections = document.querySelectorAll('.view-section');
  const breadcrumbCurrent = document.getElementById('header-current-view');
  
  // Mobile drawer controls
  const btnToggleMenu = document.getElementById('btn-toggle-menu');
  const appSidebar = document.getElementById('app-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  const viewNames = {
    'dashboard': 'Dashboard Shell',
    'skeleton': 'Simulador Skeleton UI',
    'splash': 'Splash Screen Nativa',
    'devtools': 'Verificador Chrome DevTools',
    'manifest-code': 'Manifest JSON'
  };

  function switchView(viewId) {
    if (!viewId) return;

    // Actualizar secciones
    viewSections.forEach((section) => {
      section.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Actualizar enlaces de navegación (Sidebar & Bottom Nav)
    navLinks.forEach((link) => {
      if (link.getAttribute('data-view') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Actualizar breadcrumb
    if (breadcrumbCurrent && viewNames[viewId]) {
      breadcrumbCurrent.textContent = viewNames[viewId];
    }

    // Cerrar sidebar en móvil si está abierto
    if (appSidebar && appSidebar.classList.contains('open')) {
      closeMobileMenu();
    }

    // Si entramos a Splash, enfocar o disparar animación si corresponde
    if (viewId === 'splash') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = link.getAttribute('data-view');
      switchView(viewId);
      window.location.hash = viewId;
    });
  });

  // Botones de acción rápida en Dashboard
  const btnGotoDevtools = document.getElementById('btn-goto-devtools');
  if (btnGotoDevtools) {
    btnGotoDevtools.addEventListener('click', () => switchView('devtools'));
  }

  const btnGotoSplash = document.getElementById('btn-goto-splash');
  if (btnGotoSplash) {
    btnGotoSplash.addEventListener('click', () => {
      switchView('splash');
      setTimeout(() => runSplashSimulation(), 300);
    });
  }

  const btnQuickSplash = document.getElementById('btn-quick-splash');
  if (btnQuickSplash) {
    btnQuickSplash.addEventListener('click', () => {
      switchView('splash');
      setTimeout(() => runSplashSimulation(), 300);
    });
  }

  // Mobile drawer events
  function openMobileMenu() {
    appSidebar.classList.add('open');
    sidebarBackdrop.classList.add('active');
  }

  function closeMobileMenu() {
    appSidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('active');
  }

  if (btnToggleMenu) {
    btnToggleMenu.addEventListener('click', () => {
      if (appSidebar.classList.contains('open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeMobileMenu);
  }

  // Leer hash de URL al cargar
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && viewNames[initialHash]) {
    switchView(initialHash);
  }
}

/* ==========================================================================
   3. ESTADO DE RED EN VIVO (ONLINE / OFFLINE)
   ========================================================================== */
function initNetworkStatus() {
  const statusDot = document.querySelector('.status-indicator-dot');
  const statusText = document.getElementById('network-status-text');

  function updateStatus() {
    if (navigator.onLine) {
      statusDot.classList.remove('offline');
      statusDot.classList.add('online');
      statusText.textContent = 'Online';
      showToast('Conectado a Internet - App Shell sincronizado', 'success');
    } else {
      statusDot.classList.remove('online');
      statusDot.classList.add('offline');
      statusText.textContent = 'Offline (Caché)';
      showToast('Modo Offline: Operando 100% desde caché del App Shell', 'warning');
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
}

/* ==========================================================================
   4. CONTROLADOR DEL PROMPT DE INSTALACIÓN (beforeinstallprompt)
   ========================================================================== */
let deferredInstallPrompt = null;

function initInstallPrompt() {
  const btnInstall = document.getElementById('btn-install-pwa');
  const modalBackdrop = document.getElementById('install-modal-backdrop');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');
  const btnTriggerInstallModal = document.getElementById('btn-trigger-install-modal');
  const btnDtSimulateInstall = document.getElementById('btn-dt-simulate-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] Evento beforeinstallprompt capturado');
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstall) {
      btnInstall.style.display = 'inline-flex';
    }
  });

  function openInstallModal() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          showToast('¡Instalación iniciada! Se agregará el icono con Splash Screen', 'success');
        }
        deferredInstallPrompt = null;
      });
    } else {
      // Mostrar modal simulado explicativo
      modalBackdrop.classList.add('show');
    }
  }

  function closeInstallModal() {
    modalBackdrop.classList.remove('show');
  }

  if (btnInstall) {
    btnInstall.addEventListener('click', openInstallModal);
  }

  if (btnTriggerInstallModal) {
    btnTriggerInstallModal.addEventListener('click', openInstallModal);
  }

  if (btnDtSimulateInstall) {
    btnDtSimulateInstall.addEventListener('click', openInstallModal);
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeInstallModal);
  if (btnModalCancel) btnModalCancel.addEventListener('click', closeInstallModal);
  
  if (btnModalConfirm) {
    btnModalConfirm.addEventListener('click', () => {
      closeInstallModal();
      showToast('Simulando instalación nativa... Verifica en DevTools > Application', 'success');
      // Redirigir a simulador de splash para ver cómo arrancará
      const splashTab = document.querySelector('[data-view="splash"]');
      if (splashTab) splashTab.click();
      setTimeout(() => runSplashSimulation(), 400);
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Aplicación instalada exitosamente en el dispositivo');
    showToast('¡Nexus Shell instalado! Ya cuenta con Splash Screen nativa', 'success');
    deferredInstallPrompt = null;
  });
}

/* ==========================================================================
   5. RESALTADOR DE COMPONENTES DEL APP SHELL
   ========================================================================== */
function initShellHighlighter() {
  const btnHighlight = document.getElementById('btn-highlight-shell');
  const wireframeContainer = document.getElementById('wireframe-container');
  let isHighlighted = false;

  if (btnHighlight && wireframeContainer) {
    btnHighlight.addEventListener('click', () => {
      isHighlighted = !isHighlighted;
      if (isHighlighted) {
        wireframeContainer.classList.add('highlight-shell-mode');
        btnHighlight.textContent = 'Desactivar Resaltado';
        btnHighlight.classList.remove('btn-secondary');
        btnHighlight.classList.add('btn-primary');
        showToast('Partes inmutables del App Shell resaltadas en neón', 'info');
      } else {
        wireframeContainer.classList.remove('highlight-shell-mode');
        btnHighlight.textContent = 'Resaltar Partes del App Shell';
        btnHighlight.classList.remove('btn-primary');
        btnHighlight.classList.add('btn-secondary');
      }
    });
  }
}

/* ==========================================================================
   6. VERIFICADOR EN TIEMPO REAL DE CRITERIOS DEVTOOLS & SPLASH SCREEN
   ========================================================================== */
function initDevToolsChecker() {
  const btnRecheck = document.getElementById('btn-recheck-criteria');

  function auditCriteria() {
    fetch('manifest.json')
      .then(response => response.json())
      .then(manifest => {
        let passedCount = 0;

        // 1. Manifest link
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) passedCount++;

        // 2. Name / short_name
        if (manifest.name || manifest.short_name) passedCount++;

        // 3. background_color
        if (manifest.background_color) passedCount++;

        // 4. theme_color
        if (manifest.theme_color) passedCount++;

        // 5. Icons
        const has192 = manifest.icons && manifest.icons.some(i => i.sizes === '192x192');
        const has512 = manifest.icons && manifest.icons.some(i => i.sizes === '512x512');
        if (has192 && has512) passedCount++;

        // 6. Display standalone
        if (manifest.display === 'standalone' || manifest.display === 'fullscreen') passedCount++;

        // 7. Service Worker
        if ('serviceWorker' in navigator) passedCount++;

        const criteriaBadge = document.getElementById('criteria-count-badge');
        if (criteriaBadge) {
          criteriaBadge.textContent = `${passedCount} / 7 Cumplidos`;
        }

        showToast(`Auditoría completada: ${passedCount}/7 requisitos de Splash Screen validados`, 'success');
      })
      .catch(err => {
        console.error('Error al auditar manifest.json:', err);
      });
  }

  if (btnRecheck) {
    btnRecheck.addEventListener('click', auditCriteria);
  }

  // Ejecutar auditoría inicial
  auditCriteria();
}

/* ==========================================================================
   7. SIMULADOR VISUAL DE SPLASH SCREEN NATIVA EN SMARTPHONE
   ========================================================================== */
let splashTimer = null;

function initSplashSimulator() {
  const simAppIcon = document.getElementById('sim-app-icon');
  const btnRunSimulation = document.getElementById('btn-run-simulation');
  const btnResetSimulation = document.getElementById('btn-reset-simulation');

  if (simAppIcon) {
    simAppIcon.addEventListener('click', () => {
      runSplashSimulation();
    });
  }

  if (btnRunSimulation) {
    btnRunSimulation.addEventListener('click', () => {
      runSplashSimulation();
    });
  }

  if (btnResetSimulation) {
    btnResetSimulation.addEventListener('click', () => {
      resetSplashSimulation();
    });
  }
}

function runSplashSimulation() {
  const stateHome = document.getElementById('phone-state-home');
  const stateSplash = document.getElementById('phone-state-splash');
  const stateShell = document.getElementById('phone-state-shell');
  const delaySelect = document.getElementById('splash-delay-select');
  const duration = parseInt(delaySelect ? delaySelect.value : 2500, 10);

  if (splashTimer) clearTimeout(splashTimer);

  // 1. Ocultar Home y activar Splash Screen nativa
  stateHome.classList.remove('active');
  stateShell.classList.remove('active');
  stateSplash.classList.add('active');

  showToast(`Iniciando Splash Screen nativa (${duration / 1000}s)...`, 'info');

  // 2. Transición hacia el App Shell
  splashTimer = setTimeout(() => {
    stateSplash.classList.remove('active');
    stateShell.classList.add('active');
    showToast('Splash finalizada: App Shell cargado en 0ms', 'success');
  }, duration);
}

function resetSplashSimulation() {
  if (splashTimer) clearTimeout(splashTimer);
  const stateHome = document.getElementById('phone-state-home');
  const stateSplash = document.getElementById('phone-state-splash');
  const stateShell = document.getElementById('phone-state-shell');

  stateSplash.classList.remove('active');
  stateShell.classList.remove('active');
  stateHome.classList.add('active');
  showToast('Simulador devuelto a Pantalla de Inicio', 'info');
}

/* ==========================================================================
   8. SKELETON UI & HIDRATACIÓN DINÁMICA DE DATOS
   ========================================================================== */
function initSkeletonFeed() {
  const wrapper = document.getElementById('dynamic-content-wrapper');
  const btnReload = document.getElementById('btn-reload-dynamic-data');

  const sampleModules = [
    {
      title: 'Módulo de Caché & Service Worker v2',
      desc: 'Estrategia Cache-First activa sobre los archivos del App Shell (index.html, style.css, app.js). Los recursos se sirven sin latencia de red.',
      time: 'Hace 2 minutos',
      tags: ['App Shell', 'Cache-First', '0ms'],
      avatar: '⚡'
    },
    {
      title: 'Splash Screen Nativa de Android Chromium',
      desc: 'Generación por parte del sistema operativo: Fondo #0a0f1d, icono maskable 512x512 y barra de estado #6366f1.',
      time: 'Hace 5 minutos',
      tags: ['Manifest', 'Splash', 'Chromium'],
      avatar: '📱'
    },
    {
      title: 'Verificador de Instalación en Chrome DevTools',
      desc: 'Pestaña Application > Manifest validada para disparo de beforeinstallprompt y auditoría Lighthouse con 100% de cumplimiento.',
      time: 'Hace 12 minutos',
      tags: ['DevTools', 'Application', 'Lighthouse'],
      avatar: '🛠️'
    }
  ];

  function renderSkeletons() {
    wrapper.innerHTML = `
      <div class="skeleton-feed-card">
        <div class="sk-avatar pulse-shimmer"></div>
        <div class="sk-body">
          <div class="sk-line-title pulse-shimmer"></div>
          <div class="sk-line-text pulse-shimmer"></div>
          <div class="sk-line-text-short pulse-shimmer"></div>
        </div>
      </div>
      <div class="skeleton-feed-card">
        <div class="sk-avatar pulse-shimmer"></div>
        <div class="sk-body">
          <div class="sk-line-title pulse-shimmer"></div>
          <div class="sk-line-text pulse-shimmer"></div>
          <div class="sk-line-text-short pulse-shimmer"></div>
        </div>
      </div>
      <div class="skeleton-feed-card">
        <div class="sk-avatar pulse-shimmer"></div>
        <div class="sk-body">
          <div class="sk-line-title pulse-shimmer"></div>
          <div class="sk-line-text pulse-shimmer"></div>
          <div class="sk-line-text-short pulse-shimmer"></div>
        </div>
      </div>
    `;
  }

  function renderData() {
    wrapper.innerHTML = sampleModules.map(item => `
      <div class="data-feed-card">
        <div class="data-avatar">${item.avatar}</div>
        <div class="data-body">
          <div class="data-header">
            <span class="data-title">${item.title}</span>
            <span class="data-time">${item.time}</span>
          </div>
          <p class="data-desc">${item.desc}</p>
          <div class="data-tags">
            ${item.tags.map(t => `<span class="data-tag">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  function simulateHydration() {
    renderSkeletons();
    if (btnReload) btnReload.disabled = true;

    setTimeout(() => {
      renderData();
      if (btnReload) btnReload.disabled = false;
      showToast('Datos dinámicos hidratados sobre el App Shell sin parpadeos', 'success');
    }, 1200);
  }

  if (btnReload) {
    btnReload.addEventListener('click', simulateHydration);
  }

  // Render inicial con hidratación
  simulateHydration();
}

/* ==========================================================================
   9. VISOR DEL MANIFIESTO EN VIVO
   ========================================================================== */
function loadManifestCode() {
  const codeDisplay = document.getElementById('code-manifest-display');
  if (!codeDisplay) return;

  fetch('manifest.json')
    .then(res => res.text())
    .then(text => {
      codeDisplay.textContent = text;
    })
    .catch(() => {
      codeDisplay.textContent = 'Error al cargar manifest.json';
    });
}

/* ==========================================================================
   10. SISTEMA DE NOTIFICACIONES TOAST FLOTANTES
   ========================================================================== */
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

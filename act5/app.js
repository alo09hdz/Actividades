/**
 * ============================================================================
 * ACTIVIDAD 5: Cliente Web - Monitor del Interceptor & Banco de Pruebas Offline
 * ============================================================================
 * Registra el Service Worker, monitorea el estado de red y proporciona un
 * entorno interactivo para probar la intercepción de peticiones y renderizado
 * de la plantilla 'offline.html' cuando la red falla.
 */

const state = {
  swRegistration: null,
  isOnline: navigator.onLine,
  simulatedOffline: false,
  interceptedCount: 0
};

// ============================================================================
// 1. REGISTRO Y GESTIÓN DEL SERVICE WORKER
// ============================================================================
async function initServiceWorker() {
  const swBadge = document.getElementById('sw-status-badge');
  const swStateVal = document.getElementById('sw-state-val');
  const swScopeVal = document.getElementById('sw-scope-val');

  if (!('serviceWorker' in navigator)) {
    logToConsole('error', 'El navegador no soporta Service Workers.');
    if (swBadge) {
      swBadge.className = 'badge badge-error';
      swBadge.textContent = 'No soportado';
    }
    return;
  }

  try {
    logToConsole('info', 'Registrando Service Worker en "./sw.js"...');
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    state.swRegistration = reg;

    logToConsole('success', `Service Worker registrado con éxito en scope: ${reg.scope}`);
    if (swScopeVal) swScopeVal.textContent = reg.scope;

    const currentSw = reg.active || reg.installing || reg.waiting;
    if (currentSw) {
      updateSwState(currentSw.state);
      currentSw.addEventListener('statechange', (e) => {
        updateSwState(e.target.state);
      });
    }

    if (navigator.serviceWorker.controller) {
      if (swBadge) {
        swBadge.className = 'badge badge-success';
        swBadge.textContent = 'Activo / Controlador';
      }
    } else {
      if (swBadge) {
        swBadge.className = 'badge badge-warning';
        swBadge.textContent = 'Instalado / Esperando reclamo';
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logToConsole('success', 'El Service Worker ha tomado el control activo de la página.');
      if (swBadge) {
        swBadge.className = 'badge badge-success';
        swBadge.textContent = 'Activo / Controlador';
      }
      if (swStateVal) swStateVal.textContent = 'ACTIVO (CONTROLLING)';
    });

  } catch (err) {
    logToConsole('error', `Error al registrar Service Worker: ${err.message}`);
    if (swBadge) {
      swBadge.className = 'badge badge-error';
      swBadge.textContent = 'Error';
    }
  }
}

function updateSwState(status) {
  const swStateVal = document.getElementById('sw-state-val');
  if (swStateVal) swStateVal.textContent = status.toUpperCase();
  logToConsole('info', `Estado del Service Worker: ${status}`);
}

// ============================================================================
// 2. MONITOREO DE CONECTIVIDAD DE RED (ONLINE / OFFLINE)
// ============================================================================
function initNetworkMonitoring() {
  const netBadge = document.getElementById('network-status-badge');
  const netStateVal = document.getElementById('net-state-val');

  function update() {
    state.isOnline = navigator.onLine;
    if (state.isOnline) {
      if (netBadge) {
        netBadge.className = 'badge badge-success';
        netBadge.innerHTML = '<span class="pulse-dot"></span> En Línea (Online)';
      }
      if (netStateVal) {
        netStateVal.textContent = 'CONECTADO A INTERNET';
        netStateVal.style.color = '#10b981';
      }
      logToConsole('success', 'Evento [online]: Conexión a red reestablecida.');
    } else {
      if (netBadge) {
        netBadge.className = 'badge badge-error';
        netBadge.innerHTML = '<span class="pulse-dot"></span> Sin Conexión (Offline)';
      }
      if (netStateVal) {
        netStateVal.textContent = 'MODO SIN CONEXIÓN (OFFLINE)';
        netStateVal.style.color = '#f43f5e';
      }
      logToConsole('warn', 'Evento [offline]: Conexión perdida. Interceptor fetch activado.');
    }
  }

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// ============================================================================
// 3. SANDBOX INTERACTIVO DE INTERCEPCIÓN FETCH Y RENDERIZADO FALLBACK
// ============================================================================
async function runSandboxTest() {
  const select = document.getElementById('sandbox-url-select');
  const customInput = document.getElementById('sandbox-custom-url');
  const frame = document.getElementById('sandbox-frame');
  const jsonView = document.getElementById('sandbox-json-view');
  const previewUrl = document.getElementById('preview-url-text');
  const statusBadge = document.getElementById('sandbox-status-badge');
  const interceptBadge = document.getElementById('sandbox-intercept-badge');

  let targetUrl = customInput && customInput.value.trim() !== '' ? customInput.value.trim() : select.value;
  if (!targetUrl) targetUrl = './secciones/noticias.html';

  if (previewUrl) previewUrl.textContent = targetUrl;
  if (statusBadge) {
    statusBadge.className = 'badge badge-warning';
    statusBadge.textContent = 'Interceptando...';
  }

  logToConsole('info', `[Sandbox] Lanzando solicitud a: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': targetUrl.endsWith('.json') || targetUrl.includes('/api/') ? 'application/json' : 'text/html'
      }
    });

    const isFallbackApplied = response.headers.get('X-Service-Worker-Fallback') !== null;
    const contentType = response.headers.get('content-type') || '';

    state.interceptedCount++;
    const countVal = document.getElementById('intercept-count-val');
    if (countVal) countVal.textContent = `${state.interceptedCount} solicitudes`;

    if (statusBadge) {
      statusBadge.className = 'badge badge-success';
      statusBadge.textContent = `${response.status} ${response.statusText}`;
    }

    if (interceptBadge) {
      if (isFallbackApplied) {
        interceptBadge.className = 'badge badge-rose';
        interceptBadge.textContent = '🚨 FALLBACK OFFLINE RENDERIZADO';
      } else {
        interceptBadge.className = 'badge badge-emerald';
        interceptBadge.textContent = '🌐 RED / CACHÉ DIRECTA';
      }
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (frame) frame.style.display = 'none';
      if (jsonView) {
        jsonView.style.display = 'block';
        jsonView.textContent = JSON.stringify(data, null, 2);
      }
      logToConsole(isFallbackApplied ? 'warn' : 'success', `[JSON] Respuesta recibida (${isFallbackApplied ? 'Fallback Contingencia' : 'Red Normal'})`);
    } else {
      const htmlText = await response.text();
      if (jsonView) jsonView.style.display = 'none';
      if (frame) {
        frame.style.display = 'block';
        frame.srcdoc = htmlText;
      }
      logToConsole(isFallbackApplied ? 'warn' : 'success', `[HTML] Vista renderizada en el Sandbox (${isFallbackApplied ? 'Plantilla "offline.html"' : 'Página Remota'})`);
    }

  } catch (err) {
    logToConsole('error', `Error en la solicitud: ${err.message}`);
    if (statusBadge) {
      statusBadge.className = 'badge badge-error';
      statusBadge.textContent = 'Fallo de Red';
    }
    if (interceptBadge) {
      interceptBadge.className = 'badge badge-error';
      interceptBadge.textContent = 'Sin Fallback (Error)';
    }
  }
}

// ============================================================================
// 4. TELEMETRÍA Y CONSOLA EN PANTALLA
// ============================================================================
function logToConsole(type, message) {
  const consoleOutput = document.getElementById('live-console-output');
  if (!consoleOutput) return;

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warn') icon = '⚠️';
  if (type === 'error') icon = '❌';

  entry.innerHTML = `<span class="log-time">[${time}]</span> <span>${icon}</span> <span class="log-msg">${escapeHtml(message)}</span>`;
  consoleOutput.appendChild(entry);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsoleLog() {
  const consoleOutput = document.getElementById('live-console-output');
  if (consoleOutput) consoleOutput.innerHTML = '';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"'`=\/]/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }[s]));
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initNetworkMonitoring();

  // Ejecutar prueba inicial en sandbox tras cargar
  setTimeout(runSandboxTest, 800);
});

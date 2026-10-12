// Registro del Service Worker para cumplimiento de criterios PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registrado exitosamente con alcance:', reg.scope);
        const swStatusEl = document.getElementById('sw-status-text');
        if (swStatusEl) {
          swStatusEl.textContent = 'Activo y registrado (' + reg.scope + ')';
        }
      })
      .catch((err) => {
        console.warn('[PWA] Error al registrar Service Worker:', err);
        const swStatusEl = document.getElementById('sw-status-text');
        if (swStatusEl) {
          swStatusEl.textContent = 'Pendiente o restringido en contexto local (' + err.message + ')';
        }
      });
  });
}

// Manejo del evento beforeinstallprompt para instalación de la PWA
let deferredPrompt = null;
const installBtn = document.getElementById('btn-install');
const installStatus = document.getElementById('install-status');

window.addEventListener('beforeinstallprompt', (e) => {
  // Previene que el navegador muestre automáticamente el mini-infobar por defecto
  e.preventDefault();
  deferredPrompt = e;
  
  if (installBtn) {
    installBtn.removeAttribute('disabled');
    installBtn.classList.remove('btn-secondary');
    installBtn.classList.add('btn-primary');
    installBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Instalar PWA Ahora
    `;
  }
  
  if (installStatus) {
    installStatus.textContent = 'Lista para instalar en tu dispositivo';
    installStatus.className = 'badge-tag text-emerald';
  }

  showToast('¡La aplicación está lista para instalarse!');
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showToast('Navega por HTTPS o añade el sitio a la pantalla de inicio desde tu navegador.');
      return;
    }
    
    // Muestra el prompt nativo de instalación
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Respuesta del usuario a la instalación: ${outcome}`);
    
    if (outcome === 'accepted') {
      showToast('¡Gracias por instalar Nexus PWA!');
    } else {
      showToast('Instalación cancelada por el usuario.');
    }
    
    deferredPrompt = null;
  });
}

// Detectar si la app ya fue instalada o corre en modo standalone
window.addEventListener('appinstalled', () => {
  console.log('[PWA] Aplicación instalada exitosamente');
  showToast('¡Nexus PWA se instaló correctamente!');
  if (installBtn) {
    installBtn.setAttribute('disabled', 'true');
    installBtn.innerHTML = '✓ App Instalada';
  }
});

// Comprobación de modo de visualización Standalone
function checkDisplayMode() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const modeBadge = document.getElementById('current-display-mode');
  if (modeBadge) {
    if (isStandalone) {
      modeBadge.textContent = 'Modo Standalone (PWA Instalada)';
      modeBadge.style.color = '#34d399';
    } else {
      modeBadge.textContent = 'Modo Browser Tab (Navegador)';
      modeBadge.style.color = '#818cf8';
    }
  }
}
checkDisplayMode();

// Copiar JSON del Manifest al portapapeles
function copyManifestJson() {
  const codeEl = document.getElementById('manifest-code-content');
  if (!codeEl) return;
  
  navigator.clipboard.writeText(codeEl.textContent.trim()).then(() => {
    showToast('Manifest JSON copiado al portapapeles');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente');
  });
}

// Notificación Toast interactiva
function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;
  
  toast.classList.add('show');
  
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Exponer función de copia a nivel global
window.copyManifestJson = copyManifestJson;
window.showToast = showToast;

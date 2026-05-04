// --- Registro del Service Worker ---
const swStatus = document.getElementById('sw-status');
const netStatus = document.getElementById('net-status');
const displayMode = document.getElementById('display-mode');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      swStatus.textContent = reg.active ? 'activo' : 'instalado';
    } catch (err) {
      swStatus.textContent = 'error';
      console.error('SW error:', err);
    }
  });
} else {
  swStatus.textContent = 'no soportado';
}

// --- Estado de red ---
function updateNet() {
  netStatus.textContent = navigator.onLine ? 'online' : 'offline';
}
updateNet();
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);

// --- Modo de visualización (standalone = instalado) ---
function detectDisplayMode() {
  const modes = ['standalone', 'fullscreen', 'minimal-ui'];
  for (const m of modes) {
    if (window.matchMedia(`(display-mode: ${m})`).matches) return m;
  }
  if (window.navigator.standalone) return 'standalone (iOS)';
  return 'browser';
}
displayMode.textContent = detectDisplayMode();

// --- Prompt de instalación ---
const installBtn = document.getElementById('install-btn');
const installHint = document.getElementById('install-hint');
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
  installHint.textContent = '';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  installHint.textContent = outcome === 'accepted' ? '¡Instalada!' : 'Instalación cancelada.';
  deferredPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installHint.textContent = 'App instalada correctamente.';
  installBtn.hidden = true;
});

// --- Contador demo ---
const countEl = document.getElementById('count');
let count = Number(localStorage.getItem('count') || 0);
countEl.textContent = count;

function setCount(v) {
  count = v;
  countEl.textContent = count;
  localStorage.setItem('count', String(count));
}

document.getElementById('inc').addEventListener('click', () => setCount(count + 1));
document.getElementById('dec').addEventListener('click', () => setCount(count - 1));

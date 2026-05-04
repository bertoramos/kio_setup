// ======= Service Worker =======
const swStatus = document.getElementById('sw-status');
const netStatus = document.getElementById('net-status');

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

function updateNet() { netStatus.textContent = navigator.onLine ? 'online' : 'offline'; }
updateNet();
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);

// ======= Install PWA =======
const installBtn = document.getElementById('install-btn');
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  installBtn.disabled = true;
  deferredInstallPrompt.prompt();
  try { await deferredInstallPrompt.userChoice; } catch {}
  deferredInstallPrompt = null;
  installBtn.hidden = true;
  installBtn.disabled = false;
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  deferredInstallPrompt = null;
});

// Si ya está instalada (modo standalone), oculta el botón.
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  installBtn.hidden = true;
}

// ======= Tabs =======
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');
function activateTab(name) {
  tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  panels.forEach((p) => (p.hidden = p.dataset.panel !== name));
  if (name === 'devices' && state.devices.length === 0 && Kontakt.getConfig().apiKey) {
    refreshDevices();
  }
}
tabs.forEach((t) => t.addEventListener('click', () => activateTab(t.dataset.tab)));

// ======= Estado global =======
const state = {
  devices: [],
  selected: new Set(),
  filter: '',
};

// ======= Ajustes =======
const apiKeyInput = document.getElementById('api-key');
const apiBaseInput = document.getElementById('api-base');
const settingsStatus = document.getElementById('settings-status');

function loadSettingsIntoForm() {
  const { apiKey, baseUrl } = Kontakt.getConfig();
  apiKeyInput.value = apiKey;
  apiBaseInput.value = baseUrl;
}
loadSettingsIntoForm();

document.getElementById('save-settings').addEventListener('click', () => {
  Kontakt.saveConfig({ apiKey: apiKeyInput.value, baseUrl: apiBaseInput.value });
  settingsStatus.className = 'hint ok';
  settingsStatus.textContent = 'Guardado.';
});

document.getElementById('test-settings').addEventListener('click', async () => {
  Kontakt.saveConfig({ apiKey: apiKeyInput.value, baseUrl: apiBaseInput.value });
  settingsStatus.className = 'hint';
  settingsStatus.textContent = 'Probando…';
  try {
    await Kontakt.ping();
    settingsStatus.className = 'hint ok';
    settingsStatus.textContent = '✔ Conexión OK. API Key válida.';
  } catch (err) {
    settingsStatus.className = 'hint err';
    settingsStatus.textContent = '✖ ' + err.message;
  }
});

// ======= Beacons: lista =======
const devicesList = document.getElementById('devices-list');
const devicesCount = document.getElementById('devices-count');
const devicesStatus = document.getElementById('devices-status');
const devicesSearch = document.getElementById('devices-search');
const bulkBar = document.getElementById('bulk-bar');
const bulkCountEl = document.getElementById('bulk-count');

document.getElementById('refresh-devices').addEventListener('click', refreshDevices);
devicesSearch.addEventListener('input', () => {
  state.filter = devicesSearch.value.trim().toLowerCase();
  renderDevices();
});

async function refreshDevices() {
  devicesStatus.className = 'hint';
  devicesStatus.textContent = 'Cargando…';
  devicesList.innerHTML = '';
  try {
    const devs = await Kontakt.listDevices({ maxResult: 200 });
    state.devices = devs;
    state.selected.clear();
    updateBulkBar();
    devicesStatus.textContent = '';
    renderDevices();
  } catch (err) {
    devicesStatus.className = 'hint err';
    devicesStatus.textContent = err.message;
  }
}

function renderDevices() {
  const q = state.filter;
  const items = state.devices.filter((d) => {
    if (!q) return true;
    const hay = `${d.name || ''} ${d.uniqueId || ''} ${d.mac || ''}`.toLowerCase();
    return hay.includes(q);
  });
  devicesCount.textContent = `${items.length}/${state.devices.length}`;
  devicesList.innerHTML = '';
  for (const d of items) {
    const li = document.createElement('li');
    li.className = 'device-item' + (state.selected.has(d.uniqueId) ? ' selected' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.selected.has(d.uniqueId);
    cb.addEventListener('change', () => {
      if (cb.checked) state.selected.add(d.uniqueId);
      else state.selected.delete(d.uniqueId);
      li.classList.toggle('selected', cb.checked);
      updateBulkBar();
    });

    const main = document.createElement('div');
    main.className = 'device-main';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = d.name || d.uniqueId || '(sin nombre)';
    const meta = document.createElement('span');
    meta.className = 'meta';
    const metaBits = [d.uniqueId];
    if (d.txPower != null) metaBits.push(`TX ${d.txPower}`);
    if (d.interval != null) metaBits.push(`${Math.round(d.interval)}ms`);
    if (d.model) metaBits.push(d.model);
    meta.textContent = metaBits.filter(Boolean).join(' · ');
    main.appendChild(name);
    main.appendChild(meta);

    li.appendChild(cb);
    li.appendChild(main);

    const badges = document.createElement('div');
    badges.className = 'device-badges';

    // Solo marcamos pendientes de sincronización con el beacon físico.
    // Si `pendingConfig` es truthy, hay una config en la nube que aún no llegó al beacon.
    // Si es null, la nube no tiene nada pendiente — pero eso NO prueba que el beacon esté
    // al día con lo último que enviaste (sería al día solo si un gateway/app ya sincronizó).
    if (d.pendingConfig) {
      const bg = document.createElement('span');
      bg.className = 'device-badge badge-pending';
      bg.textContent = '⏳ Pendiente sync';
      bg.title = 'Config guardada en la nube. Esperando a que un gateway Kontakt o la app oficial la entregue al beacon por BLE.';
      badges.appendChild(bg);
    } else if (d.lastConfigStatus && d.lastConfigStatus !== 'OK') {
      const bg = document.createElement('span');
      bg.className = 'device-badge badge-err';
      bg.textContent = '✖ ' + d.lastConfigStatus;
      bg.title = 'Último intento de sync con error. Mira detalles en panel.kontakt.io.';
      badges.appendChild(bg);
    }

    if (d.batteryLevel != null) {
      const b = document.createElement('span');
      b.className = 'device-badge';
      b.textContent = `🔋 ${d.batteryLevel}%`;
      badges.appendChild(b);
    }

    if (badges.childElementCount) li.appendChild(badges);

    li.addEventListener('click', (e) => {
      if (e.target === cb) return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    });

    devicesList.appendChild(li);
  }
}

function updateBulkBar() {
  const n = state.selected.size;
  bulkBar.hidden = n === 0;
  bulkCountEl.textContent = `${n} seleccionado${n === 1 ? '' : 's'}`;
}

// ======= Config modal =======
const modal = document.getElementById('config-modal');
const cfgTarget = document.getElementById('config-target');
const cfgTxPower = document.getElementById('cfg-txpower');
const cfgInterval = document.getElementById('cfg-interval');
const cfgProgress = document.getElementById('cfg-progress');

document.getElementById('bulk-config-btn').addEventListener('click', openConfigModal);
document.getElementById('config-close').addEventListener('click', closeConfigModal);
document.getElementById('cfg-cancel').addEventListener('click', closeConfigModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeConfigModal(); });

let pendingIds = [];
function openConfigModal() {
  pendingIds = Array.from(state.selected);
  if (!pendingIds.length) return;
  cfgTarget.textContent = `Se aplicará a ${pendingIds.length} beacon${pendingIds.length === 1 ? '' : 's'}.`;
  cfgTxPower.value = '';
  cfgInterval.value = '';
  cfgProgress.innerHTML = '';
  modal.hidden = false;
  modal.classList.add('open');
}
function closeConfigModal() {
  modal.hidden = true;
  modal.classList.remove('open');
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) closeConfigModal();
});

document.getElementById('cfg-apply').addEventListener('click', async () => {
  const txPower = cfgTxPower.value;
  const interval = cfgInterval.value;
  if (txPower === '' && interval === '') {
    alert('Elige al menos TX power o intervalo.');
    return;
  }
  const ids = pendingIds.slice();
  if (!ids.length) {
    alert('La selección se vació. Cierra el modal y vuelve a seleccionar.');
    return;
  }
  cfgProgress.innerHTML = '';
  const items = new Map();
  for (const id of ids) {
    const li = document.createElement('li');
    const dev = state.devices.find((d) => d.uniqueId === id);
    li.innerHTML = `<span>${(dev && dev.name) || id}</span><span class="pending">pendiente…</span>`;
    cfgProgress.appendChild(li);
    items.set(id, li);
  }

  let okCount = 0, errCount = 0;
  // Secuencial para no martillear la API con cuentas pequeñas.
  for (const id of ids) {
    const li = items.get(id);
    const status = li.querySelector('span:last-child');
    status.textContent = 'enviando…';
    try {
      await Kontakt.setDeviceConfig(id, { txPower, interval });
      status.className = 'ok';
      status.textContent = '✔ enviado';
      okCount++;
    } catch (err) {
      status.className = 'err';
      status.textContent = '✖ ' + (err.message || 'error');
      errCount++;
    }
  }

  const summary = document.createElement('li');
  summary.innerHTML = `<span><strong>Resumen</strong></span><span>${okCount} OK · ${errCount} errores</span>`;
  cfgProgress.appendChild(summary);

  // Refresca la lista para reflejar los nuevos pendingConfig.
  if (okCount > 0) {
    try {
      const devs = await Kontakt.listDevices({ maxResult: 200 });
      state.devices = devs;
      renderDevices();
    } catch { /* silencioso; el usuario puede pulsar Refrescar */ }
  }
});

// ======= BLE =======
const bleList = document.getElementById('ble-list');
const bleStatus = document.getElementById('ble-status');
const bleScanBtn = document.getElementById('ble-scan');

if (!Ble.isSupported()) {
  bleStatus.className = 'hint err';
  bleStatus.textContent = 'Web Bluetooth no soportado. Usa Chrome Android sobre HTTPS.';
  bleScanBtn.disabled = true;
}

bleScanBtn.addEventListener('click', async () => {
  bleStatus.className = 'hint';
  bleStatus.textContent = 'Abriendo selector del sistema…';
  try {
    const dev = await Ble.pickDevice();
    bleStatus.textContent = '';
    const li = document.createElement('li');
    li.className = 'device-item';
    li.innerHTML = `<div class="device-main"><span class="name">${dev.name}</span><span class="meta">${dev.id}</span></div>`;
    bleList.prepend(li);
  } catch (err) {
    bleStatus.className = 'hint err';
    bleStatus.textContent = err.message || 'Cancelado';
  }
});

// Carga inicial: ya emparejados (si el navegador lo soporta)
(async () => {
  const paired = await Ble.listPaired();
  for (const dev of paired) {
    const li = document.createElement('li');
    li.className = 'device-item';
    li.innerHTML = `<div class="device-main"><span class="name">${dev.name}</span><span class="meta">${dev.id} · emparejado</span></div>`;
    bleList.appendChild(li);
  }
})();

// ======= Arranque =======
if (Kontakt.getConfig().apiKey) {
  refreshDevices();
} else {
  devicesStatus.className = 'hint';
  devicesStatus.innerHTML = 'Configura tu API Key en <strong>Ajustes</strong> para empezar.';
}

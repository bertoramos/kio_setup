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
});

function showManualInstallHelp() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  let msg;
  if (isIOS) {
    msg = 'En iPhone/iPad:\n\n1. Abre esta web en Safari.\n2. Pulsa el botón Compartir (cuadrado con flecha).\n3. Elige "Añadir a pantalla de inicio".';
  } else if (isAndroid) {
    msg = 'En Android:\n\n1. Usa Chrome sobre HTTPS.\n2. Menú ⋮ → "Instalar aplicación" o "Añadir a pantalla principal".\n\nSi no aparece la opción, recarga la página y espera unos segundos. Algunos navegadores requieren iconos PNG.';
  } else {
    msg = 'En escritorio (Chrome/Edge):\n\n1. Busca el icono de instalación (⊕) a la derecha de la barra de URL.\n2. O menú ⋮ → "Instalar Kio Setup…".';
  }
  alert(msg);
}

installBtn.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    installBtn.disabled = true;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch {}
    deferredInstallPrompt = null;
    installBtn.disabled = false;
    return;
  }
  showManualInstallHelp();
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
  updateSelectAllLabel();
}

// Lista actualmente visible (respetando el filtro de búsqueda).
function visibleDevices() {
  const q = state.filter;
  return state.devices.filter((d) => {
    if (!q) return true;
    const hay = `${d.name || ''} ${d.uniqueId || ''} ${d.mac || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

const toggleSelectAllBtn = document.getElementById('toggle-select-all');
function updateSelectAllLabel() {
  const vis = visibleDevices();
  if (!vis.length) {
    toggleSelectAllBtn.textContent = 'Seleccionar todos';
    toggleSelectAllBtn.disabled = true;
    return;
  }
  toggleSelectAllBtn.disabled = false;
  const allSelected = vis.every((d) => state.selected.has(d.uniqueId));
  toggleSelectAllBtn.textContent = allSelected ? 'Deseleccionar' : 'Seleccionar todos';
}
toggleSelectAllBtn.addEventListener('click', () => {
  const vis = visibleDevices();
  if (!vis.length) return;
  const allSelected = vis.every((d) => state.selected.has(d.uniqueId));
  if (allSelected) {
    vis.forEach((d) => state.selected.delete(d.uniqueId));
  } else {
    vis.forEach((d) => state.selected.add(d.uniqueId));
  }
  renderDevices();
  updateBulkBar();
});

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
const bleScanLiveBtn = document.getElementById('ble-scan-live');
const bleScanStopBtn = document.getElementById('ble-scan-stop');
const bleScanPickerBtn = document.getElementById('ble-scan-picker');
const bleCountEl = document.getElementById('ble-count');
const bleLeScanWarn = document.getElementById('ble-lescan-warn');

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

if (!Ble.isSupported()) {
  bleStatus.className = 'hint err';
  bleStatus.textContent = 'Web Bluetooth no soportado. Usa Chrome Android o escritorio con Bluetooth sobre HTTPS.';
  bleScanLiveBtn.disabled = true;
  bleScanPickerBtn.disabled = true;
} else if (!Ble.supportsLEScan()) {
  bleLeScanWarn.hidden = false;
}

// Mapa de advertisements recibidos: id -> { name, rssi, lastSeen, iBeacon, eddystone, mac }
const bleSeen = new Map();
let bleScanHandle = null;

function renderBleList() {
  bleCountEl.textContent = bleSeen.size ? `${bleSeen.size} dispositivo${bleSeen.size === 1 ? '' : 's'}` : '';
  // Ordena por RSSI descendente (más fuerte primero).
  const items = Array.from(bleSeen.values()).sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
  bleList.innerHTML = '';
  for (const d of items) {
    const li = document.createElement('li');
    li.className = 'device-item';
    const main = document.createElement('div');
    main.className = 'device-main';
    const metaBits = [];
    if (d.mac) metaBits.push(d.mac);
    if (d.id && !d.mac) metaBits.push(d.id.slice(0, 12) + '…');
    if (d.rssi != null) metaBits.push(`RSSI ${d.rssi} dBm`);
    main.innerHTML = `
      <span class="name">${escapeHtml(d.name || '(sin nombre)')}</span>
      <span class="meta">${escapeHtml(metaBits.join(' · '))}</span>
    `;
    if (d.iBeacon) {
      const sub = document.createElement('span');
      sub.className = 'meta';
      sub.textContent = `iBeacon: ${d.iBeacon.uuid} · major ${d.iBeacon.major} · minor ${d.iBeacon.minor}`;
      main.appendChild(sub);
    }
    if (d.eddystone) {
      const sub = document.createElement('span');
      sub.className = 'meta';
      if (d.eddystone.type === 'UID') sub.textContent = `Eddystone UID: ${d.eddystone.namespace} / ${d.eddystone.instance}`;
      else if (d.eddystone.type === 'URL') sub.textContent = `Eddystone URL: ${d.eddystone.url}`;
      else sub.textContent = `Eddystone ${d.eddystone.type}`;
      main.appendChild(sub);
    }
    li.appendChild(main);
    bleList.appendChild(li);
  }
}

function onAdvertisement(ev) {
  const id = ev.device.id;
  const prev = bleSeen.get(id) || {};
  const ibeacon = Ble.parseIBeacon(ev.manufacturerData);
  const eddy = Ble.parseEddystone(ev.serviceData);
  bleSeen.set(id, {
    id,
    name: ev.device.name || prev.name || '',
    rssi: ev.rssi ?? prev.rssi,
    lastSeen: Date.now(),
    iBeacon: ibeacon || prev.iBeacon || null,
    eddystone: eddy || prev.eddystone || null,
    mac: prev.mac || null,
  });
  // Throttle del render: como máximo 4 repintados/s.
  scheduleBleRender();
}

let bleRenderPending = false;
function scheduleBleRender() {
  if (bleRenderPending) return;
  bleRenderPending = true;
  setTimeout(() => { bleRenderPending = false; renderBleList(); }, 250);
}

bleScanLiveBtn.addEventListener('click', async () => {
  if (!Ble.supportsLEScan()) {
    bleStatus.className = 'hint err';
    bleStatus.textContent = 'requestLEScan no disponible. Mira el aviso de arriba.';
    return;
  }
  bleStatus.className = 'hint';
  bleStatus.textContent = 'Pidiendo permiso de escaneo…';
  try {
    bleScanHandle = await Ble.startLEScan(onAdvertisement);
    bleStatus.className = 'hint ok';
    bleStatus.textContent = 'Escaneando en vivo… (toca Detener para parar)';
    bleScanLiveBtn.hidden = true;
    bleScanStopBtn.hidden = false;
  } catch (err) {
    bleStatus.className = 'hint err';
    bleStatus.textContent = err.message || 'Error iniciando escaneo';
  }
});

bleScanStopBtn.addEventListener('click', () => {
  if (bleScanHandle) { bleScanHandle.stop(); bleScanHandle = null; }
  bleScanLiveBtn.hidden = false;
  bleScanStopBtn.hidden = true;
  bleStatus.className = 'hint';
  bleStatus.textContent = 'Escaneo detenido.';
});

bleScanPickerBtn.addEventListener('click', async () => {
  bleStatus.className = 'hint';
  bleStatus.textContent = 'Abriendo selector del sistema…';
  try {
    const dev = await Ble.pickDevice();
    bleStatus.textContent = '';
    bleSeen.set(dev.id, { id: dev.id, name: dev.name, rssi: null, lastSeen: Date.now() });
    renderBleList();
  } catch (err) {
    bleStatus.className = 'hint err';
    bleStatus.textContent = err.message || 'Cancelado';
  }
});

// Detener escaneo si el usuario cambia de pestaña o cierra.
window.addEventListener('visibilitychange', () => {
  if (document.hidden && bleScanHandle) {
    bleScanHandle.stop();
    bleScanHandle = null;
    bleScanLiveBtn.hidden = false;
    bleScanStopBtn.hidden = true;
    bleStatus.textContent = 'Escaneo detenido (pestaña inactiva).';
  }
});

// ======= Arranque =======
if (Kontakt.getConfig().apiKey) {
  refreshDevices();
} else {
  devicesStatus.className = 'hint';
  devicesStatus.innerHTML = 'Configura tu API Key en <strong>Ajustes</strong> para empezar.';
}

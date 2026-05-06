// Cliente de la Kio Cloud API (Kontakt.io).
// Docs: https://developer.kontakt.io/cloud-api/
//
// Autenticación: header `Api-Key: <KEY>`
// Versión recomendada: header `Accept: application/vnd.com.kontakt+json;version=10`
//
// Si `api.kontakt.io` bloquea por CORS, apunta `baseUrl` a un proxy
// (ver `cloudflare-worker.js` en la raíz del repo).

const Kontakt = (() => {
  const DEFAULT_BASE = 'https://api.kontakt.io';
  const ACCEPT = 'application/vnd.com.kontakt+json;version=10';

  function getConfig() {
    return {
      apiKey: localStorage.getItem('kio.apiKey') || '',
      baseUrl: (localStorage.getItem('kio.baseUrl') || DEFAULT_BASE).replace(/\/$/, ''),
    };
  }

  function saveConfig({ apiKey, baseUrl }) {
    if (typeof apiKey === 'string') localStorage.setItem('kio.apiKey', apiKey.trim());
    if (typeof baseUrl === 'string') localStorage.setItem('kio.baseUrl', (baseUrl || DEFAULT_BASE).trim());
  }

  async function request(path, { method = 'GET', body, params } = {}) {
    const { apiKey, baseUrl } = getConfig();
    if (!apiKey) throw new Error('Falta API Key. Ve a Ajustes.');

    const url = new URL(baseUrl + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      }
    }

    const headers = {
      'Api-Key': apiKey,
      'Accept': ACCEPT,
    };
    let payload;
    if (body !== undefined) {
      // La API Kontakt acepta form-urlencoded en POSTs de configuración.
      if (body instanceof URLSearchParams) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        payload = body.toString();
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
    }

    let res;
    try {
      res = await fetch(url.toString(), { method, headers, body: payload });
    } catch (err) {
      // TypeError: "Failed to fetch" suele ser CORS o red.
      throw new Error(`Error de red o CORS: ${err.message}. Revisa Base URL o usa un proxy.`);
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || res.statusText || 'Error';
      const e = new Error(`HTTP ${res.status}: ${msg}`);
      e.status = res.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  // ----- Endpoints -----

  // Lista paginada de dispositivos de la cuenta.
  // La API devuelve { devices: [...], ... } o un array según versión. Normalizamos.
  async function listDevices({ maxResult = 100, start = 0, specification } = {}) {
    const data = await request('/device', { params: { maxResult, start, specification } });
    const arr = Array.isArray(data) ? data : (data.devices || data.content || []);
    return arr;
  }

  // Devuelve la config deseada actual de un beacon.
  async function getDeviceConfig(uniqueId) {
    // Endpoint documentado: GET /config/{uniqueId}
    return await request(`/config/${encodeURIComponent(uniqueId)}`);
  }

  // Crea una *pending configuration* que la app Kio Setup Manager (o un gateway)
  // entregará al beacon al próximo sync BLE.
  // Endpoint: POST /config/create (form-urlencoded, incluye uniqueId).
  // OJO: NO usar /device/update — eso solo actualiza metadatos del registro en la
  // nube y no encola nada que el SDK pueda sincronizar al hardware.
  // Docs: https://docs.kontakt.io/hardware/configuration/
  async function setDeviceConfig(uniqueId, { txPower, interval, deviceType = 'BEACON' } = {}) {
    const form = new URLSearchParams();
    form.set('uniqueId', uniqueId);
    form.set('deviceType', deviceType);
    if (txPower !== undefined && txPower !== '' && txPower !== null) form.set('txPower', String(txPower));
    if (interval !== undefined && interval !== '' && interval !== null) form.set('interval', String(interval));
    return await request('/config/create', { method: 'POST', body: form });
  }

  // Test simple: pide 1 device para validar API Key + CORS.
  async function ping() {
    return await listDevices({ maxResult: 1 });
  }

  return {
    getConfig, saveConfig,
    listDevices, getDeviceConfig, setDeviceConfig,
    ping,
  };
})();

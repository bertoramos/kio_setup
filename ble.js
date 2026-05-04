// Wrapper de Web Bluetooth.
// - supportsLEScan: requestLEScan (experimental, Chrome Android + flag). Lista
//   advertisements en vivo con RSSI, manufacturerData (iBeacon), serviceData
//   (Eddystone), etc., dentro de nuestra propia UI.
// - pickDevice: fallback al selector del sistema (requestDevice).

const Ble = (() => {
  function isSupported() {
    return 'bluetooth' in navigator;
  }

  function supportsLEScan() {
    return isSupported() && typeof navigator.bluetooth.requestLEScan === 'function';
  }

  // Arranca un escaneo en vivo. Devuelve { stop() } para detenerlo.
  async function startLEScan(onAdvertisement, { acceptAllAdvertisements = true } = {}) {
    if (!supportsLEScan()) {
      throw new Error('requestLEScan no disponible en este navegador. Activa el flag chrome://flags/#enable-experimental-web-platform-features en Chrome Android.');
    }
    const handler = (ev) => { try { onAdvertisement(ev); } catch (e) { console.error(e); } };
    navigator.bluetooth.addEventListener('advertisementreceived', handler);
    let scan;
    try {
      scan = await navigator.bluetooth.requestLEScan({ acceptAllAdvertisements });
    } catch (err) {
      navigator.bluetooth.removeEventListener('advertisementreceived', handler);
      throw err;
    }
    return {
      stop() {
        try { scan && scan.stop(); } catch {}
        navigator.bluetooth.removeEventListener('advertisementreceived', handler);
      },
    };
  }

  async function pickDevice() {
    if (!isSupported()) throw new Error('Web Bluetooth no soportado en este navegador.');
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [],
    });
    return { id: device.id, name: device.name || '(sin nombre)', raw: device };
  }

  async function listPaired() {
    if (!isSupported()) return [];
    if (!navigator.bluetooth.getDevices) return [];
    try {
      const devs = await navigator.bluetooth.getDevices();
      return devs.map((d) => ({ id: d.id, name: d.name || '(sin nombre)', raw: d }));
    } catch {
      return [];
    }
  }

  // ---------- Parseo de advertisements ----------
  // iBeacon: manufacturerData con companyId 0x004C (Apple).
  // Estructura: [0x02, 0x15, uuid(16), major(2), minor(2), txPower(1)]
  function parseIBeacon(manufacturerData) {
    if (!manufacturerData) return null;
    const apple = manufacturerData.get ? manufacturerData.get(0x004C) : null;
    if (!apple) return null;
    const b = new Uint8Array(apple.buffer, apple.byteOffset, apple.byteLength);
    if (b.length < 23 || b[0] !== 0x02 || b[1] !== 0x15) return null;
    const hex = Array.from(b.slice(2, 18)).map(x => x.toString(16).padStart(2, '0')).join('');
    const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
    const major = (b[18] << 8) | b[19];
    const minor = (b[20] << 8) | b[21];
    const txPower = b[22] > 127 ? b[22] - 256 : b[22];
    return { uuid, major, minor, txPower };
  }

  // Eddystone: serviceData con UUID 0xFEAA. Primer byte = frame type.
  function parseEddystone(serviceData) {
    if (!serviceData || !serviceData.get) return null;
    const EDDY_UUID = '0000feaa-0000-1000-8000-00805f9b34fb';
    let dv = serviceData.get(EDDY_UUID) || serviceData.get(0xFEAA);
    if (!dv) return null;
    const b = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    if (!b.length) return null;
    const frame = b[0];
    if (frame === 0x00 && b.length >= 18) {
      const ns = Array.from(b.slice(2, 12)).map(x => x.toString(16).padStart(2, '0')).join('');
      const inst = Array.from(b.slice(12, 18)).map(x => x.toString(16).padStart(2, '0')).join('');
      return { type: 'UID', namespace: ns, instance: inst };
    }
    if (frame === 0x10) {
      const schemes = ['http://www.', 'https://www.', 'http://', 'https://'];
      let url = schemes[b[2]] || '';
      for (let i = 3; i < b.length; i++) url += String.fromCharCode(b[i]);
      return { type: 'URL', url };
    }
    if (frame === 0x20) return { type: 'TLM' };
    return { type: 'OTHER', frame: '0x' + frame.toString(16) };
  }

  return { isSupported, supportsLEScan, startLEScan, pickDevice, listPaired, parseIBeacon, parseEddystone };
})();

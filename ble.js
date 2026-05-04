// Wrapper de Web Bluetooth para escaneo básico.
// Chrome Android: requiere HTTPS y gesto del usuario.
// `requestDevice` abre el selector del sistema y permite filtrar.

const Ble = (() => {
  function isSupported() {
    return 'bluetooth' in navigator;
  }

  async function pickDevice() {
    if (!isSupported()) throw new Error('Web Bluetooth no soportado en este navegador.');
    // acceptAllDevices: muestra todos los BLE cercanos en el selector.
    // optionalServices vacío: solo hacemos descubrimiento/listado.
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [],
    });
    return {
      id: device.id,
      name: device.name || '(sin nombre)',
      raw: device,
    };
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

  return { isSupported, pickDevice, listPaired };
})();

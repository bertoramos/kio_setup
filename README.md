# Kio Setup

PWA (HTML + JS vanilla) para configurar beacons **Kontakt.io** por lote usando la **Kio Cloud API**. Instalable en Android.

## Qué hace

- Lista los beacons de tu cuenta Kontakt.
- Selección múltiple y aplicación en lote de:
  - **TX Power** (0–7, mínimo a máximo)
  - **Intervalo de anuncio** en ms
- Escaneo **BLE local** con Web Bluetooth para verificar dispositivos cercanos.
- 100 % gratuito, sin servidor (opcional: proxy Cloudflare Worker gratis si CORS bloquea).

## Cómo funciona la configuración

Kontakt aplica la config en dos pasos:

1. Esta app llama a la **Kio Cloud API** y guarda tu "desired configuration" en la nube.
2. El beacon físico recibe la config la próxima vez que un **gateway Kontakt** o la **app móvil oficial Kio Setup** está cerca de él.

Por eso, después de aplicar cambios aquí, abre la app oficial cerca de los beacons (o espera al gateway) para que lleguen al hardware.

## Requisitos

- Cuenta Kontakt.io con **API Key** (genera una en [panel.kontakt.io](https://panel.kontakt.io) → My Account → API Keys).
- Chrome Android para instalar como PWA y para el escaneo BLE.

## Estructura

```
.
├── index.html           # UI (3 pestañas)
├── styles.css
├── app.js               # Lógica de UI y estado
├── api.js               # Cliente Kio Cloud API
├── ble.js               # Wrapper Web Bluetooth
├── manifest.webmanifest
├── sw.js                # Service Worker (app shell)
├── cloudflare-worker.js # (Opcional) proxy CORS gratis
└── icons/
    ├── icon.svg
    └── icon-maskable.svg
```

## Uso

1. Abre la PWA (en local o vía GitHub Pages).
2. Ve a **Ajustes**, pega tu **API Key** y pulsa **Probar conexión**.
   - Si ves `✔ Conexión OK` → ya puedes usar la app.
   - Si ves un error tipo `Error de red o CORS` → la API de Kontakt no permite llamadas directas desde el navegador. Monta el Cloudflare Worker (ver sección más abajo) y pon su URL en **Base URL**.
3. Ve a **Beacons** → **Refrescar**. Aparecerán tus beacons.
4. Marca varios, pulsa **Configurar** en la barra inferior, elige TX Power y/o intervalo, **Aplicar**.
5. Pestaña **Scan BLE** → **Escanear BLE**: muestra el selector del sistema con beacons cercanos (útil una vez los tengas físicamente).

## (Opcional) Proxy gratis con Cloudflare Worker

Si `api.kontakt.io` rechaza las llamadas del navegador por CORS:

1. Abre [dash.cloudflare.com](https://dash.cloudflare.com) (cuenta gratis).
2. **Workers & Pages** → **Create** → **Worker** → dale un nombre (p.ej. `kio-proxy`).
3. **Edit code** → borra el ejemplo y pega el contenido de `cloudflare-worker.js`.
4. **Save and Deploy**. Te da una URL tipo `https://kio-proxy.TU_USER.workers.dev`.
5. En la app, **Ajustes → Base URL**: pega esa URL y guarda.

La API Key se sigue enviando solo desde tu cliente; el worker solo añade cabeceras CORS y reenvía.

## Cómo probarlo

Las PWA requieren **HTTPS** o **localhost** para que el Service Worker y la instalación funcionen. Abrir `index.html` con doble clic (`file://`) **no** activará la instalación.

### 1. Servir localmente en tu PC

Elige una de estas opciones desde la carpeta del proyecto:

```bash
# Python 3
python -m http.server 8080

# Node
npx serve -l 8080 .
```

Luego abre `http://localhost:8080` en el navegador.

### 2. Probar en tu móvil Android (misma red Wi-Fi)

1. Inicia el servidor como arriba.
2. Averigua la IP local de tu PC (p. ej. `192.168.1.20`).
3. En tu móvil, abre `http://192.168.1.20:8080` en Chrome.
4. El menú ⋮ de Chrome debería mostrar **"Instalar app"** o **"Agregar a pantalla de inicio"**.

> Nota: Chrome en Android solo muestra el prompt de instalación automático en **HTTPS**. Para HTTP sobre LAN, usa la opción manual del menú ⋮. Si quieres HTTPS sin configurar nada, despliega con GitHub Pages, Netlify, Vercel o similar.

### 3. Despliegue rápido con HTTPS (recomendado para instalación 1-click)

- **GitHub Pages:** sube esta carpeta a un repo y activa Pages.
- **Netlify / Vercel:** arrastra la carpeta en su web y listo.

## Qué incluye

- Manifest (`manifest.webmanifest`) con íconos SVG (cualquiera y maskable).
- Service Worker (`sw.js`) con precaché y estrategia *cache-first* + fallback offline.
- Detección de estado online/offline, modo de visualización (standalone) y botón de instalación usando el evento `beforeinstallprompt`.
- Contador demo con persistencia en `localStorage`.
- Estilos mobile-first con soporte para *safe-area* (notch).

## Personalizar

- Cambia el nombre en `manifest.webmanifest` (`name`, `short_name`) y los colores (`theme_color`, `background_color`).
- Sustituye la letra `P` en `icons/icon.svg` e `icons/icon-maskable.svg` por tu logo.
- Añade tu contenido dentro de `<main class="container">` en `index.html`.
- Cuando modifiques archivos cacheados, sube el número de versión `CACHE` en `sw.js` (`mipwa-v1` → `mipwa-v2`) para forzar la actualización.

# Mi PWA — plantilla mínima

Página web (HTML + JS vanilla) instalable como PWA en Android.

## Estructura

```
.
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
└── icons/
    ├── icon.svg
    └── icon-maskable.svg
```

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

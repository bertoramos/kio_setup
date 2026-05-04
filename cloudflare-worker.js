// Cloudflare Worker: proxy CORS mínimo hacia api.kontakt.io
//
// Cómo usarlo:
// 1. Crea una cuenta gratis en https://dash.cloudflare.com
// 2. Workers & Pages → Create → Worker → "Hello World"
// 3. Pega este archivo completo sustituyendo el código por defecto.
// 4. Deploy. Copia la URL que te da (algo como https://kio-proxy.TU_USER.workers.dev)
// 5. En la app Kio Setup, en Ajustes → Base URL, pega esa URL.
//
// No guarda la API Key: se pasa header Api-Key desde el cliente en cada petición.
// La cuota gratuita (100k req/día) sobra de largo para uso personal.

const UPSTREAM = 'https://api.kontakt.io';
const ALLOW_ORIGIN = '*'; // Cámbialo por tu dominio GitHub Pages si quieres restringir.

export default {
  async fetch(request) {
    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);
    const target = UPSTREAM + url.pathname + url.search;

    // Copia headers relevantes del cliente.
    const headers = new Headers();
    for (const name of ['api-key', 'accept', 'content-type']) {
      const v = request.headers.get(name);
      if (v) headers.set(name, v);
    }

    const init = {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'follow',
    };

    const upstreamRes = await fetch(target, init);

    const respHeaders = new Headers(upstreamRes.headers);
    for (const [k, v] of Object.entries(corsHeaders())) respHeaders.set(k, v);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: respHeaders,
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Api-Key, Accept, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

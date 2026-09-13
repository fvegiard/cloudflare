// Recupere depuis Cloudflare le 2026-09-13. Aucune source locale n'existait.
// ATTENTION : ce Worker est un proxy vers env.ROUTER (hote router.internal).
// Cette origine n'existe pas dans le compte -> 503 systematique.
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (incoming.pathname === '/') {
      return Response.redirect(new URL('/management.html', incoming), 302);
    }
    const allowed = incoming.pathname === '/management.html'
      || incoming.pathname.startsWith('/v1/')
      || incoming.pathname.startsWith('/v1beta/')
      || incoming.pathname.startsWith('/v0/management/');
    if (!allowed) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (env.ROUTER_READY !== 'true' && !['/v1/models', '/management.html'].includes(incoming.pathname)) {
      return Response.json({ error: 'Route commissioning in progress' }, { status: 503 });
    }
    const target = new URL(incoming.pathname + incoming.search, 'http://router.internal');
    const headers = new Headers(request.headers);
    const clientIp = request.headers.get('cf-connecting-ip');
    headers.delete('forwarded');
    headers.delete('x-forwarded-for');
    headers.delete('x-real-ip');
    if (clientIp) {
      headers.set('x-forwarded-for', clientIp);
      headers.set('x-real-ip', clientIp);
    }
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-forwarded-host', incoming.host);
    headers.set('host', 'router.internal');
    const upstream = new Request(target, request);
    try {
      return await env.ROUTER.fetch(new Request(upstream, { headers, redirect: 'manual' }));
    } catch {
      return Response.json({ error: 'Router temporarily unavailable' }, {
        status: 503, headers: { 'retry-after': '5', 'access-control-allow-origin': '*' }
      });
    }
  }
};

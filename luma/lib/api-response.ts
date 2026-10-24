// The Next.js adapter supplies its own CDN key; API identities must also vary by query.
export function apiJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Netlify-Vary', 'query');
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  return Response.json(body, {...init, headers});
}
